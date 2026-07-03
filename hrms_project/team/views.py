from django.utils import timezone
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated

from accounts.models import Employee
from leave.models import Leave
from attendance.models import AttendanceDay
from organization.models import WeeklyOffPolicy, LeaveDays
from attendance.services.day_context import resolve_day_context

from datetime import date, timedelta
import calendar


class MyTeamTodaySummaryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        today = timezone.now().date()
        current_employee = getattr(request.user, 'employee', None)

        if not current_employee:
            return Response({'error': 'Employee profile not found'}, status=404)

        view_type = request.query_params.get('view')

        direct_report_fields = [
            'id', 'display_name', 'profile_image', 'job_title_primary',
            'work_email', 'reporting_to', 'mobile_number', 'personal_email',
        ]
        peer_fields = [
            'id', 'display_name', 'profile_image', 'job_title_primary',
            'work_email', 'reporting_to',
        ]

        if view_type == 'peers' and current_employee.reporting_to_id:
            team_qs = Employee.objects.filter(
                reporting_to_id=current_employee.reporting_to_id,
                is_active=True,
            )
            label = 'Peers'
            allowed_fields = peer_fields
        else:
            team_qs = Employee.objects.filter(reporting_to=current_employee, is_active=True)
            if team_qs.exists():
                label = 'Direct Report'
                allowed_fields = direct_report_fields
            else:
                if current_employee.reporting_to_id:
                    team_qs = Employee.objects.filter(
                        reporting_to_id=current_employee.reporting_to_id,
                        is_active=True,
                    ).exclude(id=current_employee.id)
                    label = 'Peers'
                    allowed_fields = peer_fields
                else:
                    team_qs = Employee.objects.none()
                    label = 'No Team'
                    allowed_fields = peer_fields

        team_members = list(team_qs.values(*allowed_fields))
        team_ids = [emp['id'] for emp in team_members]

        if not team_ids:
            return Response({'on_leave_today': [], 'not_in_yet_today': [], label: []})

        leaves_today = Leave.objects.filter(
            employee_id__in=team_ids,
            start_date__lte=today,
            end_date__gte=today,
            status='approved',
        ).values('employee_id', 'leave_type__name')

        employees_on_leave = {leave['employee_id']: leave for leave in leaves_today}

        attendance_today_qs = AttendanceDay.objects.filter(
            employee_id__in=team_ids,
            date=today,
        ).values('employee_id', 'arrival_status', 'status')

        clocked_in_ids = set()
        on_time_count = 0
        late_count = 0

        for att in attendance_today_qs:
            clocked_in_ids.add(att['employee_id'])
            if att.get('arrival_status') == 'on_time':
                on_time_count += 1
            elif att.get('arrival_status') == 'late':
                late_count += 1

        on_leave_data = []
        not_in_yet_data = []

        for emp in team_members:
            emp_id = emp['id']
            if emp_id in employees_on_leave:
                emp['leave_type'] = employees_on_leave[emp_id]['leave_type__name']
                on_leave_data.append(emp)
                continue
            if emp_id not in clocked_in_ids:
                ctx = resolve_day_context(Employee.objects.get(pk=emp_id), today)
                if ctx.day_type in ('holiday', 'week_off', 'leave'):
                    continue
                not_in_yet_data.append(emp)

        return Response({
            'on_leave_today': on_leave_data,
            'not_in_yet_today': not_in_yet_data,
            'Employees On Time today': on_time_count,
            'Late Arrivals today': late_count,
            label: team_members,
        })


class MyTeamCalendarView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        current_employee = getattr(request.user, 'employee', None)
        if not current_employee:
            return Response({'error': 'Employee profile not found'}, status=404)

        try:
            year = int(request.query_params.get('year', timezone.now().year))
            month = int(request.query_params.get('month', timezone.now().month))
        except ValueError:
            year, month = timezone.now().year, timezone.now().month

        _, num_days = calendar.monthrange(year, month)
        start_date = date(year, month, 1)
        end_date = date(year, month, num_days)

        view_type = request.query_params.get('view', 'directs').lower()

        team_qs = Employee.objects.filter(is_active=True, reporting_to=current_employee)

        if view_type == 'peers' or not team_qs.exists():
            if current_employee.reporting_to_id:
                team_qs = Employee.objects.filter(
                    is_active=True,
                    reporting_to_id=current_employee.reporting_to_id,
                )

        team_members = list(team_qs.values(
            'id', 'display_name', 'profile_image', 'job_title_primary',
            'date_of_joining', 'employeeorganization__business_unit_id',
        ))
        team_ids = [emp['id'] for emp in team_members]

        if not team_ids:
            return Response({'team': [], 'calendar_data': {}})

        employee_by_id = {e.id: e for e in Employee.objects.filter(id__in=team_ids)}

        calendar_data = {emp_id: {} for emp_id in team_ids}

        attendances = AttendanceDay.objects.filter(
            employee_id__in=team_ids,
            date__range=[start_date, end_date],
        ).values('employee_id', 'date', 'status', 'arrival_status')

        for att in attendances:
            calendar_data[att['employee_id']][att['date'].isoformat()] = {
                'type': att['status'] or 'present',
                'arrival_status': att['arrival_status'],
            }

        leaves = Leave.objects.filter(
            employee_id__in=team_ids,
            start_date__lte=end_date,
            end_date__gte=start_date,
            status='approved',
        ).values('employee_id', 'start_date', 'end_date', 'leave_type__name')

        for l in leaves:
            emp_id = l['employee_id']
            curr_date = max(start_date, l['start_date'])
            l_end = min(end_date, l['end_date'])
            while curr_date <= l_end:
                date_str = curr_date.isoformat()
                if date_str not in calendar_data[emp_id] or calendar_data[emp_id][date_str].get('type') == 'absent':
                    calendar_data[emp_id][date_str] = {
                        'type': 'leave',
                        'leave_name': l['leave_type__name'],
                    }
                curr_date += timedelta(days=1)

        today = timezone.now().date()

        for emp in team_members:
            emp_id = emp['id']
            doj = emp.get('date_of_joining')
            employee = employee_by_id.get(emp_id)

            curr_date = start_date
            while curr_date <= end_date:
                date_str = curr_date.isoformat()

                if doj and curr_date < doj:
                    curr_date += timedelta(days=1)
                    continue

                if date_str in calendar_data[emp_id]:
                    curr_date += timedelta(days=1)
                    continue

                if employee:
                    ctx = resolve_day_context(employee, curr_date)
                    if ctx.day_type == 'holiday':
                        calendar_data[emp_id][date_str] = {
                            'type': 'holiday',
                            'name': ctx.holiday_name,
                        }
                    elif ctx.day_type == 'week_off':
                        calendar_data[emp_id][date_str] = {'type': 'week_off'}
                    elif ctx.day_type == 'leave':
                        calendar_data[emp_id][date_str] = {
                            'type': 'leave',
                            'leave_name': ctx.leave_type_name,
                        }
                    elif curr_date <= today:
                        calendar_data[emp_id][date_str] = {'type': 'absent'}

                curr_date += timedelta(days=1)

        return Response({
            'month': month,
            'year': year,
            'days_in_month': num_days,
            'team': team_members,
            'calendar_data': calendar_data,
        })

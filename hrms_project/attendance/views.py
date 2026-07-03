from django.utils import timezone
from django.shortcuts import get_object_or_404
from django.db import transaction
from django.db.models import Avg

from rest_framework.response import Response
from rest_framework.status import HTTP_400_BAD_REQUEST, HTTP_200_OK, HTTP_404_NOT_FOUND
from rest_framework.viewsets import ReadOnlyModelViewSet
from rest_framework.permissions import IsAuthenticated
from rest_framework.decorators import action
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError

from .serializers import AttendanceDaySerializer, WeeklyOffPolicySerializer
from .models import AttendanceDay, AttendanceSession
from accounts.models import Employee
from organization.models import WeeklyOffPolicy
from leave.models import Leave
from .helper import calculate_time_percentage
from .services.day_context import resolve_day_context
from .services.evaluator import validate_check_in, evaluate_attendance_day
from .services.geofence import check_geofence

from datetime import datetime, timedelta


class AttendanceViewSet(ReadOnlyModelViewSet):
    serializer_class = AttendanceDaySerializer
    permission_classes = [IsAuthenticated]

    def get_employee(self):
        return get_object_or_404(Employee, user=self.request.user)

    def _get_validated_dates(self, request):
        from_date_str = request.query_params.get('fromDate')
        to_date_str = request.query_params.get('toDate')

        if from_date_str and to_date_str:
            try:
                from_date = datetime.strptime(from_date_str, '%Y-%m-%d').date()
                to_date = datetime.strptime(to_date_str, '%Y-%m-%d').date()
            except ValueError:
                raise ValidationError('Invalid date format. Use YYYY-MM-DD')

            delta = to_date - from_date
            if delta.days > 60:
                raise ValidationError('You can only request up to 60 days of timeline data at a time.')
            if from_date > to_date:
                raise ValidationError('fromDate cannot be greater than toDate')
        else:
            to_date = timezone.localdate()
            from_date = to_date - timedelta(days=30)

        return from_date, to_date

    def get_queryset(self):
        employee = self.get_employee()
        queryset = AttendanceDay.objects.filter(employee=employee).prefetch_related('sessions')
        from_date = self.request.query_params.get('fromDate')
        to_date = self.request.query_params.get('toDate')

        if from_date and to_date:
            try:
                from_date = datetime.strptime(from_date, '%Y-%m-%d').date()
                to_date = datetime.strptime(to_date, '%Y-%m-%d').date()
            except ValueError:
                raise ValidationError('Invalid date format. Use YYYY-MM-DD')
            if from_date > to_date:
                raise ValidationError('fromDate cannot be greater than toDate')
        else:
            to_date = timezone.localdate()
            from_date = to_date - timedelta(days=30)

        return queryset.filter(date__range=(from_date, to_date)).order_by('-date')

    @action(detail=False, methods=['get'], url_path='timeline')
    def get_timeline(self, request):
        employee = self.get_employee()
        from_date, to_date = self._get_validated_dates(request)

        attendances = AttendanceDay.objects.filter(
            employee=employee,
            date__range=(from_date, to_date),
        ).prefetch_related('sessions')
        attendance_map = {
            att.date.strftime('%Y-%m-%d'): AttendanceDaySerializer(att).data for att in attendances
        }

        leaves = Leave.objects.filter(
            employee=employee,
            status='approved',
            start_date__lte=to_date,
            end_date__gte=from_date,
        ).select_related('leave_type')

        leave_map = {}
        for leave in leaves:
            curr = max(leave.start_date, from_date)
            end = min(leave.end_date, to_date)
            while curr <= end:
                if leave.start_date == curr:
                    duration = leave.start_day_session
                elif leave.end_date == curr:
                    duration = leave.end_day_session
                else:
                    duration = 'full'
                leave_map[curr.strftime('%Y-%m-%d')] = {
                    'leave_type': leave.leave_type.name if leave.leave_type_id else 'Leave',
                    'status': 'On Leave',
                    'duration': duration,
                }
                curr += timedelta(days=1)

        timeline_events = []
        if employee.date_of_joining > to_date:
            return Response({
                'timeline': [],
                'msg': 'No attendance records available. Employee joined after the requested dates.',
            })
        if from_date <= employee.date_of_joining <= to_date:
            from_date = employee.date_of_joining

        current_date = to_date
        today = timezone.localdate()

        while current_date >= from_date:
            date_str = current_date.strftime('%Y-%m-%d')
            ctx = resolve_day_context(employee, current_date)

            if ctx.day_type == 'holiday':
                timeline_events.append({
                    'date': date_str,
                    'type': 'holiday',
                    'details': {'name': ctx.holiday_name},
                    'status': 'holiday',
                })
            elif ctx.day_type == 'week_off':
                timeline_events.append({
                    'date': date_str,
                    'type': 'week_off',
                    'details': None,
                    'status': 'week_off',
                })
            elif ctx.day_type == 'leave':
                entry = {
                    'date': date_str,
                    'type': 'leave',
                    'details': leave_map.get(date_str, {
                        'leave_type': ctx.leave_type_name,
                        'duration': ctx.leave_session,
                    }),
                    'status': 'on_leave',
                }
                if date_str in attendance_map:
                    entry['Attandace_data'] = attendance_map[date_str]
                    entry['status'] = attendance_map[date_str].get('status', 'on_leave')
                timeline_events.append(entry)
            elif date_str in attendance_map:
                data = attendance_map[date_str]
                timeline_events.append({
                    'date': date_str,
                    'type': 'attendance',
                    'details': data,
                    'status': data.get('status'),
                    'arrival_status': data.get('arrival_status'),
                    'overtime_minutes': data.get('overtime_minutes'),
                })
            else:
                timeline_events.append({
                    'date': date_str,
                    'type': 'No Any Sesion Today' if current_date == today else 'absent',
                    'details': None,
                    'status': 'pending' if current_date == today else 'absent',
                })

            current_date -= timedelta(days=1)

        return Response({'timeline': timeline_events})

    @action(detail=False, methods=['post'], url_path='check-in')
    def check_in(self, request):
        employee = self.get_employee()
        today = timezone.localdate()
        lat = request.data.get('lat')
        lng = request.data.get('lng')
        work_mode = request.data.get('work_mode', 'office')

        allowed, block_reason, warnings = validate_check_in(employee, lat, lng, work_mode)
        if not allowed:
            return Response({'error': block_reason, 'blocked_reason': block_reason}, status=HTTP_400_BAD_REQUEST)

        within_geofence = True
        try:
            wl = employee.employeeorganization.work_location
            if wl and lat is not None and lng is not None:
                within_geofence, _ = check_geofence(lat, lng, wl)
        except AttributeError:
            pass

        with transaction.atomic():
            attendance_day, _ = AttendanceDay.objects.get_or_create(
                employee=employee,
                date=today,
            )
            if attendance_day.is_locked:
                return Response({'error': 'Attendance locked'}, status=HTTP_400_BAD_REQUEST)

            active_session = AttendanceSession.objects.filter(
                employee=employee,
                is_active=True,
                check_in__date=today,
            ).first()

            if active_session:
                return Response(
                    {'error': 'You must check-out before new check-in'},
                    status=HTTP_400_BAD_REQUEST,
                )

            session = AttendanceSession.objects.create(
                employee=employee,
                attendance_day=attendance_day,
                check_in=timezone.now(),
                is_active=True,
                work_mode=work_mode,
                clock_in_lat=lat,
                clock_in_lng=lng,
                ip_address=request.META.get('REMOTE_ADDR'),
                device=request.data.get('device'),
                browser=request.data.get('browser'),
                is_within_geofence=within_geofence,
            )
            attendance_day.update_totals()
            evaluate_attendance_day(attendance_day, lock=False)
            serializer = AttendanceDaySerializer(attendance_day)
            payload = {
                'message': 'Check-in successful',
                'AttandanceDay': serializer.data,
            }
            if warnings:
                payload['warnings'] = warnings
            return Response(payload, status=HTTP_200_OK)

    @action(detail=False, methods=['post'], url_path='check-out')
    def check_out(self, request):
        employee = self.get_employee()
        today = timezone.localdate()
        lat = request.data.get('lat')
        lng = request.data.get('lng')

        with transaction.atomic():
            session = (
                AttendanceSession.objects.filter(
                    employee=employee,
                    is_active=True,
                    check_in__date=today,
                )
                .select_for_update()
                .last()
            )

            if not session:
                return Response({'error': 'No active check-in found'}, status=HTTP_400_BAD_REQUEST)

            if session.attendance_day.is_locked:
                return Response({'error': 'Attendance locked'}, status=HTTP_400_BAD_REQUEST)

            within_geofence = session.is_within_geofence
            try:
                wl = employee.employeeorganization.work_location
                if wl and lat is not None and lng is not None:
                    within_geofence, _ = check_geofence(lat, lng, wl)
            except AttributeError:
                pass

            session.check_out = timezone.now()
            session.is_active = False
            session.duration = session.check_out - session.check_in
            session.clock_out_lat = lat
            session.clock_out_lng = lng
            session.is_within_geofence = within_geofence
            session.save()

            session.attendance_day.update_totals()
            evaluate_attendance_day(session.attendance_day, lock=False)

            serializer = AttendanceDaySerializer(session.attendance_day)
            return Response({
                'message': 'Check-out successful',
                'AttandanceDay': serializer.data,
            }, status=HTTP_200_OK)


class MyWeekOffDaysViewSet(ReadOnlyModelViewSet):
    serializer_class = WeeklyOffPolicySerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        try:
            bu_id = user.employee.employeeorganization.business_unit_id
            return WeeklyOffPolicy.objects.filter(business_unit__id=bu_id, is_active=True)
        except AttributeError:
            return WeeklyOffPolicy.objects.none()


class AttendanceStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        current_employee = getattr(request.user, 'employee', None)

        if not current_employee:
            return Response(
                {'message': 'Employee profile not found for this user.'},
                status=HTTP_404_NOT_FOUND,
            )

        today = timezone.localdate()
        default_fromdate = today - timedelta(days=7)

        fromdate_str = request.query_params.get('fromdate')
        todate_str = request.query_params.get('todate')

        try:
            fromdate = datetime.strptime(fromdate_str, '%Y-%m-%d').date() if fromdate_str else default_fromdate
            todate = datetime.strptime(todate_str, '%Y-%m-%d').date() if todate_str else today
        except ValueError:
            return Response(
                {'error': 'Invalid date format. Please use YYYY-MM-DD.'},
                status=HTTP_400_BAD_REQUEST,
            )

        if fromdate > todate:
            return Response(
                {'error': 'fromdate cannot be greater than todate.'},
                status=HTTP_400_BAD_REQUEST,
            )

        team_avg = None
        peers_avg = None
        my_avg = None

        if current_employee.reporting_to:
            team_stats = AttendanceDay.objects.filter(
                employee__reporting_to=current_employee.reporting_to,
                employee__is_active=True,
                date__range=(fromdate, todate),
            ).aggregate(avg_time=Avg('total_work_time'))
            team_avg = team_stats.get('avg_time')

        peers_stats = AttendanceDay.objects.filter(
            employee__reporting_to=current_employee,
            employee__is_active=True,
            date__range=(fromdate, todate),
        ).aggregate(avg_time=Avg('total_work_time'))
        peers_avg = peers_stats.get('avg_time')

        my_stats = AttendanceDay.objects.filter(
            employee=current_employee,
            date__range=(fromdate, todate),
        ).aggregate(avg_time=Avg('total_work_time'))
        my_avg = my_stats.get('avg_time')

        if current_employee.reporting_to:
            return Response({
                'team': {
                    'avg_time': str(peers_avg) if peers_avg else '0',
                    'percentage': calculate_time_percentage(peers_avg),
                },
                'peers': {
                    'avg_time': str(team_avg) if team_avg else '0',
                    'percentage': calculate_time_percentage(team_avg),
                },
                'my_stats': {
                    'avg_time': str(my_avg) if my_avg else '0',
                    'percentage': calculate_time_percentage(my_avg),
                },
                'metadata': {
                    'from_date': fromdate.strftime('%Y-%m-%d'),
                    'to_date': todate.strftime('%Y-%m-%d'),
                },
            }, status=HTTP_200_OK)
        return Response({
            'team': {
                'avg_time': str(team_avg) if team_avg else '0',
                'percentage': calculate_time_percentage(team_avg),
            },
            'my_stats': {
                'avg_time': str(my_avg) if my_avg else '0',
                'percentage': calculate_time_percentage(my_avg),
            },
            'metadata': {
                'from_date': fromdate.strftime('%Y-%m-%d'),
                'to_date': todate.strftime('%Y-%m-%d'),
            },
        }, status=HTTP_200_OK)

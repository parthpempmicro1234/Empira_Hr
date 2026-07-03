from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework.exceptions import ValidationError, PermissionDenied
from rest_framework.views import APIView

from django.utils.timezone import now
from django.db import transaction
from django.db.models import Sum
from django.utils import timezone
from django.core.exceptions import ObjectDoesNotExist

from datetime import timedelta, datetime, date
from decimal import Decimal
from collections import defaultdict
import calendar

from .serializers import LeaveSerializer, LeaveBalanceSerializer, LeavePolicySummarySerializer, LeaveHistoryMiniSerializer
from .models import Leave, LeaveBalance, LeavePolicy
from organization.models import EmployeeOrganization
from accounts.models import Employee
from .permissions import CanActOnLeaveRequest, IsHRorAdmin
from .utils import calculate_actual_leave_days
from notifications.services import (
    notify_leave_approved,
    notify_leave_cancelled,
    notify_leave_rejected,
    notify_leave_on_create,
)
class LeaveViewSet(viewsets.ModelViewSet):
    serializer_class = LeaveSerializer
    
    @property
    def current_employee(self):
        if not hasattr(self, '_current_employee'):
            try:
                self._current_employee = Employee.objects.get(user=self.request.user)
            except Employee.DoesNotExist:
                raise PermissionDenied("Employee profile not found.")
        return self._current_employee
    
    def get_queryset(self):
        year_param = self.request.query_params.get('year', str(now().year))
        user = self.request.user
        qs = Leave.objects.select_related('employee', 'leave_type', 'action_taken_by')
        employee = self.current_employee
        
        try:
            target_year = int(year_param)
            if target_year >= employee.date_of_joining.year:
                qs = qs.filter(start_date__year=target_year)
            else:
                return qs.none()
        except ValueError:
            qs = qs.filter(start_date__year=now().year)
            
        if user.role == 'employee':
            return qs.filter(employee=employee)

        if self.action == 'list':
            return qs.filter(employee=employee)

        if user.role == 'admin':
            return qs.all()
            
        if user.role == 'hr':
            hr_org_record = EmployeeOrganization.objects.filter(employee=employee).first()
            if hr_org_record and hr_org_record.business_unit_id:
                bu_id = hr_org_record.business_unit_id
                employees_in_bu = EmployeeOrganization.objects.filter(
                    business_unit_id=bu_id
                ).values_list('employee_id', flat=True)
                return qs.filter(employee_id__in=employees_in_bu)
            
            return qs.none() 

        return qs.filter(employee=employee)
    
    @action(detail=False, methods=['get'], permission_classes=[IsHRorAdmin], url_path='all')
    def all_leaves(self, request):
    
        qs = self.get_queryset()
        
        target_employee_id = request.query_params.get('employee_id')
        if target_employee_id:
            qs = qs.filter(employee_id=target_employee_id)
        
        page = self.paginate_queryset(qs)
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
            
        serializer = self.get_serializer(qs, many=True)
        return Response(serializer.data)

    def perform_create(self, serializer):
        
        employee = self.current_employee
        user_role = self.request.user.role

        requested_employee = serializer.validated_data.get('employee', employee)

        if user_role == 'employee' and requested_employee != employee:
            raise PermissionDenied("You can only apply for leave for yourself.")

        notify_ids = serializer.validated_data.pop('notify_employee_ids', [])
        notify_message = serializer.validated_data.pop('notify_message', '')

        leave = serializer.save(employee=requested_employee, requested_by=employee)
        notify_leave_on_create(
            leave,
            employee,
            notify_employee_ids=notify_ids,
            notify_message=notify_message,
        )

    @action(detail=True, methods=['post'], permission_classes=[IsHRorAdmin, CanActOnLeaveRequest])
    def approve(self, request, pk=None):
        leave = self.get_object()

        if leave.status != 'pending':
            raise ValidationError({"detail": "Only pending leaves can be approved."})

        with transaction.atomic():
            balance = LeaveBalance.objects.select_for_update().filter(
                employee=leave.employee,
                leave_type=leave.leave_type
            ).first()

            if not balance:
                raise ValidationError({"detail": f"Leave balance record not found."})

            if balance.remaining < leave.total_days:
                raise ValidationError({"detail": "Insufficient leave balance."})

            balance.used += leave.total_days
            balance.save(update_fields=['used'])

            leave.is_consumed = True
            leave.status = 'approved'
            leave.action_taken_by = self.current_employee
            leave.action_taken_on = now()
            leave.save(update_fields=['status', 'is_consumed', 'action_taken_by', 'action_taken_on'])

        notify_leave_approved(leave, self.current_employee)
        return Response({"message": "Leave approved successfully."})

    @action(detail=True, methods=['post'], permission_classes=[IsHRorAdmin, CanActOnLeaveRequest])
    def reject(self, request, pk=None):
        leave = self.get_object()
        
        rejection_reason = request.data.get('rejection_reason')
        if not rejection_reason:
            raise ValidationError({"rejection_reason": "You must provide a reason for rejecting this leave."})

        if leave.status != 'pending':
            raise ValidationError({"detail": "Only pending leaves can be rejected."})

        leave.status = 'rejected'
        leave.rejection_reason = rejection_reason
        leave.action_taken_by = self.current_employee
        leave.action_taken_on = now()
        leave.save(update_fields=['status', 'rejection_reason', 'action_taken_by', 'action_taken_on'])

        notify_leave_rejected(leave, self.current_employee)
        return Response({"message": "Leave rejected successfully."})

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def cancel(self, request, pk=None):

        leave = self.get_object()
        self.check_object_permissions(request, leave)
        
        today = now().date()
        user_role = request.user.role
        
        if leave.status in ['cancelled', 'rejected']:
            raise ValidationError({"detail": f"This leave is already {leave.status}."})

        if user_role == 'employee':
            if leave.status != 'pending':
                raise ValidationError({"detail": "Employees can only cancel pending leaves. Please contact HR to cancel an approved leave."})
            
            if leave.start_date <= today:
                raise ValidationError({"detail": "You cannot cancel a leave on or after its start date."})

        with transaction.atomic():

            if leave.status == 'approved':
                balance = LeaveBalance.objects.select_for_update().filter(
                    employee=leave.employee,
                    leave_type=leave.leave_type
                ).first()

                if balance:
                    balance.used -= leave.total_days
                    balance.save(update_fields=['used'])
                    
            leave.status = 'cancelled'
            leave.is_consumed = False
            leave.action_taken_by = self.current_employee
            leave.action_taken_on = now()
            leave.save(update_fields=['status', 'is_consumed', 'action_taken_by', 'action_taken_on'])

        if user_role == 'employee':
            notify_leave_cancelled(leave, self.current_employee, notify_hr=True)

        return Response({"message": "Leave cancelled successfully."})

    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated], url_path='stats')
    def stats(self, request):
        qs = self.get_queryset().filter(status='approved')
        
        user_role = request.user.role
        target_employee_id = request.query_params.get('employee_id')
        is_team_view = request.query_params.get('team', '').lower() == 'true'

        if target_employee_id:
            if user_role == 'employee' and str(target_employee_id) != str(self.current_employee.id):
                raise PermissionDenied("You can only view your own statistics.")
            qs = qs.filter(employee_id=target_employee_id)
        elif is_team_view:
            if user_role == 'employee':
                raise PermissionDenied("You do not have permission to view team statistics.")
        else:
            qs = qs.filter(employee=self.current_employee)


        try:
            year = int(request.query_params.get('year', now().year))
        except ValueError:
            raise ValidationError({"year": "Invalid year format. Must be an integer."})
        
        qs = qs.filter(start_date__year=year)

        leaves = qs.values(
            'employee_id', 
            'employee__display_name',
            'start_date', 'end_date', 'total_days', 'leave_type__name'
        )

        employee_stats_map = {}

        for leave in leaves:
            emp_id = leave['employee_id']
            
            if emp_id not in employee_stats_map:
                dname = leave.get('employee__display_name', '')
                
                employee_stats_map[emp_id] = {
                    "employee_id": emp_id,
                    "display_name": f"{dname}" or f"Employee #{emp_id}",
                    "weekly": {day: 0.0 for day in ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']},
                    "monthly": {month: 0.0 for month in ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']},
                    "consumed_types": {}
                }
                
            emp_data = employee_stats_map[emp_id]

            start_date = leave['start_date']
            end_date = leave['end_date']
            total_days = float(leave['total_days'])
            type_name = str(leave['leave_type__name']).lower()

            emp_data["consumed_types"][type_name] = emp_data["consumed_types"].get(type_name, 0.0) + total_days

            if start_date and end_date:
                days_span = (end_date - start_date).days + 1
                all_dates_in_leave = [start_date + timedelta(days=i) for i in range(days_span)]

                working_dates = [d for d in all_dates_in_leave if d.weekday() < 5]
                dates_to_use = working_dates if working_dates else all_dates_in_leave

                remaining_days = round(total_days * 2) / 2

                for current_day in dates_to_use:
                    if remaining_days <= 0:
                        break

                    assigned_value = min(remaining_days, 1.0)
                    day_str = current_day.strftime('%a')
                    month_str = current_day.strftime('%b')

                    emp_data["weekly"][day_str] += assigned_value
                    emp_data["monthly"][month_str] += assigned_value
                    remaining_days -= assigned_value

        def format_dict(data_dict):
            formatted = {}
            for key, value in data_dict.items():
                if value > 0:
                    formatted[key] = f"{value:g}d"
            return formatted

        final_result = []
        for emp_id, data in employee_stats_map.items():
            final_result.append({
                "employee_id": data["employee_id"],
                "display_name": data["display_name"],
                "weekly": format_dict(data["weekly"]),
                "monthly": format_dict(data["monthly"]),
                "Consumed Leave Types": format_dict(data["consumed_types"])
            })

        
        if is_team_view:
            return Response(final_result)
            
        if final_result:
            return Response({
                "weekly": final_result[0]["weekly"],
                "monthly": final_result[0]["monthly"],
                "Consumed Leave Types": final_result[0]["Consumed Leave Types"]
            })
        else:
            return Response({
                "weekly": {},
                "monthly": {},
                "Consumed Leave Types": {}
            })
        
    @action(detail=False, methods=['post'], url_path='validate')
    def validate_leave(self, request):

        employee = self.current_employee 
        if not employee:
            return Response({"error": "Employee profile required."}, status=status.HTTP_400_BAD_REQUEST)
            
        # 1. Validate Business Unit Assignment
        if not hasattr(employee, 'employeeorganization') or not employee.employeeorganization.business_unit:
            return Response({"error": "You are not assigned to any Business Unit."}, status=status.HTTP_400_BAD_REQUEST)
            
        business_unit = employee.employeeorganization.business_unit
        
        start_date_str = request.data.get('start_date')
        end_date_str = request.data.get('end_date')
        start_day_session = request.data.get('start_day_session', 'full')
        end_day_session = request.data.get('end_day_session', 'full')

        if not start_date_str or not end_date_str:
            return Response({"error": "start_date and end_date are required."}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
        except ValueError:
            return Response({"error": "Invalid date format. Use YYYY-MM-DD."}, status=status.HTTP_400_BAD_REQUEST)

        if start_date > end_date:
            return Response({"error": "End date cannot be before start date."}, status=status.HTTP_400_BAD_REQUEST)
            
        if start_date <= timezone.now().date():
            return Response({"error": "Start date cannot be before Today."}, status=status.HTTP_400_BAD_REQUEST)

        # 3. Overlapping Leaves Check (Global check regardless of leave type)
        overlapping_leaves = Leave.objects.filter(
            employee=employee,
            status__in=['pending', 'approved'],
            start_date__lte=end_date,
            end_date__gte=start_date
        ).exists()
        
        if overlapping_leaves:
            return Response({
                "is_valid": False,
                "message": "You already have a pending or approved leave during these dates."
            }, status=status.HTTP_200_OK)

        # 4. Calculate actual working days
        calculated_days = calculate_actual_leave_days(start_date, end_date, business_unit, start_day_session, end_day_session)
        calendar_days = (end_date - start_date).days + 1
        
        if calculated_days == 0:
            return Response({
                "calculated_days": 0,
                "is_valid": False,
                "message": "The selected date range only contains weekly off days."
            }, status=status.HTTP_200_OK)

        # 5. Check all available leave types and balances for the employee
        balances = employee.leave_balances.select_related('leave_type').all()
        leave_options = []
        request_days = Decimal(str(calculated_days))
        
        for balance in balances:
            is_allowed = True
            reasons = []
            warnings = []
            leave_type = balance.leave_type
            
            if leave_type.name == 'Sick':
                today = timezone.now().date()
                if (start_date - today).days not in [0, 1]:
                    is_allowed = False
                    reasons.append("Sick leave can only be applied for today or tomorrow.")
                    
            # Policy Checks
            try:
                policy = LeavePolicy.objects.get(
                    business_unit=business_unit, 
                    leave_type=leave_type, 
                    is_active=True
                )
                
                # Check Document Requirement (Adding as a warning since this is a preflight check)
                if policy.requires_document and calculated_days >= policy.document_required_after_days:
                    warnings.append(f"A medical/supporting document will be required for leaves of {policy.document_required_after_days} days or more.")
                
                # Check Max Days Per Month
                if policy.max_days_per_month and calculated_days > policy.max_days_per_month:
                    is_allowed = False
                    reasons.append(f"Policy restricts this leave type to a maximum of {policy.max_days_per_month} days per request/month.")
                    
            except LeavePolicy.DoesNotExist:
                is_allowed = False
                reasons.append("No active policy found for this leave type.")

            # Balance Checks (Accounting for Pending Leaves)
            pending_days = Leave.objects.filter(
                employee=employee, leave_type=leave_type, status='pending'
            ).aggregate(Sum('total_days'))['total_days__sum'] or Decimal('0.00')
            
            actual_remaining = balance.remaining - pending_days
            
            if actual_remaining < request_days:
                is_allowed = False
                reasons.append(f"Insufficient balance. You have {balance.remaining} days left, but {pending_days} days are currently pending approval.")
                
            leave_options.append({
                "leave_type_id": leave_type.id,
                "leave_type_name": leave_type.name,
                "total_balance": float(balance.remaining),
                "actual_available_balance": float(actual_remaining),
                "is_allowed": is_allowed,
                "reasons_if_not_allowed": reasons,
                "warnings": warnings  # e.g., "Document required"
            })

        return Response({
            "employee_id": employee.id,
            "start_date": start_date_str,
            "end_date": end_date_str,
            "calendar_days": calendar_days,
            "actual_deducted_days": float(calculated_days),
            "is_valid": True,  # True means the dates are valid, specific leave types may still be restricted
            "leave_options": leave_options
        }, status=status.HTTP_200_OK)

class LeaveBalanceViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = LeaveBalanceSerializer
    permission_classes = [IsAuthenticated]

    @property
    def current_employee(self):
        if not hasattr(self, '_current_employee'):
            try:
                self._current_employee = Employee.objects.get(user=self.request.user)
            except Employee.DoesNotExist:
                raise PermissionDenied("Employee profile not found.")
        return self._current_employee

    def get_queryset(self):
        user = self.request.user

        req_emp_id = self.request.query_params.get('employee_id')
        year_param = self.request.query_params.get('year', str(timezone.now().year))
        
        qs = LeaveBalance.objects.select_related(
                'employee__employeeorganization__business_unit', # Fetches BU in the same query
                'leave_type'
            ).prefetch_related(
                'leave_type__policies'
            )
        try:
            qs = qs.filter(year=int(year_param))
        except ValueError:
            qs = qs.filter(year=timezone.now().year)


        if req_emp_id:
            if user.role == 'admin':
                return qs.filter(employee_id=req_emp_id)
            
            elif user.role == 'hr':
                hr_org = EmployeeOrganization.objects.filter(employee=self.current_employee).first()
                if hr_org and hr_org.business_unit_id:

                    target_in_bu = EmployeeOrganization.objects.filter(
                        employee_id=req_emp_id, 
                        business_unit_id=hr_org.business_unit_id
                    ).exists()
                    
                    if target_in_bu:
                        return qs.filter(employee_id=req_emp_id)
                    else:
                        raise PermissionDenied("You do not have permission to view this employee's balance.")
                return qs.none()
            
            else:
                raise PermissionDenied("You can only view your own leave balances.")

        return qs.filter(employee=self.current_employee)
    

class LeaveSummaryDashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, *args, **kwargs):
        try:
            employee = request.user.employee 
            business_unit = employee.employeeorganization.business_unit
            if not business_unit:
                return Response({"error": "No Business Unit assigned."}, status=status.HTTP_400_BAD_REQUEST)
        except ObjectDoesNotExist:
            return Response({"error": "Employee profile data missing."}, status=status.HTTP_403_FORBIDDEN)

        current_date = timezone.now().date()
        year_param = request.query_params.get('year')
        
        if year_param:
            if int(year_param) < employee.date_of_joining.year:
                return Response({"error": "Invalid year parameter."}, status=status.HTTP_400_BAD_REQUEST)
            try:
                target_year = int(year_param)
            except ValueError:
                return Response({"error": "Invalid year parameter."}, status=status.HTTP_400_BAD_REQUEST)
        else:
            target_year = current_date.year

        if target_year < current_date.year:
            target_month = 12
        elif target_year == current_date.year:
            target_month = current_date.month
        else:
            target_month = 12

        policies = LeavePolicy.objects.filter(
            business_unit=business_unit, is_active=True
        ).select_related('leave_type')

        balances = LeaveBalance.objects.filter(
            employee=employee, year=target_year
        ).select_related('leave_type')

        history = Leave.objects.filter(
            employee=employee, 
            start_date__year=target_year,
            is_consumed=True
        ).select_related('leave_type')

        balance_map = {b.leave_type_id: b for b in balances}
        history_map = defaultdict(list)
        for h in history:
            history_map[h.leave_type_id].append(h)

        dashboard_data = []
        
        for policy in policies:
            leave_type = policy.leave_type
            balance_obj = balance_map.get(leave_type.id)
            type_history = history_map.get(leave_type.id, [])
            
            # 1. Base Balance Data
            balance_data = None
            if balance_obj:
                balance_data = {
                    "total_allocated": balance_obj.total_allocated,
                    "accrued_so_far": balance_obj.accrued_so_far,
                    "used": balance_obj.used,
                    "remaining": balance_obj.remaining
                }

            # 2. GENERATE THE TRANSACTION TIMELINE
            ledger_events = []
            total_earned_so_far = Decimal('0.00')

            # A. Add Carry Forward from previous year
            initial_cf = balance_obj.carried_forward if balance_obj else Decimal('0.00')
            if initial_cf > 0:
                ledger_events.append({
                    'date': date(target_year, 1, 1),
                    'change': initial_cf,
                    'reason': "Carried forward from previous year",
                    'type': 'accrual'
                })

            # B. Add Quotas / Accruals
            if policy.max_days_per_month:
                # Monthly Logic
                for m in range(1, target_month + 1):
                    added = policy.max_days_per_month
                    
                    # Cap it if there's a strict yearly limit
                    if policy.total_days_allocated > 0 and (total_earned_so_far + added) > policy.total_days_allocated:
                        added = policy.total_days_allocated - total_earned_so_far

                    if added > 0:
                        total_earned_so_far += added
                        reason_str = "Monthly Accrual"
                        
                        # Append expiry warning if no carry forward
                        if not policy.carry_forward_allowed:
                            last_day = calendar.monthrange(target_year, m)[1]
                            expiry_date = date(target_year, m, last_day)
                            reason_str += f" (expires on {expiry_date.strftime('%d %B %Y')})"

                        ledger_events.append({
                            'date': date(target_year, m, 1),
                            'change': added,
                            'reason': reason_str,
                            'type': 'accrual'
                        })
            else:
                # Yearly Logic
                allocated = balance_obj.total_allocated if balance_obj else policy.total_days_allocated
                if allocated > 0:
                    ledger_events.append({
                        'date': date(target_year, 1, 1),
                        'change': allocated,
                        'reason': "Annual leave quota allocation",
                        'type': 'accrual'
                    })

            # C. Add Leaves Taken
            for h in type_history:
                # Format a beautiful, human-readable reason
                if h.start_date == h.end_date:
                    reason = f"Leave applied for {h.start_date.strftime('%A, %d %B %Y')}"
                    if h.start_day_session == 'first_half':
                        reason += " (First half)"
                    elif h.start_day_session == 'second_half':
                        reason += " (Second half)"
                else:
                    reason = f"Leave applied from {h.start_date.strftime('%d %b')} to {h.end_date.strftime('%d %b %Y')}"
                    
                ledger_events.append({
                    'date': h.start_date, # Chronologically map the transaction to the leave start date
                    'change': -Decimal(str(h.total_days)),
                    'reason': reason,
                    'type': 'leave'
                })

            # 3. SORT EVENTS CHRONOLOGICALLY (Accruals happen before Leaves on the same day)
            def sort_key(e):
                type_priority = 0 if e['type'] == 'accrual' else 1
                return (e['date'], type_priority)

            ledger_events.sort(key=sort_key)

            # 4. CALCULATE RUNNING BALANCES & INJECT EXPIRATIONS
            balance_history = []
            current_balance = Decimal('0.00')

            if policy.max_days_per_month and not policy.carry_forward_allowed:
                # Strict Monthly Reset: We must process month-by-month to inject expirations
                events_by_month = defaultdict(list)
                for e in ledger_events:
                    events_by_month[e['date'].month].append(e)

                for m in range(1, target_month + 1):
                    month_events = events_by_month.get(m, [])
                    for e in month_events:
                        current_balance += e['change']
                        balance_history.append({
                            "transaction_date": e['date'].strftime('%Y-%m-%d'),
                            "change": float(e['change']),
                            "balance": float(current_balance),
                            "reason": e['reason']
                        })
                    
                    # End of month expiration check
                    if current_balance > 0:
                        last_day = calendar.monthrange(target_year, m)[1]
                        expiry_date = date(target_year, m, last_day)
                        expired_amt = current_balance
                        current_balance = Decimal('0.00') # Balance vanishes!

                        accrual_date = date(target_year, m, 1)
                        balance_history.append({
                            "transaction_date": expiry_date.strftime('%Y-%m-%d'),
                            "change": float(-expired_amt),
                            "balance": float(current_balance),
                            "reason": f"{float(expired_amt)} out of {float(expired_amt)} day(s) accrued on {accrual_date.strftime('%d %B %Y')} expired"
                        })
            else:
                # Standard carry-forward or yearly tracking
                for e in ledger_events:
                    current_balance += e['change']
                    balance_history.append({
                        "transaction_date": e['date'].strftime('%Y-%m-%d'),
                        "change": float(e['change']),
                        "balance": float(current_balance),
                        "reason": e['reason']
                    })

            # Reverse the timeline so the newest transaction is at the top of the UI
            balance_history.reverse()

            dashboard_data.append({
                "leave_type": {
                    "id": leave_type.id,
                    "name": leave_type.name,
                    "code": leave_type.code,
                },
                "balance": balance_data,
                "balance_history": balance_history
            })

        return Response(dashboard_data, status=200)

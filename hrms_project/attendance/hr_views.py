from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.viewsets import ModelViewSet
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError

from accounts.models import Employee
from organization.models import BusinessUnit, EmployeeOrganization, WeeklyOffPolicy
from leave.permissions import IsHRorAdmin

from .models import (
    AttendancePolicy,
    Shift,
    EmployeeShiftAssignment,
    AttendanceRegularization,
    AttendanceDay,
    OvertimeRequest,
)
from .serializers import (
    AttendancePolicySerializer,
    ShiftSerializer,
    EmployeeShiftAssignmentSerializer,
    AttendanceRegularizationSerializer,
    AttendanceRegularizationRejectSerializer,
    OvertimeRequestSerializer,
    OvertimeApproveSerializer,
)
from .hr_utils import (
    get_hr_business_unit,
    get_hr_business_unit_ids,
    assign_shift_to_all_bu_employees,
    create_office_default_setup,
)
from .services.policy_resolver import get_employee_policy, get_employee_shift
from .services.regularization import apply_regularization
from .services.evaluator import evaluate_attendance_day
from notifications.services import (
    notify_regularization_on_create,
    notify_regularization_decision,
)


class HRBusinessUnitMixin:
    """Auto-set business_unit from logged-in HR (admin may pass business_unit in body)."""

    def _inject_hr_business_unit(self, data):
        """Return mutable payload with business_unit set for HR before serializer validation."""
        if getattr(self.request.user, 'role', None) == 'admin':
            return data
        bu = get_hr_business_unit(self.request.user)
        if hasattr(data, 'copy'):
            payload = data.copy()
        else:
            payload = dict(data)
        payload['business_unit'] = bu.pk
        return payload

    def _resolve_business_unit(self):
        user = self.request.user
        if user.role == 'admin':
            bu_id = self.request.data.get('business_unit')
            if not bu_id and self.action in ('create', 'setup_office_default'):
                raise ValidationError(
                    {'business_unit': 'Admin must provide business_unit id.'}
                )
            if bu_id:
                return BusinessUnit.objects.get(pk=bu_id)
            return None
        return get_hr_business_unit(user)

    def create(self, request, *args, **kwargs):
        if getattr(request.user, 'role', None) != 'admin':
            serializer = self.get_serializer(data=self._inject_hr_business_unit(request.data))
            serializer.is_valid(raise_exception=True)
            self.perform_create(serializer)
            headers = self.get_success_headers(serializer.data)
            return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)
        return super().create(request, *args, **kwargs)

    def perform_create(self, serializer):
        bu = self._resolve_business_unit()
        if bu:
            serializer.save(business_unit=bu)
        else:
            serializer.save()


class AttendancePolicyViewSet(HRBusinessUnitMixin, ModelViewSet):
    serializer_class = AttendancePolicySerializer
    permission_classes = [IsAuthenticated, IsHRorAdmin]

    def get_queryset(self):
        bu_ids = get_hr_business_unit_ids(self.request.user)
        qs = AttendancePolicy.objects.filter(business_unit_id__in=bu_ids)
        bu = self.request.query_params.get('business_unit')
        if bu:
            qs = qs.filter(business_unit_id=bu)
        return qs.select_related('business_unit', 'weekly_off_policy')

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx

    @action(detail=False, methods=['post'], url_path='setup-office-default')
    def setup_office_default(self, request):
        """
        One-shot setup for HR BU: policy (8h30, OT needs approval) + flexible shift
        (09:30–10:30 check-in, 10:00–19:30 office, 1h lunch) + assign all BU employees.
        Body (optional): weekly_off_policy (id). No business_unit needed for HR.
        """
        user = request.user
        if user.role == 'admin':
            bu_id = request.data.get('business_unit')
            if not bu_id:
                return Response(
                    {'error': 'Admin must send business_unit in body.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )
            bu = BusinessUnit.objects.get(pk=bu_id)
        else:
            bu = get_hr_business_unit(user)

        wop_id = request.data.get('weekly_off_policy')
        wop = None
        if wop_id:
            wop = WeeklyOffPolicy.objects.filter(pk=wop_id, business_unit=bu).first()

        policy, shift, assigned = create_office_default_setup(bu, weekly_off_policy=wop)
        return Response({
            'message': 'Office default policy and shift created.',
            'business_unit_id': bu.id,
            'policy': AttendancePolicySerializer(policy, context={'request': request}).data,
            'shift': ShiftSerializer(shift, context={'request': request}).data,
            'employees_assigned': assigned,
        }, status=status.HTTP_201_CREATED)


class ShiftViewSet(HRBusinessUnitMixin, ModelViewSet):
    serializer_class = ShiftSerializer
    permission_classes = [IsAuthenticated, IsHRorAdmin]

    def get_queryset(self):
        bu_ids = get_hr_business_unit_ids(self.request.user)
        qs = Shift.objects.filter(business_unit_id__in=bu_ids)
        bu = self.request.query_params.get('business_unit')
        if bu:
            qs = qs.filter(business_unit_id=bu)
        return qs.select_related('business_unit')

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['request'] = self.request
        return ctx

    @action(detail=True, methods=['post'], url_path='assign-all-employees')
    def assign_all_employees(self, request, pk=None):
        shift = self.get_object()
        effective_from = request.data.get('effective_from') or timezone.localdate().isoformat()
        from datetime import datetime
        eff_date = datetime.strptime(effective_from, '%Y-%m-%d').date()
        count = assign_shift_to_all_bu_employees(shift, effective_from=eff_date)
        shift.is_default = True
        shift.save(update_fields=['is_default'])
        return Response({
            'message': f'Shift assigned to {count} employees.',
            'shift_id': shift.id,
            'effective_from': effective_from,
        })


class EmployeeShiftAssignmentViewSet(ModelViewSet):
    serializer_class = EmployeeShiftAssignmentSerializer
    permission_classes = [IsAuthenticated, IsHRorAdmin]

    def get_queryset(self):
        bu_ids = get_hr_business_unit_ids(self.request.user)
        return EmployeeShiftAssignment.objects.filter(
            shift__business_unit_id__in=bu_ids
        ).select_related('employee', 'shift')


class OvertimeRequestViewSet(ModelViewSet):
    serializer_class = OvertimeRequestSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'head', 'options']

    def get_queryset(self):
        user = self.request.user
        qs = OvertimeRequest.objects.select_related('employee', 'action_taken_by').order_by(
            '-created_at'
        )
        if user.role in ('hr', 'admin'):
            bu_ids = get_hr_business_unit_ids(user)
            emp_ids = EmployeeOrganization.objects.filter(
                business_unit_id__in=bu_ids
            ).values_list('employee_id', flat=True)
            status_filter = self.request.query_params.get('status')
            qs = qs.filter(employee_id__in=emp_ids)
            if status_filter:
                qs = qs.filter(status=status_filter)
            return qs
        employee = getattr(user, 'employee', None)
        if not employee:
            return qs.none()
        return qs.filter(employee=employee)

    def perform_create(self, serializer):
        serializer.save(status='pending')

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsHRorAdmin])
    def approve(self, request, pk=None):
        ot = self.get_object()
        if ot.status != 'pending':
            return Response({'error': 'Only pending requests can be approved.'}, status=400)
        ser = OvertimeApproveSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        approved_mins = ser.validated_data.get('approved_minutes') or ot.requested_minutes
        actor = getattr(request.user, 'employee', None)
        ot.status = 'approved'
        ot.approved_minutes = approved_mins
        ot.action_taken_by = actor
        ot.action_taken_on = timezone.now()
        ot.save()

        day = AttendanceDay.objects.filter(employee=ot.employee, date=ot.date).first()
        if day:
            evaluate_attendance_day(day, lock=False)

        return Response(OvertimeRequestSerializer(ot).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsHRorAdmin])
    def reject(self, request, pk=None):
        ot = self.get_object()
        if ot.status != 'pending':
            return Response({'error': 'Only pending requests can be rejected.'}, status=400)
        ser = AttendanceRegularizationRejectSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        actor = getattr(request.user, 'employee', None)
        ot.status = 'rejected'
        ot.rejection_reason = ser.validated_data['rejection_reason']
        ot.action_taken_by = actor
        ot.action_taken_on = timezone.now()
        ot.save()
        return Response(OvertimeRequestSerializer(ot).data)


class AttendanceRegularizationViewSet(ModelViewSet):
    serializer_class = AttendanceRegularizationSerializer
    permission_classes = [IsAuthenticated]
    http_method_names = ['get', 'post', 'head', 'options']

    def get_queryset(self):
        user = self.request.user
        qs = AttendanceRegularization.objects.select_related(
            'employee', 'action_taken_by'
        ).order_by('-created_at')

        if user.role in ('hr', 'admin'):
            bu_ids = get_hr_business_unit_ids(user)
            emp_ids = EmployeeOrganization.objects.filter(
                business_unit_id__in=bu_ids
            ).values_list('employee_id', flat=True)
            status_filter = self.request.query_params.get('status')
            qs = qs.filter(employee_id__in=emp_ids)
            if status_filter:
                qs = qs.filter(status=status_filter)
            return qs

        employee = getattr(user, 'employee', None)
        if not employee:
            return qs.none()
        return qs.filter(employee=employee)

    def perform_create(self, serializer):
        reg = serializer.save(status='pending')
        notify_regularization_on_create(reg)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsHRorAdmin])
    def approve(self, request, pk=None):
        reg = self.get_object()
        if reg.status != 'pending':
            return Response({'error': 'Only pending requests can be approved.'}, status=400)
        actor = getattr(request.user, 'employee', None)
        reg.status = 'approved'
        reg.action_taken_by = actor
        reg.action_taken_on = timezone.now()
        reg.save()
        apply_regularization(reg)
        notify_regularization_decision(reg, approved=True)
        return Response(AttendanceRegularizationSerializer(reg).data)

    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated, IsHRorAdmin])
    def reject(self, request, pk=None):
        reg = self.get_object()
        if reg.status != 'pending':
            return Response({'error': 'Only pending requests can be rejected.'}, status=400)
        ser = AttendanceRegularizationRejectSerializer(data=request.data)
        ser.is_valid(raise_exception=True)
        actor = getattr(request.user, 'employee', None)
        reg.status = 'rejected'
        reg.rejection_reason = ser.validated_data['rejection_reason']
        reg.action_taken_by = actor
        reg.action_taken_on = timezone.now()
        reg.save()
        notify_regularization_decision(reg, approved=False)
        return Response(AttendanceRegularizationSerializer(reg).data)


class MyPolicyView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        employee = get_object_or_404(Employee, user=request.user)
        today = timezone.localdate()
        policy = get_employee_policy(employee, today)
        if not policy:
            return Response({'policy': None})
        return Response({
            'policy': AttendancePolicySerializer(policy, context={'request': request}).data,
        })


class MyShiftView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        employee = get_object_or_404(Employee, user=request.user)
        today = timezone.localdate()
        shift = get_employee_shift(employee, today)
        if not shift:
            return Response({'shift': None})
        return Response({
            'shift': ShiftSerializer(shift, context={'request': request}).data,
        })


class AttendanceSummaryReportView(APIView):
    permission_classes = [IsAuthenticated, IsHRorAdmin]

    def get(self, request):
        year = int(request.query_params.get('year', timezone.localdate().year))
        month = int(request.query_params.get('month', timezone.localdate().month))
        bu_id = request.query_params.get('business_unit')

        import calendar
        from datetime import date
        _, num_days = calendar.monthrange(year, month)
        start = date(year, month, 1)
        end = date(year, month, num_days)

        bu_ids = get_hr_business_unit_ids(request.user)
        if bu_id:
            if int(bu_id) not in bu_ids and request.user.role != 'admin':
                return Response({'error': 'Unauthorized business unit.'}, status=403)
            bu_ids = [int(bu_id)]

        emp_ids = EmployeeOrganization.objects.filter(
            business_unit_id__in=bu_ids
        ).values_list('employee_id', flat=True)

        days = AttendanceDay.objects.filter(
            employee_id__in=emp_ids,
            date__range=(start, end),
        )

        summary = {}
        for day in days.select_related('employee'):
            eid = day.employee_id
            if eid not in summary:
                summary[eid] = {
                    'employee_id': eid,
                    'employee_name': day.employee.display_name,
                    'present': 0,
                    'absent': 0,
                    'half_day': 0,
                    'late': 0,
                    'on_leave': 0,
                    'holiday': 0,
                    'week_off': 0,
                    'total_overtime_minutes': 0,
                    'lop_flags': 0,
                }
            row = summary[eid]
            st = day.status
            if st == 'present':
                row['present'] += 1
            elif st == 'absent':
                row['absent'] += 1
            elif st == 'half_day':
                row['half_day'] += 1
            elif st == 'on_leave':
                row['on_leave'] += 1
            elif st == 'holiday':
                row['holiday'] += 1
            elif st == 'week_off':
                row['week_off'] += 1
            if day.arrival_status == 'late':
                row['late'] += 1
            row['total_overtime_minutes'] += day.overtime_minutes or 0
            flags = day.penalty_flags or {}
            if any(v == 'lop_flag' for v in flags.values()):
                row['lop_flags'] += 1

        return Response({
            'year': year,
            'month': month,
            'employees': list(summary.values()),
        })

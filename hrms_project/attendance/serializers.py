from rest_framework import serializers
from datetime import timedelta

from .models import (
    AttendanceDay,
    AttendanceSession,
    AttendancePolicy,
    Shift,
    EmployeeShiftAssignment,
    AttendanceRegularization,
    OvertimeRequest,
)
from .hr_utils import get_hr_business_unit
from organization.models import WeeklyOffPolicy, BusinessUnit


class BusinessUnitScopedSerializerMixin:
    """
    HR: business_unit is optional in request body — set from HR's EmployeeOrganization.
    Admin: business_unit is required on create.
    """

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        request = self.context.get('request')
        if (
            request
            and getattr(request.user, 'is_authenticated', False)
            and getattr(request.user, 'role', None) != 'admin'
            and 'business_unit' in self.fields
        ):
            self.fields['business_unit'].required = False
            self.fields['business_unit'].allow_null = True

    def validate(self, attrs):
        attrs = super().validate(attrs)
        request = self.context.get('request')
        if not request or not getattr(request.user, 'is_authenticated', False):
            return attrs

        role = getattr(request.user, 'role', None)
        if role == 'admin':
            if self.instance is None and not attrs.get('business_unit'):
                bu_id = self.initial_data.get('business_unit')
                if not bu_id:
                    raise serializers.ValidationError({
                        'business_unit': 'This field is required for admin users.',
                    })
                attrs['business_unit'] = BusinessUnit.objects.get(pk=bu_id)
        elif role == 'hr':
            attrs['business_unit'] = get_hr_business_unit(request.user)
        return attrs


class AttendanceSessionSerializer(serializers.ModelSerializer):
    class Meta:
        model = AttendanceSession
        fields = [
            'id',
            'check_in',
            'check_out',
            'duration',
            'break_duration',
            'work_mode',
            'clock_in_lat',
            'clock_in_lng',
            'clock_out_lat',
            'clock_out_lng',
            'is_within_geofence',
        ]


class AttendanceDaySerializer(serializers.ModelSerializer):
    sessions = AttendanceSessionSerializer(many=True, read_only=True)
    effective_time = serializers.SerializerMethodField()
    gross_time = serializers.SerializerMethodField()
    total_work_time = serializers.SerializerMethodField()
    total_gross_time = serializers.SerializerMethodField()
    evaluated_effective_time = serializers.SerializerMethodField()

    class Meta:
        model = AttendanceDay
        fields = [
            'id',
            'employee',
            'date',
            'status',
            'arrival_status',
            'total_work_time',
            'total_gross_time',
            'effective_work_time',
            'overtime_minutes',
            'penalty_flags',
            'evaluation_notes',
            'is_locked',
            'effective_time',
            'evaluated_effective_time',
            'gross_time',
            'sessions',
            'policy',
            'shift',
        ]

    def format_duration(self, value):
        if value is None:
            return '00:00:00'
        if isinstance(value, int):
            value = timedelta(seconds=value)
        return str(value)

    def get_total_work_time(self, obj):
        return self.format_duration(obj.total_work_time)

    def get_total_gross_time(self, obj):
        return self.format_duration(obj.total_gross_time)

    def get_evaluated_effective_time(self, obj):
        return self.format_duration(obj.effective_work_time)

    def get_effective_time(self, obj):
        total = obj.total_work_time or timedelta()
        has_active = obj.sessions.filter(is_active=True).exists()
        result = str(total)
        if has_active:
            if total == timedelta():
                return '00:00:00+'
            result += '+'
        return result

    def get_gross_time(self, obj):
        gross = obj.total_gross_time or timedelta()
        has_active = obj.sessions.filter(is_active=True).exists()
        result = str(gross)
        if has_active:
            if gross == timedelta():
                return '00:00:00+'
            result += '+'
        return result


class WeeklyOffPolicySerializer(serializers.ModelSerializer):
    class Meta:
        model = WeeklyOffPolicy
        fields = ['id', 'business_unit', 'name', 'policy_rules', 'is_active']


class AttendancePolicySerializer(BusinessUnitScopedSerializerMixin, serializers.ModelSerializer):
    business_unit = serializers.PrimaryKeyRelatedField(
        queryset=BusinessUnit.objects.all(),
        required=False,
        allow_null=True,
    )
    business_unit_name = serializers.CharField(source='business_unit.name', read_only=True)

    class Meta:
        model = AttendancePolicy
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']
        extra_kwargs = {
            'business_unit': {'required': False, 'allow_null': True},
        }


class ShiftSerializer(BusinessUnitScopedSerializerMixin, serializers.ModelSerializer):
    business_unit = serializers.PrimaryKeyRelatedField(
        queryset=BusinessUnit.objects.all(),
        required=False,
        allow_null=True,
    )
    business_unit_name = serializers.CharField(source='business_unit.name', read_only=True)

    class Meta:
        model = Shift
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']
        extra_kwargs = {
            'business_unit': {'required': False, 'allow_null': True},
        }


class OvertimeRequestSerializer(serializers.ModelSerializer):
    employee = serializers.PrimaryKeyRelatedField(read_only=True)
    employee_name = serializers.CharField(source='employee.display_name', read_only=True)

    class Meta:
        model = OvertimeRequest
        fields = [
            'id',
            'employee',
            'employee_name',
            'date',
            'requested_minutes',
            'reason',
            'status',
            'approved_minutes',
            'rejection_reason',
            'action_taken_by',
            'action_taken_on',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'employee',
            'status',
            'approved_minutes',
            'rejection_reason',
            'action_taken_by',
            'action_taken_on',
            'created_at',
            'updated_at',
        ]

    def validate(self, attrs):
        request = self.context['request']
        if self.instance is None:
            employee = getattr(request.user, 'employee', None)
            if not employee:
                raise serializers.ValidationError('Employee profile required.')
            attrs['employee'] = employee
        return attrs


class OvertimeApproveSerializer(serializers.Serializer):
    approved_minutes = serializers.IntegerField(required=False, min_value=1)


class EmployeeShiftAssignmentSerializer(serializers.ModelSerializer):
    shift_name = serializers.CharField(source='shift.name', read_only=True)
    employee_name = serializers.CharField(source='employee.display_name', read_only=True)

    class Meta:
        model = EmployeeShiftAssignment
        fields = [
            'id',
            'employee',
            'employee_name',
            'shift',
            'shift_name',
            'effective_from',
            'effective_to',
            'is_active',
            'created_at',
        ]
        read_only_fields = ['created_at']


class AttendanceRegularizationSerializer(serializers.ModelSerializer):
    employee = serializers.PrimaryKeyRelatedField(read_only=True)
    employee_name = serializers.CharField(source='employee.display_name', read_only=True)

    class Meta:
        model = AttendanceRegularization
        fields = [
            'id',
            'employee',
            'employee_name',
            'date',
            'request_type',
            'requested_check_in',
            'requested_check_out',
            'reason',
            'status',
            'rejection_reason',
            'action_taken_by',
            'action_taken_on',
            'created_at',
            'updated_at',
        ]
        read_only_fields = [
            'employee',
            'status',
            'rejection_reason',
            'action_taken_by',
            'action_taken_on',
            'created_at',
            'updated_at',
        ]

    def validate(self, attrs):
        request = self.context['request']
        if self.instance is None:
            employee = getattr(request.user, 'employee', None)
            if not employee:
                raise serializers.ValidationError('Employee profile required.')
            attrs['employee'] = employee
            reg_date = attrs.get('date')
            if reg_date and AttendanceRegularization.objects.filter(
                employee=employee,
                date=reg_date,
                status='pending',
            ).exists():
                raise serializers.ValidationError({
                    'date': ['A regularization request for this date is already pending.']
                })
        return attrs


class AttendanceRegularizationRejectSerializer(serializers.Serializer):
    rejection_reason = serializers.CharField(required=True, allow_blank=False)

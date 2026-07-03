from rest_framework import serializers

from django.db.models import Sum
from .models import Leave, LeavePolicy, LeaveBalance
from accounts.models import Employee

from decimal import Decimal

MAX_NOTIFY_EMPLOYEES = 20


class LeaveSerializer(serializers.ModelSerializer):
    notify_employee_ids = serializers.ListField(
        child=serializers.IntegerField(min_value=1),
        required=False,
        allow_empty=True,
        write_only=True,
    )
    notify_message = serializers.CharField(
        required=False,
        allow_blank=True,
        max_length=500,
        write_only=True,
    )

    leave_type_name = serializers.ReadOnlyField(source='leave_type.name')
    employee_name = serializers.ReadOnlyField(source='employee.display_name')
    requested_by_name = serializers.ReadOnlyField(source='requested_by.display_name')
    action_taken_by_name = serializers.ReadOnlyField(source='action_taken_by.display_name')
    joining_year = serializers.ReadOnlyField(source='employee.date_of_joining.year')
    
    class Meta:
        model = Leave
        fields = [
            'id',
            'employee',
            'leave_type',
            'start_day_session',
            'end_day_session',
            'total_days',
            'start_date',
            'end_date',
            'reason',
            'document',
            'status',
            'rejection_reason',
            'requested_by',
            'requested_on',
            'action_taken_by',
            'action_taken_on',
            'leave_type_name',
            'employee_name',
            'requested_by_name',
            'action_taken_by_name',
            'joining_year',
            'notify_employee_ids',
            'notify_message',
        ]
        read_only_fields = ['status', 'requested_by', 'action_taken_by', 'action_taken_on', 'is_consumed']
        
        extra_kwargs = {
            'employee': {'required': False},
        }

    def validate_notify_employee_ids(self, value):
        if value is None:
            return []
        if len(value) > MAX_NOTIFY_EMPLOYEES:
            raise serializers.ValidationError(
                f"You can notify at most {MAX_NOTIFY_EMPLOYEES} people."
            )
        unique_ids = list(dict.fromkeys(value))
        found = Employee.objects.filter(id__in=unique_ids, is_active=True).count()
        if found != len(unique_ids):
            raise serializers.ValidationError(
                "One or more selected employees are invalid or inactive."
            )
        return unique_ids

    def validate(self, data):
        request = self.context.get('request')
        employee = data.get('employee')
        
        if not employee:
            try:
                employee = Employee.objects.get(user=request.user)
                data['employee'] = employee 
            except Employee.DoesNotExist:
                raise serializers.ValidationError({"employee": "Employee profile not found for the logged-in user."})
        
        leave_type = data.get('leave_type')
        start_date = data.get('start_date')
        end_date = data.get('end_date')
        total_days = data.get('total_days')
        document = data.get('document')
        
        if start_date > end_date:
            raise serializers.ValidationError({"end_date": "End date cannot be before start date."})
        
        try:
            
            if not hasattr(employee, 'employeeorganization') or not employee.employeeorganization.business_unit:
                raise serializers.ValidationError({"employee": "You are not assigned to any Business Unit."})
            
            policy = LeavePolicy.objects.get(
                business_unit=employee.employeeorganization.business_unit, 
                leave_type=leave_type, 
                is_active=True
            )
        except LeavePolicy.DoesNotExist:
            raise serializers.ValidationError("No active policy found for this leave type.")
        
        if policy.requires_document and total_days >= policy.document_required_after_days:
            if not document:
                raise serializers.ValidationError({
                    "document": f"A medical/supporting document is required for leaves of {policy.document_required_after_days} days or more."
                })
                
        if policy.max_days_per_month and total_days > policy.max_days_per_month:
            raise serializers.ValidationError({
                "total_days": f"Policy restricts this leave type to a maximum of {policy.max_days_per_month} days per month."
            })
        
        overlapping_leaves = Leave.objects.filter(
            employee=employee,
            status__in=['pending', 'approved'],
            start_date__lte=end_date,
            end_date__gte=start_date
        ).exists()
        
        if overlapping_leaves:
            raise serializers.ValidationError("You already have a pending or approved leave during these dates.")
        
        balance = LeaveBalance.objects.filter(employee=employee, leave_type=leave_type).first()
        if not balance:
            raise serializers.ValidationError("Leave balance not found.")
        
        pending_days = Leave.objects.filter(
            employee=employee, leave_type=leave_type, status='pending'
        ).aggregate(Sum('total_days'))['total_days__sum'] or Decimal('0.00')
        
        actual_remaining = balance.remaining - pending_days
        
        request_days = Decimal(str(total_days))
        
        if actual_remaining < request_days:
            raise serializers.ValidationError({
                "total_days": f"Insufficient balance. You have {balance.remaining} days left, but {pending_days} days are currently pending approval."
            })

        return data
    
class LeaveBalanceSerializer(serializers.ModelSerializer):
    leave_type_name = serializers.CharField(source='leave_type.name', read_only=True)
    
    class Meta:
        model = LeaveBalance
        fields = ['id', 'leave_type_name', 'year', 'total_allocated', 'carried_forward', 'used', 'adjustments', 'remaining', 'accrued_so_far']
        
        
class LeavePolicySummarySerializer(serializers.ModelSerializer):
    class Meta:
        model = LeavePolicy
        fields = [
            'is_paid', 
            'total_days_allocated', 
            'max_days_per_month', 
            'requires_document', 
            'document_required_after_days', 
            'carry_forward_allowed'
        ]

class LeaveHistoryMiniSerializer(serializers.ModelSerializer):
    class Meta:
        model = Leave
        fields = [
            'id', 
            'start_date', 
            'end_date', 
            'start_day_session', 
            'end_day_session', 
            'total_days', 
            'status', 
            'reason', 
            'created_at'
        ]

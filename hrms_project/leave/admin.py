from django.contrib import admin
from .models import Leave, LeaveBalance, LeavePolicy, LeaveType

@admin.register(LeaveType)
class LeaveTypeAdmin(admin.ModelAdmin):
    list_display = [
        'id',
        'name',
        'code',
        'is_active',
        'created_at'
    ]
    list_filter = ['is_active']
    search_fields = ['name', 'code']
    readonly_fields = ['created_at']


@admin.register(LeavePolicy)
class LeavePolicyAdmin(admin.ModelAdmin):
    list_select_related = ['business_unit', 'leave_type']
    
    list_display = [
        'business_unit',
        'leave_type',
        'is_paid',
        'total_days_allocated',
        'carry_forward_allowed',
        'is_active'
    ]
    list_filter = [
        'business_unit',
        'leave_type',
        'is_active',
        'is_paid',
        'requires_document',
        'carry_forward_allowed'
    ]
    search_fields = [
        'business_unit__name', # Assumes your BusinessUnit model has a 'name' field
        'leave_type__name',
        'leave_type__code'
    ]
    readonly_fields = ['created_at', 'updated_at']

    # Group fields visually in the detail view
    fieldsets = (
        ('Core Assignment', {
            'fields': ('business_unit', 'leave_type', 'is_active', 'is_paid')
        }),
        ('Allocation Rules', {
            'fields': ('total_days_allocated', 'max_days_per_month')
        }),
        ('Document Rules', {
            'fields': ('requires_document', 'document_required_after_days')
        }),
        ('Carry Forward Rules', {
            'fields': ('carry_forward_allowed', 'max_carry_forward')
        }),
        ('System Timestamps', {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',) # Hides this section by default
        }),
    )


@admin.register(LeaveBalance)
class LeaveBalanceAdmin(admin.ModelAdmin):
    list_select_related = ['employee', 'leave_type']
    
    list_display = [
        'employee',
        'leave_type',
        'year',
        'total_allocated',
        'carried_forward',
        'used',
        'adjustments',
        'get_remaining_balance',
        'get_accrued_so_far' # Using a custom method for the @property
    ]
    list_filter = ['year', 'leave_type']
    search_fields = [
        'employee__display_name',
        'employee__user__work_email'
    ]
    # Useful if you have thousands of employees, prevents the dropdown from freezing the page
    raw_id_fields = ['employee'] 

    def get_remaining_balance(self, obj):
        return obj.remaining
    
    def get_accrued_so_far(self, obj):
        return obj.accrued_so_far
    
    get_accrued_so_far.short_description = 'Accured so far'
    get_remaining_balance.short_description = 'Remaining Days'


@admin.register(Leave)
class LeaveAdmin(admin.ModelAdmin):
    list_select_related = ['employee', 'leave_type', 'requested_by', 'action_taken_by']
    
    list_display = [
        'id',
        'employee',
        'leave_type',
        'start_date',
        'end_date',
        'total_days',
        'status',
        'action_taken_by'
    ]
    list_filter = [
        'status',
        'leave_type',
        'start_date',
        'is_consumed'
    ]
    search_fields = [
        'employee__display_name',
        'employee__user__work_email',
        'reason',
        'rejection_reason'
    ]
    readonly_fields = ['requested_on', 'action_taken_on', 'created_at', 'updated_at']
    raw_id_fields = ['employee', 'requested_by', 'action_taken_by']

    fieldsets = (
        ('Employee Information', {
            'fields': ('employee', 'leave_type')
        }),
        ('Leave Details', {
            'fields': ( 
                ('start_date', 'start_day_session'), 
                ('end_date', 'end_day_session'),
                'total_days', 
                'reason', 
                'document'
            )
        }),
        ('Approval & Tracking', {
            'fields': ('status', 'rejection_reason', 'is_consumed')
        }),
        ('Audit Log', {
            'fields': ('requested_by', 'requested_on', 'action_taken_by', 'action_taken_on', 'created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
from django.db import models
from django.utils import timezone
from django.db.models import Sum
from django.utils.functional import cached_property

# Create your models here.

from decimal import Decimal
class LeaveType(models.Model):
    name = models.CharField(max_length=50)
    code = models.CharField(max_length=20, unique=True)
    description = models.TextField(blank=True, null=True)
    
    is_active = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.name} ({self.code})"

class Leave(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
        ('cancelled', 'Cancelled'),
    ]

    SESSION_CHOICES = [
        ('full', 'Full Day'),
        ('first_half', 'First Half'),
        ('second_half', 'Second Half'),
    ]

    employee = models.ForeignKey('accounts.Employee', on_delete=models.CASCADE, related_name='leaves')
    leave_type = models.ForeignKey(LeaveType, on_delete=models.PROTECT, related_name='leaves')
    
    # duration_type = models.CharField(max_length=20, choices=SESSION_CHOICES, default='full')
    start_day_session = models.CharField(max_length=20, choices=SESSION_CHOICES, default='full')
    end_day_session = models.CharField(max_length=20, choices=SESSION_CHOICES, default='full')

    # Automatically calculated or user-inputted exact days (e.g., 2.5 days)
    total_days = models.DecimalField(max_digits=5, decimal_places=2, default=1.00)

    start_date = models.DateField()
    end_date = models.DateField()

    reason = models.TextField()
    document = models.FileField(upload_to='leave_docs/', null=True, blank=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    rejection_reason = models.TextField(null=True, blank=True)

    requested_by = models.ForeignKey('accounts.Employee', on_delete=models.SET_NULL, null=True, related_name='requested_leaves_history')
    requested_on = models.DateTimeField(auto_now_add=True)

    action_taken_by = models.ForeignKey('accounts.Employee', on_delete=models.SET_NULL, null=True, blank=True, related_name='approved_leaves_history')
    action_taken_on = models.DateTimeField(null=True, blank=True)

    is_consumed = models.BooleanField(default=False)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['employee', 'status']),
            models.Index(fields=['start_date', 'end_date']),
        ]

class LeavePolicy(models.Model):
    
    business_unit = models.ForeignKey(
        'organization.BusinessUnit', 
        on_delete=models.CASCADE, 
        related_name='leave_policies'
    )
    leave_type = models.ForeignKey(
        LeaveType, 
        on_delete=models.CASCADE, 
        related_name='policies'
    )

    is_paid = models.BooleanField(default=True)
    
    # Decimals allow for half-days (e.g., 1.5 days)
    total_days_allocated = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    max_days_per_month = models.DecimalField(max_digits=4, decimal_places=2, null=True, blank=True)
    
    requires_document = models.BooleanField(default=False)
    document_required_after_days = models.DecimalField(
        max_digits=4, decimal_places=2, default=0.00,
        help_text="Require document only if leave exceeds this many days"
    )
    
    carry_forward_allowed = models.BooleanField(default=False)
    max_carry_forward = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)

    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['business_unit', 'leave_type']

    def __str__(self):
        return f"{self.business_unit.name} - {self.leave_type.name} Policy"
    
class LeaveBalance(models.Model):
    employee = models.ForeignKey('accounts.Employee', on_delete=models.CASCADE, related_name='leave_balances')
    leave_type = models.ForeignKey('LeaveType', on_delete=models.CASCADE)
    year = models.PositiveIntegerField(default=timezone.now().year)

    total_allocated = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    
    carried_forward = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    
    used = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    adjustments = models.DecimalField(max_digits=5, decimal_places=2, default=0.00, help_text="Positive or negative manual adjustments")
    
    class Meta:
        unique_together = ['employee', 'leave_type', 'year']
        
    @cached_property
    def remaining(self):
        # 1. Fetch the active policy for this employee's business unit
        try:
            business_unit = self.employee.employeeorganization.business_unit
            policy = self.leave_type.policies.filter(business_unit=business_unit, is_active=True).first()
        except AttributeError:
            policy = None

        if policy and policy.max_days_per_month:
            current_month = timezone.now().month
            
            if policy.carry_forward_allowed:
                earned_so_far = policy.max_days_per_month * Decimal(str(current_month))
                
                if policy.total_days_allocated > 0 and earned_so_far > policy.total_days_allocated:
                    earned_so_far = policy.total_days_allocated
                
                return (earned_so_far + self.carried_forward + self.adjustments) - self.used
                
            else:
                from .models import Leave
                
                used_this_month = Leave.objects.filter(
                    employee=self.employee,
                    leave_type=self.leave_type,
                    status='approved',
                    start_date__year=self.year,
                    start_date__month=current_month
                ).aggregate(Sum('total_days'))['total_days__sum'] or Decimal('0.00')
                
                return (policy.max_days_per_month + self.adjustments) - used_this_month

        return (self.total_allocated + self.carried_forward + self.adjustments) - self.used
    
    @cached_property
    def accrued_so_far(self):
        try:
            business_unit = self.employee.employeeorganization.business_unit
            policy = self.leave_type.policies.filter(business_unit=business_unit, is_active=True).first()
        except AttributeError:
            policy = None
            
        if policy and policy.max_days_per_month:

                current_month = timezone.now().month
                earned = policy.max_days_per_month * Decimal(str(current_month))
                if policy.total_days_allocated > 0 and earned > policy.total_days_allocated:
                    return policy.total_days_allocated
                return earned
        return self.total_allocated
        

    def __str__(self):
        return f"{self.employee} - {self.leave_type.name} Balance ({self.year})"
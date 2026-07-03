from django.db import transaction
from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone

from .models import LeavePolicy, LeaveBalance
from organization.models import EmployeeOrganization

@receiver(post_save, sender=EmployeeOrganization, dispatch_uid="allocate_leave_balances")
def allocate_initial_leave_balances(sender, instance, created, **kwargs):

    if not instance.business_unit or not created:
        return

    employee = instance.employee
    business_unit = instance.business_unit
    current_year = timezone.now().year

    policies = LeavePolicy.objects.filter(
        business_unit=business_unit,
        is_active=True
    ).select_related("leave_type")

    with transaction.atomic():
        balances = [
            LeaveBalance(
                employee=employee,
                leave_type=policy.leave_type,
                year=current_year,
                total_allocated=policy.total_days_allocated,
                used=0.0,
                adjustments=0.0,
                carried_forward=0.0
            )
            for policy in policies
        ]

        LeaveBalance.objects.bulk_create(
            balances,
            ignore_conflicts=True
        )
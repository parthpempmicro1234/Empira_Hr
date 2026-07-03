# your_app_name/management/commands/reset_yearly_leaves.py
from django.core.management.base import BaseCommand
from django.utils import timezone
from django.db import transaction

# Make sure to import your models correctly based on your app name
from leave.models import LeavePolicy, LeaveBalance
from organization.models import EmployeeOrganization

class Command(BaseCommand):
    help = 'Resets leave balances for the new year and calculates carry-forward.'

    def handle(self, *args, **kwargs):
        current_year = timezone.now().year
        previous_year = current_year - 1

        self.stdout.write(f"Starting yearly leave reset for {current_year}...")

        # 1. Get all employees currently assigned to a Business Unit
        active_orgs = EmployeeOrganization.objects.select_related(
            'employee', 'business_unit'
        ).exclude(business_unit__isnull=True)
        
        created_count = 0

        with transaction.atomic(): 
            for org in active_orgs:
                policies = LeavePolicy.objects.filter(
                    business_unit=org.business_unit, 
                    is_active=True
                )

                for policy in policies:
                    # A. Skip if they already have a balance for the new year
                    if LeaveBalance.objects.filter(
                        employee=org.employee, 
                        leave_type=policy.leave_type, 
                        year=current_year
                    ).exists():
                        continue

                    # B. Calculate Carry-Forward from last year
                    carry_forward_days = 0.00
                    if policy.carry_forward_allowed:
                        try:
                            last_year_balance = LeaveBalance.objects.get(
                                employee=org.employee, 
                                leave_type=policy.leave_type, 
                                year=previous_year
                            )
                            # Give them their remaining balance, capped by the policy limit
                            carry_forward_days = min(
                                float(last_year_balance.remaining), 
                                float(policy.max_carry_forward)
                            )
                        except LeaveBalance.DoesNotExist:
                            # They didn't have a balance last year
                            pass 

                    # C. Create the brand new balance for the new year
                    LeaveBalance.objects.create(
                        employee=org.employee,
                        leave_type=policy.leave_type,
                        year=current_year,
                        total_allocated=policy.total_days_allocated,
                        carried_forward=carry_forward_days,
                        used=0.00,
                        adjustments=0.00
                    )
                    created_count += 1

        self.stdout.write(
            self.style.SUCCESS(f"Successfully generated {created_count} new leave balances for {current_year}.")
        )
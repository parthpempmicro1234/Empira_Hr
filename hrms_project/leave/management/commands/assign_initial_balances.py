from django.core.management.base import BaseCommand
from django.db import transaction
from django.utils import timezone
# Adjust these imports if your app names are different!
from accounts.models import Employee 
from leave.models import LeavePolicy, LeaveBalance

class Command(BaseCommand):
    help = 'Assigns initial leave balances to all active employees based on their Business Unit policies.'

    def handle(self, *args, **kwargs):
        self.stdout.write("Starting leave balance assignment...")

        # 1. Get all active employees
        employees = Employee.objects.filter(is_active=True).select_related(
            'employeeorganization__business_unit'
        )

        created_count = 0
        skipped_count = 0
        current_year = timezone.now().year

        # 2. Use atomic transaction
        with transaction.atomic():
            for employee in employees:
                try:
                    # FIX 1: Safely check if the employee has an organization and BU
                    if not hasattr(employee, 'employeeorganization') or not employee.employeeorganization.business_unit:
                        self.stdout.write(self.style.WARNING(f"Skipping {employee.display_name}: No Business Unit assigned."))
                        continue
                    
                    bu = employee.employeeorganization.business_unit
                    
                    # 3. Find active policies for this BU
                    policies = LeavePolicy.objects.filter(business_unit=bu, is_active=True)

                    for policy in policies:
                        # FIX 2: Use the exact field names from your models
                        balance_record, created = LeaveBalance.objects.get_or_create(
                            employee=employee,
                            leave_type=policy.leave_type,
                            year=current_year,  # Included year as required by your unique_together Meta
                            defaults={
                                'total_allocated': policy.total_days_allocated, # Changed from annual_allocation
                                'used': 0.00,
                                'carried_forward': 0.00,
                                'adjustments': 0.00
                            }
                        )

                        if created:
                            created_count += 1
                        else:
                            skipped_count += 1

                except Exception as e:
                    self.stdout.write(self.style.ERROR(f"Error processing {employee.display_name}: {str(e)}"))

        self.stdout.write(self.style.SUCCESS(
            f"Successfully finished! Created {created_count} new balances. Skipped {skipped_count} existing balances."
        ))
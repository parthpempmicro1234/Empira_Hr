from datetime import time

from django.utils import timezone
from rest_framework.exceptions import ValidationError

from accounts.models import Employee
from organization.models import BusinessUnit, EmployeeOrganization
from .models import AttendancePolicy, Shift, EmployeeShiftAssignment


def get_hr_business_unit(user):
    if user.role == 'admin':
        return None
    try:
        org = user.employee.employeeorganization
        if org and org.business_unit_id:
            return org.business_unit
    except AttributeError:
        pass
    raise ValidationError('HR user is not assigned to a business unit.')


def get_hr_business_unit_ids(user):
    if user.role == 'admin':
        return list(BusinessUnit.objects.filter(is_active=True).values_list('id', flat=True))
    bu = get_hr_business_unit(user)
    return [bu.id]


def assign_shift_to_all_bu_employees(shift, effective_from=None):
    effective_from = effective_from or timezone.localdate()
    emp_ids = EmployeeOrganization.objects.filter(
        business_unit_id=shift.business_unit_id,
        employee__is_active=True,
    ).values_list('employee_id', flat=True)

    created = 0
    for emp_id in emp_ids:
        EmployeeShiftAssignment.objects.filter(
            employee_id=emp_id,
            is_active=True,
        ).update(is_active=False)

        EmployeeShiftAssignment.objects.create(
            employee_id=emp_id,
            shift=shift,
            effective_from=effective_from,
            is_active=True,
        )
        created += 1
    return created


def create_office_default_setup(business_unit, weekly_off_policy=None):
    """
  Office policy: 10:00–19:30, flex check-in 09:30–10:30,
  8h30 effective work (510 min), 1h lunch break, OT only when approved.
    """
    policy, _ = AttendancePolicy.objects.update_or_create(
        business_unit=business_unit,
        name='Office Default Policy',
        defaults={
            'weekly_off_policy': weekly_off_policy,
            'is_active': True,
            'full_day_minutes': 510,
            'half_day_minutes': 255,
            'include_breaks_in_work_time': False,
            'late_grace_minutes': 0,
            'require_gps': True,
            'geofence_mode': 'warn',
            'block_punch_on_leave': True,
            'block_punch_on_holiday': True,
            'block_punch_on_week_off': True,
            'ot_enabled': True,
            'ot_after_shift_minutes': 0,
            'ot_daily_cap_minutes': 240,
            'ot_requires_approval': True,
            'penalize_late': True,
            'late_penalty_action': 'none',
        },
    )

    AttendancePolicy.objects.filter(business_unit=business_unit).exclude(id=policy.id).update(
        is_active=False
    )

    shift, _ = Shift.objects.update_or_create(
        business_unit=business_unit,
        name='Office General Shift',
        defaults={
            'code': 'OFFICE-GEN',
            'start_time': time(10, 0),
            'end_time': time(19, 30),
            'is_flexible': True,
            'flex_check_in_start': time(9, 30),
            'flex_check_in_end': time(10, 30),
            'min_effective_minutes': 510,
            'break_rules': [{'start': '13:00', 'end': '14:00'}],
            'break_min_minutes': 30,
            'break_max_minutes': 60,
            'is_default': True,
            'is_active': True,
        },
    )

    Shift.objects.filter(business_unit=business_unit).exclude(id=shift.id).update(
        is_default=False
    )

    assigned = assign_shift_to_all_bu_employees(shift)
    return policy, shift, assigned

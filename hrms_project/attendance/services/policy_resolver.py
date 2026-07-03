from datetime import date
from typing import Optional, Tuple

from django.db.models import Q

from attendance.models import AttendancePolicy, Shift, EmployeeShiftAssignment
from .day_context import get_business_unit_for_employee


def get_employee_policy(employee, target_date: date) -> Optional[AttendancePolicy]:
    business_unit = get_business_unit_for_employee(employee)
    if not business_unit:
        return None
    return (
        AttendancePolicy.objects.filter(business_unit=business_unit, is_active=True)
        .select_related('weekly_off_policy')
        .first()
    )


def get_employee_shift(employee, target_date: date) -> Optional[Shift]:
    assignment = (
        EmployeeShiftAssignment.objects.filter(
            employee=employee,
            is_active=True,
            effective_from__lte=target_date,
        )
        .filter(Q(effective_to__isnull=True) | Q(effective_to__gte=target_date))
        .select_related('shift')
        .order_by('-effective_from')
        .first()
    )
    if assignment:
        return assignment.shift

    business_unit = get_business_unit_for_employee(employee)
    if not business_unit:
        return None
    return Shift.objects.filter(business_unit=business_unit, is_active=True).first()


def get_policy_and_shift(employee, target_date: date) -> Tuple[Optional[AttendancePolicy], Optional[Shift]]:
    return get_employee_policy(employee, target_date), get_employee_shift(employee, target_date)

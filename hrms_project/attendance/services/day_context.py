from dataclasses import dataclass
from datetime import date
from typing import Optional

from organization.models import LeaveDays
from organization.utils import is_date_weekly_off
from leave.models import Leave


@dataclass
class DayContext:
    day_type: str  # holiday, week_off, leave, working
    holiday_name: Optional[str] = None
    leave_session: Optional[str] = None  # full, first_half, second_half
    leave_type_name: Optional[str] = None


def get_business_unit_for_employee(employee):
    try:
        return employee.employeeorganization.business_unit
    except AttributeError:
        return None


def _get_weekly_off_rules(business_unit):
    if not business_unit:
        return {}
    active_policy = business_unit.weekly_off_policies.filter(is_active=True).first()
    if active_policy:
        return active_policy.policy_rules or {}
    policy = business_unit.attendance_policies.filter(is_active=True).select_related(
        'weekly_off_policy'
    ).first()
    if policy and policy.weekly_off_policy and policy.weekly_off_policy.is_active:
        return policy.weekly_off_policy.policy_rules or {}
    return {}


def _leave_for_date(employee, target_date: date):
    leave = Leave.objects.filter(
        employee=employee,
        status='approved',
        start_date__lte=target_date,
        end_date__gte=target_date,
    ).select_related('leave_type').first()
    if not leave:
        return None, None, None

    if leave.start_date == leave.end_date == target_date:
        session = leave.start_day_session
    elif target_date == leave.start_date:
        session = leave.start_day_session
    elif target_date == leave.end_date:
        session = leave.end_day_session
    else:
        session = 'full'

    type_name = leave.leave_type.name if leave.leave_type_id else 'Leave'
    return leave, session, type_name


def resolve_day_context(employee, target_date: date) -> DayContext:
    business_unit = get_business_unit_for_employee(employee)

    if business_unit:
        holiday = LeaveDays.objects.filter(
            business_unit=business_unit,
            date=target_date,
            is_active=True,
        ).first()
        if holiday:
            return DayContext(day_type='holiday', holiday_name=holiday.name)

    policy_rules = _get_weekly_off_rules(business_unit)
    if is_date_weekly_off(target_date, policy_rules):
        return DayContext(day_type='week_off')

    _, session, type_name = _leave_for_date(employee, target_date)
    if session:
        return DayContext(
            day_type='leave',
            leave_session=session,
            leave_type_name=type_name,
        )

    return DayContext(day_type='working')


def is_company_holiday(business_unit, target_date: date) -> bool:
    if not business_unit:
        return False
    return LeaveDays.objects.filter(
        business_unit=business_unit,
        date=target_date,
        is_active=True,
    ).exists()


def is_week_off_for_bu(business_unit, target_date: date) -> bool:
    rules = _get_weekly_off_rules(business_unit)
    return is_date_weekly_off(target_date, rules)

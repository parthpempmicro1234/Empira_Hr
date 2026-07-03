from datetime import timedelta
from decimal import Decimal

from organization.utils import is_date_weekly_off
from organization.models import LeaveDays


def _is_holiday(business_unit, current_date) -> bool:
    if not business_unit:
        return False
    return LeaveDays.objects.filter(
        business_unit=business_unit,
        date=current_date,
        is_active=True,
    ).exists()


def calculate_actual_leave_days(
    start_date,
    end_date,
    business_unit,
    start_day_session='full',
    end_day_session='full',
):
    if start_date > end_date:
        return Decimal('0.0')

    working_days = Decimal('0.0')
    current_date = start_date

    active_policy = business_unit.weekly_off_policies.filter(is_active=True).first()
    policy_rules = active_policy.policy_rules if active_policy else {}

    if start_date == end_date:
        if _is_holiday(business_unit, current_date) or is_date_weekly_off(current_date, policy_rules):
            return Decimal('0.0')

        if start_day_session in ['first_half', 'second_half'] or end_day_session in ['first_half', 'second_half']:
            return Decimal('0.5')

        return Decimal('1.0')

    while current_date <= end_date:
        is_off = is_date_weekly_off(current_date, policy_rules) or _is_holiday(
            business_unit, current_date
        )

        if not is_off:
            working_days += Decimal('1.0')

            if current_date == start_date and start_day_session in ['second_half']:
                working_days -= Decimal('0.5')

            if current_date == end_date and end_day_session in ['first_half']:
                working_days -= Decimal('0.5')

        current_date += timedelta(days=1)

    return working_days

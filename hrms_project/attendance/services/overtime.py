from attendance.models import OvertimeRequest


def get_approved_overtime_minutes(employee, target_date) -> int:
    """Return HR-approved OT cap for the date, or 0 if none approved."""
    req = OvertimeRequest.objects.filter(
        employee=employee,
        date=target_date,
        status='approved',
    ).first()
    if not req:
        return 0
    return req.approved_minutes if req.approved_minutes is not None else req.requested_minutes

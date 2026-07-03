from django.utils import timezone

from attendance.models import AttendanceDay, AttendanceSession, AttendanceRegularization
from .evaluator import evaluate_attendance_day


def apply_regularization(regularization: AttendanceRegularization):
    employee = regularization.employee
    target_date = regularization.date

    attendance_day, _ = AttendanceDay.objects.get_or_create(
        employee=employee,
        date=target_date,
    )
    if attendance_day.is_locked:
        attendance_day.is_locked = False
        attendance_day.save(update_fields=['is_locked'])

    req_type = regularization.request_type
    work_mode = 'wfh' if req_type == 'wfh_mark' else 'office'

    if req_type in ('missed_check_in', 'both', 'wrong_time') and regularization.requested_check_in:
        within = True
        AttendanceSession.objects.create(
            employee=employee,
            attendance_day=attendance_day,
            check_in=regularization.requested_check_in,
            check_out=regularization.requested_check_out
            if req_type in ('both', 'wrong_time') and regularization.requested_check_out
            else None,
            is_active=not regularization.requested_check_out,
            work_mode=work_mode,
            is_within_geofence=within,
        )
    elif req_type == 'missed_check_out' and regularization.requested_check_out:
        session = (
            AttendanceSession.objects.filter(
                employee=employee,
                attendance_day=attendance_day,
                is_active=True,
            )
            .order_by('-check_in')
            .first()
        )
        if not session:
            session = AttendanceSession.objects.filter(
                employee=employee,
                attendance_day=attendance_day,
            ).order_by('-check_in').first()
        if session:
            session.check_out = regularization.requested_check_out
            session.is_active = False
            session.duration = session.check_out - session.check_in
            session.save()

    attendance_day.update_totals()
    evaluate_attendance_day(attendance_day, lock=False)
    return attendance_day

from datetime import datetime, timedelta, time
from typing import Any, Dict, List, Optional, Tuple

from django.utils import timezone

from attendance.models import AttendanceDay
from .day_context import resolve_day_context
from .policy_resolver import get_policy_and_shift
from .geofence import check_geofence
from .overtime import get_approved_overtime_minutes


def _combine(date_obj, t: time) -> datetime:
    tz = timezone.get_current_timezone()
    return timezone.make_aware(datetime.combine(date_obj, t), tz)


def _parse_break_time(date_obj, time_str: str) -> time:
    parts = time_str.split(':')
    return time(int(parts[0]), int(parts[1]))


def _break_overlap_minutes(sessions, date_obj, break_rules) -> int:
    if not break_rules:
        return 0
    total = 0
    for br in break_rules:
        try:
            b_start = _combine(date_obj, _parse_break_time(date_obj, br['start']))
            b_end = _combine(date_obj, _parse_break_time(date_obj, br['end']))
        except (KeyError, ValueError, IndexError):
            continue
        break_td = b_end - b_start
        for session in sessions:
            if not session.check_out:
                continue
            overlap_start = max(session.check_in, b_start)
            overlap_end = min(session.check_out, b_end)
            if overlap_end > overlap_start:
                total += int((overlap_end - overlap_start).total_seconds() // 60)
    return total


def _work_minutes(attendance_day: AttendanceDay) -> int:
    sessions = list(attendance_day.sessions.all().order_by('check_in'))
    if not sessions:
        return 0
    total_seconds = 0
    for s in sessions:
        if s.check_out and s.check_in:
            total_seconds += (s.check_out - s.check_in).total_seconds()
    return int(total_seconds // 60)


def _effective_minutes(attendance_day, policy, shift) -> int:
    work_mins = _work_minutes(attendance_day)
    if not policy or policy.include_breaks_in_work_time:
        return work_mins
    break_rules = shift.break_rules if shift else []
    deducted = _break_overlap_minutes(
        attendance_day.sessions.all(), attendance_day.date, break_rules
    )
    return max(0, work_mins - deducted)


def _compute_overtime(attendance_day, policy, shift, effective_mins: int) -> int:
    if not policy or not policy.ot_enabled:
        return 0

    if policy.ot_requires_approval:
        approved_cap = get_approved_overtime_minutes(
            attendance_day.employee, attendance_day.date
        )
        if approved_cap <= 0:
            return 0
    else:
        approved_cap = None

    if shift and not shift.is_flexible:
        shift_end = _combine(attendance_day.date, shift.end_time)
        last_out = None
        for s in attendance_day.sessions.exclude(check_out__isnull=True):
            if last_out is None or s.check_out > last_out:
                last_out = s.check_out
        if not last_out:
            return 0
        ot_start = shift_end + timedelta(minutes=policy.ot_after_shift_minutes)
        if last_out <= ot_start:
            return 0
        ot_mins = int((last_out - ot_start).total_seconds() // 60)
    else:
        threshold = shift.min_effective_minutes if shift else policy.full_day_minutes
        ot_mins = max(0, effective_mins - threshold)

    policy_cap = policy.ot_daily_cap_minutes
    if policy_cap:
        ot_mins = min(ot_mins, policy_cap)
    if approved_cap is not None:
        ot_mins = min(ot_mins, approved_cap)
    return ot_mins


def _arrival_status(attendance_day, policy, shift) -> Optional[str]:
    first = attendance_day.sessions.order_by('check_in').first()
    if not first or not shift:
        return None

    if shift.is_flexible and shift.flex_check_in_end:
        late_after = _combine(attendance_day.date, shift.flex_check_in_end)
        if first.check_in > late_after:
            return 'late'
        return 'on_time'

    grace = policy.late_grace_minutes if policy else 15
    shift_start = _combine(attendance_day.date, shift.start_time)
    allowed = shift_start + timedelta(minutes=grace)
    if first.check_in > allowed:
        return 'late'
    return 'on_time'


def _validate_session_break_gaps(attendance_day, shift) -> Optional[str]:
    """Validate gaps between sessions (split punch) against break min/max."""
    if not shift:
        return None
    sessions = list(attendance_day.sessions.order_by('check_in'))
    if len(sessions) < 2:
        return None
    for i in range(len(sessions) - 1):
        prev = sessions[i]
        nxt = sessions[i + 1]
        if not prev.check_out:
            continue
        gap_mins = int((nxt.check_in - prev.check_out).total_seconds() // 60)
        if gap_mins > 0:
            if gap_mins < shift.break_min_minutes:
                return f'Break too short ({gap_mins} min; minimum {shift.break_min_minutes} min).'
            if gap_mins > shift.break_max_minutes:
                return f'Break too long ({gap_mins} min; maximum {shift.break_max_minutes} min).'
    return None


def evaluate_attendance_day(attendance_day: AttendanceDay, lock: bool = False) -> AttendanceDay:
    employee = attendance_day.employee
    target_date = attendance_day.date
    ctx = resolve_day_context(employee, target_date)
    policy, shift = get_policy_and_shift(employee, target_date)

    attendance_day.policy = policy
    attendance_day.shift = shift
    penalty_flags: Dict[str, Any] = {}
    notes: List[str] = []

    if ctx.day_type == 'holiday':
        attendance_day.status = 'holiday'
        attendance_day.arrival_status = None
        attendance_day.effective_work_time = timedelta()
        attendance_day.overtime_minutes = 0
        attendance_day.penalty_flags = penalty_flags
        attendance_day.evaluation_notes = 'Company holiday'
        if lock:
            attendance_day.is_locked = True
        attendance_day.save()
        return attendance_day

    if ctx.day_type == 'week_off':
        attendance_day.status = 'week_off'
        attendance_day.arrival_status = None
        attendance_day.effective_work_time = timedelta()
        attendance_day.overtime_minutes = 0
        attendance_day.penalty_flags = penalty_flags
        attendance_day.evaluation_notes = 'Weekly off'
        if lock:
            attendance_day.is_locked = True
        attendance_day.save()
        return attendance_day

    if ctx.day_type == 'leave':
        attendance_day.status = 'on_leave'
        if ctx.leave_session in ('first_half', 'second_half'):
            attendance_day.status = 'half_day'
        attendance_day.arrival_status = None
        sessions_exist = attendance_day.sessions.exists()
        if sessions_exist:
            eff = _effective_minutes(attendance_day, policy, shift)
            attendance_day.effective_work_time = timedelta(minutes=eff)
            attendance_day.overtime_minutes = _compute_overtime(attendance_day, policy, shift, eff)
        else:
            attendance_day.effective_work_time = timedelta()
            attendance_day.overtime_minutes = 0
        attendance_day.penalty_flags = penalty_flags
        attendance_day.evaluation_notes = f"On leave ({ctx.leave_session})"
        if lock:
            attendance_day.is_locked = True
        attendance_day.save()
        return attendance_day

    sessions = attendance_day.sessions.exists()
    eff_mins = _effective_minutes(attendance_day, policy, shift) if sessions else 0
    attendance_day.effective_work_time = timedelta(minutes=eff_mins)
    attendance_day.overtime_minutes = _compute_overtime(attendance_day, policy, shift, eff_mins)
    attendance_day.arrival_status = _arrival_status(attendance_day, policy, shift)

    full_threshold = policy.full_day_minutes if policy else 480
    half_threshold = policy.half_day_minutes if policy else 240

    if not sessions:
        attendance_day.status = 'absent'
        if policy and policy.penalize_absent and policy.absent_penalty_action != 'none':
            penalty_flags['absent'] = policy.absent_penalty_action
            notes.append('Absent without punch')
    elif eff_mins >= full_threshold:
        attendance_day.status = 'present'
    elif eff_mins >= half_threshold:
        attendance_day.status = 'half_day'
        if policy and policy.penalize_short_hours and policy.short_hours_penalty_action != 'none':
            penalty_flags['short_hours'] = policy.short_hours_penalty_action
    else:
        attendance_day.status = 'half_day'
        if policy and policy.penalize_short_hours:
            penalty_flags['short_hours'] = policy.short_hours_penalty_action

    if attendance_day.arrival_status == 'late' and policy and policy.penalize_late:
        if policy.late_penalty_action != 'none':
            penalty_flags['late'] = policy.late_penalty_action
        notes.append('Late arrival')

    break_note = _validate_session_break_gaps(attendance_day, shift)
    if break_note:
        notes.append(break_note)
        penalty_flags['break_violation'] = 'none'

    attendance_day.penalty_flags = penalty_flags
    attendance_day.evaluation_notes = '; '.join(notes) if notes else ''
    if lock:
        attendance_day.is_locked = True
    attendance_day.save()
    return attendance_day


def validate_check_in(
    employee,
    lat: Optional[float],
    lng: Optional[float],
    work_mode: str = 'office',
) -> Tuple[bool, Optional[str], List[str]]:
    warnings: List[str] = []
    today = timezone.localdate()
    ctx = resolve_day_context(employee, today)
    policy, _ = get_policy_and_shift(employee, today)

    if policy:
        if ctx.day_type == 'holiday' and policy.block_punch_on_holiday:
            return False, 'Cannot punch on a company holiday.', warnings
        if ctx.day_type == 'week_off' and policy.block_punch_on_week_off:
            return False, 'Cannot punch on a weekly off day.', warnings
        if ctx.day_type == 'leave' and policy.block_punch_on_leave:
            return False, 'Cannot punch while on approved leave.', warnings

        if policy.require_gps and (lat is None or lng is None):
            return False, 'GPS coordinates are required.', warnings

        try:
            work_location = employee.employeeorganization.work_location
        except AttributeError:
            work_location = None

        if work_location and policy.geofence_mode != 'off':
            within, msg = check_geofence(lat, lng, work_location)
            if not within:
                if policy.geofence_mode == 'block':
                    return False, msg, warnings
                if msg:
                    warnings.append(msg)
    else:
        try:
            work_location = employee.employeeorganization.work_location
        except AttributeError:
            work_location = None
        if work_location and work_location.latitude is not None:
            within, msg = check_geofence(lat, lng, work_location)
            if not within and msg:
                warnings.append(msg)

    _, shift = get_policy_and_shift(employee, today)
    if shift and shift.is_flexible:
        now_dt = timezone.localtime()
        if shift.flex_check_in_start and shift.flex_check_in_end:
            window_start = _combine(today, shift.flex_check_in_start)
            window_end = _combine(today, shift.flex_check_in_end)
            if now_dt < window_start:
                return False, (
                    f'Check-in opens at {shift.flex_check_in_start.strftime("%H:%M")}. '
                    'You are too early.'
                ), warnings
            if now_dt > window_end:
                warnings.append(
                    f'Check-in window ended at {shift.flex_check_in_end.strftime("%H:%M")}. '
                    'You will be marked late.'
                )

    return True, None, warnings

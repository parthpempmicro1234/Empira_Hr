from datetime import date, time, timedelta
from decimal import Decimal

from django.test import TestCase
from django.utils import timezone

from accounts.models import Employee, User
from organization.models import BusinessUnit, WeeklyOffPolicy, LeaveDays, WorkLocation, EmployeeOrganization
from attendance.models import (
    AttendancePolicy,
    Shift,
    EmployeeShiftAssignment,
    AttendanceDay,
    AttendanceSession,
)
from attendance.services.day_context import resolve_day_context
from attendance.services.evaluator import evaluate_attendance_day, validate_check_in
from attendance.services.geofence import check_geofence, haversine_meters
from leave.utils import calculate_actual_leave_days


class AttendancePolicyTests(TestCase):
    def setUp(self):
        self.bu = BusinessUnit.objects.create(name='Engineering')
        self.wop = WeeklyOffPolicy.objects.create(
            business_unit=self.bu,
            name='Sat-Sun',
            policy_rules={'5': 'all', '6': 'all'},
            is_active=True,
        )
        self.policy = AttendancePolicy.objects.create(
            business_unit=self.bu,
            name='Default',
            weekly_off_policy=self.wop,
            full_day_minutes=480,
            half_day_minutes=240,
            geofence_mode='warn',
            block_punch_on_holiday=True,
        )
        self.shift = Shift.objects.create(
            business_unit=self.bu,
            name='General',
            start_time=time(9, 0),
            end_time=time(18, 0),
            is_flexible=False,
        )
        self.user = User.objects.create_user(
            username='emp1',
            email='emp1@test.com',
            password='pass',
            role='employee',
        )
        self.employee = Employee.objects.create(
            user=self.user,
            fname='Test',
            lname='Employee',
            display_name='Test Employee',
            employee_code='EMP001',
            work_email='emp1@test.com',
            date_of_joining=date(2020, 1, 1),
        )
        self.wl = WorkLocation.objects.create(
            name='HQ',
            city='Mumbai',
            latitude=19.0760,
            longitude=72.8777,
            radius_meters=500,
        )
        EmployeeOrganization.objects.create(
            employee=self.employee,
            business_unit=self.bu,
            work_location=self.wl,
        )
        EmployeeShiftAssignment.objects.create(
            employee=self.employee,
            shift=self.shift,
            effective_from=date(2020, 1, 1),
        )

    def test_day_context_holiday_priority(self):
        holiday_date = date(2025, 1, 26)
        LeaveDays.objects.create(
            name='Republic Day',
            date=holiday_date,
            business_unit=self.bu,
        )
        ctx = resolve_day_context(self.employee, holiday_date)
        self.assertEqual(ctx.day_type, 'holiday')
        self.assertEqual(ctx.holiday_name, 'Republic Day')

    def test_day_context_week_off(self):
        saturday = date(2025, 5, 24)
        ctx = resolve_day_context(self.employee, saturday)
        self.assertEqual(ctx.day_type, 'week_off')

    def test_leave_calculation_excludes_holiday(self):
        holiday_date = date(2025, 1, 26)
        LeaveDays.objects.create(name='Holiday', date=holiday_date, business_unit=self.bu)
        days = calculate_actual_leave_days(
            holiday_date,
            holiday_date,
            self.bu,
        )
        self.assertEqual(days, Decimal('0.0'))

    def test_geofence_within_radius(self):
        within, msg = check_geofence(19.0760, 72.8777, self.wl)
        self.assertTrue(within)
        self.assertIsNone(msg)

    def test_geofence_outside_radius(self):
        within, msg = check_geofence(19.1000, 72.9000, self.wl)
        self.assertFalse(within)
        self.assertIn('away', msg)

    def test_block_check_in_on_holiday(self):
        today = timezone.localdate()
        LeaveDays.objects.create(name='Holiday', date=today, business_unit=self.bu)
        allowed, reason, _ = validate_check_in(self.employee, 19.0760, 72.8777)
        self.assertFalse(allowed)
        self.assertIn('holiday', reason.lower())

    def test_late_arrival_evaluation(self):
        work_date = timezone.localdate()
        day, _ = AttendanceDay.objects.get_or_create(employee=self.employee, date=work_date)
        tz = timezone.get_current_timezone()
        shift_start = timezone.make_aware(
            timezone.datetime.combine(work_date, self.shift.start_time),
            tz,
        )
        late_checkin = shift_start + timedelta(minutes=60)
        AttendanceSession.objects.create(
            employee=self.employee,
            attendance_day=day,
            check_in=late_checkin,
            check_out=late_checkin + timedelta(hours=9),
            is_active=False,
        )
        day.update_totals()
        evaluate_attendance_day(day)
        day.refresh_from_db()
        self.assertEqual(day.arrival_status, 'late')
        self.assertEqual(day.status, 'present')

    def test_absent_when_no_sessions(self):
        work_date = timezone.localdate()
        while resolve_day_context(self.employee, work_date).day_type != 'working':
            work_date -= timedelta(days=1)
        day, _ = AttendanceDay.objects.get_or_create(employee=self.employee, date=work_date)
        evaluate_attendance_day(day, lock=True)
        day.refresh_from_db()
        self.assertEqual(day.status, 'absent')
        self.assertTrue(day.is_locked)

    def test_haversine_zero_distance(self):
        d = haversine_meters(19.0, 72.0, 19.0, 72.0)
        self.assertEqual(d, 0)

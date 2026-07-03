from django.db import models
from django.db.models import Q
from django.core.exceptions import ValidationError
from datetime import timedelta


class AttendancePolicy(models.Model):
    GEOFENCE_MODE_CHOICES = [
        ('off', 'Off'),
        ('warn', 'Warn'),
        ('block', 'Block'),
    ]
    PENALTY_ACTION_CHOICES = [
        ('none', 'None'),
        ('half_day', 'Half Day'),
        ('lop_flag', 'LOP Flag'),
    ]

    business_unit = models.ForeignKey(
        'organization.BusinessUnit',
        on_delete=models.CASCADE,
        related_name='attendance_policies',
    )
    name = models.CharField(max_length=100)
    weekly_off_policy = models.ForeignKey(
        'organization.WeeklyOffPolicy',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='attendance_policies',
    )
    is_active = models.BooleanField(default=True)

    full_day_minutes = models.PositiveIntegerField(default=480)
    half_day_minutes = models.PositiveIntegerField(default=240)
    include_breaks_in_work_time = models.BooleanField(default=False)
    late_grace_minutes = models.PositiveIntegerField(default=15)
    early_out_grace_minutes = models.PositiveIntegerField(default=15)
    round_punch_to_minutes = models.PositiveIntegerField(default=0, help_text='0 = no rounding')

    require_gps = models.BooleanField(default=True)
    geofence_mode = models.CharField(max_length=10, choices=GEOFENCE_MODE_CHOICES, default='warn')
    block_punch_on_leave = models.BooleanField(default=False)
    block_punch_on_holiday = models.BooleanField(default=True)
    block_punch_on_week_off = models.BooleanField(default=True)

    ot_enabled = models.BooleanField(default=True)
    ot_after_shift_minutes = models.PositiveIntegerField(default=0)
    ot_daily_cap_minutes = models.PositiveIntegerField(default=240)
    ot_requires_approval = models.BooleanField(default=False)

    penalize_late = models.BooleanField(default=True)
    penalize_short_hours = models.BooleanField(default=True)
    penalize_absent = models.BooleanField(default=True)
    late_penalty_action = models.CharField(max_length=20, choices=PENALTY_ACTION_CHOICES, default='none')
    short_hours_penalty_action = models.CharField(max_length=20, choices=PENALTY_ACTION_CHOICES, default='half_day')
    absent_penalty_action = models.CharField(max_length=20, choices=PENALTY_ACTION_CHOICES, default='lop_flag')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('business_unit', 'name')
        indexes = [models.Index(fields=['business_unit', 'is_active'])]

    def __str__(self):
        return f"{self.name} ({self.business_unit.name})"


class Shift(models.Model):
    business_unit = models.ForeignKey(
        'organization.BusinessUnit',
        on_delete=models.CASCADE,
        related_name='shifts',
    )
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=20, blank=True)
    start_time = models.TimeField(help_text='Nominal shift start, e.g. 10:00')
    end_time = models.TimeField(help_text='Nominal shift end, e.g. 19:30')
    is_flexible = models.BooleanField(default=False)
    flex_check_in_start = models.TimeField(
        null=True,
        blank=True,
        help_text='Earliest allowed check-in for flexible shift, e.g. 09:30',
    )
    flex_check_in_end = models.TimeField(
        null=True,
        blank=True,
        help_text='Latest on-time check-in for flexible shift, e.g. 10:30',
    )
    grace_in_minutes = models.PositiveIntegerField(default=15)
    grace_out_minutes = models.PositiveIntegerField(default=15)
    min_effective_minutes = models.PositiveIntegerField(
        default=510,
        help_text='Required effective work minutes per day (e.g. 510 = 8h 30m)',
    )
    break_rules = models.JSONField(
        default=list,
        blank=True,
        help_text='List of {"start": "13:00", "end": "14:00"} within shift',
    )
    break_min_minutes = models.PositiveIntegerField(
        default=30,
        help_text='Minimum break duration when employee takes a split shift',
    )
    break_max_minutes = models.PositiveIntegerField(
        default=60,
        help_text='Maximum break duration allowed',
    )
    is_default = models.BooleanField(
        default=False,
        help_text='Default shift for this business unit',
    )
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ('business_unit', 'name')
        indexes = [models.Index(fields=['business_unit', 'is_active'])]

    def __str__(self):
        return f"{self.name} ({self.business_unit.name})"


class EmployeeShiftAssignment(models.Model):
    employee = models.ForeignKey(
        'accounts.Employee',
        on_delete=models.CASCADE,
        related_name='shift_assignments',
    )
    shift = models.ForeignKey(Shift, on_delete=models.CASCADE, related_name='assignments')
    effective_from = models.DateField()
    effective_to = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        indexes = [
            models.Index(fields=['employee', 'effective_from', 'effective_to']),
        ]

    def clean(self):
        if self.effective_to and self.effective_from > self.effective_to:
            raise ValidationError('effective_from must be on or before effective_to')


class AttendanceDay(models.Model):
    employee = models.ForeignKey('accounts.Employee', on_delete=models.CASCADE, related_name='attendance_days')
    date = models.DateField(db_index=True)

    status = models.CharField(
        max_length=20,
        choices=[
            ('present', 'Present'),
            ('absent', 'Absent'),
            ('half_day', 'Half Day'),
            ('week_off', 'Week Off'),
            ('holiday', 'Holiday'),
            ('on_leave', 'On Leave'),
        ],
        default='present',
    )

    arrival_status = models.CharField(
        max_length=20,
        choices=[
            ('on_time', 'On Time'),
            ('late', 'Late'),
        ],
        null=True,
        blank=True,
    )

    total_work_time = models.DurationField(null=True, blank=True)
    total_gross_time = models.DurationField(null=True, blank=True)
    effective_work_time = models.DurationField(null=True, blank=True)
    overtime_minutes = models.PositiveIntegerField(default=0)

    policy = models.ForeignKey(
        AttendancePolicy,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='attendance_days',
    )
    shift = models.ForeignKey(
        Shift,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='attendance_days',
    )
    penalty_flags = models.JSONField(default=dict, blank=True)
    evaluation_notes = models.TextField(blank=True)

    is_locked = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['employee', 'date']
        indexes = [
            models.Index(fields=['employee', 'date']),
            models.Index(fields=['employee', 'status']),
        ]

    def update_totals(self):
        sessions = self.sessions.all().order_by('check_in')
        if not sessions.exists():
            return

        total_work = timedelta()
        for session in sessions:
            if session.check_out and session.check_in:
                total_work += (session.check_out - session.check_in)

        self.total_work_time = total_work
        first_checkin = sessions.first().check_in
        last_checkout_session = sessions.exclude(check_out__isnull=True).last()

        if first_checkin and last_checkout_session and last_checkout_session.check_out:
            self.total_gross_time = last_checkout_session.check_out - first_checkin
        else:
            self.total_gross_time = timedelta()

        self.save(update_fields=['total_work_time', 'total_gross_time', 'updated_at'])


class AttendanceSession(models.Model):
    WORK_MODE_CHOICES = [
        ('office', 'Office'),
        ('wfh', 'Work From Home'),
        ('remote', 'Remote'),
    ]

    employee = models.ForeignKey('accounts.Employee', on_delete=models.CASCADE, related_name='attendance_sessions')
    attendance_day = models.ForeignKey(AttendanceDay, on_delete=models.CASCADE, related_name='sessions')

    check_in = models.DateTimeField()
    check_out = models.DateTimeField(null=True, blank=True)

    duration = models.DurationField(null=True, blank=True)
    break_duration = models.DurationField(null=True, blank=True)

    is_active = models.BooleanField(default=True)

    work_mode = models.CharField(max_length=10, choices=WORK_MODE_CHOICES, default='office')

    clock_in_lat = models.FloatField(null=True, blank=True)
    clock_in_lng = models.FloatField(null=True, blank=True)
    clock_out_lat = models.FloatField(null=True, blank=True)
    clock_out_lng = models.FloatField(null=True, blank=True)
    accuracy = models.FloatField(null=True, blank=True)

    ip_address = models.GenericIPAddressField(null=True, blank=True)
    device = models.CharField(max_length=100, null=True, blank=True)
    browser = models.CharField(max_length=100, null=True, blank=True)

    is_within_geofence = models.BooleanField(default=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['employee', 'check_in']),
            models.Index(fields=['attendance_day']),
        ]


class OvertimeRequest(models.Model):
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    employee = models.ForeignKey(
        'accounts.Employee',
        on_delete=models.CASCADE,
        related_name='overtime_requests',
    )
    date = models.DateField()
    requested_minutes = models.PositiveIntegerField(
        help_text='Expected OT minutes for this date',
    )
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    approved_minutes = models.PositiveIntegerField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)
    action_taken_by = models.ForeignKey(
        'accounts.Employee',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='overtime_approvals',
    )
    action_taken_on = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['employee', 'date', 'status']),
        ]


class AttendanceRegularization(models.Model):
    REQUEST_TYPES = [
        ('missed_check_in', 'Missed Check In'),
        ('missed_check_out', 'Missed Check Out'),
        ('both', 'Both'),
        ('wrong_time', 'Wrong Time'),
        ('wfh_mark', 'WFH Mark'),
    ]
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    employee = models.ForeignKey(
        'accounts.Employee',
        on_delete=models.CASCADE,
        related_name='attendance_regularizations',
    )
    date = models.DateField()
    request_type = models.CharField(max_length=30, choices=REQUEST_TYPES)
    requested_check_in = models.DateTimeField(null=True, blank=True)
    requested_check_out = models.DateTimeField(null=True, blank=True)
    reason = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    rejection_reason = models.TextField(blank=True)
    action_taken_by = models.ForeignKey(
        'accounts.Employee',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='regularization_actions',
    )
    action_taken_on = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=['employee', 'date', 'status']),
        ]
        constraints = [
            models.UniqueConstraint(
                fields=['employee', 'date'],
                condition=Q(status='pending'),
                name='unique_pending_regularization_per_employee_date',
            )
        ]

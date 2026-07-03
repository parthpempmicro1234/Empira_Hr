import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0008_alter_zipcode_unique_together'),
        ('organization', '0009_worklocation_geofence'),
        ('attendance', '0002_rename_is_week_off_attendanceday_is_locked_and_more'),
    ]

    operations = [
        migrations.CreateModel(
            name='AttendancePolicy',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('is_active', models.BooleanField(default=True)),
                ('full_day_minutes', models.PositiveIntegerField(default=480)),
                ('half_day_minutes', models.PositiveIntegerField(default=240)),
                ('include_breaks_in_work_time', models.BooleanField(default=False)),
                ('late_grace_minutes', models.PositiveIntegerField(default=15)),
                ('early_out_grace_minutes', models.PositiveIntegerField(default=15)),
                ('round_punch_to_minutes', models.PositiveIntegerField(default=0, help_text='0 = no rounding')),
                ('require_gps', models.BooleanField(default=True)),
                ('geofence_mode', models.CharField(choices=[('off', 'Off'), ('warn', 'Warn'), ('block', 'Block')], default='warn', max_length=10)),
                ('block_punch_on_leave', models.BooleanField(default=True)),
                ('block_punch_on_holiday', models.BooleanField(default=True)),
                ('block_punch_on_week_off', models.BooleanField(default=False)),
                ('ot_enabled', models.BooleanField(default=True)),
                ('ot_after_shift_minutes', models.PositiveIntegerField(default=0)),
                ('ot_daily_cap_minutes', models.PositiveIntegerField(default=240)),
                ('ot_requires_approval', models.BooleanField(default=False)),
                ('penalize_late', models.BooleanField(default=True)),
                ('penalize_short_hours', models.BooleanField(default=True)),
                ('penalize_absent', models.BooleanField(default=True)),
                ('late_penalty_action', models.CharField(choices=[('none', 'None'), ('half_day', 'Half Day'), ('lop_flag', 'LOP Flag')], default='none', max_length=20)),
                ('short_hours_penalty_action', models.CharField(choices=[('none', 'None'), ('half_day', 'Half Day'), ('lop_flag', 'LOP Flag')], default='half_day', max_length=20)),
                ('absent_penalty_action', models.CharField(choices=[('none', 'None'), ('half_day', 'Half Day'), ('lop_flag', 'LOP Flag')], default='lop_flag', max_length=20)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('business_unit', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='attendance_policies', to='organization.businessunit')),
                ('weekly_off_policy', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='attendance_policies', to='organization.weeklyoffpolicy')),
            ],
            options={
                'indexes': [models.Index(fields=['business_unit', 'is_active'], name='attendance__busines_8a0f0d_idx')],
                'unique_together': {('business_unit', 'name')},
            },
        ),
        migrations.CreateModel(
            name='Shift',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(max_length=100)),
                ('code', models.CharField(blank=True, max_length=20)),
                ('start_time', models.TimeField()),
                ('end_time', models.TimeField()),
                ('is_flexible', models.BooleanField(default=False)),
                ('grace_in_minutes', models.PositiveIntegerField(default=15)),
                ('grace_out_minutes', models.PositiveIntegerField(default=15)),
                ('min_effective_minutes', models.PositiveIntegerField(default=480)),
                ('break_rules', models.JSONField(blank=True, default=list, help_text='List of {"start": "13:00", "end": "14:00"} within shift')),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('business_unit', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='shifts', to='organization.businessunit')),
            ],
            options={
                'indexes': [models.Index(fields=['business_unit', 'is_active'], name='attendance__busines_2c8f1a_idx')],
                'unique_together': {('business_unit', 'name')},
            },
        ),
        migrations.AddField(
            model_name='attendanceday',
            name='effective_work_time',
            field=models.DurationField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='attendanceday',
            name='evaluation_notes',
            field=models.TextField(blank=True),
        ),
        migrations.AddField(
            model_name='attendanceday',
            name='overtime_minutes',
            field=models.PositiveIntegerField(default=0),
        ),
        migrations.AddField(
            model_name='attendanceday',
            name='penalty_flags',
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AlterField(
            model_name='attendanceday',
            name='status',
            field=models.CharField(
                choices=[
                    ('present', 'Present'),
                    ('absent', 'Absent'),
                    ('half_day', 'Half Day'),
                    ('week_off', 'Week Off'),
                    ('holiday', 'Holiday'),
                    ('on_leave', 'On Leave'),
                ],
                default='present',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='attendanceday',
            name='policy',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='attendance_days', to='attendance.attendancepolicy'),
        ),
        migrations.AddField(
            model_name='attendanceday',
            name='shift',
            field=models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='attendance_days', to='attendance.shift'),
        ),
        migrations.AddIndex(
            model_name='attendanceday',
            index=models.Index(fields=['employee', 'status'], name='attendance__employe_9c4e2b_idx'),
        ),
        migrations.CreateModel(
            name='EmployeeShiftAssignment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('effective_from', models.DateField()),
                ('effective_to', models.DateField(blank=True, null=True)),
                ('is_active', models.BooleanField(default=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('employee', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='shift_assignments', to='accounts.employee')),
                ('shift', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='assignments', to='attendance.shift')),
            ],
            options={
                'indexes': [models.Index(fields=['employee', 'effective_from', 'effective_to'], name='attendance__employe_1a3f5c_idx')],
            },
        ),
        migrations.CreateModel(
            name='AttendanceRegularization',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateField()),
                ('request_type', models.CharField(choices=[('missed_check_in', 'Missed Check In'), ('missed_check_out', 'Missed Check Out'), ('both', 'Both'), ('wrong_time', 'Wrong Time'), ('wfh_mark', 'WFH Mark')], max_length=30)),
                ('requested_check_in', models.DateTimeField(blank=True, null=True)),
                ('requested_check_out', models.DateTimeField(blank=True, null=True)),
                ('reason', models.TextField()),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('approved', 'Approved'), ('rejected', 'Rejected')], default='pending', max_length=20)),
                ('rejection_reason', models.TextField(blank=True)),
                ('action_taken_on', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('action_taken_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='regularization_actions', to='accounts.employee')),
                ('employee', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='attendance_regularizations', to='accounts.employee')),
            ],
            options={
                'indexes': [models.Index(fields=['employee', 'date', 'status'], name='attendance__employe_7b2d1e_idx')],
            },
        ),
    ]

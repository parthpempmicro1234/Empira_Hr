import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('accounts', '0008_alter_zipcode_unique_together'),
        ('attendance', '0003_keka_attendance_policies'),
    ]

    operations = [
        migrations.AddField(
            model_name='shift',
            name='flex_check_in_start',
            field=models.TimeField(blank=True, help_text='Earliest allowed check-in for flexible shift, e.g. 09:30', null=True),
        ),
        migrations.AddField(
            model_name='shift',
            name='flex_check_in_end',
            field=models.TimeField(blank=True, help_text='Latest on-time check-in for flexible shift, e.g. 10:30', null=True),
        ),
        migrations.AddField(
            model_name='shift',
            name='break_min_minutes',
            field=models.PositiveIntegerField(default=30, help_text='Minimum break duration when employee takes a split shift'),
        ),
        migrations.AddField(
            model_name='shift',
            name='break_max_minutes',
            field=models.PositiveIntegerField(default=60, help_text='Maximum break duration allowed'),
        ),
        migrations.AddField(
            model_name='shift',
            name='is_default',
            field=models.BooleanField(default=False, help_text='Default shift for this business unit'),
        ),
        migrations.AlterField(
            model_name='shift',
            name='min_effective_minutes',
            field=models.PositiveIntegerField(default=510, help_text='Required effective work minutes per day (e.g. 510 = 8h 30m)'),
        ),
        migrations.AlterField(
            model_name='shift',
            name='start_time',
            field=models.TimeField(help_text='Nominal shift start, e.g. 10:00'),
        ),
        migrations.AlterField(
            model_name='shift',
            name='end_time',
            field=models.TimeField(help_text='Nominal shift end, e.g. 19:30'),
        ),
        migrations.CreateModel(
            name='OvertimeRequest',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('date', models.DateField()),
                ('requested_minutes', models.PositiveIntegerField(help_text='Expected OT minutes for this date')),
                ('reason', models.TextField()),
                ('status', models.CharField(choices=[('pending', 'Pending'), ('approved', 'Approved'), ('rejected', 'Rejected')], default='pending', max_length=20)),
                ('approved_minutes', models.PositiveIntegerField(blank=True, null=True)),
                ('rejection_reason', models.TextField(blank=True)),
                ('action_taken_on', models.DateTimeField(blank=True, null=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('action_taken_by', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='overtime_approvals', to='accounts.employee')),
                ('employee', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='overtime_requests', to='accounts.employee')),
            ],
            options={
                'indexes': [models.Index(fields=['employee', 'date', 'status'], name='attendance__employe_ot_idx')],
            },
        ),
    ]

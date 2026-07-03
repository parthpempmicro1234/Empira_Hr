from datetime import timedelta, datetime

from django.core.management.base import BaseCommand
from django.utils import timezone

from attendance.models import AttendanceDay
from attendance.services.evaluator import evaluate_attendance_day
from accounts.models import Employee


class Command(BaseCommand):
    help = 'Evaluate and lock attendance days for a given date (default: yesterday).'

    def add_arguments(self, parser):
        parser.add_argument(
            '--date',
            type=str,
            help='Date to finalize (YYYY-MM-DD). Defaults to yesterday.',
        )

    def handle(self, *args, **options):
        if options.get('date'):
            target_date = datetime.strptime(options['date'], '%Y-%m-%d').date()
        else:
            target_date = timezone.localdate() - timedelta(days=1)

        self.stdout.write(f'Finalizing attendance for {target_date}')

        employees = Employee.objects.filter(is_active=True)
        finalized = 0

        for employee in employees.iterator():
            day, created = AttendanceDay.objects.get_or_create(
                employee=employee,
                date=target_date,
            )
            evaluate_attendance_day(day, lock=True)
            finalized += 1

        self.stdout.write(self.style.SUCCESS(f'Finalized {finalized} employee days for {target_date}'))

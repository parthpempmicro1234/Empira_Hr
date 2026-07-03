from datetime import timedelta

from django.core.management.base import BaseCommand
from django.utils import timezone

from attendance.models import AttendanceDay
from attendance.services.evaluator import evaluate_attendance_day


class Command(BaseCommand):
    help = 'Re-evaluate attendance days for the last N days (default 90).'

    def add_arguments(self, parser):
        parser.add_argument('--days', type=int, default=90)

    def handle(self, *args, **options):
        days = options['days']
        end = timezone.localdate()
        start = end - timedelta(days=days)
        qs = AttendanceDay.objects.filter(date__range=(start, end))
        count = 0
        for day in qs.iterator():
            evaluate_attendance_day(day, lock=day.date < timezone.localdate())
            count += 1
        self.stdout.write(self.style.SUCCESS(f'Re-evaluated {count} attendance days'))

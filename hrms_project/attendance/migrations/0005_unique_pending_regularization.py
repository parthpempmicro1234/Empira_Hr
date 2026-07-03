from django.db import migrations, models
from django.db.models import Q


class Migration(migrations.Migration):

    dependencies = [
        ('attendance', '0004_flexible_shift_and_overtime_request'),
    ]

    operations = [
        migrations.AddConstraint(
            model_name='attendanceregularization',
            constraint=models.UniqueConstraint(
                fields=('employee', 'date'),
                condition=Q(status='pending'),
                name='unique_pending_regularization_per_employee_date',
            ),
        ),
    ]


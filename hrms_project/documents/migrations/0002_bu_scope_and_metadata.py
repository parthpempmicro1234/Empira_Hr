from django.db import migrations, models
import django.db.models.deletion
from django.utils import timezone


def backfill_folder_business_unit(apps, schema_editor):
    BusinessUnit = apps.get_model('organization', 'BusinessUnit')
    DocumentFolder = apps.get_model('documents', 'DocumentFolder')

    bu = BusinessUnit.objects.order_by('id').first()
    if bu is None:
        bu = BusinessUnit.objects.create(name='Default')

    DocumentFolder.objects.filter(business_unit__isnull=True).update(business_unit=bu)


class Migration(migrations.Migration):

    dependencies = [
        ('organization', '0009_worklocation_geofence'),
        ('documents', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='documentfolder',
            name='business_unit',
            field=models.ForeignKey(
                db_index=True,
                null=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='document_folders',
                to='organization.businessunit',
            ),
        ),
        migrations.AddField(
            model_name='documentfolder',
            name='created_at',
            field=models.DateTimeField(default=timezone.now),
            preserve_default=False,
        ),
        migrations.RunPython(backfill_folder_business_unit, migrations.RunPython.noop),
        migrations.AlterField(
            model_name='documentfolder',
            name='business_unit',
            field=models.ForeignKey(
                db_index=True,
                on_delete=django.db.models.deletion.CASCADE,
                related_name='document_folders',
                to='organization.businessunit',
            ),
        ),
        migrations.AlterUniqueTogether(
            name='documentfolder',
            unique_together={('business_unit', 'title')},
        ),
        migrations.AddField(
            model_name='document',
            name='created_at',
            field=models.DateTimeField(default=timezone.now),
            preserve_default=False,
        ),
        migrations.AddField(
            model_name='document',
            name='size_bytes',
            field=models.BigIntegerField(default=0),
        ),
        migrations.AlterField(
            model_name='document',
            name='size',
            field=models.CharField(blank=True, default='', max_length=20),
        ),
    ]


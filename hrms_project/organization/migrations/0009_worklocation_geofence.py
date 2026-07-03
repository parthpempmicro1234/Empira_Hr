from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('organization', '0008_feedpostlike_reaction_type_alter_feedpostlike_post'),
    ]

    operations = [
        migrations.AddField(
            model_name='worklocation',
            name='latitude',
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='worklocation',
            name='longitude',
            field=models.FloatField(blank=True, null=True),
        ),
        migrations.AddField(
            model_name='worklocation',
            name='radius_meters',
            field=models.PositiveIntegerField(
                default=200,
                help_text='Geofence radius in meters for attendance punch validation.',
            ),
        ),
    ]

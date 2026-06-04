from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('userauths', '0030_add_billing_models'),
    ]

    operations = [
        migrations.AddField(
            model_name='patientvisit',
            name='queue_number',
            field=models.CharField(
                blank=True,
                help_text='Auto-generated queue token e.g. OPD-001',
                max_length=20,
                null=True,
            ),
        ),
    ]

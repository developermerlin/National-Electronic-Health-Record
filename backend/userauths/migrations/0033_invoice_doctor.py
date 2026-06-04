from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('userauths', '0032_staffleave'),
    ]

    operations = [
        migrations.AddField(
            model_name='invoice',
            name='doctor',
            field=models.ForeignKey(
                blank=True, null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name='doctor_invoices',
                to=settings.AUTH_USER_MODEL,
                help_text='Attending / ordering doctor for this invoice',
            ),
        ),
    ]

from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('userauths', '0033_invoice_doctor'),
    ]

    operations = [
        migrations.CreateModel(
            name='InsuranceClaim',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('claim_number', models.CharField(editable=False, max_length=60, unique=True)),
                ('scheme', models.CharField(
                    choices=[
                        ('nhia',     'NHIA (National Health Insurance)'),
                        ('slesha',   'SLeSHA'),
                        ('employer', 'Employer / Occupational'),
                        ('private',  'Private Insurance'),
                        ('other',    'Other'),
                    ],
                    default='nhia', max_length=30,
                )),
                ('provider_name', models.CharField(max_length=200)),
                ('member_id',     models.CharField(blank=True, max_length=100)),
                ('claim_amount',  models.DecimalField(decimal_places=2, max_digits=12)),
                ('approved_amount', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('status', models.CharField(
                    choices=[
                        ('draft',        'Draft'),
                        ('submitted',    'Submitted'),
                        ('under_review', 'Under Review'),
                        ('approved',     'Approved'),
                        ('rejected',     'Rejected'),
                        ('paid',         'Paid by Insurer'),
                        ('closed',       'Closed'),
                    ],
                    default='draft', max_length=20,
                )),
                ('submitted_at',     models.DateTimeField(blank=True, null=True)),
                ('notes',            models.TextField(blank=True)),
                ('rejection_reason', models.TextField(blank=True)),
                ('created_at',       models.DateTimeField(auto_now_add=True)),
                ('updated_at',       models.DateTimeField(auto_now=True)),
                ('created_by', models.ForeignKey(
                    null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name='claims_created', to=settings.AUTH_USER_MODEL,
                )),
                ('hospital', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='insurance_claims', to='userauths.hospital',
                )),
                ('invoice', models.ForeignKey(
                    blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL,
                    related_name='insurance_claims', to='userauths.invoice',
                )),
                ('patient', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='insurance_claims', to='userauths.patient',
                )),
            ],
            options={'ordering': ['-created_at']},
        ),
    ]

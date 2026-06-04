from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('userauths', '0031_patientvisit_queue_number'),
    ]

    operations = [
        migrations.CreateModel(
            name='StaffLeave',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('leave_type', models.CharField(
                    choices=[
                        ('annual',    'Annual Leave'),
                        ('sick',      'Sick Leave'),
                        ('maternity', 'Maternity Leave'),
                        ('paternity', 'Paternity Leave'),
                        ('emergency', 'Emergency Leave'),
                        ('unpaid',    'Unpaid Leave'),
                        ('other',     'Other'),
                    ],
                    max_length=20,
                )),
                ('start_date', models.DateField()),
                ('end_date',   models.DateField()),
                ('reason',     models.TextField(blank=True)),
                ('status',     models.CharField(
                    choices=[
                        ('pending',   'Pending'),
                        ('approved',  'Approved'),
                        ('rejected',  'Rejected'),
                        ('cancelled', 'Cancelled'),
                    ],
                    default='pending',
                    max_length=20,
                )),
                ('rejection_reason', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('approved_by', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.SET_NULL,
                    related_name='approved_leaves',
                    to=settings.AUTH_USER_MODEL,
                )),
                ('hospital', models.ForeignKey(
                    blank=True, null=True,
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='leave_requests',
                    to='userauths.hospital',
                )),
                ('staff', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='leave_requests',
                    to=settings.AUTH_USER_MODEL,
                )),
            ],
            options={'ordering': ['-created_at']},
        ),
    ]

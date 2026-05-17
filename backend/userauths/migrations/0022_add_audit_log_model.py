# Generated manually for AuditLog model

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('userauths', '0021_add_is_referral_to_appointment'),
    ]

    operations = [
        migrations.CreateModel(
            name='AuditLog',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('user_name', models.CharField(blank=True, help_text='Snapshot of user name at time of access', max_length=500)),
                ('user_role', models.CharField(blank=True, help_text='Snapshot of user role at time of access', max_length=100)),
                ('patient_name', models.CharField(blank=True, help_text='Snapshot of patient name at time of access', max_length=500)),
                ('action', models.CharField(choices=[('view', 'Viewed Patient Record'), ('edit', 'Edited Patient Record'), ('create', 'Created Patient Record'), ('delete', 'Deleted Patient Record'), ('emergency', 'Emergency Override Access'), ('print', 'Printed Patient Record'), ('export', 'Exported Patient Data')], max_length=20)),
                ('access_type', models.CharField(choices=[('same_hospital', 'Same Hospital'), ('cross_hospital', 'Cross Hospital'), ('emergency_override', 'Emergency Override'), ('admin', 'Admin Override')], max_length=20)),
                ('outcome', models.CharField(choices=[('allowed', 'Allowed'), ('denied', 'Denied'), ('override', 'Override')], max_length=10)),
                ('justification', models.TextField(blank=True, help_text='Free-text reason for emergency override')),
                ('override_approved', models.BooleanField(blank=True, help_text='Whether the override was pre-approved', null=True)),
                ('ip_address', models.GenericIPAddressField(blank=True, null=True)),
                ('user_agent', models.TextField(blank=True)),
                ('endpoint', models.CharField(blank=True, max_length=500)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('patient', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='audit_logs', to='userauths.patient')),
                ('patient_hospital', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='audit_logs_as_patient_hospital', to='userauths.hospital')),
                ('user', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='audit_logs', to='userauths.user')),
                ('user_hospital', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='audit_logs_as_user_hospital', to='userauths.hospital')),
            ],
            options={
                'ordering': ['-created_at'],
            },
        ),
        migrations.AddIndex(
            model_name='auditlog',
            index=models.Index(fields=['patient', '-created_at'], name='userauths_a_patient_9c0b8c_idx'),
        ),
        migrations.AddIndex(
            model_name='auditlog',
            index=models.Index(fields=['user', '-created_at'], name='userauths_a_user_id_8f0f3e_idx'),
        ),
        migrations.AddIndex(
            model_name='auditlog',
            index=models.Index(fields=['access_type', '-created_at'], name='userauths_a_access_t_7a0e6e_idx'),
        ),
        migrations.AddIndex(
            model_name='auditlog',
            index=models.Index(fields=['outcome', '-created_at'], name='userauths_a_outcome_d_7b1f2a_idx'),
        ),
        migrations.AddIndex(
            model_name='auditlog',
            index=models.Index(fields=['created_at'], name='userauths_a_created_3c4d5e_idx'),
        ),
    ]

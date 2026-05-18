from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('userauths', '0022_add_audit_log_model'),
    ]

    operations = [
        migrations.AlterField(
            model_name='role',
            name='name',
            field=models.CharField(
                max_length=50,
                unique=True,
                choices=[
                    ('ministry_admin', 'Ministry Administrator'),
                    ('district_admin', 'District Administrator'),
                    ('hospital_admin', 'Hospital Administrator'),
                    ('admin', 'System Administrator'),
                    ('doctor', 'Doctor'),
                    ('nurse', 'Nurse'),
                    ('receptionist', 'Receptionist'),
                    ('triage', 'Triage Officer'),
                    ('lab_technician', 'Lab Technician'),
                    ('pharmacist', 'Pharmacist'),
                    ('patient', 'Patient'),
                ],
            ),
        ),
    ]

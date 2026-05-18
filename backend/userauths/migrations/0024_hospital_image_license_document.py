from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('userauths', '0023_add_triage_role'),
    ]

    operations = [
        migrations.AddField(
            model_name='hospital',
            name='license_document',
            field=models.FileField(
                blank=True,
                null=True,
                upload_to='hospitals/licenses/',
                help_text='Upload license permit (PDF/image)',
            ),
        ),
        migrations.AddField(
            model_name='hospital',
            name='hospital_image',
            field=models.ImageField(
                blank=True,
                null=True,
                upload_to='hospitals/images/',
                help_text='Hospital banner/cover photo',
            ),
        ),
    ]

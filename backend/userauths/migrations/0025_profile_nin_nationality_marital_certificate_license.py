from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('userauths', '0024_hospital_image_license_document'),
    ]

    operations = [
        migrations.AddField(
            model_name='profile',
            name='nin_number',
            field=models.CharField(blank=True, help_text='National Identification Number (NIN)', max_length=100, null=True),
        ),
        migrations.AddField(
            model_name='profile',
            name='nationality',
            field=models.CharField(blank=True, default='Sierra Leonean', max_length=200, null=True),
        ),
        migrations.AddField(
            model_name='profile',
            name='marital_status',
            field=models.CharField(blank=True, help_text='e.g. Single, Married, Divorced, Widowed', max_length=50, null=True),
        ),
        migrations.AddField(
            model_name='profile',
            name='certificate',
            field=models.FileField(blank=True, help_text='Upload professional certificate (PDF/image)', null=True, upload_to='accounts/certificates/'),
        ),
        migrations.AddField(
            model_name='profile',
            name='license_document',
            field=models.FileField(blank=True, help_text='Upload license/permit document (PDF/image)', null=True, upload_to='accounts/licenses/'),
        ),
    ]

'''
HERE WE ARE CREATING A CUSTOM ABSTRACT USER MODEL
TO EXTEND THE DEFAULT DJANGO USER MODEL.
'''

from django.db import models
from django.contrib.auth.models import AbstractUser
from shortuuid.django_fields import ShortUUIDField #it is used to create a unique id for each profile
from django.db.models.signals import post_save #it is used to create a profile when a user is created
# Create your models here.

class Region(models.Model):
    name = models.CharField(max_length=200, unique=True)
    code = models.CharField(max_length=20, unique=True, help_text='Region code e.g. WR, GA')
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['name']


class District(models.Model):
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=20, unique=True, help_text='District code')
    region = models.ForeignKey(Region, on_delete=models.CASCADE, related_name='districts')
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name}, {self.region.name}"

    class Meta:
        ordering = ['region__name', 'name']
        unique_together = ('name', 'region')


class Hospital(models.Model):
    HOSPITAL_TYPE_CHOICES = [
        ('teaching', 'Teaching Hospital'),
        ('regional', 'Regional Hospital'),
        ('district', 'District Hospital'),
        ('polyclinic', 'Polyclinic'),
        ('health_center', 'Health Center'),
        ('clinic', 'Clinic'),
        ('chps', 'CHPS Compound'),
        ('private', 'Private Hospital'),
    ]

    name = models.CharField(max_length=300)
    code = models.CharField(max_length=30, unique=True, help_text='Hospital registration code')
    hospital_type = models.CharField(max_length=30, choices=HOSPITAL_TYPE_CHOICES, default='district')
    district = models.ForeignKey(District, on_delete=models.CASCADE, related_name='hospitals')
    address = models.TextField(blank=True, null=True)
    phone = models.CharField(max_length=50, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    bed_capacity = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    latitude = models.DecimalField(max_digits=10, decimal_places=7, blank=True, null=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=7, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.get_hospital_type_display()})"

    class Meta:
        ordering = ['district__region__name', 'district__name', 'name']


class Department(models.Model):
    DEPARTMENT_CHOICES = [
        ('opd', 'Out-Patient Department (OPD)'),
        ('ipd', 'In-Patient Department (IPD)'),
        ('emergency', 'Emergency / Casualty'),
        ('laboratory', 'Laboratory'),
        ('pharmacy', 'Pharmacy'),
        ('radiology', 'Radiology / Imaging'),
        ('surgery', 'Surgery'),
        ('maternity', 'Maternity / Obstetrics'),
        ('pediatrics', 'Pediatrics'),
        ('dental', 'Dental'),
        ('eye_clinic', 'Eye Clinic / Ophthalmology'),
        ('physiotherapy', 'Physiotherapy'),
        ('records', 'Medical Records'),
        ('admin', 'Administration'),
        ('other', 'Other'),
    ]

    name = models.CharField(max_length=50, choices=DEPARTMENT_CHOICES)
    hospital = models.ForeignKey(Hospital, on_delete=models.CASCADE, related_name='departments')
    head_of_department = models.CharField(max_length=300, blank=True, null=True)
    phone = models.CharField(max_length=50, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.get_name_display()} - {self.hospital.name}"

    class Meta:
        ordering = ['hospital__name', 'name']
        unique_together = ('name', 'hospital')


class Role(models.Model):
    ROLE_CHOICES = [
        ('ministry_admin', 'Ministry Administrator'),
        ('district_admin', 'District Administrator'),
        ('hospital_admin', 'Hospital Administrator'),
        ('admin', 'System Administrator'),
        ('doctor', 'Doctor'),
        ('nurse', 'Nurse'),
        ('receptionist', 'Receptionist'),
        ('lab_technician', 'Lab Technician'),
        ('pharmacist', 'Pharmacist'),
        ('patient', 'Patient'),
    ]
    
    name = models.CharField(max_length=50, choices=ROLE_CHOICES, unique=True)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return self.get_name_display()
    
    class Meta:
        ordering = ['name']


class Permission(models.Model):
    PERMISSION_CHOICES = [
        ('view_patients', 'View Patients'),
        ('add_patients', 'Add Patients'),
        ('edit_patients', 'Edit Patients'),
        ('delete_patients', 'Delete Patients'),
        ('view_medical_records', 'View Medical Records'),
        ('add_medical_records', 'Add Medical Records'),
        ('edit_medical_records', 'Edit Medical Records'),
        ('view_appointments', 'View Appointments'),
        ('manage_appointments', 'Manage Appointments'),
        ('view_prescriptions', 'View Prescriptions'),
        ('create_prescriptions', 'Create Prescriptions'),
        ('view_lab_results', 'View Lab Results'),
        ('manage_lab_results', 'Manage Lab Results'),
        ('view_users', 'View Users'),
        ('manage_users', 'Manage Users'),
        ('view_reports', 'View Reports'),
        ('manage_billing', 'Manage Billing'),
        ('manage_hospitals', 'Manage Hospitals'),
        ('manage_districts', 'Manage Districts'),
        ('manage_regions', 'Manage Regions'),
        ('view_national_data', 'View National Data'),
        ('view_district_data', 'View District Data'),
        ('view_hospital_data', 'View Hospital Data'),
        ('manage_departments', 'Manage Departments'),
    ]
    
    name = models.CharField(max_length=100, choices=PERMISSION_CHOICES, unique=True)
    description = models.TextField(blank=True, null=True)
    
    def __str__(self):
        return self.get_name_display()
    
    class Meta:
        ordering = ['name']


class RolePermission(models.Model):
    role = models.ForeignKey(Role, on_delete=models.CASCADE, related_name='role_permissions')
    permission = models.ForeignKey(Permission, on_delete=models.CASCADE, related_name='permission_roles')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('role', 'permission')
        ordering = ['role', 'permission']
    
    def __str__(self):
        return f"{self.role.name} - {self.permission.name}"


class User(AbstractUser):
    username = models.CharField(max_length=500, null=True, blank=True)
    email = models.EmailField(unique=True)
    full_name = models.CharField(max_length=500, null=True, blank=True)
    phone = models.CharField(max_length=500)
    otp = models.CharField(max_length=1000, null=True, blank=True)
    role = models.ForeignKey(Role, on_delete=models.SET_NULL, null=True, blank=True, related_name='users')
    employee_id = models.CharField(max_length=100, unique=True, null=True, blank=True)
    hospital = models.ForeignKey(Hospital, on_delete=models.SET_NULL, null=True, blank=True, related_name='staff')
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True, related_name='staff')
    district = models.ForeignKey(District, on_delete=models.SET_NULL, null=True, blank=True, related_name='district_staff', help_text='For district admins')
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='created_users')

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['username']

    def __str__(self):
        return self.email
    
    def has_permission(self, permission_name):
        if not self.role:
            return False
        return self.role.role_permissions.filter(permission__name=permission_name).exists()
    
    def get_permissions(self):
        if not self.role:
            return []
        return [rp.permission.name for rp in self.role.role_permissions.all()]
    
    def save(self, *args, **kwargs):
        email_username, mobile = self.email.split('@')
        if self.full_name == "" or self.full_name == None:
             self.full_name = self.email
        if self.username == "" or self.username == None:
             self.username = email_username
        super(User, self).save(*args, **kwargs)



class Profile(models.Model):
    user = models.OneToOneField(User, on_delete=models.CASCADE)
    image = models.ImageField(upload_to='accounts/users', default='default/default-user.jpg', null=True, blank=True)
    full_name = models.CharField(max_length=1000, null=True, blank=True)
    about = models.TextField( null=True, blank=True)
    
    gender = models.CharField(max_length=500, null=True, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    country = models.CharField(max_length=1000, null=True, blank=True)
    city = models.CharField(max_length=500, null=True, blank=True)
    state = models.CharField(max_length=500, null=True, blank=True)
    address = models.CharField(max_length=1000, null=True, blank=True)

    cv = models.FileField(upload_to='accounts/cv/', null=True, blank=True, help_text='Upload CV (PDF, DOC, DOCX)')
    specialization = models.CharField(max_length=500, null=True, blank=True, help_text='e.g. Cardiology, General Practice')
    license_number = models.CharField(max_length=200, null=True, blank=True, help_text='Professional license/registration number')
    years_of_experience = models.PositiveIntegerField(null=True, blank=True)
    qualification = models.CharField(max_length=500, null=True, blank=True, help_text='e.g. MBBS, MD, BSc Nursing')
    emergency_contact_name = models.CharField(max_length=500, null=True, blank=True)
    emergency_contact_phone = models.CharField(max_length=50, null=True, blank=True)
    emergency_contact_relationship = models.CharField(max_length=200, null=True, blank=True)

    date = models.DateTimeField(auto_now_add=True, null=True, blank=True)
    pid = ShortUUIDField(unique=True, length=10, max_length=20, alphabet="abcdefghijklmnopqrstuvxyz")


    # class Meta:
    #     ordering = ["-date"]

    def __str__(self):
        if self.full_name:
            return str(self.full_name)
        else:
            return str(self.user.full_name)
    
    def save(self, *args, **kwargs):
        if self.full_name == "" or self.full_name == None:
             self.full_name = self.user.full_name
        
        super(Profile, self).save(*args, **kwargs)


#     def thumbnail(self):
#         return mark_safe('<img src="/media/%s" width="50" height="50" object-fit:"cover" style="border-radius: 30px; object-fit: cover;" />' % (self.image))
    
    
    
    # =====this is use to create a profile when a user is created=====
def create_user_profile(sender, instance, created, **kwargs):
	if created:
		Profile.objects.create(user=instance)

def save_user_profile(sender, instance, **kwargs):
	instance.profile.save()

post_save.connect(create_user_profile, sender=User)
post_save.connect(save_user_profile, sender=User)
    
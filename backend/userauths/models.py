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
    code = models.CharField(max_length=20, unique=True, help_text='Region code e.g. WR, GA', blank=True)
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.code:
            import re
            words = re.sub(r'[^a-zA-Z\s]', '', self.name).split()
            if len(words) >= 2:
                letters = ''.join(w[0].upper() for w in words[:3])
            else:
                letters = self.name[:3].upper()
            # Find next sequence number for this letter prefix
            existing = Region.objects.filter(code__startswith=f"REG-{letters}-").exclude(pk=self.pk)
            max_num = 0
            for r in existing:
                parts = r.code.split('-')
                if len(parts) == 3 and parts[2].isdigit():
                    max_num = max(max_num, int(parts[2]))
            self.code = f"REG-{letters}-{str(max_num + 1).zfill(3)}"
        super().save(*args, **kwargs)

    class Meta:
        ordering = ['name']


class District(models.Model):
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=20, unique=True, help_text='District code', blank=True)
    region = models.ForeignKey(Region, on_delete=models.CASCADE, related_name='districts')
    description = models.TextField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name}, {self.region.name}"

    def save(self, *args, **kwargs):
        if not self.code:
            import re
            words = re.sub(r'[^a-zA-Z\s]', '', self.name).split()
            if len(words) >= 2:
                letters = ''.join(w[0].upper() for w in words[:3])
            else:
                letters = self.name[:3].upper()
            # Find next sequence number for this letter prefix
            existing = District.objects.filter(code__startswith=f"DST-{letters}-").exclude(pk=self.pk)
            max_num = 0
            for d in existing:
                parts = d.code.split('-')
                if len(parts) == 3 and parts[2].isdigit():
                    max_num = max(max_num, int(parts[2]))
            self.code = f"DST-{letters}-{str(max_num + 1).zfill(3)}"
        super().save(*args, **kwargs)

    class Meta:
        ordering = ['region__name', 'name']
        unique_together = ('name', 'region')


class Chiefdom(models.Model):
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=20, unique=True, help_text='Chiefdom code', blank=True)
    district = models.ForeignKey(District, on_delete=models.CASCADE, related_name='chiefdoms')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.district.name})"

    def save(self, *args, **kwargs):
        if not self.code:
            import re
            words = re.sub(r'[^a-zA-Z\s]', '', self.name).split()
            if len(words) >= 2:
                letters = ''.join(w[0].upper() for w in words[:3])
            else:
                letters = self.name[:3].upper()
            existing = Chiefdom.objects.filter(code__startswith=f"CFD-{letters}-").exclude(pk=self.pk)
            max_num = 0
            for c in existing:
                parts = c.code.split('-')
                if len(parts) == 3 and parts[2].isdigit():
                    max_num = max(max_num, int(parts[2]))
            self.code = f"CFD-{letters}-{str(max_num + 1).zfill(3)}"
        super().save(*args, **kwargs)

    class Meta:
        ordering = ['district__region__name', 'district__name', 'name']
        unique_together = ('name', 'district')


class Town(models.Model):
    name = models.CharField(max_length=200)
    code = models.CharField(max_length=20, unique=True, help_text='Town/City code', blank=True)
    district = models.ForeignKey(District, on_delete=models.CASCADE, related_name='towns')
    chiefdom = models.ForeignKey(Chiefdom, on_delete=models.SET_NULL, null=True, blank=True, related_name='towns')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.district.name})"

    def save(self, *args, **kwargs):
        if not self.code:
            import re
            words = re.sub(r'[^a-zA-Z\s]', '', self.name).split()
            if len(words) >= 2:
                letters = ''.join(w[0].upper() for w in words[:3])
            else:
                letters = self.name[:3].upper()
            existing = Town.objects.filter(code__startswith=f"TWN-{letters}-").exclude(pk=self.pk)
            max_num = 0
            for t in existing:
                parts = t.code.split('-')
                if len(parts) == 3 and parts[2].isdigit():
                    max_num = max(max_num, int(parts[2]))
            self.code = f"TWN-{letters}-{str(max_num + 1).zfill(3)}"
        super().save(*args, **kwargs)

    class Meta:
        ordering = ['district__region__name', 'district__name', 'name']
        unique_together = ('name', 'district')


class Hospital(models.Model):
    # ── Choices ──────────────────────────────────────────
    FACILITY_TYPE_CHOICES = [
        ('government_hospital', 'Government Hospital'),
        ('private_hospital', 'Private Hospital'),
        ('clinic', 'Clinic'),
        ('health_center', 'Health Center'),
        ('community_health_post', 'Community Health Post'),
        ('diagnostic_center', 'Diagnostic Center'),
        ('pharmacy_facility', 'Pharmacy Facility'),
        ('teaching_hospital', 'Teaching Hospital'),
        ('regional_hospital', 'Regional Hospital'),
        ('district_hospital', 'District Hospital'),
        ('polyclinic', 'Polyclinic'),
    ]

    OWNERSHIP_TYPE_CHOICES = [
        ('government', 'Government'),
        ('private', 'Private'),
        ('ngo', 'NGO'),
        ('faith_based', 'Faith-based'),
        ('military', 'Military'),
    ]

    LEVEL_OF_CARE_CHOICES = [
        ('community', 'Community Health Post (MCH/First Aid)'),
        ('primary', 'Primary Health Center (PHU/CHC)'),
        ('secondary_district', 'Secondary - District Hospital'),
        ('secondary_regional', 'Secondary - Regional/County Hospital'),
        ('tertiary', 'Tertiary - National/Specialized Hospital'),
        ('teaching', 'Teaching/University Hospital'),
        ('specialized', 'Specialized Center (Cancer/Cardiac/Mental)'),
        ('diagnostic', 'Diagnostic/Imaging Center'),
        ('rehabilitation', 'Rehabilitation/Palliative Care Center'),
    ]

    OPERATIONAL_STATUS_CHOICES = [
        ('active', 'Active'),
        ('pending_approval', 'Pending Approval'),
        ('suspended', 'Suspended'),
        ('closed', 'Closed'),
    ]

    APPROVAL_STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    # ── 1. BASIC FACILITY INFORMATION ────────────────────
    name = models.CharField(max_length=300, help_text='Official facility name')
    code = models.CharField(max_length=30, unique=True, blank=True, help_text='Auto-generated facility ID')
    facility_code = models.CharField(max_length=50, blank=True, null=True, unique=True, help_text='Government/Ministry facility code')
    hospital_type = models.CharField(max_length=30, choices=FACILITY_TYPE_CHOICES, default='district_hospital')
    ownership_type = models.CharField(max_length=20, choices=OWNERSHIP_TYPE_CHOICES, default='government')
    level_of_care = models.CharField(max_length=20, choices=LEVEL_OF_CARE_CHOICES, default='primary')
    operational_status = models.CharField(max_length=20, choices=OPERATIONAL_STATUS_CHOICES, default='active')
    date_registered = models.DateField(auto_now_add=True, null=True, blank=True, help_text='System registration date')

    # ── 2. LOCATION INFORMATION ──────────────────────────
    country = models.CharField(max_length=100, default='Sierra Leone')
    district = models.ForeignKey(District, on_delete=models.CASCADE, related_name='hospitals')
    chiefdom_ward = models.CharField(max_length=200, blank=True, null=True, help_text='Chiefdom or Ward')
    town_city = models.CharField(max_length=200, blank=True, null=True, help_text='Town or City name')
    address = models.TextField(blank=True, null=True, help_text='Full physical address')
    latitude = models.DecimalField(max_digits=10, decimal_places=7, blank=True, null=True, help_text='GPS Latitude')
    longitude = models.DecimalField(max_digits=10, decimal_places=7, blank=True, null=True, help_text='GPS Longitude')

    # ── 3. CONTACT INFORMATION ───────────────────────────
    phone = models.CharField(max_length=50, blank=True, null=True, help_text='Primary phone number')
    secondary_phone = models.CharField(max_length=50, blank=True, null=True, help_text='Secondary phone number')
    email = models.EmailField(blank=True, null=True, help_text='Official hospital email')
    website = models.URLField(blank=True, null=True, help_text='Hospital website URL')
    emergency_contact_line = models.CharField(max_length=50, blank=True, null=True, help_text='Ambulance/emergency line')

    # ── 4. ADMINISTRATION INFORMATION ────────────────────
    hospital_admin_name = models.CharField(max_length=300, blank=True, null=True, help_text='Responsible administrator name')
    admin_user = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, blank=True, related_name='administered_hospitals', help_text='Linked system user account')
    medical_superintendent = models.CharField(max_length=300, blank=True, null=True, help_text='Head doctor / Medical Superintendent')
    facility_manager = models.CharField(max_length=300, blank=True, null=True, help_text='Administrative head')
    license_number = models.CharField(max_length=100, blank=True, null=True, help_text='Government license number')
    license_expiry_date = models.DateField(blank=True, null=True, help_text='License expiry date')
    license_document = models.FileField(upload_to='hospitals/licenses/', blank=True, null=True, help_text='Upload license permit (PDF/image)')
    hospital_image = models.ImageField(upload_to='hospitals/images/', blank=True, null=True, help_text='Hospital banner/cover photo')

    # ── 5. SERVICE & CAPACITY INFORMATION ────────────────
    bed_capacity = models.PositiveIntegerField(default=0, help_text='Total number of beds')
    emergency_services = models.BooleanField(default=False, help_text='Emergency services available')
    laboratory_available = models.BooleanField(default=False, help_text='Laboratory available')
    pharmacy_available = models.BooleanField(default=False, help_text='Pharmacy available')
    radiology_available = models.BooleanField(default=False, help_text='Radiology/Imaging available')
    maternity_services = models.BooleanField(default=False, help_text='Maternity services available')
    surgery_services = models.BooleanField(default=False, help_text='Surgery services available')
    outpatient_services = models.BooleanField(default=True, help_text='Outpatient services available')
    inpatient_services = models.BooleanField(default=False, help_text='Inpatient services available')
    ambulance_available = models.BooleanField(default=False, help_text='Ambulance available')

    # ── 7. SYSTEM CONFIGURATION SETTINGS ─────────────────
    facility_timezone = models.CharField(max_length=50, default='Africa/Freetown', help_text='Facility time zone')
    working_hours = models.CharField(max_length=100, blank=True, null=True, help_text='e.g. 8:00 AM - 5:00 PM')
    patient_id_prefix = models.CharField(max_length=10, blank=True, null=True, help_text='Patient ID prefix e.g. LUN')
    allow_external_access = models.BooleanField(default=False, help_text='Allow referral sharing')
    data_sharing_consent = models.BooleanField(default=False, help_text='National data exchange consent')

    # ── 8. REPORTING & GOVERNMENT DATA ───────────────────
    reporting_facility_code = models.CharField(max_length=50, blank=True, null=True, help_text='National reporting ID')
    dhis2_code = models.CharField(max_length=50, blank=True, null=True, help_text='DHIS2 integration code')
    catchment_population = models.PositiveIntegerField(blank=True, null=True, help_text='Population served')
    referral_level = models.BooleanField(default=False, help_text='Can receive referrals')
    supervising_authority = models.CharField(max_length=300, blank=True, null=True, help_text='e.g. District Health Office')

    # ── 9. AUDIT FIELDS ─────────────────────────────────
    is_active = models.BooleanField(default=True)
    created_by = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, blank=True, related_name='hospitals_created', help_text='User who created this record')
    created_at = models.DateTimeField(auto_now_add=True)
    last_updated_by = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, blank=True, related_name='hospitals_updated', help_text='User who last updated')
    updated_at = models.DateTimeField(auto_now=True)
    approval_status = models.CharField(max_length=20, choices=APPROVAL_STATUS_CHOICES, default='pending')
    approved_by = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, blank=True, related_name='hospitals_approved', help_text='National Admin who approved')

    def save(self, *args, **kwargs):
        if not self.code:
            import re
            words = re.sub(r'[^a-zA-Z\s]', '', self.name).split()
            if len(words) >= 2:
                letters = ''.join(w[0].upper() for w in words[:3])
            else:
                letters = self.name[:3].upper()
            existing = Hospital.objects.filter(code__startswith=f"HSP-{letters}-").exclude(pk=self.pk)
            max_num = 0
            for h in existing:
                parts = h.code.split('-')
                if len(parts) == 3 and parts[2].isdigit():
                    max_num = max(max_num, int(parts[2]))
            self.code = f"HSP-{letters}-{str(max_num + 1).zfill(3)}"
        super().save(*args, **kwargs)

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
        ('triage', 'Triage'),
        ('ward', 'Ward'),
        ('other', 'Other'),
    ]

    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
    ]

    name = models.CharField(max_length=50, choices=DEPARTMENT_CHOICES)
    department_code = models.CharField(max_length=30, unique=True, blank=True, help_text='Auto-generated department code')
    hospital = models.ForeignKey(Hospital, on_delete=models.CASCADE, related_name='departments')
    head_of_department = models.CharField(max_length=300, blank=True, null=True, help_text='Department head name')
    head_user = models.ForeignKey('User', on_delete=models.SET_NULL, null=True, blank=True, related_name='headed_departments', help_text='Assigned department head user')
    phone = models.CharField(max_length=50, blank=True, null=True)
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default='active')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def save(self, *args, **kwargs):
        if not self.department_code:
            import re
            dept_abbr = self.name.upper()[:3]
            hosp_code = self.hospital.code if self.hospital_id else 'GEN'
            existing = Department.objects.filter(department_code__startswith=f"DPT-{dept_abbr}-").exclude(pk=self.pk)
            max_num = 0
            for d in existing:
                parts = d.department_code.split('-')
                if len(parts) == 3 and parts[2].isdigit():
                    max_num = max(max_num, int(parts[2]))
            self.department_code = f"DPT-{dept_abbr}-{str(max_num + 1).zfill(3)}"
        super().save(*args, **kwargs)

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
        ('triage', 'Triage Officer'),
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

    # Notification preferences
    sms_notifications_enabled = models.BooleanField(default=False, help_text='Receive SMS alerts for new messages')
    email_notifications_enabled = models.BooleanField(default=True, help_text='Receive email alerts for new messages')

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
    nationality = models.CharField(max_length=200, null=True, blank=True, default='Sierra Leonean')
    nin_number = models.CharField(max_length=100, null=True, blank=True, help_text='National Identification Number (NIN)')
    marital_status = models.CharField(max_length=50, null=True, blank=True, help_text='e.g. Single, Married, Divorced, Widowed')
    country = models.CharField(max_length=1000, null=True, blank=True)
    city = models.CharField(max_length=500, null=True, blank=True)
    state = models.CharField(max_length=500, null=True, blank=True)
    address = models.CharField(max_length=1000, null=True, blank=True)

    cv = models.FileField(upload_to='accounts/cv/', null=True, blank=True, help_text='Upload CV (PDF, DOC, DOCX)')
    certificate = models.FileField(upload_to='accounts/certificates/', null=True, blank=True, help_text='Upload professional certificate (PDF/image)')
    specialization = models.CharField(max_length=500, null=True, blank=True, help_text='e.g. Cardiology, General Practice')
    license_number = models.CharField(max_length=200, null=True, blank=True, help_text='Professional license/registration number')
    license_document = models.FileField(upload_to='accounts/licenses/', null=True, blank=True, help_text='Upload license/permit document (PDF/image)')
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
    
    
    
class Patient(models.Model):
    GENDER_CHOICES = [
        ('male', 'Male'),
        ('female', 'Female'),
        ('other', 'Other'),
    ]
    BLOOD_TYPE_CHOICES = [
        ('A+', 'A+'), ('A-', 'A-'),
        ('B+', 'B+'), ('B-', 'B-'),
        ('AB+', 'AB+'), ('AB-', 'AB-'),
        ('O+', 'O+'), ('O-', 'O-'),
        ('unknown', 'Unknown'),
    ]
    MARITAL_STATUS_CHOICES = [
        ('single', 'Single'),
        ('married', 'Married'),
        ('divorced', 'Divorced'),
        ('widowed', 'Widowed'),
    ]
    STATUS_CHOICES = [
        ('active', 'Active'),
        ('inactive', 'Inactive'),
        ('deceased', 'Deceased'),
    ]

    # Auto-generated patient ID
    patient_id = models.CharField(max_length=20, unique=True, editable=False)

    # Demographics
    first_name = models.CharField(max_length=200)
    last_name = models.CharField(max_length=200)
    other_names = models.CharField(max_length=200, blank=True, null=True)
    date_of_birth = models.DateField()
    gender = models.CharField(max_length=10, choices=GENDER_CHOICES)
    marital_status = models.CharField(max_length=20, choices=MARITAL_STATUS_CHOICES, blank=True, null=True)
    nationality = models.CharField(max_length=100, default='Sierra Leonean')
    national_id = models.CharField(max_length=50, blank=True, null=True, help_text='NIN / National Identification Number')
    photo = models.ImageField(upload_to='patients/photos/', blank=True, null=True)

    # Contact
    phone = models.CharField(max_length=20)
    alt_phone = models.CharField(max_length=20, blank=True, null=True)
    email = models.EmailField(blank=True, null=True)
    address = models.TextField(blank=True, null=True)
    city = models.CharField(max_length=200, blank=True, null=True)
    region = models.CharField(max_length=200, blank=True, null=True)
    district = models.ForeignKey(District, on_delete=models.SET_NULL, null=True, blank=True, related_name='patients')
    chiefdom = models.ForeignKey(Chiefdom, on_delete=models.SET_NULL, null=True, blank=True, related_name='patients')
    town = models.ForeignKey(Town, on_delete=models.SET_NULL, null=True, blank=True, related_name='patients')

    # Medical
    blood_type = models.CharField(max_length=10, choices=BLOOD_TYPE_CHOICES, default='unknown')
    allergies = models.TextField(blank=True, null=True, help_text='Comma-separated list of known allergies')
    chronic_conditions = models.TextField(blank=True, null=True, help_text='Comma-separated list of chronic conditions')
    disabilities = models.TextField(blank=True, null=True)

    # Insurance
    insurance_provider = models.CharField(max_length=200, blank=True, null=True, help_text='e.g. SLeSHI, Private')
    insurance_number = models.CharField(max_length=100, blank=True, null=True)
    insurance_expiry = models.DateField(blank=True, null=True)

    # Next of Kin
    next_of_kin_name = models.CharField(max_length=300, blank=True, null=True)
    next_of_kin_phone = models.CharField(max_length=20, blank=True, null=True)
    next_of_kin_relationship = models.CharField(max_length=100, blank=True, null=True)
    next_of_kin_address = models.TextField(blank=True, null=True)

    # Emergency Contact (if different from next of kin)
    emergency_contact_name = models.CharField(max_length=300, blank=True, null=True)
    emergency_contact_phone = models.CharField(max_length=20, blank=True, null=True)
    emergency_contact_relationship = models.CharField(max_length=100, blank=True, null=True)

    # Hospital linkage
    hospital = models.ForeignKey(Hospital, on_delete=models.CASCADE, related_name='patients')
    registered_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='registered_patients')

    # Self-service portal account link
    user = models.OneToOneField(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='patient_record', help_text='Linked user account for patient self-service portal')

    # Status
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='active')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.patient_id} - {self.first_name} {self.last_name}"

    @property
    def full_name(self):
        parts = [self.first_name]
        if self.other_names:
            parts.append(self.other_names)
        parts.append(self.last_name)
        return ' '.join(parts)

    @property
    def age(self):
        from datetime import date
        today = date.today()
        return today.year - self.date_of_birth.year - (
            (today.month, today.day) < (self.date_of_birth.month, self.date_of_birth.day)
        )

    def save(self, *args, **kwargs):
        if not self.patient_id:
            # Auto-generate patient ID: PAT-HOSPITALCODE-SEQUENCE
            prefix = 'PAT'
            hospital_code = self.hospital.code if self.hospital else 'GEN'
            last = Patient.objects.filter(hospital=self.hospital).order_by('-created_at').first()
            if last and last.patient_id:
                try:
                    seq = int(last.patient_id.split('-')[-1]) + 1
                except (ValueError, IndexError):
                    seq = 1
            else:
                seq = 1
            self.patient_id = f"{prefix}-{hospital_code}-{seq:04d}"
        super().save(*args, **kwargs)

    class Meta:
        ordering = ['-created_at']


#     def thumbnail(self):
#         return mark_safe('<img src="/media/%s" width="50" height="50" object-fit:"cover" style="border-radius: 30px; object-fit: cover;" />' % (self.image))
    
    
# ═══════════════════════════════════════════════════════════════
# APPOINTMENTS
# ═══════════════════════════════════════════════════════════════

class Appointment(models.Model):
    """A scheduled appointment between a patient and a doctor at a hospital."""

    STATUS_CHOICES = [
        ('pending',          'Pending Doctor Review'),
        ('scheduled',        'Scheduled'),
        ('declined',         'Declined'),
        ('checked_in',       'Checked In'),
        ('in_consultation',  'In Consultation'),
        ('completed',        'Completed'),
        ('cancelled',        'Cancelled'),
        ('no_show',          'No Show'),
    ]

    PRIORITY_CHOICES = [
        ('normal', 'Normal'),
        ('urgent', 'Urgent'),
        ('emergency', 'Emergency'),
    ]

    patient = models.ForeignKey(Patient, on_delete=models.CASCADE, related_name='appointments')
    doctor = models.ForeignKey(User, on_delete=models.CASCADE, related_name='doctor_appointments',
                               help_text='Assigned doctor')
    hospital = models.ForeignKey(Hospital, on_delete=models.CASCADE, related_name='appointments')
    department = models.ForeignKey(Department, on_delete=models.SET_NULL, null=True, blank=True,
                                    related_name='appointments')

    scheduled_at = models.DateTimeField(null=True, blank=True, help_text='Confirmed appointment date and time (set by doctor)')
    duration_minutes = models.PositiveIntegerField(default=30)
    consultation_started_at = models.DateTimeField(null=True, blank=True, help_text='Timestamp when consultation was started')

    preferred_date      = models.DateField(null=True, blank=True, help_text="Patient's preferred date")
    preferred_time_note = models.CharField(max_length=100, blank=True, help_text="Patient's preferred time note (e.g. morning)")
    decline_reason      = models.TextField(blank=True, help_text='Reason doctor declined the request')

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled')
    priority = models.CharField(max_length=10, choices=PRIORITY_CHOICES, default='normal')

    reason = models.TextField(blank=True, help_text='Chief complaint / reason for visit')
    notes = models.TextField(blank=True, help_text='Receptionist/staff notes')

    is_referral = models.BooleanField(default=False, help_text='True if this is a cross-hospital referral appointment')

    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                    related_name='created_appointments')
    checked_in_at = models.DateTimeField(null=True, blank=True)
    checked_in_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True,
                                       related_name='checked_in_appointments')
    started_at = models.DateTimeField(null=True, blank=True, help_text='When doctor started consultation')
    completed_at = models.DateTimeField(null=True, blank=True)
    cancelled_at = models.DateTimeField(null=True, blank=True)
    cancellation_reason = models.TextField(blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['scheduled_at']
        indexes = [
            models.Index(fields=['hospital', 'scheduled_at']),
            models.Index(fields=['doctor', 'status']),
            models.Index(fields=['patient', '-scheduled_at']),
            models.Index(fields=['status', 'scheduled_at']),
        ]

    def __str__(self):
        ts = self.scheduled_at.strftime('%Y-%m-%d %H:%M') if self.scheduled_at else 'TBD'
        return f"{self.patient.full_name} with {self.doctor.full_name} on {ts}"


# ═══════════════════════════════════════════════════════════════
# IN-APP NOTIFICATIONS
# ═══════════════════════════════════════════════════════════════

class Notification(models.Model):
    """In-app notification for any user — driven by appointment events."""

    TYPE_CHOICES = [
        ('appointment_confirmed', 'Appointment Confirmed'),
        ('appointment_declined',  'Appointment Declined'),
        ('appointment_cancelled', 'Appointment Cancelled'),
        ('appointment_request',   'New Appointment Request'),
        ('general',               'General'),
    ]

    user        = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    type        = models.CharField(max_length=50, choices=TYPE_CHOICES, default='general')
    title       = models.CharField(max_length=200)
    message     = models.TextField()
    appointment = models.ForeignKey(
        'Appointment', on_delete=models.SET_NULL, null=True, blank=True, related_name='notifications'
    )
    is_read     = models.BooleanField(default=False)
    created_at  = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"[{self.type}] {self.title} → {self.user.email}"



# ═══════════════════════════════════════════════════════════════
# DOCTOR AVAILABILITY / SCHEDULE
# ═══════════════════════════════════════════════════════════════

class DoctorAvailability(models.Model):
    """Weekly recurring availability schedule for a doctor."""

    DAY_CHOICES = [
        (0, 'Monday'),
        (1, 'Tuesday'),
        (2, 'Wednesday'),
        (3, 'Thursday'),
        (4, 'Friday'),
        (5, 'Saturday'),
        (6, 'Sunday'),
    ]

    doctor         = models.ForeignKey(User, on_delete=models.CASCADE, related_name='availability_schedule')
    day_of_week    = models.IntegerField(choices=DAY_CHOICES)
    start_time     = models.TimeField(help_text='Start of working hours')
    end_time       = models.TimeField(help_text='End of working hours')
    slot_duration  = models.IntegerField(default=30, help_text='Duration of each appointment slot in minutes')
    is_active      = models.BooleanField(default=True, help_text='Whether the doctor accepts appointments on this day')
    created_at     = models.DateTimeField(auto_now_add=True)
    updated_at     = models.DateTimeField(auto_now=True)

    class Meta:
        unique_together = ['doctor', 'day_of_week']
        ordering = ['day_of_week']

    def __str__(self):
        day = dict(self.DAY_CHOICES).get(self.day_of_week, '?')
        status = 'ON' if self.is_active else 'OFF'
        return f"Dr. {self.doctor.full_name} — {day} {self.start_time:%H:%M}–{self.end_time:%H:%M} [{status}]"


class DoctorUnavailableDate(models.Model):
    """Specific dates a doctor is unavailable (holidays, leave, etc.)."""

    doctor     = models.ForeignKey(User, on_delete=models.CASCADE, related_name='unavailable_dates')
    date       = models.DateField()
    reason     = models.CharField(max_length=200, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ['doctor', 'date']
        ordering = ['date']

    def __str__(self):
        return f"Dr. {self.doctor.full_name} unavailable on {self.date}"


# ═══════════════════════════════════════════════════════════════
# PATIENT VISITS / ENCOUNTERS
# ═══════════════════════════════════════════════════════════════

class PatientVisit(models.Model):
    """One clinical encounter — created when a patient arrives at a facility."""

    VISIT_TYPE_CHOICES = [
        ('outpatient',  'Outpatient (OPD)'),
        ('inpatient',   'Inpatient (IPD)'),
        ('emergency',   'Emergency'),
        ('follow_up',   'Follow-up'),
        ('referral',    'Referral'),
        ('routine_checkup', 'Routine Check-up'),
    ]

    STATUS_CHOICES = [
        ('registered',     'Registered'),
        ('triaged',        'Triaged'),
        ('waiting',        'Waiting for Doctor'),
        ('in_progress',    'In Consultation'),
        ('completed',      'Completed'),
        ('cancelled',      'Cancelled'),
        ('referred_out',   'Referred Out'),
    ]

    # Core relations
    patient       = models.ForeignKey(Patient,     on_delete=models.CASCADE,    related_name='visits')
    appointment   = models.ForeignKey(Appointment, on_delete=models.SET_NULL,   null=True, blank=True, related_name='visit')
    hospital      = models.ForeignKey(Hospital,    on_delete=models.CASCADE,    related_name='visits')
    department    = models.ForeignKey(Department,  on_delete=models.SET_NULL,   null=True, blank=True, related_name='visits')
    doctor        = models.ForeignKey(User,        on_delete=models.SET_NULL,   null=True, blank=True, related_name='doctor_visits')
    registered_by = models.ForeignKey(User,        on_delete=models.SET_NULL,   null=True, blank=True, related_name='registered_visits')

    # Visit details
    visit_type      = models.CharField(max_length=20, choices=VISIT_TYPE_CHOICES, default='outpatient')
    chief_complaint = models.TextField(help_text='Primary reason for this visit')
    visit_date      = models.DateTimeField(help_text='Date and time of visit')
    status          = models.CharField(max_length=20, choices=STATUS_CHOICES, default='registered')

    # Discharge / referral
    discharge_date       = models.DateTimeField(null=True, blank=True)
    discharge_notes      = models.TextField(blank=True)
    referred_to_hospital = models.ForeignKey(Hospital, on_delete=models.SET_NULL, null=True, blank=True,
                                              related_name='referred_visits', help_text='If patient referred elsewhere')
    referred_to_doctor   = models.CharField(max_length=300, blank=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-visit_date']
        indexes = [
            models.Index(fields=['patient', '-visit_date']),
            models.Index(fields=['hospital', '-visit_date']),
            models.Index(fields=['doctor', 'status']),
        ]

    def __str__(self):
        return f"Visit: {self.patient.full_name} @ {self.hospital.name} on {self.visit_date:%Y-%m-%d}"


class VitalSigns(models.Model):
    """Vitals recorded by nurse/doctor at the start of each visit."""

    visit = models.OneToOneField(PatientVisit, on_delete=models.CASCADE, related_name='vitals')

    blood_pressure_systolic  = models.PositiveIntegerField(null=True, blank=True, help_text='mmHg')
    blood_pressure_diastolic = models.PositiveIntegerField(null=True, blank=True, help_text='mmHg')
    heart_rate               = models.PositiveIntegerField(null=True, blank=True, help_text='bpm')
    respiratory_rate         = models.PositiveIntegerField(null=True, blank=True, help_text='breaths/min')
    temperature_celsius      = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True, help_text='°C')
    weight_kg                = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True)
    height_cm                = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True)
    oxygen_saturation        = models.DecimalField(max_digits=4, decimal_places=1, null=True, blank=True, help_text='SpO2 %')
    blood_glucose            = models.DecimalField(max_digits=5, decimal_places=1, null=True, blank=True, help_text='mmol/L')
    notes                    = models.TextField(blank=True)

    recorded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='recorded_vitals')
    recorded_at = models.DateTimeField(auto_now_add=True)

    @property
    def bmi(self):
        if self.weight_kg and self.height_cm and self.height_cm > 0:
            h_m = float(self.height_cm) / 100
            return round(float(self.weight_kg) / (h_m ** 2), 1)
        return None

    @property
    def blood_pressure(self):
        if self.blood_pressure_systolic and self.blood_pressure_diastolic:
            return f"{self.blood_pressure_systolic}/{self.blood_pressure_diastolic} mmHg"
        return None

    def __str__(self):
        return f"Vitals for {self.visit}"


class ClinicalNote(models.Model):
    """Doctor's clinical findings and treatment plan for a visit."""

    visit  = models.OneToOneField(PatientVisit, on_delete=models.CASCADE, related_name='clinical_note')
    doctor = models.ForeignKey(User,            on_delete=models.SET_NULL, null=True, blank=True, related_name='clinical_notes')

    # Subjective
    history_of_presenting_illness = models.TextField(blank=True, help_text='HPI — patient narrative')

    # Objective / Assessment
    diagnosis             = models.TextField(help_text='Primary diagnosis')
    secondary_diagnoses   = models.TextField(blank=True, help_text='Additional / differential diagnoses')
    clinical_findings     = models.TextField(blank=True, help_text='Physical examination findings')
    investigations_ordered = models.TextField(blank=True, help_text='Lab tests, imaging, etc. ordered')
    investigation_results  = models.TextField(blank=True, help_text='Results if available at visit')

    # Plan
    treatment_plan    = models.TextField(blank=True)
    prescriptions     = models.TextField(blank=True, help_text='Drugs prescribed — name, dose, frequency, duration')
    procedures_done   = models.TextField(blank=True, help_text='Minor procedures performed during visit')
    patient_education = models.TextField(blank=True, help_text='Advice/education given to patient')

    # Follow-up
    follow_up_date         = models.DateField(null=True, blank=True)
    follow_up_instructions = models.TextField(blank=True)

    # Flags
    is_confidential = models.BooleanField(default=False, help_text='Restrict to authorised staff only')

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Note: {self.visit.patient.full_name} — {self.visit.visit_date:%Y-%m-%d}"


# ═══════════════════════════════════════════════════════════════
# IN-APP MESSAGING SYSTEM
# ═══════════════════════════════════════════════════════════════

class Message(models.Model):
    """Direct messages between users within the system."""
    ATTACHMENT_TYPE_CHOICES = [
        ('image', 'Image'),
        ('video', 'Video'),
        ('audio', 'Audio / Voice Note'),
        ('file', 'File'),
    ]

    sender = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_messages')
    recipient = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_messages')
    subject = models.CharField(max_length=200, blank=True, default='(No subject)')
    body = models.TextField(blank=True, default='')
    parent = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='replies')
    attachment = models.FileField(upload_to='messages/%Y/%m/', null=True, blank=True)
    attachment_type = models.CharField(max_length=10, choices=ATTACHMENT_TYPE_CHOICES, null=True, blank=True)
    attachment_name = models.CharField(max_length=255, null=True, blank=True)
    attachment_duration = models.FloatField(null=True, blank=True, help_text='Duration in seconds (for audio/video)')
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(null=True, blank=True)
    is_deleted_by_sender = models.BooleanField(default=False)
    is_deleted_by_recipient = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', 'is_read']),
            models.Index(fields=['sender', '-created_at']),
        ]

    def __str__(self):
        return f"From {self.sender} to {self.recipient}: {self.subject}"

    def mark_as_read(self):
        if not self.is_read:
            from django.utils import timezone
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])


# ═══════════════════════════════════════════════════════════════
# AUDIT LOG — Patient Record Access Tracking
# ═══════════════════════════════════════════════════════════════

class AuditLog(models.Model):
    """Immutable log of every patient record access across the NEHR."""

    ACTION_CHOICES = [
        ('view',        'Viewed Patient Record'),
        ('edit',        'Edited Patient Record'),
        ('create',      'Created Patient Record'),
        ('delete',      'Deleted Patient Record'),
        ('emergency',   'Emergency Override Access'),
        ('print',       'Printed Patient Record'),
        ('export',      'Exported Patient Data'),
    ]

    ACCESS_CHOICES = [
        ('same_hospital',     'Same Hospital'),
        ('cross_hospital',    'Cross Hospital'),
        ('emergency_override', 'Emergency Override'),
        ('admin',             'Admin Override'),
    ]

    OUTCOME_CHOICES = [
        ('allowed',  'Allowed'),
        ('denied',   'Denied'),
        ('override', 'Override'),
    ]

    user           = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='audit_logs')
    user_name      = models.CharField(max_length=500, blank=True, help_text='Snapshot of user name at time of access')
    user_role      = models.CharField(max_length=100, blank=True, help_text='Snapshot of user role at time of access')
    user_hospital  = models.ForeignKey(Hospital, on_delete=models.SET_NULL, null=True, blank=True, related_name='audit_logs_as_user_hospital')

    patient        = models.ForeignKey(Patient, on_delete=models.SET_NULL, null=True, blank=True, related_name='audit_logs')
    patient_name   = models.CharField(max_length=500, blank=True, help_text='Snapshot of patient name at time of access')
    patient_hospital = models.ForeignKey(Hospital, on_delete=models.SET_NULL, null=True, blank=True, related_name='audit_logs_as_patient_hospital')

    action         = models.CharField(max_length=20, choices=ACTION_CHOICES)
    access_type    = models.CharField(max_length=20, choices=ACCESS_CHOICES)
    outcome        = models.CharField(max_length=10, choices=OUTCOME_CHOICES)

    # Emergency override justification
    justification  = models.TextField(blank=True, help_text='Free-text reason for emergency override')
    override_approved = models.BooleanField(null=True, blank=True, help_text='Whether the override was pre-approved')

    # Request context
    ip_address     = models.GenericIPAddressField(null=True, blank=True)
    user_agent     = models.TextField(blank=True)
    endpoint       = models.CharField(max_length=500, blank=True)

    created_at     = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['patient', '-created_at']),
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['access_type', '-created_at']),
            models.Index(fields=['outcome', '-created_at']),
            models.Index(fields=['created_at']),
        ]

    def __str__(self):
        return f"{self.user_name or 'System'} {self.action} {self.patient_name or 'Patient'} — {self.outcome}"


# =====this is use to create a profile when a user is created=====
def create_user_profile(sender, instance, created, **kwargs):
	if created:
		Profile.objects.create(user=instance)

def save_user_profile(sender, instance, **kwargs):
	instance.profile.save()

post_save.connect(create_user_profile, sender=User)
post_save.connect(save_user_profile, sender=User)
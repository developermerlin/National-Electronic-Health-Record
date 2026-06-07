from userauths.models import Profile, User, Role, Permission, RolePermission, Region, District, Chiefdom, Town, Hospital, Department, Patient, Message, Appointment, PatientVisit, VitalSigns, ClinicalNote, Notification, DoctorAvailability, DoctorUnavailableDate, AuditLog, Prescription, PrescriptionItem, Ward, Bed, InpatientAdmission, Invoice, InvoiceItem, Payment, StaffLeave, InsuranceClaim, MedicalSpecialty

# ===import jwt serializers for token===
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer


# Define a custom serializer that inherits from TokenObtainPairSerializer(we can call this login serializer)
class MyTokenObtainPairSerializer(TokenObtainPairSerializer):
    '''
    class MyTokenObtainPairSerializer(TokenObtainPairSerializer):: This line creates a new token serializer called MyTokenObtainPairSerializer that is based on an existing one called TokenObtainPairSerializer. Think of it as customizing the way tokens work.
    @classmethod: This line indicates that the following function is a class method, which means it belongs to the class itself and not to an instance (object) of the class.
    def get_token(cls, user):: This is a function (or method) that gets called when we want to create a token for a user. The user is the person who's trying to access something on the website.
    token = super().get_token(user): Here, it's asking for a regular token from the original token serializer (the one it's based on). This regular token is like a key to enter the website.
    token['full_name'] = user.full_name, token['email'] = user.email, token['username'] = user.username: This code is customizing the token by adding extra information to it. For example, it's putting the user's full name, email, and username into the token. These are like special notes attached to the key.
    return token: Finally, the customized token is given back to the user. Now, when this token is used, it not only lets the user in but also carries their full name, email, and username as extra information, which the website can use as needed.
    '''
    @classmethod
    # Define a custom method to get the token for a user
    def get_token(cls, user):
        # Call the parent class's get_token method
        token = super().get_token(user)

        # Add custom claims to the token
        token['full_name'] = user.full_name
        token['email'] = user.email
        token['username'] = user.username
        token['role'] = user.role.name if user.role else None
        token['role_display'] = str(user.role) if user.role else None
        token['permissions'] = user.get_permissions()
        token['employee_id'] = user.employee_id
        token['is_active'] = user.is_active
        token['hospital_id'] = user.hospital.id if user.hospital else None
        token['hospital_name'] = str(user.hospital.name) if user.hospital else None
        token['district_id'] = user.district.id if user.district else (user.hospital.district.id if user.hospital else None)
        token['department_id'] = user.department.id if user.department else None
        token['department_name'] = user.department.name if user.department else None
        token['department_display'] = user.department.get_name_display() if user.department else None
        try:
            token['vendor_id'] = user.vendor.id
        except:
            token['vendor_id'] = 0
        try:
            profile = user.profile
            profile_img = profile.image
            default_img = 'default/default-user.jpg'
            if profile_img and hasattr(profile_img, 'name') and profile_img.name and profile_img.name != default_img:
                token['photo_url'] = profile_img.url
            else:
                try:
                    patient = user.patient_record
                    token['photo_url'] = patient.photo.url if patient.photo else None
                except Exception:
                    token['photo_url'] = None
            token['address'] = profile.address or None
        except Exception:
            token['photo_url'] = None
            token['address'] = None

        return token
    
# Define a serializer for user registration, which inherits from serializers.ModelSerializer
class RegisterSerializer(serializers.ModelSerializer):
    # Define fields for the serializer, including password and password2
    password = serializers.CharField(write_only=True, required=True, validators=[validate_password])
    password2 = serializers.CharField(write_only=True, required=True)

    class Meta:
        # Specify the model that this serializer is associated with
        model = User
        # Define the fields from the model that should be included in the serializer
        fields = ('full_name', 'email', 'phone', 'password', 'password2')

    def validate(self, attrs):
        # Define a validation method to check if the passwords match
        if attrs['password'] != attrs['password2']:
            # Raise a validation error if the passwords don't match
            raise serializers.ValidationError({"password": "Password fields didn't match."})

        # Return the validated attributes
        return attrs

    def create(self, validated_data):
        # Define a method to create a new user based on validated data
        user = User.objects.create(
            full_name=validated_data['full_name'],
            email=validated_data['email'],
            phone=validated_data['phone']
        )
        email_username, mobile = user.email.split('@')
        user.username = email_username

        # Set the user's password based on the validated data
        user.set_password(validated_data['password'])
        user.save()

        return user
    

class UserSerializer(serializers.ModelSerializer):
    role_name = serializers.CharField(source='role.name', read_only=True)
    role_display = serializers.CharField(source='role', read_only=True)
    permissions = serializers.SerializerMethodField()
    hospital_name = serializers.CharField(source='hospital.name', read_only=True, default=None)
    hospital_type = serializers.CharField(source='hospital.get_hospital_type_display', read_only=True, default=None)
    district_name = serializers.SerializerMethodField()
    region_name = serializers.SerializerMethodField()
    department_name = serializers.CharField(source='department.name', read_only=True, default=None)
    department_display = serializers.CharField(source='department.get_name_display', read_only=True, default=None)
    specialties_list = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = '__all__'
        extra_kwargs = {'password': {'write_only': True}}
    
    def get_permissions(self, obj):
        return obj.get_permissions()
    
    def get_specialties_list(self, obj):
        """Return list of specialty names for doctors"""
        if obj.role and obj.role.name == 'doctor':
            return [{'id': s.id, 'name': s.name, 'category': s.category} for s in obj.specialties.all()]
        return []
    
    def get_district_name(self, obj):
        if obj.district:
            return str(obj.district)
        if obj.hospital and obj.hospital.district:
            return str(obj.hospital.district)
        return None
    
    def get_region_name(self, obj):
        if obj.district and obj.district.region:
            return str(obj.district.region)
        if obj.hospital and obj.hospital.district:
            return str(obj.hospital.district.region)
        return None


class ProfileSerializer(serializers.ModelSerializer):

    class Meta:
        model = Profile
        fields = '__all__'


    def to_representation(self, instance):
        response = super().to_representation(instance)
        response['user'] = UserSerializer(instance.user).data
        return response


class RoleSerializer(serializers.ModelSerializer):
    permissions = serializers.SerializerMethodField()
    user_count = serializers.SerializerMethodField()
    display_name = serializers.CharField(source='get_name_display', read_only=True)
    
    class Meta:
        model = Role
        fields = ['id', 'name', 'display_name', 'description', 'created_at', 'updated_at', 'permissions', 'user_count']
    
    def get_permissions(self, obj):
        return PermissionSerializer(obj.role_permissions.all(), many=True).data
    
    def get_user_count(self, obj):
        return obj.users.count()


class PermissionSerializer(serializers.ModelSerializer):
    permission_name = serializers.CharField(source='permission.name', read_only=True)
    permission_display = serializers.CharField(source='permission', read_only=True)
    
    class Meta:
        model = RolePermission
        fields = ['id', 'permission', 'permission_name', 'permission_display', 'created_at']


class SimplePermissionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Permission
        fields = ['id', 'name', 'description']


import random
import string

class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True)
    is_active = serializers.BooleanField(default=False)
    employee_id = serializers.CharField(read_only=True)
    specialty_ids = serializers.ListField(child=serializers.IntegerField(), required=False, write_only=True, help_text='List of specialty IDs for doctors')

    # Profile demographic fields
    date_of_birth   = serializers.DateField(required=False, allow_null=True)
    gender          = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    nationality     = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    nin_number      = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    marital_status  = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    address         = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    city            = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    state           = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    country         = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    # Profile professional fields
    qualification       = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    specialization      = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    license_number      = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    years_of_experience = serializers.IntegerField(required=False, allow_null=True)

    # Profile emergency contact
    emergency_contact_name         = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    emergency_contact_phone        = serializers.CharField(required=False, allow_blank=True, allow_null=True)
    emergency_contact_relationship = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    # Profile file uploads
    profile_photo    = serializers.ImageField(required=False, allow_null=True)
    certificate      = serializers.FileField(required=False, allow_null=True)
    license_document = serializers.FileField(required=False, allow_null=True)
    cv               = serializers.FileField(required=False, allow_null=True)

    PROFILE_FIELDS = [
        'date_of_birth', 'gender', 'nationality', 'nin_number', 'marital_status',
        'address', 'city', 'state', 'country',
        'qualification', 'specialization', 'license_number', 'years_of_experience',
        'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship',
        'profile_photo', 'certificate', 'license_document', 'cv',
    ]

    class Meta:
        model = User
        fields = [
            'email', 'full_name', 'phone', 'role', 'employee_id',
            'hospital', 'department', 'district', 'password', 'is_active', 'specialty_ids',
            'date_of_birth', 'gender', 'nationality', 'nin_number', 'marital_status',
            'address', 'city', 'state', 'country',
            'qualification', 'specialization', 'license_number', 'years_of_experience',
            'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship',
            'profile_photo', 'certificate', 'license_document', 'cv',
        ]

    def generate_employee_id(self):
        """Generate unique employee ID in format EMP-XXXXX"""
        while True:
            random_num = ''.join(random.choices(string.digits, k=5))
            employee_id = f'EMP-{random_num}'
            if not User.objects.filter(employee_id=employee_id).exists():
                return employee_id

    def create(self, validated_data):
        # Separate profile fields from user fields
        profile_data = {}
        for field in self.PROFILE_FIELDS:
            if field in validated_data:
                profile_data[field] = validated_data.pop(field)

        password = validated_data.pop('password')
        specialty_ids = validated_data.pop('specialty_ids', [])

        if not validated_data.get('employee_id'):
            validated_data['employee_id'] = self.generate_employee_id()

        user = User.objects.create(**validated_data)
        user.set_password(password)
        user.save()
        
        # Assign specialties to doctor
        if specialty_ids:
            user.specialties.set(specialty_ids)

        # Update the auto-created profile
        profile, _ = Profile.objects.get_or_create(user=user)
        photo = profile_data.pop('profile_photo', None)
        for attr, value in profile_data.items():
            if value not in (None, ''):
                setattr(profile, attr, value)
        if photo:
            profile.image = photo
        profile.save()

        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    employee_id = serializers.CharField(read_only=True)
    specialty_ids = serializers.ListField(child=serializers.IntegerField(), required=False, write_only=True, help_text='List of specialty IDs for doctors')
    
    class Meta:
        model = User
        fields = ['full_name', 'phone', 'role', 'employee_id', 'hospital', 'department', 'district', 'is_active', 'specialty_ids']
    
    def update(self, instance, validated_data):
        specialty_ids = validated_data.pop('specialty_ids', None)
        
        # Update user fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update specialties if provided
        if specialty_ids is not None:
            instance.specialties.set(specialty_ids)
        
        return instance


class RolePermissionAssignSerializer(serializers.Serializer):
    role_id = serializers.IntegerField()
    permission_ids = serializers.ListField(child=serializers.IntegerField())


# ============ Organization Serializers ============

class RegionSerializer(serializers.ModelSerializer):
    district_count = serializers.SerializerMethodField()
    chiefdom_count = serializers.SerializerMethodField()
    town_count = serializers.SerializerMethodField()
    hospital_count = serializers.SerializerMethodField()
    staff_count = serializers.SerializerMethodField()

    class Meta:
        model = Region
        fields = ['id', 'name', 'code', 'description', 'is_active', 'created_at', 'updated_at', 'district_count', 'chiefdom_count', 'town_count', 'hospital_count', 'staff_count']
        extra_kwargs = {'code': {'required': False, 'allow_blank': True}}

    def get_district_count(self, obj):
        return obj.districts.count()

    def get_chiefdom_count(self, obj):
        return Chiefdom.objects.filter(district__region=obj).count()

    def get_town_count(self, obj):
        return Town.objects.filter(district__region=obj).count()

    def get_hospital_count(self, obj):
        return Hospital.objects.filter(district__region=obj).count()

    def get_staff_count(self, obj):
        return User.objects.filter(hospital__district__region=obj).count()


class DistrictSerializer(serializers.ModelSerializer):
    region_name = serializers.CharField(source='region.name', read_only=True)
    chiefdom_count = serializers.SerializerMethodField()
    town_count = serializers.SerializerMethodField()
    hospital_count = serializers.SerializerMethodField()
    staff_count = serializers.SerializerMethodField()

    class Meta:
        model = District
        fields = ['id', 'name', 'code', 'region', 'region_name', 'description', 'is_active', 'created_at', 'updated_at', 'chiefdom_count', 'town_count', 'hospital_count', 'staff_count']
        extra_kwargs = {'code': {'required': False, 'allow_blank': True}}

    def get_chiefdom_count(self, obj):
        return obj.chiefdoms.count()

    def get_town_count(self, obj):
        return obj.towns.count()

    def get_hospital_count(self, obj):
        return obj.hospitals.count()

    def get_staff_count(self, obj):
        return User.objects.filter(hospital__district=obj).count()


class ChiefdomSerializer(serializers.ModelSerializer):
    district_name = serializers.CharField(source='district.name', read_only=True)

    class Meta:
        model = Chiefdom
        fields = ['id', 'name', 'code', 'district', 'district_name', 'is_active', 'created_at', 'updated_at']
        extra_kwargs = {'code': {'required': False, 'allow_blank': True}}


class TownSerializer(serializers.ModelSerializer):
    district_name = serializers.CharField(source='district.name', read_only=True)
    chiefdom_name = serializers.CharField(source='chiefdom.name', read_only=True, default=None)

    class Meta:
        model = Town
        fields = ['id', 'name', 'code', 'district', 'district_name', 'chiefdom', 'chiefdom_name', 'is_active', 'created_at', 'updated_at']
        extra_kwargs = {'code': {'required': False, 'allow_blank': True}}


class HospitalSerializer(serializers.ModelSerializer):
    district_name = serializers.CharField(source='district.name', read_only=True)
    region_name = serializers.CharField(source='district.region.name', read_only=True)
    hospital_type_display = serializers.CharField(source='get_hospital_type_display', read_only=True)
    ownership_type_display = serializers.CharField(source='get_ownership_type_display', read_only=True)
    level_of_care_display = serializers.CharField(source='get_level_of_care_display', read_only=True)
    operational_status_display = serializers.CharField(source='get_operational_status_display', read_only=True)
    approval_status_display = serializers.CharField(source='get_approval_status_display', read_only=True)
    admin_user_name = serializers.CharField(source='admin_user.full_name', read_only=True, default=None)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True, default=None)
    approved_by_name = serializers.CharField(source='approved_by.full_name', read_only=True, default=None)
    department_count = serializers.SerializerMethodField()
    staff_count = serializers.SerializerMethodField()

    class Meta:
        model = Hospital
        fields = [
            'id', 'name', 'code', 'facility_code',
            'hospital_type', 'hospital_type_display',
            'ownership_type', 'ownership_type_display',
            'level_of_care', 'level_of_care_display',
            'operational_status', 'operational_status_display',
            'date_registered',
            # Location
            'country', 'district', 'district_name', 'region_name',
            'chiefdom_ward', 'town_city', 'address', 'latitude', 'longitude',
            # Contact
            'phone', 'secondary_phone', 'email', 'website', 'emergency_contact_line',
            # Administration
            'hospital_admin_name', 'admin_user', 'admin_user_name',
            'medical_superintendent', 'facility_manager',
            'license_number', 'license_expiry_date',
            # Services & Capacity
            'bed_capacity', 'emergency_services', 'laboratory_available',
            'pharmacy_available', 'radiology_available', 'maternity_services',
            'surgery_services', 'outpatient_services', 'inpatient_services', 'ambulance_available',
            # System Configuration
            'facility_timezone', 'working_hours', 'patient_id_prefix',
            'allow_external_access', 'data_sharing_consent',
            # Reporting
            'reporting_facility_code', 'dhis2_code', 'catchment_population',
            'referral_level', 'supervising_authority',
            # Audit
            'is_active', 'created_by', 'created_by_name', 'created_at',
            'last_updated_by', 'updated_at',
            'approval_status', 'approval_status_display',
            'approved_by', 'approved_by_name',
            'department_count', 'staff_count',
            # Documents
            'hospital_image', 'license_document',
        ]
        extra_kwargs = {'code': {'required': False, 'allow_blank': True, 'allow_null': True}}

    def get_department_count(self, obj):
        return obj.departments.count()

    def get_staff_count(self, obj):
        return obj.staff.count()


class DepartmentSerializer(serializers.ModelSerializer):
    hospital_name = serializers.CharField(source='hospital.name', read_only=True)
    name_display = serializers.CharField(source='get_name_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    head_user_name = serializers.CharField(source='head_user.full_name', read_only=True, default=None)
    staff_count = serializers.SerializerMethodField()

    class Meta:
        model = Department
        fields = ['id', 'name', 'name_display', 'department_code', 'hospital', 'hospital_name',
                  'head_of_department', 'head_user', 'head_user_name',
                  'phone', 'status', 'status_display', 'is_active', 'created_at', 'staff_count']
        extra_kwargs = {'department_code': {'required': False, 'allow_blank': True}}

    def get_staff_count(self, obj):
        return obj.staff.count()


class HospitalCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Hospital
        fields = [
            # Basic
            'name', 'code', 'facility_code', 'hospital_type',
            'ownership_type', 'level_of_care', 'operational_status',
            # Location
            'country', 'district', 'chiefdom_ward', 'town_city',
            'address', 'latitude', 'longitude',
            # Contact
            'phone', 'secondary_phone', 'email', 'website', 'emergency_contact_line',
            # Administration
            'hospital_admin_name', 'admin_user', 'medical_superintendent',
            'facility_manager', 'license_number', 'license_expiry_date',
            # Services
            'bed_capacity', 'emergency_services', 'laboratory_available',
            'pharmacy_available', 'radiology_available', 'maternity_services',
            'surgery_services', 'outpatient_services', 'inpatient_services', 'ambulance_available',
            # System Config
            'facility_timezone', 'working_hours', 'patient_id_prefix',
            'allow_external_access', 'data_sharing_consent',
            # Reporting
            'reporting_facility_code', 'dhis2_code', 'catchment_population',
            'referral_level', 'supervising_authority',
            # Audit
            'is_active', 'approval_status',
            # Documents
            'hospital_image', 'license_document',
        ]
        extra_kwargs = {
            'code': {'required': False, 'allow_blank': True, 'allow_null': True},
            'facility_code': {'required': False, 'allow_blank': True, 'allow_null': True},
            'hospital_image': {'required': False},
            'license_document': {'required': False},
        }
    
    def validate(self, attrs):
        """Convert empty strings to None for fields with unique constraints"""
        # Fields that need empty string -> None conversion
        unique_fields = ['facility_code', 'code', 'license_number', 'dhis2_code', 'reporting_facility_code']
        
        for field in unique_fields:
            if field in attrs and attrs[field] == '':
                attrs[field] = None
        
        return attrs


# ============ Medical Specialty Serializers ============

class MedicalSpecialtySerializer(serializers.ModelSerializer):
    """Full Medical Specialty serializer with all details"""
    department_name = serializers.CharField(source='department.name', read_only=True)
    department_display = serializers.CharField(source='department.get_name_display', read_only=True)
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    doctors_count = serializers.SerializerMethodField()
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True)
    
    class Meta:
        model = MedicalSpecialty
        fields = [
            'id', 'specialty_id', 'name', 'description', 'category', 'category_display',
            'department', 'department_name', 'department_display',
            'is_active', 'doctors_count', 'created_at', 'updated_at',
            'created_by', 'created_by_name'
        ]
        read_only_fields = ['specialty_id', 'created_at', 'updated_at', 'created_by']
    
    def get_doctors_count(self, obj):
        return obj.get_doctors_count()


class MedicalSpecialtyCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating medical specialties"""
    class Meta:
        model = MedicalSpecialty
        fields = ['name', 'description', 'category', 'department', 'is_active']


class MedicalSpecialtyUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating medical specialties"""
    class Meta:
        model = MedicalSpecialty
        fields = ['name', 'description', 'category', 'department', 'is_active']


class SimpleMedicalSpecialtySerializer(serializers.ModelSerializer):
    """Minimal specialty info for dropdowns and selections"""
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    
    class Meta:
        model = MedicalSpecialty
        fields = ['id', 'specialty_id', 'name', 'category', 'category_display', 'is_active']


# ============ Patient Serializers ============

class PatientSerializer(serializers.ModelSerializer):
    full_name = serializers.CharField(read_only=True)
    age = serializers.IntegerField(read_only=True)
    hospital_name = serializers.CharField(source='hospital.name', read_only=True)
    registered_by_name = serializers.CharField(source='registered_by.full_name', read_only=True, default=None)
    gender_display = serializers.CharField(source='get_gender_display', read_only=True)
    blood_type_display = serializers.CharField(source='get_blood_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    marital_status_display = serializers.CharField(source='get_marital_status_display', read_only=True, default=None)
    district_name = serializers.CharField(source='district.name', read_only=True, default=None)
    chiefdom_name = serializers.CharField(source='chiefdom.name', read_only=True, default=None)
    town_name = serializers.CharField(source='town.name', read_only=True, default=None)
    has_portal_account = serializers.SerializerMethodField()
    photo_url = serializers.SerializerMethodField()

    def get_has_portal_account(self, obj):
        return obj.user_id is not None

    def get_photo_url(self, obj):
        if not obj.photo:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.photo.url)
        return obj.photo.url

    class Meta:
        model = Patient
        fields = '__all__'
        read_only_fields = ['patient_id', 'created_at', 'updated_at']


class PatientReferralSerializer(serializers.ModelSerializer):
    """
    Limited view of a patient record for cross-hospital referral access.
    Only shows referral-relevant data (demographics, allergies, chronic
    conditions, current medications, contact info) — not full lifetime history.
    """
    full_name = serializers.CharField(read_only=True)
    age = serializers.IntegerField(read_only=True)
    hospital_name = serializers.CharField(source='hospital.name', read_only=True)
    gender_display = serializers.CharField(source='get_gender_display', read_only=True)
    blood_type_display = serializers.CharField(source='get_blood_type_display', read_only=True)
    marital_status_display = serializers.CharField(source='get_marital_status_display', read_only=True, default=None)
    district_name = serializers.CharField(source='district.name', read_only=True, default=None)
    chiefdom_name = serializers.CharField(source='chiefdom.name', read_only=True, default=None)
    town_name = serializers.CharField(source='town.name', read_only=True, default=None)

    class Meta:
        model = Patient
        fields = [
            'id', 'patient_id', 'full_name', 'age',
            'first_name', 'last_name', 'other_names',
            'date_of_birth', 'gender', 'gender_display',
            'marital_status', 'marital_status_display',
            'nationality', 'national_id',
            'photo',
            'phone', 'alt_phone', 'email', 'address', 'city', 'region',
            'district', 'district_name',
            'chiefdom', 'chiefdom_name',
            'town', 'town_name',
            'blood_type', 'blood_type_display',
            'allergies', 'chronic_conditions', 'disabilities',
            'insurance_provider', 'insurance_number',
            'next_of_kin_name', 'next_of_kin_phone',
            'next_of_kin_relationship', 'next_of_kin_address',
            'emergency_contact_name', 'emergency_contact_phone',
            'emergency_contact_relationship',
            'hospital', 'hospital_name',
            'status', 'is_active',
        ]
        read_only_fields = fields


class PatientCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Patient
        fields = [
            'first_name', 'last_name', 'other_names', 'date_of_birth', 'gender',
            'marital_status', 'nationality', 'national_id', 'photo',
            'phone', 'alt_phone', 'email', 'address', 'city', 'region',
            'district', 'chiefdom', 'town',
            'blood_type', 'allergies', 'chronic_conditions', 'disabilities',
            'insurance_provider', 'insurance_number', 'insurance_expiry',
            'next_of_kin_name', 'next_of_kin_phone', 'next_of_kin_relationship', 'next_of_kin_address',
            'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship',
        ]


class PatientUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Patient
        fields = [
            'first_name', 'last_name', 'other_names', 'date_of_birth', 'gender',
            'marital_status', 'nationality', 'national_id', 'photo',
            'phone', 'alt_phone', 'email', 'address', 'city', 'region',
            'district', 'chiefdom', 'town',
            'blood_type', 'allergies', 'chronic_conditions', 'disabilities',
            'insurance_provider', 'insurance_number', 'insurance_expiry',
            'next_of_kin_name', 'next_of_kin_phone', 'next_of_kin_relationship', 'next_of_kin_address',
            'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship',
            'status', 'is_active',
        ]


# ═══════════════════════════════════════════════════════════════
# MESSAGING SERIALIZERS
# ═══════════════════════════════════════════════════════════════

class MessageUserSerializer(serializers.ModelSerializer):
    """Minimal user info for message displays."""
    role_name = serializers.CharField(source='role.name', read_only=True, default=None)
    hospital_name = serializers.CharField(source='hospital.name', read_only=True, default=None)

    class Meta:
        model = User
        fields = ['id', 'email', 'full_name', 'role_name', 'hospital_name']


class MessageSerializer(serializers.ModelSerializer):
    """Full message serializer for listing and reading messages."""
    sender = MessageUserSerializer(read_only=True)
    recipient = MessageUserSerializer(read_only=True)
    attachment_url = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            'id', 'sender', 'recipient', 'subject', 'body', 'parent',
            'attachment', 'attachment_url', 'attachment_type', 'attachment_name', 'attachment_duration',
            'is_read', 'read_at', 'created_at',
        ]
        read_only_fields = ['id', 'sender', 'is_read', 'read_at', 'created_at', 'attachment_url']

    def get_attachment_url(self, obj):
        if not obj.attachment:
            return None
        request = self.context.get('request')
        url = obj.attachment.url
        return request.build_absolute_uri(url) if request else url


class MessageCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating messages - enforces role-based permissions."""
    class Meta:
        model = Message
        fields = ['recipient', 'subject', 'body', 'parent']

    def validate(self, attrs):
        sender = self.context['request'].user
        recipient = attrs.get('recipient')

        if sender.id == recipient.id:
            raise serializers.ValidationError("You cannot send a message to yourself.")

        sender_role = sender.role.name if sender.role else None
        # admin / ministry_admin can message anyone
        if sender_role in ('admin', 'ministry_admin'):
            return attrs

        # Otherwise: must share hospital OR department OR recipient must be admin/ministry
        recipient_role = recipient.role.name if recipient.role else None
        if recipient_role in ('admin', 'ministry_admin'):
            return attrs  # anyone can reply/message admins

        # Same hospital
        if sender.hospital_id and sender.hospital_id == recipient.hospital_id:
            return attrs
        # Same department
        if sender.department_id and sender.department_id == recipient.department_id:
            return attrs

        raise serializers.ValidationError(
            "You can only send messages to users in your hospital or department, or to administrators."
        )


# ═══════════════════════════════════════════════════════════════
# APPOINTMENT SERIALIZERS
# ═══════════════════════════════════════════════════════════════

class AppointmentUserSerializer(serializers.ModelSerializer):
    """Minimal user info for appointment displays."""
    class Meta:
        model = User
        fields = ['id', 'full_name', 'email', 'phone']


class AppointmentPatientSerializer(serializers.ModelSerializer):
    """Minimal patient info for appointment displays."""
    full_name = serializers.CharField(read_only=True)

    class Meta:
        model = Patient
        fields = ['id', 'patient_id', 'full_name', 'phone', 'email']


class AppointmentSerializer(serializers.ModelSerializer):
    """Full appointment data with nested relations."""
    doctor = AppointmentUserSerializer(read_only=True)
    patient = AppointmentPatientSerializer(read_only=True)
    created_by = AppointmentUserSerializer(read_only=True)
    checked_in_by = AppointmentUserSerializer(read_only=True)
    hospital = serializers.StringRelatedField(read_only=True)
    department = serializers.StringRelatedField(read_only=True)

    status_display = serializers.CharField(source='get_status_display', read_only=True)
    doctor_name = serializers.CharField(source='doctor.full_name', read_only=True)
    patient_name = serializers.CharField(source='patient.full_name', read_only=True)

    class Meta:
        model = Appointment
        fields = [
            'id', 'patient', 'doctor', 'hospital', 'department',
            'scheduled_at', 'duration_minutes', 'consultation_started_at', 'status', 'status_display', 'priority',
            'reason', 'notes',
            'preferred_date', 'preferred_time_note', 'decline_reason',
            'doctor_name', 'patient_name',
            'is_referral',
            'created_by', 'created_at',
            'checked_in_at', 'checked_in_by',
            'consultation_started_at', 'completed_at',
            'cancelled_at', 'cancellation_reason',
            'updated_at',
        ]


class AppointmentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new appointments."""
    class Meta:
        model = Appointment
        fields = ['patient', 'doctor', 'scheduled_at', 'duration_minutes', 'priority', 'reason', 'notes']

    def validate(self, attrs):
        request = self.context.get('request')
        user = request.user if request else None
        if not user:
            raise serializers.ValidationError("Authentication required.")

        doctor = attrs.get('doctor')
        patient = attrs.get('patient')

        # Validate doctor belongs to user's hospital (for non-admins)
        role = user.role.name if user.role else None
        if role not in ('admin', 'ministry_admin'):
            if user.hospital_id and doctor.hospital_id != user.hospital_id:
                raise serializers.ValidationError("Doctor must belong to your hospital.")
            if user.hospital_id and patient.hospital_id != user.hospital_id:
                raise serializers.ValidationError("Patient must belong to your hospital.")

        # Validate scheduled_at is in the future
        from django.utils import timezone
        if attrs.get('scheduled_at') and attrs['scheduled_at'] < timezone.now():
            raise serializers.ValidationError("Appointment time must be in the future.")

        return attrs

    def create(self, validated_data):
        request = self.context.get('request')
        user = request.user if request else None

        # Auto-set hospital and department from doctor
        doctor = validated_data.get('doctor')
        validated_data['hospital_id'] = doctor.hospital_id
        validated_data['department_id'] = doctor.department_id
        validated_data['created_by'] = user

        return super().create(validated_data)


class AppointmentStatusUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating appointment status (check-in, complete, cancel, etc.)"""
    class Meta:
        model = Appointment
        fields = ['status', 'cancellation_reason']

    def validate(self, attrs):
        request = self.context.get('request')
        user = request.user if request else None
        instance = self.instance
        role = user.role.name if user.role else None

        # Only doctor can set 'in_consultation' or 'completed'
        if attrs.get('status') in ('in_consultation', 'completed'):
            if role != 'doctor' and role not in ('admin', 'ministry_admin'):
                raise serializers.ValidationError("Only doctors can start or complete consultations.")
            if instance.doctor_id != user.id and role not in ('admin', 'ministry_admin'):
                raise serializers.ValidationError("You can only manage your own appointments.")

        # Receptionist/Admin can do check-in, cancel, no_show
        if attrs.get('status') in ('checked_in', 'cancelled', 'no_show', 'scheduled'):
            if role not in ('receptionist', 'admin', 'hospital_admin', 'ministry_admin') and user.hospital_id != instance.hospital_id:
                raise serializers.ValidationError("You do not have permission to update this appointment status.")

        return attrs

    def update(self, instance, validated_data):
        from django.utils import timezone
        user = self.context['request'].user
        new_status = validated_data.get('status')

        # Set timestamps based on status transition
        if new_status == 'checked_in' and instance.status != 'checked_in':
            instance.checked_in_at = timezone.now()
            instance.checked_in_by = user
        elif new_status == 'in_consultation' and instance.status != 'in_consultation':
            instance.consultation_started_at = timezone.now()
        elif new_status == 'completed' and instance.status != 'completed':
            instance.completed_at = timezone.now()
        elif new_status == 'cancelled' and instance.status != 'cancelled':
            instance.cancelled_at = timezone.now()

        return super().update(instance, validated_data)


# ═══════════════════════════════════════════════════════════
# PATIENT VISIT / ENCOUNTER SERIALIZERS
# ═══════════════════════════════════════════════════════════

class VitalSignsSerializer(serializers.ModelSerializer):
    bmi            = serializers.ReadOnlyField()
    blood_pressure = serializers.ReadOnlyField()
    recorded_by_name = serializers.SerializerMethodField()

    class Meta:
        model  = VitalSigns
        fields = '__all__'
        read_only_fields = ['recorded_at']

    def get_recorded_by_name(self, obj):
        return obj.recorded_by.full_name if obj.recorded_by else None


class ClinicalNoteSerializer(serializers.ModelSerializer):
    doctor_name = serializers.SerializerMethodField()

    class Meta:
        model  = ClinicalNote
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']

    def get_doctor_name(self, obj):
        return obj.doctor.full_name if obj.doctor else None


def _serialize_clinical_note(note, request):
    """
    Return a serialized clinical note, redacting sensitive fields when
    is_confidential=True and the requesting user is not the authoring
    doctor or a national/system admin.
    """
    if note is None:
        return None

    user = request.user if request else None
    role = user.role.name if (user and user.role) else None
    is_admin  = role in ('admin', 'ministry_admin')
    is_author = user and note.doctor_id == user.id

    data = ClinicalNoteSerializer(note).data

    if note.is_confidential and not (is_admin or is_author):
        # Redact all clinical fields; preserve dispensing fields for pharmacy workflow
        REDACTED = '[RESTRICTED — confidential record]'
        for field in (
            'diagnosis', 'secondary_diagnoses', 'history_of_presenting_illness',
            'clinical_findings', 'investigations_ordered', 'investigation_results',
            'treatment_plan', 'procedures_done', 'patient_education',
            'follow_up_instructions',
        ):
            if data.get(field):
                data[field] = REDACTED
        data['_confidential_notice'] = (
            'This record is marked confidential. Full details are restricted '
            'to the authoring clinician and system administrators.'
        )

    return data


class PatientVisitListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for list/timeline views."""
    hospital_name    = serializers.SerializerMethodField()
    department_name  = serializers.SerializerMethodField()
    doctor_name      = serializers.SerializerMethodField()
    registered_by_name = serializers.SerializerMethodField()
    visit_type_display = serializers.CharField(source='get_visit_type_display', read_only=True)
    status_display     = serializers.CharField(source='get_status_display',     read_only=True)
    has_vitals        = serializers.SerializerMethodField()
    has_clinical_note = serializers.SerializerMethodField()
    diagnosis         = serializers.SerializerMethodField()
    patient_name      = serializers.SerializerMethodField()
    patient_id_code   = serializers.SerializerMethodField()
    patient_phone     = serializers.SerializerMethodField()
    patient_gender    = serializers.SerializerMethodField()
    patient_pk        = serializers.SerializerMethodField()
    vitals_summary    = serializers.SerializerMethodField()
    vitals            = VitalSignsSerializer(read_only=True)
    clinical_note     = serializers.SerializerMethodField()
    prescription      = serializers.SerializerMethodField()
    admission         = serializers.SerializerMethodField()
    lab_tests         = serializers.SerializerMethodField()
    referred_to_hospital_name = serializers.SerializerMethodField()

    class Meta:
        model  = PatientVisit
        fields = [
            'id', 'visit_date', 'visit_type', 'visit_type_display', 'queue_number',
            'chief_complaint', 'status', 'status_display',
            'hospital_name', 'department_name', 'doctor_name', 'registered_by_name',
            'discharge_date', 'referred_to_doctor', 'referred_to_hospital_name',
            'has_vitals', 'has_clinical_note', 'diagnosis',
            'patient_name', 'patient_id_code', 'patient_phone', 'patient_gender', 'patient_pk',
            'vitals_summary', 'vitals', 'clinical_note', 'prescription', 'admission', 'lab_tests',
            'created_at',
        ]

    def get_hospital_name(self, obj):    return obj.hospital.name if obj.hospital else None
    def get_department_name(self, obj):  return obj.department.get_name_display() if obj.department else None
    def get_doctor_name(self, obj):      return obj.doctor.full_name if obj.doctor else None
    def get_registered_by_name(self, obj): return obj.registered_by.full_name if obj.registered_by else None
    def get_has_vitals(self, obj):       return hasattr(obj, 'vitals')
    def get_has_clinical_note(self, obj): return hasattr(obj, 'clinical_note')
    def get_patient_name(self, obj):     return obj.patient.full_name if obj.patient else None
    def get_patient_id_code(self, obj):  return obj.patient.patient_id if obj.patient else None
    def get_patient_phone(self, obj):    return obj.patient.phone if obj.patient else None
    def get_patient_gender(self, obj):   return obj.patient.gender if obj.patient else None
    def get_patient_pk(self, obj):       return obj.patient.id if obj.patient else None
    def get_referred_to_hospital_name(self, obj): return obj.referred_to_hospital.name if obj.referred_to_hospital else None
    def get_clinical_note(self, obj):
        if not hasattr(obj, 'clinical_note'):
            return None
        return _serialize_clinical_note(obj.clinical_note, self.context.get('request'))

    def get_diagnosis(self, obj):
        if hasattr(obj, 'clinical_note'):
            note = obj.clinical_note
            request = self.context.get('request')
            user = request.user if request else None
            role = user.role.name if (user and user.role) else None
            is_admin  = role in ('admin', 'ministry_admin')
            is_author = user and note.doctor_id == user.id
            if note.is_confidential and not (is_admin or is_author):
                return '[RESTRICTED]'
            return note.diagnosis
        return None

    def get_prescription(self, obj):
        if hasattr(obj, 'prescription'):
            from userauths.serializer import PrescriptionSerializer
            return PrescriptionSerializer(obj.prescription).data
        return None
    def get_admission(self, obj):
        if hasattr(obj, 'admission') and obj.admission:
            from userauths.serializer import InpatientAdmissionSerializer
            return InpatientAdmissionSerializer(obj.admission).data
        return None
    def get_lab_tests(self, obj):
        tests = getattr(obj, 'lab_tests', None)
        if tests is not None:
            return [{'id': t.id, 'test_name': t.test_name, 'test_category': t.test_category,
                     'test_category_display': t.get_test_category_display(), 'priority': t.priority,
                     'priority_display': t.get_priority_display(), 'status': t.status,
                     'status_display': t.get_status_display(), 'sample_type': t.sample_type,
                     'sample_type_display': t.get_sample_type_display(), 'clinical_info': t.clinical_info,
                     'is_critical': t.is_critical, 'doctor_notified': t.doctor_notified,
                     'result_value': t.result_value, 'result_unit': t.result_unit,
                     'reference_range': t.reference_range, 'result_notes': t.result_notes,
                     'sample_collected_at': t.sample_collected_at.isoformat() if t.sample_collected_at else None,
                     'completed_at': t.completed_at.isoformat() if t.completed_at else None,
                     'created_at': t.created_at.isoformat()} for t in tests.all()]
        return []

    def get_vitals_summary(self, obj):
        if hasattr(obj, 'vitals'):
            v = obj.vitals
            return {
                'bp': f"{v.blood_pressure_systolic}/{v.blood_pressure_diastolic}" if v.blood_pressure_systolic else None,
                'hr': v.heart_rate,
                'temp': str(v.temperature_celsius) if v.temperature_celsius else None,
                'o2': str(v.oxygen_saturation) if v.oxygen_saturation else None,
            }
        return None


class PatientVisitDetailSerializer(serializers.ModelSerializer):
    """Full serializer including nested vitals and clinical note."""
    hospital_name      = serializers.SerializerMethodField()
    department_name    = serializers.SerializerMethodField()
    doctor_name        = serializers.SerializerMethodField()
    registered_by_name = serializers.SerializerMethodField()
    visit_type_display = serializers.CharField(source='get_visit_type_display', read_only=True)
    status_display     = serializers.CharField(source='get_status_display',     read_only=True)
    vitals             = VitalSignsSerializer(read_only=True)
    clinical_note      = serializers.SerializerMethodField()
    prescription       = serializers.SerializerMethodField()
    admission          = serializers.SerializerMethodField()
    lab_tests          = serializers.SerializerMethodField()
    referred_hospital_name = serializers.SerializerMethodField()
    patient_name       = serializers.SerializerMethodField()
    patient_id_code    = serializers.SerializerMethodField()
    patient_phone      = serializers.SerializerMethodField()
    patient_gender     = serializers.SerializerMethodField()
    patient_pk         = serializers.SerializerMethodField()

    class Meta:
        model  = PatientVisit
        fields = '__all__'

    def get_hospital_name(self, obj):        return obj.hospital.name if obj.hospital else None
    def get_department_name(self, obj):      return obj.department.get_name_display() if obj.department else None
    def get_doctor_name(self, obj):          return obj.doctor.full_name if obj.doctor else None
    def get_registered_by_name(self, obj):   return obj.registered_by.full_name if obj.registered_by else None
    def get_referred_hospital_name(self, obj): return obj.referred_to_hospital.name if obj.referred_to_hospital else None
    def get_patient_name(self, obj):         return obj.patient.full_name if obj.patient else None
    def get_patient_id_code(self, obj):      return obj.patient.patient_id if obj.patient else None
    def get_patient_phone(self, obj):        return obj.patient.phone if obj.patient else None
    def get_patient_gender(self, obj):       return obj.patient.gender if obj.patient else None
    def get_patient_pk(self, obj):           return obj.patient.id if obj.patient else None
    def get_clinical_note(self, obj):
        if not hasattr(obj, 'clinical_note'):
            return None
        return _serialize_clinical_note(obj.clinical_note, self.context.get('request'))
    def get_admission(self, obj):
        if hasattr(obj, 'admission') and obj.admission:
            from userauths.serializer import InpatientAdmissionSerializer
            return InpatientAdmissionSerializer(obj.admission).data
        return None
    def get_lab_tests(self, obj):
        tests = getattr(obj, 'lab_tests', None)
        if tests is not None:
            return [{'id': t.id, 'test_name': t.test_name, 'test_category': t.test_category,
                     'test_category_display': t.get_test_category_display(), 'priority': t.priority,
                     'priority_display': t.get_priority_display(), 'status': t.status,
                     'status_display': t.get_status_display(), 'sample_type': t.sample_type,
                     'sample_type_display': t.get_sample_type_display(), 'clinical_info': t.clinical_info,
                     'is_critical': t.is_critical, 'doctor_notified': t.doctor_notified,
                     'result_value': t.result_value, 'result_unit': t.result_unit,
                     'reference_range': t.reference_range, 'result_notes': t.result_notes,
                     'sample_collected_at': t.sample_collected_at.isoformat() if t.sample_collected_at else None,
                     'completed_at': t.completed_at.isoformat() if t.completed_at else None,
                     'created_at': t.created_at.isoformat()} for t in tests.all()]
        return []


class PatientVisitCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a new visit record."""
    class Meta:
        model  = PatientVisit
        fields = [
            'patient', 'appointment', 'hospital', 'department', 'doctor',
            'visit_type', 'chief_complaint', 'visit_date', 'status',
        ]
        extra_kwargs = {
            'hospital': {'required': False},
            'appointment': {'required': False},
        }

    def create(self, validated_data):
        request = self.context.get('request')
        validated_data['registered_by'] = request.user if request else None
        if not validated_data.get('hospital') and request and request.user and request.user.hospital:
            validated_data['hospital'] = request.user.hospital
        return super().create(validated_data)


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer for in-app notifications."""
    appointment_id = serializers.IntegerField(source='appointment.id', read_only=True, allow_null=True)
    scheduled_at   = serializers.DateTimeField(source='appointment.scheduled_at', read_only=True, allow_null=True)
    doctor_name    = serializers.CharField(source='appointment.doctor.full_name', read_only=True, allow_null=True)

    class Meta:
        model  = Notification
        fields = [
            'id', 'type', 'title', 'message', 'is_read', 'created_at',
            'appointment_id', 'scheduled_at', 'doctor_name',
        ]


class DoctorAvailabilitySerializer(serializers.ModelSerializer):
    """Serializer for a doctor's weekly recurring schedule."""
    day_of_week_display = serializers.CharField(source='get_day_of_week_display', read_only=True)

    class Meta:
        model  = DoctorAvailability
        fields = [
            'id', 'day_of_week', 'day_of_week_display',
            'start_time', 'end_time', 'slot_duration', 'is_active',
        ]


class DoctorUnavailableDateSerializer(serializers.ModelSerializer):
    """Serializer for specific blocked dates."""

    class Meta:
        model  = DoctorUnavailableDate
        fields = ['id', 'date', 'reason', 'created_at']


# ═══════════════════════════════════════════════════════════════
# AUDIT LOG SERIALIZERS
# ═══════════════════════════════════════════════════════════════

class AuditLogSerializer(serializers.ModelSerializer):
    user_name = serializers.CharField(read_only=True)
    user_role = serializers.CharField(read_only=True)
    patient_name = serializers.CharField(read_only=True)
    action_display = serializers.CharField(source='get_action_display', read_only=True)
    access_type_display = serializers.CharField(source='get_access_type_display', read_only=True)
    outcome_display = serializers.CharField(source='get_outcome_display', read_only=True)
    user_hospital_name = serializers.CharField(source='user_hospital.name', read_only=True, default=None)
    patient_hospital_name = serializers.CharField(source='patient_hospital.name', read_only=True, default=None)

    class Meta:
        model = AuditLog
        fields = [
            'id', 'user_name', 'user_role', 'user_hospital_name',
            'patient_name', 'patient_hospital_name',
            'action', 'action_display',
            'access_type', 'access_type_display',
            'outcome', 'outcome_display',
            'justification', 'override_approved',
            'ip_address', 'endpoint',
            'created_at',
        ]
        read_only_fields = fields


# ═══════════════════════════════════════════════════════════════
# STRUCTURED PRESCRIPTION SERIALIZERS
# ═══════════════════════════════════════════════════════════════

class PrescriptionItemSerializer(serializers.ModelSerializer):
    route_display     = serializers.CharField(source='get_route_display',     read_only=True)
    frequency_display = serializers.CharField(source='get_frequency_display', read_only=True)
    drug_name_display = serializers.SerializerMethodField()

    class Meta:
        model  = PrescriptionItem
        fields = [
            'id', 'drug', 'drug_name', 'drug_name_display', 'strength', 'dosage_form',
            'dose', 'route', 'route_display', 'frequency', 'frequency_display',
            'duration_days', 'quantity', 'instructions',
            'is_dispensed', 'dispensed_qty', 'created_at',
        ]
        read_only_fields = ['is_dispensed', 'dispensed_qty', 'created_at']

    def get_drug_name_display(self, obj):
        if obj.drug:
            return f"{obj.drug.drug_name} {obj.drug.strength}".strip()
        return obj.drug_name


class PrescriptionSerializer(serializers.ModelSerializer):
    items              = PrescriptionItemSerializer(many=True, read_only=True)
    status_display     = serializers.CharField(source='get_status_display', read_only=True)
    prescribed_by_name = serializers.SerializerMethodField()
    dispensed_by_name  = serializers.SerializerMethodField()
    patient_name       = serializers.SerializerMethodField()
    visit_date         = serializers.SerializerMethodField()

    class Meta:
        model  = Prescription
        fields = [
            'id', 'visit', 'clinical_note', 'hospital',
            'prescribed_by', 'prescribed_by_name',
            'status', 'status_display',
            'notes',
            'dispensed_by', 'dispensed_by_name', 'dispensed_at',
            'patient_name', 'visit_date',
            'items', 'created_at', 'updated_at',
        ]
        read_only_fields = ['created_at', 'updated_at', 'dispensed_at']

    def get_prescribed_by_name(self, obj):
        return obj.prescribed_by.full_name if obj.prescribed_by else None

    def get_dispensed_by_name(self, obj):
        return obj.dispensed_by.full_name if obj.dispensed_by else None

    def get_patient_name(self, obj):
        return obj.visit.patient.full_name if obj.visit and obj.visit.patient else None

    def get_visit_date(self, obj):
        return obj.visit.visit_date.isoformat() if obj.visit else None


class PrescriptionWriteSerializer(serializers.ModelSerializer):
    items = PrescriptionItemSerializer(many=True)

    class Meta:
        model  = Prescription
        fields = ['notes', 'items']

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        prescription = Prescription.objects.create(**validated_data)
        for item in items_data:
            PrescriptionItem.objects.create(prescription=prescription, **item)
        return prescription

    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        instance.notes = validated_data.get('notes', instance.notes)
        instance.save()
        if items_data is not None:
            instance.items.all().delete()
            for item in items_data:
                PrescriptionItem.objects.create(prescription=instance, **item)
        return instance


class WardSerializer(serializers.ModelSerializer):
    ward_type_display = serializers.CharField(source='get_ward_type_display', read_only=True)
    status_display    = serializers.CharField(source='get_status_display', read_only=True)
    hospital_name     = serializers.CharField(source='hospital.name', read_only=True)
    department_name   = serializers.CharField(source='department.get_name_display', read_only=True)
    occupancy_count   = serializers.IntegerField(read_only=True)
    available_count   = serializers.IntegerField(read_only=True)
    created_by_name   = serializers.CharField(source='created_by.full_name', read_only=True)

    class Meta:
        model  = Ward
        fields = [
            'id', 'hospital', 'hospital_name', 'name', 'ward_type', 'ward_type_display',
            'department', 'department_name', 'capacity', 'floor', 'phone',
            'status', 'status_display', 'is_active', 'occupancy_count', 'available_count',
            'created_by', 'created_by_name', 'created_at', 'updated_at',
        ]


class BedSerializer(serializers.ModelSerializer):
    bed_type_display  = serializers.CharField(source='get_bed_type_display', read_only=True)
    status_display    = serializers.CharField(source='get_status_display', read_only=True)
    ward_name         = serializers.CharField(source='ward.name', read_only=True)
    hospital_name     = serializers.CharField(source='ward.hospital.name', read_only=True)

    class Meta:
        model  = Bed
        fields = [
            'id', 'ward', 'ward_name', 'hospital_name', 'bed_number', 'bed_type', 'bed_type_display',
            'status', 'status_display', 'notes', 'is_active', 'created_at', 'updated_at',
        ]


class InpatientAdmissionSerializer(serializers.ModelSerializer):
    status_display        = serializers.CharField(source='get_status_display', read_only=True)
    discharge_type_display = serializers.CharField(source='get_discharge_type_display', read_only=True)
    patient_name          = serializers.CharField(source='visit.patient.full_name', read_only=True)
    patient_id_code       = serializers.CharField(source='visit.patient.patient_id', read_only=True)
    patient_gender        = serializers.CharField(source='visit.patient.gender', read_only=True)
    visit_type_display    = serializers.CharField(source='visit.get_visit_type_display', read_only=True)
    bed_info              = BedSerializer(source='bed', read_only=True)
    ward_info             = WardSerializer(source='ward', read_only=True)
    hospital_name         = serializers.CharField(source='hospital.name', read_only=True)
    admitted_by_name      = serializers.CharField(source='admitted_by.full_name', read_only=True)
    discharged_by_name    = serializers.CharField(source='discharged_by.full_name', read_only=True)
    care_team_names       = serializers.SerializerMethodField()
    length_of_stay_days   = serializers.IntegerField(read_only=True)

    class Meta:
        model  = InpatientAdmission
        fields = [
            'id', 'visit', 'visit_type_display',
            'bed', 'bed_info', 'ward', 'ward_info', 'hospital', 'hospital_name',
            'admission_date', 'admitted_by', 'admitted_by_name', 'admission_notes',
            'care_team', 'care_team_names',
            'discharge_date', 'discharged_by', 'discharged_by_name',
            'discharge_type', 'discharge_type_display', 'discharge_summary',
            'discharge_medications', 'follow_up_date', 'follow_up_instructions',
            'status', 'status_display', 'length_of_stay_days',
            'created_at', 'updated_at',
        ]

    def get_care_team_names(self, obj):
        return [u.full_name for u in obj.care_team.all()]


class InpatientAdmissionWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model  = InpatientAdmission
        fields = [
            'visit', 'bed', 'ward', 'hospital', 'admission_date',
            'admission_notes', 'care_team', 'status',
            'discharge_date', 'discharged_by', 'discharge_type',
            'discharge_summary', 'discharge_medications',
            'follow_up_date', 'follow_up_instructions',
        ]


# ═══════════════════════════════════════════════════════════
# BILLING SERIALIZERS
# ═══════════════════════════════════════════════════════════

class InvoiceItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = InvoiceItem
        fields = ['id', 'invoice', 'description', 'quantity', 'unit_price', 'line_total', 'category', 'created_at']
        read_only_fields = ['line_total', 'created_at']


class PaymentSerializer(serializers.ModelSerializer):
    method_display = serializers.CharField(source='get_method_display', read_only=True)
    received_by_name = serializers.CharField(source='received_by.full_name', read_only=True)

    class Meta:
        model = Payment
        fields = ['id', 'invoice', 'amount', 'method', 'method_display', 'reference', 'received_by', 'received_by_name', 'notes', 'created_at']
        read_only_fields = ['created_at']


class InvoiceSerializer(serializers.ModelSerializer):
    status_display  = serializers.CharField(source='get_status_display', read_only=True)
    patient_name    = serializers.CharField(source='patient.full_name',   read_only=True)
    patient_code    = serializers.CharField(source='patient.patient_id',  read_only=True)
    hospital_name   = serializers.CharField(source='hospital.name',       read_only=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True, default=None)
    doctor_name     = serializers.CharField(source='doctor.full_name',    read_only=True, default=None)
    items    = InvoiceItemSerializer(many=True, read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)

    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'patient', 'patient_name', 'patient_code',
            'visit', 'hospital', 'hospital_name', 'status', 'status_display',
            'subtotal', 'discount', 'tax', 'total', 'amount_paid', 'balance_due',
            'notes', 'items', 'payments',
            'doctor', 'doctor_name',
            'created_by', 'created_by_name',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['subtotal', 'total', 'amount_paid', 'balance_due', 'created_at', 'updated_at']


class InvoiceCreateSerializer(serializers.ModelSerializer):
    items = InvoiceItemSerializer(many=True, write_only=True)

    class Meta:
        model = Invoice
        fields = [
            'id', 'invoice_number', 'patient', 'visit', 'hospital',
            'status', 'discount', 'tax', 'notes', 'doctor', 'items',
        ]

    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        invoice = Invoice.objects.create(**validated_data)
        for item in items_data:
            InvoiceItem.objects.create(invoice=invoice, **item)
        invoice.recalculate_totals()
        return invoice


class PaymentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Payment
        fields = ['id', 'invoice', 'amount', 'method', 'reference', 'notes']

    def create(self, validated_data):
        payment = Payment.objects.create(**validated_data)
        invoice = payment.invoice
        invoice.amount_paid = sum(p.amount for p in invoice.payments.all())
        invoice.balance_due = invoice.total - invoice.amount_paid
        if invoice.balance_due <= 0:
            invoice.status = 'paid'
        elif invoice.amount_paid > 0:
            invoice.status = 'partial'
        else:
            invoice.status = 'pending'
        invoice.save(update_fields=['amount_paid', 'balance_due', 'status'])
        return payment


# ═══════════════════════════════════════════════════════════
# STAFF LEAVE SERIALIZERS
# ═══════════════════════════════════════════════════════════

class StaffLeaveSerializer(serializers.ModelSerializer):
    staff_name       = serializers.CharField(source='staff.full_name',       read_only=True)
    staff_role       = serializers.CharField(source='staff.role.name',        read_only=True, default=None)
    hospital_name    = serializers.CharField(source='hospital.name',          read_only=True, default=None)
    approved_by_name = serializers.CharField(source='approved_by.full_name',  read_only=True, default=None)
    leave_type_display = serializers.CharField(source='get_leave_type_display', read_only=True)
    status_display     = serializers.CharField(source='get_status_display',     read_only=True)
    days               = serializers.IntegerField(read_only=True)

    class Meta:
        model  = StaffLeave
        fields = [
            'id', 'staff', 'staff_name', 'staff_role',
            'hospital', 'hospital_name',
            'leave_type', 'leave_type_display',
            'start_date', 'end_date', 'days',
            'reason', 'status', 'status_display',
            'approved_by', 'approved_by_name', 'rejection_reason',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['approved_by', 'status', 'rejection_reason', 'created_at', 'updated_at']


class StaffLeaveCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = StaffLeave
        fields = ['leave_type', 'start_date', 'end_date', 'reason']

    def validate(self, data):
        if data['end_date'] < data['start_date']:
            raise serializers.ValidationError({'end_date': 'End date must be on or after start date.'})
        return data


# ═══════════════════════════════════════════════════════════
# INSURANCE / NHIA SERIALIZERS
# ═══════════════════════════════════════════════════════════

class InsuranceClaimSerializer(serializers.ModelSerializer):
    patient_name     = serializers.CharField(source='patient.full_name',    read_only=True)
    patient_code     = serializers.CharField(source='patient.patient_id',   read_only=True)
    hospital_name    = serializers.CharField(source='hospital.name',         read_only=True)
    invoice_number   = serializers.CharField(source='invoice.invoice_number', read_only=True, default=None)
    created_by_name  = serializers.CharField(source='created_by.full_name',  read_only=True, default=None)
    scheme_display   = serializers.CharField(source='get_scheme_display',    read_only=True)
    status_display   = serializers.CharField(source='get_status_display',    read_only=True)

    class Meta:
        model  = InsuranceClaim
        fields = [
            'id', 'claim_number',
            'patient', 'patient_name', 'patient_code',
            'invoice', 'invoice_number',
            'hospital', 'hospital_name',
            'scheme', 'scheme_display',
            'provider_name', 'member_id',
            'claim_amount', 'approved_amount',
            'status', 'status_display',
            'submitted_at', 'notes', 'rejection_reason',
            'created_by', 'created_by_name',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['claim_number', 'created_at', 'updated_at', 'approved_amount', 'submitted_at']


class InsuranceClaimCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = InsuranceClaim
        fields = ['patient', 'invoice', 'hospital', 'scheme', 'provider_name', 'member_id', 'claim_amount', 'notes']
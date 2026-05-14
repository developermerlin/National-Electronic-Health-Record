from userauths.models import Profile, User, Role, Permission, RolePermission, Region, District, Chiefdom, Town, Hospital, Department, Patient, Message, Appointment, PatientVisit, VitalSigns, ClinicalNote, Notification, DoctorAvailability, DoctorUnavailableDate

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
        try:
            token['vendor_id'] = user.vendor.id
        except:
            token['vendor_id'] = 0

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

    class Meta:
        model = User
        fields = '__all__'
        extra_kwargs = {'password': {'write_only': True}}
    
    def get_permissions(self, obj):
        return obj.get_permissions()
    
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
    
    class Meta:
        model = User
        fields = ['email', 'full_name', 'phone', 'role', 'employee_id', 'hospital', 'department', 'district', 'password', 'is_active']
    
    def generate_employee_id(self):
        """Generate unique employee ID in format EMP-XXXXX"""
        while True:
            # Generate random 5-digit number
            random_num = ''.join(random.choices(string.digits, k=5))
            employee_id = f'EMP-{random_num}'
            
            # Check if already exists
            if not User.objects.filter(employee_id=employee_id).exists():
                return employee_id
    
    def create(self, validated_data):
        password = validated_data.pop('password')
        
        # Auto-generate employee_id if not provided
        if not validated_data.get('employee_id'):
            validated_data['employee_id'] = self.generate_employee_id()
        
        user = User.objects.create(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    employee_id = serializers.CharField(read_only=True)
    
    class Meta:
        model = User
        fields = ['full_name', 'phone', 'role', 'employee_id', 'hospital', 'department', 'district', 'is_active']


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
        ]
        extra_kwargs = {
            'code': {'required': False, 'allow_blank': True, 'allow_null': True},
            'facility_code': {'required': False, 'allow_blank': True, 'allow_null': True},
        }
    
    def validate(self, attrs):
        """Convert empty strings to None for fields with unique constraints"""
        # Fields that need empty string -> None conversion
        unique_fields = ['facility_code', 'code', 'license_number', 'dhis2_code', 'reporting_facility_code']
        
        for field in unique_fields:
            if field in attrs and attrs[field] == '':
                attrs[field] = None
        
        return attrs


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

    def get_has_portal_account(self, obj):
        return obj.user_id is not None

    class Meta:
        model = Patient
        fields = '__all__'
        read_only_fields = ['patient_id', 'created_at', 'updated_at']


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

    class Meta:
        model  = PatientVisit
        fields = [
            'id', 'visit_date', 'visit_type', 'visit_type_display',
            'chief_complaint', 'status', 'status_display',
            'hospital_name', 'department_name', 'doctor_name', 'registered_by_name',
            'discharge_date', 'referred_to_doctor',
            'has_vitals', 'has_clinical_note', 'diagnosis',
            'created_at',
        ]

    def get_hospital_name(self, obj):    return obj.hospital.name if obj.hospital else None
    def get_department_name(self, obj):  return obj.department.get_name_display() if obj.department else None
    def get_doctor_name(self, obj):      return obj.doctor.full_name if obj.doctor else None
    def get_registered_by_name(self, obj): return obj.registered_by.full_name if obj.registered_by else None
    def get_has_vitals(self, obj):       return hasattr(obj, 'vitals')
    def get_has_clinical_note(self, obj): return hasattr(obj, 'clinical_note')
    def get_diagnosis(self, obj):
        if hasattr(obj, 'clinical_note'):
            return obj.clinical_note.diagnosis
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
    clinical_note      = ClinicalNoteSerializer(read_only=True)
    referred_hospital_name = serializers.SerializerMethodField()

    class Meta:
        model  = PatientVisit
        fields = '__all__'

    def get_hospital_name(self, obj):        return obj.hospital.name if obj.hospital else None
    def get_department_name(self, obj):      return obj.department.get_name_display() if obj.department else None
    def get_doctor_name(self, obj):          return obj.doctor.full_name if obj.doctor else None
    def get_registered_by_name(self, obj):   return obj.registered_by.full_name if obj.registered_by else None
    def get_referred_hospital_name(self, obj): return obj.referred_to_hospital.name if obj.referred_to_hospital else None


class PatientVisitCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a new visit record."""
    class Meta:
        model  = PatientVisit
        fields = [
            'patient', 'appointment', 'hospital', 'department', 'doctor',
            'visit_type', 'chief_complaint', 'visit_date', 'status',
        ]

    def create(self, validated_data):
        request = self.context.get('request')
        validated_data['registered_by'] = request.user if request else None
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
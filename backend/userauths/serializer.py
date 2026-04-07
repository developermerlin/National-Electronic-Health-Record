from userauths.models import Profile, User, Role, Permission, RolePermission, Region, District, Hospital, Department

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
    
    class Meta:
        model = Role
        fields = ['id', 'name', 'description', 'created_at', 'updated_at', 'permissions', 'user_count']
    
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


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=True)
    is_active = serializers.BooleanField(default=False)
    
    class Meta:
        model = User
        fields = ['email', 'full_name', 'phone', 'role', 'employee_id', 'hospital', 'department', 'district', 'password', 'is_active']
    
    def create(self, validated_data):
        password = validated_data.pop('password')
        user = User.objects.create(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['full_name', 'phone', 'role', 'employee_id', 'hospital', 'department', 'district', 'is_active']


class RolePermissionAssignSerializer(serializers.Serializer):
    role_id = serializers.IntegerField()
    permission_ids = serializers.ListField(child=serializers.IntegerField())


# ============ Organization Serializers ============

class RegionSerializer(serializers.ModelSerializer):
    district_count = serializers.SerializerMethodField()
    hospital_count = serializers.SerializerMethodField()
    staff_count = serializers.SerializerMethodField()

    class Meta:
        model = Region
        fields = ['id', 'name', 'code', 'description', 'is_active', 'created_at', 'updated_at', 'district_count', 'hospital_count', 'staff_count']

    def get_district_count(self, obj):
        return obj.districts.count()

    def get_hospital_count(self, obj):
        return Hospital.objects.filter(district__region=obj).count()

    def get_staff_count(self, obj):
        return User.objects.filter(hospital__district__region=obj).count()


class DistrictSerializer(serializers.ModelSerializer):
    region_name = serializers.CharField(source='region.name', read_only=True)
    hospital_count = serializers.SerializerMethodField()
    staff_count = serializers.SerializerMethodField()

    class Meta:
        model = District
        fields = ['id', 'name', 'code', 'region', 'region_name', 'description', 'is_active', 'created_at', 'updated_at', 'hospital_count', 'staff_count']

    def get_hospital_count(self, obj):
        return obj.hospitals.count()

    def get_staff_count(self, obj):
        return User.objects.filter(hospital__district=obj).count()


class HospitalSerializer(serializers.ModelSerializer):
    district_name = serializers.CharField(source='district.name', read_only=True)
    region_name = serializers.CharField(source='district.region.name', read_only=True)
    hospital_type_display = serializers.CharField(source='get_hospital_type_display', read_only=True)
    department_count = serializers.SerializerMethodField()
    staff_count = serializers.SerializerMethodField()

    class Meta:
        model = Hospital
        fields = ['id', 'name', 'code', 'hospital_type', 'hospital_type_display', 'district', 'district_name', 'region_name',
                  'address', 'phone', 'email', 'bed_capacity', 'is_active', 'latitude', 'longitude',
                  'created_at', 'updated_at', 'department_count', 'staff_count']

    def get_department_count(self, obj):
        return obj.departments.count()

    def get_staff_count(self, obj):
        return obj.staff.count()


class DepartmentSerializer(serializers.ModelSerializer):
    hospital_name = serializers.CharField(source='hospital.name', read_only=True)
    name_display = serializers.CharField(source='get_name_display', read_only=True)
    staff_count = serializers.SerializerMethodField()

    class Meta:
        model = Department
        fields = ['id', 'name', 'name_display', 'hospital', 'hospital_name', 'head_of_department', 'phone', 'is_active', 'created_at', 'staff_count']

    def get_staff_count(self, obj):
        return obj.staff.count()


class HospitalCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Hospital
        fields = ['name', 'code', 'hospital_type', 'district', 'address', 'phone', 'email', 'bed_capacity', 'is_active', 'latitude', 'longitude']
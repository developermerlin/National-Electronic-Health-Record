"""
Serializers for Department Categories, Units, and Hospital Department Management
"""

from rest_framework import serializers
from userauths.models import (
    DepartmentCategory, 
    DepartmentUnit, 
    HospitalDepartment, 
    HospitalDepartmentUnitInstance,
    Hospital,
    User
)


class DepartmentCategorySerializer(serializers.ModelSerializer):
    """Serializer for Department Categories"""
    units_count = serializers.SerializerMethodField()
    
    class Meta:
        model = DepartmentCategory
        fields = [
            'id', 'name', 'display_name', 'description', 
            'is_active', 'created_at', 'updated_at', 'units_count'
        ]
        read_only_fields = ['created_at', 'updated_at']
    
    def get_units_count(self, obj):
        return obj.units.filter(is_active=True).count()


class DepartmentUnitSerializer(serializers.ModelSerializer):
    """Serializer for Department Units"""
    category_name = serializers.CharField(source='category.get_name_display', read_only=True)
    category_id = serializers.IntegerField(source='category.id', read_only=True)
    
    class Meta:
        model = DepartmentUnit
        fields = [
            'id', 'category', 'category_id', 'category_name', 'name', 'code', 
            'description', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['code', 'created_at', 'updated_at']


class DepartmentUnitListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing units"""
    category_name = serializers.CharField(source='category.get_name_display', read_only=True)
    
    class Meta:
        model = DepartmentUnit
        fields = ['id', 'name', 'code', 'category_name', 'is_active']


class HospitalDepartmentSerializer(serializers.ModelSerializer):
    """Serializer for Hospital Departments"""
    category_name = serializers.CharField(source='category.get_name_display', read_only=True)
    hospital_name = serializers.CharField(source='hospital.name', read_only=True)
    hospital_code = serializers.CharField(source='hospital.code', read_only=True)
    head_user_name = serializers.CharField(source='head_user.full_name', read_only=True, allow_null=True)
    created_by_name = serializers.CharField(source='created_by.full_name', read_only=True, allow_null=True)
    units_count = serializers.SerializerMethodField()
    
    class Meta:
        model = HospitalDepartment
        fields = [
            'id', 'hospital', 'hospital_name', 'hospital_code',
            'category', 'category_name', 'department_code',
            'head_of_department', 'head_user', 'head_user_name',
            'phone', 'email', 'location', 'status', 'is_active',
            'created_at', 'updated_at', 'created_by', 'created_by_name',
            'units_count'
        ]
        read_only_fields = ['department_code', 'created_at', 'updated_at']
    
    def get_units_count(self, obj):
        return obj.unit_instances.filter(is_active=True).count()


class HospitalDepartmentCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating Hospital Departments"""
    
    class Meta:
        model = HospitalDepartment
        fields = [
            'hospital', 'category', 'head_of_department', 'head_user',
            'phone', 'email', 'location', 'status', 'is_active'
        ]
    
    def create(self, validated_data):
        request = self.context.get('request')
        if request and request.user:
            validated_data['created_by'] = request.user
        return super().create(validated_data)


class HospitalDepartmentUnitInstanceSerializer(serializers.ModelSerializer):
    """Serializer for Hospital Department Unit Instances"""
    unit_name = serializers.CharField(source='unit.name', read_only=True)
    unit_category = serializers.CharField(source='unit.category.get_name_display', read_only=True)
    department_name = serializers.CharField(source='hospital_department.category.get_name_display', read_only=True)
    hospital_name = serializers.CharField(source='hospital_department.hospital.name', read_only=True)
    unit_head_user_name = serializers.CharField(source='unit_head_user.full_name', read_only=True, allow_null=True)
    
    class Meta:
        model = HospitalDepartmentUnitInstance
        fields = [
            'id', 'hospital_department', 'department_name', 'hospital_name',
            'unit', 'unit_name', 'unit_category', 'unit_code',
            'unit_head', 'unit_head_user', 'unit_head_user_name',
            'bed_capacity', 'staff_count', 'phone', 'location',
            'status', 'is_active', 'created_at', 'updated_at'
        ]
        read_only_fields = ['unit_code', 'created_at', 'updated_at']


class HospitalDepartmentDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for Hospital Department with all units"""
    category_name = serializers.CharField(source='category.get_name_display', read_only=True)
    hospital_name = serializers.CharField(source='hospital.name', read_only=True)
    head_user_name = serializers.CharField(source='head_user.full_name', read_only=True, allow_null=True)
    unit_instances = HospitalDepartmentUnitInstanceSerializer(many=True, read_only=True)
    available_units = serializers.SerializerMethodField()
    
    class Meta:
        model = HospitalDepartment
        fields = [
            'id', 'hospital', 'hospital_name', 'category', 'category_name',
            'department_code', 'head_of_department', 'head_user', 'head_user_name',
            'phone', 'email', 'location', 'status', 'is_active',
            'created_at', 'updated_at', 'unit_instances', 'available_units'
        ]
    
    def get_available_units(self, obj):
        """Get units that can be added to this department"""
        existing_unit_ids = obj.unit_instances.values_list('unit_id', flat=True)
        available = DepartmentUnit.objects.filter(
            category=obj.category,
            is_active=True
        ).exclude(id__in=existing_unit_ids)
        return DepartmentUnitListSerializer(available, many=True).data


class DepartmentCategoryWithUnitsSerializer(serializers.ModelSerializer):
    """Department Category with all its units"""
    units = DepartmentUnitListSerializer(many=True, read_only=True)
    
    class Meta:
        model = DepartmentCategory
        fields = ['id', 'name', 'display_name', 'description', 'is_active', 'units']

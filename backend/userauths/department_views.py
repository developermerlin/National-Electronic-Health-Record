"""
API Views for Department Categories, Units, and Hospital Department Management
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, Count
from django.shortcuts import get_object_or_404

from userauths.models import (
    DepartmentCategory,
    DepartmentUnit,
    HospitalDepartment,
    HospitalDepartmentUnitInstance,
    Hospital
)
from userauths.department_serializers import (
    DepartmentCategorySerializer,
    DepartmentUnitSerializer,
    DepartmentUnitListSerializer,
    HospitalDepartmentSerializer,
    HospitalDepartmentCreateSerializer,
    HospitalDepartmentDetailSerializer,
    HospitalDepartmentUnitInstanceSerializer,
    DepartmentCategoryWithUnitsSerializer
)


class DepartmentCategoryViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Department Categories
    Provides CRUD operations for department categories
    """
    queryset = DepartmentCategory.objects.all()
    serializer_class = DepartmentCategorySerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = DepartmentCategory.objects.all()
        
        # Filter by active status
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        # Search by name or description
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(display_name__icontains=search) |
                Q(description__icontains=search)
            )
        
        return queryset.order_by('name')
    
    @action(detail=True, methods=['get'])
    def units(self, request, pk=None):
        """Get all units for a specific category"""
        category = self.get_object()
        units = category.units.filter(is_active=True)
        serializer = DepartmentUnitListSerializer(units, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def with_units(self, request):
        """Get all categories with their units"""
        categories = self.get_queryset()
        serializer = DepartmentCategoryWithUnitsSerializer(categories, many=True)
        return Response(serializer.data)


class DepartmentUnitViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Department Units
    Provides CRUD operations for department units
    """
    queryset = DepartmentUnit.objects.all()
    serializer_class = DepartmentUnitSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = DepartmentUnit.objects.select_related('category').all()
        
        # Filter by category
        category_id = self.request.query_params.get('category')
        if category_id:
            queryset = queryset.filter(category_id=category_id)
        
        # Filter by active status
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        # Search by name
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) |
                Q(code__icontains=search) |
                Q(description__icontains=search)
            )
        
        return queryset.order_by('category__name', 'name')


class HospitalDepartmentViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Hospital Departments
    Manages departments within specific hospitals
    """
    queryset = HospitalDepartment.objects.all()
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return HospitalDepartmentCreateSerializer
        elif self.action == 'retrieve':
            return HospitalDepartmentDetailSerializer
        return HospitalDepartmentSerializer
    
    def get_queryset(self):
        queryset = HospitalDepartment.objects.select_related(
            'hospital', 'category', 'head_user', 'created_by'
        ).prefetch_related('unit_instances').all()
        
        user = self.request.user
        
        # Filter by hospital for hospital admins
        if user.role and user.role.name == 'hospital_admin' and user.hospital:
            queryset = queryset.filter(hospital=user.hospital)
        
        # Filter by hospital parameter
        hospital_id = self.request.query_params.get('hospital')
        if hospital_id:
            queryset = queryset.filter(hospital_id=hospital_id)
        
        # Filter by category
        category_id = self.request.query_params.get('category')
        if category_id:
            queryset = queryset.filter(category_id=category_id)
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filter by active status
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        # Search
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(department_code__icontains=search) |
                Q(category__display_name__icontains=search) |
                Q(hospital__name__icontains=search) |
                Q(head_of_department__icontains=search)
            )
        
        return queryset.order_by('hospital__name', 'category__name')
    
    @action(detail=True, methods=['post'])
    def add_unit(self, request, pk=None):
        """Add a unit to this hospital department"""
        department = self.get_object()
        unit_id = request.data.get('unit_id')
        
        if not unit_id:
            return Response(
                {'error': 'unit_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            unit = DepartmentUnit.objects.get(id=unit_id, category=department.category)
        except DepartmentUnit.DoesNotExist:
            return Response(
                {'error': 'Unit not found or does not belong to this department category'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if unit already exists
        if HospitalDepartmentUnitInstance.objects.filter(
            hospital_department=department,
            unit=unit
        ).exists():
            return Response(
                {'error': 'This unit already exists in the department'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create the unit instance
        unit_instance = HospitalDepartmentUnitInstance.objects.create(
            hospital_department=department,
            unit=unit,
            unit_head=request.data.get('unit_head', ''),
            unit_head_user_id=request.data.get('unit_head_user'),
            bed_capacity=request.data.get('bed_capacity', 0),
            staff_count=request.data.get('staff_count', 0),
            phone=request.data.get('phone', ''),
            location=request.data.get('location', ''),
            status=request.data.get('status', 'operational'),
            is_active=request.data.get('is_active', True)
        )
        
        serializer = HospitalDepartmentUnitInstanceSerializer(unit_instance)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['get'])
    def available_units(self, request, pk=None):
        """Get units that can be added to this department"""
        department = self.get_object()
        existing_unit_ids = department.unit_instances.values_list('unit_id', flat=True)
        
        available_units = DepartmentUnit.objects.filter(
            category=department.category,
            is_active=True
        ).exclude(id__in=existing_unit_ids)
        
        serializer = DepartmentUnitListSerializer(available_units, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def statistics(self, request, pk=None):
        """Get statistics for this department"""
        department = self.get_object()
        
        stats = {
            'total_units': department.unit_instances.count(),
            'active_units': department.unit_instances.filter(is_active=True).count(),
            'total_beds': department.unit_instances.aggregate(
                total=Count('bed_capacity')
            )['total'] or 0,
            'total_staff': department.unit_instances.aggregate(
                total=Count('staff_count')
            )['total'] or 0,
            'operational_units': department.unit_instances.filter(
                status='operational'
            ).count(),
        }
        
        return Response(stats)


class HospitalDepartmentUnitInstanceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Hospital Department Unit Instances
    Manages specific unit instances within hospital departments
    """
    queryset = HospitalDepartmentUnitInstance.objects.all()
    serializer_class = HospitalDepartmentUnitInstanceSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        queryset = HospitalDepartmentUnitInstance.objects.select_related(
            'hospital_department__hospital',
            'hospital_department__category',
            'unit__category',
            'unit_head_user'
        ).all()
        
        user = self.request.user
        
        # Filter by hospital for hospital admins
        if user.role and user.role.name == 'hospital_admin' and user.hospital:
            queryset = queryset.filter(hospital_department__hospital=user.hospital)
        
        # Filter by hospital
        hospital_id = self.request.query_params.get('hospital')
        if hospital_id:
            queryset = queryset.filter(hospital_department__hospital_id=hospital_id)
        
        # Filter by department
        department_id = self.request.query_params.get('department')
        if department_id:
            queryset = queryset.filter(hospital_department_id=department_id)
        
        # Filter by category
        category_id = self.request.query_params.get('category')
        if category_id:
            queryset = queryset.filter(unit__category_id=category_id)
        
        # Filter by status
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        # Filter by active status
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        # Search
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(unit_code__icontains=search) |
                Q(unit__name__icontains=search) |
                Q(unit_head__icontains=search) |
                Q(hospital_department__hospital__name__icontains=search)
            )
        
        return queryset.order_by(
            'hospital_department__hospital__name',
            'hospital_department__category__name',
            'unit__name'
        )

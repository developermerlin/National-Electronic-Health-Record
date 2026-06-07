"""
Medical Specialty Management Views
Provides CRUD operations for managing doctor specialties
"""

from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, Count
from userauths.models import MedicalSpecialty, Department
from userauths.serializer import (
    MedicalSpecialtySerializer,
    MedicalSpecialtyCreateSerializer,
    MedicalSpecialtyUpdateSerializer,
    SimpleMedicalSpecialtySerializer
)


class MedicalSpecialtyViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing medical specialties
    
    Permissions:
    - List/Retrieve: All authenticated users
    - Create/Update/Delete: Hospital Admin, Ministry Admin, System Admin
    
    Features:
    - Full CRUD operations
    - Search by name
    - Filter by category, department, active status
    - Get doctors count per specialty
    """
    permission_classes = [IsAuthenticated]
    queryset = MedicalSpecialty.objects.all()
    
    def get_serializer_class(self):
        if self.action == 'create':
            return MedicalSpecialtyCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return MedicalSpecialtyUpdateSerializer
        elif self.action == 'list_simple':
            return SimpleMedicalSpecialtySerializer
        return MedicalSpecialtySerializer
    
    def get_queryset(self):
        queryset = MedicalSpecialty.objects.all()
        
        # Search by name
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | 
                Q(description__icontains=search)
            )
        
        # Filter by category
        category = self.request.query_params.get('category', None)
        if category:
            queryset = queryset.filter(category=category)
        
        # Filter by department
        department_id = self.request.query_params.get('department', None)
        if department_id:
            queryset = queryset.filter(department_id=department_id)
        
        # Filter by active status
        is_active = self.request.query_params.get('is_active', None)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        # Annotate with doctors count
        queryset = queryset.annotate(doctor_count=Count('doctors'))
        
        return queryset.order_by('category', 'name')
    
    def perform_create(self, serializer):
        """Set created_by to current user"""
        serializer.save(created_by=self.request.user)
    
    def create(self, request, *args, **kwargs):
        """Only admins can create specialties"""
        if not (request.user.role and request.user.role.name in ['admin', 'hospital_admin', 'ministry_admin']):
            return Response(
                {'error': 'Only administrators can create specialties'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().create(request, *args, **kwargs)
    
    def update(self, request, *args, **kwargs):
        """Only admins can update specialties"""
        if not (request.user.role and request.user.role.name in ['admin', 'hospital_admin', 'ministry_admin']):
            return Response(
                {'error': 'Only administrators can update specialties'},
                status=status.HTTP_403_FORBIDDEN
            )
        return super().update(request, *args, **kwargs)
    
    def destroy(self, request, *args, **kwargs):
        """Only admins can delete specialties"""
        if not (request.user.role and request.user.role.name in ['admin', 'hospital_admin', 'ministry_admin']):
            return Response(
                {'error': 'Only administrators can delete specialties'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        specialty = self.get_object()
        
        # Check if specialty has doctors assigned
        if specialty.doctors.exists():
            return Response(
                {
                    'error': 'Cannot delete specialty with assigned doctors',
                    'doctors_count': specialty.doctors.count()
                },
                status=status.HTTP_400_BAD_REQUEST
            )
        
        return super().destroy(request, *args, **kwargs)
    
    @action(detail=False, methods=['get'])
    def list_simple(self, request):
        """
        Get simplified list of active specialties for dropdowns
        GET /specialties/list_simple/
        """
        queryset = self.get_queryset().filter(is_active=True)
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def by_category(self, request):
        """
        Get specialties grouped by category
        GET /specialties/by_category/
        """
        categories = MedicalSpecialty.CATEGORY_CHOICES
        result = {}
        
        for category_key, category_label in categories:
            specialties = self.get_queryset().filter(category=category_key, is_active=True)
            result[category_key] = {
                'label': category_label,
                'specialties': SimpleMedicalSpecialtySerializer(specialties, many=True).data
            }
        
        return Response(result)
    
    @action(detail=True, methods=['get'])
    def doctors(self, request, pk=None):
        """
        Get all doctors with this specialty
        GET /specialties/{id}/doctors/
        """
        specialty = self.get_object()
        doctors = specialty.doctors.filter(is_active=True).select_related('hospital', 'department', 'role')
        
        doctors_data = []
        for doctor in doctors:
            doctors_data.append({
                'id': doctor.id,
                'full_name': doctor.full_name,
                'email': doctor.email,
                'employee_id': doctor.employee_id,
                'hospital_name': doctor.hospital.name if doctor.hospital else None,
                'department_name': doctor.department.name if doctor.department else None,
            })
        
        return Response({
            'specialty': MedicalSpecialtySerializer(specialty).data,
            'doctors': doctors_data,
            'count': len(doctors_data)
        })
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """
        Get specialty statistics
        GET /specialties/statistics/
        """
        total_specialties = MedicalSpecialty.objects.count()
        active_specialties = MedicalSpecialty.objects.filter(is_active=True).count()
        
        # Count by category
        category_stats = {}
        for category_key, category_label in MedicalSpecialty.CATEGORY_CHOICES:
            count = MedicalSpecialty.objects.filter(category=category_key, is_active=True).count()
            category_stats[category_key] = {
                'label': category_label,
                'count': count
            }
        
        # Top specialties by doctor count
        top_specialties = MedicalSpecialty.objects.annotate(
            doctor_count=Count('doctors')
        ).filter(is_active=True).order_by('-doctor_count')[:10]
        
        return Response({
            'total_specialties': total_specialties,
            'active_specialties': active_specialties,
            'inactive_specialties': total_specialties - active_specialties,
            'category_breakdown': category_stats,
            'top_specialties': MedicalSpecialtySerializer(top_specialties, many=True).data
        })
    
    @action(detail=False, methods=['post'])
    def bulk_create(self, request):
        """
        Bulk create specialties
        POST /specialties/bulk_create/
        Body: { "specialties": [{"name": "...", "category": "...", ...}, ...] }
        """
        if not (request.user.role and request.user.role.name in ['admin', 'hospital_admin', 'ministry_admin']):
            return Response(
                {'error': 'Only administrators can bulk create specialties'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        specialties_data = request.data.get('specialties', [])
        
        if not specialties_data:
            return Response(
                {'error': 'No specialties provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        created = []
        errors = []
        
        for spec_data in specialties_data:
            serializer = MedicalSpecialtyCreateSerializer(data=spec_data)
            if serializer.is_valid():
                specialty = serializer.save(created_by=request.user)
                created.append(MedicalSpecialtySerializer(specialty).data)
            else:
                errors.append({
                    'data': spec_data,
                    'errors': serializer.errors
                })
        
        return Response({
            'created': created,
            'created_count': len(created),
            'errors': errors,
            'error_count': len(errors)
        }, status=status.HTTP_201_CREATED if created else status.HTTP_400_BAD_REQUEST)

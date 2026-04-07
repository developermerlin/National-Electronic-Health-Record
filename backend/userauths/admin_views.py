from rest_framework import generics, status, viewsets
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db.models import Q, Count
from userauths.models import User, Role, Permission, RolePermission, Region, District, Hospital, Department
from userauths.serializer import (
    UserSerializer, UserCreateSerializer, UserUpdateSerializer,
    RoleSerializer, SimplePermissionSerializer, RolePermissionAssignSerializer,
    RegionSerializer, DistrictSerializer, HospitalSerializer, HospitalCreateSerializer,
    DepartmentSerializer, ProfileSerializer
)
from userauths.models import Profile


class UserManagementViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing users in the admin dashboard.
    Provides CRUD operations for user management.
    """
    queryset = User.objects.all().select_related('role').order_by('-date_joined')
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        return UserSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by role
        role = self.request.query_params.get('role', None)
        if role:
            queryset = queryset.filter(role__name=role)
        
        # Filter by active status
        is_active = self.request.query_params.get('is_active', None)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        
        # Search by name, email, or employee_id
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(full_name__icontains=search) |
                Q(email__icontains=search) |
                Q(employee_id__icontains=search)
            )
        
        return queryset
    
    def create(self, request, *args, **kwargs):
        """Create a new user account"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Set the created_by field to the current user
        user = serializer.save(created_by=request.user)
        
        return Response({
            'message': 'User created successfully',
            'user': UserSerializer(user).data
        }, status=status.HTTP_201_CREATED)
    
    def update(self, request, *args, **kwargs):
        """Update user information"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        return Response({
            'message': 'User updated successfully',
            'user': UserSerializer(instance).data
        })
    
    def destroy(self, request, *args, **kwargs):
        """Soft delete user by setting is_active to False"""
        instance = self.get_object()
        instance.is_active = False
        instance.save()
        
        return Response({
            'message': 'User deactivated successfully'
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def activate(self, request, pk=None):
        """Activate a deactivated user"""
        user = self.get_object()
        user.is_active = True
        user.save()
        
        return Response({
            'message': 'User activated successfully',
            'user': UserSerializer(user).data
        })
    
    @action(detail=True, methods=['post'])
    def reset_password(self, request, pk=None):
        """Reset user password"""
        user = self.get_object()
        new_password = request.data.get('password')
        
        if not new_password:
            return Response({
                'error': 'Password is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        user.set_password(new_password)
        user.save()
        
        return Response({
            'message': 'Password reset successfully'
        })
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get user statistics for dashboard"""
        total_users = User.objects.count()
        active_users = User.objects.filter(is_active=True).count()
        inactive_users = User.objects.filter(is_active=False).count()
        
        # Count by role
        roles_stats = []
        for role in Role.objects.all():
            roles_stats.append({
                'role': role.name,
                'role_display': str(role),
                'count': role.users.count(),
                'active_count': role.users.filter(is_active=True).count()
            })
        
        return Response({
            'total_users': total_users,
            'active_users': active_users,
            'inactive_users': inactive_users,
            'roles_statistics': roles_stats
        })


class RoleManagementViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing roles and their permissions.
    """
    queryset = Role.objects.all().order_by('name')
    serializer_class = RoleSerializer
    permission_classes = [IsAuthenticated]
    
    @action(detail=True, methods=['post'])
    def assign_permissions(self, request, pk=None):
        """Assign permissions to a role"""
        role = self.get_object()
        permission_ids = request.data.get('permission_ids', [])
        
        # Clear existing permissions
        RolePermission.objects.filter(role=role).delete()
        
        # Add new permissions
        for permission_id in permission_ids:
            try:
                permission = Permission.objects.get(id=permission_id)
                RolePermission.objects.create(role=role, permission=permission)
            except Permission.DoesNotExist:
                pass
        
        return Response({
            'message': 'Permissions assigned successfully',
            'role': RoleSerializer(role).data
        })
    
    @action(detail=True, methods=['get'])
    def users(self, request, pk=None):
        """Get all users with this role"""
        role = self.get_object()
        users = role.users.all()
        
        return Response({
            'role': str(role),
            'users': UserSerializer(users, many=True).data
        })


class PermissionListView(generics.ListAPIView):
    """
    List all available permissions in the system.
    """
    queryset = Permission.objects.all().order_by('name')
    serializer_class = SimplePermissionSerializer
    permission_classes = [IsAuthenticated]


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_overview(request):
    """
    Get comprehensive dashboard overview data.
    """
    user = request.user
    
    # Check if user has admin privileges
    if not user.role or user.role.name not in ['admin', 'ministry_admin']:
        return Response({
            'error': 'Unauthorized. Admin access required.'
        }, status=status.HTTP_403_FORBIDDEN)
    
    # Get statistics
    total_users = User.objects.count()
    active_users = User.objects.filter(is_active=True).count()
    total_roles = Role.objects.count()
    
    # Recent users (last 10)
    recent_users = User.objects.all().order_by('-date_joined')[:10]
    
    # Users by role
    role_distribution = []
    for role in Role.objects.all():
        role_distribution.append({
            'role': role.name,
            'role_display': str(role),
            'count': role.users.count()
        })
    
    return Response({
        'overview': {
            'total_users': total_users,
            'active_users': active_users,
            'inactive_users': total_users - active_users,
            'total_roles': total_roles
        },
        'recent_users': UserSerializer(recent_users, many=True).data,
        'role_distribution': role_distribution
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_user_action(request):
    """
    Perform bulk actions on multiple users.
    Actions: activate, deactivate, delete
    """
    user_ids = request.data.get('user_ids', [])
    action = request.data.get('action', '')
    
    if not user_ids or not action:
        return Response({
            'error': 'user_ids and action are required'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    users = User.objects.filter(id__in=user_ids)
    
    if action == 'activate':
        users.update(is_active=True)
        message = f'{users.count()} users activated successfully'
    elif action == 'deactivate':
        users.update(is_active=False)
        message = f'{users.count()} users deactivated successfully'
    elif action == 'delete':
        count = users.count()
        users.delete()
        message = f'{count} users deleted successfully'
    else:
        return Response({
            'error': 'Invalid action. Use: activate, deactivate, or delete'
        }, status=status.HTTP_400_BAD_REQUEST)
    
    return Response({
        'message': message
    })


# ============ Organization ViewSets ============

class RegionViewSet(viewsets.ModelViewSet):
    """CRUD for Regions (Ministry level management)"""
    queryset = Region.objects.all().order_by('name')
    serializer_class = RegionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(Q(name__icontains=search) | Q(code__icontains=search))
        is_active = self.request.query_params.get('is_active', None)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        return queryset


class DistrictViewSet(viewsets.ModelViewSet):
    """CRUD for Districts"""
    queryset = District.objects.all().select_related('region').order_by('region__name', 'name')
    serializer_class = DistrictSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        region = self.request.query_params.get('region', None)
        if region:
            queryset = queryset.filter(region_id=region)
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(Q(name__icontains=search) | Q(code__icontains=search))
        is_active = self.request.query_params.get('is_active', None)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        return queryset


class HospitalViewSet(viewsets.ModelViewSet):
    """CRUD for Hospitals"""
    queryset = Hospital.objects.all().select_related('district', 'district__region').order_by('name')
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return HospitalCreateSerializer
        return HospitalSerializer

    def get_queryset(self):
        queryset = super().get_queryset()
        district = self.request.query_params.get('district', None)
        if district:
            queryset = queryset.filter(district_id=district)
        region = self.request.query_params.get('region', None)
        if region:
            queryset = queryset.filter(district__region_id=region)
        hospital_type = self.request.query_params.get('type', None)
        if hospital_type:
            queryset = queryset.filter(hospital_type=hospital_type)
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(Q(name__icontains=search) | Q(code__icontains=search))
        is_active = self.request.query_params.get('is_active', None)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        return queryset

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        hospital = serializer.save()
        return Response({
            'message': 'Hospital created successfully',
            'hospital': HospitalSerializer(hospital).data
        }, status=status.HTTP_201_CREATED)


class DepartmentViewSet(viewsets.ModelViewSet):
    """CRUD for Departments within hospitals"""
    queryset = Department.objects.all().select_related('hospital', 'hospital__district').order_by('hospital__name', 'name')
    serializer_class = DepartmentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        hospital = self.request.query_params.get('hospital', None)
        if hospital:
            queryset = queryset.filter(hospital_id=hospital)
        is_active = self.request.query_params.get('is_active', None)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        return queryset


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ministry_dashboard(request):
    """
    National-level dashboard for Ministry administrators.
    Shows aggregate stats across all regions, districts, and hospitals.
    """
    total_regions = Region.objects.filter(is_active=True).count()
    total_districts = District.objects.filter(is_active=True).count()
    total_hospitals = Hospital.objects.filter(is_active=True).count()
    total_departments = Department.objects.filter(is_active=True).count()
    total_staff = User.objects.filter(is_active=True).exclude(role__name='patient').count()
    total_users = User.objects.count()

    # Hospitals by type
    hospitals_by_type = list(
        Hospital.objects.filter(is_active=True)
        .values('hospital_type')
        .annotate(count=Count('id'))
        .order_by('-count')
    )

    # Staff by region
    staff_by_region = []
    for region in Region.objects.filter(is_active=True):
        staff_count = User.objects.filter(hospital__district__region=region, is_active=True).count()
        hospital_count = Hospital.objects.filter(district__region=region, is_active=True).count()
        staff_by_region.append({
            'region': region.name,
            'region_id': region.id,
            'staff_count': staff_count,
            'hospital_count': hospital_count,
            'district_count': region.districts.filter(is_active=True).count()
        })

    # Recent hospitals
    recent_hospitals = Hospital.objects.filter(is_active=True).order_by('-created_at')[:5]

    return Response({
        'overview': {
            'total_regions': total_regions,
            'total_districts': total_districts,
            'total_hospitals': total_hospitals,
            'total_departments': total_departments,
            'total_staff': total_staff,
            'total_users': total_users,
        },
        'hospitals_by_type': hospitals_by_type,
        'staff_by_region': staff_by_region,
        'recent_hospitals': HospitalSerializer(recent_hospitals, many=True).data,
    })


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def my_profile(request):
    """Get or update the currently logged-in user's profile."""
    user = request.user
    profile, _ = Profile.objects.get_or_create(user=user)

    if request.method == 'GET':
        return Response({
            'user': {
                'id': user.id,
                'email': user.email,
                'full_name': user.full_name,
                'phone': user.phone,
                'role': user.role.name if user.role else None,
                'role_display': str(user.role) if user.role else None,
                'employee_id': user.employee_id,
                'hospital': str(user.hospital) if user.hospital else None,
                'department': str(user.department) if user.department else None,
                'district': str(user.district) if user.district else None,
                'date_joined': user.date_joined,
                'last_login': user.last_login,
                'is_active': user.is_active,
            },
            'profile': {
                'image': profile.image.url if profile.image else None,
                'about': profile.about,
                'gender': profile.gender,
                'country': profile.country,
                'city': profile.city,
                'state': profile.state,
                'address': profile.address,
                'pid': profile.pid,
            }
        })

    elif request.method == 'PUT':
        data = request.data

        # Update user fields
        if 'full_name' in data:
            user.full_name = data['full_name']
        if 'phone' in data:
            user.phone = data['phone']

        # Update password if provided
        if 'current_password' in data and 'new_password' in data:
            if not user.check_password(data['current_password']):
                return Response({'error': 'Current password is incorrect'}, status=status.HTTP_400_BAD_REQUEST)
            user.set_password(data['new_password'])

        user.save()

        # Update profile fields
        if 'about' in data:
            profile.about = data['about']
        if 'gender' in data:
            profile.gender = data['gender']
        if 'country' in data:
            profile.country = data['country']
        if 'city' in data:
            profile.city = data['city']
        if 'state' in data:
            profile.state = data['state']
        if 'address' in data:
            profile.address = data['address']

        profile.save()

        return Response({'message': 'Profile updated successfully'})

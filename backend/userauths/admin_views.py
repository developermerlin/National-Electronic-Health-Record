from rest_framework import generics, status, viewsets
from rest_framework.decorators import api_view, permission_classes, action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db.models import Q, Count, Sum, Avg, F
from django.db.models.functions import TruncMonth, TruncDate
from django.utils import timezone
from datetime import timedelta
from userauths.models import User, Role, Permission, RolePermission, Region, District, Chiefdom, Town, Hospital, Department, Patient, PatientVisit, Appointment, Message, AuditLog, InpatientAdmission, Invoice
from userauths.serializer import (
    UserSerializer, UserCreateSerializer, UserUpdateSerializer,
    RoleSerializer, SimplePermissionSerializer, RolePermissionAssignSerializer,
    RegionSerializer, DistrictSerializer, ChiefdomSerializer, TownSerializer,
    HospitalSerializer, HospitalCreateSerializer,
    DepartmentSerializer, ProfileSerializer
)
from userauths.models import Profile


class AdminWriteMixin:
    """
    Mixin that restricts create/update/destroy to admin and ministry_admin.
    All authenticated users can list/retrieve.
    """
    def _require_admin(self, request):
        role = request.user.role.name if request.user.role else None
        if role not in ('admin', 'ministry_admin'):
            return Response(
                {'error': 'Only system administrators can modify this data.'},
                status=status.HTTP_403_FORBIDDEN
            )
        return None

    def create(self, request, *args, **kwargs):
        err = self._require_admin(request)
        if err: return err
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        err = self._require_admin(request)
        if err: return err
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        err = self._require_admin(request)
        if err: return err
        return super().destroy(request, *args, **kwargs)


class UserManagementViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing users in the admin dashboard.
    Provides CRUD operations for user management.
    """
    queryset = User.objects.all().select_related('role').order_by('-date_joined')
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return UserCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return UserUpdateSerializer
        return UserSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        user = self.request.user
        user_role = user.role.name if user.role else None
        
        # Hospital admins can only see users at their hospital
        if user_role == 'hospital_admin':
            if user.hospital:
                queryset = queryset.filter(hospital=user.hospital)
            else:
                # If hospital admin has no hospital assigned, show no users
                queryset = queryset.none()
        
        # District admins can only see users in their district
        if user_role == 'district_admin':
            if user.district:
                queryset = queryset.filter(
                    Q(hospital__district=user.district) | Q(district=user.district)
                )
            else:
                queryset = queryset.none()
        
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
        """Create a new user account. Only admin, ministry_admin, and hospital_admin can create users."""
        user = request.user
        role = user.role.name if user.role else None
        
        # Only specific roles can create users
        allowed_roles = ['admin', 'ministry_admin', 'hospital_admin']
        if role not in allowed_roles:
            return Response(
                {'error': 'You do not have permission to create users.'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Hospital admins can only create staff for their own hospital
        if role == 'hospital_admin':
            target_hospital_id = request.data.get('hospital')
            if not user.hospital or str(target_hospital_id) != str(user.hospital.id):
                return Response(
                    {'error': 'You can only create users for your assigned hospital.'},
                    status=status.HTTP_403_FORBIDDEN
                )
            # Hospital admins cannot create ministry_admin, district_admin, or admin
            target_role_id = request.data.get('role')
            if target_role_id:
                from userauths.models import Role
                try:
                    target_role = Role.objects.get(id=target_role_id)
                    if target_role.name in ['admin', 'ministry_admin', 'district_admin']:
                        return Response(
                            {'error': 'You cannot create administrator accounts.'},
                            status=status.HTTP_403_FORBIDDEN
                        )
                except Role.DoesNotExist:
                    pass
        
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Set the created_by field to the current user
        new_user = serializer.save(created_by=request.user)
        
        return Response({
            'message': 'User created successfully',
            'user': UserSerializer(new_user).data
        }, status=status.HTTP_201_CREATED)
    
    def update(self, request, *args, **kwargs):
        """Update user information including profile fields"""
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        user = request.user
        user_role = user.role.name if user.role else None

        # Hospital admins cannot change users to admin roles
        if user_role == 'hospital_admin':
            target_role_id = request.data.get('role')
            if target_role_id:
                from userauths.models import Role
                try:
                    target_role = Role.objects.get(id=target_role_id)
                    if target_role.name in ['admin', 'ministry_admin', 'district_admin']:
                        return Response(
                            {'error': 'You cannot assign administrator roles.'},
                            status=status.HTTP_403_FORBIDDEN
                        )
                except Role.DoesNotExist:
                    pass
            # Hospital admins cannot reassign users to other hospitals
            target_hospital_id = request.data.get('hospital')
            if target_hospital_id and user.hospital and str(target_hospital_id) != str(user.hospital.id):
                return Response(
                    {'error': 'You can only assign users to your assigned hospital.'},
                    status=status.HTTP_403_FORBIDDEN
                )

        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        # Also update profile fields if present
        PROFILE_TEXT_FIELDS = [
            'date_of_birth', 'gender', 'nationality', 'nin_number', 'marital_status',
            'address', 'city', 'state', 'country',
            'qualification', 'specialization', 'license_number', 'years_of_experience',
            'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship',
        ]
        profile, _ = Profile.objects.get_or_create(user=instance)
        updated = False
        for field in PROFILE_TEXT_FIELDS:
            if field in request.data:
                val = request.data[field]
                if val not in ('', None):
                    setattr(profile, field, val)
                    updated = True
        if 'profile_photo' in request.FILES:
            profile.image = request.FILES['profile_photo']
            updated = True
        if 'certificate' in request.FILES:
            profile.certificate = request.FILES['certificate']
            updated = True
        if 'license_document' in request.FILES:
            profile.license_document = request.FILES['license_document']
            updated = True
        if 'cv' in request.FILES:
            profile.cv = request.FILES['cv']
            updated = True
        if updated:
            profile.save()

        return Response({
            'message': 'User updated successfully',
            'user': UserSerializer(instance).data
        })
    
    def destroy(self, request, *args, **kwargs):
        """Soft delete user by setting is_active to False"""
        user = request.user
        user_role = user.role.name if user.role else None
        instance = self.get_object()

        # Hospital admins cannot deactivate admins or other hospital_admins
        if user_role == 'hospital_admin':
            protected = ['admin', 'ministry_admin', 'district_admin', 'hospital_admin']
            if instance.role and instance.role.name in protected:
                return Response(
                    {'error': 'You cannot deactivate administrator accounts.'},
                    status=status.HTTP_403_FORBIDDEN
                )
            if instance.id == user.id:
                return Response(
                    {'error': 'You cannot deactivate your own account.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        instance.is_active = False
        instance.save()
        return Response({'message': 'User deactivated successfully'}, status=status.HTTP_200_OK)
    
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

    @action(detail=True, methods=['delete'])
    def permanent_delete(self, request, pk=None):
        """Permanently delete user from system - Admin or Hospital Admin"""
        user = request.user
        user_role = user.role.name if user.role else None

        if user_role not in ('admin', 'hospital_admin'):
            return Response(
                {'error': 'You do not have permission to permanently delete users.'},
                status=status.HTTP_403_FORBIDDEN
            )

        instance = self.get_object()
        user_name = instance.full_name or instance.email

        # Prevent self-deletion
        if instance.id == user.id:
            return Response(
                {'error': 'You cannot delete your own account.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Hospital admins cannot delete protected roles
        protected = ['admin', 'ministry_admin', 'district_admin', 'hospital_admin']
        if user_role == 'hospital_admin' and instance.role and instance.role.name in protected:
            return Response(
                {'error': 'You cannot delete administrator accounts.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # System admins cannot delete other system admins
        if user_role == 'admin' and instance.role and instance.role.name == 'admin':
            return Response(
                {'error': 'Cannot delete system administrator accounts.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        instance.delete()
        
        return Response({
            'message': f'User "{user_name}" has been permanently deleted.',
            'deleted': True
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['get'])
    def profile(self, request, pk=None):
        """Get profile data for a specific user (used when opening edit modal)"""
        user = self.get_object()
        profile, _ = Profile.objects.get_or_create(user=user)
        return Response({
            'image': request.build_absolute_uri(profile.image.url) if profile.image else None,
            'gender': profile.gender,
            'date_of_birth': profile.date_of_birth,
            'nationality': profile.nationality,
            'nin_number': profile.nin_number,
            'marital_status': profile.marital_status,
            'address': profile.address,
            'city': profile.city,
            'state': profile.state,
            'country': profile.country,
            'qualification': profile.qualification,
            'specialization': profile.specialization,
            'license_number': profile.license_number,
            'years_of_experience': profile.years_of_experience,
            'emergency_contact_name': profile.emergency_contact_name,
            'emergency_contact_phone': profile.emergency_contact_phone,
            'emergency_contact_relationship': profile.emergency_contact_relationship,
            'certificate': request.build_absolute_uri(profile.certificate.url) if profile.certificate else None,
            'license_document': request.build_absolute_uri(profile.license_document.url) if profile.license_document else None,
            'cv': request.build_absolute_uri(profile.cv.url) if profile.cv else None,
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
    Only system administrators (admin, ministry_admin) can modify roles.
    All authenticated users can read roles.
    """
    queryset = Role.objects.all().order_by('name')
    serializer_class = RoleSerializer

    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [IsAuthenticated()]
        return [IsAuthenticated()]  # write actions need extra check below

    def check_admin(self, request):
        role = request.user.role.name if request.user.role else None
        if role not in ('admin', 'ministry_admin'):
            return Response(
                {'error': 'Only system administrators can modify roles and permissions.'},
                status=status.HTTP_403_FORBIDDEN
            )
        return None

    def create(self, request, *args, **kwargs):
        err = self.check_admin(request)
        if err: return err
        return super().create(request, *args, **kwargs)

    def update(self, request, *args, **kwargs):
        err = self.check_admin(request)
        if err: return err
        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        err = self.check_admin(request)
        if err: return err
        return super().destroy(request, *args, **kwargs)
    
    @action(detail=True, methods=['post'])
    def assign_permissions(self, request, pk=None):
        """Assign permissions to a role"""
        err = self.check_admin(request)
        if err: return err
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
    import traceback
    user = request.user

    # Check if user has admin privileges
    if not user.role or user.role.name not in ['admin', 'ministry_admin']:
        return Response({
            'error': 'Unauthorized. Admin access required.'
        }, status=status.HTTP_403_FORBIDDEN)

    try:
        now = timezone.now()
        today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
        week_ago = now - timedelta(days=7)
        month_ago = now - timedelta(days=30)

        # ── Users ──
        total_users = User.objects.count()
        active_users = User.objects.filter(is_active=True).count()
        total_roles = Role.objects.count()
        new_users_today = User.objects.filter(date_joined__gte=today_start).count()
        new_users_week = User.objects.filter(date_joined__gte=week_ago).count()

        # ── Organization ──
        total_regions    = Region.objects.count()
        total_districts  = District.objects.count()
        total_chiefdoms  = Chiefdom.objects.count()
        total_towns      = Town.objects.count()
        total_hospitals  = Hospital.objects.count()
        active_hospitals = Hospital.objects.filter(is_active=True).count()
        total_departments = Department.objects.count()

        # ── Patients ──
        total_patients  = Patient.objects.count()
        active_patients = Patient.objects.filter(status='active').count()
        patients_today  = Patient.objects.filter(created_at__gte=today_start).count()
        patients_week   = Patient.objects.filter(created_at__gte=week_ago).count()
        patients_month  = Patient.objects.filter(created_at__gte=month_ago).count()

        # ── Appointments ──
        total_appointments     = Appointment.objects.count()
        pending_appointments   = Appointment.objects.filter(status='pending').count()
        confirmed_appointments = Appointment.objects.filter(status='scheduled').count()
        completed_appointments = Appointment.objects.filter(status='completed').count()
        cancelled_appointments = Appointment.objects.filter(status__in=['cancelled', 'declined']).count()
        appointments_today     = Appointment.objects.filter(scheduled_at__date=now.date()).count()

        # ── Visits ──
        total_visits     = PatientVisit.objects.count()
        visits_today     = PatientVisit.objects.filter(visit_date__gte=today_start).count()
        visits_this_week = PatientVisit.objects.filter(visit_date__gte=week_ago).count()
        active_visits    = PatientVisit.objects.filter(status__in=['registered', 'triaged', 'waiting', 'in_progress']).count()
        completed_visits = PatientVisit.objects.filter(status='completed').count()

        # ── Messages ──
        total_messages  = Message.objects.count()
        unread_messages = Message.objects.filter(is_read=False).count()

        # ── Audit ──
        audit_today = AuditLog.objects.filter(created_at__gte=today_start).count()
        audit_week  = AuditLog.objects.filter(created_at__gte=week_ago).count()

    except Exception as e:
        error_details = traceback.format_exc()
        print(f"DASHBOARD ERROR: {str(e)}")
        print(f"TRACEBACK: {error_details}")
        return Response({
            'error': f'Database query failed: {str(e)}',
            'traceback': error_details
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

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
            'total_roles': total_roles,
            'new_users_today': new_users_today,
            'new_users_week': new_users_week,
        },
        'organization': {
            'total_regions': total_regions,
            'total_districts': total_districts,
            'total_chiefdoms': total_chiefdoms,
            'total_towns': total_towns,
            'total_hospitals': total_hospitals,
            'active_hospitals': active_hospitals,
            'total_departments': total_departments,
        },
        'patients': {
            'total_patients': total_patients,
            'active_patients': active_patients,
            'patients_today': patients_today,
            'patients_week': patients_week,
            'patients_month': patients_month,
        },
        'appointments': {
            'total_appointments': total_appointments,
            'pending_appointments': pending_appointments,
            'confirmed_appointments': confirmed_appointments,
            'completed_appointments': completed_appointments,
            'cancelled_appointments': cancelled_appointments,
            'appointments_today': appointments_today,
        },
        'visits': {
            'total_visits': total_visits,
            'visits_today': visits_today,
            'visits_this_week': visits_this_week,
            'active_visits': active_visits,
            'completed_visits': completed_visits,
        },
        'communications': {
            'total_messages': total_messages,
            'unread_messages': unread_messages,
        },
        'audit': {
            'audit_today': audit_today,
            'audit_week': audit_week,
        },
        'recent_users': UserSerializer(recent_users, many=True).data,
        'role_distribution': role_distribution,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def bulk_user_action(request):
    """
    Perform bulk actions on multiple users.
    Actions: activate, deactivate, delete
    Only admin, ministry_admin, and hospital_admin can use this.
    """
    user = request.user
    role = user.role.name if user.role else None

    if role not in ('admin', 'ministry_admin', 'hospital_admin'):
        return Response(
            {'error': 'You do not have permission to perform bulk actions.'},
            status=status.HTTP_403_FORBIDDEN
        )

    user_ids = request.data.get('user_ids', [])
    action = request.data.get('action', '')
    
    if not user_ids or not action:
        return Response({
            'error': 'user_ids and action are required'
        }, status=status.HTTP_400_BAD_REQUEST)

    # Hospital admin can only act on users at their own hospital
    users = User.objects.filter(id__in=user_ids)
    if role == 'hospital_admin' and user.hospital:
        users = users.filter(hospital=user.hospital)
    elif role == 'hospital_admin' and not user.hospital:
        return Response(
            {'error': 'No hospital assigned to your account.'},
            status=status.HTTP_403_FORBIDDEN
        )
    
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

class RegionViewSet(AdminWriteMixin, viewsets.ModelViewSet):
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


class DistrictViewSet(AdminWriteMixin, viewsets.ModelViewSet):
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


class ChiefdomViewSet(AdminWriteMixin, viewsets.ModelViewSet):
    """CRUD for Chiefdoms"""
    queryset = Chiefdom.objects.all().select_related('district', 'district__region').order_by('district__region__name', 'district__name', 'name')
    serializer_class = ChiefdomSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        district = self.request.query_params.get('district')
        if district:
            qs = qs.filter(district_id=district)
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(code__icontains=search))
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() == 'true')
        return qs


class TownViewSet(AdminWriteMixin, viewsets.ModelViewSet):
    """CRUD for Towns"""
    queryset = Town.objects.all().select_related('district', 'district__region', 'chiefdom').order_by('district__region__name', 'district__name', 'name')
    serializer_class = TownSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        district = self.request.query_params.get('district')
        if district:
            qs = qs.filter(district_id=district)
        chiefdom = self.request.query_params.get('chiefdom')
        if chiefdom:
            qs = qs.filter(chiefdom_id=chiefdom)
        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(Q(name__icontains=search) | Q(code__icontains=search))
        is_active = self.request.query_params.get('is_active')
        if is_active is not None:
            qs = qs.filter(is_active=is_active.lower() == 'true')
        return qs


class HospitalViewSet(AdminWriteMixin, viewsets.ModelViewSet):
    """CRUD for Hospitals"""
    queryset = Hospital.objects.all().select_related(
        'district', 'district__region', 'admin_user', 'created_by', 'last_updated_by', 'approved_by'
    ).order_by('name')
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
        ownership = self.request.query_params.get('ownership', None)
        if ownership:
            queryset = queryset.filter(ownership_type=ownership)
        level = self.request.query_params.get('level', None)
        if level:
            queryset = queryset.filter(level_of_care=level)
        op_status = self.request.query_params.get('operational_status', None)
        if op_status:
            queryset = queryset.filter(operational_status=op_status)
        approval = self.request.query_params.get('approval_status', None)
        if approval:
            queryset = queryset.filter(approval_status=approval)
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(name__icontains=search) | Q(code__icontains=search) |
                Q(facility_code__icontains=search) | Q(town_city__icontains=search)
            )
        is_active = self.request.query_params.get('is_active', None)
        if is_active is not None:
            queryset = queryset.filter(is_active=is_active.lower() == 'true')
        return queryset

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        hospital = serializer.save(created_by=request.user)
        return Response({
            'message': 'Hospital created successfully',
            'hospital': HospitalSerializer(hospital).data
        }, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        hospital = serializer.save(last_updated_by=request.user)
        return Response({
            'message': 'Hospital updated successfully',
            'hospital': HospitalSerializer(hospital).data
        })


class DepartmentViewSet(AdminWriteMixin, viewsets.ModelViewSet):
    """CRUD for Departments within hospitals"""
    queryset = Department.objects.all().select_related('hospital', 'hospital__district').order_by('hospital__name', 'name')
    serializer_class = DepartmentSerializer
    permission_classes = [IsAuthenticated]

    def _require_admin(self, request):
        role = request.user.role.name if request.user.role else None
        if role in ('admin', 'ministry_admin'):
            return None
        if role == 'hospital_admin' and request.user.hospital:
            return None
        return Response(
            {'error': 'Only administrators can manage departments.'},
            status=status.HTTP_403_FORBIDDEN
        )

    def perform_create(self, serializer):
        role = self.request.user.role.name if self.request.user.role else None
        if role == 'hospital_admin' and self.request.user.hospital:
            serializer.save(hospital=self.request.user.hospital)
        else:
            serializer.save()

    def get_queryset(self):
        queryset = super().get_queryset()
        role = self.request.user.role.name if self.request.user.role else None
        if role == 'hospital_admin' and self.request.user.hospital:
            queryset = queryset.filter(hospital=self.request.user.hospital)
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
    user = request.user
    role = user.role.name if user.role else None
    if role not in ('admin', 'ministry_admin'):
        return Response(
            {'error': 'Only ministry administrators can access national dashboards.'},
            status=status.HTTP_403_FORBIDDEN
        )
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

    # Users by role
    users_by_role = list(
        User.objects.values('role__name')
        .annotate(count=Count('id'))
        .order_by('-count')
    )

    # Active vs Inactive Users
    active_users = User.objects.filter(is_active=True).count()
    inactive_users = User.objects.filter(is_active=False).count()

    # Hospitals by ownership type
    hospitals_by_ownership = list(
        Hospital.objects.filter(is_active=True)
        .values('ownership_type')
        .annotate(count=Count('id'))
        .order_by('-count')
    )

    # Hospitals by level of care
    hospitals_by_level = list(
        Hospital.objects.filter(is_active=True)
        .values('level_of_care')
        .annotate(count=Count('id'))
        .order_by('-count')
    )

    # Bed capacity
    bed_agg = Hospital.objects.filter(is_active=True).aggregate(
        total_beds=Sum('bed_capacity'),
        avg_beds=Avg('bed_capacity'),
    )
    total_beds = bed_agg['total_beds'] or 0
    avg_beds = round(bed_agg['avg_beds'] or 0, 1)

    # Service availability (% of hospitals with each service)
    total_active_hospitals = total_hospitals or 1  # avoid division by zero
    service_availability = [
        {'service': 'Emergency', 'count': Hospital.objects.filter(is_active=True, emergency_services=True).count()},
        {'service': 'Laboratory', 'count': Hospital.objects.filter(is_active=True, laboratory_available=True).count()},
        {'service': 'Pharmacy', 'count': Hospital.objects.filter(is_active=True, pharmacy_available=True).count()},
        {'service': 'Radiology', 'count': Hospital.objects.filter(is_active=True, radiology_available=True).count()},
        {'service': 'Maternity', 'count': Hospital.objects.filter(is_active=True, maternity_services=True).count()},
        {'service': 'Surgery', 'count': Hospital.objects.filter(is_active=True, surgery_services=True).count()},
        {'service': 'Ambulance', 'count': Hospital.objects.filter(is_active=True, ambulance_available=True).count()},
    ]
    for s in service_availability:
        s['percentage'] = round((s['count'] / total_active_hospitals) * 100, 1)

    # Top hospitals by staff count
    top_hospitals_by_staff = []
    for h in Hospital.objects.filter(is_active=True):
        staff_cnt = User.objects.filter(hospital=h, is_active=True).count()
        if staff_cnt > 0:
            top_hospitals_by_staff.append({
                'id': h.id,
                'name': h.name,
                'region': h.district.region.name if h.district and h.district.region else '—',
                'staff_count': staff_cnt,
            })
    top_hospitals_by_staff = sorted(top_hospitals_by_staff, key=lambda x: x['staff_count'], reverse=True)[:5]

    # Approval status breakdown
    approval_breakdown = list(
        Hospital.objects.values('approval_status')
        .annotate(count=Count('id'))
        .order_by('-count')
    )

    return Response({
        'overview': {
            'total_regions': total_regions,
            'total_districts': total_districts,
            'total_hospitals': total_hospitals,
            'total_departments': total_departments,
            'total_staff': total_staff,
            'total_users': total_users,
            'active_users': active_users,
            'inactive_users': inactive_users,
            'total_beds': total_beds,
            'avg_beds_per_hospital': avg_beds,
        },
        'hospitals_by_type': hospitals_by_type,
        'hospitals_by_ownership': hospitals_by_ownership,
        'hospitals_by_level': hospitals_by_level,
        'staff_by_region': staff_by_region,
        'users_by_role': users_by_role,
        'service_availability': service_availability,
        'top_hospitals_by_staff': top_hospitals_by_staff,
        'approval_breakdown': approval_breakdown,
        'recent_hospitals': HospitalSerializer(recent_hospitals, many=True).data,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def referral_doctors(request):
    """
    Returns all active doctors across all hospitals for use in referral dropdowns.
    Optionally filter by ?hospital=<id> to scope to a specific hospital.
    Any authenticated staff member can call this.
    """
    qs = User.objects.filter(
        role__name='doctor',
        is_active=True,
    ).select_related('hospital', 'role').order_by('full_name')

    hospital_id = request.query_params.get('hospital')
    if hospital_id:
        qs = qs.filter(hospital_id=hospital_id)

    doctors = [
        {
            'id': d.id,
            'full_name': d.full_name or d.email,
            'email': d.email,
            'hospital_id': d.hospital_id,
            'hospital_name': d.hospital.name if d.hospital else '—',
        }
        for d in qs
    ]
    return Response({'doctors': doctors})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def hospital_dashboard(request):
    """
    Hospital-level dashboard for hospital administrators.
    Shows stats scoped to one hospital.
    """
    user = request.user
    role = user.role.name if user.role else None
    hosp = user.hospital

    if role not in ('admin', 'hospital_admin', 'ministry_admin'):
        return Response(
            {'error': 'You do not have permission to access this dashboard.'},
            status=status.HTTP_403_FORBIDDEN
        )

    if not hosp:
        return Response(
            {'error': 'No hospital assigned to your account.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    now = timezone.now()
    today = now.date()
    thirty_days_ago = now - timedelta(days=30)
    six_months_ago = now - timedelta(days=180)

    # ── Core counts ──
    total_staff = User.objects.filter(hospital=hosp, is_active=True).count()
    total_patients = hosp.patients.filter(is_active=True).count()
    total_visits = hosp.visits.count()
    total_departments = hosp.departments.filter(is_active=True).count()

    # ── Today's activity ──
    visits_today = hosp.visits.filter(visit_date__date=today).count()
    active_visits = hosp.visits.filter(status__in=['registered', 'waiting', 'triaged', 'in_progress']).count()
    new_patients_this_month = hosp.patients.filter(
        is_active=True, created_at__gte=thirty_days_ago
    ).count()

    # ── Appointment stats (Appointment has no hospital FK — scope via doctor's hospital) ──
    appointments_today = Appointment.objects.filter(doctor__hospital=hosp, scheduled_at__date=today).count()
    appointments_pending = Appointment.objects.filter(doctor__hospital=hosp, status='pending').count()
    appointments_confirmed = Appointment.objects.filter(doctor__hospital=hosp, status='confirmed').count()

    # ── Visits by status ──
    visits_by_status = list(
        hosp.visits.values('status').annotate(count=Count('id'))
    )

    # ── Monthly visit trend (last 6 months) ──
    monthly_trend = list(
        hosp.visits
        .filter(visit_date__gte=six_months_ago)
        .annotate(month=TruncMonth('visit_date'))
        .values('month')
        .annotate(count=Count('id'))
        .order_by('month')
    )
    monthly_trend_data = [
        {'month': m['month'].strftime('%b %Y'), 'count': m['count']}
        for m in monthly_trend
    ]

    # ── Top departments by visit count ──
    top_departments = list(
        hosp.visits
        .filter(department__isnull=False)
        .values('department__name')
        .annotate(count=Count('id'))
        .order_by('-count')[:5]
    )

    # ── Recent visits ──
    recent_visits = hosp.visits.select_related('patient', 'department', 'doctor').order_by('-visit_date')[:8]
    recent_visits_data = [{
        'id': v.id,
        'patient_name': v.patient.full_name if v.patient else '—',
        'patient_pk': v.patient.id if v.patient else None,
        'visit_type': v.visit_type,
        'status': v.status,
        'visit_date': v.visit_date,
        'department': v.department.name if v.department else '—',
        'doctor': v.doctor.full_name if v.doctor else '—',
    } for v in recent_visits]

    # ── Staff by role ──
    staff_by_role = list(
        User.objects.filter(hospital=hosp, is_active=True)
        .values('role__name')
        .annotate(count=Count('id'))
    )

    # ── Recent audit events (last 10) ──
    # user_hospital and patient_hospital are ForeignKeys to Hospital
    recent_audit = list(
        AuditLog.objects.filter(
            Q(user_hospital=hosp) | Q(patient_hospital=hosp)
        ).order_by('-created_at')[:10]
        .values(
            'id', 'action', 'access_type', 'outcome',
            'created_at', 'user_name', 'user_role', 'patient_name',
        )
    )

    return Response({
        'hospital': {
            'id': hosp.id,
            'name': hosp.name,
            'hospital_type_display': hosp.get_hospital_type_display() if hasattr(hosp, 'get_hospital_type_display') else None,
            'district_name': hosp.district.name if hosp.district else None,
            'code': hosp.code if hasattr(hosp, 'code') else None,
            'hospital_image': request.build_absolute_uri(hosp.hospital_image.url) if hosp.hospital_image else None,
        },
        'overview': {
            'total_staff': total_staff,
            'total_patients': total_patients,
            'total_visits': total_visits,
            'total_departments': total_departments,
            'visits_today': visits_today,
            'active_visits': active_visits,
            'new_patients_this_month': new_patients_this_month,
            'appointments_today': appointments_today,
            'appointments_pending': appointments_pending,
            'appointments_confirmed': appointments_confirmed,
        },
        'visits_by_status': visits_by_status,
        'monthly_trend': monthly_trend_data,
        'top_departments': top_departments,
        'recent_visits': recent_visits_data,
        'staff_by_role': staff_by_role,
        'recent_audit': recent_audit,
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
                'sms_notifications_enabled': user.sms_notifications_enabled,
                'email_notifications_enabled': user.email_notifications_enabled,
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
        if 'sms_notifications_enabled' in data:
            user.sms_notifications_enabled = bool(data['sms_notifications_enabled'])
        if 'email_notifications_enabled' in data:
            user.email_notifications_enabled = bool(data['email_notifications_enabled'])

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
        if 'profile_photo' in request.FILES:
            profile.image = request.FILES['profile_photo']

        profile.save()

        photo_url = None
        if profile.image:
            try:
                photo_url = request.build_absolute_uri(profile.image.url)
            except Exception:
                pass

        return Response({'message': 'Profile updated successfully', 'photo_url': photo_url})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ministry_hospital_report(request, hospital_id):
    """
    Drill-down report for a specific hospital.
    Includes operational metrics: patients, visits, appointments, revenue, admissions.
    """
    role = request.user.role.name if request.user.role else None
    if role not in ('admin', 'ministry_admin'):
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

    hospital = get_object_or_404(Hospital, pk=hospital_id, is_active=True)
    today = timezone.now().date()
    start_of_month = today.replace(day=1)

    # Patients
    total_patients = Patient.objects.filter(hospital=hospital).count()
    new_patients_this_month = Patient.objects.filter(hospital=hospital, created_at__date__gte=start_of_month).count()

    # Visits
    total_visits = PatientVisit.objects.filter(hospital=hospital).count()
    visits_this_month = PatientVisit.objects.filter(hospital=hospital, visit_date__date__gte=start_of_month).count()
    visits_today = PatientVisit.objects.filter(hospital=hospital, visit_date__date=today).count()

    # Appointments
    total_appointments = Appointment.objects.filter(hospital=hospital).count()
    appointments_this_month = Appointment.objects.filter(hospital=hospital, scheduled_at__date__gte=start_of_month).count()
    completed_appointments = Appointment.objects.filter(hospital=hospital, status='completed').count()
    cancelled_appointments = Appointment.objects.filter(hospital=hospital, status='cancelled').count()
    no_show_appointments = Appointment.objects.filter(hospital=hospital, status='no_show').count()

    # Revenue
    invoices = Invoice.objects.filter(hospital=hospital)
    total_revenue = invoices.filter(status='paid').aggregate(t=Sum('total'))['t'] or 0
    outstanding = invoices.filter(status__in=('pending', 'partial')).aggregate(t=Sum('balance_due'))['t'] or 0
    revenue_this_month = invoices.filter(status='paid', created_at__date__gte=start_of_month).aggregate(t=Sum('total'))['t'] or 0

    # Admissions
    total_admissions = InpatientAdmission.objects.filter(hospital=hospital).count()
    current_admissions = InpatientAdmission.objects.filter(hospital=hospital, status='admitted').count()
    discharged_this_month = InpatientAdmission.objects.filter(hospital=hospital, status='discharged', discharge_date__date__gte=start_of_month).count()

    # Staff
    staff_count = User.objects.filter(hospital=hospital, is_active=True).exclude(role__name='patient').count()
    doctors_count = User.objects.filter(hospital=hospital, is_active=True, role__name='doctor').count()
    nurses_count = User.objects.filter(hospital=hospital, is_active=True, role__name='nurse').count()

    # Ward occupancy
    wards = []
    for w in hospital.wards.filter(is_active=True):
        beds_total = w.beds.filter(is_active=True).count()
        beds_occ = w.beds.filter(status='occupied').count()
        wards.append({
            'id': w.id, 'name': w.name, 'type': w.ward_type,
            'beds_total': beds_total, 'beds_occupied': beds_occ,
            'beds_available': beds_total - beds_occ,
            'occupancy_rate': round(beds_occ / beds_total * 100, 1) if beds_total else 0,
        })

    return Response({
        'hospital': {'id': hospital.id, 'name': hospital.name, 'type': hospital.hospital_type,
                     'district': hospital.district.name if hospital.district else None,
                     'region': hospital.district.region.name if hospital.district and hospital.district.region else None},
        'patients': {'total': total_patients, 'new_this_month': new_patients_this_month},
        'visits': {'total': total_visits, 'this_month': visits_this_month, 'today': visits_today},
        'appointments': {'total': total_appointments, 'this_month': appointments_this_month,
                         'completed': completed_appointments, 'cancelled': cancelled_appointments, 'no_show': no_show_appointments},
        'revenue': {'total_revenue': total_revenue, 'outstanding': outstanding, 'this_month': revenue_this_month},
        'admissions': {'total': total_admissions, 'current': current_admissions, 'discharged_this_month': discharged_this_month},
        'staff': {'total': staff_count, 'doctors': doctors_count, 'nurses': nurses_count},
        'wards': wards,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def district_admin_dashboard(request):
    """
    Self-service dashboard for district_admin users.
    Returns aggregated metrics for the admin's own assigned district.
    """
    user = request.user
    role = user.role.name if user.role else None
    if role not in ('district_admin', 'admin', 'ministry_admin'):
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

    district = user.district
    if not district:
        return Response({'error': 'You are not assigned to a district.'}, status=status.HTTP_400_BAD_REQUEST)

    hospitals = Hospital.objects.filter(district=district, is_active=True)
    today = timezone.now().date()
    start_of_month = today.replace(day=1)
    thirty_days_ago = today - timedelta(days=30)

    total_patients        = Patient.objects.filter(hospital__in=hospitals).count()
    total_visits          = PatientVisit.objects.filter(hospital__in=hospitals).count()
    visits_this_month     = PatientVisit.objects.filter(hospital__in=hospitals, visit_date__date__gte=start_of_month).count()
    visits_today          = PatientVisit.objects.filter(hospital__in=hospitals, visit_date__date=today).count()
    total_staff           = User.objects.filter(hospital__in=hospitals, is_active=True).exclude(role__name='patient').count()
    total_appointments    = Appointment.objects.filter(hospital__in=hospitals).count()
    completed_appts       = Appointment.objects.filter(hospital__in=hospitals, status='completed').count()
    total_admissions      = InpatientAdmission.objects.filter(hospital__in=hospitals).count()
    current_admissions    = InpatientAdmission.objects.filter(hospital__in=hospitals, status='admitted').count()

    # Monthly visit trend (last 6 months)
    monthly_trend = []
    for i in range(5, -1, -1):
        month_start = (today.replace(day=1) - timedelta(days=i * 30)).replace(day=1)
        month_label = month_start.strftime('%b %Y')
        count = PatientVisit.objects.filter(hospital__in=hospitals, visit_date__date__gte=month_start,
                                            visit_date__date__lt=(month_start.replace(month=month_start.month % 12 + 1) if month_start.month < 12
                                                                   else month_start.replace(year=month_start.year + 1, month=1))).count()
        monthly_trend.append({'month': month_label, 'visits': count})

    # Hospital breakdown
    hospital_breakdown = []
    for h in hospitals:
        hospital_breakdown.append({
            'id': h.id, 'name': h.name, 'type': h.hospital_type,
            'patients':     Patient.objects.filter(hospital=h).count(),
            'visits':       PatientVisit.objects.filter(hospital=h).count(),
            'staff':        User.objects.filter(hospital=h, is_active=True).exclude(role__name='patient').count(),
            'appointments': Appointment.objects.filter(hospital=h).count(),
        })

    # Staff by role
    staff_by_role = list(
        User.objects.filter(hospital__in=hospitals, is_active=True)
        .exclude(role__name='patient')
        .values('role__name')
        .annotate(count=Count('id'))
        .order_by('-count')
    )

    return Response({
        'district': {
            'id': district.id,
            'name': district.name,
            'region': district.region.name if district.region else None,
        },
        'summary': {
            'hospitals':          hospitals.count(),
            'patients':           total_patients,
            'staff':              total_staff,
            'visits_today':       visits_today,
            'visits_this_month':  visits_this_month,
            'total_visits':       total_visits,
            'appointments':       total_appointments,
            'completed_appts':    completed_appts,
            'admissions_current': current_admissions,
            'admissions_total':   total_admissions,
        },
        'hospital_breakdown': hospital_breakdown,
        'monthly_trend':      monthly_trend,
        'staff_by_role':      staff_by_role,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ministry_district_report(request, district_id):
    """
    Drill-down report for a specific district.
    Aggregates operational metrics across all hospitals in the district.
    """
    role = request.user.role.name if request.user.role else None
    if role not in ('admin', 'ministry_admin'):
        return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

    district = get_object_or_404(District, pk=district_id, is_active=True)
    hospitals = Hospital.objects.filter(district=district, is_active=True)
    today = timezone.now().date()
    start_of_month = today.replace(day=1)

    total_patients = Patient.objects.filter(hospital__in=hospitals).count()
    total_visits = PatientVisit.objects.filter(hospital__in=hospitals).count()
    visits_this_month = PatientVisit.objects.filter(hospital__in=hospitals, visit_date__date__gte=start_of_month).count()
    total_appointments = Appointment.objects.filter(hospital__in=hospitals).count()
    completed_appointments = Appointment.objects.filter(hospital__in=hospitals, status='completed').count()
    total_revenue = Invoice.objects.filter(hospital__in=hospitals, status='paid').aggregate(t=Sum('total'))['t'] or 0
    total_admissions = InpatientAdmission.objects.filter(hospital__in=hospitals).count()
    current_admissions = InpatientAdmission.objects.filter(hospital__in=hospitals, status='admitted').count()
    staff_count = User.objects.filter(hospital__in=hospitals, is_active=True).exclude(role__name='patient').count()

    # Hospital breakdown within district
    hospital_breakdown = []
    for h in hospitals:
        hospital_breakdown.append({
            'id': h.id,
            'name': h.name,
            'type': h.hospital_type,
            'patients': Patient.objects.filter(hospital=h).count(),
            'visits': PatientVisit.objects.filter(hospital=h).count(),
            'appointments': Appointment.objects.filter(hospital=h).count(),
            'revenue': Invoice.objects.filter(hospital=h, status='paid').aggregate(t=Sum('total'))['t'] or 0,
            'staff': User.objects.filter(hospital=h, is_active=True).exclude(role__name='patient').count(),
        })

    return Response({
        'district': {'id': district.id, 'name': district.name,
                     'region': district.region.name if district.region else None},
        'hospitals_count': hospitals.count(),
        'patients': {'total': total_patients},
        'visits': {'total': total_visits, 'this_month': visits_this_month},
        'appointments': {'total': total_appointments, 'completed': completed_appointments},
        'revenue': {'total_revenue': total_revenue},
        'admissions': {'total': total_admissions, 'current': current_admissions},
        'staff': {'total': staff_count},
        'hospital_breakdown': hospital_breakdown,
    })

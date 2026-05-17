from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q, Count
from django.utils import timezone
from datetime import timedelta

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError

from userauths.models import Patient, User, Role
from userauths.serializer import PatientSerializer, PatientCreateSerializer, PatientUpdateSerializer
from userauths.permissions import PatientAccessControl


class PatientViewSet(viewsets.ModelViewSet):
    """
    Patient management ViewSet.
    - Receptionists: CRUD for patients at their assigned hospital
    - Doctors/Nurses: Read-only access to patients at their hospital
    - Admins: Full access to all patients
    """
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'create':
            return PatientCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return PatientUpdateSerializer
        return PatientSerializer

    def get_queryset(self):
        user = self.request.user
        role = user.role.name if user.role else None
        action = self.action
        
        # Get search query first
        search = self.request.query_params.get('search', None)

        # Base access control
        # Admins and ministry see all patients by default
        if role in ['admin', 'ministry_admin']:
            queryset = Patient.objects.all()
        # For retrieve/detail view, return all patients so access control
        # logic can properly evaluate cross-hospital access (403, not 404)
        elif action == 'retrieve':
            queryset = Patient.objects.all()
        # If there's a search, allow hospital staff to find any patient across the NEHR
        elif search and role in ['receptionist', 'doctor', 'nurse', 'hospital_admin']:
            queryset = Patient.objects.all()
        # Hospital-level staff see only their hospital's patients for regular browsing
        elif user.hospital:
            queryset = Patient.objects.filter(hospital=user.hospital)
        # District admins see patients across their district's hospitals
        elif role == 'district_admin' and user.district:
            queryset = Patient.objects.filter(hospital__district=user.district)
        else:
            queryset = Patient.objects.none()

        # Apply Search filtering
        if search:
            queryset = queryset.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(other_names__icontains=search) |
                Q(patient_id__icontains=search) |
                Q(phone__icontains=search) |
                Q(national_id__icontains=search) |
                Q(insurance_number__icontains=search) |
                Q(email__icontains=search)
            )

        # Filter by gender
        gender = self.request.query_params.get('gender', None)
        if gender:
            queryset = queryset.filter(gender=gender)

        # Filter by blood type
        blood_type = self.request.query_params.get('blood_type', None)
        if blood_type:
            queryset = queryset.filter(blood_type=blood_type)

        # Filter by status
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # Filter by insurance provider
        insurance = self.request.query_params.get('insurance', None)
        if insurance:
            queryset = queryset.filter(insurance_provider__icontains=insurance)

        # Filter incomplete profiles (missing national_id — nurse quick-registered)
        incomplete = self.request.query_params.get('incomplete', None)
        if incomplete == 'true':
            queryset = queryset.filter(
                Q(national_id__isnull=True) | Q(national_id='')
            )

        return queryset.select_related('hospital', 'registered_by')

    def retrieve(self, request, *args, **kwargs):
        """Retrieve a single patient with access control and audit logging."""
        instance = self.get_object()
        user = request.user
        role = user.role.name if user.role else None

        # Admins bypass access control (already handled by get_object)
        if role in ('admin', 'ministry_admin'):
            PatientAccessControl._log(user, instance, 'view', 'admin', 'allowed', request)
            serializer = self.get_serializer(instance)
            return Response(serializer.data)

        # Check access control for non-admins
        result = PatientAccessControl.can_access_patient(
            user, instance, action='view', request=request
        )

        if result['allowed']:
            serializer = self.get_serializer(instance)
            return Response(serializer.data)
        else:
            return Response(
                {'error': result['message']},
                status=status.HTTP_403_FORBIDDEN
            )

    def get_object(self):
        """Default object lookup — used by update/delete."""
        return super().get_object()

    @action(detail=True, methods=['post'], url_path='emergency_access')
    def emergency_access(self, request, pk=None):
        """
        Break-the-glass emergency access to a patient record.
        POST body: { "justification": "Patient in cardiac arrest..." }
        """
        user = request.user
        justification = request.data.get('justification', '').strip()

        if not justification or len(justification) < 10:
            return Response(
                {'error': 'A detailed justification (at least 10 characters) is required for emergency access.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        patient = self.get_object()
        result = PatientAccessControl.can_access_patient(
            user, patient, action='emergency', request=request, justification=justification
        )

        if result['allowed']:
            serializer = self.get_serializer(patient)
            return Response({
                'allowed': True,
                'access_type': result['access_type'],
                'message': 'Emergency access granted. This action has been logged and will be reviewed.',
                'patient': serializer.data,
            })
        else:
            return Response(
                {'error': result['message']},
                status=status.HTTP_403_FORBIDDEN
            )

    def create(self, request, *args, **kwargs):
        user = request.user
        role = user.role.name if user.role else None

        # Receptionists, nurses, hospital_admin, and admin can register patients
        allowed_roles = ['receptionist', 'nurse', 'hospital_admin', 'admin', 'ministry_admin']
        if role not in allowed_roles:
            return Response(
                {'error': 'You do not have permission to register patients.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Receptionist / nurse must be assigned to a hospital
        if role in ['receptionist', 'nurse'] and not user.hospital:
            return Response(
                {'error': 'You are not assigned to any hospital. Contact your administrator.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        # Auto-assign hospital and registered_by
        hospital = user.hospital
        if role in ['admin', 'ministry_admin']:
            # Admin can optionally specify a hospital
            hospital_id = request.data.get('hospital')
            if hospital_id:
                from userauths.models import Hospital
                try:
                    hospital = Hospital.objects.get(id=hospital_id)
                except Hospital.DoesNotExist:
                    return Response({'error': 'Invalid hospital ID.'}, status=status.HTTP_400_BAD_REQUEST)
            elif not hospital:
                return Response(
                    {'error': 'Please specify a hospital for this patient.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

        patient = serializer.save(hospital=hospital, registered_by=user)

        return Response({
            'message': f'Patient {patient.full_name} registered successfully.',
            'patient': PatientSerializer(patient).data
        }, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        user = request.user
        role = user.role.name if user.role else None
        allowed_roles = ['receptionist', 'hospital_admin', 'admin', 'ministry_admin']
        if role not in allowed_roles:
            return Response(
                {'error': 'You do not have permission to edit patients.'},
                status=status.HTTP_403_FORBIDDEN
            )

        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        return Response({
            'message': 'Patient updated successfully.',
            'patient': PatientSerializer(instance).data
        })

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Return patient statistics for the dashboard."""
        queryset = self.get_queryset()
        now = timezone.now()
        today = now.date()
        week_ago = today - timedelta(days=7)
        month_ago = today - timedelta(days=30)

        total = queryset.count()
        active = queryset.filter(status='active').count()
        inactive = queryset.filter(status='inactive').count()
        today_count = queryset.filter(created_at__date=today).count()
        week_count = queryset.filter(created_at__date__gte=week_ago).count()
        month_count = queryset.filter(created_at__date__gte=month_ago).count()

        gender_dist = list(
            queryset.values('gender').annotate(count=Count('id')).order_by('-count')
        )
        blood_dist = list(
            queryset.exclude(blood_type='unknown').values('blood_type').annotate(count=Count('id')).order_by('-count')
        )
        insurance_dist = list(
            queryset.exclude(insurance_provider__isnull=True).exclude(insurance_provider='')
            .values('insurance_provider').annotate(count=Count('id')).order_by('-count')
        )

        # Monthly registration trend (last 6 months)
        monthly_trend = []
        for i in range(5, -1, -1):
            month_start = (now - timedelta(days=i * 30)).replace(day=1).date()
            if i > 0:
                next_month = (now - timedelta(days=(i - 1) * 30)).replace(day=1).date()
            else:
                next_month = today + timedelta(days=1)
            count = queryset.filter(created_at__date__gte=month_start, created_at__date__lt=next_month).count()
            monthly_trend.append({
                'month': month_start.strftime('%b %Y'),
                'count': count
            })

        # Incomplete profiles: patients registered without a national ID (quick-registered by nurse)
        incomplete_count = queryset.filter(
            Q(national_id__isnull=True) | Q(national_id='')
        ).count()

        return Response({
            'total_patients': total,
            'active_patients': active,
            'inactive_patients': inactive,
            'registered_today': today_count,
            'registered_this_week': week_count,
            'registered_this_month': month_count,
            'incomplete_profiles': incomplete_count,
            'gender_distribution': gender_dist,
            'blood_type_distribution': blood_dist,
            'insurance_distribution': insurance_dist,
            'monthly_trend': monthly_trend,
        })

    @action(detail=True, methods=['post'], url_path='create_portal_account')
    def create_portal_account(self, request, pk=None):
        """
        Receptionist creates a patient portal (login) account for a registered patient.
        Required body: { "password": "...", "password2": "..." }
        """
        actor = request.user
        allowed_roles = ('admin', 'receptionist', 'hospital_admin')
        if not actor.role or actor.role.name not in allowed_roles:
            return Response({'error': 'Only receptionists can create patient portal accounts.'}, status=status.HTTP_403_FORBIDDEN)

        patient = self.get_object()

        if patient.user:
            return Response({'error': 'This patient already has a portal account.'}, status=status.HTTP_400_BAD_REQUEST)

        if not patient.email:
            return Response({'error': 'Patient must have an email address to create a portal account.'}, status=status.HTTP_400_BAD_REQUEST)

        password  = request.data.get('password', '')
        password2 = request.data.get('password2', '')

        if not password or not password2:
            return Response({'error': 'Password and confirmation are required.'}, status=status.HTTP_400_BAD_REQUEST)

        if password != password2:
            return Response({'error': 'Passwords do not match.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            validate_password(password)
        except DjangoValidationError as e:
            return Response({'error': ' '.join(e.messages)}, status=status.HTTP_400_BAD_REQUEST)

        if User.objects.filter(email=patient.email).exists():
            return Response({'error': f'A user account with the email {patient.email} already exists.'}, status=status.HTTP_400_BAD_REQUEST)

        patient_role, _ = Role.objects.get_or_create(name='patient')

        user = User.objects.create(
            email=patient.email,
            full_name=patient.full_name,
            phone=patient.phone,
            role=patient_role,
            hospital=patient.hospital,
        )
        user.set_password(password)
        user.save()

        patient.user = user
        patient.save(update_fields=['user'])

        return Response({
            'message': f'Portal account created for {patient.full_name}.',
            'email': patient.email,
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['delete'], url_path='revoke_portal_account')
    def revoke_portal_account(self, request, pk=None):
        """Receptionist removes a patient's portal access."""
        actor = request.user
        allowed_roles = ('admin', 'receptionist', 'hospital_admin')
        if not actor.role or actor.role.name not in allowed_roles:
            return Response({'error': 'Not authorized.'}, status=status.HTTP_403_FORBIDDEN)

        patient = self.get_object()
        if not patient.user:
            return Response({'error': 'This patient has no portal account.'}, status=status.HTTP_400_BAD_REQUEST)

        old_user = patient.user
        patient.user = None
        patient.save(update_fields=['user'])
        old_user.delete()

        return Response({'message': 'Portal account revoked.'}, status=status.HTTP_200_OK)

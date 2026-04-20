from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q, Count
from django.utils import timezone
from datetime import timedelta

from userauths.models import Patient
from userauths.serializer import PatientSerializer, PatientCreateSerializer, PatientUpdateSerializer


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

        # Admins and ministry see all patients
        if role in ['admin', 'ministry_admin']:
            queryset = Patient.objects.all()
        # Hospital-level staff see only their hospital's patients
        elif user.hospital:
            queryset = Patient.objects.filter(hospital=user.hospital)
        # District admins see patients across their district's hospitals
        elif role == 'district_admin' and user.district:
            queryset = Patient.objects.filter(hospital__district=user.district)
        else:
            queryset = Patient.objects.none()

        # Search
        search = self.request.query_params.get('search', None)
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

        return queryset.select_related('hospital', 'registered_by')

    def create(self, request, *args, **kwargs):
        user = request.user
        role = user.role.name if user.role else None

        # Only receptionists, hospital_admin, and admin can register patients
        allowed_roles = ['receptionist', 'hospital_admin', 'admin', 'ministry_admin']
        if role not in allowed_roles:
            return Response(
                {'error': 'You do not have permission to register patients.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Receptionist must be assigned to a hospital
        if role == 'receptionist' and not user.hospital:
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

        return Response({
            'total_patients': total,
            'active_patients': active,
            'inactive_patients': inactive,
            'registered_today': today_count,
            'registered_this_week': week_count,
            'registered_this_month': month_count,
            'gender_distribution': gender_dist,
            'blood_type_distribution': blood_dist,
            'insurance_distribution': insurance_dist,
            'monthly_trend': monthly_trend,
        })

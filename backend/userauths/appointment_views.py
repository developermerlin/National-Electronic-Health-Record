"""
Appointment management views.
Role-based permissions:
  - receptionist: CRUD for appointments at their hospital, can check-in patients
  - doctor: View own appointments, update status to 'in_consultation' or 'completed'
  - hospital_admin: Full access to appointments at their hospital
  - ministry_admin / admin: Full access to all appointments
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q
from django.utils import timezone
from datetime import datetime, timedelta

from userauths.models import Appointment, User, Patient, Hospital, Department
from userauths.serializer import (
    AppointmentSerializer, AppointmentCreateSerializer, AppointmentStatusUpdateSerializer
)


class AppointmentViewSet(viewsets.ModelViewSet):
    """
    Appointment management ViewSet.
    - Receptionists: CRUD for appointments at their assigned hospital
    - Doctors: View own appointments, update to in_consultation/completed
    - Hospital Admins: Full access to appointments at their hospital
    - Ministry/Admin: Full access to all appointments
    """
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'create':
            return AppointmentCreateSerializer
        elif self.action in ['update_status', 'check_in', 'complete', 'cancel']:
            return AppointmentStatusUpdateSerializer
        return AppointmentSerializer

    def get_queryset(self):
        user = self.request.user
        role = user.role.name if user.role else None

        # Admins and ministry see all appointments
        if role in ['admin', 'ministry_admin']:
            queryset = Appointment.objects.all()
        # Doctors see only their own appointments
        elif role == 'doctor':
            queryset = Appointment.objects.filter(doctor=user)
        # Hospital-level staff see only their hospital's appointments
        elif user.hospital:
            queryset = Appointment.objects.filter(hospital=user.hospital)
        # District admins see appointments across their district's hospitals
        elif role == 'district_admin' and user.district:
            queryset = Appointment.objects.filter(hospital__district=user.district)
        else:
            queryset = Appointment.objects.none()

        # Filter by status
        status_filter = self.request.query_params.get('status', None)
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        # Filter by date range
        date_from = self.request.query_params.get('date_from', None)
        date_to = self.request.query_params.get('date_to', None)
        if date_from:
            try:
                from_date = datetime.strptime(date_from, '%Y-%m-%d')
                queryset = queryset.filter(scheduled_at__date__gte=from_date)
            except ValueError:
                pass
        if date_to:
            try:
                to_date = datetime.strptime(date_to, '%Y-%m-%d')
                queryset = queryset.filter(scheduled_at__date__lte=to_date)
            except ValueError:
                pass

        # Filter by priority
        priority = self.request.query_params.get('priority', None)
        if priority:
            queryset = queryset.filter(priority=priority)

        # Filter by doctor (for receptionists/admins)
        doctor_id = self.request.query_params.get('doctor', None)
        if doctor_id and role in ['receptionist', 'admin', 'hospital_admin', 'ministry_admin']:
            queryset = queryset.filter(doctor_id=doctor_id)

        # Filter by patient
        patient_id = self.request.query_params.get('patient', None)
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)

        # Search by patient name or ID
        search = self.request.query_params.get('search', None)
        if search:
            queryset = queryset.filter(
                Q(patient__first_name__icontains=search) |
                Q(patient__last_name__icontains=search) |
                Q(patient__patient_id__icontains=search) |
                Q(patient__phone__icontains=search)
            )

        return queryset.select_related(
            'patient', 'doctor', 'hospital', 'department', 
            'created_by', 'checked_in_by'
        ).order_by('scheduled_at')

    def perform_create(self, serializer):
        """Create appointment and send SMS notification if patient has phone."""
        appointment = serializer.save()
        
        # Send SMS reminder (non-blocking)
        try:
            from userauths.sms_service import send_appointment_sms
            send_appointment_sms(appointment, action='created')
        except Exception:
            pass
        
        return appointment

    @action(detail=True, methods=['post'])
    def check_in(self, request, pk=None):
        """Mark appointment as checked in (receptionist only)."""
        appointment = self.get_object()
        user = request.user
        role = user.role.name if user.role else None

        # Check permission
        if role not in ['receptionist', 'admin', 'hospital_admin', 'ministry_admin']:
            return Response(
                {'detail': 'Only receptionists can check in patients.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Check hospital scope
        if role not in ['admin', 'ministry_admin'] and user.hospital_id != appointment.hospital_id:
            return Response(
                {'detail': 'You can only check in patients at your hospital.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Update status
        appointment.status = 'checked_in'
        appointment.checked_in_at = timezone.now()
        appointment.checked_in_by = user
        appointment.save()

        # Notify doctor
        try:
            from userauths.models import Notification
            Notification.objects.create(
                user=appointment.doctor,
                title='Patient Checked In',
                message=f'{appointment.patient.full_name} has checked in for their appointment at {appointment.scheduled_at.strftime("%I:%M %p")}',
                notification_type='appointment',
                link=f'/doctor/queue'
            )
        except Exception:
            pass

        serializer = AppointmentSerializer(appointment)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def start_consultation(self, request, pk=None):
        """Mark appointment as in consultation (doctor only)."""
        appointment = self.get_object()
        user = request.user
        role = user.role.name if user.role else None

        # Check permission - only doctor or admin
        if role not in ['doctor', 'admin', 'ministry_admin']:
            return Response(
                {'detail': 'Only doctors can start consultations.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Doctor can only start their own appointments (unless admin)
        if role == 'doctor' and appointment.doctor_id != user.id:
            return Response(
                {'detail': 'You can only start your own appointments.'},
                status=status.HTTP_403_FORBIDDEN
            )

        appointment.status = 'in_consultation'
        appointment.started_at = timezone.now()
        appointment.save()

        serializer = AppointmentSerializer(appointment)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Mark appointment as completed (doctor only)."""
        appointment = self.get_object()
        user = request.user
        role = user.role.name if user.role else None

        # Check permission
        if role not in ['doctor', 'admin', 'ministry_admin']:
            return Response(
                {'detail': 'Only doctors can complete appointments.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Doctor can only complete their own appointments
        if role == 'doctor' and appointment.doctor_id != user.id:
            return Response(
                {'detail': 'You can only complete your own appointments.'},
                status=status.HTTP_403_FORBIDDEN
            )

        appointment.status = 'completed'
        appointment.completed_at = timezone.now()
        appointment.save()

        serializer = AppointmentSerializer(appointment)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel appointment (receptionist or doctor)."""
        appointment = self.get_object()
        user = request.user
        role = user.role.name if user.role else None

        # Check permission
        if role not in ['receptionist', 'doctor', 'admin', 'hospital_admin', 'ministry_admin']:
            return Response(
                {'detail': 'You do not have permission to cancel this appointment.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Doctor can only cancel their own
        if role == 'doctor' and appointment.doctor_id != user.id:
            return Response(
                {'detail': 'You can only cancel your own appointments.'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Receptionist can only cancel at their hospital
        if role == 'receptionist' and user.hospital_id != appointment.hospital_id:
            return Response(
                {'detail': 'You can only cancel appointments at your hospital.'},
                status=status.HTTP_403_FORBIDDEN
            )

        cancellation_reason = request.data.get('reason', '')
        appointment.status = 'cancelled'
        appointment.cancelled_at = timezone.now()
        appointment.cancellation_reason = cancellation_reason
        appointment.save()

        # Send cancellation SMS
        try:
            from userauths.sms_service import send_appointment_sms
            send_appointment_sms(appointment, action='cancelled')
        except Exception:
            pass

        serializer = AppointmentSerializer(appointment)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def no_show(self, request, pk=None):
        """Mark appointment as no-show (receptionist only)."""
        appointment = self.get_object()
        user = request.user
        role = user.role.name if user.role else None

        if role not in ['receptionist', 'admin', 'hospital_admin', 'ministry_admin']:
            return Response(
                {'detail': 'Only receptionists can mark no-shows.'},
                status=status.HTTP_403_FORBIDDEN
            )

        if role not in ['admin', 'ministry_admin'] and user.hospital_id != appointment.hospital_id:
            return Response(
                {'detail': 'You can only mark no-shows at your hospital.'},
                status=status.HTTP_403_FORBIDDEN
            )

        appointment.status = 'no_show'
        appointment.save()

        serializer = AppointmentSerializer(appointment)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def my_queue(self, request):
        """Get doctor's queue for today (checked-in and waiting patients)."""
        user = request.user
        role = user.role.name if user.role else None

        if role != 'doctor' and role not in ['admin', 'ministry_admin']:
            return Response(
                {'detail': 'Only doctors can view their queue.'},
                status=status.HTTP_403_FORBIDDEN
            )

        today = timezone.now().date()
        
        # Get appointments for today
        queryset = Appointment.objects.filter(
            doctor=user,
            scheduled_at__date=today,
            status__in=['checked_in', 'in_consultation', 'scheduled']
        ).select_related('patient', 'hospital', 'department').order_by('scheduled_at')

        # Admin can see any doctor's queue if doctor_id provided
        doctor_id = request.query_params.get('doctor_id')
        if role in ['admin', 'ministry_admin'] and doctor_id:
            queryset = Appointment.objects.filter(
                doctor_id=doctor_id,
                scheduled_at__date=today,
                status__in=['checked_in', 'in_consultation', 'scheduled']
            ).select_related('patient', 'hospital', 'department').order_by('scheduled_at')

        serializer = AppointmentSerializer(queryset, many=True)
        return Response({
            'count': queryset.count(),
            'waiting': queryset.filter(status='checked_in').count(),
            'in_consultation': queryset.filter(status='in_consultation').count(),
            'scheduled': queryset.filter(status='scheduled').count(),
            'appointments': serializer.data
        })

    @action(detail=False, methods=['get'])
    def today(self, request):
        """Get all appointments for today at user's hospital."""
        user = request.user
        role = user.role.name if user.role else None

        today = timezone.now().date()

        if role in ['admin', 'ministry_admin']:
            queryset = Appointment.objects.filter(scheduled_at__date=today)
        elif user.hospital:
            queryset = Appointment.objects.filter(hospital=user.hospital, scheduled_at__date=today)
        else:
            return Response({'appointments': [], 'count': 0})

        queryset = queryset.select_related('patient', 'doctor', 'department').order_by('scheduled_at')

        # Status breakdown
        status_counts = {
            'scheduled': queryset.filter(status='scheduled').count(),
            'checked_in': queryset.filter(status='checked_in').count(),
            'in_consultation': queryset.filter(status='in_consultation').count(),
            'completed': queryset.filter(status='completed').count(),
            'cancelled': queryset.filter(status='cancelled').count(),
            'no_show': queryset.filter(status='no_show').count(),
        }

        serializer = AppointmentSerializer(queryset, many=True)
        return Response({
            'date': today.isoformat(),
            'count': queryset.count(),
            'status_breakdown': status_counts,
            'appointments': serializer.data
        })

    @action(detail=False, methods=['get'])
    def doctors(self, request):
        """Get list of doctors at user's hospital (for appointment booking dropdown)."""
        user = request.user
        role = user.role.name if user.role else None

        if role in ['admin', 'ministry_admin']:
            doctors = User.objects.filter(role__name='doctor', is_active=True)
        elif user.hospital:
            doctors = User.objects.filter(
                role__name='doctor', 
                hospital=user.hospital, 
                is_active=True
            )
        else:
            doctors = User.objects.none()

        doctor_list = [
            {
                'id': d.id,
                'full_name': d.full_name,
                'email': d.email,
                'department': d.department.name if d.department else None,
                'department_id': d.department_id,
            }
            for d in doctors.select_related('department')
        ]

        return Response({'doctors': doctor_list})

    @action(detail=False, methods=['get'])
    def stats(self, request):
        """Get appointment statistics for dashboard."""
        user = request.user
        role = user.role.name if user.role else None

        # Determine scope
        if role in ['admin', 'ministry_admin']:
            base_query = Appointment.objects.all()
        elif user.hospital:
            base_query = Appointment.objects.filter(hospital=user.hospital)
        else:
            base_query = Appointment.objects.none()

        today = timezone.now().date()
        this_week_start = today - timedelta(days=today.weekday())
        this_month_start = today.replace(day=1)

        stats = {
            'today': {
                'total': base_query.filter(scheduled_at__date=today).count(),
                'completed': base_query.filter(scheduled_at__date=today, status='completed').count(),
                'no_show': base_query.filter(scheduled_at__date=today, status='no_show').count(),
                'cancelled': base_query.filter(scheduled_at__date=today, status='cancelled').count(),
            },
            'this_week': {
                'total': base_query.filter(scheduled_at__date__gte=this_week_start).count(),
            },
            'this_month': {
                'total': base_query.filter(scheduled_at__date__gte=this_month_start).count(),
            },
            'by_status': {
                'scheduled': base_query.filter(status='scheduled').count(),
                'checked_in': base_query.filter(status='checked_in').count(),
                'in_consultation': base_query.filter(status='in_consultation').count(),
                'completed': base_query.filter(status='completed').count(),
                'cancelled': base_query.filter(status='cancelled').count(),
                'no_show': base_query.filter(status='no_show').count(),
            }
        }

        return Response(stats)

"""
Telemedicine & Virtual Consultation API Views.
Supports video consultations, chat, and virtual appointments.
"""
from django.utils import timezone
from django.db.models import Q, Count
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from datetime import timedelta
import secrets
import hashlib

from .models import Appointment, Patient, User, PatientVisit, Hospital


# Simple in-memory storage for active sessions (use Redis in production)
ACTIVE_SESSIONS = {}


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def telemedicine_dashboard(request):
    """
    Get telemedicine dashboard stats and upcoming virtual appointments.
    """
    user = request.user
    role = user.role.name if user.role else None
    
    now = timezone.now()
    today_start = now.replace(hour=0, minute=0, second=0, microsecond=0)
    today_end = today_start + timedelta(days=1)
    
    # Base queryset
    appointments_qs = Appointment.objects.filter(
        appointment_type='telemedicine',
        status__in=['scheduled', 'confirmed', 'in_progress']
    )
    
    # Role-based filtering
    if role == 'doctor':
        appointments_qs = appointments_qs.filter(doctor=user)
    elif role == 'patient':
        try:
            patient = Patient.objects.get(user_ptr=user)
            appointments_qs = appointments_qs.filter(patient=patient)
        except Patient.DoesNotExist:
            return Response({'error': 'Patient profile not found'}, status=status.HTTP_404_NOT_FOUND)
    elif user.hospital and role not in ('admin', 'ministry_admin'):
        appointments_qs = appointments_qs.filter(hospital=user.hospital)
    
    # Stats
    total_virtual = appointments_qs.count()
    today_virtual = appointments_qs.filter(
        scheduled_at__gte=today_start,
        scheduled_at__lt=today_end
    ).count()
    
    in_progress = appointments_qs.filter(status='in_progress').count()
    upcoming_24h = appointments_qs.filter(
        scheduled_at__gte=now,
        scheduled_at__lt=now + timedelta(hours=24)
    ).count()
    
    # Upcoming appointments
    upcoming = appointments_qs.filter(
        scheduled_at__gte=now
    ).select_related('patient', 'doctor', 'hospital').order_by('scheduled_at')[:10]
    
    upcoming_data = []
    for apt in upcoming:
        upcoming_data.append({
            'id': apt.id,
            'patient_name': apt.patient.full_name if apt.patient else 'N/A',
            'patient_id': apt.patient.patient_id if apt.patient else None,
            'doctor_name': apt.doctor.full_name if apt.doctor else 'N/A',
            'scheduled_at': apt.scheduled_at.isoformat(),
            'status': apt.status,
            'reason': apt.reason or '',
            'can_join': (apt.scheduled_at - now).total_seconds() < 900,  # Can join 15 mins before
        })
    
    return Response({
        'stats': {
            'total_virtual_appointments': total_virtual,
            'today_virtual': today_virtual,
            'in_progress': in_progress,
            'upcoming_24h': upcoming_24h,
        },
        'upcoming_appointments': upcoming_data,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_virtual_appointment(request):
    """
    Create a new telemedicine appointment.
    """
    user = request.user
    
    # Extract data
    patient_id = request.data.get('patient_id')
    doctor_id = request.data.get('doctor_id')
    scheduled_at = request.data.get('scheduled_at')
    reason = request.data.get('reason', '')
    notes = request.data.get('notes', '')
    
    if not all([patient_id, doctor_id, scheduled_at]):
        return Response({'error': 'patient_id, doctor_id, and scheduled_at are required'}, 
                       status=status.HTTP_400_BAD_REQUEST)
    
    try:
        patient = Patient.objects.get(id=patient_id)
        doctor = User.objects.get(id=doctor_id, role__name='doctor')
        
        # Create appointment
        appointment = Appointment.objects.create(
            patient=patient,
            doctor=doctor,
            hospital=doctor.hospital or patient.hospital,
            scheduled_at=scheduled_at,
            appointment_type='telemedicine',
            status='scheduled',
            reason=reason,
            notes=notes,
            created_by=user
        )
        
        # Send notification
        try:
            from .notification_service import notify_appointment_confirmation
            notify_appointment_confirmation(appointment)
        except Exception:
            pass
        
        return Response({
            'success': True,
            'appointment_id': appointment.id,
            'message': 'Virtual appointment created successfully'
        }, status=status.HTTP_201_CREATED)
        
    except Patient.DoesNotExist:
        return Response({'error': 'Patient not found'}, status=status.HTTP_404_NOT_FOUND)
    except User.DoesNotExist:
        return Response({'error': 'Doctor not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_session_token(request, appointment_id):
    """
    Generate a secure session token for joining a telemedicine consultation.
    """
    user = request.user
    
    try:
        appointment = Appointment.objects.select_related('patient', 'doctor').get(id=appointment_id)
        
        # Verify user is participant
        is_doctor = appointment.doctor and appointment.doctor.id == user.id
        is_patient = appointment.patient and hasattr(appointment.patient, 'user_ptr') and appointment.patient.user_ptr.id == user.id
        
        if not (is_doctor or is_patient):
            return Response({'error': 'Access denied. You are not a participant in this consultation.'}, 
                          status=status.HTTP_403_FORBIDDEN)
        
        # Check appointment timing (can join 15 mins before to 2 hours after)
        now = timezone.now()
        time_diff = (appointment.scheduled_at - now).total_seconds()
        
        if time_diff > 900:  # More than 15 mins before
            return Response({'error': f'Consultation starts in {int(time_diff/60)} minutes. You can join 15 minutes before.'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        if time_diff < -7200:  # More than 2 hours after
            return Response({'error': 'This consultation has ended.'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        # Generate secure token
        token = secrets.token_urlsafe(32)
        room_id = hashlib.sha256(f"{appointment.id}_{appointment.scheduled_at}".encode()).hexdigest()[:16]
        
        # Store session
        ACTIVE_SESSIONS[token] = {
            'appointment_id': appointment.id,
            'user_id': user.id,
            'room_id': room_id,
            'role': 'doctor' if is_doctor else 'patient',
            'created_at': now.isoformat(),
            'expires_at': (now + timedelta(hours=3)).isoformat(),
        }
        
        # Update appointment status
        if appointment.status == 'scheduled':
            appointment.status = 'in_progress'
            appointment.save()
        
        return Response({
            'success': True,
            'token': token,
            'room_id': room_id,
            'appointment_id': appointment.id,
            'participant_role': 'doctor' if is_doctor else 'patient',
            'patient_name': appointment.patient.full_name if appointment.patient else 'N/A',
            'doctor_name': appointment.doctor.full_name if appointment.doctor else 'N/A',
        })
        
    except Appointment.DoesNotExist:
        return Response({'error': 'Appointment not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def end_consultation(request, appointment_id):
    """
    End a telemedicine consultation and create visit record.
    """
    user = request.user
    
    try:
        appointment = Appointment.objects.get(id=appointment_id)
        
        # Verify user is doctor
        if not (appointment.doctor and appointment.doctor.id == user.id):
            return Response({'error': 'Only the doctor can end the consultation.'}, 
                          status=status.HTTP_403_FORBIDDEN)
        
        # Get consultation notes
        consultation_notes = request.data.get('consultation_notes', '')
        diagnosis = request.data.get('diagnosis', '')
        treatment_plan = request.data.get('treatment_plan', '')
        
        # Create visit record
        visit = PatientVisit.objects.create(
            patient=appointment.patient,
            hospital=appointment.hospital,
            department=appointment.department,
            doctor=appointment.doctor,
            visit_type='telemedicine',
            visit_date=timezone.now(),
            status='completed',
            chief_complaint=appointment.reason or 'Virtual consultation',
            notes=consultation_notes
        )
        
        # Update appointment
        appointment.status = 'completed'
        appointment.notes = (appointment.notes or '') + f'\n\nConsultation completed. Visit ID: {visit.id}'
        appointment.save()
        
        # Clean up session tokens
        tokens_to_remove = [k for k, v in ACTIVE_SESSIONS.items() if v.get('appointment_id') == appointment_id]
        for token in tokens_to_remove:
            del ACTIVE_SESSIONS[token]
        
        return Response({
            'success': True,
            'visit_id': visit.id,
            'message': 'Consultation ended successfully'
        })
        
    except Appointment.DoesNotExist:
        return Response({'error': 'Appointment not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def verify_session(request):
    """
    Verify a session token is valid.
    """
    token = request.query_params.get('token')
    
    if not token or token not in ACTIVE_SESSIONS:
        return Response({'valid': False, 'error': 'Invalid or expired token'}, 
                       status=status.HTTP_401_UNAUTHORIZED)
    
    session = ACTIVE_SESSIONS[token]
    
    # Check expiration
    expires_at = timezone.datetime.fromisoformat(session['expires_at'])
    if timezone.now() > expires_at:
        del ACTIVE_SESSIONS[token]
        return Response({'valid': False, 'error': 'Session expired'}, 
                       status=status.HTTP_401_UNAUTHORIZED)
    
    return Response({
        'valid': True,
        'session': session
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def consultation_history(request):
    """
    Get telemedicine consultation history.
    """
    user = request.user
    role = user.role.name if user.role else None
    
    # Base queryset
    appointments_qs = Appointment.objects.filter(
        appointment_type='telemedicine',
        status='completed'
    )
    
    # Role-based filtering
    if role == 'doctor':
        appointments_qs = appointments_qs.filter(doctor=user)
    elif role == 'patient':
        try:
            patient = Patient.objects.get(user_ptr=user)
            appointments_qs = appointments_qs.filter(patient=patient)
        except Patient.DoesNotExist:
            return Response({'error': 'Patient profile not found'}, status=status.HTTP_404_NOT_FOUND)
    elif user.hospital and role not in ('admin', 'ministry_admin'):
        appointments_qs = appointments_qs.filter(hospital=user.hospital)
    
    # Get history
    history = appointments_qs.select_related('patient', 'doctor', 'hospital').order_by('-scheduled_at')[:50]
    
    history_data = []
    for apt in history:
        history_data.append({
            'id': apt.id,
            'patient_name': apt.patient.full_name if apt.patient else 'N/A',
            'patient_id': apt.patient.patient_id if apt.patient else None,
            'doctor_name': apt.doctor.full_name if apt.doctor else 'N/A',
            'scheduled_at': apt.scheduled_at.isoformat(),
            'completed_at': apt.updated_at.isoformat(),
            'reason': apt.reason or '',
            'notes': apt.notes or '',
        })
    
    return Response({
        'total': appointments_qs.count(),
        'history': history_data
    })

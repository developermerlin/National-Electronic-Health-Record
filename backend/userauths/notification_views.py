"""
Notification Management API Views.
Endpoints for managing SMS campaigns, templates, and notification history.
"""
from django.utils import timezone
from django.db.models import Count, Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from datetime import timedelta

from .models import Patient, User, Appointment, Hospital
from .notification_service import (
    SMS_TEMPLATES, send_bulk_sms, send_templated_sms,
    send_health_tip, send_appointment_reminders_batch
)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def notification_templates(request):
    """
    Get all available SMS templates.
    """
    user = request.user
    role = user.role.name if user.role else None
    
    if role not in ('admin', 'hospital_admin', 'ministry_admin'):
        return Response({'error': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)
    
    templates = [
        {
            'key': key,
            'template': template,
            'category': _categorize_template(key)
        }
        for key, template in SMS_TEMPLATES.items()
    ]
    
    return Response({'templates': templates})


def _categorize_template(key):
    """Categorize template by key prefix."""
    if key.startswith('appointment'):
        return 'Appointment'
    elif key.startswith('lab'):
        return 'Lab Results'
    elif key.startswith('prescription'):
        return 'Prescription'
    elif key.startswith('invoice') or key.startswith('payment'):
        return 'Billing'
    elif key.startswith('admission') or key.startswith('discharge'):
        return 'Admission'
    elif key.startswith('health') or key.startswith('medication') or key.startswith('followup'):
        return 'Health Education'
    else:
        return 'General'


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_bulk_notification(request):
    """
    Send bulk SMS to filtered patients.
    
    Body:
        {
            "template_key": "health_tip",
            "context": {"message": "Drink 8 glasses of water daily"},
            "filters": {
                "hospital_id": 1,
                "gender": "female",
                "age_min": 18,
                "age_max": 45
            }
        }
    """
    user = request.user
    role = user.role.name if user.role else None
    
    if role not in ('admin', 'hospital_admin', 'ministry_admin', 'doctor', 'nurse'):
        return Response({'error': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)
    
    template_key = request.data.get('template_key')
    context = request.data.get('context', {})
    filters = request.data.get('filters', {})
    
    if not template_key or template_key not in SMS_TEMPLATES:
        return Response({'error': 'Invalid template_key'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Build patient queryset
    patients_qs = Patient.objects.filter(is_active=True, phone__isnull=False).exclude(phone='')
    
    # Apply filters
    if user.hospital and role not in ('admin', 'ministry_admin'):
        patients_qs = patients_qs.filter(hospital=user.hospital)
    
    if filters.get('hospital_id'):
        patients_qs = patients_qs.filter(hospital_id=filters['hospital_id'])
    
    if filters.get('gender'):
        patients_qs = patients_qs.filter(gender=filters['gender'])
    
    if filters.get('age_min') or filters.get('age_max'):
        from datetime import date
        today = date.today()
        if filters.get('age_min'):
            max_birth_date = today.replace(year=today.year - int(filters['age_min']))
            patients_qs = patients_qs.filter(date_of_birth__lte=max_birth_date)
        if filters.get('age_max'):
            min_birth_date = today.replace(year=today.year - int(filters['age_max']))
            patients_qs = patients_qs.filter(date_of_birth__gte=min_birth_date)
    
    # Limit to prevent abuse
    max_recipients = 1000
    if patients_qs.count() > max_recipients:
        return Response(
            {'error': f'Too many recipients ({patients_qs.count()}). Maximum is {max_recipients}.'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Send bulk SMS
    def context_generator(patient):
        ctx = context.copy()
        ctx['patient_name'] = patient.first_name
        ctx['hospital_name'] = patient.hospital.name if patient.hospital else 'the hospital'
        return ctx
    
    sent_count = send_bulk_sms(patients_qs, template_key, context_generator)
    
    return Response({
        'success': True,
        'total_recipients': patients_qs.count(),
        'sent_count': sent_count,
        'message': f'Sent {sent_count} SMS to {patients_qs.count()} patients'
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_custom_sms(request):
    """
    Send custom SMS to specific patients.
    
    Body:
        {
            "patient_ids": [1, 2, 3],
            "message": "Your custom message here"
        }
    """
    user = request.user
    role = user.role.name if user.role else None
    
    if role not in ('admin', 'hospital_admin', 'ministry_admin', 'doctor', 'nurse'):
        return Response({'error': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)
    
    patient_ids = request.data.get('patient_ids', [])
    message = request.data.get('message', '').strip()
    
    if not patient_ids or not message:
        return Response({'error': 'patient_ids and message are required'}, status=status.HTTP_400_BAD_REQUEST)
    
    if len(patient_ids) > 100:
        return Response({'error': 'Maximum 100 recipients per request'}, status=status.HTTP_400_BAD_REQUEST)
    
    if len(message) > 480:
        return Response({'error': 'Message too long (max 480 characters)'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Get patients
    patients = Patient.objects.filter(id__in=patient_ids, phone__isnull=False).exclude(phone='')
    
    # Hospital scoping
    if user.hospital and role not in ('admin', 'ministry_admin'):
        patients = patients.filter(hospital=user.hospital)
    
    # Send SMS
    from .sms_service import send_sms
    sent_count = 0
    for patient in patients:
        if send_sms(patient.phone, f"[NEHR] {message}"):
            sent_count += 1
    
    return Response({
        'success': True,
        'total_recipients': patients.count(),
        'sent_count': sent_count
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def trigger_appointment_reminders(request):
    """
    Manually trigger appointment reminders for next 24 hours.
    Admin/Hospital Admin only.
    """
    user = request.user
    role = user.role.name if user.role else None
    
    if role not in ('admin', 'hospital_admin', 'ministry_admin'):
        return Response({'error': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)
    
    sent_count = send_appointment_reminders_batch()
    
    return Response({
        'success': True,
        'sent_count': sent_count,
        'message': f'Sent {sent_count} appointment reminders'
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def notification_dashboard(request):
    """
    Get notification statistics and recent activity.
    """
    user = request.user
    role = user.role.name if user.role else None
    
    if role not in ('admin', 'hospital_admin', 'ministry_admin'):
        return Response({'error': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)
    
    hospital = user.hospital
    now = timezone.now()
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)
    
    # Patient statistics
    if hospital:
        total_patients = Patient.objects.filter(hospital=hospital, is_active=True).count()
        patients_with_phone = Patient.objects.filter(
            hospital=hospital, is_active=True, phone__isnull=False
        ).exclude(phone='').count()
    else:
        total_patients = Patient.objects.filter(is_active=True).count()
        patients_with_phone = Patient.objects.filter(
            is_active=True, phone__isnull=False
        ).exclude(phone='').count()
    
    # Upcoming appointments (next 7 days)
    upcoming_appointments = Appointment.objects.filter(
        scheduled_at__gte=now,
        scheduled_at__lt=now + timedelta(days=7),
        status__in=['scheduled', 'confirmed']
    )
    if hospital:
        upcoming_appointments = upcoming_appointments.filter(hospital=hospital)
    
    # Appointments needing reminders (next 24 hours)
    tomorrow = now + timedelta(hours=24)
    reminder_needed = upcoming_appointments.filter(
        scheduled_at__gte=tomorrow,
        scheduled_at__lt=tomorrow + timedelta(hours=1)
    ).count()
    
    return Response({
        'patient_stats': {
            'total_patients': total_patients,
            'patients_with_phone': patients_with_phone,
            'sms_enabled_percentage': round((patients_with_phone / total_patients * 100), 1) if total_patients > 0 else 0,
        },
        'appointment_stats': {
            'upcoming_7_days': upcoming_appointments.count(),
            'reminders_needed_24h': reminder_needed,
        },
        'template_categories': [
            'Appointment', 'Lab Results', 'Prescription', 'Billing',
            'Admission', 'Health Education', 'General'
        ],
        'total_templates': len(SMS_TEMPLATES),
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def patient_notification_preferences(request, patient_id):
    """
    Get patient notification preferences.
    """
    try:
        patient = Patient.objects.get(id=patient_id)
        
        # Check access
        user = request.user
        if user.hospital and patient.hospital != user.hospital:
            if user.role.name not in ('admin', 'ministry_admin'):
                return Response({'error': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)
        
        return Response({
            'patient_id': patient.id,
            'patient_name': patient.full_name,
            'phone': patient.phone,
            'email': patient.email,
            'sms_enabled': hasattr(patient, 'sms_notifications_enabled') and patient.sms_notifications_enabled,
            'email_enabled': hasattr(patient, 'email_notifications_enabled') and patient.email_notifications_enabled,
        })
    except Patient.DoesNotExist:
        return Response({'error': 'Patient not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_patient_notification_preferences(request, patient_id):
    """
    Update patient notification preferences.
    """
    try:
        patient = Patient.objects.get(id=patient_id)
        
        # Check access
        user = request.user
        if user.hospital and patient.hospital != user.hospital:
            if user.role.name not in ('admin', 'ministry_admin'):
                return Response({'error': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)
        
        # Update preferences
        if 'sms_enabled' in request.data:
            if hasattr(patient, 'sms_notifications_enabled'):
                patient.sms_notifications_enabled = request.data['sms_enabled']
        
        if 'email_enabled' in request.data:
            if hasattr(patient, 'email_notifications_enabled'):
                patient.email_notifications_enabled = request.data['email_enabled']
        
        patient.save()
        
        return Response({
            'success': True,
            'message': 'Notification preferences updated'
        })
    except Patient.DoesNotExist:
        return Response({'error': 'Patient not found'}, status=status.HTTP_404_NOT_FOUND)

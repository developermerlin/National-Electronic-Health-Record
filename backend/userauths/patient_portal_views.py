from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from datetime import datetime

from userauths.models import User, Role, Patient, Hospital, Appointment, Department, Notification, PatientVisit, LabTest
from userauths.serializer import PatientSerializer, AppointmentSerializer, NotificationSerializer


def _is_patient(user):
    return user.role and user.role.name == 'patient'


# ─────────────────────────────────────────────
# PUBLIC: List hospitals for sign-up dropdown
# ─────────────────────────────────────────────
@api_view(['GET'])
@permission_classes([AllowAny])
def list_hospitals_public(request):
    hospitals = Hospital.objects.filter(is_active=True).values(
        'id', 'name', 'town_city', 'district__name'
    ).order_by('name')
    return Response(list(hospitals))


# ─────────────────────────────────────────────
# PUBLIC: Patient self-registration
# ─────────────────────────────────────────────
@api_view(['POST'])
@permission_classes([AllowAny])
def patient_self_register(request):
    data = request.data
    email        = data.get('email', '').strip().lower()
    password     = data.get('password', '')
    password2    = data.get('password2', '')
    full_name    = data.get('full_name', '').strip()
    phone        = data.get('phone', '').strip()
    date_of_birth = data.get('date_of_birth', '')
    gender       = data.get('gender', '')
    hospital_id  = data.get('hospital_id', '')

    if not all([email, password, password2, full_name, phone, date_of_birth, gender, hospital_id]):
        return Response({'error': 'All fields are required.'}, status=status.HTTP_400_BAD_REQUEST)

    if password != password2:
        return Response({'error': 'Passwords do not match.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        validate_password(password)
    except ValidationError as e:
        return Response({'error': ' '.join(e.messages)}, status=status.HTTP_400_BAD_REQUEST)

    if User.objects.filter(email=email).exists():
        return Response({'error': 'An account with this email already exists.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        hospital = Hospital.objects.get(id=hospital_id, is_active=True)
    except Hospital.DoesNotExist:
        return Response({'error': 'Selected hospital not found.'}, status=status.HTTP_400_BAD_REQUEST)

    patient_role, _ = Role.objects.get_or_create(name='patient')

    name_parts = full_name.split()
    first_name = name_parts[0]
    last_name  = ' '.join(name_parts[1:]) if len(name_parts) > 1 else ''

    user = User.objects.create(
        email=email,
        full_name=full_name,
        phone=phone,
        role=patient_role,
        hospital=hospital,
    )
    user.set_password(password)
    user.save()

    patient = Patient.objects.create(
        user=user,
        first_name=first_name,
        last_name=last_name,
        phone=phone,
        email=email,
        date_of_birth=date_of_birth,
        gender=gender,
        hospital=hospital,
        status='active',
    )

    return Response({
        'message': 'Account created successfully! You can now log in.',
        'patient_id': patient.patient_id,
    }, status=status.HTTP_201_CREATED)


# ─────────────────────────────────────────────
# PATIENT: Own profile
# ─────────────────────────────────────────────
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def patient_own_profile(request):
    if not _is_patient(request.user):
        return Response({'error': 'Not authorized.'}, status=status.HTTP_403_FORBIDDEN)
    try:
        patient = request.user.patient_record
    except Patient.DoesNotExist:
        return Response({'error': 'Patient record not found.'}, status=status.HTTP_404_NOT_FOUND)
    return Response(PatientSerializer(patient, context={'request': request}).data)


# ─────────────────────────────────────────────
# PATIENT: Own appointments
# ─────────────────────────────────────────────
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def patient_own_appointments(request):
    if not _is_patient(request.user):
        return Response({'error': 'Not authorized.'}, status=status.HTTP_403_FORBIDDEN)
    try:
        patient = request.user.patient_record
    except Patient.DoesNotExist:
        return Response({'error': 'Patient record not found.'}, status=status.HTTP_404_NOT_FOUND)

    appointments = (
        Appointment.objects
        .filter(patient=patient)
        .select_related('doctor', 'hospital', 'department')
        .order_by('-scheduled_at')
    )
    return Response(AppointmentSerializer(appointments, many=True).data)


# ─────────────────────────────────────────────
# PATIENT: Request an appointment (pending)
# ─────────────────────────────────────────────
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def patient_book_appointment(request):
    if not _is_patient(request.user):
        return Response({'error': 'Not authorized.'}, status=status.HTTP_403_FORBIDDEN)
    try:
        patient = request.user.patient_record
    except Patient.DoesNotExist:
        return Response({'error': 'Patient record not found.'}, status=status.HTTP_404_NOT_FOUND)

    data               = request.data
    doctor_id          = data.get('doctor_id')
    reason             = data.get('reason', '')
    priority           = data.get('priority', 'normal')
    preferred_date     = data.get('preferred_date', '') or None
    preferred_time_note = data.get('preferred_time_note', '')

    if not doctor_id:
        return Response({'error': 'Please select a doctor.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        doctor = User.objects.get(id=doctor_id, role__name='doctor', is_active=True)
    except User.DoesNotExist:
        return Response({'error': 'Doctor not found.'}, status=status.HTTP_400_BAD_REQUEST)

    # Determine hospital: use doctor's hospital for referral, patient's hospital otherwise
    is_referral = data.get('is_referral', False)
    if is_referral:
        appointment_hospital = doctor.hospital
    else:
        appointment_hospital = patient.hospital

    appointment = Appointment.objects.create(
        patient=patient,
        doctor=doctor,
        hospital=appointment_hospital,
        department=doctor.department,
        preferred_date=preferred_date,
        preferred_time_note=preferred_time_note,
        reason=reason,
        priority=priority,
        status='pending',
        is_referral=bool(is_referral),
        created_by=request.user,
    )

    if doctor.user_ptr_id if hasattr(doctor, 'user_ptr_id') else doctor.id:
        Notification.objects.create(
            user=doctor,
            type='appointment_request',
            title='New Appointment Request',
            message=f"{patient.full_name} has requested an appointment. Reason: {reason or 'Not specified'}",
            appointment=appointment,
        )

    return Response({
        'message': 'Appointment request submitted! The doctor will review and schedule a time.',
        'appointment_id': appointment.id,
    }, status=status.HTTP_201_CREATED)


# ─────────────────────────────────────────────
# PATIENT: Cancel own appointment
# ─────────────────────────────────────────────
@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def patient_cancel_appointment(request, appointment_id):
    if not _is_patient(request.user):
        return Response({'error': 'Not authorized.'}, status=status.HTTP_403_FORBIDDEN)
    try:
        patient = request.user.patient_record
        appointment = Appointment.objects.get(id=appointment_id, patient=patient)
    except (Patient.DoesNotExist, Appointment.DoesNotExist):
        return Response({'error': 'Appointment not found.'}, status=status.HTTP_404_NOT_FOUND)

    if appointment.status not in ('scheduled', 'pending'):
        return Response({'error': 'Only pending or scheduled appointments can be cancelled.'}, status=status.HTTP_400_BAD_REQUEST)

    appointment.status = 'cancelled'
    appointment.cancellation_reason = request.data.get('reason', 'Cancelled by patient')
    from django.utils import timezone
    appointment.cancelled_at = timezone.now()
    appointment.save()
    return Response({'message': 'Appointment cancelled.'})


# ─────────────────────────────────────────────
# PATIENT: Notifications
# ─────────────────────────────────────────────
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def patient_notifications(request):
    if not _is_patient(request.user):
        return Response({'error': 'Not authorized.'}, status=status.HTTP_403_FORBIDDEN)
    notifs = Notification.objects.filter(user=request.user).select_related('appointment', 'appointment__doctor')
    return Response(NotificationSerializer(notifs, many=True).data)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def mark_notification_read(request, notif_id):
    try:
        notif = Notification.objects.get(id=notif_id, user=request.user)
        notif.is_read = True
        notif.save()
        return Response({'message': 'Marked as read.'})
    except Notification.DoesNotExist:
        return Response({'error': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def mark_all_notifications_read(request):
    Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
    return Response({'message': 'All notifications marked as read.'})


# ─────────────────────────────────────────────
# PATIENT: List available doctors
#   GET /portal/doctors/           → own hospital
#   GET /portal/doctors/?hospital_id=X → specific hospital (referral)
# ─────────────────────────────────────────────
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def list_available_doctors(request):
    if not _is_patient(request.user):
        return Response({'error': 'Not authorized.'}, status=status.HTTP_403_FORBIDDEN)

    hospital_id = request.query_params.get('hospital_id')

    if hospital_id:
        # Referral: fetch doctors at a specific hospital
        try:
            hospital = Hospital.objects.get(id=hospital_id, is_active=True)
        except Hospital.DoesNotExist:
            return Response({'error': 'Hospital not found.'}, status=status.HTTP_404_NOT_FOUND)
    else:
        # Default: own registered hospital
        try:
            hospital = request.user.patient_record.hospital
        except Patient.DoesNotExist:
            return Response([])

    doctors = (
        User.objects
        .filter(role__name='doctor', hospital=hospital, is_active=True)
        .select_related('department')
        .values('id', 'full_name', 'department__name', 'department__id')
        .order_by('full_name')
    )
    return Response({
        'hospital_id': hospital.id,
        'hospital_name': hospital.name,
        'doctors': list(doctors),
    })


# ─────────────────────────────────────────────
# PATIENT: Medical history (own visits)
# ─────────────────────────────────────────────
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def patient_medical_history(request):
    if not _is_patient(request.user):
        return Response({'error': 'Not authorized.'}, status=status.HTTP_403_FORBIDDEN)
    try:
        patient = request.user.patient_record
    except Patient.DoesNotExist:
        return Response({'error': 'Patient record not found.'}, status=status.HTTP_404_NOT_FOUND)

    visits = (
        PatientVisit.objects
        .filter(patient=patient)
        .select_related('hospital', 'department', 'doctor', 'clinical_note')
        .prefetch_related('vitals')
        .order_by('-visit_date')
    )

    history = []
    for v in visits:
        note = getattr(v, 'clinical_note', None)
        vitals = getattr(v, 'vitals', None)
        history.append({
            'id': v.id,
            'visit_date': v.visit_date,
            'visit_type': v.visit_type,
            'visit_type_display': v.get_visit_type_display(),
            'status': v.status,
            'status_display': v.get_status_display(),
            'hospital': v.hospital.name if v.hospital else None,
            'department': v.department.name if v.department else None,
            'doctor': v.doctor.full_name if v.doctor else None,
            'chief_complaint': v.chief_complaint,
            'discharge_date': v.discharge_date,
            'discharge_notes': v.discharge_notes or None,
            'diagnosis': note.diagnosis if note else None,
            'secondary_diagnoses': note.secondary_diagnoses or None if note else None,
            'treatment_plan': note.treatment_plan or None if note else None,
            'prescriptions': note.prescriptions or None if note else None,
            'follow_up_date': note.follow_up_date if note else None,
            'follow_up_instructions': note.follow_up_instructions or None if note else None,
            'vitals': {
                'blood_pressure': vitals.blood_pressure if vitals else None,
                'heart_rate': vitals.heart_rate if vitals else None,
                'temperature': str(vitals.temperature_celsius) if vitals and vitals.temperature_celsius else None,
                'weight_kg': str(vitals.weight_kg) if vitals and vitals.weight_kg else None,
                'oxygen_saturation': str(vitals.oxygen_saturation) if vitals and vitals.oxygen_saturation else None,
            } if vitals else None,
        })

    return Response(history)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def patient_lab_tests(request):
    if not _is_patient(request.user):
        return Response({'error': 'Not authorized.'}, status=status.HTTP_403_FORBIDDEN)
    try:
        patient = request.user.patient_record
    except Patient.DoesNotExist:
        return Response({'error': 'Patient record not found.'}, status=status.HTTP_404_NOT_FOUND)

    qs = LabTest.objects.filter(patient=patient).select_related('visit', 'ordered_by', 'completed_by', 'sample_collected_by', 'hospital').order_by('-created_at')
    data = []
    for t in qs:
        data.append({
            'id': t.id,
            'test_name': t.test_name,
            'test_category': t.test_category,
            'test_category_display': t.get_test_category_display(),
            'priority': t.priority,
            'priority_display': t.get_priority_display(),
            'status': t.status,
            'status_display': t.get_status_display(),
            'sample_type': t.sample_type,
            'sample_type_display': t.get_sample_type_display(),
            'clinical_info': t.clinical_info,
            'result_value': t.result_value,
            'result_unit': t.result_unit,
            'reference_range': t.reference_range,
            'result_notes': t.result_notes,
            'is_critical': t.is_critical,
            'doctor_notified': t.doctor_notified,
            'sample_collected_at': t.sample_collected_at.isoformat() if t.sample_collected_at else None,
            'completed_at': t.completed_at.isoformat() if t.completed_at else None,
            'created_at': t.created_at.isoformat(),
            'hospital_name': t.hospital.name if t.hospital else None,
            'ordered_by_name': t.ordered_by.get_full_name() or t.ordered_by.username if t.ordered_by else None,
        })
    return Response(data)

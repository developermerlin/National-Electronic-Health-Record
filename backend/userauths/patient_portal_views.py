from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from datetime import datetime

from userauths.models import User, Role, Patient, Hospital, Appointment, Department, Notification
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
    return Response(PatientSerializer(patient).data)


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

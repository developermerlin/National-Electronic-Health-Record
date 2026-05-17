from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q
from django.utils import timezone
from datetime import datetime, timedelta

from userauths.models import Appointment, Notification, Patient, DoctorAvailability, DoctorUnavailableDate, PatientVisit
from userauths.serializer import AppointmentSerializer, NotificationSerializer


def _is_doctor(user):
    return user.role and user.role.name == 'doctor'


def _find_overlaps(doctor, scheduled_at, duration_minutes, exclude_id=None):
    """Return any of the doctor's confirmed appointments that overlap the proposed slot."""
    end_at = scheduled_at + timedelta(minutes=duration_minutes)
    qs = Appointment.objects.filter(
        doctor=doctor,
        status__in=['scheduled', 'checked_in', 'in_consultation'],
    ).exclude(scheduled_at__isnull=True)
    if exclude_id:
        qs = qs.exclude(id=exclude_id)
    conflicts = []
    for appt in qs:
        appt_end = appt.scheduled_at + timedelta(minutes=appt.duration_minutes)
        if appt.scheduled_at < end_at and appt_end > scheduled_at:
            conflicts.append(appt)
    return conflicts


# ─────────────────────────────────────────────
# DOCTOR: List pending appointment requests
# ─────────────────────────────────────────────
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def doctor_appointment_requests(request):
    if not _is_doctor(request.user):
        return Response({'error': 'Not authorized.'}, status=status.HTTP_403_FORBIDDEN)

    filter_status = request.query_params.get('status', 'pending')
    qs = (
        Appointment.objects
        .filter(doctor=request.user, status=filter_status)
        .select_related('patient', 'hospital', 'department')
        .order_by('-created_at')
    )
    return Response(AppointmentSerializer(qs, many=True).data)


# ─────────────────────────────────────────────
# DOCTOR: All requests (any status)
# ─────────────────────────────────────────────
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def doctor_all_requests(request):
    if not _is_doctor(request.user):
        return Response({'error': 'Not authorized.'}, status=status.HTTP_403_FORBIDDEN)

    qs = (
        Appointment.objects
        .filter(doctor=request.user)
        .exclude(status__in=['checked_in', 'in_consultation', 'completed'])
        .select_related('patient', 'hospital', 'department')
        .order_by('-created_at')
    )
    return Response(AppointmentSerializer(qs, many=True).data)


# ─────────────────────────────────────────────
# DOCTOR: Schedule (accept) a pending request
# ─────────────────────────────────────────────
@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def doctor_schedule_appointment(request, appointment_id):
    if not _is_doctor(request.user):
        return Response({'error': 'Not authorized.'}, status=status.HTTP_403_FORBIDDEN)

    try:
        appointment = Appointment.objects.select_related('patient', 'patient__user').get(
            id=appointment_id, doctor=request.user
        )
    except Appointment.DoesNotExist:
        return Response({'error': 'Appointment request not found.'}, status=status.HTTP_404_NOT_FOUND)

    if appointment.status not in ('pending',):
        return Response({'error': 'Only pending requests can be scheduled.'}, status=status.HTTP_400_BAD_REQUEST)

    data             = request.data
    scheduled_date   = data.get('scheduled_date', '')
    scheduled_time   = data.get('scheduled_time', '')
    duration_minutes = int(data.get('duration_minutes', appointment.duration_minutes or 30))
    notes            = data.get('notes', '')

    if not scheduled_date or not scheduled_time:
        return Response({'error': 'Date and time are required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        scheduled_at = datetime.strptime(f"{scheduled_date} {scheduled_time}", "%Y-%m-%d %H:%M")
        scheduled_at = timezone.make_aware(scheduled_at) if timezone.is_naive(scheduled_at) else scheduled_at
    except ValueError:
        return Response({'error': 'Invalid date or time format.'}, status=status.HTTP_400_BAD_REQUEST)

    if scheduled_at <= timezone.now():
        return Response({'error': 'Scheduled time must be in the future.'}, status=status.HTTP_400_BAD_REQUEST)

    conflicts = _find_overlaps(request.user, scheduled_at, duration_minutes, exclude_id=appointment_id)
    if conflicts:
        c = conflicts[0]
        c_end = c.scheduled_at + timedelta(minutes=c.duration_minutes)
        return Response({
            'error': 'Time slot conflicts with an existing appointment.',
            'conflict': {
                'patient': c.patient.full_name,
                'starts_at': c.scheduled_at.strftime('%Y-%m-%d %H:%M'),
                'ends_at':   c_end.strftime('%Y-%m-%d %H:%M'),
            }
        }, status=status.HTTP_409_CONFLICT)

    appointment.scheduled_at     = scheduled_at
    appointment.duration_minutes = duration_minutes
    appointment.status           = 'scheduled'
    if notes:
        appointment.notes = notes
    appointment.save()

    patient_user = getattr(appointment.patient, 'user', None)
    if patient_user:
        dt_str = scheduled_at.strftime('%A, %d %B %Y at %H:%M')
        Notification.objects.create(
            user=patient_user,
            type='appointment_confirmed',
            title='Appointment Confirmed',
            message=(
                f"Dr. {request.user.full_name} has confirmed your appointment request.\n"
                f"Date & Time: {dt_str}\n"
                f"Duration: {duration_minutes} minutes\n"
                f"Hospital: {appointment.hospital}"
            ),
            appointment=appointment,
        )

    return Response({
        'message': 'Appointment scheduled successfully.',
        'appointment': AppointmentSerializer(appointment).data,
    })


# ─────────────────────────────────────────────
# DOCTOR: Decline a pending request
# ─────────────────────────────────────────────
@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def doctor_decline_appointment(request, appointment_id):
    if not _is_doctor(request.user):
        return Response({'error': 'Not authorized.'}, status=status.HTTP_403_FORBIDDEN)

    try:
        appointment = Appointment.objects.select_related('patient', 'patient__user').get(
            id=appointment_id, doctor=request.user
        )
    except Appointment.DoesNotExist:
        return Response({'error': 'Appointment request not found.'}, status=status.HTTP_404_NOT_FOUND)

    if appointment.status != 'pending':
        return Response({'error': 'Only pending requests can be declined.'}, status=status.HTTP_400_BAD_REQUEST)

    reason = request.data.get('reason', '')
    appointment.status         = 'declined'
    appointment.decline_reason = reason
    appointment.save()

    patient_user = getattr(appointment.patient, 'user', None)
    if patient_user:
        Notification.objects.create(
            user=patient_user,
            type='appointment_declined',
            title='Appointment Request Declined',
            message=(
                f"Dr. {request.user.full_name} was unable to accept your appointment request.\n"
                + (f"Reason: {reason}" if reason else "No reason provided.")
                + "\nPlease request a different time or contact the hospital reception."
            ),
            appointment=appointment,
        )

    return Response({'message': 'Appointment request declined.'})


# ─────────────────────────────────────────────
# DOCTOR: Check available time slots for a date
# ─────────────────────────────────────────────
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def doctor_available_slots(request):
    if not _is_doctor(request.user):
        return Response({'error': 'Not authorized.'}, status=status.HTTP_403_FORBIDDEN)

    date_str         = request.query_params.get('date', '')
    duration_minutes = int(request.query_params.get('duration', 30))

    if not date_str:
        return Response({'error': 'Date is required.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
    except ValueError:
        return Response({'error': 'Invalid date format.'}, status=status.HTTP_400_BAD_REQUEST)

    day_of_week = target_date.weekday()  # 0=Monday … 6=Sunday

    # Check if this date is explicitly blocked
    if DoctorUnavailableDate.objects.filter(doctor=request.user, date=target_date).exists():
        return Response({
            'available': [],
            'booked': [],
            'unavailable': True,
            'reason': 'Doctor is unavailable on this date.',
        })

    # Look up the doctor's availability for this day of week
    try:
        avail = DoctorAvailability.objects.get(doctor=request.user, day_of_week=day_of_week)
    except DoctorAvailability.DoesNotExist:
        avail = None

    if avail is None or not avail.is_active:
        return Response({
            'available': [],
            'booked': [],
            'unavailable': True,
            'reason': 'Doctor does not accept appointments on this day.',
        })

    # Generate slots within the doctor's window using their slot_duration
    slot_mins  = avail.slot_duration
    start      = datetime.combine(target_date, avail.start_time)
    end        = datetime.combine(target_date, avail.end_time)
    ALL_SLOTS  = []
    cursor     = start
    while cursor + timedelta(minutes=duration_minutes) <= end:
        ALL_SLOTS.append(cursor.strftime('%H:%M'))
        cursor += timedelta(minutes=slot_mins)

    available = []
    booked    = []

    for slot in ALL_SLOTS:
        try:
            slot_dt = datetime.strptime(f"{date_str} {slot}", "%Y-%m-%d %H:%M")
            slot_dt = timezone.make_aware(slot_dt)
        except ValueError:
            continue

        if slot_dt <= timezone.now():
            booked.append({'time': slot, 'reason': 'past'})
            continue

        conflicts = _find_overlaps(request.user, slot_dt, duration_minutes)
        if conflicts:
            booked.append({'time': slot, 'reason': 'conflict'})
        else:
            available.append(slot)

    return Response({
        'available': available,
        'booked': booked,
        'window': {
            'start': avail.start_time.strftime('%H:%M'),
            'end':   avail.end_time.strftime('%H:%M'),
            'slot_duration': slot_mins,
        },
    })


# ─────────────────────────────────────────────
# DOCTOR: Own notifications
# ─────────────────────────────────────────────
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def doctor_notifications(request):
    if not _is_doctor(request.user):
        return Response({'error': 'Not authorized.'}, status=status.HTTP_403_FORBIDDEN)
    notifs = Notification.objects.filter(user=request.user).select_related('appointment', 'appointment__patient')
    return Response(NotificationSerializer(notifs, many=True).data)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def doctor_mark_notification_read(request, notif_id):
    try:
        notif = Notification.objects.get(id=notif_id, user=request.user)
        notif.is_read = True
        notif.save()
        return Response({'message': 'Marked as read.'})
    except Notification.DoesNotExist:
        return Response({'error': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def doctor_mark_all_read(request):
    Notification.objects.filter(user=request.user, is_read=False).update(is_read=True)
    return Response({'message': 'All notifications marked as read.'})


# ─────────────────────────────────────────────
# DOCTOR: Dashboard stats (doctor-scoped)
# ─────────────────────────────────────────────
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def doctor_dashboard(request):
    """Single endpoint that returns all data needed for the doctor dashboard."""
    if not _is_doctor(request.user):
        return Response({'error': 'Not authorized.'}, status=status.HTTP_403_FORBIDDEN)

    # Allow viewing dashboard for a specific date (default to today)
    date_param = request.query_params.get('date')
    if date_param:
        try:
            today = datetime.strptime(date_param, '%Y-%m-%d').date()
        except ValueError:
            today = timezone.now().date()
    else:
        today = timezone.now().date()

    doctor = request.user

    # Repair orphaned triaged visits (no linked appointment) for this doctor today
    orphaned_visits = PatientVisit.objects.filter(
        doctor=doctor,
        visit_date__date=today,
        status='triaged',
        appointment__isnull=True,
    ).select_related('patient', 'hospital', 'department', 'registered_by')
    for visit in orphaned_visits:
        try:
            appt = Appointment.objects.create(
                patient=visit.patient,
                doctor=visit.doctor,
                hospital=visit.hospital,
                department=visit.department,
                scheduled_at=visit.visit_date,
                status='checked_in',
                checked_in_at=visit.visit_date,
                checked_in_by=visit.registered_by,
                reason=visit.chief_complaint or 'Walk-in visit',
                priority='normal',
                created_by=visit.registered_by,
            )
            visit.appointment = appt
            visit.save(update_fields=['appointment'])
        except Exception:
            pass

    # Today's appointments — OR filter so walk-in and early check-ins are included
    today_qs = Appointment.objects.filter(doctor=doctor).filter(
        Q(scheduled_at__date=today) | Q(checked_in_at__date=today)
    )
    
    # Upcoming appointments (future dates, not today)
    upcoming_qs = Appointment.objects.filter(
        doctor=doctor, 
        scheduled_at__date__gt=today,
        status__in=['scheduled', 'pending']
    ).order_by('scheduled_at')[:5]  # Limit to 5 upcoming

    today_stats = {
        'total':           today_qs.count(),
        'scheduled':       today_qs.filter(status='scheduled').count(),
        'waiting':         today_qs.filter(status='checked_in').count(),
        'in_consultation': today_qs.filter(status='in_consultation').count(),
        'completed':       today_qs.filter(status='completed').count(),
        'cancelled':       today_qs.filter(status='cancelled').count(),
        'no_show':         today_qs.filter(status='no_show').count(),
    }

    pending_count = Appointment.objects.filter(doctor=doctor, status='pending').count()
    
    # Pending appointments list for the dashboard
    pending_qs = (
        Appointment.objects
        .filter(doctor=doctor, status='pending')
        .select_related('patient', 'hospital', 'department')
        .order_by('created_at')
    )

    queue_qs = (
        today_qs
        .filter(status__in=['scheduled', 'checked_in', 'in_consultation'])
        .select_related('patient', 'hospital', 'department')
        .order_by('scheduled_at')
    )

    # All today's appointments (including completed) for display
    all_today_qs = (
        today_qs
        .select_related('patient', 'hospital', 'department')
        .order_by('scheduled_at')
    )

    # Today's completed appointments
    today_completed_qs = (
        today_qs
        .filter(status='completed')
        .select_related('patient', 'hospital', 'department')
        .order_by('-completed_at')
    )
    
    # Cancelled appointments (for the cancelled tab)
    cancelled_qs = (
        Appointment.objects
        .filter(doctor=doctor, status='cancelled')
        .select_related('patient', 'hospital', 'department')
        .order_by('-updated_at')[:20]
    )
    
    # In consultation appointments (for the in_progress tab)
    in_consultation_qs = (
        Appointment.objects
        .filter(doctor=doctor, status='in_consultation')
        .select_related('patient', 'hospital', 'department')
        .order_by('scheduled_at')
    )
    
    # All completed appointments (for history)
    all_completed_qs = (
        Appointment.objects
        .filter(doctor=doctor, status='completed')
        .select_related('patient', 'hospital', 'department')
        .order_by('-completed_at')[:50]
    )

    return Response({
        'today':             today_stats,
        'pending_requests':  pending_count,
        'pending_list':      AppointmentSerializer(pending_qs, many=True).data,
        'cancelled':         AppointmentSerializer(cancelled_qs, many=True).data,
        'in_consultation':   AppointmentSerializer(in_consultation_qs, many=True).data,
        'all_completed':     AppointmentSerializer(all_completed_qs, many=True).data,
        'queue':             AppointmentSerializer(queue_qs, many=True).data,
        'all_today':         AppointmentSerializer(all_today_qs, many=True).data,
        'today_completed':   AppointmentSerializer(today_completed_qs, many=True).data,
        'upcoming':          AppointmentSerializer(upcoming_qs, many=True).data,
        'debug_info': {
            'doctor_id': doctor.id,
            'doctor_name': doctor.full_name,
            'today_date': str(today),
        }
    })

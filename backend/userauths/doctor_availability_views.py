from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from userauths.models import DoctorAvailability, DoctorUnavailableDate
from userauths.serializer import DoctorAvailabilitySerializer, DoctorUnavailableDateSerializer


def _is_doctor(user):
    return user.role and user.role.name == 'doctor'


# ─────────────────────────────────────────────
# GET / BULK-UPSERT weekly schedule
# ─────────────────────────────────────────────
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def doctor_availability(request):
    """
    GET  — return the doctor's full weekly schedule (7 rows, one per day).
    POST — accept a list of day objects and upsert each one.
    """
    if not _is_doctor(request.user):
        return Response({'error': 'Not authorized.'}, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'GET':
        rows = DoctorAvailability.objects.filter(doctor=request.user)
        return Response(DoctorAvailabilitySerializer(rows, many=True).data)

    # POST — expect a list of day configs
    days = request.data if isinstance(request.data, list) else request.data.get('days', [])
    if not days:
        return Response({'error': 'No day data provided.'}, status=status.HTTP_400_BAD_REQUEST)

    saved = []
    errors = []
    for item in days:
        day_of_week = item.get('day_of_week')
        if day_of_week is None:
            errors.append({'error': 'day_of_week is required.'})
            continue

        try:
            obj, _ = DoctorAvailability.objects.update_or_create(
                doctor=request.user,
                day_of_week=int(day_of_week),
                defaults={
                    'start_time':    item.get('start_time',    '08:00'),
                    'end_time':      item.get('end_time',      '17:00'),
                    'slot_duration': int(item.get('slot_duration', 30)),
                    'is_active':     bool(item.get('is_active', False)),
                },
            )
            saved.append(DoctorAvailabilitySerializer(obj).data)
        except Exception as exc:
            errors.append({'day_of_week': day_of_week, 'error': str(exc)})

    if errors and not saved:
        return Response({'errors': errors}, status=status.HTTP_400_BAD_REQUEST)

    return Response({'saved': saved, 'errors': errors})


# ─────────────────────────────────────────────
# UPDATE a single day's availability
# ─────────────────────────────────────────────
@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def doctor_availability_day(request, day_of_week):
    """PATCH a single day entry — creates if missing."""
    if not _is_doctor(request.user):
        return Response({'error': 'Not authorized.'}, status=status.HTTP_403_FORBIDDEN)

    if day_of_week not in range(7):
        return Response({'error': 'day_of_week must be 0–6.'}, status=status.HTTP_400_BAD_REQUEST)

    obj, _ = DoctorAvailability.objects.get_or_create(
        doctor=request.user,
        day_of_week=day_of_week,
        defaults={'start_time': '08:00', 'end_time': '17:00'},
    )
    ser = DoctorAvailabilitySerializer(obj, data=request.data, partial=True)
    if ser.is_valid():
        ser.save()
        return Response(ser.data)
    return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)


# ─────────────────────────────────────────────
# BLOCKED DATES — list, add, remove
# ─────────────────────────────────────────────
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def doctor_unavailable_dates(request):
    """
    GET  — list all blocked dates.
    POST — add a new blocked date (body: {date, reason?}).
    """
    if not _is_doctor(request.user):
        return Response({'error': 'Not authorized.'}, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'GET':
        rows = DoctorUnavailableDate.objects.filter(doctor=request.user)
        return Response(DoctorUnavailableDateSerializer(rows, many=True).data)

    ser = DoctorUnavailableDateSerializer(data=request.data)
    if ser.is_valid():
        ser.save(doctor=request.user)
        return Response(ser.data, status=status.HTTP_201_CREATED)
    return Response(ser.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def doctor_unavailable_date_delete(request, date_id):
    """DELETE a specific blocked date."""
    if not _is_doctor(request.user):
        return Response({'error': 'Not authorized.'}, status=status.HTTP_403_FORBIDDEN)

    try:
        obj = DoctorUnavailableDate.objects.get(id=date_id, doctor=request.user)
        obj.delete()
        return Response({'message': 'Blocked date removed.'})
    except DoctorUnavailableDate.DoesNotExist:
        return Response({'error': 'Not found.'}, status=status.HTTP_404_NOT_FOUND)


# ─────────────────────────────────────────────
# PUBLIC: get a doctor's available days (for patient booking page)
# ─────────────────────────────────────────────
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def public_doctor_schedule(request, doctor_id):
    """
    Returns the active days and their time windows for a given doctor.
    Used by the patient booking page to guide preferred-date selection.
    """
    rows = DoctorAvailability.objects.filter(
        doctor_id=doctor_id, is_active=True
    )
    blocked = DoctorUnavailableDate.objects.filter(doctor_id=doctor_id).values_list('date', flat=True)
    return Response({
        'schedule': DoctorAvailabilitySerializer(rows, many=True).data,
        'blocked_dates': list(blocked),
    })

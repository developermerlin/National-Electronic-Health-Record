from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from django.db.models import Q

from userauths.models import ClinicalNote, PatientVisit, Patient


ALLOWED_ROLES = ('pharmacist', 'admin', 'hospital_admin')


def _check_role(user):
    return user.role and user.role.name in ALLOWED_ROLES


def _serialize_note(note):
    visit   = note.visit
    patient = visit.patient
    return {
        'note_id':       note.id,
        'visit_id':      visit.id,
        'visit_date':    visit.visit_date.isoformat(),
        'visit_type':    visit.get_visit_type_display(),
        'chief_complaint': visit.chief_complaint,
        # Patient
        'patient_id':       patient.id,
        'patient_name':     patient.full_name,
        'patient_code':     patient.patient_id,
        'patient_dob':      patient.date_of_birth.isoformat() if patient.date_of_birth else None,
        'patient_gender':   patient.gender,
        'patient_allergies': patient.allergies or '',
        'patient_blood_type': patient.blood_type or '',
        # Doctor
        'doctor_name':   note.doctor.full_name if note.doctor else 'Unknown',
        'doctor_id':     note.doctor.id if note.doctor else None,
        # Prescription
        'diagnosis':      note.diagnosis,
        'prescriptions':  note.prescriptions,
        'treatment_plan': note.treatment_plan,
        'follow_up_date': note.follow_up_date.isoformat() if note.follow_up_date else None,
        'follow_up_instructions': note.follow_up_instructions,
        # Dispensing
        'is_dispensed':  note.is_dispensed,
        'dispensed_at':  note.dispensed_at.isoformat() if note.dispensed_at else None,
        'dispensed_by':  note.dispensed_by.full_name if note.dispensed_by else None,
        'pharmacy_note': note.pharmacy_note,
        'created_at':    note.created_at.isoformat(),
    }


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def pharmacist_dashboard(request):
    """Aggregated stats + recent prescription queue for the pharmacist's hospital."""
    user = request.user
    if not _check_role(user):
        return Response({'error': 'Not authorized.'}, status=status.HTTP_403_FORBIDDEN)

    hospital = user.hospital
    if not hospital:
        return Response({'error': 'You are not assigned to a hospital.'}, status=status.HTTP_400_BAD_REQUEST)

    today = timezone.now().date()

    base_qs = ClinicalNote.objects.filter(
        visit__hospital=hospital,
    ).exclude(prescriptions='').select_related(
        'visit', 'visit__patient', 'doctor', 'dispensed_by'
    )

    total           = base_qs.count()
    pending         = base_qs.filter(is_dispensed=False).count()
    dispensed_today = base_qs.filter(is_dispensed=True, dispensed_at__date=today).count()
    today_queue     = base_qs.filter(visit__visit_date__date=today).count()

    # Most recent 8 pending first, then recent dispensed
    recent_pending   = list(base_qs.filter(is_dispensed=False).order_by('-visit__visit_date')[:8])
    recent_dispensed = list(base_qs.filter(is_dispensed=True).order_by('-dispensed_at')[:5])

    return Response({
        'stats': {
            'total_prescriptions': total,
            'pending_dispense':    pending,
            'dispensed_today':     dispensed_today,
            'today_queue':         today_queue,
        },
        'pending_queue':    [_serialize_note(n) for n in recent_pending],
        'recent_dispensed': [_serialize_note(n) for n in recent_dispensed],
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def pharmacist_prescriptions(request):
    """Full paginated prescription list with optional filters."""
    user = request.user
    if not _check_role(user):
        return Response({'error': 'Not authorized.'}, status=status.HTTP_403_FORBIDDEN)

    hospital = user.hospital
    if not hospital:
        return Response({'error': 'Not assigned to a hospital.'}, status=status.HTTP_400_BAD_REQUEST)

    qs = ClinicalNote.objects.filter(
        visit__hospital=hospital,
    ).exclude(prescriptions='').select_related(
        'visit', 'visit__patient', 'doctor', 'dispensed_by'
    ).order_by('-visit__visit_date')

    # Filters
    dispensed = request.query_params.get('dispensed')
    if dispensed == 'true':
        qs = qs.filter(is_dispensed=True)
    elif dispensed == 'false':
        qs = qs.filter(is_dispensed=False)

    date_filter = request.query_params.get('date')
    if date_filter:
        qs = qs.filter(visit__visit_date__date=date_filter)

    search = request.query_params.get('search', '').strip()
    if search:
        qs = qs.filter(
            Q(visit__patient__first_name__icontains=search) |
            Q(visit__patient__last_name__icontains=search) |
            Q(visit__patient__patient_id__icontains=search)
        )

    patient_id = request.query_params.get('patient', '').strip()
    if patient_id:
        qs = qs.filter(visit__patient__id=patient_id)

    return Response([_serialize_note(n) for n in qs[:100]])


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def pharmacist_dispense(request, note_id):
    """Mark a clinical note's prescription as dispensed."""
    user = request.user
    if not _check_role(user):
        return Response({'error': 'Not authorized.'}, status=status.HTTP_403_FORBIDDEN)

    try:
        note = ClinicalNote.objects.select_related('visit__hospital').get(id=note_id)
    except ClinicalNote.DoesNotExist:
        return Response({'error': 'Prescription not found.'}, status=status.HTTP_404_NOT_FOUND)

    if note.visit.hospital != user.hospital and user.role.name not in ('admin', 'ministry_admin'):
        return Response({'error': 'This prescription belongs to a different hospital.'}, status=status.HTTP_403_FORBIDDEN)

    if note.is_dispensed:
        return Response({'error': 'This prescription has already been dispensed.'}, status=status.HTTP_400_BAD_REQUEST)

    pharmacy_note = request.data.get('pharmacy_note', '').strip()

    note.is_dispensed  = True
    note.dispensed_at  = timezone.now()
    note.dispensed_by  = user
    note.pharmacy_note = pharmacy_note
    note.save(update_fields=['is_dispensed', 'dispensed_at', 'dispensed_by', 'pharmacy_note'])

    return Response({
        'message':    'Prescription dispensed successfully.',
        'note_id':    note.id,
        'dispensed_at': note.dispensed_at.isoformat(),
        'dispensed_by': user.full_name,
    })


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def pharmacist_undispense(request, note_id):
    """Reverse a dispense (e.g., data entry error)."""
    user = request.user
    if not user.role or user.role.name not in ('pharmacist', 'admin'):
        return Response({'error': 'Not authorized.'}, status=status.HTTP_403_FORBIDDEN)

    try:
        note = ClinicalNote.objects.get(id=note_id)
    except ClinicalNote.DoesNotExist:
        return Response({'error': 'Prescription not found.'}, status=status.HTTP_404_NOT_FOUND)

    note.is_dispensed  = False
    note.dispensed_at  = None
    note.dispensed_by  = None
    note.save(update_fields=['is_dispensed', 'dispensed_at', 'dispensed_by'])

    return Response({'message': 'Dispense reversed.'})

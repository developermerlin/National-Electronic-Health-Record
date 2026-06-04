from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone
from django.shortcuts import get_object_or_404

from userauths.models import Ward, Bed, InpatientAdmission, PatientVisit, Hospital, NursingNote
from userauths.serializer import WardSerializer, BedSerializer, InpatientAdmissionSerializer, InpatientAdmissionWriteSerializer


def _role(user):
    return user.role.name if user.role else None


# ═══════════════════════════════════════════════════════════════
#  WARD CRUD
# ═══════════════════════════════════════════════════════════════

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def ward_list_create(request):
    role = _role(request.user)
    if role not in ('hospital_admin', 'admin', 'ministry_admin', 'doctor', 'nurse', 'receptionist'):
        return Response({'detail': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)

    hospital = request.user.hospital
    if not hospital:
        return Response({'detail': 'You are not assigned to a hospital.'}, status=status.HTTP_400_BAD_REQUEST)

    if request.method == 'GET':
        qs = Ward.objects.filter(hospital=hospital, is_active=True).select_related('department', 'hospital')
        return Response(WardSerializer(qs, many=True).data)

    # POST
    if role not in ('hospital_admin', 'admin', 'ministry_admin'):
        return Response({'detail': 'Only hospital admins can create wards.'}, status=status.HTTP_403_FORBIDDEN)
    data = request.data.copy()
    data['hospital'] = hospital.id
    data['created_by'] = request.user.id
    serializer = WardSerializer(data=data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def ward_detail(request, ward_id):
    role = _role(request.user)
    ward = get_object_or_404(Ward, pk=ward_id)

    if request.method == 'GET':
        if role not in ('hospital_admin', 'admin', 'ministry_admin', 'doctor', 'nurse', 'receptionist'):
            return Response({'detail': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)
        return Response(WardSerializer(ward).data)

    if role not in ('hospital_admin', 'admin', 'ministry_admin'):
        return Response({'detail': 'Only hospital admins can manage wards.'}, status=status.HTTP_403_FORBIDDEN)

    if request.method in ('PUT', 'PATCH'):
        serializer = WardSerializer(ward, data=request.data, partial=(request.method == 'PATCH'))
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # DELETE — soft delete
    ward.is_active = False
    ward.status = 'inactive'
    ward.save()
    return Response({'detail': 'Ward deactivated.'}, status=status.HTTP_200_OK)


# ═══════════════════════════════════════════════════════════════
#  BED CRUD
# ═══════════════════════════════════════════════════════════════

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def bed_list_create(request):
    role = _role(request.user)
    if role not in ('hospital_admin', 'admin', 'ministry_admin', 'doctor', 'nurse', 'receptionist'):
        return Response({'detail': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)

    ward_id = request.query_params.get('ward') or request.data.get('ward')
    if request.method == 'GET':
        qs = Bed.objects.filter(is_active=True).select_related('ward__hospital')
        if ward_id:
            qs = qs.filter(ward_id=ward_id)
        if request.user.hospital:
            qs = qs.filter(ward__hospital=request.user.hospital)
        return Response(BedSerializer(qs, many=True).data)

    # POST
    if role not in ('hospital_admin', 'admin', 'ministry_admin'):
        return Response({'detail': 'Only hospital admins can create beds.'}, status=status.HTTP_403_FORBIDDEN)
    serializer = BedSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAuthenticated])
def bed_detail(request, bed_id):
    role = _role(request.user)
    bed = get_object_or_404(Bed, pk=bed_id)

    if request.method == 'GET':
        return Response(BedSerializer(bed).data)

    if role not in ('hospital_admin', 'admin', 'ministry_admin'):
        return Response({'detail': 'Only hospital admins can manage beds.'}, status=status.HTTP_403_FORBIDDEN)

    if request.method in ('PUT', 'PATCH'):
        serializer = BedSerializer(bed, data=request.data, partial=(request.method == 'PATCH'))
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    bed.is_active = False
    bed.status = 'maintenance'
    bed.save()
    return Response({'detail': 'Bed deactivated.'}, status=status.HTTP_200_OK)


# ═══════════════════════════════════════════════════════════════
#  ADMISSION
# ═══════════════════════════════════════════════════════════════

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def admission_list_create(request):
    role = _role(request.user)
    if role not in ('hospital_admin', 'admin', 'ministry_admin', 'doctor', 'nurse', 'receptionist'):
        return Response({'detail': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)

    hospital = request.user.hospital
    if request.method == 'GET':
        status_filter = request.query_params.get('status', 'admitted')
        qs = InpatientAdmission.objects.select_related(
            'visit__patient', 'bed', 'ward', 'hospital',
            'admitted_by', 'discharged_by'
        ).prefetch_related('care_team')
        if hospital:
            qs = qs.filter(hospital=hospital)
        if status_filter:
            qs = qs.filter(status=status_filter)
        return Response(InpatientAdmissionSerializer(qs, many=True).data)

    # POST — admit patient
    if role not in ('hospital_admin', 'admin', 'ministry_admin', 'doctor', 'receptionist'):
        return Response({'detail': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)

    data = request.data.copy()
    if hospital:
        data['hospital'] = hospital.id
    data['admitted_by'] = request.user.id
    data['status'] = 'admitted'

    serializer = InpatientAdmissionWriteSerializer(data=data)
    if serializer.is_valid():
        admission = serializer.save()
        return Response(InpatientAdmissionSerializer(admission).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def admission_detail(request, admission_id):
    role = _role(request.user)
    admission = get_object_or_404(InpatientAdmission, pk=admission_id)

    if request.method == 'GET':
        return Response(InpatientAdmissionSerializer(admission).data)

    if role not in ('hospital_admin', 'admin', 'ministry_admin', 'doctor', 'nurse', 'receptionist'):
        return Response({'detail': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)

    serializer = InpatientAdmissionWriteSerializer(admission, data=request.data, partial=(request.method == 'PATCH'))
    if serializer.is_valid():
        admission = serializer.save()
        return Response(InpatientAdmissionSerializer(admission).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def discharge_patient(request, admission_id):
    role = _role(request.user)
    if role not in ('hospital_admin', 'admin', 'ministry_admin', 'doctor', 'nurse'):
        return Response({'detail': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)

    admission = get_object_or_404(InpatientAdmission, pk=admission_id)
    if admission.status != 'admitted':
        return Response({'detail': 'Patient is not currently admitted.'}, status=status.HTTP_400_BAD_REQUEST)

    admission.status = request.data.get('discharge_type') == 'transferred' and 'transferred' or 'discharged'
    admission.discharge_date = timezone.now()
    admission.discharged_by = request.user
    admission.discharge_type = request.data.get('discharge_type', 'other')
    admission.discharge_summary = request.data.get('discharge_summary', '')
    admission.discharge_medications = request.data.get('discharge_medications', '')
    admission.follow_up_date = request.data.get('follow_up_date') or None
    admission.follow_up_instructions = request.data.get('follow_up_instructions', '')
    admission.save()

    # Update visit discharge fields
    visit = admission.visit
    visit.discharge_date = admission.discharge_date
    visit.discharge_notes = admission.discharge_summary
    visit.status = 'completed'
    visit.save(update_fields=['discharge_date', 'discharge_notes', 'status'])

    return Response(InpatientAdmissionSerializer(admission).data)


# ═══════════════════════════════════════════════════════════════
#  DASHBOARD / OCCUPANCY
# ═══════════════════════════════════════════════════════════════

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def ipd_dashboard(request):
    role = _role(request.user)
    if role not in ('hospital_admin', 'admin', 'ministry_admin', 'doctor', 'nurse', 'receptionist'):
        return Response({'detail': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)

    hospital = request.user.hospital
    if not hospital:
        return Response({'detail': 'You are not assigned to a hospital.'}, status=status.HTTP_400_BAD_REQUEST)

    total_beds      = Bed.objects.filter(ward__hospital=hospital, is_active=True).count()
    occupied_beds   = Bed.objects.filter(ward__hospital=hospital, status='occupied').count()
    available_beds  = Bed.objects.filter(ward__hospital=hospital, status='available').count()
    maintenance_beds= Bed.objects.filter(ward__hospital=hospital, status='maintenance').count()

    current_admissions = InpatientAdmission.objects.filter(
        hospital=hospital, status='admitted'
    ).select_related('visit__patient', 'bed', 'ward').prefetch_related('care_team')

    today_admissions = InpatientAdmission.objects.filter(
        hospital=hospital, admission_date__date=timezone.now().date()
    ).count()

    today_discharges = InpatientAdmission.objects.filter(
        hospital=hospital, discharge_date__date=timezone.now().date()
    ).count()

    avg_los = 0
    discharged = InpatientAdmission.objects.filter(hospital=hospital, status='discharged')
    if discharged.exists():
        total_days = sum(a.length_of_stay_days for a in discharged)
        avg_los = round(total_days / discharged.count(), 1)

    wards = Ward.objects.filter(hospital=hospital, is_active=True)
    ward_stats = []
    for w in wards:
        bed_total = w.beds.filter(is_active=True).count()
        bed_occ   = w.beds.filter(status='occupied').count()
        bed_avail = w.beds.filter(status='available').count()
        ward_stats.append({
            'id': w.id, 'name': w.name, 'ward_type': w.ward_type,
            'bed_total': bed_total, 'occupied': bed_occ, 'available': bed_avail,
            'occupancy_rate': round(bed_occ / bed_total * 100, 1) if bed_total else 0,
        })

    return Response({
        'stats': {
            'total_beds': total_beds, 'occupied_beds': occupied_beds,
            'available_beds': available_beds, 'maintenance_beds': maintenance_beds,
            'occupancy_rate': round(occupied_beds / total_beds * 100, 1) if total_beds else 0,
            'today_admissions': today_admissions, 'today_discharges': today_discharges,
            'current_inpatients': current_admissions.count(), 'avg_length_of_stay': avg_los,
        },
        'current_admissions': InpatientAdmissionSerializer(current_admissions, many=True).data,
        'ward_stats': ward_stats,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def available_beds(request):
    role = _role(request.user)
    if role not in ('hospital_admin', 'admin', 'ministry_admin', 'doctor', 'nurse', 'receptionist'):
        return Response({'detail': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)

    hospital = request.user.hospital
    if not hospital:
        return Response([])

    ward_id = request.query_params.get('ward')
    qs = Bed.objects.filter(ward__hospital=hospital, status='available', is_active=True).select_related('ward')
    if ward_id:
        qs = qs.filter(ward_id=ward_id)
    return Response(BedSerializer(qs, many=True).data)


# ═══════════════════════════════════════════════════════════════
#  NURSING NOTES
# ═══════════════════════════════════════════════════════════════

NURSING_ROLES = ('nurse', 'doctor', 'hospital_admin', 'admin', 'ministry_admin')


def _serialize_nursing_note(n):
    nurse = n.nurse
    return {
        'id':                  n.id,
        'admission':           n.admission_id,
        'shift':               n.shift,
        'shift_display':       n.get_shift_display(),
        'note_date':           str(n.note_date),
        'temperature_celsius': str(n.temperature_celsius) if n.temperature_celsius is not None else None,
        'blood_pressure':      n.blood_pressure,
        'heart_rate':          n.heart_rate,
        'respiratory_rate':    n.respiratory_rate,
        'oxygen_saturation':   str(n.oxygen_saturation) if n.oxygen_saturation is not None else None,
        'pain_score':          n.pain_score,
        'iv_fluids_given':     n.iv_fluids_given,
        'oral_intake':         n.oral_intake,
        'urine_output':        n.urine_output,
        'medications_given':   n.medications_given,
        'wound_care':          n.wound_care,
        'patient_education':   n.patient_education,
        'nursing_assessment':  n.nursing_assessment,
        'nursing_plan':        n.nursing_plan,
        'handover_notes':      n.handover_notes,
        'created_at':          n.created_at.isoformat(),
        'nurse': {'id': nurse.id, 'name': nurse.get_full_name() or nurse.username} if nurse else None,
    }


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def nursing_notes_list(request, admission_id):
    """List or create nursing notes for an admission."""
    role = _role(request.user)
    if role not in NURSING_ROLES:
        return Response({'detail': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)

    admission = get_object_or_404(InpatientAdmission, pk=admission_id)

    if request.method == 'GET':
        qs = NursingNote.objects.filter(admission=admission).select_related('nurse').order_by('-note_date', '-created_at')
        return Response([_serialize_nursing_note(n) for n in qs])

    # POST
    d = request.data
    note = NursingNote.objects.create(
        admission=admission,
        nurse=request.user,
        shift=d.get('shift', 'morning'),
        note_date=d.get('note_date') or timezone.now().date(),
        temperature_celsius=d.get('temperature_celsius') or None,
        blood_pressure=d.get('blood_pressure', ''),
        heart_rate=d.get('heart_rate') or None,
        respiratory_rate=d.get('respiratory_rate') or None,
        oxygen_saturation=d.get('oxygen_saturation') or None,
        pain_score=d.get('pain_score') or None,
        iv_fluids_given=d.get('iv_fluids_given', ''),
        oral_intake=d.get('oral_intake', ''),
        urine_output=d.get('urine_output', ''),
        medications_given=d.get('medications_given', ''),
        wound_care=d.get('wound_care', ''),
        patient_education=d.get('patient_education', ''),
        nursing_assessment=d.get('nursing_assessment', ''),
        nursing_plan=d.get('nursing_plan', ''),
        handover_notes=d.get('handover_notes', ''),
    )
    return Response(_serialize_nursing_note(note), status=status.HTTP_201_CREATED)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def nursing_note_detail(request, note_id):
    """Retrieve, update or delete a single nursing note."""
    role = _role(request.user)
    if role not in NURSING_ROLES:
        return Response({'detail': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)

    note = get_object_or_404(NursingNote, pk=note_id)

    if request.method == 'GET':
        return Response(_serialize_nursing_note(note))

    if request.method == 'DELETE':
        if role not in ('hospital_admin', 'admin', 'ministry_admin') and note.nurse != request.user:
            return Response({'detail': 'You can only delete your own notes.'}, status=status.HTTP_403_FORBIDDEN)
        note.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    # PUT
    d = request.data
    updatable = [
        'shift', 'note_date', 'temperature_celsius', 'blood_pressure', 'heart_rate',
        'respiratory_rate', 'oxygen_saturation', 'pain_score', 'iv_fluids_given',
        'oral_intake', 'urine_output', 'medications_given', 'wound_care',
        'patient_education', 'nursing_assessment', 'nursing_plan', 'handover_notes',
    ]
    for field in updatable:
        if field in d:
            val = d[field]
            setattr(note, field, val if val != '' else None if field not in ('shift', 'note_date', 'blood_pressure') else '')
    note.save()
    return Response(_serialize_nursing_note(note))

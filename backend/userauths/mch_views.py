"""
Maternal & Child Health backend views.
Endpoints:
  GET  /mch/dashboard/                   – stats
  GET  /mch/anc/                         – list ANC visits
  POST /mch/anc/                         – create ANC visit
  GET  /mch/anc/<id>/                    – ANC visit detail
  PUT  /mch/anc/<id>/                    – update ANC visit
  GET  /mch/immunizations/               – list immunization records
  POST /mch/immunizations/               – create immunization record
  GET  /mch/patients/<patient_id>/profile/ – full MCH profile for a patient
"""
from django.utils import timezone
from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import AntenatalVisit, ImmunizationRecord, Patient, Hospital

ALLOWED_ROLES = {'doctor', 'nurse', 'admin', 'hospital_admin', 'midwife'}
READ_ROLES    = ALLOWED_ROLES | {'lab_technician', 'pharmacist'}


def _serialize_anc(v):
    patient = v.patient
    attended_by = v.attended_by
    return {
        'id':           v.id,
        'visit_date':   str(v.visit_date),
        'gravida':      v.gravida,
        'para':         v.para,
        'lmp':          str(v.lmp) if v.lmp else None,
        'edd':          str(v.edd) if v.edd else None,
        'gestational_age_weeks': v.gestational_age_weeks,
        'weight_kg':    str(v.weight_kg) if v.weight_kg is not None else None,
        'blood_pressure': v.blood_pressure,
        'fundal_height_cm': str(v.fundal_height_cm) if v.fundal_height_cm is not None else None,
        'fetal_heart_rate': v.fetal_heart_rate,
        'presentation': v.presentation,
        'presentation_display': v.get_presentation_display(),
        'edema':        v.edema,
        'hb_level':     str(v.hb_level) if v.hb_level is not None else None,
        'hiv_status':   v.hiv_status,
        'hiv_status_display': v.get_hiv_status_display(),
        'syphilis_status': v.syphilis_status,
        'syphilis_status_display': v.get_syphilis_status_display(),
        'malaria_test': v.malaria_test,
        'malaria_test_display': v.get_malaria_test_display(),
        'tt_vaccine_given':  v.tt_vaccine_given,
        'iron_folic_given':  v.iron_folic_given,
        'itn_given':         v.itn_given,
        'sp_given':          v.sp_given,
        'pmtct_counselled':  v.pmtct_counselled,
        'counselling_notes': v.counselling_notes,
        'next_visit_date':   str(v.next_visit_date) if v.next_visit_date else None,
        'risk_flags':        v.risk_flags,
        'created_at':        v.created_at.isoformat(),
        'patient': {
            'id':           patient.id,
            'full_name':    patient.full_name,
            'patient_id':   patient.patient_id,
            'gender':       getattr(patient, 'gender', ''),
            'date_of_birth': str(patient.date_of_birth) if patient.date_of_birth else None,
        },
        'attended_by': {
            'id':   attended_by.id,
            'name': attended_by.get_full_name() or attended_by.username,
        } if attended_by else None,
    }


def _serialize_immunization(r):
    patient  = r.patient
    given_by = r.given_by
    return {
        'id':           r.id,
        'vaccine_name': r.vaccine_name,
        'vaccine_name_display': r.get_vaccine_name_display(),
        'date_given':   str(r.date_given),
        'status':       r.status,
        'status_display': r.get_status_display(),
        'batch_number': r.batch_number,
        'site':         r.site,
        'adverse_reaction': r.adverse_reaction,
        'next_due_date': str(r.next_due_date) if r.next_due_date else None,
        'notes':        r.notes,
        'created_at':   r.created_at.isoformat(),
        'patient': {
            'id':           patient.id,
            'full_name':    patient.full_name,
            'patient_id':   patient.patient_id,
            'gender':       getattr(patient, 'gender', ''),
            'date_of_birth': str(patient.date_of_birth) if patient.date_of_birth else None,
        },
        'given_by': {
            'id':   given_by.id,
            'name': given_by.get_full_name() or given_by.username,
        } if given_by else None,
    }


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def mch_dashboard(request):
    user = request.user
    role = user.role.name if user.role else None
    if role not in (READ_ROLES | {'admin'}):
        return Response({'error': 'Access denied.'}, status=403)

    hospital = getattr(user, 'hospital', None)

    anc_qs  = AntenatalVisit.objects.all()
    imm_qs  = ImmunizationRecord.objects.all()
    if hospital:
        anc_qs = anc_qs.filter(hospital=hospital)
        imm_qs = imm_qs.filter(hospital=hospital)

    today = timezone.now().date()
    month_start = today.replace(day=1)

    stats = {
        'total_anc_visits':    anc_qs.count(),
        'anc_this_month':      anc_qs.filter(visit_date__gte=month_start).count(),
        'anc_high_risk':       anc_qs.exclude(risk_flags='').count(),
        'hiv_positive_mothers': anc_qs.filter(hiv_status='positive').count(),
        'total_immunizations': imm_qs.count(),
        'immunizations_this_month': imm_qs.filter(date_given__gte=month_start).count(),
        'adverse_reactions':   imm_qs.exclude(adverse_reaction='').count(),
    }

    recent_anc = [_serialize_anc(v) for v in anc_qs.select_related('patient', 'attended_by').order_by('-visit_date')[:8]]
    recent_imm = [_serialize_immunization(r) for r in imm_qs.select_related('patient', 'given_by').order_by('-date_given')[:8]]

    return Response({'stats': stats, 'recent_anc': recent_anc, 'recent_immunizations': recent_imm})


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def anc_list(request):
    user = request.user
    role = user.role.name if user.role else None

    if request.method == 'GET':
        if role not in (READ_ROLES | {'admin'}):
            return Response({'error': 'Access denied.'}, status=403)

        hospital = getattr(user, 'hospital', None)
        qs = AntenatalVisit.objects.select_related('patient', 'attended_by')
        if hospital:
            qs = qs.filter(hospital=hospital)

        search    = request.query_params.get('search', '').strip()
        hiv       = request.query_params.get('hiv_status', '')
        high_risk = request.query_params.get('high_risk', '')

        if search:
            qs = qs.filter(Q(patient__full_name__icontains=search) | Q(patient__patient_id__icontains=search))
        if hiv:
            qs = qs.filter(hiv_status=hiv)
        if high_risk == 'true':
            qs = qs.exclude(risk_flags='')

        return Response([_serialize_anc(v) for v in qs.order_by('-visit_date')])

    # POST
    if role not in ALLOWED_ROLES:
        return Response({'error': 'Access denied.'}, status=403)

    data     = request.data
    hospital = getattr(user, 'hospital', None)
    if not hospital:
        return Response({'error': 'User has no associated hospital.'}, status=400)

    patient_id = data.get('patient_id')
    if not patient_id:
        return Response({'error': 'patient_id is required.'}, status=400)

    try:
        patient = Patient.objects.get(id=patient_id)
    except Patient.DoesNotExist:
        return Response({'error': 'Patient not found.'}, status=404)

    visit = AntenatalVisit.objects.create(
        patient=patient,
        hospital=hospital,
        visit_date=data.get('visit_date', timezone.now().date()),
        gravida=int(data.get('gravida', 1)),
        para=int(data.get('para', 0)),
        lmp=data.get('lmp') or None,
        edd=data.get('edd') or None,
        gestational_age_weeks=data.get('gestational_age_weeks') or None,
        weight_kg=data.get('weight_kg') or None,
        blood_pressure=data.get('blood_pressure', ''),
        fundal_height_cm=data.get('fundal_height_cm') or None,
        fetal_heart_rate=data.get('fetal_heart_rate') or None,
        presentation=data.get('presentation', 'not_assessed'),
        edema=bool(data.get('edema', False)),
        hb_level=data.get('hb_level') or None,
        hiv_status=data.get('hiv_status', 'not_tested'),
        syphilis_status=data.get('syphilis_status', 'not_tested'),
        malaria_test=data.get('malaria_test', 'not_tested'),
        tt_vaccine_given=bool(data.get('tt_vaccine_given', False)),
        iron_folic_given=bool(data.get('iron_folic_given', False)),
        itn_given=bool(data.get('itn_given', False)),
        sp_given=bool(data.get('sp_given', False)),
        pmtct_counselled=bool(data.get('pmtct_counselled', False)),
        counselling_notes=data.get('counselling_notes', ''),
        next_visit_date=data.get('next_visit_date') or None,
        risk_flags=data.get('risk_flags', ''),
        attended_by=user,
    )
    return Response(_serialize_anc(visit), status=201)


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def anc_detail(request, anc_id):
    user = request.user
    role = user.role.name if user.role else None
    if role not in (READ_ROLES | {'admin'}):
        return Response({'error': 'Access denied.'}, status=403)

    try:
        visit = AntenatalVisit.objects.select_related('patient', 'attended_by').get(id=anc_id)
    except AntenatalVisit.DoesNotExist:
        return Response({'error': 'ANC visit not found.'}, status=404)

    if request.method == 'GET':
        return Response(_serialize_anc(visit))

    if role not in ALLOWED_ROLES:
        return Response({'error': 'Access denied.'}, status=403)

    d = request.data
    updatable = [
        'visit_date', 'gravida', 'para', 'lmp', 'edd', 'gestational_age_weeks',
        'weight_kg', 'blood_pressure', 'fundal_height_cm', 'fetal_heart_rate',
        'presentation', 'edema', 'hb_level', 'hiv_status', 'syphilis_status',
        'malaria_test', 'tt_vaccine_given', 'iron_folic_given', 'itn_given',
        'sp_given', 'pmtct_counselled', 'counselling_notes', 'next_visit_date', 'risk_flags',
    ]
    for field in updatable:
        if field in d:
            setattr(visit, field, d[field])
    visit.save()
    return Response(_serialize_anc(visit))


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def immunization_list(request):
    user = request.user
    role = user.role.name if user.role else None

    if request.method == 'GET':
        if role not in (READ_ROLES | {'admin'}):
            return Response({'error': 'Access denied.'}, status=403)

        hospital = getattr(user, 'hospital', None)
        qs = ImmunizationRecord.objects.select_related('patient', 'given_by')
        if hospital:
            qs = qs.filter(hospital=hospital)

        search  = request.query_params.get('search', '').strip()
        vaccine = request.query_params.get('vaccine', '')
        status  = request.query_params.get('status', '')

        if search:
            qs = qs.filter(Q(patient__full_name__icontains=search) | Q(patient__patient_id__icontains=search))
        if vaccine:
            qs = qs.filter(vaccine_name=vaccine)
        if status:
            qs = qs.filter(status=status)

        return Response([_serialize_immunization(r) for r in qs.order_by('-date_given')])

    # POST
    if role not in ALLOWED_ROLES:
        return Response({'error': 'Access denied.'}, status=403)

    data     = request.data
    hospital = getattr(user, 'hospital', None)
    if not hospital:
        return Response({'error': 'User has no associated hospital.'}, status=400)

    patient_id = data.get('patient_id')
    if not patient_id:
        return Response({'error': 'patient_id is required.'}, status=400)

    try:
        patient = Patient.objects.get(id=patient_id)
    except Patient.DoesNotExist:
        return Response({'error': 'Patient not found.'}, status=404)

    record = ImmunizationRecord.objects.create(
        patient=patient,
        hospital=hospital,
        vaccine_name=data.get('vaccine_name', 'other'),
        date_given=data.get('date_given', timezone.now().date()),
        status=data.get('status', 'given'),
        batch_number=data.get('batch_number', ''),
        site=data.get('site', ''),
        adverse_reaction=data.get('adverse_reaction', ''),
        next_due_date=data.get('next_due_date') or None,
        notes=data.get('notes', ''),
        given_by=user,
    )
    return Response(_serialize_immunization(record), status=201)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def patient_mch_profile(request, patient_id):
    """Full MCH profile: all ANC visits + immunizations for one patient."""
    user = request.user
    role = user.role.name if user.role else None
    if role not in (READ_ROLES | {'admin'}):
        return Response({'error': 'Access denied.'}, status=403)

    try:
        patient = Patient.objects.get(id=patient_id)
    except Patient.DoesNotExist:
        return Response({'error': 'Patient not found.'}, status=404)

    anc_visits     = AntenatalVisit.objects.filter(patient=patient).select_related('attended_by').order_by('-visit_date')
    immunizations  = ImmunizationRecord.objects.filter(patient=patient).select_related('given_by').order_by('date_given')

    return Response({
        'patient': {
            'id':           patient.id,
            'full_name':    patient.full_name,
            'patient_id':   patient.patient_id,
            'gender':       getattr(patient, 'gender', ''),
            'date_of_birth': str(patient.date_of_birth) if patient.date_of_birth else None,
        },
        'anc_visits':     [_serialize_anc(v) for v in anc_visits],
        'immunizations':  [_serialize_immunization(r) for r in immunizations],
    })

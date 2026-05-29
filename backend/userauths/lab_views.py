"""
Lab Technician backend views.
Endpoints:
  GET  /lab/dashboard/           – stats + recent tests
  GET  /lab/tests/               – all tests (filterable)
  POST /lab/tests/               – order a new test (doctor)
  GET  /lab/tests/<id>/          – test detail
  POST /lab/tests/<id>/collect/  – mark sample collected
  POST /lab/tests/<id>/result/   – record result + complete
  POST /lab/tests/<id>/notify/   – mark doctor notified
"""
from django.utils import timezone
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from .models import LabTest, PatientVisit, Patient, Hospital

LAB_ROLES    = {'lab_technician'}
DOCTOR_ROLES = {'doctor', 'admin', 'hospital_admin'}
ALL_ROLES    = LAB_ROLES | DOCTOR_ROLES | {'nurse', 'pharmacist'}


def _serialize_test(t):
    visit = t.visit
    patient = t.patient
    ordered_by = t.ordered_by
    completed_by = t.completed_by
    sample_collected_by = t.sample_collected_by
    return {
        'id':            t.id,
        'test_name':     t.test_name,
        'test_category': t.test_category,
        'test_category_display': t.get_test_category_display(),
        'priority':      t.priority,
        'priority_display': t.get_priority_display(),
        'status':        t.status,
        'status_display': t.get_status_display(),
        'sample_type':   t.sample_type,
        'sample_type_display': t.get_sample_type_display(),
        'clinical_info': t.clinical_info,
        'is_critical':   t.is_critical,
        'doctor_notified': t.doctor_notified,
        'result_value':  t.result_value,
        'result_unit':   t.result_unit,
        'reference_range': t.reference_range,
        'result_notes':  t.result_notes,
        'sample_collected_at': t.sample_collected_at.isoformat() if t.sample_collected_at else None,
        'completed_at':  t.completed_at.isoformat() if t.completed_at else None,
        'created_at':    t.created_at.isoformat(),
        'patient': {
            'id':         patient.id,
            'full_name':  patient.full_name,
            'patient_id': patient.patient_id,
            'gender':     getattr(patient, 'gender', ''),
            'date_of_birth': str(patient.date_of_birth) if patient.date_of_birth else None,
        },
        'visit': {
            'id':          visit.id,
            'visit_type':  visit.visit_type,
            'chief_complaint': visit.chief_complaint,
            'status':      visit.status,
        } if visit else None,
        'ordered_by': {
            'id':       ordered_by.id,
            'name':     ordered_by.get_full_name() or ordered_by.username,
        } if ordered_by else None,
        'completed_by': {
            'id':   completed_by.id,
            'name': completed_by.get_full_name() or completed_by.username,
        } if completed_by else None,
        'sample_collected_by': {
            'id':   sample_collected_by.id,
            'name': sample_collected_by.get_full_name() or sample_collected_by.username,
        } if sample_collected_by else None,
    }


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def lab_dashboard(request):
    user = request.user
    role = user.role.name if user.role else None
    if role not in (ALL_ROLES | {'admin'}):
        return Response({'error': 'Access denied.'}, status=403)

    hospital = getattr(user, 'hospital', None)
    qs = LabTest.objects.filter(hospital=hospital) if hospital else LabTest.objects.all()

    today = timezone.now().date()
    today_qs = qs.filter(created_at__date=today)

    stats = {
        'total_tests':        qs.count(),
        'pending':            qs.filter(status='ordered').count(),
        'sample_collected':   qs.filter(status='sample_collected').count(),
        'processing':         qs.filter(status='processing').count(),
        'completed_today':    today_qs.filter(status='completed').count(),
        'critical_unnotified': qs.filter(is_critical=True, doctor_notified=False).count(),
        'urgent_pending':     qs.filter(priority__in=['urgent', 'stat']).exclude(status__in=['completed', 'cancelled']).count(),
    }

    recent = [_serialize_test(t) for t in qs.select_related('patient', 'visit', 'ordered_by', 'completed_by', 'sample_collected_by').order_by('-created_at')[:10]]

    return Response({'stats': stats, 'recent_tests': recent})


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def lab_tests_list(request):
    user = request.user
    role = user.role.name if user.role else None

    if request.method == 'GET':
        if role not in (ALL_ROLES | {'admin'}):
            return Response({'error': 'Access denied.'}, status=403)

        hospital = getattr(user, 'hospital', None)
        qs = LabTest.objects.select_related('patient', 'visit', 'ordered_by', 'completed_by', 'sample_collected_by')
        if hospital:
            qs = qs.filter(hospital=hospital)

        # Filters
        status_filter = request.query_params.get('status')
        priority      = request.query_params.get('priority')
        category      = request.query_params.get('category')
        search        = request.query_params.get('search', '').strip()
        date_from     = request.query_params.get('date_from')
        date_to       = request.query_params.get('date_to')

        if status_filter:
            qs = qs.filter(status=status_filter)
        if priority:
            qs = qs.filter(priority=priority)
        if category:
            qs = qs.filter(test_category=category)
        if search:
            from django.db.models import Q
            qs = qs.filter(
                Q(test_name__icontains=search) |
                Q(patient__full_name__icontains=search) |
                Q(patient__patient_id__icontains=search)
            )
        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)
        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)

        return Response([_serialize_test(t) for t in qs.order_by('-created_at')])

    # POST — doctor orders a test
    if role not in DOCTOR_ROLES:
        return Response({'error': 'Only doctors can order tests.'}, status=403)

    data = request.data
    visit_id = data.get('visit_id')
    if not visit_id:
        return Response({'error': 'visit_id is required.'}, status=400)

    try:
        visit = PatientVisit.objects.select_related('patient', 'hospital').get(id=visit_id)
    except PatientVisit.DoesNotExist:
        return Response({'error': 'Visit not found.'}, status=404)

    test = LabTest.objects.create(
        visit=visit,
        patient=visit.patient,
        hospital=visit.hospital,
        ordered_by=user,
        test_name=data.get('test_name', '').strip(),
        test_category=data.get('test_category', 'other'),
        priority=data.get('priority', 'routine'),
        sample_type=data.get('sample_type', 'blood'),
        clinical_info=data.get('clinical_info', ''),
        status='ordered',
    )
    return Response(_serialize_test(test), status=201)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def lab_test_detail(request, test_id):
    user = request.user
    role = user.role.name if user.role else None
    if role not in (ALL_ROLES | {'admin'}):
        return Response({'error': 'Access denied.'}, status=403)

    try:
        test = LabTest.objects.select_related(
            'patient', 'visit', 'ordered_by', 'completed_by', 'sample_collected_by'
        ).get(id=test_id)
    except LabTest.DoesNotExist:
        return Response({'error': 'Test not found.'}, status=404)

    return Response(_serialize_test(test))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def lab_collect_sample(request, test_id):
    """Mark sample as collected."""
    user = request.user
    role = user.role.name if user.role else None
    if role not in (LAB_ROLES | {'admin', 'nurse'}):
        return Response({'error': 'Access denied.'}, status=403)

    try:
        test = LabTest.objects.get(id=test_id)
    except LabTest.DoesNotExist:
        return Response({'error': 'Test not found.'}, status=404)

    if test.status not in ('ordered',):
        return Response({'error': f'Cannot collect sample — test is currently "{test.get_status_display()}".'}, status=400)

    test.status = 'sample_collected'
    test.sample_collected_at = timezone.now()
    test.sample_collected_by = user
    test.save(update_fields=['status', 'sample_collected_at', 'sample_collected_by'])

    return Response(_serialize_test(test))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def lab_record_result(request, test_id):
    """Record result and mark test as completed."""
    user = request.user
    role = user.role.name if user.role else None
    if role not in (LAB_ROLES | {'admin'}):
        return Response({'error': 'Access denied.'}, status=403)

    try:
        test = LabTest.objects.get(id=test_id)
    except LabTest.DoesNotExist:
        return Response({'error': 'Test not found.'}, status=404)

    if test.status == 'completed':
        return Response({'error': 'Test is already completed.'}, status=400)
    if test.status == 'cancelled':
        return Response({'error': 'Cannot record result for a cancelled test.'}, status=400)

    data = request.data
    result_value = data.get('result_value', '').strip()
    if not result_value:
        return Response({'error': 'result_value is required.'}, status=400)

    test.result_value    = result_value
    test.result_unit     = data.get('result_unit', test.result_unit)
    test.reference_range = data.get('reference_range', test.reference_range)
    test.result_notes    = data.get('result_notes', '')
    test.is_critical     = bool(data.get('is_critical', False))
    test.status          = 'completed'
    test.completed_by    = user
    test.completed_at    = timezone.now()
    # If the sample was never collected, set that too
    if not test.sample_collected_at:
        test.sample_collected_at = timezone.now()
        test.sample_collected_by = user

    test.save()
    return Response(_serialize_test(test))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def lab_notify_doctor(request, test_id):
    """Mark that the ordering doctor has been notified of a critical result."""
    user = request.user
    role = user.role.name if user.role else None
    if role not in (LAB_ROLES | {'admin'}):
        return Response({'error': 'Access denied.'}, status=403)

    try:
        test = LabTest.objects.get(id=test_id)
    except LabTest.DoesNotExist:
        return Response({'error': 'Test not found.'}, status=404)

    test.doctor_notified = True
    test.save(update_fields=['doctor_notified'])
    return Response(_serialize_test(test))

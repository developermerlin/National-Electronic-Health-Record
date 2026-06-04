from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.utils import timezone

from userauths.models import Prescription, PrescriptionItem, PatientVisit, DrugInventory
from userauths.serializer import PrescriptionSerializer, PrescriptionWriteSerializer


def _role(user):
    return user.role.name if user.role else None


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def visit_prescription(request, visit_id):
    """
    GET  /visits/{visit_id}/prescription/  — fetch prescription for a visit
    POST /visits/{visit_id}/prescription/  — create or replace prescription for a visit
    Only doctors and admins can write; all clinical staff can read.
    """
    try:
        visit = PatientVisit.objects.select_related('patient', 'hospital').get(pk=visit_id)
    except PatientVisit.DoesNotExist:
        return Response({'detail': 'Visit not found.'}, status=status.HTTP_404_NOT_FOUND)

    role = _role(request.user)
    read_roles  = ('doctor', 'nurse', 'pharmacist', 'admin', 'ministry_admin', 'hospital_admin')
    write_roles = ('doctor', 'admin', 'ministry_admin')

    if role not in read_roles:
        return Response({'detail': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)

    if request.method == 'GET':
        try:
            rx = Prescription.objects.prefetch_related('items__drug').get(visit=visit)
            return Response(PrescriptionSerializer(rx).data)
        except Prescription.DoesNotExist:
            return Response(None)

    # POST — create or update
    if role not in write_roles:
        return Response({'detail': 'Only doctors can write prescriptions.'}, status=status.HTTP_403_FORBIDDEN)

    try:
        existing = Prescription.objects.get(visit=visit)
        serializer = PrescriptionWriteSerializer(existing, data=request.data, partial=False)
    except Prescription.DoesNotExist:
        existing = None
        serializer = PrescriptionWriteSerializer(data=request.data)

    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    if existing:
        rx = serializer.update(existing, serializer.validated_data)
    else:
        rx = serializer.save(
            visit=visit,
            hospital=visit.hospital,
            prescribed_by=request.user,
        )

    return Response(PrescriptionSerializer(rx).data, status=status.HTTP_201_CREATED if not existing else status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def patient_prescriptions(request, patient_id):
    """
    GET /patients/{patient_id}/prescriptions/
    Returns all prescriptions for a patient across all visits.
    """
    role = _role(request.user)
    allowed = ('doctor', 'nurse', 'pharmacist', 'admin', 'ministry_admin', 'hospital_admin', 'patient')
    if role not in allowed:
        return Response({'detail': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)

    rxs = (Prescription.objects
           .filter(visit__patient_id=patient_id)
           .select_related('visit__patient', 'prescribed_by', 'dispensed_by', 'hospital')
           .prefetch_related('items__drug')
           .order_by('-created_at'))
    return Response(PrescriptionSerializer(rxs, many=True).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def pharmacy_pending_prescriptions(request):
    """
    GET /pharmacy/prescriptions/pending/
    Returns all pending/partial prescriptions for the pharmacist's hospital.
    """
    role = _role(request.user)
    if role not in ('pharmacist', 'admin', 'hospital_admin'):
        return Response({'detail': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)

    hospital = request.user.hospital
    rxs = (Prescription.objects
           .filter(hospital=hospital, status__in=['pending', 'partial'])
           .select_related('visit__patient', 'prescribed_by', 'hospital')
           .prefetch_related('items__drug')
           .order_by('created_at'))
    return Response(PrescriptionSerializer(rxs, many=True).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def dispense_prescription(request, rx_id):
    """
    POST /pharmacy/prescriptions/{rx_id}/dispense/
    Body: { "item_ids": [1,2,3], "note": "..." }  — mark selected items as dispensed.
    If all items dispensed → status = dispensed, else partial.
    """
    role = _role(request.user)
    if role not in ('pharmacist', 'admin', 'hospital_admin'):
        return Response({'detail': 'Only pharmacists can dispense.'}, status=status.HTTP_403_FORBIDDEN)

    try:
        rx = Prescription.objects.prefetch_related('items').get(pk=rx_id)
    except Prescription.DoesNotExist:
        return Response({'detail': 'Prescription not found.'}, status=status.HTTP_404_NOT_FOUND)

    item_ids = request.data.get('item_ids', [])
    note     = request.data.get('note', '')

    if item_ids:
        PrescriptionItem.objects.filter(prescription=rx, id__in=item_ids).update(
            is_dispensed=True
        )

    total     = rx.items.count()
    dispensed = rx.items.filter(is_dispensed=True).count()

    if total > 0 and dispensed == total:
        rx.status = 'dispensed'
    elif dispensed > 0:
        rx.status = 'partial'

    rx.dispensed_by = request.user
    rx.dispensed_at = timezone.now()
    if note:
        rx.notes = (rx.notes + '\n' + note).strip()
    rx.save()

    # Notify patient via SMS when prescription is ready for pickup
    try:
        from userauths.sms_service import send_sms
        patient = rx.visit.patient if rx.visit else None
        if patient and patient.phone:
            body = (
                f"[NEHR] Hi {patient.full_name}, your prescription is ready for pickup "
                f"at {rx.hospital.name if rx.hospital else 'the hospital'}. "
                f"Please collect it during pharmacy hours."
            )
            send_sms(patient.phone, body)
    except Exception:
        pass

    return Response(PrescriptionSerializer(rx).data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def inventory_drug_search(request):
    """
    GET /pharmacy/inventory/search/?q=paracetamol
    Quick drug name search for the prescription writing autocomplete.
    """
    q        = request.GET.get('q', '').strip()
    hospital = request.user.hospital
    if not hospital or len(q) < 2:
        return Response([])

    drugs = (DrugInventory.objects
             .filter(hospital=hospital, drug_name__icontains=q, is_active=True)
             .values('id', 'drug_name', 'brand_name', 'strength', 'dosage_form', 'unit', 'quantity_in_stock')
             [:20])
    return Response(list(drugs))

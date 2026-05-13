from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from django.utils import timezone

from userauths.models import PatientVisit, VitalSigns, ClinicalNote
from userauths.serializer import (
    PatientVisitListSerializer,
    PatientVisitDetailSerializer,
    PatientVisitCreateSerializer,
    VitalSignsSerializer,
    ClinicalNoteSerializer,
)


class PatientVisitViewSet(viewsets.ModelViewSet):
    """
    CRUD + custom actions for patient visits/encounters.

    List  : GET  /visits/                  — all visits (filtered by hospital / patient)
    Detail: GET  /visits/{id}/             — full detail with vitals + clinical note
    Create: POST /visits/                  — register a new visit
    Patch : PATCH/PUT /visits/{id}/        — update visit status etc.

    Custom:
      GET  /visits/{id}/full/             — detail alias
      POST /visits/{id}/add_vitals/       — record vitals for this visit
      POST /visits/{id}/add_clinical_note/ — doctor writes clinical note
      GET  /patient_history/{patient_id}/ — full timeline for one patient
    """
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs   = PatientVisit.objects.select_related(
            'patient', 'hospital', 'department', 'doctor',
            'registered_by', 'appointment', 'referred_to_hospital',
        ).prefetch_related('vitals', 'clinical_note')

        role = user.role.name if user.role else None

        # Scope by hospital unless national/district admin
        if role not in ('ministry_admin', 'admin'):
            qs = qs.filter(hospital=user.hospital)

        # Filters from query params
        patient_id = self.request.query_params.get('patient')
        if patient_id:
            qs = qs.filter(patient_id=patient_id)

        hospital_id = self.request.query_params.get('hospital')
        if hospital_id:
            qs = qs.filter(hospital_id=hospital_id)

        visit_type = self.request.query_params.get('visit_type')
        if visit_type:
            qs = qs.filter(visit_type=visit_type)

        status_filter = self.request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)

        date_from = self.request.query_params.get('date_from')
        if date_from:
            qs = qs.filter(visit_date__date__gte=date_from)

        date_to = self.request.query_params.get('date_to')
        if date_to:
            qs = qs.filter(visit_date__date__lte=date_to)

        return qs.order_by('-visit_date')

    def get_serializer_class(self):
        if self.action in ('retrieve', 'full'):
            return PatientVisitDetailSerializer
        if self.action == 'create':
            return PatientVisitCreateSerializer
        return PatientVisitListSerializer

    # ── detail alias ────────────────────────────────────────
    @action(detail=True, methods=['get'])
    def full(self, request, pk=None):
        visit = self.get_object()
        return Response(PatientVisitDetailSerializer(visit, context={'request': request}).data)

    # ── record vitals ────────────────────────────────────────
    @action(detail=True, methods=['post', 'put', 'patch'], url_path='add_vitals')
    def add_vitals(self, request, pk=None):
        visit = self.get_object()
        if hasattr(visit, 'vitals'):
            serializer = VitalSignsSerializer(visit.vitals, data=request.data, partial=True)
        else:
            data = {**request.data, 'visit': visit.id}
            serializer = VitalSignsSerializer(data=data)

        serializer.is_valid(raise_exception=True)
        vitals = serializer.save(recorded_by=request.user)
        return Response(VitalSignsSerializer(vitals).data, status=status.HTTP_200_OK)

    # ── write clinical note ──────────────────────────────────
    @action(detail=True, methods=['post', 'put', 'patch'], url_path='add_clinical_note')
    def add_clinical_note(self, request, pk=None):
        visit = self.get_object()

        # Only doctors (or admins) can write clinical notes
        role = request.user.role.name if request.user.role else None
        if role not in ('doctor', 'admin', 'hospital_admin', 'ministry_admin'):
            return Response({'detail': 'Only doctors can write clinical notes.'}, status=status.HTTP_403_FORBIDDEN)

        if hasattr(visit, 'clinical_note'):
            serializer = ClinicalNoteSerializer(visit.clinical_note, data=request.data, partial=True)
        else:
            data = {**request.data, 'visit': visit.id}
            serializer = ClinicalNoteSerializer(data=data)

        serializer.is_valid(raise_exception=True)
        note = serializer.save(doctor=request.user)

        # Auto-complete visit when note is saved
        if visit.status == 'in_progress':
            visit.status = 'completed'
            if not visit.discharge_date:
                visit.discharge_date = timezone.now()
            visit.save(update_fields=['status', 'discharge_date'])

        return Response(ClinicalNoteSerializer(note).data, status=status.HTTP_200_OK)

    # ── full patient history (cross-hospital timeline) ───────
    @action(detail=False, methods=['get'], url_path='patient_history/(?P<patient_id>[^/.]+)')
    def patient_history(self, request, patient_id=None):
        qs = PatientVisit.objects.filter(patient_id=patient_id).select_related(
            'hospital', 'department', 'doctor', 'registered_by',
        ).prefetch_related('vitals', 'clinical_note').order_by('-visit_date')
        serializer = PatientVisitListSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)

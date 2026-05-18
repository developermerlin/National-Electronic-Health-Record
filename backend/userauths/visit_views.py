from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q, Max, Count
from django.utils import timezone

from userauths.models import PatientVisit, VitalSigns, ClinicalNote, Appointment, Patient
from userauths.serializer import (
    PatientVisitListSerializer,
    PatientVisitDetailSerializer,
    PatientVisitCreateSerializer,
    VitalSignsSerializer,
    ClinicalNoteSerializer,
    AppointmentSerializer,
)
from userauths.permissions import PatientAccessControl


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

        # direction=incoming → referrals sent TO this hospital from another hospital
        direction = self.request.query_params.get('direction')
        if direction == 'incoming' and user.hospital:
            qs = qs.filter(
                visit_type='referral',
                referred_to_hospital=user.hospital,
            )
        else:
            # Scope by hospital unless national/district admin
            if role not in ('ministry_admin', 'admin'):
                qs = qs.filter(hospital=user.hospital)

        # triage role: restrict to active triage statuses only (unless explicit status filter given)
        if role == 'triage' and not self.request.query_params.get('status'):
            qs = qs.filter(status__in=['registered', 'triaged', 'waiting', 'in_progress'])

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
        user = request.user
        role = user.role.name if user.role else None

        # Admins can view any patient history
        if role in ('admin', 'ministry_admin'):
            qs = PatientVisit.objects.filter(patient_id=patient_id).select_related(
                'hospital', 'department', 'doctor', 'registered_by',
            ).prefetch_related('vitals', 'clinical_note').order_by('-visit_date')
            PatientAccessControl._log(user, None, 'view', 'admin', 'allowed', request)
            serializer = PatientVisitListSerializer(qs, many=True, context={'request': request})
            return Response(serializer.data)

        # Everyone else: check access control
        try:
            patient = Patient.objects.select_related('hospital').get(pk=patient_id)
        except Patient.DoesNotExist:
            from rest_framework.exceptions import NotFound
            raise NotFound('Patient not found.')

        result = PatientAccessControl.can_access_patient(
            user, patient, action='view', request=request
        )

        if not result['allowed']:
            return Response(
                {'error': result['message']},
                status=status.HTTP_403_FORBIDDEN
            )

        qs = PatientVisit.objects.filter(patient_id=patient_id).select_related(
            'hospital', 'department', 'doctor', 'registered_by',
        ).prefetch_related('vitals', 'clinical_note').order_by('-visit_date')
        serializer = PatientVisitListSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)

    # ── doctor's patient list ─────────────────────────────────
    @action(detail=False, methods=['get'], url_path='my_patients')
    def my_patients(self, request):
        """Distinct patients this doctor has seen, with visit stats."""
        user = request.user
        role = user.role.name if user.role else None

        if role not in ('doctor', 'admin', 'hospital_admin', 'ministry_admin'):
            return Response({'detail': 'Not authorized.'}, status=status.HTTP_403_FORBIDDEN)

        doctor_id = user.id
        if role in ('admin', 'ministry_admin'):
            doctor_id = request.query_params.get('doctor_id', user.id)

        # Aggregate per patient: last visit date + total visits
        stats_qs = (
            PatientVisit.objects
            .filter(doctor_id=doctor_id)
            .values('patient_id')
            .annotate(last_visit=Max('visit_date'), total_visits=Count('id'))
        )
        stats_map = {s['patient_id']: s for s in stats_qs}

        if not stats_map:
            return Response({'count': 0, 'patients': []})

        # Fetch full patient objects
        from userauths.models import Patient
        patients = Patient.objects.filter(id__in=stats_map.keys()).order_by('first_name', 'last_name')

        # Apply search
        search = request.query_params.get('search', '').strip().lower()
        if search:
            patients = patients.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search)  |
                Q(patient_id__icontains=search) |
                Q(phone__icontains=search)
            )

        # Fetch most recent visit details for each patient
        recent_visits = (
            PatientVisit.objects
            .filter(doctor_id=doctor_id, patient_id__in=stats_map.keys())
            .order_by('patient_id', '-visit_date')
        )
        last_visit_map = {}
        for v in recent_visits:
            if v.patient_id not in last_visit_map:
                last_visit_map[v.patient_id] = v

        result = []
        for p in patients:
            s     = stats_map.get(p.id, {})
            lv    = last_visit_map.get(p.id)
            age   = None
            if p.date_of_birth:
                from datetime import date
                today = date.today()
                age = today.year - p.date_of_birth.year - (
                    (today.month, today.day) < (p.date_of_birth.month, p.date_of_birth.day)
                )
            result.append({
                'id':               p.id,
                'patient_id':       p.patient_id,
                'full_name':        f"{p.first_name} {p.last_name}",
                'phone':            p.phone,
                'gender':           p.gender,
                'age':              age,
                'date_of_birth':    str(p.date_of_birth) if p.date_of_birth else None,
                'blood_type':       p.blood_type if hasattr(p, 'blood_type') else None,
                'last_visit_date':  s.get('last_visit').isoformat() if s.get('last_visit') else None,
                'last_visit_type':  lv.visit_type if lv else None,
                'last_visit_status': lv.status if lv else None,
                'last_chief_complaint': lv.chief_complaint if lv else None,
                'total_visits':     s.get('total_visits', 0),
            })

        # Sort by most recent visit
        result.sort(key=lambda x: x['last_visit_date'] or '', reverse=True)

        return Response({'count': len(result), 'patients': result})

    # ── nurse queue ────────────────────────────────
    @action(detail=False, methods=['get'], url_path='nurse_queue')
    def nurse_queue(self, request):
        """Today's triage queue for nurses: checked-in appointments + today's visits."""
        user = request.user
        role = user.role.name if user.role else None

        if role not in ('nurse', 'doctor', 'admin', 'hospital_admin', 'ministry_admin', 'receptionist'):
            return Response({'detail': 'Not authorized.'}, status=status.HTTP_403_FORBIDDEN)

        today = timezone.now().date()
        hosp  = user.hospital

        # Checked-in appointments that do NOT yet have a PatientVisit (need triage)
        # Use OR so patients checked in early (or late) still appear regardless of scheduled date
        appt_qs = Appointment.objects.filter(
            hospital=hosp, status='checked_in',
        ).filter(
            Q(scheduled_at__date=today) | Q(checked_in_at__date=today)
        ).select_related('patient', 'doctor', 'department').order_by('checked_in_at').distinct()
        # Exclude those already triaged (linked visit exists today)
        triaged_appt_ids = PatientVisit.objects.filter(
            hospital=hosp, appointment__isnull=False, visit_date__date=today,
        ).values_list('appointment_id', flat=True)
        appt_qs = appt_qs.exclude(id__in=triaged_appt_ids)

        # ── Retroactive sync: bring PatientVisit status in line with Appointment status ──
        # Covers visits created before the cascade logic existed, or if the server was
        # restarted after appointments were completed.
        PatientVisit.objects.filter(
            hospital=hosp, visit_date__date=today,
            status__in=['triaged', 'waiting'], appointment__status='in_consultation',
        ).update(status='in_progress')

        PatientVisit.objects.filter(
            hospital=hosp, visit_date__date=today,
            status__in=['triaged', 'waiting', 'in_progress'], appointment__status='completed',
        ).update(status='completed')

        # Today's visits
        visits_qs = PatientVisit.objects.filter(
            hospital=hosp, visit_date__date=today,
        ).select_related('patient', 'hospital', 'department', 'doctor', 'registered_by'
        ).prefetch_related('vitals', 'clinical_note').order_by('visit_date')

        counts = {
            'needs_triage':  appt_qs.count(),
            'registered':    visits_qs.filter(status='registered').count(),
            'triaged':       visits_qs.filter(status='triaged').count(),
            'waiting':       visits_qs.filter(status='waiting').count(),
            'in_progress':   visits_qs.filter(status='in_progress').count(),
            'completed':     visits_qs.filter(status='completed').count(),
            'total_visits':  visits_qs.count(),
        }

        return Response({
            'date':          today.isoformat(),
            'counts':        counts,
            'needs_triage':  AppointmentSerializer(appt_qs, many=True).data,
            'today_visits':  PatientVisitListSerializer(visits_qs, many=True, context={'request': request}).data,
        })

    # ── one-shot triage (create visit + vitals) ──────────────
    @action(detail=False, methods=['post'], url_path='triage')
    def triage(self, request):
        """Create a PatientVisit (status=triaged) and optionally record vitals in one call."""
        data = request.data
        user = request.user

        hospital_id = data.get('hospital') or (user.hospital.id if user.hospital else None)
        visit_payload = {
            'patient':         data.get('patient'),
            'appointment':     data.get('appointment') or None,
            'hospital':        hospital_id,
            'department':      data.get('department') or None,
            'doctor':          data.get('doctor') or None,
            'visit_type':      data.get('visit_type', 'outpatient'),
            'chief_complaint': data.get('chief_complaint', ''),
            'visit_date':      data.get('visit_date') or timezone.now().isoformat(),
            'status':          'waiting',
        }

        visit_ser = PatientVisitCreateSerializer(data=visit_payload, context={'request': request})
        visit_ser.is_valid(raise_exception=True)
        visit = visit_ser.save()

        # Record vitals if any vital field provided
        VITAL_FIELDS = [
            'blood_pressure_systolic', 'blood_pressure_diastolic', 'heart_rate',
            'respiratory_rate', 'temperature_celsius', 'weight_kg', 'height_cm',
            'oxygen_saturation', 'blood_glucose', 'notes',
        ]
        vitals_data = {k: data[k] for k in VITAL_FIELDS if data.get(k) not in (None, '', [])}
        vitals = None
        if vitals_data:
            vitals_data['visit'] = visit.id
            v_ser = VitalSignsSerializer(data=vitals_data)
            v_ser.is_valid(raise_exception=True)
            vitals = v_ser.save(recorded_by=user)

        # ── Sync triage assignment back to Appointment so doctor queue stays correct ──
        if visit.appointment_id:
            # Appointment-based triage: if nurse reassigned doctor/department, update the appointment too
            sync = {}
            if visit.doctor_id:
                sync['doctor_id'] = visit.doctor_id
            if visit.department_id:
                sync['department_id'] = visit.department_id
            if sync:
                Appointment.objects.filter(id=visit.appointment_id).update(**sync)

        elif visit.doctor_id:
            # Walk-in triage (no linked appointment): create a checked-in appointment
            # so the doctor sees this patient in their queue
            appt = Appointment.objects.create(
                patient=visit.patient,
                doctor=visit.doctor,
                hospital=visit.hospital,
                department=visit.department,
                scheduled_at=timezone.now(),
                status='checked_in',
                checked_in_at=timezone.now(),
                checked_in_by=user,
                reason=visit.chief_complaint or 'Walk-in visit',
                priority='normal',
                created_by=user,
            )
            # Link visit to the newly created appointment
            visit.appointment = appt
            visit.save(update_fields=['appointment'])

        return Response({
            'message': 'Patient triaged successfully.',
            'visit':   PatientVisitDetailSerializer(visit, context={'request': request}).data,
            'vitals':  VitalSignsSerializer(vitals).data if vitals else None,
        }, status=status.HTTP_201_CREATED)

    # ── completed triage history (all time) ─────────────────
    @action(detail=False, methods=['get'], url_path='completed_history')
    def completed_history(self, request):
        """All completed PatientVisits for this hospital — triage history for nurses."""
        user = request.user
        role = user.role.name if user.role else None

        if role not in ('nurse', 'doctor', 'admin', 'hospital_admin', 'ministry_admin', 'receptionist'):
            return Response({'detail': 'Not authorized.'}, status=status.HTTP_403_FORBIDDEN)

        hosp = user.hospital
        patient_id = request.query_params.get('patient')

        visits_qs = PatientVisit.objects.filter(
            hospital=hosp, status='completed',
        )
        if patient_id:
            visits_qs = visits_qs.filter(patient_id=patient_id)

        visits_qs = visits_qs.select_related('patient', 'hospital', 'department', 'doctor', 'registered_by'
        ).prefetch_related('vitals', 'clinical_note').order_by('-visit_date')[:100]

        return Response({
            'count': visits_qs.count(),
            'visits': PatientVisitDetailSerializer(visits_qs, many=True, context={'request': request}).data,
        })

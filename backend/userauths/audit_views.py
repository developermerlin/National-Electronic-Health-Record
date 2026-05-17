from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q
from django.utils import timezone
from datetime import timedelta

from userauths.models import AuditLog, Patient, User
from userauths.serializer import AuditLogSerializer
from userauths.permissions import CanViewAuditLogs, PatientAccessControl


class AuditLogViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Read-only audit log viewing for authorized administrators.

    List:   GET  /audit/logs/        — paginated audit log list (filterable)
    Detail: GET  /audit/logs/{id}/   — single audit entry
    """
    queryset = AuditLog.objects.all()
    serializer_class = AuditLogSerializer
    permission_classes = [IsAuthenticated, CanViewAuditLogs]

    def get_queryset(self):
        user = self.request.user
        role = user.role.name if user.role else None
        qs = AuditLog.objects.select_related(
            'user', 'patient', 'user_hospital', 'patient_hospital'
        )

        # hospital_admin sees only their hospital's logs
        if role == 'hospital_admin' and user.hospital:
            qs = qs.filter(
                Q(user_hospital=user.hospital) | Q(patient_hospital=user.hospital)
            )
        # district_admin sees their district
        elif role == 'district_admin' and user.district:
            qs = qs.filter(
                Q(user_hospital__district=user.district) |
                Q(patient_hospital__district=user.district)
            )
        # admin/ministry_admin see everything

        # ── Query param filters ──
        action_filter = self.request.query_params.get('action')
        if action_filter:
            qs = qs.filter(action=action_filter)

        access_type = self.request.query_params.get('access_type')
        if access_type:
            qs = qs.filter(access_type=access_type)

        outcome = self.request.query_params.get('outcome')
        if outcome:
            qs = qs.filter(outcome=outcome)

        user_id = self.request.query_params.get('user_id')
        if user_id:
            qs = qs.filter(user_id=user_id)

        patient_id = self.request.query_params.get('patient_id')
        if patient_id:
            qs = qs.filter(patient_id=patient_id)

        date_from = self.request.query_params.get('date_from')
        if date_from:
            qs = qs.filter(created_at__date__gte=date_from)

        date_to = self.request.query_params.get('date_to')
        if date_to:
            qs = qs.filter(created_at__date__lte=date_to)

        search = self.request.query_params.get('search', '').strip()
        if search:
            qs = qs.filter(
                Q(user_name__icontains=search) |
                Q(patient_name__icontains=search) |
                Q(justification__icontains=search)
            )

        return qs.order_by('-created_at')

    @action(detail=False, methods=['get'], url_path='stats')
    def stats(self, request):
        """Return audit statistics for the dashboard."""
        user = request.user
        role = user.role.name if user.role else None
        qs = self.get_queryset()

        now = timezone.now()
        today = now.date()
        week_ago = today - timedelta(days=7)

        total = qs.count()
        today_count = qs.filter(created_at__date=today).count()
        week_count = qs.filter(created_at__date__gte=week_ago).count()

        # By outcome
        allowed = qs.filter(outcome='allowed').count()
        denied = qs.filter(outcome='denied').count()
        override = qs.filter(outcome='override').count()

        # By access type
        same_hosp = qs.filter(access_type='same_hospital').count()
        cross_hosp = qs.filter(access_type='cross_hospital').count()
        emergency = qs.filter(access_type='emergency_override').count()

        # Top users with denied access
        top_denied = list(
            qs.filter(outcome='denied')
            .values('user_name')
            .annotate(count=Q)
            .order_by('-count')[:5]
        )

        return Response({
            'total_logs': total,
            'today': today_count,
            'this_week': week_count,
            'by_outcome': {'allowed': allowed, 'denied': denied, 'override': override},
            'by_access_type': {
                'same_hospital': same_hosp,
                'cross_hospital': cross_hosp,
                'emergency_override': emergency,
            },
            'top_denied_users': top_denied,
        })


class EmergencyAccessView:
    """Standalone helper — not a DRF viewset. Used as mixin or direct call."""

    @staticmethod
    def grant_emergency_access(request, patient_id):
        """
        POST body: { "justification": "Patient in cardiac arrest..." }
        Grants one-time emergency access and logs it.
        Returns the patient data if allowed, or 403 if no justification.
        """
        user = request.user
        justification = request.data.get('justification', '').strip()

        if not justification or len(justification) < 10:
            return Response(
                {'error': 'A detailed justification (at least 10 characters) is required for emergency access.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            patient = Patient.objects.select_related('hospital').get(pk=patient_id)
        except Patient.DoesNotExist:
            return Response({'error': 'Patient not found.'}, status=status.HTTP_404_NOT_FOUND)

        result = PatientAccessControl.can_access_patient(
            user, patient, action='emergency', request=request, justification=justification
        )

        if result['allowed']:
            from userauths.serializer import PatientSerializer
            return Response({
                'allowed': True,
                'message': 'Emergency access granted. This action has been logged.',
                'patient': PatientSerializer(patient).data,
            })
        else:
            return Response(
                {'error': result['message']},
                status=status.HTTP_403_FORBIDDEN
            )

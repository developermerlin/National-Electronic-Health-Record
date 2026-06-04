from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q, Count
from django.utils import timezone
from django.http import HttpResponse
from datetime import timedelta
import csv

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
            .annotate(count=Count('id'))
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


@api_view(['GET'])
@permission_classes([IsAuthenticated, CanViewAuditLogs])
def export_audit_logs(request):
    """
    Export audit logs to CSV for compliance reporting.
    """
    user = request.user
    role = user.role.name if user.role else None
    
    # Build queryset with same filters as main view
    qs = AuditLog.objects.select_related('user', 'patient', 'user_hospital', 'patient_hospital')
    
    # Hospital scoping
    if role == 'hospital_admin' and user.hospital:
        qs = qs.filter(
            Q(user_hospital=user.hospital) | Q(patient_hospital=user.hospital)
        )
    elif role == 'district_admin' and user.district:
        qs = qs.filter(
            Q(user_hospital__district=user.district) |
            Q(patient_hospital__district=user.district)
        )
    
    # Apply filters from query params
    date_from = request.query_params.get('date_from')
    if date_from:
        qs = qs.filter(created_at__date__gte=date_from)
    
    date_to = request.query_params.get('date_to')
    if date_to:
        qs = qs.filter(created_at__date__lte=date_to)
    
    action_filter = request.query_params.get('action')
    if action_filter:
        qs = qs.filter(action=action_filter)
    
    outcome = request.query_params.get('outcome')
    if outcome:
        qs = qs.filter(outcome=outcome)
    
    # Limit to prevent abuse
    qs = qs.order_by('-created_at')[:10000]
    
    # Create CSV response
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="audit_logs_{timezone.now().strftime("%Y%m%d_%H%M%S")}.csv"'
    
    writer = csv.writer(response)
    writer.writerow([
        'Timestamp', 'User', 'User Role', 'User Hospital', 'Action', 
        'Patient', 'Patient Hospital', 'Access Type', 'Outcome', 
        'IP Address', 'Justification'
    ])
    
    for log in qs:
        writer.writerow([
            log.created_at.strftime('%Y-%m-%d %H:%M:%S'),
            log.user_name or 'N/A',
            log.user_role or 'N/A',
            log.user_hospital.name if log.user_hospital else 'N/A',
            log.action,
            log.patient_name or 'N/A',
            log.patient_hospital.name if log.patient_hospital else 'N/A',
            log.access_type,
            log.outcome,
            log.ip_address or 'N/A',
            log.justification or ''
        ])
    
    return response


@api_view(['GET'])
@permission_classes([IsAuthenticated, CanViewAuditLogs])
def audit_compliance_report(request):
    """
    Generate compliance report for regulatory requirements.
    """
    user = request.user
    role = user.role.name if user.role else None
    
    # Date range
    now = timezone.now()
    month_ago = now - timedelta(days=30)
    year_ago = now - timedelta(days=365)
    
    # Base queryset
    qs = AuditLog.objects.all()
    
    # Hospital scoping
    if role == 'hospital_admin' and user.hospital:
        qs = qs.filter(
            Q(user_hospital=user.hospital) | Q(patient_hospital=user.hospital)
        )
    elif role == 'district_admin' and user.district:
        qs = qs.filter(
            Q(user_hospital__district=user.district) |
            Q(patient_hospital__district=user.district)
        )
    
    # Compliance metrics
    total_accesses = qs.count()
    month_accesses = qs.filter(created_at__gte=month_ago).count()
    year_accesses = qs.filter(created_at__gte=year_ago).count()
    
    # Access outcomes
    allowed_count = qs.filter(outcome='allowed').count()
    denied_count = qs.filter(outcome='denied').count()
    override_count = qs.filter(outcome='override').count()
    
    # Emergency access
    emergency_accesses = qs.filter(access_type='emergency_override').count()
    emergency_this_month = qs.filter(
        access_type='emergency_override',
        created_at__gte=month_ago
    ).count()
    
    # Cross-hospital access
    cross_hospital = qs.filter(access_type='cross_hospital').count()
    cross_hospital_month = qs.filter(
        access_type='cross_hospital',
        created_at__gte=month_ago
    ).count()
    
    # Top actions
    top_actions = list(
        qs.values('action')
        .annotate(count=Count('id'))
        .order_by('-count')[:10]
    )
    
    # Users with most denied access
    top_denied_users = list(
        qs.filter(outcome='denied')
        .values('user_name', 'user_role')
        .annotate(count=Count('id'))
        .order_by('-count')[:10]
    )
    
    # Patients with most access attempts
    top_accessed_patients = list(
        qs.filter(patient__isnull=False)
        .values('patient_name', 'patient_id')
        .annotate(count=Count('id'))
        .order_by('-count')[:10]
    )
    
    return Response({
        'report_generated': now.isoformat(),
        'report_period': {
            'from': year_ago.date().isoformat(),
            'to': now.date().isoformat(),
        },
        'summary': {
            'total_access_attempts': total_accesses,
            'last_30_days': month_accesses,
            'last_365_days': year_accesses,
        },
        'access_outcomes': {
            'allowed': allowed_count,
            'denied': denied_count,
            'override': override_count,
            'denial_rate': round((denied_count / total_accesses * 100), 2) if total_accesses > 0 else 0,
        },
        'emergency_access': {
            'total': emergency_accesses,
            'last_30_days': emergency_this_month,
            'percentage_of_total': round((emergency_accesses / total_accesses * 100), 2) if total_accesses > 0 else 0,
        },
        'cross_hospital_access': {
            'total': cross_hospital,
            'last_30_days': cross_hospital_month,
            'percentage_of_total': round((cross_hospital / total_accesses * 100), 2) if total_accesses > 0 else 0,
        },
        'top_actions': top_actions,
        'top_denied_users': top_denied_users,
        'top_accessed_patients': top_accessed_patients,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated, CanViewAuditLogs])
def user_activity_report(request, user_id):
    """
    Get detailed activity report for a specific user.
    """
    try:
        target_user = User.objects.get(id=user_id)
        
        # Access control
        requester = request.user
        if requester.hospital and target_user.hospital != requester.hospital:
            if requester.role.name not in ('admin', 'ministry_admin'):
                return Response({'error': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)
        
        # Get audit logs for this user
        logs = AuditLog.objects.filter(user=target_user).order_by('-created_at')
        
        # Date range
        now = timezone.now()
        week_ago = now - timedelta(days=7)
        month_ago = now - timedelta(days=30)
        
        # Statistics
        total_actions = logs.count()
        week_actions = logs.filter(created_at__gte=week_ago).count()
        month_actions = logs.filter(created_at__gte=month_ago).count()
        
        denied_actions = logs.filter(outcome='denied').count()
        emergency_access = logs.filter(access_type='emergency_override').count()
        
        # Action breakdown
        action_counts = list(
            logs.values('action')
            .annotate(count=Count('id'))
            .order_by('-count')
        )
        
        # Recent activity
        recent = logs[:20]
        recent_data = []
        for log in recent:
            recent_data.append({
                'timestamp': log.created_at.isoformat(),
                'action': log.action,
                'patient_name': log.patient_name or 'N/A',
                'outcome': log.outcome,
                'access_type': log.access_type,
                'ip_address': log.ip_address or 'N/A',
            })
        
        return Response({
            'user_id': target_user.id,
            'user_name': target_user.full_name,
            'user_role': target_user.role.name if target_user.role else 'N/A',
            'hospital': target_user.hospital.name if target_user.hospital else 'N/A',
            'statistics': {
                'total_actions': total_actions,
                'last_7_days': week_actions,
                'last_30_days': month_actions,
                'denied_actions': denied_actions,
                'emergency_access_count': emergency_access,
            },
            'action_breakdown': action_counts,
            'recent_activity': recent_data,
        })
        
    except User.DoesNotExist:
        return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)

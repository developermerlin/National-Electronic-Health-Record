from rest_framework import permissions
from django.utils import timezone

from userauths.models import AuditLog, PatientVisit


class PatientAccessControl:
    """
    Enforces need-to-know access control for patient records.

    Rules:
      1. Same hospital  → allow (log as 'same_hospital')
      2. Active referral/visit at user's hospital → allow (log as 'cross_hospital')
      3. Emergency override with justification → allow (log as 'emergency_override')
      4. Admin / ministry_admin → allow (log as 'admin')
      5. Everything else → deny (log as 'denied')
    """

    @staticmethod
    def can_access_patient(user, patient, action='view', request=None, justification=None):
        """
        Returns a dict: {
            'allowed': bool,
            'access_type': str,
            'outcome': str,
            'message': str (only if denied),
        }
        Also writes an AuditLog entry.
        """
        role = user.role.name if user.role else None
        user_hospital = user.hospital
        patient_hospital = patient.hospital if patient else None

        # ── Rule 4: Admins always allowed ──
        if role in ('admin', 'ministry_admin'):
            access_type = 'admin'
            outcome = 'allowed'
            PatientAccessControl._log(user, patient, action, access_type, outcome, request)
            return {'allowed': True, 'access_type': access_type, 'outcome': outcome}

        # ── Rule 1: Same hospital ──
        if user_hospital and patient_hospital and user_hospital == patient_hospital:
            access_type = 'same_hospital'
            outcome = 'allowed'
            PatientAccessControl._log(user, patient, action, access_type, outcome, request)
            return {'allowed': True, 'access_type': access_type, 'outcome': outcome}

        # ── Rule 2: Patient has an active REFERRAL at user's hospital
        #            AND the user is assigned to that referral (care-team scoping)
        if user_hospital and patient:
            from datetime import timedelta
            recent_threshold = timezone.now() - timedelta(days=30)

            # Check if user is assigned to an active referral visit
            is_assigned_to_referral_visit = PatientVisit.objects.filter(
                patient=patient,
                hospital=user_hospital,
                visit_type='referral',
                status__in=['registered', 'waiting', 'triaged', 'in_progress'],
                visit_date__gte=recent_threshold,
            ).filter(
                Q(doctor=user) | Q(registered_by=user)
            ).exists()

            # Check if user is the assigned doctor for a referral appointment
            is_assigned_to_referral_appointment = patient.appointments.filter(
                hospital=user_hospital,
                is_referral=True,
                status__in=['pending', 'scheduled', 'checked_in', 'in_consultation'],
                doctor=user,
            ).exists()

            if is_assigned_to_referral_visit or is_assigned_to_referral_appointment:
                access_type = 'cross_hospital'
                outcome = 'allowed'
                PatientAccessControl._log(user, patient, action, access_type, outcome, request)
                return {'allowed': True, 'access_type': access_type, 'outcome': outcome}

        # ── Rule 3: Emergency override ──
        if justification and justification.strip():
            access_type = 'emergency_override'
            outcome = 'override'
            PatientAccessControl._log(
                user, patient, action, access_type, outcome, request,
                justification=justification.strip(),
            )
            return {'allowed': True, 'access_type': access_type, 'outcome': outcome}

        # ── Rule 5: Deny ──
        access_type = 'cross_hospital'
        outcome = 'denied'
        PatientAccessControl._log(user, patient, action, access_type, outcome, request)
        return {
            'allowed': False,
            'access_type': access_type,
            'outcome': outcome,
            'message': (
                'You do not have permission to access this patient record. '
                'The patient is registered at a different hospital. '
                'If this is an emergency, use the Emergency Override with a written justification.'
            ),
        }

    @staticmethod
    def _log(user, patient, action, access_type, outcome, request, justification=None):
        """Write an immutable audit log entry."""
        ip = None
        ua = ''
        endpoint = ''
        if request:
            x_forwarded = request.META.get('HTTP_X_FORWARDED_FOR')
            ip = x_forwarded.split(',')[0].strip() if x_forwarded else request.META.get('REMOTE_ADDR')
            ua = request.META.get('HTTP_USER_AGENT', '')
            endpoint = request.path

        AuditLog.objects.create(
            user=user,
            user_name=user.full_name or user.email or 'Unknown',
            user_role=user.role.name if user.role else 'No Role',
            user_hospital=user.hospital,
            patient=patient,
            patient_name=patient.full_name if patient else 'Unknown',
            patient_hospital=patient.hospital if patient else None,
            action=action,
            access_type=access_type,
            outcome=outcome,
            justification=justification or '',
            ip_address=ip,
            user_agent=ua,
            endpoint=endpoint,
        )


class CanViewAuditLogs(permissions.BasePermission):
    """Only admin, ministry_admin, and hospital_admin can view audit logs."""
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        role = user.role.name if user.role else None
        return role in ('admin', 'ministry_admin', 'hospital_admin')

"""
Insurance / NHIA claim management views.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q, Sum, Count
from django.utils import timezone

from userauths.models import InsuranceClaim
from userauths.serializer import InsuranceClaimSerializer, InsuranceClaimCreateSerializer


class InsuranceClaimViewSet(viewsets.ModelViewSet):
    queryset = InsuranceClaim.objects.all().select_related(
        'patient', 'hospital', 'invoice', 'created_by'
    )
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'create':
            return InsuranceClaimCreateSerializer
        return InsuranceClaimSerializer

    def get_queryset(self):
        user = self.request.user
        role = user.role.name if user.role else None
        qs   = super().get_queryset()

        if role in ('admin', 'ministry_admin'):
            pass
        elif role == 'district_admin':
            if user.district:
                qs = qs.filter(hospital__district=user.district)
            else:
                qs = qs.none()
        elif role in ('hospital_admin', 'receptionist', 'cashier', 'nurse', 'doctor'):
            if user.hospital:
                qs = qs.filter(hospital=user.hospital)
            else:
                qs = qs.none()
        else:
            qs = qs.none()

        status_f = self.request.query_params.get('status')
        if status_f:
            qs = qs.filter(status=status_f)

        scheme = self.request.query_params.get('scheme')
        if scheme:
            qs = qs.filter(scheme=scheme)

        patient_id = self.request.query_params.get('patient')
        if patient_id:
            qs = qs.filter(patient_id=patient_id)

        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(claim_number__icontains=search) |
                Q(patient__full_name__icontains=search) |
                Q(patient__patient_id__icontains=search) |
                Q(member_id__icontains=search)
            )

        return qs.order_by('-created_at')

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    # ── Submit ───────────────────────────────────────────────────
    @action(detail=True, methods=['post'])
    def submit(self, request, pk=None):
        claim = self.get_object()
        if claim.status != 'draft':
            return Response({'error': f'Claim is already "{claim.status}".'}, status=status.HTTP_400_BAD_REQUEST)
        claim.status       = 'submitted'
        claim.submitted_at = timezone.now()
        claim.save(update_fields=['status', 'submitted_at'])
        return Response(InsuranceClaimSerializer(claim).data)

    # ── Update status (admin action) ─────────────────────────────
    @action(detail=True, methods=['post'])
    def update_status(self, request, pk=None):
        claim  = self.get_object()
        role   = request.user.role.name if request.user.role else None
        if role not in ('admin', 'ministry_admin', 'hospital_admin'):
            return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)

        new_status = request.data.get('status')
        valid = [c[0] for c in InsuranceClaim.STATUS_CHOICES]
        if new_status not in valid:
            return Response({'error': f'Invalid status. Choose from: {valid}'}, status=status.HTTP_400_BAD_REQUEST)

        claim.status = new_status
        if new_status == 'approved':
            approved_amount = request.data.get('approved_amount')
            if approved_amount is not None:
                claim.approved_amount = approved_amount
        if new_status == 'rejected':
            claim.rejection_reason = request.data.get('rejection_reason', '')
        claim.save()
        return Response(InsuranceClaimSerializer(claim).data)

    # ── Summary stats ─────────────────────────────────────────────
    @action(detail=False, methods=['get'])
    def stats(self, request):
        qs = self.get_queryset()
        return Response({
            'total':        qs.count(),
            'draft':        qs.filter(status='draft').count(),
            'submitted':    qs.filter(status='submitted').count(),
            'approved':     qs.filter(status='approved').count(),
            'rejected':     qs.filter(status='rejected').count(),
            'paid':         qs.filter(status='paid').count(),
            'total_claimed':  float(qs.aggregate(t=Sum('claim_amount'))['t']    or 0),
            'total_approved': float(qs.aggregate(t=Sum('approved_amount'))['t'] or 0),
        })

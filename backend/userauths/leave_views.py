"""
Staff leave / unavailability management views.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q

from userauths.models import StaffLeave
from userauths.serializer import StaffLeaveSerializer, StaffLeaveCreateSerializer


class StaffLeaveViewSet(viewsets.ModelViewSet):
    queryset = StaffLeave.objects.all().select_related('staff', 'staff__role', 'hospital', 'approved_by')
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'create':
            return StaffLeaveCreateSerializer
        return StaffLeaveSerializer

    def get_queryset(self):
        user = self.request.user
        role = user.role.name if user.role else None
        qs   = super().get_queryset()

        # Admin / ministry see all
        if role in ('admin', 'ministry_admin'):
            pass
        # District admin sees their district's hospitals
        elif role == 'district_admin':
            if user.district:
                qs = qs.filter(hospital__district=user.district)
            else:
                qs = qs.none()
        # Hospital admin sees their hospital
        elif role == 'hospital_admin':
            if user.hospital:
                qs = qs.filter(hospital=user.hospital)
            else:
                qs = qs.none()
        # Staff see their own leave requests
        else:
            qs = qs.filter(staff=user)

        # Optional filters
        status_f = self.request.query_params.get('status')
        if status_f:
            qs = qs.filter(status=status_f)

        leave_type = self.request.query_params.get('leave_type')
        if leave_type:
            qs = qs.filter(leave_type=leave_type)

        search = self.request.query_params.get('search')
        if search:
            qs = qs.filter(
                Q(staff__full_name__icontains=search) |
                Q(reason__icontains=search)
            )

        return qs.order_by('-created_at')

    def perform_create(self, serializer):
        user = self.request.user
        serializer.save(staff=user, hospital=user.hospital)

    # ── Approve ──────────────────────────────────────────────────
    @action(detail=True, methods=['post'])
    def approve(self, request, pk=None):
        leave = self.get_object()
        role  = request.user.role.name if request.user.role else None
        if role not in ('admin', 'ministry_admin', 'hospital_admin', 'district_admin'):
            return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
        if leave.status != 'pending':
            return Response({'error': f'Cannot approve a leave with status "{leave.status}".'}, status=status.HTTP_400_BAD_REQUEST)
        leave.status      = 'approved'
        leave.approved_by = request.user
        leave.save(update_fields=['status', 'approved_by'])
        return Response(StaffLeaveSerializer(leave).data)

    # ── Reject ───────────────────────────────────────────────────
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        leave = self.get_object()
        role  = request.user.role.name if request.user.role else None
        if role not in ('admin', 'ministry_admin', 'hospital_admin', 'district_admin'):
            return Response({'error': 'Forbidden'}, status=status.HTTP_403_FORBIDDEN)
        if leave.status != 'pending':
            return Response({'error': f'Cannot reject a leave with status "{leave.status}".'}, status=status.HTTP_400_BAD_REQUEST)
        leave.status           = 'rejected'
        leave.approved_by      = request.user
        leave.rejection_reason = request.data.get('reason', '')
        leave.save(update_fields=['status', 'approved_by', 'rejection_reason'])
        return Response(StaffLeaveSerializer(leave).data)

    # ── Cancel (by the requester) ────────────────────────────────
    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        leave = self.get_object()
        if leave.staff != request.user:
            return Response({'error': 'You can only cancel your own leave requests.'}, status=status.HTTP_403_FORBIDDEN)
        if leave.status == 'approved':
            return Response({'error': 'Cannot cancel an already-approved leave. Contact your manager.'}, status=status.HTTP_400_BAD_REQUEST)
        leave.status = 'cancelled'
        leave.save(update_fields=['status'])
        return Response(StaffLeaveSerializer(leave).data)

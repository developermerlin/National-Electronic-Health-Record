"""
Billing management views.
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.db.models import Q, Sum, Count
from django.db.models.functions import TruncDate, TruncMonth
from django.utils import timezone
from datetime import timedelta

from userauths.models import Invoice, InvoiceItem, Payment, Patient, PatientVisit, Hospital
from userauths.serializer import (
    InvoiceSerializer, InvoiceCreateSerializer,
    InvoiceItemSerializer, PaymentSerializer, PaymentCreateSerializer,
)


class InvoiceViewSet(viewsets.ModelViewSet):
    queryset = Invoice.objects.all().select_related(
        'patient', 'hospital', 'created_by', 'visit', 'doctor'
    ).prefetch_related('items', 'payments')
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'create':
            return InvoiceCreateSerializer
        return InvoiceSerializer

    def get_queryset(self):
        user = self.request.user
        role = user.role.name if user.role else None
        queryset = super().get_queryset()

        if role in ('admin', 'ministry_admin'):
            pass
        elif role == 'district_admin':
            if user.district:
                queryset = queryset.filter(hospital__district=user.district)
            else:
                queryset = queryset.none()
        elif role in ('hospital_admin', 'receptionist', 'cashier', 'nurse', 'doctor'):
            if user.hospital:
                queryset = queryset.filter(hospital=user.hospital)
            else:
                queryset = queryset.none()
        elif role == 'patient':
            if hasattr(user, 'patient_record') and user.patient_record:
                queryset = queryset.filter(patient=user.patient_record)
            else:
                queryset = queryset.none()
        else:
            queryset = queryset.none()

        # Filters
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)

        patient_id = self.request.query_params.get('patient')
        if patient_id:
            queryset = queryset.filter(patient_id=patient_id)

        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(invoice_number__icontains=search) |
                Q(patient__full_name__icontains=search) |
                Q(patient__patient_id__icontains=search)
            )

        date_from = self.request.query_params.get('date_from')
        date_to = self.request.query_params.get('date_to')
        if date_from:
            queryset = queryset.filter(created_at__date__gte=date_from)
        if date_to:
            queryset = queryset.filter(created_at__date__lte=date_to)

        doctor_id = self.request.query_params.get('doctor')
        if doctor_id:
            queryset = queryset.filter(doctor_id=doctor_id)

        return queryset.order_by('-created_at')

    def perform_create(self, serializer):
        user = self.request.user
        role = user.role.name if user.role else None
        doctor = user if role == 'doctor' else None
        serializer.save(created_by=user, doctor=doctor)

    @action(detail=False, methods=['get'])
    def stats(self, request):
        user = request.user
        role = user.role.name if user.role else None
        base_query = self.get_queryset()

        today = timezone.now().date()
        start_of_month = today.replace(day=1)

        stats = {
            'total_invoices': base_query.count(),
            'total_pending': base_query.filter(status__in=('pending', 'partial')).count(),
            'total_paid': base_query.filter(status='paid').count(),
            'total_cancelled': base_query.filter(status='cancelled').count(),
            'total_revenue': base_query.filter(status='paid').aggregate(t=Sum('total'))['t'] or 0,
            'total_outstanding': base_query.filter(status__in=('pending', 'partial')).aggregate(t=Sum('balance_due'))['t'] or 0,
            'today_revenue': base_query.filter(status='paid', created_at__date=today).aggregate(t=Sum('total'))['t'] or 0,
            'this_month_revenue': base_query.filter(status='paid', created_at__date__gte=start_of_month).aggregate(t=Sum('total'))['t'] or 0,
        }
        return Response(stats)

    @action(detail=False, methods=['get'])
    def financial_report(self, request):
        """Revenue summary, daily/monthly trends, payment method and category breakdown."""
        base = self.get_queryset()
        paid = base.filter(status='paid')

        today           = timezone.now().date()
        start_of_month  = today.replace(day=1)
        start_of_year   = today.replace(month=1, day=1)
        thirty_days_ago = today - timedelta(days=29)

        # ── Summary ──────────────────────────────────────────
        summary = {
            'total_invoices':    base.count(),
            'paid_invoices':     paid.count(),
            'pending_invoices':  base.filter(status__in=('pending', 'partial')).count(),
            'total_revenue':     float(paid.aggregate(t=Sum('total'))['t'] or 0),
            'outstanding':       float(base.filter(status__in=('pending','partial')).aggregate(t=Sum('balance_due'))['t'] or 0),
            'today_revenue':     float(paid.filter(created_at__date=today).aggregate(t=Sum('total'))['t'] or 0),
            'month_revenue':     float(paid.filter(created_at__date__gte=start_of_month).aggregate(t=Sum('total'))['t'] or 0),
            'year_revenue':      float(paid.filter(created_at__date__gte=start_of_year).aggregate(t=Sum('total'))['t'] or 0),
        }

        # ── Daily revenue — last 30 days ──────────────────────
        daily_qs = (
            paid.filter(created_at__date__gte=thirty_days_ago)
            .annotate(day=TruncDate('created_at'))
            .values('day')
            .annotate(revenue=Sum('total'), count=Count('id'))
            .order_by('day')
        )
        # Fill all 30 days (including zeros)
        daily_map = {r['day']: {'revenue': float(r['revenue']), 'count': r['count']} for r in daily_qs}
        daily_trend = []
        for i in range(29, -1, -1):
            d = today - timedelta(days=i)
            row = daily_map.get(d, {'revenue': 0.0, 'count': 0})
            daily_trend.append({'date': d.isoformat(), 'label': d.strftime('%d %b'), 'revenue': row['revenue'], 'count': row['count']})

        # ── Monthly revenue — last 12 months ─────────────────
        twelve_months_ago = today.replace(day=1) - timedelta(days=335)
        monthly_qs = (
            paid.filter(created_at__date__gte=twelve_months_ago)
            .annotate(month=TruncMonth('created_at'))
            .values('month')
            .annotate(revenue=Sum('total'), count=Count('id'))
            .order_by('month')
        )
        monthly_trend = [
            {'month': r['month'].strftime('%b %Y'), 'revenue': float(r['revenue']), 'count': r['count']}
            for r in monthly_qs
        ]

        # ── Revenue by payment method ─────────────────────────
        method_qs = (
            Payment.objects.filter(invoice__in=paid)
            .values('method')
            .annotate(total=Sum('amount'), count=Count('id'))
            .order_by('-total')
        )
        by_method = [
            {'method': r['method'], 'total': float(r['total']), 'count': r['count']}
            for r in method_qs
        ]

        # ── Revenue by service category ───────────────────────
        category_qs = (
            InvoiceItem.objects.filter(invoice__in=paid)
            .values('category')
            .annotate(total=Sum('line_total'), count=Count('id'))
            .order_by('-total')
        )
        by_category = [
            {'category': r['category'] or 'uncategorised', 'total': float(r['total']), 'count': r['count']}
            for r in category_qs
        ]

        return Response({
            'summary':       summary,
            'daily_trend':   daily_trend,
            'monthly_trend': monthly_trend,
            'by_method':     by_method,
            'by_category':   by_category,
        })

    @action(detail=False, methods=['get'])
    def doctor_report(self, request):
        """Per-doctor billing summary for the calling hospital. Doctors see only themselves."""
        role = request.user.role.name if request.user.role else None
        base = self.get_queryset()

        # Restrict doctors to own invoices only
        if role == 'doctor':
            base = base.filter(doctor=request.user)

        today           = timezone.now().date()
        start_of_month  = today.replace(day=1)
        start_of_year   = today.replace(month=1, day=1)
        thirty_days_ago = today - timedelta(days=29)

        paid = base.filter(status='paid')

        summary = {
            'total_invoices':   base.count(),
            'paid_invoices':    paid.count(),
            'pending_invoices': base.filter(status__in=('pending', 'partial')).count(),
            'total_revenue':    float(paid.aggregate(t=Sum('total'))['t'] or 0),
            'month_revenue':    float(paid.filter(created_at__date__gte=start_of_month).aggregate(t=Sum('total'))['t'] or 0),
            'year_revenue':     float(paid.filter(created_at__date__gte=start_of_year).aggregate(t=Sum('total'))['t'] or 0),
            'outstanding':      float(base.filter(status__in=('pending','partial')).aggregate(t=Sum('balance_due'))['t'] or 0),
        }

        # Per-doctor breakdown (admin/hospital_admin view)
        doctor_breakdown = []
        if role not in ('doctor',):
            dr_qs = (
                paid
                .exclude(doctor__isnull=True)
                .values('doctor', 'doctor__full_name')
                .annotate(revenue=Sum('total'), count=Count('id'))
                .order_by('-revenue')
            )
            doctor_breakdown = [
                {
                    'doctor_id':   r['doctor'],
                    'doctor_name': r['doctor__full_name'],
                    'revenue':     float(r['revenue']),
                    'count':       r['count'],
                }
                for r in dr_qs
            ]

        # Daily trend
        daily_qs = (
            paid.filter(created_at__date__gte=thirty_days_ago)
            .annotate(day=TruncDate('created_at'))
            .values('day')
            .annotate(revenue=Sum('total'), count=Count('id'))
            .order_by('day')
        )
        daily_map = {r['day']: {'revenue': float(r['revenue']), 'count': r['count']} for r in daily_qs}
        daily_trend = []
        for i in range(29, -1, -1):
            d   = today - timedelta(days=i)
            row = daily_map.get(d, {'revenue': 0.0, 'count': 0})
            daily_trend.append({'label': d.strftime('%d %b'), 'revenue': row['revenue'], 'count': row['count']})

        # Category breakdown
        cat_qs = (
            InvoiceItem.objects.filter(invoice__in=paid)
            .values('category')
            .annotate(total=Sum('line_total'), count=Count('id'))
            .order_by('-total')
        )
        by_category = [
            {'category': r['category'] or 'uncategorised', 'total': float(r['total']), 'count': r['count']}
            for r in cat_qs
        ]

        return Response({
            'summary':           summary,
            'doctor_breakdown':  doctor_breakdown,
            'daily_trend':       daily_trend,
            'by_category':       by_category,
        })

    @action(detail=True, methods=['post'])
    def add_item(self, request, pk=None):
        invoice = self.get_object()
        serializer = InvoiceItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(invoice=invoice)
        invoice.recalculate_totals()
        return Response(InvoiceSerializer(invoice).data)

    @action(detail=True, methods=['post'])
    def remove_item(self, request, pk=None):
        invoice = self.get_object()
        item_id = request.data.get('item_id')
        try:
            item = invoice.items.get(id=item_id)
            item.delete()
            invoice.recalculate_totals()
            return Response(InvoiceSerializer(invoice).data)
        except InvoiceItem.DoesNotExist:
            return Response({'error': 'Item not found.'}, status=status.HTTP_404_NOT_FOUND)

    @action(detail=True, methods=['post'])
    def record_payment(self, request, pk=None):
        invoice = self.get_object()
        serializer = PaymentCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(invoice=invoice, received_by=request.user)
        invoice.refresh_from_db()
        return Response(InvoiceSerializer(invoice).data)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        invoice = self.get_object()
        if invoice.status == 'paid':
            return Response({'error': 'Cannot cancel a fully paid invoice.'}, status=status.HTTP_400_BAD_REQUEST)
        invoice.status = 'cancelled'
        invoice.save(update_fields=['status'])
        return Response(InvoiceSerializer(invoice).data)


class PaymentViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Payment.objects.all().select_related('invoice', 'received_by')
    serializer_class = PaymentSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        role = user.role.name if user.role else None
        queryset = super().get_queryset()

        if role in ('admin', 'ministry_admin'):
            pass
        elif role == 'district_admin':
            if user.district:
                queryset = queryset.filter(invoice__hospital__district=user.district)
            else:
                queryset = queryset.none()
        elif role in ('hospital_admin', 'receptionist', 'cashier'):
            if user.hospital:
                queryset = queryset.filter(invoice__hospital=user.hospital)
            else:
                queryset = queryset.none()
        elif role == 'patient':
            if hasattr(user, 'patient_record') and user.patient_record:
                queryset = queryset.filter(invoice__patient=user.patient_record)
            else:
                queryset = queryset.none()
        else:
            queryset = queryset.none()

        invoice_id = self.request.query_params.get('invoice')
        if invoice_id:
            queryset = queryset.filter(invoice_id=invoice_id)

        return queryset.order_by('-created_at')

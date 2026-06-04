"""
Advanced Analytics & Reporting Views
Endpoints for comprehensive hospital performance metrics, financial analytics, and clinical quality indicators.
"""
from django.utils import timezone
from django.db.models import Count, Sum, Avg, Q, F, FloatField, ExpressionWrapper
from django.db.models.functions import TruncDate, TruncMonth, TruncWeek
from django.http import HttpResponse
from datetime import timedelta
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
import csv
import json

from .models import (
    Hospital, PatientVisit, Patient, Invoice, Payment, LabTest,
    InpatientAdmission, Prescription, Appointment, User, District, Region
)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def hospital_performance_metrics(request):
    """
    Comprehensive hospital performance analytics.
    Metrics: patient flow, wait times, bed occupancy, service utilization.
    """
    user = request.user
    role = user.role.name if user.role else None
    
    if role not in ('admin', 'hospital_admin', 'ministry_admin', 'district_admin'):
        return Response({'error': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)
    
    hospital = user.hospital
    if not hospital and role not in ('admin', 'ministry_admin', 'district_admin'):
        return Response({'error': 'No hospital assigned.'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Date ranges
    now = timezone.now()
    today = now.date()
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)
    year_ago = now - timedelta(days=365)
    
    # Base querysets
    if hospital:
        visits_qs = PatientVisit.objects.filter(hospital=hospital)
        admissions_qs = InpatientAdmission.objects.filter(hospital=hospital)
        patients_qs = Patient.objects.filter(hospital=hospital)
    else:
        visits_qs = PatientVisit.objects.all()
        admissions_qs = InpatientAdmission.objects.all()
        patients_qs = Patient.objects.all()
    
    # ── PATIENT FLOW METRICS ──
    total_visits = visits_qs.count()
    visits_today = visits_qs.filter(visit_date__date=today).count()
    visits_this_week = visits_qs.filter(visit_date__gte=week_ago).count()
    visits_this_month = visits_qs.filter(visit_date__gte=month_ago).count()
    
    # Visit type distribution
    visit_by_type = list(
        visits_qs.values('visit_type')
        .annotate(count=Count('id'))
        .order_by('-count')
    )
    
    # Daily visit trend (last 30 days)
    daily_visits = list(
        visits_qs.filter(visit_date__gte=month_ago)
        .annotate(date=TruncDate('visit_date'))
        .values('date')
        .annotate(count=Count('id'))
        .order_by('date')
    )
    
    # ── WAIT TIME ANALYSIS ──
    # Calculate average time from registration to completion
    completed_visits = visits_qs.filter(
        status='completed',
        visit_date__gte=month_ago
    ).exclude(discharge_date__isnull=True)
    
    if completed_visits.exists():
        avg_wait_time_seconds = completed_visits.annotate(
            duration=ExpressionWrapper(
                F('discharge_date') - F('visit_date'),
                output_field=FloatField()
            )
        ).aggregate(avg=Avg('duration'))['avg']
        avg_wait_time_hours = round(avg_wait_time_seconds / 3600, 1) if avg_wait_time_seconds else 0
    else:
        avg_wait_time_hours = 0
    
    # ── BED OCCUPANCY & IPD METRICS ──
    current_admissions = admissions_qs.filter(discharge_date__isnull=True).count()
    admissions_this_month = admissions_qs.filter(admission_date__gte=month_ago).count()
    
    # Average length of stay (discharged patients only)
    discharged = admissions_qs.filter(discharge_date__isnull=False)
    if discharged.exists():
        total_days = sum([
            (adm.discharge_date - adm.admission_date).days
            for adm in discharged
            if adm.discharge_date and adm.admission_date
        ])
        avg_length_of_stay = round(total_days / discharged.count(), 1) if discharged.count() > 0 else 0
    else:
        avg_length_of_stay = 0
    
    # ── DEPARTMENT UTILIZATION ──
    dept_utilization = list(
        visits_qs.filter(department__isnull=False, visit_date__gte=month_ago)
        .values('department__name')
        .annotate(visits=Count('id'))
        .order_by('-visits')[:10]
    )
    
    # ── SERVICE UTILIZATION ──
    lab_tests_count = LabTest.objects.filter(
        hospital=hospital, created_at__gte=month_ago
    ).count() if hospital else LabTest.objects.filter(created_at__gte=month_ago).count()
    
    prescriptions_count = Prescription.objects.filter(
        hospital=hospital, created_at__gte=month_ago
    ).count() if hospital else Prescription.objects.filter(created_at__gte=month_ago).count()
    
    # ── PATIENT DEMOGRAPHICS ──
    gender_distribution = list(
        patients_qs.values('gender')
        .annotate(count=Count('id'))
    )
    
    # Age groups
    from datetime import date
    age_groups = {'0-17': 0, '18-35': 0, '36-50': 0, '51-65': 0, '65+': 0}
    for patient in patients_qs.filter(date_of_birth__isnull=False):
        age = (date.today() - patient.date_of_birth).days // 365
        if age < 18:
            age_groups['0-17'] += 1
        elif age < 36:
            age_groups['18-35'] += 1
        elif age < 51:
            age_groups['36-50'] += 1
        elif age < 66:
            age_groups['51-65'] += 1
        else:
            age_groups['65+'] += 1
    
    return Response({
        'patient_flow': {
            'total_visits': total_visits,
            'visits_today': visits_today,
            'visits_this_week': visits_this_week,
            'visits_this_month': visits_this_month,
            'visit_by_type': visit_by_type,
            'daily_trend': [{'date': d['date'].isoformat(), 'count': d['count']} for d in daily_visits],
        },
        'wait_times': {
            'avg_wait_time_hours': avg_wait_time_hours,
        },
        'ipd_metrics': {
            'current_admissions': current_admissions,
            'admissions_this_month': admissions_this_month,
            'avg_length_of_stay': avg_length_of_stay,
        },
        'department_utilization': dept_utilization,
        'service_utilization': {
            'lab_tests_this_month': lab_tests_count,
            'prescriptions_this_month': prescriptions_count,
        },
        'demographics': {
            'gender_distribution': gender_distribution,
            'age_groups': [{'group': k, 'count': v} for k, v in age_groups.items()],
        },
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def financial_analytics(request):
    """
    Financial performance metrics: revenue trends, outstanding payments, department revenue.
    """
    user = request.user
    role = user.role.name if user.role else None
    
    if role not in ('admin', 'hospital_admin', 'ministry_admin', 'district_admin', 'cashier'):
        return Response({'error': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)
    
    hospital = user.hospital
    if not hospital and role not in ('admin', 'ministry_admin', 'district_admin'):
        return Response({'error': 'No hospital assigned.'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Date ranges
    now = timezone.now()
    month_ago = now - timedelta(days=30)
    year_ago = now - timedelta(days=365)
    
    # Base querysets
    if hospital:
        invoices_qs = Invoice.objects.filter(hospital=hospital)
        payments_qs = Payment.objects.filter(invoice__hospital=hospital)
    else:
        invoices_qs = Invoice.objects.all()
        payments_qs = Payment.objects.all()
    
    # ── REVENUE METRICS ──
    total_billed = invoices_qs.aggregate(total=Sum('total'))['total'] or 0
    total_collected = invoices_qs.aggregate(total=Sum('amount_paid'))['total'] or 0
    total_outstanding = invoices_qs.aggregate(total=Sum('balance_due'))['total'] or 0
    
    billed_this_month = invoices_qs.filter(created_at__gte=month_ago).aggregate(total=Sum('total'))['total'] or 0
    collected_this_month = payments_qs.filter(created_at__gte=month_ago).aggregate(total=Sum('amount'))['total'] or 0
    
    # Collection rate
    collection_rate = round((total_collected / total_billed * 100), 1) if total_billed > 0 else 0
    
    # ── REVENUE TRENDS (last 12 months) ──
    monthly_revenue = list(
        invoices_qs.filter(created_at__gte=year_ago)
        .annotate(month=TruncMonth('created_at'))
        .values('month')
        .annotate(
            billed=Sum('total'),
            collected=Sum('amount_paid')
        )
        .order_by('month')
    )
    
    # ── PAYMENT METHOD DISTRIBUTION ──
    payment_methods = list(
        payments_qs.filter(created_at__gte=month_ago)
        .values('method')
        .annotate(
            count=Count('id'),
            total_amount=Sum('amount')
        )
        .order_by('-total_amount')
    )
    
    # ── INVOICE STATUS BREAKDOWN ──
    invoice_status = list(
        invoices_qs.values('status')
        .annotate(
            count=Count('id'),
            total_amount=Sum('total')
        )
    )
    
    # ── TOP REVENUE GENERATING SERVICES ──
    # This would require invoice items breakdown - simplified for now
    
    # ── OUTSTANDING PAYMENTS BY AGE ──
    outstanding_invoices = invoices_qs.filter(balance_due__gt=0)
    aging_buckets = {
        '0-30 days': 0,
        '31-60 days': 0,
        '61-90 days': 0,
        '90+ days': 0,
    }
    
    for inv in outstanding_invoices:
        days_old = (now.date() - inv.created_at.date()).days
        if days_old <= 30:
            aging_buckets['0-30 days'] += float(inv.balance_due)
        elif days_old <= 60:
            aging_buckets['31-60 days'] += float(inv.balance_due)
        elif days_old <= 90:
            aging_buckets['61-90 days'] += float(inv.balance_due)
        else:
            aging_buckets['90+ days'] += float(inv.balance_due)
    
    return Response({
        'revenue_summary': {
            'total_billed': float(total_billed),
            'total_collected': float(total_collected),
            'total_outstanding': float(total_outstanding),
            'billed_this_month': float(billed_this_month),
            'collected_this_month': float(collected_this_month),
            'collection_rate': collection_rate,
        },
        'monthly_revenue_trend': [
            {
                'month': r['month'].strftime('%b %Y'),
                'billed': float(r['billed'] or 0),
                'collected': float(r['collected'] or 0),
            }
            for r in monthly_revenue
        ],
        'payment_methods': [
            {
                'method': p['method'],
                'count': p['count'],
                'total_amount': float(p['total_amount'] or 0),
            }
            for p in payment_methods
        ],
        'invoice_status': [
            {
                'status': s['status'],
                'count': s['count'],
                'total_amount': float(s['total_amount'] or 0),
            }
            for s in invoice_status
        ],
        'accounts_receivable_aging': [
            {'bucket': k, 'amount': v}
            for k, v in aging_buckets.items()
        ],
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def clinical_quality_indicators(request):
    """
    Clinical quality metrics: readmission rates, prescription patterns, lab turnaround times.
    """
    user = request.user
    role = user.role.name if user.role else None
    
    if role not in ('admin', 'hospital_admin', 'ministry_admin', 'district_admin', 'doctor'):
        return Response({'error': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)
    
    hospital = user.hospital
    if not hospital and role not in ('admin', 'ministry_admin', 'district_admin'):
        return Response({'error': 'No hospital assigned.'}, status=status.HTTP_400_BAD_REQUEST)
    
    # Date ranges
    now = timezone.now()
    month_ago = now - timedelta(days=30)
    
    # Base querysets
    if hospital:
        admissions_qs = InpatientAdmission.objects.filter(hospital=hospital)
        lab_tests_qs = LabTest.objects.filter(hospital=hospital)
        prescriptions_qs = Prescription.objects.filter(hospital=hospital)
    else:
        admissions_qs = InpatientAdmission.objects.all()
        lab_tests_qs = LabTest.objects.all()
        prescriptions_qs = Prescription.objects.all()
    
    # ── READMISSION RATE (30-day) ──
    discharged_last_month = admissions_qs.filter(
        discharge_date__gte=month_ago,
        discharge_date__isnull=False
    )
    
    readmissions = 0
    for adm in discharged_last_month:
        # Check if patient was readmitted within 30 days
        readmit_check = admissions_qs.filter(
            patient=adm.patient,
            admission_date__gte=adm.discharge_date,
            admission_date__lte=adm.discharge_date + timedelta(days=30)
        ).exclude(id=adm.id).exists()
        if readmit_check:
            readmissions += 1
    
    readmission_rate = round((readmissions / discharged_last_month.count() * 100), 1) if discharged_last_month.count() > 0 else 0
    
    # ── LAB TURNAROUND TIME ──
    completed_labs = lab_tests_qs.filter(
        status='completed',
        completed_at__isnull=False,
        created_at__gte=month_ago
    )
    
    if completed_labs.exists():
        total_hours = sum([
            (lab.completed_at - lab.created_at).total_seconds() / 3600
            for lab in completed_labs
        ])
        avg_lab_turnaround = round(total_hours / completed_labs.count(), 1)
    else:
        avg_lab_turnaround = 0
    
    # ── PRESCRIPTION PATTERNS ──
    total_prescriptions = prescriptions_qs.filter(created_at__gte=month_ago).count()
    dispensed_prescriptions = prescriptions_qs.filter(
        created_at__gte=month_ago,
        is_dispensed=True
    ).count()
    
    dispensing_rate = round((dispensed_prescriptions / total_prescriptions * 100), 1) if total_prescriptions > 0 else 0
    
    # ── CRITICAL LAB VALUES ──
    critical_labs = lab_tests_qs.filter(
        is_critical=True,
        created_at__gte=month_ago
    ).count()
    
    critical_notified = lab_tests_qs.filter(
        is_critical=True,
        doctor_notified=True,
        created_at__gte=month_ago
    ).count()
    
    critical_notification_rate = round((critical_notified / critical_labs * 100), 1) if critical_labs > 0 else 100
    
    return Response({
        'readmission_metrics': {
            'readmission_rate': readmission_rate,
            'total_discharges': discharged_last_month.count(),
            'readmissions': readmissions,
        },
        'lab_performance': {
            'avg_turnaround_hours': avg_lab_turnaround,
            'total_tests': completed_labs.count(),
            'critical_labs': critical_labs,
            'critical_notification_rate': critical_notification_rate,
        },
        'prescription_metrics': {
            'total_prescriptions': total_prescriptions,
            'dispensed': dispensed_prescriptions,
            'dispensing_rate': dispensing_rate,
        },
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def multi_hospital_comparison(request):
    """
    Multi-hospital comparison dashboard for Ministry/District administrators.
    Compare key metrics across hospitals in a district or nationwide.
    """
    user = request.user
    role = user.role.name if user.role else None
    
    if role not in ('admin', 'ministry_admin', 'district_admin'):
        return Response({'error': 'Access denied. Ministry or District admin only.'}, status=status.HTTP_403_FORBIDDEN)
    
    # Date ranges
    now = timezone.now()
    month_ago = now - timedelta(days=30)
    
    # Filter hospitals based on role
    if role == 'district_admin' and user.district:
        hospitals = Hospital.objects.filter(district=user.district, is_active=True)
    elif role == 'ministry_admin':
        # Ministry can see all hospitals
        hospitals = Hospital.objects.filter(is_active=True)
    else:
        # Super admin sees all
        hospitals = Hospital.objects.filter(is_active=True)
    
    # Get filter parameters
    district_id = request.query_params.get('district_id')
    region_id = request.query_params.get('region_id')
    hospital_type = request.query_params.get('hospital_type')
    
    if district_id:
        hospitals = hospitals.filter(district_id=district_id)
    if region_id:
        hospitals = hospitals.filter(district__region_id=region_id)
    if hospital_type:
        hospitals = hospitals.filter(hospital_type=hospital_type)
    
    # Build comparison data
    comparison_data = []
    
    for hospital in hospitals:
        # Patient flow
        total_visits = PatientVisit.objects.filter(hospital=hospital).count()
        visits_this_month = PatientVisit.objects.filter(
            hospital=hospital,
            visit_date__gte=month_ago
        ).count()
        
        # Staff count
        staff_count = User.objects.filter(hospital=hospital, is_active=True).count()
        
        # Patient count
        patient_count = Patient.objects.filter(hospital=hospital, is_active=True).count()
        
        # Financial metrics
        total_billed = Invoice.objects.filter(hospital=hospital).aggregate(
            total=Sum('total')
        )['total'] or 0
        
        total_collected = Invoice.objects.filter(hospital=hospital).aggregate(
            total=Sum('amount_paid')
        )['total'] or 0
        
        collection_rate = round((total_collected / total_billed * 100), 1) if total_billed > 0 else 0
        
        # IPD metrics
        current_admissions = InpatientAdmission.objects.filter(
            hospital=hospital,
            discharge_date__isnull=True
        ).count()
        
        # Lab metrics
        lab_tests_this_month = LabTest.objects.filter(
            hospital=hospital,
            created_at__gte=month_ago
        ).count()
        
        comparison_data.append({
            'hospital_id': hospital.id,
            'hospital_name': hospital.name,
            'hospital_type': hospital.hospital_type,
            'hospital_type_display': hospital.get_hospital_type_display() if hasattr(hospital, 'get_hospital_type_display') else hospital.hospital_type,
            'district': hospital.district.name if hospital.district else None,
            'region': hospital.district.region.name if hospital.district and hospital.district.region else None,
            'metrics': {
                'total_visits': total_visits,
                'visits_this_month': visits_this_month,
                'staff_count': staff_count,
                'patient_count': patient_count,
                'total_billed': float(total_billed),
                'total_collected': float(total_collected),
                'collection_rate': collection_rate,
                'current_admissions': current_admissions,
                'lab_tests_this_month': lab_tests_this_month,
            }
        })
    
    # Calculate aggregates
    total_hospitals = len(comparison_data)
    aggregate_metrics = {
        'total_visits': sum(h['metrics']['total_visits'] for h in comparison_data),
        'total_staff': sum(h['metrics']['staff_count'] for h in comparison_data),
        'total_patients': sum(h['metrics']['patient_count'] for h in comparison_data),
        'total_billed': sum(h['metrics']['total_billed'] for h in comparison_data),
        'total_collected': sum(h['metrics']['total_collected'] for h in comparison_data),
        'avg_collection_rate': round(sum(h['metrics']['collection_rate'] for h in comparison_data) / total_hospitals, 1) if total_hospitals > 0 else 0,
    }
    
    # Top performers
    top_by_visits = sorted(comparison_data, key=lambda x: x['metrics']['visits_this_month'], reverse=True)[:5]
    top_by_collection = sorted(comparison_data, key=lambda x: x['metrics']['collection_rate'], reverse=True)[:5]
    
    return Response({
        'summary': {
            'total_hospitals': total_hospitals,
            'aggregate_metrics': aggregate_metrics,
        },
        'hospitals': comparison_data,
        'top_performers': {
            'by_visits': top_by_visits,
            'by_collection_rate': top_by_collection,
        },
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_analytics_csv(request):
    """
    Export analytics data to CSV format.
    Query params: type (performance|financial|clinical|comparison)
    """
    user = request.user
    role = user.role.name if user.role else None
    
    if role not in ('admin', 'hospital_admin', 'ministry_admin', 'district_admin'):
        return Response({'error': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)
    
    export_type = request.query_params.get('type', 'performance')
    hospital = user.hospital
    
    # Create CSV response
    response = HttpResponse(content_type='text/csv')
    response['Content-Disposition'] = f'attachment; filename="analytics_{export_type}_{timezone.now().strftime("%Y%m%d_%H%M%S")}.csv"'
    
    writer = csv.writer(response)
    
    now = timezone.now()
    month_ago = now - timedelta(days=30)
    
    if export_type == 'performance':
        # Performance metrics export
        writer.writerow(['Hospital Performance Metrics Report'])
        writer.writerow(['Generated:', now.strftime('%Y-%m-%d %H:%M:%S')])
        writer.writerow(['Hospital:', hospital.name if hospital else 'All Hospitals'])
        writer.writerow([])
        
        # Patient flow
        writer.writerow(['PATIENT FLOW METRICS'])
        writer.writerow(['Metric', 'Value'])
        
        visits_qs = PatientVisit.objects.filter(hospital=hospital) if hospital else PatientVisit.objects.all()
        writer.writerow(['Total Visits', visits_qs.count()])
        writer.writerow(['Visits This Month', visits_qs.filter(visit_date__gte=month_ago).count()])
        writer.writerow([])
        
        # Visit types
        writer.writerow(['VISIT TYPE DISTRIBUTION'])
        writer.writerow(['Visit Type', 'Count'])
        visit_types = visits_qs.values('visit_type').annotate(count=Count('id')).order_by('-count')
        for vt in visit_types:
            writer.writerow([vt['visit_type'], vt['count']])
        writer.writerow([])
        
        # Department utilization
        writer.writerow(['DEPARTMENT UTILIZATION (Last 30 Days)'])
        writer.writerow(['Department', 'Visits'])
        dept_data = visits_qs.filter(
            department__isnull=False, 
            visit_date__gte=month_ago
        ).values('department__name').annotate(visits=Count('id')).order_by('-visits')[:10]
        for dept in dept_data:
            writer.writerow([dept['department__name'], dept['visits']])
    
    elif export_type == 'financial':
        # Financial analytics export
        writer.writerow(['Financial Analytics Report'])
        writer.writerow(['Generated:', now.strftime('%Y-%m-%d %H:%M:%S')])
        writer.writerow(['Hospital:', hospital.name if hospital else 'All Hospitals'])
        writer.writerow([])
        
        invoices_qs = Invoice.objects.filter(hospital=hospital) if hospital else Invoice.objects.all()
        
        writer.writerow(['REVENUE SUMMARY'])
        writer.writerow(['Metric', 'Amount (Le)'])
        total_billed = invoices_qs.aggregate(total=Sum('total'))['total'] or 0
        total_collected = invoices_qs.aggregate(total=Sum('amount_paid'))['total'] or 0
        total_outstanding = invoices_qs.aggregate(total=Sum('balance_due'))['total'] or 0
        
        writer.writerow(['Total Billed', f'{total_billed:.2f}'])
        writer.writerow(['Total Collected', f'{total_collected:.2f}'])
        writer.writerow(['Total Outstanding', f'{total_outstanding:.2f}'])
        writer.writerow(['Collection Rate', f'{(total_collected/total_billed*100):.1f}%' if total_billed > 0 else '0%'])
        writer.writerow([])
        
        # Monthly revenue trend
        writer.writerow(['MONTHLY REVENUE TREND (Last 12 Months)'])
        writer.writerow(['Month', 'Billed (Le)', 'Collected (Le)'])
        year_ago = now - timedelta(days=365)
        monthly_data = invoices_qs.filter(created_at__gte=year_ago).annotate(
            month=TruncMonth('created_at')
        ).values('month').annotate(
            billed=Sum('total'),
            collected=Sum('amount_paid')
        ).order_by('month')
        
        for month in monthly_data:
            writer.writerow([
                month['month'].strftime('%b %Y'),
                f'{month["billed"]:.2f}' if month['billed'] else '0.00',
                f'{month["collected"]:.2f}' if month['collected'] else '0.00'
            ])
    
    elif export_type == 'clinical':
        # Clinical quality indicators export
        writer.writerow(['Clinical Quality Indicators Report'])
        writer.writerow(['Generated:', now.strftime('%Y-%m-%d %H:%M:%S')])
        writer.writerow(['Hospital:', hospital.name if hospital else 'All Hospitals'])
        writer.writerow([])
        
        admissions_qs = InpatientAdmission.objects.filter(hospital=hospital) if hospital else InpatientAdmission.objects.all()
        lab_tests_qs = LabTest.objects.filter(hospital=hospital) if hospital else LabTest.objects.all()
        prescriptions_qs = Prescription.objects.filter(hospital=hospital) if hospital else Prescription.objects.all()
        
        writer.writerow(['QUALITY METRICS'])
        writer.writerow(['Metric', 'Value'])
        
        # Readmission rate
        discharged = admissions_qs.filter(discharge_date__gte=month_ago, discharge_date__isnull=False)
        readmissions = 0
        for adm in discharged:
            if admissions_qs.filter(
                patient=adm.patient,
                admission_date__gte=adm.discharge_date,
                admission_date__lte=adm.discharge_date + timedelta(days=30)
            ).exclude(id=adm.id).exists():
                readmissions += 1
        
        readmission_rate = (readmissions / discharged.count() * 100) if discharged.count() > 0 else 0
        writer.writerow(['30-Day Readmission Rate', f'{readmission_rate:.1f}%'])
        writer.writerow(['Total Discharges', discharged.count()])
        writer.writerow(['Readmissions', readmissions])
        writer.writerow([])
        
        # Lab performance
        completed_labs = lab_tests_qs.filter(status='completed', completed_at__isnull=False, created_at__gte=month_ago)
        if completed_labs.exists():
            total_hours = sum([(lab.completed_at - lab.created_at).total_seconds() / 3600 for lab in completed_labs])
            avg_turnaround = total_hours / completed_labs.count()
        else:
            avg_turnaround = 0
        
        writer.writerow(['LAB PERFORMANCE'])
        writer.writerow(['Average Turnaround Time (hours)', f'{avg_turnaround:.1f}'])
        writer.writerow(['Total Tests Completed', completed_labs.count()])
        writer.writerow([])
        
        # Prescription metrics
        total_rx = prescriptions_qs.filter(created_at__gte=month_ago).count()
        dispensed_rx = prescriptions_qs.filter(created_at__gte=month_ago, is_dispensed=True).count()
        writer.writerow(['PRESCRIPTION METRICS'])
        writer.writerow(['Total Prescriptions', total_rx])
        writer.writerow(['Dispensed', dispensed_rx])
        writer.writerow(['Dispensing Rate', f'{(dispensed_rx/total_rx*100):.1f}%' if total_rx > 0 else '0%'])
    
    elif export_type == 'comparison':
        # Multi-hospital comparison export
        writer.writerow(['Multi-Hospital Comparison Report'])
        writer.writerow(['Generated:', now.strftime('%Y-%m-%d %H:%M:%S')])
        writer.writerow([])
        
        # Filter hospitals
        if role == 'district_admin' and user.district:
            hospitals = Hospital.objects.filter(district=user.district, is_active=True)
        else:
            hospitals = Hospital.objects.filter(is_active=True)
        
        writer.writerow(['Hospital', 'Type', 'District', 'Total Visits', 'Visits This Month', 'Staff', 'Patients', 'Collection Rate %'])
        
        for hosp in hospitals:
            total_visits = PatientVisit.objects.filter(hospital=hosp).count()
            visits_month = PatientVisit.objects.filter(hospital=hosp, visit_date__gte=month_ago).count()
            staff = User.objects.filter(hospital=hosp, is_active=True).count()
            patients = Patient.objects.filter(hospital=hosp, is_active=True).count()
            
            billed = Invoice.objects.filter(hospital=hosp).aggregate(total=Sum('total'))['total'] or 0
            collected = Invoice.objects.filter(hospital=hosp).aggregate(total=Sum('amount_paid'))['total'] or 0
            collection_rate = (collected / billed * 100) if billed > 0 else 0
            
            writer.writerow([
                hosp.name,
                hosp.get_hospital_type_display() if hasattr(hosp, 'get_hospital_type_display') else hosp.hospital_type,
                hosp.district.name if hosp.district else 'N/A',
                total_visits,
                visits_month,
                staff,
                patients,
                f'{collection_rate:.1f}'
            ])
    
    return response

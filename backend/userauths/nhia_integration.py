"""
NHIA (National Health Insurance Authority) Integration.
Handles insurance verification, claim submission, and pre-authorization.
"""
from django.utils import timezone
from django.db.models import Sum, Count, Q
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from datetime import timedelta
import hashlib
import secrets

from .models import Patient, Invoice, InsuranceClaim, PatientVisit, Hospital


# Mock NHIA API (replace with actual NHIA API integration)
def verify_nhia_card(card_number, patient_dob):
    """
    Verify NHIA card with national database.
    In production, this would call the actual NHIA API.
    """
    # Mock verification logic
    if not card_number or len(card_number) < 10:
        return {
            'valid': False,
            'error': 'Invalid card number format'
        }
    
    # Simulate API call
    return {
        'valid': True,
        'card_number': card_number,
        'status': 'active',
        'coverage_type': 'basic',
        'expiry_date': (timezone.now() + timedelta(days=365)).date().isoformat(),
        'dependents': 0,
        'provider_network': 'national',
    }


def submit_claim_to_nhia(claim_data):
    """
    Submit insurance claim to NHIA for processing.
    In production, this would call the actual NHIA claims API.
    """
    # Mock submission logic
    claim_reference = f"NHIA-{secrets.token_hex(8).upper()}"
    
    return {
        'success': True,
        'claim_reference': claim_reference,
        'status': 'submitted',
        'submitted_at': timezone.now().isoformat(),
        'estimated_processing_days': 14,
    }


def check_claim_status(claim_reference):
    """
    Check status of submitted claim with NHIA.
    """
    # Mock status check
    return {
        'claim_reference': claim_reference,
        'status': 'under_review',
        'approved_amount': 0,
        'remarks': 'Claim is being reviewed by NHIA',
        'last_updated': timezone.now().isoformat(),
    }


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def verify_insurance_card(request):
    """
    Verify patient's NHIA insurance card.
    """
    user = request.user
    role = user.role.name if user.role else None
    
    if role not in ('admin', 'hospital_admin', 'receptionist', 'doctor', 'nurse'):
        return Response({'error': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)
    
    card_number = request.data.get('card_number')
    patient_id = request.data.get('patient_id')
    
    if not card_number:
        return Response({'error': 'card_number is required'}, status=status.HTTP_400_BAD_REQUEST)
    
    try:
        patient = Patient.objects.get(id=patient_id) if patient_id else None
        patient_dob = patient.date_of_birth if patient else None
        
        # Verify with NHIA
        verification = verify_nhia_card(card_number, patient_dob)
        
        # Update patient record if valid
        if verification['valid'] and patient:
            patient.insurance_provider = 'NHIA'
            patient.insurance_id = card_number
            patient.save()
        
        return Response({
            'verification': verification,
            'patient_updated': verification['valid'] and patient is not None
        })
        
    except Patient.DoesNotExist:
        return Response({'error': 'Patient not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_insurance_claim(request):
    """
    Submit insurance claim to NHIA.
    """
    user = request.user
    role = user.role.name if user.role else None
    
    if role not in ('admin', 'hospital_admin', 'cashier'):
        return Response({'error': 'Access denied. Only billing staff can submit claims.'}, 
                       status=status.HTTP_403_FORBIDDEN)
    
    invoice_id = request.data.get('invoice_id')
    claim_amount = request.data.get('claim_amount')
    diagnosis_codes = request.data.get('diagnosis_codes', [])
    procedure_codes = request.data.get('procedure_codes', [])
    
    if not all([invoice_id, claim_amount]):
        return Response({'error': 'invoice_id and claim_amount are required'}, 
                       status=status.HTTP_400_BAD_REQUEST)
    
    try:
        invoice = Invoice.objects.select_related('patient', 'hospital').get(id=invoice_id)
        
        # Verify patient has insurance
        if not invoice.patient.insurance_id:
            return Response({'error': 'Patient does not have insurance on file'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        # Check if claim already exists
        existing_claim = InsuranceClaim.objects.filter(invoice=invoice).first()
        if existing_claim:
            return Response({'error': f'Claim already exists: {existing_claim.claim_number}'}, 
                          status=status.HTTP_400_BAD_REQUEST)
        
        # Prepare claim data
        claim_data = {
            'invoice_id': invoice.id,
            'patient_id': invoice.patient.id,
            'hospital_id': invoice.hospital.id,
            'claim_amount': float(claim_amount),
            'diagnosis_codes': diagnosis_codes,
            'procedure_codes': procedure_codes,
            'service_date': invoice.created_at.date().isoformat(),
        }
        
        # Submit to NHIA
        nhia_response = submit_claim_to_nhia(claim_data)
        
        if nhia_response['success']:
            # Create claim record
            claim = InsuranceClaim.objects.create(
                invoice=invoice,
                patient=invoice.patient,
                hospital=invoice.hospital,
                insurance_provider='NHIA',
                claim_number=nhia_response['claim_reference'],
                claim_amount=claim_amount,
                status='submitted',
                submitted_by=user,
                submitted_at=timezone.now(),
                notes=f"Submitted to NHIA. Reference: {nhia_response['claim_reference']}"
            )
            
            return Response({
                'success': True,
                'claim_id': claim.id,
                'claim_reference': nhia_response['claim_reference'],
                'status': 'submitted',
                'message': 'Claim submitted successfully to NHIA'
            }, status=status.HTTP_201_CREATED)
        else:
            return Response({'error': 'Failed to submit claim to NHIA'}, 
                          status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
    except Invoice.DoesNotExist:
        return Response({'error': 'Invoice not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def check_nhia_claim_status(request, claim_id):
    """
    Check status of NHIA claim.
    """
    user = request.user
    
    try:
        claim = InsuranceClaim.objects.select_related('patient', 'hospital', 'invoice').get(id=claim_id)
        
        # Access control
        if user.hospital and claim.hospital != user.hospital:
            if user.role.name not in ('admin', 'ministry_admin'):
                return Response({'error': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)
        
        # Check with NHIA
        nhia_status = check_claim_status(claim.claim_number)
        
        # Update local record
        if nhia_status['status'] != claim.status:
            claim.status = nhia_status['status']
            if nhia_status.get('approved_amount'):
                claim.approved_amount = nhia_status['approved_amount']
            claim.notes = (claim.notes or '') + f"\n{timezone.now()}: {nhia_status.get('remarks', '')}"
            claim.save()
        
        return Response({
            'claim_id': claim.id,
            'claim_number': claim.claim_number,
            'invoice_number': claim.invoice.invoice_number if claim.invoice else None,
            'patient_name': claim.patient.full_name if claim.patient else 'N/A',
            'claim_amount': float(claim.claim_amount),
            'approved_amount': float(claim.approved_amount or 0),
            'status': claim.status,
            'submitted_at': claim.submitted_at.isoformat() if claim.submitted_at else None,
            'nhia_status': nhia_status,
        })
        
    except InsuranceClaim.DoesNotExist:
        return Response({'error': 'Claim not found'}, status=status.HTTP_404_NOT_FOUND)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def nhia_claims_dashboard(request):
    """
    Get NHIA claims dashboard with statistics.
    """
    user = request.user
    role = user.role.name if user.role else None
    
    if role not in ('admin', 'hospital_admin', 'ministry_admin', 'cashier'):
        return Response({'error': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)
    
    # Base queryset
    claims_qs = InsuranceClaim.objects.filter(insurance_provider='NHIA')
    
    # Hospital scoping
    if user.hospital and role not in ('admin', 'ministry_admin'):
        claims_qs = claims_qs.filter(hospital=user.hospital)
    
    # Date filters
    now = timezone.now()
    month_ago = now - timedelta(days=30)
    
    # Statistics
    total_claims = claims_qs.count()
    claims_this_month = claims_qs.filter(submitted_at__gte=month_ago).count()
    
    total_claimed = claims_qs.aggregate(total=Sum('claim_amount'))['total'] or 0
    total_approved = claims_qs.filter(status='approved').aggregate(total=Sum('approved_amount'))['total'] or 0
    
    # Status breakdown
    status_counts = claims_qs.values('status').annotate(count=Count('id'))
    status_breakdown = {item['status']: item['count'] for item in status_counts}
    
    # Recent claims
    recent_claims = claims_qs.select_related('patient', 'invoice', 'hospital').order_by('-submitted_at')[:20]
    
    recent_data = []
    for claim in recent_claims:
        recent_data.append({
            'id': claim.id,
            'claim_number': claim.claim_number,
            'patient_name': claim.patient.full_name if claim.patient else 'N/A',
            'invoice_number': claim.invoice.invoice_number if claim.invoice else None,
            'claim_amount': float(claim.claim_amount),
            'approved_amount': float(claim.approved_amount or 0),
            'status': claim.status,
            'submitted_at': claim.submitted_at.isoformat() if claim.submitted_at else None,
        })
    
    return Response({
        'stats': {
            'total_claims': total_claims,
            'claims_this_month': claims_this_month,
            'total_claimed': float(total_claimed),
            'total_approved': float(total_approved),
            'approval_rate': round((total_approved / total_claimed * 100), 1) if total_claimed > 0 else 0,
        },
        'status_breakdown': status_breakdown,
        'recent_claims': recent_data,
    })


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def patient_insurance_info(request, patient_id):
    """
    Get patient's insurance information and claim history.
    """
    user = request.user
    
    try:
        patient = Patient.objects.get(id=patient_id)
        
        # Access control
        if user.hospital and patient.hospital != user.hospital:
            if user.role.name not in ('admin', 'ministry_admin'):
                return Response({'error': 'Access denied.'}, status=status.HTTP_403_FORBIDDEN)
        
        # Get claims
        claims = InsuranceClaim.objects.filter(patient=patient).order_by('-submitted_at')[:10]
        
        claims_data = []
        for claim in claims:
            claims_data.append({
                'id': claim.id,
                'claim_number': claim.claim_number,
                'claim_amount': float(claim.claim_amount),
                'approved_amount': float(claim.approved_amount or 0),
                'status': claim.status,
                'submitted_at': claim.submitted_at.isoformat() if claim.submitted_at else None,
            })
        
        return Response({
            'patient_id': patient.id,
            'patient_name': patient.full_name,
            'insurance_provider': patient.insurance_provider or 'None',
            'insurance_id': patient.insurance_id or 'N/A',
            'has_insurance': bool(patient.insurance_id),
            'claims_history': claims_data,
            'total_claims': claims.count(),
        })
        
    except Patient.DoesNotExist:
        return Response({'error': 'Patient not found'}, status=status.HTTP_404_NOT_FOUND)

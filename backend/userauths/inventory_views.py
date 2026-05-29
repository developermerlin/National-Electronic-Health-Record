"""
Drug Inventory backend views.
Endpoints:
  GET  /pharmacy/inventory/              – list all drugs
  POST /pharmacy/inventory/              – add new drug
  GET  /pharmacy/inventory/<id>/         – drug detail
  PUT  /pharmacy/inventory/<id>/         – update drug
  POST /pharmacy/inventory/<id>/restock/ – add stock
  POST /pharmacy/inventory/<id>/adjust/  – manual adjustment
  GET  /pharmacy/inventory/stats/        – summary stats
"""
from django.utils import timezone
from django.db import IntegrityError, transaction
from django.db.models import Q, F, Count, Case, When, IntegerField
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import DrugInventory, InventoryTransaction

ALLOWED_ROLES = {'pharmacist', 'admin', 'hospital_admin'}
READ_ROLES    = ALLOWED_ROLES | {'doctor', 'nurse'}


def _serialize_drug(d):
    return {
        'id':               d.id,
        'drug_name':        d.drug_name,
        'brand_name':       d.brand_name,
        'drug_category':    d.drug_category,
        'drug_category_display': d.get_drug_category_display(),
        'strength':         d.strength,
        'dosage_form':      d.dosage_form,
        'unit':             d.unit,
        'unit_display':     d.get_unit_display(),
        'quantity_in_stock': d.quantity_in_stock,
        'reorder_level':    d.reorder_level,
        'is_low_stock':     d.is_low_stock,
        'expiry_date':      str(d.expiry_date) if d.expiry_date else None,
        'is_expired':       d.is_expired,
        'days_to_expiry':   d.days_to_expiry,
        'batch_number':     d.batch_number,
        'supplier':         d.supplier,
        'unit_cost':        str(d.unit_cost) if d.unit_cost else None,
        'is_essential':     d.is_essential,
        'is_active':        d.is_active,
        'created_at':       d.created_at.isoformat(),
        'updated_at':       d.updated_at.isoformat(),
    }


def _serialize_transaction(t):
    return {
        'id':               t.id,
        'transaction_type': t.transaction_type,
        'transaction_type_display': t.get_transaction_type_display(),
        'quantity':         t.quantity,
        'balance_after':    t.balance_after,
        'reason':           t.reason,
        'performed_by':     t.performed_by.get_full_name() if t.performed_by else None,
        'created_at':       t.created_at.isoformat(),
    }


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def inventory_stats(request):
    user = request.user
    role = user.role.name if user.role else None
    if role not in READ_ROLES:
        return Response({'error': 'Access denied.'}, status=403)

    hospital = getattr(user, 'hospital', None)
    qs = DrugInventory.objects.filter(is_active=True)
    if hospital:
        qs = qs.filter(hospital=hospital)

    today            = timezone.now().date()
    near_expiry_date = today + timezone.timedelta(days=90)

    agg = qs.aggregate(
        total_drugs=Count('id'),
        low_stock=Count(Case(
            When(quantity_in_stock__lte=F('reorder_level'), then=1),
            output_field=IntegerField(),
        )),
        out_of_stock=Count(Case(
            When(quantity_in_stock=0, then=1),
            output_field=IntegerField(),
        )),
        expired=Count(Case(
            When(expiry_date__isnull=False, expiry_date__lt=today, then=1),
            output_field=IntegerField(),
        )),
        expiring_soon=Count(Case(
            When(expiry_date__gte=today, expiry_date__lte=near_expiry_date, then=1),
            output_field=IntegerField(),
        )),
        essential_drugs=Count(Case(
            When(is_essential=True, then=1),
            output_field=IntegerField(),
        )),
    )

    return Response({
        'total_drugs':       agg['total_drugs'],
        'low_stock':         agg['low_stock'],
        'out_of_stock':      agg['out_of_stock'],
        'expired':           agg['expired'],
        'expiring_soon':     agg['expiring_soon'],
        'essential_drugs':   agg['essential_drugs'],
        'total_stock_value': None,
    })


@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def inventory_list(request):
    user = request.user
    role = user.role.name if user.role else None

    if request.method == 'GET':
        if role not in READ_ROLES:
            return Response({'error': 'Access denied.'}, status=403)

        hospital = getattr(user, 'hospital', None)
        qs = DrugInventory.objects.filter(is_active=True)
        if hospital:
            qs = qs.filter(hospital=hospital)

        search   = request.query_params.get('search', '').strip()
        category = request.query_params.get('category', '')
        low_stock = request.query_params.get('low_stock', '')
        expiring  = request.query_params.get('expiring', '')

        if search:
            qs = qs.filter(Q(drug_name__icontains=search) | Q(brand_name__icontains=search) | Q(strength__icontains=search))
        if category:
            qs = qs.filter(drug_category=category)
        if low_stock == 'true':
            qs = [d for d in qs if d.is_low_stock]
            return Response([_serialize_drug(d) for d in qs])
        if expiring == 'true':
            near = timezone.now().date() + timezone.timedelta(days=90)
            qs = qs.filter(expiry_date__isnull=False, expiry_date__lte=near)

        return Response([_serialize_drug(d) for d in qs])

    # POST — add new drug
    if role not in ALLOWED_ROLES:
        return Response({'error': 'Only pharmacists can add drugs.'}, status=403)

    data     = request.data
    hospital = getattr(user, 'hospital', None)
    if not hospital:
        return Response({'error': 'User has no associated hospital.'}, status=400)

    drug_name   = data.get('drug_name', '').strip()
    strength    = data.get('strength', '').strip()
    dosage_form = data.get('dosage_form', '').strip()

    if not drug_name:
        return Response({'error': 'drug_name is required.'}, status=400)

    try:
        initial_qty   = int(data.get('quantity_in_stock') or 0)
        reorder_level = int(data.get('reorder_level')     or 50)
        unit_cost     = data.get('unit_cost') or None
        expiry_date   = data.get('expiry_date') or None
    except (ValueError, TypeError) as exc:
        return Response({'error': f'Invalid numeric value: {exc}'}, status=400)

    try:
        with transaction.atomic():
            drug = DrugInventory.objects.create(
                hospital=hospital,
                drug_name=drug_name,
                brand_name=data.get('brand_name', ''),
                drug_category=data.get('drug_category', 'other'),
                strength=strength,
                dosage_form=dosage_form,
                unit=data.get('unit', 'tablet'),
                quantity_in_stock=initial_qty,
                reorder_level=reorder_level,
                expiry_date=expiry_date,
                batch_number=data.get('batch_number', ''),
                supplier=data.get('supplier', ''),
                unit_cost=unit_cost,
                is_essential=bool(data.get('is_essential', False)),
                added_by=user,
            )
            if initial_qty > 0:
                InventoryTransaction.objects.create(
                    drug=drug,
                    transaction_type='in',
                    quantity=initial_qty,
                    balance_after=initial_qty,
                    reason='Initial stock entry',
                    performed_by=user,
                )
    except IntegrityError:
        return Response({'error': 'A drug with this name, strength, and dosage form already exists.'}, status=400)
    except Exception as exc:
        return Response({'error': str(exc)}, status=400)

    drug.refresh_from_db()   # reload with proper Python types (date, Decimal, etc.)
    return Response(_serialize_drug(drug), status=201)


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def inventory_detail(request, drug_id):
    user = request.user
    role = user.role.name if user.role else None

    try:
        drug = DrugInventory.objects.get(id=drug_id)
    except DrugInventory.DoesNotExist:
        return Response({'error': 'Drug not found.'}, status=404)

    if request.method == 'GET':
        if role not in READ_ROLES:
            return Response({'error': 'Access denied.'}, status=403)
        transactions = InventoryTransaction.objects.filter(drug=drug).select_related('performed_by').order_by('-created_at')[:20]
        data = _serialize_drug(drug)
        data['recent_transactions'] = [_serialize_transaction(t) for t in transactions]
        return Response(data)

    # PUT — update drug details
    if role not in ALLOWED_ROLES:
        return Response({'error': 'Access denied.'}, status=403)

    d = request.data
    for field in ['brand_name', 'drug_category', 'strength', 'dosage_form', 'unit', 'reorder_level',
                  'expiry_date', 'batch_number', 'supplier', 'unit_cost', 'is_essential', 'is_active']:
        if field in d:
            setattr(drug, field, d[field] if d[field] != '' else None if field in ('expiry_date', 'unit_cost') else d[field])
    drug.save()
    return Response(_serialize_drug(drug))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def inventory_restock(request, drug_id):
    """Add stock to a drug (stock-in transaction)."""
    user = request.user
    role = user.role.name if user.role else None
    if role not in ALLOWED_ROLES:
        return Response({'error': 'Access denied.'}, status=403)

    try:
        drug = DrugInventory.objects.get(id=drug_id)
    except DrugInventory.DoesNotExist:
        return Response({'error': 'Drug not found.'}, status=404)

    qty = int(request.data.get('quantity', 0))
    if qty <= 0:
        return Response({'error': 'Quantity must be a positive integer.'}, status=400)

    drug.quantity_in_stock += qty
    # Update batch/expiry if provided
    if request.data.get('batch_number'):
        drug.batch_number = request.data['batch_number']
    if request.data.get('expiry_date'):
        drug.expiry_date = request.data['expiry_date']
    drug.save()

    InventoryTransaction.objects.create(
        drug=drug,
        transaction_type='in',
        quantity=qty,
        balance_after=drug.quantity_in_stock,
        reason=request.data.get('reason', 'Restock'),
        performed_by=user,
    )
    return Response(_serialize_drug(drug))


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def inventory_adjust(request, drug_id):
    """Manual stock adjustment (correction, expiry write-off, etc.)."""
    user = request.user
    role = user.role.name if user.role else None
    if role not in ALLOWED_ROLES:
        return Response({'error': 'Access denied.'}, status=403)

    try:
        drug = DrugInventory.objects.get(id=drug_id)
    except DrugInventory.DoesNotExist:
        return Response({'error': 'Drug not found.'}, status=404)

    qty    = int(request.data.get('quantity', 0))
    t_type = request.data.get('transaction_type', 'adjustment')
    reason = request.data.get('reason', '')

    if qty == 0:
        return Response({'error': 'Quantity cannot be zero.'}, status=400)

    drug.quantity_in_stock = max(0, drug.quantity_in_stock + qty)
    drug.save(update_fields=['quantity_in_stock'])

    InventoryTransaction.objects.create(
        drug=drug,
        transaction_type=t_type,
        quantity=qty,
        balance_after=drug.quantity_in_stock,
        reason=reason,
        performed_by=user,
    )
    return Response(_serialize_drug(drug))

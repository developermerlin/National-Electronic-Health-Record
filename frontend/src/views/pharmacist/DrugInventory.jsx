/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layout/DashboardLayout';
import showToast from '../../utils/toast';

const ACCENT = '#7c3aed';

const navItems = [
  { label: 'Dashboard', items: [
    { path: '/pharmacy/dashboard', icon: 'fas fa-tachometer-alt', text: 'Overview' },
  ]},
  { label: 'Dispensing', items: [
    { path: '/pharmacy/prescriptions', icon: 'fas fa-file-prescription', text: 'All Prescriptions' },
    { path: '/pharmacy/queue',         icon: 'fas fa-list-ol',           text: 'Dispense Queue' },
  ]},
  { label: 'Inventory', items: [
    { path: '/pharmacy/inventory', icon: 'fas fa-boxes', text: 'Drug Inventory' },
  ]},
  { label: 'Patients', items: [
    { path: '/pharmacy/patients', icon: 'fas fa-user-injured', text: 'Patient Lookup' },
  ]},
  { label: 'Communication', items: [
    { path: '/chat',     icon: 'fas fa-comments', text: 'Live Chat' },
    { path: '/messages', icon: 'fas fa-envelope',  text: 'Messages' },
  ]},
  { label: 'Account', items: [
    { path: '/admin/profile', icon: 'fas fa-user-circle', text: 'My Profile' },
  ]},
];

const CATEGORIES = [
  { value: '',             label: 'All Categories' },
  { value: 'antibiotic',  label: 'Antibiotics' },
  { value: 'analgesic',   label: 'Analgesics / Pain Relief' },
  { value: 'antimalarial',label: 'Antimalarials' },
  { value: 'antiviral',   label: 'Antivirals' },
  { value: 'antifungal',  label: 'Antifungals' },
  { value: 'cardiovascular', label: 'Cardiovascular' },
  { value: 'antidiabetic',label: 'Antidiabetics' },
  { value: 'vitamins',    label: 'Vitamins / Supplements' },
  { value: 'vaccine',     label: 'Vaccines' },
  { value: 'other',       label: 'Other' },
];

const UNITS = [
  { value: 'tablet',  label: 'Tablet' },
  { value: 'capsule', label: 'Capsule' },
  { value: 'vial',    label: 'Vial' },
  { value: 'ampoule', label: 'Ampoule' },
  { value: 'bottle',  label: 'Bottle' },
  { value: 'sachet',  label: 'Sachet' },
  { value: 'tube',    label: 'Tube' },
  { value: 'unit',    label: 'Unit' },
];

function AddDrugModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    drug_name: '', brand_name: '', drug_category: 'other', strength: '',
    dosage_form: '', unit: 'tablet', quantity_in_stock: 0, reorder_level: 50,
    expiry_date: '', batch_number: '', supplier: '', unit_cost: '', is_essential: false,
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.drug_name.trim()) return;
    setSaving(true);
    try {
      await onSave(form);
    } finally {
      setSaving(false);
    }
  };

  const col3 = { display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 };
  const col2 = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.6)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '16px' }}>
      <div style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 760, boxShadow: '0 24px 64px rgba(0,0,0,0.22)', maxHeight: '94vh', display: 'flex', flexDirection: 'column' }}>

        {/* ── Header ── */}
        <div style={{ padding: '18px 24px 14px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: ACCENT + '18', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fas fa-pills" style={{ color: ACCENT, fontSize: 15 }}></i>
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Add New Drug</h3>
              <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>Add a new drug to the hospital inventory</p>
            </div>
          </div>
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, background: '#f8fafc', border: '1px solid #e2e8f0', fontSize: 16, cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>

        {/* ── Body ── */}
        <div style={{ padding: '18px 24px', overflowY: 'auto', flex: 1 }}>

          {/* Drug Identification */}
          <SectionDivider label="Drug Identification" />
          <div style={{ ...col3, marginBottom: 12 }}>
            <div style={{ gridColumn: '1 / 3' }}>
              <Field label="Drug Name *" value={form.drug_name} onChange={v => set('drug_name', v)} placeholder="e.g. Amoxicillin" />
            </div>
            <Field label="Brand / Trade Name" value={form.brand_name} onChange={v => set('brand_name', v)} placeholder="e.g. Amoxil" />
          </div>
          <div style={{ ...col3, marginBottom: 4 }}>
            <div>
              <label style={labelStyle}>Category</label>
              <select value={form.drug_category} onChange={e => set('drug_category', e.target.value)} style={inputStyle}>
                {CATEGORIES.slice(1).map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <Field label="Strength" value={form.strength} onChange={v => set('strength', v)} placeholder="e.g. 250mg, 500mg/5ml" />
            <Field label="Dosage Form" value={form.dosage_form} onChange={v => set('dosage_form', v)} placeholder="e.g. Capsule, Suspension" />
          </div>

          {/* Stock & Thresholds */}
          <SectionDivider label="Stock & Thresholds" />
          <div style={{ ...col3, marginBottom: 4 }}>
            <div>
              <label style={labelStyle}>Unit of Issue</label>
              <select value={form.unit} onChange={e => set('unit', e.target.value)} style={inputStyle}>
                {UNITS.map(u => <option key={u.value} value={u.value}>{u.label}</option>)}
              </select>
            </div>
            <Field label="Opening Quantity" type="number" value={form.quantity_in_stock} onChange={v => set('quantity_in_stock', v)} placeholder="0" />
            <Field label="Reorder Level" type="number" value={form.reorder_level} onChange={v => set('reorder_level', v)} placeholder="50" />
          </div>

          {/* Batch, Supplier & Cost */}
          <SectionDivider label="Batch, Supplier & Cost" />
          <div style={{ ...col3, marginBottom: 12 }}>
            <Field label="Batch Number" value={form.batch_number} onChange={v => set('batch_number', v)} placeholder="e.g. BTN-2024-001" />
            <Field label="Expiry Date" type="date" value={form.expiry_date} onChange={v => set('expiry_date', v)} />
            <Field label="Unit Cost (SLL)" type="number" value={form.unit_cost} onChange={v => set('unit_cost', v)} placeholder="0.00" />
          </div>
          <div style={{ ...col2, marginBottom: 4 }}>
            <div style={{ gridColumn: '1 / -1' }}>
              <Field label="Supplier / Manufacturer" value={form.supplier} onChange={v => set('supplier', v)} placeholder="Supplier or manufacturer name" />
            </div>
          </div>

          {/* Essential Medicine toggle */}
          <div style={{ marginTop: 14 }}>
            <label style={{
              display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer',
              background: form.is_essential ? '#faf5ff' : '#f8fafc',
              border: `1.5px solid ${form.is_essential ? '#c4b5fd' : '#e2e8f0'}`,
              borderRadius: 12, padding: '11px 16px', transition: 'all 0.15s',
            }}>
              <input type="checkbox" checked={form.is_essential} onChange={e => set('is_essential', e.target.checked)}
                style={{ width: 17, height: 17, accentColor: ACCENT, cursor: 'pointer' }} />
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: form.is_essential ? ACCENT : '#374151' }}>
                  <i className="fas fa-star" style={{ marginRight: 6, color: '#f59e0b', fontSize: 12 }}></i>
                  Essential Medicine
                </div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>Part of the National Essential Medicines List (NEML)</div>
              </div>
            </label>
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{ padding: '13px 24px 18px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 10, justifyContent: 'flex-end', flexShrink: 0, background: '#fafbfc', borderRadius: '0 0 20px 20px' }}>
          <button onClick={onClose} style={{ padding: '9px 22px', borderRadius: 9, border: '1.5px solid #e2e8f0', background: '#fff', color: '#475569', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving || !form.drug_name.trim()} style={{
            padding: '9px 24px', borderRadius: 9, border: 'none',
            background: saving || !form.drug_name.trim() ? '#c4b5fd' : `linear-gradient(135deg,${ACCENT},#6d28d9)`,
            color: '#fff', fontWeight: 700, fontSize: 13,
            cursor: saving || !form.drug_name.trim() ? 'default' : 'pointer',
            boxShadow: form.drug_name.trim() && !saving ? '0 4px 14px rgba(124,58,237,0.35)' : 'none',
            display: 'inline-flex', alignItems: 'center', gap: 7,
          }}>
            {saving
              ? <><i className="fas fa-spinner fa-spin"></i>Saving…</>
              : <><i className="fas fa-plus" style={{ fontSize: 11 }}></i>Add Drug</>
            }
          </button>
        </div>
      </div>
    </div>
  );
}

function RestockModal({ drug, onClose, onSave }) {
  const [qty, setQty] = useState('');
  const [batch, setBatch] = useState('');
  const [expiry, setExpiry] = useState('');
  const [reason, setReason] = useState('Restock');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!qty || Number(qty) <= 0) return;
    setSaving(true);
    await onSave({ quantity: Number(qty), batch_number: batch, expiry_date: expiry, reason });
    setSaving(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
        <div style={{ padding: '20px 24px 14px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0f172a' }}>Restock Drug</h3>
            <p style={{ margin: '3px 0 0', fontSize: 13, color: '#64748b' }}>{drug.drug_name} — Current: {drug.quantity_in_stock} {drug.unit_display}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94a3b8' }}>×</button>
        </div>
        <div style={{ padding: '18px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Quantity to Add *" type="number" value={qty} onChange={setQty} placeholder="0" full />
          <Field label="New Batch Number" value={batch} onChange={setBatch} placeholder="Optional" />
          <Field label="New Expiry Date" type="date" value={expiry} onChange={setExpiry} />
          <Field label="Reason" value={reason} onChange={setReason} placeholder="Restock" />
        </div>
        <div style={{ padding: '10px 24px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 20px', borderRadius: 8, border: '1.5px solid #e2e8f0', background: '#fff', color: '#475569', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving || !qty || Number(qty) <= 0} style={{
            padding: '9px 20px', borderRadius: 8, border: 'none',
            background: `linear-gradient(135deg,#10b981,#059669)`,
            color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer',
            boxShadow: '0 3px 10px rgba(16,185,129,0.3)',
          }}>
            {saving ? <><i className="fas fa-spinner fa-spin" style={{ marginRight: 6 }}></i>Saving…</> : 'Add Stock'}
          </button>
        </div>
      </div>
    </div>
  );
}

function DetailModal({ drug, onClose, onRestock }) {
  const today = new Date().toISOString().split('T')[0];
  const daysToExpiry = drug.expiry_date
    ? Math.ceil((new Date(drug.expiry_date) - new Date()) / 86400000)
    : null;
  const expired   = drug.expiry_date && drug.expiry_date < today;
  const expiringSoon = daysToExpiry !== null && daysToExpiry <= 90 && !expired;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 600, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ padding: '20px 24px 14px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 6, flexWrap: 'wrap' }}>
              {drug.is_essential && <Badge label="Essential" bg="#faf5ff" color={ACCENT} />}
              {expired        && <Badge label="EXPIRED"      bg="#fee2e2" color="#dc2626" />}
              {expiringSoon   && <Badge label="Expiring Soon" bg="#fef3c7" color="#b45309" />}
              {drug.is_low_stock && !expired && <Badge label="Low Stock" bg="#fff7ed" color="#c2410c" />}
            </div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{drug.drug_name}</h3>
            <p style={{ margin: '3px 0 0', fontSize: 13, color: '#64748b' }}>{drug.brand_name || ''} · {drug.strength} · {drug.dosage_form}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#94a3b8' }}>×</button>
        </div>

        <div style={{ padding: '18px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
          <StockBlock qty={drug.quantity_in_stock} unit={drug.unit_display} low={drug.is_low_stock} reorder={drug.reorder_level} />
          <InfoBlock label="Category"     value={drug.drug_category_display} />
          <InfoBlock label="Unit"         value={drug.unit_display} />
          <InfoBlock label="Batch Number" value={drug.batch_number} />
          <InfoBlock label="Supplier"     value={drug.supplier} />
          <InfoBlock label="Unit Cost"    value={drug.unit_cost ? `SLL ${drug.unit_cost}` : '—'} />
          <InfoBlock label="Expiry Date"  value={drug.expiry_date || '—'}
            extra={daysToExpiry !== null ? (expired ? '(Expired)' : `${daysToExpiry}d remaining`) : null}
            extraColor={expired ? '#dc2626' : expiringSoon ? '#b45309' : '#16a34a'} />
          <InfoBlock label="Reorder Level" value={`${drug.reorder_level} ${drug.unit_display}`} />
          <InfoBlock label="Last Updated"  value={new Date(drug.updated_at).toLocaleDateString()} />
        </div>

        {drug.recent_transactions?.length > 0 && (
          <div style={{ padding: '0 24px 20px' }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10 }}>Recent Transactions</div>
            {drug.recent_transactions.map(t => (
              <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '8px 12px', borderRadius: 8, background: '#f8fafc', marginBottom: 6, fontSize: 13 }}>
                <span>
                  <span style={{ fontWeight: 700, color: t.transaction_type === 'in' ? '#15803d' : '#dc2626' }}>
                    {t.transaction_type === 'in' ? '+' : ''}{t.quantity}
                  </span>
                  <span style={{ color: '#64748b', marginLeft: 8 }}>{t.reason}</span>
                </span>
                <span style={{ color: '#94a3b8', fontSize: 12 }}>{new Date(t.created_at).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        )}

        <div style={{ padding: '12px 24px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 10 }}>
          <button onClick={onRestock} style={{
            padding: '9px 18px', borderRadius: 9, border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer',
            background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', boxShadow: '0 3px 10px rgba(16,185,129,0.3)',
          }}>
            <i className="fas fa-plus" style={{ marginRight: 6 }}></i>Restock
          </button>
          <button onClick={onClose} style={{
            padding: '9px 18px', borderRadius: 9, border: '1.5px solid #e2e8f0',
            background: '#fff', color: '#475569', fontWeight: 700, fontSize: 13, cursor: 'pointer', marginLeft: 'auto',
          }}>Close</button>
        </div>
      </div>
    </div>
  );
}

/* ── Small helpers ── */
const labelStyle = { fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 5 };
const inputStyle  = { width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', color: '#374151' };

function SectionDivider({ label }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '14px 0 10px' }}>
      <span style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', whiteSpace: 'nowrap' }}>{label}</span>
      <div style={{ flex: 1, height: 1, background: '#f1f5f9' }}></div>
    </div>
  );
}

function Field({ label, value, onChange, type = 'text', placeholder = '', full = false }) {
  return (
    <div style={full ? { gridColumn: '1/-1' } : {}}>
      <label style={labelStyle}>{label}</label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={inputStyle} />
    </div>
  );
}

function Badge({ label, bg, color }) {
  return <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: bg, color }}>{label}</span>;
}

function InfoBlock({ label, value, extra, extraColor }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{value || '—'}</div>
      {extra && <div style={{ fontSize: 12, color: extraColor || '#64748b', marginTop: 2 }}>{extra}</div>}
    </div>
  );
}

function StockBlock({ qty, unit, low, reorder }) {
  return (
    <div style={{ background: low ? '#fff7ed' : '#f0fdf4', borderRadius: 12, padding: '14px 16px', border: `1.5px solid ${low ? '#fed7aa' : '#bbf7d0'}` }}>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: 4 }}>In Stock</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: low ? '#c2410c' : '#15803d', lineHeight: 1 }}>{qty}</div>
      <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{unit} · Reorder at {reorder}</div>
    </div>
  );
}

/* ── Main component ── */
function DrugInventory() {
  const { apiCall } = useAuth();
  const [drugs, setDrugs]           = useState([]);
  const [stats, setStats]           = useState({});
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [filterCat, setFilterCat]   = useState('');
  const [filterLow, setFilterLow]   = useState(false);
  const [filterExp, setFilterExp]   = useState(false);
  const [showAdd, setShowAdd]       = useState(false);
  const [detailDrug, setDetailDrug] = useState(null);
  const [restockDrug, setRestockDrug] = useState(null);
  const mountedRef = useRef(false);
  const fetchStats = useCallback(async () => {
    try {
      const r = await apiCall('/pharmacy/inventory/stats/');
      if (r.ok) setStats(await r.json());
    } catch (e) { console.error(e); }
  }, [apiCall]);

  const fetchDrugs = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (search)    p.set('search', search);
      if (filterCat) p.set('category', filterCat);
      if (filterLow) p.set('low_stock', 'true');
      if (filterExp) p.set('expiring', 'true');
      const r = await apiCall(`/pharmacy/inventory/?${p}`);
      if (r.ok) setDrugs(await r.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [apiCall, search, filterCat, filterLow, filterExp]);

  useEffect(() => { fetchStats(); fetchDrugs(); }, []);
  useEffect(() => { fetchDrugs(); }, [filterCat, filterLow, filterExp]);
  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return; }
    const delay = search.length === 0 ? 0 : 400;
    const t = setTimeout(fetchDrugs, delay);
    return () => clearTimeout(t);
  }, [search]);

  const handleAddDrug = async (form) => {
    const r = await apiCall('/pharmacy/inventory/', { method: 'POST', body: JSON.stringify(form) });
    if (r.ok) {
      const newDrug = await r.json();
      setDrugs(prev => [newDrug, ...prev]);
      setShowAdd(false);
      showToast.success('Drug added successfully.', 'Drug Added');
      fetchStats();
    } else {
      try {
        const e = await r.json();
        showToast.error(e.error || 'Failed to add drug.');
      } catch {
        showToast.error(`Server error (${r.status}). Please try again.`);
      }
    }
  };

  const handleRestock = async (drugId, form) => {
    const r = await apiCall(`/pharmacy/inventory/${drugId}/restock/`, { method: 'POST', body: JSON.stringify(form) });
    if (r.ok) {
      const updated = await r.json();
      setDrugs(ds => ds.map(d => d.id === drugId ? updated : d));
      if (detailDrug?.id === drugId) setDetailDrug(updated);
      setRestockDrug(null);
      showToast.success('Stock updated successfully.', 'Restocked');
      fetchStats();
    } else {
      const e = await r.json();
      showToast.error(e.error || 'Failed to restock.');
    }
  };

  const fetchDetail = async (drug) => {
    try {
      const r = await apiCall(`/pharmacy/inventory/${drug.id}/`);
      if (r.ok) setDetailDrug(await r.json());
      else setDetailDrug(drug);
    } catch { setDetailDrug(drug); }
  };

  const today = new Date().toISOString().split('T')[0];

  const statCards = [
    { icon: 'fas fa-boxes',       label: 'Total Drugs',   value: stats.total_drugs    || 0, accent: ACCENT },
    { icon: 'fas fa-exclamation-triangle', label: 'Low Stock', value: stats.low_stock || 0, accent: '#f59e0b' },
    { icon: 'fas fa-ban',         label: 'Out of Stock',  value: stats.out_of_stock   || 0, accent: '#ef4444' },
    { icon: 'fas fa-skull-crossbones', label: 'Expired', value: stats.expired         || 0, accent: '#dc2626' },
    { icon: 'fas fa-clock',       label: 'Expiring Soon', value: stats.expiring_soon  || 0, accent: '#b45309' },
    { icon: 'fas fa-star',        label: 'Essential Drugs',value: stats.essential_drugs|| 0, accent: '#16a34a' },
  ];

  return (
    <DashboardLayout navItems={navItems} brandTitle="NEHR Pharmacy" roleBadge="Pharmacist">
      <div style={{ padding: '28px 24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: 0 }}>Drug Inventory</h1>
            <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 14 }}>Manage hospital drug stock levels</p>
          </div>
          <button onClick={() => setShowAdd(true)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: `linear-gradient(135deg,${ACCENT},#6d28d9)`,
            color: '#fff', border: 'none', borderRadius: 10,
            padding: '10px 20px', fontWeight: 700, fontSize: 14,
            cursor: 'pointer', boxShadow: '0 4px 14px rgba(124,58,237,0.35)',
          }}>
            <i className="fas fa-plus" style={{ fontSize: 12 }}></i>Add Drug
          </button>
        </div>

        {/* Stat cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 14, marginBottom: 24 }}>
          {statCards.map(s => (
            <div key={s.label} style={{ background: '#fff', borderRadius: 16, padding: '18px 20px 14px', boxShadow: '0 2px 8px rgba(15,23,42,0.06)' }}>
              <div style={{ width: 40, height: 40, borderRadius: 11, background: s.accent + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <i className={s.icon} style={{ color: s.accent, fontSize: 16 }}></i>
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', lineHeight: 1, marginBottom: 5 }}>{s.value}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '12px 16px', marginBottom: 18, boxShadow: '0 1px 4px rgba(15,23,42,0.06)', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
          {/* Search with icon */}
          <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
            <i className="fas fa-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 13, pointerEvents: 'none' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && fetchDrugs()}
              placeholder="Search drug name, brand, batch…"
              style={{ width: '100%', padding: '8px 12px 8px 36px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 13, color: '#0f172a', outline: 'none', boxSizing: 'border-box', background: '#fff', transition: 'border-color 0.15s' }}
              onFocus={e => e.target.style.borderColor = ACCENT}
              onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>
          {/* Category dropdown with chevron */}
          <select
            value={filterCat}
            onChange={e => setFilterCat(e.target.value)}
            style={{ padding: '8px 30px 8px 12px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 13, color: '#334155', background: `#fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E") no-repeat right 9px center`, outline: 'none', cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none' }}
          >
            {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
          </select>
          {/* Toggle pills */}
          {[
            { label: 'Low Stock',    active: filterLow, toggle: () => setFilterLow(v => !v), color: '#c2410c', bg: '#fff7ed' },
            { label: 'Expiring Soon', active: filterExp, toggle: () => setFilterExp(v => !v), color: '#b45309', bg: '#fef3c7' },
          ].map(pill => (
            <button key={pill.label} onClick={pill.toggle} style={{ padding: '8px 14px', borderRadius: 10, border: `1.5px solid ${pill.active ? pill.color + '55' : '#e2e8f0'}`, background: pill.active ? pill.bg : '#fff', color: pill.active ? pill.color : '#64748b', fontSize: 13, fontWeight: pill.active ? 700 : 500, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, transition: 'all 0.15s' }}>
              <i className={`fas fa-${pill.active ? 'check-' : ''}circle`} style={{ fontSize: 11 }} />{pill.label}
            </button>
          ))}
          {/* Clear */}
          {(search || filterCat || filterLow || filterExp) && (
            <button
              onClick={() => { setSearch(''); setFilterCat(''); setFilterLow(false); setFilterExp(false); }}
              style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: '1.5px solid #e2e8f0', borderRadius: 10, background: '#fff', color: '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}
            >
              <i className="fas fa-times" style={{ fontSize: 11 }} /> Clear
            </button>
          )}
        </div>

        {/* Table */}
        <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 8px rgba(15,23,42,0.06)', overflow: 'hidden' }}>
          <div style={{ padding: '13px 20px', borderBottom: '1px solid #f1f5f9' }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Inventory ({drugs.length})</h3>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#64748b' }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: 28, color: ACCENT, display: 'block', marginBottom: 12 }}></i>
              Loading inventory…
            </div>
          ) : drugs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8' }}>
              <i className="fas fa-boxes" style={{ fontSize: 40, display: 'block', marginBottom: 12 }}></i>
              No drugs found
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1.2fr 1fr 1fr 1fr 1fr 150px',
                padding: '10px 20px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                {['Drug', 'Category', 'Stock', 'Unit', 'Expiry', 'Status', 'Actions'].map(h => (
                  <div key={h} style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{h}</div>
                ))}
              </div>
              {drugs.map((d, idx) => {
                const expired     = d.expiry_date && d.expiry_date < today;
                const daysLeft    = d.expiry_date ? Math.ceil((new Date(d.expiry_date) - new Date()) / 86400000) : null;
                const nearExpiry  = daysLeft !== null && daysLeft <= 90 && !expired;
                return (
                  <div key={d.id} style={{
                    display: 'grid', gridTemplateColumns: '2.5fr 1.2fr 1fr 1fr 1fr 1fr 150px',
                    padding: '12px 20px', alignItems: 'center',
                    borderBottom: idx < drugs.length - 1 ? '1px solid #f8fafc' : 'none',
                    background: expired ? '#fef2f2' : nearExpiry ? '#fffbeb' : d.is_low_stock ? '#fff7ed' : 'transparent',
                  }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {d.drug_name}
                        {d.is_essential && <i className="fas fa-star" style={{ fontSize: 10, color: '#f59e0b' }}></i>}
                      </div>
                      <div style={{ fontSize: 12, color: '#94a3b8' }}>{d.strength} · {d.dosage_form}</div>
                    </div>
                    <div style={{ fontSize: 13, color: '#64748b' }}>{d.drug_category_display}</div>
                    <div style={{ fontSize: 14, fontWeight: 800, color: d.is_low_stock ? '#c2410c' : '#15803d' }}>
                      {d.quantity_in_stock}
                    </div>
                    <div style={{ fontSize: 13, color: '#64748b' }}>{d.unit_display}</div>
                    <div style={{ fontSize: 12, color: expired ? '#dc2626' : nearExpiry ? '#b45309' : '#64748b', fontWeight: expired || nearExpiry ? 700 : 400 }}>
                      {d.expiry_date ? new Date(d.expiry_date).toLocaleDateString() : '—'}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                      {expired     && <Badge label="Expired"     bg="#fee2e2" color="#dc2626" />}
                      {nearExpiry  && <Badge label="Exp. Soon"   bg="#fef3c7" color="#b45309" />}
                      {d.is_low_stock && !expired && <Badge label="Low Stock" bg="#fff7ed" color="#c2410c" />}
                      {!expired && !d.is_low_stock && !nearExpiry && <Badge label="OK" bg="#dcfce7" color="#15803d" />}
                    </div>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      <button onClick={() => fetchDetail(d)} style={{
                        padding: '5px 11px', borderRadius: 7, border: '1.5px solid #e2e8f0',
                        background: '#fff', color: '#475569', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      }}>View</button>
                      <button onClick={() => setRestockDrug(d)} style={{
                        padding: '5px 11px', borderRadius: 7, border: 'none',
                        background: 'linear-gradient(135deg,#10b981,#059669)',
                        color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      }}>+Stock</button>
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>

      {showAdd && <AddDrugModal onClose={() => setShowAdd(false)} onSave={handleAddDrug} />}
      {detailDrug && <DetailModal drug={detailDrug} onClose={() => setDetailDrug(null)} onRestock={() => { setRestockDrug(detailDrug); setDetailDrug(null); }} />}
      {restockDrug && <RestockModal drug={restockDrug} onClose={() => setRestockDrug(null)} onSave={(form) => handleRestock(restockDrug.id, form)} />}
    </DashboardLayout>
  );
}

export default DrugInventory;

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layout/DashboardLayout';
import { getNavForUser, getBrandForUser, getRoleBadge } from '../../utils/navItems';

// ── Lookup tables ─────────────────────────────────────────────────────────────
const WARD_TYPES = [
  { value: 'general_male',   label: 'General Male Ward' },
  { value: 'general_female', label: 'General Female Ward' },
  { value: 'pediatric',      label: 'Pediatric Ward' },
  { value: 'maternity',      label: 'Maternity Ward' },
  { value: 'icu',            label: 'Intensive Care Unit (ICU)' },
  { value: 'nicu',           label: 'Neonatal ICU' },
  { value: 'surgical',       label: 'Surgical Ward' },
  { value: 'isolation',      label: 'Isolation Ward' },
  { value: 'private',        label: 'Private Ward' },
  { value: 'other',          label: 'Other' },
];
const BED_TYPES = [
  { value: 'standard',   label: 'Standard' },
  { value: 'electric',   label: 'Electric' },
  { value: 'icu',        label: 'ICU Bed' },
  { value: 'pediatric',  label: 'Pediatric Cot' },
  { value: 'bassinet',   label: 'Bassinet' },
  { value: 'isolation',  label: 'Isolation Bed' },
  { value: 'delivery',   label: 'Delivery Bed' },
  { value: 'recovery',   label: 'Recovery Bed' },
  { value: 'other',      label: 'Other' },
];
const BED_STATUS_OPTS = [
  { value: 'available',   label: 'Available' },
  { value: 'occupied',    label: 'Occupied' },
  { value: 'reserved',    label: 'Reserved' },
  { value: 'maintenance', label: 'Maintenance' },
  { value: 'cleaning',    label: 'Cleaning' },
];
const WARD_STATUS_OPTS = [
  { value: 'active',     label: 'Active' },
  { value: 'inactive',   label: 'Inactive' },
  { value: 'renovation', label: 'Under Renovation' },
];

const BED_STATUS_STYLE = {
  available:   { bg: '#dcfce7', color: '#16a34a' },
  occupied:    { bg: '#fee2e2', color: '#dc2626' },
  reserved:    { bg: '#fef3c7', color: '#d97706' },
  maintenance: { bg: '#f1f5f9', color: '#64748b' },
  cleaning:    { bg: '#ede9fe', color: '#7c3aed' },
};
const WARD_STATUS_STYLE = {
  active:     { bg: '#dcfce7', color: '#16a34a' },
  inactive:   { bg: '#f1f5f9', color: '#64748b' },
  renovation: { bg: '#fef3c7', color: '#d97706' },
};

const inputStyle = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: '1px solid #e2e8f0', fontSize: 13, outline: 'none', boxSizing: 'border-box',
};
const labelStyle = { fontSize: 12, fontWeight: 600, color: '#374151', display: 'block', marginBottom: 4 };

const BLANK_WARD = { name: '', ward_type: 'general_male', capacity: '', floor: '', phone: '', status: 'active' };
const BLANK_BED  = { ward: '', bed_number: '', bed_type: 'standard', status: 'available', notes: '' };

export default function WardManagement() {
  const { apiCall, user } = useAuth();
  const navItems  = getNavForUser(user);
  const brand     = getBrandForUser(user);
  const roleBadge = getRoleBadge(user);

  const [wards, setWards]           = useState([]);
  const [beds, setBeds]             = useState([]);
  const [loading, setLoading]       = useState(true);
  const [expandedWard, setExpandedWard] = useState(null);

  // Modals
  const [showWardModal, setShowWardModal]   = useState(false);
  const [showBedModal, setShowBedModal]     = useState(false);
  const [editingWard, setEditingWard]       = useState(null);
  const [editingBed, setEditingBed]         = useState(null);
  const [wardForm, setWardForm]             = useState(BLANK_WARD);
  const [bedForm, setBedForm]               = useState(BLANK_BED);
  const [saving, setSaving]                 = useState(false);
  const [error, setError]                   = useState('');

  // Confirm delete
  const [confirmDelete, setConfirmDelete]   = useState(null); // { type:'ward'|'bed', item }

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [wRes, bRes] = await Promise.all([
        apiCall('/ipd/wards/'),
        apiCall('/ipd/beds/'),
      ]);
      if (wRes.ok) setWards(await wRes.json());
      if (bRes.ok) setBeds(await bRes.json());
    } catch { /* ignore */ }
    setLoading(false);
  }, [apiCall]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // ── Stats ────────────────────────────────────────────────────
  const totalBeds     = beds.length;
  const availableBeds = beds.filter(b => b.status === 'available').length;
  const occupiedBeds  = beds.filter(b => b.status === 'occupied').length;
  const occupancyRate = totalBeds ? Math.round((occupiedBeds / totalBeds) * 100) : 0;

  // ── Helpers ──────────────────────────────────────────────────
  const bedsForWard = (wardId) => beds.filter(b => b.ward === wardId);

  const openAddWard = () => { setEditingWard(null); setWardForm(BLANK_WARD); setError(''); setShowWardModal(true); };
  const openEditWard = (w) => {
    setEditingWard(w);
    setWardForm({ name: w.name, ward_type: w.ward_type, capacity: w.capacity, floor: w.floor || '', phone: w.phone || '', status: w.status });
    setError(''); setShowWardModal(true);
  };
  const openAddBed = (wardId = '') => { setEditingBed(null); setBedForm({ ...BLANK_BED, ward: wardId }); setError(''); setShowBedModal(true); };
  const openEditBed = (b) => {
    setEditingBed(b);
    setBedForm({ ward: b.ward, bed_number: b.bed_number, bed_type: b.bed_type, status: b.status, notes: b.notes || '' });
    setError(''); setShowBedModal(true);
  };

  const saveWard = async () => {
    if (!wardForm.name.trim()) { setError('Ward name is required.'); return; }
    setSaving(true); setError('');
    try {
      const method = editingWard ? 'PUT' : 'POST';
      const url    = editingWard ? `/ipd/wards/${editingWard.id}/` : '/ipd/wards/';
      const res = await apiCall(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(wardForm) });
      if (res.ok) { setShowWardModal(false); fetchData(); }
      else { const d = await res.json(); setError(d.detail || d.name?.[0] || 'Failed to save ward.'); }
    } catch { setError('Network error.'); }
    setSaving(false);
  };

  const saveBed = async () => {
    if (!bedForm.ward || !bedForm.bed_number.trim()) { setError('Ward and bed number are required.'); return; }
    setSaving(true); setError('');
    try {
      const method = editingBed ? 'PATCH' : 'POST';
      const url    = editingBed ? `/ipd/beds/${editingBed.id}/` : '/ipd/beds/';
      const res = await apiCall(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(bedForm) });
      if (res.ok) { setShowBedModal(false); fetchData(); }
      else { const d = await res.json(); setError(d.detail || d.bed_number?.[0] || 'Failed to save bed.'); }
    } catch { setError('Network error.'); }
    setSaving(false);
  };

  const doDelete = async () => {
    if (!confirmDelete) return;
    const { type, item } = confirmDelete;
    const url = type === 'ward' ? `/ipd/wards/${item.id}/` : `/ipd/beds/${item.id}/`;
    try {
      await apiCall(url, { method: 'DELETE' });
      setConfirmDelete(null);
      fetchData();
    } catch { /* ignore */ }
  };

  return (
    <DashboardLayout navItems={navItems} brandTitle={brand} roleBadge={roleBadge}>
      <div style={{ padding: '20px 16px', maxWidth: 1300, margin: '0 auto' }}>

        {/* ── Page header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontWeight: 800, fontSize: 26, color: '#0f172a', margin: 0 }}>
              <i className="fas fa-hospital-user me-2" style={{ color: '#4361ee' }}></i>Wards & Beds
            </h2>
            <p style={{ color: '#64748b', fontSize: 13, marginTop: 4, marginBottom: 0 }}>
              Manage hospital wards and individual bed inventory
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => openAddBed()} style={{ padding: '8px 16px', borderRadius: 9, border: '1px solid #e2e8f0', background: '#fff', color: '#374151', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="fas fa-plus" style={{ fontSize: 11 }}></i>Add Bed
            </button>
            <button onClick={openAddWard} style={{ padding: '8px 18px', borderRadius: 9, border: 'none', background: '#4361ee', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className="fas fa-plus" style={{ fontSize: 11 }}></i>New Ward
            </button>
          </div>
        </div>

        {/* ── Stats row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 28 }}>
          {[
            { icon: 'fas fa-hospital-user', label: 'Total Wards',    value: wards.length,   color: '#4361ee', bg: '#eff2ff' },
            { icon: 'fas fa-bed',           label: 'Total Beds',     value: totalBeds,       color: '#0891b2', bg: '#e0f2fe' },
            { icon: 'fas fa-check-circle',  label: 'Available',      value: availableBeds,   color: '#16a34a', bg: '#dcfce7' },
            { icon: 'fas fa-user-injured',  label: 'Occupied',       value: occupiedBeds,    color: '#dc2626', bg: '#fee2e2' },
            { icon: 'fas fa-chart-pie',     label: 'Occupancy Rate', value: `${occupancyRate}%`, color: '#d97706', bg: '#fef3c7' },
          ].map(({ icon, label, value, color, bg }) => (
            <div key={label} style={{ background: '#fff', borderRadius: 14, padding: '18px 20px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className={icon} style={{ color, fontSize: 18 }}></i>
                </div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a' }}>{loading ? '—' : value}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{label}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Ward list ── */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>
            <div className="spinner-border text-primary" role="status" style={{ width: 32, height: 32 }}></div>
            <p style={{ marginTop: 12, fontSize: 13 }}>Loading wards...</p>
          </div>
        ) : wards.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 60, background: '#fff', borderRadius: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
            <i className="fas fa-hospital-user" style={{ fontSize: 48, color: '#e2e8f0', marginBottom: 16 }}></i>
            <p style={{ color: '#94a3b8', fontSize: 15, fontWeight: 600 }}>No wards found</p>
            <p style={{ color: '#cbd5e1', fontSize: 13 }}>Click "New Ward" to create your first ward.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {wards.map(ward => {
              const wardBeds    = bedsForWard(ward.id);
              const wAvail      = wardBeds.filter(b => b.status === 'available').length;
              const wOcc        = wardBeds.filter(b => b.status === 'occupied').length;
              const wRate       = wardBeds.length ? Math.round((wOcc / wardBeds.length) * 100) : 0;
              const isExpanded  = expandedWard === ward.id;
              const wStyle      = WARD_STATUS_STYLE[ward.status] || WARD_STATUS_STYLE.active;
              const typeLabel   = WARD_TYPES.find(t => t.value === ward.ward_type)?.label || ward.ward_type;

              return (
                <div key={ward.id} style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
                  {/* Ward header row */}
                  <div style={{ padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
                    borderBottom: isExpanded ? '1px solid #f1f5f9' : 'none', cursor: 'pointer' }}
                    onClick={() => setExpandedWard(isExpanded ? null : ward.id)}>
                    <div style={{ width: 42, height: 42, borderRadius: 10, background: '#eff2ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className="fas fa-hospital-user" style={{ color: '#4361ee', fontSize: 18 }}></i>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontWeight: 800, fontSize: 15, color: '#0f172a' }}>{ward.name}</span>
                        <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: wStyle.bg, color: wStyle.color }}>{ward.status}</span>
                        <span style={{ fontSize: 11, color: '#94a3b8' }}>{typeLabel}</span>
                        {ward.floor && <span style={{ fontSize: 11, color: '#94a3b8' }}><i className="fas fa-layer-group me-1"></i>{ward.floor}</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 16, marginTop: 4, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 12, color: '#64748b' }}><i className="fas fa-bed me-1" style={{ color: '#4361ee' }}></i>{wardBeds.length} beds</span>
                        <span style={{ fontSize: 12, color: '#16a34a' }}><i className="fas fa-check me-1"></i>{wAvail} available</span>
                        <span style={{ fontSize: 12, color: '#dc2626' }}><i className="fas fa-user-injured me-1"></i>{wOcc} occupied</span>
                        <span style={{ fontSize: 12, color: '#d97706' }}><i className="fas fa-chart-bar me-1"></i>{wRate}% occupancy</span>
                      </div>
                    </div>
                    {/* Occupancy bar */}
                    <div style={{ width: 100, flexShrink: 0 }}>
                      <div style={{ height: 6, background: '#f1f5f9', borderRadius: 99, overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${wRate}%`, background: wRate > 80 ? '#dc2626' : wRate > 60 ? '#d97706' : '#16a34a', borderRadius: 99, transition: 'width 0.4s' }} />
                      </div>
                      <div style={{ fontSize: 10, color: '#94a3b8', textAlign: 'right', marginTop: 2 }}>{wRate}% full</div>
                    </div>
                    <div style={{ display: 'flex', gap: 6 }} onClick={e => e.stopPropagation()}>
                      <button onClick={() => openAddBed(ward.id)} title="Add bed to this ward"
                        style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid #e2e8f0', background: '#fff', color: '#4361ee', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className="fas fa-plus"></i>
                      </button>
                      <button onClick={() => openEditWard(ward)} title="Edit ward"
                        style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className="fas fa-pen"></i>
                      </button>
                      <button onClick={() => setConfirmDelete({ type: 'ward', item: ward })} title="Remove ward"
                        style={{ width: 30, height: 30, borderRadius: 7, border: '1px solid #e2e8f0', background: '#fff', color: '#94a3b8', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                    <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'}`} style={{ color: '#94a3b8', fontSize: 12, flexShrink: 0 }}></i>
                  </div>

                  {/* Beds grid */}
                  {isExpanded && (
                    <div style={{ padding: '16px 20px' }}>
                      {wardBeds.length === 0 ? (
                        <div style={{ textAlign: 'center', padding: '24px 0', color: '#94a3b8' }}>
                          <i className="fas fa-bed" style={{ fontSize: 28, marginBottom: 8, display: 'block' }}></i>
                          <span style={{ fontSize: 13 }}>No beds in this ward yet.</span>
                          <button onClick={() => openAddBed(ward.id)}
                            style={{ display: 'block', margin: '10px auto 0', padding: '6px 16px', borderRadius: 8, border: '1px solid #4361ee', background: '#fff', color: '#4361ee', fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                            + Add First Bed
                          </button>
                        </div>
                      ) : (
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
                          {wardBeds.map(bed => {
                            const bs = BED_STATUS_STYLE[bed.status] || BED_STATUS_STYLE.available;
                            const btLabel = BED_TYPES.find(t => t.value === bed.bed_type)?.label || bed.bed_type;
                            return (
                              <div key={bed.id} style={{ border: `1.5px solid ${bs.color}30`, borderRadius: 12, padding: '12px 14px', background: `${bs.bg}60`, position: 'relative' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
                                  <div style={{ fontWeight: 800, fontSize: 15, color: '#0f172a' }}>{bed.bed_number}</div>
                                  <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: bs.bg, color: bs.color }}>{bed.status}</span>
                                </div>
                                <div style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>{btLabel}</div>
                                {bed.notes && <div style={{ fontSize: 10, color: '#94a3b8', fontStyle: 'italic', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{bed.notes}</div>}
                                <div style={{ display: 'flex', gap: 6 }}>
                                  <button onClick={() => openEditBed(bed)}
                                    style={{ flex: 1, padding: '4px 0', borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', cursor: 'pointer', fontSize: 11, fontWeight: 600 }}>
                                    <i className="fas fa-pen me-1"></i>Edit
                                  </button>
                                  <button onClick={() => setConfirmDelete({ type: 'bed', item: bed })}
                                    style={{ width: 26, height: 26, borderRadius: 6, border: '1px solid #e2e8f0', background: '#fff', color: '#94a3b8', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <i className="fas fa-trash"></i>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                          {/* Add bed tile */}
                          <div onClick={() => openAddBed(ward.id)}
                            style={{ border: '1.5px dashed #cbd5e1', borderRadius: 12, padding: '12px 14px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#94a3b8', minHeight: 90,
                              transition: 'all 0.15s' }}
                            onMouseEnter={e => { e.currentTarget.style.borderColor = '#4361ee'; e.currentTarget.style.color = '#4361ee'; }}
                            onMouseLeave={e => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#94a3b8'; }}>
                            <i className="fas fa-plus" style={{ fontSize: 20, marginBottom: 6 }}></i>
                            <span style={{ fontSize: 11, fontWeight: 600 }}>Add Bed</span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Ward Modal ─────────────────────────────────────────── */}
      {showWardModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(3px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setShowWardModal(false)}>
          <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 500, boxShadow: '0 24px 64px rgba(0,0,0,0.2)', overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h5 style={{ margin: 0, fontWeight: 800, fontSize: 17 }}>{editingWard ? 'Edit Ward' : 'New Ward'}</h5>
                <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{editingWard ? `Editing: ${editingWard.name}` : 'Add a new ward to your hospital'}</p>
              </div>
              <button onClick={() => setShowWardModal(false)} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-times" style={{ fontSize: 13, color: '#64748b' }}></i>
              </button>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '8px 12px', borderRadius: 8, fontSize: 12 }}>{error}</div>}
              <div>
                <label style={labelStyle}>Ward Name *</label>
                <input style={inputStyle} placeholder="e.g. Male Medical Ward 1" value={wardForm.name} onChange={e => setWardForm(p => ({ ...p, name: e.target.value }))} />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Ward Type</label>
                  <select style={inputStyle} value={wardForm.ward_type} onChange={e => setWardForm(p => ({ ...p, ward_type: e.target.value }))}>
                    {WARD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Status</label>
                  <select style={inputStyle} value={wardForm.status} onChange={e => setWardForm(p => ({ ...p, status: e.target.value }))}>
                    {WARD_STATUS_OPTS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Capacity (beds)</label>
                  <input style={inputStyle} type="number" min="0" placeholder="e.g. 20" value={wardForm.capacity} onChange={e => setWardForm(p => ({ ...p, capacity: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>Floor / Location</label>
                  <input style={inputStyle} placeholder="e.g. 2nd Floor" value={wardForm.floor} onChange={e => setWardForm(p => ({ ...p, floor: e.target.value }))} />
                </div>
              </div>
              <div>
                <label style={labelStyle}>Ward Phone</label>
                <input style={inputStyle} placeholder="Extension or direct line" value={wardForm.phone} onChange={e => setWardForm(p => ({ ...p, phone: e.target.value }))} />
              </div>
            </div>
            <div style={{ padding: '14px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowWardModal(false)} style={{ padding: '8px 18px', borderRadius: 9, border: '1px solid #e2e8f0', background: '#fff', color: '#374151', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={saveWard} disabled={saving} style={{ padding: '8px 22px', borderRadius: 9, border: 'none', background: '#4361ee', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving...' : editingWard ? 'Save Changes' : 'Create Ward'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Bed Modal ──────────────────────────────────────────── */}
      {showBedModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(3px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setShowBedModal(false)}>
          <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 460, boxShadow: '0 24px 64px rgba(0,0,0,0.2)', overflow: 'hidden' }}
            onClick={e => e.stopPropagation()}>
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h5 style={{ margin: 0, fontWeight: 800, fontSize: 17 }}>{editingBed ? 'Edit Bed' : 'Add Bed'}</h5>
                <p style={{ margin: 0, fontSize: 12, color: '#94a3b8', marginTop: 2 }}>{editingBed ? `Editing: ${editingBed.bed_number}` : 'Add a bed to a ward'}</p>
              </div>
              <button onClick={() => setShowBedModal(false)} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-times" style={{ fontSize: 13, color: '#64748b' }}></i>
              </button>
            </div>
            <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 14 }}>
              {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '8px 12px', borderRadius: 8, fontSize: 12 }}>{error}</div>}
              <div>
                <label style={labelStyle}>Ward *</label>
                <select style={inputStyle} value={bedForm.ward} onChange={e => setBedForm(p => ({ ...p, ward: e.target.value }))}>
                  <option value="">— Select ward —</option>
                  {wards.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                <div>
                  <label style={labelStyle}>Bed Number *</label>
                  <input style={inputStyle} placeholder="e.g. A-01" value={bedForm.bed_number} onChange={e => setBedForm(p => ({ ...p, bed_number: e.target.value }))} />
                </div>
                <div>
                  <label style={labelStyle}>Bed Type</label>
                  <select style={inputStyle} value={bedForm.bed_type} onChange={e => setBedForm(p => ({ ...p, bed_type: e.target.value }))}>
                    {BED_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label style={labelStyle}>Status</label>
                <select style={inputStyle} value={bedForm.status} onChange={e => setBedForm(p => ({ ...p, status: e.target.value }))}>
                  {BED_STATUS_OPTS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label style={labelStyle}>Notes</label>
                <textarea style={{ ...inputStyle, resize: 'vertical', minHeight: 64 }} placeholder="Special equipment, isolation notes..." value={bedForm.notes} onChange={e => setBedForm(p => ({ ...p, notes: e.target.value }))} />
              </div>
            </div>
            <div style={{ padding: '14px 24px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowBedModal(false)} style={{ padding: '8px 18px', borderRadius: 9, border: '1px solid #e2e8f0', background: '#fff', color: '#374151', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={saveBed} disabled={saving} style={{ padding: '8px 22px', borderRadius: 9, border: 'none', background: '#4361ee', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Saving...' : editingBed ? 'Save Changes' : 'Add Bed'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Confirm Delete ─────────────────────────────────────── */}
      {confirmDelete && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(3px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
          onClick={() => setConfirmDelete(null)}>
          <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 400, boxShadow: '0 24px 64px rgba(0,0,0,0.2)', padding: 28 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: 'center', marginBottom: 20 }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px' }}>
                <i className="fas fa-trash" style={{ fontSize: 22, color: '#dc2626' }}></i>
              </div>
              <h5 style={{ fontWeight: 800, margin: 0 }}>Remove {confirmDelete.type === 'ward' ? 'Ward' : 'Bed'}?</h5>
              <p style={{ color: '#64748b', fontSize: 13, marginTop: 6 }}>
                <strong>{confirmDelete.item.name || confirmDelete.item.bed_number}</strong> will be deactivated.
                {confirmDelete.type === 'ward' && ' Beds within this ward are not affected.'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={() => setConfirmDelete(null)} style={{ flex: 1, padding: '10px 0', borderRadius: 9, border: '1px solid #e2e8f0', background: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
              <button onClick={doDelete} style={{ flex: 1, padding: '10px 0', borderRadius: 9, border: 'none', background: '#dc2626', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Remove</button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

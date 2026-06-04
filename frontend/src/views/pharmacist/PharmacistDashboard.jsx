import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layout/DashboardLayout';
import showToast from '../../utils/toast';
import { getNavForUser, getBrandForUser, getRoleBadge } from '../../utils/navItems';

const ACCENT = '#8b5cf6';

// ── Dispense Modal ────────────────────────────────────────────
function DispenseModal({ note, onClose, onDispensed }) {
  const { apiCall } = useAuth();
  const [pharmacyNote, setPharmacyNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [checklist, setChecklist] = useState({
    identity:    false,
    allergy:     false,
    interaction: false,
    labelled:    false,
    counselled:  false,
  });

  const allChecked = Object.values(checklist).every(Boolean);

  const handleDispense = async () => {
    if (!allChecked) {
      showToast.warning('Please complete the verification checklist before dispensing.', 'Checklist Incomplete');
      return;
    }
    setSubmitting(true);
    try {
      const res = await apiCall(`/pharmacist/prescriptions/${note.note_id}/dispense/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pharmacy_note: pharmacyNote }),
      });
      if (res.ok) {
        showToast.success(`Prescription dispensed for ${note.patient_name}.`, 'Dispensed');
        onDispensed(note.note_id);
        onClose();
      } else {
        const err = await res.json();
        showToast.error(err.error || 'Failed to dispense.');
      }
    } catch {
      showToast.networkError();
    } finally {
      setSubmitting(false);
    }
  };

  const toggle = (key) => setChecklist(c => ({ ...c, [key]: !c[key] }));

  const hasAllergy = note.patient_allergies && note.patient_allergies.trim() !== '';

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)',
      backdropFilter: 'blur(3px)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 18, width: '100%', maxWidth: 740,
        maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(15,23,42,0.2)',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f1f5f9',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 40, height: 40, borderRadius: 12, background: ACCENT + '15',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <i className="fas fa-prescription-bottle-alt" style={{ color: ACCENT, fontSize: 16 }}></i>
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#0f172a' }}>Dispense Prescription</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>Visit #{note.visit_id} · {new Date(note.visit_date).toLocaleDateString()}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 20, color: '#94a3b8', cursor: 'pointer', lineHeight: 1 }}>×</button>
        </div>

        <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Patient Info */}
          <div style={{ background: '#f8fafc', borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10 }}>Patient</div>
            <div style={{ fontWeight: 800, fontSize: 16, color: '#0f172a', marginBottom: 4 }}>{note.patient_name}</div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 2 }}>ID: <strong>{note.patient_code}</strong></div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 2 }}>Gender: <strong>{note.patient_gender || '—'}</strong></div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>
              DOB: <strong>{note.patient_dob ? new Date(note.patient_dob).toLocaleDateString() : '—'}</strong>
            </div>
            {note.patient_blood_type && note.patient_blood_type !== 'unknown' && (
              <span style={{ background: '#dbeafe', color: '#2563eb', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>
                Blood: {note.patient_blood_type}
              </span>
            )}
            {/* Allergy Alert */}
            {hasAllergy ? (
              <div style={{ marginTop: 10, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 12px' }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#dc2626', marginBottom: 4 }}>
                  <i className="fas fa-exclamation-triangle" style={{ marginRight: 6 }}></i>KNOWN ALLERGIES
                </div>
                <div style={{ fontSize: 12, color: '#991b1b' }}>{note.patient_allergies}</div>
              </div>
            ) : (
              <div style={{ marginTop: 10, background: '#f0fdf4', borderRadius: 8, padding: '6px 12px' }}>
                <div style={{ fontSize: 12, color: '#16a34a', fontWeight: 600 }}>
                  <i className="fas fa-check-circle" style={{ marginRight: 6 }}></i>No known allergies recorded
                </div>
              </div>
            )}
          </div>

          {/* Prescribing Doctor */}
          <div style={{ background: '#f8fafc', borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 10 }}>Prescribing Doctor</div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', marginBottom: 4 }}>Dr. {note.doctor_name}</div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>Visit type: {note.visit_type}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>Diagnosis</div>
            <div style={{ fontSize: 13, color: '#334155', background: '#fff', borderRadius: 8, padding: '8px 10px', border: '1px solid #e2e8f0' }}>
              {note.diagnosis || 'No diagnosis recorded'}
            </div>
            {note.follow_up_date && (
              <div style={{ marginTop: 8, fontSize: 12, color: '#f59e0b', fontWeight: 600 }}>
                <i className="fas fa-calendar-alt" style={{ marginRight: 6 }}></i>
                Follow-up: {new Date(note.follow_up_date).toLocaleDateString()}
              </div>
            )}
          </div>
        </div>

        {/* Prescription */}
        <div style={{ padding: '0 24px 20px' }}>
          <div style={{ background: ACCENT + '08', border: `1px solid ${ACCENT}30`, borderRadius: 12, padding: 16 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: ACCENT, textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>
              <i className="fas fa-prescription" style={{ marginRight: 6 }}></i>Prescribed Medications
            </div>
            <pre style={{ margin: 0, fontSize: 13, color: '#1e293b', fontFamily: 'inherit', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
              {note.prescriptions || 'No prescription text recorded.'}
            </pre>
          </div>

          {note.treatment_plan && (
            <div style={{ marginTop: 12, background: '#f8fafc', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 6 }}>Treatment Plan</div>
              <div style={{ fontSize: 13, color: '#475569' }}>{note.treatment_plan}</div>
            </div>
          )}
        </div>

        {/* Pharmacist Checklist */}
        <div style={{ padding: '0 24px 20px' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 10 }}>
            <i className="fas fa-clipboard-check" style={{ color: ACCENT, marginRight: 8 }}></i>
            Dispensing Verification Checklist
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            {[
              { key: 'identity',    label: 'Patient identity confirmed' },
              { key: 'allergy',     label: 'Allergy check completed' },
              { key: 'interaction', label: 'Drug interaction checked' },
              { key: 'labelled',    label: 'Medicines correctly labelled' },
              { key: 'counselled',  label: 'Patient counselled on use' },
            ].map(item => (
              <label key={item.key} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                background: checklist[item.key] ? '#f0fdf4' : '#f8fafc',
                border: `1px solid ${checklist[item.key] ? '#bbf7d0' : '#e2e8f0'}`,
                transition: 'all 0.15s',
              }}>
                <input type="checkbox" checked={checklist[item.key]} onChange={() => toggle(item.key)}
                  style={{ width: 16, height: 16, accentColor: '#10b981', cursor: 'pointer' }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: checklist[item.key] ? '#16a34a' : '#475569' }}>
                  {item.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Pharmacy Note */}
        <div style={{ padding: '0 24px 20px' }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>
            Pharmacist Notes <span style={{ fontWeight: 400, color: '#94a3b8' }}>(substitutions, stock remarks, counselling)</span>
          </label>
          <textarea
            rows={3}
            value={pharmacyNote}
            onChange={e => setPharmacyNote(e.target.value)}
            placeholder="e.g. Dispensed generic Amoxicillin 500mg instead of branded. Patient counselled on completing full course."
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 10,
              border: '1.5px solid #e2e8f0', fontSize: 13, color: '#0f172a',
              outline: 'none', resize: 'vertical', boxSizing: 'border-box',
            }}
            onFocus={e => e.target.style.borderColor = ACCENT}
            onBlur={e => e.target.style.borderColor = '#e2e8f0'}
          />
        </div>

        {/* Footer actions */}
        <div style={{ padding: '16px 24px', borderTop: '1px solid #f1f5f9',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: allChecked ? '#16a34a' : '#f59e0b', fontWeight: 600 }}>
            <i className={`fas ${allChecked ? 'fa-check-circle' : 'fa-exclamation-circle'}`} style={{ marginRight: 6 }}></i>
            {allChecked ? 'All checks complete — ready to dispense' : 'Complete checklist to enable dispensing'}
          </span>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{
              padding: '9px 20px', borderRadius: 9, border: '1px solid #e2e8f0',
              background: '#fff', color: '#64748b', fontWeight: 600, fontSize: 13, cursor: 'pointer',
            }}>Cancel</button>
            <button onClick={handleDispense} disabled={!allChecked || submitting} style={{
              padding: '9px 20px', borderRadius: 9, border: 'none',
              background: allChecked ? `linear-gradient(135deg,${ACCENT},#7c3aed)` : '#e2e8f0',
              color: allChecked ? '#fff' : '#94a3b8',
              fontWeight: 700, fontSize: 13, cursor: allChecked ? 'pointer' : 'not-allowed',
              boxShadow: allChecked ? `0 4px 12px ${ACCENT}40` : 'none',
            }}>
              {submitting
                ? <><i className="fas fa-spinner fa-spin" style={{ marginRight: 6 }}></i>Dispensing...</>
                : <><i className="fas fa-check" style={{ marginRight: 6 }}></i>Confirm Dispense</>
              }
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── View Dispensed Detail Modal ───────────────────────────────
function ViewModal({ note, onClose }) {
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)',
      backdropFilter: 'blur(3px)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 18, width: '100%', maxWidth: 620,
        maxHeight: '85vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(15,23,42,0.2)',
      }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: '#0f172a' }}>Prescription Details</div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 20, color: '#94a3b8', cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ padding: '20px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>Patient</div>
              <div style={{ fontWeight: 700, color: '#0f172a' }}>{note.patient_name}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{note.patient_code}</div>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>Doctor</div>
              <div style={{ fontWeight: 700, color: '#0f172a' }}>Dr. {note.doctor_name}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{new Date(note.visit_date).toLocaleDateString()}</div>
            </div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>Diagnosis</div>
            <div style={{ fontSize: 13, color: '#334155', background: '#f8fafc', borderRadius: 8, padding: '8px 12px' }}>{note.diagnosis}</div>
          </div>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: ACCENT, textTransform: 'uppercase', marginBottom: 6 }}>Prescriptions</div>
            <pre style={{ margin: 0, fontSize: 13, color: '#1e293b', fontFamily: 'inherit', whiteSpace: 'pre-wrap',
              background: ACCENT + '08', borderRadius: 8, padding: '10px 12px', lineHeight: 1.7 }}>
              {note.prescriptions}
            </pre>
          </div>
          {note.pharmacy_note && (
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>Pharmacist Notes</div>
              <div style={{ fontSize: 13, color: '#475569', background: '#f8fafc', borderRadius: 8, padding: '8px 12px' }}>{note.pharmacy_note}</div>
            </div>
          )}
          {note.is_dispensed && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 14px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#16a34a' }}>
                <i className="fas fa-check-circle" style={{ marginRight: 6 }}></i>
                Dispensed by {note.dispensed_by} on {new Date(note.dispensed_at).toLocaleString()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main Dashboard ────────────────────────────────────────────
function PharmacistDashboard() {
  const { apiCall, user } = useAuth();
  const [stats, setStats]           = useState({ total_prescriptions: 0, pending_dispense: 0, dispensed_today: 0, today_queue: 0 });
  const [pendingQueue, setPending]  = useState([]);
  const [dispensedList, setDispensed] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [activeTab, setActiveTab]   = useState('queue');
  const [dispenseTarget, setDispenseTarget] = useState(null);
  const [viewTarget, setViewTarget] = useState(null);
  const [search,       setSearch]      = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDoctor, setFilterDoctor] = useState('');
  const [invStats,     setInvStats]     = useState(null);
  const [lowStockList, setLowStockList] = useState([]);
  const [expiringList, setExpiringList] = useState([]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [dashRes, statsRes, lowRes, expRes] = await Promise.all([
        apiCall('/pharmacist/dashboard/'),
        apiCall('/pharmacy/inventory/stats/'),
        apiCall('/pharmacy/inventory/?low_stock=true'),
        apiCall('/pharmacy/inventory/?expiring=true'),
      ]);
      if (dashRes.ok) {
        const data = await dashRes.json();
        setStats(data.stats);
        setPending(data.pending_queue || []);
        setDispensed(data.recent_dispensed || []);
      }
      if (statsRes.ok) setInvStats(await statsRes.json());
      if (lowRes.ok) setLowStockList(await lowRes.json());
      if (expRes.ok) setExpiringList(await expRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const onDispensed = (noteId) => {
    setPending(q => q.filter(n => n.note_id !== noteId));
    setStats(s => ({ ...s, pending_dispense: Math.max(0, s.pending_dispense - 1), dispensed_today: s.dispensed_today + 1 }));
    fetchData();
  };

  const listToShow = activeTab === 'queue' ? pendingQueue : dispensedList;

  const doctorOptions = [...new Set([...pendingQueue, ...dispensedList].map(n => n.doctor_name).filter(Boolean))];

  const filteredList = listToShow.filter(note => {
    const q = search.toLowerCase().trim();
    const matchSearch = !q ||
      (note.patient_name || '').toLowerCase().includes(q) ||
      (note.patient_code || '').toLowerCase().includes(q) ||
      (note.doctor_name  || '').toLowerCase().includes(q);
    const matchStatus = filterStatus === 'all' ||
      (filterStatus === 'pending'   && !note.is_dispensed) ||
      (filterStatus === 'dispensed' &&  note.is_dispensed);
    const matchDoctor = !filterDoctor || note.doctor_name === filterDoctor;
    return matchSearch && matchStatus && matchDoctor;
  });
  const hasClearable = search.trim() !== '' || filterStatus !== 'all' || filterDoctor !== '';
  const handleClear  = () => { setSearch(''); setFilterStatus('all'); setFilterDoctor(''); };

  const today = new Date().toLocaleDateString('en-SL', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

  const statCards = [
    { icon: 'fas fa-list-ol',                  label: "Today's Queue",     value: stats.today_queue,         accent: '#0891b2' },
    { icon: 'fas fa-hourglass-half',           label: 'Pending Dispense',  value: stats.pending_dispense,    accent: '#f59e0b' },
    { icon: 'fas fa-check-circle',             label: 'Dispensed Today',   value: stats.dispensed_today,     accent: '#10b981' },
    { icon: 'fas fa-prescription-bottle-alt', label: 'Total Prescriptions', value: stats.total_prescriptions, accent: ACCENT },
  ];

  const btnStyle = (active) => ({
    padding: '8px 18px', borderRadius: 9, border: 'none', cursor: 'pointer',
    fontWeight: 700, fontSize: 13, transition: 'all 0.15s',
    background: active ? ACCENT : 'transparent',
    color: active ? '#fff' : '#64748b',
    boxShadow: active ? `0 3px 10px ${ACCENT}35` : 'none',
  });

  const actionBtn = (label, icon, color, onClick, small = false) => (
    <button onClick={onClick} title={label} style={{
      width: small ? 30 : 'auto', height: 30, borderRadius: 8,
      border: '1px solid #e2e8f0', background: '#fff', color: '#475569',
      cursor: 'pointer', fontSize: 11, fontWeight: 600,
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      gap: small ? 0 : 6, padding: small ? 0 : '0 12px', transition: 'all 0.15s',
    }}
      onMouseEnter={e => { e.currentTarget.style.background = color + '15'; e.currentTarget.style.color = color; e.currentTarget.style.borderColor = color + '50'; }}
      onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#475569'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
    >
      <i className={icon} style={{ fontSize: 11 }}></i>
      {!small && <span>{label}</span>}
    </button>
  );

  return (
    <DashboardLayout navItems={getNavForUser(user)} brandTitle={getBrandForUser(user)} roleBadge={getRoleBadge(user)}>
      <div style={{ padding: '28px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: 0 }}>Pharmacy Dashboard</h1>
            <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 14 }}>{today}</p>
          </div>
          <button onClick={fetchData} style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: `linear-gradient(135deg,${ACCENT},#7c3aed)`,
            color: '#fff', border: 'none', borderRadius: 10,
            padding: '10px 20px', fontWeight: 700, fontSize: 14,
            cursor: 'pointer', boxShadow: `0 4px 14px ${ACCENT}35`,
          }}>
            <i className="fas fa-sync-alt" style={{ fontSize: 12 }}></i>Refresh
          </button>
        </div>

        {/* Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
          {statCards.map(s => (
            <div key={s.label} style={{ background: '#fff', borderRadius: 16, padding: '20px 20px 16px', boxShadow: '0 2px 8px rgba(15,23,42,0.06)' }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: s.accent + '15',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <i className={s.icon} style={{ color: s.accent, fontSize: 17 }}></i>
              </div>
              <div style={{ fontSize: 30, fontWeight: 800, color: '#0f172a', lineHeight: 1, marginBottom: 6 }}>{s.value}</div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Inventory Alerts */}
        {invStats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
            {[
              { icon: 'fas fa-exclamation-triangle', label: 'Low Stock', value: invStats.low_stock || 0, color: '#f59e0b', bg: '#fffbeb', border: '#fde68a' },
              { icon: 'fas fa-times-circle', label: 'Out of Stock', value: invStats.out_of_stock || 0, color: '#ef4444', bg: '#fef2f2', border: '#fecaca' },
              { icon: 'fas fa-calendar-times', label: 'Expiring Soon', value: invStats.expiring_soon || 0, color: '#f97316', bg: '#fff7ed', border: '#fed7aa' },
              { icon: 'fas fa-skull-crossbones', label: 'Expired', value: invStats.expired || 0, color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
              { icon: 'fas fa-star-of-life', label: 'Essential Drugs', value: invStats.essential_drugs || 0, color: '#0891b2', bg: '#e0f2fe', border: '#bae6fd' },
            ].map(a => (
              <div key={a.label} style={{ background: a.bg, border: `1px solid ${a.border}`, borderRadius: 12, padding: '14px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 10, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className={a.icon} style={{ color: a.color, fontSize: 15 }}></i>
                </div>
                <div>
                  <div style={{ fontSize: '20px', fontWeight: 800, color: a.color, lineHeight: 1 }}>{a.value}</div>
                  <div style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', marginTop: 2 }}>{a.label}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Low Stock & Expiring Tables */}
        {(lowStockList.length > 0 || expiringList.length > 0) && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
            {lowStockList.length > 0 && (
              <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 8px rgba(15,23,42,0.06)', overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h6 style={{ margin: 0, fontWeight: 700, fontSize: 13, color: '#0f172a' }}><i className="fas fa-exclamation-triangle me-2" style={{ color: '#f59e0b' }}></i>Low Stock Items</h6>
                  <span style={{ fontSize: 11, color: '#6c757d', fontWeight: 600 }}>{lowStockList.length} items</span>
                </div>
                <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                  {lowStockList.slice(0, 8).map(d => (
                    <div key={d.id} style={{ padding: '10px 18px', borderBottom: '1px solid #f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>{d.drug_name}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>{d.strength} · {d.dosage_form}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: d.quantity_in_stock === 0 ? '#ef4444' : '#f59e0b' }}>{d.quantity_in_stock} {d.unit_display}</div>
                        <div style={{ fontSize: 10, color: '#94a3b8' }}>reorder: {d.reorder_level}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {expiringList.length > 0 && (
              <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 8px rgba(15,23,42,0.06)', overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <h6 style={{ margin: 0, fontWeight: 700, fontSize: 13, color: '#0f172a' }}><i className="fas fa-calendar-times me-2" style={{ color: '#f97316' }}></i>Expiring Soon</h6>
                  <span style={{ fontSize: 11, color: '#6c757d', fontWeight: 600 }}>{expiringList.length} items</span>
                </div>
                <div style={{ maxHeight: 260, overflowY: 'auto' }}>
                  {expiringList.slice(0, 8).map(d => (
                    <div key={d.id} style={{ padding: '10px 18px', borderBottom: '1px solid #f8fafc', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13, color: '#0f172a' }}>{d.drug_name}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>{d.strength} · {d.dosage_form}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: d.is_expired ? '#dc2626' : '#f97316' }}>{d.is_expired ? 'Expired' : `${d.days_to_expiry} days`}</div>
                        <div style={{ fontSize: 10, color: '#94a3b8' }}>{d.expiry_date}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Pharmacist Role Banner */}
        <div style={{ background: `linear-gradient(135deg, ${ACCENT}12, #7c3aed08)`,
          border: `1px solid ${ACCENT}25`, borderRadius: 14, padding: '14px 20px',
          display: 'flex', alignItems: 'center', gap: 14, marginBottom: 24, flexWrap: 'wrap' }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: ACCENT + '15',
            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <i className="fas fa-user-md" style={{ color: ACCENT, fontSize: 18 }}></i>
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 800, fontSize: 14, color: '#0f172a' }}>{user?.full_name || 'Pharmacist'}</div>
            <div style={{ fontSize: 12, color: '#64748b' }}>{user?.hospital_name || 'Hospital Pharmacy'} · Registered Pharmacist</div>
          </div>
          <div style={{ display: 'flex', gap: 20 }}>
            {[
              { icon: 'fas fa-pills',            label: 'Medicines',    val: 'Verify & Dispense' },
              { icon: 'fas fa-shield-alt',        label: 'Safety',       val: 'Check Interactions' },
              { icon: 'fas fa-comments',          label: 'Counselling',  val: 'Patient Education' },
            ].map(i => (
              <div key={i.label} style={{ textAlign: 'center' }}>
                <i className={i.icon} style={{ color: ACCENT, fontSize: 16, display: 'block', marginBottom: 4 }}></i>
                <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>{i.label}</div>
                <div style={{ fontSize: 11, fontWeight: 600, color: '#334155' }}>{i.val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Prescription Table */}
        <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 8px rgba(15,23,42,0.06)', overflow: 'hidden' }}>
          {/* Tab bar */}
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
            <div style={{ display: 'flex', background: '#f8fafc', borderRadius: 10, padding: 4, gap: 2 }}>
              <button style={btnStyle(activeTab === 'queue')} onClick={() => setActiveTab('queue')}>
                <i className="fas fa-hourglass-half" style={{ marginRight: 6, fontSize: 11 }}></i>
                Pending Queue {pendingQueue.length > 0 && <span style={{
                  marginLeft: 6, background: '#ef4444', color: '#fff',
                  borderRadius: 10, fontSize: 10, padding: '1px 7px', fontWeight: 800,
                }}>{pendingQueue.length}</span>}
              </button>
              <button style={btnStyle(activeTab === 'dispensed')} onClick={() => setActiveTab('dispensed')}>
                <i className="fas fa-check-double" style={{ marginRight: 6, fontSize: 11 }}></i>
                Recently Dispensed
              </button>
            </div>
            <button onClick={fetchData} style={{
              fontSize: 12, color: '#64748b', fontWeight: 600, border: '1px solid #e2e8f0',
              borderRadius: 8, background: '#fff', padding: '7px 14px', cursor: 'pointer',
            }}>
              <i className="fas fa-sync-alt" style={{ marginRight: 6 }}></i>Refresh
            </button>
          </div>

          {/* ── Search & Filter Bar ── */}
          <div style={{ padding: '10px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 200 }}>
              <i className="fas fa-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 13, pointerEvents: 'none' }} />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by patient name, ID, or doctor..."
                style={{ width: '100%', padding: '8px 12px 8px 36px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 13, color: '#0f172a', outline: 'none', boxSizing: 'border-box', background: '#fff', transition: 'border-color 0.15s' }}
                onFocus={e => e.target.style.borderColor = ACCENT}
                onBlur={e => e.target.style.borderColor = '#e2e8f0'}
              />
            </div>
            {[
              { val: filterDoctor, set: setFilterDoctor, opts: [{ v: '', l: 'All Doctors' }, ...doctorOptions.map(d => ({ v: d, l: `Dr. ${d}` }))] },
              { val: filterStatus, set: setFilterStatus, opts: [{ v: 'all', l: 'All Status' }, { v: 'pending', l: 'Pending' }, { v: 'dispensed', l: 'Dispensed' }] },
            ].map((s, i) => (
              <select key={i} value={s.val} onChange={e => s.set(e.target.value)} style={{ padding: '8px 28px 8px 12px', border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 13, color: '#334155', background: `#fff url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2.5'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E") no-repeat right 9px center`, outline: 'none', cursor: 'pointer', appearance: 'none', WebkitAppearance: 'none' }}>
                {s.opts.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
              </select>
            ))}
            {hasClearable && (
              <button onClick={handleClear} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: '1.5px solid #e2e8f0', borderRadius: 10, background: '#fff', color: '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                <i className="fas fa-times" style={{ fontSize: 11 }} /> Clear
              </button>
            )}
          </div>

          {/* Column headers */}
          <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1.5fr 1.5fr 1fr 140px',
            padding: '10px 20px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
            {['Patient', 'Doctor', 'Date', 'Status', 'Actions'].map(h => (
              <div key={h} style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{h}</div>
            ))}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '50px 0' }}>
              <div className="spinner-border" style={{ color: ACCENT }} role="status"></div>
              <div style={{ marginTop: 12, fontSize: 13, color: '#94a3b8' }}>Loading prescriptions...</div>
            </div>
          ) : filteredList.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 0', color: '#94a3b8' }}>
              <i className={`fas ${listToShow.length === 0 ? 'fa-prescription-bottle-alt' : 'fa-search'}`} style={{ fontSize: 44, marginBottom: 12, display: 'block' }}></i>
              <p style={{ margin: 0, fontWeight: 600, color: '#64748b' }}>
                {listToShow.length === 0
                  ? (activeTab === 'queue' ? 'No pending prescriptions — queue is clear!' : 'No dispensed prescriptions yet today.')
                  : 'No prescriptions match your search or filters.'}
              </p>
              {listToShow.length > 0 && hasClearable && (
                <button onClick={handleClear} style={{ marginTop: 14, padding: '7px 18px', borderRadius: 9, border: '1.5px solid #e2e8f0', background: '#fff', color: ACCENT, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Clear Filters</button>
              )}
            </div>
          ) : (
            filteredList.map((note, idx) => {
              const hasAllergy = note.patient_allergies && note.patient_allergies.trim() !== '';
              return (
                <div key={note.note_id}
                  style={{ display: 'grid', gridTemplateColumns: '2.5fr 1.5fr 1.5fr 1fr 140px',
                    padding: '14px 20px', alignItems: 'center',
                    borderBottom: idx < filteredList.length - 1 ? '1px solid #f8fafc' : 'none',
                    transition: 'background 0.12s' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#fafbfc'}
                  onMouseLeave={e => e.currentTarget.style.background = '#fff'}
                >
                  {/* Patient */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', background: ACCENT + '15',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 12, fontWeight: 800, color: ACCENT, flexShrink: 0 }}>
                      {(note.patient_name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                    </div>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 6 }}>
                        {note.patient_name}
                        {hasAllergy && (
                          <span title={`Allergies: ${note.patient_allergies}`} style={{
                            background: '#fef2f2', color: '#dc2626', fontSize: 9, fontWeight: 800,
                            padding: '1px 6px', borderRadius: 8, textTransform: 'uppercase', letterSpacing: '0.5px',
                          }}>ALLERGY</span>
                        )}
                      </div>
                      <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>{note.patient_code}</div>
                    </div>
                  </div>

                  {/* Doctor */}
                  <div style={{ fontSize: 13, color: '#64748b' }}>
                    Dr. {note.doctor_name}
                  </div>

                  {/* Date */}
                  <div>
                    <div style={{ fontSize: 13, color: '#334155', fontWeight: 600 }}>
                      {new Date(note.visit_date).toLocaleDateString('en-SL')}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8' }}>
                      {new Date(note.visit_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                  </div>

                  {/* Status */}
                  <div>
                    {note.is_dispensed ? (
                      <span style={{ background: '#dcfce7', color: '#16a34a', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>Dispensed</span>
                    ) : (
                      <span style={{ background: '#fef3c7', color: '#d97706', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>Pending</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 6 }}>
                    {actionBtn('View', 'fas fa-eye', '#0891b2', () => setViewTarget(note), true)}
                    {!note.is_dispensed && (
                      <button onClick={() => setDispenseTarget(note)} style={{
                        padding: '6px 14px', borderRadius: 8, border: 'none',
                        background: `linear-gradient(135deg,${ACCENT},#7c3aed)`,
                        color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                        boxShadow: `0 3px 8px ${ACCENT}35`,
                      }}>
                        <i className="fas fa-pills" style={{ marginRight: 5 }}></i>Dispense
                      </button>
                    )}
                    {note.is_dispensed && (
                      <span style={{ fontSize: 11, color: '#94a3b8', fontStyle: 'italic' }}>
                        {note.dispensed_at ? new Date(note.dispensed_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    )}
                  </div>
                </div>
              );
            })
          )}

          {/* Footer */}
          {!loading && filteredList.length > 0 && (
            <div style={{ padding: '10px 20px', background: '#f8fafc', borderTop: '1px solid #f1f5f9',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>
                Showing <strong style={{ color: '#334155' }}>{filteredList.length}</strong>
                {filteredList.length !== listToShow.length && <> of {listToShow.length}</>}
                {' '}prescription{filteredList.length !== 1 ? 's' : ''}
              </span>
              {activeTab === 'queue' && (
                <span style={{ fontSize: 12, color: '#f59e0b', fontWeight: 600 }}>
                  <i className="fas fa-clock" style={{ marginRight: 5 }}></i>Oldest first — prioritise accordingly
                </span>
              )}
            </div>
          )}
        </div>

        {/* Quick Reference */}
        <div style={{ marginTop: 24, display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 14 }}>
          {[
            { icon: 'fas fa-heartbeat', color: '#ef4444', title: 'High-Risk Drugs', desc: 'Warfarin, Digoxin, Insulin — always double-check dose and patient identity.' },
            { icon: 'fas fa-baby',      color: '#f59e0b', title: 'Paediatric Dosing', desc: 'Calculate weight-based dosing carefully. Confirm child weight before dispensing.' },
            { icon: 'fas fa-female',    color: '#ec4899', title: 'Pregnancy Safety', desc: 'Check FDA/WHO pregnancy categories before dispensing to women of childbearing age.' },
            { icon: 'fas fa-thermometer-half', color: '#0891b2', title: 'Cold Chain', desc: 'Vaccines and biologics — verify cold storage before dispensing.' },
          ].map(card => (
            <div key={card.title} style={{ background: '#fff', borderRadius: 14, padding: '16px 18px',
              boxShadow: '0 2px 8px rgba(15,23,42,0.06)', display: 'flex', gap: 14, alignItems: 'flex-start' }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: card.color + '15',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className={card.icon} style={{ color: card.color, fontSize: 15 }}></i>
              </div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', marginBottom: 4 }}>{card.title}</div>
                <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.5 }}>{card.desc}</div>
              </div>
            </div>
          ))}
        </div>

      </div>

      {dispenseTarget && <DispenseModal note={dispenseTarget} onClose={() => setDispenseTarget(null)} onDispensed={onDispensed} />}
      {viewTarget && <ViewModal note={viewTarget} onClose={() => setViewTarget(null)} />}
    </DashboardLayout>
  );
}

export default PharmacistDashboard;

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layout/DashboardLayout';
import showToast from '../../utils/toast';

const ACCENT = '#8b5cf6';

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

// ── Dispense Modal ─────────────────────────────────────────────
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
  const toggle = (key) => setChecklist(c => ({ ...c, [key]: !c[key] }));

  const handleDispense = async () => {
    if (!allChecked) {
      showToast.warning('Please complete the verification checklist before dispensing.');
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
        showToast.success(`Prescription dispensed for ${note.patient_name}.`);
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
              <i className="fas fa-pills" style={{ color: ACCENT, fontSize: 16 }}></i>
            </div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 16, color: '#0f172a' }}>Dispense Prescription</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>Visit #{note.visit_id} · {new Date(note.visit_date).toLocaleDateString()}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 20, color: '#94a3b8', cursor: 'pointer' }}>×</button>
        </div>

        <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          {/* Patient */}
          <div style={{ background: '#f8fafc', borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 }}>Patient</div>
            <div style={{ fontWeight: 800, fontSize: 15, color: '#0f172a', marginBottom: 4 }}>{note.patient_name}</div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 2 }}>ID: <strong>{note.patient_code}</strong></div>
            <div style={{ fontSize: 12, color: '#64748b' }}>Gender: <strong>{note.patient_gender || '—'}</strong></div>
            {hasAllergy && (
              <div style={{ marginTop: 10, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: '8px 10px' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#dc2626', marginBottom: 3 }}>
                  <i className="fas fa-exclamation-triangle" style={{ marginRight: 5 }}></i>KNOWN ALLERGIES
                </div>
                <div style={{ fontSize: 11, color: '#991b1b' }}>{note.patient_allergies}</div>
              </div>
            )}
            {!hasAllergy && (
              <div style={{ marginTop: 8, background: '#f0fdf4', borderRadius: 8, padding: '6px 10px' }}>
                <div style={{ fontSize: 11, color: '#16a34a', fontWeight: 600 }}>
                  <i className="fas fa-check-circle" style={{ marginRight: 5 }}></i>No known allergies
                </div>
              </div>
            )}
          </div>
          {/* Doctor / Diagnosis */}
          <div style={{ background: '#f8fafc', borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 8 }}>Prescribing Doctor</div>
            <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>Dr. {note.doctor_name}</div>
            <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>{note.visit_type}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 4 }}>Diagnosis</div>
            <div style={{ fontSize: 12, color: '#334155', background: '#fff', borderRadius: 8, padding: '7px 10px', border: '1px solid #e2e8f0' }}>
              {note.diagnosis || 'Not recorded'}
            </div>
          </div>
        </div>

        {/* Prescription text */}
        <div style={{ padding: '0 24px 18px' }}>
          <div style={{ background: ACCENT + '08', border: `1px solid ${ACCENT}30`, borderRadius: 12, padding: 14 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: ACCENT, textTransform: 'uppercase', marginBottom: 8 }}>
              <i className="fas fa-prescription" style={{ marginRight: 6 }}></i>Prescribed Medications
            </div>
            <pre style={{ margin: 0, fontSize: 13, color: '#1e293b', fontFamily: 'inherit', whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
              {note.prescriptions || 'No prescription text.'}
            </pre>
          </div>
        </div>

        {/* Verification Checklist */}
        <div style={{ padding: '0 24px 18px' }}>
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
                padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                background: checklist[item.key] ? '#f0fdf4' : '#f8fafc',
                border: `1px solid ${checklist[item.key] ? '#bbf7d0' : '#e2e8f0'}`,
                transition: 'all 0.15s',
              }}>
                <input type="checkbox" checked={checklist[item.key]} onChange={() => toggle(item.key)}
                  style={{ width: 15, height: 15, accentColor: '#10b981', cursor: 'pointer' }} />
                <span style={{ fontSize: 12, fontWeight: 600, color: checklist[item.key] ? '#16a34a' : '#475569' }}>
                  {item.label}
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Pharmacy note */}
        <div style={{ padding: '0 24px 18px' }}>
          <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>
            Pharmacist Notes <span style={{ fontWeight: 400, color: '#94a3b8' }}>(substitutions, counselling, stock)</span>
          </label>
          <textarea rows={3} value={pharmacyNote} onChange={e => setPharmacyNote(e.target.value)}
            placeholder="e.g. Dispensed generic Amoxicillin 500mg. Patient counselled on completing full course."
            style={{ width: '100%', padding: '9px 12px', borderRadius: 10, border: '1.5px solid #e2e8f0',
              fontSize: 13, outline: 'none', resize: 'vertical', boxSizing: 'border-box', color: '#0f172a' }}
            onFocus={e => e.target.style.borderColor = ACCENT}
            onBlur={e => e.target.style.borderColor = '#e2e8f0'}
          />
        </div>

        {/* Footer */}
        <div style={{ padding: '14px 24px', borderTop: '1px solid #f1f5f9',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 12, color: allChecked ? '#16a34a' : '#f59e0b', fontWeight: 600 }}>
            <i className={`fas ${allChecked ? 'fa-check-circle' : 'fa-exclamation-circle'}`} style={{ marginRight: 6 }}></i>
            {allChecked ? 'Ready to dispense' : 'Complete checklist to proceed'}
          </span>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 9, border: '1px solid #e2e8f0',
              background: '#fff', color: '#64748b', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>Cancel</button>
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

// ── Main Queue Page ────────────────────────────────────────────
function PharmacistQueue() {
  const { apiCall } = useAuth();
  const [queue, setQueue]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [dispenseTarget, setTarget]     = useState(null);
  const [search, setSearch]             = useState('');

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiCall('/pharmacist/prescriptions/?dispensed=false');
      if (res.ok) {
        const data = await res.json();
        setQueue(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  const onDispensed = (noteId) => {
    setQueue(q => q.filter(n => n.note_id !== noteId));
  };

  const filtered = search.trim()
    ? queue.filter(n =>
        n.patient_name.toLowerCase().includes(search.toLowerCase()) ||
        n.patient_code.toLowerCase().includes(search.toLowerCase())
      )
    : queue;

  const alertCount = filtered.filter(n => n.patient_allergies && n.patient_allergies.trim()).length;

  return (
    <DashboardLayout navItems={navItems} brandTitle="NEHR Pharmacy" roleBadge="Pharmacist">
      <div style={{ padding: '28px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: 0 }}>Dispense Queue</h1>
            <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 14 }}>Pending prescriptions awaiting dispensing</p>
          </div>
          <button onClick={fetchQueue} style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: `linear-gradient(135deg,${ACCENT},#7c3aed)`,
            color: '#fff', border: 'none', borderRadius: 10,
            padding: '10px 20px', fontWeight: 700, fontSize: 14, cursor: 'pointer',
            boxShadow: `0 4px 14px ${ACCENT}35`,
          }}>
            <i className="fas fa-sync-alt" style={{ fontSize: 12 }}></i>Refresh
          </button>
        </div>

        {/* Info banners */}
        <div style={{ display: 'flex', gap: 14, marginBottom: 20, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 180, background: '#fff', borderRadius: 12, padding: '14px 18px',
            boxShadow: '0 2px 8px rgba(15,23,42,0.06)', display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 38, height: 38, borderRadius: 10, background: '#fef3c7',
              display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className="fas fa-hourglass-half" style={{ color: '#f59e0b', fontSize: 16 }}></i>
            </div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{filtered.length}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>Awaiting Dispense</div>
            </div>
          </div>
          {alertCount > 0 && (
            <div style={{ flex: 1, minWidth: 180, background: '#fef2f2', border: '1px solid #fecaca',
              borderRadius: 12, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 38, height: 38, borderRadius: 10, background: '#fef2f2',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className="fas fa-exclamation-triangle" style={{ color: '#ef4444', fontSize: 16 }}></i>
              </div>
              <div>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#dc2626', lineHeight: 1 }}>{alertCount}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#b91c1c' }}>Patients with Allergies</div>
              </div>
            </div>
          )}
        </div>

        {/* Search */}
        <div style={{ background: '#fff', borderRadius: 12, padding: '12px 16px', marginBottom: 16,
          boxShadow: '0 2px 8px rgba(15,23,42,0.06)' }}>
          <div style={{ position: 'relative' }}>
            <i className="fas fa-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
              color: '#94a3b8', fontSize: 13, pointerEvents: 'none' }}></i>
            <input type="text" placeholder="Filter by patient name or ID..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: 10,
                border: '1px solid #e2e8f0', fontSize: 13, outline: 'none',
                background: '#f8fafc', color: '#0f172a', boxSizing: 'border-box' }}
              onFocus={e => e.target.style.borderColor = ACCENT}
              onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>
        </div>

        {/* Queue list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {loading ? (
            <div style={{ background: '#fff', borderRadius: 14, padding: '50px 0', textAlign: 'center',
              boxShadow: '0 2px 8px rgba(15,23,42,0.06)' }}>
              <div className="spinner-border" style={{ color: ACCENT }} role="status"></div>
              <div style={{ marginTop: 12, fontSize: 13, color: '#94a3b8' }}>Loading queue...</div>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ background: '#fff', borderRadius: 14, padding: '60px 0', textAlign: 'center',
              boxShadow: '0 2px 8px rgba(15,23,42,0.06)', color: '#94a3b8' }}>
              <i className="fas fa-check-circle" style={{ fontSize: 48, color: '#10b981', marginBottom: 14, display: 'block' }}></i>
              <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Queue is clear!</p>
              <p style={{ margin: '4px 0 0', fontSize: 13 }}>All prescriptions have been dispensed.</p>
            </div>
          ) : (
            filtered.map((note) => {
              const hasAllergy = note.patient_allergies && note.patient_allergies.trim() !== '';
              return (
                <div key={note.note_id} style={{
                  background: '#fff', borderRadius: 14, padding: '18px 20px',
                  boxShadow: '0 2px 8px rgba(15,23,42,0.06)',
                  border: hasAllergy ? '1.5px solid #fecaca' : '1.5px solid #f1f5f9',
                  transition: 'box-shadow 0.15s',
                }}
                  onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 16px rgba(15,23,42,0.10)'}
                  onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(15,23,42,0.06)'}
                >
                  <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                    {/* Patient + doctor */}
                    <div style={{ display: 'flex', gap: 14, flex: 1, minWidth: 200 }}>
                      <div style={{ width: 44, height: 44, borderRadius: '50%', background: ACCENT + '15',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 14, fontWeight: 800, color: ACCENT, flexShrink: 0 }}>
                        {(note.patient_name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                      </div>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: 15, color: '#0f172a', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                          {note.patient_name}
                          {hasAllergy && (
                            <span style={{ background: '#fef2f2', color: '#dc2626', fontSize: 10, fontWeight: 800,
                              padding: '2px 8px', borderRadius: 8, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                              <i className="fas fa-exclamation-triangle" style={{ marginRight: 4 }}></i>Allergy
                            </span>
                          )}
                        </div>
                        <div style={{ fontSize: 12, color: '#94a3b8', fontFamily: 'monospace', marginTop: 2 }}>{note.patient_code}</div>
                        <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>
                          Prescribed by <strong>Dr. {note.doctor_name}</strong> · {new Date(note.visit_date).toLocaleDateString('en-SL')}
                        </div>
                      </div>
                    </div>

                    {/* Action */}
                    <button onClick={() => setTarget(note)} style={{
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      background: `linear-gradient(135deg,${ACCENT},#7c3aed)`,
                      color: '#fff', border: 'none', borderRadius: 10,
                      padding: '10px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer',
                      boxShadow: `0 3px 10px ${ACCENT}35`, whiteSpace: 'nowrap',
                    }}>
                      <i className="fas fa-pills" style={{ fontSize: 12 }}></i>Dispense
                    </button>
                  </div>

                  {/* Prescription preview */}
                  <div style={{ marginTop: 12, background: '#f8fafc', borderRadius: 10, padding: '10px 14px',
                    borderLeft: `3px solid ${ACCENT}` }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 5 }}>Diagnosis &amp; Prescription</div>
                    <div style={{ fontSize: 12, color: '#334155', marginBottom: 4 }}>
                      <strong>Diagnosis:</strong> {note.diagnosis || 'Not specified'}
                    </div>
                    <pre style={{ margin: 0, fontSize: 12, color: '#475569', fontFamily: 'inherit',
                      whiteSpace: 'pre-wrap', lineHeight: 1.6, maxHeight: 60, overflow: 'hidden' }}>
                      {note.prescriptions || 'No prescription text.'}
                    </pre>
                  </div>

                  {hasAllergy && (
                    <div style={{ marginTop: 10, background: '#fef2f2', border: '1px solid #fecaca',
                      borderRadius: 8, padding: '8px 12px', fontSize: 12, color: '#991b1b' }}>
                      <strong style={{ color: '#dc2626' }}>⚠ Allergies:</strong> {note.patient_allergies}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {dispenseTarget && (
        <DispenseModal
          note={dispenseTarget}
          onClose={() => setTarget(null)}
          onDispensed={onDispensed}
        />
      )}
    </DashboardLayout>
  );
}

export default PharmacistQueue;

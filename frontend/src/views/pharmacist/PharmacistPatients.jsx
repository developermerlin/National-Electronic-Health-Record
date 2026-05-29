/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layout/DashboardLayout';

/* ── Small helpers ── */
const fmt = (v) => v || '—';
const fmtDate = (v) => v ? new Date(v).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

const InfoItem = ({ label, value, full }) => (
  <div style={{ gridColumn: full ? '1 / -1' : 'span 1', padding: '9px 0', borderBottom: '1px solid #f1f5f9' }}>
    <div style={{ fontSize: 12, fontWeight: 600, color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: 4 }}>{label}</div>
    <div style={{ fontSize: 15, fontWeight: 500, color: '#111827', wordBreak: 'break-word' }}>{fmt(value)}</div>
  </div>
);

const Section = ({ icon, title, children }) => (
  <div style={{ marginBottom: 22 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2, paddingBottom: 8, borderBottom: '1.5px solid #f3f4f6' }}>
      <i className={icon} style={{ color: '#6b7280', fontSize: 12 }} />
      <span style={{ fontSize: 13, fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.7px' }}>{title}</span>
    </div>
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 40px' }}>
      {children}
    </div>
  </div>
);

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

/* ── Medication Profile Modal ── */
function MedProfileModal({ patient, onClose, apiCall }) {
  const [prescriptions, setPrescriptions] = useState([]);
  const [rxLoading, setRxLoading] = useState(true);
  const [tab, setTab] = useState('info'); // 'info' | 'rx'
  const [imgZoom, setImgZoom] = useState(false);

  useEffect(() => {
    (async () => {
      setRxLoading(true);
      try {
        const r = await apiCall(`/pharmacist/prescriptions/?patient=${patient.id}`);
        if (r.ok) setPrescriptions(await r.json());
      } catch (e) { console.error(e); }
      finally { setRxLoading(false); }
    })();
  }, [patient.id]);

  const allergies = (patient.allergies || '').split(/[,;]+/).map(a => a.trim()).filter(Boolean);
  const chronic   = (patient.chronic_conditions || '').split(/[,;]+/).map(a => a.trim()).filter(Boolean);
  const initials  = ((patient.first_name?.[0] || '') + (patient.last_name?.[0] || '')).toUpperCase() || '??';
  const pending   = prescriptions.filter(p => !p.is_dispensed);
  const dispensed = prescriptions.filter(p =>  p.is_dispensed);

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: '#ffffff', borderRadius: 16, width: '100%', maxWidth: 860, maxHeight: '92vh', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}>

        {/* ── Header ── */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #e5e7eb', display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Avatar */}
          <div
            onClick={() => patient.photo_url && setImgZoom(true)}
            title={patient.photo_url ? 'Click to enlarge' : ''}
            style={{ width: 80, height: 80, borderRadius: '50%', background: '#f3f4f6', border: '2px solid #e5e7eb', overflow: 'hidden', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, fontWeight: 700, color: '#6b7280', cursor: patient.photo_url ? 'zoom-in' : 'default', transition: 'box-shadow 0.15s' }}
            onMouseEnter={e => { if (patient.photo_url) e.currentTarget.style.boxShadow = '0 0 0 3px #7c3aed55'; }}
            onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}
          >
            {patient.photo_url ? <img src={patient.photo_url} alt="" style={{ width: 80, height: 80, objectFit: 'cover' }} /> : initials}
          </div>

          {/* Name + meta */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 5 }}>
              <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#111827' }}>{patient.full_name}</h2>
              {patient.status_display && (
                <span style={{ fontSize: 11, background: patient.status === 'admitted' ? '#eff6ff' : '#f0fdf4', color: patient.status === 'admitted' ? '#2563eb' : '#16a34a', border: `1px solid ${patient.status === 'admitted' ? '#bfdbfe' : '#bbf7d0'}`, borderRadius: 20, padding: '2px 10px', fontWeight: 600 }}>
                  {patient.status_display}
                </span>
              )}
              {patient.has_portal_account && (
                <span style={{ fontSize: 11, background: '#f5f3ff', color: '#7c3aed', border: '1px solid #ddd6fe', borderRadius: 20, padding: '2px 10px', fontWeight: 600 }}>
                  <i className="fas fa-user-circle" style={{ marginRight: 4, fontSize: 9 }} />Portal Account
                </span>
              )}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0 18px', fontSize: 12.5, color: '#6b7280' }}>
              <span><i className="fas fa-id-badge" style={{ marginRight: 4 }} />{patient.patient_id}</span>
              <span><i className="fas fa-venus-mars" style={{ marginRight: 4 }} />{patient.gender_display}</span>
              <span><i className="fas fa-birthday-cake" style={{ marginRight: 4 }} />Age {patient.age ?? '—'}</span>
              {patient.blood_type_display && <span>🩸 {patient.blood_type_display}</span>}
              {patient.hospital_name && <span><i className="fas fa-hospital" style={{ marginRight: 4 }} />{patient.hospital_name}</span>}
            </div>
          </div>

          {/* Close */}
          <button onClick={onClose} style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#6b7280', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, flexShrink: 0 }}>
            <i className="fas fa-times" />
          </button>
        </div>

        {/* ── Image lightbox ── */}
        {imgZoom && patient.photo_url && (
          <div
            onClick={() => setImgZoom(false)}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.85)', zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
          >
            <div style={{ position: 'relative', display: 'inline-block' }} onClick={e => e.stopPropagation()}>
              <img
                src={patient.photo_url}
                alt={patient.full_name}
                style={{ maxWidth: '80vw', maxHeight: '80vh', borderRadius: 12, boxShadow: '0 24px 64px rgba(0,0,0,0.6)', display: 'block', objectFit: 'contain' }}
              />
              <div style={{ textAlign: 'center', marginTop: 14, color: 'rgba(255,255,255,0.75)', fontSize: 14, fontWeight: 600 }}>{patient.full_name}</div>
            </div>
            <button
              onClick={() => setImgZoom(false)}
              style={{ position: 'absolute', top: 20, right: 20, width: 36, height: 36, borderRadius: '50%', border: '1.5px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.1)', color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}
            >
              <i className="fas fa-times" />
            </button>
          </div>
        )}

        {/* ── Allergy bar ── */}
        {allergies.length > 0 ? (
          <div style={{ background: '#fef2f2', borderBottom: '1px solid #fecaca', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <i className="fas fa-exclamation-triangle" style={{ color: '#dc2626', fontSize: 13, flexShrink: 0 }} />
            <span style={{ fontSize: 12, fontWeight: 700, color: '#dc2626', marginRight: 4 }}>ALLERGY ALERT:</span>
            {allergies.map((a, i) => (
              <span key={i} style={{ background: '#fee2e2', color: '#b91c1c', border: '1px solid #fca5a5', borderRadius: 20, padding: '2px 11px', fontSize: 12, fontWeight: 600 }}>{a}</span>
            ))}
          </div>
        ) : (
          <div style={{ background: '#f0fdf4', borderBottom: '1px solid #bbf7d0', padding: '10px 24px', display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="fas fa-shield-alt" style={{ color: '#16a34a', fontSize: 13 }} />
            <span style={{ fontSize: 12.5, fontWeight: 600, color: '#15803d' }}>No documented allergies on record</span>
          </div>
        )}

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', alignItems: 'center', background: '#fff', borderBottom: '1px solid #e5e7eb', padding: '0 24px' }}>
          {[
            { key: 'info', icon: 'fas fa-id-card', label: 'Patient Information' },
            { key: 'rx',   icon: 'fas fa-history',  label: `Prescription History${prescriptions.length ? ` (${prescriptions.length})` : ''}` },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{ background: 'none', border: 'none', cursor: 'pointer', padding: '12px 18px', fontSize: 13, fontWeight: tab === t.key ? 600 : 400, color: tab === t.key ? ACCENT : '#9ca3af', borderBottom: tab === t.key ? `2px solid ${ACCENT}` : '2px solid transparent', display: 'flex', alignItems: 'center', gap: 6 }}>
              <i className={t.icon} style={{ fontSize: 11 }} />{t.label}
            </button>
          ))}
          {pending.length > 0 && tab === 'info' && (
            <button onClick={() => setTab('rx')} style={{ marginLeft: 'auto', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 6, padding: '4px 12px', fontSize: 12, fontWeight: 600, color: '#92400e', cursor: 'pointer' }}>
              <i className="fas fa-hourglass-half" style={{ marginRight: 5, fontSize: 10 }} />{pending.length} Pending
            </button>
          )}
        </div>

        {/* ── Body ── */}
        <div style={{ overflowY: 'auto', flex: 1, padding: '18px 24px' }}>

          {/* ═══ PATIENT INFO TAB ═══ */}
          {tab === 'info' && (
            <>
              <Section icon="fas fa-user" title="Personal Information">
                <InfoItem label="First Name"       value={patient.first_name} />
                <InfoItem label="Last Name"        value={patient.last_name} />
                {patient.other_names && <InfoItem label="Other Names" value={patient.other_names} />}
                <InfoItem label="Date of Birth"    value={fmtDate(patient.date_of_birth)} />
                <InfoItem label="Age"              value={patient.age != null ? `${patient.age} years` : null} />
                <InfoItem label="Gender"           value={patient.gender_display} />
                <InfoItem label="Marital Status"   value={patient.marital_status_display} />
                <InfoItem label="Nationality"      value={patient.nationality} />
                <InfoItem label="National ID"      value={patient.national_id} />
              </Section>

              <Section icon="fas fa-phone-alt" title="Contact Information">
                <InfoItem label="Phone"            value={patient.phone} />
                <InfoItem label="Alt. Phone"       value={patient.alt_phone} />
                <InfoItem label="Email"            value={patient.email} />
                <InfoItem label="Address"          value={patient.address} full />
                <InfoItem label="City"             value={patient.city} />
                <InfoItem label="District"         value={patient.district_name} />
                <InfoItem label="Chiefdom"         value={patient.chiefdom_name} />
                <InfoItem label="Town"             value={patient.town_name} />
              </Section>

              <Section icon="fas fa-heartbeat" title="Medical Background">
                <InfoItem label="Blood Type"       value={patient.blood_type_display} />
                <InfoItem label="Allergies"        value={patient.allergies || 'None'} full />
                <InfoItem label="Chronic Conditions" value={patient.chronic_conditions || 'None'} full />
                <InfoItem label="Disabilities"     value={patient.disabilities || 'None'} full />
              </Section>

              {chronic.length > 0 && (
                <div style={{ marginTop: -10, marginBottom: 18, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {chronic.map((c, i) => (
                    <span key={i} style={{ background: '#fff7ed', color: '#c2410c', border: '1px solid #fed7aa', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>{c}</span>
                  ))}
                </div>
              )}

              <Section icon="fas fa-id-card" title="Insurance & Registration">
                <InfoItem label="Insurance Provider" value={patient.insurance_provider} />
                <InfoItem label="Insurance Number"   value={patient.insurance_number} />
                <InfoItem label="Hospital"           value={patient.hospital_name} />
                <InfoItem label="Registered By"      value={patient.registered_by_name} />
                <InfoItem label="Registration Date"  value={fmtDate(patient.created_at)} />
                <InfoItem label="Status"             value={patient.status_display} />
              </Section>

              <Section icon="fas fa-user-friends" title="Next of Kin">
                <InfoItem label="Name"             value={patient.next_of_kin_name} />
                <InfoItem label="Phone"            value={patient.next_of_kin_phone} />
                <InfoItem label="Relationship"     value={patient.next_of_kin_relationship} />
                <InfoItem label="Address"          value={patient.next_of_kin_address} full />
              </Section>

              <Section icon="fas fa-phone-volume" title="Emergency Contact">
                <InfoItem label="Name"             value={patient.emergency_contact_name} />
                <InfoItem label="Phone"            value={patient.emergency_contact_phone} />
                <InfoItem label="Relationship"     value={patient.emergency_contact_relationship} />
              </Section>
            </>
          )}

          {/* ═══ PRESCRIPTION HISTORY TAB ═══ */}
          {tab === 'rx' && (
            <>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14, flexWrap: 'wrap', gap: 8 }}>
                <span style={{ fontSize: 13, color: '#64748b' }}>
                  Showing <strong style={{ color: '#0f172a' }}>{prescriptions.length}</strong> record{prescriptions.length !== 1 ? 's' : ''} at this hospital
                </span>
                <div style={{ display: 'flex', gap: 7 }}>
                  {pending.length > 0 && (
                    <span style={{ background: '#fef9c3', color: '#854d0e', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>
                      <i className="fas fa-hourglass-half" style={{ marginRight: 4, fontSize: 10 }} />{pending.length} Pending
                    </span>
                  )}
                  {dispensed.length > 0 && (
                    <span style={{ background: '#dcfce7', color: '#14532d', borderRadius: 20, padding: '4px 12px', fontSize: 12, fontWeight: 700 }}>
                      <i className="fas fa-check" style={{ marginRight: 4, fontSize: 10 }} />{dispensed.length} Dispensed
                    </span>
                  )}
                </div>
              </div>

              {rxLoading ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                  <i className="fas fa-spinner fa-spin" style={{ fontSize: 24, color: ACCENT, display: 'block', marginBottom: 10 }} />
                  Loading prescription history...
                </div>
              ) : prescriptions.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                  <i className="fas fa-prescription-bottle-alt" style={{ fontSize: 36, display: 'block', marginBottom: 12 }} />
                  <p style={{ margin: 0, fontWeight: 600 }}>No prescription history at this hospital</p>
                </div>
              ) : (
                prescriptions.map(note => (
                  <div key={note.note_id} style={{ background: note.is_dispensed ? '#f8fafc' : '#fffbeb', border: `1.5px solid ${note.is_dispensed ? '#e2e8f0' : '#fde68a'}`, borderRadius: 12, padding: '14px 16px', marginBottom: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8, flexWrap: 'wrap', gap: 6 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>
                        <i className="fas fa-calendar-alt" style={{ marginRight: 6, color: '#94a3b8', fontSize: 11 }} />
                        {new Date(note.visit_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        <span style={{ fontSize: 12, color: '#64748b' }}>
                          <i className="fas fa-user-md" style={{ marginRight: 4, fontSize: 10 }} />Dr. {note.doctor_name}
                        </span>
                        <span style={{ padding: '3px 11px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: note.is_dispensed ? '#dcfce7' : '#fef9c3', color: note.is_dispensed ? '#14532d' : '#854d0e' }}>
                          {note.is_dispensed ? '✓ Dispensed' : '⏳ Pending'}
                        </span>
                      </div>
                    </div>
                    {note.diagnosis && (
                      <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}><strong>Diagnosis:</strong> {note.diagnosis}</div>
                    )}
                    <div style={{ fontSize: 13, color: '#334155', background: '#fff', borderRadius: 8, padding: '10px 13px', border: '1px solid #f1f5f9', whiteSpace: 'pre-wrap', fontFamily: 'monospace', lineHeight: 1.6 }}>
                      {note.prescriptions}
                    </div>
                    {note.is_dispensed && note.dispensed_by && (
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 8, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <i className="fas fa-check-circle" style={{ color: '#86efac' }} />
                        Dispensed by <strong style={{ color: '#64748b' }}>{note.dispensed_by}</strong>
                        {note.dispensed_at && <> &middot; {new Date(note.dispensed_at).toLocaleString()}</>}
                      </div>
                    )}
                  </div>
                ))
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Main patient lookup page ── */
function PharmacistPatients() {
  const { apiCall } = useAuth();
  const [patients,  setPatients]  = useState([]);
  const [loading,   setLoading]   = useState(false);
  const [search,    setSearch]    = useState('');
  const [selected,  setSelected]  = useState(null);
  const mountedRef = useRef(false);

  const fetchPatients = useCallback(async (q) => {
    if (!q.trim()) { setPatients([]); return; }
    setLoading(true);
    try {
      const r = await apiCall(`/patients/?search=${encodeURIComponent(q)}`);
      if (r.ok) {
        const data = await r.json();
        setPatients(Array.isArray(data) ? data : data.results || []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [apiCall]);

  useEffect(() => {
    if (!mountedRef.current) { mountedRef.current = true; return; }
    const t = setTimeout(() => fetchPatients(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  const allergyCount = (p) =>
    (p.allergies || '').split(/[,;]+/).filter(a => a.trim()).length;

  return (
    <DashboardLayout navItems={navItems} brandTitle="NEHR Pharmacy" roleBadge="Pharmacist">
      <div style={{ padding: '28px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: 0 }}>Patient Lookup</h1>
          <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 14 }}>
            Search for patients to view allergy profiles and prescription history before dispensing
          </p>
        </div>

        {/* Search card */}
        <div style={{ background: '#fff', borderRadius: 14, padding: '18px 20px', marginBottom: 24, boxShadow: '0 2px 8px rgba(15,23,42,0.06)' }}>
          <div style={{ position: 'relative' }}>
            <i className="fas fa-search" style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 15, pointerEvents: 'none' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by patient name, ID, phone, or national ID..."
              style={{ width: '100%', padding: '12px 42px 12px 44px', border: '1.5px solid #e2e8f0', borderRadius: 12, fontSize: 14, color: '#0f172a', outline: 'none', boxSizing: 'border-box', background: '#fafbfc', transition: 'border-color 0.15s' }}
              onFocus={e => e.target.style.borderColor = ACCENT}
              onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            />
            {search && (
              <button
                onClick={() => { setSearch(''); setPatients([]); }}
                style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center' }}
              >
                <i className="fas fa-times" />
              </button>
            )}
          </div>
          {search && !loading && (
            <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 8, paddingLeft: 4 }}>
              {patients.length > 0
                ? <><strong style={{ color: '#334155' }}>{patients.length}</strong> patient{patients.length !== 1 ? 's' : ''} found</>
                : 'No patients found'}
            </div>
          )}
        </div>

        {/* Empty / loading / results */}
        {!search && (
          <div style={{ textAlign: 'center', padding: '70px 0', color: '#94a3b8' }}>
            <div style={{ width: 80, height: 80, borderRadius: '50%', background: ACCENT + '10', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px' }}>
              <i className="fas fa-user-injured" style={{ fontSize: 34, color: ACCENT + '70' }} />
            </div>
            <p style={{ fontSize: 16, fontWeight: 700, margin: '0 0 6px', color: '#475569' }}>Patient Medication Lookup</p>
            <p style={{ fontSize: 14, margin: 0 }}>Type a name or patient ID to search</p>
          </div>
        )}

        {loading && (
          <div style={{ textAlign: 'center', padding: '50px 0' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: 30, color: ACCENT, display: 'block', marginBottom: 12 }} />
            <span style={{ fontSize: 14, color: '#64748b' }}>Searching patients...</span>
          </div>
        )}

        {!loading && search && patients.length === 0 && (
          <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
            <i className="fas fa-user-slash" style={{ fontSize: 40, display: 'block', marginBottom: 12 }} />
            <p style={{ fontWeight: 700, color: '#64748b', margin: '0 0 4px' }}>No patients found for "{search}"</p>
            <p style={{ fontSize: 13, margin: 0 }}>Try a different name, patient ID, or phone number</p>
          </div>
        )}

        {!loading && patients.length > 0 && (
          <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 8px rgba(15,23,42,0.06)', overflow: 'hidden' }}>
            {/* Table header */}
            <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr 1.2fr 1fr 1fr auto', gap: 0, background: '#f8fafc', borderBottom: '1px solid #e2e8f0', padding: '10px 20px', fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              <span>Patient</span>
              <span>Age / Gender</span>
              <span>Blood Type</span>
              <span>Allergies</span>
              <span>Phone</span>
              <span>Status</span>
              <span></span>
            </div>

            {/* Table rows */}
            {patients.map((p, idx) => {
              const ac = allergyCount(p);
              const initials = ((p.first_name?.[0] || '') + (p.last_name?.[0] || '')).toUpperCase() || '??';
              return (
                <div
                  key={p.id}
                  style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr 1fr 1.2fr 1fr 1fr auto', gap: 0, padding: '13px 20px', alignItems: 'center', borderBottom: idx < patients.length - 1 ? '1px solid #f1f5f9' : 'none', transition: 'background 0.12s', cursor: 'pointer' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#faf8ff'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  onClick={() => setSelected(p)}
                >
                  {/* Patient name + ID */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: ACCENT + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: ACCENT, flexShrink: 0, overflow: 'hidden' }}>
                      {p.photo_url ? <img src={p.photo_url} alt="" style={{ width: 38, height: 38, objectFit: 'cover' }} /> : initials}
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.full_name}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 1 }}>{p.patient_id}</div>
                    </div>
                  </div>

                  {/* Age / Gender */}
                  <div style={{ fontSize: 13, color: '#334155' }}>
                    {p.age ?? '—'} · {p.gender_display || '—'}
                  </div>

                  {/* Blood Type */}
                  <div style={{ fontSize: 13, color: '#334155' }}>
                    {p.blood_type_display ? <span>🩸 {p.blood_type_display}</span> : <span style={{ color: '#cbd5e1' }}>—</span>}
                  </div>

                  {/* Allergy */}
                  <div>
                    {ac > 0 ? (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700 }}>
                        <i className="fas fa-exclamation-triangle" style={{ fontSize: 9 }} />{ac} {ac === 1 ? 'Allergy' : 'Allergies'}
                      </span>
                    ) : (
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, background: '#f0fdf4', color: '#15803d', border: '1px solid #86efac', borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 600 }}>
                        <i className="fas fa-check-circle" style={{ fontSize: 9 }} />None
                      </span>
                    )}
                  </div>

                  {/* Phone */}
                  <div style={{ fontSize: 12, color: '#64748b' }}>{p.phone || <span style={{ color: '#cbd5e1' }}>—</span>}</div>

                  {/* Status */}
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700, borderRadius: 20, padding: '3px 10px', background: p.status === 'admitted' ? '#dbeafe' : p.status === 'active' ? '#dcfce7' : '#f1f5f9', color: p.status === 'admitted' ? '#1d4ed8' : p.status === 'active' ? '#15803d' : '#64748b' }}>
                      {p.status_display || p.status || '—'}
                    </span>
                  </div>

                  {/* Action */}
                  <button
                    onClick={e => { e.stopPropagation(); setSelected(p); }}
                    style={{ background: ACCENT, color: '#fff', border: 'none', borderRadius: 8, padding: '6px 14px', fontSize: 12, fontWeight: 700, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 5, whiteSpace: 'nowrap' }}
                  >
                    <i className="fas fa-eye" style={{ fontSize: 10 }} />View Profile
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {selected && (
        <MedProfileModal
          patient={selected}
          onClose={() => setSelected(null)}
          apiCall={apiCall}
        />
      )}
    </DashboardLayout>
  );
}

export default PharmacistPatients;

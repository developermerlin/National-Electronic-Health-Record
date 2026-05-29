/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layout/DashboardLayout';

const ACCENT = '#0d9488';

const navItems = [
  { label: 'MCH', items: [
    { path: '/mch/dashboard',       icon: 'fas fa-heartbeat',     text: 'MCH Dashboard' },
    { path: '/mch/anc',             icon: 'fas fa-female',        text: 'ANC Visits' },
    { path: '/mch/immunizations',   icon: 'fas fa-syringe',       text: 'Immunizations' },
  ]},
  { label: 'Account', items: [
    { path: '/admin/profile', icon: 'fas fa-user-circle', text: 'My Profile' },
  ]},
];

const VACCINES = [
  { value: 'bcg',      label: 'BCG' },
  { value: 'opv0',     label: 'OPV-0 (Birth)' },
  { value: 'opv1',     label: 'OPV-1' },
  { value: 'opv2',     label: 'OPV-2' },
  { value: 'opv3',     label: 'OPV-3' },
  { value: 'penta1',   label: 'Pentavalent-1' },
  { value: 'penta2',   label: 'Pentavalent-2' },
  { value: 'penta3',   label: 'Pentavalent-3' },
  { value: 'measles',  label: 'Measles' },
  { value: 'yellow_fever', label: 'Yellow Fever' },
  { value: 'tt',       label: 'Tetanus Toxoid (TT)' },
  { value: 'other',    label: 'Other' },
];

function Toast({ toast }) {
  if (!toast) return null;
  return (
    <div style={{
      position: 'fixed', top: 20, right: 20, zIndex: 9999, padding: '12px 20px', borderRadius: 10,
      background: toast.type === 'error' ? '#fef2f2' : '#f0fdf4',
      border: `1px solid ${toast.type === 'error' ? '#fca5a5' : '#86efac'}`,
      color: toast.type === 'error' ? '#dc2626' : '#15803d', fontWeight: 700, fontSize: 14,
      boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
    }}>
      <i className={`fas ${toast.type === 'error' ? 'fa-times-circle' : 'fa-check-circle'}`} style={{ marginRight: 8 }}></i>
      {toast.msg}
    </div>
  );
}

const labelStyle = { fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 5 };
const inputStyle  = { width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, boxSizing: 'border-box', color: '#374151' };

function Field({ label, value, onChange, type = 'text', placeholder = '', full = false, rows }) {
  return (
    <div style={full ? { gridColumn: '1/-1' } : {}}>
      <label style={labelStyle}>{label}</label>
      {rows
        ? <textarea rows={rows} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
            style={{ ...inputStyle, resize: 'vertical' }} />
        : <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} style={inputStyle} />
      }
    </div>
  );
}

function CheckField({ label, checked, onChange }) {
  return (
    <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: '#475569',
      background: checked ? '#f0fdfa' : '#f8fafc', border: `1.5px solid ${checked ? '#99f6e4' : '#e2e8f0'}`,
      borderRadius: 8, padding: '9px 12px' }}>
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} style={{ width: 15, height: 15 }} />
      {label}
    </label>
  );
}

function ANCModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    patient_id: '', visit_date: new Date().toISOString().split('T')[0],
    gravida: 1, para: 0, lmp: '', edd: '', gestational_age_weeks: '',
    weight_kg: '', blood_pressure: '', fundal_height_cm: '', fetal_heart_rate: '',
    presentation: 'not_assessed', edema: false, hb_level: '',
    hiv_status: 'not_tested', syphilis_status: 'not_tested', malaria_test: 'not_tested',
    tt_vaccine_given: false, iron_folic_given: false, itn_given: false,
    sp_given: false, pmtct_counselled: false,
    counselling_notes: '', next_visit_date: '', risk_flags: '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.patient_id) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 680, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', maxHeight: '92vh', overflowY: 'auto' }}>
        <div style={{ padding: '20px 24px 14px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0f172a' }}>New ANC Visit</h3>
            <p style={{ margin: '3px 0 0', fontSize: 13, color: '#64748b' }}>Record antenatal care visit details</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#94a3b8' }}>×</button>
        </div>

        <div style={{ padding: '20px 24px' }}>
          <SectionTitle>Patient & Visit</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            <Field label="Patient ID *" value={form.patient_id} onChange={v => set('patient_id', v)} placeholder="Enter patient system ID" />
            <Field label="Visit Date" type="date" value={form.visit_date} onChange={v => set('visit_date', v)} />
            <Field label="Gravida" type="number" value={form.gravida} onChange={v => set('gravida', v)} />
            <Field label="Para" type="number" value={form.para} onChange={v => set('para', v)} />
            <Field label="LMP" type="date" value={form.lmp} onChange={v => set('lmp', v)} />
            <Field label="EDD" type="date" value={form.edd} onChange={v => set('edd', v)} />
            <Field label="Gestational Age (weeks)" type="number" value={form.gestational_age_weeks} onChange={v => set('gestational_age_weeks', v)} />
            <Field label="Next Visit Date" type="date" value={form.next_visit_date} onChange={v => set('next_visit_date', v)} />
          </div>

          <SectionTitle>Vitals & Examination</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
            <Field label="Weight (kg)" type="number" value={form.weight_kg} onChange={v => set('weight_kg', v)} placeholder="e.g. 65.5" />
            <Field label="Blood Pressure" value={form.blood_pressure} onChange={v => set('blood_pressure', v)} placeholder="e.g. 120/80" />
            <Field label="Fundal Height (cm)" type="number" value={form.fundal_height_cm} onChange={v => set('fundal_height_cm', v)} />
            <Field label="Fetal Heart Rate (bpm)" type="number" value={form.fetal_heart_rate} onChange={v => set('fetal_heart_rate', v)} placeholder="e.g. 140" />
            <Field label="Haemoglobin (g/dL)" type="number" value={form.hb_level} onChange={v => set('hb_level', v)} placeholder="e.g. 10.5" />
            <div>
              <label style={labelStyle}>Presentation</label>
              <select value={form.presentation} onChange={e => set('presentation', e.target.value)} style={inputStyle}>
                <option value="not_assessed">Not Assessed</option>
                <option value="cephalic">Cephalic</option>
                <option value="breech">Breech</option>
                <option value="transverse">Transverse</option>
              </select>
            </div>
          </div>

          <SectionTitle>Laboratory & Tests</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginBottom: 20 }}>
            {[
              { label: 'HIV Status', key: 'hiv_status' },
              { label: 'Syphilis', key: 'syphilis_status' },
              { label: 'Malaria Test', key: 'malaria_test' },
            ].map(({ label, key }) => (
              <div key={key}>
                <label style={labelStyle}>{label}</label>
                <select value={form[key]} onChange={e => set(key, e.target.value)} style={inputStyle}>
                  <option value="not_tested">Not Tested</option>
                  <option value="negative">Negative</option>
                  <option value="positive">Positive</option>
                </select>
              </div>
            ))}
          </div>

          <SectionTitle>Interventions Given</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginBottom: 20 }}>
            <CheckField label="TT Vaccine" checked={form.tt_vaccine_given} onChange={v => set('tt_vaccine_given', v)} />
            <CheckField label="Iron/Folic Acid" checked={form.iron_folic_given} onChange={v => set('iron_folic_given', v)} />
            <CheckField label="ITN (Bed Net)" checked={form.itn_given} onChange={v => set('itn_given', v)} />
            <CheckField label="SP (Malaria)" checked={form.sp_given} onChange={v => set('sp_given', v)} />
            <CheckField label="PMTCT Counselled" checked={form.pmtct_counselled} onChange={v => set('pmtct_counselled', v)} />
            <CheckField label="Oedema Present" checked={form.edema} onChange={v => set('edema', v)} />
          </div>

          <SectionTitle>Notes & Risk</SectionTitle>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Field label="Counselling Notes" value={form.counselling_notes} onChange={v => set('counselling_notes', v)} rows={3} placeholder="Education given, discussions…" />
            <Field label="Risk Flags" value={form.risk_flags} onChange={v => set('risk_flags', v)} rows={3} placeholder="e.g. Severe anaemia, Hypertension…" />
          </div>
        </div>

        <div style={{ padding: '12px 24px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 22px', borderRadius: 9, border: '1.5px solid #e2e8f0', background: '#fff', color: '#475569', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving || !form.patient_id} style={{
            padding: '10px 22px', borderRadius: 9, border: 'none',
            background: saving ? '#99f6e4' : `linear-gradient(135deg,${ACCENT},#0f766e)`,
            color: '#fff', fontWeight: 700, fontSize: 14, cursor: saving ? 'default' : 'pointer',
            boxShadow: '0 4px 12px rgba(13,148,136,0.3)',
          }}>
            {saving ? <><i className="fas fa-spinner fa-spin" style={{ marginRight: 6 }}></i>Saving…</> : 'Save ANC Visit'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ImmunizationModal({ onClose, onSave }) {
  const [form, setForm] = useState({
    patient_id: '', vaccine_name: 'bcg',
    date_given: new Date().toISOString().split('T')[0],
    status: 'given', batch_number: '', site: '', adverse_reaction: '',
    next_due_date: '', notes: '',
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.patient_id) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 520, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ padding: '20px 24px 14px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0f172a' }}>Record Immunization</h3>
            <p style={{ margin: '3px 0 0', fontSize: 13, color: '#64748b' }}>Add a vaccination record for a patient</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#94a3b8' }}>×</button>
        </div>
        <div style={{ padding: '18px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <Field label="Patient ID *" value={form.patient_id} onChange={v => set('patient_id', v)} placeholder="Enter patient system ID" />
          <div>
            <label style={labelStyle}>Vaccine</label>
            <select value={form.vaccine_name} onChange={e => set('vaccine_name', e.target.value)} style={inputStyle}>
              {VACCINES.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
            </select>
          </div>
          <Field label="Date Given" type="date" value={form.date_given} onChange={v => set('date_given', v)} />
          <div>
            <label style={labelStyle}>Status</label>
            <select value={form.status} onChange={e => set('status', e.target.value)} style={inputStyle}>
              <option value="given">Given</option>
              <option value="due">Due</option>
              <option value="overdue">Overdue</option>
              <option value="contraindicated">Contraindicated</option>
            </select>
          </div>
          <Field label="Batch Number" value={form.batch_number} onChange={v => set('batch_number', v)} placeholder="Optional" />
          <Field label="Injection Site" value={form.site} onChange={v => set('site', v)} placeholder="e.g. Left deltoid" />
          <Field label="Next Due Date" type="date" value={form.next_due_date} onChange={v => set('next_due_date', v)} />
          <Field label="Adverse Reaction" value={form.adverse_reaction} onChange={v => set('adverse_reaction', v)} placeholder="If any" />
          <Field label="Notes" value={form.notes} onChange={v => set('notes', v)} rows={3} full />
        </div>
        <div style={{ padding: '10px 24px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '10px 22px', borderRadius: 9, border: '1.5px solid #e2e8f0', background: '#fff', color: '#475569', fontWeight: 700, fontSize: 14, cursor: 'pointer' }}>Cancel</button>
          <button onClick={handleSave} disabled={saving || !form.patient_id} style={{
            padding: '10px 22px', borderRadius: 9, border: 'none',
            background: `linear-gradient(135deg,${ACCENT},#0f766e)`,
            color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(13,148,136,0.3)',
          }}>
            {saving ? <><i className="fas fa-spinner fa-spin" style={{ marginRight: 6 }}></i>Saving…</> : 'Save Record'}
          </button>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.9px',
      borderBottom: '1px solid #f1f5f9', paddingBottom: 6, marginBottom: 12 }}>
      {children}
    </div>
  );
}

function MCHDashboard() {
  const { apiCall } = useAuth();
  const [activeTab, setActiveTab]   = useState('dashboard'); // dashboard | anc | immunizations
  const [stats, setStats]           = useState({});
  const [ancVisits, setAncVisits]   = useState([]);
  const [immunizations, setImmunizations] = useState([]);
  const [recentAnc, setRecentAnc]   = useState([]);
  const [recentImm, setRecentImm]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [showANCModal, setShowANCModal]   = useState(false);
  const [showImmModal, setShowImmModal]   = useState(false);
  const [toast, setToast]           = useState(null);

  const showToast = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const r = await apiCall('/mch/dashboard/');
      if (r.ok) {
        const d = await r.json();
        setStats(d.stats || {});
        setRecentAnc(d.recent_anc || []);
        setRecentImm(d.recent_immunizations || []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [apiCall]);

  const fetchAnc = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (search) p.set('search', search);
      const r = await apiCall(`/mch/anc/?${p}`);
      if (r.ok) setAncVisits(await r.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [apiCall, search]);

  const fetchImm = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams();
      if (search) p.set('search', search);
      const r = await apiCall(`/mch/immunizations/?${p}`);
      if (r.ok) setImmunizations(await r.json());
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [apiCall, search]);

  useEffect(() => { fetchDashboard(); }, []);
  useEffect(() => {
    if (activeTab === 'anc') fetchAnc();
    else if (activeTab === 'immunizations') fetchImm();
  }, [activeTab]);

  const handleSearchSubmit = e => {
    e.preventDefault();
    if (activeTab === 'anc') fetchAnc();
    else fetchImm();
  };

  const handleSaveAnc = async (form) => {
    const r = await apiCall('/mch/anc/', { method: 'POST', body: JSON.stringify(form) });
    if (r.ok) {
      showToast('ANC visit recorded.'); setShowANCModal(false);
      if (activeTab === 'anc') fetchAnc(); else fetchDashboard();
    } else {
      const e = await r.json();
      showToast(e.error || 'Failed to save ANC visit.', 'error');
    }
  };

  const handleSaveImm = async (form) => {
    const r = await apiCall('/mch/immunizations/', { method: 'POST', body: JSON.stringify(form) });
    if (r.ok) {
      showToast('Immunization recorded.'); setShowImmModal(false);
      if (activeTab === 'immunizations') fetchImm(); else fetchDashboard();
    } else {
      const e = await r.json();
      showToast(e.error || 'Failed to save immunization.', 'error');
    }
  };

  const statCards = [
    { icon: 'fas fa-female',        label: 'Total ANC Visits',   value: stats.total_anc_visits    || 0, accent: ACCENT },
    { icon: 'fas fa-calendar-check',label: 'ANC This Month',     value: stats.anc_this_month      || 0, accent: '#7c3aed' },
    { icon: 'fas fa-exclamation-triangle', label: 'High Risk',   value: stats.anc_high_risk       || 0, accent: '#ef4444' },
    { icon: 'fas fa-virus',         label: 'HIV Positive Mothers',value: stats.hiv_positive_mothers|| 0, accent: '#dc2626' },
    { icon: 'fas fa-syringe',       label: 'Total Immunizations',value: stats.total_immunizations  || 0, accent: '#0891b2' },
    { icon: 'fas fa-calendar',      label: 'Immun. This Month',  value: stats.immunizations_this_month || 0, accent: '#f59e0b' },
  ];

  const tabs = [
    { key: 'dashboard',      label: 'Dashboard',      icon: 'fas fa-tachometer-alt' },
    { key: 'anc',            label: 'ANC Visits',     icon: 'fas fa-female' },
    { key: 'immunizations',  label: 'Immunizations',  icon: 'fas fa-syringe' },
  ];

  const hivBadge = s => {
    if (s === 'positive') return { bg: '#fee2e2', color: '#dc2626', label: 'Positive' };
    if (s === 'negative') return { bg: '#dcfce7', color: '#15803d', label: 'Negative' };
    return { bg: '#f1f5f9', color: '#64748b', label: 'Not Tested' };
  };
  const immStatusBadge = s => {
    if (s === 'given')             return { bg: '#dcfce7', color: '#15803d' };
    if (s === 'overdue')           return { bg: '#fee2e2', color: '#dc2626' };
    if (s === 'due')               return { bg: '#fef3c7', color: '#b45309' };
    if (s === 'contraindicated')   return { bg: '#f1f5f9', color: '#64748b' };
    return                                { bg: '#f1f5f9', color: '#64748b' };
  };

  const displayAnc = activeTab === 'dashboard' ? recentAnc : ancVisits;
  const displayImm = activeTab === 'dashboard' ? recentImm : immunizations;

  return (
    <DashboardLayout navItems={navItems} brandTitle="NEHR MCH" roleBadge="Nurse / Midwife">
      <Toast toast={toast} />

      <div style={{ padding: '28px 24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: 0 }}>Maternal &amp; Child Health</h1>
            <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 14 }}>ANC visits, immunizations, and MCH records</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setShowANCModal(true)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: `linear-gradient(135deg,${ACCENT},#0f766e)`,
              color: '#fff', border: 'none', borderRadius: 10,
              padding: '10px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(13,148,136,0.35)',
            }}>
              <i className="fas fa-plus" style={{ fontSize: 12 }}></i>ANC Visit
            </button>
            <button onClick={() => setShowImmModal(true)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'linear-gradient(135deg,#0891b2,#0e7490)',
              color: '#fff', border: 'none', borderRadius: 10,
              padding: '10px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer',
              boxShadow: '0 4px 14px rgba(8,145,178,0.35)',
            }}>
              <i className="fas fa-syringe" style={{ fontSize: 12 }}></i>Immunization
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, background: '#f1f5f9', borderRadius: 12, padding: 5, width: 'fit-content' }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} style={{
              padding: '8px 18px', borderRadius: 9, border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer',
              background: activeTab === t.key ? '#fff' : 'transparent',
              color: activeTab === t.key ? ACCENT : '#64748b',
              boxShadow: activeTab === t.key ? '0 1px 4px rgba(15,23,42,0.1)' : 'none',
            }}>
              <i className={t.icon} style={{ marginRight: 6 }}></i>{t.label}
            </button>
          ))}
        </div>

        {/* Stat Cards */}
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

        {/* Search bar (non-dashboard) */}
        {activeTab !== 'dashboard' && (
          <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 8, marginBottom: 16, maxWidth: 400 }}>
            <input value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search patient name or ID…"
              style={{ flex: 1, padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13 }} />
            <button type="submit" style={{ padding: '9px 16px', background: ACCENT, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Search</button>
          </form>
        )}

        {/* ANC Table */}
        {(activeTab === 'dashboard' || activeTab === 'anc') && (
          <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 8px rgba(15,23,42,0.06)', overflow: 'hidden', marginBottom: 24 }}>
            <div style={{ padding: '13px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                {activeTab === 'dashboard' ? 'Recent ANC Visits' : `ANC Visits (${ancVisits.length})`}
              </h3>
            </div>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '36px 0', color: '#64748b' }}>
                <i className="fas fa-spinner fa-spin" style={{ fontSize: 24, color: ACCENT, display: 'block', marginBottom: 10 }}></i>Loading…
              </div>
            ) : displayAnc.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 0', color: '#94a3b8' }}>
                <i className="fas fa-female" style={{ fontSize: 36, display: 'block', marginBottom: 10 }}></i>No ANC visits found
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 1fr',
                  padding: '10px 20px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                  {['Patient', 'Date', 'GA (wks)', 'BP', 'Hb', 'HIV', 'Risk'].map(h => (
                    <div key={h} style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.7px' }}>{h}</div>
                  ))}
                </div>
                {displayAnc.map((v, idx) => {
                  const hiv = hivBadge(v.hiv_status);
                  const hasRisk = v.risk_flags && v.risk_flags.trim();
                  return (
                    <div key={v.id || idx} style={{
                      display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 1fr',
                      padding: '12px 20px', alignItems: 'center',
                      borderBottom: idx < displayAnc.length - 1 ? '1px solid #f8fafc' : 'none',
                      background: hasRisk ? '#fffbeb' : 'transparent',
                    }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{v.patient?.full_name || '—'}</div>
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>{v.patient?.patient_id}</div>
                      </div>
                      <div style={{ fontSize: 13, color: '#64748b' }}>{new Date(v.visit_date).toLocaleDateString()}</div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>{v.gestational_age_weeks || '—'}</div>
                      <div style={{ fontSize: 13, color: '#374151' }}>{v.blood_pressure || '—'}</div>
                      <div style={{ fontSize: 13, color: v.hb_level && Number(v.hb_level) < 8 ? '#dc2626' : '#374151', fontWeight: v.hb_level && Number(v.hb_level) < 8 ? 700 : 400 }}>
                        {v.hb_level || '—'}
                      </div>
                      <div><span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: hiv.bg, color: hiv.color }}>{hiv.label}</span></div>
                      <div>
                        {hasRisk
                          ? <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: '#fef3c7', color: '#b45309' }}>High Risk</span>
                          : <span style={{ fontSize: 11, color: '#94a3b8' }}>—</span>
                        }
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}

        {/* Immunization Table */}
        {(activeTab === 'dashboard' || activeTab === 'immunizations') && (
          <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 8px rgba(15,23,42,0.06)', overflow: 'hidden' }}>
            <div style={{ padding: '13px 20px', borderBottom: '1px solid #f1f5f9' }}>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
                {activeTab === 'dashboard' ? 'Recent Immunizations' : `Immunizations (${immunizations.length})`}
              </h3>
            </div>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '36px 0', color: '#64748b' }}>
                <i className="fas fa-spinner fa-spin" style={{ fontSize: 24, color: ACCENT, display: 'block', marginBottom: 10 }}></i>Loading…
              </div>
            ) : displayImm.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '36px 0', color: '#94a3b8' }}>
                <i className="fas fa-syringe" style={{ fontSize: 36, display: 'block', marginBottom: 10 }}></i>No immunization records found
              </div>
            ) : (
              <>
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr',
                  padding: '10px 20px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                  {['Patient', 'Vaccine', 'Date Given', 'Status', 'Next Due'].map(h => (
                    <div key={h} style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.7px' }}>{h}</div>
                  ))}
                </div>
                {displayImm.map((r, idx) => {
                  const st = immStatusBadge(r.status);
                  return (
                    <div key={r.id || idx} style={{
                      display: 'grid', gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr',
                      padding: '12px 20px', alignItems: 'center',
                      borderBottom: idx < displayImm.length - 1 ? '1px solid #f8fafc' : 'none',
                    }}>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{r.patient?.full_name || '—'}</div>
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>{r.patient?.patient_id}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{r.vaccine_name_display}</div>
                        {r.adverse_reaction && <div style={{ fontSize: 11, color: '#dc2626' }}>⚠ Adverse reaction</div>}
                      </div>
                      <div style={{ fontSize: 13, color: '#64748b' }}>{new Date(r.date_given).toLocaleDateString()}</div>
                      <div><span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: st.bg, color: st.color }}>{r.status_display}</span></div>
                      <div style={{ fontSize: 12, color: '#64748b' }}>{r.next_due_date ? new Date(r.next_due_date).toLocaleDateString() : '—'}</div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        )}
      </div>

      {showANCModal && <ANCModal onClose={() => setShowANCModal(false)} onSave={handleSaveAnc} />}
      {showImmModal && <ImmunizationModal onClose={() => setShowImmModal(false)} onSave={handleSaveImm} />}
    </DashboardLayout>
  );
}

export default MCHDashboard;

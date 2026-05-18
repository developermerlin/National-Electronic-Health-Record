import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layout/DashboardLayout';
import { getNavForUser, getBrandForUser, getRoleBadge } from '../../utils/navItems';

const STATUS_META = {
  needs_triage: { label: 'Needs Triage',    color: '#e63946', bg: '#fff1f2', border: '#fecdd3', icon: 'fas fa-exclamation-triangle' },
  waiting:      { label: 'Waiting',          color: '#7c3aed', bg: '#fdf4ff', border: '#e9d5ff', icon: 'fas fa-hourglass-half' },
  in_progress:  { label: 'In Consultation',  color: '#0891b2', bg: '#f0f9ff', border: '#bae6fd', icon: 'fas fa-stethoscope' },
  completed:    { label: 'Completed Today',  color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', icon: 'fas fa-check-circle' },
  total_visits: { label: 'Total Visits',     color: '#4361ee', bg: '#eff6ff', border: '#bfdbfe', icon: 'fas fa-list-alt' },
  history:      { label: 'Triage History',   color: '#0f766e', bg: '#f0fdfa', border: '#99f6e4', icon: 'fas fa-history' },
};

const VISIT_STATUS_BADGE = {
  registered:   { label: 'Registered',    bg: '#e2e8f0', color: '#475569' },
  triaged:      { label: 'Triaged',       bg: '#fed7aa', color: '#9a3412' },
  waiting:      { label: 'Waiting',       bg: '#e9d5ff', color: '#6d28d9' },
  in_progress:  { label: 'In Progress',   bg: '#bae6fd', color: '#0369a1' },
  completed:    { label: 'Completed',     bg: '#bbf7d0', color: '#166534' },
  cancelled:    { label: 'Cancelled',     bg: '#fecdd3', color: '#9f1239' },
  referred_out: { label: 'Referred Out',  bg: '#fef9c3', color: '#854d0e' },
};

const VISIT_TYPES = [
  { value: 'outpatient',      label: 'Outpatient (OPD)' },
  { value: 'emergency',       label: 'Emergency' },
  { value: 'follow_up',       label: 'Follow-up' },
  { value: 'routine_checkup', label: 'Routine Check-up' },
  { value: 'inpatient',       label: 'Inpatient (IPD)' },
  { value: 'referral',        label: 'Referral' },
];

const EMPTY_FORM = {
  visit_type: 'outpatient',
  chief_complaint: '',
  doctor: '',
  department: '',
  blood_pressure_systolic: '',
  blood_pressure_diastolic: '',
  heart_rate: '',
  respiratory_rate: '',
  temperature_celsius: '',
  weight_kg: '',
  height_cm: '',
  oxygen_saturation: '',
  blood_glucose: '',
  notes: '',
};

export default function NurseDashboard() {
  const { apiCall, user } = useAuth();

  const [queueData,    setQueueData]    = useState(null);
  const [loading,      setLoading]      = useState(true);
  const [activeTab,    setActiveTab]    = useState('triage');
  const [visitFilter,  setVisitFilter]  = useState('all');
  const [searchTriage, setSearchTriage] = useState('');
  const [searchVisits, setSearchVisits] = useState('');

  // Triage modal
  const [triageTarget, setTriageTarget] = useState(null); // appointment object
  const [triageForm,   setTriageForm]   = useState(EMPTY_FORM);
  const [triageStep,   setTriageStep]   = useState(1);
  const [saving,       setSaving]       = useState(false);
  const [triageError,  setTriageError]  = useState('');
  const [triageSuccess,setTriageSuccess]= useState('');

  // Lookup data
  const [doctors,     setDoctors]     = useState([]);
  const [departments, setDepartments] = useState([]);

  const navItems  = getNavForUser(user);
  const brand     = getBrandForUser(user);
  const roleBadge = getRoleBadge(user);

  const [now] = useState(() => Date.now());
  const [lastUpdated, setLastUpdated] = useState(null);
  const [historyData, setHistoryData] = useState(null);
  const [historyPatient, setHistoryPatient] = useState(null); // clicked patient
  const [patientHistoryData, setPatientHistoryData] = useState(null);

  const fetchQueue = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res  = await apiCall('/visits/nurse_queue/');
      const data = await res.json();
      if (res.ok) { setQueueData(data); setLastUpdated(new Date()); }
    } catch { /* silent */ }
    if (!silent) setLoading(false);
  }, [apiCall]);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await apiCall('/visits/completed_history/');
      const data = await res.json();
      if (res.ok) setHistoryData(data);
    } catch { /* silent */ }
  }, [apiCall]);

  const fetchPatientHistory = useCallback(async (patientId) => {
    try {
      const res = await apiCall(`/visits/completed_history/?patient=${patientId}`);
      const data = await res.json();
      if (res.ok) setPatientHistoryData(data);
    } catch { /* silent */ }
  }, [apiCall]);

  const fetchLookups = useCallback(async () => {
    try {
      const [dRes, depRes] = await Promise.all([
        apiCall('/appointments/doctors/'),
        apiCall('/admin/departments/'),
      ]);
      if (dRes.ok) {
        const d = await dRes.json();
        setDoctors(d.doctors || []);
      }
      if (depRes.ok) {
        const d = await depRes.json();
        setDepartments(Array.isArray(d) ? d : (d.results || []));
      }
    } catch { /* silent */ }
  }, [apiCall]);

  useEffect(() => {
    fetchQueue();
    fetchLookups();
    fetchHistory();
  }, [fetchQueue, fetchLookups, fetchHistory]);

  // Auto-refresh every 30 s so doctor status changes (in_consultation / completed) appear automatically
  useEffect(() => {
    const interval = setInterval(() => fetchQueue(true), 30000);
    return () => clearInterval(interval);
  }, [fetchQueue]);

  // Lock body scroll when modal open
  useEffect(() => {
    document.body.style.overflow = triageTarget ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [triageTarget]);

  const openTriage = (appt) => {
    setTriageTarget(appt);
    setTriageForm({
      ...EMPTY_FORM,
      doctor:     appt.doctor?.id     || '',
      department: appt.department_id  || '',
    });
    setTriageStep(1);
    setTriageError('');
    setTriageSuccess('');
  };

  const closeTriage = () => {
    setTriageTarget(null);
    setTriageForm(EMPTY_FORM);
    setTriageStep(1);
    setTriageError('');
  };

  const setField = (f) => (e) => setTriageForm(p => ({ ...p, [f]: e.target.value }));

  const handleTriageSubmit = async () => {
    if (!triageForm.chief_complaint.trim()) {
      setTriageError('Chief complaint is required.');
      return;
    }
    setSaving(true);
    setTriageError('');
    try {
      const payload = {
        patient:    triageTarget.patient?.id,
        appointment: triageTarget.id,
        visit_type:  triageForm.visit_type,
        chief_complaint: triageForm.chief_complaint,
        doctor:      triageForm.doctor     || null,
        department:  triageForm.department || null,
      };
      // Add vitals (only non-empty)
      const VITALS = ['blood_pressure_systolic','blood_pressure_diastolic','heart_rate',
        'respiratory_rate','temperature_celsius','weight_kg','height_cm',
        'oxygen_saturation','blood_glucose','notes'];
      VITALS.forEach(k => { if (triageForm[k] !== '') payload[k] = triageForm[k]; });

      const res  = await apiCall('/visits/triage/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setTriageSuccess(`${triageTarget.patient?.full_name || 'Patient'} triaged successfully.`);
        setTimeout(() => { closeTriage(); fetchQueue(); }, 1500);
      } else {
        const msg = data.detail || data.chief_complaint?.[0] || JSON.stringify(data);
        setTriageError(msg);
      }
    } catch {
      setTriageError('Network error. Please try again.');
    }
    setSaving(false);
  };

  // Filtered lists
  const needsTriage = (queueData?.needs_triage || []).filter(a => {
    const name = a.patient?.full_name?.toLowerCase() || '';
    const id   = a.patient?.patient_id?.toLowerCase() || '';
    const q    = searchTriage.toLowerCase();
    return !q || name.includes(q) || id.includes(q);
  });

  const todayVisits = (queueData?.today_visits || []).filter(v => {
    const matchStatus = visitFilter === 'all' || v.status === visitFilter;
    const q = searchVisits.toLowerCase();
    const matchSearch = !q || (v.patient_name || '').toLowerCase().includes(q)
      || (v.patient_id_code || '').toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  const counts = queueData?.counts || {};

  const fmtTime     = (dt) => dt ? new Date(dt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }) : '—';
  const fmtDateTime = (dt) => dt ? new Date(dt).toLocaleString('en-US', { day:'2-digit', month:'short', year:'numeric', hour:'numeric', minute:'2-digit', hour12: true }) : '—';

  const initials = (name) => (name || '??').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const COLORS   = ['#4361ee','#7c3aed','#0891b2','#059669','#d97706','#e63946'];
  const colorFor = (id) => COLORS[(id || 0) % COLORS.length];

  return (
    <DashboardLayout navItems={navItems} brandTitle={brand} roleBadge={roleBadge}>

      {/* ── Page Header ── */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'28px', flexWrap:'wrap', gap:'12px' }}>
        <div>
          <h4 style={{ fontWeight:800, color:'#1a1a2e', margin:0 }}>
            <i className="fas fa-heartbeat me-2" style={{ color:'#e63946' }}></i>Nurse Dashboard
          </h4>
          <p style={{ color:'#6c757d', marginTop:'5px', fontSize:'14px', marginBottom:0 }}>
            {user?.full_name} &mdash; {queueData?.date ? new Date(queueData.date).toLocaleDateString('en-GB', { weekday:'long', day:'numeric', month:'long', year:'numeric' }) : 'Today'}
          </p>
        </div>
        <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
          {lastUpdated && (
            <span style={{ fontSize:'11px', color:'#94a3b8', marginRight:'4px' }}>
              <i className="fas fa-circle" style={{ color:'#16a34a', fontSize:'7px', verticalAlign:'middle', marginRight:'4px' }}></i>
              Updated {lastUpdated.toLocaleTimeString([], { hour:'2-digit', minute:'2-digit', second:'2-digit' })}
            </span>
          )}
          <button className="btn btn-outline-secondary btn-sm" style={{ borderRadius:'8px', fontWeight:600 }} onClick={() => fetchQueue()}>
            <i className="fas fa-sync-alt me-1"></i>Refresh
          </button>
          <Link to="/nurse/walkin" className="btn btn-primary btn-sm" style={{ borderRadius:'8px', fontWeight:700 }}>
            <i className="fas fa-walking me-2"></i>Walk-in Triage
          </Link>
        </div>
      </div>

      {/* ── Stat Cards ── */}
      <div className="row g-3 mb-4">
        {Object.entries(STATUS_META).map(([key, meta]) => (
          <div key={key} className="col-6 col-md-4 col-xl-2">
            <div className="dash-card" style={{ border:`1px solid ${meta.border}`, background: meta.bg, padding:'16px 18px', cursor: key !== 'total_visits' ? 'pointer' : 'default' }}
              onClick={() => { if (key === 'needs_triage') { setActiveTab('triage'); } else if (key === 'history') { setActiveTab('history'); } else if (key !== 'total_visits') { setActiveTab('visits'); setVisitFilter(key); } }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:'8px' }}>
                <div style={{ width:'36px', height:'36px', borderRadius:'10px', background: meta.color + '20', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <i className={meta.icon} style={{ color: meta.color, fontSize:'15px' }}></i>
                </div>
                <span style={{ fontSize:'24px', fontWeight:800, color: meta.color }}>
                  {loading ? '—' : (key === 'history' ? (historyData?.count ?? 0) : (counts[key] ?? 0))}
                </span>
              </div>
              <div style={{ fontSize:'11px', fontWeight:700, color: meta.color, textTransform:'uppercase', letterSpacing:'0.4px' }}>{meta.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div style={{ display:'flex', gap:'4px', marginBottom:'20px', padding:'4px', background:'#f1f5f9', borderRadius:'12px', width:'fit-content' }}>
        {[
          { key:'triage', icon:'fas fa-exclamation-triangle', label:'Needs Triage', count: counts.needs_triage },
          { key:'visits', icon:'fas fa-list-alt',             label:'Today\'s Visits', count: counts.total_visits },
          { key:'history', icon:'fas fa-history',             label:'Triage History', count: historyData?.count ?? 0 },
        ].map(tab => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)} type="button"
            style={{
              padding:'9px 20px', borderRadius:'9px', border:'none', cursor:'pointer',
              fontWeight: activeTab === tab.key ? 700 : 500, fontSize:'13px',
              background: activeTab === tab.key ? '#fff' : 'transparent',
              color: activeTab === tab.key ? '#4361ee' : '#64748b',
              boxShadow: activeTab === tab.key ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
              transition:'all 0.15s', display:'flex', alignItems:'center', gap:'7px',
            }}>
            <i className={tab.icon}></i>{tab.label}
            {tab.count > 0 && (
              <span style={{ background: activeTab === tab.key ? '#4361ee' : '#94a3b8', color:'#fff', borderRadius:'10px', padding:'1px 7px', fontSize:'11px', fontWeight:700 }}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div style={{ textAlign:'center', padding:'80px 0', color:'#6c757d' }}>
          <div className="spinner-border text-primary mb-3" style={{ width:'40px', height:'40px' }}></div>
          <div style={{ fontSize:'14px' }}>Loading queue data…</div>
        </div>
      ) : (
        <>
          {/* ══ TAB: TRIAGE HISTORY ══ */}
          {activeTab === 'history' && (
            <div className="dash-card">
              <div className="dash-card-header">
                <h6 style={{ margin:0 }}><i className="fas fa-history me-2" style={{ color:'#0f766e' }}></i>Triage History</h6>
                <span style={{ fontSize:'12px', color:'#6c757d' }}>{historyData?.count ?? 0} completed</span>
              </div>
              <div className="dash-card-body" style={{ padding:0 }}>
                {!historyData || historyData.visits.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'60px 20px', color:'#adb5bd' }}>
                    <i className="fas fa-clipboard-check" style={{ fontSize:'48px', display:'block', marginBottom:'12px', opacity:0.4 }}></i>
                    <div style={{ fontWeight:600, color:'#6c757d' }}>No completed triages yet</div>
                  </div>
                ) : (
                  <div style={{ overflowX:'auto' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
                      <thead>
                        <tr style={{ background:'#f8fafc' }}>
                          {['Patient','ID','Chief Complaint','Doctor','Vitals','Completed','View'].map(h => (
                            <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontWeight:700, color:'#475569', fontSize:'11px', textTransform:'uppercase', letterSpacing:'0.4px', whiteSpace:'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {historyData.visits.map((v) => (
                          <tr key={v.id} style={{ borderBottom:'1px solid #f1f5f9' }}>
                            <td style={{ padding:'12px 16px' }}>
                              <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                                <div style={{ width:'34px', height:'34px', borderRadius:'9px', background: colorFor(v.patient_pk), display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:'12px', flexShrink:0 }}>
                                  {initials(v.patient_name)}
                                </div>
                                <div>
                                  <div style={{ fontWeight:700, color:'#1a1a2e' }}>{v.patient_name || '—'}</div>
                                  <div style={{ fontSize:'11px', color:'#94a3b8' }}>{v.patient_gender}</div>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding:'12px 16px', color:'#6c757d' }}>{v.patient_id_code || '—'}</td>
                            <td style={{ padding:'12px 16px', color:'#475569', maxWidth:'200px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{v.chief_complaint || '—'}</td>
                            <td style={{ padding:'12px 16px', color:'#475569', whiteSpace:'nowrap' }}>{v.doctor_name || '—'}</td>
                            <td style={{ padding:'12px 16px' }}>
                              {v.vitals_summary ? (
                                <div style={{ fontSize:'11px', color:'#475569', lineHeight:'1.6' }}>
                                  {v.vitals_summary.bp && <div><span style={{ fontWeight:700 }}>BP:</span> {v.vitals_summary.bp}</div>}
                                  {v.vitals_summary.hr && <div><span style={{ fontWeight:700 }}>HR:</span> {v.vitals_summary.hr}</div>}
                                  {v.vitals_summary.temp && <div><span style={{ fontWeight:700 }}>T:</span> {v.vitals_summary.temp}°C</div>}
                                </div>
                              ) : <span style={{ fontSize:'11px', color:'#cbd5e1' }}>—</span>}
                            </td>
                            <td style={{ padding:'12px 16px', color:'#6c757d', whiteSpace:'nowrap' }}>{fmtDateTime(v.visit_date)}</td>
                            <td style={{ padding:'12px 16px' }}>
                              <button className="btn btn-sm btn-primary" onClick={(e) => { e.stopPropagation(); setHistoryPatient({ id: v.patient_pk, name: v.patient_name, gender: v.patient_gender, code: v.patient_id_code }); fetchPatientHistory(v.patient_pk); }} title="View patient triage history">
                                <i className="fas fa-eye"></i>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══ TAB: NEEDS TRIAGE ══ */}
          {activeTab === 'triage' && (
            <div className="dash-card">
              <div className="dash-card-header">
                <h6 style={{ margin:0 }}><i className="fas fa-exclamation-triangle me-2" style={{ color:'#e63946' }}></i>Patients Awaiting Triage</h6>
                <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                  <div style={{ position:'relative' }}>
                    <i className="fas fa-search" style={{ position:'absolute', left:'10px', top:'50%', transform:'translateY(-50%)', color:'#adb5bd', fontSize:'12px' }}></i>
                    <input className="form-control form-control-sm" placeholder="Search patient…" value={searchTriage}
                      onChange={e => setSearchTriage(e.target.value)} style={{ paddingLeft:'30px', width:'200px' }} />
                  </div>
                  <span style={{ fontSize:'12px', color:'#6c757d' }}>{needsTriage.length} patient{needsTriage.length !== 1 ? 's' : ''}</span>
                </div>
              </div>
              <div className="dash-card-body" style={{ padding:0 }}>
                {needsTriage.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'60px 20px', color:'#adb5bd' }}>
                    <i className="fas fa-check-circle" style={{ fontSize:'48px', display:'block', marginBottom:'12px', color:'#22c55e', opacity:0.7 }}></i>
                    <div style={{ fontWeight:600, color:'#6c757d', fontSize:'15px' }}>No patients waiting for triage</div>
                    <div style={{ fontSize:'13px', marginTop:'4px' }}>All checked-in patients have been triaged</div>
                  </div>
                ) : (
                  needsTriage.map((appt, idx) => {
                    const color = colorFor(appt.patient?.id);
                    const checkedInMins = appt.checked_in_at
                      ? Math.floor((now - new Date(appt.checked_in_at)) / 60000)
                      : null;
                    return (
                      <div key={appt.id} style={{
                        display:'flex', alignItems:'center', gap:'14px', padding:'14px 20px',
                        borderBottom: idx < needsTriage.length - 1 ? '1px solid #f1f5f9' : 'none',
                        transition:'background 0.12s',
                      }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f8faff'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                        {/* Avatar */}
                        <div style={{ width:'44px', height:'44px', borderRadius:'12px', background: color, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, color:'#fff', fontWeight:800, fontSize:'14px' }}>
                          {initials(appt.patient?.full_name)}
                        </div>
                        {/* Info */}
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontWeight:700, color:'#1a1a2e', fontSize:'14px' }}>{appt.patient?.full_name}</div>
                          <div style={{ fontSize:'12px', color:'#6c757d', marginTop:'2px', display:'flex', gap:'12px', flexWrap:'wrap' }}>
                            <span><i className="fas fa-id-badge me-1"></i>{appt.patient?.patient_id}</span>
                            <span><i className="fas fa-user-md me-1"></i>{appt.doctor?.full_name || 'No doctor'}</span>
                            <span><i className="fas fa-building me-1"></i>{appt.department || 'No dept'}</span>
                          </div>
                        </div>
                        {/* Wait time */}
                        {checkedInMins !== null && (
                          <div style={{
                            textAlign:'center', flexShrink:0,
                            background: checkedInMins > 30 ? '#fff1f2' : checkedInMins > 15 ? '#fff7ed' : '#f0fdf4',
                            border: `1px solid ${checkedInMins > 30 ? '#fecdd3' : checkedInMins > 15 ? '#fed7aa' : '#bbf7d0'}`,
                            borderRadius:'8px', padding:'6px 12px',
                          }}>
                            <div style={{ fontSize:'16px', fontWeight:800, color: checkedInMins > 30 ? '#e63946' : checkedInMins > 15 ? '#f97316' : '#16a34a' }}>
                              {checkedInMins}m
                            </div>
                            <div style={{ fontSize:'10px', color:'#6c757d', fontWeight:600 }}>waiting</div>
                          </div>
                        )}
                        {/* Checked-in time */}
                        <div style={{ textAlign:'right', flexShrink:0, fontSize:'12px', color:'#6c757d' }}>
                          <div style={{ fontWeight:600 }}>Checked in</div>
                          <div>{fmtTime(appt.checked_in_at)}</div>
                        </div>
                        {/* Actions */}
                        <button className="btn btn-sm btn-danger" onClick={() => openTriage(appt)} style={{ flexShrink:0 }}>
                          <i className="fas fa-heartbeat me-1"></i>Triage
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* ══ TAB: TODAY'S VISITS ══ */}
          {activeTab === 'visits' && (
            <div className="dash-card">
              <div className="dash-card-header">
                <h6 style={{ margin:0 }}><i className="fas fa-list-alt me-2" style={{ color:'#4361ee' }}></i>Today's Visit Queue</h6>
                <div style={{ display:'flex', gap:'8px', alignItems:'center', flexWrap:'wrap' }}>
                  <div style={{ position:'relative' }}>
                    <i className="fas fa-search" style={{ position:'absolute', left:'10px', top:'50%', transform:'translateY(-50%)', color:'#adb5bd', fontSize:'12px' }}></i>
                    <input className="form-control form-control-sm" placeholder="Search patient…" value={searchVisits}
                      onChange={e => setSearchVisits(e.target.value)} style={{ paddingLeft:'30px', width:'180px' }} />
                  </div>
                  <select className="form-select form-select-sm" style={{ width:'140px' }} value={visitFilter} onChange={e => setVisitFilter(e.target.value)}>
                    <option value="all">All Statuses</option>
                    <option value="registered">Registered</option>
                    <option value="triaged">Triaged</option>
                    <option value="waiting">Waiting</option>
                    <option value="in_progress">In Progress</option>
                    <option value="completed">Completed</option>
                  </select>
                </div>
              </div>
              <div className="dash-card-body" style={{ padding:0 }}>
                {todayVisits.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'60px 20px', color:'#adb5bd' }}>
                    <i className="fas fa-clipboard-list" style={{ fontSize:'48px', display:'block', marginBottom:'12px', opacity:0.4 }}></i>
                    <div style={{ fontWeight:600, color:'#6c757d' }}>No visits found</div>
                  </div>
                ) : (
                  <div style={{ overflowX:'auto' }}>
                    <table style={{ width:'100%', borderCollapse:'collapse', fontSize:'13px' }}>
                      <thead>
                        <tr style={{ background:'#f8fafc' }}>
                          {['Patient','ID','Visit Type','Chief Complaint','Doctor','Status','Vitals','Time'].map(h => (
                            <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontWeight:700, color:'#475569', fontSize:'11px', textTransform:'uppercase', letterSpacing:'0.4px', whiteSpace:'nowrap' }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {todayVisits.map((v) => {
                          const badge = VISIT_STATUS_BADGE[v.status] || { label: v.status, bg:'#e2e8f0', color:'#475569' };
                          return (
                            <tr key={v.id} style={{ borderBottom:'1px solid #f1f5f9', transition:'background 0.12s' }}
                              onMouseEnter={e => e.currentTarget.style.background = '#f8faff'}
                              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                              <td style={{ padding:'12px 16px' }}>
                                <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                                  <div style={{ width:'34px', height:'34px', borderRadius:'9px', background: colorFor(v.patient_pk), display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:'12px', flexShrink:0 }}>
                                    {initials(v.patient_name)}
                                  </div>
                                  <div>
                                    <div style={{ fontWeight:700, color:'#1a1a2e' }}>{v.patient_name || '—'}</div>
                                    <div style={{ fontSize:'11px', color:'#94a3b8' }}>{v.patient_gender}</div>
                                  </div>
                                </div>
                              </td>
                              <td style={{ padding:'12px 16px', color:'#6c757d' }}>{v.patient_id_code || '—'}</td>
                              <td style={{ padding:'12px 16px', color:'#475569', whiteSpace:'nowrap' }}>{v.visit_type_display}</td>
                              <td style={{ padding:'12px 16px', color:'#475569', maxWidth:'180px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{v.chief_complaint || '—'}</td>
                              <td style={{ padding:'12px 16px', color:'#475569', whiteSpace:'nowrap' }}>{v.doctor_name || '—'}</td>
                              <td style={{ padding:'12px 16px' }}>
                                <span style={{ background: badge.bg, color: badge.color, borderRadius:'6px', padding:'3px 10px', fontWeight:700, fontSize:'11px', whiteSpace:'nowrap' }}>
                                  {badge.label}
                                </span>
                              </td>
                              <td style={{ padding:'12px 16px' }}>
                                {v.vitals_summary ? (
                                  <div style={{ fontSize:'11px', color:'#475569', lineHeight:'1.6' }}>
                                    {v.vitals_summary.bp && <div><span style={{ fontWeight:700 }}>BP:</span> {v.vitals_summary.bp}</div>}
                                    {v.vitals_summary.hr && <div><span style={{ fontWeight:700 }}>HR:</span> {v.vitals_summary.hr}</div>}
                                    {v.vitals_summary.temp && <div><span style={{ fontWeight:700 }}>T:</span> {v.vitals_summary.temp}°C</div>}
                                  </div>
                                ) : <span style={{ fontSize:'11px', color:'#cbd5e1' }}>—</span>}
                              </td>
                              <td style={{ padding:'12px 16px', color:'#6c757d', whiteSpace:'nowrap' }}>{fmtTime(v.visit_date)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}

      {/* ═══════════════════════════════════════
          TRIAGE MODAL
      ═══════════════════════════════════════ */}
      {/* ═══════════════════════════════════════
          PATIENT HISTORY MODAL
      ═══════════════════════════════════════ */}
      {historyPatient && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}>
          <div style={{ background:'#fff', borderRadius:'18px', width:'100%', maxWidth:'960px', maxHeight:'95vh', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,0.25)' }}>
            {/* Modal Header */}
            <div style={{ background:'linear-gradient(135deg,#0f766e,#115e59)', padding:'24px 32px', borderRadius:'18px 18px 0 0', display:'flex', alignItems:'center', gap:'16px' }}>
              <div style={{ width:'52px', height:'52px', borderRadius:'14px', background:'rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <i className="fas fa-user-injured" style={{ color:'#fff', fontSize:'22px' }}></i>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ color:'rgba(255,255,255,0.8)', fontSize:'12px', textTransform:'uppercase', letterSpacing:'0.5px' }}>Triage History</div>
                <div style={{ color:'#fff', fontWeight:800, fontSize:'19px' }}>{historyPatient.name}</div>
                <div style={{ color:'rgba(255,255,255,0.75)', fontSize:'13px' }}>{historyPatient.code} &middot; {historyPatient.gender}</div>
              </div>
              <button onClick={() => { setHistoryPatient(null); setPatientHistoryData(null); }} className="btn btn-sm" style={{ background:'rgba(255,255,255,0.2)', color:'#fff', border:'1px solid rgba(255,255,255,0.3)', width:'32px', height:'32px', padding:0 }}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ padding:'20px 24px', overflowY:'auto' }}>
              {!patientHistoryData ? (
                <div style={{ textAlign:'center', padding:'40px' }}>
                  <div className="spinner-border text-primary" style={{ width:'28px', height:'28px' }}></div>
                  <div style={{ fontSize:'13px', color:'#6c757d', marginTop:'12px' }}>Loading patient history…</div>
                </div>
              ) : patientHistoryData.visits.length === 0 ? (
                <div style={{ textAlign:'center', padding:'40px', color:'#adb5bd' }}>
                  <i className="fas fa-clipboard-check" style={{ fontSize:'36px', display:'block', marginBottom:'10px', opacity:0.4 }}></i>
                  <div style={{ fontWeight:600, color:'#6c757d' }}>No completed triages for this patient</div>
                </div>
              ) : (
                <div style={{ display:'flex', flexDirection:'column', gap:'16px' }}>
                  {patientHistoryData.visits.map((v) => {
                    const vitals = v.vitals;
                    const note   = v.clinical_note;
                    return (
                      <div key={v.id} style={{ border:'1px solid #e2e8f0', borderRadius:'14px', overflow:'hidden', background:'#fff' }}>
                        {/* Visit header */}
                        <div style={{ background:'#f8fafc', padding:'14px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:'8px' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:'10px' }}>
                            <i className="fas fa-calendar-check" style={{ color:'#0f766e', fontSize:'16px' }}></i>
                            <span style={{ fontWeight:700, color:'#1a1a2e', fontSize:'14px' }}>{fmtDateTime(v.visit_date)}</span>
                            <span style={{ background:'#bbf7d0', color:'#166534', borderRadius:'6px', padding:'2px 10px', fontSize:'11px', fontWeight:700 }}>{v.status_display || v.status}</span>
                          </div>
                          <span style={{ fontSize:'12px', color:'#94a3b8' }}>{v.visit_type_display || v.visit_type}</span>
                        </div>

                        <div style={{ padding:'18px 20px', display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(280px, 1fr))', gap:'20px' }}>
                          {/* Visit Information */}
                          <div>
                            <div style={{ fontSize:'11px', fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'10px' }}>
                              <i className="fas fa-info-circle me-1" style={{ color:'#4361ee' }}></i>Visit Information
                            </div>
                            <div style={{ display:'flex', flexDirection:'column', gap:'8px', fontSize:'13px' }}>
                              <div style={{ display:'flex', justifyContent:'space-between' }}>
                                <span style={{ color:'#94a3b8' }}>Chief Complaint</span>
                                <span style={{ color:'#1a1a2e', fontWeight:600, maxWidth:'200px', textAlign:'right' }}>{v.chief_complaint || '—'}</span>
                              </div>
                              <div style={{ display:'flex', justifyContent:'space-between' }}>
                                <span style={{ color:'#94a3b8' }}>Doctor</span>
                                <span style={{ color:'#1a1a2e', fontWeight:600 }}>{v.doctor_name || '—'}</span>
                              </div>
                              <div style={{ display:'flex', justifyContent:'space-between' }}>
                                <span style={{ color:'#94a3b8' }}>Department</span>
                                <span style={{ color:'#1a1a2e', fontWeight:600 }}>{v.department_name || '—'}</span>
                              </div>
                              <div style={{ display:'flex', justifyContent:'space-between' }}>
                                <span style={{ color:'#94a3b8' }}>Registered By</span>
                                <span style={{ color:'#1a1a2e', fontWeight:600 }}>{v.registered_by_name || '—'}</span>
                              </div>
                              <div style={{ display:'flex', justifyContent:'space-between' }}>
                                <span style={{ color:'#94a3b8' }}>Hospital</span>
                                <span style={{ color:'#1a1a2e', fontWeight:600 }}>{v.hospital_name || '—'}</span>
                              </div>
                              {v.discharge_date && (
                                <div style={{ display:'flex', justifyContent:'space-between' }}>
                                  <span style={{ color:'#94a3b8' }}>Discharged</span>
                                  <span style={{ color:'#1a1a2e', fontWeight:600 }}>{fmtDateTime(v.discharge_date)}</span>
                                </div>
                              )}
                              {v.referred_to_doctor && (
                                <div style={{ display:'flex', justifyContent:'space-between' }}>
                                  <span style={{ color:'#94a3b8' }}>Referred To</span>
                                  <span style={{ color:'#1a1a2e', fontWeight:600 }}>{v.referred_to_doctor}</span>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Vital Signs */}
                          <div>
                            <div style={{ fontSize:'11px', fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'10px' }}>
                              <i className="fas fa-heartbeat me-1" style={{ color:'#e63946' }}></i>Vital Signs
                            </div>
                            {vitals ? (
                              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'8px', fontSize:'13px' }}>
                                {vitals.blood_pressure && <div style={{ background:'#f0fdf4', borderRadius:'8px', padding:'8px 12px' }}><div style={{ fontSize:'10px', color:'#6c757d' }}>Blood Pressure</div><div style={{ fontWeight:700, color:'#166534' }}>{vitals.blood_pressure}</div></div>}
                                {vitals.heart_rate && <div style={{ background:'#f0f9ff', borderRadius:'8px', padding:'8px 12px' }}><div style={{ fontSize:'10px', color:'#6c757d' }}>Heart Rate</div><div style={{ fontWeight:700, color:'#0369a1' }}>{vitals.heart_rate} bpm</div></div>}
                                {vitals.respiratory_rate && <div style={{ background:'#fdf4ff', borderRadius:'8px', padding:'8px 12px' }}><div style={{ fontSize:'10px', color:'#6c757d' }}>Resp. Rate</div><div style={{ fontWeight:700, color:'#6d28d9' }}>{vitals.respiratory_rate} /min</div></div>}
                                {vitals.temperature_celsius && <div style={{ background:'#fff7ed', borderRadius:'8px', padding:'8px 12px' }}><div style={{ fontSize:'10px', color:'#6c757d' }}>Temperature</div><div style={{ fontWeight:700, color:'#9a3412' }}>{vitals.temperature_celsius}°C</div></div>}
                                {vitals.weight_kg && <div style={{ background:'#eff6ff', borderRadius:'8px', padding:'8px 12px' }}><div style={{ fontSize:'10px', color:'#6c757d' }}>Weight</div><div style={{ fontWeight:700, color:'#1d4ed8' }}>{vitals.weight_kg} kg</div></div>}
                                {vitals.height_cm && <div style={{ background:'#f0fdfa', borderRadius:'8px', padding:'8px 12px' }}><div style={{ fontSize:'10px', color:'#6c757d' }}>Height</div><div style={{ fontWeight:700, color:'#0f766e' }}>{vitals.height_cm} cm</div></div>}
                                {vitals.bmi && <div style={{ background:'#fefce8', borderRadius:'8px', padding:'8px 12px' }}><div style={{ fontSize:'10px', color:'#6c757d' }}>BMI</div><div style={{ fontWeight:700, color:'#854d0e' }}>{parseFloat(vitals.bmi).toFixed(1)}</div></div>}
                                {vitals.oxygen_saturation && <div style={{ background:'#fff1f2', borderRadius:'8px', padding:'8px 12px' }}><div style={{ fontSize:'10px', color:'#6c757d' }}>SpO₂</div><div style={{ fontWeight:700, color:'#9f1239' }}>{vitals.oxygen_saturation}%</div></div>}
                                {vitals.blood_glucose && <div style={{ background:'#f5f3ff', borderRadius:'8px', padding:'8px 12px' }}><div style={{ fontSize:'10px', color:'#6c757d' }}>Blood Glucose</div><div style={{ fontWeight:700, color:'#5b21b6' }}>{vitals.blood_glucose} mmol/L</div></div>}
                              </div>
                            ) : (
                              <div style={{ fontSize:'13px', color:'#94a3b8', fontStyle:'italic' }}>No vitals recorded</div>
                            )}
                            {vitals?.notes && (
                              <div style={{ marginTop:'10px', background:'#f8fafc', borderRadius:'8px', padding:'10px 12px', fontSize:'12px', color:'#475569' }}>
                                <span style={{ fontWeight:700, color:'#64748b' }}>Nurse Notes:</span> {vitals.notes}
                              </div>
                            )}
                            {vitals?.recorded_by_name && (
                              <div style={{ marginTop:'6px', fontSize:'11px', color:'#94a3b8' }}>
                                Recorded by {vitals.recorded_by_name} {vitals.recorded_at && 'at ' + fmtDateTime(vitals.recorded_at)}
                              </div>
                            )}
                          </div>

                          {/* Clinical Note */}
                          {note && (
                            <div>
                              <div style={{ fontSize:'11px', fontWeight:700, color:'#64748b', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'10px' }}>
                                <i className="fas fa-file-medical me-1" style={{ color:'#7c3aed' }}></i>Clinical Note
                              </div>
                              <div style={{ display:'flex', flexDirection:'column', gap:'8px', fontSize:'13px' }}>
                                {note.diagnosis && (
                                  <div style={{ background:'#fdf4ff', borderRadius:'8px', padding:'10px 12px' }}>
                                    <div style={{ fontSize:'10px', color:'#7c3aed', fontWeight:700, marginBottom:'4px' }}>DIAGNOSIS</div>
                                    <div style={{ color:'#1a1a2e' }}>{note.diagnosis}</div>
                                  </div>
                                )}
                                {note.notes && (
                                  <div style={{ background:'#f8fafc', borderRadius:'8px', padding:'10px 12px' }}>
                                    <div style={{ fontSize:'10px', color:'#64748b', fontWeight:700, marginBottom:'4px' }}>NOTES</div>
                                    <div style={{ color:'#475569' }}>{note.notes}</div>
                                  </div>
                                )}
                                {note.prescription && (
                                  <div style={{ background:'#f0fdf4', borderRadius:'8px', padding:'10px 12px' }}>
                                    <div style={{ fontSize:'10px', color:'#166534', fontWeight:700, marginBottom:'4px' }}>PRESCRIPTION</div>
                                    <div style={{ color:'#475569' }}>{note.prescription}</div>
                                  </div>
                                )}
                                {note.treatment_plan && (
                                  <div style={{ background:'#eff6ff', borderRadius:'8px', padding:'10px 12px' }}>
                                    <div style={{ fontSize:'10px', color:'#1d4ed8', fontWeight:700, marginBottom:'4px' }}>TREATMENT PLAN</div>
                                    <div style={{ color:'#475569' }}>{note.treatment_plan}</div>
                                  </div>
                                )}
                                {note.follow_up_date && (
                                  <div style={{ display:'flex', justifyContent:'space-between', background:'#fff7ed', borderRadius:'8px', padding:'8px 12px' }}>
                                    <span style={{ color:'#94a3b8', fontSize:'12px' }}>Follow-up</span>
                                    <span style={{ color:'#1a1a2e', fontWeight:600 }}>{fmtDateTime(note.follow_up_date)}</span>
                                  </div>
                                )}
                                {note.doctor_name && (
                                  <div style={{ fontSize:'11px', color:'#94a3b8', marginTop:'4px' }}>
                                    Noted by Dr. {note.doctor_name}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════
          TRIAGE MODAL
      ═══════════════════════════════════════ */}
      {triageTarget && (
        <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:2000, display:'flex', alignItems:'center', justifyContent:'center', padding:'16px' }}>
          <div style={{ background:'#fff', borderRadius:'18px', width:'100%', maxWidth:'680px', maxHeight:'90vh', display:'flex', flexDirection:'column', boxShadow:'0 20px 60px rgba(0,0,0,0.25)' }}>

            {/* Modal Header */}
            <div style={{ background:'linear-gradient(135deg,#e63946,#c1121f)', padding:'20px 24px', borderRadius:'18px 18px 0 0', display:'flex', alignItems:'center', gap:'14px' }}>
              <div style={{ width:'46px', height:'46px', borderRadius:'12px', background:'rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                <i className="fas fa-heartbeat" style={{ color:'#fff', fontSize:'20px' }}></i>
              </div>
              <div style={{ flex:1 }}>
                <div style={{ color:'rgba(255,255,255,0.8)', fontSize:'11px', textTransform:'uppercase', letterSpacing:'0.5px' }}>Triaging Patient</div>
                <div style={{ color:'#fff', fontWeight:800, fontSize:'17px' }}>{triageTarget.patient?.full_name}</div>
                <div style={{ color:'rgba(255,255,255,0.75)', fontSize:'12px' }}>{triageTarget.patient?.patient_id}</div>
              </div>
              {/* Step indicator */}
              <div style={{ display:'flex', gap:'6px' }}>
                {[1, 2].map(n => (
                  <div key={n} style={{
                    width:'32px', height:'32px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
                    background: triageStep === n ? '#fff' : triageStep > n ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.2)',
                    color: triageStep === n ? '#e63946' : '#fff', fontWeight:700, fontSize:'13px',
                  }}>
                    {triageStep > n ? <i className="fas fa-check" style={{ fontSize:'11px' }}></i> : n}
                  </div>
                ))}
              </div>
              <button onClick={closeTriage} className="btn btn-sm" style={{ background:'rgba(255,255,255,0.2)', color:'#fff', border:'1px solid rgba(255,255,255,0.3)', width:'32px', height:'32px', padding:0 }}>
                <i className="fas fa-times"></i>
              </button>
            </div>

            {/* Modal Body */}
            <div style={{ overflowY:'auto', padding:'24px', flex:1 }}>

              {triageSuccess ? (
                <div style={{ textAlign:'center', padding:'40px 20px' }}>
                  <div style={{ width:'70px', height:'70px', borderRadius:'50%', background:'linear-gradient(135deg,#22c55e,#16a34a)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
                    <i className="fas fa-check" style={{ color:'#fff', fontSize:'28px' }}></i>
                  </div>
                  <div style={{ fontWeight:700, fontSize:'16px', color:'#166534' }}>{triageSuccess}</div>
                  <div style={{ fontSize:'13px', color:'#6c757d', marginTop:'6px' }}>Patient has been triaged and is ready for the doctor.</div>
                </div>
              ) : (
                <>
                  {triageError && (
                    <div className="alert alert-danger d-flex align-items-center gap-2 mb-4" style={{ borderRadius:'10px', fontSize:'13px' }}>
                      <i className="fas fa-exclamation-circle"></i>{triageError}
                    </div>
                  )}

                  {/* STEP 1: Visit Details */}
                  {triageStep === 1 && (
                    <>
                      <h6 style={{ fontWeight:700, color:'#1a1a2e', marginBottom:'18px' }}>
                        <i className="fas fa-clipboard me-2" style={{ color:'#e63946' }}></i>Step 1 — Visit Information
                      </h6>

                      <div className="row g-3">
                        <div className="col-md-6">
                          <label className="form-label">Visit Type <span className="text-danger">*</span></label>
                          <select className="form-select" value={triageForm.visit_type} onChange={setField('visit_type')}>
                            {VISIT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                          </select>
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Assigned Doctor</label>
                          <select className="form-select" value={triageForm.doctor} onChange={setField('doctor')}>
                            <option value="">— Keep current ({triageTarget.doctor?.full_name || 'None'}) —</option>
                            {doctors.map(d => <option key={d.id} value={d.id}>Dr. {d.full_name} ({d.department || 'General'})</option>)}
                          </select>
                        </div>
                        <div className="col-md-6">
                          <label className="form-label">Department</label>
                          <select className="form-select" value={triageForm.department} onChange={setField('department')}>
                            <option value="">— Select department —</option>
                            {departments.map(d => <option key={d.id} value={d.id}>{d.name_display || d.name}</option>)}
                          </select>
                        </div>
                        <div className="col-12">
                          <label className="form-label">Chief Complaint <span className="text-danger">*</span></label>
                          <textarea className="form-control" rows={3}
                            placeholder="Describe the patient's primary reason for this visit…"
                            value={triageForm.chief_complaint} onChange={setField('chief_complaint')} />
                        </div>
                      </div>
                    </>
                  )}

                  {/* STEP 2: Vital Signs */}
                  {triageStep === 2 && (
                    <>
                      <h6 style={{ fontWeight:700, color:'#1a1a2e', marginBottom:'18px' }}>
                        <i className="fas fa-heartbeat me-2" style={{ color:'#e63946' }}></i>Step 2 — Vital Signs <span style={{ fontSize:'12px', fontWeight:400, color:'#6c757d' }}>(all optional)</span>
                      </h6>

                      <div className="row g-3">
                        <div className="col-md-3">
                          <label className="form-label" style={{ fontSize:'12px' }}>BP Systolic (mmHg)</label>
                          <input type="number" className="form-control" placeholder="120" value={triageForm.blood_pressure_systolic} onChange={setField('blood_pressure_systolic')} />
                        </div>
                        <div className="col-md-3">
                          <label className="form-label" style={{ fontSize:'12px' }}>BP Diastolic (mmHg)</label>
                          <input type="number" className="form-control" placeholder="80" value={triageForm.blood_pressure_diastolic} onChange={setField('blood_pressure_diastolic')} />
                        </div>
                        <div className="col-md-3">
                          <label className="form-label" style={{ fontSize:'12px' }}>Heart Rate (bpm)</label>
                          <input type="number" className="form-control" placeholder="72" value={triageForm.heart_rate} onChange={setField('heart_rate')} />
                        </div>
                        <div className="col-md-3">
                          <label className="form-label" style={{ fontSize:'12px' }}>Resp. Rate (/min)</label>
                          <input type="number" className="form-control" placeholder="16" value={triageForm.respiratory_rate} onChange={setField('respiratory_rate')} />
                        </div>
                        <div className="col-md-3">
                          <label className="form-label" style={{ fontSize:'12px' }}>Temperature (°C)</label>
                          <input type="number" step="0.1" className="form-control" placeholder="37.0" value={triageForm.temperature_celsius} onChange={setField('temperature_celsius')} />
                        </div>
                        <div className="col-md-3">
                          <label className="form-label" style={{ fontSize:'12px' }}>Weight (kg)</label>
                          <input type="number" step="0.1" className="form-control" placeholder="70.0" value={triageForm.weight_kg} onChange={setField('weight_kg')} />
                        </div>
                        <div className="col-md-3">
                          <label className="form-label" style={{ fontSize:'12px' }}>Height (cm)</label>
                          <input type="number" step="0.1" className="form-control" placeholder="170.0" value={triageForm.height_cm} onChange={setField('height_cm')} />
                        </div>
                        <div className="col-md-3">
                          <label className="form-label" style={{ fontSize:'12px' }}>O₂ Saturation (%)</label>
                          <input type="number" step="0.1" className="form-control" placeholder="98" value={triageForm.oxygen_saturation} onChange={setField('oxygen_saturation')} />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label" style={{ fontSize:'12px' }}>Blood Glucose (mmol/L)</label>
                          <input type="number" step="0.1" className="form-control" placeholder="5.6" value={triageForm.blood_glucose} onChange={setField('blood_glucose')} />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label" style={{ fontSize:'12px' }}>Nurse Notes</label>
                          <textarea className="form-control" rows={2} placeholder="Any additional observations…" value={triageForm.notes} onChange={setField('notes')} />
                        </div>
                      </div>

                      {/* Quick Vitals Review */}
                      {(triageForm.blood_pressure_systolic || triageForm.heart_rate || triageForm.temperature_celsius) && (
                        <div style={{ marginTop:'16px', background:'#f8fafc', borderRadius:'10px', padding:'12px 16px' }}>
                          <div style={{ fontSize:'11px', fontWeight:700, color:'#4361ee', textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:'8px' }}>
                            <i className="fas fa-chart-line me-1"></i>Vitals Preview
                          </div>
                          <div style={{ display:'flex', gap:'20px', flexWrap:'wrap', fontSize:'13px', color:'#475569' }}>
                            {triageForm.blood_pressure_systolic && triageForm.blood_pressure_diastolic && (
                              <span><strong>BP:</strong> {triageForm.blood_pressure_systolic}/{triageForm.blood_pressure_diastolic} mmHg</span>
                            )}
                            {triageForm.heart_rate && <span><strong>HR:</strong> {triageForm.heart_rate} bpm</span>}
                            {triageForm.temperature_celsius && <span><strong>Temp:</strong> {triageForm.temperature_celsius}°C</span>}
                            {triageForm.oxygen_saturation && <span><strong>SpO₂:</strong> {triageForm.oxygen_saturation}%</span>}
                            {triageForm.weight_kg && triageForm.height_cm && (
                              <span><strong>BMI:</strong> {(parseFloat(triageForm.weight_kg) / ((parseFloat(triageForm.height_cm) / 100) ** 2)).toFixed(1)}</span>
                            )}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
            </div>

            {/* Modal Footer */}
            {!triageSuccess && (
              <div style={{ padding:'16px 24px', borderTop:'1px solid #f1f5f9', display:'flex', gap:'10px', justifyContent:'flex-end' }}>
                {triageStep === 1 ? (
                  <>
                    <button onClick={closeTriage} className="btn btn-outline-secondary" style={{ borderRadius:'9px', fontWeight:600 }}>Cancel</button>
                    <button onClick={() => {
                      if (!triageForm.chief_complaint.trim()) { setTriageError('Chief complaint is required.'); return; }
                      setTriageError(''); setTriageStep(2);
                    }} className="btn btn-primary">
                      Next: Record Vitals <i className="fas fa-arrow-right ms-2"></i>
                    </button>
                  </>
                ) : (
                  <>
                    <button onClick={() => setTriageStep(1)} className="btn btn-outline-secondary">
                      <i className="fas fa-arrow-left me-1"></i>Back
                    </button>
                    <button onClick={handleTriageSubmit} disabled={saving} className="btn btn-danger">
                      {saving
                        ? <><span className="spinner-border spinner-border-sm me-2"></span>Saving…</>
                        : <><i className="fas fa-check-circle me-2"></i>Complete Triage</>}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}

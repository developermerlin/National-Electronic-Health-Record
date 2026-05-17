import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layout/DashboardLayout';
import { getNavForUser, getBrandForUser, getRoleBadge } from '../../utils/navItems';

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

export default function NurseTriage() {
  const { apiCall, user } = useAuth();

  const [step,         setStep]         = useState(1);   // 1=search, 2=form-step1, 3=form-step2, 4=success
  const [query,        setQuery]        = useState('');
  const [searching,    setSearching]    = useState(false);
  const [results,      setResults]      = useState([]);
  const [selected,     setSelected]     = useState(null);

  const [form,         setForm]         = useState(EMPTY_FORM);
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState('');
  const [successData,  setSuccessData]  = useState(null);

  const [doctors,      setDoctors]      = useState([]);
  const [departments,  setDepartments]  = useState([]);
  const [now]          = useState(() => Date.now());

  // Quick-register state
  const [showQuickReg,  setShowQuickReg]  = useState(false);
  const [regForm,       setRegForm]       = useState({ first_name:'', last_name:'', date_of_birth:'', gender:'', phone:'' });
  const [regSaving,     setRegSaving]     = useState(false);
  const [regError,      setRegError]      = useState('');

  const setRegField = (f) => (e) => setRegForm(p => ({ ...p, [f]: e.target.value }));

  const handleQuickRegister = async () => {
    if (!regForm.first_name.trim() || !regForm.last_name.trim()) {
      setRegError('First name and last name are required.');
      return;
    }
    if (!regForm.date_of_birth) { setRegError('Date of birth is required.'); return; }
    if (!regForm.gender)        { setRegError('Gender is required.'); return; }
    if (!regForm.phone.trim())  { setRegError('Phone number is required.'); return; }
    setRegSaving(true);
    setRegError('');
    try {
      const res  = await apiCall('/patients/', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(regForm),
      });
      const data = await res.json();
      if (res.ok) {
        setShowQuickReg(false);
        setRegForm({ first_name:'', last_name:'', date_of_birth:'', gender:'', phone:'' });
        selectPatient(data.patient);
      } else {
        setRegError(
          data.error || data.first_name?.[0] || data.phone?.[0] || JSON.stringify(data)
        );
      }
    } catch {
      setRegError('Network error. Please try again.');
    }
    setRegSaving(false);
  };

  const searchRef = useRef(null);
  const debounceRef = useRef(null);

  const navItems  = getNavForUser(user);
  const brand     = getBrandForUser(user);
  const roleBadge = getRoleBadge(user);

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

  useEffect(() => { fetchLookups(); }, [fetchLookups]);

  const searchPatients = useCallback(async (q) => {
    if (!q.trim() || q.length < 2) { setResults([]); return; }
    setSearching(true);
    try {
      const res  = await apiCall(`/patients/?search=${encodeURIComponent(q)}&page_size=10`);
      const data = await res.json();
      setResults(data.results || data || []);
    } catch { setResults([]); }
    setSearching(false);
  }, [apiCall]);

  const handleQueryChange = (e) => {
    const val = e.target.value;
    setQuery(val);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchPatients(val), 400);
  };

  const selectPatient = (patient) => {
    setSelected(patient);
    setResults([]);
    setQuery('');
    setForm(EMPTY_FORM);
    setError('');
    setStep(2);
  };

  const setField = (f) => (e) => setForm(p => ({ ...p, [f]: e.target.value }));

  const handleSubmit = async () => {
    if (!form.chief_complaint.trim()) {
      setError('Chief complaint is required.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const payload = {
        patient:    selected.id,
        visit_type: form.visit_type,
        chief_complaint: form.chief_complaint,
        doctor:     form.doctor     || null,
        department: form.department || null,
      };
      const VITALS = ['blood_pressure_systolic','blood_pressure_diastolic','heart_rate',
        'respiratory_rate','temperature_celsius','weight_kg','height_cm',
        'oxygen_saturation','blood_glucose','notes'];
      VITALS.forEach(k => { if (form[k] !== '') payload[k] = form[k]; });

      const res  = await apiCall('/visits/triage/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccessData(data);
        setStep(4);
      } else {
        setError(data.detail || data.chief_complaint?.[0] || data.patient?.[0] || JSON.stringify(data));
      }
    } catch {
      setError('Network error. Please try again.');
    }
    setSaving(false);
  };

  const startNew = () => {
    setStep(1);
    setSelected(null);
    setQuery('');
    setResults([]);
    setForm(EMPTY_FORM);
    setError('');
    setSuccessData(null);
    setTimeout(() => searchRef.current?.focus(), 100);
  };

  const COLORS = ['#4361ee','#7c3aed','#0891b2','#059669','#d97706','#e63946'];
  const colorFor = (id) => COLORS[(id || 0) % COLORS.length];
  const initials = (name) => (name || '??').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const calcBMI = () => {
    if (!form.weight_kg || !form.height_cm) return null;
    const bmi = parseFloat(form.weight_kg) / ((parseFloat(form.height_cm) / 100) ** 2);
    return bmi.toFixed(1);
  };

  return (
    <DashboardLayout navItems={navItems} brandTitle={brand} roleBadge={roleBadge}>

      {/* Page Header */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'28px', flexWrap:'wrap', gap:'12px' }}>
        <div>
          <h4 style={{ fontWeight:800, color:'#1a1a2e', margin:0 }}>
            <i className="fas fa-walking me-2" style={{ color:'#e63946' }}></i>Walk-in Triage
          </h4>
          <p style={{ color:'#6c757d', marginTop:'5px', fontSize:'14px', marginBottom:0 }}>
            Triage walk-in patients without a scheduled appointment
          </p>
        </div>
        <Link to="/nurse/dashboard" className="btn btn-outline-secondary btn-sm" style={{ borderRadius:'8px', fontWeight:600 }}>
          <i className="fas fa-arrow-left me-1"></i>Back to Dashboard
        </Link>
      </div>

      {/* Progress Steps */}
      <div style={{ display:'flex', gap:'0', marginBottom:'32px', position:'relative' }}>
        {[
          { n:1, label:'Find Patient', icon:'fas fa-search' },
          { n:2, label:'Visit Details', icon:'fas fa-clipboard' },
          { n:3, label:'Vital Signs',   icon:'fas fa-heartbeat' },
          { n:4, label:'Complete',      icon:'fas fa-check' },
        ].map((s, idx, arr) => (
          <div key={s.n} style={{ display:'flex', alignItems:'center', flex: idx < arr.length - 1 ? 1 : 0 }}>
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:'6px', minWidth:'80px' }}>
              <div style={{
                width:'40px', height:'40px', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center',
                background: step > s.n ? 'linear-gradient(135deg,#22c55e,#16a34a)' : step === s.n ? 'linear-gradient(135deg,#e63946,#c1121f)' : '#e2e8f0',
                color: step >= s.n ? '#fff' : '#94a3b8', fontWeight:700, fontSize:'14px',
                boxShadow: step === s.n ? '0 0 0 4px rgba(230,57,70,0.15)' : 'none',
                transition:'all 0.3s',
              }}>
                {step > s.n ? <i className="fas fa-check" style={{ fontSize:'13px' }}></i> : <i className={s.icon} style={{ fontSize:'13px' }}></i>}
              </div>
              <div style={{ fontSize:'11px', fontWeight: step === s.n ? 700 : 500, color: step === s.n ? '#e63946' : step > s.n ? '#16a34a' : '#94a3b8', textAlign:'center', whiteSpace:'nowrap' }}>
                {s.label}
              </div>
            </div>
            {idx < arr.length - 1 && (
              <div style={{ flex:1, height:'2px', background: step > s.n ? '#22c55e' : '#e2e8f0', margin:'0 4px', marginBottom:'24px', transition:'background 0.3s' }}></div>
            )}
          </div>
        ))}
      </div>

      <div className="row justify-content-center">
        <div className="col-lg-8">

          {/* ══ STEP 1: SEARCH PATIENT ══ */}
          {step === 1 && (
            <div className="dash-card">
              <div className="dash-card-header">
                <h6 style={{ margin:0 }}><i className="fas fa-search me-2 text-primary"></i>Search Patient</h6>
              </div>
              <div className="dash-card-body">
                <p style={{ color:'#6c757d', fontSize:'14px', marginBottom:'20px' }}>
                  Search by patient name, ID, or phone number to begin triage.
                </p>
                <div style={{ position:'relative', marginBottom:'20px' }}>
                  <i className="fas fa-search" style={{ position:'absolute', left:'14px', top:'50%', transform:'translateY(-50%)', color:'#adb5bd', fontSize:'15px', zIndex:1 }}></i>
                  <input
                    ref={searchRef}
                    autoFocus
                    className="form-control form-control-lg"
                    style={{ paddingLeft:'44px', borderRadius:'12px', fontSize:'15px' }}
                    placeholder="Enter patient name, ID, or phone number…"
                    value={query}
                    onChange={handleQueryChange}
                  />
                  {searching && (
                    <div style={{ position:'absolute', right:'14px', top:'50%', transform:'translateY(-50%)' }}>
                      <div className="spinner-border spinner-border-sm text-primary"></div>
                    </div>
                  )}
                </div>

                {/* Search results */}
                {results.length > 0 && (
                  <div style={{ border:'1px solid #e2e8f0', borderRadius:'12px', overflow:'hidden' }}>
                    {results.map((p, idx) => (
                      <div key={p.id}
                        onClick={() => selectPatient(p)}
                        style={{
                          display:'flex', alignItems:'center', gap:'14px', padding:'14px 16px',
                          cursor:'pointer', borderBottom: idx < results.length - 1 ? '1px solid #f1f5f9' : 'none',
                          transition:'background 0.12s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f8faff'}
                        onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                        <div style={{ width:'44px', height:'44px', borderRadius:'12px', background: colorFor(p.id), display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:'16px', flexShrink:0 }}>
                          {initials(p.full_name)}
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontWeight:700, color:'#1a1a2e' }}>{p.full_name}</div>
                          <div style={{ fontSize:'12px', color:'#6c757d', marginTop:'2px', display:'flex', gap:'12px', flexWrap:'wrap' }}>
                            <span><i className="fas fa-id-badge me-1"></i>{p.patient_id}</span>
                            {p.gender && <span><i className="fas fa-venus-mars me-1"></i>{p.gender}</span>}
                            {p.phone && <span><i className="fas fa-phone me-1"></i>{p.phone}</span>}
                            {p.date_of_birth && (
                              <span><i className="fas fa-birthday-cake me-1"></i>
                                {Math.floor((now - new Date(p.date_of_birth)) / 31557600000)} yrs
                              </span>
                            )}
                          </div>
                        </div>
                        <button className="btn btn-sm btn-outline-primary" style={{ borderRadius:'8px', fontWeight:600, flexShrink:0 }}
                          onClick={(e) => { e.stopPropagation(); selectPatient(p); }}>
                          Select <i className="fas fa-arrow-right ms-1"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {query.length >= 2 && !searching && results.length === 0 && !showQuickReg && (
                  <div style={{ textAlign:'center', padding:'24px', color:'#6c757d' }}>
                    <i className="fas fa-user-slash" style={{ fontSize:'32px', opacity:0.3, display:'block', marginBottom:'8px' }}></i>
                    <div style={{ fontWeight:600, marginBottom:'4px' }}>No patients found</div>
                    <div style={{ fontSize:'13px', marginBottom:'16px' }}>Try a different name or ID, or register them now</div>
                    <button
                      className="btn btn-sm"
                      style={{ background:'#e63946', color:'#fff', borderRadius:'9px', fontWeight:700, border:'none', padding:'8px 20px' }}
                      onClick={() => { setShowQuickReg(true); setRegError(''); }}
                    >
                      <i className="fas fa-user-plus me-2"></i>Register New Patient
                    </button>
                  </div>
                )}

                {/* ── Quick-register inline form ── */}
                {showQuickReg && (
                  <div style={{ border:'2px solid #e63946', borderRadius:'12px', padding:'20px', marginTop:'8px', background:'#fff9f9' }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'16px' }}>
                      <div style={{ fontWeight:700, color:'#e63946', fontSize:'14px' }}>
                        <i className="fas fa-user-plus me-2"></i>Quick Patient Registration
                      </div>
                      <button onClick={() => setShowQuickReg(false)} style={{ background:'none', border:'none', color:'#adb5bd', fontSize:'16px', cursor:'pointer', lineHeight:1 }}>
                        <i className="fas fa-times"></i>
                      </button>
                    </div>
                    <div style={{ fontSize:'12px', color:'#6c757d', marginBottom:'14px', background:'#fef3c7', borderRadius:'8px', padding:'8px 12px' }}>
                      <i className="fas fa-info-circle me-1 text-warning"></i>
                      Minimum fields only — the receptionist will complete the full profile later.
                    </div>
                    {regError && (
                      <div className="alert alert-danger py-2 small" style={{ borderRadius:'8px', marginBottom:'12px' }}>
                        <i className="fas fa-exclamation-circle me-1"></i>{regError}
                      </div>
                    )}
                    <div className="row g-3">
                      <div className="col-md-6">
                        <label className="form-label" style={{ fontSize:'12px', fontWeight:600 }}>First Name <span className="text-danger">*</span></label>
                        <input className="form-control form-control-sm" value={regForm.first_name} onChange={setRegField('first_name')} placeholder="e.g. Aminata" />
                      </div>
                      <div className="col-md-6">
                        <label className="form-label" style={{ fontSize:'12px', fontWeight:600 }}>Last Name <span className="text-danger">*</span></label>
                        <input className="form-control form-control-sm" value={regForm.last_name} onChange={setRegField('last_name')} placeholder="e.g. Koroma" />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label" style={{ fontSize:'12px', fontWeight:600 }}>Date of Birth <span className="text-danger">*</span></label>
                        <input type="date" className="form-control form-control-sm" value={regForm.date_of_birth} onChange={setRegField('date_of_birth')} />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label" style={{ fontSize:'12px', fontWeight:600 }}>Gender <span className="text-danger">*</span></label>
                        <select className="form-select form-select-sm" value={regForm.gender} onChange={setRegField('gender')}>
                          <option value="">— Select —</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label" style={{ fontSize:'12px', fontWeight:600 }}>Phone <span className="text-danger">*</span></label>
                        <input className="form-control form-control-sm" value={regForm.phone} onChange={setRegField('phone')} placeholder="+232..." />
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:'10px', justifyContent:'flex-end', marginTop:'16px' }}>
                      <button onClick={() => setShowQuickReg(false)} className="btn btn-sm btn-outline-secondary" style={{ borderRadius:'8px' }}>
                        Cancel
                      </button>
                      <button onClick={handleQuickRegister} disabled={regSaving} className="btn btn-sm"
                        style={{ background:'#e63946', color:'#fff', borderRadius:'8px', fontWeight:700, border:'none' }}>
                        {regSaving
                          ? <><span className="spinner-border spinner-border-sm me-1"></span>Registering…</>
                          : <><i className="fas fa-check me-1"></i>Register &amp; Triage</>}
                      </button>
                    </div>
                  </div>
                )}

                {query.length === 0 && (
                  <div style={{ textAlign:'center', padding:'30px 20px', background:'#f8fafc', borderRadius:'12px', color:'#6c757d' }}>
                    <i className="fas fa-users" style={{ fontSize:'36px', opacity:0.3, display:'block', marginBottom:'10px' }}></i>
                    <div style={{ fontWeight:600, fontSize:'14px' }}>Start typing to search</div>
                    <div style={{ fontSize:'13px', marginTop:'4px' }}>Search for the patient who needs triage</div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══ STEP 2: VISIT DETAILS ══ */}
          {step === 2 && selected && (
            <div className="dash-card">
              {/* Patient Summary Bar */}
              <div style={{ background:'linear-gradient(135deg,#4361ee,#7c3aed)', padding:'16px 20px', borderRadius:'12px 12px 0 0', display:'flex', alignItems:'center', gap:'12px' }}>
                <div style={{ width:'44px', height:'44px', borderRadius:'12px', background:'rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:'16px' }}>
                  {initials(selected.full_name)}
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ color:'rgba(255,255,255,0.75)', fontSize:'11px' }}>Selected Patient</div>
                  <div style={{ color:'#fff', fontWeight:800, fontSize:'16px' }}>{selected.full_name}</div>
                  <div style={{ color:'rgba(255,255,255,0.75)', fontSize:'12px', display:'flex', gap:'12px' }}>
                    <span>{selected.patient_id}</span>
                    {selected.gender && <span>{selected.gender}</span>}
                    {selected.date_of_birth && (
                      <span>{Math.floor((now - new Date(selected.date_of_birth)) / 31557600000)} years old</span>
                    )}
                  </div>
                </div>
                <button onClick={() => { setStep(1); setSelected(null); }} style={{ background:'rgba(255,255,255,0.15)', border:'none', borderRadius:'8px', color:'#fff', padding:'6px 12px', fontSize:'12px', cursor:'pointer', fontWeight:600 }}>
                  <i className="fas fa-exchange-alt me-1"></i>Change
                </button>
              </div>

              <div className="dash-card-header">
                <h6 style={{ margin:0 }}><i className="fas fa-clipboard me-2" style={{ color:'#4361ee' }}></i>Step 2 — Visit Details</h6>
              </div>
              <div className="dash-card-body">
                {error && (
                  <div className="alert alert-danger d-flex align-items-center gap-2 mb-3" style={{ borderRadius:'10px', fontSize:'13px' }}>
                    <i className="fas fa-exclamation-circle"></i>{error}
                  </div>
                )}
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label">Visit Type <span className="text-danger">*</span></label>
                    <select className="form-select" value={form.visit_type} onChange={setField('visit_type')}>
                      {VISIT_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Assigned Doctor</label>
                    <select className="form-select" value={form.doctor} onChange={setField('doctor')}>
                      <option value="">— No specific doctor —</option>
                      {doctors.map(d => <option key={d.id} value={d.id}>Dr. {d.full_name} ({d.department || 'General'})</option>)}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Department</label>
                    <select className="form-select" value={form.department} onChange={setField('department')}>
                      <option value="">— Select department —</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name_display || d.name}</option>)}
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="form-label">Chief Complaint <span className="text-danger">*</span></label>
                    <textarea className="form-control" rows={4}
                      placeholder="Describe the patient's primary reason for this visit…"
                      value={form.chief_complaint} onChange={setField('chief_complaint')} />
                  </div>
                </div>
                <div style={{ display:'flex', gap:'10px', justifyContent:'flex-end', marginTop:'20px' }}>
                  <button onClick={() => setStep(1)} className="btn btn-outline-secondary" style={{ borderRadius:'9px', fontWeight:600 }}>
                    <i className="fas fa-arrow-left me-1"></i>Back
                  </button>
                  <button onClick={() => {
                    if (!form.chief_complaint.trim()) { setError('Chief complaint is required.'); return; }
                    setError(''); setStep(3);
                  }} className="btn btn-primary" style={{ borderRadius:'9px', fontWeight:700 }}>
                    Next: Record Vitals <i className="fas fa-arrow-right ms-1"></i>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ══ STEP 3: VITAL SIGNS ══ */}
          {step === 3 && selected && (
            <div className="dash-card">
              <div className="dash-card-header">
                <h6 style={{ margin:0 }}><i className="fas fa-heartbeat me-2" style={{ color:'#e63946' }}></i>Step 3 — Vital Signs</h6>
                <span style={{ fontSize:'12px', color:'#6c757d' }}>All fields are optional</span>
              </div>
              <div className="dash-card-body">
                {error && (
                  <div className="alert alert-danger d-flex align-items-center gap-2 mb-3" style={{ borderRadius:'10px', fontSize:'13px' }}>
                    <i className="fas fa-exclamation-circle"></i>{error}
                  </div>
                )}

                {/* Vitals Grid */}
                <div className="row g-3">
                  <div className="col-12">
                    <div style={{ fontWeight:700, fontSize:'12px', textTransform:'uppercase', letterSpacing:'0.5px', color:'#4361ee', marginBottom:'4px' }}>
                      <i className="fas fa-tint me-1"></i>Cardiovascular
                    </div>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label" style={{ fontSize:'12px' }}>BP Systolic (mmHg)</label>
                    <input type="number" className="form-control" placeholder="120" value={form.blood_pressure_systolic} onChange={setField('blood_pressure_systolic')} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label" style={{ fontSize:'12px' }}>BP Diastolic (mmHg)</label>
                    <input type="number" className="form-control" placeholder="80" value={form.blood_pressure_diastolic} onChange={setField('blood_pressure_diastolic')} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label" style={{ fontSize:'12px' }}>Heart Rate (bpm)</label>
                    <input type="number" className="form-control" placeholder="72" value={form.heart_rate} onChange={setField('heart_rate')} />
                  </div>

                  <div className="col-12" style={{ marginTop:'4px' }}>
                    <div style={{ fontWeight:700, fontSize:'12px', textTransform:'uppercase', letterSpacing:'0.5px', color:'#059669', marginBottom:'4px' }}>
                      <i className="fas fa-lungs me-1"></i>Respiratory & Temperature
                    </div>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label" style={{ fontSize:'12px' }}>Resp. Rate (/min)</label>
                    <input type="number" className="form-control" placeholder="16" value={form.respiratory_rate} onChange={setField('respiratory_rate')} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label" style={{ fontSize:'12px' }}>Temperature (°C)</label>
                    <input type="number" step="0.1" className="form-control" placeholder="37.0" value={form.temperature_celsius} onChange={setField('temperature_celsius')} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label" style={{ fontSize:'12px' }}>O₂ Saturation (%)</label>
                    <input type="number" step="0.1" className="form-control" placeholder="98" value={form.oxygen_saturation} onChange={setField('oxygen_saturation')} />
                  </div>

                  <div className="col-12" style={{ marginTop:'4px' }}>
                    <div style={{ fontWeight:700, fontSize:'12px', textTransform:'uppercase', letterSpacing:'0.5px', color:'#d97706', marginBottom:'4px' }}>
                      <i className="fas fa-weight me-1"></i>Anthropometrics & Metabolic
                    </div>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label" style={{ fontSize:'12px' }}>Weight (kg)</label>
                    <input type="number" step="0.1" className="form-control" placeholder="70.0" value={form.weight_kg} onChange={setField('weight_kg')} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label" style={{ fontSize:'12px' }}>Height (cm)</label>
                    <input type="number" step="0.1" className="form-control" placeholder="170.0" value={form.height_cm} onChange={setField('height_cm')} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label" style={{ fontSize:'12px' }}>Blood Glucose (mmol/L)</label>
                    <input type="number" step="0.1" className="form-control" placeholder="5.6" value={form.blood_glucose} onChange={setField('blood_glucose')} />
                  </div>

                  <div className="col-12">
                    <label className="form-label" style={{ fontSize:'12px' }}>Nurse Notes</label>
                    <textarea className="form-control" rows={2} placeholder="Any additional observations or notes…" value={form.notes} onChange={setField('notes')} />
                  </div>
                </div>

                {/* Summary Preview */}
                {(form.blood_pressure_systolic || form.heart_rate || form.temperature_celsius || form.oxygen_saturation) && (
                  <div style={{ marginTop:'20px', background:'#f8fafc', borderRadius:'12px', padding:'16px 20px', border:'1px solid #e2e8f0' }}>
                    <div style={{ fontSize:'12px', fontWeight:700, color:'#4361ee', textTransform:'uppercase', letterSpacing:'0.4px', marginBottom:'10px' }}>
                      <i className="fas fa-chart-line me-1"></i>Vitals Summary
                    </div>
                    <div style={{ display:'flex', gap:'20px', flexWrap:'wrap' }}>
                      {[
                        { label:'BP', value: form.blood_pressure_systolic && form.blood_pressure_diastolic ? `${form.blood_pressure_systolic}/${form.blood_pressure_diastolic} mmHg` : null, icon:'fas fa-tint', color:'#e63946' },
                        { label:'HR', value: form.heart_rate ? `${form.heart_rate} bpm` : null, icon:'fas fa-heartbeat', color:'#f97316' },
                        { label:'Temp', value: form.temperature_celsius ? `${form.temperature_celsius}°C` : null, icon:'fas fa-thermometer-half', color:'#0891b2' },
                        { label:'SpO₂', value: form.oxygen_saturation ? `${form.oxygen_saturation}%` : null, icon:'fas fa-lungs', color:'#059669' },
                        { label:'BMI', value: calcBMI() ? `${calcBMI()} kg/m²` : null, icon:'fas fa-weight', color:'#7c3aed' },
                      ].filter(v => v.value).map(v => (
                        <div key={v.label} style={{ display:'flex', alignItems:'center', gap:'6px' }}>
                          <i className={v.icon} style={{ color: v.color, fontSize:'12px' }}></i>
                          <span style={{ fontSize:'13px', color:'#475569' }}><strong>{v.label}:</strong> {v.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div style={{ display:'flex', gap:'10px', justifyContent:'flex-end', marginTop:'20px' }}>
                  <button onClick={() => setStep(2)} className="btn btn-outline-secondary" style={{ borderRadius:'9px', fontWeight:600 }}>
                    <i className="fas fa-arrow-left me-1"></i>Back
                  </button>
                  <button onClick={handleSubmit} disabled={saving} className="btn"
                    style={{ background:'#e63946', color:'#fff', borderRadius:'9px', fontWeight:700, border:'none' }}>
                    {saving
                      ? <><span className="spinner-border spinner-border-sm me-2"></span>Saving…</>
                      : <><i className="fas fa-check-circle me-2"></i>Complete Triage</>}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ══ STEP 4: SUCCESS ══ */}
          {step === 4 && selected && successData && (
            <div className="dash-card" style={{ textAlign:'center', padding:'48px 32px' }}>
              <div style={{ width:'80px', height:'80px', borderRadius:'50%', background:'linear-gradient(135deg,#22c55e,#16a34a)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px' }}>
                <i className="fas fa-check" style={{ color:'#fff', fontSize:'32px' }}></i>
              </div>
              <h5 style={{ fontWeight:800, color:'#166534', marginBottom:'8px' }}>Triage Complete!</h5>
              <p style={{ color:'#6c757d', fontSize:'14px', marginBottom:'24px' }}>
                <strong>{selected.full_name}</strong> has been successfully triaged and is now in the queue for consultation.
              </p>

              {/* Vitals recap */}
              {successData.vitals && (
                <div style={{ background:'#f0fdf4', border:'1px solid #bbf7d0', borderRadius:'12px', padding:'16px 20px', marginBottom:'24px', textAlign:'left' }}>
                  <div style={{ fontWeight:700, color:'#166534', fontSize:'13px', marginBottom:'8px' }}>
                    <i className="fas fa-heartbeat me-1"></i>Recorded Vitals
                  </div>
                  <div style={{ display:'flex', gap:'20px', flexWrap:'wrap', fontSize:'13px', color:'#475569' }}>
                    {successData.vitals.blood_pressure_systolic && (
                      <span><strong>BP:</strong> {successData.vitals.blood_pressure_systolic}/{successData.vitals.blood_pressure_diastolic} mmHg</span>
                    )}
                    {successData.vitals.heart_rate && <span><strong>HR:</strong> {successData.vitals.heart_rate} bpm</span>}
                    {successData.vitals.temperature_celsius && <span><strong>Temp:</strong> {successData.vitals.temperature_celsius}°C</span>}
                    {successData.vitals.oxygen_saturation && <span><strong>SpO₂:</strong> {successData.vitals.oxygen_saturation}%</span>}
                  </div>
                </div>
              )}

              <div style={{ display:'flex', gap:'10px', justifyContent:'center', flexWrap:'wrap' }}>
                <button onClick={startNew} className="btn btn-primary" style={{ borderRadius:'9px', fontWeight:700 }}>
                  <i className="fas fa-plus me-2"></i>Triage Another Patient
                </button>
                <Link to="/nurse/dashboard" className="btn btn-outline-secondary" style={{ borderRadius:'9px', fontWeight:600 }}>
                  <i className="fas fa-tachometer-alt me-1"></i>Back to Dashboard
                </Link>
              </div>
            </div>
          )}

        </div>
      </div>
    </DashboardLayout>
  );
}

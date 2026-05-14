import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layout/DashboardLayout';
import { getNavForUser, getBrandForUser, getRoleBadge } from '../../utils/navItems';

const PRIORITY_META = {
  normal:    { color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', icon: 'fas fa-check-circle',         label: 'Normal — Routine visit' },
  urgent:    { color: '#c2410c', bg: '#fff7ed', border: '#fed7aa', icon: 'fas fa-exclamation-triangle',  label: 'Urgent — Needs attention soon' },
  emergency: { color: '#b91c1c', bg: '#fef2f2', border: '#fecaca', icon: 'fas fa-ambulance',             label: 'Emergency — Immediate attention' },
};

const TIME_PREFS = ['No preference', 'Morning (08:00–12:00)', 'Afternoon (12:00–16:00)', 'Evening (16:00–18:00)'];

const fmtDate = (d) => d ? new Date(d + 'T00:00').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }) : '—';

export default function PatientBookAppointment() {
  const { apiCall, user } = useAuth();
  const navigate = useNavigate();

  const [doctors,      setDoctors]      = useState([]);
  const [ownHospitalName, setOwnHospitalName] = useState('');
  const [loading,      setLoading]      = useState(true);
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState('');
  const [submitted,    setSubmitted]    = useState(null);
  const [step,         setStep]         = useState(1);
  const [search,       setSearch]       = useState('');
  const [docSchedule,  setDocSchedule]  = useState(null);
  const [schedLoading, setSchedLoading] = useState(false);

  // Referral state
  const [bookingType,   setBookingType]   = useState('own');  // 'own' | 'referral'
  const [hospitals,     setHospitals]     = useState([]);
  const [refHospitalId, setRefHospitalId] = useState('');
  const [refHospitalName, setRefHospitalName] = useState('');
  const [refLoading,    setRefLoading]    = useState(false);

  const [form, setForm] = useState({
    doctor_id:           '',
    preferred_date:      '',
    preferred_time_note: 'No preference',
    priority:            'normal',
    reason:              '',
    is_referral:         false,
  });
  const [selectedDoctor, setSelectedDoctor] = useState(null);

  const DAY_NAMES = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];

  useEffect(() => {
    // Fetch own hospital doctors
    apiCall('/portal/doctors/')
      .then(r => r.json())
      .then(data => {
        const list = data.doctors || (Array.isArray(data) ? data : []);
        setDoctors(list);
        setOwnHospitalName(data.hospital_name || '');
        setLoading(false);
      })
      .catch(() => setLoading(false));
    // Fetch all hospitals for referral dropdown
    apiCall('/portal/hospitals/')
      .then(r => r.json())
      .then(data => setHospitals(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [apiCall]);

  const switchBookingType = (type) => {
    setBookingType(type);
    setDoctors([]);
    setSelectedDoctor(null);
    setSearch('');
    setRefHospitalId('');
    setRefHospitalName('');
    setForm(f => ({ ...f, doctor_id: '', is_referral: type === 'referral' }));
    if (type === 'own') {
      setLoading(true);
      apiCall('/portal/doctors/')
        .then(r => r.json())
        .then(data => {
          const list = data.doctors || (Array.isArray(data) ? data : []);
          setDoctors(list);
          setOwnHospitalName(data.hospital_name || '');
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  };

  const loadReferralDoctors = async (hospitalId) => {
    if (!hospitalId) return;
    setRefHospitalId(hospitalId);
    const h = hospitals.find(x => String(x.id) === String(hospitalId));
    setRefHospitalName(h?.name || '');
    setRefLoading(true);
    setDoctors([]);
    setSelectedDoctor(null);
    setSearch('');
    try {
      const res  = await apiCall(`/portal/doctors/?hospital_id=${hospitalId}`);
      const data = await res.json();
      setDoctors(data.doctors || []);
    } catch { /* silent */ }
    setRefLoading(false);
  };

  const set = (field) => (e) => setForm(f => ({ ...f, [field]: e.target.value }));

  const selectDoctor = async (doc) => {
    setSelectedDoctor(doc);
    setForm(f => ({ ...f, doctor_id: doc.id, preferred_date: '' }));
    setError('');
    setDocSchedule(null);
    setSchedLoading(true);
    try {
      const res  = await apiCall(`/doctor/${doc.id}/schedule/`);
      const data = await res.json();
      if (res.ok) setDocSchedule(data);
    } catch { /* schedule fetch failed silently */ }
    setSchedLoading(false);
    setStep(2);
  };

  const activeDays   = docSchedule?.schedule?.filter(d => d.is_active) ?? [];
  const blockedDates = docSchedule?.blocked_dates ?? [];

  const isDateAvailable = (dateStr) => {
    if (!dateStr || !docSchedule) return true;
    if (blockedDates.includes(dateStr)) return false;
    const jsDay  = new Date(dateStr + 'T00:00').getDay(); // 0=Sun
    const mapped = jsDay === 0 ? 6 : jsDay - 1;           // Mon=0…Sun=6
    return activeDays.some(d => d.day_of_week === mapped);
  };

  const dateWarning = (() => {
    if (!form.preferred_date || !docSchedule) return '';
    if (blockedDates.includes(form.preferred_date))
      return 'The doctor is unavailable (blocked) on this date. Please choose another.';
    if (!isDateAvailable(form.preferred_date)) {
      const names = activeDays.map(d => DAY_NAMES[d.day_of_week]).join(', ');
      return `The doctor does not work on this day. Available days: ${names || 'schedule not configured yet'}.`;
    }
    return '';
  })();

  const dayInfoForDate = (() => {
    if (!form.preferred_date || !docSchedule || dateWarning) return null;
    const jsDay  = new Date(form.preferred_date + 'T00:00').getDay();
    const mapped = jsDay === 0 ? 6 : jsDay - 1;
    return activeDays.find(d => d.day_of_week === mapped) || null;
  })();

  const goToStep3 = () => {
    if (!form.reason.trim()) { setError('Please describe the reason for your visit.'); return; }
    setError('');
    setStep(3);
  };

  const handleSubmit = async () => {
    setError('');
    setSaving(true);
    try {
      const res  = await apiCall('/portal/appointments/book/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (res.ok) {
        setSubmitted(data);
      } else {
        setError(data.error || 'Request failed. Please try again.');
        setStep(3);
      }
    } catch {
      setError('Network error. Please try again.');
      setStep(3);
    }
    setSaving(false);
  };

  const minDate     = new Date().toISOString().split('T')[0];
  const navItems    = getNavForUser(user);
  const brand       = getBrandForUser(user);
  const roleBadge   = getRoleBadge(user);
  const filteredDoc = doctors.filter(d => d.full_name.toLowerCase().includes(search.toLowerCase()) || (d.department__name || '').toLowerCase().includes(search.toLowerCase()));

  const STEPS = ['Choose Doctor', 'Your Request', 'Review & Submit'];

  const initials = (name) => name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  const DOC_COLORS = ['#4361ee','#7c3aed','#0891b2','#059669','#d97706','#db2777'];
  const docColor   = (id) => DOC_COLORS[id % DOC_COLORS.length];

  return (
    <DashboardLayout navItems={navItems} brandTitle={brand} roleBadge={roleBadge}>

      {/* ── Success screen ── */}
      {submitted && (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'70vh' }}>
          <div className="dash-card" style={{ maxWidth:'520px', width:'100%', textAlign:'center', padding:'48px 40px' }}>
            <div style={{ width:'80px', height:'80px', borderRadius:'50%', background:'linear-gradient(135deg,#4361ee,#7c3aed)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 20px', boxShadow:'0 8px 24px rgba(67,97,238,0.3)' }}>
              <i className="fas fa-paper-plane" style={{ color:'#fff', fontSize:'30px' }}></i>
            </div>
            <h4 style={{ fontWeight:800, color:'#1a1a2e', marginBottom:'8px' }}>Request Submitted!</h4>
            <p style={{ color:'#6c757d', fontSize:'14px', marginBottom:'24px' }}>
              Your appointment request has been sent to <strong>Dr. {selectedDoctor?.full_name}</strong>.
              The doctor will review your request and schedule a confirmed time. You will receive a notification once your appointment is confirmed.
            </p>
            <div style={{ background:'#eff6ff', border:'1px solid #bfdbfe', borderRadius:'12px', padding:'16px 20px', marginBottom:'24px', textAlign:'left' }}>
              <div style={{ fontSize:'11px', fontWeight:700, color:'#4361ee', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'10px' }}>
                <i className="fas fa-info-circle me-1"></i>What happens next?
              </div>
              {['The doctor will review your appointment request.', 'A confirmed date and time will be scheduled for you.', 'You will receive a notification in your dashboard.'].map((t, i) => (
                <div key={i} style={{ display:'flex', gap:'10px', marginBottom:'8px', fontSize:'13px', color:'#1d4ed8' }}>
                  <span style={{ fontWeight:800, flexShrink:0 }}>{i + 1}.</span>{t}
                </div>
              ))}
            </div>
            <button className="btn btn-primary w-100" style={{ borderRadius:'10px', fontWeight:700, padding:'12px' }} onClick={() => navigate('/patient/dashboard')}>
              <i className="fas fa-tachometer-alt me-2"></i>Go to Dashboard
            </button>
          </div>
        </div>
      )}

      {!submitted && (
        <>
          {/* ── Page header ── */}
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'28px', flexWrap:'wrap', gap:'12px' }}>
            <div>
              <h4 style={{ fontWeight:800, color:'#1a1a2e', margin:0 }}>
                <i className="fas fa-calendar-plus me-2" style={{ color:'#4361ee' }}></i>Book an Appointment
              </h4>
              <p style={{ color:'#6c757d', marginTop:'5px', fontSize:'14px', marginBottom:0 }}>
                {user?.full_name} &mdash; select a doctor and your preferred time slot
              </p>
            </div>
            <Link to="/patient/dashboard" className="btn btn-outline-secondary btn-sm" style={{ borderRadius:'8px', fontWeight:600 }}>
              <i className="fas fa-arrow-left me-1"></i>Dashboard
            </Link>
          </div>

          {/* ── Step indicator ── */}
          <div className="dash-card mb-4" style={{ padding:'20px 28px' }}>
            <div style={{ display:'flex', alignItems:'center' }}>
              {STEPS.map((label, i) => {
                const n       = i + 1;
                const done    = step > n;
                const current = step === n;
                return (
                  <div key={label} style={{ display:'flex', alignItems:'center', flex: i < STEPS.length - 1 ? 1 : 'none' }}>
                    <div style={{ display:'flex', flexDirection:'column', alignItems:'center', cursor: done ? 'pointer' : 'default' }}
                      onClick={() => { if (done) setStep(n); }}>
                      <div style={{
                        width:'38px', height:'38px', borderRadius:'50%',
                        background: done ? '#22c55e' : current ? '#4361ee' : '#e9ecef',
                        color: done || current ? '#fff' : '#adb5bd',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        fontSize:'14px', fontWeight:700, flexShrink:0,
                        boxShadow: current ? '0 0 0 4px rgba(67,97,238,0.15)' : 'none',
                        transition:'all 0.2s',
                      }}>
                        {done ? <i className="fas fa-check" style={{ fontSize:'13px' }}></i> : n}
                      </div>
                      <div style={{ fontSize:'11px', marginTop:'6px', fontWeight: current ? 700 : 500, color: current ? '#4361ee' : done ? '#22c55e' : '#adb5bd', whiteSpace:'nowrap', letterSpacing:'0.2px' }}>
                        {label}
                      </div>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div style={{ flex:1, height:'3px', borderRadius:'2px', background: done ? '#22c55e' : '#e9ecef', margin:'0 12px', marginBottom:'18px', transition:'background 0.3s' }}></div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {error && (
            <div className="alert alert-danger d-flex align-items-center gap-2 mb-4" style={{ borderRadius:'10px', fontSize:'13px' }}>
              <i className="fas fa-exclamation-circle"></i>{error}
            </div>
          )}

          {/* ══════════════════════════════
              STEP 1 — Choose Doctor
          ══════════════════════════════ */}
          {step === 1 && (
            <div className="dash-card">
              <div className="dash-card-header">
                <h6 style={{ margin:0 }}><i className="fas fa-user-md me-2"></i>Select a Doctor</h6>
                <span style={{ fontSize:'12px', color:'#6c757d' }}>{filteredDoc.length} available</span>
              </div>
              <div className="dash-card-body">

                {/* ── Booking Type Toggle ── */}
                <div style={{ display:'flex', gap:'8px', marginBottom:'20px', padding:'4px', background:'#f1f5f9', borderRadius:'12px' }}>
                  {[{ key:'own', icon:'fas fa-hospital', label:'My Hospital' + (ownHospitalName ? ` — ${ownHospitalName}` : '') },
                    { key:'referral', icon:'fas fa-share-square', label:'Referral — Another Hospital' }]
                    .map(({ key, icon, label }) => (
                    <button key={key} type="button" onClick={() => switchBookingType(key)}
                      style={{
                        flex:1, padding:'10px 16px', borderRadius:'9px', border:'none', cursor:'pointer',
                        fontWeight: bookingType === key ? 700 : 500, fontSize:'13px',
                        background: bookingType === key ? '#fff' : 'transparent',
                        color: bookingType === key ? '#4361ee' : '#64748b',
                        boxShadow: bookingType === key ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                        transition:'all 0.15s',
                      }}>
                      <i className={icon} style={{ marginRight:'8px' }}></i>{label}
                    </button>
                  ))}
                </div>

                {/* ── Referral Hospital Selector ── */}
                {bookingType === 'referral' && (
                  <div style={{ marginBottom:'20px' }}>
                    <label className="form-label" style={{ fontWeight:600, fontSize:'13px' }}>
                      <i className="fas fa-hospital me-2 text-primary"></i>Select Hospital for Referral
                    </label>
                    <select className="form-select" value={refHospitalId}
                      onChange={e => loadReferralDoctors(e.target.value)}>
                      <option value="">— Choose a hospital —</option>
                      {hospitals.map(h => (
                        <option key={h.id} value={h.id}>{h.name}{h.town_city ? ` — ${h.town_city}` : ''}</option>
                      ))}
                    </select>
                    {refHospitalId && (
                      <div style={{ marginTop:'6px', fontSize:'12px', color:'#e63946', display:'flex', alignItems:'center', gap:'6px' }}>
                        <i className="fas fa-info-circle"></i>
                        This is a referral appointment at <strong>{refHospitalName}</strong>. The doctor will be notified.
                      </div>
                    )}
                  </div>
                )}

                {/* Search */}
                <div style={{ position:'relative', marginBottom:'20px' }}>
                  <i className="fas fa-search" style={{ position:'absolute', left:'14px', top:'50%', transform:'translateY(-50%)', color:'#adb5bd', fontSize:'13px' }}></i>
                  <input
                    className="form-control"
                    placeholder="Search by name or department…"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    style={{ paddingLeft:'38px' }}
                  />
                </div>

                {(loading || refLoading) ? (
                  <div style={{ textAlign:'center', padding:'60px 0', color:'#6c757d' }}>
                    <div className="spinner-border text-primary mb-3" style={{ width:'40px', height:'40px' }}></div>
                    <div style={{ fontSize:'14px' }}>{refLoading ? 'Loading doctors at selected hospital…' : 'Loading available doctors…'}</div>
                  </div>
                ) : bookingType === 'referral' && !refHospitalId ? (
                  <div style={{ textAlign:'center', padding:'60px 0', color:'#adb5bd' }}>
                    <i className="fas fa-share-square" style={{ fontSize:'48px', display:'block', marginBottom:'16px', opacity:0.4 }}></i>
                    <div style={{ fontWeight:600, color:'#6c757d' }}>Select a hospital above</div>
                    <div style={{ fontSize:'13px', marginTop:'4px' }}>Choose the referral hospital to see its doctors</div>
                  </div>
                ) : filteredDoc.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'60px 0', color:'#adb5bd' }}>
                    <i className="fas fa-user-md" style={{ fontSize:'48px', display:'block', marginBottom:'16px', opacity:0.4 }}></i>
                    <div style={{ fontWeight:600, color:'#6c757d' }}>No doctors found</div>
                    <div style={{ fontSize:'13px', marginTop:'4px' }}>Try a different search or contact reception</div>
                  </div>
                ) : (
                  <div className="row g-3">
                    {filteredDoc.map(doc => {
                      const color    = docColor(doc.id);
                      const selected = String(form.doctor_id) === String(doc.id);
                      return (
                        <div key={doc.id} className="col-md-6 col-lg-4">
                          <div
                            onClick={() => selectDoctor(doc)}
                            style={{
                              border: `2px solid ${selected ? color : '#e9ecef'}`,
                              borderRadius:'14px', padding:'18px 16px', cursor:'pointer',
                              background: selected ? color + '0D' : '#fff',
                              transition:'all 0.15s', position:'relative', overflow:'hidden',
                            }}
                            onMouseEnter={e => { if (!selected) { e.currentTarget.style.borderColor = color + '80'; e.currentTarget.style.background = '#fafbff'; } }}
                            onMouseLeave={e => { if (!selected) { e.currentTarget.style.borderColor = '#e9ecef'; e.currentTarget.style.background = '#fff'; } }}
                          >
                            {selected && (
                              <div style={{ position:'absolute', top:'10px', right:'10px', width:'20px', height:'20px', borderRadius:'50%', background: color, display:'flex', alignItems:'center', justifyContent:'center' }}>
                                <i className="fas fa-check" style={{ color:'#fff', fontSize:'9px' }}></i>
                              </div>
                            )}
                            <div style={{ display:'flex', alignItems:'center', gap:'12px' }}>
                              {/* Avatar */}
                              <div style={{ width:'48px', height:'48px', borderRadius:'12px', background: color, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:'15px', fontWeight:800, color:'#fff', letterSpacing:'0.5px' }}>
                                {initials(doc.full_name)}
                              </div>
                              <div style={{ minWidth:0 }}>
                                <div style={{ fontWeight:700, color:'#1a1a2e', fontSize:'13px', marginBottom:'3px', whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>
                                  Dr. {doc.full_name}
                                </div>
                                <div style={{ display:'inline-flex', alignItems:'center', gap:'4px', background: color + '15', color, borderRadius:'6px', padding:'2px 8px', fontSize:'11px', fontWeight:600 }}>
                                  <i className="fas fa-stethoscope" style={{ fontSize:'9px' }}></i>
                                  {doc.department__name || 'General Practice'}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ══════════════════════════════
              STEP 2 — Your Request
          ══════════════════════════════ */}
          {step === 2 && (
            <div className="row g-4">
              <div className="col-lg-7">
                <div className="dash-card">
                  <div className="dash-card-header">
                    <h6 style={{ margin:0 }}><i className="fas fa-file-medical me-2"></i>Your Appointment Request</h6>
                  </div>
                  <div className="dash-card-body">

                    {/* Preferred Date (optional) */}
                    <div className="mb-4">
                      <label className="form-label">Preferred Date <span style={{ color:'#adb5bd', fontWeight:400 }}>(optional)</span></label>
                      {schedLoading ? (
                        <div style={{ display:'flex', alignItems:'center', gap:'8px', padding:'10px 0', color:'#6c757d', fontSize:'13px' }}>
                          <span className="spinner-border spinner-border-sm text-primary"></span> Loading doctor schedule…
                        </div>
                      ) : (
                        <>
                          <input
                            type="date"
                            className={`form-control ${dateWarning ? 'is-invalid' : form.preferred_date && !dateWarning ? 'is-valid' : ''}`}
                            value={form.preferred_date}
                            onChange={set('preferred_date')}
                            min={minDate}
                          />
                          {dateWarning ? (
                            <div style={{ fontSize:'12px', color:'#dc2626', marginTop:'5px', display:'flex', alignItems:'flex-start', gap:'6px' }}>
                              <i className="fas fa-exclamation-circle" style={{ marginTop:'1px', flexShrink:0 }}></i>
                              {dateWarning}
                            </div>
                          ) : dayInfoForDate ? (
                            <div style={{ fontSize:'12px', color:'#16a34a', marginTop:'5px', display:'flex', alignItems:'center', gap:'6px' }}>
                              <i className="fas fa-check-circle"></i>
                              Doctor works {dayInfoForDate.start_time?.slice(0,5)} – {dayInfoForDate.end_time?.slice(0,5)} on this day
                              {dayInfoForDate.slot_duration && (
                                <span style={{ color:'#adb5bd', marginLeft:'4px' }}>({dayInfoForDate.slot_duration} min slots)</span>
                              )}
                            </div>
                          ) : (
                            <div style={{ fontSize:'12px', color:'#adb5bd', marginTop:'5px' }}>
                              <i className="fas fa-info-circle me-1"></i>The doctor will confirm the final time — this is your preference.
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Preferred time of day */}
                    <div className="mb-4">
                      <label className="form-label">Preferred Time of Day</label>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:'8px' }}>
                        {TIME_PREFS.map(pref => {
                          const sel = form.preferred_time_note === pref;
                          return (
                            <button key={pref} type="button"
                              onClick={() => setForm(f => ({ ...f, preferred_time_note: pref }))}
                              style={{
                                padding:'8px 16px', borderRadius:'8px', fontSize:'13px', cursor:'pointer',
                                border:`2px solid ${sel ? '#4361ee' : '#e9ecef'}`,
                                background: sel ? '#eff6ff' : '#fff',
                                color: sel ? '#4361ee' : '#6c757d',
                                fontWeight: sel ? 700 : 500,
                                transition:'all 0.12s',
                              }}>{pref}</button>
                          );
                        })}
                      </div>
                    </div>

                    {/* Priority */}
                    <div className="mb-4">
                      <label className="form-label">Visit Priority</label>
                      <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                        {Object.entries(PRIORITY_META).map(([key, meta]) => (
                          <button key={key} type="button"
                            onClick={() => setForm(f => ({ ...f, priority: key }))}
                            style={{
                              flex:1, padding:'12px', borderRadius:'10px', cursor:'pointer',
                              border:`2px solid ${form.priority === key ? meta.color : '#e9ecef'}`,
                              background: form.priority === key ? meta.bg : '#fff',
                              color: form.priority === key ? meta.color : '#6c757d',
                              fontWeight: form.priority === key ? 700 : 500,
                              fontSize:'12px', transition:'all 0.12s', textAlign:'center',
                            }}>
                            <i className={meta.icon} style={{ display:'block', fontSize:'18px', marginBottom:'5px' }}></i>
                            {key.charAt(0).toUpperCase() + key.slice(1)}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Reason — required */}
                    <div className="mb-2">
                      <label className="form-label">Chief Complaint / Reason <span className="text-danger">*</span></label>
                      <textarea className="form-control" rows={4}
                        placeholder="Describe your symptoms, medical concern, or reason for wanting to see this doctor…"
                        value={form.reason} onChange={set('reason')} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right — doctor card + info */}
              <div className="col-lg-5">
                <div className="dash-card mb-3">
                  <div className="dash-card-header">
                    <h6 style={{ margin:0, fontSize:'13px' }}><i className="fas fa-user-md me-2"></i>Requesting Appointment With</h6>
                  </div>
                  <div className="dash-card-body">
                    {selectedDoctor && (
                      <div style={{ display:'flex', alignItems:'center', gap:'14px' }}>
                        <div style={{ width:'52px', height:'52px', borderRadius:'14px', background: docColor(selectedDoctor.id), display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:'16px', fontWeight:800, color:'#fff' }}>
                          {initials(selectedDoctor.full_name)}
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontWeight:700, color:'#1a1a2e', fontSize:'14px' }}>Dr. {selectedDoctor.full_name}</div>
                          <div style={{ fontSize:'12px', color:'#6c757d', marginTop:'3px' }}>{selectedDoctor.department__name || 'General Practice'}</div>
                          {form.is_referral && (
                            <span style={{ display:'inline-flex', alignItems:'center', gap:'4px', fontSize:'11px', fontWeight:700, color:'#e63946', background:'#fff1f2', border:'1px solid #fecdd3', borderRadius:'5px', padding:'2px 7px', marginTop:'4px' }}>
                              <i className="fas fa-share-square" style={{ fontSize:'9px' }}></i>Referral — {refHospitalName}
                            </span>
                          )}
                        </div>
                        <button onClick={() => { setStep(1); setError(''); }} style={{ background:'none', border:'none', color:'#4361ee', cursor:'pointer', fontSize:'12px', fontWeight:700 }}>Change</button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Doctor Availability Panel */}
                {schedLoading ? (
                  <div className="dash-card mb-3" style={{ padding:'16px 20px', color:'#6c757d', fontSize:'13px', display:'flex', alignItems:'center', gap:'8px' }}>
                    <span className="spinner-border spinner-border-sm text-primary"></span> Loading availability…
                  </div>
                ) : docSchedule && activeDays.length > 0 ? (
                  <div className="dash-card mb-3" style={{ border:'1px solid #d1fae5', background:'#f0fdf4' }}>
                    <div className="dash-card-body">
                      <div style={{ fontSize:'11px', fontWeight:700, color:'#16a34a', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:'10px' }}>
                        <i className="fas fa-calendar-check me-1"></i>Doctor Availability
                      </div>
                      <div style={{ display:'flex', flexWrap:'wrap', gap:'6px', marginBottom:'8px' }}>
                        {DAY_NAMES.map((name, i) => {
                          const dayData = docSchedule.schedule?.find(d => d.day_of_week === i);
                          const active  = dayData?.is_active;
                          return (
                            <span key={name} style={{
                              padding:'4px 10px', borderRadius:'6px', fontSize:'11px', fontWeight:700,
                              background: active ? '#dcfce7' : '#f1f5f9',
                              color:      active ? '#15803d' : '#cbd5e1',
                              border: `1px solid ${active ? '#bbf7d0' : '#e2e8f0'}`,
                            }}>
                              {name.slice(0,3)}
                            </span>
                          );
                        })}
                      </div>
                      <div style={{ fontSize:'12px', color:'#374151' }}>
                        {activeDays.map(d => (
                          <div key={d.day_of_week} style={{ display:'flex', justifyContent:'space-between', padding:'3px 0', borderBottom:'1px solid #d1fae5' }}>
                            <span style={{ fontWeight:600 }}>{DAY_NAMES[d.day_of_week]}</span>
                            <span style={{ color:'#6b7280' }}>{d.start_time?.slice(0,5)} – {d.end_time?.slice(0,5)}</span>
                          </div>
                        ))}
                      </div>
                      {blockedDates.length > 0 && (
                        <div style={{ marginTop:'8px', fontSize:'11px', color:'#dc2626' }}>
                          <i className="fas fa-ban me-1"></i>{blockedDates.length} date{blockedDates.length > 1 ? 's' : ''} blocked by doctor
                        </div>
                      )}
                    </div>
                  </div>
                ) : docSchedule && activeDays.length === 0 ? (
                  <div className="dash-card mb-3" style={{ border:'1px solid #fde68a', background:'#fffbeb', padding:'14px 18px', fontSize:'13px', color:'#92400e' }}>
                    <i className="fas fa-exclamation-triangle me-2"></i>
                    This doctor has not configured their availability yet. You may still submit a request.
                  </div>
                ) : null}

                <div className="dash-card" style={{ border:'1px solid #bfdbfe', background:'#f8fbff' }}>
                  <div className="dash-card-body">
                    <div style={{ fontSize:'11px', fontWeight:700, color:'#4361ee', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:'12px' }}>
                      <i className="fas fa-lightbulb me-1"></i>How This Works
                    </div>
                    {[
                      ['fas fa-paper-plane', 'You submit a request to the doctor'],
                      ['fas fa-user-md',     'The doctor reviews and sets an appointment time'],
                      ['fas fa-bell',        'You receive a notification with the confirmed date & time'],
                      ['fas fa-calendar-check', 'Your appointment appears in your dashboard'],
                    ].map(([icon, text]) => (
                      <div key={icon} style={{ display:'flex', gap:'10px', marginBottom:'10px', alignItems:'flex-start' }}>
                        <i className={icon} style={{ color:'#4361ee', fontSize:'13px', marginTop:'2px', width:'14px' }}></i>
                        <span style={{ fontSize:'13px', color:'#475569' }}>{text}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="col-12 d-flex gap-2">
                <button className="btn btn-outline-secondary" onClick={() => { setStep(1); setError(''); }} style={{ borderRadius:'10px', padding:'11px 24px', fontWeight:600 }}>
                  <i className="fas fa-arrow-left me-1"></i>Back
                </button>
                <button className="btn btn-primary flex-fill" onClick={goToStep3} style={{ borderRadius:'10px', fontWeight:700 }}>
                  Review Request <i className="fas fa-arrow-right ms-2"></i>
                </button>
              </div>
            </div>
          )}

          {/* ══════════════════════════════
              STEP 3 — Review & Submit
          ══════════════════════════════ */}
          {step === 3 && selectedDoctor && (
            <div className="row g-4 justify-content-center">
              <div className="col-lg-7">
                <div className="dash-card">
                  <div style={{ background:'linear-gradient(135deg,#4361ee,#7c3aed)', padding:'24px 28px', borderRadius:'14px 14px 0 0' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:'14px' }}>
                      <div style={{ width:'52px', height:'52px', borderRadius:'14px', background:'rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:'16px', fontWeight:800, color:'#fff' }}>
                        {initials(selectedDoctor.full_name)}
                      </div>
                      <div>
                        <div style={{ color:'rgba(255,255,255,0.75)', fontSize:'11px', textTransform:'uppercase', letterSpacing:'0.7px' }}>Request to</div>
                        <div style={{ color:'#fff', fontWeight:800, fontSize:'17px' }}>Dr. {selectedDoctor.full_name}</div>
                        <div style={{ color:'rgba(255,255,255,0.75)', fontSize:'12px' }}>{selectedDoctor.department__name || 'General Practice'}</div>
                      </div>
                    </div>
                  </div>
                  <div className="dash-card-body">

                    <div className="row g-3 mb-4">
                      {[
                        { icon:'fas fa-user',     label:'Patient',        value: user?.full_name,           color:'#4361ee', bg:'#eff6ff' },
                        { icon:'fas fa-calendar', label:'Preferred Date', value: form.preferred_date ? fmtDate(form.preferred_date) : 'No preference', color:'#7c3aed', bg:'#fdf4ff' },
                        { icon:'fas fa-clock',    label:'Preferred Time', value: form.preferred_time_note,  color:'#0891b2', bg:'#f0f9ff' },
                        { icon:'fas fa-building', label:'Department',     value: selectedDoctor.department__name || 'General Practice', color:'#059669', bg:'#f0fdf4' },
                        form.is_referral ? { icon:'fas fa-share-square', label:'Referral Hospital', value: refHospitalName, color:'#e63946', bg:'#fff1f2' } : null,
                      ].filter(Boolean).map(({ icon, label, value, color, bg }) => (
                        <div key={label} className="col-6">
                          <div style={{ background: bg, borderRadius:'12px', padding:'14px 16px' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:'8px', marginBottom:'5px' }}>
                              <i className={icon} style={{ color, fontSize:'12px' }}></i>
                              <span style={{ fontSize:'10px', fontWeight:700, color:'#adb5bd', textTransform:'uppercase', letterSpacing:'0.5px' }}>{label}</span>
                            </div>
                            <div style={{ fontSize:'13px', fontWeight:600, color:'#1a1a2e' }}>{value}</div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {(() => {
                      const meta = PRIORITY_META[form.priority] || PRIORITY_META.normal;
                      return (
                        <div style={{ display:'flex', alignItems:'center', gap:'10px', padding:'12px 16px', background: meta.bg, border:`1px solid ${meta.border}`, borderRadius:'10px', marginBottom:'16px' }}>
                          <i className={meta.icon} style={{ color: meta.color, fontSize:'15px' }}></i>
                          <div>
                            <div style={{ fontSize:'10px', fontWeight:700, color:'#adb5bd', textTransform:'uppercase', letterSpacing:'0.5px' }}>Priority</div>
                            <div style={{ fontSize:'13px', fontWeight:600, color: meta.color }}>{meta.label}</div>
                          </div>
                        </div>
                      );
                    })()}

                    <div style={{ background:'#f8fafc', borderRadius:'10px', padding:'14px 16px', marginBottom:'20px' }}>
                      <div style={{ fontSize:'10px', fontWeight:700, color:'#adb5bd', textTransform:'uppercase', letterSpacing:'0.5px', marginBottom:'6px' }}>
                        <i className="fas fa-comment-medical me-1"></i>Chief Complaint
                      </div>
                      <div style={{ fontSize:'13px', color:'#475569', lineHeight:'1.6' }}>{form.reason}</div>
                    </div>

                    <div style={{ background:'#fffbeb', border:'1px solid #fde68a', borderRadius:'10px', padding:'12px 16px', marginBottom:'20px', fontSize:'13px', color:'#92400e' }}>
                      <i className="fas fa-info-circle me-2"></i>
                      The doctor will set the confirmed appointment date and time after reviewing this request.
                    </div>

                    <div className="d-flex gap-2">
                      <button className="btn btn-outline-secondary" onClick={() => { setStep(2); setError(''); }} style={{ borderRadius:'10px', padding:'12px 24px', fontWeight:600 }}>
                        <i className="fas fa-edit me-1"></i>Edit
                      </button>
                      <button className="btn btn-primary flex-fill" onClick={handleSubmit} disabled={saving} style={{ borderRadius:'10px', fontWeight:700, padding:'12px' }}>
                        {saving
                          ? <><span className="spinner-border spinner-border-sm me-2"></span>Submitting…</>
                          : <><i className="fas fa-paper-plane me-2"></i>Submit Request</>}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}

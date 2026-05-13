import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layout/DashboardLayout';
import { getNavForUser, getBrandForUser, getRoleBadge } from '../../utils/navItems';

const STATUS_TABS = [
  { key: 'pending',   label: 'Pending',   color: '#d97706', bg: '#fffbeb', icon: 'fas fa-clock' },
  { key: 'scheduled', label: 'Scheduled', color: '#16a34a', bg: '#f0fdf4', icon: 'fas fa-calendar-check' },
  { key: 'declined',  label: 'Declined',  color: '#dc2626', bg: '#fef2f2', icon: 'fas fa-times-circle' },
];

const PRIORITY_BADGE = {
  normal:    { color: '#16a34a', bg: '#f0fdf4', label: 'Normal' },
  urgent:    { color: '#c2410c', bg: '#fff7ed', label: 'Urgent' },
  emergency: { color: '#b91c1c', bg: '#fef2f2', label: 'Emergency' },
};

const fmtDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
};
const fmtDateTime = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
};

export default function DoctorAppointmentRequests() {
  const { apiCall, user } = useAuth();
  const navItems  = getNavForUser(user);
  const brand     = getBrandForUser(user);
  const roleBadge = getRoleBadge(user);

  const [activeTab,    setActiveTab]    = useState('pending');
  const [requests,     setRequests]     = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [selected,     setSelected]     = useState(null);
  const [showModal,    setShowModal]    = useState(false);
  const [modalMode,    setModalMode]    = useState('schedule');

  const [schedForm,    setSchedForm]    = useState({ scheduled_date: '', scheduled_time: '', duration_minutes: 30, notes: '' });
  const [declineReason, setDeclineReason] = useState('');
  const [saving,       setSaving]       = useState(false);
  const [error,        setError]        = useState('');
  const [success,      setSuccess]      = useState('');
  const [slots,        setSlots]        = useState({ available: [], booked: [] });
  const [slotsLoading, setSlotsLoading] = useState(false);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    try {
      const url  = activeTab === 'pending' ? '/doctor/appointment-requests/' : `/doctor/appointment-requests/?status=${activeTab}`;
      const res  = await apiCall(url);
      const data = await res.json();
      setRequests(Array.isArray(data) ? data : []);
    } catch {
      setRequests([]);
    }
    setLoading(false);
  }, [apiCall, activeTab]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  const fetchSlots = useCallback(async (date, duration) => {
    if (!date) return;
    setSlotsLoading(true);
    try {
      const res  = await apiCall(`/doctor/available-slots/?date=${date}&duration=${duration}`);
      const data = await res.json();
      setSlots(data);
    } catch {
      setSlots({ available: [], booked: [] });
    }
    setSlotsLoading(false);
  }, [apiCall]);

  useEffect(() => {
    if (showModal && modalMode === 'schedule' && schedForm.scheduled_date) {
      fetchSlots(schedForm.scheduled_date, schedForm.duration_minutes);
    }
  }, [schedForm.scheduled_date, schedForm.duration_minutes, showModal, modalMode, fetchSlots]);

  const openSchedule = (req) => {
    setSelected(req);
    setModalMode('schedule');
    setSchedForm({
      scheduled_date:  req.preferred_date || '',
      scheduled_time:  '',
      duration_minutes: req.duration_minutes || 30,
      notes:           '',
    });
    setSlots({ available: [], booked: [] });
    setError('');
    setSuccess('');
    setShowModal(true);
  };

  const openDecline = (req) => {
    setSelected(req);
    setModalMode('decline');
    setDeclineReason('');
    setError('');
    setSuccess('');
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setSelected(null); };

  const handleSchedule = async () => {
    if (!schedForm.scheduled_date || !schedForm.scheduled_time) {
      setError('Date and time are required.');
      return;
    }
    setError('');
    setSaving(true);
    try {
      const res  = await apiCall(`/doctor/appointment-requests/${selected.id}/schedule/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schedForm),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('Appointment scheduled. Patient has been notified.');
        fetchRequests();
        setTimeout(closeModal, 1500);
      } else if (res.status === 409) {
        const c = data.conflict;
        setError(`Time conflict with ${c.patient} (${c.starts_at} – ${c.ends_at}). Choose a different slot.`);
      } else {
        setError(data.error || 'Failed to schedule.');
      }
    } catch {
      setError('Network error. Please try again.');
    }
    setSaving(false);
  };

  const handleDecline = async () => {
    setError('');
    setSaving(true);
    try {
      const res  = await apiCall(`/doctor/appointment-requests/${selected.id}/decline/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: declineReason }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('Request declined. Patient has been notified.');
        fetchRequests();
        setTimeout(closeModal, 1500);
      } else {
        setError(data.error || 'Failed to decline.');
      }
    } catch {
      setError('Network error. Please try again.');
    }
    setSaving(false);
  };

  const minDate = new Date().toISOString().split('T')[0];

  const SLOTS_GROUPED = {
    Morning:   schedForm.scheduled_date ? slots.available?.filter(t => t < '12:00') : [],
    Afternoon: schedForm.scheduled_date ? slots.available?.filter(t => t >= '12:00' && t < '16:00') : [],
    Evening:   schedForm.scheduled_date ? slots.available?.filter(t => t >= '16:00') : [],
  };

  const activeTabMeta = STATUS_TABS.find(t => t.key === activeTab);

  return (
    <DashboardLayout navItems={navItems} brandTitle={brand} roleBadge={roleBadge}>

      {/* ── Header ── */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'28px', flexWrap:'wrap', gap:'12px' }}>
        <div>
          <h4 style={{ fontWeight:800, color:'#1a1a2e', margin:0 }}>
            <i className="fas fa-calendar-plus me-2" style={{ color:'#4361ee' }}></i>Appointment Requests
          </h4>
          <p style={{ color:'#6c757d', marginTop:'5px', fontSize:'14px', marginBottom:0 }}>
            Review and schedule patient appointment requests
          </p>
        </div>
        <button className="btn btn-outline-primary btn-sm" style={{ borderRadius:'8px', fontWeight:600 }} onClick={fetchRequests}>
          <i className="fas fa-sync-alt me-1"></i>Refresh
        </button>
      </div>

      {/* ── Status Tabs ── */}
      <div style={{ display:'flex', gap:'8px', marginBottom:'24px', flexWrap:'wrap' }}>
        {STATUS_TABS.map(tab => (
          <button key={tab.key} type="button"
            onClick={() => setActiveTab(tab.key)}
            style={{
              padding:'9px 20px', borderRadius:'10px', fontSize:'13px', fontWeight:600, cursor:'pointer',
              border:`2px solid ${activeTab === tab.key ? tab.color : '#e9ecef'}`,
              background: activeTab === tab.key ? tab.bg : '#fff',
              color: activeTab === tab.key ? tab.color : '#6c757d',
              transition:'all 0.12s',
            }}>
            <i className={`${tab.icon} me-2`}></i>{tab.label}
          </button>
        ))}
      </div>

      {/* ── Requests list ── */}
      {loading ? (
        <div style={{ textAlign:'center', padding:'80px 0' }}>
          <div className="spinner-border text-primary mb-3" style={{ width:'44px', height:'44px' }}></div>
          <div style={{ color:'#6c757d', fontSize:'14px' }}>Loading requests…</div>
        </div>
      ) : requests.length === 0 ? (
        <div className="dash-card" style={{ textAlign:'center', padding:'60px 40px' }}>
          <i className={`${activeTabMeta?.icon}`} style={{ fontSize:'48px', color: activeTabMeta?.color, opacity:0.3, display:'block', marginBottom:'16px' }}></i>
          <div style={{ fontWeight:700, color:'#6c757d', fontSize:'15px' }}>No {activeTab} requests</div>
          <div style={{ fontSize:'13px', color:'#adb5bd', marginTop:'4px' }}>
            {activeTab === 'pending' ? 'New patient requests will appear here.' : `No ${activeTab} requests to show.`}
          </div>
        </div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:'14px' }}>
          {requests.map(req => {
            const priority = PRIORITY_BADGE[req.priority] || PRIORITY_BADGE.normal;
            return (
              <div key={req.id} className="dash-card" style={{ padding:0, overflow:'hidden' }}>
                {/* Priority colour bar */}
                <div style={{ height:'4px', background: priority.color, opacity:0.7 }}></div>
                <div style={{ padding:'20px 24px' }}>
                  <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:'16px', flexWrap:'wrap' }}>

                    {/* Patient info */}
                    <div style={{ flex:1, minWidth:'220px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:'10px', marginBottom:'10px' }}>
                        <div style={{ width:'40px', height:'40px', borderRadius:'10px', background:'#4361ee', display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontWeight:800, fontSize:'13px', flexShrink:0 }}>
                          {(req.patient?.full_name || req.patient_name || '?').split(' ').map(w => w[0]).join('').slice(0,2).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight:700, color:'#1a1a2e', fontSize:'14px' }}>{req.patient?.full_name || req.patient_name}</div>
                          <div style={{ fontSize:'12px', color:'#6c757d' }}>Patient ID: {req.patient?.patient_id || '—'}</div>
                        </div>
                        <span style={{ marginLeft:'auto', padding:'3px 10px', borderRadius:'6px', fontSize:'11px', fontWeight:700, background: priority.bg, color: priority.color }}>
                          {priority.label}
                        </span>
                      </div>

                      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px', fontSize:'13px' }}>
                        {req.preferred_date && (
                          <div>
                            <div style={{ fontSize:'10px', color:'#adb5bd', fontWeight:700, textTransform:'uppercase' }}>Preferred Date</div>
                            <div style={{ fontWeight:600, color:'#1a1a2e' }}>{fmtDate(req.preferred_date)}</div>
                          </div>
                        )}
                        {req.preferred_time_note && req.preferred_time_note !== 'No preference' && (
                          <div>
                            <div style={{ fontSize:'10px', color:'#adb5bd', fontWeight:700, textTransform:'uppercase' }}>Preferred Time</div>
                            <div style={{ fontWeight:600, color:'#1a1a2e' }}>{req.preferred_time_note}</div>
                          </div>
                        )}
                        {req.scheduled_at && (
                          <div className="col-span-2">
                            <div style={{ fontSize:'10px', color:'#16a34a', fontWeight:700, textTransform:'uppercase' }}>Confirmed Time</div>
                            <div style={{ fontWeight:700, color:'#16a34a' }}>{fmtDateTime(req.scheduled_at)}</div>
                          </div>
                        )}
                        <div>
                          <div style={{ fontSize:'10px', color:'#adb5bd', fontWeight:700, textTransform:'uppercase' }}>Requested</div>
                          <div style={{ fontWeight:500, color:'#6c757d' }}>{fmtDate(req.created_at)}</div>
                        </div>
                      </div>

                      {req.reason && (
                        <div style={{ marginTop:'12px', background:'#f8fafc', borderRadius:'8px', padding:'10px 14px', fontSize:'13px', color:'#475569', lineHeight:'1.5', borderLeft:'3px solid #e2e8f0' }}>
                          <span style={{ fontWeight:700, color:'#94a3b8', fontSize:'10px', textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:'4px' }}>
                            <i className="fas fa-comment-medical me-1"></i>Complaint
                          </span>
                          {req.reason}
                        </div>
                      )}
                      {req.decline_reason && (
                        <div style={{ marginTop:'12px', background:'#fef2f2', borderRadius:'8px', padding:'10px 14px', fontSize:'13px', color:'#b91c1c', lineHeight:'1.5', borderLeft:'3px solid #fca5a5' }}>
                          <span style={{ fontWeight:700, fontSize:'10px', textTransform:'uppercase', letterSpacing:'0.5px', display:'block', marginBottom:'4px' }}>
                            <i className="fas fa-times-circle me-1"></i>Decline Reason
                          </span>
                          {req.decline_reason}
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    {activeTab === 'pending' && (
                      <div style={{ display:'flex', flexDirection:'column', gap:'8px', flexShrink:0 }}>
                        <button className="btn btn-primary btn-sm" onClick={() => openSchedule(req)}
                          style={{ borderRadius:'8px', fontWeight:600, fontSize:'13px', padding:'8px 18px' }}>
                          <i className="fas fa-calendar-check me-1"></i>Schedule
                        </button>
                        <button className="btn btn-outline-danger btn-sm" onClick={() => openDecline(req)}
                          style={{ borderRadius:'8px', fontWeight:600, fontSize:'13px', padding:'8px 18px' }}>
                          <i className="fas fa-times me-1"></i>Decline
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Schedule / Decline Modal ── */}
      {showModal && selected && (
        <div style={{ position:'fixed', inset:0, zIndex:1050, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.5)', padding:'16px' }}>
          <div className="dash-card" style={{ width:'100%', maxWidth: modalMode === 'schedule' ? '640px' : '480px', maxHeight:'90vh', overflowY:'auto', padding:0 }}>

            {/* Modal header */}
            <div style={{ background: modalMode === 'schedule' ? 'linear-gradient(135deg,#4361ee,#7c3aed)' : 'linear-gradient(135deg,#dc2626,#b91c1c)', padding:'20px 24px', borderRadius:'14px 14px 0 0', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
              <div>
                <div style={{ color:'rgba(255,255,255,0.75)', fontSize:'11px', textTransform:'uppercase', letterSpacing:'0.7px' }}>
                  {modalMode === 'schedule' ? 'Schedule Appointment' : 'Decline Request'}
                </div>
                <div style={{ color:'#fff', fontWeight:800, fontSize:'16px', marginTop:'2px' }}>
                  {selected.patient?.full_name || selected.patient_name}
                </div>
              </div>
              <button onClick={closeModal} style={{ background:'rgba(255,255,255,0.15)', border:'none', color:'#fff', borderRadius:'8px', width:'32px', height:'32px', cursor:'pointer', fontSize:'16px' }}>×</button>
            </div>

            <div style={{ padding:'24px' }}>
              {error && (
                <div className="alert alert-danger d-flex align-items-center gap-2 mb-3" style={{ borderRadius:'8px', fontSize:'13px' }}>
                  <i className="fas fa-exclamation-triangle"></i>{error}
                </div>
              )}
              {success && (
                <div className="alert alert-success d-flex align-items-center gap-2 mb-3" style={{ borderRadius:'8px', fontSize:'13px' }}>
                  <i className="fas fa-check-circle"></i>{success}
                </div>
              )}

              {/* Patient request summary */}
              {selected.reason && (
                <div style={{ background:'#f8fafc', borderRadius:'10px', padding:'12px 16px', marginBottom:'20px', borderLeft:'3px solid #4361ee', fontSize:'13px', color:'#475569' }}>
                  <span style={{ fontWeight:700, color:'#4361ee', fontSize:'10px', textTransform:'uppercase', display:'block', marginBottom:'4px' }}>Patient&apos;s Complaint</span>
                  {selected.reason}
                </div>
              )}
              {selected.preferred_date && (
                <div style={{ fontSize:'13px', color:'#6c757d', marginBottom:'16px' }}>
                  <i className="fas fa-calendar me-1" style={{ color:'#7c3aed' }}></i>
                  <strong>Preferred date:</strong> {fmtDate(selected.preferred_date)}
                  {selected.preferred_time_note && selected.preferred_time_note !== 'No preference' && (
                    <span className="ms-2 text-muted">· {selected.preferred_time_note}</span>
                  )}
                </div>
              )}

              {/* ── Schedule form ── */}
              {modalMode === 'schedule' && (
                <>
                  <div className="row g-3 mb-3">
                    <div className="col-12">
                      <label className="form-label fw-semibold">Appointment Date <span className="text-danger">*</span></label>
                      <input type="date" className="form-control"
                        value={schedForm.scheduled_date} min={minDate}
                        onChange={e => setSchedForm(f => ({ ...f, scheduled_date: e.target.value, scheduled_time: '' }))} />
                    </div>
                    <div className="col-12">
                      <label className="form-label fw-semibold">Duration</label>
                      <div style={{ display:'flex', gap:'8px', flexWrap:'wrap' }}>
                        {[['15','15 min'],['30','30 min'],['45','45 min'],['60','1 hour']].map(([val, lbl]) => (
                          <button key={val} type="button"
                            onClick={() => setSchedForm(f => ({ ...f, duration_minutes: Number(val), scheduled_time: '' }))}
                            style={{
                              padding:'7px 14px', borderRadius:'8px', fontSize:'13px', cursor:'pointer', border:'2px solid',
                              borderColor: schedForm.duration_minutes === Number(val) ? '#4361ee' : '#e9ecef',
                              background:  schedForm.duration_minutes === Number(val) ? '#eff6ff' : '#fff',
                              color:       schedForm.duration_minutes === Number(val) ? '#4361ee' : '#6c757d',
                              fontWeight:  schedForm.duration_minutes === Number(val) ? 700 : 500,
                            }}>{lbl}</button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Available time slots */}
                  <div className="mb-3">
                    <label className="form-label fw-semibold">
                      Select Time <span className="text-danger">*</span>
                      {slotsLoading && <span className="spinner-border spinner-border-sm ms-2" style={{ width:'12px', height:'12px' }}></span>}
                    </label>
                    {!schedForm.scheduled_date ? (
                      <div style={{ color:'#adb5bd', fontSize:'13px', padding:'12px', background:'#f8fafc', borderRadius:'8px' }}>
                        <i className="fas fa-arrow-up me-1"></i>Select a date first to see available slots
                      </div>
                    ) : slotsLoading ? (
                      <div style={{ color:'#6c757d', fontSize:'13px', padding:'12px' }}>Loading available slots…</div>
                    ) : (
                      <>
                        {Object.entries(SLOTS_GROUPED).map(([period, times]) => times.length > 0 && (
                          <div key={period} style={{ marginBottom:'14px' }}>
                            <div style={{ fontSize:'10px', fontWeight:700, color:'#adb5bd', textTransform:'uppercase', letterSpacing:'0.8px', marginBottom:'8px' }}>
                              <i className={`fas fa-${period === 'Morning' ? 'sun' : period === 'Afternoon' ? 'cloud-sun' : 'moon'} me-1`}></i>{period}
                            </div>
                            <div style={{ display:'flex', flexWrap:'wrap', gap:'7px' }}>
                              {times.map(t => {
                                const sel = schedForm.scheduled_time === t;
                                return (
                                  <button key={t} type="button"
                                    onClick={() => setSchedForm(f => ({ ...f, scheduled_time: t }))}
                                    style={{
                                      padding:'7px 13px', borderRadius:'8px', fontSize:'13px', cursor:'pointer', border:'1.5px solid',
                                      borderColor: sel ? '#4361ee' : '#e9ecef',
                                      background:  sel ? '#4361ee' : '#fff',
                                      color:       sel ? '#fff' : '#475569',
                                      fontWeight:  sel ? 700 : 500,
                                      boxShadow:   sel ? '0 2px 8px rgba(67,97,238,0.25)' : 'none',
                                    }}>{t}</button>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                        {slots.available?.length === 0 && !slotsLoading && (
                          <div style={{ background:'#fef2f2', border:'1px solid #fca5a5', borderRadius:'8px', padding:'12px 16px', fontSize:'13px', color:'#b91c1c' }}>
                            <i className="fas fa-exclamation-triangle me-1"></i>No available slots on this date. Try a different date.
                          </div>
                        )}
                        {slots.booked?.length > 0 && (
                          <div style={{ marginTop:'10px', fontSize:'11px', color:'#adb5bd' }}>
                            <i className="fas fa-lock me-1"></i>{slots.booked.length} slot(s) already booked on this date
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  <div className="mb-4">
                    <label className="form-label fw-semibold">Notes <span style={{ fontWeight:400, color:'#adb5bd' }}>(optional)</span></label>
                    <textarea className="form-control" rows={2}
                      placeholder="Any notes for the patient about this appointment…"
                      value={schedForm.notes}
                      onChange={e => setSchedForm(f => ({ ...f, notes: e.target.value }))} />
                  </div>

                  <div className="d-flex gap-2">
                    <button className="btn btn-outline-secondary" onClick={closeModal} style={{ borderRadius:'8px', fontWeight:600 }}>Cancel</button>
                    <button className="btn btn-primary flex-fill" onClick={handleSchedule} disabled={saving} style={{ borderRadius:'8px', fontWeight:700 }}>
                      {saving
                        ? <><span className="spinner-border spinner-border-sm me-2"></span>Scheduling…</>
                        : <><i className="fas fa-calendar-check me-2"></i>Confirm Schedule</>}
                    </button>
                  </div>
                </>
              )}

              {/* ── Decline form ── */}
              {modalMode === 'decline' && (
                <>
                  <div className="mb-4">
                    <label className="form-label fw-semibold">Reason for Declining <span style={{ fontWeight:400, color:'#adb5bd' }}>(optional)</span></label>
                    <textarea className="form-control" rows={3}
                      placeholder="e.g. Not available on preferred date, please try booking again for a different time…"
                      value={declineReason}
                      onChange={e => setDeclineReason(e.target.value)} />
                  </div>
                  <div className="d-flex gap-2">
                    <button className="btn btn-outline-secondary" onClick={closeModal} style={{ borderRadius:'8px', fontWeight:600 }}>Cancel</button>
                    <button className="btn btn-danger flex-fill" onClick={handleDecline} disabled={saving} style={{ borderRadius:'8px', fontWeight:700 }}>
                      {saving
                        ? <><span className="spinner-border spinner-border-sm me-2"></span>Processing…</>
                        : <><i className="fas fa-times me-2"></i>Decline Request</>}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

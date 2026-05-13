import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layout/DashboardLayout';
import { getNavForUser, getBrandForUser, getRoleBadge } from '../../utils/navItems';

const DAYS = [
  { value: 0, label: 'Monday',    short: 'Mon' },
  { value: 1, label: 'Tuesday',   short: 'Tue' },
  { value: 2, label: 'Wednesday', short: 'Wed' },
  { value: 3, label: 'Thursday',  short: 'Thu' },
  { value: 4, label: 'Friday',    short: 'Fri' },
  { value: 5, label: 'Saturday',  short: 'Sat' },
  { value: 6, label: 'Sunday',    short: 'Sun' },
];

const SLOT_DURATIONS = [
  { value: 15,  label: '15 min' },
  { value: 20,  label: '20 min' },
  { value: 30,  label: '30 min' },
  { value: 45,  label: '45 min' },
  { value: 60,  label: '1 hour' },
];

const DEFAULT_DAY = (dayValue) => ({
  day_of_week:   dayValue,
  start_time:    '08:00',
  end_time:      '17:00',
  slot_duration: 30,
  is_active:     false,
});

const fmtDate = (d) => new Date(d + 'T00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });

export default function DoctorAvailability() {
  const { apiCall, user } = useAuth();
  const navItems  = getNavForUser(user);
  const brand     = getBrandForUser(user);
  const roleBadge = getRoleBadge(user);

  const [schedule,      setSchedule]      = useState(() => DAYS.map(d => DEFAULT_DAY(d.value)));
  const [blockedDates,  setBlockedDates]  = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [saving,        setSaving]        = useState(false);
  const [saveSuccess,   setSaveSuccess]   = useState(false);
  const [saveError,     setSaveError]     = useState('');

  const [newDate,       setNewDate]       = useState('');
  const [newDateReason, setNewDateReason] = useState('');
  const [addingDate,    setAddingDate]    = useState(false);
  const [dateError,     setDateError]     = useState('');

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [schRes, blkRes] = await Promise.all([
          apiCall('/doctor/availability/'),
          apiCall('/doctor/unavailable-dates/'),
        ]);
        if (cancelled) return;
        if (schRes.ok) {
          const data = await schRes.json();
          setSchedule(prev => prev.map(def => {
            const saved = data.find(r => r.day_of_week === def.day_of_week);
            return saved ? { ...def, ...saved } : def;
          }));
        }
        if (blkRes.ok) setBlockedDates(await blkRes.json());
      } catch { /* silent */ }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [apiCall]);

  const updateDay = (dayValue, field, value) => {
    setSchedule(prev => prev.map(d => d.day_of_week === dayValue ? { ...d, [field]: value } : d));
  };

  const toggleDay = (dayValue) => {
    setSchedule(prev => prev.map(d =>
      d.day_of_week === dayValue ? { ...d, is_active: !d.is_active } : d
    ));
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);
    try {
      const res = await apiCall('/doctor/availability/', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(schedule),
      });
      let data = {};
      try { data = await res.json(); } catch { /* non-JSON response */ }
      if (res.ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setSaveError(
          data.error ||
          (data.errors && JSON.stringify(data.errors)) ||
          `Server error (${res.status}). Please try again.`
        );
      }
    } catch (err) {
      setSaveError('Could not reach the server: ' + (err?.message || 'Please try again.'));
    }
    setSaving(false);
  };

  const handleAddBlockedDate = async () => {
    if (!newDate) { setDateError('Please select a date.'); return; }
    setDateError('');
    setAddingDate(true);
    try {
      const res  = await apiCall('/doctor/unavailable-dates/', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ date: newDate, reason: newDateReason }),
      });
      const data = await res.json();
      if (res.ok) {
        setBlockedDates(prev => [...prev, data]);
        setNewDate('');
        setNewDateReason('');
      } else {
        setDateError(data.date?.[0] || data.error || 'Could not add date.');
      }
    } catch {
      setDateError('Network error.');
    }
    setAddingDate(false);
  };

  const handleDeleteBlockedDate = async (id) => {
    try {
      const res = await apiCall(`/doctor/unavailable-dates/${id}/delete/`, { method: 'DELETE' });
      if (res.ok) setBlockedDates(prev => prev.filter(d => d.id !== id));
    } catch { /* silent */ }
  };

  const activeDays  = schedule.filter(d => d.is_active).length;
  const minDate     = new Date().toISOString().split('T')[0];

  return (
    <DashboardLayout navItems={navItems} brandTitle={brand} roleBadge={roleBadge}>

      {/* ── Header ── */}
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:'28px', flexWrap:'wrap', gap:'12px' }}>
        <div>
          <h4 style={{ fontWeight:800, color:'#1a1a2e', margin:0 }}>
            <i className="fas fa-clock me-2" style={{ color:'#4361ee' }}></i>My Availability
          </h4>
          <p style={{ color:'#6c757d', marginTop:'5px', fontSize:'14px', marginBottom:0 }}>
            Set the days and times you accept patient appointment requests
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={handleSave}
          disabled={saving}
          style={{ borderRadius:'10px', fontWeight:700, padding:'10px 28px' }}
        >
          {saving
            ? <><span className="spinner-border spinner-border-sm me-2"></span>Saving…</>
            : <><i className="fas fa-save me-2"></i>Save Schedule</>}
        </button>
      </div>

      {saveSuccess && (
        <div className="alert alert-success d-flex align-items-center gap-2 mb-4" style={{ borderRadius:'10px', fontSize:'13px' }}>
          <i className="fas fa-check-circle"></i>Schedule saved successfully. Patients can now see your availability.
        </div>
      )}
      {saveError && (
        <div className="alert alert-danger d-flex align-items-center gap-2 mb-4" style={{ borderRadius:'10px', fontSize:'13px' }}>
          <i className="fas fa-exclamation-triangle"></i>{saveError}
        </div>
      )}

      {loading ? (
        <div style={{ textAlign:'center', padding:'80px 0' }}>
          <div className="spinner-border text-primary mb-3" style={{ width:'44px', height:'44px' }}></div>
          <div style={{ color:'#6c757d', fontSize:'14px' }}>Loading schedule…</div>
        </div>
      ) : (
        <div className="row g-4">

          {/* ── LEFT: Weekly Schedule ── */}
          <div className="col-lg-8">
            <div className="dash-card">
              <div className="dash-card-header">
                <h6 style={{ margin:0 }}><i className="fas fa-calendar-week me-2"></i>Weekly Schedule</h6>
                <span style={{ fontSize:'12px', color:'#6c757d', fontWeight:500 }}>
                  {activeDays} of 7 days active
                </span>
              </div>
              <div className="dash-card-body" style={{ padding:'8px 0' }}>
                {DAYS.map((day, i) => {
                  const row = schedule.find(s => s.day_of_week === day.value) || DEFAULT_DAY(day.value);
                  const isWeekend = day.value >= 5;
                  return (
                    <div
                      key={day.value}
                      style={{
                        display:'flex', alignItems:'center', gap:'16px',
                        padding:'16px 24px',
                        borderBottom: i < DAYS.length - 1 ? '1px solid #f1f5f9' : 'none',
                        background: row.is_active ? '#fafbff' : 'transparent',
                        transition:'background 0.15s',
                      }}
                    >
                      {/* Day toggle */}
                      <div style={{ width:'120px', flexShrink:0, display:'flex', alignItems:'center', gap:'10px' }}>
                        {/* Toggle switch */}
                        <div
                          onClick={() => toggleDay(day.value)}
                          style={{
                            width:'42px', height:'22px', borderRadius:'11px', cursor:'pointer', flexShrink:0,
                            background: row.is_active ? '#4361ee' : '#dee2e6',
                            position:'relative', transition:'background 0.2s',
                          }}
                        >
                          <div style={{
                            position:'absolute', top:'3px',
                            left: row.is_active ? '23px' : '3px',
                            width:'16px', height:'16px', borderRadius:'50%',
                            background:'#fff', transition:'left 0.2s',
                            boxShadow:'0 1px 3px rgba(0,0,0,0.2)',
                          }}></div>
                        </div>
                        <div>
                          <div style={{ fontWeight: row.is_active ? 700 : 500, color: row.is_active ? '#1a1a2e' : '#adb5bd', fontSize:'14px' }}>
                            {day.label}
                          </div>
                          {isWeekend && (
                            <div style={{ fontSize:'10px', color:'#adb5bd', fontWeight:500 }}>Weekend</div>
                          )}
                        </div>
                      </div>

                      {/* Time range + slot duration */}
                      {row.is_active ? (
                        <div style={{ display:'flex', alignItems:'center', gap:'12px', flex:1, flexWrap:'wrap' }}>
                          <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                            <label style={{ fontSize:'12px', color:'#6c757d', fontWeight:600, whiteSpace:'nowrap' }}>Start</label>
                            <input
                              type="time"
                              className="form-control form-control-sm"
                              value={row.start_time}
                              onChange={e => updateDay(day.value, 'start_time', e.target.value)}
                              style={{ width:'110px', fontSize:'13px' }}
                            />
                          </div>
                          <div style={{ color:'#adb5bd' }}>–</div>
                          <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                            <label style={{ fontSize:'12px', color:'#6c757d', fontWeight:600, whiteSpace:'nowrap' }}>End</label>
                            <input
                              type="time"
                              className="form-control form-control-sm"
                              value={row.end_time}
                              onChange={e => updateDay(day.value, 'end_time', e.target.value)}
                              style={{ width:'110px', fontSize:'13px' }}
                            />
                          </div>
                          <div style={{ display:'flex', alignItems:'center', gap:'8px', marginLeft:'8px' }}>
                            <label style={{ fontSize:'12px', color:'#6c757d', fontWeight:600, whiteSpace:'nowrap' }}>Slot</label>
                            <select
                              className="form-select form-select-sm"
                              value={row.slot_duration}
                              onChange={e => updateDay(day.value, 'slot_duration', Number(e.target.value))}
                              style={{ width:'95px', fontSize:'13px' }}
                            >
                              {SLOT_DURATIONS.map(s => (
                                <option key={s.value} value={s.value}>{s.label}</option>
                              ))}
                            </select>
                          </div>
                          {/* Slot count preview */}
                          {row.start_time && row.end_time && row.start_time < row.end_time && (() => {
                            const [sh, sm] = row.start_time.split(':').map(Number);
                            const [eh, em] = row.end_time.split(':').map(Number);
                            const totalMins = (eh * 60 + em) - (sh * 60 + sm);
                            const slots = Math.floor(totalMins / row.slot_duration);
                            return (
                              <span style={{ fontSize:'11px', color:'#4361ee', fontWeight:600, background:'#eff6ff', padding:'3px 10px', borderRadius:'6px', whiteSpace:'nowrap' }}>
                                {slots} slot{slots !== 1 ? 's' : ''}
                              </span>
                            );
                          })()}
                        </div>
                      ) : (
                        <div style={{ color:'#ced4da', fontSize:'13px', fontStyle:'italic' }}>
                          Not available — toggle to enable
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* ── RIGHT: Info + Blocked Dates ── */}
          <div className="col-lg-4">

            {/* Info card */}
            <div className="dash-card mb-4" style={{ border:'1px solid #bfdbfe', background:'#f8fbff' }}>
              <div className="dash-card-body">
                <div style={{ fontSize:'11px', fontWeight:700, color:'#4361ee', textTransform:'uppercase', letterSpacing:'0.6px', marginBottom:'12px' }}>
                  <i className="fas fa-info-circle me-1"></i>How It Works
                </div>
                {[
                  ['fas fa-toggle-on',      'Toggle days on/off to set which days you work'],
                  ['fas fa-clock',          'Set start & end time for each active day'],
                  ['fas fa-th',             'Slot duration controls appointment intervals'],
                  ['fas fa-calendar-times', 'Block specific dates for leave or holidays'],
                  ['fas fa-lock',           'Patients can only request on your available days'],
                ].map(([icon, text]) => (
                  <div key={icon} style={{ display:'flex', gap:'10px', marginBottom:'10px', alignItems:'flex-start' }}>
                    <i className={icon} style={{ color:'#4361ee', fontSize:'13px', marginTop:'2px', width:'14px' }}></i>
                    <span style={{ fontSize:'13px', color:'#475569' }}>{text}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Blocked dates */}
            <div className="dash-card">
              <div className="dash-card-header">
                <h6 style={{ margin:0, fontSize:'13px' }}><i className="fas fa-calendar-times me-2" style={{ color:'#dc2626' }}></i>Blocked Dates</h6>
                <span style={{ fontSize:'11px', color:'#adb5bd' }}>{blockedDates.length} date{blockedDates.length !== 1 ? 's' : ''}</span>
              </div>
              <div className="dash-card-body">
                {/* Add new blocked date */}
                <div style={{ marginBottom:'16px' }}>
                  <label className="form-label" style={{ fontSize:'12px', fontWeight:600 }}>Block a Date</label>
                  <input
                    type="date"
                    className="form-control form-control-sm mb-2"
                    value={newDate}
                    min={minDate}
                    onChange={e => setNewDate(e.target.value)}
                  />
                  <input
                    type="text"
                    className="form-control form-control-sm mb-2"
                    placeholder="Reason (optional)"
                    value={newDateReason}
                    onChange={e => setNewDateReason(e.target.value)}
                  />
                  {dateError && (
                    <div style={{ fontSize:'12px', color:'#dc2626', marginBottom:'6px' }}>
                      <i className="fas fa-exclamation-circle me-1"></i>{dateError}
                    </div>
                  )}
                  <button
                    className="btn btn-sm btn-outline-danger w-100"
                    onClick={handleAddBlockedDate}
                    disabled={addingDate}
                    style={{ borderRadius:'8px', fontWeight:600 }}
                  >
                    {addingDate
                      ? <span className="spinner-border spinner-border-sm"></span>
                      : <><i className="fas fa-ban me-1"></i>Block This Date</>}
                  </button>
                </div>

                {/* Existing blocked dates */}
                {blockedDates.length === 0 ? (
                  <div style={{ textAlign:'center', padding:'16px 0', color:'#adb5bd', fontSize:'13px' }}>
                    <i className="fas fa-check-circle" style={{ color:'#22c55e', fontSize:'24px', display:'block', marginBottom:'8px' }}></i>
                    No blocked dates
                  </div>
                ) : (
                  <div style={{ display:'flex', flexDirection:'column', gap:'8px' }}>
                    {blockedDates.map(bd => (
                      <div key={bd.id} style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', background:'#fef2f2', border:'1px solid #fecaca', borderRadius:'8px', padding:'10px 12px', gap:'8px' }}>
                        <div style={{ minWidth:0 }}>
                          <div style={{ fontWeight:700, color:'#b91c1c', fontSize:'13px' }}>
                            <i className="fas fa-ban me-1" style={{ fontSize:'10px' }}></i>
                            {fmtDate(bd.date)}
                          </div>
                          {bd.reason && (
                            <div style={{ fontSize:'11px', color:'#dc2626', marginTop:'2px' }}>{bd.reason}</div>
                          )}
                        </div>
                        <button
                          onClick={() => handleDeleteBlockedDate(bd.id)}
                          style={{ background:'none', border:'none', color:'#dc2626', cursor:'pointer', fontSize:'16px', padding:'0', flexShrink:0, lineHeight:1 }}
                          title="Remove"
                        >×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

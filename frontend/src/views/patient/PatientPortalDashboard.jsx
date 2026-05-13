import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layout/DashboardLayout';
import { getNavForUser, getBrandForUser, getRoleBadge } from '../../utils/navItems';

const STATUS_COLOR = {
  pending:         { bg: '#fffbeb', text: '#92400e', border: '#fde68a' },
  scheduled:       { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  declined:        { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' },
  checked_in:      { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0' },
  in_consultation: { bg: '#fdf4ff', text: '#7e22ce', border: '#e9d5ff' },
  completed:       { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0' },
  cancelled:       { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' },
  no_show:         { bg: '#fffbeb', text: '#92400e', border: '#fde68a' },
};

const NOTIF_ICON = {
  appointment_confirmed: { icon: 'fas fa-calendar-check', color: '#16a34a', bg: '#f0fdf4' },
  appointment_declined:  { icon: 'fas fa-times-circle',   color: '#dc2626', bg: '#fef2f2' },
  appointment_cancelled: { icon: 'fas fa-ban',             color: '#d97706', bg: '#fffbeb' },
  general:               { icon: 'fas fa-bell',            color: '#4361ee', bg: '#eff6ff' },
};

const PRIORITY_BADGE = {
  normal:    { bg: '#f1f5f9', text: '#475569' },
  urgent:    { bg: '#fff7ed', text: '#c2410c' },
  emergency: { bg: '#fef2f2', text: '#b91c1c' },
};

const fmt = (dt, opts) => dt ? new Date(dt).toLocaleString('en-GB', opts) : '—';

export default function PatientPortalDashboard() {
  const { apiCall, user } = useAuth();

  const [profile,       setProfile]       = useState(null);
  const [appointments,  setAppointments]  = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [activeTab,     setActiveTab]     = useState('upcoming');
  const [cancellingId,  setCancellingId]  = useState(null);
  const [showCancelModal,  setShowCancelModal]  = useState(false);
  const [cancelTarget,     setCancelTarget]     = useState(null);
  const [showNotifPanel,   setShowNotifPanel]   = useState(false);

  useEffect(() => {
    let mounted = true;
    Promise.all([
      apiCall('/portal/profile/'),
      apiCall('/portal/appointments/'),
      apiCall('/portal/notifications/'),
    ])
      .then(async ([pRes, aRes, nRes]) => {
        if (!mounted) return;
        if (pRes.ok) setProfile(await pRes.json());
        if (aRes.ok) setAppointments(await aRes.json());
        if (nRes.ok) setNotifications(await nRes.json());
        setLoading(false);
      })
      .catch((err) => { console.error('Portal fetch:', err); if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [apiCall]);

  const markAllRead = async () => {
    await apiCall('/portal/notifications/read-all/', { method: 'PATCH' });
    setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
  };

  const markRead = async (id) => {
    await apiCall(`/portal/notifications/${id}/read/`, { method: 'PATCH' });
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
  };

  const confirmCancel = (appt) => { setCancelTarget(appt); setShowCancelModal(true); };

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setCancellingId(cancelTarget.id);
    setShowCancelModal(false);
    try {
      const res = await apiCall(`/portal/appointments/${cancelTarget.id}/cancel/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reason: 'Cancelled by patient' }),
      });
      if (res.ok) setAppointments(prev => prev.map(a => a.id === cancelTarget.id ? { ...a, status: 'cancelled' } : a));
    } catch (err) { console.error('Cancel error:', err); }
    setCancellingId(null);
    setCancelTarget(null);
  };

  const now        = new Date();
  const pending    = appointments.filter(a => a.status === 'pending');
  const upcoming   = appointments.filter(a => ['scheduled', 'checked_in', 'in_consultation'].includes(a.status) && new Date(a.scheduled_at) >= now);
  const past       = appointments.filter(a => a.status === 'completed' || (new Date(a.scheduled_at) < now && !['cancelled','no_show'].includes(a.status)));
  const cancelled  = appointments.filter(a => ['cancelled', 'no_show', 'declined'].includes(a.status));
  const display    = activeTab === 'pending' ? pending : activeTab === 'upcoming' ? upcoming : activeTab === 'past' ? past : cancelled;
  const nextAppt   = upcoming[0];
  const unreadCount = notifications.filter(n => !n.is_read).length;

  const navItems  = getNavForUser(user);
  const brand     = getBrandForUser(user);
  const roleBadge = getRoleBadge(user);

  const StatCard = ({ icon, iconBg, iconColor, value, label }) => (
    <div className="dash-card" style={{ padding: '20px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <i className={icon} style={{ color: iconColor, fontSize: '18px' }}></i>
        </div>
        <div>
          <div style={{ fontSize: '28px', fontWeight: 800, color: '#1a1a2e', lineHeight: 1 }}>{value}</div>
          <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '3px', fontWeight: 500 }}>{label}</div>
        </div>
      </div>
    </div>
  );

  return (
    <DashboardLayout navItems={navItems} brandTitle={brand} roleBadge={roleBadge}>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', gap: '16px' }}>
          <div className="spinner-border text-primary" style={{ width: '48px', height: '48px' }}></div>
          <span style={{ color: '#6c757d', fontSize: '15px' }}>Loading your health record…</span>
        </div>
      ) : (
        <>
          {/* ── Hero Banner ── */}
          <div style={{
            background: 'linear-gradient(135deg, #4361ee 0%, #7c3aed 100%)',
            borderRadius: '16px', padding: '28px 32px', marginBottom: '24px', color: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px',
            boxShadow: '0 8px 32px rgba(67,97,238,0.25)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'rgba(255,255,255,0.2)', border: '3px solid rgba(255,255,255,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '22px', fontWeight: 800, color: '#fff' }}>
                {(profile?.first_name?.[0] || user?.full_name?.[0] || 'P').toUpperCase()}
              </div>
              <div>
                <div style={{ fontSize: '12px', opacity: 0.8, marginBottom: '2px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>Welcome back</div>
                <h2 style={{ margin: 0, fontWeight: 800, fontSize: '22px' }}>{profile?.full_name || user?.full_name}</h2>
                <div style={{ display: 'flex', gap: '20px', marginTop: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '13px', opacity: 0.85 }}>
                    <i className="fas fa-hospital me-1"></i>{profile?.hospital_name || '—'}
                  </span>
                  {profile?.patient_id && (
                    <span style={{ fontSize: '13px', opacity: 0.85, fontFamily: 'monospace', background: 'rgba(255,255,255,0.15)', padding: '2px 10px', borderRadius: '6px' }}>
                      <i className="fas fa-id-card me-1"></i>{profile.patient_id}
                    </span>
                  )}
                  {profile?.blood_type && profile.blood_type !== 'unknown' && (
                    <span style={{ fontSize: '13px', opacity: 0.85 }}>
                      <i className="fas fa-tint me-1"></i>{profile.blood_type_display || profile.blood_type}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Notification bell */}
              <button
                onClick={() => setShowNotifPanel(v => !v)}
                style={{ position:'relative', background:'rgba(255,255,255,0.15)', border:'1px solid rgba(255,255,255,0.3)', borderRadius:'12px', padding:'10px 14px', cursor:'pointer', color:'#fff', fontSize:'16px' }}
              >
                <i className="fas fa-bell"></i>
                {unreadCount > 0 && (
                  <span style={{ position:'absolute', top:'-6px', right:'-6px', background:'#ef4444', color:'#fff', borderRadius:'50%', width:'18px', height:'18px', fontSize:'10px', fontWeight:800, display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </button>
              <Link to="/patient/book" style={{
                background: '#fff', color: '#4361ee', borderRadius: '12px',
                padding: '12px 22px', fontWeight: 700, fontSize: '14px',
                textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '8px',
                flexShrink: 0, boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              }}>
                <i className="fas fa-calendar-plus"></i>Request Appointment
              </Link>
            </div>
          </div>

          {/* ── Notification Panel ── */}
          {showNotifPanel && (
            <div className="dash-card mb-4" style={{ overflow:'hidden' }}>
              <div className="dash-card-header">
                <h6 style={{ margin:0 }}><i className="fas fa-bell me-2" style={{ color:'#4361ee' }}></i>Notifications</h6>
                <div style={{ display:'flex', gap:'8px', alignItems:'center' }}>
                  {unreadCount > 0 && (
                    <button onClick={markAllRead} style={{ background:'none', border:'none', color:'#4361ee', fontSize:'12px', fontWeight:600, cursor:'pointer', padding:0 }}>Mark all read</button>
                  )}
                  <button onClick={() => setShowNotifPanel(false)} style={{ background:'none', border:'none', color:'#adb5bd', cursor:'pointer', fontSize:'16px' }}>×</button>
                </div>
              </div>
              {notifications.length === 0 ? (
                <div style={{ textAlign:'center', padding:'40px', color:'#adb5bd', fontSize:'14px' }}>
                  <i className="fas fa-bell-slash" style={{ fontSize:'32px', display:'block', marginBottom:'10px', opacity:0.4 }}></i>
                  No notifications yet
                </div>
              ) : (
                <div style={{ maxHeight:'360px', overflowY:'auto' }}>
                  {notifications.map(notif => {
                    const meta = NOTIF_ICON[notif.type] || NOTIF_ICON.general;
                    return (
                      <div key={notif.id}
                        onClick={() => markRead(notif.id)}
                        style={{
                          display:'flex', gap:'14px', padding:'16px 24px', cursor:'pointer',
                          background: notif.is_read ? 'transparent' : '#f8fbff',
                          borderBottom:'1px solid #f1f5f9',
                          transition:'background 0.1s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f0f4ff'}
                        onMouseLeave={e => e.currentTarget.style.background = notif.is_read ? 'transparent' : '#f8fbff'}
                      >
                        <div style={{ width:'38px', height:'38px', borderRadius:'10px', background: meta.bg, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          <i className={meta.icon} style={{ color: meta.color, fontSize:'15px' }}></i>
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:'8px', justifyContent:'space-between', flexWrap:'wrap' }}>
                            <span style={{ fontWeight: notif.is_read ? 600 : 800, color:'#1a1a2e', fontSize:'13px' }}>{notif.title}</span>
                            {!notif.is_read && <span style={{ width:'7px', height:'7px', borderRadius:'50%', background:'#4361ee', flexShrink:0, display:'inline-block' }}></span>}
                          </div>
                          <div style={{ fontSize:'12px', color:'#6c757d', marginTop:'3px', lineHeight:'1.5' }}>{notif.message}</div>
                          {notif.scheduled_at && (
                            <div style={{ marginTop:'6px', background:'#eff6ff', borderRadius:'6px', padding:'6px 10px', fontSize:'12px', color:'#1d4ed8', fontWeight:600 }}>
                              <i className="fas fa-calendar-check me-1"></i>
                              Appointment: {new Date(notif.scheduled_at).toLocaleString('en-GB', { weekday:'short', day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}
                            </div>
                          )}
                          <div style={{ fontSize:'11px', color:'#adb5bd', marginTop:'5px' }}>
                            {new Date(notif.created_at).toLocaleDateString('en-GB', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── Next Appointment Alert ── */}
          {nextAppt && (
            <div style={{
              background: '#fff', borderRadius: '12px', padding: '18px 24px', marginBottom: '24px',
              border: '1px solid #bfdbfe', borderLeft: '4px solid #4361ee',
              display: 'flex', alignItems: 'center', gap: '16px',
              boxShadow: '0 2px 8px rgba(67,97,238,0.08)',
            }}>
              <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className="fas fa-bell" style={{ color: '#4361ee', fontSize: '17px' }}></i>
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: '10px', fontWeight: 700, color: '#4361ee', textTransform: 'uppercase', letterSpacing: '0.7px', marginBottom: '3px' }}>
                  Upcoming Appointment
                </div>
                <div style={{ fontWeight: 700, color: '#1a1a2e', fontSize: '15px' }}>Dr. {nextAppt.doctor_name}</div>
                <div style={{ fontSize: '13px', color: '#6c757d', marginTop: '2px' }}>
                  <i className="fas fa-calendar-alt me-1"></i>
                  {fmt(nextAppt.scheduled_at, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                  {nextAppt.department_name && <span style={{ marginLeft: '14px' }}><i className="fas fa-building me-1"></i>{nextAppt.department_name}</span>}
                </div>
              </div>
              <button
                onClick={() => confirmCancel(nextAppt)}
                disabled={cancellingId === nextAppt.id}
                className="btn btn-sm btn-outline-danger"
                style={{ borderRadius: '8px', fontSize: '12px', flexShrink: 0 }}
              >
                {cancellingId === nextAppt.id ? <span className="spinner-border spinner-border-sm"></span> : 'Cancel'}
              </button>
            </div>
          )}

          {/* ── Stats Row ── */}
          <div className="row g-3 mb-4">
            {[
              { icon: 'fas fa-calendar-check',  iconBg: '#eff6ff', iconColor: '#4361ee', value: upcoming.length,      label: 'Upcoming Appointments' },
              { icon: 'fas fa-check-circle',     iconBg: '#f0fdf4', iconColor: '#16a34a', value: past.length,          label: 'Completed Visits' },
              { icon: 'fas fa-times-circle',     iconBg: '#fef2f2', iconColor: '#dc2626', value: cancelled.length,     label: 'Cancelled' },
              { icon: 'fas fa-notes-medical',    iconBg: '#fdf4ff', iconColor: '#7c3aed', value: appointments.length,  label: 'Total Appointments' },
            ].map(s => (
              <div key={s.label} className="col-6 col-lg-3">
                <StatCard {...s} />
              </div>
            ))}
          </div>

          {/* ── Appointments Panel ── */}
          <div className="dash-card mb-4" style={{ overflow: 'hidden' }}>
            <div className="dash-card-header" style={{ paddingBottom: 0, borderBottom: 'none' }}>
              <h6 style={{ margin: 0 }}><i className="fas fa-calendar-alt me-2"></i>My Appointments</h6>
              <Link to="/patient/book" className="btn btn-primary btn-sm" style={{ borderRadius: '8px', fontSize: '12px', fontWeight: 600 }}>
                <i className="fas fa-plus me-1"></i>Book New
              </Link>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', borderBottom: '1px solid #e9ecef', paddingTop: '4px', overflowX:'auto' }}>
              {[
                { key: 'pending',   label: 'Pending',   count: pending.length,   icon: 'fas fa-hourglass-half', activeColor:'#d97706' },
                { key: 'upcoming',  label: 'Confirmed', count: upcoming.length,  icon: 'fas fa-calendar-check', activeColor:'#4361ee' },
                { key: 'past',      label: 'Past',      count: past.length,      icon: 'fas fa-history',        activeColor:'#4361ee' },
                { key: 'cancelled', label: 'Cancelled', count: cancelled.length, icon: 'fas fa-ban',            activeColor:'#dc2626' },
              ].map(t => (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
                  style={{
                    padding: '12px 20px', border: 'none', background: 'none', cursor: 'pointer', whiteSpace:'nowrap',
                    fontWeight: activeTab === t.key ? 700 : 500,
                    color: activeTab === t.key ? (t.activeColor || '#4361ee') : '#6c757d',
                    borderBottom: activeTab === t.key ? `2px solid ${t.activeColor || '#4361ee'}` : '2px solid transparent',
                    fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px',
                    transition: 'all 0.15s',
                  }}
                >
                  <i className={t.icon}></i>
                  {t.label}
                  <span style={{
                    background: activeTab === t.key ? (t.activeColor || '#4361ee') : '#e9ecef',
                    color: activeTab === t.key ? '#fff' : '#6c757d',
                    borderRadius: '20px', padding: '1px 8px', fontSize: '11px', fontWeight: 700,
                  }}>{t.count}</span>
                </button>
              ))}
            </div>

            <div className="dash-card-body" style={{ padding: 0 }}>
              {display.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '56px 24px', color: '#adb5bd' }}>
                  <i className="fas fa-calendar-times" style={{ fontSize: '44px', marginBottom: '14px', display: 'block', opacity: 0.5 }}></i>
                  <div style={{ fontWeight: 600, fontSize: '15px', color: '#6c757d', marginBottom: '6px' }}>No {activeTab} appointments</div>
                  {(activeTab === 'upcoming' || activeTab === 'pending') && (
                    <Link to="/patient/book" style={{ color: '#4361ee', fontSize: '13px', fontWeight: 600 }}>
                      <i className="fas fa-calendar-plus me-1"></i>Request an appointment →
                    </Link>
                  )}
                </div>
              ) : (
                <div style={{ padding: '8px 0' }}>
                  {display.map((appt, idx) => {
                    const sc = STATUS_COLOR[appt.status] || STATUS_COLOR.scheduled;
                    const pr = PRIORITY_BADGE[appt.priority] || PRIORITY_BADGE.normal;
                    return (
                      <div key={appt.id} style={{
                        display: 'flex', alignItems: 'flex-start', gap: '16px',
                        padding: '16px 24px',
                        borderBottom: idx < display.length - 1 ? '1px solid #f1f5f9' : 'none',
                        transition: 'background 0.1s',
                      }}
                        onMouseEnter={e => e.currentTarget.style.background = '#fafbff'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                      >
                        {/* Icon */}
                        <div style={{ width: '42px', height: '42px', borderRadius: '10px', background: sc.bg, border: `1px solid ${sc.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                          <i className="fas fa-stethoscope" style={{ color: sc.text, fontSize: '15px' }}></i>
                        </div>
                        {/* Info */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
                            <span style={{ fontWeight: 700, color: '#1a1a2e', fontSize: '14px' }}>Dr. {appt.doctor_name || '—'}</span>
                            <span style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, borderRadius: '6px', padding: '2px 8px', fontSize: '11px', fontWeight: 600 }}>
                              {appt.status_display || appt.status}
                            </span>
                            {appt.priority !== 'normal' && (
                              <span style={{ background: pr.bg, color: pr.text, borderRadius: '6px', padding: '2px 8px', fontSize: '11px', fontWeight: 600 }}>
                                {appt.priority}
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '12px', color: '#6c757d', display: 'flex', gap: '14px', flexWrap: 'wrap' }}>
                            {appt.status === 'pending' ? (
                              <>
                                {appt.preferred_date && <span><i className="fas fa-calendar me-1"></i>Preferred: {new Date(appt.preferred_date + 'T00:00').toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' })}</span>}
                                {appt.preferred_time_note && appt.preferred_time_note !== 'No preference' && <span><i className="fas fa-clock me-1"></i>{appt.preferred_time_note}</span>}
                                <span style={{ color:'#d97706', fontWeight:600 }}><i className="fas fa-hourglass-half me-1"></i>Awaiting doctor confirmation</span>
                              </>
                            ) : (
                              <>
                                <span><i className="fas fa-calendar me-1"></i>{fmt(appt.scheduled_at, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                <span><i className="fas fa-clock me-1"></i>{fmt(appt.scheduled_at, { hour: '2-digit', minute: '2-digit' })}</span>
                                {appt.department && <span><i className="fas fa-building me-1"></i>{appt.department}</span>}
                                {appt.duration_minutes && <span><i className="fas fa-hourglass-half me-1"></i>{appt.duration_minutes} min</span>}
                              </>
                            )}
                          </div>
                          {appt.reason && (
                            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '4px', fontStyle: 'italic' }}>
                              <i className="fas fa-comment-medical me-1"></i>{appt.reason}
                            </div>
                          )}
                        </div>
                        {/* Cancel */}
                        {['scheduled', 'pending'].includes(appt.status) && (
                          <button
                            onClick={() => confirmCancel(appt)}
                            disabled={cancellingId === appt.id}
                            className="btn btn-sm btn-outline-danger"
                            style={{ borderRadius: '8px', fontSize: '11px', flexShrink: 0, fontWeight: 600 }}
                          >
                            {cancellingId === appt.id ? <span className="spinner-border spinner-border-sm"></span> : <><i className="fas fa-times me-1"></i>Cancel</>}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Profile Card ── */}
          {profile && (
            <div className="dash-card">
              <div className="dash-card-header">
                <h6 style={{ margin: 0 }}><i className="fas fa-user-circle me-2"></i>My Health Profile</h6>
              </div>
              <div className="dash-card-body">
                <div className="row g-3">
                  {[
                    { label: 'Patient ID',          value: profile.patient_id,                          mono: true },
                    { label: 'Date of Birth',        value: profile.date_of_birth },
                    { label: 'Gender',               value: profile.gender_display || profile.gender },
                    { label: 'Blood Type',           value: profile.blood_type_display || profile.blood_type },
                    { label: 'Phone',                value: profile.phone },
                    { label: 'Email',                value: profile.email },
                    { label: 'Address',              value: profile.address,                             col: 'col-md-6' },
                    { label: 'Allergies',            value: profile.allergies || '—',                   col: 'col-md-6' },
                    { label: 'Chronic Conditions',   value: profile.chronic_conditions || '—',          col: 'col-md-6' },
                    { label: 'Emergency Contact',    value: profile.emergency_contact_name ? `${profile.emergency_contact_name} (${profile.emergency_contact_phone || '—'})` : '—', col: 'col-md-6' },
                  ].map(({ label, value, mono, col }) => (
                    <div key={label} className={col || 'col-md-3 col-6'}>
                      <div style={{ fontSize: '10px', fontWeight: 700, color: '#adb5bd', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '4px' }}>{label}</div>
                      <div style={{ fontSize: '13px', fontWeight: 500, color: '#1a1a2e', fontFamily: mono ? '"Courier New", monospace' : 'inherit' }}>
                        {value || <span style={{ color: '#ced4da', fontStyle: 'italic', fontWeight: 400 }}>—</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* ── Cancel Confirmation Modal ── */}
      {showCancelModal && cancelTarget && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1055 }} onClick={() => setShowCancelModal(false)}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-content" style={{ borderRadius: '16px', border: 'none' }}>
              <div className="modal-body text-center" style={{ padding: '36px 28px 20px' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: '#fef2f2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
                  <i className="fas fa-calendar-times" style={{ color: '#dc2626', fontSize: '24px' }}></i>
                </div>
                <h5 style={{ fontWeight: 700 }}>Cancel Appointment?</h5>
                <p style={{ color: '#6c757d', fontSize: '14px', margin: '8px 0 0' }}>
                  Appointment with <strong>Dr. {cancelTarget.doctor_name}</strong> on{' '}
                  <strong>{fmt(cancelTarget.scheduled_at, { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</strong>
                </p>
              </div>
              <div className="modal-footer border-0 justify-content-center pb-4 gap-2">
                <button className="btn btn-outline-secondary px-4" style={{ borderRadius: '8px' }} onClick={() => setShowCancelModal(false)}>Keep It</button>
                <button className="btn btn-danger px-4" style={{ borderRadius: '8px', fontWeight: 600 }} onClick={handleCancel}>
                  <i className="fas fa-times me-1"></i>Yes, Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layout/DashboardLayout';
import { getNavForUser, getBrandForUser, getRoleBadge } from '../../utils/navItems';

const API_BASE = 'http://localhost:8000';
const ACCENT   = '#4361ee';

const STATUS_MAP = {
  scheduled:       { bg: '#eff6ff', color: '#2563eb',  dot: '#3b82f6', label: 'Scheduled' },
  checked_in:      { bg: '#fef9c3', color: '#a16207',  dot: '#eab308', label: 'Checked In' },
  in_consultation: { bg: '#f5f3ff', color: '#6d28d9',  dot: '#8b5cf6', label: 'In Consultation' },
  completed:       { bg: '#f0fdf4', color: '#15803d',  dot: '#22c55e', label: 'Completed' },
  cancelled:       { bg: '#fff1f2', color: '#be123c',  dot: '#f43f5e', label: 'Cancelled' },
  pending:         { bg: '#f8fafc', color: '#475569',  dot: '#94a3b8', label: 'Pending' },
  no_show:         { bg: '#fff1f2', color: '#9f1239',  dot: '#fb7185', label: 'No Show' },
};

function StatusBadge({ s }) {
  const st = STATUS_MAP[s] || STATUS_MAP.pending;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 5,
      background: st.bg, color: st.color,
      borderRadius: 20, padding: '3px 10px', fontSize: 11, fontWeight: 700,
    }}>
      <span style={{ width: 6, height: 6, borderRadius: '50%', background: st.dot, flexShrink: 0 }} />
      {st.label}
    </span>
  );
}

function StatCard({ icon, label, value, color, bg, gradient }) {
  return (
    <div style={{
      background: gradient || '#fff',
      borderRadius: 16, padding: '20px 22px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.07)',
      display: 'flex', flexDirection: 'column', gap: 10,
      position: 'relative', overflow: 'hidden',
    }}>
      <div style={{
        position: 'absolute', right: -10, top: -10,
        width: 70, height: 70, borderRadius: '50%',
        background: 'rgba(255,255,255,0.12)',
      }} />
      <div style={{
        width: 40, height: 40, borderRadius: 12, background: bg,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <i className={icon} style={{ color, fontSize: 16 }} />
      </div>
      <div>
        <div style={{ fontSize: 28, fontWeight: 800, color: gradient ? '#fff' : '#0f172a', lineHeight: 1 }}>
          {value ?? 0}
        </div>
        <div style={{ fontSize: 11, color: gradient ? 'rgba(255,255,255,0.8)' : '#64748b', marginTop: 4, fontWeight: 500 }}>
          {label}
        </div>
      </div>
    </div>
  );
}

const AVATAR_PALETTES = [
  ['#4361ee', '#3730a3'],
  ['#7c3aed', '#6d28d9'],
  ['#0891b2', '#0e7490'],
  ['#059669', '#047857'],
  ['#dc2626', '#b91c1c'],
  ['#d97706', '#b45309'],
];

function DoctorCard({ doc, selected, onSelect, index }) {
  const [hovered, setHovered] = useState(false);
  const photo = doc.photo_url
    ? (doc.photo_url.startsWith('http') ? doc.photo_url : `${API_BASE}${doc.photo_url}`)
    : null;
  const initials  = (doc.full_name || '??').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const isSelected = selected?.id === doc.id;
  const [c1, c2]  = AVATAR_PALETTES[index % AVATAR_PALETTES.length];

  return (
    <div
      onClick={() => onSelect(doc)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: 'flex', alignItems: 'center', gap: 13, padding: '13px 14px',
        borderRadius: 14, cursor: 'pointer',
        transition: 'all 0.18s cubic-bezier(.4,0,.2,1)',
        background: isSelected
          ? `linear-gradient(135deg,${ACCENT}18,${ACCENT}08)`
          : hovered ? '#f8faff' : '#fff',
        border: `1.5px solid ${isSelected ? ACCENT : hovered ? `${ACCENT}40` : '#eef2f7'}`,
        boxShadow: isSelected
          ? `0 4px 16px ${ACCENT}25`
          : hovered ? '0 4px 12px rgba(67,97,238,0.08)' : '0 1px 4px rgba(0,0,0,0.04)',
      }}
    >
      {photo ? (
        <img src={photo} alt={doc.full_name} style={{ width: 44, height: 44, borderRadius: 12, objectFit: 'cover', flexShrink: 0 }} />
      ) : (
        <div style={{
          width: 44, height: 44, borderRadius: 12, flexShrink: 0,
          background: `linear-gradient(135deg,${c1},${c2})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontWeight: 800, fontSize: 15,
          boxShadow: `0 2px 8px ${c1}50`,
        }}>
          {initials}
        </div>
      )}
      <div style={{ minWidth: 0, flex: 1 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: isSelected ? ACCENT : '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          Dr. {doc.full_name}
        </div>
        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {doc.specialization || doc.qualification || doc.department || 'General Practitioner'}
        </div>
        <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>#{doc.employee_id}</div>
      </div>
      {isSelected && (
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: ACCENT, flexShrink: 0, boxShadow: `0 0 0 3px ${ACCENT}30` }} />
      )}
    </div>
  );
}

export default function HospitalAdminDoctorView() {
  const { apiCall, user } = useAuth();
  const [doctors,        setDoctors]     = useState([]);
  const [doctorsLoading, setDocLoad]     = useState(true);
  const [selected,       setSelected]    = useState(null);
  const [dash,           setDash]        = useState(null);
  const [dashLoading,    setDashLoading] = useState(false);
  const [activeTab,      setActiveTab]   = useState('all_today');
  const [search,         setSearch]      = useState('');

  useEffect(() => {
    (async () => {
      setDocLoad(true);
      try {
        const res = await apiCall('/hospital-admin/doctors/');
        if (res.ok) {
          const data = await res.json();
          setDoctors(data.doctors || []);
        }
      } catch (e) { console.error(e); }
      finally { setDocLoad(false); }
    })();
  }, [apiCall]);

  const loadDash = useCallback(async (doc) => {
    if (!doc) return;
    setDashLoading(true);
    setDash(null);
    try {
      const res = await apiCall(`/doctor/dashboard/?doctor_id=${doc.id}`);
      if (res.ok) setDash(await res.json());
    } catch (e) { console.error(e); }
    finally { setDashLoading(false); }
  }, [apiCall]);

  const handleSelect = (doc) => {
    setSelected(doc);
    setActiveTab('all_today');
    setSearch('');
    loadDash(doc);
  };

  const today      = dash?.today            ?? {};
  const allToday   = dash?.all_today        ?? [];
  const upcoming   = dash?.upcoming         ?? [];
  const pending    = dash?.pending_list     ?? [];
  const completed  = dash?.all_completed    ?? [];
  const inProgress = dash?.in_consultation  ?? [];

  const TABS = [
    { key: 'all_today',   label: "Today",           icon: 'fas fa-calendar-day',   count: allToday.length   },
    { key: 'upcoming',    label: 'Upcoming',         icon: 'fas fa-calendar-alt',   count: upcoming.length   },
    { key: 'in_progress', label: 'In Consultation',  icon: 'fas fa-stethoscope',    count: inProgress.length },
    { key: 'pending',     label: 'Requests',         icon: 'fas fa-clock',          count: pending.length    },
    { key: 'completed',   label: 'Completed',        icon: 'fas fa-check-double',   count: completed.length  },
  ];

  const tabData = { all_today: allToday, upcoming, pending, in_progress: inProgress, completed };

  const filtered = (tabData[activeTab] || []).filter(a => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (a.patient_name || '').toLowerCase().includes(q) ||
      (a.patient_code || '').toLowerCase().includes(q) ||
      (a.reason       || '').toLowerCase().includes(q)
    );
  });

  const fmtDate = (d) => d
    ? new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    : '—';
  const fmtTime = (d) => d
    ? new Date(d).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : '';

  const todayLabel = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <DashboardLayout navItems={getNavForUser(user)} brandTitle={getBrandForUser(user)} roleBadge={getRoleBadge(user)}>
      <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'minmax(0, 260px) minmax(0, 1fr)', gap: 20, alignItems: 'start', minHeight: 'calc(100vh - 70px)', background: '#f6f8ff', boxSizing: 'border-box', width: '100%', overflow: 'hidden' }} className="doctor-view-grid">

        {/* ── LEFT PANEL ── */}
        <div style={{
          background: '#fff', borderRadius: 20,
          boxShadow: '0 4px 24px rgba(67,97,238,0.08)',
          overflow: 'hidden', position: 'sticky', top: 24,
        }}>
          {/* Panel header */}
          <div style={{
            background: `linear-gradient(135deg, ${ACCENT}, #6d28d9)`,
            padding: '18px 18px 16px',
          }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 4 }}>
              Medical Staff
            </div>
            <div style={{ fontSize: 17, fontWeight: 800, color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="fas fa-user-md" />
              Doctors
              <span style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: '2px 10px', fontSize: 12 }}>
                {doctors.length}
              </span>
            </div>
          </div>

          <div style={{ padding: 12, display: 'flex', flexDirection: 'column', gap: 8, maxHeight: 'calc(100vh - 220px)', overflowY: 'auto' }}>
            {doctorsLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={i} style={{ borderRadius: 14, background: '#f1f5f9', height: 72, animation: 'pulse 1.5s ease-in-out infinite' }} />
              ))
            ) : doctors.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 16px', color: '#94a3b8' }}>
                <i className="fas fa-user-md" style={{ fontSize: 32, marginBottom: 10, display: 'block', opacity: 0.3 }} />
                <div style={{ fontWeight: 600, fontSize: 13 }}>No doctors found</div>
                <div style={{ fontSize: 11, marginTop: 4 }}>No active doctors in this hospital</div>
              </div>
            ) : doctors.map((doc, idx) => (
              <DoctorCard key={doc.id} doc={doc} selected={selected} onSelect={handleSelect} index={idx} />
            ))}
          </div>
        </div>

        {/* ── RIGHT PANEL ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20, minWidth: 0, overflow: 'hidden' }}>

          {!selected ? (
            /* ── Empty state ── */
            <div style={{
              background: '#fff', borderRadius: 20,
              boxShadow: '0 4px 24px rgba(67,97,238,0.06)',
              padding: '80px 40px', textAlign: 'center',
            }}>
              <div style={{
                width: 96, height: 96, borderRadius: 24,
                background: `linear-gradient(135deg,${ACCENT}18,${ACCENT}08)`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 24px', border: `1.5px dashed ${ACCENT}40`,
              }}>
                <i className="fas fa-user-md" style={{ fontSize: 38, color: ACCENT, opacity: 0.7 }} />
              </div>
              <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', marginBottom: 10 }}>
                Select a Doctor
              </div>
              <div style={{ fontSize: 13, color: '#64748b', maxWidth: 320, margin: '0 auto', lineHeight: 1.6 }}>
                Click on any doctor in the left panel to view their full activity dashboard, appointments, and statistics.
              </div>
            </div>

          ) : dashLoading ? (
            /* ── Loading state ── */
            <div style={{ background: '#fff', borderRadius: 20, padding: '72px 40px', textAlign: 'center', boxShadow: '0 4px 24px rgba(67,97,238,0.06)' }}>
              <div style={{ width: 60, height: 60, borderRadius: '50%', background: `${ACCENT}12`, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
                <i className="fas fa-circle-notch fa-spin" style={{ fontSize: 24, color: ACCENT }} />
              </div>
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>Loading Dashboard</div>
              <div style={{ fontSize: 13, color: '#64748b', marginTop: 6 }}>Fetching activities for Dr. {selected.full_name}…</div>
            </div>

          ) : !dash ? (
            /* ── Error state ── */
            <div style={{ background: '#fff', borderRadius: 20, padding: '60px 40px', textAlign: 'center', boxShadow: '0 4px 24px rgba(67,97,238,0.06)' }}>
              <i className="fas fa-exclamation-triangle" style={{ fontSize: 32, color: '#f59e0b', marginBottom: 16, display: 'block' }} />
              <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a', marginBottom: 8 }}>Could not load dashboard</div>
              <button onClick={() => loadDash(selected)} style={{ background: ACCENT, color: '#fff', border: 'none', borderRadius: 10, padding: '9px 20px', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                <i className="fas fa-redo" style={{ marginRight: 7 }} />Try Again
              </button>
            </div>

          ) : (
            <>
              {/* ── Doctor Hero Banner ── */}
              <div style={{
                background: `linear-gradient(135deg, ${ACCENT} 0%, #6d28d9 60%, #0891b2 100%)`,
                borderRadius: 20, padding: '20px 24px',
                display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap',
                boxShadow: `0 8px 30px ${ACCENT}35`,
                position: 'relative', overflow: 'hidden', minWidth: 0,
              }}>
                {/* decorative circles */}
                <div style={{ position: 'absolute', right: -30, top: -30, width: 160, height: 160, borderRadius: '50%', background: 'rgba(255,255,255,0.06)' }} />
                <div style={{ position: 'absolute', right: 60, bottom: -50, width: 120, height: 120, borderRadius: '50%', background: 'rgba(255,255,255,0.04)' }} />

                {/* Avatar */}
                <div style={{
                  width: 68, height: 68, borderRadius: 18, flexShrink: 0,
                  background: 'rgba(255,255,255,0.18)', backdropFilter: 'blur(8px)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 24, fontWeight: 900, color: '#fff',
                  border: '2px solid rgba(255,255,255,0.3)',
                }}>
                  {(selected.full_name || '??').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                </div>

                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: 4 }}>
                    Viewing Dashboard
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 900, color: '#fff' }}>
                    Dr. {selected.full_name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
                    {selected.specialization && (
                      <span style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: '3px 12px', fontSize: 11, color: '#fff', fontWeight: 600 }}>
                        <i className="fas fa-stethoscope" style={{ marginRight: 5 }} />{selected.specialization}
                      </span>
                    )}
                    {selected.department && (
                      <span style={{ background: 'rgba(255,255,255,0.15)', borderRadius: 20, padding: '3px 12px', fontSize: 11, color: '#fff', fontWeight: 600 }}>
                        <i className="fas fa-building" style={{ marginRight: 5 }} />{selected.department}
                      </span>
                    )}
                    <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.65)' }}>
                      <i className="fas fa-id-badge" style={{ marginRight: 5 }} />{selected.employee_id}
                    </span>
                  </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)' }}>{todayLabel}</div>
                  <button
                    onClick={() => loadDash(selected)}
                    style={{
                      background: 'rgba(255,255,255,0.2)', border: '1px solid rgba(255,255,255,0.3)',
                      color: '#fff', borderRadius: 10, padding: '8px 16px',
                      fontSize: 12, fontWeight: 700, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 7,
                      backdropFilter: 'blur(8px)',
                    }}
                  >
                    <i className="fas fa-sync-alt" /> Refresh
                  </button>
                </div>
              </div>

              {/* ── Stat Cards ── */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 16 }}>
                <StatCard icon="fas fa-calendar-check" label="Total Today"      value={today.total}           color="#4361ee" bg="#eef1ff" />
                <StatCard icon="fas fa-hourglass-half" label="Waiting"          value={today.waiting}         color="#d97706" bg="#fef3c7" />
                <StatCard icon="fas fa-stethoscope"    label="In Consultation"  value={today.in_consultation} color="#7c3aed" bg="#f5f3ff"
                  gradient="linear-gradient(135deg,#7c3aed,#4361ee)" />
                <StatCard icon="fas fa-check-double"   label="Completed Today"  value={today.completed}       color="#059669" bg="#ecfdf5" />
                <StatCard icon="fas fa-times-circle"   label="Cancelled"        value={today.cancelled}       color="#dc2626" bg="#fff1f2" />
                <StatCard icon="fas fa-inbox"          label="Pending Requests" value={dash.pending_requests} color="#0891b2" bg="#e0f2fe" />
              </div>

              {/* ── Tabs + Appointments ── */}
              <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 4px 24px rgba(67,97,238,0.06)', overflow: 'hidden', minWidth: 0 }}>

                {/* Tab bar */}
                <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9', overflowX: 'auto', padding: '0 8px' }}>
                  {TABS.map(t => (
                    <button
                      key={t.key}
                      onClick={() => { setActiveTab(t.key); setSearch(''); }}
                      style={{
                        padding: '15px 16px', border: 'none', background: 'none', cursor: 'pointer',
                        fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap', gap: 7,
                        display: 'inline-flex', alignItems: 'center',
                        color: activeTab === t.key ? ACCENT : '#94a3b8',
                        borderBottom: `2.5px solid ${activeTab === t.key ? ACCENT : 'transparent'}`,
                        transition: 'all 0.15s', marginBottom: -1,
                      }}
                    >
                      <i className={t.icon} style={{ fontSize: 12 }} />
                      {t.label}
                      <span style={{
                        background: activeTab === t.key ? `${ACCENT}18` : '#f1f5f9',
                        color: activeTab === t.key ? ACCENT : '#94a3b8',
                        borderRadius: 20, padding: '1px 8px', fontSize: 10, fontWeight: 800,
                      }}>
                        {t.count}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Search */}
                <div style={{ padding: '14px 18px', borderBottom: '1px solid #f8fafc', display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ position: 'relative', flex: 1, maxWidth: 380 }}>
                    <i className="fas fa-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#cbd5e1', fontSize: 12 }} />
                    <input
                      value={search}
                      onChange={e => setSearch(e.target.value)}
                      placeholder="Search patient name, ID or reason…"
                      style={{
                        width: '100%', padding: '9px 12px 9px 34px',
                        border: '1.5px solid #e2e8f0', borderRadius: 10, fontSize: 12,
                        boxSizing: 'border-box', outline: 'none', color: '#0f172a',
                        transition: 'border 0.15s',
                      }}
                      onFocus={e => { e.target.style.borderColor = ACCENT; }}
                      onBlur={e => { e.target.style.borderColor = '#e2e8f0'; }}
                    />
                  </div>
                  <div style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                    {filtered.length} record{filtered.length !== 1 ? 's' : ''}
                  </div>
                </div>

                {/* Column headers */}
                {filtered.length > 0 && (
                  <div style={{
                    display: 'grid', gridTemplateColumns: '2fr 1fr 1.2fr 1fr',
                    padding: '9px 16px', background: '#f8fafc',
                    borderBottom: '1px solid #f1f5f9',
                  }}>
                    {['Patient', 'Date & Time', 'Department', 'Status'].map(h => (
                      <div key={h} style={{ fontSize: 10, fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.7px' }}>
                        {h}
                      </div>
                    ))}
                  </div>
                )}

                {/* Rows */}
                <div>
                  {filtered.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '50px 20px', color: '#cbd5e1' }}>
                      <i className="fas fa-calendar-times" style={{ fontSize: 34, display: 'block', marginBottom: 14 }} />
                      <div style={{ fontSize: 14, fontWeight: 700, color: '#94a3b8' }}>No appointments found</div>
                      <div style={{ fontSize: 12, marginTop: 4 }}>Try a different tab or clear the search</div>
                    </div>
                  ) : filtered.map((appt, idx) => (
                    <div
                      key={appt.id || idx}
                      style={{
                        display: 'grid', gridTemplateColumns: '2fr 1fr 1.2fr 1fr',
                        padding: '12px 16px', alignItems: 'center',
                        borderBottom: idx < filtered.length - 1 ? '1px solid #f8fafc' : 'none',
                        background: idx % 2 === 0 ? '#fff' : '#fafbff',
                        transition: 'background 0.1s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#f0f4ff'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fafbff'; }}
                    >
                      {/* Patient */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 11, minWidth: 0 }}>
                        <div style={{
                          width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                          background: `${ACCENT}15`,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 12, fontWeight: 800, color: ACCENT,
                        }}>
                          {(appt.patient_name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {appt.patient_name || '—'}
                          </div>
                          <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>{appt.patient_code || ''}</div>
                          {appt.reason && (
                            <div style={{ fontSize: 10, color: '#64748b', marginTop: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {appt.reason}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Date/Time */}
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>{appt.scheduled_at ? fmtDate(appt.scheduled_at) : '—'}</div>
                        {appt.scheduled_at && (
                          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>
                            <i className="fas fa-clock" style={{ marginRight: 4, fontSize: 9 }} />{fmtTime(appt.scheduled_at)}
                          </div>
                        )}
                      </div>

                      {/* Department */}
                      <div style={{ fontSize: 11, color: '#475569', fontWeight: 500 }}>
                        {appt.department ? (
                          <span style={{ background: '#f1f5f9', borderRadius: 6, padding: '3px 8px' }}>
                            {appt.department}
                          </span>
                        ) : '—'}
                      </div>

                      {/* Status */}
                      <div><StatusBadge s={appt.status} /></div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
        .doctor-view-grid {
          grid-template-columns: minmax(0, 260px) minmax(0, 1fr);
        }
        @media (max-width: 900px) {
          .doctor-view-grid {
            grid-template-columns: 1fr !important;
          }
        }
        * { box-sizing: border-box; }
      `}</style>
    </DashboardLayout>
  );
}

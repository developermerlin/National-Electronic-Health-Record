import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layout/DashboardLayout';
import { getNavForUser, getBrandForUser, getRoleBadge } from '../../utils/navItems';

// ─── Acuity / Priority classification based on vitals ────────────────────────
function classifyAcuity(vitals, visitType) {
  if (visitType === 'emergency') return { level: 1, label: 'Critical', color: '#dc2626', bg: '#fee2e2', icon: 'fas fa-exclamation-circle' };
  if (!vitals) return { level: 4, label: 'Non-Urgent', color: '#64748b', bg: '#f1f5f9', icon: 'fas fa-clock' };

  const spo2 = parseFloat(vitals.oxygen_saturation);
  const hr   = parseInt(vitals.heart_rate);
  const sbp  = parseInt(vitals.blood_pressure_systolic);
  const temp = parseFloat(vitals.temperature_celsius);

  if ((spo2 && spo2 < 90) || (sbp && sbp < 80) || (hr && hr > 140))
    return { level: 1, label: 'Critical',  color: '#dc2626', bg: '#fee2e2', icon: 'fas fa-exclamation-circle' };
  if ((spo2 && spo2 < 94) || (sbp && (sbp < 90 || sbp > 180)) || (hr && (hr > 120 || hr < 50)) || (temp && temp > 39.5))
    return { level: 2, label: 'Urgent',    color: '#ea580c', bg: '#ffedd5', icon: 'fas fa-exclamation-triangle' };
  if ((temp && (temp > 38.5 || temp < 36)) || (hr && (hr > 100 || hr < 60)))
    return { level: 3, label: 'Less Urgent', color: '#ca8a04', bg: '#fef9c3', icon: 'fas fa-minus-circle' };
  return { level: 4, label: 'Non-Urgent', color: '#16a34a', bg: '#dcfce7', icon: 'fas fa-check-circle' };
}

function waitTime(visitDate) {
  const mins = Math.floor((Date.now() - new Date(visitDate)) / 60000);
  if (mins < 1)  return 'Just now';
  if (mins < 60) return `${mins}m`;
  return `${Math.floor(mins / 60)}h ${mins % 60}m`;
}

function waitColor(visitDate) {
  const mins = Math.floor((Date.now() - new Date(visitDate)) / 60000);
  if (mins > 60) return '#dc2626';
  if (mins > 30) return '#ea580c';
  if (mins > 15) return '#ca8a04';
  return '#16a34a';
}

const VISIT_TYPE_COLORS = {
  emergency:       { color: '#dc2626', bg: '#fee2e2' },
  outpatient:      { color: '#1d4ed8', bg: '#dbeafe' },
  inpatient:       { color: '#7c3aed', bg: '#ede9fe' },
  follow_up:       { color: '#0891b2', bg: '#e0f2fe' },
  referral:        { color: '#9333ea', bg: '#f3e8ff' },
  routine_checkup: { color: '#16a34a', bg: '#dcfce7' },
};

const STATUS_ORDER = ['registered', 'triaged', 'waiting', 'in_progress'];
const STATUS_LABELS = {
  registered:  { label: 'Registered',       color: '#1d4ed8', bg: '#dbeafe' },
  triaged:     { label: 'Triaged',           color: '#7c3aed', bg: '#ede9fe' },
  waiting:     { label: 'Waiting',           color: '#ca8a04', bg: '#fef9c3' },
  in_progress: { label: 'In Consultation',  color: '#16a34a', bg: '#dcfce7' },
};

function initials(name) {
  return (name || '??').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

const AVATAR_COLORS = ['#4361ee','#7c3aed','#0891b2','#059669','#d97706','#e63946','#0284c7','#9333ea'];
function avatarColor(id) { return AVATAR_COLORS[(id || 0) % AVATAR_COLORS.length]; }

// ─── Main Component ───────────────────────────────────────────────────────────
export default function TriageDashboard() {
  const { apiCall, user } = useAuth();
  const navigate = useNavigate();

  const navItems  = getNavForUser(user);
  const brand     = getBrandForUser(user);
  const roleBadge = getRoleBadge(user);

  const [queue,        setQueue]        = useState([]);
  const [loading,      setLoading]      = useState(true);
  const [lastRefresh,  setLastRefresh]  = useState(null);
  const [activeFilter, setActiveFilter] = useState('all');    // all | registered | triaged | waiting | in_progress
  const [search,       setSearch]       = useState('');
  const [selectedVisit, setSelectedVisit] = useState(null);   // detail panel

  // Update-status modal
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [statusVisit,     setStatusVisit]     = useState(null);
  const [newStatus,       setNewStatus]       = useState('');
  const [statusSaving,    setStatusSaving]    = useState(false);

  const intervalRef = useRef(null);

  const fetchQueue = useCallback(async () => {
    try {
      const res = await apiCall('/visits/?status=registered&status=triaged&status=waiting&status=in_progress&page_size=100');
      if (res.ok) {
        const data = await res.json();
        const raw = Array.isArray(data) ? data : (data.results || []);
        // Filter to active statuses only (backend may return all)
        const active = raw.filter(v => STATUS_ORDER.includes(v.status));
        active.sort((a, b) => {
          const acA = classifyAcuity(a.vitals_summary ? a : null, a.visit_type).level;
          const acB = classifyAcuity(b.vitals_summary ? b : null, b.visit_type).level;
          if (acA !== acB) return acA - acB;
          return new Date(a.visit_date) - new Date(b.visit_date);
        });
        setQueue(active);
        setLastRefresh(new Date());
      }
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchQueue();
    intervalRef.current = setInterval(fetchQueue, 30000);
    return () => clearInterval(intervalRef.current);
  }, [fetchQueue]);

  const handleStatusUpdate = async () => {
    if (!statusVisit || !newStatus) return;
    setStatusSaving(true);
    try {
      const res = await apiCall(`/visits/${statusVisit.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setShowStatusModal(false);
        fetchQueue();
        if (selectedVisit?.id === statusVisit.id) setSelectedVisit(null);
      }
    } catch { /* silent */ } finally {
      setStatusSaving(false);
    }
  };

  // Filtered + searched list
  const filtered = queue.filter(v => {
    const matchStatus = activeFilter === 'all' || v.status === activeFilter;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      (v.patient_name || '').toLowerCase().includes(q) ||
      (v.patient_id_code || '').toLowerCase().includes(q) ||
      (v.chief_complaint || '').toLowerCase().includes(q) ||
      (v.doctor_name || '').toLowerCase().includes(q);
    return matchStatus && matchSearch;
  });

  // KPI counts
  const kpis = {
    total:       queue.length,
    critical:    queue.filter(v => classifyAcuity(v, v.visit_type).level === 1).length,
    waiting:     queue.filter(v => v.status === 'waiting').length,
    avgWait:     (() => {
      const mins = queue.map(v => Math.floor((Date.now() - new Date(v.visit_date)) / 60000));
      if (!mins.length) return '—';
      return `${Math.round(mins.reduce((a, b) => a + b, 0) / mins.length)}m`;
    })(),
    emergency:   queue.filter(v => v.visit_type === 'emergency').length,
  };

  return (
    <DashboardLayout navItems={navItems} brandTitle={brand} roleBadge={roleBadge}>
      <div style={{ padding: '20px 16px', maxWidth: 1400, margin: '0 auto' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontWeight: 800, fontSize: 26, color: '#0f172a', margin: 0 }}>
              <i className="fas fa-heartbeat me-2" style={{ color: '#e63946' }}></i>Triage Dashboard
            </h2>
            <p style={{ color: '#64748b', fontSize: 13, marginTop: 4, marginBottom: 0 }}>
              Real-time patient queue · Auto-refreshes every 30s
              {lastRefresh && (
                <span style={{ marginLeft: 10, color: '#94a3b8' }}>
                  <i className="fas fa-sync-alt me-1" style={{ fontSize: 10 }}></i>
                  Last updated {lastRefresh.toLocaleTimeString()}
                </span>
              )}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button className="btn btn-sm btn-outline-secondary" onClick={fetchQueue}>
              <i className="fas fa-sync-alt me-1"></i>Refresh
            </button>
            <button className="btn btn-sm btn-danger" onClick={() => navigate('/nurse/walkin')}>
              <i className="fas fa-plus me-1"></i>New Walk-in
            </button>
          </div>
        </div>

        {/* ── KPI Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 24 }}>
          {[
            { label: 'In Queue',     value: kpis.total,     icon: 'fas fa-users',            color: '#4361ee', bg: '#eff3ff' },
            { label: 'Critical',     value: kpis.critical,  icon: 'fas fa-exclamation-circle',color: '#dc2626', bg: '#fee2e2' },
            { label: 'Emergency',    value: kpis.emergency, icon: 'fas fa-ambulance',          color: '#ea580c', bg: '#ffedd5' },
            { label: 'Waiting',      value: kpis.waiting,   icon: 'fas fa-hourglass-half',     color: '#ca8a04', bg: '#fef9c3' },
            { label: 'Avg Wait',     value: kpis.avgWait,   icon: 'fas fa-clock',              color: '#0891b2', bg: '#e0f2fe' },
          ].map(k => (
            <div key={k.label} style={{ background: '#fff', borderRadius: 14, padding: '16px 18px',
              boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: `1px solid ${k.bg}`, display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: k.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className={k.icon} style={{ color: k.color, fontSize: 18 }}></i>
              </div>
              <div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{k.value}</div>
                <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>{k.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Main Grid: Queue + Detail ── */}
        <div style={{ display: 'grid', gridTemplateColumns: selectedVisit ? '1fr 360px' : '1fr', gap: 16, alignItems: 'start' }}>

          {/* ── Queue Panel ── */}
          <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 16px rgba(0,0,0,0.07)', overflow: 'hidden' }}>

            {/* Toolbar */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
              {/* Status filters */}
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', flex: 1 }}>
                {[
                  { key: 'all',         label: `All (${queue.length})` },
                  { key: 'registered',  label: `Registered (${queue.filter(v=>v.status==='registered').length})` },
                  { key: 'triaged',     label: `Triaged (${queue.filter(v=>v.status==='triaged').length})` },
                  { key: 'waiting',     label: `Waiting (${queue.filter(v=>v.status==='waiting').length})` },
                  { key: 'in_progress', label: `Consulting (${queue.filter(v=>v.status==='in_progress').length})` },
                ].map(f => (
                  <button key={f.key} onClick={() => setActiveFilter(f.key)}
                    style={{ padding: '5px 12px', borderRadius: 8, border: 'none', fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
                      background: activeFilter === f.key ? '#4361ee' : '#f1f5f9',
                      color: activeFilter === f.key ? '#fff' : '#475569' }}>
                    {f.label}
                  </button>
                ))}
              </div>
              {/* Search */}
              <div style={{ position: 'relative', minWidth: 200 }}>
                <i className="fas fa-search" style={{ position: 'absolute', left: 9, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 12 }}></i>
                <input style={{ paddingLeft: 28, border: '1px solid #e2e8f0', borderRadius: 8, fontSize: 12,
                  padding: '6px 10px 6px 28px', outline: 'none', width: '100%' }}
                  placeholder="Search patient, doctor…"
                  value={search} onChange={e => setSearch(e.target.value)} />
              </div>
            </div>

            {/* Queue Table */}
            {loading ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <span className="spinner-border text-danger" style={{ width: 40, height: 40 }}></span>
                <div style={{ marginTop: 12, color: '#64748b', fontSize: 14 }}>Loading triage queue…</div>
              </div>
            ) : filtered.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
                <i className="fas fa-clipboard-check" style={{ fontSize: 44, display: 'block', marginBottom: 12 }}></i>
                <div style={{ fontWeight: 600, fontSize: 15 }}>Queue is empty</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>No active patients match your filter.</div>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e9ecef' }}>
                      {['#', 'Acuity', 'Patient', 'Visit Type', 'Complaint', 'Vitals', 'Doctor', 'Wait', 'Status', 'Actions'].map(h => (
                        <th key={h} style={{ padding: '10px 12px', fontWeight: 700, color: '#475569', fontSize: 11,
                          textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap', textAlign: 'left' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((v, i) => {
                      const acuity  = classifyAcuity(v.vitals, v.visit_type);
                      const vtColor = VISIT_TYPE_COLORS[v.visit_type] || VISIT_TYPE_COLORS.outpatient;
                      const stColor = STATUS_LABELS[v.status] || { label: v.status, color: '#475569', bg: '#f1f5f9' };
                      const isSelected = selectedVisit?.id === v.id;
                      return (
                        <tr key={v.id}
                          onClick={() => setSelectedVisit(isSelected ? null : v)}
                          style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer', transition: 'background 0.12s',
                            background: isSelected ? '#eff3ff' : i % 2 === 0 ? '#fff' : '#fafafa' }}
                          onMouseEnter={e => { if (!isSelected) e.currentTarget.style.background = '#f8faff'; }}
                          onMouseLeave={e => { if (!isSelected) e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#fafafa'; }}>

                          {/* Queue number */}
                          <td style={{ padding: '10px 12px', fontWeight: 800, color: '#94a3b8', fontSize: 12 }}>
                            {i + 1}
                          </td>

                          {/* Acuity badge */}
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                              <div style={{ width: 10, height: 10, borderRadius: '50%', background: acuity.color, flexShrink: 0,
                                boxShadow: acuity.level === 1 ? `0 0 0 3px ${acuity.color}33` : 'none' }}></div>
                              <span style={{ fontSize: 11, fontWeight: 700, color: acuity.color, whiteSpace: 'nowrap' }}>
                                {acuity.label}
                              </span>
                            </div>
                          </td>

                          {/* Patient */}
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                              <div style={{ width: 34, height: 34, borderRadius: 9, background: avatarColor(v.patient_pk),
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: '#fff', fontWeight: 800, fontSize: 12, flexShrink: 0 }}>
                                {initials(v.patient_name)}
                              </div>
                              <div>
                                <div style={{ fontWeight: 700, color: '#1e293b', fontSize: 13 }}>{v.patient_name || '—'}</div>
                                <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>{v.patient_id_code || ''}</div>
                              </div>
                            </div>
                          </td>

                          {/* Visit type */}
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 600,
                              background: vtColor.bg, color: vtColor.color, whiteSpace: 'nowrap' }}>
                              {v.visit_type_display || v.visit_type}
                            </span>
                          </td>

                          {/* Chief complaint */}
                          <td style={{ padding: '10px 12px', maxWidth: 180 }}>
                            <div style={{ color: '#334155', fontSize: 12, display: '-webkit-box',
                              WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                              {v.chief_complaint || '—'}
                            </div>
                          </td>

                          {/* Vitals mini */}
                          <td style={{ padding: '10px 12px', whiteSpace: 'nowrap' }}>
                            {v.vitals_summary ? (
                              <div style={{ fontSize: 11, color: '#475569', display: 'flex', flexDirection: 'column', gap: 2 }}>
                                {v.vitals_summary.bp  && <span><i className="fas fa-tint me-1" style={{ color: '#e63946', fontSize: 9 }}></i>{v.vitals_summary.bp}</span>}
                                {v.vitals_summary.hr  && <span><i className="fas fa-heartbeat me-1" style={{ color: '#f97316', fontSize: 9 }}></i>{v.vitals_summary.hr} bpm</span>}
                                {v.vitals_summary.o2  && <span><i className="fas fa-lungs me-1" style={{ color: '#0891b2', fontSize: 9 }}></i>{v.vitals_summary.o2}% SpO₂</span>}
                                {v.vitals_summary.temp && <span><i className="fas fa-thermometer-half me-1" style={{ color: '#7c3aed', fontSize: 9 }}></i>{v.vitals_summary.temp}°C</span>}
                              </div>
                            ) : (
                              <span style={{ fontSize: 11, color: '#cbd5e1', fontStyle: 'italic' }}>No vitals</span>
                            )}
                          </td>

                          {/* Doctor */}
                          <td style={{ padding: '10px 12px', fontSize: 12, color: '#475569', whiteSpace: 'nowrap' }}>
                            {v.doctor_name ? `Dr. ${v.doctor_name}` : <span style={{ color: '#cbd5e1', fontStyle: 'italic' }}>Unassigned</span>}
                          </td>

                          {/* Wait time */}
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{ fontWeight: 700, fontSize: 13, color: waitColor(v.visit_date) }}>
                              {waitTime(v.visit_date)}
                            </span>
                          </td>

                          {/* Status */}
                          <td style={{ padding: '10px 12px' }}>
                            <span style={{ padding: '3px 8px', borderRadius: 6, fontSize: 11, fontWeight: 700,
                              background: stColor.bg, color: stColor.color, whiteSpace: 'nowrap' }}>
                              {stColor.label}
                            </span>
                          </td>

                          {/* Actions */}
                          <td style={{ padding: '10px 12px' }}>
                            <div style={{ display: 'flex', gap: 5 }}>
                              <button title="View patient record"
                                onClick={e => { e.stopPropagation(); navigate(`/receptionist/patients/${v.patient_pk}`); }}
                                style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid #e2e8f0',
                                  background: '#fff', color: '#4361ee', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <i className="fas fa-eye"></i>
                              </button>
                              <button title="Update status"
                                onClick={e => { e.stopPropagation(); setStatusVisit(v); setNewStatus(v.status); setShowStatusModal(true); }}
                                style={{ width: 28, height: 28, borderRadius: 7, border: '1px solid #e2e8f0',
                                  background: '#fff', color: '#7c3aed', cursor: 'pointer', fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <i className="fas fa-edit"></i>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Footer */}
            {!loading && filtered.length > 0 && (
              <div style={{ padding: '10px 20px', borderTop: '1px solid #f1f5f9', fontSize: 12, color: '#94a3b8', textAlign: 'right' }}>
                Showing {filtered.length} of {queue.length} patients
              </div>
            )}
          </div>

          {/* ── Detail Side Panel ── */}
          {selectedVisit && (
            <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 16px rgba(0,0,0,0.07)',
              overflow: 'hidden', position: 'sticky', top: 20 }}>

              {/* Panel Header */}
              <div style={{ background: 'linear-gradient(135deg,#1e293b,#334155)', padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 46, height: 46, borderRadius: 12, background: avatarColor(selectedVisit.patient_pk),
                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: 17, flexShrink: 0 }}>
                  {initials(selectedVisit.patient_name)}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ color: '#fff', fontWeight: 800, fontSize: 16, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {selectedVisit.patient_name}
                  </div>
                  <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, fontFamily: 'monospace' }}>
                    {selectedVisit.patient_id_code}
                  </div>
                </div>
                <button onClick={() => setSelectedVisit(null)}
                  style={{ background: 'rgba(255,255,255,0.12)', border: 'none', borderRadius: 8,
                    color: '#fff', padding: '4px 8px', cursor: 'pointer', fontSize: 13 }}>
                  <i className="fas fa-times"></i>
                </button>
              </div>

              <div style={{ padding: 20 }}>

                {/* Acuity bar */}
                {(() => {
                  const ac = classifyAcuity(selectedVisit.vitals, selectedVisit.visit_type);
                  return (
                    <div style={{ background: ac.bg, borderRadius: 10, padding: '10px 14px', marginBottom: 16,
                      display: 'flex', alignItems: 'center', gap: 10 }}>
                      <i className={ac.icon} style={{ color: ac.color, fontSize: 18 }}></i>
                      <div>
                        <div style={{ fontWeight: 800, color: ac.color, fontSize: 14 }}>
                          Acuity Level {ac.level} — {ac.label}
                        </div>
                        <div style={{ fontSize: 11, color: ac.color, opacity: 0.75 }}>
                          Wait: {waitTime(selectedVisit.visit_date)}
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Visit Info */}
                <div style={{ marginBottom: 16 }}>
                  <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase',
                    color: '#94a3b8', marginBottom: 8 }}>Visit Information</div>
                  {[
                    { label: 'Type',        value: selectedVisit.visit_type_display || selectedVisit.visit_type },
                    { label: 'Complaint',   value: selectedVisit.chief_complaint },
                    { label: 'Doctor',      value: selectedVisit.doctor_name ? `Dr. ${selectedVisit.doctor_name}` : 'Unassigned' },
                    { label: 'Department',  value: selectedVisit.department_name || '—' },
                    { label: 'Registered',  value: selectedVisit.registered_by_name || '—' },
                    { label: 'Visit Date',  value: selectedVisit.visit_date ? new Date(selectedVisit.visit_date).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—' },
                  ].map(row => (
                    <div key={row.label} style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
                      <span style={{ fontSize: 12, color: '#94a3b8', width: 80, flexShrink: 0 }}>{row.label}</span>
                      <span style={{ fontSize: 12, color: '#1e293b', fontWeight: 600, flex: 1 }}>{row.value || '—'}</span>
                    </div>
                  ))}
                </div>

                {/* Vitals */}
                {selectedVisit.vitals && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 10, fontWeight: 700, letterSpacing: '1px', textTransform: 'uppercase',
                      color: '#94a3b8', marginBottom: 8 }}>Vital Signs</div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                      {[
                        { label: 'Blood Pressure', value: selectedVisit.vitals_summary?.bp, icon: 'fas fa-tint', color: '#e63946' },
                        { label: 'Heart Rate',     value: selectedVisit.vitals_summary?.hr ? `${selectedVisit.vitals_summary.hr} bpm` : null, icon: 'fas fa-heartbeat', color: '#f97316' },
                        { label: 'Temperature',    value: selectedVisit.vitals_summary?.temp ? `${selectedVisit.vitals_summary.temp}°C` : null, icon: 'fas fa-thermometer-half', color: '#7c3aed' },
                        { label: 'SpO₂',           value: selectedVisit.vitals_summary?.o2 ? `${selectedVisit.vitals_summary.o2}%` : null, icon: 'fas fa-lungs', color: '#0891b2' },
                      ].filter(v => v.value).map(v => (
                        <div key={v.label} style={{ background: '#f8fafc', borderRadius: 9, padding: '10px 12px', border: '1px solid #e9ecef' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                            <i className={v.icon} style={{ color: v.color, fontSize: 11 }}></i>
                            <span style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.4px' }}>{v.label}</span>
                          </div>
                          <div style={{ fontWeight: 800, fontSize: 15, color: '#1e293b' }}>{v.value}</div>
                        </div>
                      ))}
                    </div>
                    {(!selectedVisit.vitals_summary?.bp && !selectedVisit.vitals_summary?.hr) && (
                      <div style={{ fontSize: 12, color: '#94a3b8', fontStyle: 'italic', textAlign: 'center', padding: '8px 0' }}>
                        Vitals not yet recorded
                      </div>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <button className="btn btn-sm btn-primary" style={{ borderRadius: 9, fontWeight: 700, fontSize: 13 }}
                    onClick={() => navigate(`/receptionist/patients/${selectedVisit.patient_pk}`)}>
                    <i className="fas fa-user me-2"></i>Open Full Patient Record
                  </button>
                  <button className="btn btn-sm" style={{ borderRadius: 9, fontWeight: 700, fontSize: 13,
                    background: '#7c3aed', color: '#fff', border: 'none' }}
                    onClick={() => { setStatusVisit(selectedVisit); setNewStatus(selectedVisit.status); setShowStatusModal(true); }}>
                    <i className="fas fa-exchange-alt me-2"></i>Update Status
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Acuity Legend ── */}
        <div style={{ marginTop: 16, background: '#fff', borderRadius: 12, padding: '12px 20px',
          boxShadow: '0 1px 8px rgba(0,0,0,0.05)', display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Acuity Scale:</span>
          {[
            { level: 1, label: 'Critical',    color: '#dc2626', note: 'Immediate' },
            { level: 2, label: 'Urgent',      color: '#ea580c', note: '< 30 min' },
            { level: 3, label: 'Less Urgent', color: '#ca8a04', note: '< 60 min' },
            { level: 4, label: 'Non-Urgent',  color: '#16a34a', note: 'When available' },
          ].map(a => (
            <div key={a.level} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: a.color }}></div>
              <span style={{ fontSize: 12, color: '#475569' }}>
                <strong>L{a.level}</strong> {a.label}
                <span style={{ color: '#94a3b8', marginLeft: 4 }}>({a.note})</span>
              </span>
            </div>
          ))}
          <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 'auto' }}>
            <i className="fas fa-info-circle me-1"></i>Acuity auto-calculated from vitals
          </span>
        </div>
      </div>

      {/* ── Update Status Modal ── */}
      {showStatusModal && statusVisit && (
        <div className="modal fade show d-block" style={{ background: 'rgba(0,0,0,0.5)', zIndex: 9999 }}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 420 }}>
            <div className="modal-content border-0 shadow" style={{ borderRadius: 14 }}>
              <div className="modal-header border-0 pb-0">
                <h6 className="modal-title fw-bold" style={{ fontSize: 16 }}>
                  <i className="fas fa-exchange-alt me-2" style={{ color: '#7c3aed' }}></i>
                  Update Visit Status
                </h6>
                <button className="btn-close" onClick={() => setShowStatusModal(false)}></button>
              </div>
              <div className="modal-body">
                <div style={{ fontSize: 13, color: '#475569', marginBottom: 14 }}>
                  Patient: <strong>{statusVisit.patient_name}</strong>
                </div>
                <label className="form-label fw-semibold" style={{ fontSize: 13 }}>New Status</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {[
                    { value: 'registered',  label: 'Registered',      icon: 'fas fa-clipboard-list', color: '#1d4ed8' },
                    { value: 'triaged',     label: 'Triaged',          icon: 'fas fa-heartbeat',      color: '#7c3aed' },
                    { value: 'waiting',     label: 'Waiting for Doctor', icon: 'fas fa-hourglass-half', color: '#ca8a04' },
                    { value: 'in_progress', label: 'In Consultation',  icon: 'fas fa-stethoscope',    color: '#16a34a' },
                    { value: 'completed',   label: 'Completed',        icon: 'fas fa-check-circle',   color: '#0891b2' },
                    { value: 'cancelled',   label: 'Cancelled',        icon: 'fas fa-ban',            color: '#dc2626' },
                  ].map(s => (
                    <div key={s.value} onClick={() => setNewStatus(s.value)}
                      style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px',
                        borderRadius: 9, cursor: 'pointer', border: `2px solid ${newStatus === s.value ? s.color : '#e2e8f0'}`,
                        background: newStatus === s.value ? s.color + '12' : '#fff', transition: 'all 0.15s' }}>
                      <i className={s.icon} style={{ color: s.color, width: 16, textAlign: 'center' }}></i>
                      <span style={{ fontSize: 13, fontWeight: newStatus === s.value ? 700 : 500, color: '#1e293b' }}>{s.label}</span>
                      {newStatus === s.value && <i className="fas fa-check ms-auto" style={{ color: s.color, fontSize: 12 }}></i>}
                    </div>
                  ))}
                </div>
              </div>
              <div className="modal-footer border-0 pt-0">
                <button className="btn btn-sm btn-secondary" style={{ borderRadius: 8 }} onClick={() => setShowStatusModal(false)}>Cancel</button>
                <button className="btn btn-sm fw-bold" style={{ borderRadius: 8, background: '#7c3aed', color: '#fff', border: 'none' }}
                  onClick={handleStatusUpdate} disabled={statusSaving || newStatus === statusVisit.status}>
                  {statusSaving
                    ? <><span className="spinner-border spinner-border-sm me-1"></span>Saving…</>
                    : <><i className="fas fa-save me-1"></i>Save Status</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layout/DashboardLayout';
import { getNavForUser, getBrandForUser, getRoleBadge } from '../../utils/navItems';

const VISIT_COLOR = {
  outpatient:       { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe', icon: 'fas fa-clinic-medical' },
  inpatient:        { bg: '#fdf4ff', text: '#7e22ce', border: '#e9d5ff', icon: 'fas fa-bed' },
  emergency:        { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca', icon: 'fas fa-ambulance' },
  follow_up:        { bg: '#f0fdf4', text: '#15803d', border: '#bbf7d0', icon: 'fas fa-redo' },
  referral:         { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa', icon: 'fas fa-share-square' },
  routine_checkup:  { bg: '#f0f9ff', text: '#0369a1', border: '#bae6fd', icon: 'fas fa-stethoscope' },
};

const STATUS_COLOR = {
  completed:    { bg: '#f0fdf4', text: '#166534', border: '#bbf7d0' },
  in_progress:  { bg: '#fdf4ff', text: '#7e22ce', border: '#e9d5ff' },
  registered:   { bg: '#eff6ff', text: '#1d4ed8', border: '#bfdbfe' },
  cancelled:    { bg: '#fef2f2', text: '#b91c1c', border: '#fecaca' },
  referred_out: { bg: '#fff7ed', text: '#c2410c', border: '#fed7aa' },
  triaged:      { bg: '#f0f9ff', text: '#0369a1', border: '#bae6fd' },
  waiting:      { bg: '#fffbeb', text: '#92400e', border: '#fde68a' },
};

const fmt = (dt, opts) => dt ? new Date(dt).toLocaleString('en-GB', opts) : null;

const Section = ({ title, icon, children }) => (
  <div style={{ marginBottom: 16 }}>
    <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase',
      letterSpacing: '1.2px', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 6 }}>
      <i className={icon} style={{ fontSize: 10 }}></i>{title}
    </div>
    <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.6 }}>{children}</div>
  </div>
);

const VitalPill = ({ label, value, icon }) => {
  if (!value) return null;
  return (
    <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10,
      padding: '8px 14px', display: 'flex', flexDirection: 'column', gap: 2, minWidth: 90 }}>
      <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
        <i className={icon} style={{ fontSize: 9 }}></i>{label}
      </div>
      <div style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{value}</div>
    </div>
  );
};

export default function PatientMedicalHistory() {
  const { apiCall, user } = useAuth();
  const [history, setHistory]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [search,   setSearch]   = useState('');
  const [filter,   setFilter]   = useState('all');

  useEffect(() => {
    let mounted = true;
    apiCall('/portal/medical-history/')
      .then(async (res) => {
        if (!mounted) return;
        if (res.ok) setHistory(await res.json());
        setLoading(false);
      })
      .catch(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [apiCall]);

  const navItems  = getNavForUser(user);
  const brand     = getBrandForUser(user);
  const roleBadge = getRoleBadge(user);
  const today     = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

  const filtered = history.filter(v => {
    const matchFilter = filter === 'all' || v.visit_type === filter;
    const q = search.toLowerCase();
    const matchSearch = !q ||
      (v.hospital || '').toLowerCase().includes(q) ||
      (v.doctor   || '').toLowerCase().includes(q) ||
      (v.department || '').toLowerCase().includes(q) ||
      (v.diagnosis  || '').toLowerCase().includes(q) ||
      (v.chief_complaint || '').toLowerCase().includes(q);
    return matchFilter && matchSearch;
  });

  const toggle = (id) => setExpanded(prev => prev === id ? null : id);

  return (
    <DashboardLayout navItems={navItems} brandTitle={brand} roleBadge={roleBadge} hideBanner>

      {/* ── Page Banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 55%, #4361ee 100%)',
        borderRadius: 16, padding: '22px 28px', marginBottom: 24, color: '#fff',
        position: 'relative', overflow: 'hidden',
      }}>
        <div style={{ position: 'absolute', right: -50, top: -50, width: 200, height: 200, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }}></div>
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            <div style={{ width: 52, height: 52, borderRadius: 14, background: 'rgba(255,255,255,0.12)',
              border: '1px solid rgba(255,255,255,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className="fas fa-notes-medical" style={{ fontSize: 22, color: '#fff' }}></i>
            </div>
            <div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginBottom: 3 }}>
                {today}
              </div>
              <div style={{ fontWeight: 900, fontSize: 20 }}>My Medical History</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', marginTop: 4 }}>
                {loading ? '…' : `${history.length} visit${history.length !== 1 ? 's' : ''} on record`}
              </div>
            </div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.20)',
            borderRadius: 20, padding: '5px 16px', display: 'flex', alignItems: 'center', gap: 7 }}>
            <i className="fas fa-shield-alt" style={{ fontSize: 11, color: '#93c5fd' }}></i>
            <span style={{ fontSize: 12, fontWeight: 700 }}>Secure Health Record</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', gap: 16 }}>
          <div className="spinner-border text-primary" style={{ width: 44, height: 44 }}></div>
          <span style={{ color: '#6c757d', fontSize: 14 }}>Loading your medical history…</span>
        </div>
      ) : (
        <>
          {/* ── Filters & Search ── */}
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 220 }}>
              <i className="fas fa-search" style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 13 }}></i>
              <input
                type="text"
                placeholder="Search by hospital, doctor, diagnosis…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                autoComplete="off"
                style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: 10, border: '1.5px solid #e2e8f0',
                  fontSize: 13, outline: 'none', background: '#fff', color: '#334155', boxSizing: 'border-box' }}
              />
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {['all', 'outpatient', 'inpatient', 'emergency', 'follow_up', 'referral', 'routine_checkup'].map(t => (
                <button key={t} onClick={() => setFilter(t)}
                  style={{ padding: '8px 14px', borderRadius: 8, border: '1.5px solid',
                    borderColor: filter === t ? '#4361ee' : '#e2e8f0',
                    background: filter === t ? '#4361ee' : '#fff',
                    color: filter === t ? '#fff' : '#64748b',
                    fontSize: 12, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                  {t === 'all' ? 'All Visits' : t.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                </button>
              ))}
            </div>
          </div>

          {/* ── Summary Stats ── */}
          {history.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 12, marginBottom: 24 }}>
              {[
                { label: 'Total Visits',    value: history.length,                                            icon: 'fas fa-hospital',         bg: '#eff6ff', color: '#4361ee' },
                { label: 'Completed',       value: history.filter(v => v.status === 'completed').length,      icon: 'fas fa-check-circle',     bg: '#f0fdf4', color: '#16a34a' },
                { label: 'Emergency',       value: history.filter(v => v.visit_type === 'emergency').length,  icon: 'fas fa-ambulance',        bg: '#fef2f2', color: '#dc2626' },
                { label: 'Follow-ups',      value: history.filter(v => v.visit_type === 'follow_up').length,  icon: 'fas fa-redo',             bg: '#f0fdf4', color: '#15803d' },
              ].map(s => (
                <div key={s.label} className="dash-card" style={{ padding: '16px 18px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: 10, background: s.bg,
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className={s.icon} style={{ color: s.color, fontSize: 16 }}></i>
                    </div>
                    <div>
                      <div style={{ fontSize: 22, fontWeight: 800, color: '#1a1a2e', lineHeight: 1 }}>{s.value}</div>
                      <div style={{ fontSize: 11, color: '#6c757d', marginTop: 2, fontWeight: 500 }}>{s.label}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* ── Visit List ── */}
          {filtered.length === 0 ? (
            <div className="dash-card" style={{ textAlign: 'center', padding: '60px 24px' }}>
              <i className="fas fa-notes-medical" style={{ fontSize: 48, color: '#cbd5e1', display: 'block', marginBottom: 16 }}></i>
              <div style={{ fontWeight: 700, fontSize: 16, color: '#64748b', marginBottom: 6 }}>
                {search || filter !== 'all' ? 'No visits match your filter' : 'No medical history yet'}
              </div>
              <div style={{ fontSize: 13, color: '#94a3b8' }}>
                {search || filter !== 'all' ? 'Try adjusting your search or filter.' : 'Your visit records will appear here after hospital visits.'}
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {filtered.map((v) => {
                const vc   = VISIT_COLOR[v.visit_type]  || VISIT_COLOR.outpatient;
                const sc   = STATUS_COLOR[v.status]     || STATUS_COLOR.registered;
                const open = expanded === v.id;

                return (
                  <div key={v.id} className="dash-card" style={{ overflow: 'hidden', transition: 'box-shadow 0.2s' }}>
                    {/* ── Visit Header (always visible) ── */}
                    <div
                      onClick={() => toggle(v.id)}
                      style={{ padding: '18px 24px', cursor: 'pointer', display: 'flex', alignItems: 'center',
                        gap: 16, userSelect: 'none' }}
                      onMouseEnter={e => e.currentTarget.style.background = '#fafbff'}
                      onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                      {/* Visit type icon */}
                      <div style={{ width: 46, height: 46, borderRadius: 12, flexShrink: 0,
                        background: vc.bg, border: `1px solid ${vc.border}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <i className={vc.icon} style={{ color: vc.text, fontSize: 18 }}></i>
                      </div>

                      {/* Core info */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                          <span style={{ fontWeight: 700, color: '#1a1a2e', fontSize: 14 }}>{v.hospital || '—'}</span>
                          <span style={{ background: vc.bg, color: vc.text, border: `1px solid ${vc.border}`,
                            borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
                            {v.visit_type_display}
                          </span>
                          <span style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`,
                            borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600 }}>
                            {v.status_display}
                          </span>
                        </div>
                        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: '#64748b' }}>
                          <span><i className="fas fa-calendar-alt" style={{ marginRight: 4 }}></i>
                            {fmt(v.visit_date, { day: 'numeric', month: 'short', year: 'numeric' })}
                          </span>
                          <span><i className="fas fa-clock" style={{ marginRight: 4 }}></i>
                            {fmt(v.visit_date, { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          {v.doctor && (
                            <span><i className="fas fa-user-md" style={{ marginRight: 4 }}></i>Dr. {v.doctor}</span>
                          )}
                          {v.department && (
                            <span><i className="fas fa-building" style={{ marginRight: 4 }}></i>{v.department}</span>
                          )}
                        </div>
                        {v.diagnosis && (
                          <div style={{ marginTop: 4, fontSize: 12, color: '#475569', fontStyle: 'italic' }}>
                            <i className="fas fa-diagnoses" style={{ marginRight: 4, color: '#7c3aed' }}></i>
                            {v.diagnosis}
                          </div>
                        )}
                      </div>

                      {/* Chevron */}
                      <i className={`fas fa-chevron-${open ? 'up' : 'down'}`}
                        style={{ color: '#94a3b8', fontSize: 13, flexShrink: 0, transition: 'transform 0.2s' }}></i>
                    </div>

                    {/* ── Expanded Detail ── */}
                    {open && (
                      <div style={{ borderTop: '1px solid #f1f5f9', padding: '20px 24px', background: '#fafbff' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>

                          {/* Left column */}
                          <div>
                            <Section title="Chief Complaint" icon="fas fa-comment-medical">
                              {v.chief_complaint || <span style={{ color: '#cbd5e1', fontStyle: 'italic' }}>Not recorded</span>}
                            </Section>

                            {v.diagnosis && (
                              <Section title="Diagnosis" icon="fas fa-diagnoses">
                                <span style={{ fontWeight: 600, color: '#7c3aed' }}>{v.diagnosis}</span>
                                {v.secondary_diagnoses && (
                                  <div style={{ marginTop: 4, color: '#64748b', fontSize: 12 }}>
                                    <span style={{ fontWeight: 600 }}>Secondary: </span>{v.secondary_diagnoses}
                                  </div>
                                )}
                              </Section>
                            )}

                            {v.treatment_plan && (
                              <Section title="Treatment Plan" icon="fas fa-clipboard-list">
                                {v.treatment_plan}
                              </Section>
                            )}

                            {v.prescriptions && (
                              <Section title="Prescriptions" icon="fas fa-pills">
                                <pre style={{ margin: 0, fontFamily: 'inherit', whiteSpace: 'pre-wrap', fontSize: 13 }}>
                                  {v.prescriptions}
                                </pre>
                              </Section>
                            )}
                          </div>

                          {/* Right column */}
                          <div>
                            {/* Vitals */}
                            {v.vitals && (
                              <div style={{ marginBottom: 16 }}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase',
                                  letterSpacing: '1.2px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <i className="fas fa-heartbeat" style={{ fontSize: 10 }}></i>Vitals
                                </div>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                                  <VitalPill label="Blood Pressure" value={v.vitals.blood_pressure} icon="fas fa-heart" />
                                  <VitalPill label="Heart Rate"     value={v.vitals.heart_rate ? `${v.vitals.heart_rate} bpm` : null} icon="fas fa-heartbeat" />
                                  <VitalPill label="Temperature"    value={v.vitals.temperature ? `${v.vitals.temperature} °C` : null} icon="fas fa-thermometer-half" />
                                  <VitalPill label="Weight"         value={v.vitals.weight_kg ? `${v.vitals.weight_kg} kg` : null}    icon="fas fa-weight" />
                                  <VitalPill label="SpO₂"           value={v.vitals.oxygen_saturation ? `${v.vitals.oxygen_saturation}%` : null} icon="fas fa-lungs" />
                                </div>
                              </div>
                            )}

                            {/* Discharge info */}
                            {(v.discharge_date || v.discharge_notes) && (
                              <Section title="Discharge" icon="fas fa-sign-out-alt">
                                {v.discharge_date && (
                                  <div style={{ marginBottom: 4 }}>
                                    <span style={{ fontWeight: 600 }}>Date: </span>
                                    {fmt(v.discharge_date, { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                  </div>
                                )}
                                {v.discharge_notes && <div>{v.discharge_notes}</div>}
                              </Section>
                            )}

                            {/* Follow-up */}
                            {(v.follow_up_date || v.follow_up_instructions) && (
                              <Section title="Follow-up" icon="fas fa-calendar-check">
                                {v.follow_up_date && (
                                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6,
                                    background: '#eff6ff', borderRadius: 8, padding: '5px 12px',
                                    color: '#1d4ed8', fontWeight: 600, fontSize: 13, marginBottom: 6 }}>
                                    <i className="fas fa-calendar-alt" style={{ fontSize: 11 }}></i>
                                    {fmt(v.follow_up_date + 'T00:00', { day: 'numeric', month: 'long', year: 'numeric' })}
                                  </div>
                                )}
                                {v.follow_up_instructions && (
                                  <div style={{ fontSize: 12, color: '#475569' }}>{v.follow_up_instructions}</div>
                                )}
                              </Section>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </DashboardLayout>
  );
}

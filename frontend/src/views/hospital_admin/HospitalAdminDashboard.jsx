import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layout/DashboardLayout';
import { getNavForUser, getBrandForUser, getRoleBadge } from '../../utils/navItems';
import { Bar, Doughnut, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, BarElement,
  PointElement, LineElement, Filler,
} from 'chart.js';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler);

const statusColors  = { registered: '#4361ee', waiting: '#f77f00', triaged: '#2ec4b6', in_progress: '#7c3aed', completed: '#16a34a', cancelled: '#dc2626' };
const statusBg      = { registered: '#eff2ff', waiting: '#fff7ed', triaged: '#f0fdfa', in_progress: '#f3e8ff', completed: '#dcfce7', cancelled: '#fee2e2' };
const roleColors    = ['#4361ee','#16a34a','#f77f00','#7c3aed','#0891b2','#dc2626','#2ec4b6','#e11d48'];

const Card = ({ icon, label, value, sub, color, bg, link, linkLabel }) => (
  <div style={{ background: '#fff', borderRadius: 14, padding: '20px 22px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', display: 'flex', flexDirection: 'column', gap: 6 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
      <div style={{ width: 46, height: 46, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <i className={icon} style={{ color, fontSize: 18 }}></i>
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 24, fontWeight: 800, color: '#1a1a2e', lineHeight: 1 }}>{value ?? '—'}</div>
        <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{label}</div>
      </div>
    </div>
    {sub && <div style={{ fontSize: 11, color: '#94a3b8', paddingLeft: 60 }}>{sub}</div>}
    {link && <div style={{ paddingLeft: 60 }}><Link to={link} style={{ fontSize: 11, color, fontWeight: 600, textDecoration: 'none' }}>{linkLabel} →</Link></div>}
  </div>
);

const SectionHeader = ({ icon, color, title, action, actionLink }) => (
  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 }}>
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 700, fontSize: 15, color: '#1a1a2e' }}>
      <i className={icon} style={{ color }}></i> {title}
    </div>
    {action && <Link to={actionLink} style={{ fontSize: 12, color, fontWeight: 600, textDecoration: 'none' }}>{action} →</Link>}
  </div>
);

export default function HospitalAdminDashboard() {
  const { apiCall, user } = useAuth();
  const [stats, setStats]   = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState('');
  const [bannerUploading, setBannerUploading] = useState(false);
  const bannerInputRef = React.useRef(null);

  const handleBannerUpload = async (e) => {
    const file = e.target.files[0];
    if (!file || !stats?.hospital?.id) return;
    setBannerUploading(true);
    try {
      const fd = new FormData();
      fd.append('hospital_image', file);
      const res = await apiCall(`/admin/hospitals/${stats.hospital.id}/`, { method: 'PATCH', body: fd });
      if (res.ok) {
        const updated = await res.json();
        const imageUrl = updated.hospital_image
          ? (updated.hospital_image.startsWith('http') ? updated.hospital_image : `http://localhost:8000${updated.hospital_image}`)
          : URL.createObjectURL(file);
        setStats(prev => ({ ...prev, hospital: { ...prev.hospital, hospital_image: imageUrl } }));
      }
    } catch { /* silent */ }
    finally { setBannerUploading(false); e.target.value = ''; }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const res = await apiCall('/admin/hospital-dashboard/');
        if (res.ok) { setStats(await res.json()); }
        else { const d = await res.json().catch(() => ({})); setError(d.error || `Error ${res.status}`); }
      } catch { setError('Network error. Unable to load dashboard.'); }
      finally { setLoading(false); }
    };
    load();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const nav   = getNavForUser(user);
  const brand = getBrandForUser(user);
  const badge = getRoleBadge(user);

  if (loading) return (
    <DashboardLayout navItems={nav} brandTitle={brand} roleBadge={badge}>
      <div className="text-center py-5"><div className="spinner-border text-primary" role="status"></div><p className="mt-3 text-muted">Loading hospital dashboard...</p></div>
    </DashboardLayout>
  );
  if (error) return (
    <DashboardLayout navItems={nav} brandTitle={brand} roleBadge={badge}>
      <div className="alert alert-danger">{error}</div>
    </DashboardLayout>
  );

  const ov           = stats?.overview || {};
  const vByStatus    = stats?.visits_by_status || [];
  const recentVisits = stats?.recent_visits || [];
  const staffByRole  = stats?.staff_by_role || [];
  const hospital     = stats?.hospital || {};
  const monthly      = stats?.monthly_trend || [];
  const topDepts     = stats?.top_departments || [];
  const auditLog     = stats?.recent_audit || [];

  /* ── Chart Data ── */
  const doughnutData = {
    labels: vByStatus.map(v => v.status),
    datasets: [{
      data: vByStatus.map(v => v.count),
      backgroundColor: vByStatus.map(v => statusColors[v.status] || '#94a3b8'),
      borderWidth: 2, borderColor: '#fff',
    }],
  };

  const lineData = {
    labels: monthly.map(m => m.month),
    datasets: [{
      label: 'Visits',
      data: monthly.map(m => m.count),
      fill: true,
      borderColor: '#4361ee',
      backgroundColor: 'rgba(67,97,238,0.10)',
      tension: 0.4, pointRadius: 4, pointBackgroundColor: '#4361ee',
    }],
  };

  const barData = {
    labels: staffByRole.map(s => (s.role__name || '').replace('_', ' ')),
    datasets: [{
      label: 'Staff',
      data: staffByRole.map(s => s.count),
      backgroundColor: staffByRole.map((_, i) => roleColors[i % roleColors.length]),
      borderRadius: 6,
    }],
  };

  const deptBarData = {
    labels: topDepts.map(d => d.department__name || '—'),
    datasets: [{
      label: 'Visits',
      data: topDepts.map(d => d.count),
      backgroundColor: '#2ec4b6',
      borderRadius: 6,
    }],
  };

  const chartOpts = () => ({
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { mode: 'index' }, title: { display: false } },
    scales: { x: { grid: { display: false } }, y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { stepSize: 1 } } },
  });

  const firstName = (user?.full_name || 'Admin').split(' ')[0];
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <DashboardLayout navItems={nav} brandTitle={brand} roleBadge={badge} hideBanner>

      {/* ══ UNIFIED BANNER ══ */}
      <div style={{
        borderRadius: 18, padding: '26px 28px 22px', marginBottom: 24,
        position: 'relative', overflow: 'hidden', minHeight: 130,
        ...(hospital.hospital_image
          ? { backgroundImage: `url(${hospital.hospital_image})`, backgroundSize: 'cover', backgroundPosition: 'center top' }
          : { background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 55%, #4361ee 100%)' }),
      }}>
        {/* Dark overlay */}
        <div style={{ position: 'absolute', inset: 0, borderRadius: 18,
          background: hospital.hospital_image
            ? 'linear-gradient(135deg, rgba(10,15,30,0.90) 0%, rgba(20,40,80,0.75) 55%, rgba(67,97,238,0.45) 100%)'
            : 'none',
        }}></div>
        {/* Decorative circles (no-image only) */}
        {!hospital.hospital_image && (
          <>
            <div style={{ position: 'absolute', right: -50, top: -50, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }}></div>
            <div style={{ position: 'absolute', right: 100, bottom: -80, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }}></div>
          </>
        )}

        {/* Change Banner button — top right */}
        <input ref={bannerInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleBannerUpload} />
        <button type="button" onClick={() => bannerInputRef.current?.click()} disabled={bannerUploading}
          style={{ position: 'absolute', top: 12, right: 14, zIndex: 10, padding: '5px 12px', borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.12)',
            color: '#fff', fontSize: 11, fontWeight: 600, cursor: bannerUploading ? 'not-allowed' : 'pointer',
            backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', gap: 5 }}>
          <i className={bannerUploading ? 'fas fa-spinner fa-spin' : 'fas fa-image'}></i>
          {bannerUploading ? 'Uploading…' : hospital.hospital_image ? 'Change Banner' : 'Upload Banner'}
        </button>

        {/* Content row */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          {/* Hospital icon */}
          <div style={{ width: 54, height: 54, borderRadius: 14, flexShrink: 0,
            background: 'rgba(255,255,255,0.13)', border: '1px solid rgba(255,255,255,0.18)',
            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <i className="fas fa-hospital" style={{ color: '#fff', fontSize: 24 }}></i>
          </div>

          {/* Main info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            {/* Greeting + date */}
            <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
              Welcome back, <span style={{ color: '#93c5fd', fontWeight: 700 }}>{firstName}</span>
              <span style={{ marginLeft: 14, color: 'rgba(255,255,255,0.35)', fontWeight: 400 }}>{today}</span>
            </div>
            {/* Hospital name */}
            <div style={{ color: '#fff', fontWeight: 900, fontSize: 22, lineHeight: 1.15,
              letterSpacing: '-0.3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {hospital.name || user?.hospital_name || 'Your Hospital'}
            </div>
            {/* Chips row */}
            <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
              <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                <i className="fas fa-id-badge" style={{ fontSize: 11 }}></i>
                {user?.employee_id || 'Staff'}
              </span>
              <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                <i className="fas fa-briefcase-medical" style={{ fontSize: 11 }}></i>
                {user?.role_display || 'Hospital Admin'}
              </span>
              {[hospital.hospital_type_display, hospital.district_name].filter(Boolean).length > 0 && (
                <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <i className="fas fa-map-marker-alt" style={{ fontSize: 11 }}></i>
                  {[hospital.hospital_type_display, hospital.district_name].filter(Boolean).join(' · ')}
                </span>
              )}
              {user?.address && (
                <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <i className="fas fa-home" style={{ fontSize: 11 }}></i>
                  {user.address}
                </span>
              )}
            </div>
          </div>

          {/* Divider */}
          <div style={{ width: 1, height: 52, background: 'rgba(255,255,255,0.15)', flexShrink: 0, alignSelf: 'center' }}></div>

          {/* Right side: On Duty + action buttons */}
          <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 10 }}>
            <div style={{ background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.22)',
              borderRadius: 20, padding: '5px 16px', display: 'flex', alignItems: 'center', gap: 7 }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#4ade80',
                display: 'inline-block', boxShadow: '0 0 6px #4ade80' }}></span>
              <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>On Duty</span>
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <Link to="/admin/users" style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                background: 'rgba(255,255,255,0.15)', border: '1px solid rgba(255,255,255,0.25)',
                color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5 }}>
                <i className="fas fa-user-plus" style={{ fontSize: 11 }}></i>Add Staff
              </Link>
              <Link to="/receptionist/patients/register" style={{ padding: '6px 14px', borderRadius: 8, fontSize: 12, fontWeight: 700,
                background: 'rgba(255,255,255,0.10)', border: '1px solid rgba(255,255,255,0.20)',
                color: '#fff', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 5 }}>
                <i className="fas fa-user-injured" style={{ fontSize: 11 }}></i>Register Patient
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* ══ TODAY'S PULSE — 4 live cards ══ */}
      <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 10 }}>TODAY'S ACTIVITY</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
        <Card icon="fas fa-calendar-day"   label="Visits Today"         value={ov.visits_today}          color="#4361ee" bg="#eff2ff" />
        <Card icon="fas fa-hourglass-half" label="Active Right Now"     value={ov.active_visits}         color="#f77f00" bg="#fff7ed" sub="In progress / waiting" />
        <Card icon="fas fa-calendar-check" label="Appointments Today"   value={ov.appointments_today}    color="#7c3aed" bg="#f3e8ff" link="/receptionist/appointments" linkLabel="View schedule" />
        <Card icon="fas fa-user-plus"      label="New Patients (30 days)" value={ov.new_patients_this_month} color="#16a34a" bg="#dcfce7" link="/receptionist/patients" linkLabel="View patients" />
      </div>

      {/* ══ CORE STATS — 4 totals ══ */}
      <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', letterSpacing: '1.5px', textTransform: 'uppercase', marginBottom: 10 }}>HOSPITAL OVERVIEW</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 24 }}>
        <Card icon="fas fa-users"           label="Total Staff"          value={ov.total_staff}       color="#4361ee" bg="#eff2ff" link="/admin/users"                    linkLabel="Manage staff" />
        <Card icon="fas fa-user-injured"    label="Registered Patients"  value={ov.total_patients}    color="#0891b2" bg="#e0f2fe" link="/receptionist/patients"         linkLabel="View all" />
        <Card icon="fas fa-history"         label="Total Visits"         value={ov.total_visits}      color="#7c3aed" bg="#f3e8ff" />
        <Card icon="fas fa-building"        label="Departments"          value={ov.total_departments} color="#059669" bg="#d1fae5" link="/admin/departments"              linkLabel="Manage" />
      </div>

      {/* ══ APPOINTMENTS MINI STRIP ══ */}
      <div style={{ background: 'linear-gradient(90deg,#4361ee11,#7c3aed11)', borderRadius: 12, padding: '16px 24px', marginBottom: 24, display: 'flex', gap: 32, alignItems: 'center' }}>
        <i className="fas fa-calendar-alt" style={{ color: '#4361ee', fontSize: 22 }}></i>
        {[
          { label: 'Pending Appointments', value: ov.appointments_pending, color: '#f77f00' },
          { label: 'Confirmed Appointments', value: ov.appointments_confirmed, color: '#16a34a' },
          { label: 'Today\'s Appointments', value: ov.appointments_today, color: '#4361ee' },
        ].map(a => (
          <div key={a.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ fontSize: 26, fontWeight: 800, color: a.color }}>{a.value ?? '—'}</div>
            <div style={{ fontSize: 12, color: '#64748b', maxWidth: 80 }}>{a.label}</div>
          </div>
        ))}
        <div style={{ marginLeft: 'auto' }}>
          <Link to="/receptionist/appointments" className="btn btn-primary btn-sm" style={{ fontWeight: 600 }}>
            <i className="fas fa-calendar-check me-2"></i>View Appointments
          </Link>
        </div>
      </div>

      {/* ══ CHARTS ROW 1: Line trend + Doughnut ══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20, marginBottom: 20 }}>

        {/* Monthly Visit Trend */}
        <div style={{ background: '#fff', borderRadius: 14, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <SectionHeader icon="fas fa-chart-line" color="#4361ee" title="Monthly Visit Trend (Last 6 Months)" />
          {monthly.length === 0
            ? <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>No visit data yet.</div>
            : <div style={{ height: 200 }}><Line data={lineData} options={{ ...chartOpts(), plugins: { legend: { display: false } } }} /></div>
          }
        </div>

        {/* Visits by Status Doughnut */}
        <div style={{ background: '#fff', borderRadius: 14, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <SectionHeader icon="fas fa-chart-pie" color="#7c3aed" title="Visit Status" />
          {vByStatus.length === 0
            ? <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>No visits yet.</div>
            : <>
                <div style={{ height: 160 }}><Doughnut data={doughnutData} options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }} /></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 12 }}>
                  {vByStatus.map(v => (
                    <div key={v.status} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: statusColors[v.status] || '#94a3b8' }}></div>
                        <span style={{ textTransform: 'capitalize', color: '#374151' }}>{v.status}</span>
                      </div>
                      <span style={{ fontWeight: 700, color: statusColors[v.status] || '#374151' }}>{v.count}</span>
                    </div>
                  ))}
                </div>
              </>
          }
        </div>
      </div>

      {/* ══ CHARTS ROW 2: Staff bar + Top Departments bar ══ */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>

        {/* Staff by Role Bar */}
        <div style={{ background: '#fff', borderRadius: 14, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <SectionHeader icon="fas fa-id-badge" color="#4361ee" title="Staff by Role" action="Manage Staff" actionLink="/admin/users" />
          {staffByRole.length === 0
            ? <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>No staff assigned yet.</div>
            : <div style={{ height: 200 }}><Bar data={barData} options={chartOpts()} /></div>
          }
        </div>

        {/* Top Departments */}
        <div style={{ background: '#fff', borderRadius: 14, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <SectionHeader icon="fas fa-building" color="#059669" title="Top Departments by Visits" action="Manage" actionLink="/admin/departments" />
          {topDepts.length === 0
            ? <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: '40px 0' }}>No department data yet.</div>
            : <div style={{ height: 200 }}><Bar data={deptBarData} options={chartOpts()} /></div>
          }
        </div>
      </div>

      {/* ══ RECENT VISITS TABLE ══ */}
      <div style={{ background: '#fff', borderRadius: 14, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', marginBottom: 20 }}>
        <SectionHeader icon="fas fa-history" color="#16a34a" title="Recent Visits" action="All Patients" actionLink="/receptionist/patients" />
        {recentVisits.length === 0
          ? <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No visits recorded yet.</div>
          : <div style={{ overflowX: 'auto' }}>
              <table className="table table-hover table-sm mb-0" style={{ fontSize: 13 }}>
                <thead><tr style={{ background: '#f8fafc', fontSize: 11, textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.5px' }}>
                  <th>Patient</th><th>Department</th><th>Doctor</th><th>Type</th><th>Status</th><th>Date</th><th></th>
                </tr></thead>
                <tbody>
                  {recentVisits.map(v => (
                    <tr key={v.id}>
                      <td style={{ fontWeight: 600, color: '#1a1a2e' }}>{v.patient_name}</td>
                      <td style={{ color: '#64748b' }}>{v.department}</td>
                      <td style={{ color: '#64748b' }}>{v.doctor !== '—' ? `Dr. ${v.doctor}` : '—'}</td>
                      <td style={{ textTransform: 'capitalize', color: '#64748b' }}>{v.visit_type}</td>
                      <td>
                        <span style={{ padding: '2px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, background: statusBg[v.status] || '#f1f5f9', color: statusColors[v.status] || '#64748b' }}>
                          {v.status}
                        </span>
                      </td>
                      <td style={{ color: '#64748b' }}>{v.visit_date ? new Date(v.visit_date).toLocaleDateString('en-GB') : '—'}</td>
                      <td>
                        {v.patient_pk && (
                          <Link to={`/receptionist/patients/${v.patient_pk}`} className="btn btn-outline-primary btn-sm" style={{ fontSize: 11, padding: '2px 8px' }}>
                            View
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
        }
      </div>

      {/* ══ RECENT AUDIT ACTIVITY ══ */}
      <div style={{ background: '#fff', borderRadius: 14, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
        <SectionHeader icon="fas fa-shield-alt" color="#dc2626" title="Recent Record Access Activity" />
        {auditLog.length === 0
          ? <div style={{ color: '#94a3b8', fontSize: 13, textAlign: 'center', padding: '20px 0' }}>No audit events yet.</div>
          : <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {auditLog.map((a, i) => {
                const isAllowed = a.outcome === 'allowed';
                const isDenied  = a.outcome === 'denied';
                return (
                  <div key={a.id || i} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 14px', borderRadius: 10, background: isAllowed ? '#f0fdf4' : isDenied ? '#fef2f2' : '#f8fafc', border: `1px solid ${isAllowed ? '#bbf7d0' : isDenied ? '#fecaca' : '#e9ecef'}` }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: isAllowed ? '#dcfce7' : isDenied ? '#fee2e2' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <i className={isAllowed ? 'fas fa-check' : isDenied ? 'fas fa-ban' : 'fas fa-info'} style={{ fontSize: 11, color: isAllowed ? '#16a34a' : isDenied ? '#dc2626' : '#64748b' }}></i>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a2e' }}>
                        {a.user_name || 'Unknown'} accessed {a.patient_name || 'Unknown Patient'}
                      </div>
                      <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                        Action: <strong>{a.action}</strong> · Type: <strong>{a.access_type}</strong> · Role: <strong>{a.user_role}</strong>
                      </div>
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', flexShrink: 0 }}>
                      {a.created_at ? new Date(a.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : '—'}
                    </div>
                  </div>
                );
              })}
            </div>
        }
      </div>

    </DashboardLayout>
  );
}

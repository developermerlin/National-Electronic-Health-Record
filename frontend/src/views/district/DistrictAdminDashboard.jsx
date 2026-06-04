import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layout/DashboardLayout';
import { getNavForUser, getBrandForUser, getRoleBadge } from '../../utils/navItems';

const ROLE_LABELS = {
  doctor: 'Doctors', nurse: 'Nurses', receptionist: 'Receptionists',
  pharmacist: 'Pharmacists', lab_technician: 'Lab Technicians',
  triage: 'Triage Officers', hospital_admin: 'Hospital Admins',
};
const ROLE_COLORS = ['#4361ee','#16a34a','#f77f00','#7c3aed','#0891b2','#dc2626','#2ec4b6'];

function DistrictAdminDashboard() {
  const { apiCall, user } = useAuth();
  const navItems  = getNavForUser(user);
  const brand     = getBrandForUser(user);
  const roleBadge = getRoleBadge(user);

  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await apiCall('/admin/district-dashboard/');
      if (res.ok) setData(await res.json());
      else { const d = await res.json(); setError(d.error || 'Failed to load dashboard.'); }
    } catch { setError('Network error.'); }
    setLoading(false);
  }, [apiCall]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const s = data?.summary || {};
  const district = data?.district || {};
  const hospitals = data?.hospital_breakdown || [];
  const trend = data?.monthly_trend || [];
  const staffRoles = data?.staff_by_role || [];

  const maxTrend = Math.max(...trend.map(t => t.visits), 1);

  const statCards = [
    { icon: 'fas fa-hospital',        label: 'Hospitals',         value: s.hospitals,          color: '#0891b2', bg: '#e0f2fe' },
    { icon: 'fas fa-users',           label: 'Total Patients',    value: s.patients,           color: '#16a34a', bg: '#dcfce7' },
    { icon: 'fas fa-user-md',         label: 'Healthcare Staff',  value: s.staff,              color: '#7c3aed', bg: '#ede9fe' },
    { icon: 'fas fa-calendar-check',  label: 'Visits Today',      value: s.visits_today,       color: '#f77f00', bg: '#fff7ed' },
    { icon: 'fas fa-chart-line',      label: 'Visits This Month', value: s.visits_this_month,  color: '#4361ee', bg: '#eff2ff' },
    { icon: 'fas fa-bed',             label: 'Current Admissions',value: s.admissions_current, color: '#dc2626', bg: '#fee2e2' },
  ];

  return (
    <DashboardLayout navItems={navItems} brandTitle={brand} roleBadge={roleBadge}>
      <div style={{ padding: '20px 16px', maxWidth: 1300, margin: '0 auto' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontWeight: 800, fontSize: 26, color: '#0f172a', margin: 0 }}>
              <i className="fas fa-map-marked-alt me-2" style={{ color: '#0891b2' }}></i>District Dashboard
            </h2>
            <p style={{ color: '#64748b', fontSize: 13, marginTop: 4, marginBottom: 0 }}>
              {district.name ? <><strong>{district.name}</strong> · {district.region} Region</> : 'Loading district data...'}
            </p>
          </div>
          <button onClick={fetchData} style={{ padding: '8px 16px', borderRadius: 9, border: '1px solid #e2e8f0', background: '#fff', color: '#374151', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="fas fa-sync-alt" style={{ fontSize: 11 }}></i>Refresh
          </button>
        </div>

        {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 16px', borderRadius: 10, fontSize: 13, marginBottom: 20 }}>{error}</div>}

        {/* ── Stats row ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
          {statCards.map(({ icon, label, value, color, bg }) => (
            <div key={label} style={{ background: '#fff', borderRadius: 14, padding: '18px 20px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className={icon} style={{ color, fontSize: 18 }}></i>
                </div>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a' }}>{loading ? '—' : (value ?? 0).toLocaleString()}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>{label}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Middle row: Monthly trend + Staff breakdown ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>

          {/* Monthly visits bar chart */}
          <div style={{ background: '#fff', borderRadius: 16, padding: '20px 22px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
            <h5 style={{ fontWeight: 800, fontSize: 15, color: '#0f172a', margin: '0 0 18px' }}>
              <i className="fas fa-chart-bar me-2" style={{ color: '#4361ee' }}></i>Monthly Visit Trend
            </h5>
            {loading ? (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 120 }}>
                {[40, 65, 80, 55, 70, 45].map((h, i) => <div key={i} style={{ flex: 1, background: '#f1f5f9', borderRadius: 6, height: `${h}%` }} />)}
              </div>
            ) : (
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 130 }}>
                {trend.map(t => {
                  const pct = maxTrend ? Math.max((t.visits / maxTrend) * 100, 4) : 4;
                  return (
                    <div key={t.month} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                      <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>{t.visits}</div>
                      <div style={{ width: '100%', background: '#4361ee', borderRadius: '4px 4px 0 0', height: `${pct}%`, minHeight: 6, transition: 'height 0.4s' }} />
                      <div style={{ fontSize: 9, color: '#94a3b8', whiteSpace: 'nowrap' }}>{t.month.split(' ')[0]}</div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Staff by role */}
          <div style={{ background: '#fff', borderRadius: 16, padding: '20px 22px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
            <h5 style={{ fontWeight: 800, fontSize: 15, color: '#0f172a', margin: '0 0 16px' }}>
              <i className="fas fa-users me-2" style={{ color: '#7c3aed' }}></i>Staff Distribution
            </h5>
            {loading ? (
              <div style={{ color: '#94a3b8', textAlign: 'center', padding: 20 }}>Loading...</div>
            ) : staffRoles.length === 0 ? (
              <div style={{ color: '#94a3b8', textAlign: 'center', padding: 20 }}>No staff data</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {staffRoles.slice(0, 6).map((r, i) => {
                  const total = staffRoles.reduce((a, b) => a + b.count, 0) || 1;
                  const pct   = Math.round((r.count / total) * 100);
                  const color = ROLE_COLORS[i % ROLE_COLORS.length];
                  return (
                    <div key={r.role__name}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{ROLE_LABELS[r.role__name] || r.role__name}</span>
                        <span style={{ fontSize: 12, color: '#64748b' }}>{r.count} ({pct}%)</span>
                      </div>
                      <div style={{ height: 6, background: '#f1f5f9', borderRadius: 99 }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.4s' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Hospital breakdown table ── */}
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h5 style={{ fontWeight: 800, fontSize: 15, color: '#0f172a', margin: 0 }}>
              <i className="fas fa-hospital me-2" style={{ color: '#0891b2' }}></i>Hospitals in {district.name || 'District'}
            </h5>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>{hospitals.length} facilities</span>
          </div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}>
              <div className="spinner-border text-primary" role="status" style={{ width: 28, height: 28 }}></div>
            </div>
          ) : hospitals.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 48, color: '#94a3b8' }}>
              <i className="fas fa-hospital" style={{ fontSize: 40, marginBottom: 12, display: 'block' }}></i>
              No hospitals found in this district.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {['Hospital', 'Type', 'Patients', 'Visits', 'Staff', 'Appointments'].map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {hospitals.map((h, i) => (
                    <tr key={h.id} style={{ borderTop: '1px solid #f1f5f9', background: i % 2 ? '#fafafa' : '#fff' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{h.name}</div>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: '#e0f2fe', color: '#0891b2' }}>{h.type || '—'}</span>
                      </td>
                      <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{(h.patients || 0).toLocaleString()}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{(h.visits || 0).toLocaleString()}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{(h.staff || 0).toLocaleString()}</td>
                      <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{(h.appointments || 0).toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </DashboardLayout>
  );
}

export default DistrictAdminDashboard;

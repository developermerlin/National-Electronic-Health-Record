import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layout/DashboardLayout';
import { getNavForUser, getBrandForUser, getRoleBadge } from '../../utils/navItems';

const ACCENT = '#8b5cf6';

function StatCard({ icon, label, value, accent, subtitle }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: '18px 20px', boxShadow: '0 2px 8px rgba(15,23,42,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: 11, background: accent + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <i className={icon} style={{ color: accent, fontSize: 18 }}></i>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{value}</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginTop: 4 }}>{label}</div>
          {subtitle && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{subtitle}</div>}
        </div>
      </div>
    </div>
  );
}

export default function AuditComplianceDashboard() {
  const { apiCall, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState(null);
  const [tab, setTab] = useState('overview'); // overview | actions | users | patients

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiCall('/audit/compliance-report/');
      if (res.ok) {
        const data = await res.json();
        setReport(data);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [apiCall]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const handleExportCSV = async () => {
    try {
      const res = await apiCall('/audit/export/');
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch {
      alert('Error exporting audit logs');
    }
  };

  const tabStyle = (key) => ({
    padding: '10px 24px',
    fontWeight: 700,
    fontSize: 14,
    border: 'none',
    borderBottom: tab === key ? `3px solid ${ACCENT}` : '3px solid transparent',
    background: 'transparent',
    color: tab === key ? ACCENT : '#64748b',
    cursor: 'pointer',
    transition: 'all 0.15s',
  });

  return (
    <DashboardLayout navItems={getNavForUser(user)} brandTitle={getBrandForUser(user)} roleBadge={getRoleBadge(user)}>
      <div style={{ padding: '28px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: 0 }}>
              <i className="fas fa-clipboard-check me-2" style={{ color: ACCENT }}></i>
              Audit & Compliance Dashboard
            </h1>
            <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 14 }}>
              {report ? `Report Period: ${new Date(report.report_period.from).toLocaleDateString()} - ${new Date(report.report_period.to).toLocaleDateString()}` : 'Loading...'}
            </p>
          </div>
          <button onClick={handleExportCSV}
            style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: ACCENT, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="fas fa-download"></i>Export CSV
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <div className="spinner-border" style={{ color: ACCENT, width: 48, height: 48 }} role="status"></div>
            <div style={{ marginTop: 16, fontSize: 14, color: '#64748b' }}>Generating compliance report...</div>
          </div>
        ) : report ? (
          <>
            {/* Summary Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14, marginBottom: 24 }}>
              <StatCard icon="fas fa-database" label="Total Access Attempts" value={report.summary?.total_access_attempts?.toLocaleString() || 0} accent="#8b5cf6" subtitle="All time" />
              <StatCard icon="fas fa-calendar-day" label="Last 30 Days" value={report.summary?.last_30_days?.toLocaleString() || 0} accent="#4361ee" />
              <StatCard icon="fas fa-calendar-week" label="Last 365 Days" value={report.summary?.last_365_days?.toLocaleString() || 0} accent="#10b981" />
              <StatCard icon="fas fa-exclamation-triangle" label="Denial Rate" value={`${report.access_outcomes?.denial_rate || 0}%`} accent="#ef4444" subtitle={`${report.access_outcomes?.denied || 0} denied`} />
            </div>

            {/* Tabs */}
            <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 8px rgba(15,23,42,0.06)', marginBottom: 24, overflow: 'hidden' }}>
              <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9' }}>
                <button style={tabStyle('overview')} onClick={() => setTab('overview')}>
                  <i className="fas fa-chart-pie me-2"></i>Overview
                </button>
                <button style={tabStyle('actions')} onClick={() => setTab('actions')}>
                  <i className="fas fa-tasks me-2"></i>Top Actions
                </button>
                <button style={tabStyle('users')} onClick={() => setTab('users')}>
                  <i className="fas fa-users me-2"></i>Denied Users
                </button>
                <button style={tabStyle('patients')} onClick={() => setTab('patients')}>
                  <i className="fas fa-user-injured me-2"></i>Accessed Patients
                </button>
              </div>
            </div>

            {/* Overview Tab */}
            {tab === 'overview' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
                
                {/* Access Outcomes */}
                <div style={{ background: '#fff', borderRadius: 14, padding: '20px 24px', boxShadow: '0 2px 8px rgba(15,23,42,0.06)' }}>
                  <h5 style={{ fontWeight: 800, fontSize: 15, margin: '0 0 16px', color: '#0f172a' }}>
                    <i className="fas fa-check-circle me-2" style={{ color: '#10b981' }}></i>Access Outcomes
                  </h5>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#f0fdf4', borderRadius: 10 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#166534' }}>Allowed</span>
                      <span style={{ fontSize: 18, fontWeight: 800, color: '#15803d' }}>{report.access_outcomes?.allowed?.toLocaleString() || 0}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#fef2f2', borderRadius: 10 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#991b1b' }}>Denied</span>
                      <span style={{ fontSize: 18, fontWeight: 800, color: '#dc2626' }}>{report.access_outcomes?.denied?.toLocaleString() || 0}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', background: '#fef3c7', borderRadius: 10 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#92400e' }}>Override</span>
                      <span style={{ fontSize: 18, fontWeight: 800, color: '#d97706' }}>{report.access_outcomes?.override?.toLocaleString() || 0}</span>
                    </div>
                  </div>
                </div>

                {/* Emergency Access */}
                <div style={{ background: '#fff', borderRadius: 14, padding: '20px 24px', boxShadow: '0 2px 8px rgba(15,23,42,0.06)' }}>
                  <h5 style={{ fontWeight: 800, fontSize: 15, margin: '0 0 16px', color: '#0f172a' }}>
                    <i className="fas fa-ambulance me-2" style={{ color: '#ef4444' }}></i>Emergency Access
                  </h5>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 32, fontWeight: 800, color: '#0f172a' }}>{report.emergency_access?.total?.toLocaleString() || 0}</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Total emergency overrides</div>
                  </div>
                  <div style={{ padding: '12px', background: '#fef2f2', borderRadius: 10, marginBottom: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#991b1b', marginBottom: 4 }}>Last 30 Days</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#dc2626' }}>{report.emergency_access?.last_30_days?.toLocaleString() || 0}</div>
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>
                    {report.emergency_access?.percentage_of_total || 0}% of total access attempts
                  </div>
                </div>

                {/* Cross-Hospital Access */}
                <div style={{ background: '#fff', borderRadius: 14, padding: '20px 24px', boxShadow: '0 2px 8px rgba(15,23,42,0.06)' }}>
                  <h5 style={{ fontWeight: 800, fontSize: 15, margin: '0 0 16px', color: '#0f172a' }}>
                    <i className="fas fa-hospital me-2" style={{ color: '#f59e0b' }}></i>Cross-Hospital Access
                  </h5>
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ fontSize: 32, fontWeight: 800, color: '#0f172a' }}>{report.cross_hospital_access?.total?.toLocaleString() || 0}</div>
                    <div style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Total cross-hospital attempts</div>
                  </div>
                  <div style={{ padding: '12px', background: '#fef3c7', borderRadius: 10, marginBottom: 12 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: '#92400e', marginBottom: 4 }}>Last 30 Days</div>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#d97706' }}>{report.cross_hospital_access?.last_30_days?.toLocaleString() || 0}</div>
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>
                    {report.cross_hospital_access?.percentage_of_total || 0}% of total access attempts
                  </div>
                </div>

              </div>
            )}

            {/* Top Actions Tab */}
            {tab === 'actions' && (
              <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 8px rgba(15,23,42,0.06)', overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', background: '#faf5ff' }}>
                  <h5 style={{ fontWeight: 800, fontSize: 15, margin: 0, color: '#8b5cf6' }}>Top 10 Actions by Frequency</h5>
                </div>
                <div style={{ padding: '20px 24px' }}>
                  {report.top_actions?.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {report.top_actions.map((item, i) => (
                        <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <div style={{ width: 32, height: 32, borderRadius: 8, background: ACCENT + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: ACCENT }}>
                            {i + 1}
                          </div>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a', textTransform: 'capitalize' }}>{item.action.replace('_', ' ')}</div>
                            <div style={{ width: '100%', height: 6, background: '#f1f5f9', borderRadius: 3, marginTop: 4, overflow: 'hidden' }}>
                              <div style={{ width: `${(item.count / report.top_actions[0].count) * 100}%`, height: '100%', background: ACCENT, borderRadius: 3 }}></div>
                            </div>
                          </div>
                          <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{item.count.toLocaleString()}</div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>No data available</div>
                  )}
                </div>
              </div>
            )}

            {/* Denied Users Tab */}
            {tab === 'users' && (
              <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 8px rgba(15,23,42,0.06)', overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', background: '#fef2f2' }}>
                  <h5 style={{ fontWeight: 800, fontSize: 15, margin: 0, color: '#dc2626' }}>Users with Most Denied Access</h5>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  {report.top_denied_users?.length > 0 ? (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc' }}>
                          <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Rank</th>
                          <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>User</th>
                          <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Role</th>
                          <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Denied Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.top_denied_users.map((user, i) => (
                          <tr key={i} style={{ borderTop: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 800, color: ACCENT }}>{i + 1}</td>
                            <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{user.user_name || 'N/A'}</td>
                            <td style={{ padding: '12px 14px', fontSize: 12, color: '#64748b', textTransform: 'capitalize' }}>{user.user_role || 'N/A'}</td>
                            <td style={{ padding: '12px 14px', fontSize: 16, fontWeight: 800, color: '#dc2626', textAlign: 'right' }}>{user.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>No denied access records</div>
                  )}
                </div>
              </div>
            )}

            {/* Accessed Patients Tab */}
            {tab === 'patients' && (
              <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 8px rgba(15,23,42,0.06)', overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', background: '#f0fdf4' }}>
                  <h5 style={{ fontWeight: 800, fontSize: 15, margin: 0, color: '#15803d' }}>Most Accessed Patients</h5>
                </div>
                <div style={{ overflowX: 'auto' }}>
                  {report.top_accessed_patients?.length > 0 ? (
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ background: '#f8fafc' }}>
                          <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Rank</th>
                          <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Patient</th>
                          <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Patient ID</th>
                          <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Access Count</th>
                        </tr>
                      </thead>
                      <tbody>
                        {report.top_accessed_patients.map((patient, i) => (
                          <tr key={i} style={{ borderTop: '1px solid #f1f5f9' }}>
                            <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 800, color: ACCENT }}>{i + 1}</td>
                            <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600, color: '#0f172a' }}>{patient.patient_name || 'N/A'}</td>
                            <td style={{ padding: '12px 14px', fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>{patient.patient_id || 'N/A'}</td>
                            <td style={{ padding: '12px 14px', fontSize: 16, fontWeight: 800, color: '#10b981', textAlign: 'right' }}>{patient.count}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div style={{ textAlign: 'center', padding: 60, color: '#94a3b8' }}>No patient access records</div>
                  )}
                </div>
              </div>
            )}

          </>
        ) : null}

      </div>
    </DashboardLayout>
  );
}

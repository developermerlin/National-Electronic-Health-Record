import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layout/DashboardLayout';

function DistrictAdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({
    totalHospitals: 0,
    totalPatients: 0,
    totalStaff: 0,
    activeCases: 0,
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      // In a real implementation, these would be actual API endpoints
      // For now, we'll set placeholder data
      setStats({
        totalHospitals: 12,
        totalPatients: 2847,
        totalStaff: 156,
        activeCases: 423,
      });
      setRecentActivities([
        { id: 1, type: 'hospital', message: 'New hospital registered: Bo Government Hospital', time: '2 hours ago' },
        { id: 2, type: 'patient', message: 'Patient transfer requested from Makeni', time: '4 hours ago' },
        { id: 3, type: 'staff', message: 'New doctor assigned to Kenema Hospital', time: '6 hours ago' },
        { id: 4, type: 'report', message: 'Monthly health report submitted', time: '1 day ago' },
      ]);
    } catch (error) {
      console.error('Error fetching district data:', error);
    } finally {
      setLoading(false);
    }
  };

  const navItems = [
    {
      label: 'Dashboard',
      items: [
        { path: '/district-admin/dashboard', icon: 'fas fa-tachometer-alt', text: 'Overview' },
      ]
    },
    {
      label: 'District Management',
      items: [
        { path: '/admin/hospitals', icon: 'fas fa-hospital', text: 'Hospitals' },
        { path: '/admin/chiefdoms', icon: 'fas fa-sitemap', text: 'Chiefdoms' },
        { path: '/admin/towns', icon: 'fas fa-city', text: 'Towns' },
      ]
    },
    {
      label: 'Health Data',
      items: [
        { path: '/district-admin/patients', icon: 'fas fa-procedures', text: 'District Patients' },
        { path: '/district-admin/staff', icon: 'fas fa-user-md', text: 'Staff Overview' },
        { path: '/district-admin/reports', icon: 'fas fa-chart-line', text: 'Health Reports' },
      ]
    },
    {
      label: 'Account',
      items: [
        { path: '/admin/profile', icon: 'fas fa-user-circle', text: 'My Profile' },
      ]
    }
  ];

  const statCards = [
    { icon: 'fas fa-hospital', label: 'Hospitals', value: stats.totalHospitals, accent: '#0891b2' },
    { icon: 'fas fa-procedures', label: 'Total Patients', value: stats.totalPatients, accent: '#10b981' },
    { icon: 'fas fa-user-md', label: 'Healthcare Staff', value: stats.totalStaff, accent: '#6366f1' },
    { icon: 'fas fa-heartbeat', label: 'Active Cases', value: stats.activeCases, accent: '#f59e0b' },
  ];

  const getActivityIcon = (type) => {
    switch(type) {
      case 'hospital': return { icon: 'fas fa-hospital', color: '#0891b2' };
      case 'patient': return { icon: 'fas fa-procedures', color: '#10b981' };
      case 'staff': return { icon: 'fas fa-user-md', color: '#6366f1' };
      case 'report': return { icon: 'fas fa-file-alt', color: '#f59e0b' };
      default: return { icon: 'fas fa-info-circle', color: '#64748b' };
    }
  };

  return (
    <DashboardLayout navItems={navItems} brandTitle="District Health Office" roleBadge="District Admin">
      <div style={{ padding: '28px 24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: 0 }}>District Admin Dashboard</h1>
            <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 14 }}>
              Managing: <strong style={{ color: '#0891b2' }}>{user?.district_name || 'Your District'}</strong>
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'linear-gradient(135deg,#0891b2,#0e7490)',
              color: '#fff', border: 'none', borderRadius: 10,
              padding: '10px 20px', fontWeight: 700, fontSize: 14,
              cursor: 'pointer', boxShadow: '0 4px 14px rgba(8,145,178,0.35)',
            }}>
              <i className="fas fa-file-export" style={{ fontSize: 12 }}></i>Export Report
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14, marginBottom: 24 }}>
          {statCards.map(s => (
            <div key={s.label} style={{
              background: '#fff', borderRadius: 16, padding: '20px 20px 16px',
              boxShadow: '0 2px 8px rgba(15,23,42,0.06)', border: 'none',
            }}>
              <div style={{ width: 42, height: 42, borderRadius: 12, background: s.accent + '15',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
                <i className={s.icon} style={{ color: s.accent, fontSize: 17 }}></i>
              </div>
              <div style={{ fontSize: 30, fontWeight: 800, color: '#0f172a', lineHeight: 1, marginBottom: 6 }}>
                {s.value.toLocaleString()}
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{s.label}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 20 }}>
          {/* Recent Activity */}
          <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 8px rgba(15,23,42,0.06)', overflow: 'hidden' }}>
            <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Recent Activity</h3>
            </div>
            {loading ? (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <div className="spinner-border text-primary" role="status"></div>
              </div>
            ) : recentActivities.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                <i className="fas fa-bell" style={{ fontSize: 40, marginBottom: 12, display: 'block' }}></i>
                <p>No recent activity</p>
              </div>
            ) : (
              <div>
                {recentActivities.map((activity, idx) => {
                  const iconStyle = getActivityIcon(activity.type);
                  return (
                    <div key={activity.id}
                      style={{ display: 'flex', alignItems: 'flex-start', gap: 12,
                        padding: '14px 20px',
                        borderBottom: idx < recentActivities.length - 1 ? '1px solid #f8fafc' : 'none' }}
                    >
                      <div style={{ width: 36, height: 36, borderRadius: 10, background: iconStyle.color + '15',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <i className={iconStyle.icon} style={{ color: iconStyle.color, fontSize: 14 }}></i>
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 500, color: '#334155', marginBottom: 2 }}>
                          {activity.message}
                        </div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>{activity.time}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 8px rgba(15,23,42,0.06)', padding: '20px' }}>
            <h3 style={{ margin: '0 0 16px', fontSize: 16, fontWeight: 700, color: '#0f172a' }}>Quick Actions</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              {[
                { icon: 'fas fa-hospital', label: 'Add Hospital', color: '#0891b2' },
                { icon: 'fas fa-user-plus', label: 'Add Staff', color: '#10b981' },
                { icon: 'fas fa-file-medical', label: 'View Reports', color: '#6366f1' },
                { icon: 'fas fa-envelope', label: 'Send Notice', color: '#f59e0b' },
              ].map(action => (
                <button key={action.label}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8,
                    padding: '20px 16px', borderRadius: 12, border: '1px solid #e2e8f0',
                    background: '#fff', cursor: 'pointer', transition: 'all 0.15s'
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = action.color; }}
                  onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
                >
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: action.color + '15',
                    display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className={action.icon} style={{ color: action.color, fontSize: 18 }}></i>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{action.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* District Overview */}
        <div style={{ marginTop: 24, background: '#fff', borderRadius: 14, boxShadow: '0 2px 8px rgba(15,23,42,0.06)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#0f172a' }}>District Health Overview</h3>
          </div>
          <div style={{ padding: '20px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 20 }}>
            {[
              { label: 'Chiefdoms Managed', value: '8', icon: 'fas fa-sitemap', color: '#0891b2' },
              { label: 'Towns Covered', value: '24', icon: 'fas fa-city', color: '#6366f1' },
              { label: 'Health Facilities', value: '12', icon: 'fas fa-clinic-medical', color: '#10b981' },
              { label: 'Active Programs', value: '5', icon: 'fas fa-tasks', color: '#f59e0b' },
            ].map(item => (
              <div key={item.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: item.color + '15',
                  display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <i className={item.icon} style={{ color: item.color, fontSize: 16 }}></i>
                </div>
                <div>
                  <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>{item.value}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{item.label}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default DistrictAdminDashboard;

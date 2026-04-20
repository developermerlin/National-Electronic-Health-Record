import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layout/DashboardLayout';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler } from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler);

const navItems = [
  {
    label: 'Dashboard',
    items: [
      { path: '/admin/dashboard', icon: 'fas fa-tachometer-alt', text: 'Overview' },
    ]
  },
  {
    label: 'User Management',
    items: [
      { path: '/admin/users', icon: 'fas fa-users', text: 'All Users' },
      { path: '/admin/roles', icon: 'fas fa-user-tag', text: 'Roles & Permissions' },
    ]
  },
  {
    label: 'Organization',
    items: [
      { path: '/admin/regions', icon: 'fas fa-globe-africa', text: 'Regions' },
      { path: '/admin/districts', icon: 'fas fa-map-marked-alt', text: 'Districts' },
      { path: '/admin/chiefdoms', icon: 'fas fa-sitemap', text: 'Chiefdoms' },
      { path: '/admin/towns', icon: 'fas fa-city', text: 'Towns' },
      { path: '/admin/hospitals', icon: 'fas fa-hospital', text: 'Hospitals' },
      { path: '/admin/departments', icon: 'fas fa-building', text: 'Departments' },
    ]
  },
  {
    label: 'Communication',
    items: [
      { path: '/messages', icon: 'fas fa-envelope', text: 'Messages' },
    ]
  },
  {
    label: 'Account',
    items: [
      { path: '/admin/profile', icon: 'fas fa-user-circle', text: 'My Profile' },
    ]
  }
];

const roleColors = {
  admin: '#7c3aed',
  doctor: '#4361ee',
  nurse: '#2ec4b6',
  receptionist: '#f77f00',
  lab_technician: '#e63946',
  pharmacist: '#059669',
  patient: '#0891b2',
};

const roleBadgeClass = {
  admin: 'dash-badge-primary',
  doctor: 'dash-badge-primary',
  nurse: 'dash-badge-info',
  receptionist: 'dash-badge-warning',
  lab_technician: 'dash-badge-info',
  pharmacist: 'dash-badge-success',
  patient: 'dash-badge-secondary',
};

function AdminDashboard() {
  const { apiCall } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState({ total_users: 0, active_users: 0, inactive_users: 0, total_roles: 0 });
  const [recentUsers, setRecentUsers] = useState([]);
  const [roleDistribution, setRoleDistribution] = useState([]);
  const [userFilter, setUserFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const response = await apiCall('/admin/dashboard/');
      const data = await response.json();
      if (response.ok) {
        setStats(data.overview);
        setRecentUsers(data.recent_users);
        setRoleDistribution(data.role_distribution);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUserStatus = async (userId, currentStatus) => {
    try {
      if (currentStatus) {
        await apiCall(`/admin/users/${userId}/`, { method: 'DELETE' });
      } else {
        await apiCall(`/admin/users/${userId}/activate/`, { method: 'POST' });
      }
      fetchDashboardData();
    } catch (error) {
      console.error('Error toggling user status:', error);
    }
  };

  const getInitials = (name) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getTimeAgo = (dateStr) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const filteredUsers = recentUsers.filter(user => {
    if (userFilter === 'active') return user.is_active;
    if (userFilter === 'inactive') return !user.is_active;
    return true;
  });

  const _TotalRoleUsers = roleDistribution.reduce((sum, r) => sum + r.count, 0) || 1;

  return (
    <DashboardLayout navItems={navItems} brandTitle="NEHR Admin" roleBadge="Administrator">

      {/* Welcome Banner */}
      <div className="dash-welcome-banner">
        <h3>System Administration Dashboard</h3>
        <p>Complete overview of the National Electronic Health Record System. Monitor performance, manage users, and ensure system integrity.</p>
      </div>

      {/* System Stats Row */}
      <div className="row g-4 mb-4">
        <div className="col-xl-3 col-md-6">
          <div className="dash-stat-card">
            <div className="stat-icon bg-primary-soft">
              <i className="fas fa-users"></i>
            </div>
            <div className="stat-label">Total Users</div>
            <div className="stat-value">{loading ? '...' : stats.total_users.toLocaleString()}</div>
            <div className="stat-change positive">
              <i className="fas fa-arrow-up"></i> {stats.active_users} active
            </div>
          </div>
        </div>
        <div className="col-xl-3 col-md-6">
          <div className="dash-stat-card">
            <div className="stat-icon bg-success-soft">
              <i className="fas fa-user-check"></i>
            </div>
            <div className="stat-label">Active Users</div>
            <div className="stat-value">{loading ? '...' : stats.active_users.toLocaleString()}</div>
            <div className="stat-change positive">
              <i className="fas fa-check-circle"></i> Online
            </div>
          </div>
        </div>
        <div className="col-xl-3 col-md-6">
          <div className="dash-stat-card">
            <div className="stat-icon bg-warning-soft">
              <i className="fas fa-user-times"></i>
            </div>
            <div className="stat-label">Inactive Users</div>
            <div className="stat-value">{loading ? '...' : stats.inactive_users.toLocaleString()}</div>
            <div className="stat-change negative">
              <i className="fas fa-exclamation-circle"></i> Blocked/Deactivated
            </div>
          </div>
        </div>
        <div className="col-xl-3 col-md-6">
          <div className="dash-stat-card">
            <div className="stat-icon bg-info-soft">
              <i className="fas fa-user-tag"></i>
            </div>
            <div className="stat-label">Total Roles</div>
            <div className="stat-value">{loading ? '...' : stats.total_roles}</div>
            <div className="stat-change positive">
              <i className="fas fa-shield-alt"></i> Configured
            </div>
          </div>
        </div>
      </div>

      {/* Main content row */}
      <div className="row g-4 mb-4">
        {/* User Management Overview */}
        <div className="col-xl-8">
          <div className="dash-card">
            <div className="dash-card-header">
              <h6>User Management Overview</h6>
              <div className="card-actions">
                <button className={userFilter === 'all' ? 'active' : ''} onClick={() => setUserFilter('all')}>All Roles</button>
                <button className={userFilter === 'active' ? 'active' : ''} onClick={() => setUserFilter('active')}>Active</button>
                <button className={userFilter === 'inactive' ? 'active' : ''} onClick={() => setUserFilter('inactive')}>Inactive</button>
              </div>
            </div>
            <div className="dash-card-body" style={{padding: 0, overflowX: 'auto'}}>
              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
                  <span className="ms-2">Loading users...</span>
                </div>
              ) : (
              <table className="dash-table" style={{minWidth: '700px'}}>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th style={{minWidth: '100px'}}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr><td colSpan="5" style={{textAlign: 'center', padding: '20px', color: '#6c757d'}}>No users found</td></tr>
                  ) : (
                    filteredUsers.slice(0, 8).map((user) => (
                      <tr key={user.id}>
                        <td>
                          <div className="user-cell">
                            <div className="avatar" style={{background: roleColors[user.role_name] || '#4361ee'}}>
                              {getInitials(user.full_name || user.username)}
                            </div>
                            <div>
                              <div className="user-name">{user.full_name || user.username}</div>
                              <div className="user-role">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`dash-badge ${roleBadgeClass[user.role_name] || 'dash-badge-primary'}`}>
                            {user.role_display || 'No Role'}
                          </span>
                        </td>
                        <td>
                          <span className={`dash-badge ${user.is_active ? 'dash-badge-success' : 'dash-badge-danger'}`}>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>{getTimeAgo(user.date_joined)}</td>
                        <td>
                          <div style={{display: 'flex', gap: '4px'}}>
                            <button
                              className="dash-header-btn"
                              style={{width: '32px', height: '32px', fontSize: '12px'}}
                              title="Edit User"
                              onClick={() => navigate('/admin/users')}
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            <button
                              className="dash-header-btn"
                              style={{width: '32px', height: '32px', fontSize: '12px', color: user.is_active ? '#e63946' : '#059669'}}
                              title={user.is_active ? 'Block User' : 'Unblock User'}
                              onClick={() => handleToggleUserStatus(user.id, user.is_active)}
                            >
                              <i className={`fas ${user.is_active ? 'fa-ban' : 'fa-check-circle'}`}></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              )}
              {!loading && filteredUsers.length > 0 && (
                <div style={{padding: '12px 20px', borderTop: '1px solid #eee', textAlign: 'center'}}>
                  <Link to="/admin/users" style={{fontSize: '13px', color: '#4361ee', textDecoration: 'none'}}>
                    View All Users <i className="fas fa-arrow-right ms-1"></i>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions + System Status */}
        <div className="col-xl-4">
          <div className="dash-card" style={{marginBottom: '24px'}}>
            <div className="dash-card-header">
              <h6>Quick Actions</h6>
            </div>
            <div className="dash-card-body">
              <div className="dash-quick-actions">
                <Link to="/admin/users" className="dash-quick-action-btn">
                  <i className="fas fa-user-plus"></i>
                  <span>Add User</span>
                </Link>
                <Link to="/admin/roles" className="dash-quick-action-btn">
                  <i className="fas fa-user-tag"></i>
                  <span>Manage Roles</span>
                </Link>
                <Link to="/admin/settings" className="dash-quick-action-btn">
                  <i className="fas fa-cog"></i>
                  <span>System Settings</span>
                </Link>
                <Link to="/admin/backup" className="dash-quick-action-btn">
                  <i className="fas fa-database"></i>
                  <span>Backup Data</span>
                </Link>
              </div>
            </div>
          </div>

          <div className="dash-card">
            <div className="dash-card-header">
              <h6>System Status</h6>
            </div>
            <div className="dash-card-body">
              <div className="dash-activity-item">
                <div className="dash-activity-icon" style={{background: '#ecfdf5', color: '#059669'}}>
                  <i className="fas fa-server"></i>
                </div>
                <div className="dash-activity-content">
                  <h6>Server Status</h6>
                  <p>All systems operational</p>
                  <small>Uptime: 99.9%</small>
                </div>
              </div>
              <div className="dash-activity-item">
                <div className="dash-activity-icon" style={{background: '#eef2ff', color: '#4f46e5'}}>
                  <i className="fas fa-database"></i>
                </div>
                <div className="dash-activity-content">
                  <h6>Database</h6>
                  <p>Healthy - Last backup: 2 hours ago</p>
                  <small>Performance: Excellent</small>
                </div>
              </div>
              <div className="dash-activity-item">
                <div className="dash-activity-icon" style={{background: '#fff7ed', color: '#d97706'}}>
                  <i className="fas fa-shield-alt"></i>
                </div>
                <div className="dash-activity-content">
                  <h6>Security</h6>
                  <p>All security protocols active</p>
                  <small>Last scan: 6 hours ago</small>
                </div>
              </div>
              <div className="dash-activity-item">
                <div className="dash-activity-icon" style={{background: '#ecfeff', color: '#0891b2'}}>
                  <i className="fas fa-sync"></i>
                </div>
                <div className="dash-activity-content">
                  <h6>Sync Status</h6>
                  <p>All data synchronized</p>
                  <small>Last sync: 5 minutes ago</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="row g-4 mb-4">
        {/* Role Distribution Doughnut */}
        <div className="col-xl-4 col-md-6">
          <div className="dash-card">
            <div className="dash-card-header">
              <h6>User Role Distribution</h6>
            </div>
            <div className="dash-card-body">
              {loading ? (
                <div className="text-center py-3">
                  <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
                </div>
              ) : roleDistribution.length === 0 ? (
                <p style={{color: '#6c757d', textAlign: 'center', padding: '20px'}}>No roles configured yet</p>
              ) : (
                <div style={{position: 'relative', height: '280px'}}>
                  <Doughnut
                    data={{
                      labels: roleDistribution.map(r => r.role_display),
                      datasets: [{
                        data: roleDistribution.map(r => r.count),
                        backgroundColor: roleDistribution.map(r => roleColors[r.role] || '#4361ee'),
                        borderWidth: 2,
                        borderColor: '#fff',
                        hoverOffset: 6,
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      cutout: '60%',
                      plugins: {
                        legend: { position: 'bottom', labels: { padding: 12, usePointStyle: true, pointStyleWidth: 8, font: { size: 12 } } },
                        tooltip: { backgroundColor: '#1d2939', titleFont: { size: 13 }, bodyFont: { size: 12 }, padding: 10, cornerRadius: 8 }
                      }
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Active vs Inactive Doughnut */}
        <div className="col-xl-4 col-md-6">
          <div className="dash-card">
            <div className="dash-card-header">
              <h6>User Status Overview</h6>
            </div>
            <div className="dash-card-body">
              {loading ? (
                <div className="text-center py-3">
                  <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
                </div>
              ) : (
                <div style={{position: 'relative', height: '280px'}}>
                  <Doughnut
                    data={{
                      labels: ['Active Users', 'Inactive Users'],
                      datasets: [{
                        data: [stats.active_users, stats.inactive_users],
                        backgroundColor: ['#059669', '#e63946'],
                        borderWidth: 2,
                        borderColor: '#fff',
                        hoverOffset: 6,
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      cutout: '60%',
                      plugins: {
                        legend: { position: 'bottom', labels: { padding: 12, usePointStyle: true, pointStyleWidth: 8, font: { size: 12 } } },
                        tooltip: { backgroundColor: '#1d2939', titleFont: { size: 13 }, bodyFont: { size: 12 }, padding: 10, cornerRadius: 8 }
                      }
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Users per Role - Bar Chart */}
        <div className="col-xl-4 col-md-12">
          <div className="dash-card">
            <div className="dash-card-header">
              <h6>Users per Role</h6>
            </div>
            <div className="dash-card-body">
              {loading ? (
                <div className="text-center py-3">
                  <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
                </div>
              ) : roleDistribution.length === 0 ? (
                <p style={{color: '#6c757d', textAlign: 'center', padding: '20px'}}>No data available</p>
              ) : (
                <div style={{position: 'relative', height: '280px'}}>
                  <Bar
                    data={{
                      labels: roleDistribution.map(r => r.role_display),
                      datasets: [{
                        label: 'Users',
                        data: roleDistribution.map(r => r.count),
                        backgroundColor: roleDistribution.map(r => (roleColors[r.role] || '#4361ee') + '99'),
                        borderColor: roleDistribution.map(r => roleColors[r.role] || '#4361ee'),
                        borderWidth: 1,
                        borderRadius: 6,
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false },
                        tooltip: { backgroundColor: '#1d2939', titleFont: { size: 13 }, bodyFont: { size: 12 }, padding: 10, cornerRadius: 8 }
                      },
                      scales: {
                        y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 11 } }, grid: { color: 'rgba(0,0,0,0.05)' } },
                        x: { ticks: { font: { size: 10 }, maxRotation: 45 }, grid: { display: false } }
                      }
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* User Registration Trend + Recent Events */}
      <div className="row g-4">
        <div className="col-xl-6">
          <div className="dash-card">
            <div className="dash-card-header">
              <h6>User Registration Trend</h6>
            </div>
            <div className="dash-card-body">
              {loading ? (
                <div className="text-center py-3">
                  <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
                </div>
              ) : (
                <div style={{position: 'relative', height: '280px'}}>
                  <Line
                    data={{
                      labels: (() => {
                        const months = [];
                        const now = new Date();
                        for (let i = 5; i >= 0; i--) {
                          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                          months.push(d.toLocaleString('default', { month: 'short', year: '2-digit' }));
                        }
                        return months;
                      })(),
                      datasets: [{
                        label: 'New Users',
                        data: (() => {
                          const months = [];
                          const now = new Date();
                          for (let i = 5; i >= 0; i--) {
                            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                            const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
                            const count = recentUsers.filter(u => {
                              const joined = new Date(u.date_joined);
                              return joined >= d && joined < nextMonth;
                            }).length;
                            months.push(count);
                          }
                          return months;
                        })(),
                        borderColor: '#4361ee',
                        backgroundColor: 'rgba(67, 97, 238, 0.1)',
                        tension: 0.4,
                        fill: true,
                        pointBackgroundColor: '#4361ee',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 5,
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false },
                        tooltip: { backgroundColor: '#1d2939', titleFont: { size: 13 }, bodyFont: { size: 12 }, padding: 10, cornerRadius: 8 }
                      },
                      scales: {
                        y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 11 } }, grid: { color: 'rgba(0,0,0,0.05)' } },
                        x: { ticks: { font: { size: 11 } }, grid: { display: false } }
                      }
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent System Events */}
        <div className="col-xl-6">
          <div className="dash-card">
            <div className="dash-card-header">
              <h6>Recent System Events</h6>
            </div>
            <div className="dash-card-body" style={{padding: 0}}>
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>User</th>
                    <th>Time</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>User Login</strong></td>
                    <td>Dr. John Doe</td>
                    <td>2h ago</td>
                    <td><span className="dash-badge dash-badge-success">Success</span></td>
                  </tr>
                  <tr>
                    <td><strong>Data Export</strong></td>
                    <td>Sarah Miller</td>
                    <td>3h ago</td>
                    <td><span className="dash-badge dash-badge-success">Completed</span></td>
                  </tr>
                  <tr>
                    <td><strong>Password Reset</strong></td>
                    <td>Robert Wilson</td>
                    <td>5h ago</td>
                    <td><span className="dash-badge dash-badge-success">Success</span></td>
                  </tr>
                  <tr>
                    <td><strong>System Backup</strong></td>
                    <td>System</td>
                    <td>2h ago</td>
                    <td><span className="dash-badge dash-badge-success">Completed</span></td>
                  </tr>
                  <tr>
                    <td><strong>Failed Login</strong></td>
                    <td>Unknown</td>
                    <td>6h ago</td>
                    <td><span className="dash-badge dash-badge-danger">Blocked</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

    </DashboardLayout>
  );
}

export default AdminDashboard;

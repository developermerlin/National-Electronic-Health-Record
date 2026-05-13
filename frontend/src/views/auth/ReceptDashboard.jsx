import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layout/DashboardLayout';
import { getNavForUser, getBrandForUser, getRoleBadge } from '../../utils/navItems';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler } from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler);

function ReceptDashboard() {
  const { apiCall, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [todayAppointments, setTodayAppointments] = useState([]);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, todayRes] = await Promise.all([
        apiCall('/appointments/stats/'),
        apiCall('/appointments/today/')
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (todayRes.ok) {
        const todayData = await todayRes.json();
        setTodayAppointments(todayData.appointments || []);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const getStatusBadgeClass = (status) => {
    const classes = {
      scheduled: 'dash-badge-primary',
      checked_in: 'dash-badge-success',
      in_consultation: 'dash-badge-warning',
      completed: 'dash-badge-secondary',
      cancelled: 'dash-badge-danger',
      no_show: 'dash-badge-danger',
    };
    return `dash-badge ${classes[status] || 'dash-badge-primary'}`;
  };

  const formatTime = (dateString) => {
    if (!dateString) return '--';
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <DashboardLayout navItems={getNavForUser(user)} brandTitle={getBrandForUser(user)} roleBadge={getRoleBadge(user)}>

      {/* Welcome Banner */}
      <div className="dash-welcome-banner">
        <h3>Welcome back, {user?.full_name || 'Receptionist'}!</h3>
        <p>Here is an overview of today's front desk activity. Manage patient registrations, appointments, and queue efficiently.</p>
      </div>

      {/* Stat Cards Row */}
      <div className="row g-4 mb-4">
        <div className="col-xl-3 col-md-6">
          <div className="dash-stat-card">
            <div className="stat-icon bg-primary-soft">
              <i className="fas fa-calendar-alt"></i>
            </div>
            <div className="stat-label">Today's Appointments</div>
            <div className="stat-value">{stats?.today?.total ?? 0}</div>
            <div className="stat-change positive">
              <i className="fas fa-calendar-day"></i> Overall today
            </div>
          </div>
        </div>
        <div className="col-xl-3 col-md-6">
          <div className="dash-stat-card">
            <div className="stat-icon bg-success-soft">
              <i className="fas fa-check-circle"></i>
            </div>
            <div className="stat-label">Checked In</div>
            <div className="stat-value">{stats?.today?.checked_in ?? 0}</div>
            <div className="stat-change positive">
              <i className="fas fa-users"></i> Currently waiting
            </div>
          </div>
        </div>
        <div className="col-xl-3 col-md-6">
          <div className="dash-stat-card">
            <div className="stat-icon bg-warning-soft">
              <i className="fas fa-user-md"></i>
            </div>
            <div className="stat-label">In Consultation</div>
            <div className="stat-value">{stats?.today?.in_consultation ?? 0}</div>
            <div className="stat-change positive">
              <i className="fas fa-stethoscope"></i> With doctors
            </div>
          </div>
        </div>
        <div className="col-xl-3 col-md-6">
          <div className="dash-stat-card">
            <div className="stat-icon bg-info-soft">
              <i className="fas fa-check-double"></i>
            </div>
            <div className="stat-label">Completed Today</div>
            <div className="stat-value">{stats?.today?.completed ?? 0}</div>
            <div className="stat-change positive">
              <i className="fas fa-smile"></i> Successful visits
            </div>
          </div>
        </div>
      </div>

      {/* Main content row */}
      <div className="row g-4 mb-4">
        {/* Upcoming Appointments */}
        <div className="col-xl-8">
          <div className="dash-card">
            <div className="dash-card-header">
              <h6>Today's Appointment Schedule</h6>
              <div className="card-actions">
                <button className="active">Today</button>
              </div>
            </div>
            <div className="dash-card-body" style={{padding: 0}}>
              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary spinner-border-sm"></div>
                </div>
              ) : todayAppointments.length === 0 ? (
                <div className="text-center py-4 text-muted small">No appointments scheduled for today.</div>
              ) : (
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Time</th>
                      <th>Doctor</th>
                      <th>Department</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {todayAppointments.slice(0, 8).map(apt => (
                      <tr key={apt.id}>
                        <td>
                          <div className="user-cell">
                            <div className="avatar" style={{background: '#4361ee'}}>
                              {apt.patient?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </div>
                            <div>
                              <div className="user-name">{apt.patient?.full_name}</div>
                              <div className="user-role">ID: {apt.patient?.patient_id}</div>
                            </div>
                          </div>
                        </td>
                        <td>{formatTime(apt.scheduled_at)}</td>
                        <td>{apt.doctor?.full_name}</td>
                        <td>{apt.department || '-'}</td>
                        <td><span className={getStatusBadgeClass(apt.status)}>{apt.status.replace('_', ' ')}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions + Recent Activity */}
        <div className="col-xl-4">
          <div className="dash-card" style={{marginBottom: '24px'}}>
            <div className="dash-card-header">
              <h6>Quick Actions</h6>
            </div>
            <div className="dash-card-body">
              <div className="dash-quick-actions">
                <a href="/receptionist/patients/register" className="dash-quick-action-btn">
                  <i className="fas fa-user-plus"></i>
                  <span>Register Patient</span>
                </a>
                <a href="/receptionist/appointments" className="dash-quick-action-btn">
                  <i className="fas fa-calendar-plus"></i>
                  <span>New Appointment</span>
                </a>
                <a href="/receptionist/patients" className="dash-quick-action-btn">
                  <i className="fas fa-search"></i>
                  <span>Find Patient</span>
                </a>
                <a href="#!" className="dash-quick-action-btn">
                  <i className="fas fa-print"></i>
                  <span>Print Queue</span>
                </a>
              </div>
            </div>
          </div>

          <div className="dash-card">
            <div className="dash-card-header">
              <h6>Recent Activity</h6>
            </div>
            <div className="dash-card-body">
              <div className="text-center py-4 text-muted small">
                Activity log integration coming soon.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="row g-4 mb-4">
        {/* Today's Summary - Doughnut */}
        <div className="col-xl-6 col-md-6">
          <div className="dash-card">
            <div className="dash-card-header">
              <h6>Today's Status Breakdown</h6>
            </div>
            <div className="dash-card-body">
              <div style={{position: 'relative', height: '280px'}}>
                {stats ? (
                  <Doughnut
                    data={{
                      labels: ['Checked In', 'In Consultation', 'Scheduled', 'No Shows', 'Cancelled'],
                      datasets: [{
                        data: [
                          stats.by_status.checked_in || 0,
                          stats.by_status.in_consultation || 0,
                          stats.by_status.scheduled || 0,
                          stats.by_status.no_show || 0,
                          stats.by_status.cancelled || 0
                        ],
                        backgroundColor: ['#059669', '#f77f00', '#4361ee', '#e63946', '#94a3b8'],
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
                ) : (
                  <div className="text-center py-5 text-muted">No data available</div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Weekly Trend (Placeholder for now as backend doesn't provide history yet) */}
        <div className="col-xl-6 col-md-6">
          <div className="dash-card">
            <div className="dash-card-header">
              <h6>Appointment Statistics</h6>
            </div>
            <div className="dash-card-body">
              <div className="row g-3">
                <div className="col-6">
                  <div className="p-3 border rounded text-center">
                    <div className="small text-muted mb-1">Total This Week</div>
                    <div className="h4 mb-0 text-primary">{stats?.this_week?.total || 0}</div>
                  </div>
                </div>
                <div className="col-6">
                  <div className="p-3 border rounded text-center">
                    <div className="small text-muted mb-1">Total This Month</div>
                    <div className="h4 mb-0 text-purple" style={{color: '#7c3aed'}}>{stats?.this_month?.total || 0}</div>
                  </div>
                </div>
                <div className="col-12">
                  <div className="p-3 border rounded">
                    <div className="d-flex justify-content-between align-items-center mb-2">
                      <span className="small text-muted">Completion Rate</span>
                      <span className="small fw-bold">
                        {stats?.today?.total ? Math.round((stats.today.completed / stats.today.total) * 100) : 0}%
                      </span>
                    </div>
                    <div className="progress" style={{height: '8px'}}>
                      <div className="progress-bar bg-success" role="progressbar" 
                        style={{width: `${stats?.today?.total ? (stats.today.completed / stats.today.total) * 100 : 0}%`}}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

    </DashboardLayout>
  );
}

export default ReceptDashboard;

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layout/DashboardLayout';
import { getNavForUser, getBrandForUser, getRoleBadge } from '../../utils/navItems';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler } from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler);

function DoctorDashboard() {
  const { apiCall, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState(null);
  const [queueData, setQueueData] = useState([]);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const [statsRes, queueRes] = await Promise.all([
        apiCall('/appointments/stats/'),
        apiCall('/appointments/my_queue/')
      ]);

      if (statsRes.ok) {
        const statsData = await statsRes.json();
        setStats(statsData);
      }

      if (queueRes.ok) {
        const queueData = await queueRes.json();
        setQueueData(queueData.appointments || []);
      }
    } catch (error) {
      console.error('Failed to fetch doctor dashboard data:', error);
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
        <h3>Welcome back, Dr. {user?.full_name?.split(' ').pop() || 'Doctor'}!</h3>
        <p>You have {queueData.length} patients in your queue today. Focus on providing quality care.</p>
      </div>

      {/* Stat Cards Row */}
      <div className="row g-4 mb-4">
        <div className="col-xl-3 col-md-6">
          <div className="dash-stat-card">
            <div className="stat-icon bg-primary-soft">
              <i className="fas fa-calendar-day"></i>
            </div>
            <div className="stat-label">Today's Appointments</div>
            <div className="stat-value">{stats?.today?.total || 0}</div>
            <div className="stat-change positive">
              <i className="fas fa-clock"></i> Scheduled for today
            </div>
          </div>
        </div>
        <div className="col-xl-3 col-md-6">
          <div className="dash-stat-card">
            <div className="stat-icon bg-success-soft">
              <i className="fas fa-user-clock"></i>
            </div>
            <div className="stat-label">Patients Waiting</div>
            <div className="stat-value">{queueData.filter(a => a.status === 'checked_in').length}</div>
            <div className="stat-change positive">
              <i className="fas fa-hourglass-half"></i> Ready to be seen
            </div>
          </div>
        </div>
        <div className="col-xl-3 col-md-6">
          <div className="dash-stat-card">
            <div className="stat-icon bg-warning-soft">
              <i className="fas fa-stethoscope"></i>
            </div>
            <div className="stat-label">In Consultation</div>
            <div className="stat-value">{queueData.filter(a => a.status === 'in_consultation').length}</div>
            <div className="stat-change positive">
              <i className="fas fa-user-md"></i> Currently seeing
            </div>
          </div>
        </div>
        <div className="col-xl-3 col-md-6">
          <div className="dash-stat-card">
            <div className="stat-icon bg-info-soft">
              <i className="fas fa-check-double"></i>
            </div>
            <div className="stat-label">Completed Today</div>
            <div className="stat-value">{stats?.today?.completed || 0}</div>
            <div className="stat-change positive">
              <i className="fas fa-check-circle"></i> Tasks finished
            </div>
          </div>
        </div>
      </div>

      <div className="row g-4 mb-4">
        {/* Patient Queue */}
        <div className="col-xl-8">
          <div className="dash-card">
            <div className="dash-card-header">
              <h6>Current Patient Queue</h6>
              <div className="card-actions">
                <a href="/doctor/queue" className="small text-primary text-decoration-none">View Full Queue</a>
              </div>
            </div>
            <div className="dash-card-body" style={{padding: 0}}>
              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary spinner-border-sm"></div>
                </div>
              ) : queueData.length === 0 ? (
                <div className="text-center py-4 text-muted small">Your queue is currently empty.</div>
              ) : (
                <table className="dash-table">
                  <thead>
                    <tr>
                      <th>Patient</th>
                      <th>Time</th>
                      <th>Status</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {queueData.slice(0, 5).map(apt => (
                      <tr key={apt.id}>
                        <td>
                          <div className="user-cell">
                            <div className="avatar" style={{background: '#4361ee'}}>
                              {apt.patient?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </div>
                            <div>
                              <div className="user-name">{apt.patient?.full_name}</div>
                              <div className="user-role">{apt.patient?.patient_id}</div>
                            </div>
                          </div>
                        </td>
                        <td>{formatTime(apt.scheduled_at)}</td>
                        <td><span className={getStatusBadgeClass(apt.status)}>{apt.status.replace('_', ' ')}</span></td>
                        <td>
                          <a href="/doctor/queue" className="btn btn-sm btn-outline-primary py-0 px-2" style={{fontSize: '11px'}}>
                            Open
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>

        {/* Quick Links & Info */}
        <div className="col-xl-4">
          <div className="dash-card mb-4">
            <div className="dash-card-header">
              <h6>Doctor Quick Links</h6>
            </div>
            <div className="dash-card-body">
              <div className="dash-quick-actions">
                <a href="/doctor/queue" className="dash-quick-action-btn">
                  <i className="fas fa-list-ol"></i>
                  <span>My Queue</span>
                </a>
                <a href="/doctor/patients" className="dash-quick-action-btn">
                  <i className="fas fa-users"></i>
                  <span>Patient List</span>
                </a>
                <a href="/messages" className="dash-quick-action-btn">
                  <i className="fas fa-envelope"></i>
                  <span>Messages</span>
                </a>
                <a href="/chat" className="dash-quick-action-btn">
                  <i className="fas fa-comments"></i>
                  <span>Live Chat</span>
                </a>
              </div>
            </div>
          </div>

          <div className="dash-card">
            <div className="dash-card-header">
              <h6>Performance Overview</h6>
            </div>
            <div className="dash-card-body">
              <div className="mb-3">
                <div className="d-flex justify-content-between align-items-center mb-1">
                  <span className="small text-muted">Completion Rate</span>
                  <span className="small fw-bold">
                    {stats?.today?.total ? Math.round((stats.today.completed / stats.today.total) * 100) : 0}%
                  </span>
                </div>
                <div className="progress" style={{height: '6px'}}>
                  <div className="progress-bar bg-success" role="progressbar" 
                    style={{width: `${stats?.today?.total ? (stats.today.completed / stats.today.total) * 100 : 0}%`}}></div>
                </div>
              </div>
              <div className="text-center">
                <p className="small text-muted mb-0">Good progress today! Keep up the great work.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

    </DashboardLayout>
  );
}

export default DoctorDashboard;

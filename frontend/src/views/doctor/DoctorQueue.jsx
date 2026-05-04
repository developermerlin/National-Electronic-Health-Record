import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layout/DashboardLayout';
import { getNavForUser, getBrandForUser, getRoleBadge } from '../../utils/navItems';
import { showToast } from '../../utils/toast';

function DoctorQueue() {
  const { apiCall, user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    count: 0,
    waiting: 0,
    in_consultation: 0,
    scheduled: 0
  });

  const roleColors = {
    admin: '#4361ee', ministry_admin: '#7c3aed', district_admin: '#059669',
    hospital_admin: '#f77f00', receptionist: '#0891b2', doctor: '#e63946', nurse: '#ec4899',
  };

  // Fetch queue
  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiCall('/appointments/my_queue/');
      if (response.ok) {
        const data = await response.json();
        setAppointments(data.appointments || []);
        setStats({
          count: data.count || 0,
          waiting: data.waiting || 0,
          in_consultation: data.in_consultation || 0,
          scheduled: data.scheduled || 0
        });
      }
    } catch {
      showToast.error('Failed to load queue');
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  useEffect(() => {
    fetchQueue();
    // Auto-refresh every 30 seconds
    const interval = setInterval(fetchQueue, 30000);
    return () => clearInterval(interval);
  }, [fetchQueue]);

  const handleStartConsultation = async (appointmentId) => {
    try {
      const response = await apiCall(`/appointments/${appointmentId}/start_consultation/`, {
        method: 'POST'
      });
      if (response.ok) {
        showToast.success('Consultation started');
        fetchQueue();
      } else {
        const error = await response.json();
        showToast.error(error.detail || 'Failed to start consultation');
      }
    } catch {
      showToast.error('Failed to start consultation');
    }
  };

  const handleComplete = async (appointmentId) => {
    try {
      const response = await apiCall(`/appointments/${appointmentId}/complete/`, {
        method: 'POST'
      });
      if (response.ok) {
        showToast.success('Appointment completed');
        fetchQueue();
      } else {
        const error = await response.json();
        showToast.error(error.detail || 'Failed to complete');
      }
    } catch {
      showToast.error('Failed to complete appointment');
    }
  };

  const handleCancel = async (appointmentId) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      const response = await apiCall(`/appointments/${appointmentId}/cancel/`, {
        method: 'POST'
      });
      if (response.ok) {
        showToast.success('Appointment cancelled');
        fetchQueue();
      } else {
        const error = await response.json();
        showToast.error(error.detail || 'Failed to cancel');
      }
    } catch {
      showToast.error('Failed to cancel appointment');
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return '--';
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getWaitTime = (checkedInAt) => {
    if (!checkedInAt) return null;
    const diff = new Date() - new Date(checkedInAt);
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  const getStatusCard = (status) => {
    const cards = {
      scheduled: { bg: '#dbeafe', border: '#3b82f6', icon: 'fa-calendar', label: 'Scheduled', desc: 'Waiting for patient' },
      checked_in: { bg: '#dcfce7', border: '#22c55e', icon: 'fa-check-circle', label: 'Checked In', desc: 'Patient waiting' },
      in_consultation: { bg: '#fef3c7', border: '#f59e0b', icon: 'fa-user-md', label: 'In Consultation', desc: 'Currently seeing patient' },
    };
    return cards[status] || cards.scheduled;
  };

  return (
    <DashboardLayout navItems={getNavForUser(user)} brandTitle={getBrandForUser(user)} roleBadge={getRoleBadge(user)}>
      <div className="container-fluid py-4">
        {/* Header */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h1 className="h3 mb-0">
                  <i className="fas fa-user-md me-2" style={{ color: roleColors[user?.role] || '#4361ee' }}></i>
                  My Queue
                </h1>
                <p className="text-muted mb-0 small">Manage your daily patient consultations</p>
              </div>
              <div className="d-flex gap-2">
                <button className="btn btn-outline-secondary" onClick={fetchQueue} disabled={loading}>
                  <i className={`fas fa-sync-alt me-2 ${loading ? 'fa-spin' : ''}`}></i>Refresh
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="row g-3 mb-4">
          <div className="col-6 col-md-3">
            <div className="card border-0 h-100" style={{ background: '#dbeafe' }}>
              <div className="card-body p-3">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <div className="small text-muted">Scheduled</div>
                    <div className="h4 mb-0 text-primary">{stats.scheduled}</div>
                  </div>
                  <i className="fas fa-calendar fa-2x text-primary opacity-25"></i>
                </div>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card border-0 h-100" style={{ background: '#dcfce7' }}>
              <div className="card-body p-3">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <div className="small text-muted">Waiting</div>
                    <div className="h4 mb-0 text-success">{stats.waiting}</div>
                  </div>
                  <i className="fas fa-users fa-2x text-success opacity-25"></i>
                </div>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card border-0 h-100" style={{ background: '#fef3c7' }}>
              <div className="card-body p-3">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <div className="small text-muted">In Progress</div>
                    <div className="h4 mb-0" style={{ color: '#92400e' }}>{stats.in_consultation}</div>
                  </div>
                  <i className="fas fa-user-md fa-2x opacity-25" style={{ color: '#92400e' }}></i>
                </div>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card border-0 h-100" style={{ background: 'linear-gradient(135deg, #4361ee, #7c3aed)', color: 'white' }}>
              <div className="card-body p-3">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <div className="small opacity-75">Total Today</div>
                    <div className="h4 mb-0">{stats.count}</div>
                  </div>
                  <i className="fas fa-list-alt fa-2x opacity-50"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Queue Cards */}
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary"></div>
            <p className="text-muted mt-2">Loading queue...</p>
          </div>
        ) : appointments.length === 0 ? (
          <div className="text-center py-5">
            <div className="mb-4">
              <div style={{
                width: '120px', height: '120px', margin: '0 auto',
                background: '#f3f4f6', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <i className="fas fa-clipboard-check fa-3x text-muted"></i>
              </div>
            </div>
            <h4 className="text-muted">No Appointments Today</h4>
            <p className="text-muted">Your queue is empty. Patients will appear here when they check in.</p>
          </div>
        ) : (
          <div className="row g-3">
            {appointments.map((apt, index) => {
              const statusCard = getStatusCard(apt.status);
              const waitTime = apt.status === 'checked_in' ? getWaitTime(apt.checked_in_at) : null;
              
              return (
                <div key={apt.id} className="col-md-6 col-lg-4">
                  <div className="card border-0 shadow-sm h-100" style={{ 
                    borderLeft: `4px solid ${statusCard.border} !important`,
                    background: statusCard.bg
                  }}>
                    <div className="card-body p-4">
                      {/* Header */}
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <div>
                          <span className="badge" style={{ 
                            background: statusCard.border, color: 'white',
                            fontSize: '11px', padding: '4px 10px', borderRadius: '20px'
                          }}>
                            <i className={`fas ${statusCard.icon} me-1`}></i>
                            #{index + 1}
                          </span>
                        </div>
                        <div className="text-end">
                          <div className="fw-bold h5 mb-0">{formatTime(apt.scheduled_at)}</div>
                          {waitTime && (
                            <div className="small" style={{ color: '#92400e' }}>
                              <i className="fas fa-clock me-1"></i>Waiting: {waitTime}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Patient Info */}
                      <div className="d-flex align-items-center gap-3 mb-3">
                        <div style={{
                          width: '50px', height: '50px', borderRadius: '50%',
                          background: 'linear-gradient(135deg, #667eea, #764ba2)',
                          color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '18px', fontWeight: 'bold'
                        }}>
                          {apt.patient?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?'}
                        </div>
                        <div>
                          <div className="fw-semibold fs-5">{apt.patient?.full_name || 'Unknown'}</div>
                          <div className="small text-muted">
                            {apt.patient?.patient_id} • {apt.patient?.phone}
                          </div>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="mb-3">
                        <div className="small text-muted mb-1">
                          <i className="fas fa-building me-2"></i>{apt.hospital}
                        </div>
                        <div className="small text-muted mb-1">
                          <i className="fas fa-door-open me-2"></i>{apt.department || 'No Department'}
                        </div>
                        {apt.reason && (
                          <div className="small text-muted">
                            <i className="fas fa-stethoscope me-2"></i>{apt.reason}
                          </div>
                        )}
                      </div>

                      {/* Notes */}
                      {apt.notes && (
                        <div className="alert alert-light py-2 mb-3 small" style={{ background: 'rgba(255,255,255,0.7)' }}>
                          <i className="fas fa-info-circle me-1"></i>{apt.notes}
                        </div>
                      )}

                      {/* Priority Badge */}
                      {apt.priority !== 'normal' && (
                        <div className="mb-3">
                          <span className={`badge bg-${apt.priority === 'emergency' ? 'danger' : 'warning'}`}>
                            <i className="fas fa-exclamation-triangle me-1"></i>
                            {apt.priority.toUpperCase()}
                          </span>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="d-flex gap-2 mt-auto">
                        {apt.status === 'scheduled' && (
                          <>
                            <button className="btn btn-success flex-fill" 
                              onClick={() => handleStartConsultation(apt.id)}>
                              <i className="fas fa-play me-2"></i>Start
                            </button>
                            <button className="btn btn-outline-danger" 
                              onClick={() => handleCancel(apt.id)}>
                              <i className="fas fa-times"></i>
                            </button>
                          </>
                        )}
                        {apt.status === 'checked_in' && (
                          <>
                            <button className="btn btn-warning flex-fill"
                              style={{ background: '#f59e0b', borderColor: '#f59e0b', color: 'white' }}
                              onClick={() => handleStartConsultation(apt.id)}>
                              <i className="fas fa-user-md me-2"></i>See Patient
                            </button>
                            <button className="btn btn-outline-danger" 
                              onClick={() => handleCancel(apt.id)}>
                              <i className="fas fa-times"></i>
                            </button>
                          </>
                        )}
                        {apt.status === 'in_consultation' && (
                          <button className="btn btn-success w-100" onClick={() => handleComplete(apt.id)}>
                            <i className="fas fa-check-double me-2"></i>Complete
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default DoctorQueue;

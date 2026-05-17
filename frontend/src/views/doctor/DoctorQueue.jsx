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
  const [currentTime, setCurrentTime] = useState(new Date());
  const [warningShown, setWarningShown] = useState(new Set()); // Track which appointments we've warned about
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('doctorQueueView') || 'card');

  const setView = (mode) => {
    setViewMode(mode);
    localStorage.setItem('doctorQueueView', mode);
  };

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
    const queueInterval = setInterval(fetchQueue, 30000);
    return () => clearInterval(queueInterval);
  }, [fetchQueue]);

  // Update current time every second for countdown timer
  useEffect(() => {
    const timerInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timerInterval);
  }, []);

  // Calculate remaining time for consultation
  const getRemainingTime = useCallback((appointment) => {
    // Debug log
    if (appointment.status === 'in_consultation') {
      console.log('Consultation appointment:', {
        id: appointment.id,
        consultation_started_at: appointment.consultation_started_at,
        duration_minutes: appointment.duration_minutes
      });
    }
    
    if (appointment.status !== 'in_consultation') {
      return null;
    }
    
    // If consultation_started_at is missing, use current time as fallback
    const startTime = appointment.consultation_started_at 
      ? new Date(appointment.consultation_started_at)
      : new Date(); // Fallback to now if timestamp is missing
    
    const durationMs = (appointment.duration_minutes || 30) * 60 * 1000;
    const endTime = new Date(startTime.getTime() + durationMs);
    const remainingMs = endTime - currentTime;
    
    if (remainingMs <= 0) {
      return { expired: true, minutes: 0, seconds: 0 };
    }
    
    const minutes = Math.floor(remainingMs / 60000);
    const seconds = Math.floor((remainingMs % 60000) / 1000);
    
    return { expired: false, minutes, seconds };
  }, [currentTime]);

  // Check if we should show warning (1 minute remaining)
  const shouldShowWarning = useCallback((appointment) => {
    const remaining = getRemainingTime(appointment);
    if (!remaining || remaining.expired) return false;
    return remaining.minutes === 0 && remaining.seconds <= 60 && !warningShown.has(appointment.id);
  }, [getRemainingTime, warningShown]);

  // Show warning notification
  useEffect(() => {
    appointments.forEach(apt => {
      if (shouldShowWarning(apt)) {
        // Visual warning
        showToast.warning(`⏰ 1 minute remaining for ${apt.patient?.full_name}`);
        
        // Audio warning (using browser audio API)
        try {
          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBiuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
          audio.play().catch(() => {}); // Ignore autoplay restrictions
        } catch {/* Ignore audio autoplay restrictions */}
        
        setWarningShown(prev => new Set([...prev, apt.id]));
      }
    });
  }, [appointments, currentTime, warningShown, shouldShowWarning]);

  // Auto-complete appointment when time expires
  useEffect(() => {
    const checkAndComplete = async () => {
      for (const apt of appointments) {
        const remaining = getRemainingTime(apt);
        if (remaining && remaining.expired && apt.status === 'in_consultation') {
          try {
            await apiCall(`/appointments/${apt.id}/complete/`, {
              method: 'POST'
            });
            showToast.success(`⏰ Appointment with ${apt.patient?.full_name} auto-completed`);
            fetchQueue(); // Refresh the queue
          } catch (error) {
            console.error('Failed to auto-complete appointment:', error);
          }
        }
      }
    };
    
    checkAndComplete();
  }, [currentTime, appointments, apiCall, fetchQueue, getRemainingTime]);

  // Format countdown display
  const formatCountdown = (remaining) => {
    if (!remaining) return null;
    if (remaining.expired) return "Time's up!";
    
    const min = String(remaining.minutes).padStart(2, '0');
    const sec = String(remaining.seconds).padStart(2, '0');
    return `${min}:${sec}`;
  };

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

  const filteredAppointments = appointments.filter(apt => {
    const matchesSearch = 
      apt.patient?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.patient?.patient_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.reason?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || apt.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <DashboardLayout navItems={getNavForUser(user)} brandTitle={getBrandForUser(user)} roleBadge={getRoleBadge(user)}>
      <div className="container-fluid py-4">
        {/* Header */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h1 className="h3 mb-0">
                  <i className="fas fa-users-viewfinder me-2" style={{ color: roleColors[user?.role] || '#4361ee' }}></i>
                  Live Patient Queue
                </h1>
                <p className="text-muted mb-0 small">Real-time patient flow management</p>
              </div>
              <div className="d-flex gap-2 align-items-center flex-wrap">
                <div className="input-group input-group-sm" style={{ width: '220px' }}>
                  <span className="input-group-text bg-white border-end-0">
                    <i className="fas fa-search text-muted"></i>
                  </span>
                  <input 
                    type="text" 
                    className="form-control border-start-0" 
                    placeholder="Search patients..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <select 
                  className="form-select form-select-sm" 
                  style={{ width: '140px' }}
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="checked_in">Waiting</option>
                  <option value="in_consultation">In Progress</option>
                </select>
                {/* View toggle */}
                <div className="btn-group btn-group-sm" role="group">
                  <button
                    className={`btn ${viewMode === 'card' ? 'btn-primary' : 'btn-outline-secondary'}`}
                    onClick={() => setView('card')}
                    title="Card view"
                  >
                    <i className="fas fa-th-large"></i>
                  </button>
                  <button
                    className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-outline-secondary'}`}
                    onClick={() => setView('list')}
                    title="List view"
                  >
                    <i className="fas fa-list"></i>
                  </button>
                </div>
                <button className="btn btn-sm btn-outline-secondary" onClick={fetchQueue} disabled={loading}>
                  <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i>
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
            <p className="text-muted mt-2">Updating live queue...</p>
          </div>
        ) : filteredAppointments.length === 0 ? (
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
            <h4 className="text-muted">{searchQuery ? 'No matching patients' : 'No Appointments Today'}</h4>
            <p className="text-muted">{searchQuery ? 'Try a different search term' : 'Your queue is empty. Patients will appear here when they check in.'}</p>
          </div>
        ) : viewMode === 'card' ? (
          <div className="row g-3">
            {filteredAppointments.map((apt, index) => {
              const statusCard = getStatusCard(apt.status);
              const waitTime = apt.status === 'checked_in' ? getWaitTime(apt.checked_in_at) : null;
              const remainingTime = getRemainingTime(apt);
              
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
                          {remainingTime && (
                            <div className={`small ${remainingTime.expired ? 'text-danger' : remainingTime.minutes === 0 ? 'text-warning' : 'text-success'}`}>
                              <i className={`fas ${remainingTime.expired ? 'fa-stop-circle' : remainingTime.minutes === 0 ? 'fa-exclamation-triangle' : 'fa-hourglass-half'} me-1`}></i>
                              {remainingTime.expired ? 'Time expired' : `Time left: ${formatCountdown(remainingTime)}`}
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
                          <>
                            {/* Always show timer for in_consultation appointments */}
                            <div className={`alert py-2 mb-2 text-center ${remainingTime?.expired ? 'alert-danger' : remainingTime?.minutes === 0 ? 'alert-warning' : 'alert-info'}`} style={{ fontSize: '14px', fontWeight: 'bold' }}>
                              <div className="d-flex align-items-center justify-content-center">
                                <i className={`fas ${remainingTime?.expired ? 'fa-stop-circle' : remainingTime?.minutes === 0 ? 'fa-exclamation-triangle' : 'fa-stopwatch'} me-2`}></i>
                                <span>Session Timer: {formatCountdown(remainingTime || { expired: false, minutes: 0, seconds: 0 })}</span>
                              </div>
                              {remainingTime?.expired && (
                                <div className="small mt-1">
                                  <i className="fas fa-info-circle me-1"></i>Auto-completing...
                                </div>
                              )}
                              {!remainingTime && (
                                <div className="small mt-1 text-muted">
                                  <i className="fas fa-info-circle me-1"></i>Initializing timer...
                                </div>
                              )}
                            </div>
                            <button className="btn btn-success w-100" onClick={() => handleComplete(apt.id)}>
                              <i className="fas fa-check-double me-2"></i>Complete Now
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── List / table view ── */
          <div className="card border-0 shadow-sm">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead style={{ background: '#f8fafc' }}>
                  <tr>
                    <th className="ps-4 py-3 fw-semibold text-muted small">#</th>
                    <th className="py-3 fw-semibold text-muted small">Patient</th>
                    <th className="py-3 fw-semibold text-muted small">Status</th>
                    <th className="py-3 fw-semibold text-muted small">Time</th>
                    <th className="py-3 fw-semibold text-muted small">Wait / Timer</th>
                    <th className="py-3 fw-semibold text-muted small">Department</th>
                    <th className="py-3 fw-semibold text-muted small">Reason</th>
                    <th className="py-3 fw-semibold text-muted small">Priority</th>
                    <th className="pe-4 py-3 fw-semibold text-muted small">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAppointments.map((apt, index) => {
                    const sc = getStatusCard(apt.status);
                    const waitTime = apt.status === 'checked_in' ? getWaitTime(apt.checked_in_at) : null;
                    const remainingTime = getRemainingTime(apt);
                    return (
                      <tr key={apt.id} style={{ borderLeft: `3px solid ${sc.border}` }}>
                        <td className="ps-4 py-3">
                          <span className="badge rounded-circle d-inline-flex align-items-center justify-content-center"
                            style={{ width: 28, height: 28, background: sc.border, color: '#fff', fontSize: 12 }}>
                            {index + 1}
                          </span>
                        </td>
                        <td className="py-3">
                          <div className="d-flex align-items-center gap-2">
                            <div style={{
                              width: 36, height: 36, borderRadius: '50%',
                              background: 'linear-gradient(135deg, #667eea, #764ba2)',
                              color: '#fff', display: 'flex', alignItems: 'center',
                              justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0,
                            }}>
                              {apt.patient?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?'}
                            </div>
                            <div>
                              <div className="fw-semibold small">{apt.patient?.full_name || 'Unknown'}</div>
                              <div className="text-muted" style={{ fontSize: 11 }}>
                                {apt.patient?.patient_id} · {apt.patient?.phone}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3">
                          <span className="badge rounded-pill" style={{
                            fontSize: 11, padding: '3px 9px',
                            background: sc.bg, color: sc.border, border: `1px solid ${sc.border}`,
                          }}>
                            <i className={`fas ${sc.icon} me-1`}></i>{sc.label}
                          </span>
                        </td>
                        <td className="py-3 small text-muted fw-semibold">
                          {formatTime(apt.scheduled_at)}
                        </td>
                        <td className="py-3 small">
                          {waitTime && (
                            <span className="text-warning">
                              <i className="fas fa-clock me-1"></i>{waitTime}
                            </span>
                          )}
                          {remainingTime && (
                            <span className={remainingTime.expired ? 'text-danger' : remainingTime.minutes === 0 ? 'text-warning' : 'text-success'}>
                              <i className={`fas ${remainingTime.expired ? 'fa-stop-circle' : 'fa-stopwatch'} me-1`}></i>
                              {remainingTime.expired ? "Time's up" : formatCountdown(remainingTime)}
                            </span>
                          )}
                          {!waitTime && !remainingTime && <span className="text-muted">—</span>}
                        </td>
                        <td className="py-3 small text-muted">{apt.department || '—'}</td>
                        <td className="py-3 small text-muted" style={{ maxWidth: 160 }}>
                          <span className="text-truncate d-block" title={apt.reason}>{apt.reason || '—'}</span>
                        </td>
                        <td className="py-3">
                          {apt.priority && apt.priority !== 'normal' ? (
                            <span className={`badge bg-${apt.priority === 'emergency' ? 'danger' : 'warning'} text-uppercase`} style={{ fontSize: 10 }}>
                              {apt.priority}
                            </span>
                          ) : (
                            <span className="text-muted small">Normal</span>
                          )}
                        </td>
                        <td className="pe-4 py-3">
                          <div className="d-flex gap-1">
                            {apt.status === 'scheduled' && (
                              <>
                                <button className="btn btn-sm btn-success" onClick={() => handleStartConsultation(apt.id)} title="Start">
                                  <i className="fas fa-play"></i>
                                </button>
                                <button className="btn btn-sm btn-outline-danger" onClick={() => handleCancel(apt.id)} title="Cancel">
                                  <i className="fas fa-times"></i>
                                </button>
                              </>
                            )}
                            {apt.status === 'checked_in' && (
                              <>
                                <button className="btn btn-sm btn-warning text-white" onClick={() => handleStartConsultation(apt.id)} title="See Patient">
                                  <i className="fas fa-user-md"></i>
                                </button>
                                <button className="btn btn-sm btn-outline-danger" onClick={() => handleCancel(apt.id)} title="Cancel">
                                  <i className="fas fa-times"></i>
                                </button>
                              </>
                            )}
                            {apt.status === 'in_consultation' && (
                              <button className="btn btn-sm btn-success" onClick={() => handleComplete(apt.id)} title="Complete">
                                <i className="fas fa-check-double"></i>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

export default DoctorQueue;

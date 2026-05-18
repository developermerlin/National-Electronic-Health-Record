import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layout/DashboardLayout';
import { getNavForUser, getBrandForUser, getRoleBadge } from '../../utils/navItems';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler } from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler);

function DoctorDashboard() {
  const { apiCall, user } = useAuth();
  const [loading,  setLoading]  = useState(true);
  const [dash,     setDash]     = useState(null);
  const [activeTab, setActiveTab] = useState('today');
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [consultationStarted, setConsultationStarted] = useState(false);
  const [consultationStartTime, setConsultationStartTime] = useState(null);
  const [consultationEnded, setConsultationEnded] = useState(false);
  const [appointmentStatus, setAppointmentStatus] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiCall('/doctor/dashboard/');
      if (res.ok) {
        const data = await res.json();
        setDash(data);
      }
    } catch (error) {
      console.error('Failed to fetch doctor dashboard data:', error);
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  const today           = dash?.today           ?? {};
  const allToday        = dash?.all_today       ?? [];
  const todayCompleted  = dash?.today_completed ?? [];
  const upcoming        = dash?.upcoming       ?? [];
  const pending         = dash?.pending_requests ?? 0;

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const formatTime = (dateString) => {
    if (!dateString) return '--';
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '--';
    return new Date(dateString).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Get next upcoming appointment
  const nextAppointment = upcoming.length > 0 ? upcoming[0] : null;

  // Get in-progress appointments from backend
  const inProgressAppointments = dash?.in_consultation || [];

  // Filter appointments based on active tab
  const getFilteredAppointments = () => {
    switch (activeTab) {
      case 'pending':
        return dash?.pending_list || [];
      case 'today':
        return allToday;
      case 'upcoming':
        return upcoming;
      case 'in_progress':
        return inProgressAppointments;
      case 'completed':
        return dash?.all_completed || todayCompleted;
      case 'cancelled':
        return dash?.cancelled || [];
      case 'all':
        return [
          ...(dash?.pending_list || []),
          ...(dash?.all_today || []),
          ...(dash?.upcoming || []),
          ...(dash?.all_completed || []),
          ...(dash?.cancelled || [])
        ];
      default:
        return allToday;
    }
  };

  // Apply search filter to appointments
  const searchFilteredAppointments = (appointments) => {
    if (!searchQuery.trim()) return appointments;
    const query = searchQuery.toLowerCase();
    return appointments.filter(apt => 
      apt.patient?.full_name?.toLowerCase().includes(query) ||
      apt.patient?.patient_id?.toLowerCase().includes(query) ||
      apt.reason?.toLowerCase().includes(query) ||
      apt.status?.toLowerCase().includes(query)
    );
  };

  const filteredAppointments = searchFilteredAppointments(getFilteredAppointments());

  // Body scroll lock when modal is open
  useEffect(() => {
    if (showAppointmentModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [showAppointmentModal]);

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleOpenAppointment = (apt) => {
    console.log('Opening appointment:', apt);
    setSelectedAppointment(apt);
    setAppointmentStatus(apt.status);
    setConsultationStarted(apt.status === 'in_consultation');
    setConsultationEnded(apt.status === 'completed');
    setConsultationStartTime(apt.consultation_started_at);
    setElapsedSeconds(apt.elapsed_seconds || 0);
    setShowAppointmentModal(true);
    console.log('Modal should be open now');
  };

  const handleCommenceAppointment = async () => {
    if (!selectedAppointment) return;
    try {
      const res = await apiCall(`/appointments/${selectedAppointment.id}/start_consultation/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        const data = await res.json();
        setConsultationStarted(true);
        setConsultationStartTime(data.consultation_started_at || new Date().toISOString());
        setAppointmentStatus('in_consultation');
        setElapsedSeconds(0);
      }
    } catch (error) {
      console.error('Failed to start consultation:', error);
    }
  };

  const handleEndAppointment = useCallback(async () => {
    if (!selectedAppointment) return;
    try {
      const res = await apiCall(`/appointments/${selectedAppointment.id}/complete/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }
      });
      if (res.ok) {
        setConsultationEnded(true);
        setAppointmentStatus('completed');
        setConsultationStarted(false);
      }
    } catch (error) {
      console.error('Failed to complete appointment:', error);
    }
  }, [selectedAppointment, apiCall]);

  // Timer effect for consultation - runs continuously regardless of modal state
  useEffect(() => {
    let interval;
    if (consultationStarted && !consultationEnded && consultationStartTime) {
      interval = setInterval(() => {
        const now = new Date();
        const start = new Date(consultationStartTime);
        const diff = Math.floor((now - start) / 1000);
        setElapsedSeconds(diff);
        
        // Auto-complete when scheduled duration is exceeded
        const durationSeconds = (selectedAppointment?.duration_minutes || 30) * 60;
        if (diff >= durationSeconds && !consultationEnded) {
          console.log('Auto-completing appointment - duration exceeded');
          handleEndAppointment();
        }
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [consultationStarted, consultationEnded, consultationStartTime, selectedAppointment, handleEndAppointment]);

  const handleCloseModal = () => {
    setShowAppointmentModal(false);
    setSelectedAppointment(null);
    setConsultationStarted(false);
    setConsultationEnded(false);
    setElapsedSeconds(0);
    fetchDashboardData();
  };

  // Calculate if appointment time is almost elapsed and check for auto-complete
  const getTimeWarning = () => {
    if (!selectedAppointment || !consultationStarted || consultationEnded) return null;
    const durationMinutes = selectedAppointment.duration_minutes || 30;
    const elapsedMinutes = elapsedSeconds / 60;
    const percentage = (elapsedMinutes / durationMinutes) * 100;
    
    if (percentage >= 100) return { level: 'danger', message: 'Time exceeded! Auto-completing...' };
    if (percentage >= 90) return { level: 'danger', message: 'Time almost up! (90%)' };
    if (percentage >= 75) return { level: 'warning', message: `Time running low (${Math.round(percentage)}%)` };
    return null;
  };

  return (
    <DashboardLayout navItems={getNavForUser(user)} brandTitle={getBrandForUser(user)} roleBadge={getRoleBadge(user)}>


      {/* Next Upcoming Appointment Card */}
      {nextAppointment && (
        <div className="card mb-4 border-0 shadow-sm" style={{ borderRadius: '16px', borderLeft: '4px solid #4361ee' }}>
          <div className="card-body p-4">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <span className="text-uppercase small fw-bold text-primary" style={{ fontSize: '12px', letterSpacing: '0.5px' }}>
                <i className="fas fa-bell me-2"></i>Upcoming Appointment
              </span>
              <span className={`badge ${nextAppointment.status === 'in_consultation' ? 'bg-warning text-dark' : nextAppointment.status === 'scheduled' ? 'bg-primary' : 'bg-light text-dark'}`}>{nextAppointment.status?.replace('_', ' ')}</span>
            </div>
            <div className="d-flex align-items-center gap-3">
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '20px', fontWeight: 'bold'
              }}>
                {nextAppointment.patient?.first_name?.[0]}{nextAppointment.patient?.last_name?.[0]}
              </div>
              <div className="flex-grow-1">
                <h5 className="mb-1 fw-bold">{nextAppointment.patient?.full_name}</h5>
                <p className="mb-0 text-muted">
                  <i className="fas fa-calendar me-2"></i>
                  {formatDate(nextAppointment.scheduled_at)} at {formatTime(nextAppointment.scheduled_at)}
                </p>
              </div>
              <div className="text-end">
                <a href="/doctor/queue" className="btn btn-outline-primary btn-sm">
                  <i className="fas fa-arrow-right me-1"></i>View in Queue
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stat Cards Row - Patient Dashboard Style */}
      <div className="row g-3 mb-4">
        <div className="col-xl col-md-6">
          <div className="card h-100 border-0 shadow-sm" style={{ borderRadius: '16px', cursor: 'pointer' }} onClick={() => setActiveTab('upcoming')}>
            <div className="card-body p-4">
              <div className="d-flex align-items-center mb-3">
                <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px', background: 'rgba(67, 97, 238, 0.1)' }}>
                  <i className="fas fa-calendar-alt text-primary" style={{ fontSize: '20px' }}></i>
                </div>
                <div className="ms-auto">
                  <h2 className="mb-0 fw-bold">{upcoming.length}</h2>
                </div>
              </div>
              <p className="text-muted mb-0">Upcoming Appointments</p>
            </div>
          </div>
        </div>

        <div className="col-xl col-md-6">
          <div className="card h-100 border-0 shadow-sm" style={{ borderRadius: '16px', cursor: 'pointer', border: pending > 0 ? '2px solid #6c757d' : 'none' }} onClick={() => setActiveTab('pending')}>
            <div className="card-body p-4">
              <div className="d-flex align-items-center mb-3">
                <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px', background: 'rgba(108, 117, 125, 0.1)' }}>
                  <i className="fas fa-hourglass-half text-secondary" style={{ fontSize: '20px', color: pending > 0 ? '#6c757d' : '#adb5bd' }}></i>
                  {pending > 0 && (
                    <span className="position-absolute top-0 end-0 translate-middle p-1 bg-danger border border-light rounded-circle" style={{ marginTop: '8px', marginRight: '8px' }}>
                      <span className="visually-hidden">New</span>
                    </span>
                  )}
                </div>
                <div className="ms-auto">
                  <h2 className="mb-0 fw-bold text-secondary">{pending}</h2>
                </div>
              </div>
              <p className="text-muted mb-0">
                <span className={pending > 0 ? 'fw-bold text-secondary' : ''}>Pending Requests</span>
                {pending > 0 && <span className="ms-2 badge bg-secondary">Needs Review</span>}
              </p>
            </div>
          </div>
        </div>

        <div className="col-xl col-md-6">
          <div className="card h-100 border-0 shadow-sm" style={{ borderRadius: '16px', cursor: 'pointer' }} onClick={() => setActiveTab('completed')}>
            <div className="card-body p-4">
              <div className="d-flex align-items-center mb-3">
                <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px', background: 'rgba(16, 185, 129, 0.1)' }}>
                  <i className="fas fa-check-circle text-success" style={{ fontSize: '20px' }}></i>
                </div>
                <div className="ms-auto">
                  <h2 className="mb-0 fw-bold text-success">{dash?.all_completed?.length || 0}</h2>
                </div>
              </div>
              <p className="text-muted mb-0">Completed</p>
            </div>
          </div>
        </div>

        <div className="col-xl col-md-6">
          <div className="card h-100 border-0 shadow-sm" style={{ borderRadius: '16px', cursor: 'pointer' }} onClick={() => setActiveTab('cancelled')}>
            <div className="card-body p-4">
              <div className="d-flex align-items-center mb-3">
                <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px', background: 'rgba(239, 68, 68, 0.1)' }}>
                  <i className="fas fa-times-circle text-danger" style={{ fontSize: '20px' }}></i>
                </div>
                <div className="ms-auto">
                  <h2 className="mb-0 fw-bold text-danger">{dash?.cancelled?.length || 0}</h2>
                </div>
              </div>
              <p className="text-muted mb-0">Cancelled</p>
            </div>
          </div>
        </div>

        <div className="col-xl col-md-6">
          <div className="card h-100 border-0 shadow-sm" style={{ borderRadius: '16px', cursor: 'pointer', border: inProgressAppointments.length > 0 ? '2px solid #f59e0b' : 'none' }} onClick={() => setActiveTab('in_progress')}>
            <div className="card-body p-4">
              <div className="d-flex align-items-center mb-3">
                <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px', background: 'rgba(245, 158, 11, 0.1)' }}>
                  <i className="fas fa-stethoscope text-warning" style={{ fontSize: '20px', color: '#f59e0b' }}></i>
                  {inProgressAppointments.length > 0 && (
                    <span className="position-absolute top-0 end-0 translate-middle p-1 bg-danger border border-light rounded-circle" style={{ marginTop: '8px', marginRight: '8px' }}>
                      <span className="visually-hidden">Active</span>
                    </span>
                  )}
                </div>
                <div className="ms-auto">
                  <h2 className="mb-0 fw-bold" style={{ color: '#f59e0b' }}>{inProgressAppointments.length}</h2>
                </div>
              </div>
              <p className="text-muted mb-0">
                <span className={inProgressAppointments.length > 0 ? 'fw-bold text-warning' : ''}>In Progress</span>
                {inProgressAppointments.length > 0 && <span className="ms-2 badge bg-warning text-dark">Active</span>}
              </p>
            </div>
          </div>
        </div>

        <div className="col-xl col-md-6">
          <div className="card h-100 border-0 shadow-sm" style={{ borderRadius: '16px', cursor: 'pointer' }} onClick={() => setActiveTab('all')}>
            <div className="card-body p-4">
              <div className="d-flex align-items-center mb-3">
                <div className="rounded-circle d-flex align-items-center justify-content-center" style={{ width: '48px', height: '48px', background: 'rgba(139, 92, 246, 0.1)' }}>
                  <i className="fas fa-clipboard-list text-purple" style={{ fontSize: '20px', color: '#8b5cf6' }}></i>
                </div>
                <div className="ms-auto">
                  <h2 className="mb-0 fw-bold" style={{ color: '#8b5cf6' }}>
                    {(dash?.all_completed?.length || 0) + (allToday.length || 0) + (upcoming.length || 0)}
                  </h2>
                </div>
              </div>
              <p className="text-muted mb-0">Total Appointments</p>
            </div>
          </div>
        </div>
      </div>

      {/* My Appointments Section with Tabs */}
      <div className="card border-0 shadow-sm" style={{ borderRadius: '16px' }}>
        <div className="card-header bg-white border-bottom-0 pt-4 px-4">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0 fw-bold"><i className="fas fa-calendar-check me-2 text-primary"></i>My Appointments</h5>
            <a href="/doctor/queue" className="btn btn-primary btn-sm">
              <i className="fas fa-plus me-1"></i>View Queue
            </a>
          </div>
          
          {/* Search Bar */}
          <div className="mt-3 mb-2">
            <div className="input-group">
              <span className="input-group-text bg-light border-0">
                <i className="fas fa-search text-muted"></i>
              </span>
              <input
                type="text"
                className="form-control border-0 bg-light"
                placeholder="Search by patient name, ID, or reason..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ fontSize: '14px' }}
              />
              {searchQuery && (
                <button 
                  className="btn btn-light border-0" 
                  onClick={() => setSearchQuery('')}
                  style={{ color: '#6b7280' }}
                >
                  <i className="fas fa-times"></i>
                </button>
              )}
            </div>
          </div>
          
          {/* Tabs */}
          <div className="d-flex gap-1 mt-3" style={{ borderBottom: '2px solid #f3f4f6' }}>
            {[
              { id: 'all', label: 'All', icon: 'fa-list', count: (dash?.all_completed?.length || 0) + (allToday.length || 0) + (upcoming.length || 0) },
              { id: 'pending', label: 'Pending', icon: 'fa-hourglass-half', count: pending },
              { id: 'today', label: 'Today', icon: 'fa-calendar-day', count: today.total },
              { id: 'upcoming', label: 'Upcoming', icon: 'fa-calendar-alt', count: upcoming.length },
              { id: 'in_progress', label: 'In Progress', icon: 'fa-stethoscope', count: inProgressAppointments.length, highlight: inProgressAppointments.length > 0 },
              { id: 'completed', label: 'Completed', icon: 'fa-check-circle', count: dash?.all_completed?.length || 0 },
              { id: 'cancelled', label: 'Cancelled', icon: 'fa-times-circle', count: dash?.cancelled?.length || 0 },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="btn btn-link text-decoration-none px-3 py-2"
                style={{
                  fontSize: '14px',
                  fontWeight: activeTab === tab.id ? '600' : tab.id === 'in_progress' && tab.highlight ? '600' : '400',
                  color: activeTab === tab.id ? '#4361ee' : tab.id === 'in_progress' && tab.highlight ? '#f59e0b' : '#6b7280',
                  borderBottom: activeTab === tab.id ? '2px solid #4361ee' : tab.id === 'in_progress' && tab.highlight ? '2px solid #f59e0b' : '2px solid transparent',
                  marginBottom: '-2px',
                  borderRadius: 0
                }}
              >
                <i className={`fas ${tab.icon} me-2 ${tab.id === 'in_progress' && tab.highlight && activeTab !== 'in_progress' ? 'text-warning' : ''}`}></i>
                {tab.label}
                <span className="badge ms-2" style={{ 
                  background: activeTab === tab.id ? '#4361ee' : tab.id === 'in_progress' && tab.highlight ? '#f59e0b' : '#e5e7eb', 
                  color: activeTab === tab.id || (tab.id === 'in_progress' && tab.highlight) ? 'white' : '#6b7280' 
                }}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="card-body p-0">
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary"></div>
              <p className="text-muted mt-2">Loading appointments...</p>
            </div>
          ) : filteredAppointments.length === 0 ? (
            <div className="text-center py-5">
              <i className="fas fa-calendar-times fa-3x text-muted mb-3"></i>
              <p className="text-muted">No {activeTab} appointments found</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Patient</th>
                    <th>Date & Time</th>
                    <th>Status</th>
                    <th>Reason</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAppointments.map((apt) => (
                    <tr key={apt.id} style={{ cursor: 'pointer' }} onClick={() => handleOpenAppointment(apt)}>
                      <td>
                        <div className="d-flex align-items-center gap-3">
                          <div style={{
                            width: '44px', height: '44px', borderRadius: '50%',
                            background: 'linear-gradient(135deg, #667eea, #764ba2)',
                            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '14px', fontWeight: 'bold'
                          }}>
                            {apt.patient?.first_name?.[0]}{apt.patient?.last_name?.[0]}
                          </div>
                          <div>
                            <div className="fw-bold">{apt.patient?.full_name}</div>
                            <div className="small text-muted">ID: {apt.patient?.patient_id}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        {apt.scheduled_at ? (
                          <>
                            <div className="fw-medium">{formatDate(apt.scheduled_at)}</div>
                            <div className="small text-muted"><i className="fas fa-clock me-1"></i>{formatTime(apt.scheduled_at)}</div>
                          </>
                        ) : (
                          <>
                            <div className="fw-medium text-warning"><i className="fas fa-exclamation-circle me-1"></i>Not scheduled</div>
                            <div className="small text-muted">Awaiting approval</div>
                          </>
                        )}
                      </td>
                      <td>
                        <span className={`badge ${
                          apt.status === 'completed' ? 'bg-success' :
                          apt.status === 'cancelled' ? 'bg-danger' :
                          apt.status === 'scheduled' ? 'bg-primary' :
                          apt.status === 'checked_in' ? 'bg-info' :
                          apt.status === 'in_consultation' ? 'bg-warning' :
                          apt.status === 'pending' ? 'bg-secondary' :
                          'bg-light text-dark'
                        }`}>
                          {apt.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td>
                        <div className="text-truncate" style={{ maxWidth: '200px' }} title={apt.reason}>
                          {apt.reason || 'General consultation'}
                        </div>
                      </td>
                      <td>
                        <button className="btn btn-sm btn-outline-primary" onClick={(e) => { e.stopPropagation(); handleOpenAppointment(apt); }}>
                          <i className="fas fa-eye me-1"></i>View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Appointment Detail Modal */}
      {showAppointmentModal && selectedAppointment && (
        <div 
          className="modal fade show d-block" 
          style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1050 }}
          tabIndex="-1"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            // Only close if clicking the backdrop, not the modal content
            if (e.target === e.currentTarget) {
              handleCloseModal();
            }
          }}
        >
          <div className="modal-dialog modal-lg modal-dialog-centered" role="document" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content" style={{ borderRadius: '16px', border: 'none' }}>
              {/* Modal Header */}
              <div className="modal-header" style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', color: 'white', borderRadius: '16px 16px 0 0' }}>
                <div className="d-flex align-items-center gap-3">
                  <div style={{
                    width: '56px', height: '56px', borderRadius: '50%',
                    background: 'rgba(255,255,255,0.2)',
                    color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '20px', fontWeight: 'bold'
                  }}>
                    {selectedAppointment.patient?.first_name?.[0]}{selectedAppointment.patient?.last_name?.[0]}
                  </div>
                  <div>
                    <h5 className="modal-title mb-1">{selectedAppointment.patient?.full_name}</h5>
                    <p className="mb-0 opacity-75">
                      ID: {selectedAppointment.patient?.patient_id} | 
                      <span className={`badge ms-2 ${
                        appointmentStatus === 'completed' ? 'bg-success' :
                        appointmentStatus === 'cancelled' ? 'bg-danger' :
                        appointmentStatus === 'in_consultation' ? 'bg-warning text-dark' :
                        appointmentStatus === 'scheduled' ? 'bg-primary' :
                        'bg-light text-dark'
                      }`}>
                        {appointmentStatus?.replace('_', ' ')}
                      </span>
                    </p>
                  </div>
                </div>
                <button type="button" className="btn-close btn-close-white" onClick={handleCloseModal}></button>
              </div>

              {/* Modal Body */}
              <div className="modal-body p-4">
                {/* Timer Section - Only show if consultation started */}
                {(consultationStarted || consultationEnded) && (
                  <div className={`alert ${getTimeWarning()?.level === 'danger' ? 'alert-danger' : getTimeWarning()?.level === 'warning' ? 'alert-warning' : 'alert-info'} mb-4`}>
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <h6 className="mb-1"><i className="fas fa-clock me-2"></i>Consultation Timer</h6>
                        <p className="mb-0">
                          {consultationEnded ? (
                            <span className="text-success fw-bold"><i className="fas fa-check-circle me-1"></i>Completed in {formatDuration(elapsedSeconds)}</span>
                          ) : (
                            <span className="fw-bold fs-5">{formatDuration(elapsedSeconds)}</span>
                          )}
                        </p>
                        {getTimeWarning() && !consultationEnded && (
                          <p className={`mb-0 mt-1 ${getTimeWarning().level === 'danger' ? 'text-danger fw-bold' : 'text-warning'}`}>
                            <i className="fas fa-exclamation-triangle me-1"></i>
                            {getTimeWarning().message}
                          </p>
                        )}
                      </div>
                      {!consultationEnded && (
                        <div className="text-end">
                          <div className="fs-6 text-muted">
                            Duration: {selectedAppointment.duration_minutes || 30} min
                          </div>
                          <div className="progress mt-2" style={{ width: '150px', height: '8px' }}>
                            <div 
                              className={`progress-bar ${getTimeWarning()?.level === 'danger' ? 'bg-danger' : getTimeWarning()?.level === 'warning' ? 'bg-warning' : 'bg-info'}`}
                              role="progressbar"
                              style={{ 
                                width: `${Math.min(100, (elapsedSeconds / ((selectedAppointment.duration_minutes || 30) * 60)) * 100)}%` 
                              }}
                            ></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Appointment Details */}
                <div className="row g-4">
                  <div className="col-md-6">
                    <h6 className="text-muted mb-3"><i className="fas fa-calendar-alt me-2"></i>Appointment Details</h6>
                    <table className="table table-sm">
                      <tbody>
                        <tr>
                          <td className="text-muted">Scheduled Date:</td>
                          <td className="fw-medium">{formatDate(selectedAppointment.scheduled_at)}</td>
                        </tr>
                        <tr>
                          <td className="text-muted">Scheduled Time:</td>
                          <td className="fw-medium">{formatTime(selectedAppointment.scheduled_at)}</td>
                        </tr>
                        <tr>
                          <td className="text-muted">Duration:</td>
                          <td className="fw-medium">{selectedAppointment.duration_minutes || 30} minutes</td>
                        </tr>
                        <tr>
                          <td className="text-muted">Priority:</td>
                          <td>
                            <span className={`badge ${selectedAppointment.priority === 'urgent' ? 'bg-danger' : selectedAppointment.priority === 'high' ? 'bg-warning' : 'bg-success'}`}>
                              {selectedAppointment.priority || 'Normal'}
                            </span>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                  <div className="col-md-6">
                    <h6 className="text-muted mb-3"><i className="fas fa-hospital me-2"></i>Location & Notes</h6>
                    <table className="table table-sm">
                      <tbody>
                        <tr>
                          <td className="text-muted">Hospital:</td>
                          <td className="fw-medium">{selectedAppointment.hospital?.name || user?.hospital?.name || 'Hospital'}</td>
                        </tr>
                        <tr>
                          <td className="text-muted">Department:</td>
                          <td className="fw-medium">{selectedAppointment.department?.name || 'General'}</td>
                        </tr>
                        <tr>
                          <td className="text-muted">Doctor:</td>
                          <td className="fw-medium">Dr. {user?.full_name}</td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Reason Section */}
                <div className="mt-4">
                  <h6 className="text-muted mb-2"><i className="fas fa-file-medical me-2"></i>Reason for Visit</h6>
                  <div className="p-3 bg-light rounded" style={{ borderLeft: '4px solid #4361ee' }}>
                    <p className="mb-0">{selectedAppointment.reason || 'General consultation'}</p>
                  </div>
                </div>

                {/* Notes Section */}
                {selectedAppointment.notes && (
                  <div className="mt-3">
                    <h6 className="text-muted mb-2"><i className="fas fa-sticky-note me-2"></i>Additional Notes</h6>
                    <div className="p-3 bg-light rounded">
                      <p className="mb-0">{selectedAppointment.notes}</p>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="d-flex gap-3 mt-4 pt-3 border-top">
                  {!consultationStarted && !consultationEnded && appointmentStatus !== 'completed' && appointmentStatus !== 'cancelled' && (
                    <button 
                      className="btn btn-primary btn-lg flex-fill" 
                      onClick={handleCommenceAppointment}
                      style={{ background: 'linear-gradient(135deg, #667eea, #764ba2)', border: 'none' }}
                    >
                      <i className="fas fa-play me-2"></i>Commence Appointment
                    </button>
                  )}
                  
                  {consultationStarted && !consultationEnded && (
                    <button 
                      className="btn btn-success btn-lg flex-fill" 
                      onClick={handleEndAppointment}
                    >
                      <i className="fas fa-check-circle me-2"></i>End Appointment
                    </button>
                  )}
                  
                  {consultationEnded && (
                    <button className="btn btn-secondary btn-lg flex-fill" disabled>
                      <i className="fas fa-check-double me-2"></i>Appointment Completed
                    </button>
                  )}

                  <button className="btn btn-outline-secondary btn-lg" onClick={handleCloseModal}>
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}

export default DoctorDashboard;

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { showToast } from '../../utils/toast';

function DoctorCompletedAppointments() {
  const { apiCall, user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const roleColors = {
    admin: '#4361ee', ministry_admin: '#7c3aed', district_admin: '#059669',
    hospital_admin: '#f77f00', receptionist: '#0891b2', doctor: '#e63946', nurse: '#ec4899',
  };

  const fetchCompletedAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiCall(`/appointments/?status=completed&date_from=${selectedDate}&date_to=${selectedDate}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Completed appointments data:', data); // Debug log
        setAppointments(data.results || data);
      }
    } catch {
      showToast.error('Failed to load completed appointments');
    } finally {
      setLoading(false);
    }
  }, [apiCall, selectedDate]);

  useEffect(() => {
    fetchCompletedAppointments();
  }, [fetchCompletedAppointments]);

  const formatTime = (dateString) => {
    if (!dateString) return '--:--';
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleString('en-US', { 
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const calculateDuration = (startedAt, completedAt) => {
    // Try consultation_started_at first, then fall back to scheduled_at + duration
    const consultationStart = startedAt;
    const consultationEnd = completedAt;
    
    if (!consultationStart || !consultationEnd) {
      // If no consultation timestamps, show N/A
      return 'N/A';
    }
    
    const start = new Date(consultationStart);
    const end = new Date(consultationEnd);
    const durationMs = end - start;
    
    if (durationMs < 0) return 'N/A';
    
    const minutes = Math.floor(durationMs / 60000);
    const seconds = Math.floor((durationMs % 60000) / 1000);
    
    if (minutes > 0) {
      return `${minutes}m ${seconds}s`;
    }
    return `${seconds}s`;
  };

  if (loading) {
    return (
      <div className="page-container">
        <div className="page-header">
          <div className="d-flex align-items-center gap-3">
            <div className="page-icon" style={{ background: roleColors[user?.role?.name] || '#6c757d' }}>
              <i className="fas fa-check-circle"></i>
            </div>
            <div>
              <h2 className="page-title">Completed Appointments</h2>
              <p className="text-muted mb-0">View your finished consultation sessions</p>
            </div>
          </div>
        </div>
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <div className="page-header">
        <div className="d-flex align-items-center justify-content-between">
          <div className="d-flex align-items-center gap-3">
            <button className="btn btn-outline-secondary" onClick={() => window.history.back()}>
              <i className="fas fa-arrow-left me-2"></i>Back
            </button>
            <div className="page-icon" style={{ background: roleColors[user?.role?.name] || '#6c757d' }}>
              <i className="fas fa-check-circle"></i>
            </div>
            <div>
              <h2 className="page-title">Completed Appointments</h2>
              <p className="text-muted mb-0">View your finished consultation sessions</p>
            </div>
          </div>
          <div className="d-flex align-items-center gap-3">
            <input
              type="date"
              className="form-control"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              style={{ width: '200px' }}
            />
            <button className="btn btn-primary" onClick={fetchCompletedAppointments}>
              <i className="fas fa-sync-alt me-2"></i>Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="card border-0 shadow-sm">
        <div className="card-body">
          {appointments.length === 0 ? (
            <div className="text-center py-5">
              <i className="fas fa-check-circle text-muted" style={{ fontSize: '48px' }}></i>
              <h4 className="text-muted mt-3">No Completed Appointments</h4>
              <p className="text-muted">No appointments have been completed on {formatDate(selectedDate)}</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Scheduled Time</th>
                    <th>Duration</th>
                    <th>Completed At</th>
                    <th>Reason</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {appointments.map((apt) => (
                    <tr key={apt.id}>
                      <td>
                        <div className="d-flex align-items-center gap-2">
                          <div style={{
                            width: '32px', height: '32px', borderRadius: '50%',
                            background: 'linear-gradient(135deg, #667eea, #764ba2)',
                            color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '12px', fontWeight: 'bold'
                          }}>
                            {apt.patient?.first_name?.[0]}{apt.patient?.last_name?.[0]}
                          </div>
                          <div>
                            <div className="fw-medium">{apt.patient?.full_name}</div>
                            <div className="small text-muted">ID: {apt.patient?.patient_id}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="fw-medium">{formatTime(apt.scheduled_at)}</div>
                        <div className="small text-muted">{formatDate(apt.scheduled_at)}</div>
                      </td>
                      <td>
                        <span className="badge bg-success">
                          {calculateDuration(apt.consultation_started_at, apt.completed_at)}
                        </span>
                      </td>
                      <td>
                        <div className="fw-medium">{formatTime(apt.completed_at)}</div>
                        <div className="small text-muted">
                          {apt.completed_at && new Date(apt.completed_at).toLocaleDateString()}
                        </div>
                      </td>
                      <td>
                        <div className="text-truncate" style={{ maxWidth: '200px' }} title={apt.reason}>
                          {apt.reason || 'General consultation'}
                        </div>
                      </td>
                      <td>
                        <button className="btn btn-sm btn-outline-primary" onClick={() => {
                          setSelectedAppointment(apt);
                          setShowDetailsModal(true);
                        }}>
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

      <div className="row mt-4">
        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center">
              <i className="fas fa-check-circle text-success" style={{ fontSize: '32px' }}></i>
              <h3 className="mt-2 mb-1">{appointments.length}</h3>
              <p className="text-muted mb-0">Total Completed</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center">
              <i className="fas fa-clock text-info" style={{ fontSize: '32px' }}></i>
              <h3 className="mt-2 mb-1">
                {appointments.reduce((total, apt) => {
                  const duration = calculateDuration(apt.consultation_started_at, apt.completed_at);
                  const minutes = parseInt(duration) || 0;
                  return total + minutes;
                }, 0)}m
              </h3>
              <p className="text-muted mb-0">Total Time</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center">
              <i className="fas fa-hourglass-half text-warning" style={{ fontSize: '32px' }}></i>
              <h3 className="mt-2 mb-1">
                {appointments.length > 0 
                  ? Math.round(appointments.reduce((total, apt) => {
                      const duration = calculateDuration(apt.consultation_started_at, apt.completed_at);
                      const minutes = parseInt(duration) || 0;
                      return total + minutes;
                    }, 0) / appointments.length)
                  : 0}m
              </h3>
              <p className="text-muted mb-0">Average Duration</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card border-0 shadow-sm">
            <div className="card-body text-center">
              <i className="fas fa-calendar-check text-primary" style={{ fontSize: '32px' }}></i>
              <h3 className="mt-2 mb-1">{formatDate(selectedDate)}</h3>
              <p className="text-muted mb-0">Selected Date</p>
            </div>
          </div>
        </div>
      </div>

      {/* Appointment Details Modal */}
      {showDetailsModal && selectedAppointment && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Appointment Details</h5>
                <button type="button" className="btn-close" onClick={() => setShowDetailsModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="row">
                  <div className="col-md-6">
                    <h6 className="text-muted">Patient Information</h6>
                    <p><strong>Name:</strong> {selectedAppointment.patient?.full_name}</p>
                    <p><strong>Patient ID:</strong> {selectedAppointment.patient?.patient_id}</p>
                    <p><strong>Phone:</strong> {selectedAppointment.patient?.phone}</p>
                    <p><strong>Email:</strong> {selectedAppointment.patient?.email}</p>
                  </div>
                  <div className="col-md-6">
                    <h6 className="text-muted">Appointment Information</h6>
                    <p><strong>Scheduled:</strong> {formatDate(selectedAppointment.scheduled_at)} at {formatTime(selectedAppointment.scheduled_at)}</p>
                    <p><strong>Duration:</strong> {selectedAppointment.duration_minutes || 30} minutes</p>
                    <p><strong>Status:</strong> <span className="badge bg-success">{selectedAppointment.status_display || selectedAppointment.status}</span></p>
                    <p><strong>Priority:</strong> <span className="badge bg-info">{selectedAppointment.priority}</span></p>
                  </div>
                </div>
                <hr />
                <div className="row">
                  <div className="col-md-6">
                    <h6 className="text-muted">Consultation Timeline</h6>
                    <p><strong>Started:</strong> {selectedAppointment.consultation_started_at ? formatDateTime(selectedAppointment.consultation_started_at) : 'N/A'}</p>
                    <p><strong>Completed:</strong> {selectedAppointment.completed_at ? formatDateTime(selectedAppointment.completed_at) : 'N/A'}</p>
                    <p><strong>Actual Duration:</strong> <span className="badge bg-success">{calculateDuration(selectedAppointment.consultation_started_at, selectedAppointment.completed_at)}</span></p>
                  </div>
                  <div className="col-md-6">
                    <h6 className="text-muted">Hospital Information</h6>
                    <p><strong>Hospital:</strong> {selectedAppointment.hospital}</p>
                    <p><strong>Department:</strong> {selectedAppointment.department || 'N/A'}</p>
                    <p><strong>Doctor:</strong> {selectedAppointment.doctor_name}</p>
                  </div>
                </div>
                <hr />
                <div>
                  <h6 className="text-muted">Reason for Visit</h6>
                  <p>{selectedAppointment.reason || 'General consultation'}</p>
                </div>
                {selectedAppointment.notes && (
                  <div>
                    <h6 className="text-muted">Notes</h6>
                    <p>{selectedAppointment.notes}</p>
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowDetailsModal(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DoctorCompletedAppointments;

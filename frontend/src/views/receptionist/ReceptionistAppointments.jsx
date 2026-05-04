import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layout/DashboardLayout';
import { getNavForUser, getBrandForUser, getRoleBadge } from '../../utils/navItems';
import { showToast } from '../../utils/toast';

function ReceptionistAppointments() {
  const { apiCall, user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    today: { total: 0, completed: 0, checked_in: 0, no_show: 0, cancelled: 0 }
  });
  
  // Filters
  const [dateFilter, setDateFilter] = useState('today');
  const [statusFilter, setStatusFilter] = useState('');
  const [doctorFilter, setDoctorFilter] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // Data for dropdowns
  const [doctors, setDoctors] = useState([]);
  
  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  
  // Form data for new appointment
  const [formData, setFormData] = useState({
    patient_id: '',
    doctor_id: '',
    scheduled_date: '',
    scheduled_time: '',
    duration_minutes: 30,
    priority: 'normal',
    reason: '',
    notes: ''
  });
  
  // Patient search for booking
  const [patientSearch, setPatientSearch] = useState('');
  const [patientResults, setPatientResults] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [searchingPatients, setSearchingPatients] = useState(false);

  const roleColors = {
    admin: '#4361ee', ministry_admin: '#7c3aed', district_admin: '#059669',
    hospital_admin: '#f77f00', receptionist: '#0891b2', doctor: '#e63946', nurse: '#ec4899',
  };

  // Fetch appointments
  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      
      // Date filter
      const today = new Date().toISOString().split('T')[0];
      if (dateFilter === 'today') {
        params.append('date_from', today);
        params.append('date_to', today);
      } else if (dateFilter === 'week') {
        const weekFromNow = new Date();
        weekFromNow.setDate(weekFromNow.getDate() + 7);
        params.append('date_from', today);
        params.append('date_to', weekFromNow.toISOString().split('T')[0]);
      } else if (dateFilter === 'month') {
        const monthFromNow = new Date();
        monthFromNow.setMonth(monthFromNow.getMonth() + 1);
        params.append('date_from', today);
        params.append('date_to', monthFromNow.toISOString().split('T')[0]);
      }
      
      if (statusFilter) params.append('status', statusFilter);
      if (doctorFilter) params.append('doctor', doctorFilter);
      if (searchQuery) params.append('search', searchQuery);
      
      const response = await apiCall(`/appointments/?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        setAppointments(data.results || data);
      }
    } catch {
      showToast.error('Failed to load appointments');
    } finally {
      setLoading(false);
    }
  }, [apiCall, dateFilter, statusFilter, doctorFilter, searchQuery]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const response = await apiCall('/appointments/stats/');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch {
      console.error('Failed to load stats');
    }
  }, [apiCall]);

  // Fetch doctors for dropdown
  const fetchDoctors = useCallback(async () => {
    try {
      const response = await apiCall('/appointments/doctors/');
      if (response.ok) {
        const data = await response.json();
        setDoctors(data.doctors || []);
      }
    } catch {
      console.error('Failed to load doctors');
    }
  }, [apiCall]);

  // Search patients
  const searchPatients = useCallback(async (query) => {
    if (!query || query.length < 2) {
      setPatientResults([]);
      return;
    }
    setSearchingPatients(true);
    try {
      const response = await apiCall(`/patients/?search=${encodeURIComponent(query)}`);
      if (response.ok) {
        const data = await response.json();
        setPatientResults(data.results || data);
      }
    } catch {
      console.error('Patient search failed');
    } finally {
      setSearchingPatients(false);
    }
  }, [apiCall]);

  useEffect(() => {
    fetchAppointments();
    fetchStats();
    fetchDoctors();
  }, [fetchAppointments, fetchStats, fetchDoctors]);

  useEffect(() => {
    const timeout = setTimeout(() => searchPatients(patientSearch), 300);
    return () => clearTimeout(timeout);
  }, [patientSearch, searchPatients]);

  const handleCheckIn = async (appointmentId) => {
    try {
      const response = await apiCall(`/appointments/${appointmentId}/check_in/`, {
        method: 'POST'
      });
      if (response.ok) {
        showToast.success('Patient checked in successfully');
        fetchAppointments();
        fetchStats();
        setShowCheckInModal(false);
        setSelectedAppointment(null);
      } else {
        const error = await response.json();
        showToast.error(error.detail || 'Failed to check in');
      }
    } catch {
      showToast.error('Failed to check in patient');
    }
  };

  const handleCancel = async (appointmentId, reason = '') => {
    try {
      const response = await apiCall(`/appointments/${appointmentId}/cancel/`, {
        method: 'POST',
        body: JSON.stringify({ reason })
      });
      if (response.ok) {
        showToast.success('Appointment cancelled');
        fetchAppointments();
        fetchStats();
      } else {
        const error = await response.json();
        showToast.error(error.detail || 'Failed to cancel');
      }
    } catch {
      showToast.error('Failed to cancel appointment');
    }
  };

  const handleNoShow = async (appointmentId) => {
    try {
      const response = await apiCall(`/appointments/${appointmentId}/no_show/`, {
        method: 'POST'
      });
      if (response.ok) {
        showToast.success('Marked as no-show');
        fetchAppointments();
        fetchStats();
      } else {
        const error = await response.json();
        showToast.error(error.detail || 'Failed to mark no-show');
      }
    } catch {
      showToast.error('Failed to mark no-show');
    }
  };

  const handleCreateAppointment = async (e) => {
    e.preventDefault();
    if (!selectedPatient) {
      showToast.error('Please select a patient');
      return;
    }
    if (!formData.doctor_id || !formData.scheduled_date || !formData.scheduled_time) {
      showToast.error('Please fill all required fields');
      return;
    }

    const scheduledAt = new Date(`${formData.scheduled_date}T${formData.scheduled_time}`);
    
    try {
      const response = await apiCall('/appointments/', {
        method: 'POST',
        body: JSON.stringify({
          patient: selectedPatient.id,
          doctor: parseInt(formData.doctor_id),
          scheduled_at: scheduledAt.toISOString(),
          duration_minutes: parseInt(formData.duration_minutes),
          priority: formData.priority,
          reason: formData.reason,
          notes: formData.notes
        })
      });
      
      if (response.ok) {
        showToast.success('Appointment created successfully');
        setShowCreateModal(false);
        setFormData({
          patient_id: '', doctor_id: '', scheduled_date: '', scheduled_time: '',
          duration_minutes: 30, priority: 'normal', reason: '', notes: ''
        });
        setSelectedPatient(null);
        setPatientSearch('');
        fetchAppointments();
        fetchStats();
      } else {
        const error = await response.json();
        showToast.error(error.detail || Object.values(error).flat().join(', ') || 'Failed to create appointment');
      }
    } catch {
      showToast.error('Failed to create appointment');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      scheduled: { bg: '#dbeafe', color: '#1e40af', icon: 'fa-calendar', label: 'Scheduled' },
      checked_in: { bg: '#dcfce7', color: '#166534', icon: 'fa-check-circle', label: 'Checked In' },
      in_consultation: { bg: '#fef3c7', color: '#92400e', icon: 'fa-user-md', label: 'In Consultation' },
      completed: { bg: '#f3f4f6', color: '#374151', icon: 'fa-check-double', label: 'Completed' },
      cancelled: { bg: '#fee2e2', color: '#991b1b', icon: 'fa-times-circle', label: 'Cancelled' },
      no_show: { bg: '#ffedd5', color: '#9a3412', icon: 'fa-exclamation-circle', label: 'No Show' },
    };
    const badge = badges[status] || badges.scheduled;
    return (
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: '4px',
        padding: '4px 10px', borderRadius: '20px',
        background: badge.bg, color: badge.color, fontSize: '12px', fontWeight: 500
      }}>
        <i className={`fas ${badge.icon}`}></i>
        {badge.label}
      </span>
    );
  };

  const getPriorityBadge = (priority) => {
    const badges = {
      normal: { bg: '#f3f4f6', color: '#374151' },
      urgent: { bg: '#fef3c7', color: '#92400e' },
      emergency: { bg: '#fee2e2', color: '#991b1b' },
    };
    const badge = badges[priority] || badges.normal;
    return (
      <span style={{
        padding: '2px 8px', borderRadius: '4px',
        background: badge.bg, color: badge.color, fontSize: '11px', fontWeight: 500, textTransform: 'capitalize'
      }}>
        {priority}
      </span>
    );
  };

  const formatTime = (dateString) => {
    if (!dateString) return '--';
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatDate = (dateString) => {
    if (!dateString) return '--';
    return new Date(dateString).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
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
                  <i className="fas fa-calendar-check me-2" style={{ color: roleColors[user?.role] || '#4361ee' }}></i>
                  Appointments
                </h1>
                <p className="text-muted mb-0 small">Manage patient appointments and check-ins</p>
              </div>
              <button className="btn btn-primary" onClick={() => setShowCreateModal(true)}>
                <i className="fas fa-plus me-2"></i>Book Appointment
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="row g-3 mb-4">
          <div className="col-6 col-md-2">
            <div className="card border-0" style={{ background: 'linear-gradient(135deg, #4361ee, #7c3aed)', color: 'white' }}>
              <div className="card-body p-3">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <div className="small opacity-75">Today</div>
                    <div className="h4 mb-0">{stats?.today?.total || 0}</div>
                  </div>
                  <i className="fas fa-calendar-day fa-2x opacity-50"></i>
                </div>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-2">
            <div className="card border-0 bg-success text-white">
              <div className="card-body p-3">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <div className="small opacity-75">Completed</div>
                    <div className="h4 mb-0">{stats?.today?.completed || 0}</div>
                  </div>
                  <i className="fas fa-check-double fa-2x opacity-50"></i>
                </div>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-2">
            <div className="card border-0" style={{ background: '#dcfce7' }}>
              <div className="card-body p-3">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <div className="small text-muted">Checked In</div>
                    <div className="h4 mb-0 text-success">{stats?.today?.checked_in || 0}</div>
                  </div>
                  <i className="fas fa-check-circle fa-2x text-success opacity-50"></i>
                </div>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-2">
            <div className="card border-0" style={{ background: '#fef3c7' }}>
              <div className="card-body p-3">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <div className="small text-muted">Waiting</div>
                    <div className="h4 mb-0" style={{ color: '#92400e' }}>
                      {appointments.filter(a => a.status === 'scheduled').length}
                    </div>
                  </div>
                  <i className="fas fa-clock fa-2x opacity-50" style={{ color: '#92400e' }}></i>
                </div>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-2">
            <div className="card border-0" style={{ background: '#fee2e2' }}>
              <div className="card-body p-3">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <div className="small text-muted">Cancelled</div>
                    <div className="h4 mb-0 text-danger">{stats?.today?.cancelled || 0}</div>
                  </div>
                  <i className="fas fa-times-circle fa-2x text-danger opacity-50"></i>
                </div>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-2">
            <div className="card border-0" style={{ background: '#ffedd5' }}>
              <div className="card-body p-3">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <div className="small text-muted">No Show</div>
                    <div className="h4 mb-0" style={{ color: '#9a3412' }}>{stats?.today?.no_show || 0}</div>
                  </div>
                  <i className="fas fa-exclamation-circle fa-2x opacity-50" style={{ color: '#9a3412' }}></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body p-3">
            <div className="row g-3 align-items-end">
              <div className="col-md-3">
                <label className="form-label small text-muted">Date Range</label>
                <select className="form-select form-select-sm" value={dateFilter} onChange={(e) => setDateFilter(e.target.value)}>
                  <option value="today">Today</option>
                  <option value="week">Next 7 Days</option>
                  <option value="month">Next 30 Days</option>
                  <option value="all">All Dates</option>
                </select>
              </div>
              <div className="col-md-2">
                <label className="form-label small text-muted">Status</label>
                <select className="form-select form-select-sm" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                  <option value="">All Statuses</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="checked_in">Checked In</option>
                  <option value="in_consultation">In Consultation</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                  <option value="no_show">No Show</option>
                </select>
              </div>
              <div className="col-md-2">
                <label className="form-label small text-muted">Doctor</label>
                <select className="form-select form-select-sm" value={doctorFilter} onChange={(e) => setDoctorFilter(e.target.value)}>
                  <option value="">All Doctors</option>
                  {doctors.map(d => (
                    <option key={d.id} value={d.id}>{d.full_name}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-3">
                <label className="form-label small text-muted">Search Patient</label>
                <div className="input-group input-group-sm">
                  <span className="input-group-text"><i className="fas fa-search"></i></span>
                  <input type="text" className="form-control" placeholder="Name, ID, phone..."
                    value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
              </div>
              <div className="col-md-2">
                <button className="btn btn-outline-secondary btn-sm w-100" onClick={() => {
                  setDateFilter('today');
                  setStatusFilter('');
                  setDoctorFilter('');
                  setSearchQuery('');
                }}>
                  <i className="fas fa-undo me-1"></i>Reset
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Appointments Table */}
        <div className="card border-0 shadow-sm">
          <div className="card-body p-0">
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary"></div>
                <p className="text-muted mt-2">Loading appointments...</p>
              </div>
            ) : appointments.length === 0 ? (
              <div className="text-center py-5">
                <i className="fas fa-calendar-times fa-3x text-muted mb-3"></i>
                <p className="text-muted">No appointments found for the selected filters.</p>
                <button className="btn btn-primary btn-sm" onClick={() => setShowCreateModal(true)}>
                  <i className="fas fa-plus me-1"></i>Book First Appointment
                </button>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th>Time</th>
                      <th>Patient</th>
                      <th>Doctor</th>
                      <th>Department</th>
                      <th>Reason</th>
                      <th>Status</th>
                      <th>Priority</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {appointments.map(apt => (
                      <tr key={apt.id}>
                        <td>
                          <div className="fw-semibold">{formatTime(apt.scheduled_at)}</div>
                          <small className="text-muted">{formatDate(apt.scheduled_at)}</small>
                        </td>
                        <td>
                          <div className="d-flex align-items-center gap-2">
                            <div style={{
                              width: '32px', height: '32px', borderRadius: '50%',
                              background: 'linear-gradient(135deg, #667eea, #764ba2)',
                              color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '12px', fontWeight: 'bold'
                            }}>
                              {apt.patient?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?'}
                            </div>
                            <div>
                              <div className="fw-semibold">{apt.patient?.full_name || 'Unknown'}</div>
                              <small className="text-muted">{apt.patient?.patient_id || ''}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="fw-semibold">{apt.doctor?.full_name || 'Unknown'}</div>
                          <small className="text-muted">{apt.doctor?.email || ''}</small>
                        </td>
                        <td>{apt.department || '-'}</td>
                        <td>
                          <div style={{ maxWidth: '200px' }} className="text-truncate" title={apt.reason}>
                            {apt.reason || '-'}
                          </div>
                        </td>
                        <td>{getStatusBadge(apt.status)}</td>
                        <td>{getPriorityBadge(apt.priority)}</td>
                        <td>
                          <div className="d-flex gap-1">
                            {apt.status === 'scheduled' && (
                              <>
                                <button className="btn btn-success btn-sm" title="Check In"
                                  onClick={() => { setSelectedAppointment(apt); setShowCheckInModal(true); }}>
                                  <i className="fas fa-check-circle"></i>
                                </button>
                                <button className="btn btn-outline-danger btn-sm" title="Cancel"
                                  onClick={() => handleCancel(apt.id)}>
                                  <i className="fas fa-times"></i>
                                </button>
                              </>
                            )}
                            {apt.status === 'checked_in' && (
                              <button className="btn btn-outline-warning btn-sm" title="Mark No Show"
                                onClick={() => handleNoShow(apt.id)}>
                                <i className="fas fa-exclamation-circle"></i>
                              </button>
                            )}
                            <button className="btn btn-outline-secondary btn-sm" title="View Details">
                              <i className="fas fa-eye"></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Appointment Modal */}
      {showCreateModal && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-calendar-plus me-2 text-primary"></i>Book New Appointment
                </h5>
                <button className="btn-close" onClick={() => setShowCreateModal(false)}></button>
              </div>
              <form onSubmit={handleCreateAppointment}>
                <div className="modal-body">
                  {/* Patient Search */}
                  <div className="mb-3">
                    <label className="form-label">Search Patient *</label>
                    <div className="position-relative">
                      <input type="text" className="form-control" placeholder="Type patient name, ID, or phone..."
                        value={patientSearch} onChange={(e) => setPatientSearch(e.target.value)} />
                      {searchingPatients && (
                        <div className="position-absolute end-0 top-50 translate-middle-y me-2">
                          <div className="spinner-border spinner-border-sm"></div>
                        </div>
                      )}
                    </div>
                    {patientResults.length > 0 && !selectedPatient && (
                      <div className="list-group mt-1" style={{ maxHeight: '200px', overflow: 'auto' }}>
                        {patientResults.map(p => (
                          <button key={p.id} type="button" className="list-group-item list-group-item-action"
                            onClick={() => { setSelectedPatient(p); setPatientSearch(p.full_name); setPatientResults([]); }}>
                            <div className="d-flex justify-content-between">
                              <span className="fw-semibold">{p.full_name}</span>
                              <span className="text-muted small">{p.patient_id}</span>
                            </div>
                            <small className="text-muted">{p.phone} • {p.email || 'No email'}</small>
                          </button>
                        ))}
                      </div>
                    )}
                    {selectedPatient && (
                      <div className="alert alert-success py-2 mt-2 mb-0 d-flex justify-content-between align-items-center">
                        <span><i className="fas fa-check-circle me-2"></i>Selected: {selectedPatient.full_name}</span>
                        <button type="button" className="btn btn-sm btn-outline-success"
                          onClick={() => { setSelectedPatient(null); setPatientSearch(''); }}>
                          Change
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Doctor *</label>
                      <select className="form-select" required value={formData.doctor_id} onChange={(e) => setFormData({...formData, doctor_id: e.target.value})}>
                        <option value="">Select Doctor</option>
                        {doctors.map(d => (
                          <option key={d.id} value={d.id}>{d.full_name} - {d.department || 'No Dept'}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Date *</label>
                      <input type="date" className="form-control" required min={new Date().toISOString().split('T')[0]}
                        value={formData.scheduled_date} onChange={(e) => setFormData({...formData, scheduled_date: e.target.value})} />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Time *</label>
                      <input type="time" className="form-control" required
                        value={formData.scheduled_time} onChange={(e) => setFormData({...formData, scheduled_time: e.target.value})} />
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Duration</label>
                      <select className="form-select" value={formData.duration_minutes} onChange={(e) => setFormData({...formData, duration_minutes: e.target.value})}>
                        <option value="15">15 minutes</option>
                        <option value="30">30 minutes</option>
                        <option value="45">45 minutes</option>
                        <option value="60">1 hour</option>
                      </select>
                    </div>
                    <div className="col-md-4">
                      <label className="form-label">Priority</label>
                      <select className="form-select" value={formData.priority} onChange={(e) => setFormData({...formData, priority: e.target.value})}>
                        <option value="normal">Normal</option>
                        <option value="urgent">Urgent</option>
                        <option value="emergency">Emergency</option>
                      </select>
                    </div>
                    <div className="col-md-12">
                      <label className="form-label">Reason for Visit</label>
                      <input type="text" className="form-control" placeholder="e.g. Fever, Follow-up, Annual checkup"
                        value={formData.reason} onChange={(e) => setFormData({...formData, reason: e.target.value})} />
                    </div>
                    <div className="col-md-12">
                      <label className="form-label">Notes</label>
                      <textarea className="form-control" rows="2" placeholder="Additional notes..."
                        value={formData.notes} onChange={(e) => setFormData({...formData, notes: e.target.value})} />
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowCreateModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    <i className="fas fa-calendar-check me-2"></i>Book Appointment
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Check In Confirmation Modal */}
      {showCheckInModal && selectedAppointment && (
        <div className="modal show d-block" style={{ background: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-check-circle me-2 text-success"></i>Confirm Check-In
                </h5>
                <button className="btn-close" onClick={() => { setShowCheckInModal(false); setSelectedAppointment(null); }}></button>
              </div>
              <div className="modal-body">
                <p>Are you sure you want to check in:</p>
                <div className="alert alert-light border">
                  <div className="fw-semibold">{selectedAppointment.patient?.full_name}</div>
                  <div className="small text-muted">ID: {selectedAppointment.patient?.patient_id}</div>
                  <div className="mt-2">
                    <i className="fas fa-user-md me-2"></i>{selectedAppointment.doctor?.full_name}<br/>
                    <i className="fas fa-clock me-2"></i>{formatTime(selectedAppointment.scheduled_at)} - {formatDate(selectedAppointment.scheduled_at)}
                  </div>
                </div>
                <p className="mb-0">This will notify the doctor that the patient has arrived.</p>
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline-secondary" onClick={() => { setShowCheckInModal(false); setSelectedAppointment(null); }}>
                  Cancel
                </button>
                <button className="btn btn-success" onClick={() => handleCheckIn(selectedAppointment.id)}>
                  <i className="fas fa-check-circle me-2"></i>Confirm Check-In
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default ReceptionistAppointments;

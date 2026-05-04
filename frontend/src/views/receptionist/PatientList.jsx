import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layout/DashboardLayout';

const navItems = [
  {
    label: 'Main',
    items: [
      { path: '/receptionist/dashboard', icon: 'fas fa-tachometer-alt', text: 'Dashboard' },
      { path: '/receptionist/patients', icon: 'fas fa-user-injured', text: 'Patients' },
      { path: '/receptionist/patients/register', icon: 'fas fa-user-plus', text: 'Register Patient' },
    ]
  },
  {
    label: 'Management',
    items: [
      { path: '/receptionist/appointments', icon: 'fas fa-calendar-check', text: 'Appointments' },
      { path: '/receptionist/queue', icon: 'fas fa-list-ol', text: 'Patient Queue' },
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

const genderColors = { male: '#4361ee', female: '#e63946', other: '#7c3aed' };

function PatientList() {
  const { apiCall } = useAuth();
  const [patients, setPatients] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [editPatient, setEditPatient] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const perPage = 15;

  useEffect(() => {
    fetchPatients();
    fetchStats();
  }, [search, genderFilter, statusFilter]);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      let url = '/patients/?';
      if (search) url += `search=${encodeURIComponent(search)}&`;
      if (genderFilter) url += `gender=${genderFilter}&`;
      if (statusFilter) url += `status=${statusFilter}&`;
      const response = await apiCall(url);
      const data = await response.json();
      if (response.ok) {
        setPatients(Array.isArray(data) ? data : data.results || []);
      }
    } catch (error) {
      console.error('Error fetching patients:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await apiCall('/patients/stats/');
      const data = await response.json();
      if (response.ok) setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const getInitials = (first, last) => {
    return ((first?.[0] || '') + (last?.[0] || '')).toUpperCase() || '??';
  };

  const getTimeAgo = (dateStr) => {
    if (!dateStr) return 'N/A';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 30) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const openEditModal = (patient) => {
    setEditPatient(patient);
    setEditForm({
      first_name: patient.first_name || '',
      last_name: patient.last_name || '',
      other_names: patient.other_names || '',
      phone: patient.phone || '',
      alt_phone: patient.alt_phone || '',
      email: patient.email || '',
      address: patient.address || '',
      city: patient.city || '',
      region: patient.region || '',
      blood_type: patient.blood_type || 'unknown',
      allergies: patient.allergies || '',
      chronic_conditions: patient.chronic_conditions || '',
      insurance_provider: patient.insurance_provider || '',
      insurance_number: patient.insurance_number || '',
      insurance_expiry: patient.insurance_expiry || '',
      next_of_kin_name: patient.next_of_kin_name || '',
      next_of_kin_phone: patient.next_of_kin_phone || '',
      next_of_kin_relationship: patient.next_of_kin_relationship || '',
      emergency_contact_name: patient.emergency_contact_name || '',
      emergency_contact_phone: patient.emergency_contact_phone || '',
      status: patient.status || 'active',
    });
    setShowEditModal(true);
  };

  const handleEditSave = async () => {
    if (!editPatient) return;
    try {
      setSaving(true);
      const response = await apiCall(`/patients/${editPatient.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (response.ok) {
        setShowEditModal(false);
        fetchPatients();
        fetchStats();
      }
    } catch (error) {
      console.error('Error updating patient:', error);
    } finally {
      setSaving(false);
    }
  };

  // Pagination
  const totalPages = Math.ceil(patients.length / perPage);
  const paginatedPatients = patients.slice((currentPage - 1) * perPage, currentPage * perPage);

  return (
    <DashboardLayout navItems={navItems} brandTitle="NEHR System" roleBadge="Receptionist">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h4 className="mb-1"><i className="fas fa-user-injured me-2 text-primary"></i>Patient Registry</h4>
          <p className="text-muted mb-0">Manage and search registered patients</p>
        </div>
        <Link to="/receptionist/patients/register" className="btn btn-primary">
          <i className="fas fa-user-plus me-2"></i>Register New Patient
        </Link>
      </div>

      {/* Stat Cards */}
      {stats && (
        <div className="row g-3 mb-4">
          <div className="col-xl-3 col-md-6">
            <div className="dash-stat-card">
              <div className="stat-icon bg-primary-soft"><i className="fas fa-users"></i></div>
              <div className="stat-label">Total Patients</div>
              <div className="stat-value">{stats.total_patients}</div>
              <div className="stat-change positive"><i className="fas fa-user-plus"></i> {stats.registered_today} today</div>
            </div>
          </div>
          <div className="col-xl-3 col-md-6">
            <div className="dash-stat-card">
              <div className="stat-icon bg-success-soft"><i className="fas fa-heartbeat"></i></div>
              <div className="stat-label">Active Patients</div>
              <div className="stat-value">{stats.active_patients}</div>
              <div className="stat-change positive"><i className="fas fa-check-circle"></i> Active</div>
            </div>
          </div>
          <div className="col-xl-3 col-md-6">
            <div className="dash-stat-card">
              <div className="stat-icon bg-warning-soft"><i className="fas fa-calendar-week"></i></div>
              <div className="stat-label">This Week</div>
              <div className="stat-value">{stats.registered_this_week}</div>
              <div className="stat-change positive"><i className="fas fa-arrow-up"></i> New registrations</div>
            </div>
          </div>
          <div className="col-xl-3 col-md-6">
            <div className="dash-stat-card">
              <div className="stat-icon bg-info-soft"><i className="fas fa-calendar-alt"></i></div>
              <div className="stat-label">This Month</div>
              <div className="stat-value">{stats.registered_this_month}</div>
              <div className="stat-change positive"><i className="fas fa-chart-line"></i> Monthly total</div>
            </div>
          </div>
        </div>
      )}

      {/* Search & Filters */}
      <div className="dash-card mb-4">
        <div className="dash-card-body">
          <div className="row g-3 align-items-end">
            <div className="col-md-5">
              <label className="form-label" style={{fontSize: '13px', fontWeight: 500}}>Search Patients</label>
              <div className="input-group">
                <span className="input-group-text"><i className="fas fa-search"></i></span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Name, Patient ID, Phone, National ID..."
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                />
              </div>
            </div>
            <div className="col-md-2">
              <label className="form-label" style={{fontSize: '13px', fontWeight: 500}}>Gender</label>
              <select className="form-select" value={genderFilter} onChange={(e) => { setGenderFilter(e.target.value); setCurrentPage(1); }}>
                <option value="">All</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label" style={{fontSize: '13px', fontWeight: 500}}>Status</label>
              <select className="form-select" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}>
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="deceased">Deceased</option>
              </select>
            </div>
            <div className="col-md-3 text-end">
              <span className="text-muted" style={{fontSize: '13px'}}>{patients.length} patient{patients.length !== 1 ? 's' : ''} found</span>
            </div>
          </div>
        </div>
      </div>

      {/* Patient Table */}
      <div className="dash-card">
        <div className="dash-card-body" style={{padding: 0, overflowX: 'auto'}}>
          {loading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status"></div>
              <p className="mt-2 text-muted">Loading patients...</p>
            </div>
          ) : patients.length === 0 ? (
            <div className="text-center py-5">
              <i className="fas fa-user-injured" style={{fontSize: '48px', color: '#dee2e6', display: 'block', marginBottom: '16px'}}></i>
              <h5 className="text-muted">No Patients Found</h5>
              <p className="text-muted">
                {search || genderFilter || statusFilter
                  ? 'Try adjusting your search or filters.'
                  : 'Start by registering a new patient.'}
              </p>
              {!search && !genderFilter && !statusFilter && (
                <Link to="/receptionist/patients/register" className="btn btn-primary btn-sm">
                  <i className="fas fa-user-plus me-1"></i>Register First Patient
                </Link>
              )}
            </div>
          ) : (
            <table className="dash-table" style={{minWidth: '900px'}}>
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Patient ID</th>
                  <th>Gender</th>
                  <th>Age</th>
                  <th>Phone</th>
                  <th>Insurance</th>
                  <th>Status</th>
                  <th>Registered</th>
                  <th style={{minWidth: '100px'}}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {paginatedPatients.map((p) => (
                  <tr key={p.id}>
                    <td>
                      <div className="user-cell">
                        <div className="avatar" style={{background: genderColors[p.gender] || '#4361ee'}}>
                          {getInitials(p.first_name, p.last_name)}
                        </div>
                        <div>
                          <div className="user-name">{p.full_name}</div>
                          <div className="user-role">{p.national_id || 'No ID'}</div>
                        </div>
                      </div>
                    </td>
                    <td><span style={{fontFamily: 'monospace', fontSize: '13px'}}>{p.patient_id}</span></td>
                    <td>
                      <span className={`dash-badge ${p.gender === 'male' ? 'dash-badge-primary' : p.gender === 'female' ? 'dash-badge-danger' : 'dash-badge-info'}`}>
                        {p.gender_display}
                      </span>
                    </td>
                    <td>{p.age} yrs</td>
                    <td>{p.phone}</td>
                    <td>
                      {p.insurance_provider ? (
                        <span className="dash-badge dash-badge-success">{p.insurance_provider}</span>
                      ) : (
                        <span className="text-muted" style={{fontSize: '12px'}}>None</span>
                      )}
                    </td>
                    <td>
                      <span className={`dash-badge ${p.status === 'active' ? 'dash-badge-success' : p.status === 'deceased' ? 'dash-badge-danger' : 'dash-badge-warning'}`}>
                        {p.status_display}
                      </span>
                    </td>
                    <td>{getTimeAgo(p.created_at)}</td>
                    <td>
                      <div style={{display: 'flex', gap: '4px'}}>
                        <button
                          className="dash-header-btn"
                          style={{width: '32px', height: '32px', fontSize: '12px'}}
                          title="View Patient"
                          onClick={() => openEditModal(p)}
                        >
                          <i className="fas fa-eye"></i>
                        </button>
                        <button
                          className="dash-header-btn"
                          style={{width: '32px', height: '32px', fontSize: '12px'}}
                          title="Edit Patient"
                          onClick={() => openEditModal(p)}
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="d-flex justify-content-between align-items-center px-3 py-3 border-top">
              <span className="text-muted" style={{fontSize: '13px'}}>
                Showing {(currentPage - 1) * perPage + 1}–{Math.min(currentPage * perPage, patients.length)} of {patients.length}
              </span>
              <nav>
                <ul className="pagination pagination-sm mb-0">
                  <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => setCurrentPage(p => p - 1)}>Prev</button>
                  </li>
                  {Array.from({length: Math.min(totalPages, 5)}, (_, i) => {
                    let page;
                    if (totalPages <= 5) {
                      page = i + 1;
                    } else if (currentPage <= 3) {
                      page = i + 1;
                    } else if (currentPage >= totalPages - 2) {
                      page = totalPages - 4 + i;
                    } else {
                      page = currentPage - 2 + i;
                    }
                    return (
                      <li key={page} className={`page-item ${currentPage === page ? 'active' : ''}`}>
                        <button className="page-link" onClick={() => setCurrentPage(page)}>{page}</button>
                      </li>
                    );
                  })}
                  <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => setCurrentPage(p => p + 1)}>Next</button>
                  </li>
                </ul>
              </nav>
            </div>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      {showEditModal && editPatient && (
        <div className="modal d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
          <div className="modal-dialog modal-lg modal-dialog-scrollable">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-edit me-2"></i>Edit Patient — {editPatient.patient_id}
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowEditModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-md-4">
                    <label className="form-label">First Name</label>
                    <input type="text" className="form-control" value={editForm.first_name}
                      onChange={(e) => setEditForm({...editForm, first_name: e.target.value})} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Other Names</label>
                    <input type="text" className="form-control" value={editForm.other_names}
                      onChange={(e) => setEditForm({...editForm, other_names: e.target.value})} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Last Name</label>
                    <input type="text" className="form-control" value={editForm.last_name}
                      onChange={(e) => setEditForm({...editForm, last_name: e.target.value})} />
                  </div>

                  <div className="col-md-4">
                    <label className="form-label">Phone</label>
                    <input type="text" className="form-control" value={editForm.phone}
                      onChange={(e) => setEditForm({...editForm, phone: e.target.value})} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Alt Phone</label>
                    <input type="text" className="form-control" value={editForm.alt_phone}
                      onChange={(e) => setEditForm({...editForm, alt_phone: e.target.value})} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Email</label>
                    <input type="email" className="form-control" value={editForm.email}
                      onChange={(e) => setEditForm({...editForm, email: e.target.value})} />
                  </div>

                  <div className="col-md-6">
                    <label className="form-label">Address</label>
                    <input type="text" className="form-control" value={editForm.address}
                      onChange={(e) => setEditForm({...editForm, address: e.target.value})} />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">City</label>
                    <input type="text" className="form-control" value={editForm.city}
                      onChange={(e) => setEditForm({...editForm, city: e.target.value})} />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Region</label>
                    <input type="text" className="form-control" value={editForm.region}
                      onChange={(e) => setEditForm({...editForm, region: e.target.value})} />
                  </div>

                  <hr />
                  <h6><i className="fas fa-heartbeat me-2 text-danger"></i>Medical Info</h6>
                  <div className="col-md-3">
                    <label className="form-label">Blood Type</label>
                    <select className="form-select" value={editForm.blood_type}
                      onChange={(e) => setEditForm({...editForm, blood_type: e.target.value})}>
                      <option value="unknown">Unknown</option>
                      <option value="A+">A+</option><option value="A-">A-</option>
                      <option value="B+">B+</option><option value="B-">B-</option>
                      <option value="AB+">AB+</option><option value="AB-">AB-</option>
                      <option value="O+">O+</option><option value="O-">O-</option>
                    </select>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Status</label>
                    <select className="form-select" value={editForm.status}
                      onChange={(e) => setEditForm({...editForm, status: e.target.value})}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="deceased">Deceased</option>
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Allergies</label>
                    <input type="text" className="form-control" value={editForm.allergies}
                      onChange={(e) => setEditForm({...editForm, allergies: e.target.value})}
                      placeholder="e.g. Penicillin, Peanuts" />
                  </div>
                  <div className="col-md-12">
                    <label className="form-label">Chronic Conditions</label>
                    <input type="text" className="form-control" value={editForm.chronic_conditions}
                      onChange={(e) => setEditForm({...editForm, chronic_conditions: e.target.value})}
                      placeholder="e.g. Diabetes, Hypertension" />
                  </div>

                  <hr />
                  <h6><i className="fas fa-shield-alt me-2 text-success"></i>Insurance</h6>
                  <div className="col-md-4">
                    <label className="form-label">Provider</label>
                    <input type="text" className="form-control" value={editForm.insurance_provider}
                      onChange={(e) => setEditForm({...editForm, insurance_provider: e.target.value})}
                      placeholder="e.g. SLeSHI" />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Number</label>
                    <input type="text" className="form-control" value={editForm.insurance_number}
                      onChange={(e) => setEditForm({...editForm, insurance_number: e.target.value})} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Expiry</label>
                    <input type="date" className="form-control" value={editForm.insurance_expiry}
                      onChange={(e) => setEditForm({...editForm, insurance_expiry: e.target.value})} />
                  </div>

                  <hr />
                  <h6><i className="fas fa-user-friends me-2 text-info"></i>Next of Kin / Emergency</h6>
                  <div className="col-md-4">
                    <label className="form-label">Next of Kin Name</label>
                    <input type="text" className="form-control" value={editForm.next_of_kin_name}
                      onChange={(e) => setEditForm({...editForm, next_of_kin_name: e.target.value})} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Phone</label>
                    <input type="text" className="form-control" value={editForm.next_of_kin_phone}
                      onChange={(e) => setEditForm({...editForm, next_of_kin_phone: e.target.value})} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Relationship</label>
                    <input type="text" className="form-control" value={editForm.next_of_kin_relationship}
                      onChange={(e) => setEditForm({...editForm, next_of_kin_relationship: e.target.value})} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Emergency Contact Name</label>
                    <input type="text" className="form-control" value={editForm.emergency_contact_name}
                      onChange={(e) => setEditForm({...editForm, emergency_contact_name: e.target.value})} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Emergency Contact Phone</label>
                    <input type="text" className="form-control" value={editForm.emergency_contact_phone}
                      onChange={(e) => setEditForm({...editForm, emergency_contact_phone: e.target.value})} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button className="btn btn-primary" onClick={handleEditSave} disabled={saving}>
                  {saving ? <><span className="spinner-border spinner-border-sm me-1"></span>Saving...</> : <><i className="fas fa-save me-1"></i>Save Changes</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default PatientList;

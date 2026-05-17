import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layout/DashboardLayout';
import { getNavForUser, getBrandForUser, getRoleBadge } from '../../utils/navItems';

const genderColors = { male: '#4361ee', female: '#e63946', other: '#7c3aed' };

function PatientList() {
  const { apiCall, user } = useAuth();
  const navigate = useNavigate();
  const [patients, setPatients] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [genderFilter, setGenderFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [incompleteFilter, setIncompleteFilter] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [editPatient, setEditPatient] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [viewPatient, setViewPatient] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [activeViewTab, setActiveViewTab] = useState('details');
  const [visitHistory, setVisitHistory] = useState([]);
  const [loadingVisits, setLoadingVisits] = useState(false);
  const [expandedVisit, setExpandedVisit] = useState(null);
  const perPage = 15;

  // Portal account creation
  const [showPortalModal, setShowPortalModal]     = useState(false);
  const [portalPatient, setPortalPatient]         = useState(null);
  const [portalForm, setPortalForm]               = useState({ password: '', password2: '' });
  const [portalSaving, setPortalSaving]           = useState(false);
  const [portalError, setPortalError]             = useState('');
  const [portalSuccess, setPortalSuccess]         = useState('');
  const [showPwd, setShowPwd]                     = useState(false);
  const [showPwd2, setShowPwd2]                   = useState(false);

  // Geographic state for edit modal
  const [editRegions,          setEditRegions]          = useState([]);
  const [editDistricts,        setEditDistricts]        = useState([]);
  const [editChiefdoms,        setEditChiefdoms]        = useState([]);
  const [editTowns,            setEditTowns]            = useState([]);
  const [editSelectedRegionId, setEditSelectedRegionId] = useState('');

  // Photo state for edit modal
  const [editPhotoFile,    setEditPhotoFile]    = useState(null);
  const [editPhotoPreview, setEditPhotoPreview] = useState(null);
  const editFileInputRef = useRef(null);

  // Load regions once on mount
  const fetchEditRegions = useCallback(async () => {
    try {
      const res = await apiCall('/admin/regions/');
      if (res.ok) {
        const data = await res.json();
        setEditRegions(Array.isArray(data) ? data : data.results || []);
      }
    } catch {}
  }, [apiCall]);

  const fetchEditDistricts = useCallback(async (regionId) => {
    if (!regionId) { setEditDistricts([]); setEditChiefdoms([]); setEditTowns([]); return; }
    try {
      const res = await apiCall(`/admin/districts/?region=${regionId}`);
      if (res.ok) {
        const data = await res.json();
        setEditDistricts(Array.isArray(data) ? data : data.results || []);
      }
    } catch {}
    setEditChiefdoms([]);
    setEditTowns([]);
  }, [apiCall]);

  const fetchEditChiefdoms = useCallback(async (districtId) => {
    if (!districtId) { setEditChiefdoms([]); setEditTowns([]); return; }
    try {
      const res = await apiCall(`/admin/chiefdoms/?district=${districtId}`);
      if (res.ok) {
        const data = await res.json();
        setEditChiefdoms(Array.isArray(data) ? data : data.results || []);
      }
    } catch {}
    setEditTowns([]);
  }, [apiCall]);

  const fetchEditTowns = useCallback(async (districtId, chiefdomId) => {
    if (!districtId) { setEditTowns([]); return; }
    try {
      let url = `/admin/towns/?district=${districtId}`;
      if (chiefdomId) url += `&chiefdom=${chiefdomId}`;
      const res = await apiCall(url);
      if (res.ok) {
        const data = await res.json();
        setEditTowns(Array.isArray(data) ? data : data.results || []);
      }
    } catch {}
  }, [apiCall]);

  useEffect(() => {
    fetchPatients();
    fetchStats();
    fetchEditRegions();
  }, [search, genderFilter, statusFilter, incompleteFilter]);

  const fetchPatients = async () => {
    try {
      setLoading(true);
      let url = '/patients/?';
      if (search) url += `search=${encodeURIComponent(search)}&`;
      if (genderFilter) url += `gender=${genderFilter}&`;
      if (statusFilter) url += `status=${statusFilter}&`;
      if (incompleteFilter) url += `incomplete=true&`;
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

  const openPortalModal = (patient) => {
    setPortalPatient(patient);
    setPortalForm({ password: '', password2: '' });
    setPortalError('');
    setPortalSuccess('');
    setShowPwd(false);
    setShowPwd2(false);
    setShowPortalModal(true);
  };

  const handleCreatePortalAccount = async () => {
    setPortalError('');
    if (!portalForm.password || !portalForm.password2) { setPortalError('Both fields are required.'); return; }
    if (portalForm.password !== portalForm.password2)   { setPortalError('Passwords do not match.'); return; }
    if (portalForm.password.length < 8)                 { setPortalError('Password must be at least 8 characters.'); return; }
    setPortalSaving(true);
    try {
      const res = await apiCall(`/patients/${portalPatient.id}/create_portal_account/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(portalForm),
      });
      const data = await res.json();
      if (res.ok) {
        setPortalSuccess(`Portal account created! Patient can now log in with: ${portalPatient.email}`);
        fetchPatients();
      } else {
        setPortalError(data.error || 'Failed to create portal account.');
      }
    } catch { setPortalError('Network error. Please try again.'); }
    setPortalSaving(false);
  };

  const fetchVisitHistory = async (patientId) => {
    try {
      setLoadingVisits(true);
      const res  = await apiCall(`/visits/patient_history/${patientId}/`);
      const data = await res.json();
      if (res.ok) setVisitHistory(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('Error fetching visit history:', e);
    } finally {
      setLoadingVisits(false);
    }
  };

  const openViewModal = (patient) => {
    setViewPatient(patient);
    setShowViewModal(true);
    setActiveViewTab('details');
    setVisitHistory([]);
    setExpandedVisit(null);
  };

  const openDeleteConfirm = (patient) => {
    setDeleteTarget(patient);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      setDeleting(true);
      const response = await apiCall(`/patients/${deleteTarget.id}/`, { method: 'DELETE' });
      if (response.ok || response.status === 204) {
        setShowDeleteModal(false);
        setDeleteTarget(null);
        fetchPatients();
        fetchStats();
      }
    } catch (error) {
      console.error('Error deleting patient:', error);
    } finally {
      setDeleting(false);
    }
  };

  const openEditModal = (patient) => {
    setEditPatient(patient);
    setEditForm({
      first_name:   patient.first_name   || '',
      last_name:    patient.last_name    || '',
      other_names:  patient.other_names  || '',
      date_of_birth: patient.date_of_birth || '',
      gender:       patient.gender       || '',
      marital_status: patient.marital_status || '',
      nationality:  patient.nationality  || '',
      national_id:  patient.national_id  || '',
      phone:        patient.phone        || '',
      alt_phone:    patient.alt_phone    || '',
      email:        patient.email        || '',
      address:      patient.address      || '',
      city:         patient.city         || '',
      region:       patient.region       || '',
      district:     patient.district     || '',
      chiefdom:     patient.chiefdom     || '',
      town:         patient.town         || '',
      blood_type:   patient.blood_type   || 'unknown',
      allergies:    patient.allergies    || '',
      chronic_conditions: patient.chronic_conditions || '',
      disabilities: patient.disabilities || '',
      emergency_contact_name:         patient.emergency_contact_name         || '',
      emergency_contact_phone:        patient.emergency_contact_phone        || '',
      emergency_contact_relationship: patient.emergency_contact_relationship || '',
      status: patient.status || 'active',
    });
    setEditPhotoFile(null);
    setEditPhotoPreview(patient.photo || null);
    setShowEditModal(true);
    // Pre-load geographic dropdowns based on existing patient location
    const matchingRegion = editRegions.find(r => r.name === patient.region);
    if (matchingRegion) {
      setEditSelectedRegionId(String(matchingRegion.id));
      fetchEditDistricts(matchingRegion.id);
    } else {
      setEditDistricts([]);
    }
    if (patient.district) {
      fetchEditChiefdoms(patient.district);
      fetchEditTowns(patient.district, patient.chiefdom || '');
    } else {
      setEditChiefdoms([]);
      setEditTowns([]);
    }
  };

  const handleEditSave = async () => {
    if (!editPatient) return;
    try {
      setSaving(true);
      let response;
      if (editPhotoFile) {
        const fd = new FormData();
        Object.entries(editForm).forEach(([key, val]) => {
          if (val !== '' && val !== null && val !== undefined) fd.append(key, val);
        });
        fd.append('photo', editPhotoFile);
        response = await apiCall(`/patients/${editPatient.id}/`, {
          method: 'PATCH',
          body: fd,
          isFormData: true,
        });
      } else {
        response = await apiCall(`/patients/${editPatient.id}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(editForm),
        });
      }
      if (response.ok) {
        setShowEditModal(false);
        setEditPhotoFile(null);
        setEditPhotoPreview(null);
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
    <DashboardLayout navItems={getNavForUser(user)} brandTitle={getBrandForUser(user)} roleBadge={getRoleBadge(user)}>
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
        <>
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

        {/* Incomplete Profiles Banner */}
        {stats.incomplete_profiles > 0 && (
          <div
            className="d-flex align-items-center justify-content-between mb-4 px-4 py-3"
            style={{ background: incompleteFilter ? '#fef3c7' : '#fff7ed', border: `1px solid ${incompleteFilter ? '#f59e0b' : '#fed7aa'}`, borderRadius: 12, cursor: 'pointer' }}
            onClick={() => { setIncompleteFilter(f => !f); setCurrentPage(1); }}
          >
            <div className="d-flex align-items-center gap-3">
              <div style={{ width: 40, height: 40, borderRadius: 10, background: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-exclamation-triangle" style={{ color: '#fff', fontSize: 16 }}></i>
              </div>
              <div>
                <div style={{ fontWeight: 700, color: '#92400e', fontSize: 14 }}>
                  {stats.incomplete_profiles} Incomplete Profile{stats.incomplete_profiles !== 1 ? 's' : ''}
                </div>
                <div style={{ fontSize: 12, color: '#b45309' }}>
                  Patients registered by a nurse — missing National ID and other details
                </div>
              </div>
            </div>
            <div className="d-flex align-items-center gap-2">
              <span
                className="badge"
                style={{ background: incompleteFilter ? '#f59e0b' : '#fed7aa', color: incompleteFilter ? '#fff' : '#92400e', fontSize: 12, padding: '5px 12px', borderRadius: 20 }}
              >
                {incompleteFilter ? <><i className="fas fa-times me-1"></i>Clear filter</> : <><i className="fas fa-filter me-1"></i>Show only</>}
              </span>
            </div>
          </div>
        )}
        </>
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
            <div className="col-md-3 text-end d-flex align-items-end justify-content-end gap-2">
              {incompleteFilter && (
                <button
                  className="btn btn-sm btn-warning"
                  onClick={() => { setIncompleteFilter(false); setCurrentPage(1); }}
                  style={{ fontSize: 12, borderRadius: 8 }}
                >
                  <i className="fas fa-times me-1"></i>Clear incomplete filter
                </button>
              )}
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
                          title="View Details"
                          onClick={() => navigate(`/receptionist/patients/${p.id}`)}
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
                        <button
                          className="dash-header-btn"
                          style={{width: '32px', height: '32px', fontSize: '12px', color: '#e63946', borderColor: '#e63946'}}
                          title="Delete Patient"
                          onClick={() => openDeleteConfirm(p)}
                        >
                          <i className="fas fa-trash"></i>
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

      {/* ── Patient Detail Card Modal ── */}
      {showViewModal && viewPatient && (() => {
        const statusColor = viewPatient.status === 'active' ? '#16a34a' : viewPatient.status === 'deceased' ? '#dc2626' : '#d97706';
        const statusBg   = viewPatient.status === 'active' ? '#dcfce7' : viewPatient.status === 'deceased' ? '#fee2e2' : '#fef3c7';
        const gColor = genderColors[viewPatient.gender] || '#4361ee';

        const SectionTitle = ({ icon, color, label }) => (
          <div style={{display:'flex', alignItems:'center', gap:'10px', marginBottom:'16px', marginTop:'4px'}}>
            <div style={{width:'32px', height:'32px', borderRadius:'8px', background:color,
              display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>
              <i className={icon} style={{color:'#fff', fontSize:'13px'}}></i>
            </div>
            <span style={{fontWeight:700, fontSize:'14px', color:'#1a1a2e', letterSpacing:'0.2px'}}>{label}</span>
            <div style={{flex:1, height:'1px', background:'#e9ecef', marginLeft:'4px'}}></div>
          </div>
        );
        const Row = ({children}) => (
          <div style={{display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:'12px 24px', marginBottom:'16px'}}>
            {children}
          </div>
        );
        const Field = ({label, value, mono, span}) => (
          <div style={{gridColumn: span ? `span ${span}` : undefined}}>
            <div style={{fontSize:'10px', fontWeight:'700', color:'#8a94a6', textTransform:'uppercase',
              letterSpacing:'0.7px', marginBottom:'4px'}}>{label}</div>
            <div style={{fontSize:'14px', color: value ? '#1a1a2e' : '#c0c7d0', fontWeight: value ? '500' : '400',
              fontFamily: mono ? '"Courier New",monospace' : 'inherit',
              fontStyle: value ? 'normal' : 'italic', lineHeight:'1.4'}}>
              {value || 'Not provided'}
            </div>
          </div>
        );
        const Divider = () => <div style={{borderTop:'1px solid #f0f2f5', margin:'20px 0'}}></div>;

        return (
          <div className="modal d-block" style={{backgroundColor:'rgba(0,0,0,0.65)', zIndex:1055}}
            onClick={() => setShowViewModal(false)}>
            <div className="modal-dialog modal-xl modal-dialog-scrollable" onClick={e => e.stopPropagation()}
              style={{maxWidth:'920px', margin:'16px auto'}}>
              <div className="modal-content" style={{borderRadius:'16px', border:'none',
                boxShadow:'0 32px 80px rgba(0,0,0,0.4)', overflow:'hidden'}}>

                {/* ═══ HEADER ═══ */}
                <div style={{background:'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
                  padding:'28px 32px', position:'relative'}}>
                  <button type="button" className="btn-close btn-close-white"
                    style={{position:'absolute', top:'16px', right:'20px'}}
                    onClick={() => setShowViewModal(false)}></button>

                  <div style={{display:'flex', gap:'28px', alignItems:'flex-start'}}>

                    {/* ── Photo portrait ── */}
                    <div style={{flexShrink:0, position:'relative'}}>
                      <div style={{
                        width:'108px', height:'132px', borderRadius:'14px',
                        border:'3px solid rgba(255,255,255,0.25)',
                        background: viewPatient.photo ? 'transparent'
                          : `linear-gradient(145deg,${gColor},${gColor}99)`,
                        overflow:'hidden', display:'flex', alignItems:'center',
                        justifyContent:'center', boxShadow:'0 8px 24px rgba(0,0,0,0.5)',
                      }}>
                        {viewPatient.photo
                          ? <img src={viewPatient.photo} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} />
                          : <div style={{textAlign:'center'}}>
                              <div style={{fontSize:'34px',fontWeight:800,color:'#fff',lineHeight:1}}>
                                {getInitials(viewPatient.first_name, viewPatient.last_name)}
                              </div>
                              <div style={{fontSize:'9px',color:'rgba(255,255,255,0.55)',marginTop:'6px',
                                fontWeight:600,letterSpacing:'1px'}}>NO PHOTO</div>
                            </div>
                        }
                      </div>
                      {/* status indicator */}
                      <div style={{position:'absolute', bottom:'-5px', right:'-5px', width:'20px', height:'20px',
                        borderRadius:'50%', background:statusColor, border:'3px solid #0f172a',
                        boxShadow:`0 0 10px ${statusColor}`}}></div>
                    </div>

                    {/* ── Identity block ── */}
                    <div style={{flex:1, paddingTop:'4px'}}>
                      <div style={{fontSize:'10px', fontWeight:600, color:'rgba(255,255,255,0.4)',
                        letterSpacing:'2.5px', textTransform:'uppercase', marginBottom:'7px'}}>
                        Patient Record · {viewPatient.hospital_name || 'NEHR System'}
                      </div>
                      <h2 style={{color:'#ffffff', margin:'0 0 14px', fontWeight:800,
                        fontSize:'28px', lineHeight:1.15, letterSpacing:'-0.3px'}}>
                        {viewPatient.full_name}
                      </h2>

                      {/* badges row */}
                      <div style={{display:'flex', gap:'8px', flexWrap:'wrap', marginBottom:'18px'}}>
                        <span style={{padding:'5px 14px', borderRadius:'6px', fontSize:'12px',
                          fontFamily:'monospace', fontWeight:700, letterSpacing:'0.5px',
                          background:'rgba(255,255,255,0.13)', color:'#e2e8f0',
                          border:'1px solid rgba(255,255,255,0.18)'}}>
                          {viewPatient.patient_id}
                        </span>
                        <span style={{padding:'5px 14px', borderRadius:'6px', fontSize:'12px',
                          fontWeight:700, background:statusBg, color:statusColor}}>
                          {viewPatient.status_display}
                        </span>
                        <span style={{padding:'5px 14px', borderRadius:'6px', fontSize:'12px',
                          fontWeight:600, background:'rgba(255,255,255,0.1)', color:'#c7d2fe'}}>
                          {viewPatient.gender_display}
                        </span>
                        {viewPatient.blood_type && viewPatient.blood_type !== 'unknown' && (
                          <span style={{padding:'5px 14px', borderRadius:'6px', fontSize:'12px',
                            fontWeight:700, background:'rgba(220,38,38,0.2)', color:'#fca5a5',
                            border:'1px solid rgba(220,38,38,0.3)'}}>
                            <i className="fas fa-tint me-1" style={{fontSize:'10px'}}></i>
                            {viewPatient.blood_type_display || viewPatient.blood_type}
                          </span>
                        )}
                      </div>

                      {/* quick facts strip */}
                      <div style={{display:'flex', gap:'0', background:'rgba(255,255,255,0.07)',
                        borderRadius:'10px', overflow:'hidden', border:'1px solid rgba(255,255,255,0.1)'}}>
                        {[
                          {icon:'fas fa-birthday-cake', label:'Age',      val: viewPatient.age ? `${viewPatient.age} yrs` : '—'},
                          {icon:'fas fa-phone-alt',     label:'Phone',    val: viewPatient.phone || '—'},
                          {icon:'fas fa-map-marker-alt',label:'District', val: viewPatient.district_name || '—'},
                          {icon:'fas fa-calendar-alt',  label:'Registered',val: viewPatient.created_at ? new Date(viewPatient.created_at).toLocaleDateString('en-GB') : '—'},
                        ].map(({icon,label,val},i,arr) => (
                          <div key={label} style={{flex:1, padding:'10px 14px', textAlign:'center',
                            borderRight: i<arr.length-1 ? '1px solid rgba(255,255,255,0.08)' : 'none'}}>
                            <i className={icon} style={{color:'#93c5fd', fontSize:'12px', display:'block', marginBottom:'3px'}}></i>
                            <div style={{fontSize:'9px', color:'rgba(255,255,255,0.4)', textTransform:'uppercase', letterSpacing:'0.5px'}}>{label}</div>
                            <div style={{fontSize:'12px', color:'#e2e8f0', fontWeight:600, marginTop:'1px'}}>{val}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ═══ TAB BAR ═══ */}
                <div style={{background:'#f8fafc', borderBottom:'1px solid #e9ecef',
                  display:'flex', padding:'0 32px', gap:'4px'}}>
                  {[
                    {key:'details', icon:'fas fa-id-card',    label:'Patient Details'},
                    {key:'visits',  icon:'fas fa-history',     label:'Visit History'},
                  ].map(tab => (
                    <button key={tab.key} onClick={() => {
                      setActiveViewTab(tab.key);
                      if (tab.key === 'visits' && visitHistory.length === 0) fetchVisitHistory(viewPatient.id);
                    }} style={{
                      padding:'12px 20px', border:'none', background:'transparent', cursor:'pointer',
                      fontWeight: activeViewTab === tab.key ? 700 : 500,
                      fontSize:'13px',
                      color: activeViewTab === tab.key ? '#4361ee' : '#64748b',
                      borderBottom: activeViewTab === tab.key ? '3px solid #4361ee' : '3px solid transparent',
                      marginBottom:'-1px', transition:'all 0.15s',
                    }}>
                      <i className={tab.icon} style={{marginRight:'7px'}}></i>{tab.label}
                    </button>
                  ))}
                </div>

                {/* ═══ BODY ═══ */}
                <div style={{background:'#ffffff', padding:'28px 32px', overflowY:'auto', maxHeight:'60vh'}}>

                  {/* ── TAB: Patient Details ── */}
                  {activeViewTab === 'details' && <>

                    {/* 1. Personal Information */}
                    <SectionTitle icon="fas fa-user" color="#4361ee" label="Personal Information" />
                    <Row>
                      <Field label="First Name"     value={viewPatient.first_name} />
                      <Field label="Other Names"    value={viewPatient.other_names} />
                      <Field label="Last Name"      value={viewPatient.last_name} />
                      <Field label="Date of Birth"  value={viewPatient.date_of_birth} />
                      <Field label="Age"            value={viewPatient.age ? `${viewPatient.age} years` : null} />
                      <Field label="Gender"         value={viewPatient.gender_display} />
                      <Field label="Marital Status" value={viewPatient.marital_status_display} />
                      <Field label="Nationality"    value={viewPatient.nationality} />
                      <Field label="National ID (NIN)" value={viewPatient.national_id} mono />
                    </Row>

                    <Divider />

                    {/* 2. Contact & Address */}
                    <SectionTitle icon="fas fa-map-marker-alt" color="#0891b2" label="Contact & Address" />
                    <Row>
                      <Field label="Phone"     value={viewPatient.phone} />
                      <Field label="Alt Phone" value={viewPatient.alt_phone} />
                      <Field label="Email"     value={viewPatient.email} />
                      <Field label="Region"    value={viewPatient.region} />
                      <Field label="District"  value={viewPatient.district_name} />
                      <Field label="Chiefdom"  value={viewPatient.chiefdom_name} />
                      <Field label="Town"      value={viewPatient.town_name} />
                      <Field label="Residential Address" value={viewPatient.address} span={2} />
                    </Row>

                    <Divider />

                    {/* 3. Medical Information */}
                    <SectionTitle icon="fas fa-heartbeat" color="#dc2626" label="Medical Information" />
                    <Row>
                      <Field label="Blood Type"         value={viewPatient.blood_type_display} />
                      <Field label="Known Allergies"    value={viewPatient.allergies} />
                      <Field label="Disabilities"       value={viewPatient.disabilities} />
                      <Field label="Chronic Conditions" value={viewPatient.chronic_conditions} span={3} />
                    </Row>

                    <Divider />

                    {/* 4. Emergency Contact */}
                    <SectionTitle icon="fas fa-phone-alt" color="#d97706" label="Emergency Contact" />
                    <Row>
                      <Field label="Name"         value={viewPatient.emergency_contact_name} />
                      <Field label="Phone Number" value={viewPatient.emergency_contact_phone} />
                      <Field label="Relationship" value={viewPatient.emergency_contact_relationship} />
                    </Row>

                    <Divider />

                    {/* 5. Record Information */}
                    <SectionTitle icon="fas fa-info-circle" color="#64748b" label="Record Information" />
                    <Row>
                      <Field label="Patient ID"    value={viewPatient.patient_id}     mono />
                      <Field label="Status"        value={viewPatient.status_display} />
                      <Field label="Facility"      value={viewPatient.hospital_name} />
                      <Field label="Registered By" value={viewPatient.registered_by_name} />
                      <Field label="Registered On" value={viewPatient.created_at ? new Date(viewPatient.created_at).toLocaleString() : '—'} />
                      <Field label="Last Updated"  value={viewPatient.updated_at   ? new Date(viewPatient.updated_at).toLocaleString()   : '—'} />
                    </Row>

                  </>}

                  {/* ── TAB: Visit History ── */}
                  {activeViewTab === 'visits' && (
                    <div>
                      {loadingVisits ? (
                        <div style={{textAlign:'center', padding:'48px 0', color:'#64748b'}}>
                          <i className="fas fa-spinner fa-spin fa-2x mb-3" style={{display:'block', marginBottom:'12px'}}></i>
                          Loading visit history...
                        </div>
                      ) : visitHistory.length === 0 ? (
                        <div style={{textAlign:'center', padding:'64px 0'}}>
                          <i className="fas fa-history" style={{fontSize:'48px', color:'#cbd5e1', display:'block', marginBottom:'16px'}}></i>
                          <div style={{fontSize:'16px', fontWeight:600, color:'#475569', marginBottom:'8px'}}>No visits recorded yet</div>
                          <div style={{fontSize:'13px', color:'#94a3b8'}}>This patient has no visit history in the system.</div>
                        </div>
                      ) : (
                        <div>
                          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px'}}>
                            <span style={{fontSize:'13px', color:'#64748b', fontWeight:500}}>
                              <i className="fas fa-history me-2 text-primary"></i>
                              {visitHistory.length} visit{visitHistory.length !== 1 ? 's' : ''} recorded across all facilities
                            </span>
                          </div>

                          {/* Visit Timeline */}
                          <div style={{position:'relative'}}>
                            {/* vertical line */}
                            <div style={{position:'absolute', left:'18px', top:'24px', bottom:'0',
                              width:'2px', background:'#e2e8f0'}}></div>

                            {visitHistory.map((visit, idx) => {
                              const isExpanded = expandedVisit === visit.id;
                              const vStatusColor = {
                                completed:'#16a34a', in_progress:'#2563eb', cancelled:'#dc2626',
                                registered:'#d97706', waiting:'#9333ea', referred_out:'#0891b2',
                              }[visit.status] || '#64748b';

                              const vTypeIcon = {
                                outpatient:'fas fa-stethoscope', inpatient:'fas fa-bed',
                                emergency:'fas fa-ambulance', follow_up:'fas fa-redo',
                                referral:'fas fa-share-square', routine_checkup:'fas fa-check-circle',
                              }[visit.visit_type] || 'fas fa-notes-medical';

                              return (
                                <div key={visit.id} style={{display:'flex', gap:'16px', marginBottom:'12px', position:'relative', zIndex:1}}>

                                  {/* Timeline dot */}
                                  <div style={{flexShrink:0, width:'38px', height:'38px', borderRadius:'50%',
                                    background: vStatusColor + '18', border:`2px solid ${vStatusColor}`,
                                    display:'flex', alignItems:'center', justifyContent:'center'}}>
                                    <i className={vTypeIcon} style={{fontSize:'13px', color:vStatusColor}}></i>
                                  </div>

                                  {/* Card */}
                                  <div style={{flex:1, background:'#fff', border:'1px solid #e9ecef',
                                    borderRadius:'10px', overflow:'hidden',
                                    boxShadow: isExpanded ? '0 4px 16px rgba(0,0,0,0.08)' : '0 1px 3px rgba(0,0,0,0.04)'}}>

                                    {/* Card header — always visible */}
                                    <div style={{padding:'12px 16px', cursor:'pointer', display:'flex',
                                      justifyContent:'space-between', alignItems:'center',
                                      background: isExpanded ? '#f8fafc' : '#fff'}}
                                      onClick={() => setExpandedVisit(isExpanded ? null : visit.id)}>
                                      <div>
                                        <div style={{display:'flex', gap:'8px', alignItems:'center', marginBottom:'4px'}}>
                                          <span style={{fontSize:'12px', fontWeight:700, color:'#1a1a2e'}}>
                                            {new Date(visit.visit_date).toLocaleDateString('en-GB', {day:'2-digit', month:'short', year:'numeric'})}
                                          </span>
                                          <span style={{fontSize:'11px', background: vStatusColor+'15', color: vStatusColor,
                                            padding:'2px 8px', borderRadius:'4px', fontWeight:600}}>
                                            {visit.status_display}
                                          </span>
                                          <span style={{fontSize:'11px', background:'#f1f5f9', color:'#475569',
                                            padding:'2px 8px', borderRadius:'4px'}}>
                                            {visit.visit_type_display}
                                          </span>
                                        </div>
                                        <div style={{fontSize:'12px', color:'#475569'}}>
                                          <i className="fas fa-hospital-alt me-1" style={{color:'#94a3b8'}}></i>
                                          {visit.hospital_name}
                                          {visit.department_name && <span style={{color:'#94a3b8'}}> · {visit.department_name}</span>}
                                          {visit.doctor_name && <span style={{color:'#94a3b8'}}> · Dr. {visit.doctor_name}</span>}
                                        </div>
                                        <div style={{fontSize:'12px', color:'#64748b', marginTop:'3px'}}>
                                          <i className="fas fa-comment-medical me-1" style={{color:'#94a3b8'}}></i>
                                          {visit.chief_complaint}
                                        </div>
                                      </div>
                                      <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'}`}
                                        style={{fontSize:'12px', color:'#94a3b8', marginLeft:'12px'}}></i>
                                    </div>

                                    {/* Expanded detail */}
                                    {isExpanded && (
                                      <div style={{borderTop:'1px solid #f1f5f9', padding:'16px'}}>
                                        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:'12px 24px', marginBottom:'12px'}}>
                                          {visit.diagnosis && <div style={{gridColumn:'span 3'}}>
                                            <div style={{fontSize:'10px',fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.6px',marginBottom:'3px'}}>Diagnosis</div>
                                            <div style={{fontSize:'13px',color:'#1a1a2e',fontWeight:500}}>{visit.diagnosis}</div>
                                          </div>}
                                          {visit.discharge_date && <div>
                                            <div style={{fontSize:'10px',fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.6px',marginBottom:'3px'}}>Discharged</div>
                                            <div style={{fontSize:'13px',color:'#1a1a2e'}}>{new Date(visit.discharge_date).toLocaleDateString('en-GB')}</div>
                                          </div>}
                                          {visit.referred_to_doctor && <div>
                                            <div style={{fontSize:'10px',fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.6px',marginBottom:'3px'}}>Referred To</div>
                                            <div style={{fontSize:'13px',color:'#1a1a2e'}}>{visit.referred_to_doctor}</div>
                                          </div>}
                                          <div>
                                            <div style={{fontSize:'10px',fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.6px',marginBottom:'3px'}}>Has Vitals</div>
                                            <div style={{fontSize:'13px',color: visit.has_vitals ? '#16a34a' : '#94a3b8'}}>
                                              <i className={`fas fa-${visit.has_vitals ? 'check-circle' : 'times-circle'} me-1`}></i>
                                              {visit.has_vitals ? 'Recorded' : 'Not recorded'}
                                            </div>
                                          </div>
                                          <div>
                                            <div style={{fontSize:'10px',fontWeight:700,color:'#94a3b8',textTransform:'uppercase',letterSpacing:'0.6px',marginBottom:'3px'}}>Clinical Note</div>
                                            <div style={{fontSize:'13px',color: visit.has_clinical_note ? '#16a34a' : '#94a3b8'}}>
                                              <i className={`fas fa-${visit.has_clinical_note ? 'check-circle' : 'times-circle'} me-1`}></i>
                                              {visit.has_clinical_note ? 'Written' : 'Not written'}
                                            </div>
                                          </div>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                </div>

                {/* ═══ FOOTER ═══ */}
                <div style={{background:'#f8fafc', padding:'14px 32px', borderTop:'1px solid #e9ecef',
                  display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                  <span style={{fontSize:'12px', color:'#8a94a6'}}>
                    <i className="fas fa-shield-alt me-1" style={{color:'#4361ee'}}></i>
                    National Electronic Health Record — Confidential Patient Data
                  </span>
                  <div style={{display:'flex', gap:'10px', flexWrap:'wrap'}}>
                    <button className="btn btn-outline-secondary btn-sm px-4" style={{borderRadius:'8px', fontWeight:500}}
                      onClick={() => setShowViewModal(false)}>Close</button>
                    {!viewPatient.has_portal_account && viewPatient.email && (
                      <button className="btn btn-outline-success btn-sm px-3" style={{borderRadius:'8px', fontWeight:600}}
                        onClick={() => { setShowViewModal(false); openPortalModal(viewPatient); }}>
                        <i className="fas fa-user-shield me-1"></i>Create Portal Account
                      </button>
                    )}
                    {viewPatient.has_portal_account && (
                      <span style={{display:'flex', alignItems:'center', gap:'6px', fontSize:'12px', color:'#16a34a', fontWeight:600, padding:'0 4px'}}>
                        <i className="fas fa-check-circle"></i>Portal Active
                      </span>
                    )}
                    <button className="btn btn-primary btn-sm px-4" style={{borderRadius:'8px', fontWeight:600}}
                      onClick={() => { setShowViewModal(false); openEditModal(viewPatient); }}>
                      <i className="fas fa-edit me-1"></i>Edit Patient
                    </button>
                    <button className="btn btn-danger btn-sm px-4" style={{borderRadius:'8px', fontWeight:600}}
                      onClick={() => { setShowViewModal(false); openDeleteConfirm(viewPatient); }}>
                      <i className="fas fa-trash me-1"></i>Delete
                    </button>
                  </div>
                </div>

              </div>
            </div>
          </div>
        );
      })()}

      {/* ── Create Portal Account Modal ── */}
      {showPortalModal && portalPatient && (
        <div className="modal d-block" style={{backgroundColor:'rgba(0,0,0,0.55)', zIndex:1070}} onClick={() => setShowPortalModal(false)}>
          <div className="modal-dialog modal-dialog-centered" style={{maxWidth:'460px'}} onClick={e => e.stopPropagation()}>
            <div className="modal-content" style={{borderRadius:'16px', border:'none', overflow:'hidden'}}>

              <div style={{background:'linear-gradient(135deg,#4361ee,#7c3aed)', padding:'24px 28px 20px'}}>
                <div style={{display:'flex', alignItems:'center', gap:'14px'}}>
                  <div style={{width:'48px', height:'48px', borderRadius:'12px', background:'rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>
                    <i className="fas fa-user-shield" style={{color:'#fff', fontSize:'20px'}}></i>
                  </div>
                  <div>
                    <h5 style={{color:'#fff', fontWeight:700, margin:0, fontSize:'17px'}}>Create Portal Account</h5>
                    <div style={{color:'rgba(255,255,255,0.8)', fontSize:'13px', marginTop:'3px'}}>{portalPatient.full_name}</div>
                  </div>
                </div>
              </div>

              <div className="modal-body" style={{padding:'24px 28px'}}>
                {portalError && (
                  <div className="alert alert-danger py-2 mb-3" style={{fontSize:'13px', borderRadius:'8px'}}>
                    <i className="fas fa-exclamation-circle me-2"></i>{portalError}
                  </div>
                )}
                {portalSuccess ? (
                  <div style={{textAlign:'center', padding:'16px 0'}}>
                    <div style={{width:'56px', height:'56px', borderRadius:'50%', background:'#dcfce7', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px'}}>
                      <i className="fas fa-check-circle" style={{color:'#16a34a', fontSize:'24px'}}></i>
                    </div>
                    <div style={{fontWeight:700, color:'#16a34a', marginBottom:'8px'}}>Account Created!</div>
                    <div style={{fontSize:'13px', color:'#475569'}}>{portalSuccess}</div>
                    <div style={{marginTop:'8px', fontSize:'12px', background:'#f1f5f9', borderRadius:'8px', padding:'10px 14px', color:'#374151'}}>
                      <strong>Login email:</strong> {portalPatient.email}<br/>
                      <strong>Password:</strong> the one you just set
                    </div>
                    <button className="btn btn-outline-secondary mt-4 px-4" style={{borderRadius:'8px'}} onClick={() => setShowPortalModal(false)}>Close</button>
                  </div>
                ) : (
                  <>
                    <div className="mb-3">
                      <label className="form-label" style={{fontSize:'13px', fontWeight:600}}>Patient Email (login username)</label>
                      <input className="form-control" value={portalPatient.email || ''} disabled style={{background:'#f8fafc', color:'#64748b', fontSize:'13px'}} />
                    </div>
                    <div className="mb-3">
                      <label className="form-label" style={{fontSize:'13px', fontWeight:600}}>Set Password <span className="text-danger">*</span></label>
                      <div style={{position:'relative'}}>
                        <input type={showPwd ? 'text' : 'password'} className="form-control" placeholder="Min. 8 characters"
                          value={portalForm.password} onChange={e => setPortalForm({...portalForm, password: e.target.value})}
                          style={{paddingRight:'42px'}} />
                        <button type="button" onClick={() => setShowPwd(v => !v)}
                          style={{position:'absolute', right:'12px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#6c757d', cursor:'pointer', padding:0, lineHeight:1}}>
                          <i className={showPwd ? 'fas fa-eye-slash' : 'fas fa-eye'}></i>
                        </button>
                      </div>
                    </div>
                    <div className="mb-1">
                      <label className="form-label" style={{fontSize:'13px', fontWeight:600}}>Confirm Password <span className="text-danger">*</span></label>
                      <div style={{position:'relative'}}>
                        <input type={showPwd2 ? 'text' : 'password'} className="form-control" placeholder="Repeat password"
                          value={portalForm.password2} onChange={e => setPortalForm({...portalForm, password2: e.target.value})}
                          style={{paddingRight:'42px'}} />
                        <button type="button" onClick={() => setShowPwd2(v => !v)}
                          style={{position:'absolute', right:'12px', top:'50%', transform:'translateY(-50%)', background:'none', border:'none', color:'#6c757d', cursor:'pointer', padding:0, lineHeight:1}}>
                          <i className={showPwd2 ? 'fas fa-eye-slash' : 'fas fa-eye'}></i>
                        </button>
                      </div>
                    </div>
                    <div style={{background:'#fffbeb', border:'1px solid #fcd34d', borderRadius:'8px', padding:'10px 14px', fontSize:'12px', color:'#92400e', marginTop:'16px'}}>
                      <i className="fas fa-info-circle me-2"></i>
                      The patient will use their <strong>email</strong> and this password to log into the Patient Portal and book appointments.
                    </div>
                  </>
                )}
              </div>

              {!portalSuccess && (
                <div className="modal-footer border-0 pt-0" style={{padding:'0 28px 24px', gap:'10px'}}>
                  <button className="btn btn-outline-secondary flex-fill" style={{borderRadius:'8px'}} onClick={() => setShowPortalModal(false)}>Cancel</button>
                  <button className="btn btn-primary flex-fill" style={{borderRadius:'8px', fontWeight:600}} onClick={handleCreatePortalAccount} disabled={portalSaving}>
                    {portalSaving ? <><span className="spinner-border spinner-border-sm me-2"></span>Creating...</> : <><i className="fas fa-user-plus me-2"></i>Create Account</>}
                  </button>
                </div>
              )}

            </div>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {showDeleteModal && deleteTarget && (
        <div className="modal d-block" style={{backgroundColor: 'rgba(0,0,0,0.55)', zIndex: 1060}}>
          <div className="modal-dialog modal-dialog-centered" style={{maxWidth: '420px'}}>
            <div className="modal-content" style={{borderRadius: '16px', border: 'none'}}>
              <div className="modal-body text-center" style={{padding: '36px 28px 24px'}}>
                <div style={{width: '64px', height: '64px', borderRadius: '50%', background: '#fff0f0',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px'}}>
                  <i className="fas fa-trash" style={{fontSize: '26px', color: '#e63946'}}></i>
                </div>
                <h5 style={{fontWeight: 700, color: '#212529', marginBottom: '8px'}}>Delete Patient?</h5>
                <p style={{color: '#6c757d', fontSize: '14px', marginBottom: '4px'}}>
                  You are about to permanently delete:
                </p>
                <p style={{fontWeight: 600, fontSize: '16px', color: '#212529', marginBottom: '4px'}}>
                  {deleteTarget.full_name}
                </p>
                <p style={{fontSize: '12px', fontFamily: 'monospace', color: '#6c757d', marginBottom: '20px'}}>
                  ID: {deleteTarget.patient_id}
                </p>
                <div className="alert alert-danger py-2 px-3 text-start" style={{fontSize: '13px', borderRadius: '8px'}}>
                  <i className="fas fa-exclamation-triangle me-2"></i>
                  This action <strong>cannot be undone</strong>. All records associated with this patient will be permanently removed.
                </div>
              </div>
              <div className="modal-footer justify-content-center border-0 pt-0" style={{paddingBottom: '24px', gap: '12px'}}>
                <button className="btn btn-outline-secondary px-4" onClick={() => { setShowDeleteModal(false); setDeleteTarget(null); }}
                  disabled={deleting}>Cancel</button>
                <button className="btn btn-danger px-4" onClick={handleDelete} disabled={deleting}>
                  {deleting ? <><span className="spinner-border spinner-border-sm me-1"></span>Deleting...</> : <><i className="fas fa-trash me-1"></i>Yes, Delete</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Full Edit Modal ── */}
      {showEditModal && editPatient && (
        <div className="modal d-block" style={{backgroundColor:'rgba(0,0,0,0.6)', zIndex:1060}}
          onClick={() => setShowEditModal(false)}>
          <div className="modal-dialog modal-xl modal-dialog-scrollable" onClick={e => e.stopPropagation()}
            style={{maxWidth:'960px', margin:'16px auto'}}>
            <div className="modal-content" style={{borderRadius:'16px', border:'none', overflow:'hidden'}}>

              {/* Header */}
              <div style={{background:'linear-gradient(135deg,#4361ee,#7c3aed)', padding:'22px 28px'}}>
                <div className="d-flex align-items-center justify-content-between">
                  <div className="d-flex align-items-center gap-3">
                    <div style={{width:44, height:44, borderRadius:12, background:'rgba(255,255,255,0.2)',
                      display:'flex', alignItems:'center', justifyContent:'center'}}>
                      <i className="fas fa-user-edit" style={{color:'#fff', fontSize:18}}></i>
                    </div>
                    <div>
                      <h5 style={{color:'#fff', fontWeight:700, margin:0}}>Complete Patient Profile</h5>
                      <div style={{color:'rgba(255,255,255,0.75)', fontSize:13}}>
                        {editPatient.full_name} &nbsp;·&nbsp; <span style={{fontFamily:'monospace'}}>{editPatient.patient_id}</span>
                      </div>
                    </div>
                  </div>
                  <button type="button" className="btn-close btn-close-white" onClick={() => setShowEditModal(false)}></button>
                </div>
              </div>

              <div className="modal-body" style={{padding:'28px 32px', background:'#fff'}}>

                {/* ── SECTION 1: Personal Information ── */}
                <div className="d-flex align-items-center gap-2 mb-3">
                  <div style={{width:28,height:28,borderRadius:8,background:'#4361ee',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <i className="fas fa-user" style={{color:'#fff',fontSize:12}}></i>
                  </div>
                  <span style={{fontWeight:700, fontSize:14}}>Personal Information</span>
                  <div style={{flex:1,height:1,background:'#e9ecef',marginLeft:6}}></div>
                </div>
                <div className="row g-3 mb-4">
                  <div className="col-md-4">
                    <label className="form-label">First Name <span className="text-danger">*</span></label>
                    <input type="text" className="form-control" value={editForm.first_name}
                      onChange={e => setEditForm({...editForm, first_name: e.target.value})} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Other Names</label>
                    <input type="text" className="form-control" value={editForm.other_names}
                      onChange={e => setEditForm({...editForm, other_names: e.target.value})} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Last Name <span className="text-danger">*</span></label>
                    <input type="text" className="form-control" value={editForm.last_name}
                      onChange={e => setEditForm({...editForm, last_name: e.target.value})} />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Date of Birth <span className="text-danger">*</span></label>
                    <input type="date" className="form-control" value={editForm.date_of_birth}
                      max={new Date().toISOString().split('T')[0]}
                      onChange={e => setEditForm({...editForm, date_of_birth: e.target.value})} />
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Gender <span className="text-danger">*</span></label>
                    <select className="form-select" value={editForm.gender}
                      onChange={e => setEditForm({...editForm, gender: e.target.value})}>
                      <option value="">Select</option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Marital Status</label>
                    <select className="form-select" value={editForm.marital_status}
                      onChange={e => setEditForm({...editForm, marital_status: e.target.value})}>
                      <option value="">Select</option>
                      <option value="single">Single</option>
                      <option value="married">Married</option>
                      <option value="divorced">Divorced</option>
                      <option value="widowed">Widowed</option>
                    </select>
                  </div>
                  <div className="col-md-3">
                    <label className="form-label">Nationality</label>
                    <input type="text" className="form-control" value={editForm.nationality}
                      onChange={e => setEditForm({...editForm, nationality: e.target.value})} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">National ID (NIN)</label>
                    <input type="text" className="form-control" value={editForm.national_id}
                      onChange={e => setEditForm({...editForm, national_id: e.target.value})}
                      placeholder="e.g. 1234567890" />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Phone <span className="text-danger">*</span></label>
                    <input type="tel" className="form-control" value={editForm.phone}
                      onChange={e => setEditForm({...editForm, phone: e.target.value})} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Status</label>
                    <select className="form-select" value={editForm.status}
                      onChange={e => setEditForm({...editForm, status: e.target.value})}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="deceased">Deceased</option>
                    </select>
                  </div>

                  {/* Photo upload */}
                  <div className="col-12">
                    <label className="form-label">Patient Photo</label>
                    <div className="d-flex align-items-center gap-3 flex-wrap">
                      <div style={{width:80, height:80, borderRadius:12, overflow:'hidden', border:'2px solid #e9ecef',
                        background:'#f8fafc', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0}}>
                        {editPhotoPreview
                          ? <img src={editPhotoPreview} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}} />
                          : <i className="fas fa-user-circle" style={{fontSize:36, color:'#cbd5e1'}}></i>}
                      </div>
                      <div className="d-flex gap-2 flex-wrap">
                        <label className="btn btn-sm btn-outline-primary mb-0" style={{cursor:'pointer'}}>
                          <i className="fas fa-upload me-1"></i>Upload Photo
                          <input ref={editFileInputRef} type="file" accept="image/*" hidden
                            onChange={e => {
                              const f = e.target.files[0];
                              if (f) { setEditPhotoFile(f); setEditPhotoPreview(URL.createObjectURL(f)); }
                            }} />
                        </label>
                        {editPhotoPreview && (
                          <button type="button" className="btn btn-sm btn-outline-danger"
                            onClick={() => { setEditPhotoFile(null); setEditPhotoPreview(null); if (editFileInputRef.current) editFileInputRef.current.value = ''; }}>
                            <i className="fas fa-trash me-1"></i>Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ── SECTION 2: Contact & Address ── */}
                <div className="d-flex align-items-center gap-2 mb-3">
                  <div style={{width:28,height:28,borderRadius:8,background:'#0891b2',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <i className="fas fa-map-marker-alt" style={{color:'#fff',fontSize:12}}></i>
                  </div>
                  <span style={{fontWeight:700, fontSize:14}}>Contact & Address</span>
                  <div style={{flex:1,height:1,background:'#e9ecef',marginLeft:6}}></div>
                </div>
                <div className="row g-3 mb-4">
                  <div className="col-md-4">
                    <label className="form-label">Alt Phone</label>
                    <input type="tel" className="form-control" value={editForm.alt_phone}
                      onChange={e => setEditForm({...editForm, alt_phone: e.target.value})} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Email</label>
                    <input type="email" className="form-control" value={editForm.email}
                      onChange={e => setEditForm({...editForm, email: e.target.value})} />
                  </div>
                  <div className="col-md-12">
                    <label className="form-label">Residential Address</label>
                    <textarea className="form-control" rows={2} value={editForm.address}
                      placeholder="House number, street, landmark"
                      onChange={e => setEditForm({...editForm, address: e.target.value})} />
                  </div>
                  {/* Region cascade */}
                  <div className="col-md-6">
                    <label className="form-label">Region</label>
                    <select className="form-select"
                      value={editSelectedRegionId}
                      onChange={e => {
                        const regionId = e.target.value;
                        const regionObj = editRegions.find(r => String(r.id) === regionId);
                        setEditSelectedRegionId(regionId);
                        setEditForm({...editForm, region: regionObj ? regionObj.name : '', district:'', chiefdom:'', town:''});
                        fetchEditDistricts(regionId);
                      }}>
                      <option value="">Select Region</option>
                      {editRegions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">District</label>
                    <select className="form-select" value={editForm.district} disabled={editDistricts.length === 0}
                      onChange={e => {
                        const districtId = e.target.value;
                        setEditForm({...editForm, district: districtId, chiefdom:'', town:''});
                        fetchEditChiefdoms(districtId);
                        fetchEditTowns(districtId, '');
                      }}>
                      <option value="">{editDistricts.length === 0 ? 'Select Region first' : 'Select District'}</option>
                      {editDistricts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Chiefdom</label>
                    <select className="form-select" value={editForm.chiefdom} disabled={editChiefdoms.length === 0}
                      onChange={e => {
                        const chiefdomId = e.target.value;
                        setEditForm({...editForm, chiefdom: chiefdomId, town:''});
                        fetchEditTowns(editForm.district, chiefdomId);
                      }}>
                      <option value="">{editChiefdoms.length === 0 ? 'Select District first' : 'Select Chiefdom'}</option>
                      {editChiefdoms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Town</label>
                    <select className="form-select" value={editForm.town} disabled={editTowns.length === 0}
                      onChange={e => setEditForm({...editForm, town: e.target.value})}>
                      <option value="">{editTowns.length === 0 ? 'Select District first' : 'Select Town'}</option>
                      {editTowns.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">City / Town (text)</label>
                    <input type="text" className="form-control" value={editForm.city}
                      placeholder="Optional: type if not in dropdown"
                      onChange={e => setEditForm({...editForm, city: e.target.value})} />
                  </div>
                </div>

                {/* ── SECTION 3: Medical Information ── */}
                <div className="d-flex align-items-center gap-2 mb-3">
                  <div style={{width:28,height:28,borderRadius:8,background:'#dc2626',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <i className="fas fa-heartbeat" style={{color:'#fff',fontSize:12}}></i>
                  </div>
                  <span style={{fontWeight:700, fontSize:14}}>Medical Information</span>
                  <div style={{flex:1,height:1,background:'#e9ecef',marginLeft:6}}></div>
                </div>
                <div className="row g-3 mb-4">
                  <div className="col-md-3">
                    <label className="form-label">Blood Type</label>
                    <select className="form-select" value={editForm.blood_type}
                      onChange={e => setEditForm({...editForm, blood_type: e.target.value})}>
                      <option value="unknown">Unknown</option>
                      <option value="A+">A+</option><option value="A-">A-</option>
                      <option value="B+">B+</option><option value="B-">B-</option>
                      <option value="AB+">AB+</option><option value="AB-">AB-</option>
                      <option value="O+">O+</option><option value="O-">O-</option>
                    </select>
                  </div>
                  <div className="col-md-9">
                    <label className="form-label">Known Allergies</label>
                    <input type="text" className="form-control" value={editForm.allergies}
                      placeholder="e.g. Penicillin, Peanuts, Latex"
                      onChange={e => setEditForm({...editForm, allergies: e.target.value})} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Chronic Conditions</label>
                    <input type="text" className="form-control" value={editForm.chronic_conditions}
                      placeholder="e.g. Diabetes, Hypertension"
                      onChange={e => setEditForm({...editForm, chronic_conditions: e.target.value})} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Disabilities</label>
                    <input type="text" className="form-control" value={editForm.disabilities}
                      placeholder="e.g. Visual impairment, Mobility issues"
                      onChange={e => setEditForm({...editForm, disabilities: e.target.value})} />
                  </div>
                </div>

                {/* ── SECTION 4: Emergency Contact ── */}
                <div className="d-flex align-items-center gap-2 mb-3">
                  <div style={{width:28,height:28,borderRadius:8,background:'#d97706',display:'flex',alignItems:'center',justifyContent:'center'}}>
                    <i className="fas fa-phone-alt" style={{color:'#fff',fontSize:12}}></i>
                  </div>
                  <span style={{fontWeight:700, fontSize:14}}>Emergency Contact</span>
                  <div style={{flex:1,height:1,background:'#e9ecef',marginLeft:6}}></div>
                </div>
                <div className="row g-3">
                  <div className="col-md-4">
                    <label className="form-label">Full Name</label>
                    <input type="text" className="form-control" value={editForm.emergency_contact_name}
                      onChange={e => setEditForm({...editForm, emergency_contact_name: e.target.value})} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Phone Number</label>
                    <input type="tel" className="form-control" value={editForm.emergency_contact_phone}
                      onChange={e => setEditForm({...editForm, emergency_contact_phone: e.target.value})} />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Relationship</label>
                    <select className="form-select" value={editForm.emergency_contact_relationship}
                      onChange={e => setEditForm({...editForm, emergency_contact_relationship: e.target.value})}>
                      <option value="">Select</option>
                      <option value="Spouse">Spouse</option>
                      <option value="Parent">Parent</option>
                      <option value="Child">Child</option>
                      <option value="Sibling">Sibling</option>
                      <option value="Guardian">Guardian</option>
                      <option value="Friend">Friend</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>

              </div>

              {/* Footer */}
              <div style={{background:'#f8fafc', padding:'16px 32px', borderTop:'1px solid #e9ecef',
                display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                <span style={{fontSize:12, color:'#8a94a6'}}>
                  <i className="fas fa-shield-alt me-1" style={{color:'#4361ee'}}></i>
                  Changes are saved to the NEHR record permanently
                </span>
                <div className="d-flex gap-2">
                  <button className="btn btn-outline-secondary px-4" style={{borderRadius:8}}
                    onClick={() => setShowEditModal(false)}>Cancel</button>
                  <button className="btn btn-primary px-4" style={{borderRadius:8, fontWeight:600}}
                    onClick={handleEditSave} disabled={saving}>
                    {saving
                      ? <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</>
                      : <><i className="fas fa-save me-1"></i>Save All Changes</>}
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

export default PatientList;

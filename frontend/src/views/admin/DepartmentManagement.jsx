import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layout/DashboardLayout';
import showToast from '../../utils/toast';
import ConfirmModal from '../../components/ConfirmModal';
import { getNavForUser, getBrandForUser, getRoleBadge } from '../../utils/navItems';


const departmentTypes = [
  { value: 'opd', label: 'Out-Patient Department (OPD)', icon: 'fas fa-walking', color: '#4361ee' },
  { value: 'ipd', label: 'In-Patient Department (IPD)', icon: 'fas fa-bed', color: '#7c3aed' },
  { value: 'emergency', label: 'Emergency / Casualty', icon: 'fas fa-ambulance', color: '#e53e3e' },
  { value: 'laboratory', label: 'Laboratory', icon: 'fas fa-flask', color: '#d69e2e' },
  { value: 'pharmacy', label: 'Pharmacy', icon: 'fas fa-pills', color: '#38a169' },
  { value: 'radiology', label: 'Radiology / Imaging', icon: 'fas fa-x-ray', color: '#0891b2' },
  { value: 'surgery', label: 'Surgery', icon: 'fas fa-procedures', color: '#dc2626' },
  { value: 'maternity', label: 'Maternity / Obstetrics', icon: 'fas fa-baby', color: '#ec4899' },
  { value: 'pediatrics', label: 'Pediatrics', icon: 'fas fa-child', color: '#f59e0b' },
  { value: 'dental', label: 'Dental', icon: 'fas fa-tooth', color: '#6366f1' },
  { value: 'eye_clinic', label: 'Eye Clinic / Ophthalmology', icon: 'fas fa-eye', color: '#14b8a6' },
  { value: 'physiotherapy', label: 'Physiotherapy', icon: 'fas fa-dumbbell', color: '#8b5cf6' },
  { value: 'records', label: 'Medical Records', icon: 'fas fa-folder-open', color: '#64748b' },
  { value: 'admin', label: 'Administration', icon: 'fas fa-cogs', color: '#475569' },
  { value: 'ward', label: 'Ward', icon: 'fas fa-door-open', color: '#059669' },
  { value: 'other', label: 'Other', icon: 'fas fa-ellipsis-h', color: '#94a3b8' },
];

const getDeptMeta = (name) => departmentTypes.find(d => d.value === name) || departmentTypes[departmentTypes.length - 1];

function DepartmentManagement() {
  const { apiCall, user } = useAuth();
  const isReadOnly = user?.role === 'ministry_admin';
  const [departments, setDepartments] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDept, setSelectedDept] = useState(null);
  const [filterHospital, setFilterHospital] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [formData, setFormData] = useState({
    name: '', hospital: '', head_of_department: '', phone: '', status: 'active', is_active: true
  });
  const [confirmDelete, setConfirmDelete] = useState({ show: false, id: null });

  useEffect(() => {
    fetchDepartments();
    fetchHospitals();
  }, []);

  const fetchDepartments = async () => {
    try {
      setLoading(true);
      const response = await apiCall('/admin/departments/');
      const data = await response.json();
      if (response.ok) setDepartments(data);
    } catch {
      console.error('Error fetching departments');
    } finally {
      setLoading(false);
    }
  };

  const fetchHospitals = async () => {
    try {
      const response = await apiCall('/admin/hospitals/');
      const data = await response.json();
      if (response.ok) setHospitals(data);
    } catch {
      console.error('Error fetching hospitals');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const response = await apiCall('/admin/departments/', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        setShowCreateModal(false);
        resetForm();
        fetchDepartments();
        showToast.success('Department created successfully!');
      } else {
        const data = await response.json();
        const msg = Object.values(data).flat().join(', ');
        showToast.error(msg || 'Failed to create department');
      }
    } catch {
      showToast.error('Error creating department. Please try again.');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const response = await apiCall(`/admin/departments/${selectedDept.id}/`, {
        method: 'PUT',
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        setShowEditModal(false);
        setSelectedDept(null);
        resetForm();
        fetchDepartments();
        showToast.success('Department updated successfully!');
      } else {
        const data = await response.json();
        const msg = Object.values(data).flat().join(', ');
        showToast.error(msg || 'Failed to update department');
      }
    } catch {
      showToast.error('Error updating department. Please try again.');
    }
  };

  const handleDelete = (id) => setConfirmDelete({ show: true, id });

  const confirmDeleteAction = async () => {
    try {
      const response = await apiCall(`/admin/departments/${confirmDelete.id}/`, { method: 'DELETE' });
      if (response.ok) {
        fetchDepartments();
        showToast.success('Department deleted successfully!');
      } else {
        showToast.error('Failed to delete department');
      }
    } catch {
      showToast.error('Error deleting department. Please try again.');
    } finally {
      setConfirmDelete({ show: false, id: null });
    }
  };

  const openEditModal = (dept) => {
    setSelectedDept(dept);
    setFormData({
      name: dept.name, hospital: dept.hospital, head_of_department: dept.head_of_department || '',
      phone: dept.phone || '', status: dept.status, is_active: dept.is_active
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({ name: '', hospital: '', head_of_department: '', phone: '', status: 'active', is_active: true });
  };

  // Filtering & pagination
  const filteredDepts = departments.filter(d => {
    const matchSearch = !searchQuery ||
      (d.name_display || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.department_code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.hospital_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.head_of_department || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchHospital = !filterHospital || String(d.hospital) === filterHospital;
    return matchSearch && matchHospital;
  });

  const totalPages = Math.ceil(filteredDepts.length / itemsPerPage);
  const paginatedDepts = filteredDepts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, filterHospital]);

  const renderPagination = () => {
    if (filteredDepts.length === 0) return null;
    const pages = [];
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= currentPage - 1 && i <= currentPage + 1)) {
        pages.push(
          <li key={i} className={`page-item ${currentPage === i ? 'active' : ''}`}>
            <button className="page-link" onClick={() => setCurrentPage(i)}>{i}</button>
          </li>
        );
      } else if (i === currentPage - 2 || i === currentPage + 2) {
        pages.push(<li key={i} className="page-item disabled"><span className="page-link">...</span></li>);
      }
    }
    return (
      <div className="d-flex justify-content-between align-items-center mt-3 px-3 pb-3">
        <small className="text-muted">
          Showing {filteredDepts.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredDepts.length)} of {filteredDepts.length}
        </small>
        {totalPages > 1 && (
          <nav>
            <ul className="pagination pagination-sm mb-0">
              <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>&laquo;</button>
              </li>
              {pages}
              <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                <button className="page-link" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>&raquo;</button>
              </li>
            </ul>
          </nav>
        )}
      </div>
    );
  };

  const modalOverlay = {
    backgroundColor: 'rgba(0,0,0,0.5)', position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1050
  };

  const renderForm = (onSubmit, submitLabel) => (
    <form onSubmit={onSubmit}>
      <div className="modal-body">
        <div className="row g-3">
          <div className="col-md-6">
            <label className="form-label">Hospital *</label>
            <select className="form-select" value={formData.hospital}
              onChange={(e) => setFormData({ ...formData, hospital: e.target.value })} required>
              <option value="">Select Hospital</option>
              {hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label">Department Type *</label>
            <select className="form-select" value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })} required>
              <option value="">Select Department</option>
              {departmentTypes.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label">Head of Department</label>
            <input type="text" className="form-control" value={formData.head_of_department}
              onChange={(e) => setFormData({ ...formData, head_of_department: e.target.value })}
              placeholder="e.g. Dr. John Kamara" />
          </div>
          <div className="col-md-6">
            <label className="form-label">Phone</label>
            <input type="text" className="form-control" value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder="Department phone number" />
          </div>
          <div className="col-md-6">
            <label className="form-label">Status</label>
            <select className="form-select" value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>
          <div className="col-md-6 d-flex align-items-end">
            <div className="form-check">
              <input type="checkbox" className="form-check-input" id="dept_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} />
              <label className="form-check-label" htmlFor="dept_active">Active</label>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-footer">
        <button type="button" className="btn btn-secondary" onClick={() => { setShowCreateModal(false); setShowEditModal(false); setSelectedDept(null); }}>Cancel</button>
        <button type="submit" className="btn btn-primary">{submitLabel}</button>
      </div>
    </form>
  );

  return (
    <DashboardLayout navItems={getNavForUser(user)} brandTitle={getBrandForUser(user)} roleBadge={getRoleBadge(user)}>
      <div className="container-fluid py-4">
        <div className="row mb-4">
          <div className="col-12">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h1 className="h3 mb-0">Departments</h1>
                <p className="text-muted mb-0">Manage hospital departments</p>
              </div>
              {!isReadOnly && (
                <button className="btn btn-primary"
                  onClick={() => { resetForm(); setShowCreateModal(true); }}>
                  <i className="fas fa-plus me-2"></i>Add Department
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Infographic Stats */}
        <div className="row g-3 mb-4">
          <div className="col-6 col-md-3">
            <div className="dash-stat-card">
              <div className="stat-icon bg-primary-soft"><i className="fas fa-building"></i></div>
              <div className="stat-label">Total Departments</div>
              <div className="stat-value">{departments.length}</div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="dash-stat-card">
              <div className="stat-icon bg-success-soft"><i className="fas fa-check-circle"></i></div>
              <div className="stat-label">Active</div>
              <div className="stat-value">{departments.filter(d => d.status === 'active').length}</div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="dash-stat-card">
              <div className="stat-icon bg-info-soft"><i className="fas fa-hospital"></i></div>
              <div className="stat-label">Hospitals Covered</div>
              <div className="stat-value">{[...new Set(departments.map(d => d.hospital))].length}</div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="dash-stat-card">
              <div className="stat-icon bg-warning-soft"><i className="fas fa-users"></i></div>
              <div className="stat-label">Total Staff</div>
              <div className="stat-value">{departments.reduce((sum, d) => sum + (d.staff_count || 0), 0)}</div>
            </div>
          </div>
        </div>

        {/* Filter & Search */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            <div className="row g-3 align-items-center">
              <div className="col-md-5">
                <div className="input-group">
                  <span className="input-group-text bg-white"><i className="fas fa-search text-muted"></i></span>
                  <input type="text" className="form-control" placeholder="Search departments by name, code, hospital..."
                    value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                  {searchQuery && (
                    <button className="btn btn-outline-secondary" type="button" onClick={() => setSearchQuery('')}>
                      <i className="fas fa-times"></i>
                    </button>
                  )}
                </div>
              </div>
              <div className="col-md-4">
                <select className="form-select" value={filterHospital}
                  onChange={(e) => setFilterHospital(e.target.value)}>
                  <option value="">All Hospitals</option>
                  {hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                </select>
              </div>
              <div className="col-md-3 text-end">
                <span className="badge bg-primary bg-opacity-10 text-primary" style={{ fontSize: '13px', padding: '8px 14px' }}>
                  {filteredDepts.length} department{filteredDepts.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Departments Table */}
        <div className="card border-0 shadow-sm">
          <div className="card-body p-0">
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="bg-light">
                    <tr>
                      <th>Department</th>
                      <th>Code</th>
                      <th>Hospital</th>
                      <th>Head</th>
                      <th>Staff</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedDepts.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center py-4">
                          <i className="fas fa-building" style={{ fontSize: '36px', color: '#dee2e6', display: 'block', marginBottom: '8px' }}></i>
                          {searchQuery ? 'No departments match your search.' : 'No departments found. Add your first department.'}
                        </td>
                      </tr>
                    ) : paginatedDepts.map((d) => {
                      const meta = getDeptMeta(d.name);
                      return (
                        <tr key={d.id}>
                          <td>
                            <div className="d-flex align-items-center gap-2">
                              <div style={{
                                width: '32px', height: '32px', borderRadius: '8px',
                                background: `${meta.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center'
                              }}>
                                <i className={meta.icon} style={{ color: meta.color, fontSize: '14px' }}></i>
                              </div>
                              <strong>{d.name_display}</strong>
                            </div>
                          </td>
                          <td><code>{d.department_code}</code></td>
                          <td>{d.hospital_name}</td>
                          <td>{d.head_of_department || <span className="text-muted">—</span>}</td>
                          <td><span className="badge bg-info bg-opacity-10 text-info">{d.staff_count || 0}</span></td>
                          <td>
                            {d.status === 'active' ? (
                              <span className="badge bg-success">Active</span>
                            ) : (
                              <span className="badge bg-danger">Inactive</span>
                            )}
                          </td>
                          <td>
                            {isReadOnly ? (
                              <span className="text-muted small">View only</span>
                            ) : (
                              <div className="btn-group btn-group-sm">
                                <button className="btn btn-outline-primary" onClick={() => openEditModal(d)} title="Edit">
                                  <i className="fas fa-edit"></i>
                                </button>
                                <button className="btn btn-outline-danger" onClick={() => handleDelete(d.id)} title="Delete">
                                  <i className="fas fa-trash"></i>
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
            {renderPagination()}
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal show d-block" style={modalOverlay}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title"><i className="fas fa-plus-circle me-2 text-primary"></i>Add New Department</h5>
                <button type="button" className="btn-close" onClick={() => setShowCreateModal(false)}></button>
              </div>
              {renderForm(handleCreate, 'Create Department')}
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedDept && (
        <div className="modal show d-block" style={modalOverlay}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title"><i className="fas fa-edit me-2 text-primary"></i>Edit Department</h5>
                <button type="button" className="btn-close" onClick={() => { setShowEditModal(false); setSelectedDept(null); }}></button>
              </div>
              {renderForm(handleUpdate, 'Update Department')}
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        show={confirmDelete.show}
        title="Delete Department?"
        message="This will permanently remove this department and unlink any assigned staff."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={confirmDeleteAction}
        onCancel={() => setConfirmDelete({ show: false, id: null })}
      />
    </DashboardLayout>
  );
}

export default DepartmentManagement;

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../layout/DashboardLayout';
import { getNavForUser, getBrandForUser, getRoleBadge } from '../../utils/navItems';
import showToast from '../../utils/toast';
import ConfirmModal from '../../components/ConfirmModal';


function UserManagement() {
  const { apiCall, user } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [hospitals, setHospitals] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    is_active: ''
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({
    email: '',
    full_name: '',
    phone: '',
    role: '',
    hospital: '',
    department: '',
    district: '',
    password: '',
    is_active: false
  });
  const [confirmDeactivate, setConfirmDeactivate] = useState({ show: false, id: null });
  const [confirmPermanentDelete, setConfirmPermanentDelete] = useState({ show: false, id: null, confirmed: false, typedName: '' });
  const [showResetModal, setShowResetModal] = useState({ show: false, id: null });
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);

  // Check if current user is admin (role is stored as string in JWT token)
  const isAdmin = user?.role === 'admin';
  const isReadOnly = user?.role === 'ministry_admin';

  // Get selected role info
  const selectedRoleName = roles.find(r => r.id === parseInt(formData.role))?.name || '';

  useEffect(() => {
    fetchUsers();
    fetchRoles();
    fetchHospitals();
    fetchDistricts();
    fetchDepartments();
  }, [filters]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.role) params.append('role', filters.role);
      if (filters.is_active) params.append('is_active', filters.is_active);

      const response = await apiCall(`/admin/users/?${params.toString()}`);
      const data = await response.json();
      
      if (response.ok) {
        setUsers(data);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const response = await apiCall('/admin/roles/');
      const data = await response.json();
      if (response.ok) {
        setRoles(data);
      }
    } catch (error) {
      console.error('Error fetching roles:', error);
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

  const fetchDistricts = async () => {
    try {
      const response = await apiCall('/admin/districts/');
      const data = await response.json();
      if (response.ok) setDistricts(data);
    } catch {
      console.error('Error fetching districts');
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await apiCall('/admin/departments/');
      const data = await response.json();
      if (response.ok) setDepartments(data);
    } catch {
      console.error('Error fetching departments');
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const response = await apiCall('/admin/users/', {
        method: 'POST',
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setShowCreateModal(false);
        resetForm();
        fetchUsers();
        showToast.success('User created successfully!');
      } else {
        const data = await response.json();
        const msg = Object.values(data).flat().join(', ');
        showToast.error(msg || 'Failed to create user');
      }
    } catch {
      showToast.error('Error creating user. Please try again.');
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    try {
      const updateData = {
        full_name: formData.full_name,
        phone: formData.phone,
        role: formData.role,
        is_active: formData.is_active
      };

      const response = await apiCall(`/admin/users/${selectedUser.id}/`, {
        method: 'PUT',
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        setShowEditModal(false);
        setSelectedUser(null);
        resetForm();
        fetchUsers();
        showToast.success('User updated successfully!');
      } else {
        const data = await response.json();
        const msg = Object.values(data).flat().join(', ');
        showToast.error(msg || 'Failed to update user');
      }
    } catch {
      showToast.error('Error updating user. Please try again.');
    }
  };

  const [userToDeactivate, setUserToDeactivate] = useState(null);
  const [userToDelete, setUserToDelete] = useState(null);

  const handleDeactivateUser = (user) => {
    setUserToDeactivate(user);
    setConfirmDeactivate({ show: true, id: user.id });
  };

  const handlePermanentDelete = (user) => {
    setUserToDelete(user);
    setConfirmPermanentDelete({ show: true, id: user.id, confirmed: false, typedName: '' });
  };

  const confirmPermanentDeleteAction = async () => {
    try {
      const response = await apiCall(`/admin/users/${confirmPermanentDelete.id}/permanent_delete/`, {
        method: 'DELETE'
      });
      if (response.ok) {
        fetchUsers();
        showToast.deleted('User');
      } else {
        const data = await response.json();
        showToast.error(data.error || 'Failed to delete user');
      }
    } catch {
      showToast.deleteError('User');
    } finally {
      setConfirmPermanentDelete({ show: false, id: null, confirmed: false, typedName: '' });
      setUserToDelete(null);
    }
  };

  const confirmDeactivateAction = async () => {
    try {
      const response = await apiCall(`/admin/users/${confirmDeactivate.id}/`, {
        method: 'DELETE'
      });
      if (response.ok) {
        fetchUsers();
        showToast.success('User deactivated successfully!');
      } else {
        showToast.error('Failed to deactivate user');
      }
    } catch {
      showToast.error('Error deactivating user. Please try again.');
    } finally {
      setConfirmDeactivate({ show: false, id: null, confirmed: false });
      setUserToDeactivate(null);
    }
  };

  const handleActivateUser = async (userId) => {
    try {
      const response = await apiCall(`/admin/users/${userId}/activate/`, {
        method: 'POST'
      });
      if (response.ok) {
        fetchUsers();
        showToast.success('User activated successfully!');
      } else {
        showToast.error('Failed to activate user');
      }
    } catch {
      showToast.error('Error activating user. Please try again.');
    }
  };

  const handleResetPassword = (userId) => {
    setShowResetModal({ show: true, id: userId });
    setNewPassword('');
  };

  const confirmResetPassword = async () => {
    if (!newPassword) {
      showToast.warning('Please enter a new password');
      return;
    }
    try {
      const response = await apiCall(`/admin/users/${showResetModal.id}/reset_password/`, {
        method: 'POST',
        body: JSON.stringify({ password: newPassword })
      });
      if (response.ok) {
        showToast.success('Password reset successfully!');
      } else {
        showToast.error('Failed to reset password');
      }
    } catch {
      showToast.error('Error resetting password. Please try again.');
    } finally {
      setShowResetModal({ show: false, id: null });
      setNewPassword('');
    }
  };

  const openEditModal = (user) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      full_name: user.full_name,
      phone: user.phone,
      role: user.role,
      is_active: user.is_active
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      email: '',
      full_name: '',
      phone: '',
      role: '',
      hospital: '',
      department: '',
      district: '',
      password: '',
      is_active: false
    });
  };

  return (
    <DashboardLayout navItems={getNavForUser(user)} brandTitle={getBrandForUser(user)} roleBadge={getRoleBadge(user)}>
      <div className="container-fluid py-4">
        <div className="row mb-4">
          <div className="col-12">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h1 className="h3 mb-0">User Management</h1>
                <p className="text-muted">Manage system users and their roles</p>
              </div>
              {!isReadOnly && (
                <button 
                  className="btn btn-primary"
                  onClick={() => setShowCreateModal(true)}
                >
                  <i className="bi bi-person-plus me-2"></i>
                  Create New User
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-4">
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by name, email, or employee ID..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                />
              </div>
              <div className="col-md-3">
                <select
                  className="form-select"
                  value={filters.role}
                  onChange={(e) => setFilters({ ...filters, role: e.target.value })}
                >
                  <option value="">All Roles</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.name}>{role.display_name || role.name}</option>
                  ))}
                </select>
              </div>
              <div className="col-md-3">
                <select
                  className="form-select"
                  value={filters.is_active}
                  onChange={(e) => setFilters({ ...filters, is_active: e.target.value })}
                >
                  <option value="">All Status</option>
                  <option value="true">Active</option>
                  <option value="false">Inactive</option>
                </select>
              </div>
              <div className="col-md-2">
                <button 
                  className="btn btn-outline-secondary w-100"
                  onClick={() => setFilters({ search: '', role: '', is_active: '' })}
                >
                  Clear Filters
                </button>
              </div>
            </div>
          </div>
        </div>

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
                      <th>Name</th>
                      <th>Email</th>
                      <th>Role</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {users.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="text-center py-4">
                          No users found
                        </td>
                      </tr>
                    ) : (
                      users.map((user) => (
                        <tr key={user.id}>
                          <td>{user.full_name || user.username}</td>
                          <td>{user.email}</td>
                          <td>
                            <span className="badge bg-primary bg-opacity-10 text-primary">
                              {user.role_display || 'No Role'}
                            </span>
                          </td>
                          <td>
                            {user.is_active ? (
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
                              <button
                                className="btn btn-outline-primary"
                                onClick={() => openEditModal(user)}
                                title="Edit"
                              >
                                <i className="bi bi-pencil"></i>
                              </button>
                              <button
                                className="btn btn-outline-warning"
                                onClick={() => handleResetPassword(user.id)}
                                title="Reset Password"
                              >
                                <i className="bi bi-key"></i>
                              </button>
                              {user.is_active ? (
                                <button
                                  className="btn btn-outline-danger"
                                  onClick={() => handleDeactivateUser(user)}
                                  title="Deactivate"
                                >
                                  <i className="bi bi-x-circle"></i>
                                </button>
                              ) : (
                                <button
                                  className="btn btn-outline-success"
                                  onClick={() => handleActivateUser(user.id)}
                                  title="Activate"
                                >
                                  <i className="bi bi-check-circle"></i>
                                </button>
                              )}
                              {/* Permanent Delete - Admin Only */}
                              {isAdmin && (
                                <button
                                  className="btn btn-outline-dark"
                                  onClick={() => handlePermanentDelete(user)}
                                  title="Delete Permanently"
                                >
                                  <i className="bi bi-trash"></i>
                                </button>
                              )}
                            </div>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1050 }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Create New User</h5>
                <button 
                  type="button" 
                  className="btn-close"
                  onClick={() => { setShowCreateModal(false); resetForm(); }}
                ></button>
              </div>
              <form onSubmit={handleCreateUser}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Full Name *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Email *</label>
                      <input
                        type="email"
                        className="form-control"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Phone *</label>
                      <input
                        type="tel"
                        className="form-control"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Role *</label>
                      <select
                        className="form-select"
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        required
                      >
                        <option value="">Select Role</option>
                        {roles.map((role) => (
                          <option key={role.id} value={role.id}>{role.display_name || role.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Password *</label>
                      <div className="input-group">
                        <input
                          type={showPassword ? "text" : "password"}
                          className="form-control"
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          required
                        />
                        <button
                          type="button"
                          className="btn btn-outline-secondary"
                          onClick={() => setShowPassword(!showPassword)}
                          tabIndex="-1"
                        >
                          <i className={`fas ${showPassword ? "fa-eye-slash" : "fa-eye"}`}></i>
                        </button>
                      </div>
                    </div>

                    {/* Auto-generated Employee ID Info */}
                    <div className="col-md-12">
                      <div className="alert alert-info d-flex align-items-center py-2" style={{ fontSize: '13px' }}>
                        <i className="fas fa-info-circle me-2"></i>
                        <span><strong>Employee ID:</strong> Will be automatically generated (format: EMP-XXXXX)</span>
                      </div>
                    </div>

                    {/* District selection for District Admin */}
                    {selectedRoleName === 'district_admin' && (
                      <div className="col-md-12">
                        <label className="form-label">Assigned District *</label>
                        <select
                          className="form-select"
                          value={formData.district}
                          onChange={(e) => setFormData({ ...formData, district: e.target.value })}
                          required
                        >
                          <option value="">Select District</option>
                          {districts.map((d) => (
                            <option key={d.id} value={d.id}>{d.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Hospital selection for Hospital Admin, Doctors, Nurses, etc. */}
                    {['hospital_admin', 'doctor', 'nurse', 'receptionist', 'lab_technician', 'pharmacist'].includes(selectedRoleName) && (
                      <div className="col-md-12">
                        <label className="form-label">Assigned Hospital *</label>
                        <select
                          className="form-select"
                          value={formData.hospital}
                          onChange={(e) => setFormData({ ...formData, hospital: e.target.value, department: '' })}
                          required
                        >
                          <option value="">Select Hospital</option>
                          {hospitals.map((h) => (
                            <option key={h.id} value={h.id}>{h.name}</option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Department selection for clinical staff */}
                    {['doctor', 'nurse', 'lab_technician', 'pharmacist'].includes(selectedRoleName) && formData.hospital && (
                      <div className="col-md-12">
                        <label className="form-label">Department *</label>
                        <select
                          className="form-select"
                          value={formData.department}
                          onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                          required
                        >
                          <option value="">Select Department</option>
                          {departments
                            .filter(d => d.hospital === parseInt(formData.hospital))
                            .map((d) => (
                              <option key={d.id} value={d.id}>{d.name_display}</option>
                            ))}
                        </select>
                        {departments.filter(d => d.hospital === parseInt(formData.hospital)).length === 0 && (
                          <small className="text-warning">
                            <i className="fas fa-exclamation-triangle me-1"></i>
                            No departments found for this hospital. Please add departments first.
                          </small>
                        )}
                      </div>
                    )}

                    <div className="col-md-12">
                      <div className="card border-0" style={{ backgroundColor: formData.is_active ? '#e8f5e9' : '#fff3e0', borderRadius: '8px' }}>
                        <div className="card-body py-3 d-flex align-items-center justify-content-between">
                          <div>
                            <div className="d-flex align-items-center gap-2 mb-1">
                              <i className={`fas ${formData.is_active ? 'fa-lock-open text-success' : 'fa-lock text-warning'}`} style={{ fontSize: '18px' }}></i>
                              <strong style={{ fontSize: '14px' }}>{formData.is_active ? 'Login Access Enabled' : 'Login Access Disabled'}</strong>
                            </div>
                            <small className="text-muted">
                              {formData.is_active
                                ? 'This user will be able to log in immediately after creation.'
                                : 'This user will NOT be able to log in until you activate their account.'}
                            </small>
                          </div>
                          <div className="form-check form-switch">
                            <input
                              type="checkbox"
                              className="form-check-input"
                              id="is_active_create"
                              checked={formData.is_active}
                              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                              style={{ width: '48px', height: '24px', cursor: 'pointer' }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => { setShowCreateModal(false); resetForm(); }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Create User
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1050 }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Edit User</h5>
                <button 
                  type="button" 
                  className="btn-close"
                  onClick={() => { setShowEditModal(false); setSelectedUser(null); resetForm(); }}
                ></button>
              </div>
              <form onSubmit={handleUpdateUser}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-6">
                      <label className="form-label">Full Name *</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.full_name}
                        onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Email</label>
                      <input
                        type="email"
                        className="form-control"
                        value={formData.email}
                        disabled
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Phone *</label>
                      <input
                        type="tel"
                        className="form-control"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        required
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Role *</label>
                      <select
                        className="form-select"
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                        required
                      >
                        <option value="">Select Role</option>
                        {roles.map((role) => (
                          <option key={role.id} value={role.id}>{role.display_name || role.name}</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Employee ID</label>
                      <input
                        type="text"
                        className="form-control bg-light"
                        value={selectedUser?.employee_id || 'N/A'}
                        disabled
                      />
                    </div>
                    <div className="col-md-12">
                      <div className="card border-0" style={{ backgroundColor: formData.is_active ? '#e8f5e9' : '#fff3e0', borderRadius: '8px' }}>
                        <div className="card-body py-3 d-flex align-items-center justify-content-between">
                          <div>
                            <div className="d-flex align-items-center gap-2 mb-1">
                              <i className={`fas ${formData.is_active ? 'fa-lock-open text-success' : 'fa-lock text-warning'}`} style={{ fontSize: '18px' }}></i>
                              <strong style={{ fontSize: '14px' }}>{formData.is_active ? 'Login Access Enabled' : 'Login Access Disabled'}</strong>
                            </div>
                            <small className="text-muted">
                              {formData.is_active
                                ? 'This user can log in to the system.'
                                : 'This user is blocked from logging in.'}
                            </small>
                          </div>
                          <div className="form-check form-switch">
                            <input
                              type="checkbox"
                              className="form-check-input"
                              id="is_active_edit"
                              checked={formData.is_active}
                              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                              style={{ width: '48px', height: '24px', cursor: 'pointer' }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => { setShowEditModal(false); setSelectedUser(null); resetForm(); }}
                  >
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Update User
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      {/* Professional User Deactivate Modal */}
      {confirmDeactivate.show && userToDeactivate && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '450px', margin: '1.75rem auto' }}>
            <div className="modal-content border-0 shadow-lg">
              {/* Modal Header with Warning Color */}
              <div className="modal-header bg-danger text-white">
                <h5 className="modal-title">
                  <i className="fas fa-user-slash me-2"></i>
                  Deactivate User Account
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => { setConfirmDeactivate({ show: false, id: null }); setUserToDeactivate(null); }}
                ></button>
              </div>

              {/* Modal Body */}
              <div className="modal-body p-4" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
                {/* Warning Alert */}
                <div className="alert alert-warning d-flex align-items-center mb-3">
                  <i className="fas fa-exclamation-triangle me-2" style={{ fontSize: '18px' }}></i>
                  <div style={{ fontSize: '13px' }}>
                    <strong>Warning:</strong> This will disable the user's access. They cannot log in until reactivated.
                  </div>
                </div>

                {/* User Info */}
                <div className="d-flex align-items-center mb-3 p-3 bg-light rounded">
                  <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center me-3" style={{ width: '48px', height: '48px', fontSize: '18px', fontWeight: 'bold' }}>
                    {userToDeactivate.full_name ? userToDeactivate.full_name.charAt(0).toUpperCase() : '?'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '15px' }}>{userToDeactivate.full_name}</div>
                    <small className="text-muted" style={{ fontSize: '12px' }}>{userToDeactivate.email}</small>
                  </div>
                </div>

                {/* Info Grid */}
                <div className="row g-2 mb-3" style={{ fontSize: '12px' }}>
                  <div className="col-6">
                    <span className="text-muted">Role:</span>
                    <span className="ms-1 badge bg-info text-dark">{userToDeactivate.role_display || userToDeactivate.role_name || 'N/A'}</span>
                  </div>
                  <div className="col-6">
                    <span className="text-muted">ID:</span> <span className="fw-medium">{userToDeactivate.employee_id || 'N/A'}</span>
                  </div>
                  <div className="col-12">
                    <span className="text-muted">Hospital:</span> <span className="fw-medium">{userToDeactivate.hospital_name || 'N/A'}</span>
                  </div>
                </div>

                {/* Consequences */}
                <div className="mb-3">
                  <small className="text-muted fw-bold d-block mb-2" style={{ fontSize: '12px' }}>Consequences:</small>
                  <ul className="list-unstyled mb-0" style={{ fontSize: '12px' }}>
                    <li className="mb-1"><i className="fas fa-times-circle text-danger me-2"></i>User logged out immediately (if active)</li>
                    <li className="mb-1"><i className="fas fa-times-circle text-danger me-2"></i>Cannot log in until reactivated</li>
                    <li className="mb-1"><i className="fas fa-check-circle text-success me-2"></i>User data and records remain intact</li>
                    <li><i className="fas fa-check-circle text-success me-2"></i>Can be reactivated at any time</li>
                  </ul>
                </div>

                {/* Confirmation Checkbox */}
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="confirmDeactivate"
                    checked={confirmDeactivate.confirmed}
                    onChange={(e) => setConfirmDeactivate({ ...confirmDeactivate, confirmed: e.target.checked })}
                  />
                  <label className="form-check-label" htmlFor="confirmDeactivate" style={{ fontSize: '13px' }}>
                    I understand and want to deactivate <strong>{userToDeactivate.full_name}</strong>
                  </label>
                </div>
              </div>

              {/* Modal Footer */}
              <div className="modal-footer bg-light">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => { setConfirmDeactivate({ show: false, id: null }); setUserToDeactivate(null); }}
                >
                  <i className="fas fa-times me-1"></i>Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={confirmDeactivateAction}
                  disabled={!confirmDeactivate.confirmed}
                >
                  <i className="fas fa-user-slash me-1"></i>Deactivate User
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Delete Modal - Admin Only */}
      {confirmPermanentDelete.show && userToDelete && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.7)', position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 1070 }}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '450px', margin: '1.75rem auto' }}>
            <div className="modal-content border-0 shadow-lg">
              {/* Modal Header */}
              <div className="modal-header bg-dark text-white">
                <h5 className="modal-title">
                  <i className="fas fa-exclamation-triangle me-2 text-danger"></i>
                  Delete User Permanently
                </h5>
                <button
                  type="button"
                  className="btn-close btn-close-white"
                  onClick={() => { setConfirmPermanentDelete({ show: false, id: null, confirmed: false, typedName: '' }); setUserToDelete(null); }}
                ></button>
              </div>

              {/* Modal Body */}
              <div className="modal-body p-4" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
                {/* Critical Warning */}
                <div className="alert alert-danger d-flex align-items-center mb-3">
                  <i className="fas fa-skull-crossbones me-2" style={{ fontSize: '18px' }}></i>
                  <div style={{ fontSize: '13px' }}>
                    <strong>CRITICAL:</strong> This will <strong>permanently delete</strong> this user. This <strong>cannot be undone</strong>.
                  </div>
                </div>

                {/* User Info */}
                <div className="d-flex align-items-center mb-3 p-3 bg-light rounded">
                  <div className="rounded-circle bg-danger text-white d-flex align-items-center justify-content-center me-3" style={{ width: '48px', height: '48px', fontSize: '18px', fontWeight: 'bold' }}>
                    {userToDelete.full_name ? userToDelete.full_name.charAt(0).toUpperCase() : '?'}
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '15px' }}>{userToDelete.full_name}</div>
                    <small className="text-muted" style={{ fontSize: '12px' }}>{userToDelete.email}</small>
                  </div>
                </div>

                {/* Info Grid */}
                <div className="row g-2 mb-3" style={{ fontSize: '12px' }}>
                  <div className="col-6">
                    <span className="text-muted">Role:</span>
                    <span className="ms-1 badge bg-info text-dark">{userToDelete.role_display || userToDelete.role_name || 'N/A'}</span>
                  </div>
                  <div className="col-6">
                    <span className="text-muted">ID:</span> <span className="fw-medium">{userToDelete.employee_id || 'N/A'}</span>
                  </div>
                  <div className="col-12">
                    <span className="text-muted">Hospital:</span> <span className="fw-medium">{userToDelete.hospital_name || 'N/A'}</span>
                  </div>
                </div>

                {/* Consequences */}
                <div className="mb-3">
                  <small className="text-danger fw-bold d-block mb-2" style={{ fontSize: '12px' }}>Will be permanently removed:</small>
                  <ul className="list-unstyled mb-0" style={{ fontSize: '12px' }}>
                    <li className="mb-1"><i className="fas fa-times text-danger me-2"></i>User account and login credentials</li>
                    <li className="mb-1"><i className="fas fa-times text-danger me-2"></i>Personal information and profile data</li>
                    <li className="mb-1"><i className="fas fa-times text-danger me-2"></i>Role assignments and permissions</li>
                    <li className="text-muted"><i className="fas fa-info-circle me-2"></i><small>Medical records remain in the system</small></li>
                  </ul>
                </div>

                {/* Type to Confirm */}
                <div className="form-group">
                  <label className="form-label" style={{ fontSize: '13px', fontWeight: 600 }}>
                    Type <code className="text-danger">{userToDelete.full_name}</code> to confirm:
                  </label>
                  <input
                    type="text"
                    className="form-control border-danger"
                    placeholder="Enter the user's full name"
                    value={confirmPermanentDelete.typedName || ''}
                    onChange={(e) => setConfirmPermanentDelete({ ...confirmPermanentDelete, typedName: e.target.value })}
                    autoFocus
                  />
                </div>
              </div>

              {/* Modal Footer */}
              <div className="modal-footer bg-light">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => { setConfirmPermanentDelete({ show: false, id: null, confirmed: false, typedName: '' }); setUserToDelete(null); }}
                >
                  <i className="fas fa-times me-1"></i>Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-dark"
                  onClick={confirmPermanentDeleteAction}
                  disabled={confirmPermanentDelete.typedName !== userToDelete.full_name}
                >
                  <i className="fas fa-trash-alt me-1"></i>Permanently Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetModal.show && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1060, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div className="modal-dialog" style={{ maxWidth: '420px' }}>
            <div className="modal-content border-0 shadow">
              <div className="modal-body text-center py-4">
                <i className="fas fa-key" style={{ fontSize: '48px', color: '#ffc107', marginBottom: '16px', display: 'block' }}></i>
                <h5 className="mb-3">Reset Password</h5>
                <div className="input-group mb-2">
                  <input
                    type={showResetPassword ? "text" : "password"}
                    className="form-control"
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    autoFocus
                  />
                  <button
                    type="button"
                    className="btn btn-outline-secondary"
                    onClick={() => setShowResetPassword(!showResetPassword)}
                    tabIndex="-1"
                  >
                    <i className={`fas ${showResetPassword ? "fa-eye-slash" : "fa-eye"}`}></i>
                  </button>
                </div>
              </div>
              <div className="modal-footer border-0 justify-content-center pb-4">
                <button className="btn btn-secondary px-4" onClick={() => { setShowResetModal({ show: false, id: null }); setNewPassword(''); }}>Cancel</button>
                <button className="btn btn-warning px-4" onClick={confirmResetPassword}>Reset Password</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default UserManagement;

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../layout/DashboardLayout';
import { getNavForUser, getBrandForUser, getRoleBadge } from '../../utils/navItems';
import showToast from '../../utils/toast';
import PrimaryButton from '../../components/PrimaryButton';
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
    email: '', full_name: '', phone: '', role: '',
    hospital: '', department: '', district: '',
    password: '', is_active: false,
    // Demographics
    date_of_birth: '', gender: '', nationality: 'Sierra Leonean',
    nin_number: '', marital_status: '', address: '', city: '', state: '', country: 'Sierra Leone',
    // Professional
    qualification: '', specialization: '', license_number: '', years_of_experience: '',
    // Emergency contact
    emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relationship: '',
  });
  const [confirmDeactivate, setConfirmDeactivate] = useState({ show: false, id: null });
  const [confirmPermanentDelete, setConfirmPermanentDelete] = useState({ show: false, id: null, confirmed: false, typedName: '' });
  const [showResetModal, setShowResetModal] = useState({ show: false, id: null });
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [createStep, setCreateStep] = useState(1);
  const [editStep, setEditStep] = useState(1);
  const [editProfilePhoto, setEditProfilePhoto] = useState(null);
  const [editPhotoPreview, setEditPhotoPreview] = useState(null);
  const [editCertificateFile, setEditCertificateFile] = useState(null);
  const [editLicenseFile, setEditLicenseFile] = useState(null);
  const [editCvFile, setEditCvFile] = useState(null);
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [certificateFile, setCertificateFile] = useState(null);
  const [licenseFile, setLicenseFile] = useState(null);
  const [cvFile, setCvFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);

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

  const handleCreateUser = async () => {
    try {
      const fd = new FormData();
      const textFields = [
        'email','full_name','phone','role','hospital','department','district','password','is_active',
        'date_of_birth','gender','nationality','nin_number','marital_status','address','city','state','country',
        'qualification','specialization','license_number','years_of_experience',
        'emergency_contact_name','emergency_contact_phone','emergency_contact_relationship',
      ];
      textFields.forEach(k => { if (formData[k] !== '' && formData[k] !== null && formData[k] !== undefined) fd.append(k, formData[k]); });
      if (profilePhoto)   fd.append('profile_photo', profilePhoto);
      if (certificateFile) fd.append('certificate', certificateFile);
      if (licenseFile)    fd.append('license_document', licenseFile);
      if (cvFile)         fd.append('cv', cvFile);

      const response = await apiCall('/admin/users/', { method: 'POST', body: fd });
      if (response.ok) {
        setShowCreateModal(false);
        resetForm();
        fetchUsers();
        showToast.created('User');
      } else {
        const data = await response.json();
        const msg = Object.values(data).flat().join(', ');
        showToast.createError(msg || 'User');
      }
    } catch {
      showToast.networkError();
    }
  };

  const handleUpdateUser = async () => {
    try {
      const fd = new FormData();
      const textFields = [
        'full_name','phone','role','hospital','department','district','is_active',
        'date_of_birth','gender','nationality','nin_number','marital_status','address','city','state','country',
        'qualification','specialization','license_number','years_of_experience',
        'emergency_contact_name','emergency_contact_phone','emergency_contact_relationship',
      ];
      textFields.forEach(k => { if (formData[k] !== '' && formData[k] !== null && formData[k] !== undefined) fd.append(k, formData[k]); });
      if (editProfilePhoto)    fd.append('profile_photo', editProfilePhoto);
      if (editCertificateFile) fd.append('certificate', editCertificateFile);
      if (editLicenseFile)     fd.append('license_document', editLicenseFile);
      if (editCvFile)          fd.append('cv', editCvFile);

      const response = await apiCall(`/admin/users/${selectedUser.id}/`, { method: 'PUT', body: fd });
      if (response.ok) {
        setShowEditModal(false);
        setSelectedUser(null);
        resetForm();
        setEditStep(1);
        setEditProfilePhoto(null); setEditPhotoPreview(null);
        setEditCertificateFile(null); setEditLicenseFile(null); setEditCvFile(null);
        fetchUsers();
        showToast.updated('User');
      } else {
        const data = await response.json();
        const msg = Object.values(data).flat().join(', ');
        showToast.updateError(msg || 'User');
      }
    } catch {
      showToast.networkError();
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
        showToast.deactivated('User');
      } else {
        showToast.updateError('User');
      }
    } catch {
      showToast.networkError();
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
        showToast.activated('User');
      } else {
        showToast.updateError('User');
      }
    } catch {
      showToast.networkError();
    }
  };

  const handleResetPassword = (userId) => {
    setShowResetModal({ show: true, id: userId });
    setNewPassword('');
  };

  const confirmResetPassword = async () => {
    if (!newPassword) {
      showToast.warning('Please enter a new password.', 'Password Required');
      return;
    }
    try {
      const response = await apiCall(`/admin/users/${showResetModal.id}/reset_password/`, {
        method: 'POST',
        body: JSON.stringify({ password: newPassword })
      });
      if (response.ok) {
        showToast.success('Password has been reset successfully.', 'Password Reset');
      } else {
        showToast.updateError('password');
      }
    } catch {
      showToast.networkError();
    } finally {
      setShowResetModal({ show: false, id: null });
      setNewPassword('');
    }
  };

  const openEditModal = async (user) => {
    setSelectedUser(user);
    setEditStep(1);
    setEditProfilePhoto(null); setEditPhotoPreview(null);
    setEditCertificateFile(null); setEditLicenseFile(null); setEditCvFile(null);
    // Start with basic user fields
    const base = {
      email: user.email || '', full_name: user.full_name || '',
      phone: user.phone || '', role: user.role || '',
      hospital: user.hospital || '', department: user.department || '',
      district: user.district || '', is_active: user.is_active,
      password: '',
      date_of_birth: '', gender: '', nationality: 'Sierra Leonean',
      nin_number: '', marital_status: '', address: '', city: '', state: '', country: 'Sierra Leone',
      qualification: '', specialization: '', license_number: '', years_of_experience: '',
      emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relationship: '',
    };
    setFormData(base);
    // Try to load profile data
    try {
      const res = await apiCall(`/admin/users/${user.id}/profile/`);
      if (res.ok) {
        const p = await res.json();
        setFormData(prev => ({
          ...prev,
          date_of_birth: p.date_of_birth || '',
          gender: p.gender || '',
          nationality: p.nationality || 'Sierra Leonean',
          nin_number: p.nin_number || '',
          marital_status: p.marital_status || '',
          address: p.address || '',
          city: p.city || '',
          state: p.state || '',
          country: p.country || 'Sierra Leone',
          qualification: p.qualification || '',
          specialization: p.specialization || '',
          license_number: p.license_number || '',
          years_of_experience: p.years_of_experience || '',
          emergency_contact_name: p.emergency_contact_name || '',
          emergency_contact_phone: p.emergency_contact_phone || '',
          emergency_contact_relationship: p.emergency_contact_relationship || '',
        }));
        if (p.image) setEditPhotoPreview(p.image);
      }
    } catch { /* profile load failed silently */ }
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      email: '', full_name: '', phone: '', role: '',
      hospital: '', department: '', district: '',
      password: '', is_active: false,
      date_of_birth: '', gender: '', nationality: 'Sierra Leonean',
      nin_number: '', marital_status: '', address: '', city: '', state: '', country: 'Sierra Leone',
      qualification: '', specialization: '', license_number: '', years_of_experience: '',
      emergency_contact_name: '', emergency_contact_phone: '', emergency_contact_relationship: '',
    });
    setCreateStep(1);
    setProfilePhoto(null);
    setCertificateFile(null);
    setLicenseFile(null);
    setCvFile(null);
    setPhotoPreview(null);
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
                <PrimaryButton icon="fas fa-user-plus" onClick={() => setShowCreateModal(true)}>
                  Create New User
                </PrimaryButton>
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
                  autoComplete="off"
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

      {/* Create User Modal — 4-step */}
      {showCreateModal && (() => {
        const steps = [
          { icon: 'fas fa-user', label: 'Account' },
          { icon: 'fas fa-id-card', label: 'Demographics' },
          { icon: 'fas fa-briefcase-medical', label: 'Professional' },
          { icon: 'fas fa-file-upload', label: 'Documents' },
        ];
        const inputStyle = { fontSize: 13, borderRadius: 8, border: '1.5px solid #e2e8f0', padding: '9px 12px', width: '100%', outline: 'none', background: '#fff', color: '#0f172a' };
        const labelStyle = { fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4, display: 'block' };
        const sectionHead = (icon, title) => (
          <div style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 10, borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className={icon} style={{ fontSize: 13, color: '#4361ee' }}></i>
            </div>
            <span style={{ fontWeight: 700, fontSize: 13, color: '#1e293b', lineHeight: 1 }}>{title}</span>
          </div>
        );
        const fileInput = (label, accept, file, setFile, icon) => (
          <div>
            <span style={labelStyle}>{label}</span>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: '1.5px dashed #cbd5e1', background: '#f8fafc', cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor='#4361ee'}
              onMouseLeave={e => e.currentTarget.style.borderColor='#cbd5e1'}>
              <input type="file" accept={accept} style={{ display: 'none' }} onChange={e => setFile(e.target.files[0] || null)} />
              <div style={{ width: 32, height: 32, borderRadius: 8, background: file ? '#eff6ff' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className={file ? 'fas fa-check-circle' : icon} style={{ fontSize: 14, color: file ? '#4361ee' : '#94a3b8' }}></i>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: file ? '#0f172a' : '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {file ? file.name : 'Click to upload'}
                </div>
                {file && <div style={{ fontSize: 10, color: '#94a3b8' }}>{(file.size / 1024).toFixed(1)} KB</div>}
              </div>
              {file && <button type="button" onClick={e => { e.preventDefault(); setFile(null); }} style={{ border: 'none', background: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 12, padding: 0 }}><i className="fas fa-times"></i></button>}
            </label>
          </div>
        );
        return (
          <div onClick={() => { setShowCreateModal(false); resetForm(); setCreateStep(1); }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(3px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div onClick={e => e.stopPropagation()}
              style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 680, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 60px rgba(0,0,0,0.2)', overflow: 'hidden' }}>

              {/* Header */}
              <div style={{ padding: '22px 28px 0', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                  <div>
                    <h5 style={{ margin: 0, fontWeight: 800, fontSize: 17, color: '#0f172a' }}>Create New Staff Member</h5>
                    <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>Fill in all sections to register a new system user</p>
                  </div>
                  <button type="button" onClick={() => { setShowCreateModal(false); resetForm(); setCreateStep(1); }}
                    style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className="fas fa-times" style={{ fontSize: 13, color: '#64748b' }}></i>
                  </button>
                </div>
                {/* Step indicators */}
                <div style={{ display: 'flex', gap: 0, marginBottom: -1 }}>
                  {steps.map((s, i) => (
                    <div key={i} onClick={() => setCreateStep(i + 1)}
                      style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                        padding: '10px 8px', cursor: 'pointer',
                        borderBottom: createStep === i + 1 ? '2px solid #4361ee' : '2px solid transparent',
                        color: createStep === i + 1 ? '#4361ee' : createStep > i + 1 ? '#16a34a' : '#94a3b8',
                        transition: 'all 0.15s' }}>
                      <i className={createStep > i + 1 ? 'fas fa-check-circle' : s.icon} style={{ fontSize: 18, marginBottom: 4 }}></i>
                      <span style={{ fontSize: 11, fontWeight: 700 }}>{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Body */}
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <div style={{ padding: '24px 28px' }}>

                  {/* ── STEP 1: Account ── */}
                  {createStep === 1 && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      {sectionHead('fas fa-user-circle', 'Account Information')}
                      <div>
                        <span style={labelStyle}>Full Name *</span>
                        <input style={inputStyle} type="text" placeholder="e.g. John Koroma" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
                      </div>
                      <div>
                        <span style={labelStyle}>Email Address *</span>
                        <input style={inputStyle} type="email" placeholder="user@hospital.gov.sl" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
                      </div>
                      <div>
                        <span style={labelStyle}>Phone Number *</span>
                        <input style={inputStyle} type="tel" placeholder="+232 XX XXX XXXX" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                      </div>
                      <div>
                        <span style={labelStyle}>Role *</span>
                        <select style={inputStyle} value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                          <option value="">Select Role</option>
                          {roles.map(r => <option key={r.id} value={r.id}>{r.display_name || r.name}</option>)}
                        </select>
                      </div>
                      <div style={{ position: 'relative' }}>
                        <span style={labelStyle}>Password *</span>
                        <div style={{ position: 'relative' }}>
                          <input style={{...inputStyle, paddingRight: 40}} type={showPassword ? 'text' : 'password'} placeholder="Minimum 8 characters" value={formData.password} onChange={e => setFormData({...formData, password: e.target.value})} />
                          <button type="button" onClick={() => setShowPassword(!showPassword)}
                            style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}>
                            <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                          </button>
                        </div>
                      </div>
                      <div></div>
                      {selectedRoleName === 'district_admin' && (
                        <div style={{ gridColumn: '1/-1' }}>
                          <span style={labelStyle}>Assigned District *</span>
                          <select style={inputStyle} value={formData.district} onChange={e => setFormData({...formData, district: e.target.value})}>
                            <option value="">Select District</option>
                            {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                          </select>
                        </div>
                      )}
                      {['hospital_admin','doctor','nurse','receptionist','lab_technician','pharmacist','triage'].includes(selectedRoleName) && (
                        <div style={{ gridColumn: '1/-1' }}>
                          <span style={labelStyle}>Assigned Hospital *</span>
                          <select style={inputStyle} value={formData.hospital} onChange={e => setFormData({...formData, hospital: e.target.value, department: ''})}>
                            <option value="">Select Hospital</option>
                            {hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                          </select>
                        </div>
                      )}
                      {['doctor','nurse','lab_technician','pharmacist'].includes(selectedRoleName) && formData.hospital && (
                        <div style={{ gridColumn: '1/-1' }}>
                          <span style={labelStyle}>Department *</span>
                          <select style={inputStyle} value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})}>
                            <option value="">Select Department</option>
                            {departments.filter(d => d.hospital === parseInt(formData.hospital)).map(d => <option key={d.id} value={d.id}>{d.name_display}</option>)}
                          </select>
                        </div>
                      )}
                      <div style={{ gridColumn: '1/-1' }}>
                        <div style={{ background: formData.is_active ? '#f0fdf4' : '#fffbeb', border: `1.5px solid ${formData.is_active ? '#86efac' : '#fde68a'}`, borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <i className={`fas ${formData.is_active ? 'fa-lock-open' : 'fa-lock'}`} style={{ fontSize: 16, color: formData.is_active ? '#16a34a' : '#d97706' }}></i>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{formData.is_active ? 'Login Access Enabled' : 'Login Access Disabled'}</div>
                              <div style={{ fontSize: 11, color: '#64748b' }}>{formData.is_active ? 'User can log in immediately.' : 'User cannot log in until activated.'}</div>
                            </div>
                          </div>
                          <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} style={{ width: 40, height: 22, cursor: 'pointer', accentColor: '#4361ee' }} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* ── STEP 2: Demographics ── */}
                  {createStep === 2 && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      {sectionHead('fas fa-id-card', 'Personal & Demographic Information')}
                      <div>
                        <span style={labelStyle}>Date of Birth</span>
                        <input style={inputStyle} type="date" value={formData.date_of_birth} onChange={e => setFormData({...formData, date_of_birth: e.target.value})} />
                      </div>
                      <div>
                        <span style={labelStyle}>Gender</span>
                        <select style={inputStyle} value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}>
                          <option value="">Select Gender</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div>
                        <span style={labelStyle}>NIN Number</span>
                        <input style={inputStyle} type="text" placeholder="National Identification Number" value={formData.nin_number} onChange={e => setFormData({...formData, nin_number: e.target.value})} />
                      </div>
                      <div>
                        <span style={labelStyle}>Marital Status</span>
                        <select style={inputStyle} value={formData.marital_status} onChange={e => setFormData({...formData, marital_status: e.target.value})}>
                          <option value="">Select Status</option>
                          <option value="single">Single</option>
                          <option value="married">Married</option>
                          <option value="divorced">Divorced</option>
                          <option value="widowed">Widowed</option>
                        </select>
                      </div>
                      <div>
                        <span style={labelStyle}>Nationality</span>
                        <input style={inputStyle} type="text" placeholder="e.g. Sierra Leonean" value={formData.nationality} onChange={e => setFormData({...formData, nationality: e.target.value})} />
                      </div>
                      <div>
                        <span style={labelStyle}>Country</span>
                        <input style={inputStyle} type="text" placeholder="e.g. Sierra Leone" value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})} />
                      </div>
                      <div>
                        <span style={labelStyle}>City / Town</span>
                        <input style={inputStyle} type="text" placeholder="e.g. Freetown" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} />
                      </div>
                      <div>
                        <span style={labelStyle}>Province / State</span>
                        <select style={inputStyle} value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})}>
                          <option value="">Select Province</option>
                          <option value="Western Area Urban">Western Area Urban</option>
                          <option value="Western Area Rural">Western Area Rural</option>
                          <option value="Northern Province">Northern Province</option>
                          <option value="North West Province">North West Province</option>
                          <option value="Southern Province">Southern Province</option>
                          <option value="Eastern Province">Eastern Province</option>
                        </select>
                      </div>
                      <div style={{ gridColumn: '1/-1' }}>
                        <span style={labelStyle}>Residential Address</span>
                        <input style={inputStyle} type="text" placeholder="Full residential address" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
                      </div>

                      {sectionHead('fas fa-phone-alt', 'Emergency Contact')}
                      <div>
                        <span style={labelStyle}>Contact Name</span>
                        <input style={inputStyle} type="text" placeholder="Full name" value={formData.emergency_contact_name} onChange={e => setFormData({...formData, emergency_contact_name: e.target.value})} />
                      </div>
                      <div>
                        <span style={labelStyle}>Contact Phone</span>
                        <input style={inputStyle} type="tel" placeholder="Phone number" value={formData.emergency_contact_phone} onChange={e => setFormData({...formData, emergency_contact_phone: e.target.value})} />
                      </div>
                      <div style={{ gridColumn: '1/-1' }}>
                        <span style={labelStyle}>Relationship</span>
                        <select style={inputStyle} value={formData.emergency_contact_relationship} onChange={e => setFormData({...formData, emergency_contact_relationship: e.target.value})}>
                          <option value="">Select Relationship</option>
                          <option value="Spouse">Spouse</option>
                          <option value="Parent">Parent</option>
                          <option value="Child">Child</option>
                          <option value="Sibling">Sibling</option>
                          <option value="Grandparent">Grandparent</option>
                          <option value="Aunt/Uncle">Aunt / Uncle</option>
                          <option value="Nephew/Niece">Nephew / Niece</option>
                          <option value="Cousin">Cousin</option>
                          <option value="Friend">Friend</option>
                          <option value="Colleague">Colleague</option>
                          <option value="Guardian">Guardian</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* ── STEP 3: Professional ── */}
                  {createStep === 3 && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      {sectionHead('fas fa-stethoscope', 'Professional Information')}
                      <div>
                        <span style={labelStyle}>Qualification</span>
                        <input style={inputStyle} type="text" placeholder="e.g. MBBS, BSc Nursing, MD" value={formData.qualification} onChange={e => setFormData({...formData, qualification: e.target.value})} />
                      </div>
                      <div>
                        <span style={labelStyle}>Specialization</span>
                        <input style={inputStyle} type="text" placeholder="e.g. Cardiology, Paediatrics" value={formData.specialization} onChange={e => setFormData({...formData, specialization: e.target.value})} />
                      </div>
                      <div>
                        <span style={labelStyle}>License / Registration Number</span>
                        <input style={inputStyle} type="text" placeholder="Professional license number" value={formData.license_number} onChange={e => setFormData({...formData, license_number: e.target.value})} />
                      </div>
                      <div>
                        <span style={labelStyle}>Years of Experience</span>
                        <input style={inputStyle} type="number" min="0" max="60" placeholder="e.g. 5" value={formData.years_of_experience} onChange={e => setFormData({...formData, years_of_experience: e.target.value})} />
                      </div>
                      <div style={{ gridColumn: '1/-1', background: '#f8fafc', borderRadius: 10, padding: 14, border: '1px solid #e2e8f0' }}>
                        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 6 }}><i className="fas fa-info-circle me-1 text-primary"></i>Upload supporting documents in the next step.</div>
                        <div style={{ fontSize: 12, color: '#94a3b8' }}>Accepted formats: PDF, JPG, PNG, DOC, DOCX</div>
                      </div>
                    </div>
                  )}

                  {/* ── STEP 4: Documents ── */}
                  {createStep === 4 && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
                      {sectionHead('fas fa-folder-open', 'Upload Documents & Photo')}
                      {/* Profile photo */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 14, background: '#f8fafc', borderRadius: 12, border: '1.5px solid #e2e8f0' }}>
                        <div style={{ width: 72, height: 72, borderRadius: 16, overflow: 'hidden', flexShrink: 0, background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {photoPreview
                            ? <img src={photoPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            : <i className="fas fa-user" style={{ fontSize: 28, color: '#94a3b8' }}></i>}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', marginBottom: 4 }}>Profile Photo</div>
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1.5px solid #4361ee', background: '#eff6ff', color: '#4361ee', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                              const f = e.target.files[0];
                              setProfilePhoto(f || null);
                              setPhotoPreview(f ? URL.createObjectURL(f) : null);
                            }} />
                            <i className="fas fa-camera"></i> {profilePhoto ? 'Change Photo' : 'Upload Photo'}
                          </label>
                          {profilePhoto && <button type="button" onClick={() => { setProfilePhoto(null); setPhotoPreview(null); }} style={{ marginLeft: 8, border: 'none', background: 'none', color: '#dc2626', fontSize: 12, cursor: 'pointer' }}>Remove</button>}
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        {fileInput('Professional Certificate', '.pdf,.jpg,.jpeg,.png,.doc,.docx', certificateFile, setCertificateFile, 'fas fa-certificate')}
                        {fileInput('License / Permit Document', '.pdf,.jpg,.jpeg,.png', licenseFile, setLicenseFile, 'fas fa-id-badge')}
                        {fileInput('Curriculum Vitae (CV)', '.pdf,.doc,.docx', cvFile, setCvFile, 'fas fa-file-alt')}
                        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 10, padding: 12, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                          <i className="fas fa-exclamation-triangle" style={{ color: '#d97706', marginTop: 1 }}></i>
                          <div style={{ fontSize: 11, color: '#92400e', lineHeight: 1.5 }}>All document uploads are optional but strongly recommended for clinical staff (doctors, nurses, pharmacists).</div>
                        </div>
                      </div>
                    </div>
                  )}

                </div>

                {/* Footer */}
                <div style={{ padding: '16px 28px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fafbfc' }}>
                  <button type="button" onClick={() => createStep > 1 ? setCreateStep(s => s - 1) : (setShowCreateModal(false), resetForm())}
                    style={{ padding: '9px 20px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    {createStep > 1 ? <><i className="fas fa-arrow-left me-2"></i>Back</> : 'Cancel'}
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {steps.map((_, i) => (
                      <div key={i} style={{ width: createStep === i+1 ? 20 : 6, height: 6, borderRadius: 3, background: createStep > i ? '#4361ee' : '#e2e8f0', transition: 'all 0.2s' }}></div>
                    ))}
                  </div>
                  {createStep < 4 ? (
                    <button type="button" onClick={() => setCreateStep(s => s + 1)}
                      style={{ padding: '9px 22px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#4361ee,#3a0ca3)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(67,97,238,0.3)' }}>
                      Next <i className="fas fa-arrow-right ms-2"></i>
                    </button>
                  ) : (
                    <button type="button" onClick={handleCreateUser}
                      style={{ padding: '9px 22px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#16a34a,#15803d)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(22,163,74,0.3)' }}>
                      <i className="fas fa-user-plus me-2"></i>Create Staff Member
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Edit User Modal — 4-step */}
      {showEditModal && selectedUser && (() => {
        const steps = [
          { icon: 'fas fa-user', label: 'Account' },
          { icon: 'fas fa-id-card', label: 'Demographics' },
          { icon: 'fas fa-briefcase-medical', label: 'Professional' },
          { icon: 'fas fa-file-upload', label: 'Documents' },
        ];
        const inputStyle = { fontSize: 13, borderRadius: 8, border: '1.5px solid #e2e8f0', padding: '9px 12px', width: '100%', outline: 'none', background: '#fff', color: '#0f172a' };
        const labelStyle = { fontSize: 12, fontWeight: 600, color: '#475569', marginBottom: 4, display: 'block' };
        const sectionHead = (icon, title) => (
          <div style={{ gridColumn: '1/-1', display: 'flex', alignItems: 'center', gap: 8, paddingBottom: 10, borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ width: 28, height: 28, borderRadius: 8, background: '#e0f2fe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <i className={icon} style={{ fontSize: 13, color: '#0284c7' }}></i>
            </div>
            <span style={{ fontWeight: 700, fontSize: 13, color: '#1e293b', lineHeight: 1 }}>{title}</span>
          </div>
        );
        const fileInput = (label, accept, file, setFile, icon, existingUrl) => (
          <div>
            <span style={labelStyle}>{label}</span>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', borderRadius: 10, border: '1.5px dashed #cbd5e1', background: '#f8fafc', cursor: 'pointer', transition: 'all 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.borderColor='#0284c7'}
              onMouseLeave={e => e.currentTarget.style.borderColor='#cbd5e1'}>
              <input type="file" accept={accept} style={{ display: 'none' }} onChange={e => setFile(e.target.files[0] || null)} />
              <div style={{ width: 32, height: 32, borderRadius: 8, background: file ? '#e0f2fe' : '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className={file ? 'fas fa-check-circle' : icon} style={{ fontSize: 14, color: file ? '#0284c7' : '#94a3b8' }}></i>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: file ? '#0f172a' : '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {file ? file.name : existingUrl ? 'Existing file — click to replace' : 'Click to upload'}
                </div>
                {file && <div style={{ fontSize: 10, color: '#94a3b8' }}>{(file.size / 1024).toFixed(1)} KB</div>}
              </div>
              {file && <button type="button" onClick={e => { e.preventDefault(); setFile(null); }} style={{ border: 'none', background: 'none', color: '#dc2626', cursor: 'pointer', fontSize: 12, padding: 0 }}><i className="fas fa-times"></i></button>}
            </label>
          </div>
        );
        const editSelectedRoleName = roles.find(r => r.id === parseInt(formData.role))?.name || '';
        return (
          <div onClick={() => { setShowEditModal(false); setSelectedUser(null); resetForm(); setEditStep(1); }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(3px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div onClick={e => e.stopPropagation()}
              style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 680, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 60px rgba(0,0,0,0.2)', overflow: 'hidden' }}>

              {/* Header */}
              <div style={{ padding: '22px 28px 0', borderBottom: '1px solid #f1f5f9' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                  <div>
                    <h5 style={{ margin: 0, fontWeight: 800, fontSize: 17, color: '#0f172a' }}>Edit Staff Member</h5>
                    <p style={{ margin: 0, fontSize: 12, color: '#94a3b8' }}>{selectedUser.full_name} · {selectedUser.employee_id}</p>
                  </div>
                  <button type="button" onClick={() => { setShowEditModal(false); setSelectedUser(null); resetForm(); setEditStep(1); }}
                    style={{ width: 32, height: 32, borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <i className="fas fa-times" style={{ fontSize: 13, color: '#64748b' }}></i>
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 0, marginBottom: -1 }}>
                  {steps.map((s, i) => (
                    <div key={i} onClick={() => setEditStep(i + 1)}
                      style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10px 8px', cursor: 'pointer',
                        borderBottom: editStep === i + 1 ? '2px solid #0284c7' : '2px solid transparent',
                        color: editStep === i + 1 ? '#0284c7' : editStep > i + 1 ? '#16a34a' : '#94a3b8', transition: 'all 0.15s' }}>
                      <i className={editStep > i + 1 ? 'fas fa-check-circle' : s.icon} style={{ fontSize: 18, marginBottom: 4 }}></i>
                      <span style={{ fontSize: 11, fontWeight: 700 }}>{s.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Body */}
              <div style={{ flex: 1, overflowY: 'auto' }}>
                <div style={{ padding: '24px 28px' }}>

                  {/* Step 1: Account */}
                  {editStep === 1 && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      {sectionHead('fas fa-user-circle', 'Account Information')}
                      <div>
                        <span style={labelStyle}>Full Name</span>
                        <input style={inputStyle} type="text" value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} />
                      </div>
                      <div>
                        <span style={labelStyle}>Email (read-only)</span>
                        <input style={{...inputStyle, background: '#f8fafc', color: '#94a3b8'}} type="email" value={formData.email} disabled />
                      </div>
                      <div>
                        <span style={labelStyle}>Phone</span>
                        <input style={inputStyle} type="tel" value={formData.phone} onChange={e => setFormData({...formData, phone: e.target.value})} />
                      </div>
                      <div>
                        <span style={labelStyle}>Role</span>
                        <select style={inputStyle} value={formData.role} onChange={e => setFormData({...formData, role: e.target.value})}>
                          <option value="">Select Role</option>
                          {roles.map(r => <option key={r.id} value={r.id}>{r.display_name || r.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <span style={labelStyle}>Employee ID (read-only)</span>
                        <input style={{...inputStyle, background: '#f8fafc', color: '#94a3b8'}} value={selectedUser.employee_id || 'N/A'} disabled />
                      </div>
                      <div></div>
                      {editSelectedRoleName === 'district_admin' && (
                        <div style={{ gridColumn: '1/-1' }}>
                          <span style={labelStyle}>Assigned District</span>
                          <select style={inputStyle} value={formData.district} onChange={e => setFormData({...formData, district: e.target.value})}>
                            <option value="">Select District</option>
                            {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                          </select>
                        </div>
                      )}
                      {['hospital_admin','doctor','nurse','receptionist','lab_technician','pharmacist','triage'].includes(editSelectedRoleName) && (
                        <div style={{ gridColumn: '1/-1' }}>
                          <span style={labelStyle}>Assigned Hospital</span>
                          <select style={inputStyle} value={formData.hospital} onChange={e => setFormData({...formData, hospital: e.target.value, department: ''})}>
                            <option value="">Select Hospital</option>
                            {hospitals.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                          </select>
                        </div>
                      )}
                      {['doctor','nurse','lab_technician','pharmacist'].includes(editSelectedRoleName) && formData.hospital && (
                        <div style={{ gridColumn: '1/-1' }}>
                          <span style={labelStyle}>Department</span>
                          <select style={inputStyle} value={formData.department} onChange={e => setFormData({...formData, department: e.target.value})}>
                            <option value="">Select Department</option>
                            {departments.filter(d => d.hospital === parseInt(formData.hospital)).map(d => <option key={d.id} value={d.id}>{d.name_display}</option>)}
                          </select>
                        </div>
                      )}
                      <div style={{ gridColumn: '1/-1' }}>
                        <div style={{ background: formData.is_active ? '#f0fdf4' : '#fffbeb', border: `1.5px solid ${formData.is_active ? '#86efac' : '#fde68a'}`, borderRadius: 10, padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <i className={`fas ${formData.is_active ? 'fa-lock-open' : 'fa-lock'}`} style={{ fontSize: 16, color: formData.is_active ? '#16a34a' : '#d97706' }}></i>
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{formData.is_active ? 'Login Access Enabled' : 'Login Access Disabled'}</div>
                              <div style={{ fontSize: 11, color: '#64748b' }}>{formData.is_active ? 'User can log in immediately.' : 'User cannot log in until activated.'}</div>
                            </div>
                          </div>
                          <input type="checkbox" checked={formData.is_active} onChange={e => setFormData({...formData, is_active: e.target.checked})} style={{ width: 40, height: 22, cursor: 'pointer', accentColor: '#0284c7' }} />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Demographics */}
                  {editStep === 2 && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      {sectionHead('fas fa-id-card', 'Personal & Demographic Information')}
                      <div><span style={labelStyle}>Date of Birth</span><input style={inputStyle} type="date" value={formData.date_of_birth} onChange={e => setFormData({...formData, date_of_birth: e.target.value})} /></div>
                      <div><span style={labelStyle}>Gender</span>
                        <select style={inputStyle} value={formData.gender} onChange={e => setFormData({...formData, gender: e.target.value})}>
                          <option value="">Select Gender</option>
                          <option value="male">Male</option>
                          <option value="female">Female</option>
                          <option value="other">Other</option>
                        </select>
                      </div>
                      <div><span style={labelStyle}>NIN Number</span><input style={inputStyle} type="text" placeholder="National Identification Number" value={formData.nin_number} onChange={e => setFormData({...formData, nin_number: e.target.value})} /></div>
                      <div><span style={labelStyle}>Marital Status</span>
                        <select style={inputStyle} value={formData.marital_status} onChange={e => setFormData({...formData, marital_status: e.target.value})}>
                          <option value="">Select Status</option>
                          <option value="single">Single</option>
                          <option value="married">Married</option>
                          <option value="divorced">Divorced</option>
                          <option value="widowed">Widowed</option>
                        </select>
                      </div>
                      <div><span style={labelStyle}>Nationality</span><input style={inputStyle} type="text" value={formData.nationality} onChange={e => setFormData({...formData, nationality: e.target.value})} /></div>
                      <div><span style={labelStyle}>Country</span><input style={inputStyle} type="text" value={formData.country} onChange={e => setFormData({...formData, country: e.target.value})} /></div>
                      <div><span style={labelStyle}>City / Town</span><input style={inputStyle} type="text" value={formData.city} onChange={e => setFormData({...formData, city: e.target.value})} /></div>
                      <div><span style={labelStyle}>Province / State</span>
                        <select style={inputStyle} value={formData.state} onChange={e => setFormData({...formData, state: e.target.value})}>
                          <option value="">Select Province</option>
                          <option value="Western Area Urban">Western Area Urban</option>
                          <option value="Western Area Rural">Western Area Rural</option>
                          <option value="Northern Province">Northern Province</option>
                          <option value="North West Province">North West Province</option>
                          <option value="Southern Province">Southern Province</option>
                          <option value="Eastern Province">Eastern Province</option>
                        </select>
                      </div>
                      <div style={{ gridColumn: '1/-1' }}><span style={labelStyle}>Residential Address</span><input style={inputStyle} type="text" value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} /></div>
                      {sectionHead('fas fa-phone-alt', 'Emergency Contact')}
                      <div><span style={labelStyle}>Contact Name</span><input style={inputStyle} type="text" value={formData.emergency_contact_name} onChange={e => setFormData({...formData, emergency_contact_name: e.target.value})} /></div>
                      <div><span style={labelStyle}>Contact Phone</span><input style={inputStyle} type="tel" value={formData.emergency_contact_phone} onChange={e => setFormData({...formData, emergency_contact_phone: e.target.value})} /></div>
                      <div style={{ gridColumn: '1/-1' }}><span style={labelStyle}>Relationship</span>
                        <select style={inputStyle} value={formData.emergency_contact_relationship} onChange={e => setFormData({...formData, emergency_contact_relationship: e.target.value})}>
                          <option value="">Select Relationship</option>
                          <option value="Spouse">Spouse</option><option value="Parent">Parent</option><option value="Child">Child</option>
                          <option value="Sibling">Sibling</option><option value="Grandparent">Grandparent</option>
                          <option value="Aunt/Uncle">Aunt / Uncle</option><option value="Nephew/Niece">Nephew / Niece</option>
                          <option value="Cousin">Cousin</option><option value="Friend">Friend</option>
                          <option value="Colleague">Colleague</option><option value="Guardian">Guardian</option><option value="Other">Other</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {/* Step 3: Professional */}
                  {editStep === 3 && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
                      {sectionHead('fas fa-stethoscope', 'Professional Information')}
                      <div><span style={labelStyle}>Qualification</span><input style={inputStyle} type="text" placeholder="e.g. MBBS, BSc Nursing" value={formData.qualification} onChange={e => setFormData({...formData, qualification: e.target.value})} /></div>
                      <div><span style={labelStyle}>Specialization</span><input style={inputStyle} type="text" placeholder="e.g. Cardiology" value={formData.specialization} onChange={e => setFormData({...formData, specialization: e.target.value})} /></div>
                      <div><span style={labelStyle}>License / Registration Number</span><input style={inputStyle} type="text" value={formData.license_number} onChange={e => setFormData({...formData, license_number: e.target.value})} /></div>
                      <div><span style={labelStyle}>Years of Experience</span><input style={inputStyle} type="number" min="0" max="60" value={formData.years_of_experience} onChange={e => setFormData({...formData, years_of_experience: e.target.value})} /></div>
                    </div>
                  )}

                  {/* Step 4: Documents */}
                  {editStep === 4 && (
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
                      {sectionHead('fas fa-folder-open', 'Update Documents & Photo')}
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, padding: 14, background: '#f8fafc', borderRadius: 12, border: '1.5px solid #e2e8f0' }}>
                        <div style={{ width: 72, height: 72, borderRadius: 16, overflow: 'hidden', flexShrink: 0, background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          {editPhotoPreview ? <img src={editPhotoPreview} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <i className="fas fa-user" style={{ fontSize: 28, color: '#94a3b8' }}></i>}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a', marginBottom: 4 }}>Profile Photo</div>
                          <label style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 8, border: '1.5px solid #0284c7', background: '#e0f2fe', color: '#0284c7', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
                            <input type="file" accept="image/*" style={{ display: 'none' }} onChange={e => { const f = e.target.files[0]; setEditProfilePhoto(f || null); setEditPhotoPreview(f ? URL.createObjectURL(f) : editPhotoPreview); }} />
                            <i className="fas fa-camera"></i> {editProfilePhoto ? 'Change Photo' : 'Update Photo'}
                          </label>
                          {editProfilePhoto && <button type="button" onClick={() => { setEditProfilePhoto(null); }} style={{ marginLeft: 8, border: 'none', background: 'none', color: '#dc2626', fontSize: 12, cursor: 'pointer' }}>Remove new</button>}
                        </div>
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        {fileInput('Professional Certificate', '.pdf,.jpg,.jpeg,.png,.doc,.docx', editCertificateFile, setEditCertificateFile, 'fas fa-certificate', null)}
                        {fileInput('License / Permit Document', '.pdf,.jpg,.jpeg,.png', editLicenseFile, setEditLicenseFile, 'fas fa-id-badge', null)}
                        {fileInput('Curriculum Vitae (CV)', '.pdf,.doc,.docx', editCvFile, setEditCvFile, 'fas fa-file-alt', null)}
                        <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, padding: 12, display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                          <i className="fas fa-info-circle" style={{ color: '#0284c7', marginTop: 1 }}></i>
                          <div style={{ fontSize: 11, color: '#0c4a6e', lineHeight: 1.5 }}>Only upload new files to replace existing ones. Leave blank to keep current documents.</div>
                        </div>
                      </div>
                    </div>
                  )}

                </div>

                {/* Footer */}
                <div style={{ padding: '16px 28px', borderTop: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fafbfc' }}>
                  <button type="button" onClick={() => editStep > 1 ? setEditStep(s => s - 1) : (setShowEditModal(false), setSelectedUser(null), resetForm(), setEditStep(1))}
                    style={{ padding: '9px 20px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#f8fafc', color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
                    {editStep > 1 ? <><i className="fas fa-arrow-left me-2"></i>Back</> : 'Cancel'}
                  </button>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    {steps.map((_, i) => (<div key={i} style={{ width: editStep === i+1 ? 20 : 6, height: 6, borderRadius: 3, background: editStep > i ? '#0284c7' : '#e2e8f0', transition: 'all 0.2s' }}></div>))}
                  </div>
                  {editStep < 4 ? (
                    <button type="button" onClick={() => setEditStep(s => s + 1)}
                      style={{ padding: '9px 22px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#0284c7,#0369a1)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(2,132,199,0.3)' }}>
                      Next <i className="fas fa-arrow-right ms-2"></i>
                    </button>
                  ) : (
                    <button type="button" onClick={handleUpdateUser}
                      style={{ padding: '9px 22px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#16a34a,#15803d)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 12px rgba(22,163,74,0.3)' }}>
                      <i className="fas fa-save me-2"></i>Save Changes
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
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

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../layout/DashboardLayout';
import showToast from '../../utils/toast';
import ConfirmModal from '../../components/ConfirmModal';

// Permission Category Component for grouping permissions
function PermissionCategory({ title, icon, color, perms, selected, onToggle }) {
  if (perms.length === 0) return null;

  return (
    <div className="mb-3">
      <h6 className="mb-2" style={{ color: color, fontWeight: 600 }}>
        <i className={`${icon} me-2`}></i>{title}
      </h6>
      <div className="row g-2">
        {perms.map((perm) => (
          <div key={perm.id} className="col-12">
            <div
              className={`border rounded p-2 d-flex align-items-center ${selected.includes(perm.id) ? 'border-primary bg-primary bg-opacity-10' : ''}`}
              style={{cursor: 'pointer'}}
              onClick={() => onToggle(perm.id)}
            >
              <input
                type="checkbox"
                className="form-check-input me-2"
                checked={selected.includes(perm.id)}
                onChange={() => onToggle(perm.id)}
                onClick={(e) => e.stopPropagation()}
              />
              <div>
                <div style={{fontSize: '14px', fontWeight: 500}}>{perm.display_name || perm.name}</div>
                {perm.description && <small className="text-muted">{perm.description}</small>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Excel-Style Grid View Component for permissions
function PermissionGridView({ permissions, selected, onToggle }) {
  // Group permissions by category
  const categories = [
    { key: 'patients', label: 'Patients', icon: 'fas fa-users', color: '#4361ee' },
    { key: 'medical_records', label: 'Medical Records', icon: 'fas fa-file-medical', color: '#3f37c9' },
    { key: 'appointments', label: 'Appointments', icon: 'fas fa-calendar-check', color: '#4895ef' },
    { key: 'prescriptions', label: 'Prescriptions', icon: 'fas fa-prescription', color: '#4cc9f0' },
    { key: 'lab', label: 'Laboratory', icon: 'fas fa-flask', color: '#f72585' },
    { key: 'users', label: 'User Mgmt', icon: 'fas fa-user-cog', color: '#7209b7' },
    { key: 'organization', label: 'Organization', icon: 'fas fa-sitemap', color: '#560bad' },
    { key: 'reports', label: 'Reports', icon: 'fas fa-chart-bar', color: '#480ca8' },
    { key: 'data_scope', label: 'Data Scope', icon: 'fas fa-eye', color: '#3a0ca3' },
  ];

  const getCategoryPerms = (catKey) => {
    switch(catKey) {
      case 'organization':
        return permissions.filter(p => p.name.includes('hospitals') || p.name.includes('districts') || p.name.includes('regions') || p.name.includes('departments'));
      case 'reports':
        return permissions.filter(p => p.name.includes('reports') || p.name.includes('billing'));
      case 'data_scope':
        return permissions.filter(p => p.name.includes('national') || p.name.includes('district') || p.name.includes('hospital_data'));
      default:
        return permissions.filter(p => p.name.includes(catKey));
    }
  };

  // Get all permissions that belong to any category
  const categorizedPermIds = new Set();
  categories.forEach(cat => {
    getCategoryPerms(cat.key).forEach(p => categorizedPermIds.add(p.id));
  });

  // Get uncategorized permissions
  const uncategorized = permissions.filter(p => !categorizedPermIds.has(p.id));

  return (
    <div className="permission-grid" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
      {/* Grid Header */}
      <div className="d-flex mb-2 pb-2 border-bottom" style={{ position: 'sticky', top: 0, background: 'white', zIndex: 10 }}>
        <div style={{ width: '200px', fontWeight: 600, fontSize: '13px', color: '#666' }}>PERMISSION</div>
        <div style={{ flex: 1, textAlign: 'center', fontWeight: 600, fontSize: '13px', color: '#666' }}>STATUS</div>
      </div>

      {/* Permission Rows by Category */}
      {categories.map(cat => {
        const catPerms = getCategoryPerms(cat.key);
        if (catPerms.length === 0) return null;

        return (
          <div key={cat.key} className="mb-3">
            {/* Category Header */}
            <div className="d-flex align-items-center mb-2 py-1 px-2 rounded" style={{ backgroundColor: `${cat.color}15` }}>
              <i className={`${cat.icon} me-2`} style={{ color: cat.color }}></i>
              <span style={{ fontWeight: 600, fontSize: '13px', color: cat.color }}>{cat.label}</span>
              <span className="ms-2 badge bg-light text-dark" style={{ fontSize: '11px' }}>
                {catPerms.filter(p => selected.includes(p.id)).length}/{catPerms.length}
              </span>
            </div>

            {/* Permission Rows */}
            {catPerms.map(perm => (
              <div
                key={perm.id}
                className={`d-flex align-items-center py-2 px-2 mb-1 rounded ${selected.includes(perm.id) ? 'bg-primary bg-opacity-10' : 'hover-bg-light'}`}
                style={{ cursor: 'pointer', transition: 'all 0.2s', borderLeft: selected.includes(perm.id) ? `3px solid ${cat.color}` : '3px solid transparent' }}
                onClick={() => onToggle(perm.id)}
              >
                <div style={{ width: '200px' }}>
                  <div style={{ fontSize: '14px', fontWeight: 500 }}>{perm.display_name || perm.name}</div>
                  {perm.description && <small className="text-muted" style={{ fontSize: '11px' }}>{perm.description}</small>}
                </div>
                <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                  <div
                    className={`d-flex align-items-center justify-content-center rounded-circle ${selected.includes(perm.id) ? 'bg-success' : 'bg-light border'}`}
                    style={{ width: '28px', height: '28px' }}
                  >
                    {selected.includes(perm.id) && <i className="fas fa-check text-white" style={{ fontSize: '14px' }}></i>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        );
      })}

      {/* Uncategorized Permissions */}
      {uncategorized.length > 0 && (
        <div className="mb-3">
          <div className="d-flex align-items-center mb-2 py-1 px-2 rounded" style={{ backgroundColor: '#f0f0f0' }}>
            <i className="fas fa-ellipsis-h me-2 text-secondary"></i>
            <span style={{ fontWeight: 600, fontSize: '13px', color: '#666' }}>Other</span>
          </div>
          {uncategorized.map(perm => (
            <div
              key={perm.id}
              className={`d-flex align-items-center py-2 px-2 mb-1 rounded ${selected.includes(perm.id) ? 'bg-primary bg-opacity-10' : 'hover-bg-light'}`}
              style={{ cursor: 'pointer', transition: 'all 0.2s', borderLeft: selected.includes(perm.id) ? '3px solid #6c757d' : '3px solid transparent' }}
              onClick={() => onToggle(perm.id)}
            >
              <div style={{ width: '200px' }}>
                <div style={{ fontSize: '14px', fontWeight: 500 }}>{perm.display_name || perm.name}</div>
              </div>
              <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
                <div
                  className={`d-flex align-items-center justify-content-center rounded-circle ${selected.includes(perm.id) ? 'bg-success' : 'bg-light border'}`}
                  style={{ width: '28px', height: '28px' }}
                >
                  {selected.includes(perm.id) && <i className="fas fa-check text-white" style={{ fontSize: '14px' }}></i>}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Summary Footer */}
      <div className="mt-3 p-2 bg-light rounded text-center">
        <small className="text-muted">
          <strong>{selected.length}</strong> of <strong>{permissions.length}</strong> permissions enabled for this role
        </small>
      </div>
    </div>
  );
}

const navItems = [
  {
    label: 'Dashboard',
    items: [
      { path: '/admin/dashboard', icon: 'fas fa-tachometer-alt', text: 'Overview' },
    ]
  },
  {
    label: 'User Management',
    items: [
      { path: '/admin/users', icon: 'fas fa-users', text: 'All Users' },
      { path: '/admin/roles', icon: 'fas fa-user-tag', text: 'Roles & Permissions' },
    ]
  },
  {
    label: 'Organization',
    items: [
      { path: '/admin/regions', icon: 'fas fa-globe-africa', text: 'Regions' },
      { path: '/admin/districts', icon: 'fas fa-map-marked-alt', text: 'Districts' },
      { path: '/admin/hospitals', icon: 'fas fa-hospital', text: 'Hospitals' },
      { path: '/admin/departments', icon: 'fas fa-building', text: 'Departments' },
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

function RoleManagement() {
  const { apiCall } = useAuth();
  const [roles, setRoles] = useState([]);
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPermModal, setShowPermModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '' });
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [confirmDelete, setConfirmDelete] = useState({ show: false, id: null });
  const [permViewMode, setPermViewMode] = useState('category'); // 'category' or 'grid'

  useEffect(() => {
    fetchRoles();
    fetchPermissions();
  }, []);

  const fetchRoles = async () => {
    try {
      setLoading(true);
      const response = await apiCall('/admin/roles/');
      const data = await response.json();
      if (response.ok) {
        setRoles(data);
      }
    } catch {
      console.error('Error fetching roles');
    } finally {
      setLoading(false);
    }
  };

  const fetchPermissions = async () => {
    try {
      const response = await apiCall('/admin/permissions/');
      const data = await response.json();
      if (response.ok) {
        setPermissions(data);
      }
    } catch {
      console.error('Error fetching permissions');
    }
  };

  const handleCreateRole = async (e) => {
    e.preventDefault();
    try {
      const response = await apiCall('/admin/roles/', {
        method: 'POST',
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setShowCreateModal(false);
        setFormData({ name: '', description: '' });
        fetchRoles();
        showToast.success('Role created successfully!');
      } else {
        const data = await response.json();
        const msg = Object.values(data).flat().join(', ');
        showToast.error(msg || 'Failed to create role');
      }
    } catch {
      showToast.error('Error creating role. Please try again.');
    }
  };

  const handleUpdateRole = async (e) => {
    e.preventDefault();
    try {
      const response = await apiCall(`/admin/roles/${selectedRole.id}/`, {
        method: 'PUT',
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        setShowEditModal(false);
        setSelectedRole(null);
        setFormData({ name: '', description: '' });
        fetchRoles();
        showToast.success('Role updated successfully!');
      } else {
        const data = await response.json();
        const msg = Object.values(data).flat().join(', ');
        showToast.error(msg || 'Failed to update role');
      }
    } catch {
      showToast.error('Error updating role. Please try again.');
    }
  };

  const handleDeleteRole = (roleId) => {
    setConfirmDelete({ show: true, id: roleId });
  };

  const confirmDeleteAction = async () => {
    try {
      const response = await apiCall(`/admin/roles/${confirmDelete.id}/`, {
        method: 'DELETE'
      });
      if (response.ok) {
        fetchRoles();
        showToast.success('Role deleted successfully!');
      } else {
        showToast.error('Failed to delete role');
      }
    } catch {
      showToast.error('Error deleting role. Please try again.');
    } finally {
      setConfirmDelete({ show: false, id: null });
    }
  };

  const openEditModal = (role) => {
    setSelectedRole(role);
    setFormData({ name: role.name, description: role.description || '' });
    setShowEditModal(true);
  };

  const openPermModal = (role) => {
    setSelectedRole(role);
    const currentPermIds = (role.permissions || []).map(p => p.permission);
    setSelectedPermissions(currentPermIds);
    setPermViewMode('category'); // Reset to category view when opening
    setShowPermModal(true);
  };

  const handleAssignPermissions = async () => {
    try {
      const response = await apiCall(`/admin/roles/${selectedRole.id}/assign_permissions/`, {
        method: 'POST',
        body: JSON.stringify({ permission_ids: selectedPermissions })
      });

      if (response.ok) {
        setShowPermModal(false);
        setSelectedRole(null);
        setSelectedPermissions([]);
        fetchRoles();
        showToast.success('Permissions assigned successfully!');
      } else {
        showToast.error('Failed to assign permissions');
      }
    } catch {
      showToast.error('Error assigning permissions. Please try again.');
    }
  };

  const togglePermission = (permId) => {
    setSelectedPermissions(prev =>
      prev.includes(permId) ? prev.filter(id => id !== permId) : [...prev, permId]
    );
  };

  // Apply preset permissions based on role type
  const applyPreset = (presetType) => {
    const presets = {
      clinical_staff: permissions.filter(p => 
        p.name.includes('patients') || 
        p.name.includes('medical_records') ||
        p.name.includes('appointments') ||
        p.name.includes('prescriptions') ||
        p.name.includes('lab_results') ||
        p.name.includes('hospital_data')
      ).map(p => p.id),
      hospital_admin: permissions.filter(p => 
        p.name.includes('patients') || 
        p.name.includes('medical_records') ||
        p.name.includes('appointments') ||
        p.name.includes('lab_results') ||
        p.name.includes('prescriptions') ||
        p.name.includes('users') ||
        p.name.includes('departments') ||
        p.name.includes('hospitals') ||
        p.name.includes('reports') ||
        p.name.includes('hospital_data')
      ).map(p => p.id),
      receptionist: permissions.filter(p => 
        p.name.includes('patients') || 
        p.name.includes('appointments') ||
        p.name.includes('hospital_data')
      ).map(p => p.id),
      lab_tech: permissions.filter(p => 
        p.name.includes('patients') || 
        p.name.includes('lab_results') ||
        p.name.includes('hospital_data')
      ).map(p => p.id),
      pharmacist: permissions.filter(p => 
        p.name.includes('patients') || 
        p.name.includes('prescriptions') ||
        p.name.includes('hospital_data')
      ).map(p => p.id),
    };
    
    if (presets[presetType]) {
      setSelectedPermissions(presets[presetType]);
      showToast.success(`Applied ${presetType.replace('_', ' ')} preset!`);
    }
  };

  const modalOverlay = {
    backgroundColor: 'rgba(0,0,0,0.5)',
    position: 'fixed',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 1050
  };

  return (
    <DashboardLayout navItems={navItems} brandTitle="NEHR Admin" roleBadge="Administrator">
      <div className="container-fluid py-4">
        <div className="row mb-4">
          <div className="col-12">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h1 className="h3 mb-0">Roles & Permissions</h1>
                <p className="text-muted">Manage system roles and their permissions</p>
              </div>
              <button
                className="btn btn-primary"
                onClick={() => { setFormData({ name: '', description: '' }); setShowCreateModal(true); }}
              >
                <i className="fas fa-plus me-2"></i>
                Create New Role
              </button>
            </div>
          </div>
        </div>

        {/* Roles Grid */}
        <div className="row g-4">
          {loading ? (
            <div className="col-12 text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : roles.length === 0 ? (
            <div className="col-12 text-center py-5">
              <i className="fas fa-user-tag" style={{fontSize: '48px', color: '#dee2e6', marginBottom: '16px', display: 'block'}}></i>
              <h5 className="text-muted">No roles configured yet</h5>
              <p className="text-muted">Create your first role to get started</p>
            </div>
          ) : (
            roles.map((role) => (
              <div key={role.id} className="col-xl-4 col-md-6">
                <div className="card border-0 shadow-sm h-100">
                  <div className="card-body">
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div>
                        <h5 className="card-title mb-1" style={{textTransform: 'capitalize'}}>{role.name}</h5>
                        <small className="text-muted">{role.description || 'No description'}</small>
                      </div>
                      <span className="badge bg-primary bg-opacity-10 text-primary">
                        {role.user_count || 0} users
                      </span>
                    </div>

                    <div className="mb-3">
                      <small className="text-muted d-block mb-2">
                        <i className="fas fa-key me-1"></i>
                        {(role.permissions || []).length} permissions assigned
                      </small>
                      <div className="d-flex flex-wrap gap-1">
                        {(role.permissions || []).slice(0, 4).map((perm, idx) => (
                          <span key={idx} className="badge bg-light text-dark" style={{fontSize: '11px'}}>
                            {perm.permission_name || perm.permission_display}
                          </span>
                        ))}
                        {(role.permissions || []).length > 4 && (
                          <span className="badge bg-light text-muted" style={{fontSize: '11px'}}>
                            +{role.permissions.length - 4} more
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="d-flex gap-2">
                      <button
                        className="btn btn-sm btn-outline-primary flex-fill"
                        onClick={() => openEditModal(role)}
                      >
                        <i className="fas fa-edit me-1"></i>Edit
                      </button>
                      <button
                        className="btn btn-sm btn-outline-info flex-fill"
                        onClick={() => openPermModal(role)}
                      >
                        <i className="fas fa-key me-1"></i>Permissions
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDeleteRole(role.id)}
                        title="Delete Role"
                      >
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Create Role Modal */}
      {showCreateModal && (
        <div className="modal show d-block" style={modalOverlay}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Create New Role</h5>
                <button type="button" className="btn-close" onClick={() => setShowCreateModal(false)}></button>
              </div>
              <form onSubmit={handleCreateRole}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Role Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="e.g. doctor, nurse, receptionist"
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Description</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      placeholder="Brief description of this role"
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Create Role</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Role Modal */}
      {showEditModal && selectedRole && (
        <div className="modal show d-block" style={modalOverlay}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Edit Role</h5>
                <button type="button" className="btn-close" onClick={() => { setShowEditModal(false); setSelectedRole(null); }}></button>
              </div>
              <form onSubmit={handleUpdateRole}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Role Name *</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Description</label>
                    <textarea
                      className="form-control"
                      rows="3"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => { setShowEditModal(false); setSelectedRole(null); }}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Update Role</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Assign Permissions Modal */}
      {showPermModal && selectedRole && (
        <div className="modal show d-block" style={modalOverlay}>
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="fas fa-key me-2 text-primary"></i>
                  Assign Permissions to <span className="text-primary">{selectedRole.display_name || selectedRole.name}</span>
                </h5>
                <div className="d-flex align-items-center gap-2">
                  {/* View Mode Toggle */}
                  <div className="btn-group btn-group-sm">
                    <button
                      className={`btn ${permViewMode === 'category' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => setPermViewMode('category')}
                      title="Category View"
                    >
                      <i className="fas fa-th-large me-1"></i>Categories
                    </button>
                    <button
                      className={`btn ${permViewMode === 'grid' ? 'btn-primary' : 'btn-outline-primary'}`}
                      onClick={() => setPermViewMode('grid')}
                      title="Excel Grid View"
                    >
                      <i className="fas fa-table me-1"></i>Grid
                    </button>
                  </div>
                  <button type="button" className="btn-close" onClick={() => { setShowPermModal(false); setSelectedRole(null); }}></button>
                </div>
              </div>
              <div className="modal-body">
                {/* Quick Setup Buttons */}
                <div className="mb-4 p-3 bg-light rounded">
                  <h6 className="mb-2"><i className="fas fa-magic me-2"></i>Quick Setup: Apply Recommended Permissions</h6>
                  <div className="d-flex flex-wrap gap-2">
                    <button className="btn btn-sm btn-outline-primary" onClick={() => applyPreset('clinical_staff')}>
                      <i className="fas fa-user-md me-1"></i>Clinical Staff (Doctor/Nurse)
                    </button>
                    <button className="btn btn-sm btn-outline-success" onClick={() => applyPreset('hospital_admin')}>
                      <i className="fas fa-hospital me-1"></i>Hospital Admin
                    </button>
                    <button className="btn btn-sm btn-outline-info" onClick={() => applyPreset('receptionist')}>
                      <i className="fas fa-user-plus me-1"></i>Receptionist
                    </button>
                    <button className="btn btn-sm btn-outline-warning" onClick={() => applyPreset('lab_tech')}>
                      <i className="fas fa-flask me-1"></i>Lab Technician
                    </button>
                    <button className="btn btn-sm btn-outline-secondary" onClick={() => applyPreset('pharmacist')}>
                      <i className="fas fa-pills me-1"></i>Pharmacist
                    </button>
                    <button className="btn btn-sm btn-outline-dark" onClick={() => setSelectedPermissions([])}>
                      <i className="fas fa-eraser me-1"></i>Clear All
                    </button>
                  </div>
                </div>

                {permissions.length === 0 ? (
                  <p className="text-muted text-center py-3">No permissions available. Run setup_permissions command first.</p>
                ) : permViewMode === 'category' ? (
                  /* CATEGORY VIEW */
                  <div className="row">
                    {/* Left Column: Patient & Clinical */}
                    <div className="col-md-6">
                      <PermissionCategory
                        title="Patients"
                        icon="fas fa-users"
                        color="#4361ee"
                        perms={permissions.filter(p => p.name.includes('patients'))}
                        selected={selectedPermissions}
                        onToggle={togglePermission}
                      />
                      <PermissionCategory
                        title="Medical Records"
                        icon="fas fa-file-medical"
                        color="#3f37c9"
                        perms={permissions.filter(p => p.name.includes('medical_records'))}
                        selected={selectedPermissions}
                        onToggle={togglePermission}
                      />
                      <PermissionCategory
                        title="Appointments"
                        icon="fas fa-calendar-check"
                        color="#4895ef"
                        perms={permissions.filter(p => p.name.includes('appointments'))}
                        selected={selectedPermissions}
                        onToggle={togglePermission}
                      />
                      <PermissionCategory
                        title="Prescriptions"
                        icon="fas fa-prescription"
                        color="#4cc9f0"
                        perms={permissions.filter(p => p.name.includes('prescriptions'))}
                        selected={selectedPermissions}
                        onToggle={togglePermission}
                      />
                      <PermissionCategory
                        title="Laboratory"
                        icon="fas fa-flask"
                        color="#f72585"
                        perms={permissions.filter(p => p.name.includes('lab'))}
                        selected={selectedPermissions}
                        onToggle={togglePermission}
                      />
                    </div>

                    {/* Right Column: Admin & Organization */}
                    <div className="col-md-6">
                      <PermissionCategory
                        title="User Management"
                        icon="fas fa-user-cog"
                        color="#7209b7"
                        perms={permissions.filter(p => p.name.includes('users'))}
                        selected={selectedPermissions}
                        onToggle={togglePermission}
                      />
                      <PermissionCategory
                        title="Organization Management"
                        icon="fas fa-sitemap"
                        color="#560bad"
                        perms={permissions.filter(p => p.name.includes('hospitals') || p.name.includes('districts') || p.name.includes('regions') || p.name.includes('departments'))}
                        selected={selectedPermissions}
                        onToggle={togglePermission}
                      />
                      <PermissionCategory
                        title="Reports & Analytics"
                        icon="fas fa-chart-bar"
                        color="#480ca8"
                        perms={permissions.filter(p => p.name.includes('reports') || p.name.includes('billing'))}
                        selected={selectedPermissions}
                        onToggle={togglePermission}
                      />
                      <PermissionCategory
                        title="Data Access Scope"
                        icon="fas fa-eye"
                        color="#3a0ca3"
                        perms={permissions.filter(p => p.name.includes('national') || p.name.includes('district') || p.name.includes('hospital_data'))}
                        selected={selectedPermissions}
                        onToggle={togglePermission}
                      />
                    </div>
                  </div>
                ) : (
                  /* EXCEL GRID VIEW */
                  <PermissionGridView
                    permissions={permissions}
                    selected={selectedPermissions}
                    onToggle={togglePermission}
                  />
                )}
              </div>
              <div className="modal-footer">
                <span className="me-auto text-muted" style={{fontSize: '13px'}}>
                  <i className="fas fa-check-square me-1"></i>
                  {selectedPermissions.length} of {permissions.length} permissions selected
                </span>
                <button type="button" className="btn btn-secondary" onClick={() => { setShowPermModal(false); setSelectedRole(null); }}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={handleAssignPermissions}>
                  <i className="fas fa-save me-1"></i>Save Permissions
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      <ConfirmModal
        show={confirmDelete.show}
        title="Delete Role?"
        message="This will permanently delete this role. Users assigned to this role may lose access."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={confirmDeleteAction}
        onCancel={() => setConfirmDelete({ show: false, id: null })}
      />
    </DashboardLayout>
  );
}

export default RoleManagement;

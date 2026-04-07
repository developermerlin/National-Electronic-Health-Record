import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link } from 'react-router-dom';
import DashboardLayout from '../../layout/DashboardLayout';

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
        alert('Role created successfully!');
      } else {
        const data = await response.json();
        alert(`Error: ${JSON.stringify(data)}`);
      }
    } catch {
      alert('Error creating role');
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
        alert('Role updated successfully!');
      } else {
        const data = await response.json();
        alert(`Error: ${JSON.stringify(data)}`);
      }
    } catch {
      alert('Error updating role');
    }
  };

  const handleDeleteRole = async (roleId) => {
    if (!confirm('Are you sure you want to delete this role?')) return;

    try {
      const response = await apiCall(`/admin/roles/${roleId}/`, {
        method: 'DELETE'
      });

      if (response.ok) {
        fetchRoles();
        alert('Role deleted successfully!');
      }
    } catch {
      alert('Error deleting role');
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
        alert('Permissions assigned successfully!');
      }
    } catch {
      alert('Error assigning permissions');
    }
  };

  const togglePermission = (permId) => {
    setSelectedPermissions(prev =>
      prev.includes(permId) ? prev.filter(id => id !== permId) : [...prev, permId]
    );
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
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  Assign Permissions to <span style={{textTransform: 'capitalize'}}>{selectedRole.name}</span>
                </h5>
                <button type="button" className="btn-close" onClick={() => { setShowPermModal(false); setSelectedRole(null); }}></button>
              </div>
              <div className="modal-body">
                {permissions.length === 0 ? (
                  <p className="text-muted text-center py-3">No permissions available. Create permissions in the admin panel first.</p>
                ) : (
                  <div className="row g-2">
                    {permissions.map((perm) => (
                      <div key={perm.id} className="col-md-6">
                        <div
                          className={`border rounded p-2 d-flex align-items-center ${selectedPermissions.includes(perm.id) ? 'border-primary bg-primary bg-opacity-10' : ''}`}
                          style={{cursor: 'pointer'}}
                          onClick={() => togglePermission(perm.id)}
                        >
                          <input
                            type="checkbox"
                            className="form-check-input me-2"
                            checked={selectedPermissions.includes(perm.id)}
                            onChange={() => togglePermission(perm.id)}
                          />
                          <div>
                            <div style={{fontSize: '14px', fontWeight: 500}}>{perm.name}</div>
                            {perm.description && <small className="text-muted">{perm.description}</small>}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <span className="me-auto text-muted" style={{fontSize: '13px'}}>
                  {selectedPermissions.length} permissions selected
                </span>
                <button type="button" className="btn btn-secondary" onClick={() => { setShowPermModal(false); setSelectedRole(null); }}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={handleAssignPermissions}>
                  Save Permissions
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default RoleManagement;

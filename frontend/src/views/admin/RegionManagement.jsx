import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
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

function RegionManagement() {
  const { apiCall } = useAuth();
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [formData, setFormData] = useState({ name: '', code: '', description: '', is_active: true });

  useEffect(() => {
    fetchRegions();
  }, []);

  const fetchRegions = async () => {
    try {
      setLoading(true);
      const response = await apiCall('/admin/regions/');
      const data = await response.json();
      if (response.ok) setRegions(data);
    } catch {
      console.error('Error fetching regions');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const response = await apiCall('/admin/regions/', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        setShowCreateModal(false);
        setFormData({ name: '', code: '', description: '', is_active: true });
        fetchRegions();
        alert('Region created successfully!');
      } else {
        const data = await response.json();
        alert(`Error: ${JSON.stringify(data)}`);
      }
    } catch {
      alert('Error creating region');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const response = await apiCall(`/admin/regions/${selectedRegion.id}/`, {
        method: 'PUT',
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        setShowEditModal(false);
        setSelectedRegion(null);
        setFormData({ name: '', code: '', description: '', is_active: true });
        fetchRegions();
        alert('Region updated successfully!');
      } else {
        const data = await response.json();
        alert(`Error: ${JSON.stringify(data)}`);
      }
    } catch {
      alert('Error updating region');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this region? All districts and hospitals under it will be affected.')) return;
    try {
      const response = await apiCall(`/admin/regions/${id}/`, { method: 'DELETE' });
      if (response.ok) {
        fetchRegions();
        alert('Region deleted successfully!');
      }
    } catch {
      alert('Error deleting region');
    }
  };

  const openEditModal = (region) => {
    setSelectedRegion(region);
    setFormData({ name: region.name, code: region.code, description: region.description || '', is_active: region.is_active });
    setShowEditModal(true);
  };

  const modalOverlay = {
    backgroundColor: 'rgba(0,0,0,0.5)', position: 'fixed', top: 0, left: 0,
    width: '100%', height: '100%', zIndex: 1050
  };

  return (
    <DashboardLayout navItems={navItems} brandTitle="NEHR Admin" roleBadge="Administrator">
      <div className="container-fluid py-4">
        <div className="row mb-4">
          <div className="col-12">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h1 className="h3 mb-0">Regions</h1>
                <p className="text-muted mb-0">Manage geographical regions across the country</p>
              </div>
              <button className="btn btn-primary"
                onClick={() => { setFormData({ name: '', code: '', description: '', is_active: true }); setShowCreateModal(true); }}>
                <i className="fas fa-plus me-2"></i>Add Region
              </button>
            </div>
          </div>
        </div>

        {/* Region Cards */}
        <div className="row g-4">
          {loading ? (
            <div className="col-12 text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Loading...</span>
              </div>
            </div>
          ) : regions.length === 0 ? (
            <div className="col-12 text-center py-5">
              <i className="fas fa-globe-africa" style={{ fontSize: '48px', color: '#dee2e6', display: 'block', marginBottom: '16px' }}></i>
              <h5 className="text-muted">No regions configured yet</h5>
              <p className="text-muted">Add regions to organize districts and hospitals</p>
            </div>
          ) : regions.map((region) => (
            <div key={region.id} className="col-xl-4 col-md-6">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div>
                      <h5 className="card-title mb-1">{region.name}</h5>
                      <span className="badge bg-secondary">{region.code}</span>
                    </div>
                    {region.is_active ? (
                      <span className="badge bg-success">Active</span>
                    ) : (
                      <span className="badge bg-danger">Inactive</span>
                    )}
                  </div>
                  {region.description && (
                    <p className="text-muted small mb-3">{region.description}</p>
                  )}
                  <div className="row text-center mb-3">
                    <div className="col-4">
                      <h5 className="mb-0 text-primary">{region.district_count || 0}</h5>
                      <small className="text-muted">Districts</small>
                    </div>
                    <div className="col-4">
                      <h5 className="mb-0 text-info">{region.hospital_count || 0}</h5>
                      <small className="text-muted">Hospitals</small>
                    </div>
                    <div className="col-4">
                      <h5 className="mb-0 text-success">{region.staff_count || 0}</h5>
                      <small className="text-muted">Staff</small>
                    </div>
                  </div>
                  <div className="d-flex gap-2">
                    <button className="btn btn-sm btn-outline-primary flex-fill" onClick={() => openEditModal(region)}>
                      <i className="fas fa-edit me-1"></i>Edit
                    </button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(region.id)}>
                      <i className="fas fa-trash"></i>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal show d-block" style={modalOverlay}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Add New Region</h5>
                <button type="button" className="btn-close" onClick={() => setShowCreateModal(false)}></button>
              </div>
              <form onSubmit={handleCreate}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Region Name *</label>
                    <input type="text" className="form-control" value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })} required
                      placeholder="e.g. Greater Accra Region" />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Region Code *</label>
                    <input type="text" className="form-control" value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })} required
                      placeholder="e.g. GA" />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Description</label>
                    <textarea className="form-control" rows="2" value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowCreateModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Create Region</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedRegion && (
        <div className="modal show d-block" style={modalOverlay}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Edit Region</h5>
                <button type="button" className="btn-close" onClick={() => { setShowEditModal(false); setSelectedRegion(null); }}></button>
              </div>
              <form onSubmit={handleUpdate}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Region Name *</label>
                    <input type="text" className="form-control" value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Region Code *</label>
                    <input type="text" className="form-control" value={formData.code}
                      onChange={(e) => setFormData({ ...formData, code: e.target.value })} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Description</label>
                    <textarea className="form-control" rows="2" value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
                  </div>
                  <div className="form-check">
                    <input type="checkbox" className="form-check-input" id="region_active"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} />
                    <label className="form-check-label" htmlFor="region_active">Active</label>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => { setShowEditModal(false); setSelectedRegion(null); }}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Update Region</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default RegionManagement;

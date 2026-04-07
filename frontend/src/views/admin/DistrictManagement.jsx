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

function DistrictManagement() {
  const { apiCall } = useAuth();
  const [districts, setDistricts] = useState([]);
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [filterRegion, setFilterRegion] = useState('');
  const [formData, setFormData] = useState({ name: '', code: '', region: '', description: '', is_active: true });

  useEffect(() => {
    fetchDistricts();
    fetchRegions();
  }, [filterRegion]);

  const fetchDistricts = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterRegion) params.append('region', filterRegion);
      const response = await apiCall(`/admin/districts/?${params.toString()}`);
      const data = await response.json();
      if (response.ok) setDistricts(data);
    } catch {
      console.error('Error fetching districts');
    } finally {
      setLoading(false);
    }
  };

  const fetchRegions = async () => {
    try {
      const response = await apiCall('/admin/regions/');
      const data = await response.json();
      if (response.ok) setRegions(data);
    } catch {
      console.error('Error fetching regions');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const response = await apiCall('/admin/districts/', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        setShowCreateModal(false);
        setFormData({ name: '', code: '', region: '', description: '', is_active: true });
        fetchDistricts();
        alert('District created successfully!');
      } else {
        const data = await response.json();
        alert(`Error: ${JSON.stringify(data)}`);
      }
    } catch {
      alert('Error creating district');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const response = await apiCall(`/admin/districts/${selectedDistrict.id}/`, {
        method: 'PUT',
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        setShowEditModal(false);
        setSelectedDistrict(null);
        setFormData({ name: '', code: '', region: '', description: '', is_active: true });
        fetchDistricts();
        alert('District updated successfully!');
      } else {
        const data = await response.json();
        alert(`Error: ${JSON.stringify(data)}`);
      }
    } catch {
      alert('Error updating district');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this district?')) return;
    try {
      const response = await apiCall(`/admin/districts/${id}/`, { method: 'DELETE' });
      if (response.ok) {
        fetchDistricts();
        alert('District deleted successfully!');
      }
    } catch {
      alert('Error deleting district');
    }
  };

  const openEditModal = (district) => {
    setSelectedDistrict(district);
    setFormData({
      name: district.name, code: district.code, region: district.region,
      description: district.description || '', is_active: district.is_active
    });
    setShowEditModal(true);
  };

  const modalOverlay = {
    backgroundColor: 'rgba(0,0,0,0.5)', position: 'fixed', top: 0, left: 0,
    width: '100%', height: '100%', zIndex: 1050
  };

  const DistrictForm = ({ onSubmit, submitLabel }) => (
    <form onSubmit={onSubmit}>
      <div className="modal-body">
        <div className="row g-3">
          <div className="col-md-8">
            <label className="form-label">District Name *</label>
            <input type="text" className="form-control" value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })} required
              placeholder="e.g. Kumasi Metropolitan" />
          </div>
          <div className="col-md-4">
            <label className="form-label">Code *</label>
            <input type="text" className="form-control" value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })} required
              placeholder="e.g. KMA" />
          </div>
          <div className="col-md-12">
            <label className="form-label">Region *</label>
            <select className="form-select" value={formData.region}
              onChange={(e) => setFormData({ ...formData, region: e.target.value })} required>
              <option value="">Select Region</option>
              {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div className="col-md-12">
            <label className="form-label">Description</label>
            <textarea className="form-control" rows="2" value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })} />
          </div>
          <div className="col-md-12">
            <div className="form-check">
              <input type="checkbox" className="form-check-input" id="dist_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} />
              <label className="form-check-label" htmlFor="dist_active">Active</label>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-footer">
        <button type="button" className="btn btn-secondary"
          onClick={() => { setShowCreateModal(false); setShowEditModal(false); setSelectedDistrict(null); }}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary">{submitLabel}</button>
      </div>
    </form>
  );

  return (
    <DashboardLayout navItems={navItems} brandTitle="NEHR Admin" roleBadge="Administrator">
      <div className="container-fluid py-4">
        <div className="row mb-4">
          <div className="col-12">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h1 className="h3 mb-0">Districts</h1>
                <p className="text-muted mb-0">Manage districts within regions</p>
              </div>
              <button className="btn btn-primary"
                onClick={() => { setFormData({ name: '', code: '', region: '', description: '', is_active: true }); setShowCreateModal(true); }}>
                <i className="fas fa-plus me-2"></i>Add District
              </button>
            </div>
          </div>
        </div>

        {/* Filter */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-4">
                <select className="form-select" value={filterRegion}
                  onChange={(e) => setFilterRegion(e.target.value)}>
                  <option value="">All Regions</option>
                  {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div className="col-md-2">
                <button className="btn btn-outline-secondary" onClick={() => setFilterRegion('')}>Clear</button>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
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
                      <th>District</th>
                      <th>Code</th>
                      <th>Region</th>
                      <th>Hospitals</th>
                      <th>Staff</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {districts.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="text-center py-4">
                          <i className="fas fa-map-marked-alt" style={{ fontSize: '36px', color: '#dee2e6', display: 'block', marginBottom: '8px' }}></i>
                          No districts found. Add your first district.
                        </td>
                      </tr>
                    ) : districts.map((d) => (
                      <tr key={d.id}>
                        <td><strong>{d.name}</strong></td>
                        <td><code>{d.code}</code></td>
                        <td>{d.region_name}</td>
                        <td>{d.hospital_count || 0}</td>
                        <td>{d.staff_count || 0}</td>
                        <td>
                          {d.is_active ? (
                            <span className="badge bg-success">Active</span>
                          ) : (
                            <span className="badge bg-danger">Inactive</span>
                          )}
                        </td>
                        <td>
                          <div className="btn-group btn-group-sm">
                            <button className="btn btn-outline-primary" onClick={() => openEditModal(d)} title="Edit">
                              <i className="fas fa-edit"></i>
                            </button>
                            <button className="btn btn-outline-danger" onClick={() => handleDelete(d.id)} title="Delete">
                              <i className="fas fa-trash"></i>
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

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal show d-block" style={modalOverlay}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Add New District</h5>
                <button type="button" className="btn-close" onClick={() => setShowCreateModal(false)}></button>
              </div>
              <DistrictForm onSubmit={handleCreate} submitLabel="Create District" />
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedDistrict && (
        <div className="modal show d-block" style={modalOverlay}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Edit District</h5>
                <button type="button" className="btn-close" onClick={() => { setShowEditModal(false); setSelectedDistrict(null); }}></button>
              </div>
              <DistrictForm onSubmit={handleUpdate} submitLabel="Update District" />
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default DistrictManagement;

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layout/DashboardLayout';
import showToast from '../../utils/toast';
import ConfirmModal from '../../components/ConfirmModal';
import { getNavForUser, getBrandForUser, getRoleBadge } from '../../utils/navItems';

function RegionManagement() {
  const { apiCall, user } = useAuth();
  const isReadOnly = user?.role === 'ministry_admin';
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedRegion, setSelectedRegion] = useState(null);
  const [formData, setFormData] = useState({ name: '', description: '', is_active: true });
  const [confirmDelete, setConfirmDelete] = useState({ show: false, id: null });

  const generateRegionCode = (name) => {
    if (!name) return '';
    const words = name.replace(/[^a-zA-Z\s]/g, '').split(/\s+/).filter(Boolean);
    let letters;
    if (words.length >= 2) {
      letters = words.slice(0, 3).map(w => w[0].toUpperCase()).join('');
    } else {
      letters = name.slice(0, 3).toUpperCase();
    }
    return `REG-${letters}-001`;
  };

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
        setFormData({ name: '', description: '', is_active: true });
        fetchRegions();
        showToast.success('Region created successfully!');
      } else {
        const data = await response.json();
        const msg = Object.values(data).flat().join(', ');
        showToast.error(msg || 'Failed to create region');
      }
    } catch {
      showToast.error('Error creating region. Please try again.');
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
        setFormData({ name: '', description: '', is_active: true });
        fetchRegions();
        showToast.success('Region updated successfully!');
      } else {
        const data = await response.json();
        const msg = Object.values(data).flat().join(', ');
        showToast.error(msg || 'Failed to update region');
      }
    } catch {
      showToast.error('Error updating region. Please try again.');
    }
  };

  const handleDelete = (id) => {
    setConfirmDelete({ show: true, id });
  };

  const confirmDeleteAction = async () => {
    try {
      const response = await apiCall(`/admin/regions/${confirmDelete.id}/`, { method: 'DELETE' });
      if (response.ok) {
        fetchRegions();
        showToast.success('Region deleted successfully!');
      } else {
        showToast.error('Failed to delete region');
      }
    } catch {
      showToast.error('Error deleting region. Please try again.');
    } finally {
      setConfirmDelete({ show: false, id: null });
    }
  };

  const openEditModal = (region) => {
    setSelectedRegion(region);
    setFormData({ name: region.name, description: region.description || '', is_active: region.is_active });
    setShowEditModal(true);
  };

  const modalOverlay = {
    backgroundColor: 'rgba(0,0,0,0.5)', position: 'fixed', top: 0, left: 0,
    width: '100%', height: '100%', zIndex: 1050
  };

  return (
    <DashboardLayout navItems={getNavForUser(user)} brandTitle={getBrandForUser(user)} roleBadge={getRoleBadge(user)}>
      <div className="container-fluid py-4">
        <div className="row mb-4">
          <div className="col-12">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h1 className="h3 mb-0">Regions</h1>
                <p className="text-muted mb-0">Manage geographical regions across the country</p>
              </div>
              {!isReadOnly && (
                <button className="btn btn-primary"
                  onClick={() => { setFormData({ name: '', description: '', is_active: true }); setShowCreateModal(true); }}>
                  <i className="fas fa-plus me-2"></i>Add Region
                </button>
              )}
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
                  <div className="d-flex flex-wrap justify-content-between text-center mb-3 gap-2">
                    <div style={{minWidth: '60px'}}>
                      <h5 className="mb-0 text-primary">{region.district_count || 0}</h5>
                      <small className="text-muted" style={{fontSize: '11px'}}>Districts</small>
                    </div>
                    <div style={{minWidth: '60px'}}>
                      <h5 className="mb-0 text-warning">{region.chiefdom_count || 0}</h5>
                      <small className="text-muted" style={{fontSize: '11px'}}>Chiefdoms</small>
                    </div>
                    <div style={{minWidth: '60px'}}>
                      <h5 className="mb-0 text-secondary">{region.town_count || 0}</h5>
                      <small className="text-muted" style={{fontSize: '11px'}}>Towns</small>
                    </div>
                    <div style={{minWidth: '60px'}}>
                      <h5 className="mb-0 text-info">{region.hospital_count || 0}</h5>
                      <small className="text-muted" style={{fontSize: '11px'}}>Hospitals</small>
                    </div>
                    <div style={{minWidth: '60px'}}>
                      <h5 className="mb-0 text-success">{region.staff_count || 0}</h5>
                      <small className="text-muted" style={{fontSize: '11px'}}>Staff</small>
                    </div>
                  </div>
                  {!isReadOnly && (
                    <div className="d-flex gap-2">
                      <button className="btn btn-sm btn-outline-primary flex-fill" onClick={() => openEditModal(region)}>
                        <i className="fas fa-edit me-1"></i>Edit
                      </button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(region.id)}>
                        <i className="fas fa-trash"></i>
                      </button>
                    </div>
                  )}
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
                  {formData.name && (
                    <div className="mb-3">
                      <label className="form-label text-muted" style={{fontSize: '13px'}}>Auto-generated Code</label>
                      <div>
                        <span className="badge bg-primary" style={{fontSize: '14px', padding: '8px 16px', letterSpacing: '1px'}}>
                          <i className="fas fa-code me-1"></i>{generateRegionCode(formData.name)}
                        </span>
                        <small className="text-muted ms-2">Generated from name</small>
                      </div>
                    </div>
                  )}
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
                    <label className="form-label text-muted" style={{fontSize: '13px'}}>Current Code</label>
                    <div>
                      <span className="badge bg-secondary" style={{fontSize: '14px', padding: '8px 16px', letterSpacing: '1px'}}>
                        <i className="fas fa-code me-1"></i>{selectedRegion?.code}
                      </span>
                      <small className="text-muted ms-2">Code is set at creation</small>
                    </div>
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
      <ConfirmModal
        show={confirmDelete.show}
        title="Delete Region?"
        message="This will permanently delete this region. All districts and hospitals under it will be affected."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={confirmDeleteAction}
        onCancel={() => setConfirmDelete({ show: false, id: null })}
      />
    </DashboardLayout>
  );
}

export default RegionManagement;

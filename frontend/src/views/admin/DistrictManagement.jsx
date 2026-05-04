import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layout/DashboardLayout';
import showToast from '../../utils/toast';
import ConfirmModal from '../../components/ConfirmModal';
import { getNavForUser, getBrandForUser, getRoleBadge } from '../../utils/navItems';

function DistrictManagement() {
  const { apiCall, user } = useAuth();
  const isReadOnly = user?.role === 'ministry_admin';
  const [districts, setDistricts] = useState([]);
  const [regions, setRegions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedDistrict, setSelectedDistrict] = useState(null);
  const [filterRegion, setFilterRegion] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [formData, setFormData] = useState({ name: '', region: '', description: '', is_active: true });
  const [confirmDelete, setConfirmDelete] = useState({ show: false, id: null });

  const generateDistrictCode = (districtName) => {
    if (!districtName) return '';
    const words = districtName.replace(/[^a-zA-Z\s]/g, '').split(/\s+/).filter(Boolean);
    let letters;
    if (words.length >= 2) {
      letters = words.slice(0, 3).map(w => w[0].toUpperCase()).join('');
    } else {
      letters = districtName.slice(0, 3).toUpperCase();
    }
    return `DST-${letters}-001`;
  };

  useEffect(() => {
    fetchDistricts();
    fetchRegions();
  }, [filterRegion]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterRegion]);

  const filteredDistricts = districts.filter(d => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return d.name.toLowerCase().includes(q) || (d.code && d.code.toLowerCase().includes(q)) || (d.region_name && d.region_name.toLowerCase().includes(q));
  });

  const totalPages = Math.ceil(filteredDistricts.length / itemsPerPage);
  const paginatedDistricts = filteredDistricts.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

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
        setFormData({ name: '', region: '', description: '', is_active: true });
        fetchDistricts();
        showToast.success('District created successfully!');
      } else {
        const data = await response.json();
        const msg = Object.values(data).flat().join(', ');
        showToast.error(msg || 'Failed to create district');
      }
    } catch {
      showToast.error('Error creating district. Please try again.');
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
        setFormData({ name: '', region: '', description: '', is_active: true });
        fetchDistricts();
        showToast.success('District updated successfully!');
      } else {
        const data = await response.json();
        const msg = Object.values(data).flat().join(', ');
        showToast.error(msg || 'Failed to update district');
      }
    } catch {
      showToast.error('Error updating district. Please try again.');
    }
  };

  const handleDelete = (id) => {
    setConfirmDelete({ show: true, id });
  };

  const confirmDeleteAction = async () => {
    try {
      const response = await apiCall(`/admin/districts/${confirmDelete.id}/`, { method: 'DELETE' });
      if (response.ok) {
        fetchDistricts();
        showToast.success('District deleted successfully!');
      } else {
        showToast.error('Failed to delete district');
      }
    } catch {
      showToast.error('Error deleting district. Please try again.');
    } finally {
      setConfirmDelete({ show: false, id: null });
    }
  };

  const openEditModal = (district) => {
    setSelectedDistrict(district);
    setFormData({
      name: district.name, region: district.region,
      description: district.description || '', is_active: district.is_active
    });
    setShowEditModal(true);
  };

  const modalOverlay = {
    backgroundColor: 'rgba(0,0,0,0.5)', position: 'fixed', top: 0, left: 0,
    width: '100%', height: '100%', zIndex: 1050
  };

  const renderDistrictFormFields = () => (
    <div className="modal-body">
      <div className="row g-3">
        <div className="col-md-12">
          <label className="form-label">District Name *</label>
          <input type="text" className="form-control" value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })} required
            placeholder="e.g. Western Area Urban" />
        </div>
        {formData.name && (
          <div className="col-md-12">
            <label className="form-label text-muted" style={{fontSize: '13px'}}>Auto-generated Code</label>
            <div>
              <span className="badge bg-primary" style={{fontSize: '14px', padding: '8px 16px', letterSpacing: '1px'}}>
                <i className="fas fa-code me-1"></i>{generateDistrictCode(formData.name)}
              </span>
              <small className="text-muted ms-2">Generated from name</small>
            </div>
          </div>
        )}
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
  );

  return (
    <DashboardLayout navItems={getNavForUser(user)} brandTitle={getBrandForUser(user)} roleBadge={getRoleBadge(user)}>
      <div className="container-fluid py-4">
        <div className="row mb-4">
          <div className="col-12">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h1 className="h3 mb-0">Districts</h1>
                <p className="text-muted mb-0">Manage districts within regions</p>
              </div>
              {!isReadOnly && (
                <button className="btn btn-primary"
                  onClick={() => { setFormData({ name: '', region: '', description: '', is_active: true }); setShowCreateModal(true); }}>
                  <i className="fas fa-plus me-2"></i>Add District
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Infographic Stats */}
        <div className="row g-3 mb-4">
          <div className="col-6 col-md-3">
            <div className="dash-stat-card">
              <div className="stat-icon bg-primary-soft"><i className="fas fa-map-marked-alt"></i></div>
              <div className="stat-label">Total Districts</div>
              <div className="stat-value">{districts.length}</div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="dash-stat-card">
              <div className="stat-icon bg-success-soft"><i className="fas fa-check-circle"></i></div>
              <div className="stat-label">Active</div>
              <div className="stat-value">{districts.filter(d => d.is_active).length}</div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="dash-stat-card">
              <div className="stat-icon bg-warning-soft"><i className="fas fa-sitemap"></i></div>
              <div className="stat-label">Total Chiefdoms</div>
              <div className="stat-value">{districts.reduce((sum, d) => sum + (d.chiefdom_count || 0), 0)}</div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="dash-stat-card">
              <div className="stat-icon bg-info-soft"><i className="fas fa-hospital"></i></div>
              <div className="stat-label">Total Hospitals</div>
              <div className="stat-value">{districts.reduce((sum, d) => sum + (d.hospital_count || 0), 0)}</div>
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
                  <input type="text" className="form-control" placeholder="Search districts by name, code, or region..."
                    value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                  {searchQuery && (
                    <button className="btn btn-outline-secondary" type="button" onClick={() => setSearchQuery('')}>
                      <i className="fas fa-times"></i>
                    </button>
                  )}
                </div>
              </div>
              <div className="col-md-4">
                <select className="form-select" value={filterRegion}
                  onChange={(e) => setFilterRegion(e.target.value)}>
                  <option value="">All Regions</option>
                  {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div className="col-md-3 d-flex align-items-center gap-2">
                <button className="btn btn-outline-secondary" onClick={() => { setFilterRegion(''); setSearchQuery(''); }}>Clear</button>
                <span className="text-muted small">Showing {filteredDistricts.length} of {districts.length}</span>
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
                      <th>Chiefdoms</th>
                      <th>Towns</th>
                      <th>Hospitals</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedDistricts.length === 0 ? (
                      <tr>
                        <td colSpan="8" className="text-center py-4">
                          <i className="fas fa-map-marked-alt" style={{ fontSize: '36px', color: '#dee2e6', display: 'block', marginBottom: '8px' }}></i>
                          {searchQuery ? 'No districts match your search.' : 'No districts found. Add your first district.'}
                        </td>
                      </tr>
                    ) : paginatedDistricts.map((d) => (
                      <tr key={d.id}>
                        <td><strong>{d.name}</strong></td>
                        <td><code>{d.code}</code></td>
                        <td>{d.region_name}</td>
                        <td><span className="badge bg-warning bg-opacity-10 text-warning">{d.chiefdom_count || 0}</span></td>
                        <td><span className="badge bg-secondary bg-opacity-10 text-secondary">{d.town_count || 0}</span></td>
                        <td><span className="badge bg-info bg-opacity-10 text-info">{d.hospital_count || 0}</span></td>
                        <td>
                          {d.is_active ? (
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
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="card-footer bg-white d-flex justify-content-between align-items-center">
              <small className="text-muted">
                Showing {((currentPage - 1) * itemsPerPage) + 1}–{Math.min(currentPage * itemsPerPage, filteredDistricts.length)} of {filteredDistricts.length}
              </small>
              <nav>
                <ul className="pagination pagination-sm mb-0">
                  <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => setCurrentPage(p => Math.max(1, p - 1))}>&laquo;</button>
                  </li>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(p => p === 1 || p === totalPages || Math.abs(p - currentPage) <= 2)
                    .reduce((acc, p, idx, arr) => {
                      if (idx > 0 && p - arr[idx - 1] > 1) acc.push('...');
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, idx) =>
                      p === '...' ? (
                        <li key={`ellipsis-${idx}`} className="page-item disabled"><span className="page-link">...</span></li>
                      ) : (
                        <li key={p} className={`page-item ${currentPage === p ? 'active' : ''}`}>
                          <button className="page-link" onClick={() => setCurrentPage(p)}>{p}</button>
                        </li>
                      )
                    )}
                  <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}>&raquo;</button>
                  </li>
                </ul>
              </nav>
            </div>
          )}
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
              <form onSubmit={handleCreate}>
                {renderDistrictFormFields()}
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary"
                    onClick={() => { setShowCreateModal(false); setSelectedDistrict(null); }}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Create District</button>
                </div>
              </form>
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
              <form onSubmit={handleUpdate}>
                {renderDistrictFormFields()}
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary"
                    onClick={() => { setShowEditModal(false); setSelectedDistrict(null); }}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Update District</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      <ConfirmModal
        show={confirmDelete.show}
        title="Delete District?"
        message="This will permanently delete this district and may affect associated hospitals."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={confirmDeleteAction}
        onCancel={() => setConfirmDelete({ show: false, id: null })}
      />
    </DashboardLayout>
  );
}

export default DistrictManagement;

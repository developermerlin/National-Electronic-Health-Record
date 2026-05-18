import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layout/DashboardLayout';
import showToast from '../../utils/toast';
import PrimaryButton from '../../components/PrimaryButton';
import ConfirmModal from '../../components/ConfirmModal';
import { getNavForUser, getBrandForUser, getRoleBadge } from '../../utils/navItems';

function TownManagement() {
  const { apiCall, user } = useAuth();
  const isReadOnly = user?.role === 'ministry_admin';
  const [towns, setTowns] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [chiefdoms, setChiefdoms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTown, setSelectedTown] = useState(null);
  const [filterDistrict, setFilterDistrict] = useState('');
  const [filterChiefdom, setFilterChiefdom] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [formData, setFormData] = useState({ name: '', district: '', chiefdom: '', is_active: true });
  const [confirmDelete, setConfirmDelete] = useState({ show: false, id: null });

  const generateTownCode = (name) => {
    if (!name) return '';
    const words = name.replace(/[^a-zA-Z\s]/g, '').split(/\s+/).filter(Boolean);
    let letters;
    if (words.length >= 2) {
      letters = words.slice(0, 3).map(w => w[0].toUpperCase()).join('');
    } else {
      letters = name.slice(0, 3).toUpperCase();
    }
    return `TWN-${letters}-001`;
  };

  useEffect(() => {
    fetchTowns();
    fetchDistricts();
  }, [filterDistrict, filterChiefdom]);

  useEffect(() => {
    if (filterDistrict) {
      fetchChiefdoms(filterDistrict);
    } else {
      setChiefdoms([]);
      setFilterChiefdom('');
    }
  }, [filterDistrict]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterDistrict, filterChiefdom]);

  const filteredTowns = towns.filter(t => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return t.name.toLowerCase().includes(q) || (t.code && t.code.toLowerCase().includes(q)) || (t.district_name && t.district_name.toLowerCase().includes(q)) || (t.chiefdom_name && t.chiefdom_name.toLowerCase().includes(q));
  });

  const totalPages = Math.ceil(filteredTowns.length / itemsPerPage);
  const paginatedTowns = filteredTowns.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const fetchTowns = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filterDistrict) params.append('district', filterDistrict);
      if (filterChiefdom) params.append('chiefdom', filterChiefdom);
      const response = await apiCall(`/admin/towns/?${params.toString()}`);
      const data = await response.json();
      if (response.ok) setTowns(data);
    } catch {
      console.error('Error fetching towns');
    } finally {
      setLoading(false);
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

  const fetchChiefdoms = async (districtId) => {
    try {
      const response = await apiCall(`/admin/chiefdoms/?district=${districtId}`);
      const data = await response.json();
      if (response.ok) setChiefdoms(data);
    } catch {
      console.error('Error fetching chiefdoms');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      if (!payload.chiefdom) delete payload.chiefdom; // optional
      const response = await apiCall('/admin/towns/', {
        method: 'POST',
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        setShowCreateModal(false);
        setFormData({ name: '', district: '', chiefdom: '', is_active: true });
        fetchTowns();
        showToast.created('Town');
      } else {
        const data = await response.json();
        const msg = Object.values(data).flat().join(', ');
        showToast.createError(msg || 'Town');
      }
    } catch {
      showToast.networkError();
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const payload = { ...formData };
      if (!payload.chiefdom) delete payload.chiefdom; // optional
      const response = await apiCall(`/admin/towns/${selectedTown.id}/`, {
        method: 'PUT',
        body: JSON.stringify(payload)
      });
      if (response.ok) {
        setShowEditModal(false);
        setSelectedTown(null);
        setFormData({ name: '', district: '', chiefdom: '', is_active: true });
        fetchTowns();
        showToast.updated('Town');
      } else {
        const data = await response.json();
        const msg = Object.values(data).flat().join(', ');
        showToast.updateError(msg || 'Town');
      }
    } catch {
      showToast.networkError();
    }
  };

  const handleDelete = (id) => {
    setConfirmDelete({ show: true, id });
  };

  const confirmDeleteAction = async () => {
    try {
      const response = await apiCall(`/admin/towns/${confirmDelete.id}/`, { method: 'DELETE' });
      if (response.ok) {
        fetchTowns();
        showToast.deleted('Town');
      } else {
        showToast.deleteError('Town');
      }
    } catch {
      showToast.networkError();
    } finally {
      setConfirmDelete({ show: false, id: null });
    }
  };

  const openEditModal = (town) => {
    setSelectedTown(town);
    setFormData({ name: town.name, district: town.district, chiefdom: town.chiefdom || '', is_active: town.is_active });
    if (town.district) fetchChiefdoms(town.district);
    setShowEditModal(true);
  };

  const modalOverlay = {
    backgroundColor: 'rgba(0,0,0,0.5)', position: 'fixed', top: 0, left: 0,
    width: '100%', height: '100%', zIndex: 1050
  };

  const renderTownFormFields = () => (
    <div className="modal-body">
      <div className="row g-3">
        <div className="col-md-12">
          <label className="form-label">Town Name *</label>
          <input type="text" className="form-control" value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })} required
            placeholder="e.g. Lunsar" />
        </div>
        {formData.name && (
          <div className="col-md-12">
            <label className="form-label text-muted" style={{fontSize: '13px'}}>Auto-generated Code</label>
            <div>
              <span className="badge bg-primary" style={{fontSize: '14px', padding: '8px 16px', letterSpacing: '1px'}}>
                <i className="fas fa-code me-1"></i>{generateTownCode(formData.name)}
              </span>
              <small className="text-muted ms-2">Generated from name</small>
            </div>
          </div>
        )}
        <div className="col-md-12">
          <label className="form-label">District *</label>
          <select className="form-select" value={formData.district}
            onChange={(e) => { setFormData({ ...formData, district: e.target.value, chiefdom: '' }); if (e.target.value) fetchChiefdoms(e.target.value); }} required>
            <option value="">Select District</option>
            {districts.map(d => <option key={d.id} value={d.id}>{d.name} ({d.region_name})</option>)}
          </select>
        </div>
        <div className="col-md-12">
          <label className="form-label">Chiefdom <small className="text-muted">(optional)</small></label>
          <select className="form-select" value={formData.chiefdom || ''}
            onChange={(e) => setFormData({ ...formData, chiefdom: e.target.value })} disabled={!formData.district}>
            <option value="">Select Chiefdom</option>
            {chiefdoms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div className="col-md-12">
          <div className="form-check">
            <input type="checkbox" className="form-check-input" id="town_active"
              checked={formData.is_active}
              onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} />
            <label className="form-check-label" htmlFor="town_active">Active</label>
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
                <h1 className="h3 mb-0">Towns</h1>
                <p className="text-muted mb-0">Manage towns within districts and chiefdoms</p>
              </div>
              {!isReadOnly && (
                <PrimaryButton onClick={() => { setFormData({ name: '', district: '', chiefdom: '', is_active: true }); setShowCreateModal(true); }}>
                  Add Town
                </PrimaryButton>
              )}
            </div>
          </div>
        </div>

        {/* Infographic Stats */}
        <div className="row g-3 mb-4">
          <div className="col-6 col-md-3">
            <div className="dash-stat-card">
              <div className="stat-icon bg-primary-soft"><i className="fas fa-city"></i></div>
              <div className="stat-label">Total Towns</div>
              <div className="stat-value">{towns.length}</div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="dash-stat-card">
              <div className="stat-icon bg-success-soft"><i className="fas fa-check-circle"></i></div>
              <div className="stat-label">Active</div>
              <div className="stat-value">{towns.filter(t => t.is_active).length}</div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="dash-stat-card">
              <div className="stat-icon bg-warning-soft"><i className="fas fa-sitemap"></i></div>
              <div className="stat-label">With Chiefdom</div>
              <div className="stat-value">{towns.filter(t => t.chiefdom).length}</div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="dash-stat-card">
              <div className="stat-icon bg-info-soft"><i className="fas fa-map-marked-alt"></i></div>
              <div className="stat-label">Districts Covered</div>
              <div className="stat-value">{[...new Set(towns.map(t => t.district))].length}</div>
            </div>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            <div className="row g-3 align-items-center">
              <div className="col-md-4">
                <div className="input-group">
                  <span className="input-group-text bg-white"><i className="fas fa-search text-muted"></i></span>
                  <input type="text" className="form-control" placeholder="Search towns by name, code..."
                    value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                  {searchQuery && (
                    <button className="btn btn-outline-secondary" type="button" onClick={() => setSearchQuery('')}>
                      <i className="fas fa-times"></i>
                    </button>
                  )}
                </div>
              </div>
              <div className="col-md-3">
                <select className="form-select" value={filterDistrict}
                  onChange={(e) => setFilterDistrict(e.target.value)}>
                  <option value="">All Districts</option>
                  {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="col-md-3">
                <select className="form-select" value={filterChiefdom}
                  onChange={(e) => setFilterChiefdom(e.target.value)} disabled={!filterDistrict}>
                  <option value="">All Chiefdoms</option>
                  {chiefdoms.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div className="col-md-2 d-flex align-items-center gap-2">
                <button className="btn btn-outline-secondary" onClick={() => { setFilterDistrict(''); setFilterChiefdom(''); setSearchQuery(''); }}>Clear</button>
              </div>
            </div>
            <div className="mt-2">
              <small className="text-muted">Showing {filteredTowns.length} of {towns.length} towns</small>
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
                      <th>Town</th>
                      <th>Code</th>
                      <th>District</th>
                      <th>Chiefdom</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedTowns.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="text-center py-4">
                          <i className="fas fa-city" style={{ fontSize: '36px', color: '#dee2e6', display: 'block', marginBottom: '8px' }}></i>
                          {searchQuery ? 'No towns match your search.' : 'No towns found. Add your first town.'}
                        </td>
                      </tr>
                    ) : paginatedTowns.map((t) => (
                      <tr key={t.id}>
                        <td><strong>{t.name}</strong></td>
                        <td><code>{t.code}</code></td>
                        <td>{t.district_name}</td>
                        <td>{t.chiefdom_name || '-'}</td>
                        <td>
                          {t.is_active ? (
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
                              <button className="btn btn-outline-primary" onClick={() => openEditModal(t)} title="Edit">
                                <i className="fas fa-edit"></i>
                              </button>
                              <button className="btn btn-outline-danger" onClick={() => handleDelete(t.id)} title="Delete">
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
                Showing {((currentPage - 1) * itemsPerPage) + 1}–{Math.min(currentPage * itemsPerPage, filteredTowns.length)} of {filteredTowns.length}
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
                <h5 className="modal-title">Add New Town</h5>
                <button type="button" className="btn-close" onClick={() => setShowCreateModal(false)}></button>
              </div>
              <form onSubmit={handleCreate}>
                {renderTownFormFields()}
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary"
                    onClick={() => { setShowCreateModal(false); setSelectedTown(null); }}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Create Town</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedTown && (
        <div className="modal show d-block" style={modalOverlay}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Edit Town</h5>
                <button type="button" className="btn-close" onClick={() => { setShowEditModal(false); setSelectedTown(null); }}></button>
              </div>
              <form onSubmit={handleUpdate}>
                {renderTownFormFields()}
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary"
                    onClick={() => { setShowEditModal(false); setSelectedTown(null); }}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Update Town</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <ConfirmModal
        show={confirmDelete.show}
        title="Delete Town?"
        message="This will permanently delete this town and may affect associated hospitals."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={confirmDeleteAction}
        onCancel={() => setConfirmDelete({ show: false, id: null })}
      />
    </DashboardLayout>
  );
}

export default TownManagement;

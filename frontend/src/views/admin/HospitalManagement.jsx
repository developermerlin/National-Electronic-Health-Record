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

function HospitalManagement() {
  const { apiCall } = useAuth();
  const [hospitals, setHospitals] = useState([]);
  const [regions, setRegions] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [filters, setFilters] = useState({ search: '', region: '', district: '', type: '' });
  const [formData, setFormData] = useState({
    name: '', code: '', hospital_type: 'district', district: '',
    address: '', phone: '', email: '', bed_capacity: 0, is_active: true
  });

  useEffect(() => {
    fetchHospitals();
    fetchRegions();
    fetchDistricts();
  }, [filters]);

  const fetchHospitals = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.region) params.append('region', filters.region);
      if (filters.district) params.append('district', filters.district);
      if (filters.type) params.append('type', filters.type);
      const response = await apiCall(`/admin/hospitals/?${params.toString()}`);
      const data = await response.json();
      if (response.ok) setHospitals(data);
    } catch {
      console.error('Error fetching hospitals');
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

  const fetchDistricts = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.region) params.append('region', filters.region);
      const response = await apiCall(`/admin/districts/?${params.toString()}`);
      const data = await response.json();
      if (response.ok) setDistricts(data);
    } catch {
      console.error('Error fetching districts');
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const response = await apiCall('/admin/hospitals/', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        setShowCreateModal(false);
        resetForm();
        fetchHospitals();
        alert('Hospital created successfully!');
      } else {
        const data = await response.json();
        alert(`Error: ${JSON.stringify(data)}`);
      }
    } catch {
      alert('Error creating hospital');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const response = await apiCall(`/admin/hospitals/${selectedHospital.id}/`, {
        method: 'PUT',
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        setShowEditModal(false);
        setSelectedHospital(null);
        resetForm();
        fetchHospitals();
        alert('Hospital updated successfully!');
      } else {
        const data = await response.json();
        alert(`Error: ${JSON.stringify(data)}`);
      }
    } catch {
      alert('Error updating hospital');
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this hospital?')) return;
    try {
      const response = await apiCall(`/admin/hospitals/${id}/`, { method: 'DELETE' });
      if (response.ok) {
        fetchHospitals();
        alert('Hospital deleted successfully!');
      }
    } catch {
      alert('Error deleting hospital');
    }
  };

  const openEditModal = (hospital) => {
    setSelectedHospital(hospital);
    setFormData({
      name: hospital.name, code: hospital.code, hospital_type: hospital.hospital_type,
      district: hospital.district, address: hospital.address || '', phone: hospital.phone || '',
      email: hospital.email || '', bed_capacity: hospital.bed_capacity, is_active: hospital.is_active
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '', code: '', hospital_type: 'district', district: '',
      address: '', phone: '', email: '', bed_capacity: 0, is_active: true
    });
  };

  const hospitalTypes = [
    { value: 'teaching', label: 'Teaching Hospital' },
    { value: 'regional', label: 'Regional Hospital' },
    { value: 'district', label: 'District Hospital' },
    { value: 'polyclinic', label: 'Polyclinic' },
    { value: 'health_center', label: 'Health Center' },
    { value: 'clinic', label: 'Clinic' },
    { value: 'chps', label: 'CHPS Compound' },
    { value: 'private', label: 'Private Hospital' },
  ];

  const modalOverlay = {
    backgroundColor: 'rgba(0,0,0,0.5)', position: 'fixed', top: 0, left: 0,
    width: '100%', height: '100%', zIndex: 1050
  };

  const HospitalForm = ({ onSubmit, submitLabel }) => (
    <form onSubmit={onSubmit}>
      <div className="modal-body">
        <div className="row g-3">
          <div className="col-md-8">
            <label className="form-label">Hospital Name *</label>
            <input type="text" className="form-control" value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })} required />
          </div>
          <div className="col-md-4">
            <label className="form-label">Code *</label>
            <input type="text" className="form-control" value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })} required
              placeholder="e.g. KTH-001" />
          </div>
          <div className="col-md-6">
            <label className="form-label">Type *</label>
            <select className="form-select" value={formData.hospital_type}
              onChange={(e) => setFormData({ ...formData, hospital_type: e.target.value })} required>
              {hospitalTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </div>
          <div className="col-md-6">
            <label className="form-label">District *</label>
            <select className="form-select" value={formData.district}
              onChange={(e) => setFormData({ ...formData, district: e.target.value })} required>
              <option value="">Select District</option>
              {districts.map(d => <option key={d.id} value={d.id}>{d.name} ({d.region_name})</option>)}
            </select>
          </div>
          <div className="col-md-12">
            <label className="form-label">Address</label>
            <textarea className="form-control" rows="2" value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
          </div>
          <div className="col-md-4">
            <label className="form-label">Phone</label>
            <input type="tel" className="form-control" value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
          </div>
          <div className="col-md-4">
            <label className="form-label">Email</label>
            <input type="email" className="form-control" value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
          </div>
          <div className="col-md-4">
            <label className="form-label">Bed Capacity</label>
            <input type="number" className="form-control" value={formData.bed_capacity}
              onChange={(e) => setFormData({ ...formData, bed_capacity: parseInt(e.target.value) || 0 })} min="0" />
          </div>
          <div className="col-md-12">
            <div className="form-check">
              <input type="checkbox" className="form-check-input" id="hosp_active"
                checked={formData.is_active}
                onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} />
              <label className="form-check-label" htmlFor="hosp_active">Active</label>
            </div>
          </div>
        </div>
      </div>
      <div className="modal-footer">
        <button type="button" className="btn btn-secondary"
          onClick={() => { setShowCreateModal(false); setShowEditModal(false); setSelectedHospital(null); resetForm(); }}>
          Cancel
        </button>
        <button type="submit" className="btn btn-primary">{submitLabel}</button>
      </div>
    </form>
  );

  return (
    <DashboardLayout navItems={navItems} brandTitle="NEHR Admin" roleBadge="Administrator">
      <div className="container-fluid py-4">
        {/* Header */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h1 className="h3 mb-0">Hospital Management</h1>
                <p className="text-muted mb-0">Manage hospitals and health facilities across the country</p>
              </div>
              <button className="btn btn-primary" onClick={() => { resetForm(); setShowCreateModal(true); }}>
                <i className="fas fa-plus me-2"></i>Add Hospital
              </button>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="row g-3 mb-4">
          <div className="col-xl-3 col-md-6">
            <div className="card border-0 shadow-sm">
              <div className="card-body d-flex align-items-center">
                <div className="rounded-circle bg-primary bg-opacity-10 p-3 me-3">
                  <i className="fas fa-hospital text-primary" style={{ fontSize: '24px' }}></i>
                </div>
                <div>
                  <h3 className="mb-0">{hospitals.length}</h3>
                  <small className="text-muted">Total Hospitals</small>
                </div>
              </div>
            </div>
          </div>
          <div className="col-xl-3 col-md-6">
            <div className="card border-0 shadow-sm">
              <div className="card-body d-flex align-items-center">
                <div className="rounded-circle bg-success bg-opacity-10 p-3 me-3">
                  <i className="fas fa-check-circle text-success" style={{ fontSize: '24px' }}></i>
                </div>
                <div>
                  <h3 className="mb-0">{hospitals.filter(h => h.is_active).length}</h3>
                  <small className="text-muted">Active</small>
                </div>
              </div>
            </div>
          </div>
          <div className="col-xl-3 col-md-6">
            <div className="card border-0 shadow-sm">
              <div className="card-body d-flex align-items-center">
                <div className="rounded-circle bg-info bg-opacity-10 p-3 me-3">
                  <i className="fas fa-map-marked-alt text-info" style={{ fontSize: '24px' }}></i>
                </div>
                <div>
                  <h3 className="mb-0">{regions.length}</h3>
                  <small className="text-muted">Regions</small>
                </div>
              </div>
            </div>
          </div>
          <div className="col-xl-3 col-md-6">
            <div className="card border-0 shadow-sm">
              <div className="card-body d-flex align-items-center">
                <div className="rounded-circle bg-warning bg-opacity-10 p-3 me-3">
                  <i className="fas fa-bed text-warning" style={{ fontSize: '24px' }}></i>
                </div>
                <div>
                  <h3 className="mb-0">{hospitals.reduce((sum, h) => sum + (h.bed_capacity || 0), 0)}</h3>
                  <small className="text-muted">Total Bed Capacity</small>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            <div className="row g-3">
              <div className="col-md-3">
                <input type="text" className="form-control" placeholder="Search hospitals..."
                  value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
              </div>
              <div className="col-md-3">
                <select className="form-select" value={filters.region}
                  onChange={(e) => setFilters({ ...filters, region: e.target.value, district: '' })}>
                  <option value="">All Regions</option>
                  {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div className="col-md-2">
                <select className="form-select" value={filters.district}
                  onChange={(e) => setFilters({ ...filters, district: e.target.value })}>
                  <option value="">All Districts</option>
                  {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="col-md-2">
                <select className="form-select" value={filters.type}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
                  <option value="">All Types</option>
                  {hospitalTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="col-md-2">
                <button className="btn btn-outline-secondary w-100"
                  onClick={() => setFilters({ search: '', region: '', district: '', type: '' })}>
                  Clear
                </button>
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
                      <th>Hospital</th>
                      <th>Code</th>
                      <th>Type</th>
                      <th>District</th>
                      <th>Region</th>
                      <th>Staff</th>
                      <th>Beds</th>
                      <th>Status</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hospitals.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="text-center py-4">
                          <i className="fas fa-hospital" style={{ fontSize: '36px', color: '#dee2e6', display: 'block', marginBottom: '8px' }}></i>
                          No hospitals found. Add your first hospital to get started.
                        </td>
                      </tr>
                    ) : hospitals.map((h) => (
                      <tr key={h.id}>
                        <td>
                          <strong>{h.name}</strong>
                        </td>
                        <td><code>{h.code}</code></td>
                        <td>
                          <span className="badge bg-info bg-opacity-10 text-info">
                            {h.hospital_type_display}
                          </span>
                        </td>
                        <td>{h.district_name}</td>
                        <td>{h.region_name}</td>
                        <td>{h.staff_count || 0}</td>
                        <td>{h.bed_capacity || 0}</td>
                        <td>
                          {h.is_active ? (
                            <span className="badge bg-success">Active</span>
                          ) : (
                            <span className="badge bg-danger">Inactive</span>
                          )}
                        </td>
                        <td>
                          <div className="btn-group btn-group-sm">
                            <button className="btn btn-outline-primary" onClick={() => openEditModal(h)} title="Edit">
                              <i className="fas fa-edit"></i>
                            </button>
                            <button className="btn btn-outline-danger" onClick={() => handleDelete(h.id)} title="Delete">
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
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Add New Hospital</h5>
                <button type="button" className="btn-close" onClick={() => { setShowCreateModal(false); resetForm(); }}></button>
              </div>
              <HospitalForm onSubmit={handleCreate} submitLabel="Create Hospital" />
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedHospital && (
        <div className="modal show d-block" style={modalOverlay}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Edit Hospital</h5>
                <button type="button" className="btn-close" onClick={() => { setShowEditModal(false); setSelectedHospital(null); resetForm(); }}></button>
              </div>
              <HospitalForm onSubmit={handleUpdate} submitLabel="Update Hospital" />
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default HospitalManagement;

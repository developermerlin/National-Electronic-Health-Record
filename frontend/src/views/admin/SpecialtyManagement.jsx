import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layout/DashboardLayout';
import { getNavForUser, getBrandForUser } from '../../utils/navItems';

const SpecialtyManagement = () => {
  const { apiCall, user } = useAuth();
  const [specialties, setSpecialties] = useState([]);
  const [filteredSpecialties, setFilteredSpecialties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState('');
  const [showActiveOnly, setShowActiveOnly] = useState(true);
  const [departments, setDepartments] = useState([]);
  const [statistics, setStatistics] = useState(null);
  
  // Modal states
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create', 'edit', 'view'
  const [selectedSpecialty, setSelectedSpecialty] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'general_medicine',
    department: '',
    is_active: true
  });

  const categories = [
    { value: 'general_medicine', label: 'General Medicine' },
    { value: 'surgery', label: 'Surgery' },
    { value: 'obstetrics_gynecology', label: 'Obstetrics & Gynecology' },
    { value: 'pediatrics', label: 'Pediatrics' },
    { value: 'other_clinical', label: 'Other Clinical Specialties' }
  ];

  useEffect(() => {
    fetchSpecialties();
    fetchDepartments();
    fetchStatistics();
  }, []);

  useEffect(() => {
    filterSpecialties();
  }, [specialties, searchTerm, selectedCategory, selectedDepartment, showActiveOnly]);

  const fetchSpecialties = async () => {
    try {
      setLoading(true);
      const response = await apiCall('specialties/');
      const data = await response.json();
      setSpecialties(data || []);
    } catch (error) {
      console.error('Error fetching specialties:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const response = await apiCall('admin/departments/');
      const data = await response.json();
      setDepartments(data.results || data || []);
    } catch (error) {
      console.error('Error fetching departments:', error);
    }
  };

  const fetchStatistics = async () => {
    try {
      const response = await apiCall('specialties/statistics/');
      const data = await response.json();
      setStatistics(data);
    } catch (error) {
      console.error('Error fetching statistics:', error);
    }
  };

  const filterSpecialties = () => {
    let filtered = [...specialties];

    if (searchTerm) {
      filtered = filtered.filter(s =>
        s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.description && s.description.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (selectedCategory) {
      filtered = filtered.filter(s => s.category === selectedCategory);
    }

    if (selectedDepartment) {
      filtered = filtered.filter(s => s.department === parseInt(selectedDepartment));
    }

    if (showActiveOnly) {
      filtered = filtered.filter(s => s.is_active);
    }

    setFilteredSpecialties(filtered);
  };

  const handleCreate = () => {
    setModalMode('create');
    setFormData({
      name: '',
      description: '',
      category: 'general_medicine',
      department: '',
      is_active: true
    });
    setShowModal(true);
  };

  const handleEdit = (specialty) => {
    setModalMode('edit');
    setSelectedSpecialty(specialty);
    setFormData({
      name: specialty.name,
      description: specialty.description || '',
      category: specialty.category,
      department: specialty.department || '',
      is_active: specialty.is_active
    });
    setShowModal(true);
  };

  const handleView = (specialty) => {
    setModalMode('view');
    setSelectedSpecialty(specialty);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    const payload = {
      ...formData,
      department: formData.department || null
    };

    try {
      if (modalMode === 'create') {
        await apiCall('specialties/', 'POST', payload);
      } else if (modalMode === 'edit') {
        await apiCall(`specialties/${selectedSpecialty.id}/`, 'PATCH', payload);
      }
      
      setShowModal(false);
      fetchSpecialties();
      fetchStatistics();
    } catch (error) {
      console.error('Error saving specialty:', error);
      alert(error.response?.data?.error || 'Error saving specialty');
    }
  };

  const handleDelete = async (specialty) => {
    if (!window.confirm(`Are you sure you want to delete "${specialty.name}"?`)) {
      return;
    }

    try {
      await apiCall(`specialties/${specialty.id}/`, 'DELETE');
      fetchSpecialties();
      fetchStatistics();
    } catch (error) {
      console.error('Error deleting specialty:', error);
      alert(error.response?.data?.error || 'Error deleting specialty');
    }
  };

  const toggleStatus = async (specialty) => {
    try {
      await apiCall(`specialties/${specialty.id}/`, 'PATCH', {
        is_active: !specialty.is_active
      });
      fetchSpecialties();
      fetchStatistics();
    } catch (error) {
      console.error('Error toggling status:', error);
    }
  };

  return (
    <DashboardLayout navItems={getNavForUser(user)} brandConfig={getBrandForUser(user)}>
    <div style={{ padding: '24px', background: '#f8fafc', minHeight: '100vh' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#1a1a2e', marginBottom: '8px' }}>
          <i className="fas fa-stethoscope" style={{ marginRight: '12px', color: '#8b5cf6' }}></i>
          Medical Specialties Management
        </h1>
        <p style={{ color: '#64748b', fontSize: '14px' }}>
          Manage doctor specialties and medical departments
        </p>
      </div>

      {/* Statistics Cards */}
      {statistics && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>Total Specialties</div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#1a1a2e' }}>{statistics.total_specialties}</div>
              </div>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-list" style={{ fontSize: '20px', color: '#8b5cf6' }}></i>
              </div>
            </div>
          </div>

          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>Active</div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#10b981' }}>{statistics.active_specialties}</div>
              </div>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-check-circle" style={{ fontSize: '20px', color: '#10b981' }}></i>
              </div>
            </div>
          </div>

          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>Inactive</div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#ef4444' }}>{statistics.inactive_specialties}</div>
              </div>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-times-circle" style={{ fontSize: '20px', color: '#ef4444' }}></i>
              </div>
            </div>
          </div>

          <div style={{ background: 'white', borderRadius: '12px', padding: '20px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>Categories</div>
                <div style={{ fontSize: '28px', fontWeight: 700, color: '#3b82f6' }}>{Object.keys(statistics.category_breakdown || {}).length}</div>
              </div>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#dbeafe', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <i className="fas fa-layer-group" style={{ fontSize: '20px', color: '#3b82f6' }}></i>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Actions */}
      <div style={{ background: 'white', borderRadius: '12px', padding: '20px', marginBottom: '24px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
              Search
            </label>
            <input
              type="text"
              placeholder="Search specialties..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
              Category
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' }}
            >
              <option value="">All Categories</option>
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
              Department
            </label>
            <select
              value={selectedDepartment}
              onChange={(e) => setSelectedDepartment(e.target.value)}
              style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' }}
            >
              <option value="">All Departments</option>
              {departments.map(dept => (
                <option key={dept.id} value={dept.id}>{dept.name_display || dept.name}</option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'flex-end' }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={showActiveOnly}
                onChange={(e) => setShowActiveOnly(e.target.checked)}
                style={{ marginRight: '8px', width: '16px', height: '16px' }}
              />
              <span style={{ fontSize: '14px', color: '#475569' }}>Active Only</span>
            </label>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '14px', color: '#64748b' }}>
            Showing {filteredSpecialties.length} of {specialties.length} specialties
          </div>
          <button
            onClick={handleCreate}
            style={{ padding: '10px 20px', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <i className="fas fa-plus"></i>
            Add New Specialty
          </button>
        </div>
      </div>

      {/* Specialties Table */}
      <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            <i className="fas fa-spinner fa-spin" style={{ fontSize: '24px' }}></i>
            <div style={{ marginTop: '12px' }}>Loading specialties...</div>
          </div>
        ) : filteredSpecialties.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#64748b' }}>
            <i className="fas fa-inbox" style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.3 }}></i>
            <div>No specialties found</div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#475569' }}>Specialty Name</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#475569' }}>Category</th>
                  <th style={{ padding: '14px 16px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#475569' }}>Department</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#475569' }}>Doctors</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#475569' }}>Status</th>
                  <th style={{ padding: '14px 16px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#475569' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSpecialties.map((specialty) => (
                  <tr key={specialty.id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                    <td style={{ padding: '14px 16px' }}>
                      <div style={{ fontWeight: 600, color: '#1a1a2e', marginBottom: '2px' }}>{specialty.name}</div>
                      {specialty.description && (
                        <div style={{ fontSize: '12px', color: '#64748b', maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {specialty.description}
                        </div>
                      )}
                    </td>
                    <td style={{ padding: '14px 16px' }}>
                      <span style={{ padding: '4px 10px', background: '#ede9fe', color: '#8b5cf6', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>
                        {specialty.category_display}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', fontSize: '14px', color: '#475569' }}>
                      {specialty.department_display || '—'}
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#3b82f6' }}>
                        {specialty.doctors_count || 0}
                      </span>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <button
                        onClick={() => toggleStatus(specialty)}
                        style={{ padding: '4px 10px', background: specialty.is_active ? '#d1fae5' : '#fee2e2', color: specialty.is_active ? '#10b981' : '#ef4444', border: 'none', borderRadius: '6px', fontSize: '12px', fontWeight: 600, cursor: 'pointer' }}
                      >
                        {specialty.is_active ? 'Active' : 'Inactive'}
                      </button>
                    </td>
                    <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button
                          onClick={() => handleView(specialty)}
                          style={{ padding: '6px 10px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                          title="View Details"
                        >
                          <i className="fas fa-eye"></i>
                        </button>
                        <button
                          onClick={() => handleEdit(specialty)}
                          style={{ padding: '6px 10px', background: '#dbeafe', color: '#3b82f6', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                          title="Edit"
                        >
                          <i className="fas fa-edit"></i>
                        </button>
                        <button
                          onClick={() => handleDelete(specialty)}
                          style={{ padding: '6px 10px', background: '#fee2e2', color: '#ef4444', border: 'none', borderRadius: '6px', fontSize: '12px', cursor: 'pointer' }}
                          title="Delete"
                        >
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

      {/* Modal */}
      {showModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: 'white', borderRadius: '12px', width: '90%', maxWidth: '600px', maxHeight: '90vh', overflow: 'auto' }}>
            <div style={{ padding: '24px', borderBottom: '1px solid #e2e8f0' }}>
              <h2 style={{ fontSize: '20px', fontWeight: 700, color: '#1a1a2e', margin: 0 }}>
                {modalMode === 'create' ? 'Add New Specialty' : modalMode === 'edit' ? 'Edit Specialty' : 'Specialty Details'}
              </h2>
            </div>

            {modalMode === 'view' ? (
              <div style={{ padding: '24px' }}>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>Specialty Name</div>
                  <div style={{ fontSize: '16px', fontWeight: 600, color: '#1a1a2e' }}>{selectedSpecialty?.name}</div>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>Description</div>
                  <div style={{ fontSize: '14px', color: '#475569' }}>{selectedSpecialty?.description || '—'}</div>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>Category</div>
                  <div style={{ fontSize: '14px', color: '#475569' }}>{selectedSpecialty?.category_display}</div>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>Department</div>
                  <div style={{ fontSize: '14px', color: '#475569' }}>{selectedSpecialty?.department_display || 'Not assigned'}</div>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>Doctors Count</div>
                  <div style={{ fontSize: '14px', color: '#475569' }}>{selectedSpecialty?.doctors_count || 0}</div>
                </div>
                <div style={{ marginBottom: '16px' }}>
                  <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>Status</div>
                  <div>
                    <span style={{ padding: '4px 10px', background: selectedSpecialty?.is_active ? '#d1fae5' : '#fee2e2', color: selectedSpecialty?.is_active ? '#10b981' : '#ef4444', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>
                      {selectedSpecialty?.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '12px', marginTop: '24px' }}>
                  <button
                    onClick={() => setShowModal(false)}
                    style={{ flex: 1, padding: '10px', background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      setShowModal(false);
                      handleEdit(selectedSpecialty);
                    }}
                    style={{ flex: 1, padding: '10px', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Edit
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                <div style={{ padding: '24px' }}>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                      Specialty Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' }}
                      placeholder="e.g., Cardiology"
                    />
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', fontFamily: 'inherit' }}
                      placeholder="Brief description of the specialty"
                    />
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                      Category *
                    </label>
                    <select
                      required
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' }}
                    >
                      {categories.map(cat => (
                        <option key={cat.value} value={cat.value}>{cat.label}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#475569', marginBottom: '6px' }}>
                      Department (Optional)
                    </label>
                    <select
                      value={formData.department}
                      onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                      style={{ width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px' }}
                    >
                      <option value="">No Department</option>
                      {departments.map(dept => (
                        <option key={dept.id} value={dept.id}>{dept.name_display || dept.name}</option>
                      ))}
                    </select>
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={formData.is_active}
                        onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                        style={{ marginRight: '8px', width: '16px', height: '16px' }}
                      />
                      <span style={{ fontSize: '14px', fontWeight: 600, color: '#475569' }}>Active</span>
                    </label>
                  </div>
                </div>

                <div style={{ padding: '16px 24px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    style={{ padding: '10px 20px', background: 'white', color: '#475569', border: '1px solid #e2e8f0', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    style={{ padding: '10px 20px', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    {modalMode === 'create' ? 'Create Specialty' : 'Save Changes'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
    </DashboardLayout>
  );
};

export default SpecialtyManagement;

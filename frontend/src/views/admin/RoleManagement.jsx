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
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'

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

  // Role colour palette
  const roleAccent = (name) => {
    const map = {
      admin: '#6366f1', ministry_admin: '#7c3aed', hospital_admin: '#0891b2',
      district_admin: '#0891b2', doctor: '#10b981', nurse: '#059669',
      receptionist: '#f59e0b', lab_technician: '#ef4444', pharmacist: '#8b5cf6',
      triage: '#f97316', patient: '#64748b',
    };
    return map[name?.toLowerCase()] || '#6366f1';
  };

  return (
    <DashboardLayout navItems={navItems} brandTitle="NEHR Admin" roleBadge="Administrator">
      <div style={{ padding: '28px 24px' }}>

        {/* ── Page Header ── */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:28, flexWrap:'wrap', gap:12 }}>
          <div>
            <h1 style={{ fontSize:26, fontWeight:800, color:'#0f172a', margin:0 }}>Roles & Permissions</h1>
            <p style={{ color:'#64748b', margin:'4px 0 0', fontSize:14 }}>Manage system roles and their permissions</p>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            {/* View toggle */}
            <div style={{ display:'flex', background:'#f1f5f9', borderRadius:10, padding:3 }}>
              <button
                onClick={() => setViewMode('grid')}
                style={{
                  border:'none', borderRadius:8, padding:'7px 14px', fontSize:12, fontWeight:600,
                  cursor:'pointer', transition:'all 0.18s',
                  background: viewMode === 'grid' ? '#fff' : 'transparent',
                  color: viewMode === 'grid' ? '#0f172a' : '#94a3b8',
                  boxShadow: viewMode === 'grid' ? '0 1px 4px rgba(0,0,0,0.10)' : 'none',
                }}
              ><i className="fas fa-th-large" style={{ marginRight:6 }}></i>Grid</button>
              <button
                onClick={() => setViewMode('list')}
                style={{
                  border:'none', borderRadius:8, padding:'7px 14px', fontSize:12, fontWeight:600,
                  cursor:'pointer', transition:'all 0.18s',
                  background: viewMode === 'list' ? '#fff' : 'transparent',
                  color: viewMode === 'list' ? '#0f172a' : '#94a3b8',
                  boxShadow: viewMode === 'list' ? '0 1px 4px rgba(0,0,0,0.10)' : 'none',
                }}
              ><i className="fas fa-list" style={{ marginRight:6 }}></i>List</button>
            </div>
            {/* Create button */}
            <button
              onClick={() => { setFormData({ name: '', description: '' }); setShowCreateModal(true); }}
              style={{
                display:'inline-flex', alignItems:'center', gap:8,
                background:'linear-gradient(135deg,#6366f1,#4f46e5)',
                color:'#fff', border:'none', borderRadius:10,
                padding:'10px 20px', fontWeight:700, fontSize:14,
                cursor:'pointer', boxShadow:'0 4px 14px rgba(99,102,241,0.35)',
              }}
            >
              <i className="fas fa-plus" style={{ fontSize:12 }}></i>Create New Role
            </button>
          </div>
        </div>

        {/* ── Stats bar ── */}
        {!loading && roles.length > 0 && (
          <div style={{ display:'flex', gap:12, marginBottom:24, flexWrap:'wrap' }}>
            {[
              { label:'Total Roles', value: roles.length, icon:'fas fa-user-tag', color:'#6366f1' },
              { label:'Total Users', value: roles.reduce((s, r) => s + (r.user_count || 0), 0), icon:'fas fa-users', color:'#10b981' },
              { label:'Total Permissions', value: roles.reduce((s, r) => s + (r.permissions?.length || 0), 0), icon:'fas fa-key', color:'#f59e0b' },
            ].map(s => (
              <div key={s.label} style={{ background:'#fff', borderRadius:12, padding:'14px 20px',
                boxShadow:'0 2px 8px rgba(15,23,42,0.06)', display:'flex', alignItems:'center', gap:12, minWidth:160 }}>
                <div style={{ width:36, height:36, borderRadius:10, background: s.color+'15',
                  display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <i className={s.icon} style={{ color:s.color, fontSize:15 }}></i>
                </div>
                <div>
                  <div style={{ fontSize:20, fontWeight:800, color:'#0f172a', lineHeight:1 }}>{s.value}</div>
                  <div style={{ fontSize:11, color:'#94a3b8', marginTop:2 }}>{s.label}</div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Loading / Empty ── */}
        {loading ? (
          <div style={{ textAlign:'center', padding:'60px 0' }}>
            <div className="spinner-border text-primary" role="status"></div>
          </div>
        ) : roles.length === 0 ? (
          <div style={{ textAlign:'center', padding:'60px 0', color:'#94a3b8' }}>
            <i className="fas fa-user-tag" style={{ fontSize:48, marginBottom:16, display:'block' }}></i>
            <h5>No roles configured yet</h5>
            <p>Create your first role to get started</p>
          </div>
        ) : viewMode === 'grid' ? (

          /* ══════════════ GRID VIEW ══════════════ */
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px,1fr))', gap:16 }}>
            {roles.map(role => {
              const accent = roleAccent(role.name);
              const permCount = (role.permissions || []).length;
              return (
                <div key={role.id} style={{
                  background:'#fff', borderRadius:16, overflow:'hidden',
                  boxShadow:'0 2px 8px rgba(15,23,42,0.07)',
                  transition:'box-shadow 0.2s, transform 0.2s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow='0 10px 28px rgba(15,23,42,0.12)'; }}
                  onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='0 2px 8px rgba(15,23,42,0.07)'; }}
                >
                  <div style={{ padding:'20px 20px 16px' }}>
                    {/* Header row */}
                    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:10 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{ width:38, height:38, borderRadius:10, background: accent+'18',
                          display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                          <i className="fas fa-user-tag" style={{ color:accent, fontSize:15 }}></i>
                        </div>
                        <div>
                          <div style={{ fontWeight:800, fontSize:15, color:'#0f172a', textTransform:'capitalize' }}>{role.name}</div>
                          <div style={{ fontSize:11, color:'#94a3b8', marginTop:1 }}>{role.description || 'No description'}</div>
                        </div>
                      </div>
                      <span style={{ background: accent+'15', color:accent, fontSize:11, fontWeight:700,
                        padding:'3px 10px', borderRadius:20, whiteSpace:'nowrap' }}>
                        {role.user_count || 0} users
                      </span>
                    </div>

                    {/* Permission count */}
                    <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10 }}>
                      <i className="fas fa-key" style={{ fontSize:10, color:'#94a3b8' }}></i>
                      <span style={{ fontSize:12, color:'#64748b' }}>{permCount} permission{permCount !== 1 ? 's' : ''} assigned</span>
                    </div>

                    {/* Permission chips */}
                    <div style={{ display:'flex', flexWrap:'wrap', gap:4, marginBottom:16, minHeight:26 }}>
                      {(role.permissions || []).slice(0, 3).map((perm, idx) => (
                        <span key={idx} style={{ fontSize:10, background:'#f8fafc', color:'#475569',
                          padding:'2px 8px', borderRadius:6, fontFamily:'monospace' }}>
                          {perm.permission_name || perm.permission_display}
                        </span>
                      ))}
                      {permCount > 3 && (
                        <span style={{ fontSize:10, color:'#94a3b8', padding:'2px 6px' }}>+{permCount - 3} more</span>
                      )}
                    </div>

                    {/* Actions */}
                    <div style={{ display:'flex', gap:8 }}>
                      <button onClick={() => openEditModal(role)} style={{
                        flex:1, padding:'8px', borderRadius:8, border:'1px solid #e2e8f0',
                        background:'#fff', color:'#475569', fontSize:12, fontWeight:600, cursor:'pointer',
                        display:'flex', alignItems:'center', justifyContent:'center', gap:5,
                        transition:'all 0.15s',
                      }}
                        onMouseEnter={e => { e.currentTarget.style.background='#f8fafc'; }}
                        onMouseLeave={e => { e.currentTarget.style.background='#fff'; }}
                      ><i className="fas fa-edit" style={{ fontSize:11 }}></i>Edit</button>
                      <button onClick={() => openPermModal(role)} style={{
                        flex:1, padding:'8px', borderRadius:8, border:'none',
                        background: accent+'18', color:accent, fontSize:12, fontWeight:600, cursor:'pointer',
                        display:'flex', alignItems:'center', justifyContent:'center', gap:5,
                        transition:'all 0.15s',
                      }}
                        onMouseEnter={e => { e.currentTarget.style.background=accent+'28'; }}
                        onMouseLeave={e => { e.currentTarget.style.background=accent+'18'; }}
                      ><i className="fas fa-key" style={{ fontSize:11 }}></i>Permissions</button>
                      <button onClick={() => handleDeleteRole(role.id)} style={{
                        width:36, padding:'8px', borderRadius:8, border:'1px solid #fecaca',
                        background:'#fff', color:'#ef4444', fontSize:12, cursor:'pointer',
                        display:'flex', alignItems:'center', justifyContent:'center',
                        transition:'all 0.15s',
                      }}
                        onMouseEnter={e => { e.currentTarget.style.background='#fef2f2'; }}
                        onMouseLeave={e => { e.currentTarget.style.background='#fff'; }}
                      ><i className="fas fa-trash" style={{ fontSize:11 }}></i></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

        ) : (

          /* ══════════════ LIST VIEW ══════════════ */
          <div style={{ background:'#fff', borderRadius:16, boxShadow:'0 2px 8px rgba(15,23,42,0.07)', overflow:'hidden' }}>
            {/* Table header */}
            <div style={{ display:'grid', gridTemplateColumns:'2fr 2fr 1fr 1fr 140px',
              padding:'12px 20px', background:'#f8fafc',
              borderBottom:'1px solid #f1f5f9' }}>
              {['Role', 'Description', 'Users', 'Permissions', 'Actions'].map(h => (
                <div key={h} style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:'0.8px' }}>{h}</div>
              ))}
            </div>

            {/* Rows */}
            {roles.map((role, idx) => {
              const accent = roleAccent(role.name);
              const permCount = (role.permissions || []).length;
              return (
                <div key={role.id}
                  style={{
                    display:'grid', gridTemplateColumns:'2fr 2fr 1fr 1fr 140px',
                    padding:'14px 20px', alignItems:'center',
                    borderBottom: idx < roles.length - 1 ? '1px solid #f8fafc' : 'none',
                    transition:'background 0.15s',
                  }}
                  onMouseEnter={e => { e.currentTarget.style.background='#fafbfc'; }}
                  onMouseLeave={e => { e.currentTarget.style.background='#fff'; }}
                >
                  {/* Role name + icon */}
                  <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                    <div style={{ width:32, height:32, borderRadius:8, background: accent+'18',
                      display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <i className="fas fa-user-tag" style={{ color:accent, fontSize:13 }}></i>
                    </div>
                    <span style={{ fontWeight:700, fontSize:14, color:'#0f172a', textTransform:'capitalize' }}>{role.name}</span>
                  </div>

                  {/* Description */}
                  <div style={{ fontSize:13, color:'#64748b', paddingRight:12,
                    overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {role.description || <span style={{ color:'#cbd5e1', fontStyle:'italic' }}>No description</span>}
                  </div>

                  {/* User count */}
                  <div>
                    <span style={{ background: accent+'15', color:accent, fontSize:12, fontWeight:700,
                      padding:'3px 10px', borderRadius:20 }}>
                      {role.user_count || 0}
                    </span>
                  </div>

                  {/* Permission count */}
                  <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                    <i className="fas fa-key" style={{ fontSize:10, color:'#94a3b8' }}></i>
                    <span style={{ fontSize:13, color:'#64748b', fontWeight:600 }}>{permCount}</span>
                  </div>

                  {/* Actions */}
                  <div style={{ display:'flex', gap:6 }}>
                    <button onClick={() => openEditModal(role)} style={{
                      padding:'6px 12px', borderRadius:7, border:'1px solid #e2e8f0',
                      background:'#fff', color:'#475569', fontSize:12, fontWeight:600, cursor:'pointer',
                      display:'flex', alignItems:'center', gap:4, transition:'all 0.15s',
                    }}
                      onMouseEnter={e => { e.currentTarget.style.background='#f8fafc'; }}
                      onMouseLeave={e => { e.currentTarget.style.background='#fff'; }}
                    ><i className="fas fa-edit" style={{ fontSize:10 }}></i>Edit</button>
                    <button onClick={() => openPermModal(role)} style={{
                      padding:'6px 12px', borderRadius:7, border:'none',
                      background: accent+'18', color:accent, fontSize:12, fontWeight:600, cursor:'pointer',
                      display:'flex', alignItems:'center', gap:4, transition:'all 0.15s',
                    }}
                      onMouseEnter={e => { e.currentTarget.style.background=accent+'28'; }}
                      onMouseLeave={e => { e.currentTarget.style.background=accent+'18'; }}
                    ><i className="fas fa-key" style={{ fontSize:10 }}></i>Perms</button>
                    <button onClick={() => handleDeleteRole(role.id)} style={{
                      padding:'6px 8px', borderRadius:7, border:'1px solid #fecaca',
                      background:'#fff', color:'#ef4444', fontSize:12, cursor:'pointer',
                      display:'flex', alignItems:'center', transition:'all 0.15s',
                    }}
                      onMouseEnter={e => { e.currentTarget.style.background='#fef2f2'; }}
                      onMouseLeave={e => { e.currentTarget.style.background='#fff'; }}
                    ><i className="fas fa-trash" style={{ fontSize:10 }}></i></button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
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

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layout/DashboardLayout';
import showToast from '../../utils/toast';
import ConfirmModal from '../../components/ConfirmModal';
import { getNavForUser, getBrandForUser, getRoleBadge } from '../../utils/navItems';

const CATEGORY_META = {
  surgery:       { icon: 'fas fa-procedures',            color: '#dc2626', bg: '#fef2f2' },
  icu:           { icon: 'fas fa-heartbeat',              color: '#7c3aed', bg: '#f3e8ff' },
  laboratory:    { icon: 'fas fa-flask',                  color: '#d69e2e', bg: '#fefce8' },
  radiology:     { icon: 'fas fa-x-ray',                  color: '#0891b2', bg: '#ecfeff' },
  medical:       { icon: 'fas fa-stethoscope',            color: '#16a34a', bg: '#f0fdf4' },
  dental:        { icon: 'fas fa-tooth',                  color: '#6366f1', bg: '#eef2ff' },
  physiotherapy: { icon: 'fas fa-dumbbell',               color: '#8b5cf6', bg: '#f5f3ff' },
  ophthalmology: { icon: 'fas fa-eye',                    color: '#14b8a6', bg: '#f0fdfa' },
  ent:           { icon: 'fas fa-comment-medical',        color: '#f59e0b', bg: '#fffbeb' },
  psychiatry:    { icon: 'fas fa-brain',                  color: '#ec4899', bg: '#fdf2f8' },
  ipd:           { icon: 'fas fa-bed',                    color: '#2563eb', bg: '#eff6ff' },
  opd:           { icon: 'fas fa-walking',                color: '#4361ee', bg: '#eff2ff' },
  pediatrics:    { icon: 'fas fa-child',                  color: '#f59e0b', bg: '#fffbeb' },
  emergency:     { icon: 'fas fa-ambulance',              color: '#e53e3e', bg: '#fff5f5' },
  pharmacy:      { icon: 'fas fa-pills',                  color: '#38a169', bg: '#f0fff4' },
  maternity:     { icon: 'fas fa-baby',                   color: '#ec4899', bg: '#fdf2f8' },
  records:       { icon: 'fas fa-folder-open',            color: '#64748b', bg: '#f1f5f9' },
  admin:         { icon: 'fas fa-cogs',                   color: '#475569', bg: '#f8fafc' },
  triage:        { icon: 'fas fa-first-aid',              color: '#e53e3e', bg: '#fff5f5' },
  other:         { icon: 'fas fa-ellipsis-h',             color: '#94a3b8', bg: '#f8fafc' },
};

const UNIT_STATUS_META = {
  operational:     { label: 'Operational',     cls: 'success' },
  under_maintenance:{ label: 'Maintenance',    cls: 'warning' },
  temporarily_closed:{ label: 'Closed',        cls: 'danger'  },
  non_operational: { label: 'Non-Operational', cls: 'secondary'},
};

const DEPT_STATUS_META = {
  active:   { label: 'Active',   cls: 'success' },
  inactive: { label: 'Inactive', cls: 'secondary' },
  under_construction: { label: 'Under Construction', cls: 'warning' },
};

const getCategoryMeta = (name) => CATEGORY_META[name] || CATEGORY_META.other;

const modalOverlay = { backgroundColor: 'rgba(0,0,0,0.5)', position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', zIndex: 1050 };

const emptyDeptForm = {
  category: '', head_of_department: '', phone: '', email: '',
  location: '', status: 'active', is_active: true, selectedUnitIds: [],
};

const emptyUnitForm = {
  unit_id: '', unit_head: '', bed_capacity: '', staff_count: '',
  phone: '', location: '', status: 'operational', is_active: true,
};

export default function HospitalDepartmentManagement() {
  const { apiCall, user } = useAuth();
  const nav   = getNavForUser(user);
  const brand = getBrandForUser(user);
  const badge = getRoleBadge(user);

  // ── Data ──────────────────────────────────────────────────────────────────
  const [hospital, setHospital]       = useState(null);
  const [departments, setDepartments] = useState([]);
  const [categories, setCategories]   = useState([]);
  const [loading, setLoading]         = useState(true);

  // ── View state ────────────────────────────────────────────────────────────
  const [view, setView]               = useState('list');         // 'list' | 'detail'
  const [selectedDept, setSelectedDept] = useState(null);         // summary dept object
  const [deptDetail, setDeptDetail]   = useState(null);           // full detail incl. units

  // ── Search / filter ───────────────────────────────────────────────────────
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('');

  // ── Modals ────────────────────────────────────────────────────────────────
  const [showAddDept,     setShowAddDept]     = useState(false);
  const [showEditDept,    setShowEditDept]    = useState(false);
  const [showAddUnit,     setShowAddUnit]     = useState(false);
  const [showEditUnit,    setShowEditUnit]    = useState(false);
  const [editingUnit,     setEditingUnit]     = useState(null);
  const [confirmDelUnit,  setConfirmDelUnit]  = useState({ show: false, id: null, name: '' });
  const [confirmDelDept,  setConfirmDelDept]  = useState({ show: false, dept: null });

  // ── Forms ─────────────────────────────────────────────────────────────────
  const [deptForm, setDeptForm] = useState(emptyDeptForm);
  const [unitForm, setUnitForm] = useState(emptyUnitForm);
  const [submitting, setSubmitting] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);

  // ── Fetch departments ─────────────────────────────────────────────────────
  const fetchDepartments = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiCall('/hospital-admin/departments/');
      const data = await res.json();
      if (res.ok) {
        setHospital(data.hospital);
        setDepartments(data.departments || []);
      } else {
        showToast.error(data.error || 'Failed to load departments');
      }
    } catch {
      showToast.networkError();
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  // ── Fetch categories (for Add Dept modal) ─────────────────────────────────
  const fetchCategories = useCallback(async () => {
    try {
      const res = await apiCall('/hospital-admin/department-categories/');
      const data = await res.json();
      if (res.ok) setCategories(data);
    } catch { /* silent */ }
  }, [apiCall]);

  useEffect(() => {
    fetchDepartments();
    fetchCategories();
  }, [fetchDepartments, fetchCategories]);

  // ── Fetch dept detail ─────────────────────────────────────────────────────
  const openDeptDetail = async (dept) => {
    setSelectedDept(dept);
    setView('detail');
    setDetailLoading(true);
    try {
      const res = await apiCall(`/hospital-admin/departments/${dept.id}/`);
      const data = await res.json();
      if (res.ok) setDeptDetail(data);
      else showToast.error(data.error || 'Failed to load department details');
    } catch {
      showToast.networkError();
    } finally {
      setDetailLoading(false);
    }
  };

  const refreshDeptDetail = async (deptId) => {
    try {
      const res = await apiCall(`/hospital-admin/departments/${deptId}/`);
      const data = await res.json();
      if (res.ok) setDeptDetail(data);
    } catch { /* silent */ }
  };

  // ── Create Department (+ batch-add selected units) ──────────────────────
  const handleCreateDept = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { selectedUnitIds, ...deptPayload } = deptForm;
      const res = await apiCall('/hospital-admin/departments/create/', {
        method: 'POST',
        body: JSON.stringify(deptPayload),
      });
      const data = await res.json();
      if (!res.ok) {
        const msg = typeof data === 'object' ? Object.values(data).flat().join(', ') : 'Failed';
        showToast.createError(msg);
        return;
      }
      const deptId = data.id;
      // Batch-add selected units
      if (selectedUnitIds.length > 0) {
        await Promise.allSettled(
          selectedUnitIds.map(uid =>
            apiCall(`/hospital-admin/departments/${deptId}/add-unit/`, {
              method: 'POST',
              body: JSON.stringify({ unit_id: uid, status: 'operational', is_active: true }),
            })
          )
        );
        showToast.success(`Department created with ${selectedUnitIds.length} unit${selectedUnitIds.length > 1 ? 's' : ''}.`, 'Department Created');
      } else {
        showToast.created('Department');
      }
      setShowAddDept(false);
      setDeptForm(emptyDeptForm);
      fetchDepartments();
    } catch {
      showToast.networkError();
    } finally {
      setSubmitting(false);
    }
  };

  // ── Update Department ─────────────────────────────────────────────────────
  const openEditDept = (dept) => {
    setDeptForm({
      category:           dept.category,
      head_of_department: dept.head_of_department || '',
      phone:              dept.phone || '',
      email:              dept.email || '',
      location:           dept.location || '',
      status:             dept.status || 'active',
      is_active:          dept.is_active ?? true,
    });
    setShowEditDept(true);
  };

  const handleUpdateDept = async (e) => {
    e.preventDefault();
    if (!selectedDept) return;
    setSubmitting(true);
    try {
      const res = await apiCall(`/hospital-admin/departments/${selectedDept.id}/update/`, {
        method: 'PATCH',
        body: JSON.stringify(deptForm),
      });
      const data = await res.json();
      if (res.ok) {
        setShowEditDept(false);
        fetchDepartments();
        refreshDeptDetail(selectedDept.id);
        showToast.updated('Department');
      } else {
        const msg = typeof data === 'object' ? Object.values(data).flat().join(', ') : 'Failed';
        showToast.updateError(msg);
      }
    } catch {
      showToast.networkError();
    } finally {
      setSubmitting(false);
    }
  };

  // ── Add Unit ──────────────────────────────────────────────────────────────
  const handleAddUnit = async (e) => {
    e.preventDefault();
    if (!selectedDept) return;
    setSubmitting(true);
    try {
      const payload = {
        unit_id:      parseInt(unitForm.unit_id),
        unit_head:    unitForm.unit_head,
        bed_capacity: parseInt(unitForm.bed_capacity) || 0,
        staff_count:  parseInt(unitForm.staff_count) || 0,
        phone:        unitForm.phone,
        location:     unitForm.location,
        status:       unitForm.status,
        is_active:    unitForm.is_active,
      };
      const res = await apiCall(`/hospital-admin/departments/${selectedDept.id}/add-unit/`, {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setShowAddUnit(false);
        setUnitForm(emptyUnitForm);
        refreshDeptDetail(selectedDept.id);
        showToast.created('Unit');
      } else {
        const msg = data.error || (typeof data === 'object' ? Object.values(data).flat().join(', ') : 'Failed');
        showToast.createError(msg);
      }
    } catch {
      showToast.networkError();
    } finally {
      setSubmitting(false);
    }
  };

  // ── Edit Unit ─────────────────────────────────────────────────────────────
  const openEditUnit = (unit) => {
    setEditingUnit(unit);
    setUnitForm({
      unit_id:      unit.unit,
      unit_head:    unit.unit_head || '',
      bed_capacity: unit.bed_capacity ?? '',
      staff_count:  unit.staff_count ?? '',
      phone:        unit.phone || '',
      location:     unit.location || '',
      status:       unit.status || 'operational',
      is_active:    unit.is_active ?? true,
    });
    setShowEditUnit(true);
  };

  const handleUpdateUnit = async (e) => {
    e.preventDefault();
    if (!editingUnit) return;
    setSubmitting(true);
    try {
      const payload = {
        unit_head:    unitForm.unit_head,
        bed_capacity: parseInt(unitForm.bed_capacity) || 0,
        staff_count:  parseInt(unitForm.staff_count) || 0,
        phone:        unitForm.phone,
        location:     unitForm.location,
        status:       unitForm.status,
        is_active:    unitForm.is_active,
      };
      const res = await apiCall(`/hospital-admin/units/${editingUnit.id}/update/`, {
        method: 'PATCH',
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (res.ok) {
        setShowEditUnit(false);
        setEditingUnit(null);
        refreshDeptDetail(selectedDept.id);
        showToast.updated('Unit');
      } else {
        const msg = typeof data === 'object' ? Object.values(data).flat().join(', ') : 'Failed';
        showToast.updateError(msg);
      }
    } catch {
      showToast.networkError();
    } finally {
      setSubmitting(false);
    }
  };

  // ── Delete Unit ───────────────────────────────────────────────────────────
  const confirmDeleteUnit = async () => {
    try {
      const res = await apiCall(`/hospital-admin/units/${confirmDelUnit.id}/delete/`, { method: 'DELETE' });
      if (res.ok) {
        refreshDeptDetail(selectedDept.id);
        fetchDepartments();
        showToast.deleted('Unit');
      } else {
        showToast.deleteError('Unit');
      }
    } catch {
      showToast.networkError();
    } finally {
      setConfirmDelUnit({ show: false, id: null, name: '' });
    }
  };

  // ── Filtered list ─────────────────────────────────────────────────────────
  const filteredDepts = departments.filter(d => {
    const matchSearch = !searchQuery ||
      (d.category_name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.department_code || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      (d.head_of_department || '').toLowerCase().includes(searchQuery.toLowerCase());
    const matchStatus = !filterStatus || d.status === filterStatus;
    return matchSearch && matchStatus;
  });

  // ── Already-added category IDs ────────────────────────────────────────────
  const addedCategoryIds = new Set(departments.map(d => d.category));
  const availableCategories = categories.filter(c => !addedCategoryIds.has(c.id));

  // ── Units for currently selected category in the Add Dept modal ───────────
  const selectedCategoryUnits = deptForm.category
    ? (categories.find(c => c.id === parseInt(deptForm.category))?.units || [])
    : [];

  const toggleUnit = (uid) => setDeptForm(f => ({
    ...f,
    selectedUnitIds: f.selectedUnitIds.includes(uid)
      ? f.selectedUnitIds.filter(id => id !== uid)
      : [...f.selectedUnitIds, uid],
  }));

  const toggleAllUnits = () => setDeptForm(f => ({
    ...f,
    selectedUnitIds: f.selectedUnitIds.length === selectedCategoryUnits.length
      ? []
      : selectedCategoryUnits.map(u => u.id),
  }));

  // ── Stat helpers ──────────────────────────────────────────────────────────
  const totalUnits    = departments.reduce((s, d) => s + (d.units_count || 0), 0);
  const activeDepts   = departments.filter(d => d.status === 'active').length;

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <DashboardLayout navItems={nav} brandTitle={brand} roleBadge={badge}>
      <div className="container-fluid py-4">

        {/* ── Page header ── */}
        <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-3">
          <div>
            {view === 'detail' && selectedDept ? (
              <div className="d-flex align-items-center gap-3">
                <button className="btn btn-sm btn-light border" onClick={() => { setView('list'); setSelectedDept(null); setDeptDetail(null); }}>
                  <i className="fas fa-arrow-left me-1"></i> Back
                </button>
                <div>
                  <h1 className="h4 mb-0 d-flex align-items-center gap-2">
                    {(() => { const m = getCategoryMeta(selectedDept.category_name?.toLowerCase().split(' ')[0]); return <><i className={m.icon} style={{ color: m.color }}></i> {selectedDept.category_name}</> })()}
                  </h1>
                  <p className="text-muted mb-0 small">{hospital?.name} · <code>{selectedDept.department_code}</code></p>
                </div>
              </div>
            ) : (
              <div>
                <h1 className="h3 mb-0">Departments</h1>
                <p className="text-muted mb-0">{hospital?.name} — manage active departments &amp; units</p>
              </div>
            )}
          </div>
          {view === 'list' && (
            <button className="btn btn-primary" onClick={() => { setDeptForm(emptyDeptForm); setShowAddDept(true); }}
              disabled={availableCategories.length === 0}>
              <i className="fas fa-plus me-2"></i>
              {availableCategories.length === 0 ? 'All Departments Added' : 'Add Department'}
            </button>
          )}
          {view === 'detail' && deptDetail && (
            <div className="d-flex gap-2">
              <button className="btn btn-outline-primary btn-sm" onClick={() => openEditDept(deptDetail)}>
                <i className="fas fa-edit me-1"></i> Edit Department
              </button>
              <button className="btn btn-primary btn-sm" onClick={() => { setUnitForm(emptyUnitForm); setShowAddUnit(true); }}
                disabled={(deptDetail.available_units || []).length === 0}>
                <i className="fas fa-plus me-1"></i>
                {(deptDetail.available_units || []).length === 0 ? 'All Units Added' : 'Add Unit'}
              </button>
            </div>
          )}
        </div>

        {/* ══════════════════════════ LIST VIEW ══════════════════════════════ */}
        {view === 'list' && (
          <>
            {/* Stats */}
            <div className="row g-3 mb-4">
              {[
                { icon: 'fas fa-building', label: 'Total Departments', value: departments.length, color: '#4361ee', bg: '#eff2ff' },
                { icon: 'fas fa-check-circle', label: 'Active',        value: activeDepts,           color: '#16a34a', bg: '#f0fdf4' },
                { icon: 'fas fa-th-large', label: 'Total Units',       value: totalUnits,             color: '#7c3aed', bg: '#f3e8ff' },
                { icon: 'fas fa-layer-group', label: 'Categories Left', value: availableCategories.length, color: '#f59e0b', bg: '#fffbeb' },
              ].map((s, i) => (
                <div key={i} className="col-6 col-md-3">
                  <div className="card border-0 shadow-sm h-100">
                    <div className="card-body d-flex align-items-center gap-3">
                      <div style={{ width: 42, height: 42, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <i className={s.icon} style={{ color: s.color, fontSize: 17 }}></i>
                      </div>
                      <div>
                        <div style={{ fontSize: 22, fontWeight: 800, color: '#1a1a2e', lineHeight: 1 }}>{s.value}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>{s.label}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Filters */}
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-body py-3">
                <div className="row g-3 align-items-center">
                  <div className="col-md-5">
                    <div className="input-group">
                      <span className="input-group-text bg-white"><i className="fas fa-search text-muted"></i></span>
                      <input type="text" className="form-control" placeholder="Search by department, code, head..."
                        value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                      {searchQuery && <button className="btn btn-outline-secondary" onClick={() => setSearchQuery('')}><i className="fas fa-times"></i></button>}
                    </div>
                  </div>
                  <div className="col-md-3">
                    <select className="form-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
                      <option value="">All Statuses</option>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="under_construction">Under Construction</option>
                    </select>
                  </div>
                  <div className="col-md-4 text-end">
                    <span className="badge bg-primary bg-opacity-10 text-primary" style={{ fontSize: 13, padding: '7px 13px' }}>
                      {filteredDepts.length} department{filteredDepts.length !== 1 ? 's' : ''}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Department grid / table */}
            {loading ? (
              <div className="text-center py-5"><div className="spinner-border text-primary" role="status"></div></div>
            ) : filteredDepts.length === 0 ? (
              <div className="card border-0 shadow-sm">
                <div className="card-body text-center py-5">
                  <i className="fas fa-building" style={{ fontSize: 44, color: '#dee2e6', display: 'block', marginBottom: 12 }}></i>
                  <h5 className="text-muted">{searchQuery ? 'No departments match your search.' : 'No departments added yet.'}</h5>
                  {!searchQuery && availableCategories.length > 0 && (
                    <button className="btn btn-primary mt-3" onClick={() => setShowAddDept(true)}>
                      <i className="fas fa-plus me-2"></i>Add First Department
                    </button>
                  )}
                </div>
              </div>
            ) : (
              <div className="row g-3">
                {filteredDepts.map(dept => {
                  const meta  = getCategoryMeta(dept.category_name?.toLowerCase().replace(/\s.*/,''));
                  const sMeta = DEPT_STATUS_META[dept.status] || { label: dept.status, cls: 'secondary' };
                  return (
                    <div key={dept.id} className="col-md-6 col-xl-4">
                      <div className="card border-0 shadow-sm h-100"
                        style={{ cursor: 'pointer', transition: 'box-shadow 0.2s' }}
                        onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.12)'}
                        onMouseLeave={e => e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.07)'}
                        onClick={() => openDeptDetail(dept)}>
                        <div className="card-body">
                          <div className="d-flex align-items-start gap-3 mb-3" style={{ overflow: 'hidden' }}>
                            <div style={{ width: 48, height: 48, borderRadius: 12, background: meta.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                              <i className={meta.icon} style={{ color: meta.color, fontSize: 20 }}></i>
                            </div>
                            <div style={{ minWidth: 0, flex: 1 }}>
                              <h6 className="mb-1 fw-bold" style={{ display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden', lineHeight: 1.3, wordBreak: 'break-word' }}>
                                {dept.category_name}
                              </h6>
                              <div className="d-flex align-items-center gap-2 flex-wrap">
                                <code style={{ fontSize: 10, color: '#64748b' }}>{dept.department_code}</code>
                                <span className={`badge bg-${sMeta.cls}`} style={{ fontSize: 10 }}>
                                  {sMeta.label}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="d-flex gap-3 mb-3">
                            <div className="text-center">
                              <div style={{ fontSize: 18, fontWeight: 800, color: meta.color }}>{dept.units_count ?? 0}</div>
                              <div style={{ fontSize: 10, color: '#64748b' }}>Units</div>
                            </div>
                            <div className="vr"></div>
                            <div className="flex-grow-1">
                              <div style={{ fontSize: 11, color: '#64748b' }}>Head of Department</div>
                              <div style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{dept.head_of_department || <span className="text-muted fst-italic">Not assigned</span>}</div>
                            </div>
                          </div>

                          {dept.location && (
                            <div style={{ fontSize: 11, color: '#64748b' }}>
                              <i className="fas fa-map-marker-alt me-1"></i>{dept.location}
                            </div>
                          )}
                        </div>
                        <div className="card-footer bg-transparent border-top-0 pt-0 pb-3 px-3">
                          <span style={{ fontSize: 11, color: meta.color, fontWeight: 600 }}>
                            View units &amp; details <i className="fas fa-arrow-right ms-1"></i>
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ══════════════════════════ DETAIL VIEW ════════════════════════════ */}
        {view === 'detail' && (
          <>
            {detailLoading ? (
              <div className="text-center py-5"><div className="spinner-border text-primary" role="status"></div></div>
            ) : !deptDetail ? (
              <div className="alert alert-danger">Could not load department details.</div>
            ) : (
              <>
                {/* Department info card */}
                <div className="card border-0 shadow-sm mb-4">
                  <div className="card-body">
                    <div className="row g-4">
                      <div className="col-md-3">
                        <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>Head of Department</div>
                        <div style={{ fontWeight: 600 }}>{deptDetail.head_of_department || <span className="text-muted">—</span>}</div>
                      </div>
                      <div className="col-md-2">
                        <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>Phone</div>
                        <div style={{ fontWeight: 600 }}>{deptDetail.phone || <span className="text-muted">—</span>}</div>
                      </div>
                      <div className="col-md-2">
                        <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>Email</div>
                        <div style={{ fontWeight: 600 }}>{deptDetail.email || <span className="text-muted">—</span>}</div>
                      </div>
                      <div className="col-md-3">
                        <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>Location</div>
                        <div style={{ fontWeight: 600 }}>{deptDetail.location || <span className="text-muted">—</span>}</div>
                      </div>
                      <div className="col-md-2">
                        <div style={{ fontSize: 11, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 1 }}>Status</div>
                        {(() => { const m = DEPT_STATUS_META[deptDetail.status] || { label: deptDetail.status, cls: 'secondary' }; return <span className={`badge bg-${m.cls}`}>{m.label}</span>; })()}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Units stats */}
                <div className="row g-3 mb-4">
                  {[
                    { label: 'Total Units',    value: (deptDetail.unit_instances || []).length,                              color: '#4361ee', bg: '#eff2ff', icon: 'fas fa-th-large' },
                    { label: 'Operational',    value: (deptDetail.unit_instances || []).filter(u => u.status === 'operational').length, color: '#16a34a', bg: '#f0fdf4', icon: 'fas fa-check-circle' },
                    { label: 'Total Beds',     value: (deptDetail.unit_instances || []).reduce((s, u) => s + (u.bed_capacity || 0), 0), color: '#7c3aed', bg: '#f3e8ff', icon: 'fas fa-bed' },
                    { label: 'Total Staff',    value: (deptDetail.unit_instances || []).reduce((s, u) => s + (u.staff_count || 0), 0),  color: '#f59e0b', bg: '#fffbeb', icon: 'fas fa-users' },
                  ].map((s, i) => (
                    <div key={i} className="col-6 col-md-3">
                      <div className="card border-0 shadow-sm">
                        <div className="card-body d-flex align-items-center gap-3 py-3">
                          <div style={{ width: 38, height: 38, borderRadius: 9, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <i className={s.icon} style={{ color: s.color, fontSize: 15 }}></i>
                          </div>
                          <div>
                            <div style={{ fontSize: 20, fontWeight: 800, color: '#1a1a2e', lineHeight: 1 }}>{s.value}</div>
                            <div style={{ fontSize: 10, color: '#64748b' }}>{s.label}</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Units table */}
                <div className="card border-0 shadow-sm">
                  <div className="card-header bg-white border-0 pt-3 pb-0">
                    <h6 className="fw-bold mb-0"><i className="fas fa-th-large me-2 text-primary"></i>Unit Instances</h6>
                  </div>
                  <div className="card-body p-0">
                    {(deptDetail.unit_instances || []).length === 0 ? (
                      <div className="text-center py-5">
                        <i className="fas fa-th-large" style={{ fontSize: 38, color: '#dee2e6', display: 'block', marginBottom: 10 }}></i>
                        <p className="text-muted mb-3">No units added to this department yet.</p>
                        {(deptDetail.available_units || []).length > 0 && (
                          <button className="btn btn-primary btn-sm" onClick={() => { setUnitForm(emptyUnitForm); setShowAddUnit(true); }}>
                            <i className="fas fa-plus me-1"></i>Add First Unit
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-hover mb-0">
                          <thead className="bg-light">
                            <tr>
                              <th>Unit</th>
                              <th>Code</th>
                              <th>Unit Head</th>
                              <th className="text-center">Beds</th>
                              <th className="text-center">Staff</th>
                              <th>Location</th>
                              <th>Status</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {deptDetail.unit_instances.map(unit => {
                              const sm = UNIT_STATUS_META[unit.status] || { label: unit.status, cls: 'secondary' };
                              return (
                                <tr key={unit.id}>
                                  <td><strong>{unit.unit_name}</strong></td>
                                  <td><code style={{ fontSize: 11 }}>{unit.unit_code}</code></td>
                                  <td>{unit.unit_head || <span className="text-muted small">—</span>}</td>
                                  <td className="text-center">
                                    <span className="badge bg-info bg-opacity-10 text-info">{unit.bed_capacity ?? 0}</span>
                                  </td>
                                  <td className="text-center">
                                    <span className="badge bg-purple bg-opacity-10" style={{ background: '#f3e8ff', color: '#7c3aed' }}>{unit.staff_count ?? 0}</span>
                                  </td>
                                  <td style={{ fontSize: 12 }}>{unit.location || <span className="text-muted">—</span>}</td>
                                  <td>
                                    <span className={`badge bg-${sm.cls}`} style={{ fontSize: 10 }}>{sm.label}</span>
                                  </td>
                                  <td>
                                    <div className="btn-group btn-group-sm">
                                      <button className="btn btn-outline-primary" title="Edit unit" onClick={() => openEditUnit(unit)}>
                                        <i className="fas fa-edit"></i>
                                      </button>
                                      <button className="btn btn-outline-danger" title="Remove unit"
                                        onClick={() => setConfirmDelUnit({ show: true, id: unit.id, name: unit.unit_name })}>
                                        <i className="fas fa-trash"></i>
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

                {/* Available units teaser */}
                {(deptDetail.available_units || []).length > 0 && (
                  <div className="card border-0 shadow-sm mt-4">
                    <div className="card-header bg-light border-0">
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="fw-semibold small text-muted">
                          <i className="fas fa-plus-circle me-1 text-success"></i>
                          {deptDetail.available_units.length} more unit{deptDetail.available_units.length !== 1 ? 's' : ''} available to add
                        </span>
                        <button className="btn btn-sm btn-success" onClick={() => { setUnitForm(emptyUnitForm); setShowAddUnit(true); }}>
                          <i className="fas fa-plus me-1"></i>Add Unit
                        </button>
                      </div>
                    </div>
                    <div className="card-body py-2">
                      <div className="d-flex flex-wrap gap-2">
                        {deptDetail.available_units.map(u => (
                          <span key={u.id} className="badge bg-light text-dark border" style={{ fontWeight: 500, fontSize: 11 }}>
                            {u.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* ══════════════════════════ MODALS ════════════════════════════════════ */}

      {/* Add Department Modal */}
      {showAddDept && (
        <div className="modal show d-block" style={modalOverlay}>
          <div className="modal-dialog modal-xl">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title"><i className="fas fa-plus-circle me-2 text-primary"></i>Add New Department</h5>
                <button type="button" className="btn-close" onClick={() => setShowAddDept(false)}></button>
              </div>
              <form onSubmit={handleCreateDept}>
                <div className="modal-body" style={{ maxHeight: '75vh', overflowY: 'auto' }}>
                  <div className="row g-3">
                    <div className="col-12">
                      <h6 className="text-primary mb-0"><i className="fas fa-building me-2"></i>Department Information</h6>
                      <hr className="mt-1 mb-2" />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Department Category *</label>
                      <select className="form-select" required value={deptForm.category}
                        onChange={e => setDeptForm(f => ({ ...f, category: e.target.value, selectedUnitIds: [] }))}>
                        <option value="">— Select a department category —</option>
                        {availableCategories.map(c => (
                          <option key={c.id} value={c.id}>{c.display_name}</option>
                        ))}
                      </select>
                      <div className="form-text">{availableCategories.length} categor{availableCategories.length === 1 ? 'y' : 'ies'} available to add</div>
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Head of Department</label>
                      <input type="text" className="form-control" value={deptForm.head_of_department}
                        onChange={e => setDeptForm(f => ({ ...f, head_of_department: e.target.value }))}
                        placeholder="e.g. Dr. John Kamara" />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Status</label>
                      <select className="form-select" value={deptForm.status}
                        onChange={e => setDeptForm(f => ({ ...f, status: e.target.value }))}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="under_construction">Under Construction</option>
                      </select>
                    </div>
                    {/* ── Unit selection panel (shown once category is picked) ── */}
                    {selectedCategoryUnits.length > 0 && (
                      <div className="col-12 mt-1">
                        <h6 className="text-primary mb-0"><i className="fas fa-th-large me-2"></i>Select Units to Include</h6>
                        <hr className="mt-1 mb-2" />
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span className="form-text mb-0">
                            {deptForm.selectedUnitIds.length} of {selectedCategoryUnits.length} unit{selectedCategoryUnits.length !== 1 ? 's' : ''} selected
                          </span>
                          <button type="button" className="btn btn-link btn-sm p-0 text-decoration-none" onClick={toggleAllUnits}>
                            {deptForm.selectedUnitIds.length === selectedCategoryUnits.length ? (
                              <><i className="fas fa-times-circle me-1 text-danger"></i>Deselect All</>
                            ) : (
                              <><i className="fas fa-check-double me-1 text-primary"></i>Select All</>
                            )}
                          </button>
                        </div>
                        <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, maxHeight: 360, overflowY: 'auto', background: '#f8fafc' }}>
                          <div className="row g-0">
                            {selectedCategoryUnits.map(unit => {
                              const checked = deptForm.selectedUnitIds.includes(unit.id);
                              return (
                                <div key={unit.id} className="col-md-4">
                                  <label
                                    className="d-flex align-items-center gap-2 px-3 py-3"
                                    style={{ cursor: 'pointer', borderBottom: '1px solid #f1f5f9', transition: 'background 0.15s', background: checked ? '#eff6ff' : 'transparent', minHeight: 56 }}
                                    onMouseEnter={e => { if (!checked) e.currentTarget.style.background = '#f1f5f9'; }}
                                    onMouseLeave={e => { if (!checked) e.currentTarget.style.background = 'transparent'; }}
                                  >
                                    <input
                                      type="checkbox"
                                      className="form-check-input mt-0 flex-shrink-0"
                                      style={{ width: 17, height: 17 }}
                                      checked={checked}
                                      onChange={() => toggleUnit(unit.id)}
                                    />
                                    <div style={{ minWidth: 0 }}>
                                      <div style={{ fontSize: 13, fontWeight: checked ? 600 : 500, color: checked ? '#1d4ed8' : '#374151', lineHeight: 1.3 }}>{unit.name}</div>
                                      <code style={{ fontSize: 10.5, color: '#94a3b8' }}>{unit.code}</code>
                                    </div>
                                  </label>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                        {deptForm.selectedUnitIds.length === 0 && (
                          <div className="form-text text-warning mt-1">
                            <i className="fas fa-info-circle me-1"></i>No units selected — you can add them later from the department detail page.
                          </div>
                        )}
                      </div>
                    )}

                    <div className="col-12 mt-1">
                      <h6 className="text-primary mb-0"><i className="fas fa-phone-alt me-2"></i>Contact &amp; Location</h6>
                      <hr className="mt-1 mb-2" />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Phone</label>
                      <input type="text" className="form-control" value={deptForm.phone}
                        onChange={e => setDeptForm(f => ({ ...f, phone: e.target.value }))}
                        placeholder="+232-76-000000" />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Email</label>
                      <input type="email" className="form-control" value={deptForm.email}
                        onChange={e => setDeptForm(f => ({ ...f, email: e.target.value }))}
                        placeholder="dept@hospital.gov.sl" />
                    </div>
                    <div className="col-md-12">
                      <label className="form-label">Location / Wing</label>
                      <input type="text" className="form-control" value={deptForm.location}
                        onChange={e => setDeptForm(f => ({ ...f, location: e.target.value }))}
                        placeholder="e.g. Building A, Floor 2" />
                    </div>
                    <div className="col-md-12">
                      <div className="form-check">
                        <input type="checkbox" className="form-check-input" id="dept_active"
                          checked={deptForm.is_active}
                          onChange={e => setDeptForm(f => ({ ...f, is_active: e.target.checked }))} />
                        <label className="form-check-label" htmlFor="dept_active">Mark department as active</label>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddDept(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? (
                      <><span className="spinner-border spinner-border-sm me-2"></span>Creating…</>
                    ) : deptForm.selectedUnitIds.length > 0 ? (
                      <>Create Department &amp; {deptForm.selectedUnitIds.length} Unit{deptForm.selectedUnitIds.length > 1 ? 's' : ''}</>
                    ) : 'Create Department'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Department Modal */}
      {showEditDept && (
        <div className="modal show d-block" style={modalOverlay}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title"><i className="fas fa-edit me-2 text-primary"></i>Edit Department</h5>
                <button type="button" className="btn-close" onClick={() => setShowEditDept(false)}></button>
              </div>
              <form onSubmit={handleUpdateDept}>
                <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                  <div className="row g-3">
                    <div className="col-12">
                      <h6 className="text-primary mb-0"><i className="fas fa-user-tie me-2"></i>Department Details</h6>
                      <hr className="mt-1 mb-2" />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Head of Department</label>
                      <input type="text" className="form-control" value={deptForm.head_of_department}
                        onChange={e => setDeptForm(f => ({ ...f, head_of_department: e.target.value }))}
                        placeholder="e.g. Dr. John Kamara" />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Status</label>
                      <select className="form-select" value={deptForm.status}
                        onChange={e => setDeptForm(f => ({ ...f, status: e.target.value }))}>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="under_construction">Under Construction</option>
                      </select>
                    </div>
                    <div className="col-12 mt-1">
                      <h6 className="text-primary mb-0"><i className="fas fa-phone-alt me-2"></i>Contact &amp; Location</h6>
                      <hr className="mt-1 mb-2" />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Phone</label>
                      <input type="text" className="form-control" value={deptForm.phone}
                        onChange={e => setDeptForm(f => ({ ...f, phone: e.target.value }))} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Email</label>
                      <input type="email" className="form-control" value={deptForm.email}
                        onChange={e => setDeptForm(f => ({ ...f, email: e.target.value }))} />
                    </div>
                    <div className="col-md-12">
                      <label className="form-label">Location / Wing</label>
                      <input type="text" className="form-control" value={deptForm.location}
                        onChange={e => setDeptForm(f => ({ ...f, location: e.target.value }))} />
                    </div>
                    <div className="col-md-12">
                      <div className="form-check">
                        <input type="checkbox" className="form-check-input" id="edit_dept_active"
                          checked={deptForm.is_active}
                          onChange={e => setDeptForm(f => ({ ...f, is_active: e.target.checked }))} />
                        <label className="form-check-label" htmlFor="edit_dept_active">Mark department as active</label>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowEditDept(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? <><span className="spinner-border spinner-border-sm me-2"></span>Saving…</> : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add Unit Modal */}
      {showAddUnit && deptDetail && (
        <div className="modal show d-block" style={modalOverlay}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title"><i className="fas fa-plus-circle me-2 text-success"></i>Add Unit — {deptDetail.category_name}</h5>
                <button type="button" className="btn-close" onClick={() => setShowAddUnit(false)}></button>
              </div>
              <form onSubmit={handleAddUnit}>
                <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                  <div className="row g-3">
                    <div className="col-12">
                      <h6 className="text-primary mb-0"><i className="fas fa-th-large me-2"></i>Unit Selection</h6>
                      <hr className="mt-1 mb-2" />
                    </div>
                    <div className="col-12">
                      <label className="form-label">Unit *</label>
                      <select className="form-select" required value={unitForm.unit_id}
                        onChange={e => setUnitForm(f => ({ ...f, unit_id: e.target.value }))}>
                        <option value="">— Select a unit to add —</option>
                        {(deptDetail.available_units || []).map(u => (
                          <option key={u.id} value={u.id}>{u.name} ({u.code})</option>
                        ))}
                      </select>
                    </div>
                    <div className="col-12 mt-1">
                      <h6 className="text-primary mb-0"><i className="fas fa-user-md me-2"></i>Staff &amp; Capacity</h6>
                      <hr className="mt-1 mb-2" />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Unit Head / Supervisor</label>
                      <input type="text" className="form-control" value={unitForm.unit_head}
                        onChange={e => setUnitForm(f => ({ ...f, unit_head: e.target.value }))}
                        placeholder="e.g. Dr. Sarah Bangura" />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Bed Capacity</label>
                      <input type="number" min="0" className="form-control" value={unitForm.bed_capacity}
                        onChange={e => setUnitForm(f => ({ ...f, bed_capacity: e.target.value }))}
                        placeholder="0" />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Staff Count</label>
                      <input type="number" min="0" className="form-control" value={unitForm.staff_count}
                        onChange={e => setUnitForm(f => ({ ...f, staff_count: e.target.value }))}
                        placeholder="0" />
                    </div>
                    <div className="col-12 mt-1">
                      <h6 className="text-primary mb-0"><i className="fas fa-map-marker-alt me-2"></i>Contact &amp; Location</h6>
                      <hr className="mt-1 mb-2" />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Phone</label>
                      <input type="text" className="form-control" value={unitForm.phone}
                        onChange={e => setUnitForm(f => ({ ...f, phone: e.target.value }))} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Location</label>
                      <input type="text" className="form-control" value={unitForm.location}
                        onChange={e => setUnitForm(f => ({ ...f, location: e.target.value }))}
                        placeholder="e.g. Wing B, Room 12" />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Operational Status</label>
                      <select className="form-select" value={unitForm.status}
                        onChange={e => setUnitForm(f => ({ ...f, status: e.target.value }))}>
                        <option value="operational">Operational</option>
                        <option value="under_maintenance">Under Maintenance</option>
                        <option value="temporarily_closed">Temporarily Closed</option>
                        <option value="non_operational">Non-Operational</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowAddUnit(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? <><span className="spinner-border spinner-border-sm me-2"></span>Adding…</> : 'Add Unit'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Unit Modal */}
      {showEditUnit && editingUnit && (
        <div className="modal show d-block" style={modalOverlay}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title"><i className="fas fa-edit me-2 text-primary"></i>Edit Unit — {editingUnit.unit_name}</h5>
                <button type="button" className="btn-close" onClick={() => { setShowEditUnit(false); setEditingUnit(null); }}></button>
              </div>
              <form onSubmit={handleUpdateUnit}>
                <div className="modal-body" style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                  <div className="row g-3">
                    <div className="col-12">
                      <h6 className="text-primary mb-0"><i className="fas fa-user-md me-2"></i>Staff &amp; Capacity</h6>
                      <hr className="mt-1 mb-2" />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Unit Head / Supervisor</label>
                      <input type="text" className="form-control" value={unitForm.unit_head}
                        onChange={e => setUnitForm(f => ({ ...f, unit_head: e.target.value }))} />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Bed Capacity</label>
                      <input type="number" min="0" className="form-control" value={unitForm.bed_capacity}
                        onChange={e => setUnitForm(f => ({ ...f, bed_capacity: e.target.value }))} />
                    </div>
                    <div className="col-md-3">
                      <label className="form-label">Staff Count</label>
                      <input type="number" min="0" className="form-control" value={unitForm.staff_count}
                        onChange={e => setUnitForm(f => ({ ...f, staff_count: e.target.value }))} />
                    </div>
                    <div className="col-12 mt-1">
                      <h6 className="text-primary mb-0"><i className="fas fa-map-marker-alt me-2"></i>Contact &amp; Location</h6>
                      <hr className="mt-1 mb-2" />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Phone</label>
                      <input type="text" className="form-control" value={unitForm.phone}
                        onChange={e => setUnitForm(f => ({ ...f, phone: e.target.value }))} />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Location</label>
                      <input type="text" className="form-control" value={unitForm.location}
                        onChange={e => setUnitForm(f => ({ ...f, location: e.target.value }))} />
                    </div>
                    <div className="col-12 mt-1">
                      <h6 className="text-primary mb-0"><i className="fas fa-cog me-2"></i>Settings</h6>
                      <hr className="mt-1 mb-2" />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">Operational Status</label>
                      <select className="form-select" value={unitForm.status}
                        onChange={e => setUnitForm(f => ({ ...f, status: e.target.value }))}>
                        <option value="operational">Operational</option>
                        <option value="under_maintenance">Under Maintenance</option>
                        <option value="temporarily_closed">Temporarily Closed</option>
                        <option value="non_operational">Non-Operational</option>
                      </select>
                    </div>
                    <div className="col-md-6 d-flex align-items-end">
                      <div className="form-check">
                        <input type="checkbox" className="form-check-input" id="unit_active"
                          checked={unitForm.is_active}
                          onChange={e => setUnitForm(f => ({ ...f, is_active: e.target.checked }))} />
                        <label className="form-check-label" htmlFor="unit_active">Mark unit as active</label>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => { setShowEditUnit(false); setEditingUnit(null); }}>Cancel</button>
                  <button type="submit" className="btn btn-primary" disabled={submitting}>
                    {submitting ? <><span className="spinner-border spinner-border-sm me-2"></span>Saving…</> : 'Save Changes'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Remove Unit */}
      <ConfirmModal
        show={confirmDelUnit.show}
        title="Remove Unit?"
        message={`This will deactivate the "${confirmDelUnit.name}" unit from this department.`}
        confirmLabel="Remove"
        variant="danger"
        onConfirm={confirmDeleteUnit}
        onCancel={() => setConfirmDelUnit({ show: false, id: null, name: '' })}
      />
    </DashboardLayout>
  );
}

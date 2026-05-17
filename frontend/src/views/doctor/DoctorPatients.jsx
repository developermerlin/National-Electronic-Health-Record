import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layout/DashboardLayout';
import { getNavForUser, getBrandForUser, getRoleBadge } from '../../utils/navItems';
import { showToast } from '../../utils/toast';

const STATUS_BADGE = {
  triaged:    { bg: '#dbeafe', color: '#1d4ed8', label: 'Triaged' },
  waiting:    { bg: '#fef9c3', color: '#92400e', label: 'Waiting' },
  in_progress:{ bg: '#fef3c7', color: '#b45309', label: 'In Progress' },
  completed:  { bg: '#dcfce7', color: '#166534', label: 'Completed' },
  cancelled:  { bg: '#fee2e2', color: '#991b1b', label: 'Cancelled' },
  registered: { bg: '#f3f4f6', color: '#374151', label: 'Registered' },
};

const VISIT_LABEL = {
  outpatient:      'OPD',
  inpatient:       'IPD',
  emergency:       'Emergency',
  follow_up:       'Follow-up',
  referral:        'Referral',
  routine_checkup: 'Checkup',
};

function avatarColor(name) {
  const colors = ['#4361ee','#7c3aed','#059669','#f77f00','#e63946','#0891b2','#ec4899'];
  let n = 0;
  for (let i = 0; i < name.length; i++) n += name.charCodeAt(i);
  return colors[n % colors.length];
}

function initials(name) {
  return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export default function DoctorPatients() {
  const { apiCall, user } = useAuth();
  const navigate = useNavigate();

  const [patients, setPatients]   = useState([]);
  const [loading, setLoading]     = useState(true);
  const [search, setSearch]       = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [total, setTotal]         = useState(0);
  const [viewMode, setViewMode]   = useState(() => localStorage.getItem('doctorPatientsView') || 'card');

  const setView = (mode) => {
    setViewMode(mode);
    localStorage.setItem('doctorPatientsView', mode);
  };

  const fetchPatients = useCallback(async (q = '') => {
    setLoading(true);
    try {
      const url = q ? `/visits/my_patients/?search=${encodeURIComponent(q)}` : '/visits/my_patients/';
      const res = await apiCall(url);
      if (res.ok) {
        const data = await res.json();
        setPatients(data.patients || []);
        setTotal(data.count || 0);
      } else {
        showToast.error('Failed to load patients');
      }
    } catch {
      showToast.error('Failed to load patients');
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  useEffect(() => { fetchPatients(); }, [fetchPatients]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput);
      fetchPatients(searchInput);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput, fetchPatients]);

  const genderIcon = (g) => {
    if (g === 'male')   return 'fas fa-mars text-primary';
    if (g === 'female') return 'fas fa-venus text-danger';
    return 'fas fa-genderless text-muted';
  };

  return (
    <DashboardLayout
      navItems={getNavForUser(user)}
      brandTitle={getBrandForUser(user)}
      roleBadge={getRoleBadge(user)}
    >
      <div className="container-fluid py-4">

        {/* Header */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
              <div>
                <h1 className="h3 mb-0">
                  <i className="fas fa-users me-2" style={{ color: '#e63946' }}></i>
                  My Patients
                </h1>
                <p className="text-muted mb-0 small">
                  All patients you have treated — {total} total
                </p>
              </div>
              <div className="d-flex gap-2 align-items-center">
                <div className="input-group input-group-sm" style={{ width: 260 }}>
                  <span className="input-group-text bg-white border-end-0">
                    <i className="fas fa-search text-muted"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control border-start-0"
                    placeholder="Search by name, ID or phone…"
                    value={searchInput}
                    onChange={e => setSearchInput(e.target.value)}
                  />
                  {searchInput && (
                    <button
                      className="btn btn-outline-secondary btn-sm"
                      onClick={() => { setSearchInput(''); fetchPatients(''); }}
                    >
                      <i className="fas fa-times"></i>
                    </button>
                  )}
                </div>

                {/* View toggle */}
                <div className="btn-group btn-group-sm" role="group" aria-label="View mode">
                  <button
                    className={`btn ${viewMode === 'card' ? 'btn-danger' : 'btn-outline-secondary'}`}
                    onClick={() => setView('card')}
                    title="Card view"
                  >
                    <i className="fas fa-th-large"></i>
                  </button>
                  <button
                    className={`btn ${viewMode === 'list' ? 'btn-danger' : 'btn-outline-secondary'}`}
                    onClick={() => setView('list')}
                    title="List view"
                  >
                    <i className="fas fa-list"></i>
                  </button>
                </div>

                <button
                  className="btn btn-sm btn-outline-secondary"
                  onClick={() => fetchPatients(search)}
                  disabled={loading}
                >
                  <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-danger"></div>
            <p className="text-muted mt-2 small">Loading patients…</p>
          </div>
        ) : patients.length === 0 ? (
          <div className="text-center py-5">
            <div style={{
              width: 120, height: 120, margin: '0 auto',
              background: '#f3f4f6', borderRadius: '50%',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <i className="fas fa-user-md fa-3x text-muted"></i>
            </div>
            <h5 className="text-muted mt-3">
              {searchInput ? 'No patients match your search' : 'No patients yet'}
            </h5>
            <p className="text-muted small">
              {searchInput
                ? 'Try a different name or ID'
                : 'Patients will appear here after you see them in a consultation.'}
            </p>
          </div>
        ) : viewMode === 'card' ? (
          /* ── Card grid view ── */
          <div className="row g-3">
            {patients.map(p => {
              const badge = STATUS_BADGE[p.last_visit_status] || STATUS_BADGE.registered;
              const color = avatarColor(p.full_name);
              return (
                <div key={p.id} className="col-md-6 col-xl-4">
                  <div
                    className="card border-0 shadow-sm h-100"
                    style={{ cursor: 'pointer', transition: 'transform .15s, box-shadow .15s' }}
                    onClick={() => navigate(`/receptionist/patients/${p.id}`)}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 20px rgba(0,0,0,.12)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = ''; }}
                  >
                    <div className="card-body p-4">
                      <div className="d-flex align-items-center gap-3 mb-3">
                        <div style={{
                          width: 52, height: 52, borderRadius: '50%',
                          background: color, color: '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 18, fontWeight: 700, flexShrink: 0,
                        }}>
                          {initials(p.full_name)}
                        </div>
                        <div className="flex-grow-1 min-w-0">
                          <div className="fw-semibold fs-6 text-truncate">{p.full_name}</div>
                          <div className="small text-muted">{p.patient_id}</div>
                        </div>
                        <span className="badge rounded-pill" style={{ fontSize: 11, padding: '4px 10px', background: badge.bg, color: badge.color }}>
                          {badge.label}
                        </span>
                      </div>
                      <div className="row g-2 mb-3">
                        <div className="col-6">
                          <div className="small text-muted">
                            <i className={`${genderIcon(p.gender)} me-1`}></i>
                            {p.gender ? p.gender.charAt(0).toUpperCase() + p.gender.slice(1) : '—'}
                            {p.age != null && <span className="ms-1 text-dark">· {p.age} yrs</span>}
                          </div>
                        </div>
                        <div className="col-6 text-end">
                          <div className="small text-muted"><i className="fas fa-phone me-1"></i>{p.phone}</div>
                        </div>
                        <div className="col-6">
                          <div className="small text-muted">
                            <i className="fas fa-stethoscope me-1 text-danger"></i>
                            {VISIT_LABEL[p.last_visit_type] || p.last_visit_type || '—'}
                          </div>
                        </div>
                        <div className="col-6 text-end">
                          <div className="small text-muted">
                            <i className="fas fa-layer-group me-1"></i>
                            {p.total_visits} visit{p.total_visits !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                      {p.last_chief_complaint && (
                        <div className="small text-muted mb-3 text-truncate" style={{ background: '#f8fafc', borderRadius: 6, padding: '6px 10px' }}>
                          <i className="fas fa-notes-medical me-1 text-danger"></i>
                          {p.last_chief_complaint}
                        </div>
                      )}
                      <div className="d-flex justify-content-between align-items-center">
                        <div className="small text-muted">
                          <i className="fas fa-calendar-check me-1"></i>
                          Last seen: {fmtDate(p.last_visit_date)}
                        </div>
                        <button
                          className="btn btn-sm"
                          style={{ background: '#e63946', color: '#fff', fontSize: 12, padding: '3px 12px' }}
                          onClick={e => { e.stopPropagation(); navigate(`/receptionist/patients/${p.id}`); }}
                        >
                          View <i className="fas fa-chevron-right ms-1" style={{ fontSize: 10 }}></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── List / table view ── */
          <div className="card border-0 shadow-sm">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead style={{ background: '#f8fafc' }}>
                  <tr>
                    <th className="ps-4 py-3 fw-semibold text-muted small">Patient</th>
                    <th className="py-3 fw-semibold text-muted small">Gender / Age</th>
                    <th className="py-3 fw-semibold text-muted small">Phone</th>
                    <th className="py-3 fw-semibold text-muted small">Last Visit</th>
                    <th className="py-3 fw-semibold text-muted small">Type</th>
                    <th className="py-3 fw-semibold text-muted small">Status</th>
                    <th className="py-3 fw-semibold text-muted small text-center">Visits</th>
                    <th className="py-3 fw-semibold text-muted small">Chief Complaint</th>
                    <th className="pe-4 py-3"></th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map(p => {
                    const badge = STATUS_BADGE[p.last_visit_status] || STATUS_BADGE.registered;
                    const color = avatarColor(p.full_name);
                    return (
                      <tr
                        key={p.id}
                        style={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/receptionist/patients/${p.id}`)}
                        onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                        onMouseLeave={e => e.currentTarget.style.background = ''}
                      >
                        <td className="ps-4 py-3">
                          <div className="d-flex align-items-center gap-2">
                            <div style={{
                              width: 36, height: 36, borderRadius: '50%',
                              background: color, color: '#fff',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: 13, fontWeight: 700, flexShrink: 0,
                            }}>
                              {initials(p.full_name)}
                            </div>
                            <div>
                              <div className="fw-semibold small">{p.full_name}</div>
                              <div className="text-muted" style={{ fontSize: 11 }}>{p.patient_id}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 small text-muted">
                          <i className={`${genderIcon(p.gender)} me-1`}></i>
                          {p.gender ? p.gender.charAt(0).toUpperCase() + p.gender.slice(1) : '—'}
                          {p.age != null && <span className="ms-1">· {p.age}y</span>}
                        </td>
                        <td className="py-3 small text-muted">{p.phone}</td>
                        <td className="py-3 small text-muted">{fmtDate(p.last_visit_date)}</td>
                        <td className="py-3 small text-muted">
                          {VISIT_LABEL[p.last_visit_type] || p.last_visit_type || '—'}
                        </td>
                        <td className="py-3">
                          <span className="badge rounded-pill" style={{ fontSize: 11, padding: '3px 9px', background: badge.bg, color: badge.color }}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="py-3 text-center small text-muted">{p.total_visits}</td>
                        <td className="py-3 small text-muted" style={{ maxWidth: 200 }}>
                          <span className="text-truncate d-block" title={p.last_chief_complaint}>
                            {p.last_chief_complaint || '—'}
                          </span>
                        </td>
                        <td className="pe-4 py-3">
                          <button
                            className="btn btn-sm"
                            style={{ background: '#e63946', color: '#fff', fontSize: 11, padding: '2px 10px', whiteSpace: 'nowrap' }}
                            onClick={e => { e.stopPropagation(); navigate(`/receptionist/patients/${p.id}`); }}
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}

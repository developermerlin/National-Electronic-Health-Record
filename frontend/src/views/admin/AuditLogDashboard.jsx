import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layout/DashboardLayout';
import showToast from '../../utils/toast';
import { getNavForUser, getBrandForUser, getRoleBadge } from '../../utils/navItems';

const OUTCOME_BADGE = {
  allowed:  { bg: '#d1fae5', color: '#065f46', label: 'Allowed' },
  denied:   { bg: '#fee2e2', color: '#991b1b', label: 'Denied' },
  override: { bg: '#fef3c7', color: '#92400e', label: 'Override' },
};

const ACTION_ICON = {
  view:      'fas fa-eye',
  edit:      'fas fa-edit',
  create:    'fas fa-plus-circle',
  delete:    'fas fa-trash-alt',
  export:    'fas fa-file-export',
  emergency: 'fas fa-ambulance',
};

export default function AuditLogDashboard() {
  const { apiCall, user } = useAuth();
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ action: '', access_type: '', outcome: '', search: '', date_from: '', date_to: '' });

  const navItems  = getNavForUser(user);
  const brand     = getBrandForUser(user);
  const roleBadge = getRoleBadge(user);

  const fetchData = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.action)      params.set('action', filters.action);
      if (filters.access_type) params.set('access_type', filters.access_type);
      if (filters.outcome)     params.set('outcome', filters.outcome);
      if (filters.date_from)   params.set('date_from', filters.date_from);
      if (filters.date_to)     params.set('date_to', filters.date_to);
      if (filters.search)      params.set('search', filters.search);

      const [lRes, sRes] = await Promise.all([
        apiCall(`/audit/logs/?${params.toString()}`),
        apiCall('/audit/logs/stats/'),
      ]);
      if (lRes.ok) setLogs(await lRes.json());
      if (sRes.ok) setStats(await sRes.json());
    } catch { showToast.error('Failed to load audit logs'); }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);

  const applyFilters = () => fetchData();

  const clearFilters = () => {
    setFilters({ action: '', access_type: '', outcome: '', search: '', date_from: '', date_to: '' });
    setTimeout(fetchData, 0);
  };

  const StatCard = ({ icon, iconBg, iconColor, value, label }) => (
    <div className="dash-card" style={{ padding: '18px 20px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        <div style={{ width: '44px', height: '44px', borderRadius: '12px', background: iconBg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <i className={icon} style={{ color: iconColor, fontSize: '17px' }}></i>
        </div>
        <div>
          <div style={{ fontSize: '24px', fontWeight: 800, color: '#1a1a2e', lineHeight: 1 }}>{value}</div>
          <div style={{ fontSize: '11px', color: '#6c757d', marginTop: '3px', fontWeight: 500 }}>{label}</div>
        </div>
      </div>
    </div>
  );

  return (
    <DashboardLayout navItems={navItems} brandTitle={brand} roleBadge={roleBadge}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
        <h5 style={{ margin: 0, fontWeight: 700, color: '#1a1a2e' }}><i className="fas fa-shield-alt me-2" style={{ color: '#4361ee' }}></i>Audit Logs</h5>
        <span style={{ fontSize: '12px', color: '#6c757d' }}>Immutable record of patient data access</span>
      </div>

      {/* Stats Row */}
      {stats && (
        <div className="row g-3 mb-4">
          <div className="col-6 col-lg-3"><StatCard icon="fas fa-list" iconBg="#eff6ff" iconColor="#4361ee" value={stats.total_logs} label="Total Logs" /></div>
          <div className="col-6 col-lg-3"><StatCard icon="fas fa-calendar-day" iconBg="#f0fdf4" iconColor="#16a34a" value={stats.today} label="Today" /></div>
          <div className="col-6 col-lg-3"><StatCard icon="fas fa-check-circle" iconBg="#d1fae5" iconColor="#065f46" value={stats.by_outcome?.allowed || 0} label="Allowed" /></div>
          <div className="col-6 col-lg-3"><StatCard icon="fas fa-times-circle" iconBg="#fee2e2" iconColor="#991b1b" value={stats.by_outcome?.denied || 0} label="Denied" /></div>
        </div>
      )}

      {/* Filters */}
      <div className="dash-card mb-4" style={{ overflow: 'visible' }}>
        <div className="dash-card-header"><h6 style={{ margin: 0 }}><i className="fas fa-filter me-2"></i>Filters</h6></div>
        <div className="dash-card-body">
          <div className="row g-2">
            <div className="col-md-3">
              <select className="form-select form-select-sm" value={filters.action} onChange={e => setFilters(p => ({ ...p, action: e.target.value }))}>
                <option value="">All Actions</option>
                <option value="view">View</option>
                <option value="edit">Edit</option>
                <option value="create">Create</option>
                <option value="delete">Delete</option>
                <option value="export">Export</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>
            <div className="col-md-3">
              <select className="form-select form-select-sm" value={filters.access_type} onChange={e => setFilters(p => ({ ...p, access_type: e.target.value }))}>
                <option value="">All Access Types</option>
                <option value="same_hospital">Same Hospital</option>
                <option value="cross_hospital">Cross Hospital</option>
                <option value="emergency_override">Emergency Override</option>
                <option value="ministry">Ministry</option>
              </select>
            </div>
            <div className="col-md-3">
              <select className="form-select form-select-sm" value={filters.outcome} onChange={e => setFilters(p => ({ ...p, outcome: e.target.value }))}>
                <option value="">All Outcomes</option>
                <option value="allowed">Allowed</option>
                <option value="denied">Denied</option>
                <option value="override">Override</option>
              </select>
            </div>
            <div className="col-md-3">
              <input className="form-control form-control-sm" placeholder="Search user or patient…" value={filters.search} onChange={e => setFilters(p => ({ ...p, search: e.target.value }))} />
            </div>
            <div className="col-md-3">
              <input type="date" className="form-control form-control-sm" value={filters.date_from} onChange={e => setFilters(p => ({ ...p, date_from: e.target.value }))} />
            </div>
            <div className="col-md-3">
              <input type="date" className="form-control form-control-sm" value={filters.date_to} onChange={e => setFilters(p => ({ ...p, date_to: e.target.value }))} />
            </div>
            <div className="col-md-6 d-flex gap-2">
              <button className="btn btn-primary btn-sm" onClick={applyFilters}><i className="fas fa-search me-1"></i>Apply</button>
              <button className="btn btn-outline-secondary btn-sm" onClick={clearFilters}><i className="fas fa-undo me-1"></i>Clear</button>
            </div>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="dash-card" style={{ overflow: 'hidden' }}>
        <div className="dash-card-header">
          <h6 style={{ margin: 0 }}><i className="fas fa-list me-2"></i>Access Records</h6>
          <span style={{ fontSize: '12px', color: '#6c757d' }}>{logs.length} entries</span>
        </div>
        <div className="dash-card-body" style={{ padding: 0 }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '48px' }}><div className="spinner-border text-primary"></div></div>
          ) : logs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', color: '#adb5bd' }}>
              <i className="fas fa-shield-alt" style={{ fontSize: '36px', marginBottom: '10px', display: 'block', opacity: 0.5 }}></i>
              <div style={{ fontWeight: 600 }}>No audit logs found</div>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-sm table-hover mb-0" style={{ fontSize: '13px' }}>
                <thead style={{ background: '#f8fafc' }}>
                  <tr>
                    <th className="text-muted" style={{ fontSize: '11px', fontWeight: 700 }}>Time</th>
                    <th className="text-muted" style={{ fontSize: '11px', fontWeight: 700 }}>User</th>
                    <th className="text-muted" style={{ fontSize: '11px', fontWeight: 700 }}>Action</th>
                    <th className="text-muted" style={{ fontSize: '11px', fontWeight: 700 }}>Patient</th>
                    <th className="text-muted" style={{ fontSize: '11px', fontWeight: 700 }}>Access Type</th>
                    <th className="text-muted" style={{ fontSize: '11px', fontWeight: 700 }}>Outcome</th>
                    <th className="text-muted" style={{ fontSize: '11px', fontWeight: 700 }}>Endpoint</th>
                    <th className="text-muted" style={{ fontSize: '11px', fontWeight: 700 }}>Justification</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.map(log => {
                    const ob = OUTCOME_BADGE[log.outcome] || OUTCOME_BADGE.allowed;
                    const acIcon = ACTION_ICON[log.action] || 'fas fa-circle';
                    return (
                      <tr key={log.id}>
                        <td style={{ whiteSpace: 'nowrap', color: '#475569' }}>
                          {new Date(log.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td>
                          <div style={{ fontWeight: 600, color: '#1a1a2e' }}>{log.user_name}</div>
                          <div style={{ fontSize: '11px', color: '#94a3b8' }}>{log.user_role} · {log.user_hospital_name || '—'}</div>
                        </td>
                        <td><i className={`${acIcon} me-1`} style={{ color: '#4361ee' }}></i>{log.action}</td>
                        <td>
                          {log.patient_name ? (
                            <div>
                              <div style={{ fontWeight: 500 }}>{log.patient_name}</div>
                              <div style={{ fontSize: '11px', color: '#94a3b8' }}>{log.patient_hospital_name || '—'}</div>
                            </div>
                          ) : <span className="text-muted">—</span>}
                        </td>
                        <td><span className="badge" style={{ background: '#f1f5f9', color: '#475569', fontSize: 10 }}>{log.access_type}</span></td>
                        <td><span className="badge" style={{ background: ob.bg, color: ob.color, fontSize: 10 }}>{ob.label}</span></td>
                        <td style={{ fontSize: '11px', color: '#64748b', maxWidth: '180px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{log.endpoint || '—'}</td>
                        <td style={{ fontSize: '11px', color: '#64748b', maxWidth: '200px' }}>{log.justification || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

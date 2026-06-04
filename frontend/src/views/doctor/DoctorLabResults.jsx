import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layout/DashboardLayout';
import { getNavForUser, getBrandForUser, getRoleBadge } from '../../utils/navItems';

const ACCENT = '#0891b2';

const statusStyle = s => {
  if (s === 'completed')        return { bg: '#dcfce7', color: '#15803d', label: 'Completed' };
  if (s === 'sample_collected') return { bg: '#dbeafe', color: '#1d4ed8', label: 'Sample Collected' };
  if (s === 'processing')       return { bg: '#fef3c7', color: '#b45309', label: 'Processing' };
  if (s === 'cancelled')        return { bg: '#f1f5f9', color: '#64748b', label: 'Cancelled' };
  return                               { bg: '#fff7ed', color: '#c2410c', label: 'Ordered' };
};

function DetailModal({ test, onClose }) {
  const st = statusStyle(test.status);
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}>
      <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 600, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: st.bg, color: st.color }}>{st.label}</span>
              {test.is_critical && <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: '#fee2e2', color: '#dc2626' }}>
                <i className="fas fa-exclamation-triangle" style={{ marginRight: 4 }}></i>CRITICAL
              </span>}
            </div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{test.test_name}</h3>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>{test.test_category_display}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#94a3b8' }}>×</button>
        </div>

        <div style={{ padding: '20px 24px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <InfoBlock label="Patient" value={test.patient?.full_name} sub={`ID: ${test.patient?.patient_id}`} />
          <InfoBlock label="Sample Type" value={test.sample_type_display} />
          <InfoBlock label="Ordered By" value={test.ordered_by?.name || '—'} />
          <InfoBlock label="Ordered On" value={new Date(test.created_at).toLocaleString('en-GB')} />
          {test.sample_collected_at && <InfoBlock label="Sample Collected" value={new Date(test.sample_collected_at).toLocaleString('en-GB')} sub={test.sample_collected_by?.name} />}
          {test.completed_at && <InfoBlock label="Completed" value={new Date(test.completed_at).toLocaleString('en-GB')} sub={test.completed_by?.name} />}
          {test.clinical_info && <div style={{ gridColumn: '1/-1' }}><InfoBlock label="Clinical Indication" value={test.clinical_info} /></div>}

          {test.result_value && (
            <div style={{ gridColumn: '1/-1', background: test.is_critical ? '#fef2f2' : '#f0fdf4', borderRadius: 10, padding: '14px 16px', border: `1px solid ${test.is_critical ? '#fca5a5' : '#bbf7d0'}` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>Result</div>
              <pre style={{ margin: 0, fontSize: 14, color: '#0f172a', whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontWeight: 600 }}>{test.result_value}</pre>
              {test.result_unit && <span style={{ fontSize: 12, color: '#64748b', marginTop: 4, display: 'block' }}>Unit: {test.result_unit}</span>}
              {test.reference_range && <span style={{ fontSize: 12, color: '#64748b', display: 'block' }}>Ref: {test.reference_range}</span>}
              {test.result_notes && <p style={{ margin: '8px 0 0', fontSize: 13, color: '#475569' }}>{test.result_notes}</p>}
            </div>
          )}
        </div>

        <div style={{ padding: '12px 24px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={{ padding: '9px 18px', borderRadius: 9, border: '1.5px solid #e2e8f0', background: '#fff', color: '#475569', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Close</button>
        </div>
      </div>
    </div>
  );
}

function InfoBlock({ label, value, sub }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{value || '—'}</div>
      {sub && <div style={{ fontSize: 12, color: '#64748b', marginTop: 1 }}>{sub}</div>}
    </div>
  );
}

export default function DoctorLabResults() {
  const { apiCall, user } = useAuth();
  const [tests, setTests]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [selectedTest, setSelectedTest] = useState(null);
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');

  const fetchTests = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search)         params.set('search', search);
      if (statusFilter)   params.set('status', statusFilter);
      if (categoryFilter) params.set('category', categoryFilter);
      const res = await apiCall(`/lab/tests/?${params}`);
      if (res.ok) {
        const d = await res.json();
        setTests(Array.isArray(d) ? d : d.results || []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [apiCall, search, statusFilter, categoryFilter]);

  useEffect(() => { fetchTests(); }, [fetchTests]);

  const completed = tests.filter(t => t.status === 'completed').length;
  const pending   = tests.filter(t => t.status !== 'completed' && t.status !== 'cancelled').length;
  const critical  = tests.filter(t => t.is_critical).length;

  return (
    <DashboardLayout navItems={getNavForUser(user)} brandTitle={getBrandForUser(user)} roleBadge={getRoleBadge(user)}>
      <div style={{ padding: '28px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: 0 }}>
            <i className="fas fa-flask me-2" style={{ color: ACCENT }}></i>Laboratory Results
          </h1>
          <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 14 }}>View all lab test results for your patients</p>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 20 }}>
          {[
            { label: 'Total Tests',   value: tests.length, icon: 'fas fa-flask',             accent: ACCENT },
            { label: 'Completed',     value: completed,    icon: 'fas fa-check-circle',      accent: '#10b981' },
            { label: 'Pending',       value: pending,      icon: 'fas fa-hourglass-half',    accent: '#f59e0b' },
            { label: 'Critical',      value: critical,     icon: 'fas fa-exclamation-circle',accent: '#dc2626' },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', borderRadius: 14, padding: '16px 20px', boxShadow: '0 2px 8px rgba(15,23,42,0.06)' }}>
              <div style={{ width: 40, height: 40, borderRadius: 11, background: s.accent + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                <i className={s.icon} style={{ color: s.accent, fontSize: 16 }}></i>
              </div>
              <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{s.value}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ background: '#fff', borderRadius: 14, padding: '14px 18px', marginBottom: 16, boxShadow: '0 2px 8px rgba(15,23,42,0.06)', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '2 1 220px', position: 'relative' }}>
            <i className="fas fa-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 13, pointerEvents: 'none' }}></i>
            <input type="text" placeholder="Search patient name or ID..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none', background: '#f8fafc', color: '#0f172a', boxSizing: 'border-box' }}
            />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            style={{ flex: '1 1 150px', padding: '9px 12px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, background: '#f8fafc', outline: 'none', cursor: 'pointer' }}>
            <option value="">All Statuses</option>
            <option value="ordered">Ordered</option>
            <option value="sample_collected">Sample Collected</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
          </select>
          <select value={categoryFilter} onChange={e => setCategoryFilter(e.target.value)}
            style={{ flex: '1 1 150px', padding: '9px 12px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, background: '#f8fafc', outline: 'none', cursor: 'pointer' }}>
            <option value="">All Categories</option>
            <option value="haematology">Haematology</option>
            <option value="biochemistry">Biochemistry</option>
            <option value="microbiology">Microbiology</option>
            <option value="serology">Serology</option>
            <option value="urinalysis">Urinalysis</option>
            <option value="parasitology">Parasitology</option>
          </select>
          <button onClick={() => { setSearch(''); setStatusFilter(''); setCategoryFilter(''); }}
            style={{ padding: '9px 16px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', color: '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <i className="fas fa-times" style={{ marginRight: 6, fontSize: 11 }}></i>Clear
          </button>
        </div>

        {/* Table */}
        <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 8px rgba(15,23,42,0.06)', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 2fr 1.2fr 1fr 1fr 80px', padding: '10px 20px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
            {['Patient', 'Test', 'Category', 'Status', 'Date', ''].map(h => (
              <div key={h} style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{h}</div>
            ))}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '50px 0' }}>
              <div className="spinner-border" style={{ color: ACCENT }} role="status"></div>
              <div style={{ marginTop: 12, fontSize: 13, color: '#94a3b8' }}>Loading...</div>
            </div>
          ) : tests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 0', color: '#94a3b8' }}>
              <i className="fas fa-flask" style={{ fontSize: 44, marginBottom: 12, display: 'block' }}></i>
              <p style={{ margin: 0, fontWeight: 600 }}>No lab tests found.</p>
            </div>
          ) : (
            tests.map((test, idx) => {
              const st = statusStyle(test.status);
              return (
                <div key={test.id}
                  style={{ display: 'grid', gridTemplateColumns: '2.2fr 2fr 1.2fr 1fr 1fr 80px', padding: '13px 20px', alignItems: 'center',
                    borderBottom: idx < tests.length - 1 ? '1px solid #f8fafc' : 'none', transition: 'background 0.12s',
                    background: test.is_critical ? '#fffbeb' : 'transparent' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#fafbfc'}
                  onMouseLeave={e => e.currentTarget.style.background = test.is_critical ? '#fffbeb' : 'transparent'}
                >
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>
                      {test.patient?.full_name}
                      {test.is_critical && <span style={{ marginLeft: 6, fontSize: 10, fontWeight: 800, color: '#dc2626' }}>⚠</span>}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>{test.patient?.patient_id}</div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{test.test_name}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{test.test_category_display}</div>
                  <div>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: st.bg, color: st.color }}>{st.label}</span>
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>{new Date(test.created_at).toLocaleDateString('en-GB')}</div>
                  <div>
                    <button onClick={() => setSelectedTest(test)}
                      style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', cursor: 'pointer', fontSize: 11, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      onMouseEnter={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.color = '#0891b2'; }}
                      onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#475569'; }}
                      title="View">
                      <i className="fas fa-eye"></i>
                    </button>
                  </div>
                </div>
              );
            })
          )}

          {!loading && tests.length > 0 && (
            <div style={{ padding: '10px 20px', background: '#f8fafc', borderTop: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>
                Showing <strong style={{ color: '#334155' }}>{tests.length}</strong> test{tests.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      </div>

      {selectedTest && <DetailModal test={selectedTest} onClose={() => setSelectedTest(null)} />}
    </DashboardLayout>
  );
}

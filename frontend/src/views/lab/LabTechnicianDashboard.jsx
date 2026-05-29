/* eslint-disable react-hooks/exhaustive-deps */
import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layout/DashboardLayout';

const ACCENT = '#0891b2';

const navItems = [
  { label: 'Dashboard', items: [
    { path: '/lab/dashboard', icon: 'fas fa-tachometer-alt', text: 'Overview' },
  ]},
  { label: 'Laboratory', items: [
    { path: '/lab/tests', icon: 'fas fa-flask', text: 'All Test Requests' },
    { path: '/lab/queue', icon: 'fas fa-list-ol', text: 'Pending Queue' },
  ]},
  { label: 'Account', items: [
    { path: '/admin/profile', icon: 'fas fa-user-circle', text: 'My Profile' },
  ]},
];

const priorityStyle = p => {
  if (p === 'stat')    return { bg: '#fce7f3', color: '#be185d', label: 'STAT' };
  if (p === 'urgent')  return { bg: '#fee2e2', color: '#dc2626', label: 'Urgent' };
  return                      { bg: '#f0fdf4', color: '#16a34a', label: 'Routine' };
};

const statusStyle = s => {
  if (s === 'completed')        return { bg: '#dcfce7', color: '#15803d' };
  if (s === 'sample_collected') return { bg: '#dbeafe', color: '#1d4ed8' };
  if (s === 'processing')       return { bg: '#fef3c7', color: '#b45309' };
  if (s === 'cancelled')        return { bg: '#f1f5f9', color: '#64748b' };
  return                               { bg: '#fff7ed', color: '#c2410c' }; // ordered
};

function ResultModal({ test, onClose, onSave }) {
  const [form, setForm] = useState({
    result_value: test.result_value || '',
    result_unit: test.result_unit || '',
    reference_range: test.reference_range || '',
    result_notes: test.result_notes || '',
    is_critical: test.is_critical || false,
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSave = async () => {
    if (!form.result_value.trim()) return;
    setSaving(true);
    await onSave(form);
    setSaving(false);
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16,
    }}>
      <div style={{
        background: '#fff', borderRadius: 18, width: '100%', maxWidth: 560,
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden',
      }}>
        {/* Header */}
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 800, color: '#0f172a' }}>Record Result</h3>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>
              {test.test_name} — {test.patient?.full_name}
            </p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94a3b8' }}>×</button>
        </div>

        <div style={{ padding: '20px 24px' }}>
          {/* Clinical info */}
          {test.clinical_info && (
            <div style={{ background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 13, color: '#0369a1' }}>
              <strong>Clinical indication:</strong> {test.clinical_info}
            </div>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 5 }}>Result Value *</label>
              <textarea
                rows={4}
                value={form.result_value}
                onChange={e => set('result_value', e.target.value)}
                placeholder="Enter result(s) here — e.g. Hb: 9.8 g/dL, WBC: 6.2×10³/µL"
                style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 5 }}>Unit</label>
              <input value={form.result_unit} onChange={e => set('result_unit', e.target.value)}
                placeholder="e.g. g/dL, mmol/L"
                style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
            </div>
            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 5 }}>Reference Range</label>
              <input value={form.reference_range} onChange={e => set('reference_range', e.target.value)}
                placeholder="e.g. 12.0–16.0 g/dL"
                style={{ width: '100%', padding: '9px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, boxSizing: 'border-box' }} />
            </div>
            <div style={{ gridColumn: '1/-1' }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 5 }}>Interpretation / Notes</label>
              <textarea
                rows={2}
                value={form.result_notes}
                onChange={e => set('result_notes', e.target.value)}
                placeholder="Interpretation, comments, follow-up suggestions…"
                style={{ width: '100%', padding: '10px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, resize: 'vertical', boxSizing: 'border-box' }}
              />
            </div>
          </div>

          {/* Critical flag */}
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 20,
            background: form.is_critical ? '#fef2f2' : '#f8fafc', border: `1.5px solid ${form.is_critical ? '#fca5a5' : '#e2e8f0'}`,
            borderRadius: 10, padding: '10px 14px' }}>
            <input type="checkbox" checked={form.is_critical} onChange={e => set('is_critical', e.target.checked)}
              style={{ width: 16, height: 16, cursor: 'pointer' }} />
            <span style={{ fontWeight: 700, fontSize: 13, color: form.is_critical ? '#dc2626' : '#475569' }}>
              <i className="fas fa-exclamation-triangle" style={{ marginRight: 6, color: '#dc2626' }}></i>
              Mark as Critical Value (requires immediate doctor notification)
            </span>
          </label>

          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <button onClick={onClose} style={{
              padding: '10px 22px', borderRadius: 9, border: '1.5px solid #e2e8f0',
              background: '#fff', color: '#475569', fontWeight: 700, fontSize: 14, cursor: 'pointer',
            }}>Cancel</button>
            <button onClick={handleSave} disabled={saving || !form.result_value.trim()} style={{
              padding: '10px 22px', borderRadius: 9, border: 'none',
              background: saving ? '#93c5fd' : `linear-gradient(135deg,${ACCENT},#0e7490)`,
              color: '#fff', fontWeight: 700, fontSize: 14, cursor: saving ? 'default' : 'pointer',
              boxShadow: '0 4px 12px rgba(8,145,178,0.3)',
            }}>
              {saving ? <><i className="fas fa-spinner fa-spin" style={{ marginRight: 6 }}></i>Saving…</> : 'Save Result'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailModal({ test, onClose, onCollect, onNotify }) {
  const [collecting, setCollecting] = useState(false);
  const [notifying, setNotifying]   = useState(false);

  const handleCollect = async () => { setCollecting(true); await onCollect(); setCollecting(false); };
  const handleNotify  = async () => { setNotifying(true);  await onNotify();  setNotifying(false);  };
  const pr = priorityStyle(test.priority);
  const st = statusStyle(test.status);

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16,
    }}>
      <div style={{
        background: '#fff', borderRadius: 18, width: '100%', maxWidth: 600,
        boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden', maxHeight: '90vh', overflowY: 'auto',
      }}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: pr.bg, color: pr.color }}>{pr.label}</span>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: st.bg, color: st.color }}>{test.status_display}</span>
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
          <InfoBlock label="Ordered On" value={new Date(test.created_at).toLocaleString()} />
          {test.sample_collected_at && <InfoBlock label="Sample Collected" value={new Date(test.sample_collected_at).toLocaleString()} sub={test.sample_collected_by?.name} />}
          {test.completed_at && <InfoBlock label="Completed" value={new Date(test.completed_at).toLocaleString()} sub={test.completed_by?.name} />}
          {test.clinical_info && <div style={{ gridColumn: '1/-1' }}><InfoBlock label="Clinical Indication" value={test.clinical_info} /></div>}

          {test.result_value && (
            <div style={{ gridColumn: '1/-1', background: '#f8fafc', borderRadius: 10, padding: '14px 16px', border: '1px solid #e2e8f0' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>Result</div>
              <pre style={{ margin: 0, fontSize: 14, color: '#0f172a', whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontWeight: 600 }}>{test.result_value}</pre>
              {test.result_unit && <span style={{ fontSize: 12, color: '#64748b', marginTop: 4, display: 'block' }}>Unit: {test.result_unit}</span>}
              {test.reference_range && <span style={{ fontSize: 12, color: '#64748b', display: 'block' }}>Ref: {test.reference_range}</span>}
              {test.result_notes && <p style={{ margin: '8px 0 0', fontSize: 13, color: '#475569' }}>{test.result_notes}</p>}
            </div>
          )}
        </div>

        <div style={{ padding: '12px 24px 20px', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          {test.status === 'ordered' && (
            <button onClick={handleCollect} disabled={collecting} style={{
              padding: '9px 18px', borderRadius: 9, border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer',
              background: `linear-gradient(135deg,${ACCENT},#0e7490)`, color: '#fff', boxShadow: '0 3px 10px rgba(8,145,178,0.3)',
            }}>
              <i className="fas fa-vial" style={{ marginRight: 6 }}></i>{collecting ? 'Collecting…' : 'Mark Sample Collected'}
            </button>
          )}
          {test.is_critical && !test.doctor_notified && (
            <button onClick={handleNotify} disabled={notifying} style={{
              padding: '9px 18px', borderRadius: 9, border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer',
              background: 'linear-gradient(135deg,#ef4444,#dc2626)', color: '#fff', boxShadow: '0 3px 10px rgba(239,68,68,0.3)',
            }}>
              <i className="fas fa-bell" style={{ marginRight: 6 }}></i>{notifying ? 'Notifying…' : 'Notify Doctor'}
            </button>
          )}
          {test.is_critical && test.doctor_notified && (
            <span style={{ fontSize: 13, color: '#16a34a', fontWeight: 700, padding: '9px 0' }}>
              <i className="fas fa-check-circle" style={{ marginRight: 6 }}></i>Doctor Notified
            </span>
          )}
          <button onClick={onClose} style={{
            padding: '9px 18px', borderRadius: 9, border: '1.5px solid #e2e8f0',
            background: '#fff', color: '#475569', fontWeight: 700, fontSize: 13, cursor: 'pointer', marginLeft: 'auto',
          }}>Close</button>
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

function LabTechnicianDashboard() {
  const { apiCall } = useAuth();
  const location = useLocation();
  const initialView = ['/lab/tests', '/lab/queue'].includes(location.pathname) ? 'queue' : 'dashboard';
  const [view, setView]             = useState(initialView); // dashboard | queue
  const [stats, setStats]           = useState({});
  const [tests, setTests]           = useState([]);
  const [recentTests, setRecentTests] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [filterStatus, setFilterStatus]   = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [search, setSearch]         = useState('');
  const [selectedTest, setSelectedTest]   = useState(null);
  const [resultTest, setResultTest]       = useState(null);
  const [toast, setToast]           = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiCall('/lab/dashboard/');
      if (res.ok) {
        const d = await res.json();
        setStats(d.stats || {});
        setRecentTests(d.recent_tests || []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [apiCall]);

  const fetchTests = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus)   params.set('status', filterStatus);
      if (filterPriority) params.set('priority', filterPriority);
      if (search)         params.set('search', search);
      const res = await apiCall(`/lab/tests/?${params}`);
      if (res.ok) {
        const d = await res.json();
        setTests(Array.isArray(d) ? d : d.results || []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [apiCall, filterStatus, filterPriority, search]);

  useEffect(() => { fetchDashboard(); }, []);
  useEffect(() => { if (view === 'queue') fetchTests(); }, [view, filterStatus, filterPriority]);

  const handleSearch = (e) => { e.preventDefault(); fetchTests(); };

  const handleCollect = async (testId) => {
    setActionLoading(true);
    try {
      const res = await apiCall(`/lab/tests/${testId}/collect/`, { method: 'POST', body: JSON.stringify({}) });
      if (res.ok) {
        const updated = await res.json();
        setTests(ts => ts.map(t => t.id === testId ? updated : t));
        setSelectedTest(updated);
        showToast('Sample marked as collected.');
      } else {
        const e = await res.json();
        showToast(e.error || 'Failed to collect sample.', 'error');
      }
    } catch { showToast('Network error.', 'error'); }
    finally { setActionLoading(false); }
  };

  const handleRecordResult = async (testId, form) => {
    setActionLoading(true);
    try {
      const res = await apiCall(`/lab/tests/${testId}/result/`, { method: 'POST', body: JSON.stringify(form) });
      if (res.ok) {
        const updated = await res.json();
        setTests(ts => ts.map(t => t.id === testId ? updated : t));
        setRecentTests(ts => ts.map(t => t.id === testId ? updated : t));
        setResultTest(null);
        showToast('Result recorded successfully.');
        if (view === 'dashboard') fetchDashboard();
      } else {
        const e = await res.json();
        showToast(e.error || 'Failed to save result.', 'error');
      }
    } catch { showToast('Network error.', 'error'); }
    finally { setActionLoading(false); }
  };

  const handleNotify = async (testId) => {
    setActionLoading(true);
    try {
      const res = await apiCall(`/lab/tests/${testId}/notify/`, { method: 'POST', body: JSON.stringify({}) });
      if (res.ok) {
        const updated = await res.json();
        setTests(ts => ts.map(t => t.id === testId ? updated : t));
        setSelectedTest(updated);
        showToast('Doctor notified of critical result.', 'success');
      }
    } catch { showToast('Network error.', 'error'); }
    finally { setActionLoading(false); }
  };

  const statCards = [
    { icon: 'fas fa-flask',             label: 'Total Tests',        value: stats.total_tests        || 0, accent: ACCENT },
    { icon: 'fas fa-hourglass-half',    label: 'Awaiting Sample',    value: stats.pending            || 0, accent: '#f59e0b' },
    { icon: 'fas fa-microscope',        label: 'Processing',         value: stats.processing         || 0, accent: '#6366f1' },
    { icon: 'fas fa-check-double',      label: 'Completed Today',    value: stats.completed_today    || 0, accent: '#10b981' },
    { icon: 'fas fa-bolt',              label: 'Urgent/STAT Pending',value: stats.urgent_pending     || 0, accent: '#ef4444' },
    { icon: 'fas fa-exclamation-circle',label: 'Critical Unnotified',value: stats.critical_unnotified|| 0, accent: '#be185d' },
  ];

  const displayTests = view === 'dashboard' ? recentTests : tests;

  return (
    <DashboardLayout navItems={navItems} brandTitle="NEHR Laboratory" roleBadge="Lab Technician">
      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', top: 20, right: 20, zIndex: 9999, padding: '12px 20px', borderRadius: 10,
          background: toast.type === 'error' ? '#fef2f2' : '#f0fdf4',
          border: `1px solid ${toast.type === 'error' ? '#fca5a5' : '#86efac'}`,
          color: toast.type === 'error' ? '#dc2626' : '#15803d', fontWeight: 700, fontSize: 14,
          boxShadow: '0 4px 14px rgba(0,0,0,0.12)',
        }}>
          <i className={`fas ${toast.type === 'error' ? 'fa-times-circle' : 'fa-check-circle'}`} style={{ marginRight: 8 }}></i>
          {toast.msg}
        </div>
      )}

      <div style={{ padding: '28px 24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: 0 }}>
              {view === 'dashboard' ? 'Laboratory Dashboard' : 'Test Queue'}
            </h1>
            <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 14 }}>
              {view === 'dashboard' ? 'Overview of lab activity and workload' : 'All test requests — collect, process & record results'}
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => { setView('dashboard'); fetchDashboard(); }} style={{
              padding: '9px 18px', borderRadius: 9, fontWeight: 700, fontSize: 13, cursor: 'pointer',
              background: view === 'dashboard' ? `linear-gradient(135deg,${ACCENT},#0e7490)` : '#fff',
              color: view === 'dashboard' ? '#fff' : '#475569',
              border: view === 'dashboard' ? 'none' : '1.5px solid #e2e8f0',
              boxShadow: view === 'dashboard' ? '0 3px 10px rgba(8,145,178,0.3)' : 'none',
            }}>
              <i className="fas fa-tachometer-alt" style={{ marginRight: 6 }}></i>Dashboard
            </button>
            <button onClick={() => setView('queue')} style={{
              padding: '9px 18px', borderRadius: 9, fontWeight: 700, fontSize: 13, cursor: 'pointer',
              background: view === 'queue' ? `linear-gradient(135deg,${ACCENT},#0e7490)` : '#fff',
              color: view === 'queue' ? '#fff' : '#475569',
              border: view === 'queue' ? 'none' : '1.5px solid #e2e8f0',
              boxShadow: view === 'queue' ? '0 3px 10px rgba(8,145,178,0.3)' : 'none',
            }}>
              <i className="fas fa-list-ol" style={{ marginRight: 6 }}></i>Test Queue
            </button>
          </div>
        </div>

        {/* Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 14, marginBottom: 24 }}>
          {statCards.map(s => (
            <div key={s.label} style={{
              background: '#fff', borderRadius: 16, padding: '18px 20px 14px',
              boxShadow: '0 2px 8px rgba(15,23,42,0.06)',
            }}>
              <div style={{ width: 40, height: 40, borderRadius: 11, background: s.accent + '18',
                display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                <i className={s.icon} style={{ color: s.accent, fontSize: 16 }}></i>
              </div>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#0f172a', lineHeight: 1, marginBottom: 5 }}>{s.value}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#334155' }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters (queue view) */}
        {view === 'queue' && (
          <div style={{ background: '#fff', borderRadius: 12, padding: '14px 18px', marginBottom: 18, boxShadow: '0 1px 4px rgba(15,23,42,0.06)', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
            <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8, flex: 1, minWidth: 240 }}>
              <input
                value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search patient name or ID…"
                style={{ flex: 1, padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13 }}
              />
              <button type="submit" style={{ padding: '8px 16px', background: ACCENT, color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>Search</button>
            </form>
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
              style={{ padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, color: '#374151' }}>
              <option value="">All Statuses</option>
              <option value="ordered">Ordered</option>
              <option value="sample_collected">Sample Collected</option>
              <option value="processing">Processing</option>
              <option value="completed">Completed</option>
            </select>
            <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
              style={{ padding: '8px 12px', border: '1.5px solid #e2e8f0', borderRadius: 8, fontSize: 13, color: '#374151' }}>
              <option value="">All Priorities</option>
              <option value="stat">STAT</option>
              <option value="urgent">Urgent</option>
              <option value="routine">Routine</option>
            </select>
          </div>
        )}

        {/* Tests Table */}
        <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 8px rgba(15,23,42,0.06)', overflow: 'hidden' }}>
          <div style={{ padding: '14px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#0f172a' }}>
              {view === 'dashboard' ? 'Recent Tests' : `All Tests (${tests.length})`}
            </h3>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#64748b' }}>
              <i className="fas fa-spinner fa-spin" style={{ fontSize: 28, color: ACCENT, display: 'block', marginBottom: 12 }}></i>
              Loading tests…
            </div>
          ) : displayTests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#94a3b8' }}>
              <i className="fas fa-flask" style={{ fontSize: 40, display: 'block', marginBottom: 12 }}></i>
              No tests found
            </div>
          ) : (
            <>
              <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1.8fr 1fr 1.1fr 1fr 160px',
                padding: '10px 20px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
                {['Patient', 'Test', 'Priority', 'Status', 'Ordered', 'Actions'].map(h => (
                  <div key={h} style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{h}</div>
                ))}
              </div>
              {displayTests.map((test, idx) => {
                const pr = priorityStyle(test.priority);
                const st = statusStyle(test.status);
                return (
                  <div key={test.id || idx} style={{
                    display: 'grid', gridTemplateColumns: '2.5fr 1.8fr 1fr 1.1fr 1fr 160px',
                    padding: '13px 20px', alignItems: 'center',
                    borderBottom: idx < displayTests.length - 1 ? '1px solid #f8fafc' : 'none',
                    background: test.is_critical && !test.doctor_notified ? '#fffbeb' : 'transparent',
                  }}>
                    <div>
                      <div style={{ fontWeight: 700, fontSize: 14, color: '#0f172a' }}>{test.patient?.full_name || '—'}</div>
                      <div style={{ fontSize: 12, color: '#94a3b8' }}>{test.patient?.patient_id}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 13, fontWeight: 600, color: '#334155' }}>{test.test_name}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>{test.test_category_display}</div>
                    </div>
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: pr.bg, color: pr.color }}>{pr.label}</span>
                    </div>
                    <div>
                      <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: st.bg, color: st.color }}>
                        {test.status_display}
                      </span>
                      {test.is_critical && <span style={{ marginLeft: 5, fontSize: 11, color: '#dc2626', fontWeight: 700 }}>⚠</span>}
                    </div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      {test.created_at ? new Date(test.created_at).toLocaleDateString() : '—'}
                    </div>
                    <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                      <button onClick={() => setSelectedTest(test)} style={{
                        padding: '5px 11px', borderRadius: 7, border: '1.5px solid #e2e8f0',
                        background: '#fff', color: '#475569', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      }}>View</button>
                      {test.status !== 'completed' && test.status !== 'cancelled' && (
                        <button onClick={() => setResultTest(test)} style={{
                          padding: '5px 11px', borderRadius: 7, border: 'none',
                          background: `linear-gradient(135deg,${ACCENT},#0e7490)`,
                          color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        }}>Result</button>
                      )}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {selectedTest && (
        <DetailModal
          test={selectedTest}
          onClose={() => setSelectedTest(null)}
          onCollect={() => handleCollect(selectedTest.id)}
          onNotify={() => handleNotify(selectedTest.id)}
        />
      )}

      {/* Result Modal */}
      {resultTest && !actionLoading && (
        <ResultModal
          test={resultTest}
          onClose={() => setResultTest(null)}
          onSave={(form) => handleRecordResult(resultTest.id, form)}
        />
      )}
    </DashboardLayout>
  );
}

export default LabTechnicianDashboard;

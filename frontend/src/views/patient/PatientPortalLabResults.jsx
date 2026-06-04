import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layout/DashboardLayout';
import { getNavForUser, getBrandForUser, getRoleBadge } from '../../utils/navItems';

const ACCENT = '#4361ee';

const statusStyle = s => {
  if (s === 'completed')        return { bg: '#dcfce7', color: '#15803d', label: 'Completed' };
  if (s === 'sample_collected') return { bg: '#dbeafe', color: '#1d4ed8', label: 'Sample Collected' };
  if (s === 'processing')       return { bg: '#fef3c7', color: '#b45309', label: 'Processing' };
  return                               { bg: '#fff7ed', color: '#c2410c', label: 'Ordered' };
};

function DetailModal({ test, onClose }) {
  const st = statusStyle(test.status);
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 16 }}
      onClick={onClose}>
      <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 560, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', overflow: 'hidden', maxHeight: '90vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}>
        <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ display: 'flex', gap: 8, marginBottom: 6 }}>
              <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: st.bg, color: st.color }}>{st.label}</span>
            </div>
            <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{test.test_name}</h3>
            <p style={{ margin: '4px 0 0', fontSize: 13, color: '#64748b' }}>{test.test_category_display}</p>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#94a3b8' }}>×</button>
        </div>

        <div style={{ padding: '20px 24px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            <InfoBlock label="Sample Type" value={test.sample_type_display} />
            <InfoBlock label="Ordered By" value={`Dr. ${test.ordered_by?.name || '—'}`} />
            <InfoBlock label="Ordered On" value={new Date(test.created_at).toLocaleDateString('en-GB')} />
            {test.completed_at && <InfoBlock label="Completed" value={new Date(test.completed_at).toLocaleDateString('en-GB')} />}
          </div>

          {test.status === 'completed' && test.result_value ? (
            <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '14px 16px', border: '1px solid #bbf7d0' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#15803d', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 8 }}>
                <i className="fas fa-check-circle" style={{ marginRight: 6 }}></i>Result
              </div>
              <pre style={{ margin: 0, fontSize: 14, color: '#0f172a', whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontWeight: 600 }}>{test.result_value}</pre>
              {test.result_unit && <span style={{ fontSize: 12, color: '#64748b', marginTop: 4, display: 'block' }}>Unit: {test.result_unit}</span>}
              {test.reference_range && <span style={{ fontSize: 12, color: '#64748b', display: 'block' }}>Reference Range: {test.reference_range}</span>}
              {test.result_notes && (
                <div style={{ marginTop: 10, padding: '10px 12px', background: '#fff', borderRadius: 8 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>Interpretation</div>
                  <p style={{ margin: 0, fontSize: 13, color: '#475569', lineHeight: 1.6 }}>{test.result_notes}</p>
                </div>
              )}
            </div>
          ) : (
            <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: 10, padding: '14px 16px', textAlign: 'center' }}>
              <i className="fas fa-hourglass-half" style={{ fontSize: 24, color: '#f59e0b', marginBottom: 8, display: 'block' }}></i>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#92400e' }}>
                {test.status === 'processing' ? 'Your test is being processed. Results will be available soon.' : 'Waiting for sample collection.'}
              </p>
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

function InfoBlock({ label, value }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#0f172a' }}>{value || '—'}</div>
    </div>
  );
}

export default function PatientPortalLabResults() {
  const { apiCall, user } = useAuth();
  const [tests, setTests]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [selectedTest, setSelectedTest] = useState(null);

  const fetchTests = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiCall('/lab/tests/');
      if (res.ok) {
        const d = await res.json();
        setTests(Array.isArray(d) ? d : d.results || []);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [apiCall]);

  useEffect(() => { fetchTests(); }, [fetchTests]);

  const completed = tests.filter(t => t.status === 'completed').length;
  const pending   = tests.filter(t => t.status !== 'completed').length;

  return (
    <DashboardLayout navItems={getNavForUser(user)} brandTitle={getBrandForUser(user)} roleBadge={getRoleBadge(user)} hideBanner>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px' }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontWeight: 800, fontSize: 24, color: '#0f172a', margin: 0 }}>
            <i className="fas fa-flask me-2" style={{ color: ACCENT }}></i>My Lab Results
          </h2>
          <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>View your laboratory test results</p>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total Tests', value: tests.length, icon: 'fas fa-flask',          color: ACCENT,    bg: '#eff6ff' },
            { label: 'Completed',   value: completed,    icon: 'fas fa-check-circle',   color: '#16a34a', bg: '#f0fdf4' },
            { label: 'Pending',     value: pending,      icon: 'fas fa-hourglass-half', color: '#f59e0b', bg: '#fffbeb' },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', borderRadius: 14, padding: '16px 18px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: s.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                <i className={s.icon} style={{ color: s.color, fontSize: 14 }}></i>
              </div>
              <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{loading ? '—' : s.value}</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Tests Table */}
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h5 style={{ fontWeight: 800, fontSize: 15, margin: 0, color: '#0f172a' }}>Test History</h5>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>{tests.length} test{tests.length !== 1 ? 's' : ''}</span>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 48 }}>
              <div className="spinner-border text-primary"></div>
            </div>
          ) : tests.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 56, color: '#94a3b8' }}>
              <i className="fas fa-flask" style={{ fontSize: 40, marginBottom: 12, display: 'block' }}></i>
              No lab tests on record yet.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {['Test Name', 'Category', 'Ordered By', 'Date', 'Status', ''].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tests.map((test, i) => {
                    const st = statusStyle(test.status);
                    return (
                      <tr key={test.id} style={{ borderTop: '1px solid #f1f5f9', background: i % 2 ? '#fafafa' : '#fff', cursor: 'pointer' }}
                        onClick={() => setSelectedTest(test)}>
                        <td style={{ padding: '10px 14px', fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{test.test_name}</td>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: '#64748b' }}>{test.test_category_display}</td>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: '#64748b' }}>Dr. {test.ordered_by?.name || '—'}</td>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>{new Date(test.created_at).toLocaleDateString('en-GB')}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: st.bg, color: st.color }}>{st.label}</span>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <i className="fas fa-chevron-right" style={{ color: '#94a3b8', fontSize: 11 }}></i>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Info Banner */}
        <div style={{ marginTop: 20, background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 12, padding: '12px 16px', fontSize: 13, color: '#1e40af' }}>
          <i className="fas fa-info-circle" style={{ marginRight: 8 }}></i>
          <strong>Note:</strong> Lab results are typically available within 24-48 hours. Critical results will be communicated to you immediately by your doctor.
        </div>

      </div>

      {selectedTest && <DetailModal test={selectedTest} onClose={() => setSelectedTest(null)} />}
    </DashboardLayout>
  );
}

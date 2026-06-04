import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layout/DashboardLayout';
import { getNavForUser, getBrandForUser, getRoleBadge } from '../../utils/navItems';

const ACCENT = '#7c3aed';

const fmtLe = (n) => `Le ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function StatCard({ icon, label, value, accent }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: '18px 20px', boxShadow: '0 2px 8px rgba(15,23,42,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: 11, background: accent + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <i className={icon} style={{ color: accent, fontSize: 18 }}></i>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{value}</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginTop: 4 }}>{label}</div>
        </div>
      </div>
    </div>
  );
}

export default function MultiHospitalDashboard() {
  const { apiCall, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [sortBy, setSortBy] = useState('visits_this_month');
  const [sortOrder, setSortOrder] = useState('desc');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiCall('/analytics/multi-hospital/');
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [apiCall]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleExport = async () => {
    try {
      const res = await apiCall('/analytics/export/?type=comparison');
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `hospital_comparison_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      }
    } catch (e) { console.error(e); }
  };

  const sortedHospitals = data?.hospitals ? [...data.hospitals].sort((a, b) => {
    const aVal = a.metrics[sortBy];
    const bVal = b.metrics[sortBy];
    return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
  }) : [];

  const handleSort = (key) => {
    if (sortBy === key) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(key);
      setSortOrder('desc');
    }
  };

  return (
    <DashboardLayout navItems={getNavForUser(user)} brandTitle={getBrandForUser(user)} roleBadge={getRoleBadge(user)}>
      <div style={{ padding: '28px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: 0 }}>
              <i className="fas fa-hospital me-2" style={{ color: ACCENT }}></i>
              Multi-Hospital Comparison
            </h1>
            <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 14 }}>Compare performance across all hospitals</p>
          </div>
          <button onClick={handleExport}
            style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: ACCENT, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
            onMouseEnter={e => e.currentTarget.style.background = '#6d28d9'}
            onMouseLeave={e => e.currentTarget.style.background = ACCENT}>
            <i className="fas fa-download"></i>Export CSV
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <div className="spinner-border" style={{ color: ACCENT, width: 48, height: 48 }} role="status"></div>
            <div style={{ marginTop: 16, fontSize: 14, color: '#64748b' }}>Loading comparison data...</div>
          </div>
        ) : data ? (
          <>
            {/* Aggregate Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14, marginBottom: 24 }}>
              <StatCard icon="fas fa-hospital" label="Total Hospitals" value={data.summary?.total_hospitals || 0} accent="#7c3aed" />
              <StatCard icon="fas fa-users" label="Total Visits" value={data.summary?.aggregate_metrics?.total_visits || 0} accent="#4361ee" />
              <StatCard icon="fas fa-user-md" label="Total Staff" value={data.summary?.aggregate_metrics?.total_staff || 0} accent="#10b981" />
              <StatCard icon="fas fa-user-injured" label="Total Patients" value={data.summary?.aggregate_metrics?.total_patients || 0} accent="#f59e0b" />
              <StatCard icon="fas fa-file-invoice-dollar" label="Total Billed" value={fmtLe(data.summary?.aggregate_metrics?.total_billed)} accent="#ef4444" />
              <StatCard icon="fas fa-percentage" label="Avg Collection Rate" value={`${data.summary?.aggregate_metrics?.avg_collection_rate || 0}%`} accent="#06b6d4" />
            </div>

            {/* Top Performers */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>
              <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 8px rgba(15,23,42,0.06)', overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', background: '#faf5ff' }}>
                  <h5 style={{ fontWeight: 800, fontSize: 15, margin: 0, color: '#7c3aed' }}>
                    <i className="fas fa-trophy me-2"></i>Top 5 by Visits (This Month)
                  </h5>
                </div>
                <div style={{ padding: '16px 20px' }}>
                  {(data.top_performers?.by_visits || []).map((h, i) => (
                    <div key={h.hospital_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < 4 ? '1px solid #f8fafc' : 'none' }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: i === 0 ? '#fbbf24' : i === 1 ? '#d1d5db' : i === 2 ? '#f97316' : '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, color: i < 3 ? '#fff' : '#64748b' }}>
                        {i + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{h.hospital_name}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>{h.district || 'N/A'}</div>
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#7c3aed' }}>{h.metrics.visits_this_month}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 8px rgba(15,23,42,0.06)', overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', background: '#f0fdf4' }}>
                  <h5 style={{ fontWeight: 800, fontSize: 15, margin: 0, color: '#16a34a' }}>
                    <i className="fas fa-chart-line me-2"></i>Top 5 by Collection Rate
                  </h5>
                </div>
                <div style={{ padding: '16px 20px' }}>
                  {(data.top_performers?.by_collection_rate || []).map((h, i) => (
                    <div key={h.hospital_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < 4 ? '1px solid #f8fafc' : 'none' }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: i === 0 ? '#fbbf24' : i === 1 ? '#d1d5db' : i === 2 ? '#f97316' : '#e5e7eb', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800, fontSize: 12, color: i < 3 ? '#fff' : '#64748b' }}>
                        {i + 1}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{h.hospital_name}</div>
                        <div style={{ fontSize: 11, color: '#64748b' }}>{h.district || 'N/A'}</div>
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 800, color: '#16a34a' }}>{h.metrics.collection_rate}%</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Comparison Table */}
            <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 8px rgba(15,23,42,0.06)', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9' }}>
                <h5 style={{ fontWeight: 800, fontSize: 15, margin: 0, color: '#0f172a' }}>All Hospitals Comparison</h5>
              </div>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Hospital</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>Type</th>
                      <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>District</th>
                      <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap', cursor: 'pointer' }}
                        onClick={() => handleSort('total_visits')}>
                        Total Visits {sortBy === 'total_visits' && <i className={`fas fa-sort-${sortOrder === 'desc' ? 'down' : 'up'}`}></i>}
                      </th>
                      <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap', cursor: 'pointer' }}
                        onClick={() => handleSort('visits_this_month')}>
                        This Month {sortBy === 'visits_this_month' && <i className={`fas fa-sort-${sortOrder === 'desc' ? 'down' : 'up'}`}></i>}
                      </th>
                      <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap', cursor: 'pointer' }}
                        onClick={() => handleSort('staff_count')}>
                        Staff {sortBy === 'staff_count' && <i className={`fas fa-sort-${sortOrder === 'desc' ? 'down' : 'up'}`}></i>}
                      </th>
                      <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap', cursor: 'pointer' }}
                        onClick={() => handleSort('patient_count')}>
                        Patients {sortBy === 'patient_count' && <i className={`fas fa-sort-${sortOrder === 'desc' ? 'down' : 'up'}`}></i>}
                      </th>
                      <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap', cursor: 'pointer' }}
                        onClick={() => handleSort('collection_rate')}>
                        Collection % {sortBy === 'collection_rate' && <i className={`fas fa-sort-${sortOrder === 'desc' ? 'down' : 'up'}`}></i>}
                      </th>
                      <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap', cursor: 'pointer' }}
                        onClick={() => handleSort('current_admissions')}>
                        IPD {sortBy === 'current_admissions' && <i className={`fas fa-sort-${sortOrder === 'desc' ? 'down' : 'up'}`}></i>}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {sortedHospitals.map((h, i) => (
                      <tr key={h.hospital_id} style={{ borderTop: '1px solid #f1f5f9', background: i % 2 ? '#fafafa' : '#fff' }}>
                        <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{h.hospital_name}</td>
                        <td style={{ padding: '12px 14px', fontSize: 12, color: '#64748b' }}>{h.hospital_type_display}</td>
                        <td style={{ padding: '12px 14px', fontSize: 12, color: '#64748b' }}>{h.district || 'N/A'}</td>
                        <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600, color: '#334155', textAlign: 'right' }}>{h.metrics.total_visits.toLocaleString()}</td>
                        <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600, color: '#334155', textAlign: 'right' }}>{h.metrics.visits_this_month.toLocaleString()}</td>
                        <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600, color: '#334155', textAlign: 'right' }}>{h.metrics.staff_count}</td>
                        <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600, color: '#334155', textAlign: 'right' }}>{h.metrics.patient_count.toLocaleString()}</td>
                        <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700, color: h.metrics.collection_rate >= 80 ? '#16a34a' : h.metrics.collection_rate >= 60 ? '#f59e0b' : '#ef4444', textAlign: 'right' }}>
                          {h.metrics.collection_rate.toFixed(1)}%
                        </td>
                        <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600, color: '#334155', textAlign: 'right' }}>{h.metrics.current_admissions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        ) : (
          <div style={{ textAlign: 'center', padding: 80, color: '#94a3b8' }}>
            <i className="fas fa-hospital" style={{ fontSize: 48, marginBottom: 16, display: 'block' }}></i>
            No data available
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}

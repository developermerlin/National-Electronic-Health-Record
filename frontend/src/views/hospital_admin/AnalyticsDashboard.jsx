import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layout/DashboardLayout';
import { getNavForUser, getBrandForUser, getRoleBadge } from '../../utils/navItems';

const ACCENT = '#4361ee';

const fmtLe = (n) => `Le ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

function StatCard({ icon, label, value, accent, trend }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: '18px 20px', boxShadow: '0 2px 8px rgba(15,23,42,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: 11, background: accent + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <i className={icon} style={{ color: accent, fontSize: 18 }}></i>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{value}</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginTop: 4 }}>{label}</div>
          {trend && <div style={{ fontSize: 11, color: trend > 0 ? '#16a34a' : '#dc2626', marginTop: 2 }}>
            <i className={`fas fa-arrow-${trend > 0 ? 'up' : 'down'}`} style={{ marginRight: 4 }}></i>
            {Math.abs(trend)}% vs last month
          </div>}
        </div>
      </div>
    </div>
  );
}

function ChartCard({ title, children, actions }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 8px rgba(15,23,42,0.06)', overflow: 'hidden' }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h5 style={{ fontWeight: 800, fontSize: 15, margin: 0, color: '#0f172a' }}>{title}</h5>
        {actions}
      </div>
      <div style={{ padding: '20px' }}>
        {children}
      </div>
    </div>
  );
}

function SimpleBarChart({ data, xKey, yKey, color }) {
  if (!data || data.length === 0) return <div style={{ textAlign: 'center', color: '#94a3b8', padding: 40 }}>No data available</div>;
  
  const maxValue = Math.max(...data.map(d => d[yKey]));
  
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 200 }}>
      {data.map((item, i) => {
        const height = maxValue > 0 ? (item[yKey] / maxValue * 100) : 0;
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#0f172a' }}>{item[yKey]}</div>
            <div style={{ width: '100%', height: `${height}%`, minHeight: 4, background: `linear-gradient(180deg, ${color}, ${color}99)`, borderRadius: '4px 4px 0 0' }}></div>
            <div style={{ fontSize: 10, color: '#64748b', fontWeight: 600, textAlign: 'center', wordBreak: 'break-word' }}>
              {item[xKey]}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function PieChart({ data, labelKey, valueKey }) {
  if (!data || data.length === 0) return <div style={{ textAlign: 'center', color: '#94a3b8', padding: 40 }}>No data available</div>;
  
  const total = data.reduce((sum, d) => sum + d[valueKey], 0);
  const colors = ['#4361ee', '#7c3aed', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];
  
  return (
    <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.map((item, i) => {
          const percentage = total > 0 ? ((item[valueKey] / total) * 100).toFixed(1) : 0;
          return (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <div style={{ width: 12, height: 12, borderRadius: 3, background: colors[i % colors.length], flexShrink: 0 }}></div>
              <div style={{ flex: 1, fontSize: 13, color: '#334155', fontWeight: 600 }}>{item[labelKey]}</div>
              <div style={{ fontSize: 13, fontWeight: 800, color: '#0f172a' }}>{percentage}%</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>({item[valueKey]})</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function AnalyticsDashboard() {
  const { apiCall, user } = useAuth();
  const [tab, setTab] = useState('performance'); // performance | financial | clinical
  const [loading, setLoading] = useState(true);
  
  const [performanceData, setPerformanceData] = useState(null);
  const [financialData, setFinancialData] = useState(null);
  const [clinicalData, setClinicalData] = useState(null);

  const fetchData = useCallback(async (dataType) => {
    setLoading(true);
    try {
      let endpoint = '';
      if (dataType === 'performance') endpoint = '/analytics/performance/';
      else if (dataType === 'financial') endpoint = '/analytics/financial/';
      else if (dataType === 'clinical') endpoint = '/analytics/clinical-quality/';
      
      const res = await apiCall(endpoint);
      if (res.ok) {
        const data = await res.json();
        if (dataType === 'performance') setPerformanceData(data);
        else if (dataType === 'financial') setFinancialData(data);
        else if (dataType === 'clinical') setClinicalData(data);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [apiCall]);

  useEffect(() => {
    fetchData(tab);
  }, [tab, fetchData]);

  const handleExport = async (exportType) => {
    try {
      const res = await apiCall(`/analytics/export/?type=${exportType}`);
      if (res.ok) {
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `analytics_${exportType}_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(url);
      }
    } catch (e) { console.error(e); }
  };

  const tabStyle = (key) => ({
    padding: '10px 24px',
    fontWeight: 700,
    fontSize: 14,
    border: 'none',
    borderBottom: tab === key ? `3px solid ${ACCENT}` : '3px solid transparent',
    background: 'transparent',
    color: tab === key ? ACCENT : '#64748b',
    cursor: 'pointer',
    transition: 'all 0.15s',
  });

  return (
    <DashboardLayout navItems={getNavForUser(user)} brandTitle={getBrandForUser(user)} roleBadge={getRoleBadge(user)}>
      <div style={{ padding: '28px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: 0 }}>
              <i className="fas fa-chart-line me-2" style={{ color: ACCENT }}></i>
              Analytics & Reports
            </h1>
            <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 14 }}>Comprehensive performance metrics and insights</p>
          </div>
          <button onClick={() => handleExport(tab)}
            style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: ACCENT, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
            onMouseEnter={e => e.currentTarget.style.background = '#0369a1'}
            onMouseLeave={e => e.currentTarget.style.background = ACCENT}>
            <i className="fas fa-download"></i>Export CSV
          </button>
        </div>

        {/* Tabs */}
        <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 8px rgba(15,23,42,0.06)', marginBottom: 24, overflow: 'hidden' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9' }}>
            <button style={tabStyle('performance')} onClick={() => setTab('performance')}>
              <i className="fas fa-chart-bar me-2"></i>Performance Metrics
            </button>
            <button style={tabStyle('financial')} onClick={() => setTab('financial')}>
              <i className="fas fa-dollar-sign me-2"></i>Financial Analytics
            </button>
            <button style={tabStyle('clinical')} onClick={() => setTab('clinical')}>
              <i className="fas fa-heartbeat me-2"></i>Clinical Quality
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <div className="spinner-border" style={{ color: ACCENT, width: 48, height: 48 }} role="status"></div>
            <div style={{ marginTop: 16, fontSize: 14, color: '#64748b' }}>Loading analytics...</div>
          </div>
        ) : (
          <>
            {/* PERFORMANCE TAB */}
            {tab === 'performance' && performanceData && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Stats Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
                  <StatCard icon="fas fa-users" label="Total Visits" value={performanceData.patient_flow?.total_visits || 0} accent="#4361ee" />
                  <StatCard icon="fas fa-calendar-day" label="Visits Today" value={performanceData.patient_flow?.visits_today || 0} accent="#10b981" />
                  <StatCard icon="fas fa-calendar-week" label="This Week" value={performanceData.patient_flow?.visits_this_week || 0} accent="#f59e0b" />
                  <StatCard icon="fas fa-calendar-alt" label="This Month" value={performanceData.patient_flow?.visits_this_month || 0} accent="#7c3aed" />
                  <StatCard icon="fas fa-bed" label="Current IPD" value={performanceData.ipd_metrics?.current_admissions || 0} accent="#ef4444" />
                  <StatCard icon="fas fa-clock" label="Avg Wait Time" value={`${performanceData.wait_times?.avg_wait_time_hours || 0}h`} accent="#06b6d4" />
                </div>

                {/* Charts Row 1 */}
                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
                  <ChartCard title="Daily Visit Trend (Last 30 Days)">
                    <SimpleBarChart 
                      data={performanceData.patient_flow?.daily_trend?.slice(-30) || []} 
                      xKey="date" 
                      yKey="count" 
                      color="#4361ee" 
                    />
                  </ChartCard>
                  <ChartCard title="Visit Type Distribution">
                    <PieChart 
                      data={performanceData.patient_flow?.visit_by_type || []} 
                      labelKey="visit_type" 
                      valueKey="count" 
                    />
                  </ChartCard>
                </div>

                {/* Charts Row 2 */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  <ChartCard title="Top Departments by Visits">
                    <SimpleBarChart 
                      data={performanceData.department_utilization || []} 
                      xKey="department__name" 
                      yKey="visits" 
                      color="#10b981" 
                    />
                  </ChartCard>
                  <ChartCard title="Gender Distribution">
                    <PieChart 
                      data={performanceData.demographics?.gender_distribution || []} 
                      labelKey="gender" 
                      valueKey="count" 
                    />
                  </ChartCard>
                </div>

                {/* Service Utilization */}
                <ChartCard title="Service Utilization (This Month)">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
                    <div style={{ background: '#f0f9ff', borderRadius: 10, padding: '16px 18px', border: '1px solid #bae6fd' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#0369a1', textTransform: 'uppercase', marginBottom: 6 }}>Lab Tests</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: '#0c4a6e' }}>{performanceData.service_utilization?.lab_tests_this_month || 0}</div>
                    </div>
                    <div style={{ background: '#fef3c7', borderRadius: 10, padding: '16px 18px', border: '1px solid #fde68a' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', marginBottom: 6 }}>Prescriptions</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: '#78350f' }}>{performanceData.service_utilization?.prescriptions_this_month || 0}</div>
                    </div>
                    <div style={{ background: '#fce7f3', borderRadius: 10, padding: '16px 18px', border: '1px solid #fbcfe8' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#9f1239', textTransform: 'uppercase', marginBottom: 6 }}>IPD Admissions</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: '#881337' }}>{performanceData.ipd_metrics?.admissions_this_month || 0}</div>
                    </div>
                    <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '16px 18px', border: '1px solid #bbf7d0' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#15803d', textTransform: 'uppercase', marginBottom: 6 }}>Avg Length of Stay</div>
                      <div style={{ fontSize: 24, fontWeight: 800, color: '#166534' }}>{performanceData.ipd_metrics?.avg_length_of_stay || 0} days</div>
                    </div>
                  </div>
                </ChartCard>
              </div>
            )}

            {/* FINANCIAL TAB */}
            {tab === 'financial' && financialData && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Revenue Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
                  <StatCard icon="fas fa-file-invoice-dollar" label="Total Billed" value={fmtLe(financialData.revenue_summary?.total_billed)} accent="#4361ee" />
                  <StatCard icon="fas fa-money-bill-wave" label="Total Collected" value={fmtLe(financialData.revenue_summary?.total_collected)} accent="#10b981" />
                  <StatCard icon="fas fa-exclamation-triangle" label="Outstanding" value={fmtLe(financialData.revenue_summary?.total_outstanding)} accent="#ef4444" />
                  <StatCard icon="fas fa-percentage" label="Collection Rate" value={`${financialData.revenue_summary?.collection_rate || 0}%`} accent="#7c3aed" />
                  <StatCard icon="fas fa-calendar-check" label="Billed This Month" value={fmtLe(financialData.revenue_summary?.billed_this_month)} accent="#f59e0b" />
                  <StatCard icon="fas fa-hand-holding-usd" label="Collected This Month" value={fmtLe(financialData.revenue_summary?.collected_this_month)} accent="#06b6d4" />
                </div>

                {/* Revenue Trend */}
                <ChartCard title="Monthly Revenue Trend (Last 12 Months)">
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 220 }}>
                    {(financialData.monthly_revenue_trend || []).map((item, i) => {
                      const maxVal = Math.max(...financialData.monthly_revenue_trend.map(r => Math.max(r.billed, r.collected)));
                      const billedHeight = maxVal > 0 ? (item.billed / maxVal * 100) : 0;
                      const collectedHeight = maxVal > 0 ? (item.collected / maxVal * 100) : 0;
                      return (
                        <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
                          <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end', width: '100%', height: 180 }}>
                            <div style={{ flex: 1, height: `${billedHeight}%`, minHeight: 4, background: '#4361ee', borderRadius: '3px 3px 0 0' }} title={`Billed: ${fmtLe(item.billed)}`}></div>
                            <div style={{ flex: 1, height: `${collectedHeight}%`, minHeight: 4, background: '#10b981', borderRadius: '3px 3px 0 0' }} title={`Collected: ${fmtLe(item.collected)}`}></div>
                          </div>
                          <div style={{ fontSize: 9, color: '#64748b', fontWeight: 600, textAlign: 'center', transform: 'rotate(-45deg)', transformOrigin: 'center', whiteSpace: 'nowrap' }}>
                            {item.month}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 12, height: 12, background: '#4361ee', borderRadius: 2 }}></div>
                      <span style={{ fontSize: 12, color: '#64748b' }}>Billed</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 12, height: 12, background: '#10b981', borderRadius: 2 }}></div>
                      <span style={{ fontSize: 12, color: '#64748b' }}>Collected</span>
                    </div>
                  </div>
                </ChartCard>

                {/* Payment Methods & Invoice Status */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  <ChartCard title="Payment Methods (This Month)">
                    <PieChart 
                      data={financialData.payment_methods || []} 
                      labelKey="method" 
                      valueKey="count" 
                    />
                  </ChartCard>
                  <ChartCard title="Invoice Status Breakdown">
                    <PieChart 
                      data={financialData.invoice_status || []} 
                      labelKey="status" 
                      valueKey="count" 
                    />
                  </ChartCard>
                </div>

                {/* Accounts Receivable Aging */}
                <ChartCard title="Accounts Receivable Aging">
                  <SimpleBarChart 
                    data={financialData.accounts_receivable_aging || []} 
                    xKey="bucket" 
                    yKey="amount" 
                    color="#ef4444" 
                  />
                </ChartCard>
              </div>
            )}

            {/* CLINICAL QUALITY TAB */}
            {tab === 'clinical' && clinicalData && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                {/* Quality Metrics */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 14 }}>
                  <StatCard icon="fas fa-redo" label="30-Day Readmission Rate" value={`${clinicalData.readmission_metrics?.readmission_rate || 0}%`} accent="#ef4444" />
                  <StatCard icon="fas fa-procedures" label="Total Discharges" value={clinicalData.readmission_metrics?.total_discharges || 0} accent="#4361ee" />
                  <StatCard icon="fas fa-flask" label="Avg Lab Turnaround" value={`${clinicalData.lab_performance?.avg_turnaround_hours || 0}h`} accent="#10b981" />
                  <StatCard icon="fas fa-exclamation-triangle" label="Critical Lab Notification" value={`${clinicalData.lab_performance?.critical_notification_rate || 0}%`} accent="#f59e0b" />
                  <StatCard icon="fas fa-pills" label="Prescription Dispensing Rate" value={`${clinicalData.prescription_metrics?.dispensing_rate || 0}%`} accent="#7c3aed" />
                  <StatCard icon="fas fa-prescription-bottle-alt" label="Total Prescriptions" value={clinicalData.prescription_metrics?.total_prescriptions || 0} accent="#06b6d4" />
                </div>

                {/* Quality Indicators */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                  <ChartCard title="Readmission Analysis">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '16px 18px' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#991b1b', marginBottom: 8 }}>30-Day Readmission Rate</div>
                        <div style={{ fontSize: 36, fontWeight: 800, color: '#dc2626' }}>{clinicalData.readmission_metrics?.readmission_rate || 0}%</div>
                        <div style={{ fontSize: 12, color: '#7f1d1d', marginTop: 6 }}>
                          {clinicalData.readmission_metrics?.readmissions || 0} readmissions out of {clinicalData.readmission_metrics?.total_discharges || 0} discharges
                        </div>
                      </div>
                      <div style={{ fontSize: 12, color: '#64748b', lineHeight: 1.6 }}>
                        <strong>Target:</strong> &lt;15% (National benchmark)<br/>
                        Lower readmission rates indicate better discharge planning and patient education.
                      </div>
                    </div>
                  </ChartCard>

                  <ChartCard title="Lab Performance">
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                      <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '16px 18px' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#15803d', marginBottom: 8 }}>Average Turnaround Time</div>
                        <div style={{ fontSize: 36, fontWeight: 800, color: '#16a34a' }}>{clinicalData.lab_performance?.avg_turnaround_hours || 0} hrs</div>
                        <div style={{ fontSize: 12, color: '#166534', marginTop: 6 }}>
                          Based on {clinicalData.lab_performance?.total_tests || 0} completed tests
                        </div>
                      </div>
                      <div style={{ background: '#fffbeb', border: '1px solid #fef3c7', borderRadius: 10, padding: '16px 18px' }}>
                        <div style={{ fontSize: 13, fontWeight: 700, color: '#92400e', marginBottom: 8 }}>Critical Value Notification</div>
                        <div style={{ fontSize: 36, fontWeight: 800, color: '#d97706' }}>{clinicalData.lab_performance?.critical_notification_rate || 0}%</div>
                        <div style={{ fontSize: 12, color: '#78350f', marginTop: 6 }}>
                          {clinicalData.lab_performance?.critical_labs || 0} critical results this month
                        </div>
                      </div>
                    </div>
                  </ChartCard>
                </div>

                {/* Prescription Metrics */}
                <ChartCard title="Prescription Dispensing Performance">
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                    <div style={{ background: '#eff6ff', borderRadius: 10, padding: '16px 18px', border: '1px solid #bfdbfe' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#1e40af', textTransform: 'uppercase', marginBottom: 6 }}>Total Prescriptions</div>
                      <div style={{ fontSize: 28, fontWeight: 800, color: '#1e3a8a' }}>{clinicalData.prescription_metrics?.total_prescriptions || 0}</div>
                    </div>
                    <div style={{ background: '#f0fdf4', borderRadius: 10, padding: '16px 18px', border: '1px solid #bbf7d0' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#15803d', textTransform: 'uppercase', marginBottom: 6 }}>Dispensed</div>
                      <div style={{ fontSize: 28, fontWeight: 800, color: '#166534' }}>{clinicalData.prescription_metrics?.dispensed || 0}</div>
                    </div>
                    <div style={{ background: '#fef3c7', borderRadius: 10, padding: '16px 18px', border: '1px solid #fde68a' }}>
                      <div style={{ fontSize: 11, fontWeight: 700, color: '#92400e', textTransform: 'uppercase', marginBottom: 6 }}>Dispensing Rate</div>
                      <div style={{ fontSize: 28, fontWeight: 800, color: '#78350f' }}>{clinicalData.prescription_metrics?.dispensing_rate || 0}%</div>
                    </div>
                  </div>
                </ChartCard>
              </div>
            )}
          </>
        )}

      </div>
    </DashboardLayout>
  );
}

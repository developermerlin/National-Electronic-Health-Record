import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layout/DashboardLayout';
import { getNavForUser, getBrandForUser, getRoleBadge } from '../../utils/navItems';

const METHOD_LABELS = {
  cash: 'Cash', card: 'Card / POS', mobile_money: 'Mobile Money',
  bank_transfer: 'Bank Transfer', insurance: 'Insurance', waived: 'Waived',
};
const METHOD_COLORS = {
  cash: '#16a34a', card: '#4361ee', mobile_money: '#f77f00',
  bank_transfer: '#0891b2', insurance: '#7c3aed', waived: '#64748b',
};
const CAT_COLORS = ['#4361ee','#16a34a','#f77f00','#7c3aed','#0891b2','#dc2626','#2ec4b6','#e11d48'];

const fmt = (n) => `Le ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;

export default function FinancialReport() {
  const { apiCall, user } = useAuth();
  const navItems  = getNavForUser(user);
  const brand     = getBrandForUser(user);
  const roleBadge = getRoleBadge(user);

  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState('');
  const [view, setView]       = useState('monthly'); // 'daily' | 'monthly'

  const fetchData = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await apiCall('/billing/invoices/financial_report/');
      if (res.ok) setData(await res.json());
      else setError('Failed to load financial report.');
    } catch { setError('Network error.'); }
    setLoading(false);
  }, [apiCall]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const s          = data?.summary    || {};
  const daily      = data?.daily_trend    || [];
  const monthly    = data?.monthly_trend  || [];
  const byMethod   = data?.by_method      || [];
  const byCategory = data?.by_category    || [];

  const trend      = view === 'daily' ? daily : monthly;
  const trendKey   = view === 'daily' ? 'label' : 'month';
  const maxTrend   = Math.max(...trend.map(t => t.revenue), 1);

  const totalMethod = byMethod.reduce((a, b) => a + b.total, 0) || 1;
  const totalCat    = byCategory.reduce((a, b) => a + b.total, 0) || 1;

  return (
    <DashboardLayout navItems={navItems} brandTitle={brand} roleBadge={roleBadge}>
      <div style={{ padding: '20px 16px', maxWidth: 1300, margin: '0 auto' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontWeight: 800, fontSize: 26, color: '#0f172a', margin: 0 }}>
              <i className="fas fa-chart-bar me-2" style={{ color: '#4361ee' }}></i>Financial Reports
            </h2>
            <p style={{ color: '#64748b', fontSize: 13, marginTop: 4, marginBottom: 0 }}>
              Revenue summary, collections by period, and payment analysis
            </p>
          </div>
          <button onClick={fetchData} style={{ padding: '8px 16px', borderRadius: 9, border: '1px solid #e2e8f0', background: '#fff', color: '#374151', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="fas fa-sync-alt" style={{ fontSize: 11 }}></i>Refresh
          </button>
        </div>

        {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 16px', borderRadius: 10, fontSize: 13, marginBottom: 20 }}>{error}</div>}

        {/* ── Summary Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(185px, 1fr))', gap: 14, marginBottom: 28 }}>
          {[
            { icon: 'fas fa-coins',            label: "Today's Revenue",    value: fmt(s.today_revenue),   color: '#16a34a', bg: '#dcfce7' },
            { icon: 'fas fa-calendar-alt',     label: 'This Month',         value: fmt(s.month_revenue),   color: '#4361ee', bg: '#eff2ff' },
            { icon: 'fas fa-chart-line',       label: 'This Year',          value: fmt(s.year_revenue),    color: '#0891b2', bg: '#e0f2fe' },
            { icon: 'fas fa-receipt',          label: 'Total Revenue',      value: fmt(s.total_revenue),   color: '#7c3aed', bg: '#ede9fe' },
            { icon: 'fas fa-clock',            label: 'Outstanding',        value: fmt(s.outstanding),     color: '#f77f00', bg: '#fff7ed' },
            { icon: 'fas fa-file-invoice',     label: 'Total Invoices',     value: (s.total_invoices ?? 0).toLocaleString(), color: '#64748b', bg: '#f1f5f9' },
          ].map(({ icon, label, value, color, bg }) => (
            <div key={label} style={{ background: '#fff', borderRadius: 14, padding: '18px 20px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 44, height: 44, borderRadius: 12, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <i className={icon} style={{ color, fontSize: 18 }}></i>
                </div>
                <div>
                  <div style={{ fontSize: loading ? 16 : 17, fontWeight: 800, color: '#0f172a', lineHeight: 1.2 }}>{loading ? '—' : value}</div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{label}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* ── Revenue Chart ── */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '20px 24px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', marginBottom: 24 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
            <h5 style={{ fontWeight: 800, fontSize: 15, color: '#0f172a', margin: 0 }}>
              <i className="fas fa-chart-bar me-2" style={{ color: '#4361ee' }}></i>
              Revenue Trend
            </h5>
            <div style={{ display: 'flex', gap: 6 }}>
              {['daily','monthly'].map(v => (
                <button key={v} onClick={() => setView(v)}
                  style={{ padding: '5px 14px', borderRadius: 7, border: `1px solid ${view === v ? '#4361ee' : '#e2e8f0'}`,
                    background: view === v ? '#4361ee' : '#fff', color: view === v ? '#fff' : '#374151',
                    fontWeight: 600, fontSize: 12, cursor: 'pointer' }}>
                  {v === 'daily' ? 'Last 30 Days' : 'Last 12 Months'}
                </button>
              ))}
            </div>
          </div>

          {loading ? (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 140 }}>
              {[50,70,40,80,60,90,55,75,45,85,65,70,50,80,60,40,70,55,75,45,85,65,70,50,80,60,40,70,55,75].map((h, i) => (
                <div key={i} style={{ flex: 1, background: '#f1f5f9', borderRadius: '3px 3px 0 0', height: `${h}%` }} />
              ))}
            </div>
          ) : trend.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>
              <i className="fas fa-chart-bar" style={{ fontSize: 36, marginBottom: 12, display: 'block' }}></i>
              No revenue data for this period.
            </div>
          ) : (
            <div>
              {/* Y-axis hint */}
              <div style={{ display: 'flex', alignItems: 'flex-end', gap: view === 'daily' ? 2 : 6, height: 150, paddingBottom: 4 }}>
                {trend.map(t => {
                  const pct = maxTrend ? Math.max((t.revenue / maxTrend) * 100, t.revenue > 0 ? 2 : 0) : 0;
                  return (
                    <div key={t[trendKey]} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', gap: 3 }}
                      title={`${t[trendKey]}: ${fmt(t.revenue)} (${t.count} invoices)`}>
                      <div style={{ width: '100%', background: '#4361ee', borderRadius: '3px 3px 0 0',
                        height: `${pct}%`, minHeight: t.revenue > 0 ? 4 : 0,
                        opacity: t.revenue === 0 ? 0.15 : 1, transition: 'height 0.4s',
                        cursor: 'pointer' }} />
                    </div>
                  );
                })}
              </div>
              {/* X-axis labels — only show every Nth for daily */}
              <div style={{ display: 'flex', gap: view === 'daily' ? 2 : 6, paddingTop: 4, overflowX: 'hidden' }}>
                {trend.map((t, i) => {
                  const skip = view === 'daily' && trend.length > 15 && i % 5 !== 0;
                  return (
                    <div key={t[trendKey]} style={{ flex: 1, textAlign: 'center', fontSize: 9, color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {skip ? '' : t[trendKey]}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* ── Payment Method + Category ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 24 }}>

          {/* By payment method */}
          <div style={{ background: '#fff', borderRadius: 16, padding: '20px 22px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
            <h5 style={{ fontWeight: 800, fontSize: 15, color: '#0f172a', margin: '0 0 18px' }}>
              <i className="fas fa-credit-card me-2" style={{ color: '#16a34a' }}></i>Collections by Payment Method
            </h5>
            {loading ? (
              <div style={{ color: '#94a3b8', textAlign: 'center', padding: 24 }}>Loading...</div>
            ) : byMethod.length === 0 ? (
              <div style={{ color: '#94a3b8', textAlign: 'center', padding: 24 }}>No payment data</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {byMethod.map(m => {
                  const pct   = Math.round((m.total / totalMethod) * 100);
                  const color = METHOD_COLORS[m.method] || '#64748b';
                  return (
                    <div key={m.method}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{METHOD_LABELS[m.method] || m.method}</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{fmt(m.total)}</span>
                          <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 6 }}>{pct}%</span>
                        </div>
                      </div>
                      <div style={{ height: 7, background: '#f1f5f9', borderRadius: 99 }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.4s' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* By service category */}
          <div style={{ background: '#fff', borderRadius: 16, padding: '20px 22px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
            <h5 style={{ fontWeight: 800, fontSize: 15, color: '#0f172a', margin: '0 0 18px' }}>
              <i className="fas fa-tags me-2" style={{ color: '#f77f00' }}></i>Revenue by Service Category
            </h5>
            {loading ? (
              <div style={{ color: '#94a3b8', textAlign: 'center', padding: 24 }}>Loading...</div>
            ) : byCategory.length === 0 ? (
              <div style={{ color: '#94a3b8', textAlign: 'center', padding: 24 }}>No category data</div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {byCategory.slice(0, 8).map((c, i) => {
                  const pct   = Math.round((c.total / totalCat) * 100);
                  const color = CAT_COLORS[i % CAT_COLORS.length];
                  const label = c.category ? c.category.charAt(0).toUpperCase() + c.category.slice(1).replace(/_/g, ' ') : 'Other';
                  return (
                    <div key={c.category}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
                          <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{label}</span>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <span style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{fmt(c.total)}</span>
                          <span style={{ fontSize: 10, color: '#94a3b8', marginLeft: 6 }}>{pct}%</span>
                        </div>
                      </div>
                      <div style={{ height: 7, background: '#f1f5f9', borderRadius: 99 }}>
                        <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99, transition: 'width 0.4s' }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ── Invoice Status Summary ── */}
        <div style={{ background: '#fff', borderRadius: 16, padding: '20px 22px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
          <h5 style={{ fontWeight: 800, fontSize: 15, color: '#0f172a', margin: '0 0 16px' }}>
            <i className="fas fa-file-invoice me-2" style={{ color: '#7c3aed' }}></i>Invoice Status Overview
          </h5>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14 }}>
            {[
              { label: 'Total Invoices', value: s.total_invoices,   color: '#64748b', bg: '#f1f5f9' },
              { label: 'Paid',           value: s.paid_invoices,    color: '#16a34a', bg: '#dcfce7' },
              { label: 'Pending/Partial',value: s.pending_invoices, color: '#f77f00', bg: '#fff7ed' },
            ].map(({ label, value, color, bg }) => (
              <div key={label} style={{ background: bg, borderRadius: 12, padding: '14px 16px' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color }}>{loading ? '—' : (value ?? 0).toLocaleString()}</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{label}</div>
              </div>
            ))}
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}

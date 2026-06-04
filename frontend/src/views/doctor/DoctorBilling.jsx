import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layout/DashboardLayout';
import { getNavForUser, getBrandForUser, getRoleBadge } from '../../utils/navItems';

const fmt = (n) => `Le ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;
const CAT_COLORS = ['#4361ee','#16a34a','#f77f00','#7c3aed','#0891b2','#dc2626','#2ec4b6'];

const STATUS_BADGE = {
  draft:     { bg: '#f1f5f9', color: '#64748b' },
  pending:   { bg: '#fef9c3', color: '#a16207' },
  partial:   { bg: '#fff7ed', color: '#c2410c' },
  paid:      { bg: '#dcfce7', color: '#15803d' },
  cancelled: { bg: '#fee2e2', color: '#b91c1c' },
};

export default function DoctorBilling() {
  const { apiCall, user } = useAuth();
  const navItems  = getNavForUser(user);
  const brand     = getBrandForUser(user);
  const roleBadge = getRoleBadge(user);

  const isAdmin = user?.role && ['admin', 'ministry_admin', 'hospital_admin', 'district_admin'].includes(user.role);

  const [data, setData]         = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState('');
  const [tab, setTab]           = useState('summary'); // 'summary' | 'invoices' | 'doctors'
  const [selectedDoc, setSelectedDoc] = useState(null); // id for admin filter

  const fetchReport = useCallback(async () => {
    const params = selectedDoc ? `?doctor=${selectedDoc}` : '';
    const res = await apiCall(`/billing/invoices/doctor_report/${params}`);
    if (res.ok) setData(await res.json());
  }, [apiCall, selectedDoc]);

  const fetchInvoices = useCallback(async () => {
    const params = selectedDoc ? `?doctor=${selectedDoc}` : '';
    const res = await apiCall(`/billing/invoices/${params}`);
    if (res.ok) setInvoices((await res.json()).results ?? await res.clone().json());
  }, [apiCall, selectedDoc]);

  const fetchAll = useCallback(async () => {
    setLoading(true); setError('');
    try { await Promise.all([fetchReport(), fetchInvoices()]); }
    catch { setError('Network error.'); }
    setLoading(false);
  }, [fetchReport, fetchInvoices]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const s          = data?.summary      || {};
  const breakdown  = data?.doctor_breakdown || [];
  const daily      = data?.daily_trend  || [];
  const byCategory = data?.by_category  || [];
  const maxDaily   = Math.max(...daily.map(d => d.revenue), 1);
  const totalCat   = byCategory.reduce((a, b) => a + b.total, 0) || 1;

  return (
    <DashboardLayout navItems={navItems} brandTitle={brand} roleBadge={roleBadge}>
      <div style={{ padding: '20px 16px', maxWidth: 1300, margin: '0 auto' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontWeight: 800, fontSize: 26, color: '#0f172a', margin: 0 }}>
              <i className="fas fa-user-md me-2" style={{ color: '#4361ee' }}></i>
              {isAdmin ? 'Doctor Billing Overview' : 'My Billing Summary'}
            </h2>
            <p style={{ color: '#64748b', fontSize: 13, marginTop: 4, marginBottom: 0 }}>
              {isAdmin ? 'Revenue attributed to each doctor at this facility' : 'Invoices and revenue generated under your name'}
            </p>
          </div>
          <button onClick={fetchAll}
            style={{ padding: '8px 16px', borderRadius: 9, border: '1px solid #e2e8f0', background: '#fff', color: '#374151', fontWeight: 600, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6 }}>
            <i className="fas fa-sync-alt" style={{ fontSize: 11 }}></i>Refresh
          </button>
        </div>

        {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 16px', borderRadius: 10, fontSize: 13, marginBottom: 16 }}>{error}</div>}

        {/* ── Summary Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(180px,1fr))', gap: 14, marginBottom: 24 }}>
          {[
            { icon: 'fas fa-chart-line', label: 'Total Revenue',    value: fmt(s.total_revenue),   color: '#16a34a', bg: '#dcfce7' },
            { icon: 'fas fa-calendar',   label: 'This Month',       value: fmt(s.month_revenue),   color: '#4361ee', bg: '#eff2ff' },
            { icon: 'fas fa-sun',        label: 'This Year',        value: fmt(s.year_revenue),    color: '#0891b2', bg: '#e0f2fe' },
            { icon: 'fas fa-clock',      label: 'Outstanding',      value: fmt(s.outstanding),     color: '#f77f00', bg: '#fff7ed' },
            { icon: 'fas fa-file',       label: 'Total Invoices',   value: (s.total_invoices ?? 0).toLocaleString(), color: '#7c3aed', bg: '#ede9fe' },
            { icon: 'fas fa-check',      label: 'Paid Invoices',    value: (s.paid_invoices ?? 0).toLocaleString(),  color: '#16a34a', bg: '#dcfce7' },
          ].map(({ icon, label, value, color, bg }) => (
            <div key={label} style={{ background: '#fff', borderRadius: 14, padding: '16px 18px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
              <div style={{ width: 40, height: 40, borderRadius: 10, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}>
                <i className={icon} style={{ color, fontSize: 16 }}></i>
              </div>
              <div style={{ fontSize: 17, fontWeight: 800, color: '#0f172a' }}>{loading ? '—' : value}</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* ── Tabs ── */}
        <div style={{ display: 'flex', gap: 6, marginBottom: 20, borderBottom: '1px solid #e2e8f0', paddingBottom: 0 }}>
          {[
            { key: 'summary',  label: 'Revenue Trend' },
            { key: 'invoices', label: 'Invoices' },
            ...(isAdmin ? [{ key: 'doctors', label: 'By Doctor' }] : []),
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              style={{ padding: '8px 16px', borderRadius: '8px 8px 0 0', border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: 13,
                background: tab === t.key ? '#4361ee' : 'transparent',
                color: tab === t.key ? '#fff' : '#64748b',
                borderBottom: tab === t.key ? '2px solid #4361ee' : '2px solid transparent' }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* ── Revenue Trend Tab ── */}
        {tab === 'summary' && (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

            {/* Daily chart */}
            <div style={{ background: '#fff', borderRadius: 16, padding: '20px 22px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
              <h5 style={{ fontWeight: 800, fontSize: 14, color: '#0f172a', margin: '0 0 16px' }}>
                <i className="fas fa-chart-bar me-2" style={{ color: '#4361ee' }}></i>Last 30 Days
              </h5>
              {loading ? (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 130 }}>
                  {[50,70,40,80,60,90,55,75,45,85,65,70,50,80,60,40,70,55,75,45,85,65,70,50,80,60,40,70,55,75].map((h,i) => (
                    <div key={i} style={{ flex: 1, background: '#f1f5f9', borderRadius: '2px 2px 0 0', height: `${h}%` }} />
                  ))}
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 130 }}>
                    {daily.map((d) => {
                      const pct = maxDaily ? Math.max((d.revenue / maxDaily) * 100, d.revenue > 0 ? 2 : 0) : 0;
                      return (
                        <div key={d.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}
                          title={`${d.label}: ${fmt(d.revenue)}`}>
                          <div style={{ width: '100%', background: '#4361ee', borderRadius: '2px 2px 0 0', height: `${pct}%`, minHeight: d.revenue > 0 ? 3 : 0, opacity: d.revenue === 0 ? 0.15 : 1 }} />
                        </div>
                      );
                    })}
                  </div>
                  <div style={{ display: 'flex', gap: 2, paddingTop: 4 }}>
                    {daily.map((d, i) => (
                      <div key={d.label} style={{ flex: 1, fontSize: 8, color: '#94a3b8', textAlign: 'center', overflow: 'hidden' }}>
                        {i % 5 === 0 ? d.label : ''}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Category breakdown */}
            <div style={{ background: '#fff', borderRadius: 16, padding: '20px 22px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
              <h5 style={{ fontWeight: 800, fontSize: 14, color: '#0f172a', margin: '0 0 16px' }}>
                <i className="fas fa-tags me-2" style={{ color: '#f77f00' }}></i>By Service Category
              </h5>
              {loading ? <div style={{ color: '#94a3b8', textAlign: 'center', padding: 32 }}>Loading…</div>
                : byCategory.length === 0 ? <div style={{ color: '#94a3b8', textAlign: 'center', padding: 32 }}>No data</div>
                : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
                    {byCategory.slice(0, 7).map((c, i) => {
                      const pct = Math.round((c.total / totalCat) * 100);
                      const color = CAT_COLORS[i % CAT_COLORS.length];
                      const label = c.category ? c.category.charAt(0).toUpperCase() + c.category.slice(1).replace(/_/g, ' ') : 'Other';
                      return (
                        <div key={c.category}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                              <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                              <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>{label}</span>
                            </div>
                            <span style={{ fontSize: 11, color: '#64748b' }}>{fmt(c.total)} · {pct}%</span>
                          </div>
                          <div style={{ height: 6, background: '#f1f5f9', borderRadius: 99 }}>
                            <div style={{ height: '100%', width: `${pct}%`, background: color, borderRadius: 99 }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
            </div>
          </div>
        )}

        {/* ── Invoices Tab ── */}
        {tab === 'invoices' && (
          <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 48 }}>
                <div className="spinner-border text-primary" style={{ width: 28, height: 28 }}></div>
              </div>
            ) : invoices.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 56, color: '#94a3b8' }}>
                <i className="fas fa-file-invoice" style={{ fontSize: 40, marginBottom: 12, display: 'block' }}></i>No invoices found.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      {['Invoice #', 'Patient', 'Doctor', 'Total', 'Paid', 'Balance', 'Status', 'Date'].map(h => (
                        <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {invoices.slice(0, 50).map((inv, i) => {
                      const st = STATUS_BADGE[inv.status] || STATUS_BADGE.draft;
                      return (
                        <tr key={inv.id} style={{ borderTop: '1px solid #f1f5f9', background: i % 2 ? '#fafafa' : '#fff' }}>
                          <td style={{ padding: '10px 16px', fontSize: 12, fontWeight: 700, color: '#4361ee' }}>{inv.invoice_number}</td>
                          <td style={{ padding: '10px 16px', fontSize: 12, color: '#0f172a' }}>{inv.patient_name}</td>
                          <td style={{ padding: '10px 16px', fontSize: 12, color: '#374151' }}>{inv.doctor_name || <span style={{ color: '#94a3b8' }}>—</span>}</td>
                          <td style={{ padding: '10px 16px', fontSize: 12, fontWeight: 700 }}>{fmt(inv.total)}</td>
                          <td style={{ padding: '10px 16px', fontSize: 12, color: '#16a34a' }}>{fmt(inv.amount_paid)}</td>
                          <td style={{ padding: '10px 16px', fontSize: 12, color: inv.balance_due > 0 ? '#f77f00' : '#94a3b8' }}>{fmt(inv.balance_due)}</td>
                          <td style={{ padding: '10px 16px' }}>
                            <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: st.bg, color: st.color }}>
                              {inv.status_display}
                            </span>
                          </td>
                          <td style={{ padding: '10px 16px', fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                            {new Date(inv.created_at).toLocaleDateString()}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ── By Doctor Tab (admin only) ── */}
        {tab === 'doctors' && isAdmin && (
          <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 48 }}>
                <div className="spinner-border text-primary" style={{ width: 28, height: 28 }}></div>
              </div>
            ) : breakdown.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 56, color: '#94a3b8' }}>
                <i className="fas fa-user-md" style={{ fontSize: 40, marginBottom: 12, display: 'block' }}></i>
                No doctor billing data found. Assign doctors to invoices to see their breakdown.
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{ background: '#f8fafc' }}>
                      {['#', 'Doctor', 'Invoices', 'Revenue', 'Avg / Invoice', 'Revenue Share'].map(h => (
                        <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const totalRev = breakdown.reduce((a, b) => a + b.revenue, 0) || 1;
                      return breakdown.map((dr, i) => {
                        const share = Math.round((dr.revenue / totalRev) * 100);
                        const avg   = dr.count ? dr.revenue / dr.count : 0;
                        return (
                          <tr key={dr.doctor_id}
                            style={{ borderTop: '1px solid #f1f5f9', background: i % 2 ? '#fafafa' : '#fff', cursor: 'pointer' }}
                            onClick={() => { setSelectedDoc(dr.doctor_id === selectedDoc ? null : dr.doctor_id); fetchAll(); }}>
                            <td style={{ padding: '12px 16px', fontSize: 12, color: '#94a3b8', fontWeight: 700 }}>{i + 1}</td>
                            <td style={{ padding: '12px 16px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                <div style={{ width: 34, height: 34, borderRadius: '50%', background: '#eff2ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                  <i className="fas fa-user-md" style={{ color: '#4361ee', fontSize: 13 }}></i>
                                </div>
                                <span style={{ fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{dr.doctor_name}</span>
                              </div>
                            </td>
                            <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700 }}>{dr.count}</td>
                            <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 800, color: '#16a34a' }}>{fmt(dr.revenue)}</td>
                            <td style={{ padding: '12px 16px', fontSize: 12, color: '#64748b' }}>{fmt(avg)}</td>
                            <td style={{ padding: '12px 16px', minWidth: 160 }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                                <div style={{ flex: 1, height: 8, background: '#f1f5f9', borderRadius: 99 }}>
                                  <div style={{ height: '100%', width: `${share}%`, background: '#4361ee', borderRadius: 99 }} />
                                </div>
                                <span style={{ fontSize: 11, color: '#64748b', width: 32, textAlign: 'right' }}>{share}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      });
                    })()}
                  </tbody>
                </table>
                {selectedDoc && (
                  <div style={{ padding: '10px 16px', background: '#eff2ff', borderTop: '1px solid #c7d2fe', fontSize: 12, color: '#4361ee', fontWeight: 600 }}>
                    <i className="fas fa-filter me-2"></i>
                    Filtered by selected doctor. <button onClick={() => { setSelectedDoc(null); fetchAll(); }} style={{ background: 'none', border: 'none', color: '#4361ee', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>Clear filter</button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}

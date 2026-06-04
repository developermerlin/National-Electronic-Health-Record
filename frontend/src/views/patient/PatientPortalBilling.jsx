import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layout/DashboardLayout';
import { getNavForUser, getBrandForUser, getRoleBadge } from '../../utils/navItems';

const STATUS_META = {
  draft:     { bg: '#f1f5f9', color: '#64748b', label: 'Draft' },
  pending:   { bg: '#fef3c7', color: '#92400e', label: 'Pending' },
  partial:   { bg: '#dbeafe', color: '#1d4ed8', label: 'Partial' },
  paid:      { bg: '#dcfce7', color: '#15803d', label: 'Paid' },
  cancelled: { bg: '#fee2e2', color: '#b91c1c', label: 'Cancelled' },
};

const fmtLe = (n) => `Le ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default function PatientPortalBilling() {
  const { apiCall, user } = useAuth();
  const [invoices, setInvoices]     = useState([]);
  const [payments, setPayments]     = useState([]);
  const [loading, setLoading]       = useState(true);
  const [selected, setSelected]     = useState(null);

  const navItems  = getNavForUser(user);
  const brand     = getBrandForUser(user);
  const roleBadge = getRoleBadge(user);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [iRes, pRes] = await Promise.all([
        apiCall('/billing/invoices/'),
        apiCall('/billing/payments/'),
      ]);
      if (iRes.ok) {
        const d = await iRes.json();
        setInvoices(Array.isArray(d) ? d : d.results || []);
      }
      if (pRes.ok) {
        const d = await pRes.json();
        setPayments(Array.isArray(d) ? d : d.results || []);
      }
    } catch (e) { console.error(e); }
    setLoading(false);
  }, [apiCall]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const totalBilled = invoices.reduce((s, i) => s + Number(i.total || 0), 0);
  const totalPaid   = invoices.reduce((s, i) => s + Number(i.amount_paid || 0), 0);
  const totalDue    = invoices.reduce((s, i) => s + Number(i.balance_due || 0), 0);
  const paidCount   = invoices.filter(i => i.status === 'paid').length;
  const pendingCount= invoices.filter(i => ['pending','partial','draft'].includes(i.status)).length;

  return (
    <DashboardLayout navItems={navItems} brandTitle={brand} roleBadge={roleBadge} hideBanner>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '24px 16px' }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontWeight: 800, fontSize: 24, color: '#0f172a', margin: 0 }}>
            <i className="fas fa-file-invoice-dollar me-2" style={{ color: '#4361ee' }}></i>My Billing
          </h2>
          <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>View your invoices and payment history</p>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total Invoices', value: invoices.length, icon: 'fas fa-file-invoice', color: '#4361ee', bg: '#eff6ff' },
            { label: 'Total Billed', value: fmtLe(totalBilled), icon: 'fas fa-calculator', color: '#7c3aed', bg: '#f5f3ff' },
            { label: 'Amount Paid', value: fmtLe(totalPaid), icon: 'fas fa-check-circle', color: '#16a34a', bg: '#f0fdf4' },
            { label: 'Balance Due', value: fmtLe(totalDue), icon: 'fas fa-exclamation-circle', color: '#dc2626', bg: '#fef2f2' },
            { label: 'Fully Paid', value: paidCount, icon: 'fas fa-receipt', color: '#0891b2', bg: '#ecfeff' },
            { label: 'Pending', value: pendingCount, icon: 'fas fa-hourglass-half', color: '#d97706', bg: '#fffbeb' },
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

        {/* Invoices Table */}
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.05)', overflow: 'hidden', marginBottom: 24 }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h5 style={{ fontWeight: 800, fontSize: 15, margin: 0, color: '#0f172a' }}>My Invoices</h5>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>{invoices.length} record{invoices.length !== 1 ? 's' : ''}</span>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: 48 }}>
              <div className="spinner-border text-primary"></div>
            </div>
          ) : invoices.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 56, color: '#94a3b8' }}>
              <i className="fas fa-file-invoice" style={{ fontSize: 40, marginBottom: 12, display: 'block' }}></i>
              No invoices on record yet.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {['Invoice #', 'Date', 'Subtotal', 'Discount', 'Tax', 'Total', 'Paid', 'Balance', 'Status', ''].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv, i) => {
                    const sm = STATUS_META[inv.status] || STATUS_META.draft;
                    return (
                      <tr key={inv.id} style={{ borderTop: '1px solid #f1f5f9', background: i % 2 ? '#fafafa' : '#fff', cursor: 'pointer' }}
                        onClick={() => setSelected(inv)}>
                        <td style={{ padding: '10px 14px', fontSize: 12, fontWeight: 700, color: '#4361ee' }}>{inv.invoice_number}</td>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>
                          {new Date(inv.created_at).toLocaleDateString('en-GB')}
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: '#374151' }}>{fmtLe(inv.subtotal)}</td>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: '#16a34a' }}>{inv.discount > 0 ? `-${fmtLe(inv.discount)}` : '—'}</td>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: '#64748b' }}>{fmtLe(inv.tax)}</td>
                        <td style={{ padding: '10px 14px', fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{fmtLe(inv.total)}</td>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: '#16a34a', fontWeight: 600 }}>{fmtLe(inv.amount_paid)}</td>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: inv.balance_due > 0 ? '#dc2626' : '#64748b', fontWeight: inv.balance_due > 0 ? 700 : 400 }}>{fmtLe(inv.balance_due)}</td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: sm.bg, color: sm.color }}>{sm.label}</span>
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

        {/* Payments History */}
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h5 style={{ fontWeight: 800, fontSize: 15, margin: 0, color: '#0f172a' }}>Payment History</h5>
            <span style={{ fontSize: 12, color: '#94a3b8' }}>{payments.length} payment{payments.length !== 1 ? 's' : ''}</span>
          </div>
          {payments.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#94a3b8' }}>No payments recorded yet.</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {['Invoice #', 'Amount', 'Method', 'Date', 'Received By'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {payments.map((p, i) => (
                    <tr key={p.id} style={{ borderTop: '1px solid #f1f5f9', background: i % 2 ? '#fafafa' : '#fff' }}>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: '#4361ee', fontWeight: 700 }}>{p.invoice_number || '—'}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12, fontWeight: 700, color: '#16a34a' }}>{fmtLe(p.amount)}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: '#374151' }}>{p.method_display || p.method}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: '#64748b', whiteSpace: 'nowrap' }}>{new Date(p.created_at).toLocaleDateString('en-GB')}</td>
                      <td style={{ padding: '10px 14px', fontSize: 12, color: '#64748b' }}>{p.received_by_name || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── Invoice Detail Drawer ── */}
        {selected && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 1000, display: 'flex', justifyContent: 'flex-end' }}
            onClick={() => setSelected(null)}>
            <div style={{ background: '#fff', width: 420, maxWidth: '90vw', height: '100%', overflowY: 'auto', padding: 28, boxShadow: '-4px 0 30px rgba(0,0,0,0.15)' }}
              onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h5 style={{ fontWeight: 800, fontSize: 16, margin: 0 }}>Invoice Detail</h5>
                <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94a3b8' }}>×</button>
              </div>
              <div style={{ textAlign: 'center', marginBottom: 20 }}>
                <div style={{ fontSize: 20, fontWeight: 800, color: '#4361ee' }}>{selected.invoice_number}</div>
                <span style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, background: STATUS_META[selected.status]?.bg || '#f1f5f9', color: STATUS_META[selected.status]?.color || '#64748b', fontWeight: 700 }}>
                  {STATUS_META[selected.status]?.label || selected.status}
                </span>
              </div>
              {[
                ['Hospital', selected.hospital_name || '—'],
                ['Date', new Date(selected.created_at).toLocaleString('en-GB')],
                ['Subtotal', fmtLe(selected.subtotal)],
                ['Discount', selected.discount > 0 ? fmtLe(selected.discount) : '—'],
                ['Tax', fmtLe(selected.tax)],
                ['Total', fmtLe(selected.total)],
                ['Amount Paid', fmtLe(selected.amount_paid)],
                ['Balance Due', fmtLe(selected.balance_due)],
                ['Created By', selected.created_by_name || '—'],
              ].map(([label, value]) => (
                <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{label}</span>
                  <span style={{ fontSize: 12, color: '#0f172a', fontWeight: 700, textAlign: 'right' }}>{value}</span>
                </div>
              ))}
              {selected.notes && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>Notes</div>
                  <div style={{ fontSize: 12, color: '#374151', background: '#f8fafc', borderRadius: 9, padding: '10px 12px' }}>{selected.notes}</div>
                </div>
              )}
              {/* Items */}
              {selected.items && selected.items.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 8 }}>Items</div>
                  {selected.items.map(it => (
                    <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                      <div>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{it.description}</div>
                        <div style={{ fontSize: 11, color: '#94a3b8' }}>{it.quantity} × {fmtLe(it.unit_price)}</div>
                      </div>
                      <div style={{ fontSize: 12, fontWeight: 700, color: '#0f172a' }}>{fmtLe(it.line_total)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}

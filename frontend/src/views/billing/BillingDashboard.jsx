import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layout/DashboardLayout';
import showToast from '../../utils/toast';
import { getNavForUser, getBrandForUser, getRoleBadge } from '../../utils/navItems';

const METHODS = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card / POS' },
  { value: 'mobile_money', label: 'Mobile Money' },
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'insurance', label: 'Insurance' },
  { value: 'waived', label: 'Waived' },
];

const STATUS_COLORS = {
  draft: '#64748b',
  pending: '#f59e0b',
  partial: '#0891b2',
  paid: '#10b981',
  cancelled: '#ef4444',
};

function BillingDashboard() {
  const { apiCall, user } = useAuth();
  const [invoices, setInvoices] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showDetail, setShowDetail] = useState(null);
  const [showPayment, setShowPayment] = useState(false);
  const [patients, setPatients] = useState([]);
  const [patientSearch, setPatientSearch] = useState('');

  const [form, setForm] = useState({
    invoice_number: '',
    patient: '',
    visit: '',
    discount: 0,
    tax: 0,
    notes: '',
    items: [{ description: '', quantity: 1, unit_price: 0, category: 'consultation' }],
  });

  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    method: 'cash',
    reference: '',
    notes: '',
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append('search', search);
      if (statusFilter !== 'all') params.append('status', statusFilter);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);

      const [invRes, statsRes] = await Promise.all([
        apiCall(`/billing/invoices/?${params.toString()}`),
        apiCall('/billing/invoices/stats/'),
      ]);
      if (invRes.ok) {
        const data = await invRes.json();
        setInvoices(Array.isArray(data) ? data : data.results || []);
      }
      if (statsRes.ok) setStats(await statsRes.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [apiCall, search, statusFilter, dateFrom, dateTo]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const searchPatients = useCallback(async (q) => {
    if (!q || q.length < 2) return;
    try {
      const res = await apiCall(`/patients/?search=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setPatients(data.results || data || []);
      }
    } catch { /* ignore */ }
  }, [apiCall]);

  useEffect(() => {
    const t = setTimeout(() => searchPatients(patientSearch), 300);
    return () => clearTimeout(t);
  }, [patientSearch, searchPatients]);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const body = {
        ...form,
        hospital: user.hospital,
        items: form.items.filter(i => i.description.trim()),
      };
      const res = await apiCall('/billing/invoices/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (res.ok) {
        showToast.success('Invoice created successfully');
        setShowCreate(false);
        setForm({
          invoice_number: '',
          patient: '',
          visit: '',
          discount: 0,
          tax: 0,
          notes: '',
          items: [{ description: '', quantity: 1, unit_price: 0, category: 'consultation' }],
        });
        fetchData();
      } else {
        const err = await res.json();
        showToast.error(err.error || 'Failed to create invoice');
      }
    } catch {
      showToast.networkError();
    }
  };

  const printInvoice = (inv) => {
    const hospital = inv.hospital_name || 'Hospital';
    const now = new Date().toLocaleString();
    const fmt = (n) => `SLE ${Number(n || 0).toLocaleString('en-GB', { minimumFractionDigits: 2 })}`;
    const STATUS_DISPLAY = { draft: 'Draft', pending: 'Pending Payment', partial: 'Partially Paid', paid: 'Paid', cancelled: 'Cancelled' };
    const itemRows = (inv.items || []).map(item => `
      <tr>
        <td style='padding:7px 10px;border-bottom:1px solid #eee;font-weight:600'>${item.description}</td>
        <td style='padding:7px 10px;border-bottom:1px solid #eee;text-align:center'>${item.quantity}</td>
        <td style='padding:7px 10px;border-bottom:1px solid #eee;text-align:right'>${fmt(item.unit_price)}</td>
        <td style='padding:7px 10px;border-bottom:1px solid #eee;text-align:right;font-weight:700'>${fmt(item.line_total)}</td>
      </tr>`).join('');
    const paymentRows = (inv.payments || []).map(p => `
      <tr>
        <td style='padding:6px 10px;border-bottom:1px solid #eee'>${p.method_display || p.method}</td>
        <td style='padding:6px 10px;border-bottom:1px solid #eee'>${p.reference || '—'}</td>
        <td style='padding:6px 10px;border-bottom:1px solid #eee;text-align:right;color:#059669;font-weight:700'>${fmt(p.amount)}</td>
      </tr>`).join('');
    const html = `<!DOCTYPE html><html><head><title>Invoice ${inv.invoice_number}</title><style>
      body{font-family:Arial,sans-serif;margin:0;padding:30px;color:#111;}
      .header{text-align:center;border-bottom:3px double #333;padding-bottom:16px;margin-bottom:18px;}
      .header h1{font-size:20px;margin:0 0 4px;} .header h2{font-size:15px;margin:0;color:#555;}
      .meta{display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;margin-bottom:18px;font-size:13px;}
      .meta .label{font-size:11px;font-weight:700;color:#888;display:block;} .meta .value{font-weight:600;}
      table{width:100%;border-collapse:collapse;font-size:12px;}
      thead th{background:#f4f4f4;padding:8px 10px;text-align:left;font-weight:700;border-bottom:2px solid #ccc;font-size:11px;text-transform:uppercase;letter-spacing:.5px;}
      .totals{margin-top:16px;float:right;width:240px;font-size:13px;}
      .totals div{display:flex;justify-content:space-between;padding:4px 0;}
      .totals .grand{font-size:15px;font-weight:700;border-top:2px solid #333;padding-top:6px;margin-top:4px;}
      .status-badge{display:inline-block;padding:3px 12px;border-radius:20px;font-size:11px;font-weight:700;
        background:${STATUS_COLORS[inv.status] + '20' || '#eee'};color:${STATUS_COLORS[inv.status] || '#555'};}
      .footer{text-align:center;font-size:11px;color:#888;margin-top:40px;padding-top:10px;border-top:1px solid #ddd;clear:both;}
      @media print{body{padding:15px;}}
    </style></head><body>
      <div class='header'>
        <h1>${hospital}</h1>
        <h2>INVOICE / RECEIPT</h2>
      </div>
      <div class='meta'>
        <div><span class='label'>Invoice Number</span><span class='value'>${inv.invoice_number}</span></div>
        <div><span class='label'>Status</span><span class='status-badge'>${STATUS_DISPLAY[inv.status] || inv.status}</span></div>
        <div><span class='label'>Patient</span><span class='value'>${inv.patient_name || '—'}</span></div>
        <div><span class='label'>Patient ID</span><span class='value'>${inv.patient_code || '—'}</span></div>
        <div><span class='label'>Date Issued</span><span class='value'>${inv.created_at ? new Date(inv.created_at).toLocaleDateString('en-GB') : '—'}</span></div>
        <div><span class='label'>Hospital</span><span class='value'>${hospital}</span></div>
      </div>
      ${itemRows ? `<table><thead><tr><th>Description</th><th style='text-align:center'>Qty</th><th style='text-align:right'>Unit Price</th><th style='text-align:right'>Total</th></tr></thead><tbody>${itemRows}</tbody></table>` : ''}
      <div class='totals'>
        <div><span>Subtotal</span><strong>${fmt(inv.subtotal)}</strong></div>
        ${inv.discount > 0 ? `<div><span>Discount</span><strong style='color:#dc2626'>- ${fmt(inv.discount)}</strong></div>` : ''}
        ${inv.tax > 0 ? `<div><span>Tax</span><strong>${fmt(inv.tax)}</strong></div>` : ''}
        <div class='grand'><span>TOTAL</span><strong>${fmt(inv.total)}</strong></div>
        <div style='color:#059669'><span>Paid</span><strong>${fmt(inv.amount_paid)}</strong></div>
        <div style='color:#dc2626'><span>Balance Due</span><strong>${fmt(inv.balance_due)}</strong></div>
      </div>
      ${paymentRows ? `<div style='clear:both;margin-top:24px'><h6 style='font-size:13px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px'>Payment History</h6><table><thead><tr><th>Method</th><th>Reference</th><th style='text-align:right'>Amount</th></tr></thead><tbody>${paymentRows}</tbody></table></div>` : ''}
      ${inv.notes ? `<div style='clear:both;margin-top:16px;background:#f9f9f9;border:1px solid #ddd;border-radius:6px;padding:10px 14px;font-size:13px'><strong>Notes:</strong> ${inv.notes}</div>` : ''}
      <div class='footer'>${hospital} — National Electronic Health Record — Printed ${now}</div>
    </body></html>`;
    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  };

  const handleRecordPayment = async (e) => {
    e.preventDefault();
    if (!showDetail) return;
    try {
      const res = await apiCall(`/billing/invoices/${showDetail.id}/record_payment/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentForm),
      });
      if (res.ok) {
        showToast.success('Payment recorded');
        const data = await res.json();
        setShowDetail(data);
        setShowPayment(false);
        setPaymentForm({ amount: '', method: 'cash', reference: '', notes: '' });
        fetchData();
      } else {
        const err = await res.json();
        showToast.error(err.error || 'Failed to record payment');
      }
    } catch {
      showToast.networkError();
    }
  };

  const handleCancelInvoice = async (id) => {
    if (!window.confirm('Cancel this invoice?')) return;
    try {
      const res = await apiCall(`/billing/invoices/${id}/cancel/`, { method: 'POST' });
      if (res.ok) {
        showToast.success('Invoice cancelled');
        fetchData();
        if (showDetail && showDetail.id === id) setShowDetail(null);
      } else {
        const err = await res.json();
        showToast.error(err.error || 'Failed to cancel');
      }
    } catch {
      showToast.networkError();
    }
  };

  const addItem = () => setForm(f => ({
    ...f,
    items: [...f.items, { description: '', quantity: 1, unit_price: 0, category: 'consultation' }],
  }));

  const removeItem = (idx) => setForm(f => ({
    ...f,
    items: f.items.filter((_, i) => i !== idx),
  }));

  const updateItem = (idx, field, value) => setForm(f => {
    const items = [...f.items];
    items[idx] = { ...items[idx], [field]: value };
    return { ...f, items };
  });

  const subtotal = form.items.reduce((s, i) => s + (Number(i.quantity) * Number(i.unit_price)), 0);
  const total = Math.max(0, subtotal - Number(form.discount) + Number(form.tax));

  const formatMoney = (val) =>
    new Intl.NumberFormat('en-SL', { style: 'currency', currency: 'SLE' }).format(val || 0);

  return (
    <DashboardLayout navItems={getNavForUser(user)} brandTitle={getBrandForUser(user)} roleBadge={getRoleBadge(user)}>
      <div style={{ padding: '28px 24px' }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: 0 }}>Billing & Invoices</h1>
            <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 14 }}>Create invoices, record payments, and track revenue</p>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={fetchData} style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: '#f1f5f9', color: '#475569', border: 'none', borderRadius: 10,
              padding: '10px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer',
            }}><i className="fas fa-sync-alt" style={{ fontSize: 12 }}></i>Refresh</button>
            <button onClick={() => setShowCreate(true)} style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: 'linear-gradient(135deg,#0891b2,#0ea5e9)', color: '#fff', border: 'none', borderRadius: 10,
              padding: '10px 18px', fontWeight: 700, fontSize: 13, cursor: 'pointer',
            }}><i className="fas fa-plus" style={{ fontSize: 12 }}></i>New Invoice</button>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 14, marginBottom: 24 }}>
            {[
              { icon: 'fas fa-file-invoice', label: 'Total Invoices', value: stats.total_invoices, color: '#0891b2' },
              { icon: 'fas fa-hourglass-half', label: 'Pending', value: stats.total_pending, color: '#f59e0b' },
              { icon: 'fas fa-check-circle', label: 'Paid', value: stats.total_paid, color: '#10b981' },
              { icon: 'fas fa-coins', label: 'Total Revenue', value: formatMoney(stats.total_revenue), color: '#0ea5e9' },
              { icon: 'fas fa-hand-holding-usd', label: 'Outstanding', value: formatMoney(stats.total_outstanding), color: '#ef4444' },
              { icon: 'fas fa-calendar-day', label: 'Today', value: formatMoney(stats.today_revenue), color: '#8b5cf6' },
            ].map(s => (
              <div key={s.label} style={{ background: '#fff', borderRadius: 14, padding: '18px 18px 14px', boxShadow: '0 2px 8px rgba(15,23,42,0.06)' }}>
                <div style={{ width: 40, height: 40, borderRadius: 12, background: s.color + '15',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                  <i className={s.icon} style={{ color: s.color, fontSize: 16 }}></i>
                </div>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#0f172a', lineHeight: 1, marginBottom: 4 }}>{s.value}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b' }}>{s.label}</div>
              </div>
            ))}
          </div>
        )}

        {/* Filters */}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20, alignItems: 'center' }}>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search invoice # or patient..."
            style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, minWidth: 220 }} />
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13 }}>
            <option value="all">All Statuses</option>
            <option value="draft">Draft</option>
            <option value="pending">Pending</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
            <option value="cancelled">Cancelled</option>
          </select>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
            style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13 }} />
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
            style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13 }} />
        </div>

        {/* Table */}
        <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 8px rgba(15,23,42,0.06)', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 40 }}><div className="spinner-border text-primary"></div></div>
          ) : invoices.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>
              <i className="fas fa-file-invoice fa-3x mb-3" style={{ color: '#cbd5e1' }}></i>
              <p>No invoices found.</p>
            </div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  {['Invoice #', 'Patient', 'Status', 'Total', 'Paid', 'Balance', 'Date', 'Actions'].map(h => (
                    <th key={h} style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 700, color: '#475569', fontSize: 12, textTransform: 'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {invoices.map(inv => (
                  <tr key={inv.id} style={{ borderBottom: '1px solid #f1f5f9', cursor: 'pointer' }} onClick={() => setShowDetail(inv)}>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: '#0f172a' }}>{inv.invoice_number}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ fontWeight: 600 }}>{inv.patient_name}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>{inv.patient_code}</div>
                    </td>
                    <td style={{ padding: '12px 16px' }}>
                      <span style={{ background: (STATUS_COLORS[inv.status] || '#64748b') + '15', color: STATUS_COLORS[inv.status] || '#64748b',
                        padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: 'capitalize' }}>
                        {inv.status_display || inv.status}
                      </span>
                    </td>
                    <td style={{ padding: '12px 16px', fontWeight: 700 }}>{formatMoney(inv.total)}</td>
                    <td style={{ padding: '12px 16px', color: '#10b981', fontWeight: 600 }}>{formatMoney(inv.amount_paid)}</td>
                    <td style={{ padding: '12px 16px', fontWeight: 700, color: inv.balance_due > 0 ? '#ef4444' : '#64748b' }}>{formatMoney(inv.balance_due)}</td>
                    <td style={{ padding: '12px 16px', color: '#64748b', fontSize: 12 }}>{new Date(inv.created_at).toLocaleDateString('en-SL')}</td>
                    <td style={{ padding: '12px 16px' }}>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {inv.status !== 'paid' && inv.status !== 'cancelled' && (
                          <button onClick={(e) => { e.stopPropagation(); setShowDetail(inv); setShowPayment(true); }}
                            style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #10b981', background: '#fff', color: '#10b981', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                            Pay
                          </button>
                        )}
                        {inv.status !== 'cancelled' && inv.status !== 'paid' && (
                          <button onClick={(e) => { e.stopPropagation(); handleCancelInvoice(inv.id); }}
                            style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid #ef4444', background: '#fff', color: '#ef4444', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                            Cancel
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Create Invoice Modal */}
      {showCreate && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(3px)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setShowCreate(false)}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 640, maxHeight: '90vh', overflowY: 'auto', padding: 28 }}
            onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 800 }}>New Invoice</h3>
            <form onSubmit={handleCreate}>
              <div style={{ display: 'grid', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>Invoice Number</label>
                  <input required value={form.invoice_number} onChange={e => setForm(f => ({ ...f, invoice_number: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13 }} placeholder="INV-0001" />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>Patient</label>
                  <input value={patientSearch} onChange={e => setPatientSearch(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13 }} placeholder="Search patient name or ID..." />
                  {patients.length > 0 && (
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: 10, marginTop: 4, maxHeight: 160, overflowY: 'auto', background: '#fff' }}>
                      {patients.map(p => (
                        <div key={p.id} onClick={() => { setForm(f => ({ ...f, patient: p.id })); setPatientSearch(p.full_name); setPatients([]); }}
                          style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, borderBottom: '1px solid #f1f5f9' }}>
                          <strong>{p.full_name}</strong> <span style={{ color: '#94a3b8' }}>{p.patient_id}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>Line Items</label>
                  {form.items.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: 8, marginBottom: 10, alignItems: 'flex-end' }}>
                      <input placeholder="Description" value={item.description} onChange={e => updateItem(idx, 'description', e.target.value)}
                        style={{ flex: 2, padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} />
                      <input type="number" min={1} placeholder="Qty" value={item.quantity} onChange={e => updateItem(idx, 'quantity', e.target.value)}
                        style={{ width: 60, padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} />
                      <input type="number" min={0} step="0.01" placeholder="Price" value={item.unit_price} onChange={e => updateItem(idx, 'unit_price', e.target.value)}
                        style={{ width: 90, padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} />
                      <select value={item.category} onChange={e => updateItem(idx, 'category', e.target.value)}
                        style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}>
                        <option value="consultation">Consultation</option>
                        <option value="lab">Lab</option>
                        <option value="pharmacy">Pharmacy</option>
                        <option value="bed">Bed</option>
                        <option value="procedure">Procedure</option>
                        <option value="other">Other</option>
                      </select>
                      {form.items.length > 1 && (
                        <button type="button" onClick={() => removeItem(idx)} style={{ padding: '8px 10px', borderRadius: 8, border: '1px solid #ef4444', background: '#fff', color: '#ef4444', cursor: 'pointer' }}>
                          <i className="fas fa-trash"></i>
                        </button>
                      )}
                    </div>
                  ))}
                  <button type="button" onClick={addItem} style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#f8fafc', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                    <i className="fas fa-plus me-1"></i>Add Item
                  </button>
                </div>
                <div style={{ display: 'flex', gap: 14 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>Discount</label>
                    <input type="number" min={0} step="0.01" value={form.discount} onChange={e => setForm(f => ({ ...f, discount: e.target.value }))}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13 }} />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>Tax</label>
                    <input type="number" min={0} step="0.01" value={form.tax} onChange={e => setForm(f => ({ ...f, tax: e.target.value }))}
                      style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13 }} />
                  </div>
                </div>
                <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <div style={{ fontSize: 13, color: '#64748b' }}>
                    Subtotal: <strong>{formatMoney(subtotal)}</strong> &nbsp;|&nbsp;
                    Discount: <strong>{formatMoney(form.discount)}</strong> &nbsp;|&nbsp;
                    Tax: <strong>{formatMoney(form.tax)}</strong>
                  </div>
                  <div style={{ fontSize: 18, fontWeight: 800, color: '#0f172a' }}>{formatMoney(total)}</div>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>Notes</label>
                  <textarea value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, minHeight: 60 }} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
                <button type="button" onClick={() => setShowCreate(false)} style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#0891b2,#0ea5e9)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Create Invoice</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice Detail Modal */}
      {showDetail && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(3px)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => { setShowDetail(null); setShowPayment(false); }}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 560, maxHeight: '90vh', overflowY: 'auto', padding: 28 }}
            onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>Invoice {showDetail.invoice_number}</h3>
              <button onClick={() => { setShowDetail(null); setShowPayment(false); }} style={{ border: 'none', background: 'none', fontSize: 20, color: '#94a3b8', cursor: 'pointer' }}>&times;</button>
            </div>
            <div style={{ marginBottom: 16 }}>
              <div style={{ fontSize: 14, fontWeight: 700 }}>{showDetail.patient_name}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{showDetail.patient_code} · {showDetail.hospital_name}</div>
              <div style={{ marginTop: 8 }}>
                <span style={{ background: (STATUS_COLORS[showDetail.status] || '#64748b') + '15', color: STATUS_COLORS[showDetail.status] || '#64748b',
                  padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700, textTransform: 'capitalize' }}>
                  {showDetail.status_display || showDetail.status}
                </span>
              </div>
            </div>

            <div style={{ background: '#f8fafc', borderRadius: 12, padding: '14px 18px', marginBottom: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                <span>Subtotal</span><strong>{formatMoney(showDetail.subtotal)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                <span>Discount</span><strong>{formatMoney(showDetail.discount)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                <span>Tax</span><strong>{formatMoney(showDetail.tax)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                <span>Total</span><strong style={{ fontSize: 15 }}>{formatMoney(showDetail.total)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, color: '#10b981' }}>
                <span>Paid</span><strong>{formatMoney(showDetail.amount_paid)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: '#ef4444' }}>
                <span>Balance Due</span><strong>{formatMoney(showDetail.balance_due)}</strong>
              </div>
            </div>

            {showDetail.items?.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <h6 style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Line Items</h6>
                {showDetail.items.map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{item.description}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>{item.quantity} × {formatMoney(item.unit_price)} · {item.category}</div>
                    </div>
                    <div style={{ fontWeight: 700 }}>{formatMoney(item.line_total)}</div>
                  </div>
                ))}
              </div>
            )}

            {showDetail.payments?.length > 0 && (
              <div style={{ marginBottom: 20 }}>
                <h6 style={{ margin: '0 0 10px', fontSize: 13, fontWeight: 700, color: '#475569', textTransform: 'uppercase' }}>Payments</h6>
                {showDetail.payments.map(p => (
                  <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9', fontSize: 13 }}>
                    <div>
                      <div style={{ fontWeight: 600 }}>{p.method_display}</div>
                      <div style={{ fontSize: 11, color: '#94a3b8' }}>{p.received_by_name} · {new Date(p.created_at).toLocaleDateString('en-SL')}</div>
                    </div>
                    <div style={{ fontWeight: 700, color: '#10b981' }}>{formatMoney(p.amount)}</div>
                  </div>
                ))}
              </div>
            )}

            {showDetail.notes && (
              <div style={{ marginBottom: 20, fontSize: 13, color: '#64748b', background: '#f8fafc', padding: '10px 14px', borderRadius: 10 }}>
                <strong>Notes:</strong> {showDetail.notes}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button onClick={() => printInvoice(showDetail)} style={{
                flex: 1, padding: '11px', borderRadius: 10, border: '1.5px solid #64748b',
                background: '#fff', color: '#475569', fontWeight: 700, cursor: 'pointer', fontSize: 13,
              }}><i className="fas fa-print me-2"></i>Print Invoice</button>
              {showDetail.status !== 'paid' && showDetail.status !== 'cancelled' && (
                <button onClick={() => setShowPayment(true)} style={{
                  flex: 1, padding: '11px', borderRadius: 10, border: 'none',
                  background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 13,
                }}><i className="fas fa-plus me-2"></i>Record Payment</button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Record Payment Modal */}
      {showPayment && showDetail && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(3px)', zIndex: 10000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }} onClick={() => setShowPayment(false)}>
          <div style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 420, padding: 28 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 800 }}>Record Payment</h3>
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: '10px 14px', marginBottom: 20, fontSize: 13 }}>
              Balance due: <strong style={{ color: '#ef4444' }}>{formatMoney(showDetail.balance_due)}</strong>
            </div>
            <form onSubmit={handleRecordPayment}>
              <div style={{ display: 'grid', gap: 14 }}>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>Amount</label>
                  <input required type="number" min={0.01} step="0.01" max={showDetail.balance_due}
                    value={paymentForm.amount} onChange={e => setPaymentForm(f => ({ ...f, amount: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13 }} />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>Method</label>
                  <select value={paymentForm.method} onChange={e => setPaymentForm(f => ({ ...f, method: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13 }}>
                    {METHODS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>Reference</label>
                  <input value={paymentForm.reference} onChange={e => setPaymentForm(f => ({ ...f, reference: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13 }} placeholder="Transaction ID / Cheque #" />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#475569', display: 'block', marginBottom: 6 }}>Notes</label>
                  <textarea value={paymentForm.notes} onChange={e => setPaymentForm(f => ({ ...f, notes: e.target.value }))}
                    style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, minHeight: 60 }} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
                <button type="button" onClick={() => setShowPayment(false)} style={{ padding: '10px 20px', borderRadius: 10, border: '1px solid #e2e8f0', background: '#fff', fontWeight: 700, cursor: 'pointer' }}>Cancel</button>
                <button type="submit" style={{ padding: '10px 24px', borderRadius: 10, border: 'none', background: 'linear-gradient(135deg,#10b981,#059669)', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>Record Payment</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

export default BillingDashboard;

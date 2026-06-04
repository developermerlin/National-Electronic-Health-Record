import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layout/DashboardLayout';
import { getNavForUser, getBrandForUser, getRoleBadge } from '../../utils/navItems';
import { toast } from 'react-toastify';

const fmt = (n) => `Le ${Number(n || 0).toLocaleString('en-US', { minimumFractionDigits: 0 })}`;

const STATUS_META = {
  draft:        { bg: '#f1f5f9', color: '#64748b',  icon: 'fas fa-file'          },
  submitted:    { bg: '#dbeafe', color: '#1d4ed8',  icon: 'fas fa-paper-plane'   },
  under_review: { bg: '#fef9c3', color: '#a16207',  icon: 'fas fa-search'        },
  approved:     { bg: '#dcfce7', color: '#15803d',  icon: 'fas fa-check-circle'  },
  rejected:     { bg: '#fee2e2', color: '#b91c1c',  icon: 'fas fa-times-circle'  },
  paid:         { bg: '#d1fae5', color: '#065f46',  icon: 'fas fa-hand-holding-usd' },
  closed:       { bg: '#e2e8f0', color: '#475569',  icon: 'fas fa-lock'          },
};

const SCHEME_LABELS = {
  nhia:     'NHIA',
  slesha:   'SLeSHA',
  employer: 'Employer',
  private:  'Private',
  other:    'Other',
};

const EMPTY_FORM = {
  patient: '', invoice: '', hospital: '',
  scheme: 'nhia', provider_name: '', member_id: '',
  claim_amount: '', notes: '',
};

export default function InsuranceClaims() {
  const { apiCall, user } = useAuth();
  const navItems  = getNavForUser(user);
  const brand     = getBrandForUser(user);
  const roleBadge = getRoleBadge(user);

  const isAdmin = user?.role && ['admin', 'ministry_admin', 'hospital_admin'].includes(user.role);

  const [claims, setClaims]       = useState([]);
  const [stats, setStats]         = useState({});
  const [loading, setLoading]     = useState(true);
  const [statusFilter, setStatus] = useState('');
  const [search, setSearch]       = useState('');
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState(EMPTY_FORM);
  const [saving, setSaving]       = useState(false);
  const [selected, setSelected]   = useState(null); // claim detail
  const [statusModal, setStatusModal] = useState(null); // { claim, newStatus }
  const [approvedAmt, setApprovedAmt] = useState('');
  const [rejectReason, setRejectReason] = useState('');
  const [patients, setPatients]   = useState([]);
  const [invoices, setInvoices]   = useState([]);

  const fetchClaims = useCallback(async () => {
    const params = new URLSearchParams();
    if (statusFilter) params.set('status', statusFilter);
    if (search)       params.set('search', search);
    const res = await apiCall(`/insurance/claims/?${params}`);
    if (res.ok) {
      const data = await res.json();
      setClaims(data.results ?? data);
    }
  }, [apiCall, statusFilter, search]);

  const fetchStats = useCallback(async () => {
    const res = await apiCall('/insurance/claims/stats/');
    if (res.ok) setStats(await res.json());
  }, [apiCall]);

  const fetchSupport = useCallback(async () => {
    const [pRes, iRes] = await Promise.all([
      apiCall('/patients/?page_size=200'),
      apiCall('/billing/invoices/?page_size=200'),
    ]);
    if (pRes.ok) { const d = await pRes.json(); setPatients(d.results ?? d); }
    if (iRes.ok) { const d = await iRes.json(); setInvoices(d.results ?? d); }
  }, [apiCall]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchClaims(), fetchStats()]);
    setLoading(false);
  }, [fetchClaims, fetchStats]);

  useEffect(() => { fetchAll(); }, [fetchAll]);

  const handleSubmitForm = async (e) => {
    e.preventDefault();
    setSaving(true);
    const res = await apiCall('/insurance/claims/', { method: 'POST', body: JSON.stringify(form) });
    setSaving(false);
    if (res.ok) {
      toast.success('Claim created successfully');
      setShowForm(false);
      setForm(EMPTY_FORM);
      fetchAll();
    } else {
      const err = await res.json();
      toast.error(JSON.stringify(err));
    }
  };

  const handleSubmitClaim = async (id) => {
    const res = await apiCall(`/insurance/claims/${id}/submit/`, { method: 'POST' });
    if (res.ok) { toast.success('Claim submitted'); fetchAll(); }
    else        { const e = await res.json(); toast.error(e.error || 'Failed'); }
  };

  const handleUpdateStatus = async () => {
    if (!statusModal) return;
    const body = { status: statusModal.newStatus };
    if (statusModal.newStatus === 'approved') body.approved_amount = approvedAmt;
    if (statusModal.newStatus === 'rejected') body.rejection_reason = rejectReason;
    const res = await apiCall(`/insurance/claims/${statusModal.claim.id}/update_status/`, {
      method: 'POST', body: JSON.stringify(body),
    });
    if (res.ok) {
      toast.success(`Status updated to "${statusModal.newStatus}"`);
      setStatusModal(null); setApprovedAmt(''); setRejectReason('');
      fetchAll();
    } else { const e = await res.json(); toast.error(e.error || 'Failed'); }
  };

  return (
    <DashboardLayout navItems={navItems} brandTitle={brand} roleBadge={roleBadge}>
      <div style={{ padding: '20px 16px', maxWidth: 1280, margin: '0 auto' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontWeight: 800, fontSize: 26, color: '#0f172a', margin: 0 }}>
              <i className="fas fa-shield-alt me-2" style={{ color: '#7c3aed' }}></i>Insurance / NHIA Claims
            </h2>
            <p style={{ color: '#64748b', fontSize: 13, marginTop: 4, marginBottom: 0 }}>
              Manage patient insurance claims and NHIA submissions
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={fetchAll}
              style={{ padding: '8px 14px', borderRadius: 9, border: '1px solid #e2e8f0', background: '#fff', color: '#374151', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
              <i className="fas fa-sync-alt me-1"></i>Refresh
            </button>
            <button onClick={() => { setShowForm(true); fetchSupport(); }}
              style={{ padding: '8px 16px', borderRadius: 9, border: 'none', background: '#7c3aed', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              <i className="fas fa-plus me-1"></i>New Claim
            </button>
          </div>
        </div>

        {/* ── Stats Cards ── */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: 12, marginBottom: 24 }}>
          {[
            { label: 'Total Claims',    value: stats.total        ?? 0, icon: 'fas fa-file-contract', color: '#7c3aed', bg: '#ede9fe' },
            { label: 'Submitted',       value: stats.submitted    ?? 0, icon: 'fas fa-paper-plane',   color: '#1d4ed8', bg: '#dbeafe' },
            { label: 'Approved',        value: stats.approved     ?? 0, icon: 'fas fa-check-circle',  color: '#15803d', bg: '#dcfce7' },
            { label: 'Rejected',        value: stats.rejected     ?? 0, icon: 'fas fa-times-circle',  color: '#b91c1c', bg: '#fee2e2' },
            { label: 'Total Claimed',   value: fmt(stats.total_claimed),    icon: 'fas fa-hand-holding-usd', color: '#0891b2', bg: '#e0f2fe' },
            { label: 'Total Approved',  value: fmt(stats.total_approved),   icon: 'fas fa-coins',           color: '#16a34a', bg: '#dcfce7' },
          ].map(({ label, value, icon, color, bg }) => (
            <div key={label} style={{ background: '#fff', borderRadius: 14, padding: '14px 16px', boxShadow: '0 2px 10px rgba(0,0,0,0.05)' }}>
              <div style={{ width: 36, height: 36, borderRadius: 9, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 8 }}>
                <i className={icon} style={{ color, fontSize: 14 }}></i>
              </div>
              <div style={{ fontSize: 15, fontWeight: 800, color: '#0f172a' }}>{loading ? '—' : value}</div>
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{label}</div>
            </div>
          ))}
        </div>

        {/* ── Filters ── */}
        <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Search by claim #, patient, member ID…"
            style={{ flex: 1, minWidth: 220, padding: '8px 12px', borderRadius: 9, border: '1px solid #e2e8f0', fontSize: 13 }} />
          <select value={statusFilter} onChange={e => setStatus(e.target.value)}
            style={{ padding: '8px 12px', borderRadius: 9, border: '1px solid #e2e8f0', fontSize: 13, background: '#fff' }}>
            <option value="">All Statuses</option>
            {Object.keys(STATUS_META).map(s => (
              <option key={s} value={s}>{s.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>
            ))}
          </select>
          <button onClick={fetchClaims} style={{ padding: '8px 16px', borderRadius: 9, border: 'none', background: '#7c3aed', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
            <i className="fas fa-search me-1"></i>Search
          </button>
        </div>

        {/* ── Claims Table ── */}
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 48 }}>
              <div className="spinner-border text-primary" style={{ width: 28, height: 28 }}></div>
            </div>
          ) : claims.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 56, color: '#94a3b8' }}>
              <i className="fas fa-shield-alt" style={{ fontSize: 42, marginBottom: 12, display: 'block' }}></i>
              No claims found. Create one with the button above.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {['Claim #', 'Patient', 'Scheme', 'Provider', 'Claimed', 'Approved', 'Status', 'Date', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {claims.map((c, i) => {
                    const sm = STATUS_META[c.status] || STATUS_META.draft;
                    return (
                      <tr key={c.id} style={{ borderTop: '1px solid #f1f5f9', background: i % 2 ? '#fafafa' : '#fff' }}>
                        <td style={{ padding: '10px 14px', fontSize: 12, fontWeight: 700, color: '#7c3aed', cursor: 'pointer' }}
                          onClick={() => setSelected(c)}>{c.claim_number}</td>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: '#0f172a' }}>
                          <div>{c.patient_name}</div>
                          <div style={{ fontSize: 10, color: '#94a3b8' }}>{c.patient_code}</div>
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: '#ede9fe', color: '#7c3aed' }}>
                            {SCHEME_LABELS[c.scheme] || c.scheme}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: '#374151' }}>{c.provider_name}</td>
                        <td style={{ padding: '10px 14px', fontSize: 12, fontWeight: 700 }}>{fmt(c.claim_amount)}</td>
                        <td style={{ padding: '10px 14px', fontSize: 12, color: c.approved_amount > 0 ? '#16a34a' : '#94a3b8', fontWeight: c.approved_amount > 0 ? 700 : 400 }}>
                          {c.approved_amount > 0 ? fmt(c.approved_amount) : '—'}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 20, background: sm.bg, color: sm.color }}>
                            <i className={`${sm.icon} me-1`} style={{ fontSize: 9 }}></i>
                            {c.status_display}
                          </span>
                        </td>
                        <td style={{ padding: '10px 14px', fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap' }}>
                          {new Date(c.created_at).toLocaleDateString()}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {c.status === 'draft' && (
                              <button onClick={() => handleSubmitClaim(c.id)}
                                style={{ fontSize: 11, padding: '4px 10px', borderRadius: 7, border: 'none', background: '#1d4ed8', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                                Submit
                              </button>
                            )}
                            {isAdmin && !['draft', 'paid', 'closed'].includes(c.status) && (
                              <button onClick={() => { setStatusModal({ claim: c, newStatus: 'approved' }); setApprovedAmt(c.claim_amount); }}
                                style={{ fontSize: 11, padding: '4px 10px', borderRadius: 7, border: 'none', background: '#15803d', color: '#fff', fontWeight: 700, cursor: 'pointer' }}>
                                Update
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ── New Claim Modal ── */}
        {showForm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ background: '#fff', borderRadius: 18, padding: 28, width: '100%', maxWidth: 540, boxShadow: '0 20px 60px rgba(0,0,0,0.25)', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h5 style={{ fontWeight: 800, fontSize: 17, margin: 0 }}>New Insurance Claim</h5>
                <button onClick={() => setShowForm(false)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94a3b8' }}>×</button>
              </div>
              <form onSubmit={handleSubmitForm}>
                {[
                  { label: 'Patient', key: 'patient', type: 'select', options: patients.map(p => ({ value: p.id, label: `${p.full_name} (${p.patient_id})` })) },
                  { label: 'Linked Invoice (optional)', key: 'invoice', type: 'select', options: [{ value: '', label: '— None —' }, ...invoices.map(i => ({ value: i.id, label: `${i.invoice_number} — ${i.patient_name}` }))] },
                  { label: 'Hospital ID', key: 'hospital', type: 'text', placeholder: 'Hospital ID' },
                  { label: 'Scheme', key: 'scheme', type: 'select', options: [
                    { value: 'nhia', label: 'NHIA' }, { value: 'slesha', label: 'SLeSHA' },
                    { value: 'employer', label: 'Employer / Occupational' }, { value: 'private', label: 'Private Insurance' }, { value: 'other', label: 'Other' },
                  ]},
                  { label: 'Provider Name', key: 'provider_name', type: 'text', placeholder: 'e.g. National Health Insurance Authority' },
                  { label: 'Member / Policy #', key: 'member_id', type: 'text', placeholder: 'Patient member ID' },
                  { label: 'Claim Amount (Le)', key: 'claim_amount', type: 'number', placeholder: '0.00' },
                  { label: 'Notes', key: 'notes', type: 'textarea' },
                ].map(({ label, key, type, placeholder, options }) => (
                  <div key={key} style={{ marginBottom: 14 }}>
                    <label style={{ display: 'block', fontSize: 12, fontWeight: 700, color: '#374151', marginBottom: 5 }}>{label}</label>
                    {type === 'select' ? (
                      <select value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '1px solid #e2e8f0', fontSize: 13 }}>
                        {options.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                      </select>
                    ) : type === 'textarea' ? (
                      <textarea value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} rows={3} placeholder={placeholder}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '1px solid #e2e8f0', fontSize: 13, resize: 'vertical' }} />
                    ) : (
                      <input type={type} value={form[key]} onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))} placeholder={placeholder}
                        style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '1px solid #e2e8f0', fontSize: 13 }} />
                    )}
                  </div>
                ))}
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 20 }}>
                  <button type="button" onClick={() => setShowForm(false)}
                    style={{ padding: '9px 20px', borderRadius: 9, border: '1px solid #e2e8f0', background: '#fff', color: '#374151', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={saving}
                    style={{ padding: '9px 20px', borderRadius: 9, border: 'none', background: '#7c3aed', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                    {saving ? 'Creating…' : 'Create Claim'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Status Update Modal ── */}
        {statusModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ background: '#fff', borderRadius: 18, padding: 28, width: '100%', maxWidth: 460, boxShadow: '0 20px 60px rgba(0,0,0,0.25)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <h5 style={{ fontWeight: 800, fontSize: 16, margin: 0 }}>Update Claim Status</h5>
                <button onClick={() => setStatusModal(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94a3b8' }}>×</button>
              </div>
              <p style={{ fontSize: 13, color: '#64748b', marginBottom: 14 }}>
                Claim: <strong>{statusModal.claim.claim_number}</strong> — {statusModal.claim.patient_name}
              </p>
              <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 5 }}>New Status</label>
              <select value={statusModal.newStatus} onChange={e => setStatusModal(m => ({ ...m, newStatus: e.target.value }))}
                style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '1px solid #e2e8f0', fontSize: 13, marginBottom: 14 }}>
                {Object.keys(STATUS_META).map(s => (
                  <option key={s} value={s}>{s.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>
                ))}
              </select>
              {statusModal.newStatus === 'approved' && (
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 5 }}>Approved Amount (Le)</label>
                  <input type="number" value={approvedAmt} onChange={e => setApprovedAmt(e.target.value)}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '1px solid #e2e8f0', fontSize: 13 }} />
                </div>
              )}
              {statusModal.newStatus === 'rejected' && (
                <div style={{ marginBottom: 14 }}>
                  <label style={{ display: 'block', fontSize: 12, fontWeight: 700, marginBottom: 5 }}>Rejection Reason</label>
                  <textarea value={rejectReason} onChange={e => setRejectReason(e.target.value)} rows={3}
                    style={{ width: '100%', padding: '9px 12px', borderRadius: 9, border: '1px solid #e2e8f0', fontSize: 13, resize: 'vertical' }} />
                </div>
              )}
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', marginTop: 18 }}>
                <button onClick={() => setStatusModal(null)}
                  style={{ padding: '9px 20px', borderRadius: 9, border: '1px solid #e2e8f0', background: '#fff', color: '#374151', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button onClick={handleUpdateStatus}
                  style={{ padding: '9px 20px', borderRadius: 9, border: 'none', background: '#7c3aed', color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                  Update Status
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Detail Drawer ── */}
        {selected && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)', zIndex: 999, display: 'flex', justifyContent: 'flex-end' }}
            onClick={() => setSelected(null)}>
            <div style={{ background: '#fff', width: 380, maxWidth: '90vw', height: '100%', overflowY: 'auto', padding: 28, boxShadow: '-4px 0 30px rgba(0,0,0,0.15)' }}
              onClick={e => e.stopPropagation()}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h5 style={{ fontWeight: 800, fontSize: 16, margin: 0 }}>Claim Detail</h5>
                <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#94a3b8' }}>×</button>
              </div>
              {(() => {
                const sm = STATUS_META[selected.status] || STATUS_META.draft;
                return (
                  <>
                    <div style={{ textAlign: 'center', marginBottom: 22 }}>
                      <div style={{ fontSize: 18, fontWeight: 800, color: '#7c3aed', marginBottom: 4 }}>{selected.claim_number}</div>
                      <span style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, background: sm.bg, color: sm.color, fontWeight: 700 }}>
                        <i className={`${sm.icon} me-1`} style={{ fontSize: 10 }}></i>{selected.status_display}
                      </span>
                    </div>
                    {[
                      ['Patient',         selected.patient_name],
                      ['Patient ID',      selected.patient_code],
                      ['Scheme',          SCHEME_LABELS[selected.scheme] || selected.scheme],
                      ['Provider',        selected.provider_name],
                      ['Member / Policy', selected.member_id || '—'],
                      ['Invoice',         selected.invoice_number || '—'],
                      ['Claimed Amount',  fmt(selected.claim_amount)],
                      ['Approved Amount', selected.approved_amount > 0 ? fmt(selected.approved_amount) : '—'],
                      ['Submitted At',    selected.submitted_at ? new Date(selected.submitted_at).toLocaleString() : '—'],
                      ['Created By',      selected.created_by_name || '—'],
                      ['Created At',      new Date(selected.created_at).toLocaleString()],
                    ].map(([label, value]) => (
                      <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: '1px solid #f1f5f9' }}>
                        <span style={{ fontSize: 12, color: '#64748b', fontWeight: 600 }}>{label}</span>
                        <span style={{ fontSize: 12, color: '#0f172a', fontWeight: 700, textAlign: 'right', maxWidth: '55%' }}>{value}</span>
                      </div>
                    ))}
                    {selected.notes && (
                      <div style={{ marginTop: 14 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>Notes</div>
                        <div style={{ fontSize: 12, color: '#374151', background: '#f8fafc', borderRadius: 9, padding: '10px 12px' }}>{selected.notes}</div>
                      </div>
                    )}
                    {selected.rejection_reason && (
                      <div style={{ marginTop: 14 }}>
                        <div style={{ fontSize: 12, fontWeight: 700, color: '#b91c1c', marginBottom: 4 }}>Rejection Reason</div>
                        <div style={{ fontSize: 12, color: '#374151', background: '#fee2e2', borderRadius: 9, padding: '10px 12px' }}>{selected.rejection_reason}</div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}

import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layout/DashboardLayout';
import showToast from '../../utils/toast';
import { getNavForUser, getBrandForUser, getRoleBadge } from '../../utils/navItems';

const LEAVE_TYPES = [
  { value: 'annual',    label: 'Annual Leave' },
  { value: 'sick',      label: 'Sick Leave' },
  { value: 'maternity', label: 'Maternity Leave' },
  { value: 'paternity', label: 'Paternity Leave' },
  { value: 'emergency', label: 'Emergency Leave' },
  { value: 'unpaid',    label: 'Unpaid Leave' },
  { value: 'other',     label: 'Other' },
];

const STATUS_STYLE = {
  pending:   { bg: '#fef9c3', color: '#a16207', label: 'Pending'   },
  approved:  { bg: '#dcfce7', color: '#15803d', label: 'Approved'  },
  rejected:  { bg: '#fee2e2', color: '#b91c1c', label: 'Rejected'  },
  cancelled: { bg: '#f1f5f9', color: '#475569', label: 'Cancelled' },
};

const EMPTY_FORM = { leave_type: 'annual', start_date: '', end_date: '', reason: '' };

export default function LeaveManagement() {
  const { apiCall, user } = useAuth();
  const navItems  = getNavForUser(user);
  const brand     = getBrandForUser(user);
  const roleBadge = getRoleBadge(user);

  const isAdmin = user?.role && ['admin', 'ministry_admin', 'hospital_admin', 'district_admin'].includes(user.role);

  const [leaves, setLeaves]         = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState('');
  const [statusFilter, setStatus]   = useState('all');
  const [showForm, setShowForm]     = useState(false);
  const [form, setForm]             = useState(EMPTY_FORM);
  const [saving, setSaving]         = useState(false);
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');

  const fetchLeaves = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const params = statusFilter !== 'all' ? `?status=${statusFilter}` : '';
      const res = await apiCall(`/staff/leave/${params}`);
      if (res.ok) setLeaves(await res.json());
      else setError('Failed to load leave requests.');
    } catch { setError('Network error.'); }
    setLoading(false);
  }, [apiCall, statusFilter]);

  useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const res = await apiCall('/staff/leave/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        showToast('Leave request submitted.', 'success');
        setShowForm(false); setForm(EMPTY_FORM);
        fetchLeaves();
      } else {
        const d = await res.json();
        showToast(d.end_date?.[0] || d.detail || 'Submission failed.', 'error');
      }
    } catch { showToast('Network error.', 'error'); }
    setSaving(false);
  };

  const handleApprove = async (id) => {
    const res = await apiCall(`/staff/leave/${id}/approve/`, { method: 'POST' });
    if (res.ok) { showToast('Leave approved.', 'success'); fetchLeaves(); }
    else showToast('Failed to approve.', 'error');
  };

  const handleReject = async () => {
    const res = await apiCall(`/staff/leave/${rejectModal}/reject/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reason: rejectReason }),
    });
    if (res.ok) { showToast('Leave rejected.', 'success'); setRejectModal(null); setRejectReason(''); fetchLeaves(); }
    else showToast('Failed to reject.', 'error');
  };

  const handleCancel = async (id) => {
    if (!window.confirm('Cancel this leave request?')) return;
    const res = await apiCall(`/staff/leave/${id}/cancel/`, { method: 'POST' });
    if (res.ok) { showToast('Request cancelled.', 'success'); fetchLeaves(); }
    else showToast('Cannot cancel this request.', 'error');
  };

  const summaryCount = (s) => leaves.filter(l => l.status === s).length;

  return (
    <DashboardLayout navItems={navItems} brandTitle={brand} roleBadge={roleBadge}>
      <div style={{ padding: '20px 16px', maxWidth: 1200, margin: '0 auto' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ fontWeight: 800, fontSize: 26, color: '#0f172a', margin: 0 }}>
              <i className="fas fa-calendar-minus me-2" style={{ color: '#7c3aed' }}></i>
              {isAdmin ? 'Staff Leave Management' : 'My Leave Requests'}
            </h2>
            <p style={{ color: '#64748b', fontSize: 13, marginTop: 4, marginBottom: 0 }}>
              {isAdmin ? 'Review and approve staff leave requests' : 'Submit and track your leave requests'}
            </p>
          </div>
          <button onClick={() => setShowForm(true)}
            style={{ padding: '9px 20px', borderRadius: 10, background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 7, boxShadow: '0 4px 14px rgba(124,58,237,0.3)' }}>
            <i className="fas fa-plus" style={{ fontSize: 11 }}></i>New Leave Request
          </button>
        </div>

        {/* ── Summary Badges ── */}
        <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
          {[
            { label: 'Pending',  status: 'pending',   color: '#a16207', bg: '#fef9c3' },
            { label: 'Approved', status: 'approved',  color: '#15803d', bg: '#dcfce7' },
            { label: 'Rejected', status: 'rejected',  color: '#b91c1c', bg: '#fee2e2' },
          ].map(s => (
            <div key={s.status} style={{ background: s.bg, color: s.color, padding: '8px 18px', borderRadius: 10, fontWeight: 700, fontSize: 13 }}>
              {summaryCount(s.status)} {s.label}
            </div>
          ))}
        </div>

        {error && <div style={{ background: '#fee2e2', color: '#dc2626', padding: '10px 16px', borderRadius: 10, fontSize: 13, marginBottom: 16 }}>{error}</div>}

        {/* ── Filters ── */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20, flexWrap: 'wrap' }}>
          {['all', 'pending', 'approved', 'rejected', 'cancelled'].map(s => (
            <button key={s} onClick={() => setStatus(s)}
              style={{ padding: '5px 14px', borderRadius: 7, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                border: `1px solid ${statusFilter === s ? '#7c3aed' : '#e2e8f0'}`,
                background: statusFilter === s ? '#7c3aed' : '#fff',
                color: statusFilter === s ? '#fff' : '#475569' }}>
              {s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        {/* ── Leave List ── */}
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: 48 }}>
              <div className="spinner-border text-primary" style={{ width: 28, height: 28 }}></div>
            </div>
          ) : leaves.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 56, color: '#94a3b8' }}>
              <i className="fas fa-calendar-times" style={{ fontSize: 40, marginBottom: 12, display: 'block' }}></i>
              No leave requests found.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {(isAdmin ? ['Staff', 'Type', 'Dates', 'Days', 'Reason', 'Status', 'Actions'] : ['Type', 'Dates', 'Days', 'Reason', 'Status', 'Actions']).map(h => (
                      <th key={h} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leaves.map((l, i) => {
                    const st = STATUS_STYLE[l.status] || STATUS_STYLE.pending;
                    return (
                      <tr key={l.id} style={{ borderTop: '1px solid #f1f5f9', background: i % 2 ? '#fafafa' : '#fff' }}>
                        {isAdmin && (
                          <td style={{ padding: '12px 16px' }}>
                            <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>{l.staff_name}</div>
                            <div style={{ fontSize: 11, color: '#94a3b8' }}>{l.staff_role || ''}</div>
                          </td>
                        )}
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontSize: 12, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: '#ede9fe', color: '#7c3aed' }}>
                            {l.leave_type_display}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 12, color: '#374151', whiteSpace: 'nowrap' }}>
                          {l.start_date} → {l.end_date}
                        </td>
                        <td style={{ padding: '12px 16px', fontSize: 13, fontWeight: 700, color: '#0f172a' }}>{l.days}d</td>
                        <td style={{ padding: '12px 16px', maxWidth: 200 }}>
                          <div style={{ fontSize: 12, color: '#475569', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {l.reason || '—'}
                          </div>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <span style={{ fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20, background: st.bg, color: st.color }}>
                            {st.label}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <div style={{ display: 'flex', gap: 6 }}>
                            {isAdmin && l.status === 'pending' && (
                              <>
                                <button onClick={() => handleApprove(l.id)}
                                  style={{ padding: '4px 10px', borderRadius: 7, fontSize: 11, fontWeight: 700, background: '#dcfce7', color: '#15803d', border: 'none', cursor: 'pointer' }}>
                                  <i className="fas fa-check me-1"></i>Approve
                                </button>
                                <button onClick={() => { setRejectModal(l.id); setRejectReason(''); }}
                                  style={{ padding: '4px 10px', borderRadius: 7, fontSize: 11, fontWeight: 700, background: '#fee2e2', color: '#b91c1c', border: 'none', cursor: 'pointer' }}>
                                  <i className="fas fa-times me-1"></i>Reject
                                </button>
                              </>
                            )}
                            {!isAdmin && l.status === 'pending' && (
                              <button onClick={() => handleCancel(l.id)}
                                style={{ padding: '4px 10px', borderRadius: 7, fontSize: 11, fontWeight: 700, background: '#f1f5f9', color: '#475569', border: 'none', cursor: 'pointer' }}>
                                Cancel
                              </button>
                            )}
                            {l.rejection_reason && (
                              <span title={`Rejection reason: ${l.rejection_reason}`} style={{ color: '#94a3b8', cursor: 'help' }}>
                                <i className="fas fa-info-circle"></i>
                              </span>
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

        {/* ── New Leave Request Modal ── */}
        {showForm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.2)', padding: '28px 28px 24px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <h5 style={{ fontWeight: 800, fontSize: 17, color: '#0f172a', margin: 0 }}>New Leave Request</h5>
                <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }} style={{ background: 'none', border: 'none', fontSize: 20, color: '#94a3b8', cursor: 'pointer' }}>×</button>
              </div>
              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: 14 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 5 }}>Leave Type</label>
                  <select value={form.leave_type} onChange={e => setForm(f => ({ ...f, leave_type: e.target.value }))}
                    className="form-select" style={{ fontSize: 13 }} required>
                    {LEAVE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 5 }}>Start Date</label>
                    <input type="date" className="form-control" style={{ fontSize: 13 }} required
                      value={form.start_date} onChange={e => setForm(f => ({ ...f, start_date: e.target.value }))} />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 5 }}>End Date</label>
                    <input type="date" className="form-control" style={{ fontSize: 13 }} required
                      value={form.end_date} onChange={e => setForm(f => ({ ...f, end_date: e.target.value }))}
                      min={form.start_date} />
                  </div>
                </div>
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 5 }}>Reason <span style={{ fontWeight: 400, color: '#94a3b8' }}>(optional)</span></label>
                  <textarea className="form-control" rows={3} style={{ fontSize: 13, resize: 'none' }}
                    value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))}
                    placeholder="Brief description of reason for leave..." />
                </div>
                <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                  <button type="button" onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}
                    style={{ padding: '9px 18px', borderRadius: 9, border: '1px solid #e2e8f0', background: '#fff', color: '#374151', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                    Cancel
                  </button>
                  <button type="submit" disabled={saving}
                    style={{ padding: '9px 22px', borderRadius: 9, background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer', opacity: saving ? 0.7 : 1 }}>
                    {saving ? <><span className="spinner-border spinner-border-sm me-2"></span>Submitting…</> : 'Submit Request'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ── Reject Reason Modal ── */}
        {rejectModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
            <div style={{ background: '#fff', borderRadius: 18, width: '100%', maxWidth: 400, padding: '24px' }}>
              <h5 style={{ fontWeight: 800, fontSize: 16, color: '#0f172a', marginBottom: 14 }}>Reject Leave Request</h5>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>Reason for rejection <span style={{ fontWeight: 400, color: '#94a3b8' }}>(optional)</span></label>
              <textarea className="form-control" rows={3} style={{ fontSize: 13, resize: 'none', marginBottom: 18 }}
                value={rejectReason} onChange={e => setRejectReason(e.target.value)}
                placeholder="e.g. Insufficient notice period..." />
              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button onClick={() => setRejectModal(null)}
                  style={{ padding: '8px 16px', borderRadius: 9, border: '1px solid #e2e8f0', background: '#fff', color: '#374151', fontWeight: 600, fontSize: 13, cursor: 'pointer' }}>
                  Cancel
                </button>
                <button onClick={handleReject}
                  style={{ padding: '8px 18px', borderRadius: 9, background: '#dc2626', color: '#fff', border: 'none', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                  Confirm Rejection
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}

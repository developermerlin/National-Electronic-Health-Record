import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layout/DashboardLayout';
import { getNavForUser, getBrandForUser, getRoleBadge } from '../../utils/navItems';

const ACCENT = '#8b5cf6';

function StatCard({ icon, label, value, accent, subtitle }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: '18px 20px', boxShadow: '0 2px 8px rgba(15,23,42,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: 11, background: accent + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <i className={icon} style={{ color: accent, fontSize: 18 }}></i>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{value}</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginTop: 4 }}>{label}</div>
          {subtitle && <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 2 }}>{subtitle}</div>}
        </div>
      </div>
    </div>
  );
}

function SubmitClaimModal({ show, onClose, onSuccess }) {
  const { apiCall } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    invoice_id: '',
    claim_amount: '',
    diagnosis_codes: '',
    procedure_codes: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiCall('/nhia/submit-claim/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          diagnosis_codes: formData.diagnosis_codes.split(',').map(c => c.trim()).filter(Boolean),
          procedure_codes: formData.procedure_codes.split(',').map(c => c.trim()).filter(Boolean)
        })
      });
      if (res.ok) {
        const data = await res.json();
        alert(`✅ Claim submitted successfully!\nReference: ${data.claim_reference}`);
        onSuccess();
        onClose();
        setFormData({ invoice_id: '', claim_amount: '', diagnosis_codes: '', procedure_codes: '' });
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to submit claim');
      }
    } catch {
      alert('Error submitting claim');
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '24px', width: '90%', maxWidth: 500 }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 20px', color: '#0f172a' }}>Submit NHIA Claim</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>Invoice ID</label>
            <input type="number" required value={formData.invoice_id} onChange={e => setFormData({...formData, invoice_id: e.target.value})}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>Claim Amount (SLL)</label>
            <input type="number" step="0.01" required value={formData.claim_amount} onChange={e => setFormData({...formData, claim_amount: e.target.value})}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>Diagnosis Codes (comma-separated)</label>
            <input type="text" value={formData.diagnosis_codes} onChange={e => setFormData({...formData, diagnosis_codes: e.target.value})}
              placeholder="e.g., A09, J18.9"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>Procedure Codes (comma-separated)</label>
            <input type="text" value={formData.procedure_codes} onChange={e => setFormData({...formData, procedure_codes: e.target.value})}
              placeholder="e.g., 99213, 80053"
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button type="button" onClick={onClose}
              style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#fff', color: '#475569', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              Cancel
            </button>
            <button type="submit" disabled={loading}
              style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: ACCENT, color: '#fff', fontWeight: 700, fontSize: 13, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Submitting...' : 'Submit Claim'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function NHIAClaimsDashboard() {
  const { apiCall, user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiCall('/nhia/dashboard/');
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [apiCall]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleCheckStatus = async (claimId) => {
    try {
      const res = await apiCall(`/nhia/claim/${claimId}/status/`);
      if (res.ok) {
        const claimData = await res.json();
        alert(`Claim Status: ${claimData.status}\nClaim Amount: SLL ${claimData.claim_amount}\nApproved: SLL ${claimData.approved_amount}\n\nNHIA Status: ${claimData.nhia_status.status}\nRemarks: ${claimData.nhia_status.remarks}`);
        fetchData();
      }
    } catch {
      alert('Error checking claim status');
    }
  };

  const statusStyle = (status) => {
    const styles = {
      submitted: { bg: '#dbeafe', color: '#1e40af', text: 'Submitted' },
      under_review: { bg: '#fef3c7', color: '#92400e', text: 'Under Review' },
      approved: { bg: '#d1fae5', color: '#065f46', text: 'Approved' },
      rejected: { bg: '#fee2e2', color: '#991b1b', text: 'Rejected' },
      paid: { bg: '#e0e7ff', color: '#3730a3', text: 'Paid' },
    };
    const s = styles[status] || { bg: '#f1f5f9', color: '#475569', text: status };
    return { background: s.bg, color: s.color, padding: '4px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700, display: 'inline-block', text: s.text };
  };

  return (
    <DashboardLayout navItems={getNavForUser(user)} brandTitle={getBrandForUser(user)} roleBadge={getRoleBadge(user)}>
      <div style={{ padding: '28px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: 0 }}>
              <i className="fas fa-shield-alt me-2" style={{ color: ACCENT }}></i>
              NHIA Claims Management
            </h1>
            <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 14 }}>National Health Insurance Authority integration</p>
          </div>
          <button onClick={() => setShowSubmitModal(true)}
            style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: ACCENT, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
            <i className="fas fa-plus"></i>Submit New Claim
          </button>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <div className="spinner-border" style={{ color: ACCENT, width: 48, height: 48 }} role="status"></div>
            <div style={{ marginTop: 16, fontSize: 14, color: '#64748b' }}>Loading NHIA claims data...</div>
          </div>
        ) : data ? (
          <>
            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14, marginBottom: 24 }}>
              <StatCard icon="fas fa-file-medical" label="Total Claims" value={data.stats?.total_claims || 0} accent="#8b5cf6" />
              <StatCard icon="fas fa-calendar-alt" label="This Month" value={data.stats?.claims_this_month || 0} accent="#4361ee" />
              <StatCard icon="fas fa-money-bill-wave" label="Total Claimed" value={`SLL ${(data.stats?.total_claimed || 0).toLocaleString()}`} accent="#10b981" subtitle="Amount submitted" />
              <StatCard icon="fas fa-check-circle" label="Total Approved" value={`SLL ${(data.stats?.total_approved || 0).toLocaleString()}`} accent="#f59e0b" subtitle={`${data.stats?.approval_rate || 0}% approval rate`} />
            </div>

            {/* Status Breakdown */}
            <div style={{ background: '#fff', borderRadius: 14, padding: '20px 24px', boxShadow: '0 2px 8px rgba(15,23,42,0.06)', marginBottom: 24 }}>
              <h5 style={{ fontWeight: 800, fontSize: 15, margin: '0 0 16px', color: '#0f172a' }}>Claims by Status</h5>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
                {Object.entries(data.status_breakdown || {}).map(([status, count]) => (
                  <div key={status} style={{ padding: '12px', background: '#f8fafc', borderRadius: 10, textAlign: 'center' }}>
                    <div style={{ fontSize: 20, fontWeight: 800, color: '#0f172a' }}>{count}</div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'capitalize', marginTop: 4 }}>
                      {status.replace('_', ' ')}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Recent Claims */}
            <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 8px rgba(15,23,42,0.06)', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', background: '#faf5ff' }}>
                <h5 style={{ fontWeight: 800, fontSize: 15, margin: 0, color: '#8b5cf6' }}>
                  <i className="fas fa-list me-2"></i>Recent Claims
                </h5>
              </div>
              <div style={{ overflowX: 'auto' }}>
                {data.recent_claims?.length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Claim #</th>
                        <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Patient</th>
                        <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Invoice</th>
                        <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Claimed</th>
                        <th style={{ padding: '10px 14px', textAlign: 'right', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Approved</th>
                        <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Status</th>
                        <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Submitted</th>
                        <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recent_claims.map((claim, i) => (
                        <tr key={claim.id} style={{ borderTop: '1px solid #f1f5f9', background: i % 2 ? '#fafafa' : '#fff' }}>
                          <td style={{ padding: '12px 14px', fontSize: 12, fontWeight: 700, color: ACCENT, fontFamily: 'monospace' }}>
                            {claim.claim_number}
                          </td>
                          <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                            {claim.patient_name}
                          </td>
                          <td style={{ padding: '12px 14px', fontSize: 12, color: '#64748b', fontFamily: 'monospace' }}>
                            {claim.invoice_number || 'N/A'}
                          </td>
                          <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700, color: '#0f172a', textAlign: 'right' }}>
                            SLL {claim.claim_amount.toLocaleString()}
                          </td>
                          <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 700, color: '#10b981', textAlign: 'right' }}>
                            SLL {claim.approved_amount.toLocaleString()}
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <span style={statusStyle(claim.status)}>{statusStyle(claim.status).text}</span>
                          </td>
                          <td style={{ padding: '12px 14px', fontSize: 12, color: '#64748b' }}>
                            {claim.submitted_at ? new Date(claim.submitted_at).toLocaleDateString() : 'N/A'}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            <button onClick={() => handleCheckStatus(claim.id)}
                              style={{ padding: '6px 12px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', color: '#475569', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>
                              <i className="fas fa-sync-alt me-1"></i>Check Status
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>
                    <i className="fas fa-file-medical" style={{ fontSize: 48, marginBottom: 12, display: 'block' }}></i>
                    No claims submitted yet
                  </div>
                )}
              </div>
            </div>
          </>
        ) : null}

        <SubmitClaimModal show={showSubmitModal} onClose={() => setShowSubmitModal(false)} onSuccess={fetchData} />

      </div>
    </DashboardLayout>
  );
}

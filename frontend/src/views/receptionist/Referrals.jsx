import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layout/DashboardLayout';
import { getNavForUser, getBrandForUser, getRoleBadge } from '../../utils/navItems';

const STATUS_COLORS = {
  registered:   { bg: '#dbeafe', color: '#1d4ed8' },
  in_progress:  { bg: '#fef9c3', color: '#a16207' },
  completed:    { bg: '#dcfce7', color: '#15803d' },
  cancelled:    { bg: '#fee2e2', color: '#b91c1c' },
  referred_out: { bg: '#ede9fe', color: '#7c3aed' },
};

function badge(label, bg, color) {
  return (
    <span style={{ padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 700,
      background: bg, color, whiteSpace: 'nowrap' }}>
      {label}
    </span>
  );
}

export default function Referrals() {
  const { apiCall, user } = useAuth();
  const navigate = useNavigate();

  const [tab, setTab]         = useState('outgoing'); // 'outgoing' | 'incoming'
  const [items, setItems]     = useState([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch]   = useState('');

  const navItems  = getNavForUser(user);
  const brand     = getBrandForUser(user);
  const roleBadge = getRoleBadge(user);

  const fetchReferrals = useCallback(async (direction) => {
    setLoading(true);
    setItems([]);
    try {
      const url = direction === 'incoming'
        ? '/visits/?direction=incoming'
        : '/visits/?visit_type=referral';
      const res = await apiCall(url);
      if (res.ok) {
        const data = await res.json();
        setItems(Array.isArray(data) ? data : data.results || []);
      }
    } catch { /* ignore */ } finally {
      setLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchReferrals(tab);
  }, [tab, fetchReferrals]);

  const filtered = items.filter(r => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      (r.patient_name || '').toLowerCase().includes(q) ||
      (r.patient_id_code || '').toLowerCase().includes(q) ||
      (r.referred_to_hospital_name || '').toLowerCase().includes(q) ||
      (r.hospital_name || '').toLowerCase().includes(q) ||
      (r.chief_complaint || '').toLowerCase().includes(q)
    );
  });

  const tabStyle = (key) => ({
    padding: '10px 24px',
    fontWeight: 700,
    fontSize: 14,
    border: 'none',
    borderBottom: tab === key ? '3px solid #4361ee' : '3px solid transparent',
    background: 'transparent',
    color: tab === key ? '#4361ee' : '#64748b',
    cursor: 'pointer',
    transition: 'all 0.15s',
  });

  return (
    <DashboardLayout navItems={navItems} brandTitle={brand} roleBadge={roleBadge}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '24px 16px' }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h2 style={{ fontWeight: 800, fontSize: 26, color: '#0f172a', margin: 0 }}>
            <i className="fas fa-share-square me-2" style={{ color: '#7c3aed' }}></i>
            Referral Cases
          </h2>
          <p style={{ color: '#64748b', fontSize: 14, marginTop: 4 }}>
            Track outgoing referrals you have sent and incoming referrals from other hospitals.
          </p>
        </div>

        {/* Card */}
        <div style={{ background: '#fff', borderRadius: 16, boxShadow: '0 2px 16px rgba(0,0,0,0.07)', overflow: 'hidden' }}>

          {/* Tab bar + Search */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            borderBottom: '1px solid #e9ecef', padding: '0 24px', flexWrap: 'wrap', gap: 8 }}>
            <div style={{ display: 'flex' }}>
              <button style={tabStyle('outgoing')} onClick={() => setTab('outgoing')}>
                <i className="fas fa-arrow-right me-2"></i>Outgoing Referrals
              </button>
              <button style={tabStyle('incoming')} onClick={() => setTab('incoming')}>
                <i className="fas fa-arrow-left me-2"></i>Incoming Referrals
              </button>
            </div>
            <div style={{ position: 'relative', minWidth: 240 }}>
              <i className="fas fa-search" style={{ position: 'absolute', left: 10, top: '50%',
                transform: 'translateY(-50%)', color: '#94a3b8', fontSize: 13 }}></i>
              <input
                style={{ paddingLeft: 32, borderRadius: 8, border: '1px solid #e2e8f0',
                  fontSize: 13, padding: '7px 12px 7px 32px', width: '100%', outline: 'none' }}
                placeholder="Search patient, hospital, complaint..."
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
            </div>
          </div>

          {/* Info banner */}
          <div style={{ background: tab === 'incoming' ? '#f0fdf4' : '#f5f3ff',
            borderBottom: '1px solid #e9ecef', padding: '10px 24px', fontSize: 12, color: '#475569' }}>
            {tab === 'outgoing'
              ? <><i className="fas fa-info-circle me-2" style={{ color: '#7c3aed' }}></i>
                  Patients referred <strong>out</strong> from your hospital to another facility. Click a row to view the patient's full record.</>
              : <><i className="fas fa-info-circle me-2" style={{ color: '#16a34a' }}></i>
                  Patients referred <strong>in</strong> to your hospital from another facility. You have read access to their record.</>
            }
          </div>

          {/* Table */}
          {loading ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
              <span className="spinner-border text-primary mb-3" style={{ width: 36, height: 36 }}></span>
              <div style={{ fontSize: 14 }}>Loading referrals...</div>
            </div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#94a3b8' }}>
              <i className="fas fa-inbox" style={{ fontSize: 40, marginBottom: 12, display: 'block' }}></i>
              <div style={{ fontSize: 15, fontWeight: 600 }}>
                {search ? 'No referrals match your search.' : `No ${tab} referrals found.`}
              </div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e9ecef' }}>
                    {[
                      'Patient', 'Patient ID', 'Date',
                      tab === 'outgoing' ? 'Referred To' : 'Referred From',
                      'Reason / Complaint', 'Doctor', 'Status', 'Action',
                    ].map(h => (
                      <th key={h} style={{ padding: '12px 16px', textAlign: 'left',
                        fontWeight: 700, color: '#475569', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r, i) => {
                    const sc = STATUS_COLORS[r.status] || { bg: '#f1f5f9', color: '#475569' };
                    return (
                      <tr key={r.id} style={{ borderBottom: '1px solid #f1f5f9',
                        background: i % 2 === 0 ? '#fff' : '#fafafa',
                        cursor: 'pointer', transition: 'background 0.12s' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f0f4ff'}
                        onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? '#fff' : '#fafafa'}
                        onClick={() => r.patient_pk && navigate(`/receptionist/patients/${r.patient_pk}`)}
                      >
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#1e293b' }}>
                          <i className="fas fa-user-circle me-2" style={{ color: '#a5b4fc' }}></i>
                          {r.patient_name || '—'}
                        </td>
                        <td style={{ padding: '12px 16px', fontFamily: 'monospace', color: '#7c3aed', fontWeight: 700 }}>
                          {r.patient_id_code || '—'}
                        </td>
                        <td style={{ padding: '12px 16px', color: '#475569', whiteSpace: 'nowrap' }}>
                          {r.visit_date ? new Date(r.visit_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                        </td>
                        <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>
                          {tab === 'outgoing'
                            ? (r.referred_to_hospital_name || <span style={{ color: '#94a3b8' }}>—</span>)
                            : (r.hospital_name || <span style={{ color: '#94a3b8' }}>—</span>)
                          }
                        </td>
                        <td style={{ padding: '12px 16px', maxWidth: 220, color: '#334155' }}>
                          <span style={{ display: '-webkit-box', WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                            {r.chief_complaint || '—'}
                          </span>
                        </td>
                        <td style={{ padding: '12px 16px', color: '#475569' }}>
                          {r.referred_to_doctor || r.doctor_name || <span style={{ color: '#94a3b8' }}>—</span>}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          {badge(r.status_display || r.status, sc.bg, sc.color)}
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                          <button className="btn btn-sm"
                            style={{ background: '#ede9fe', color: '#7c3aed', fontWeight: 600,
                              fontSize: 12, border: 'none', borderRadius: 6 }}
                            onClick={e => { e.stopPropagation(); r.patient_pk && navigate(`/receptionist/patients/${r.patient_pk}`); }}>
                            <i className="fas fa-eye me-1"></i>View
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Footer count */}
          {!loading && filtered.length > 0 && (
            <div style={{ padding: '12px 24px', borderTop: '1px solid #f1f5f9',
              fontSize: 12, color: '#94a3b8', textAlign: 'right' }}>
              Showing {filtered.length} referral{filtered.length !== 1 ? 's' : ''}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}

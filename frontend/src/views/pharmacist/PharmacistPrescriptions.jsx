import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layout/DashboardLayout';
import { getNavForUser, getBrandForUser, getRoleBadge } from '../../utils/navItems';

const ACCENT = '#8b5cf6';

function ViewModal({ note, onClose }) {
  if (!note) return null;
  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.55)',
      backdropFilter: 'blur(3px)', zIndex: 9999,
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 18, width: '100%', maxWidth: 640,
        maxHeight: '88vh', overflowY: 'auto', boxShadow: '0 24px 60px rgba(15,23,42,0.2)',
      }}>
        <div style={{ padding: '18px 24px', borderBottom: '1px solid #f1f5f9',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ fontWeight: 800, fontSize: 16, color: '#0f172a' }}>Prescription Record</div>
          <button onClick={onClose} style={{ border: 'none', background: 'none', fontSize: 20, color: '#94a3b8', cursor: 'pointer' }}>×</button>
        </div>
        <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>Patient</div>
              <div style={{ fontWeight: 800, color: '#0f172a' }}>{note.patient_name}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{note.patient_code}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>Gender: {note.patient_gender || '—'}</div>
            </div>
            <div style={{ background: '#f8fafc', borderRadius: 10, padding: '12px 14px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>Doctor</div>
              <div style={{ fontWeight: 700, color: '#0f172a' }}>Dr. {note.doctor_name}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{new Date(note.visit_date).toLocaleDateString()}</div>
              <div style={{ fontSize: 12, color: '#64748b' }}>{note.visit_type}</div>
            </div>
          </div>
          {note.patient_allergies && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#dc2626' }}>
                <i className="fas fa-exclamation-triangle" style={{ marginRight: 6 }}></i>Allergies: {note.patient_allergies}
              </div>
            </div>
          )}
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>Diagnosis</div>
            <div style={{ fontSize: 13, color: '#334155', background: '#f8fafc', borderRadius: 8, padding: '8px 12px' }}>{note.diagnosis || '—'}</div>
          </div>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: ACCENT, textTransform: 'uppercase', marginBottom: 6 }}>Prescriptions</div>
            <pre style={{ margin: 0, fontSize: 13, color: '#1e293b', fontFamily: 'inherit', whiteSpace: 'pre-wrap',
              background: ACCENT + '08', borderRadius: 8, padding: '10px 12px', lineHeight: 1.7 }}>
              {note.prescriptions || '—'}
            </pre>
          </div>
          {note.treatment_plan && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>Treatment Plan</div>
              <div style={{ fontSize: 13, color: '#475569', background: '#f8fafc', borderRadius: 8, padding: '8px 12px' }}>{note.treatment_plan}</div>
            </div>
          )}
          {note.pharmacy_note && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', marginBottom: 6 }}>Pharmacist Notes</div>
              <div style={{ fontSize: 13, color: '#475569', background: '#f8fafc', borderRadius: 8, padding: '8px 12px' }}>{note.pharmacy_note}</div>
            </div>
          )}
          {note.is_dispensed && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, padding: '10px 14px' }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#16a34a' }}>
                <i className="fas fa-check-circle" style={{ marginRight: 6 }}></i>
                Dispensed by {note.dispensed_by} · {new Date(note.dispensed_at).toLocaleString()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PharmacistPrescriptions() {
  const { apiCall, user } = useAuth();
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [viewNote, setViewNote]           = useState(null);
  const [search, setSearch]               = useState('');
  const [statusFilter, setStatusFilter]   = useState('');
  const [dateFilter, setDateFilter]       = useState('');

  const fetchPrescriptions = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search)       params.set('search',   search);
      if (statusFilter) params.set('dispensed', statusFilter);
      if (dateFilter)   params.set('date',      dateFilter);
      const res = await apiCall(`/pharmacist/prescriptions/?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setPrescriptions(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [apiCall, search, statusFilter, dateFilter]);

  useEffect(() => { fetchPrescriptions(); }, [fetchPrescriptions]);

  const total      = prescriptions.length;
  const pending    = prescriptions.filter(p => !p.is_dispensed).length;
  const dispensed  = prescriptions.filter(p => p.is_dispensed).length;

  return (
    <DashboardLayout navItems={getNavForUser(user)} brandTitle={getBrandForUser(user)} roleBadge={getRoleBadge(user)}>
      <div style={{ padding: '28px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: 0 }}>All Prescriptions</h1>
          <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 14 }}>Full prescription history for your hospital</p>
        </div>

        {/* Mini stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }}>
          {[
            { label: 'Total',     value: total,     accent: ACCENT,    icon: 'fas fa-prescription-bottle-alt' },
            { label: 'Pending',   value: pending,   accent: '#f59e0b', icon: 'fas fa-hourglass-half' },
            { label: 'Dispensed', value: dispensed, accent: '#10b981', icon: 'fas fa-check-circle' },
          ].map(s => (
            <div key={s.label} style={{ background: '#fff', borderRadius: 14, padding: '16px 20px',
              boxShadow: '0 2px 8px rgba(15,23,42,0.06)', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ width: 40, height: 40, borderRadius: 11, background: s.accent + '15',
                display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <i className={s.icon} style={{ color: s.accent, fontSize: 16 }}></i>
              </div>
              <div>
                <div style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginTop: 2 }}>{s.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{ background: '#fff', borderRadius: 14, padding: '14px 18px', marginBottom: 16,
          boxShadow: '0 2px 8px rgba(15,23,42,0.06)', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ flex: '2 1 220px', position: 'relative' }}>
            <i className="fas fa-search" style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)',
              color: '#94a3b8', fontSize: 13, pointerEvents: 'none' }}></i>
            <input type="text" placeholder="Search patient name or ID..."
              value={search} onChange={e => setSearch(e.target.value)}
              style={{ width: '100%', padding: '9px 12px 9px 34px', borderRadius: 10,
                border: '1px solid #e2e8f0', fontSize: 13, outline: 'none', background: '#f8fafc',
                color: '#0f172a', boxSizing: 'border-box' }}
              onFocus={e => e.target.style.borderColor = ACCENT}
              onBlur={e => e.target.style.borderColor = '#e2e8f0'}
            />
          </div>
          <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)}
            style={{ flex: '1 1 150px', padding: '9px 12px', borderRadius: 10,
              border: '1px solid #e2e8f0', fontSize: 13, background: '#f8fafc', outline: 'none', cursor: 'pointer' }}>
            <option value="">All Statuses</option>
            <option value="false">Pending</option>
            <option value="true">Dispensed</option>
          </select>
          <input type="date" value={dateFilter} onChange={e => setDateFilter(e.target.value)}
            style={{ flex: '1 1 150px', padding: '9px 12px', borderRadius: 10,
              border: '1px solid #e2e8f0', fontSize: 13, background: '#f8fafc', outline: 'none', cursor: 'pointer' }}
          />
          <button onClick={() => { setSearch(''); setStatusFilter(''); setDateFilter(''); }}
            style={{ padding: '9px 16px', borderRadius: 10, border: '1px solid #e2e8f0',
              background: '#fff', color: '#64748b', fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap' }}>
            <i className="fas fa-times" style={{ marginRight: 6, fontSize: 11 }}></i>Clear
          </button>
        </div>

        {/* Table */}
        <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 8px rgba(15,23,42,0.06)', overflow: 'hidden' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '2.2fr 1.4fr 1.8fr 1fr 1fr 80px',
            padding: '10px 20px', background: '#f8fafc', borderBottom: '1px solid #f1f5f9' }}>
            {['Patient', 'Doctor', 'Diagnosis', 'Date', 'Status', ''].map(h => (
              <div key={h} style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.8px' }}>{h}</div>
            ))}
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '50px 0' }}>
              <div className="spinner-border" style={{ color: ACCENT }} role="status"></div>
              <div style={{ marginTop: 12, fontSize: 13, color: '#94a3b8' }}>Loading...</div>
            </div>
          ) : prescriptions.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 0', color: '#94a3b8' }}>
              <i className="fas fa-prescription-bottle-alt" style={{ fontSize: 44, marginBottom: 12, display: 'block' }}></i>
              <p style={{ margin: 0, fontWeight: 600 }}>No prescriptions found.</p>
            </div>
          ) : (
            prescriptions.map((note, idx) => (
              <div key={note.note_id}
                style={{ display: 'grid', gridTemplateColumns: '2.2fr 1.4fr 1.8fr 1fr 1fr 80px',
                  padding: '13px 20px', alignItems: 'center',
                  borderBottom: idx < prescriptions.length - 1 ? '1px solid #f8fafc' : 'none',
                  transition: 'background 0.12s' }}
                onMouseEnter={e => e.currentTarget.style.background = '#fafbfc'}
                onMouseLeave={e => e.currentTarget.style.background = '#fff'}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 32, height: 32, borderRadius: '50%', background: ACCENT + '15',
                    fontSize: 11, fontWeight: 800, color: ACCENT,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    {(note.patient_name || '?').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </div>
                  <div>
                    <div style={{ fontWeight: 700, fontSize: 13, color: '#0f172a' }}>
                      {note.patient_name}
                      {note.patient_allergies && (
                        <span style={{ marginLeft: 6, background: '#fef2f2', color: '#dc2626',
                          fontSize: 9, fontWeight: 800, padding: '1px 5px', borderRadius: 6, textTransform: 'uppercase' }}>
                          ALLERGY
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', fontFamily: 'monospace' }}>{note.patient_code}</div>
                  </div>
                </div>
                <div style={{ fontSize: 12, color: '#64748b' }}>Dr. {note.doctor_name}</div>
                <div style={{ fontSize: 12, color: '#334155', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', paddingRight: 8 }}>
                  {note.diagnosis || '—'}
                </div>
                <div style={{ fontSize: 12, color: '#64748b' }}>{new Date(note.visit_date).toLocaleDateString('en-SL')}</div>
                <div>
                  {note.is_dispensed ? (
                    <span style={{ background: '#dcfce7', color: '#16a34a', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>Dispensed</span>
                  ) : (
                    <span style={{ background: '#fef3c7', color: '#d97706', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 }}>Pending</span>
                  )}
                </div>
                <div>
                  <button onClick={() => setViewNote(note)}
                    style={{ width: 30, height: 30, borderRadius: 8, border: '1px solid #e2e8f0',
                      background: '#fff', color: '#475569', cursor: 'pointer', fontSize: 11,
                      display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    onMouseEnter={e => { e.currentTarget.style.background = '#eff6ff'; e.currentTarget.style.color = '#0891b2'; }}
                    onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = '#475569'; }}
                    title="View">
                    <i className="fas fa-eye"></i>
                  </button>
                </div>
              </div>
            ))
          )}

          {!loading && prescriptions.length > 0 && (
            <div style={{ padding: '10px 20px', background: '#f8fafc', borderTop: '1px solid #f1f5f9' }}>
              <span style={{ fontSize: 12, color: '#94a3b8' }}>
                Showing <strong style={{ color: '#334155' }}>{prescriptions.length}</strong> prescription{prescriptions.length !== 1 ? 's' : ''}
              </span>
            </div>
          )}
        </div>
      </div>

      {viewNote && <ViewModal note={viewNote} onClose={() => setViewNote(null)} />}
    </DashboardLayout>
  );
}

export default PharmacistPrescriptions;

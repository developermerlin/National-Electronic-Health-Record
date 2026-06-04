import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../layout/DashboardLayout';
import { getNavForUser, getBrandForUser, getRoleBadge } from '../../utils/navItems';

const ACCENT = '#8b5cf6';

function StatCard({ icon, label, value, accent }) {
  return (
    <div style={{ background: '#fff', borderRadius: 14, padding: '18px 20px', boxShadow: '0 2px 8px rgba(15,23,42,0.06)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: 11, background: accent + '15', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <i className={icon} style={{ color: accent, fontSize: 18 }}></i>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', lineHeight: 1 }}>{value}</div>
          <div style={{ fontSize: 12, fontWeight: 600, color: '#64748b', marginTop: 4 }}>{label}</div>
        </div>
      </div>
    </div>
  );
}

function CreateAppointmentModal({ show, onClose, onSuccess }) {
  const { apiCall } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    patient_id: '',
    doctor_id: '',
    scheduled_at: '',
    reason: '',
    notes: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await apiCall('/telemedicine/create/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (res.ok) {
        onSuccess();
        onClose();
      } else {
        const err = await res.json();
        alert(err.error || 'Failed to create appointment');
      }
    } catch (e) {
      alert('Error creating appointment');
    } finally {
      setLoading(false);
    }
  };

  if (!show) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: '#fff', borderRadius: 16, padding: '24px', width: '90%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto' }}>
        <h3 style={{ fontSize: 18, fontWeight: 800, margin: '0 0 20px', color: '#0f172a' }}>Schedule Virtual Consultation</h3>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>Patient ID</label>
            <input type="number" required value={formData.patient_id} onChange={e => setFormData({...formData, patient_id: e.target.value})}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>Doctor ID</label>
            <input type="number" required value={formData.doctor_id} onChange={e => setFormData({...formData, doctor_id: e.target.value})}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>Scheduled Date & Time</label>
            <input type="datetime-local" required value={formData.scheduled_at} onChange={e => setFormData({...formData, scheduled_at: e.target.value})}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none', boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>Reason for Consultation</label>
            <textarea required value={formData.reason} onChange={e => setFormData({...formData, reason: e.target.value})}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none', minHeight: 80, boxSizing: 'border-box' }} />
          </div>
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>Notes (Optional)</label>
            <textarea value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})}
              style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none', minHeight: 60, boxSizing: 'border-box' }} />
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button type="button" onClick={onClose}
              style={{ flex: 1, padding: '10px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#fff', color: '#475569', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
              Cancel
            </button>
            <button type="submit" disabled={loading}
              style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', background: ACCENT, color: '#fff', fontWeight: 700, fontSize: 13, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Creating...' : 'Create Appointment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function TelemedicineDashboard() {
  const { apiCall, user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiCall('/telemedicine/dashboard/');
      if (res.ok) {
        const d = await res.json();
        setData(d);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [apiCall]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleJoinConsultation = async (appointmentId) => {
    try {
      const res = await apiCall(`/telemedicine/session/${appointmentId}/`, { method: 'POST' });
      if (res.ok) {
        const sessionData = await res.json();
        navigate(`/telemedicine/consultation/${appointmentId}`, { state: sessionData });
      } else {
        const err = await res.json();
        alert(err.error || 'Cannot join consultation yet');
      }
    } catch (e) {
      alert('Error joining consultation');
    }
  };

  const statusStyle = (status) => {
    const styles = {
      scheduled: { bg: '#dbeafe', color: '#1e40af', text: 'Scheduled' },
      confirmed: { bg: '#d1fae5', color: '#065f46', text: 'Confirmed' },
      in_progress: { bg: '#fef3c7', color: '#92400e', text: 'In Progress' },
      completed: { bg: '#e0e7ff', color: '#3730a3', text: 'Completed' },
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
              <i className="fas fa-video me-2" style={{ color: ACCENT }}></i>
              Telemedicine Dashboard
            </h1>
            <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 14 }}>Virtual consultations and remote patient care</p>
          </div>
          {user.role?.name === 'receptionist' || user.role?.name === 'hospital_admin' ? (
            <button onClick={() => setShowCreateModal(true)}
              style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: ACCENT, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
              <i className="fas fa-plus"></i>Schedule Consultation
            </button>
          ) : null}
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: 80 }}>
            <div className="spinner-border" style={{ color: ACCENT, width: 48, height: 48 }} role="status"></div>
            <div style={{ marginTop: 16, fontSize: 14, color: '#64748b' }}>Loading telemedicine data...</div>
          </div>
        ) : data ? (
          <>
            {/* Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14, marginBottom: 24 }}>
              <StatCard icon="fas fa-video" label="Total Virtual Appointments" value={data.stats?.total_virtual_appointments || 0} accent="#8b5cf6" />
              <StatCard icon="fas fa-calendar-day" label="Today's Consultations" value={data.stats?.today_virtual || 0} accent="#4361ee" />
              <StatCard icon="fas fa-play-circle" label="In Progress" value={data.stats?.in_progress || 0} accent="#10b981" />
              <StatCard icon="fas fa-clock" label="Upcoming (24h)" value={data.stats?.upcoming_24h || 0} accent="#f59e0b" />
            </div>

            {/* Upcoming Appointments */}
            <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 8px rgba(15,23,42,0.06)', overflow: 'hidden' }}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', background: '#faf5ff' }}>
                <h5 style={{ fontWeight: 800, fontSize: 15, margin: 0, color: '#8b5cf6' }}>
                  <i className="fas fa-calendar-alt me-2"></i>Upcoming Virtual Consultations
                </h5>
              </div>
              <div style={{ overflowX: 'auto' }}>
                {data.upcoming_appointments?.length > 0 ? (
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f8fafc' }}>
                        <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Patient</th>
                        <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Doctor</th>
                        <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Scheduled</th>
                        <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Reason</th>
                        <th style={{ padding: '10px 14px', textAlign: 'left', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Status</th>
                        <th style={{ padding: '10px 14px', textAlign: 'center', fontSize: 11, fontWeight: 700, color: '#64748b', textTransform: 'uppercase' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.upcoming_appointments.map((apt, i) => (
                        <tr key={apt.id} style={{ borderTop: '1px solid #f1f5f9', background: i % 2 ? '#fafafa' : '#fff' }}>
                          <td style={{ padding: '12px 14px', fontSize: 13, fontWeight: 600, color: '#0f172a' }}>
                            {apt.patient_name}
                            <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>ID: {apt.patient_id}</div>
                          </td>
                          <td style={{ padding: '12px 14px', fontSize: 13, color: '#334155' }}>{apt.doctor_name}</td>
                          <td style={{ padding: '12px 14px', fontSize: 13, color: '#334155' }}>
                            {new Date(apt.scheduled_at).toLocaleString('en-US', { 
                              month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' 
                            })}
                          </td>
                          <td style={{ padding: '12px 14px', fontSize: 12, color: '#64748b', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {apt.reason || 'N/A'}
                          </td>
                          <td style={{ padding: '12px 14px' }}>
                            <span style={statusStyle(apt.status)}>{statusStyle(apt.status).text}</span>
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            {apt.can_join ? (
                              <button onClick={() => handleJoinConsultation(apt.id)}
                                style={{ padding: '6px 14px', borderRadius: 8, border: 'none', background: '#10b981', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer' }}>
                                <i className="fas fa-video me-1"></i>Join
                              </button>
                            ) : (
                              <span style={{ fontSize: 11, color: '#94a3b8' }}>Not yet</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div style={{ padding: 60, textAlign: 'center', color: '#94a3b8' }}>
                    <i className="fas fa-video" style={{ fontSize: 48, marginBottom: 12, display: 'block' }}></i>
                    No upcoming virtual consultations
                  </div>
                )}
              </div>
            </div>
          </>
        ) : null}

        <CreateAppointmentModal show={showCreateModal} onClose={() => setShowCreateModal(false)} onSuccess={fetchData} />

      </div>
    </DashboardLayout>
  );
}

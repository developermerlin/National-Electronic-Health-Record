import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
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

export default function NotificationCenter() {
  const { apiCall, user } = useAuth();
  const [tab, setTab] = useState('dashboard'); // dashboard | bulk | custom | templates
  const [loading, setLoading] = useState(false);
  const [dashboardData, setDashboardData] = useState(null);
  const [templates, setTemplates] = useState([]);
  
  // Bulk SMS state
  const [selectedTemplate, setSelectedTemplate] = useState('');
  const [bulkContext, setBulkContext] = useState({});
  const [bulkFilters, setBulkFilters] = useState({});
  const [bulkResult, setBulkResult] = useState(null);
  
  // Custom SMS state
  const [customMessage, setCustomMessage] = useState('');
  const [customPatientIds, setCustomPatientIds] = useState('');
  const [customResult, setCustomResult] = useState(null);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiCall('/notifications/dashboard/');
      if (res.ok) {
        const data = await res.json();
        setDashboardData(data);
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }, [apiCall]);

  const fetchTemplates = useCallback(async () => {
    try {
      const res = await apiCall('/notifications/templates/');
      if (res.ok) {
        const data = await res.json();
        setTemplates(data.templates || []);
      }
    } catch (e) { console.error(e); }
  }, [apiCall]);

  useEffect(() => {
    if (tab === 'dashboard') fetchDashboard();
    if (tab === 'bulk' || tab === 'templates') fetchTemplates();
  }, [tab, fetchDashboard, fetchTemplates]);

  const handleSendBulk = async () => {
    if (!selectedTemplate) {
      alert('Please select a template');
      return;
    }
    
    setLoading(true);
    setBulkResult(null);
    try {
      const res = await apiCall('/notifications/send-bulk/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template_key: selectedTemplate,
          context: bulkContext,
          filters: bulkFilters
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        setBulkResult({ success: true, ...data });
      } else {
        const err = await res.json();
        setBulkResult({ success: false, error: err.error || 'Failed to send' });
      }
    } catch (e) {
      setBulkResult({ success: false, error: e.message });
    } finally {
      setLoading(false);
    }
  };

  const handleSendCustom = async () => {
    if (!customMessage.trim() || !customPatientIds.trim()) {
      alert('Please provide message and patient IDs');
      return;
    }
    
    const ids = customPatientIds.split(',').map(id => parseInt(id.trim())).filter(id => !isNaN(id));
    if (ids.length === 0) {
      alert('No valid patient IDs provided');
      return;
    }
    
    setLoading(true);
    setCustomResult(null);
    try {
      const res = await apiCall('/notifications/send-custom/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          patient_ids: ids,
          message: customMessage
        })
      });
      
      if (res.ok) {
        const data = await res.json();
        setCustomResult({ success: true, ...data });
        setCustomMessage('');
        setCustomPatientIds('');
      } else {
        const err = await res.json();
        setCustomResult({ success: false, error: err.error || 'Failed to send' });
      }
    } catch (e) {
      setCustomResult({ success: false, error: e.message });
    } finally {
      setLoading(false);
    }
  };

  const handleTriggerReminders = async () => {
    if (!window.confirm('Send appointment reminders for next 24 hours?')) return;
    
    setLoading(true);
    try {
      const res = await apiCall('/notifications/trigger-reminders/', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        alert(`✅ Sent ${data.sent_count} appointment reminders`);
        fetchDashboard();
      }
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const tabStyle = (key) => ({
    padding: '10px 24px',
    fontWeight: 700,
    fontSize: 14,
    border: 'none',
    borderBottom: tab === key ? `3px solid ${ACCENT}` : '3px solid transparent',
    background: 'transparent',
    color: tab === key ? ACCENT : '#64748b',
    cursor: 'pointer',
    transition: 'all 0.15s',
  });

  const templatesByCategory = templates.reduce((acc, t) => {
    if (!acc[t.category]) acc[t.category] = [];
    acc[t.category].push(t);
    return acc;
  }, {});

  return (
    <DashboardLayout navItems={getNavForUser(user)} brandTitle={getBrandForUser(user)} roleBadge={getRoleBadge(user)}>
      <div style={{ padding: '28px 24px' }}>

        {/* Header */}
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 26, fontWeight: 800, color: '#0f172a', margin: 0 }}>
            <i className="fas fa-bell me-2" style={{ color: ACCENT }}></i>
            Notification Center
          </h1>
          <p style={{ color: '#64748b', margin: '4px 0 0', fontSize: 14 }}>Manage SMS campaigns and patient notifications</p>
        </div>

        {/* Tabs */}
        <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 8px rgba(15,23,42,0.06)', marginBottom: 24, overflow: 'hidden' }}>
          <div style={{ display: 'flex', borderBottom: '1px solid #f1f5f9' }}>
            <button style={tabStyle('dashboard')} onClick={() => setTab('dashboard')}>
              <i className="fas fa-tachometer-alt me-2"></i>Dashboard
            </button>
            <button style={tabStyle('bulk')} onClick={() => setTab('bulk')}>
              <i className="fas fa-users me-2"></i>Bulk SMS
            </button>
            <button style={tabStyle('custom')} onClick={() => setTab('custom')}>
              <i className="fas fa-comment-dots me-2"></i>Custom SMS
            </button>
            <button style={tabStyle('templates')} onClick={() => setTab('templates')}>
              <i className="fas fa-file-alt me-2"></i>Templates
            </button>
          </div>
        </div>

        {/* Dashboard Tab */}
        {tab === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
            {loading ? (
              <div style={{ textAlign: 'center', padding: 60 }}>
                <div className="spinner-border" style={{ color: ACCENT }} role="status"></div>
              </div>
            ) : dashboardData ? (
              <>
                {/* Stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
                  <StatCard icon="fas fa-users" label="Total Patients" value={dashboardData.patient_stats?.total_patients || 0} accent="#8b5cf6" />
                  <StatCard icon="fas fa-mobile-alt" label="With Phone Numbers" value={dashboardData.patient_stats?.patients_with_phone || 0} accent="#10b981" />
                  <StatCard icon="fas fa-percentage" label="SMS Enabled" value={`${dashboardData.patient_stats?.sms_enabled_percentage || 0}%`} accent="#f59e0b" />
                  <StatCard icon="fas fa-calendar-alt" label="Upcoming Appointments" value={dashboardData.appointment_stats?.upcoming_7_days || 0} accent="#4361ee" />
                  <StatCard icon="fas fa-bell" label="Reminders Needed (24h)" value={dashboardData.appointment_stats?.reminders_needed_24h || 0} accent="#ef4444" />
                  <StatCard icon="fas fa-file-alt" label="Available Templates" value={dashboardData.total_templates || 0} accent="#06b6d4" />
                </div>

                {/* Quick Actions */}
                <div style={{ background: '#fff', borderRadius: 14, padding: '20px 24px', boxShadow: '0 2px 8px rgba(15,23,42,0.06)' }}>
                  <h5 style={{ fontWeight: 800, fontSize: 15, margin: '0 0 16px', color: '#0f172a' }}>Quick Actions</h5>
                  <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    <button onClick={handleTriggerReminders}
                      style={{ padding: '10px 20px', borderRadius: 10, border: 'none', background: ACCENT, color: '#fff', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <i className="fas fa-paper-plane"></i>Send Appointment Reminders
                    </button>
                    <button onClick={() => setTab('bulk')}
                      style={{ padding: '10px 20px', borderRadius: 10, border: '1.5px solid #e2e8f0', background: '#fff', color: '#475569', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}>
                      <i className="fas fa-bullhorn"></i>Send Bulk Campaign
                    </button>
                  </div>
                </div>
              </>
            ) : null}
          </div>
        )}

        {/* Bulk SMS Tab */}
        {tab === 'bulk' && (
          <div style={{ background: '#fff', borderRadius: 14, padding: '24px', boxShadow: '0 2px 8px rgba(15,23,42,0.06)' }}>
            <h5 style={{ fontWeight: 800, fontSize: 16, margin: '0 0 20px', color: '#0f172a' }}>Send Bulk SMS Campaign</h5>
            
            {/* Template Selection */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>Select Template</label>
              <select value={selectedTemplate} onChange={e => setSelectedTemplate(e.target.value)}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none' }}>
                <option value="">-- Choose a template --</option>
                {Object.entries(templatesByCategory).map(([category, temps]) => (
                  <optgroup key={category} label={category}>
                    {temps.map(t => (
                      <option key={t.key} value={t.key}>{t.key}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>

            {/* Template Preview */}
            {selectedTemplate && (
              <div style={{ marginBottom: 20, padding: '12px 16px', background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 6 }}>TEMPLATE PREVIEW</div>
                <div style={{ fontSize: 13, color: '#334155', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
                  {templates.find(t => t.key === selectedTemplate)?.template}
                </div>
              </div>
            )}

            {/* Context Variables */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>Context Variables (JSON)</label>
              <textarea value={JSON.stringify(bulkContext, null, 2)} onChange={e => {
                try { setBulkContext(JSON.parse(e.target.value)); } catch { /* Invalid JSON - ignore */ }
              }}
                placeholder='{"message": "Drink 8 glasses of water daily"}'
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none', fontFamily: 'monospace', minHeight: 80, boxSizing: 'border-box' }}
              />
            </div>

            {/* Filters */}
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>Recipient Filters (Optional)</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                <select value={bulkFilters.gender || ''} onChange={e => setBulkFilters({...bulkFilters, gender: e.target.value})}
                  style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }}>
                  <option value="">All Genders</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
                <input type="number" placeholder="Min Age" value={bulkFilters.age_min || ''} onChange={e => setBulkFilters({...bulkFilters, age_min: e.target.value})}
                  style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} />
                <input type="number" placeholder="Max Age" value={bulkFilters.age_max || ''} onChange={e => setBulkFilters({...bulkFilters, age_max: e.target.value})}
                  style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #e2e8f0', fontSize: 13 }} />
              </div>
            </div>

            {/* Send Button */}
            <button onClick={handleSendBulk} disabled={loading || !selectedTemplate}
              style={{ padding: '12px 24px', borderRadius: 10, border: 'none', background: ACCENT, color: '#fff', fontWeight: 700, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Sending...' : 'Send Bulk SMS'}
            </button>

            {/* Result */}
            {bulkResult && (
              <div style={{ marginTop: 20, padding: '14px 18px', borderRadius: 10, background: bulkResult.success ? '#f0fdf4' : '#fef2f2', border: `1px solid ${bulkResult.success ? '#bbf7d0' : '#fecaca'}` }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: bulkResult.success ? '#15803d' : '#dc2626', marginBottom: 4 }}>
                  {bulkResult.success ? '✅ Success' : '❌ Error'}
                </div>
                <div style={{ fontSize: 13, color: bulkResult.success ? '#166534' : '#991b1b' }}>
                  {bulkResult.success ? bulkResult.message : bulkResult.error}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Custom SMS Tab */}
        {tab === 'custom' && (
          <div style={{ background: '#fff', borderRadius: 14, padding: '24px', boxShadow: '0 2px 8px rgba(15,23,42,0.06)' }}>
            <h5 style={{ fontWeight: 800, fontSize: 16, margin: '0 0 20px', color: '#0f172a' }}>Send Custom SMS</h5>
            
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>Patient IDs (comma-separated)</label>
              <input type="text" value={customPatientIds} onChange={e => setCustomPatientIds(e.target.value)}
                placeholder="e.g., 1, 2, 3, 4"
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontSize: 13, fontWeight: 700, color: '#334155', marginBottom: 6 }}>Message (max 480 characters)</label>
              <textarea value={customMessage} onChange={e => setCustomMessage(e.target.value)}
                placeholder="Type your custom message here..."
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #e2e8f0', fontSize: 13, outline: 'none', minHeight: 120, boxSizing: 'border-box' }}
              />
              <div style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>{customMessage.length}/480 characters</div>
            </div>

            <button onClick={handleSendCustom} disabled={loading}
              style={{ padding: '12px 24px', borderRadius: 10, border: 'none', background: ACCENT, color: '#fff', fontWeight: 700, fontSize: 14, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.6 : 1 }}>
              {loading ? 'Sending...' : 'Send Custom SMS'}
            </button>

            {customResult && (
              <div style={{ marginTop: 20, padding: '14px 18px', borderRadius: 10, background: customResult.success ? '#f0fdf4' : '#fef2f2', border: `1px solid ${customResult.success ? '#bbf7d0' : '#fecaca'}` }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: customResult.success ? '#15803d' : '#dc2626', marginBottom: 4 }}>
                  {customResult.success ? '✅ Success' : '❌ Error'}
                </div>
                <div style={{ fontSize: 13, color: customResult.success ? '#166534' : '#991b1b' }}>
                  {customResult.success ? `Sent to ${customResult.sent_count}/${customResult.total_recipients} patients` : customResult.error}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Templates Tab */}
        {tab === 'templates' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {Object.entries(templatesByCategory).map(([category, temps]) => (
              <div key={category} style={{ background: '#fff', borderRadius: 14, boxShadow: '0 2px 8px rgba(15,23,42,0.06)', overflow: 'hidden' }}>
                <div style={{ padding: '16px 20px', borderBottom: '1px solid #f1f5f9', background: '#f8fafc' }}>
                  <h5 style={{ fontWeight: 800, fontSize: 15, margin: 0, color: '#0f172a' }}>{category}</h5>
                </div>
                <div style={{ padding: '16px 20px' }}>
                  {temps.map((t, i) => (
                    <div key={t.key} style={{ padding: '12px 0', borderBottom: i < temps.length - 1 ? '1px solid #f8fafc' : 'none' }}>
                      <div style={{ fontSize: 12, fontWeight: 700, color: ACCENT, marginBottom: 4, fontFamily: 'monospace' }}>{t.key}</div>
                      <div style={{ fontSize: 13, color: '#334155', lineHeight: 1.6 }}>{t.template}</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}

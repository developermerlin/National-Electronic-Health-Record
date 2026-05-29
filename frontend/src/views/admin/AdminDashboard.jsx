import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layout/DashboardLayout';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler } from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler);

const API_BASE = 'http://localhost:8000';

// Debug function to test API directly
const testApiEndpoint = async () => {
  try {
    const token = localStorage.getItem('authTokens');
    const parsed = token ? JSON.parse(token) : null;
    const accessToken = parsed?.access;

    console.log('Testing API with token:', accessToken ? 'Yes' : 'No');

    const res = await fetch(`${API_BASE}/api/admin/dashboard/`, {
      headers: accessToken ? { 'Authorization': `Bearer ${accessToken}` } : {}
    });
    const text = await res.text();
    console.log('Direct API Test - Status:', res.status);
    console.log('Direct API Test - Response (first 300 chars):', text.slice(0, 300));
    alert(`Status: ${res.status}\nResponse starts with: ${text.slice(0, 100)}`);
  } catch (e) {
    console.error('Direct API test failed:', e);
    alert('Direct API test failed: ' + e.message);
  }
};

const navItems = [
  {
    label: 'Dashboard',
    items: [
      { path: '/admin/dashboard', icon: 'fas fa-tachometer-alt', text: 'Overview' },
    ]
  },
  {
    label: 'User Management',
    items: [
      { path: '/admin/users', icon: 'fas fa-users', text: 'All Users' },
      { path: '/admin/roles', icon: 'fas fa-user-tag', text: 'Roles & Permissions' },
    ]
  },
  {
    label: 'Organization',
    items: [
      { path: '/admin/regions', icon: 'fas fa-globe-africa', text: 'Regions' },
      { path: '/admin/districts', icon: 'fas fa-map-marked-alt', text: 'Districts' },
      { path: '/admin/chiefdoms', icon: 'fas fa-sitemap', text: 'Chiefdoms' },
      { path: '/admin/towns', icon: 'fas fa-city', text: 'Towns' },
      { path: '/admin/hospitals', icon: 'fas fa-hospital', text: 'Hospitals' },
      { path: '/admin/departments', icon: 'fas fa-building', text: 'Departments' },
    ]
  },
  {
    label: 'Communication',
    items: [
      { path: '/messages', icon: 'fas fa-envelope', text: 'Messages' },
    ]
  },
  {
    label: 'Account',
    items: [
      { path: '/admin/profile', icon: 'fas fa-user-circle', text: 'My Profile' },
    ]
  }
];

const roleColors = {
  admin: '#7c3aed',
  doctor: '#4361ee',
  nurse: '#2ec4b6',
  receptionist: '#f77f00',
  lab_technician: '#e63946',
  pharmacist: '#059669',
  patient: '#0891b2',
};

const roleBadgeClass = {
  admin: 'dash-badge-primary',
  doctor: 'dash-badge-primary',
  nurse: 'dash-badge-info',
  receptionist: 'dash-badge-warning',
  lab_technician: 'dash-badge-info',
  pharmacist: 'dash-badge-success',
  patient: 'dash-badge-secondary',
};

function AdminDashboard() {
  const { apiCall, user } = useAuth();
  const navigate = useNavigate();
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
  const firstName = (user?.full_name || 'Admin').split(' ')[0];
  const photoUrl = user?.photo_url
    ? (user.photo_url.startsWith('http') ? user.photo_url : `${API_BASE}${user.photo_url}`)
    : null;
  const [stats,    setStats]    = useState({ total_users:0, active_users:0, inactive_users:0, total_roles:0, new_users_today:0, new_users_week:0 });
  const [org,      setOrg]      = useState({ total_regions:0, total_districts:0, total_chiefdoms:0, total_towns:0, total_hospitals:0, active_hospitals:0, total_departments:0 });
  const [patients, setPatients] = useState({ total_patients:0, active_patients:0, patients_today:0, patients_week:0, patients_month:0 });
  const [appts,    setAppts]    = useState({ total_appointments:0, pending_appointments:0, confirmed_appointments:0, completed_appointments:0, cancelled_appointments:0, appointments_today:0 });
  const [visits,   setVisits]   = useState({ total_visits:0, visits_today:0, visits_this_week:0, active_visits:0, completed_visits:0 });
  const [comms,    setComms]    = useState({ total_messages:0, unread_messages:0 });
  const [audit,    setAudit]    = useState({ audit_today:0, audit_week:0 });
  const [recentUsers,       setRecentUsers]       = useState([]);
  const [roleDistribution,  setRoleDistribution]  = useState([]);
  const [userFilter,        setUserFilter]        = useState('all');
  const [loading,           setLoading]           = useState(true);
  const [error,             setError]             = useState(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiCall('/admin/dashboard/');

      // First get raw text to debug HTML vs JSON issues
      const rawText = await response.text();
      console.log('Raw response (first 500 chars):', rawText.slice(0, 500));

      // Check if response is HTML (error page)
      if (rawText.trim().startsWith('<')) {
        console.error('Server returned HTML instead of JSON - likely 404 or 500 error');
        setError(`Server error ${response.status}: The API endpoint may not exist or the server crashed. Check backend logs.`);
        return;
      }

      // Parse JSON
      let data;
      try {
        data = JSON.parse(rawText);
      } catch (parseErr) {
        console.error('JSON parse error:', parseErr);
        setError('Invalid JSON response from server');
        return;
      }

      console.log('Admin Dashboard API Response:', data);

      if (!response.ok) {
        const msg = data?.error || `HTTP ${response.status} error`;
        const traceback = data?.traceback ? data.traceback.split('\n').slice(-5).join('\n') : '';
        setError(msg + (traceback ? '\n\n' + traceback : ''));
        console.error('Dashboard API Error:', msg);
        if (traceback) console.error('Traceback:', data.traceback);
        return;
      }

      // Ensure all data sections exist with defaults
      setStats(data.overview        || { total_users:0, active_users:0, inactive_users:0, total_roles:0, new_users_today:0, new_users_week:0 });
      setOrg(data.organization      || { total_regions:0, total_districts:0, total_chiefdoms:0, total_towns:0, total_hospitals:0, active_hospitals:0, total_departments:0 });
      setPatients(data.patients     || { total_patients:0, active_patients:0, patients_today:0, patients_week:0, patients_month:0 });
      setAppts(data.appointments    || { total_appointments:0, pending_appointments:0, confirmed_appointments:0, completed_appointments:0, cancelled_appointments:0, appointments_today:0 });
      setVisits(data.visits         || { total_visits:0, visits_today:0, visits_this_week:0, active_visits:0, completed_visits:0 });
      setComms(data.communications  || { total_messages:0, unread_messages:0 });
      setAudit(data.audit           || { audit_today:0, audit_week:0 });
      setRecentUsers(data.recent_users      || []);
      setRoleDistribution(data.role_distribution || []);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err?.message || 'Network error - check if backend is running');
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleToggleUserStatus = async (userId, currentStatus) => {
    try {
      if (currentStatus) {
        await apiCall(`/admin/users/${userId}/`, { method: 'DELETE' });
      } else {
        await apiCall(`/admin/users/${userId}/activate/`, { method: 'POST' });
      }
      fetchDashboardData();
    } catch (error) {
      console.error('Error toggling user status:', error);
    }
  };

  const getInitials = (name) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  };

  const getTimeAgo = (dateStr) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.floor(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    const diffDays = Math.floor(diffHrs / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const filteredUsers = recentUsers.filter(user => {
    if (userFilter === 'active') return user.is_active;
    if (userFilter === 'inactive') return !user.is_active;
    return true;
  });

  return (
    <DashboardLayout navItems={navItems} brandTitle="NEHR Admin" roleBadge="Administrator" hideBanner>

      {/* ══ UNIFIED SYSTEM ADMIN BANNER ══ */}
      <div style={{
        background: 'linear-gradient(135deg, #0a0f1e 0%, #0d1f3c 40%, #1a1060 75%, #2d1b8e 100%)',
        borderRadius: 18, padding: '24px 30px', marginBottom: 24,
        position: 'relative', overflow: 'hidden', color: '#fff',
        boxShadow: '0 8px 40px rgba(10,5,60,0.45)',
      }}>
        {/* Animated background grid */}
        <div style={{ position:'absolute', inset:0, backgroundImage:
          'linear-gradient(rgba(255,255,255,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.03) 1px, transparent 1px)',
          backgroundSize:'40px 40px', pointerEvents:'none' }}></div>
        {/* Glow orbs */}
        <div style={{ position:'absolute', right:-80, top:-80, width:280, height:280, borderRadius:'50%',
          background:'radial-gradient(circle, rgba(99,102,241,0.25) 0%, transparent 70%)', pointerEvents:'none' }}></div>
        <div style={{ position:'absolute', left:'35%', bottom:-100, width:240, height:240, borderRadius:'50%',
          background:'radial-gradient(circle, rgba(139,92,246,0.15) 0%, transparent 70%)', pointerEvents:'none' }}></div>

        {/* Content row */}
        <div style={{ position:'relative', display:'flex', alignItems:'center', gap:20, minWidth:0 }}>

          {/* Avatar */}
          <div style={{ width:64, height:64, borderRadius:'50%', flexShrink:0,
            border:'2px solid rgba(139,92,246,0.6)', overflow:'hidden',
            background:'rgba(99,102,241,0.2)',
            display:'flex', alignItems:'center', justifyContent:'center',
            boxShadow:'0 0 0 4px rgba(139,92,246,0.15)' }}>
            {photoUrl ? (
              <img src={photoUrl} alt="admin" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
            ) : (
              <span style={{ fontSize:22, fontWeight:900, color:'#c4b5fd' }}>
                {(user?.full_name || 'A')[0].toUpperCase()}
              </span>
            )}
          </div>

          {/* Info block */}
          <div style={{ flex:1, minWidth:0 }}>
            <div style={{ fontSize:11, color:'rgba(196,181,253,0.7)', fontWeight:600, marginBottom:3,
              letterSpacing:'0.3px', display:'flex', alignItems:'center', gap:10 }}>
              <span>Welcome back, <span style={{ color:'#a78bfa', fontWeight:700 }}>{firstName}</span></span>
              <span style={{ color:'rgba(255,255,255,0.2)' }}>•</span>
              <span style={{ color:'rgba(255,255,255,0.35)', fontWeight:400 }}>{today}</span>
            </div>
            <div style={{ fontWeight:900, fontSize:22, lineHeight:1.2, letterSpacing:'-0.4px',
              overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap',
              background:'linear-gradient(90deg,#e2d9f3,#c4b5fd)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
              {user?.full_name || 'System Administrator'}
            </div>
            <div style={{ display:'flex', gap:14, marginTop:7, flexWrap:'wrap', alignItems:'center' }}>
              {user?.employee_id && (
                <span style={{ fontSize:12, color:'rgba(196,181,253,0.75)', display:'flex', alignItems:'center', gap:5,
                  fontFamily:'monospace', background:'rgba(99,102,241,0.2)', padding:'2px 10px', borderRadius:6,
                  border:'1px solid rgba(139,92,246,0.3)', whiteSpace:'nowrap' }}>
                  <i className="fas fa-id-badge" style={{ fontSize:10 }}></i>{user.employee_id}
                </span>
              )}
              <span style={{ fontSize:12, color:'rgba(196,181,253,0.75)', display:'flex', alignItems:'center', gap:5, whiteSpace:'nowrap' }}>
                <i className="fas fa-shield-alt" style={{ fontSize:10, color:'#a78bfa' }}></i>
                {user?.role_display || 'System Administrator'}
              </span>
              <span style={{ fontSize:12, color:'rgba(196,181,253,0.75)', display:'flex', alignItems:'center', gap:5, whiteSpace:'nowrap' }}>
                <i className="fas fa-globe-africa" style={{ fontSize:10, color:'#a78bfa' }}></i>
                National Electronic Health Record
              </span>
            </div>
          </div>

          {/* Vertical divider */}
          <div style={{ width:1, height:56, background:'rgba(139,92,246,0.25)', flexShrink:0 }}></div>

          {/* Right: status + actions */}
          <div style={{ display:'flex', alignItems:'center', gap:10, flexShrink:0 }}>
            {/* System Online badge */}
            <div style={{ background:'rgba(16,185,129,0.12)', border:'1px solid rgba(16,185,129,0.3)',
              borderRadius:20, padding:'6px 14px', display:'flex', alignItems:'center', gap:6, whiteSpace:'nowrap' }}>
              <span style={{ width:8, height:8, borderRadius:'50%', background:'#10b981',
                display:'inline-block', boxShadow:'0 0 8px #10b981', flexShrink:0 }}></span>
              <span style={{ fontSize:12, fontWeight:700, color:'#6ee7b7' }}>System Online</span>
            </div>
            {/* Add User */}
            <Link to="/admin/users" style={{
              background:'rgba(99,102,241,0.25)', border:'1px solid rgba(139,92,246,0.4)',
              borderRadius:10, padding:'9px 16px', fontWeight:700, fontSize:13,
              textDecoration:'none', display:'flex', alignItems:'center', gap:7,
              color:'#c4b5fd', flexShrink:0, whiteSpace:'nowrap',
            }}>
              <i className="fas fa-user-plus" style={{ fontSize:12 }}></i>Add User
            </Link>
            {/* Manage Roles */}
            <Link to="/admin/roles" style={{
              background:'linear-gradient(135deg,#6366f1,#7c3aed)', border:'none',
              borderRadius:10, padding:'9px 16px', fontWeight:700, fontSize:13,
              textDecoration:'none', display:'flex', alignItems:'center', gap:7,
              color:'#fff', flexShrink:0, whiteSpace:'nowrap',
              boxShadow:'0 4px 14px rgba(99,102,241,0.45)',
            }}>
              <i className="fas fa-user-tag" style={{ fontSize:12 }}></i>Manage Roles
            </Link>
          </div>
        </div>
      </div>

      {/* ══ SYSTEM HEALTH STRIP ══ */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:10, marginBottom:24 }}>
        {[
          { icon:'fas fa-server',     label:'Server',   value:'Operational', sub:'Uptime 99.9%',        dot:'#10b981', bg:'rgba(16,185,129,0.08)',  border:'rgba(16,185,129,0.2)'  },
          { icon:'fas fa-database',   label:'Database', value:'Healthy',     sub:'Last backup 2h ago',  dot:'#6366f1', bg:'rgba(99,102,241,0.08)', border:'rgba(99,102,241,0.2)' },
          { icon:'fas fa-shield-alt', label:'Security', value:'Protected',   sub:'Last scan 6h ago',    dot:'#f59e0b', bg:'rgba(245,158,11,0.08)', border:'rgba(245,158,11,0.2)' },
          { icon:'fas fa-sync',       label:'Sync',     value:'Up to Date',  sub:'Last sync 5m ago',    dot:'#0891b2', bg:'rgba(8,145,178,0.08)',  border:'rgba(8,145,178,0.2)'  },
        ].map(s => (
          <div key={s.label} style={{ background:s.bg, border:`1px solid ${s.border}`,
            borderRadius:12, padding:'12px 16px', display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:36, height:36, borderRadius:10, background:s.bg,
              border:`1px solid ${s.border}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <i className={s.icon} style={{ color:s.dot, fontSize:15 }}></i>
            </div>
            <div style={{ minWidth:0 }}>
              <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:2 }}>
                <span style={{ width:6, height:6, borderRadius:'50%', background:s.dot,
                  display:'inline-block', boxShadow:`0 0 5px ${s.dot}`, flexShrink:0 }}></span>
                <span style={{ fontSize:13, fontWeight:700, color:'#1e293b', whiteSpace:'nowrap' }}>{s.value}</span>
              </div>
              <div style={{ fontSize:11, color:'#64748b', whiteSpace:'nowrap' }}>
                <i className="fas fa-circle" style={{ fontSize:5, marginRight:4, color:'#94a3b8' }}></i>{s.label} · {s.sub}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* ══ ERROR DISPLAY ══ */}
      {error && (
        <div style={{ background:'#fef2f2', border:'1px solid #fecaca', borderRadius:12, padding:'16px 20px', marginBottom:20 }}>
          <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
            <i className="fas fa-exclamation-triangle" style={{ color:'#ef4444', fontSize:20, marginTop:2 }}></i>
            <div style={{ flex:1, minWidth:0 }}>
              <div style={{ fontWeight:700, color:'#b91c1c', fontSize:14 }}>Failed to load dashboard data</div>
              <div style={{ color:'#7f1d1d', fontSize:11, marginTop:4, whiteSpace:'pre-wrap', fontFamily:'monospace', maxHeight:150, overflow:'auto' }}>{error}</div>
            </div>
            <div style={{ display:'flex', gap:8, flexShrink:0 }}>
              <button
                onClick={testApiEndpoint}
                style={{ background:'#f59e0b', color:'#fff', border:'none', borderRadius:8, padding:'8px 16px', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                <i className="fas fa-bug" style={{ marginRight:6 }}></i>Test API
              </button>
              <button
                onClick={fetchDashboardData}
                style={{ background:'#ef4444', color:'#fff', border:'none', borderRadius:8, padding:'8px 16px', fontSize:12, fontWeight:700, cursor:'pointer' }}>
                <i className="fas fa-redo" style={{ marginRight:6 }}></i>Retry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══ COMPREHENSIVE STATS SECTIONS ══ */}
      {loading ? (
        <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:200, gap:14 }}>
          <div className="spinner-border text-primary" style={{ width:40, height:40 }}></div>
          <span style={{ color:'#64748b', fontSize:14 }}>Loading system statistics…</span>
        </div>
      ) : (
        <>
          {error && (
            <div style={{ background:'#fffbeb', border:'1px solid #fcd34d', borderRadius:8, padding:'12px 16px', marginBottom:16, fontSize:12, color:'#92400e' }}>
              <i className="fas fa-info-circle" style={{ marginRight:8 }}></i>
              Showing default values due to loading error. Click "Retry" to attempt loading again.
            </div>
          )}
          {/* Section groups with clean professional cards */}
          {[
            {
              label: 'User Management', icon: 'fas fa-users-cog', color: '#6366f1',
              cards: [
                { icon:'fas fa-users',        label:'Total Users',      value: stats.total_users,     sub:`${stats.active_users} active`,   accent:'#6366f1', link:'/admin/users' },
                { icon:'fas fa-user-check',   label:'Active Users',     value: stats.active_users,    sub:'Currently enabled',              accent:'#10b981', link:'/admin/users' },
                { icon:'fas fa-user-times',   label:'Inactive Users',   value: stats.inactive_users,  sub:'Blocked / deactivated',          accent:'#ef4444', link:'/admin/users' },
                { icon:'fas fa-user-tag',     label:'Total Roles',      value: stats.total_roles,     sub:'Permission groups',              accent:'#8b5cf6', link:'/admin/roles' },
                { icon:'fas fa-user-plus',    label:'Joined Today',     value: stats.new_users_today, sub:'New registrations today',        accent:'#0891b2', link:'/admin/users' },
                { icon:'fas fa-calendar-week',label:'Joined This Week',  value: stats.new_users_week,  sub:'Last 7 days',                   accent:'#f59e0b', link:'/admin/users' },
              ],
            },
            {
              label: 'Organization', icon: 'fas fa-globe-africa', color: '#0891b2',
              cards: [
                { icon:'fas fa-globe-africa',  label:'Regions',     value: org.total_regions,     sub:'Administrative regions',         accent:'#0891b2', link:'/admin/regions' },
                { icon:'fas fa-map-marked-alt', label:'Districts',   value: org.total_districts,   sub:'Across all regions',             accent:'#6366f1', link:'/admin/districts' },
                { icon:'fas fa-sitemap',        label:'Chiefdoms',   value: org.total_chiefdoms,   sub:'Local authority areas',          accent:'#7c3aed', link:'/admin/chiefdoms' },
                { icon:'fas fa-city',           label:'Towns',       value: org.total_towns,       sub:'Registered localities',          accent:'#f59e0b', link:'/admin/towns' },
                { icon:'fas fa-hospital',       label:'Hospitals',   value: org.total_hospitals,   sub:`${org.active_hospitals} active`, accent:'#10b981', link:'/admin/hospitals' },
                { icon:'fas fa-building',       label:'Departments', value: org.total_departments, sub:'Across all hospitals',           accent:'#64748b', link:'/admin/departments' },
              ],
            },
            {
              label: 'Patients', icon: 'fas fa-procedures', color: '#10b981',
              cards: [
                { icon:'fas fa-procedures',    label:'Total Patients',  value: patients.total_patients,  sub:`${patients.active_patients} active`, accent:'#10b981', link:'/receptionist/patients' },
                { icon:'fas fa-user-injured',  label:'Active Patients', value: patients.active_patients, sub:'Currently registered',               accent:'#6366f1', link:'/receptionist/patients' },
                { icon:'fas fa-calendar-day',  label:'Admitted Today',  value: patients.patients_today,  sub:'Registered today',                   accent:'#0891b2', link:'/receptionist/patients' },
                { icon:'fas fa-calendar-week', label:'This Week',       value: patients.patients_week,   sub:'Last 7 days',                        accent:'#f59e0b', link:'/receptionist/patients' },
                { icon:'fas fa-calendar-alt',  label:'This Month',      value: patients.patients_month,  sub:'Last 30 days',                       accent:'#8b5cf6', link:'/receptionist/patients' },
              ],
            },
            {
              label: 'Appointments', icon: 'fas fa-calendar-check', color: '#7c3aed',
              cards: [
                { icon:'fas fa-calendar-alt',   label:'Total',      value: appts.total_appointments,     sub:'All time',               accent:'#7c3aed', link:'/receptionist/appointments' },
                { icon:'fas fa-hourglass-half', label:'Pending',    value: appts.pending_appointments,   sub:'Awaiting confirmation',  accent:'#f59e0b', link:'/receptionist/appointments' },
                { icon:'fas fa-calendar-check', label:'Confirmed',  value: appts.confirmed_appointments, sub:'Scheduled',              accent:'#6366f1', link:'/receptionist/appointments' },
                { icon:'fas fa-check-double',   label:'Completed',  value: appts.completed_appointments, sub:'Successfully done',      accent:'#10b981', link:'/receptionist/appointments' },
                { icon:'fas fa-times-circle',   label:'Cancelled',  value: appts.cancelled_appointments, sub:'Declined or cancelled',  accent:'#ef4444', link:'/receptionist/appointments' },
                { icon:'fas fa-calendar-day',   label:'Today',      value: appts.appointments_today,     sub:'Scheduled for today',    accent:'#0891b2', link:'/receptionist/appointments' },
              ],
            },
            {
              label: 'Clinical Visits', icon: 'fas fa-stethoscope', color: '#ef4444',
              cards: [
                { icon:'fas fa-stethoscope',   label:'Total Visits',   value: visits.total_visits,     sub:'All encounters',      accent:'#ef4444', link:'/receptionist/patients' },
                { icon:'fas fa-calendar-day',  label:'Visits Today',   value: visits.visits_today,     sub:"Today's encounters",  accent:'#f59e0b', link:'/receptionist/patients' },
                { icon:'fas fa-calendar-week', label:'This Week',      value: visits.visits_this_week, sub:'Last 7 days',         accent:'#6366f1', link:'/receptionist/patients' },
                { icon:'fas fa-spinner',       label:'Active Now',     value: visits.active_visits,    sub:'In progress',         accent:'#0891b2', link:'/receptionist/patients' },
                { icon:'fas fa-check-circle',  label:'Completed',      value: visits.completed_visits, sub:'Discharged visits',   accent:'#10b981', link:'/receptionist/patients' },
              ],
            },
            {
              label: 'Communications & Audit', icon: 'fas fa-envelope', color: '#64748b',
              cards: [
                { icon:'fas fa-envelope',       label:'Total Messages',   value: comms.total_messages,  sub:'All time',             accent:'#6366f1', link:'/messages' },
                { icon:'fas fa-envelope-open',  label:'Unread Messages',  value: comms.unread_messages, sub:'Awaiting read',        accent:'#ef4444', link:'/messages' },
                { icon:'fas fa-clipboard-list', label:'Audit Logs Today', value: audit.audit_today,     sub:'Actions logged today', accent:'#f59e0b', link:'/admin/users' },
                { icon:'fas fa-history',        label:'Audit This Week',  value: audit.audit_week,      sub:'Last 7 days activity', accent:'#10b981', link:'/admin/users' },
              ],
            },
          ].map(section => (
            <div key={section.label} style={{ marginBottom: 32 }}>

              {/* ── Section header ── */}
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                <div style={{ width:30, height:30, borderRadius:8,
                  background: section.color + '12',
                  display:'flex', alignItems:'center', justifyContent:'center' }}>
                  <i className={section.icon} style={{ color: section.color, fontSize:13 }}></i>
                </div>
                <span style={{ fontSize:11, fontWeight:800, color:'#334155',
                  textTransform:'uppercase', letterSpacing:'1.5px' }}>{section.label}</span>
                <div style={{ flex:1, height:1, background:'#e2e8f0' }}></div>
              </div>

              {/* ── Cards grid ── */}
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(190px, 1fr))', gap:14 }}>
                {section.cards.map(c => (
                  <div key={c.label}
                    onClick={() => navigate(c.link)}
                    style={{
                      background: '#fff',
                      borderRadius: 16,
                      padding: '22px 22px 18px',
                      boxShadow: '0 2px 8px rgba(15,23,42,0.06)',
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'box-shadow 0.2s ease, transform 0.2s ease',
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.transform = 'translateY(-4px)';
                      e.currentTarget.style.boxShadow = '0 12px 32px rgba(15,23,42,0.12)';
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(15,23,42,0.06)';
                    }}
                  >
                    {/* Icon badge */}
                    <div style={{
                      width: 42, height: 42, borderRadius: 12,
                      background: c.accent + '15',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      marginBottom: 16,
                    }}>
                      <i className={c.icon} style={{ color: c.accent, fontSize: 17 }}></i>
                    </div>

                    {/* Value */}
                    <div style={{ fontSize:32, fontWeight:800, color:'#0f172a', lineHeight:1, marginBottom:6 }}>
                      {(c.value ?? 0).toLocaleString()}
                    </div>

                    {/* Label */}
                    <div style={{ fontSize:13, fontWeight:600, color:'#334155', marginBottom:5 }}>
                      {c.label}
                    </div>

                    {/* Sub-label */}
                    <div style={{ fontSize:11, color: c.accent, fontWeight:500, opacity:0.75 }}>{c.sub}</div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </>
      )}

      {/* Main content row */}
      <div className="row g-4 mb-4">
        {/* User Management Overview */}
        <div className="col-xl-8">
          <div className="dash-card">
            <div className="dash-card-header">
              <h6>User Management Overview</h6>
              <div className="card-actions">
                <button className={userFilter === 'all' ? 'active' : ''} onClick={() => setUserFilter('all')}>All Roles</button>
                <button className={userFilter === 'active' ? 'active' : ''} onClick={() => setUserFilter('active')}>Active</button>
                <button className={userFilter === 'inactive' ? 'active' : ''} onClick={() => setUserFilter('inactive')}>Inactive</button>
              </div>
            </div>
            <div className="dash-card-body" style={{padding: 0, overflowX: 'auto'}}>
              {loading ? (
                <div className="text-center py-4">
                  <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
                  <span className="ms-2">Loading users...</span>
                </div>
              ) : (
              <table className="dash-table" style={{minWidth: '700px'}}>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th style={{minWidth: '100px'}}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.length === 0 ? (
                    <tr><td colSpan="5" style={{textAlign: 'center', padding: '20px', color: '#6c757d'}}>No users found</td></tr>
                  ) : (
                    filteredUsers.slice(0, 8).map((user) => (
                      <tr key={user.id}>
                        <td>
                          <div className="user-cell">
                            <div className="avatar" style={{background: roleColors[user.role_name] || '#4361ee'}}>
                              {getInitials(user.full_name || user.username)}
                            </div>
                            <div>
                              <div className="user-name">{user.full_name || user.username}</div>
                              <div className="user-role">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`dash-badge ${roleBadgeClass[user.role_name] || 'dash-badge-primary'}`}>
                            {user.role_display || 'No Role'}
                          </span>
                        </td>
                        <td>
                          <span className={`dash-badge ${user.is_active ? 'dash-badge-success' : 'dash-badge-danger'}`}>
                            {user.is_active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td>{getTimeAgo(user.date_joined)}</td>
                        <td>
                          <div style={{display: 'flex', gap: '4px'}}>
                            <button
                              className="dash-header-btn"
                              style={{width: '32px', height: '32px', fontSize: '12px'}}
                              title="Edit User"
                              onClick={() => navigate('/admin/users')}
                            >
                              <i className="fas fa-edit"></i>
                            </button>
                            <button
                              className="dash-header-btn"
                              style={{width: '32px', height: '32px', fontSize: '12px', color: user.is_active ? '#e63946' : '#059669'}}
                              title={user.is_active ? 'Block User' : 'Unblock User'}
                              onClick={() => handleToggleUserStatus(user.id, user.is_active)}
                            >
                              <i className={`fas ${user.is_active ? 'fa-ban' : 'fa-check-circle'}`}></i>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              )}
              {!loading && filteredUsers.length > 0 && (
                <div style={{padding: '12px 20px', borderTop: '1px solid #eee', textAlign: 'center'}}>
                  <Link to="/admin/users" style={{fontSize: '13px', color: '#4361ee', textDecoration: 'none'}}>
                    View All Users <i className="fas fa-arrow-right ms-1"></i>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Quick Actions (compact) */}
        <div className="col-xl-4">
          <div className="dash-card">
            <div className="dash-card-header"><h6>Quick Actions</h6></div>
            <div className="dash-card-body">
              <div className="dash-quick-actions">
                <Link to="/admin/users"      className="dash-quick-action-btn"><i className="fas fa-user-plus"></i><span>Add User</span></Link>
                <Link to="/admin/roles"      className="dash-quick-action-btn"><i className="fas fa-user-tag"></i><span>Manage Roles</span></Link>
                <Link to="/admin/hospitals"  className="dash-quick-action-btn"><i className="fas fa-hospital"></i><span>Hospitals</span></Link>
                <Link to="/messages"         className="dash-quick-action-btn"><i className="fas fa-envelope"></i><span>Messages</span></Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="row g-4 mb-4">
        {/* Role Distribution Doughnut */}
        <div className="col-xl-4 col-md-6">
          <div className="dash-card">
            <div className="dash-card-header">
              <h6>User Role Distribution</h6>
            </div>
            <div className="dash-card-body">
              {loading ? (
                <div className="text-center py-3">
                  <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
                </div>
              ) : roleDistribution.length === 0 ? (
                <p style={{color: '#6c757d', textAlign: 'center', padding: '20px'}}>No roles configured yet</p>
              ) : (
                <div style={{position: 'relative', height: '280px'}}>
                  <Doughnut
                    data={{
                      labels: roleDistribution.map(r => r.role_display),
                      datasets: [{
                        data: roleDistribution.map(r => r.count),
                        backgroundColor: roleDistribution.map(r => roleColors[r.role] || '#4361ee'),
                        borderWidth: 2,
                        borderColor: '#fff',
                        hoverOffset: 6,
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      cutout: '60%',
                      plugins: {
                        legend: { position: 'bottom', labels: { padding: 12, usePointStyle: true, pointStyleWidth: 8, font: { size: 12 } } },
                        tooltip: { backgroundColor: '#1d2939', titleFont: { size: 13 }, bodyFont: { size: 12 }, padding: 10, cornerRadius: 8 }
                      }
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Active vs Inactive Doughnut */}
        <div className="col-xl-4 col-md-6">
          <div className="dash-card">
            <div className="dash-card-header">
              <h6>User Status Overview</h6>
            </div>
            <div className="dash-card-body">
              {loading ? (
                <div className="text-center py-3">
                  <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
                </div>
              ) : (
                <div style={{position: 'relative', height: '280px'}}>
                  <Doughnut
                    data={{
                      labels: ['Active Users', 'Inactive Users'],
                      datasets: [{
                        data: [stats.active_users, stats.inactive_users],
                        backgroundColor: ['#059669', '#e63946'],
                        borderWidth: 2,
                        borderColor: '#fff',
                        hoverOffset: 6,
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      cutout: '60%',
                      plugins: {
                        legend: { position: 'bottom', labels: { padding: 12, usePointStyle: true, pointStyleWidth: 8, font: { size: 12 } } },
                        tooltip: { backgroundColor: '#1d2939', titleFont: { size: 13 }, bodyFont: { size: 12 }, padding: 10, cornerRadius: 8 }
                      }
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Users per Role - Bar Chart */}
        <div className="col-xl-4 col-md-12">
          <div className="dash-card">
            <div className="dash-card-header">
              <h6>Users per Role</h6>
            </div>
            <div className="dash-card-body">
              {loading ? (
                <div className="text-center py-3">
                  <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
                </div>
              ) : roleDistribution.length === 0 ? (
                <p style={{color: '#6c757d', textAlign: 'center', padding: '20px'}}>No data available</p>
              ) : (
                <div style={{position: 'relative', height: '280px'}}>
                  <Bar
                    data={{
                      labels: roleDistribution.map(r => r.role_display),
                      datasets: [{
                        label: 'Users',
                        data: roleDistribution.map(r => r.count),
                        backgroundColor: roleDistribution.map(r => (roleColors[r.role] || '#4361ee') + '99'),
                        borderColor: roleDistribution.map(r => roleColors[r.role] || '#4361ee'),
                        borderWidth: 1,
                        borderRadius: 6,
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false },
                        tooltip: { backgroundColor: '#1d2939', titleFont: { size: 13 }, bodyFont: { size: 12 }, padding: 10, cornerRadius: 8 }
                      },
                      scales: {
                        y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 11 } }, grid: { color: 'rgba(0,0,0,0.05)' } },
                        x: { ticks: { font: { size: 10 }, maxRotation: 45 }, grid: { display: false } }
                      }
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* User Registration Trend + Recent Events */}
      <div className="row g-4">
        <div className="col-xl-6">
          <div className="dash-card">
            <div className="dash-card-header">
              <h6>User Registration Trend</h6>
            </div>
            <div className="dash-card-body">
              {loading ? (
                <div className="text-center py-3">
                  <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
                </div>
              ) : (
                <div style={{position: 'relative', height: '280px'}}>
                  <Line
                    data={{
                      labels: (() => {
                        const months = [];
                        const now = new Date();
                        for (let i = 5; i >= 0; i--) {
                          const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                          months.push(d.toLocaleString('default', { month: 'short', year: '2-digit' }));
                        }
                        return months;
                      })(),
                      datasets: [{
                        label: 'New Users',
                        data: (() => {
                          const months = [];
                          const now = new Date();
                          for (let i = 5; i >= 0; i--) {
                            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                            const nextMonth = new Date(d.getFullYear(), d.getMonth() + 1, 1);
                            const count = recentUsers.filter(u => {
                              const joined = new Date(u.date_joined);
                              return joined >= d && joined < nextMonth;
                            }).length;
                            months.push(count);
                          }
                          return months;
                        })(),
                        borderColor: '#4361ee',
                        backgroundColor: 'rgba(67, 97, 238, 0.1)',
                        tension: 0.4,
                        fill: true,
                        pointBackgroundColor: '#4361ee',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 5,
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { display: false },
                        tooltip: { backgroundColor: '#1d2939', titleFont: { size: 13 }, bodyFont: { size: 12 }, padding: 10, cornerRadius: 8 }
                      },
                      scales: {
                        y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 11 } }, grid: { color: 'rgba(0,0,0,0.05)' } },
                        x: { ticks: { font: { size: 11 } }, grid: { display: false } }
                      }
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Recent System Events */}
        <div className="col-xl-6">
          <div className="dash-card">
            <div className="dash-card-header">
              <h6>Recent System Events</h6>
            </div>
            <div className="dash-card-body" style={{padding: 0}}>
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>User</th>
                    <th>Time</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>User Login</strong></td>
                    <td>Dr. John Doe</td>
                    <td>2h ago</td>
                    <td><span className="dash-badge dash-badge-success">Success</span></td>
                  </tr>
                  <tr>
                    <td><strong>Data Export</strong></td>
                    <td>Sarah Miller</td>
                    <td>3h ago</td>
                    <td><span className="dash-badge dash-badge-success">Completed</span></td>
                  </tr>
                  <tr>
                    <td><strong>Password Reset</strong></td>
                    <td>Robert Wilson</td>
                    <td>5h ago</td>
                    <td><span className="dash-badge dash-badge-success">Success</span></td>
                  </tr>
                  <tr>
                    <td><strong>System Backup</strong></td>
                    <td>System</td>
                    <td>2h ago</td>
                    <td><span className="dash-badge dash-badge-success">Completed</span></td>
                  </tr>
                  <tr>
                    <td><strong>Failed Login</strong></td>
                    <td>Unknown</td>
                    <td>6h ago</td>
                    <td><span className="dash-badge dash-badge-danger">Blocked</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

    </DashboardLayout>
  );
}

export default AdminDashboard;

import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../assets/css/dashboard.css';

const THEME_PRESETS = [
  // ── Dark Sidebar Presets ──────────────────────────────────────────
  { name: 'Midnight Blue',   primary: '#4361ee', sidebar: '#1e293b', bg: '#f1f5f9' },
  { name: 'Deep Indigo',     primary: '#4f46e5', sidebar: '#1e1b4b', bg: '#eef2ff' },
  { name: 'Navy & Teal',     primary: '#0d9488', sidebar: '#0f172a', bg: '#f0fdfa' },
  { name: 'Corporate Blue',  primary: '#2563eb', sidebar: '#1e3a5f', bg: '#eff6ff' },
  { name: 'Slate Pro',       primary: '#475569', sidebar: '#0f172a', bg: '#f8fafc' },
  { name: 'Medical Green',   primary: '#16a34a', sidebar: '#052e16', bg: '#f0fdf4' },
  { name: 'Forest Teal',     primary: '#0891b2', sidebar: '#134e4a', bg: '#ecfeff' },
  { name: 'Executive',       primary: '#6d28d9', sidebar: '#1a1f2e', bg: '#f5f3ff' },
  // ── Light Sidebar Presets ─────────────────────────────────────────
  { name: 'Clean Blue',      primary: '#2563eb', sidebar: '#ffffff', bg: '#f1f5f9' },
  { name: 'Clean Indigo',    primary: '#4f46e5', sidebar: '#f8fafc', bg: '#eef2ff' },
  { name: 'Clean Teal',      primary: '#0d9488', sidebar: '#f0fdfa', bg: '#f8fafc' },
  { name: 'Clean Green',     primary: '#16a34a', sidebar: '#f0fdf4', bg: '#f8fafc' },
  { name: 'Clean Purple',    primary: '#7c3aed', sidebar: '#faf5ff', bg: '#f5f3ff' },
  { name: 'Clean Slate',     primary: '#475569', sidebar: '#f8fafc', bg: '#f1f5f9' },
  { name: 'Clean Sky',       primary: '#0284c7', sidebar: '#f0f9ff', bg: '#f8fafc' },
  { name: 'Clean Rose',      primary: '#e11d48', sidebar: '#fff1f2', bg: '#fdf2f8' },
];

const SIDEBAR_COLORS = [
  // ── White & Light ─────────────────────────────────────────────────
  { name: 'Pure White',    value: '#ffffff' },
  { name: 'Off White',     value: '#f8fafc' },
  { name: 'Pearl',         value: '#f1f5f9' },
  { name: 'Light Gray',    value: '#e2e8f0' },
  { name: 'Silver',        value: '#cbd5e1' },
  { name: 'Pale Blue',     value: '#dbeafe' },
  { name: 'Pale Purple',   value: '#ede9fe' },
  { name: 'Pale Green',    value: '#dcfce7' },
  { name: 'Pale Teal',     value: '#ccfbf1' },
  { name: 'Pale Sky',      value: '#e0f2fe' },
  // ── Medium ────────────────────────────────────────────────────────
  { name: 'Blue Gray',     value: '#64748b' },
  { name: 'Steel Blue',    value: '#3b82f6' },
  { name: 'Indigo Mid',    value: '#4338ca' },
  { name: 'Teal Mid',      value: '#0f766e' },
  { name: 'Green Mid',     value: '#15803d' },
  // ── Dark ──────────────────────────────────────────────────────────
  { name: 'Dark Navy',     value: '#1e293b' },
  { name: 'Charcoal',      value: '#1f2937' },
  { name: 'Deep Black',    value: '#0f172a' },
  { name: 'Midnight',      value: '#111827' },
  { name: 'Dark Blue',     value: '#172554' },
  { name: 'Steel Dark',    value: '#1e3a5f' },
  { name: 'Dark Indigo',   value: '#1e1b4b' },
  { name: 'Dark Teal',     value: '#134e4a' },
  { name: 'Gunmetal',      value: '#1a1f2e' },
  { name: 'True Black',    value: '#09090b' },
];

const BG_COLORS = [
  { name: 'Cool Gray',     value: '#f1f5f9' },
  { name: 'White Smoke',   value: '#f8fafc' },
  { name: 'Pure White',    value: '#ffffff' },
  { name: 'Light Blue',    value: '#eff6ff' },
  { name: 'Light Purple',  value: '#f5f3ff' },
  { name: 'Light Green',   value: '#f0fdf4' },
  { name: 'Light Teal',    value: '#f0fdfa' },
  { name: 'Light Cyan',    value: '#ecfeff' },
  { name: 'Light Pink',    value: '#fdf2f8' },
  { name: 'Light Rose',    value: '#fff1f2' },
  { name: 'Light Amber',   value: '#fffbeb' },
  { name: 'Light Orange',  value: '#fff7ed' },
  { name: 'Light Lime',    value: '#f7fee7' },
  { name: 'Warm White',    value: '#fafaf9' },
  { name: 'Soft Gray',     value: '#f4f4f5' },
  { name: 'Pale Blue',     value: '#f0f9ff' },
  { name: 'Cream',         value: '#fefce8' },
  { name: 'Light Fuchsia', value: '#fdf4ff' },
  { name: 'Light Indigo',  value: '#eef2ff' },
  { name: 'Warm Gray',     value: '#f5f5f4' },
];

function DashboardLayout({ children, navItems = [], brandTitle = 'NEHR', roleBadge = '', hideBanner = false }) {
  const { user, logout, apiCall } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [recentMessages, setRecentMessages] = useState([]);
  const profileDropdownRef = useRef(null);
  const themeRef = useRef(null);
  const notificationsRef = useRef(null);

  // Poll unread count every 30 seconds
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    const fetchUnread = async () => {
      try {
        const response = await apiCall('/messages/unread-count/');
        if (!response.ok || cancelled) return;
        const data = await response.json();
        setUnreadCount(data.count || 0);
      } catch { /* ignore */ }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [user, apiCall]);

  // Fetch recent inbox messages when notification dropdown opens
  const fetchRecentMessages = async () => {
    try {
      const response = await apiCall('/messages/inbox/');
      if (!response.ok) return;
      const data = await response.json();
      setRecentMessages((data || []).slice(0, 5));
    } catch { /* ignore */ }
  };

  const toggleNotifications = () => {
    const willOpen = !notificationsOpen;
    setNotificationsOpen(willOpen);
    if (willOpen) fetchRecentMessages();
  };

  const openMessage = (msgId) => {
    setNotificationsOpen(false);
    navigate('/messages');
    // Re-fetch unread count shortly after opening
    setTimeout(async () => {
      try {
        const response = await apiCall('/messages/unread-count/');
        if (response.ok) {
          const data = await response.json();
          setUnreadCount(data.count || 0);
        }
      } catch { /* ignore */ }
    }, 500);
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    const diffMs = Date.now() - d.getTime();
    const diffMin = diffMs / 60000;
    if (diffMin < 1) return 'Just now';
    if (diffMin < 60) return `${Math.floor(diffMin)}m ago`;
    if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h ago`;
    return d.toLocaleDateString();
  };

  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('dashboard_dark_mode') === 'true';
  });

  const [themeColors, setThemeColors] = useState(() => {
    const saved = localStorage.getItem('dashboard_theme');
    return saved ? JSON.parse(saved) : { primary: '#4361ee', sidebar: '#1e293b', bg: '#f1f5f9' };
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target)) {
        setProfileDropdownOpen(false);
      }
      if (themeRef.current && !themeRef.current.contains(e.target)) {
        setThemeOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(e.target)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    document.documentElement.style.setProperty('--dash-primary', themeColors.primary);
    document.documentElement.style.setProperty('--dash-sidebar-bg', themeColors.sidebar);
    document.documentElement.style.setProperty('--dash-body-bg', themeColors.bg || '#f1f5f9');
    const r = parseInt(themeColors.primary.slice(1, 3), 16);
    const g = parseInt(themeColors.primary.slice(3, 5), 16);
    const b = parseInt(themeColors.primary.slice(5, 7), 16);
    document.documentElement.style.setProperty('--dash-primary-light', `rgba(${r},${g},${b},0.08)`);
    document.documentElement.style.setProperty('--dash-sidebar-active', themeColors.primary);
    // Auto-detect light vs dark sidebar and adjust text/hover colors
    const sr = parseInt(themeColors.sidebar.slice(1, 3), 16);
    const sg = parseInt(themeColors.sidebar.slice(3, 5), 16);
    const sb = parseInt(themeColors.sidebar.slice(5, 7), 16);
    const brightness = (sr * 299 + sg * 587 + sb * 114) / 1000;
    const isLight = brightness > 160;
    document.documentElement.style.setProperty('--dash-sidebar-text', isLight ? '#475569' : '#94a3b8');
    document.documentElement.style.setProperty('--dash-sidebar-hover', isLight ? '#e2e8f0' : '#334155');
    document.documentElement.style.setProperty('--dash-sidebar-nav-text', isLight ? '#1e293b' : '#e2e8f0');
    document.documentElement.style.setProperty('--dash-sidebar-border', isLight ? 'rgba(0,0,0,0.08)' : 'rgba(255,255,255,0.06)');
    localStorage.setItem('dashboard_theme', JSON.stringify(themeColors));
  }, [themeColors]);

  useEffect(() => {
    localStorage.setItem('dashboard_dark_mode', String(darkMode));
  }, [darkMode]);

  const applyPreset = (preset) => {
    setThemeColors({ primary: preset.primary, sidebar: preset.sidebar, bg: preset.bg || '#f1f5f9' });
  };

  const applySidebarColor = (color) => {
    setThemeColors(prev => ({ ...prev, sidebar: color }));
  };

  const applyBgColor = (color) => {
    setThemeColors(prev => ({ ...prev, bg: color }));
  };

  const toggleCollapse = () => {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    localStorage.setItem('sidebar_collapsed', String(next));
  };

  const displayName = user?.full_name || user?.username || 'User';
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const userRole = user?.role_display || user?.role || 'User';
  const API_BASE = 'http://localhost:8000';
  const photoUrl = user?.photo_url
    ? (user.photo_url.startsWith('http') ? user.photo_url : `${API_BASE}${user.photo_url}`)
    : null;

  const toggleDarkMode = () => setDarkMode(prev => !prev);

  return (
    <div className={`dashboard-wrapper ${sidebarCollapsed ? 'sidebar-collapsed' : ''} ${darkMode ? 'dark-mode' : ''}`}>
      {/* Mobile overlay */}
      <div
        className={`dash-sidebar-overlay ${sidebarOpen ? 'active' : ''}`}
        onClick={() => setSidebarOpen(false)}
      ></div>

      {/* Sidebar */}
      <aside className={`dash-sidebar ${sidebarOpen ? 'open' : ''} ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="dash-sidebar-brand">
          <div className="brand-icon">
            <i className="fas fa-heartbeat"></i>
          </div>
          <div className="brand-text">{brandTitle}</div>
        </div>

        <div className="dash-sidebar-user">
          {photoUrl ? (
            <img
              src={photoUrl}
              alt={displayName}
              className="user-avatar"
              style={{ objectFit: 'cover', border: '2px solid rgba(255,255,255,0.25)' }}
            />
          ) : (
            <div className="user-avatar">{initials}</div>
          )}
          <div className="user-info">
            <h6>{displayName}</h6>
            <small>{roleBadge || userRole}</small>
            {user?.hospital_name && (
              <small style={{ display: 'block', color: 'rgba(255,255,255,0.5)', fontSize: '10px', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                <i className="fas fa-hospital-alt me-1" style={{ fontSize: 9 }}></i>{user.hospital_name}
              </small>
            )}
          </div>
        </div>

        <nav className="dash-sidebar-nav">
          {navItems.map((section, sIdx) => (
            <React.Fragment key={sIdx}>
              {section.label && <p className="dash-nav-label">{section.label}</p>}
              <ul className="dash-nav-item">
                {section.items.map((item, iIdx) => (
                  <li key={iIdx}>
                    <Link
                      to={item.path}
                      className={location.pathname === item.path ? 'active' : ''}
                      onClick={() => setSidebarOpen(false)}
                      title={sidebarCollapsed ? item.text : ''}
                    >
                      <i className={item.icon}></i>
                      <span>{item.text}</span>
                      {item.badge && <span className="nav-badge">{item.badge}</span>}
                    </Link>
                  </li>
                ))}
              </ul>
            </React.Fragment>
          ))}
        </nav>

        <div className="dash-sidebar-footer">
          <button className="dash-logout-btn" onClick={handleLogout}>
            <i className="fas fa-sign-out-alt"></i>
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="dash-main">
        {/* Header */}
        <header className="dash-header">
          <div className="dash-header-left">
            <button className="dash-menu-toggle dash-desktop-toggle" onClick={toggleCollapse} title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
              <i className={`fas ${sidebarCollapsed ? 'fa-indent' : 'fa-outdent'}`}></i>
            </button>
            <button className="dash-menu-toggle dash-mobile-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <i className="fas fa-bars"></i>
            </button>
          </div>
          <div className="dash-header-right">
            <button className="dash-header-btn" onClick={toggleDarkMode} title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
              <i className={`fas ${darkMode ? 'fa-sun' : 'fa-moon'}`} style={{ color: darkMode ? '#f59e0b' : undefined }}></i>
            </button>
            {/* Notifications Dropdown */}
            <div ref={notificationsRef} style={{ position: 'relative' }}>
              <button className="dash-header-btn" title="Messages" onClick={toggleNotifications} style={{ position: 'relative' }}>
                <i className="fas fa-bell"></i>
                {unreadCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: '-2px',
                    right: '-2px',
                    background: '#e63946',
                    color: '#fff',
                    borderRadius: '10px',
                    fontSize: '10px',
                    fontWeight: 700,
                    minWidth: '18px',
                    height: '18px',
                    padding: '0 5px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: '2px solid #fff',
                    lineHeight: 1,
                  }}>{unreadCount > 99 ? '99+' : unreadCount}</span>
                )}
              </button>

              {notificationsOpen && (
                <div style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: '8px',
                  backgroundColor: '#fff', borderRadius: '10px', boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                  width: '360px', maxWidth: '90vw', zIndex: 1100, overflow: 'hidden', border: '1px solid #e9ecef',
                }}>
                  <div style={{
                    padding: '14px 16px', borderBottom: '1px solid #f0f0f0',
                    backgroundColor: '#f8f9fa', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  }}>
                    <h6 style={{ margin: 0, fontSize: '14px', fontWeight: 600 }}>
                      <i className="fas fa-envelope me-2 text-primary"></i>Messages
                    </h6>
                    {unreadCount > 0 && (
                      <span style={{
                        background: '#e63946', color: '#fff', padding: '2px 8px',
                        borderRadius: '10px', fontSize: '11px', fontWeight: 600,
                      }}>{unreadCount} unread</span>
                    )}
                  </div>

                  <div style={{ maxHeight: '380px', overflowY: 'auto' }}>
                    {recentMessages.length === 0 ? (
                      <div style={{ padding: '30px 20px', textAlign: 'center', color: '#6c757d' }}>
                        <i className="fas fa-inbox" style={{ fontSize: '32px', opacity: 0.3, display: 'block', marginBottom: '8px' }}></i>
                        <small>No messages</small>
                      </div>
                    ) : recentMessages.map(m => (
                      <div
                        key={m.id}
                        onClick={() => openMessage(m.id)}
                        style={{
                          padding: '12px 16px', borderBottom: '1px solid #f1f5f9',
                          cursor: 'pointer', background: !m.is_read ? '#f8faff' : 'transparent',
                          transition: 'background 0.15s',
                        }}
                        onMouseEnter={(e) => e.currentTarget.style.background = '#eef2ff'}
                        onMouseLeave={(e) => e.currentTarget.style.background = !m.is_read ? '#f8faff' : 'transparent'}
                      >
                        <div style={{ display: 'flex', alignItems: 'start', gap: '10px' }}>
                          <div style={{
                            width: '36px', height: '36px', borderRadius: '50%',
                            background: 'linear-gradient(135deg, #4361ee, #7c3aed)', color: '#fff',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '13px', fontWeight: 600, flexShrink: 0,
                          }}>
                            {(m.sender?.full_name || m.sender?.email || '?').split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{
                              display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '2px',
                            }}>
                              <strong style={{ fontSize: '13px', fontWeight: !m.is_read ? 700 : 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                {m.sender?.full_name || m.sender?.email || 'Unknown'}
                              </strong>
                              <small style={{ fontSize: '11px', color: '#94a3b8', flexShrink: 0, marginLeft: '8px' }}>{formatTime(m.created_at)}</small>
                            </div>
                            <div style={{ fontSize: '12px', color: '#475569', fontWeight: !m.is_read ? 600 : 400, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {m.subject}
                            </div>
                            <div style={{ fontSize: '11px', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                              {m.body?.substring(0, 60)}
                            </div>
                          </div>
                          {!m.is_read && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#4361ee', flexShrink: 0, marginTop: '14px' }}></span>}
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ padding: '10px 16px', borderTop: '1px solid #f0f0f0', background: '#f8f9fa', textAlign: 'center' }}>
                    <Link to="/messages" onClick={() => setNotificationsOpen(false)} style={{ fontSize: '13px', fontWeight: 600, textDecoration: 'none' }}>
                      View all messages <i className="fas fa-arrow-right ms-1" style={{ fontSize: '11px' }}></i>
                    </Link>
                  </div>
                </div>
              )}
            </div>

            {/* Profile Dropdown */}
            <div className="dash-profile-dropdown" ref={profileDropdownRef} style={{ position: 'relative' }}>
              <div
                className="dash-user-menu"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                style={{ cursor: 'pointer' }}
              >
                {photoUrl ? (
                  <img src={photoUrl} alt={displayName} className="user-avatar-sm" style={{ objectFit: 'cover' }} />
                ) : (
                  <div className="user-avatar-sm">{initials}</div>
                )}
                <span className="user-name">{displayName}</span>
                <i className={`fas fa-chevron-${profileDropdownOpen ? 'up' : 'down'}`} style={{ fontSize: '10px', marginLeft: '6px', color: '#6c757d' }}></i>
              </div>

              {profileDropdownOpen && (
                <div style={{
                  position: 'absolute', top: '100%', right: 0, marginTop: '8px',
                  backgroundColor: '#fff', borderRadius: '10px', boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
                  minWidth: '240px', zIndex: 1100, overflow: 'hidden', border: '1px solid #e9ecef'
                }}>
                  {/* User Info Header */}
                  <div style={{ padding: '16px', borderBottom: '1px solid #f0f0f0', backgroundColor: '#f8f9fa' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {photoUrl ? (
                        <img src={photoUrl} alt={displayName} style={{ width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover' }} />
                      ) : (
                        <div style={{
                          width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg, #667eea, #764ba2)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '16px'
                        }}>
                          {initials}
                        </div>
                      )}
                      <div>
                        <div style={{ fontWeight: 600, fontSize: '14px', color: '#1a1a2e' }}>{displayName}</div>
                        <div style={{ fontSize: '12px', color: '#6c757d' }}>{user?.email}</div>
                        <span style={{
                          display: 'inline-block', marginTop: '4px', padding: '2px 8px', borderRadius: '12px',
                          fontSize: '11px', fontWeight: 600, backgroundColor: '#e8f5e9', color: '#2e7d32'
                        }}>
                          {roleBadge || userRole}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div style={{ padding: '8px 0' }}>
                    <Link to="/admin/profile" style={{
                      display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px',
                      color: '#333', textDecoration: 'none', fontSize: '14px', transition: 'background 0.2s'
                    }} onClick={() => setProfileDropdownOpen(false)}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <i className="fas fa-user-circle" style={{ width: '18px', color: '#6c757d' }}></i>
                      My Profile
                    </Link>
                    <Link to="/admin/profile" style={{
                      display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px',
                      color: '#333', textDecoration: 'none', fontSize: '14px', transition: 'background 0.2s'
                    }} onClick={() => setProfileDropdownOpen(false)}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <i className="fas fa-cog" style={{ width: '18px', color: '#6c757d' }}></i>
                      Settings
                    </Link>
                  </div>

                  {/* Logout */}
                  <div style={{ borderTop: '1px solid #f0f0f0', padding: '8px 0' }}>
                    <button onClick={handleLogout} style={{
                      display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 16px',
                      width: '100%', border: 'none', background: 'none', color: '#dc3545',
                      fontSize: '14px', cursor: 'pointer', transition: 'background 0.2s'
                    }}
                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#fff5f5'}
                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <i className="fas fa-sign-out-alt" style={{ width: '18px' }}></i>
                      Sign Out
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <div className="dash-content">

          {/* ── Hospital & Staff Banner ── */}
          {!hideBanner && user?.hospital_name && (() => {
            const firstName = displayName.split(' ')[0];
            const lastName  = displayName.split(' ').pop();
            const isDoctor  = (user.role_display || user.role || '').toLowerCase().includes('doctor');
            const greeting  = isDoctor ? `Dr. ${lastName}` : firstName;
            const today     = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' });
            const deptName  = user.department_name;
            const deptLabels = {
              triage: { label: 'Triage Department',        icon: 'fas fa-procedures',       color: '#f87171' },
              opd:    { label: 'Out-Patient Department',   icon: 'fas fa-clinic-medical',   color: '#60a5fa' },
              ipd:    { label: 'In-Patient Department',    icon: 'fas fa-bed',              color: '#a78bfa' },
              emergency: { label: 'Emergency Department',  icon: 'fas fa-ambulance',        color: '#fb923c' },
              maternity: { label: 'Maternity Department',  icon: 'fas fa-baby',             color: '#f472b6' },
              pediatrics:{ label: 'Pediatrics Department', icon: 'fas fa-child',            color: '#34d399' },
              surgery:   { label: 'Surgery Department',    icon: 'fas fa-cut',              color: '#e879f9' },
              ward:      { label: 'Ward Department',       icon: 'fas fa-hospital-user',    color: '#94a3b8' },
              pharmacy:  { label: 'Pharmacy Department',   icon: 'fas fa-pills',            color: '#22d3ee' },
              laboratory:{ label: 'Laboratory Department', icon: 'fas fa-flask',            color: '#fbbf24' },
              radiology: { label: 'Radiology Department',  icon: 'fas fa-x-ray',            color: '#c084fc' },
              dental:    { label: 'Dental Department',     icon: 'fas fa-tooth',            color: '#67e8f9' },
              eye_clinic:{ label: 'Eye Clinic',            icon: 'fas fa-eye',              color: '#86efac' },
              physiotherapy:{ label: 'Physiotherapy Dept', icon: 'fas fa-running',          color: '#fdba74' },
            };
            const dept = deptName ? (deptLabels[deptName] || { label: deptName.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase()) + ' Department', icon: 'fas fa-layer-group', color: '#93c5fd' }) : null;
            return (
              <div style={{
                background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 55%, #4361ee 100%)',
                borderRadius: 16,
                padding: '22px 28px',
                marginBottom: 22,
                boxShadow: '0 6px 24px rgba(29,78,216,0.25)',
                position: 'relative',
                overflow: 'hidden',
              }}>
                {/* Decorative circles */}
                <div style={{ position: 'absolute', right: -50, top: -50, width: 220, height: 220, borderRadius: '50%', background: 'rgba(255,255,255,0.04)', pointerEvents: 'none' }}></div>
                <div style={{ position: 'absolute', right: 100, bottom: -80, width: 180, height: 180, borderRadius: '50%', background: 'rgba(255,255,255,0.03)', pointerEvents: 'none' }}></div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap', position: 'relative' }}>
                  {/* Hospital icon */}
                  <div style={{
                    width: 54, height: 54, borderRadius: 14,
                    background: 'rgba(255,255,255,0.13)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                    border: '1px solid rgba(255,255,255,0.18)',
                  }}>
                    <i className="fas fa-hospital" style={{ color: '#fff', fontSize: 24 }}></i>
                  </div>

                  {/* Main info block */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Greeting row */}
                    <div style={{ color: 'rgba(255,255,255,0.55)', fontSize: 12, fontWeight: 600, marginBottom: 4 }}>
                      Welcome back, <span style={{ color: '#93c5fd', fontWeight: 700 }}>{greeting}</span>
                      <span style={{ marginLeft: 14, color: 'rgba(255,255,255,0.35)', fontWeight: 400 }}>{today}</span>
                    </div>
                    {/* Hospital name + department badge */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                      <div style={{
                        color: '#fff', fontWeight: 900, fontSize: 21,
                        lineHeight: 1.15, letterSpacing: '-0.3px',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      }}>
                        {user.hospital_name}
                      </div>
                      {dept && (
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: 5,
                          background: `${dept.color}20`,
                          border: `1px solid ${dept.color}55`,
                          borderRadius: 20, padding: '3px 10px',
                          fontSize: 11, fontWeight: 700, color: dept.color,
                          whiteSpace: 'nowrap', flexShrink: 0,
                        }}>
                          <i className={dept.icon} style={{ fontSize: 10 }}></i>
                          {dept.label}
                        </span>
                      )}
                    </div>
                    {/* Sub-info chips */}
                    <div style={{ display: 'flex', gap: 16, marginTop: 8, flexWrap: 'wrap' }}>
                      <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <i className="fas fa-id-badge" style={{ fontSize: 11 }}></i>
                        {user.employee_id || 'Staff'}
                      </span>
                      <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                        <i className="fas fa-briefcase-medical" style={{ fontSize: 11 }}></i>
                        {user.role_display || user.role || 'Staff'}
                      </span>
                      {user.address && (
                        <span style={{ color: 'rgba(255,255,255,0.65)', fontSize: 12, display: 'flex', alignItems: 'center', gap: 5 }}>
                          <i className="fas fa-map-marker-alt" style={{ fontSize: 11 }}></i>
                          {user.address}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Divider */}
                  <div style={{ width: 1, height: 52, background: 'rgba(255,255,255,0.15)', flexShrink: 0, alignSelf: 'center' }}></div>

                  {/* Status badge */}
                  <div style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <div style={{
                      background: 'rgba(255,255,255,0.10)',
                      border: '1px solid rgba(255,255,255,0.22)',
                      borderRadius: 20, padding: '6px 18px',
                      display: 'flex', alignItems: 'center', gap: 7,
                    }}>
                      <span style={{
                        width: 8, height: 8, borderRadius: '50%',
                        background: '#4ade80', display: 'inline-block',
                        boxShadow: '0 0 6px #4ade80',
                      }}></span>
                      <span style={{ color: '#fff', fontSize: 12, fontWeight: 700 }}>On Duty</span>
                    </div>
                    <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase' }}>
                      Active Facility
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {children}
        </div>

        {/* Footer */}
        <footer className="dash-footer">
          <span>&copy; {new Date().getFullYear()} National Electronic Health Record System</span>
          <span>Version 1.0</span>
        </footer>
      </div>

      {/* Color Theme Widget */}
      <div ref={themeRef}>
        <button className="color-theme-fab" onClick={() => setThemeOpen(!themeOpen)} title="Customize Theme">
          <i className="fas fa-palette"></i>
        </button>

        {themeOpen && (
          <div className="color-theme-panel">
            <div className="color-theme-panel-header">
              <span><i className="fas fa-palette me-2"></i>Theme Colors</span>
              <button onClick={() => {
                setThemeColors({ primary: '#4361ee', sidebar: '#1e293b', bg: '#f1f5f9' });
              }} style={{ background: 'none', border: 'none', fontSize: '12px', color: '#6c757d', cursor: 'pointer' }}>
                <i className="fas fa-undo me-1"></i>Reset
              </button>
            </div>
            <div className="color-theme-panel-body">
              <div className="color-theme-section">
                <label>Theme Presets</label>
                <div className="color-swatch-grid">
                  {THEME_PRESETS.map((preset) => (
                    <div
                      key={preset.name}
                      className={`color-swatch ${themeColors.primary === preset.primary && themeColors.sidebar === preset.sidebar ? 'active' : ''}`}
                      style={{ background: `linear-gradient(135deg, ${preset.sidebar} 50%, ${preset.primary} 50%)` }}
                      onClick={() => applyPreset(preset)}
                      title={preset.name}
                    ></div>
                  ))}
                </div>
              </div>
              <div className="color-theme-section">
                <label>Sidebar Color</label>
                <div className="color-swatch-grid">
                  {SIDEBAR_COLORS.map((color) => (
                    <div
                      key={color.name}
                      className={`color-swatch ${themeColors.sidebar === color.value ? 'active' : ''}`}
                      style={{ background: color.value }}
                      onClick={() => applySidebarColor(color.value)}
                      title={color.name}
                    ></div>
                  ))}
                </div>
              </div>
              <div className="color-theme-section">
                <label>Page Background</label>
                <div className="color-swatch-grid">
                  {BG_COLORS.map((color) => (
                    <div
                      key={color.name}
                      className={`color-swatch ${themeColors.bg === color.value ? 'active' : ''}`}
                      style={{ background: color.value, border: '1px solid #e2e8f0' }}
                      onClick={() => applyBgColor(color.value)}
                      title={color.name}
                    ></div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DashboardLayout;

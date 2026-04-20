import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../assets/css/dashboard.css';

const THEME_PRESETS = [
  { name: 'Default Blue', primary: '#4361ee', sidebar: '#1e293b' },
  { name: 'Royal Purple', primary: '#7c3aed', sidebar: '#1e1b4b' },
  { name: 'Emerald', primary: '#059669', sidebar: '#14532d' },
  { name: 'Rose', primary: '#e11d48', sidebar: '#4c0519' },
  { name: 'Amber', primary: '#d97706', sidebar: '#451a03' },
  { name: 'Cyan', primary: '#0891b2', sidebar: '#164e63' },
  { name: 'Slate', primary: '#475569', sidebar: '#0f172a' },
  { name: 'Indigo', primary: '#4f46e5', sidebar: '#1e1b4b' },
  { name: 'Teal', primary: '#0d9488', sidebar: '#134e4a' },
  { name: 'Pink', primary: '#db2777', sidebar: '#500724' },
  { name: 'Sky', primary: '#0284c7', sidebar: '#0c4a6e' },
  { name: 'Orange', primary: '#ea580c', sidebar: '#431407' },
];

const SIDEBAR_COLORS = [
  { name: 'Dark Navy', value: '#1e293b' },
  { name: 'Charcoal', value: '#1f2937' },
  { name: 'Deep Black', value: '#0f172a' },
  { name: 'Dark Purple', value: '#1e1b4b' },
  { name: 'Dark Green', value: '#14532d' },
  { name: 'Dark Wine', value: '#4c0519' },
  { name: 'Dark Blue', value: '#172554' },
  { name: 'Dark Teal', value: '#134e4a' },
  { name: 'Midnight', value: '#111827' },
  { name: 'Dark Brown', value: '#451a03' },
  { name: 'Dark Slate', value: '#0f172a' },
  { name: 'True Black', value: '#09090b' },
];

function DashboardLayout({ children, navItems = [], brandTitle = 'NEHR', roleBadge = '' }) {
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
    return saved ? JSON.parse(saved) : { primary: '#4361ee', sidebar: '#1e293b' };
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
    const r = parseInt(themeColors.primary.slice(1, 3), 16);
    const g = parseInt(themeColors.primary.slice(3, 5), 16);
    const b = parseInt(themeColors.primary.slice(5, 7), 16);
    document.documentElement.style.setProperty('--dash-primary-light', `rgba(${r},${g},${b},0.08)`);
    document.documentElement.style.setProperty('--dash-sidebar-active', themeColors.primary);
    localStorage.setItem('dashboard_theme', JSON.stringify(themeColors));
  }, [themeColors]);

  useEffect(() => {
    localStorage.setItem('dashboard_dark_mode', String(darkMode));
  }, [darkMode]);

  const applyPreset = (preset) => {
    setThemeColors({ primary: preset.primary, sidebar: preset.sidebar });
  };

  const applySidebarColor = (color) => {
    setThemeColors(prev => ({ ...prev, sidebar: color }));
  };

  const toggleCollapse = () => {
    const next = !sidebarCollapsed;
    setSidebarCollapsed(next);
    localStorage.setItem('sidebar_collapsed', String(next));
  };

  const displayName = user?.full_name || user?.username || 'User';
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const userRole = user?.role_display || user?.role || 'User';

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
          <div className="user-avatar">{initials}</div>
          <div className="user-info">
            <h6>{displayName}</h6>
            <small>{roleBadge || userRole}</small>
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
                <div className="user-avatar-sm">{initials}</div>
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
                      <div style={{
                        width: '44px', height: '44px', borderRadius: '50%', background: 'linear-gradient(135deg, #667eea, #764ba2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: '16px'
                      }}>
                        {initials}
                      </div>
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
                setThemeColors({ primary: '#4361ee', sidebar: '#1e293b' });
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
                      className={`color-swatch ${themeColors.primary === preset.primary ? 'active' : ''}`}
                      style={{ background: preset.primary }}
                      onClick={() => applyPreset(preset)}
                      title={preset.name}
                    ></div>
                  ))}
                </div>
              </div>
              <div className="color-theme-section">
                <label>Sidebar Background</label>
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
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default DashboardLayout;

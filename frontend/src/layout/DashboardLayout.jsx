import React, { useState, useRef, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../assets/css/dashboard.css';

function DashboardLayout({ children, navItems = [], brandTitle = 'NEHR', roleBadge = '' }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef(null);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const displayName = user?.full_name || user?.username || 'User';
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const userRole = user?.role_display || user?.role || 'User';

  return (
    <div className="dashboard-wrapper">
      {/* Mobile overlay */}
      <div
        className={`dash-sidebar-overlay ${sidebarOpen ? 'active' : ''}`}
        onClick={() => setSidebarOpen(false)}
      ></div>

      {/* Sidebar */}
      <aside className={`dash-sidebar ${sidebarOpen ? 'open' : ''}`}>
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
                    >
                      <i className={item.icon}></i>
                      {item.text}
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
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <div className="dash-main">
        {/* Header */}
        <header className="dash-header">
          <div className="dash-header-left">
            <button className="dash-menu-toggle" onClick={() => setSidebarOpen(!sidebarOpen)}>
              <i className="fas fa-bars"></i>
            </button>
          </div>
          <div className="dash-header-right">
            <button className="dash-header-btn" title="Notifications">
              <i className="fas fa-bell"></i>
              <span className="notification-dot"></span>
            </button>

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
    </div>
  );
}

export default DashboardLayout;

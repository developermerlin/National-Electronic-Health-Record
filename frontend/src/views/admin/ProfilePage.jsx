import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layout/DashboardLayout';
import { getNavForUser, getBrandForUser, getRoleBadge } from '../../utils/navItems';

function ProfilePage() {
  const { apiCall, user } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('personal');
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  const [formData, setFormData] = useState({
    full_name: '',
    phone: '',
    about: '',
    gender: '',
    country: '',
    city: '',
    state: '',
    address: '',
  });

  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const [notifPrefs, setNotifPrefs] = useState({
    sms_notifications_enabled: false,
    email_notifications_enabled: true,
  });

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await apiCall('/user/my-profile/');
      const data = await response.json();
      if (response.ok) {
        setProfileData(data);
        setFormData({
          full_name: data.user.full_name || '',
          phone: data.user.phone || '',
          about: data.profile.about || '',
          gender: data.profile.gender || '',
          country: data.profile.country || '',
          city: data.profile.city || '',
          state: data.profile.state || '',
          address: data.profile.address || '',
        });
        setNotifPrefs({
          sms_notifications_enabled: !!data.user.sms_notifications_enabled,
          email_notifications_enabled: data.user.email_notifications_enabled !== false,
        });
      }
    } catch {
      console.error('Error fetching profile');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSuccessMsg('');
    setErrorMsg('');
    try {
      const response = await apiCall('/user/my-profile/', {
        method: 'PUT',
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        setSuccessMsg('Profile updated successfully!');
        fetchProfile();
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        const data = await response.json();
        setErrorMsg(data.error || 'Failed to update profile');
      }
    } catch {
      setErrorMsg('Error updating profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setSuccessMsg('');
    setErrorMsg('');

    if (passwordData.new_password !== passwordData.confirm_password) {
      setErrorMsg('New passwords do not match');
      return;
    }
    if (passwordData.new_password.length < 8) {
      setErrorMsg('New password must be at least 8 characters');
      return;
    }

    setSaving(true);
    try {
      const response = await apiCall('/user/my-profile/', {
        method: 'PUT',
        body: JSON.stringify({
          current_password: passwordData.current_password,
          new_password: passwordData.new_password,
        }),
      });
      if (response.ok) {
        setSuccessMsg('Password changed successfully!');
        setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
        setTimeout(() => setSuccessMsg(''), 3000);
      } else {
        const data = await response.json();
        setErrorMsg(data.error || 'Failed to change password');
      }
    } catch {
      setErrorMsg('Error changing password');
    } finally {
      setSaving(false);
    }
  };

  const displayName = profileData?.user?.full_name || user?.full_name || 'User';
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  if (loading) {
    return (
      <DashboardLayout navItems={getNavForUser(user)} brandTitle={getBrandForUser(user)} roleBadge={getRoleBadge(user)}>
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '60vh' }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  const userData = profileData?.user || {};

  return (
    <DashboardLayout navItems={getNavForUser(user)} brandTitle={getBrandForUser(user)} roleBadge={getRoleBadge(user)}>
      <div className="container-fluid py-4">
        {/* Success / Error Messages */}
        {successMsg && (
          <div className="alert alert-success alert-dismissible fade show" role="alert">
            <i className="fas fa-check-circle me-2"></i>{successMsg}
            <button type="button" className="btn-close" onClick={() => setSuccessMsg('')}></button>
          </div>
        )}
        {errorMsg && (
          <div className="alert alert-danger alert-dismissible fade show" role="alert">
            <i className="fas fa-exclamation-circle me-2"></i>{errorMsg}
            <button type="button" className="btn-close" onClick={() => setErrorMsg('')}></button>
          </div>
        )}

        {/* Profile Header Card */}
        <div className="card border-0 shadow-sm mb-4" style={{ overflow: 'hidden' }}>
          <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            padding: '40px 30px 60px',
          }}></div>
          <div className="card-body" style={{ marginTop: '-50px', position: 'relative' }}>
            <div className="d-flex flex-wrap align-items-end gap-4">
              <div style={{
                width: '100px', height: '100px', borderRadius: '50%',
                background: 'linear-gradient(135deg, #667eea, #764ba2)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: 700, fontSize: '36px',
                border: '4px solid #fff', boxShadow: '0 4px 15px rgba(0,0,0,0.15)',
              }}>
                {initials}
              </div>
              <div className="flex-grow-1">
                <h3 className="mb-1">{userData.full_name}</h3>
                <div className="d-flex flex-wrap gap-2 align-items-center">
                  <span className="badge" style={{
                    backgroundColor: '#667eea20', color: '#667eea',
                    padding: '6px 14px', fontSize: '13px', fontWeight: 600
                  }}>
                    <i className="fas fa-user-tag me-1"></i>
                    {userData.role_display || userData.role || 'No role'}
                  </span>
                  <span className="text-muted">
                    <i className="fas fa-envelope me-1"></i>{userData.email}
                  </span>
                  {userData.phone && (
                    <span className="text-muted">
                      <i className="fas fa-phone me-1"></i>{userData.phone}
                    </span>
                  )}
                </div>
              </div>
              <div className="text-end">
                <small className="text-muted d-block">
                  <i className="fas fa-calendar me-1"></i>
                  Joined {new Date(userData.date_joined).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                </small>
                {userData.last_login && (
                  <small className="text-muted d-block">
                    <i className="fas fa-clock me-1"></i>
                    Last login {new Date(userData.last_login).toLocaleString()}
                  </small>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Info Cards Row */}
        <div className="row g-3 mb-4">
          {userData.hospital && (
            <div className="col-md-4">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body d-flex align-items-center">
                  <div className="rounded-circle bg-success bg-opacity-10 p-3 me-3">
                    <i className="fas fa-hospital text-success" style={{ fontSize: '20px' }}></i>
                  </div>
                  <div>
                    <small className="text-muted d-block">Hospital</small>
                    <strong>{userData.hospital}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}
          {userData.department && (
            <div className="col-md-4">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body d-flex align-items-center">
                  <div className="rounded-circle bg-info bg-opacity-10 p-3 me-3">
                    <i className="fas fa-door-open text-info" style={{ fontSize: '20px' }}></i>
                  </div>
                  <div>
                    <small className="text-muted d-block">Department</small>
                    <strong>{userData.department}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}
          {userData.district && (
            <div className="col-md-4">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body d-flex align-items-center">
                  <div className="rounded-circle bg-warning bg-opacity-10 p-3 me-3">
                    <i className="fas fa-map-marked-alt text-warning" style={{ fontSize: '20px' }}></i>
                  </div>
                  <div>
                    <small className="text-muted d-block">District</small>
                    <strong>{userData.district}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}
          {userData.employee_id && (
            <div className="col-md-4">
              <div className="card border-0 shadow-sm h-100">
                <div className="card-body d-flex align-items-center">
                  <div className="rounded-circle bg-primary bg-opacity-10 p-3 me-3">
                    <i className="fas fa-id-badge text-primary" style={{ fontSize: '20px' }}></i>
                  </div>
                  <div>
                    <small className="text-muted d-block">Employee ID</small>
                    <strong>{userData.employee_id}</strong>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="card border-0 shadow-sm">
          <div className="card-header bg-white border-0">
            <ul className="nav nav-tabs card-header-tabs">
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === 'personal' ? 'active' : ''}`}
                  onClick={() => setActiveTab('personal')}
                  style={{ cursor: 'pointer', fontWeight: activeTab === 'personal' ? 600 : 400 }}
                >
                  <i className="fas fa-user me-2"></i>Personal Information
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === 'security' ? 'active' : ''}`}
                  onClick={() => setActiveTab('security')}
                  style={{ cursor: 'pointer', fontWeight: activeTab === 'security' ? 600 : 400 }}
                >
                  <i className="fas fa-lock me-2"></i>Security
                </button>
              </li>
              <li className="nav-item">
                <button
                  className={`nav-link ${activeTab === 'notifications' ? 'active' : ''}`}
                  onClick={() => setActiveTab('notifications')}
                  style={{ cursor: 'pointer', fontWeight: activeTab === 'notifications' ? 600 : 400 }}
                >
                  <i className="fas fa-bell me-2"></i>Notifications
                </button>
              </li>
            </ul>
          </div>

          <div className="card-body">
            {/* Personal Information Tab */}
            {activeTab === 'personal' && (
              <form onSubmit={handleUpdateProfile}>
                <div className="row g-4">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">
                      <i className="fas fa-user me-1 text-primary"></i>Full Name
                    </label>
                    <input type="text" className="form-control" value={formData.full_name}
                      onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                      placeholder="Enter your full name" />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">
                      <i className="fas fa-phone me-1 text-primary"></i>Phone Number
                    </label>
                    <input type="tel" className="form-control" value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      placeholder="Enter phone number" />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">
                      <i className="fas fa-venus-mars me-1 text-primary"></i>Gender
                    </label>
                    <select className="form-select" value={formData.gender}
                      onChange={(e) => setFormData({ ...formData, gender: e.target.value })}>
                      <option value="">Select Gender</option>
                      <option value="Male">Male</option>
                      <option value="Female">Female</option>
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">
                      <i className="fas fa-flag me-1 text-primary"></i>Country
                    </label>
                    <input type="text" className="form-control" value={formData.country}
                      onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                      placeholder="e.g. Ghana" />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">
                      <i className="fas fa-map me-1 text-primary"></i>State / Region
                    </label>
                    <input type="text" className="form-control" value={formData.state}
                      onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                      placeholder="e.g. Ashanti Region" />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">
                      <i className="fas fa-city me-1 text-primary"></i>City / Town
                    </label>
                    <input type="text" className="form-control" value={formData.city}
                      onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                      placeholder="e.g. Kumasi" />
                  </div>
                  <div className="col-md-12">
                    <label className="form-label fw-semibold">
                      <i className="fas fa-map-marker-alt me-1 text-primary"></i>Address
                    </label>
                    <input type="text" className="form-control" value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Enter your full address" />
                  </div>
                  <div className="col-md-12">
                    <label className="form-label fw-semibold">
                      <i className="fas fa-info-circle me-1 text-primary"></i>About Me
                    </label>
                    <textarea className="form-control" rows="3" value={formData.about}
                      onChange={(e) => setFormData({ ...formData, about: e.target.value })}
                      placeholder="Tell us a little about yourself..." />
                  </div>
                  <div className="col-12">
                    <hr />
                    <button type="submit" className="btn btn-primary px-4" disabled={saving}>
                      {saving ? (
                        <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</>
                      ) : (
                        <><i className="fas fa-save me-2"></i>Save Changes</>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Security Tab */}
            {activeTab === 'security' && (
              <form onSubmit={handleChangePassword}>
                <div className="row g-4">
                  <div className="col-md-12">
                    <div className="alert alert-info border-0">
                      <i className="fas fa-shield-alt me-2"></i>
                      To change your password, enter your current password and choose a new one.
                    </div>
                  </div>
                  <div className="col-md-12">
                    <label className="form-label fw-semibold">
                      <i className="fas fa-key me-1 text-primary"></i>Current Password
                    </label>
                    <input type="password" className="form-control" value={passwordData.current_password}
                      onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                      placeholder="Enter current password" required />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">
                      <i className="fas fa-lock me-1 text-primary"></i>New Password
                    </label>
                    <input type="password" className="form-control" value={passwordData.new_password}
                      onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                      placeholder="Enter new password" required minLength="8" />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">
                      <i className="fas fa-lock me-1 text-primary"></i>Confirm New Password
                    </label>
                    <input type="password" className="form-control" value={passwordData.confirm_password}
                      onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                      placeholder="Confirm new password" required minLength="8" />
                    {passwordData.new_password && passwordData.confirm_password && passwordData.new_password !== passwordData.confirm_password && (
                      <small className="text-danger mt-1 d-block">
                        <i className="fas fa-times-circle me-1"></i>Passwords do not match
                      </small>
                    )}
                  </div>
                  <div className="col-12">
                    <hr />
                    <button type="submit" className="btn btn-danger px-4" disabled={saving}>
                      {saving ? (
                        <><span className="spinner-border spinner-border-sm me-2"></span>Changing...</>
                      ) : (
                        <><i className="fas fa-key me-2"></i>Change Password</>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
              <form onSubmit={async (e) => {
                e.preventDefault();
                setSaving(true);
                setSuccessMsg('');
                setErrorMsg('');
                try {
                  const response = await apiCall('/user/my-profile/', {
                    method: 'PUT',
                    body: JSON.stringify(notifPrefs),
                  });
                  if (response.ok) {
                    setSuccessMsg('Notification preferences updated!');
                    setTimeout(() => setSuccessMsg(''), 3000);
                  } else {
                    setErrorMsg('Failed to update preferences');
                  }
                } catch {
                  setErrorMsg('Error updating preferences');
                } finally {
                  setSaving(false);
                }
              }}>
                <div className="row g-4">
                  <div className="col-md-12">
                    <div className="alert alert-info border-0">
                      <i className="fas fa-info-circle me-2"></i>
                      Choose how you want to receive notifications when you get new messages.
                    </div>
                  </div>

                  {/* SMS Toggle */}
                  <div className="col-md-12">
                    <div className="card border" style={{ borderRadius: '10px' }}>
                      <div className="card-body d-flex justify-content-between align-items-center">
                        <div style={{ flex: 1 }}>
                          <div className="d-flex align-items-center mb-2">
                            <div style={{
                              width: '44px', height: '44px', borderRadius: '10px',
                              background: '#eef2ff', color: '#4361ee',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '20px', marginRight: '14px',
                            }}>
                              <i className="fas fa-mobile-alt"></i>
                            </div>
                            <div>
                              <h6 className="mb-0" style={{ fontWeight: 600 }}>SMS Notifications</h6>
                              <small className="text-muted">Receive a text message when you get a new in-app message</small>
                            </div>
                          </div>
                          <small className="text-muted d-block" style={{ marginLeft: '58px' }}>
                            <i className="fas fa-phone me-1"></i>
                            Phone: <strong>{formData.phone || 'Not set'}</strong>
                            {!formData.phone && <span className="text-danger ms-2">(Add phone number in Personal Info tab)</span>}
                          </small>
                        </div>
                        <div className="form-check form-switch" style={{ fontSize: '24px' }}>
                          <input
                            type="checkbox"
                            className="form-check-input"
                            role="switch"
                            checked={notifPrefs.sms_notifications_enabled}
                            onChange={(e) => setNotifPrefs({ ...notifPrefs, sms_notifications_enabled: e.target.checked })}
                            disabled={!formData.phone}
                            style={{ cursor: formData.phone ? 'pointer' : 'not-allowed' }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Email Toggle */}
                  <div className="col-md-12">
                    <div className="card border" style={{ borderRadius: '10px' }}>
                      <div className="card-body d-flex justify-content-between align-items-center">
                        <div style={{ flex: 1 }}>
                          <div className="d-flex align-items-center mb-2">
                            <div style={{
                              width: '44px', height: '44px', borderRadius: '10px',
                              background: '#ecfdf5', color: '#059669',
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '20px', marginRight: '14px',
                            }}>
                              <i className="fas fa-envelope"></i>
                            </div>
                            <div>
                              <h6 className="mb-0" style={{ fontWeight: 600 }}>Email Notifications</h6>
                              <small className="text-muted">Receive an email when you get a new in-app message</small>
                            </div>
                          </div>
                          <small className="text-muted d-block" style={{ marginLeft: '58px' }}>
                            <i className="fas fa-at me-1"></i>
                            Email: <strong>{profileData?.user?.email || '-'}</strong>
                          </small>
                        </div>
                        <div className="form-check form-switch" style={{ fontSize: '24px' }}>
                          <input
                            type="checkbox"
                            className="form-check-input"
                            role="switch"
                            checked={notifPrefs.email_notifications_enabled}
                            onChange={(e) => setNotifPrefs({ ...notifPrefs, email_notifications_enabled: e.target.checked })}
                            style={{ cursor: 'pointer' }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="col-12">
                    <hr />
                    <button type="submit" className="btn btn-primary px-4" disabled={saving}>
                      {saving ? (
                        <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</>
                      ) : (
                        <><i className="fas fa-save me-2"></i>Save Preferences</>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default ProfilePage;

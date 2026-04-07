import React from 'react';
import DashboardLayout from '../../layout/DashboardLayout';

const navItems = [
  {
    label: 'Main',
    items: [
      { path: '/receptionist/dashboard', icon: 'fas fa-tachometer-alt', text: 'Dashboard' },
      { path: '/receptionist/patients', icon: 'fas fa-user-injured', text: 'Patients', badge: 'New' },
      { path: '/receptionist/appointments', icon: 'fas fa-calendar-check', text: 'Appointments' },
      { path: '/receptionist/register', icon: 'fas fa-user-plus', text: 'Register Patient' },
    ]
  },
  {
    label: 'Management',
    items: [
      { path: '/receptionist/queue', icon: 'fas fa-list-ol', text: 'Patient Queue' },
      { path: '/receptionist/billing', icon: 'fas fa-file-invoice-dollar', text: 'Billing' },
      { path: '/receptionist/reports', icon: 'fas fa-chart-bar', text: 'Reports' },
    ]
  },
  {
    label: 'Account',
    items: [
      { path: '/receptionist/profile', icon: 'fas fa-user-circle', text: 'My Profile' },
    ]
  }
];

function ReceptDashboard() {
  return (
    <DashboardLayout navItems={navItems} brandTitle="NEHR System" roleBadge="Receptionist">

      {/* Welcome Banner */}
      <div className="dash-welcome-banner">
        <h3>Welcome back, Receptionist!</h3>
        <p>Here is an overview of today's front desk activity. Manage patient registrations, appointments, and queue efficiently.</p>
      </div>

      {/* Stat Cards Row */}
      <div className="row g-4 mb-4">
        <div className="col-xl-3 col-md-6">
          <div className="dash-stat-card">
            <div className="stat-icon bg-primary-soft">
              <i className="fas fa-user-plus"></i>
            </div>
            <div className="stat-label">New Registrations</div>
            <div className="stat-value">24</div>
            <div className="stat-change positive">
              <i className="fas fa-arrow-up"></i> 12% from yesterday
            </div>
          </div>
        </div>
        <div className="col-xl-3 col-md-6">
          <div className="dash-stat-card">
            <div className="stat-icon bg-success-soft">
              <i className="fas fa-calendar-check"></i>
            </div>
            <div className="stat-label">Today's Appointments</div>
            <div className="stat-value">58</div>
            <div className="stat-change positive">
              <i className="fas fa-arrow-up"></i> 8% from last week
            </div>
          </div>
        </div>
        <div className="col-xl-3 col-md-6">
          <div className="dash-stat-card">
            <div className="stat-icon bg-warning-soft">
              <i className="fas fa-clock"></i>
            </div>
            <div className="stat-label">In Waiting Queue</div>
            <div className="stat-value">12</div>
            <div className="stat-change negative">
              <i className="fas fa-arrow-down"></i> 3 less than avg
            </div>
          </div>
        </div>
        <div className="col-xl-3 col-md-6">
          <div className="dash-stat-card">
            <div className="stat-icon bg-info-soft">
              <i className="fas fa-check-circle"></i>
            </div>
            <div className="stat-label">Checked In Today</div>
            <div className="stat-value">41</div>
            <div className="stat-change positive">
              <i className="fas fa-arrow-up"></i> On track
            </div>
          </div>
        </div>
      </div>

      {/* Main content row */}
      <div className="row g-4 mb-4">
        {/* Upcoming Appointments */}
        <div className="col-xl-8">
          <div className="dash-card">
            <div className="dash-card-header">
              <h6>Upcoming Appointments</h6>
              <div className="card-actions">
                <button className="active">Today</button>
                <button>This Week</button>
              </div>
            </div>
            <div className="dash-card-body" style={{padding: 0}}>
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Time</th>
                    <th>Doctor</th>
                    <th>Department</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>
                      <div className="user-cell">
                        <div className="avatar" style={{background: '#4361ee'}}>JD</div>
                        <div>
                          <div className="user-name">John Doe</div>
                          <div className="user-role">ID: PAT-2024-001</div>
                        </div>
                      </div>
                    </td>
                    <td>9:00 AM</td>
                    <td>Dr. Smith</td>
                    <td>General Medicine</td>
                    <td><span className="dash-badge dash-badge-success">Checked In</span></td>
                  </tr>
                  <tr>
                    <td>
                      <div className="user-cell">
                        <div className="avatar" style={{background: '#2ec4b6'}}>SM</div>
                        <div>
                          <div className="user-name">Sarah Miller</div>
                          <div className="user-role">ID: PAT-2024-015</div>
                        </div>
                      </div>
                    </td>
                    <td>9:30 AM</td>
                    <td>Dr. Johnson</td>
                    <td>Pediatrics</td>
                    <td><span className="dash-badge dash-badge-warning">Waiting</span></td>
                  </tr>
                  <tr>
                    <td>
                      <div className="user-cell">
                        <div className="avatar" style={{background: '#f77f00'}}>RW</div>
                        <div>
                          <div className="user-name">Robert Wilson</div>
                          <div className="user-role">ID: PAT-2024-022</div>
                        </div>
                      </div>
                    </td>
                    <td>10:00 AM</td>
                    <td>Dr. Patel</td>
                    <td>Cardiology</td>
                    <td><span className="dash-badge dash-badge-primary">Scheduled</span></td>
                  </tr>
                  <tr>
                    <td>
                      <div className="user-cell">
                        <div className="avatar" style={{background: '#e63946'}}>LB</div>
                        <div>
                          <div className="user-name">Lisa Brown</div>
                          <div className="user-role">ID: PAT-2024-034</div>
                        </div>
                      </div>
                    </td>
                    <td>10:30 AM</td>
                    <td>Dr. Adams</td>
                    <td>Dermatology</td>
                    <td><span className="dash-badge dash-badge-primary">Scheduled</span></td>
                  </tr>
                  <tr>
                    <td>
                      <div className="user-cell">
                        <div className="avatar" style={{background: '#7c3aed'}}>MK</div>
                        <div>
                          <div className="user-name">Michael King</div>
                          <div className="user-role">ID: PAT-2024-041</div>
                        </div>
                      </div>
                    </td>
                    <td>11:00 AM</td>
                    <td>Dr. Lee</td>
                    <td>Orthopedics</td>
                    <td><span className="dash-badge dash-badge-primary">Scheduled</span></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Quick Actions + Recent Activity */}
        <div className="col-xl-4">
          <div className="dash-card" style={{marginBottom: '24px'}}>
            <div className="dash-card-header">
              <h6>Quick Actions</h6>
            </div>
            <div className="dash-card-body">
              <div className="dash-quick-actions">
                <a href="#!" className="dash-quick-action-btn">
                  <i className="fas fa-user-plus"></i>
                  <span>Register Patient</span>
                </a>
                <a href="#!" className="dash-quick-action-btn">
                  <i className="fas fa-calendar-plus"></i>
                  <span>New Appointment</span>
                </a>
                <a href="#!" className="dash-quick-action-btn">
                  <i className="fas fa-search"></i>
                  <span>Find Patient</span>
                </a>
                <a href="#!" className="dash-quick-action-btn">
                  <i className="fas fa-print"></i>
                  <span>Print Queue</span>
                </a>
              </div>
            </div>
          </div>

          <div className="dash-card">
            <div className="dash-card-header">
              <h6>Recent Activity</h6>
            </div>
            <div className="dash-card-body">
              <div className="dash-activity-item">
                <div className="dash-activity-icon bg-primary-soft" style={{background: '#eef2ff', color: '#4361ee'}}>
                  <i className="fas fa-user-plus"></i>
                </div>
                <div className="dash-activity-content">
                  <h6>New patient registered</h6>
                  <p>Emily Davis - PAT-2024-052</p>
                  <small>5 minutes ago</small>
                </div>
              </div>
              <div className="dash-activity-item">
                <div className="dash-activity-icon" style={{background: '#ecfdf5', color: '#059669'}}>
                  <i className="fas fa-check"></i>
                </div>
                <div className="dash-activity-content">
                  <h6>Patient checked in</h6>
                  <p>John Doe - Appointment with Dr. Smith</p>
                  <small>12 minutes ago</small>
                </div>
              </div>
              <div className="dash-activity-item">
                <div className="dash-activity-icon" style={{background: '#fff7ed', color: '#d97706'}}>
                  <i className="fas fa-calendar-alt"></i>
                </div>
                <div className="dash-activity-content">
                  <h6>Appointment rescheduled</h6>
                  <p>Mark Taylor - Moved to 2:30 PM</p>
                  <small>25 minutes ago</small>
                </div>
              </div>
              <div className="dash-activity-item">
                <div className="dash-activity-icon" style={{background: '#fef2f2', color: '#dc2626'}}>
                  <i className="fas fa-times-circle"></i>
                </div>
                <div className="dash-activity-content">
                  <h6>Appointment cancelled</h6>
                  <p>Jane Cooper - No show</p>
                  <small>1 hour ago</small>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom row */}
      <div className="row g-4">
        {/* Department Queue */}
        <div className="col-xl-6">
          <div className="dash-card">
            <div className="dash-card-header">
              <h6>Department Queue Status</h6>
            </div>
            <div className="dash-card-body">
              <div style={{marginBottom: '16px'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '6px'}}>
                  <span style={{fontSize: '14px', fontWeight: 500}}>General Medicine</span>
                  <span style={{fontSize: '13px', color: '#6c757d'}}>8 patients</span>
                </div>
                <div className="dash-progress">
                  <div className="dash-progress-bar" style={{width: '80%', background: '#4361ee'}}></div>
                </div>
              </div>
              <div style={{marginBottom: '16px'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '6px'}}>
                  <span style={{fontSize: '14px', fontWeight: 500}}>Pediatrics</span>
                  <span style={{fontSize: '13px', color: '#6c757d'}}>5 patients</span>
                </div>
                <div className="dash-progress">
                  <div className="dash-progress-bar" style={{width: '50%', background: '#2ec4b6'}}></div>
                </div>
              </div>
              <div style={{marginBottom: '16px'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '6px'}}>
                  <span style={{fontSize: '14px', fontWeight: 500}}>Cardiology</span>
                  <span style={{fontSize: '13px', color: '#6c757d'}}>3 patients</span>
                </div>
                <div className="dash-progress">
                  <div className="dash-progress-bar" style={{width: '30%', background: '#f77f00'}}></div>
                </div>
              </div>
              <div style={{marginBottom: '16px'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '6px'}}>
                  <span style={{fontSize: '14px', fontWeight: 500}}>Dermatology</span>
                  <span style={{fontSize: '13px', color: '#6c757d'}}>2 patients</span>
                </div>
                <div className="dash-progress">
                  <div className="dash-progress-bar" style={{width: '20%', background: '#e63946'}}></div>
                </div>
              </div>
              <div>
                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '6px'}}>
                  <span style={{fontSize: '14px', fontWeight: 500}}>Orthopedics</span>
                  <span style={{fontSize: '13px', color: '#6c757d'}}>4 patients</span>
                </div>
                <div className="dash-progress">
                  <div className="dash-progress-bar" style={{width: '40%', background: '#7c3aed'}}></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Today's Summary */}
        <div className="col-xl-6">
          <div className="dash-card">
            <div className="dash-card-header">
              <h6>Today's Summary</h6>
            </div>
            <div className="dash-card-body" style={{padding: 0}}>
              <table className="dash-table">
                <thead>
                  <tr>
                    <th>Metric</th>
                    <th>Count</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td><strong>Total Appointments</strong></td>
                    <td>58</td>
                    <td><span className="dash-badge dash-badge-primary">Scheduled</span></td>
                  </tr>
                  <tr>
                    <td><strong>Patients Checked In</strong></td>
                    <td>41</td>
                    <td><span className="dash-badge dash-badge-success">Completed</span></td>
                  </tr>
                  <tr>
                    <td><strong>Currently Waiting</strong></td>
                    <td>12</td>
                    <td><span className="dash-badge dash-badge-warning">Active</span></td>
                  </tr>
                  <tr>
                    <td><strong>No Shows</strong></td>
                    <td>3</td>
                    <td><span className="dash-badge dash-badge-danger">Missed</span></td>
                  </tr>
                  <tr>
                    <td><strong>New Registrations</strong></td>
                    <td>24</td>
                    <td><span className="dash-badge dash-badge-info">Today</span></td>
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

export default ReceptDashboard;

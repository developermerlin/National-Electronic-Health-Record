import React from 'react';
import DashboardLayout from '../../layout/DashboardLayout';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler } from 'chart.js';
import { Doughnut, Bar, Line } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler);

const navItems = [
  {
    label: 'Main',
    items: [
      { path: '/receptionist/dashboard', icon: 'fas fa-tachometer-alt', text: 'Dashboard' },
      { path: '/receptionist/patients', icon: 'fas fa-user-injured', text: 'Patients' },
      { path: '/receptionist/patients/register', icon: 'fas fa-user-plus', text: 'Register Patient' },
    ]
  },
  {
    label: 'Management',
    items: [
      { path: '/receptionist/appointments', icon: 'fas fa-calendar-check', text: 'Appointments' },
      { path: '/receptionist/queue', icon: 'fas fa-list-ol', text: 'Patient Queue' },
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

      {/* Charts Row */}
      <div className="row g-4 mb-4">
        {/* Department Queue - Bar Chart */}
        <div className="col-xl-4 col-md-6">
          <div className="dash-card">
            <div className="dash-card-header">
              <h6>Department Queue Status</h6>
            </div>
            <div className="dash-card-body">
              <div style={{position: 'relative', height: '280px'}}>
                <Bar
                  data={{
                    labels: ['General Medicine', 'Pediatrics', 'Orthopedics', 'Cardiology', 'Dermatology'],
                    datasets: [{
                      label: 'Patients Waiting',
                      data: [8, 5, 4, 3, 2],
                      backgroundColor: [
                        'rgba(67, 97, 238, 0.7)',
                        'rgba(46, 196, 182, 0.7)',
                        'rgba(124, 58, 237, 0.7)',
                        'rgba(247, 127, 0, 0.7)',
                        'rgba(230, 57, 70, 0.7)',
                      ],
                      borderColor: ['#4361ee', '#2ec4b6', '#7c3aed', '#f77f00', '#e63946'],
                      borderWidth: 1,
                      borderRadius: 6,
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    indexAxis: 'y',
                    plugins: {
                      legend: { display: false },
                      tooltip: { backgroundColor: '#1d2939', titleFont: { size: 13 }, bodyFont: { size: 12 }, padding: 10, cornerRadius: 8 }
                    },
                    scales: {
                      x: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 11 } }, grid: { color: 'rgba(0,0,0,0.05)' } },
                      y: { ticks: { font: { size: 11 } }, grid: { display: false } }
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Today's Summary - Doughnut */}
        <div className="col-xl-4 col-md-6">
          <div className="dash-card">
            <div className="dash-card-header">
              <h6>Today's Summary</h6>
            </div>
            <div className="dash-card-body">
              <div style={{position: 'relative', height: '280px'}}>
                <Doughnut
                  data={{
                    labels: ['Checked In', 'Waiting', 'Scheduled', 'No Shows'],
                    datasets: [{
                      data: [41, 12, 5, 3],
                      backgroundColor: ['#059669', '#f77f00', '#4361ee', '#e63946'],
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
            </div>
          </div>
        </div>

        {/* Weekly Appointment Trend - Line Chart */}
        <div className="col-xl-4 col-md-12">
          <div className="dash-card">
            <div className="dash-card-header">
              <h6>Weekly Appointment Trend</h6>
            </div>
            <div className="dash-card-body">
              <div style={{position: 'relative', height: '280px'}}>
                <Line
                  data={{
                    labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
                    datasets: [
                      {
                        label: 'Appointments',
                        data: [45, 52, 49, 58, 55, 30, 18],
                        borderColor: '#4361ee',
                        backgroundColor: 'rgba(67, 97, 238, 0.1)',
                        tension: 0.4,
                        fill: true,
                        pointBackgroundColor: '#4361ee',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 5,
                      },
                      {
                        label: 'Check-Ins',
                        data: [38, 45, 42, 50, 48, 25, 12],
                        borderColor: '#059669',
                        backgroundColor: 'rgba(5, 150, 105, 0.1)',
                        tension: 0.4,
                        fill: true,
                        pointBackgroundColor: '#059669',
                        pointBorderColor: '#fff',
                        pointBorderWidth: 2,
                        pointRadius: 5,
                      }
                    ]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: 'top', labels: { padding: 12, usePointStyle: true, pointStyleWidth: 8, font: { size: 12 } } },
                      tooltip: { backgroundColor: '#1d2939', titleFont: { size: 13 }, bodyFont: { size: 12 }, padding: 10, cornerRadius: 8 }
                    },
                    scales: {
                      y: { beginAtZero: true, ticks: { font: { size: 11 } }, grid: { color: 'rgba(0,0,0,0.05)' } },
                      x: { ticks: { font: { size: 11 } }, grid: { display: false } }
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Registration & Patient Flow Row */}
      <div className="row g-4">
        {/* Daily Patient Flow - Bar Chart */}
        <div className="col-xl-6">
          <div className="dash-card">
            <div className="dash-card-header">
              <h6>Daily Patient Flow</h6>
            </div>
            <div className="dash-card-body">
              <div style={{position: 'relative', height: '280px'}}>
                <Bar
                  data={{
                    labels: ['8 AM', '9 AM', '10 AM', '11 AM', '12 PM', '1 PM', '2 PM', '3 PM', '4 PM'],
                    datasets: [
                      {
                        label: 'Arrivals',
                        data: [5, 12, 9, 8, 4, 6, 10, 7, 3],
                        backgroundColor: 'rgba(67, 97, 238, 0.7)',
                        borderColor: '#4361ee',
                        borderWidth: 1,
                        borderRadius: 4,
                      },
                      {
                        label: 'Checked Out',
                        data: [2, 4, 8, 7, 6, 3, 5, 8, 6],
                        backgroundColor: 'rgba(5, 150, 105, 0.7)',
                        borderColor: '#059669',
                        borderWidth: 1,
                        borderRadius: 4,
                      }
                    ]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: { position: 'top', labels: { padding: 12, usePointStyle: true, pointStyleWidth: 8, font: { size: 12 } } },
                      tooltip: { backgroundColor: '#1d2939', titleFont: { size: 13 }, bodyFont: { size: 12 }, padding: 10, cornerRadius: 8 }
                    },
                    scales: {
                      y: { beginAtZero: true, ticks: { stepSize: 2, font: { size: 11 } }, grid: { color: 'rgba(0,0,0,0.05)' } },
                      x: { ticks: { font: { size: 11 } }, grid: { display: false } }
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* New Registrations Trend - Line Chart */}
        <div className="col-xl-6">
          <div className="dash-card">
            <div className="dash-card-header">
              <h6>Patient Registration Trend</h6>
            </div>
            <div className="dash-card-body">
              <div style={{position: 'relative', height: '280px'}}>
                <Line
                  data={{
                    labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'This Week'],
                    datasets: [{
                      label: 'New Registrations',
                      data: [18, 22, 20, 28, 24],
                      borderColor: '#7c3aed',
                      backgroundColor: 'rgba(124, 58, 237, 0.1)',
                      tension: 0.4,
                      fill: true,
                      pointBackgroundColor: '#7c3aed',
                      pointBorderColor: '#fff',
                      pointBorderWidth: 2,
                      pointRadius: 6,
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
                      y: { beginAtZero: true, ticks: { font: { size: 11 } }, grid: { color: 'rgba(0,0,0,0.05)' } },
                      x: { ticks: { font: { size: 11 } }, grid: { display: false } }
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

    </DashboardLayout>
  );
}

export default ReceptDashboard;

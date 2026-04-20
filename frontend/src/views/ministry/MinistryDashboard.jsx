import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layout/DashboardLayout';
import { getNavForUser, getBrandForUser, getRoleBadge } from '../../utils/navItems';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler, RadialLinearScale } from 'chart.js';
import { Doughnut, Bar, Radar, Pie } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, PointElement, LineElement, Filler, RadialLinearScale);


const hospitalTypeLabels = {
  teaching: 'Teaching Hospital',
  regional: 'Regional Hospital',
  district: 'District Hospital',
  polyclinic: 'Polyclinic',
  health_center: 'Health Center',
  clinic: 'Clinic',
  chps: 'CHPS Compound',
  private: 'Private Hospital',
};

const typeColors = {
  teaching: '#7c3aed',
  regional: '#4361ee',
  district: '#2ec4b6',
  polyclinic: '#f77f00',
  health_center: '#059669',
  clinic: '#e63946',
  chps: '#8338ec',
  private: '#ff006e',
};

function MinistryDashboard() {
  const { apiCall, user } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, []);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const response = await apiCall('/admin/ministry-dashboard/');
      const result = await response.json();
      if (response.ok) {
        setData(result);
      }
    } catch {
      console.error('Error fetching ministry dashboard');
    } finally {
      setLoading(false);
    }
  };

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

  const overview = data?.overview || {};
  const staffByRegion = data?.staff_by_region || [];
  const hospitalsByType = data?.hospitals_by_type || [];
  const hospitalsByOwnership = data?.hospitals_by_ownership || [];
  const hospitalsByLevel = data?.hospitals_by_level || [];
  const usersByRole = data?.users_by_role || [];
  const serviceAvailability = data?.service_availability || [];
  const topHospitalsByStaff = data?.top_hospitals_by_staff || [];
  const approvalBreakdown = data?.approval_breakdown || [];
  const recentHospitals = data?.recent_hospitals || [];
  const _MaxHospitals = Math.max(...staffByRegion.map(r => r.hospital_count), 1);

  // Color palettes
  const roleColors = ['#4361ee', '#7c3aed', '#059669', '#f77f00', '#e63946', '#0891b2', '#8338ec', '#ec4899', '#14b8a6', '#f59e0b'];
  const ownershipColors = { government: '#4361ee', private: '#e63946', ngo: '#059669', faith_based: '#f77f00', military: '#7c3aed' };
  const ownershipLabels = { government: 'Government', private: 'Private', ngo: 'NGO', faith_based: 'Faith-based', military: 'Military' };
  const levelLabels = {
    community: 'Community Health Post', primary: 'Primary Health Center',
    secondary_district: 'District Hospital', secondary_regional: 'Regional Hospital',
    tertiary: 'Tertiary/National', teaching: 'Teaching Hospital',
    specialized: 'Specialized Center', diagnostic: 'Diagnostic Center', rehabilitation: 'Rehabilitation',
  };
  const serviceColors = { Emergency: '#e63946', Laboratory: '#d69e2e', Pharmacy: '#38a169', Radiology: '#0891b2', Maternity: '#ec4899', Surgery: '#dc2626', Ambulance: '#7c3aed' };

  return (
    <DashboardLayout navItems={getNavForUser(user)} brandTitle={getBrandForUser(user)} roleBadge={getRoleBadge(user)}>
      <div className="container-fluid py-4">
        {/* Header */}
        <div className="row mb-4">
          <div className="col-12">
            <h1 className="h3 mb-1">
              <i className="fas fa-flag me-2 text-primary"></i>
              National Health Overview
            </h1>
            <p className="text-muted mb-0">
              Welcome, {user?.full_name || 'Ministry Administrator'} — Real-time health infrastructure analytics
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="row g-3 mb-4">
          <div className="col-xl-2 col-md-4 col-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body text-center py-4">
                <div className="rounded-circle bg-primary bg-opacity-10 d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '56px', height: '56px' }}>
                  <i className="fas fa-globe-africa text-primary" style={{ fontSize: '24px' }}></i>
                </div>
                <h3 className="mb-0">{overview.total_regions || 0}</h3>
                <small className="text-muted">Regions</small>
              </div>
            </div>
          </div>
          <div className="col-xl-2 col-md-4 col-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body text-center py-4">
                <div className="rounded-circle bg-info bg-opacity-10 d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '56px', height: '56px' }}>
                  <i className="fas fa-map-marked-alt text-info" style={{ fontSize: '24px' }}></i>
                </div>
                <h3 className="mb-0">{overview.total_districts || 0}</h3>
                <small className="text-muted">Districts</small>
              </div>
            </div>
          </div>
          <div className="col-xl-2 col-md-4 col-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body text-center py-4">
                <div className="rounded-circle bg-success bg-opacity-10 d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '56px', height: '56px' }}>
                  <i className="fas fa-hospital text-success" style={{ fontSize: '24px' }}></i>
                </div>
                <h3 className="mb-0">{overview.total_hospitals || 0}</h3>
                <small className="text-muted">Hospitals</small>
              </div>
            </div>
          </div>
          <div className="col-xl-2 col-md-4 col-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body text-center py-4">
                <div className="rounded-circle bg-warning bg-opacity-10 d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '56px', height: '56px' }}>
                  <i className="fas fa-door-open text-warning" style={{ fontSize: '24px' }}></i>
                </div>
                <h3 className="mb-0">{overview.total_departments || 0}</h3>
                <small className="text-muted">Departments</small>
              </div>
            </div>
          </div>
          <div className="col-xl-2 col-md-4 col-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body text-center py-4">
                <div className="rounded-circle bg-danger bg-opacity-10 d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '56px', height: '56px' }}>
                  <i className="fas fa-user-md text-danger" style={{ fontSize: '24px' }}></i>
                </div>
                <h3 className="mb-0">{overview.total_staff || 0}</h3>
                <small className="text-muted">Health Workers</small>
              </div>
            </div>
          </div>
          <div className="col-xl-2 col-md-4 col-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-body text-center py-4">
                <div className="rounded-circle bg-secondary bg-opacity-10 d-inline-flex align-items-center justify-content-center mb-3" style={{ width: '56px', height: '56px' }}>
                  <i className="fas fa-users text-secondary" style={{ fontSize: '24px' }}></i>
                </div>
                <h3 className="mb-0">{overview.total_users || 0}</h3>
                <small className="text-muted">Total Users</small>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Row */}
        <div className="row g-4 mb-4">
          {/* Hospitals by Type - Doughnut */}
          <div className="col-xl-4 col-md-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-white border-0 pb-0">
                <h5 className="mb-0">
                  <i className="fas fa-hospital me-2 text-success"></i>
                  Hospitals by Type
                </h5>
              </div>
              <div className="card-body">
                {hospitalsByType.length === 0 ? (
                  <div className="text-center py-4"><p className="text-muted">No hospitals registered yet.</p></div>
                ) : (
                  <div style={{position: 'relative', height: '300px'}}>
                    <Doughnut
                      data={{
                        labels: hospitalsByType.map(h => hospitalTypeLabels[h.hospital_type] || h.hospital_type),
                        datasets: [{
                          data: hospitalsByType.map(h => h.count),
                          backgroundColor: hospitalsByType.map(h => typeColors[h.hospital_type] || '#6c757d'),
                          borderWidth: 2,
                          borderColor: '#fff',
                          hoverOffset: 6,
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        cutout: '55%',
                        plugins: {
                          legend: { position: 'bottom', labels: { padding: 10, usePointStyle: true, pointStyleWidth: 8, font: { size: 11 } } },
                          tooltip: { backgroundColor: '#1d2939', titleFont: { size: 13 }, bodyFont: { size: 12 }, padding: 10, cornerRadius: 8 }
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Staff & Hospitals by Region - Bar */}
          <div className="col-xl-8 col-md-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-white border-0 pb-0">
                <h5 className="mb-0">
                  <i className="fas fa-chart-bar me-2 text-primary"></i>
                  Health Infrastructure by Region
                </h5>
                <small className="text-muted">Hospital and staff distribution across regions</small>
              </div>
              <div className="card-body">
                {staffByRegion.length === 0 ? (
                  <div className="text-center py-5">
                    <i className="fas fa-globe-africa" style={{ fontSize: '48px', color: '#dee2e6', display: 'block', marginBottom: '16px' }}></i>
                    <p className="text-muted">No regional data available yet.</p>
                    <Link to="/admin/regions" className="btn btn-primary btn-sm">
                      <i className="fas fa-plus me-1"></i>Add Regions
                    </Link>
                  </div>
                ) : (
                  <div style={{position: 'relative', height: '300px'}}>
                    <Bar
                      data={{
                        labels: staffByRegion.map(r => r.region),
                        datasets: [
                          {
                            label: 'Hospitals',
                            data: staffByRegion.map(r => r.hospital_count),
                            backgroundColor: 'rgba(67, 97, 238, 0.7)',
                            borderColor: '#4361ee',
                            borderWidth: 1,
                            borderRadius: 4,
                          },
                          {
                            label: 'Staff',
                            data: staffByRegion.map(r => r.staff_count),
                            backgroundColor: 'rgba(5, 150, 105, 0.7)',
                            borderColor: '#059669',
                            borderWidth: 1,
                            borderRadius: 4,
                          },
                          {
                            label: 'Districts',
                            data: staffByRegion.map(r => r.district_count),
                            backgroundColor: 'rgba(8, 145, 178, 0.7)',
                            borderColor: '#0891b2',
                            borderWidth: 1,
                            borderRadius: 4,
                          }
                        ]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { position: 'top', labels: { padding: 16, usePointStyle: true, pointStyleWidth: 8, font: { size: 12 } } },
                          tooltip: { backgroundColor: '#1d2939', titleFont: { size: 13 }, bodyFont: { size: 12 }, padding: 10, cornerRadius: 8 }
                        },
                        scales: {
                          y: { beginAtZero: true, ticks: { font: { size: 11 } }, grid: { color: 'rgba(0,0,0,0.05)' } },
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

        {/* Second Charts Row */}
        <div className="row g-4">
          {/* Regional Comparison Radar */}
          <div className="col-xl-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-white border-0 pb-0">
                <h5 className="mb-0">
                  <i className="fas fa-spider me-2 text-info"></i>
                  Regional Comparison
                </h5>
                <small className="text-muted">Compare resource distribution across regions</small>
              </div>
              <div className="card-body">
                {staffByRegion.length === 0 ? (
                  <div className="text-center py-4"><p className="text-muted">No data available.</p></div>
                ) : (
                  <div style={{position: 'relative', height: '320px'}}>
                    <Radar
                      data={{
                        labels: staffByRegion.map(r => r.region),
                        datasets: [
                          {
                            label: 'Hospitals',
                            data: staffByRegion.map(r => r.hospital_count),
                            backgroundColor: 'rgba(67, 97, 238, 0.15)',
                            borderColor: '#4361ee',
                            borderWidth: 2,
                            pointBackgroundColor: '#4361ee',
                            pointBorderColor: '#fff',
                            pointBorderWidth: 1,
                          },
                          {
                            label: 'Staff',
                            data: staffByRegion.map(r => r.staff_count),
                            backgroundColor: 'rgba(5, 150, 105, 0.15)',
                            borderColor: '#059669',
                            borderWidth: 2,
                            pointBackgroundColor: '#059669',
                            pointBorderColor: '#fff',
                            pointBorderWidth: 1,
                          },
                          {
                            label: 'Districts',
                            data: staffByRegion.map(r => r.district_count),
                            backgroundColor: 'rgba(247, 127, 0, 0.15)',
                            borderColor: '#f77f00',
                            borderWidth: 2,
                            pointBackgroundColor: '#f77f00',
                            pointBorderColor: '#fff',
                            pointBorderWidth: 1,
                          }
                        ]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { position: 'top', labels: { padding: 16, usePointStyle: true, pointStyleWidth: 8, font: { size: 12 } } },
                          tooltip: { backgroundColor: '#1d2939', titleFont: { size: 13 }, bodyFont: { size: 12 }, padding: 10, cornerRadius: 8 }
                        },
                        scales: {
                          r: { beginAtZero: true, ticks: { font: { size: 10 }, backdropColor: 'transparent' }, grid: { color: 'rgba(0,0,0,0.06)' }, pointLabels: { font: { size: 11 } } }
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Facility Type Summary List */}
          <div className="col-xl-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-white border-0 pb-0">
                <h5 className="mb-0">
                  <i className="fas fa-list-alt me-2 text-warning"></i>
                  Facility Type Breakdown
                </h5>
              </div>
              <div className="card-body">
                {hospitalsByType.length === 0 ? (
                  <div className="text-center py-4"><p className="text-muted">No hospitals registered yet.</p></div>
                ) : (
                  <div>
                    {hospitalsByType.map((item, idx) => {
                      const total = hospitalsByType.reduce((sum, h) => sum + h.count, 0) || 1;
                      const pct = ((item.count / total) * 100).toFixed(1);
                      return (
                        <div key={idx} style={{marginBottom: idx < hospitalsByType.length - 1 ? '14px' : 0}}>
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <div className="d-flex align-items-center">
                              <div className="rounded-circle me-2" style={{ width: '10px', height: '10px', backgroundColor: typeColors[item.hospital_type] || '#6c757d' }}></div>
                              <span style={{fontWeight: 500, fontSize: '14px'}}>{hospitalTypeLabels[item.hospital_type] || item.hospital_type}</span>
                            </div>
                            <span style={{fontSize: '13px', color: '#6c757d'}}>{item.count} ({pct}%)</span>
                          </div>
                          <div className="progress" style={{height: '8px'}}>
                            <div className="progress-bar" style={{width: `${pct}%`, backgroundColor: typeColors[item.hospital_type] || '#6c757d', borderRadius: '4px'}}></div>
                          </div>
                        </div>
                      );
                    })}
                    <div className="d-flex justify-content-between align-items-center pt-3 mt-2 border-top">
                      <strong>Total Facilities</strong>
                      <strong>{hospitalsByType.reduce((sum, h) => sum + h.count, 0)}</strong>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bed Capacity & Users Row */}
        <div className="row g-4 mt-0">
          {/* Bed Capacity Stats */}
          <div className="col-xl-3 col-md-6">
            <div className="card border-0 shadow-sm h-100" style={{background: 'linear-gradient(135deg, #4361ee 0%, #7c3aed 100%)', color: '#fff'}}>
              <div className="card-body text-center py-4">
                <i className="fas fa-bed" style={{fontSize: '32px', opacity: 0.85, marginBottom: '12px'}}></i>
                <h2 className="mb-0" style={{fontSize: '36px'}}>{overview.total_beds || 0}</h2>
                <div style={{fontSize: '13px', opacity: 0.85}}>Total Bed Capacity</div>
                <hr style={{borderColor: 'rgba(255,255,255,0.3)', margin: '12px 0'}} />
                <small style={{opacity: 0.85}}>Avg {overview.avg_beds_per_hospital || 0} beds/hospital</small>
              </div>
            </div>
          </div>

          {/* Active vs Inactive Users */}
          <div className="col-xl-3 col-md-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-white border-0 pb-0">
                <h6 className="mb-0">
                  <i className="fas fa-user-check me-2 text-success"></i>User Status
                </h6>
              </div>
              <div className="card-body">
                {(overview.active_users + overview.inactive_users) > 0 ? (
                  <div style={{position: 'relative', height: '180px'}}>
                    <Doughnut
                      data={{
                        labels: ['Active', 'Inactive'],
                        datasets: [{
                          data: [overview.active_users || 0, overview.inactive_users || 0],
                          backgroundColor: ['#059669', '#e63946'],
                          borderWidth: 2,
                          borderColor: '#fff',
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        cutout: '60%',
                        plugins: {
                          legend: { position: 'bottom', labels: { padding: 8, usePointStyle: true, font: { size: 11 } } }
                        }
                      }}
                    />
                  </div>
                ) : <div className="text-center py-3 text-muted small">No data</div>}
              </div>
            </div>
          </div>

          {/* Users by Role */}
          <div className="col-xl-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-white border-0 pb-0">
                <h6 className="mb-0">
                  <i className="fas fa-users-cog me-2 text-primary"></i>Users by Role
                </h6>
                <small className="text-muted">Distribution of users across system roles</small>
              </div>
              <div className="card-body">
                {usersByRole.length === 0 ? (
                  <div className="text-center py-4"><p className="text-muted small">No user data available.</p></div>
                ) : (
                  <div style={{position: 'relative', height: '220px'}}>
                    <Pie
                      data={{
                        labels: usersByRole.map(r => (r.role__name || 'Unassigned').replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())),
                        datasets: [{
                          data: usersByRole.map(r => r.count),
                          backgroundColor: usersByRole.map((_, i) => roleColors[i % roleColors.length]),
                          borderWidth: 2,
                          borderColor: '#fff',
                        }]
                      }}
                      options={{
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                          legend: { position: 'right', labels: { padding: 8, usePointStyle: true, font: { size: 11 }, boxWidth: 10 } },
                          tooltip: { backgroundColor: '#1d2939', padding: 10, cornerRadius: 8 }
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Ownership & Level of Care Row */}
        <div className="row g-4 mt-0">
          {/* Hospitals by Ownership */}
          <div className="col-xl-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-white border-0 pb-0">
                <h6 className="mb-0">
                  <i className="fas fa-building me-2 text-info"></i>Hospitals by Ownership
                </h6>
                <small className="text-muted">Public, private, and NGO breakdown</small>
              </div>
              <div className="card-body">
                {hospitalsByOwnership.length === 0 ? (
                  <div className="text-center py-4"><p className="text-muted small">No data available.</p></div>
                ) : (
                  <div style={{position: 'relative', height: '260px'}}>
                    <Bar
                      data={{
                        labels: hospitalsByOwnership.map(o => ownershipLabels[o.ownership_type] || o.ownership_type),
                        datasets: [{
                          label: 'Hospitals',
                          data: hospitalsByOwnership.map(o => o.count),
                          backgroundColor: hospitalsByOwnership.map(o => (ownershipColors[o.ownership_type] || '#6c757d') + 'cc'),
                          borderColor: hospitalsByOwnership.map(o => ownershipColors[o.ownership_type] || '#6c757d'),
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
                          tooltip: { backgroundColor: '#1d2939', padding: 10, cornerRadius: 8 }
                        },
                        scales: {
                          x: { beginAtZero: true, ticks: { font: { size: 11 } }, grid: { color: 'rgba(0,0,0,0.05)' } },
                          y: { ticks: { font: { size: 11 } }, grid: { display: false } }
                        }
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Hospitals by Level of Care */}
          <div className="col-xl-6">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-white border-0 pb-0">
                <h6 className="mb-0">
                  <i className="fas fa-layer-group me-2 text-warning"></i>Level of Care Distribution
                </h6>
                <small className="text-muted">Facility classification by care level</small>
              </div>
              <div className="card-body">
                {hospitalsByLevel.length === 0 ? (
                  <div className="text-center py-4"><p className="text-muted small">No data available.</p></div>
                ) : (
                  <div>
                    {hospitalsByLevel.map((item, idx) => {
                      const total = hospitalsByLevel.reduce((s, h) => s + h.count, 0) || 1;
                      const pct = ((item.count / total) * 100).toFixed(1);
                      const color = roleColors[idx % roleColors.length];
                      return (
                        <div key={idx} style={{marginBottom: idx < hospitalsByLevel.length - 1 ? '12px' : 0}}>
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <span style={{fontSize: '13px', fontWeight: 500}}>{levelLabels[item.level_of_care] || item.level_of_care}</span>
                            <span style={{fontSize: '12px', color: '#6c757d'}}>{item.count} ({pct}%)</span>
                          </div>
                          <div className="progress" style={{height: '8px'}}>
                            <div className="progress-bar" style={{width: `${pct}%`, backgroundColor: color, borderRadius: '4px'}}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Service Availability & Top Hospitals Row */}
        <div className="row g-4 mt-0">
          {/* Service Availability */}
          <div className="col-xl-7">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-white border-0 pb-0">
                <h6 className="mb-0">
                  <i className="fas fa-hand-holding-medical me-2 text-success"></i>Service Availability
                </h6>
                <small className="text-muted">Percentage of hospitals offering each service</small>
              </div>
              <div className="card-body">
                {serviceAvailability.length === 0 ? (
                  <div className="text-center py-4"><p className="text-muted small">No data.</p></div>
                ) : (
                  <div>
                    {serviceAvailability.map((s, idx) => {
                      const color = serviceColors[s.service] || '#6c757d';
                      return (
                        <div key={idx} style={{marginBottom: idx < serviceAvailability.length - 1 ? '12px' : 0}}>
                          <div className="d-flex justify-content-between align-items-center mb-1">
                            <span style={{fontSize: '13px', fontWeight: 500}}>
                              <i className="fas fa-circle me-2" style={{color, fontSize: '8px'}}></i>
                              {s.service}
                            </span>
                            <span style={{fontSize: '12px', color: '#6c757d'}}>
                              <strong style={{color}}>{s.percentage}%</strong> ({s.count} hospitals)
                            </span>
                          </div>
                          <div className="progress" style={{height: '10px'}}>
                            <div className="progress-bar" style={{width: `${s.percentage}%`, backgroundColor: color, borderRadius: '4px'}}></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Top Hospitals by Staff */}
          <div className="col-xl-5">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-white border-0 pb-0">
                <h6 className="mb-0">
                  <i className="fas fa-trophy me-2 text-warning"></i>Top 5 Hospitals by Staff
                </h6>
                <small className="text-muted">Largest healthcare workforces</small>
              </div>
              <div className="card-body">
                {topHospitalsByStaff.length === 0 ? (
                  <div className="text-center py-4"><p className="text-muted small">No staffed hospitals yet.</p></div>
                ) : (
                  <div>
                    {topHospitalsByStaff.map((h, idx) => (
                      <div key={h.id} className="d-flex align-items-center" style={{padding: '10px 0', borderBottom: idx < topHospitalsByStaff.length - 1 ? '1px solid #f0f0f0' : 'none'}}>
                        <div style={{
                          width: '32px', height: '32px', borderRadius: '50%',
                          backgroundColor: roleColors[idx % roleColors.length] + '20',
                          color: roleColors[idx % roleColors.length],
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontWeight: 700, fontSize: '14px', marginRight: '12px', flexShrink: 0
                        }}>
                          #{idx + 1}
                        </div>
                        <div style={{flex: 1, minWidth: 0}}>
                          <div style={{fontWeight: 600, fontSize: '13px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{h.name}</div>
                          <small className="text-muted" style={{fontSize: '11px'}}>{h.region}</small>
                        </div>
                        <div className="text-end">
                          <div style={{fontWeight: 700, fontSize: '16px', color: '#059669'}}>{h.staff_count}</div>
                          <small className="text-muted" style={{fontSize: '10px'}}>staff</small>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Approval Status */}
        {approvalBreakdown.length > 0 && (
          <div className="row g-4 mt-0">
            <div className="col-12">
              <div className="card border-0 shadow-sm">
                <div className="card-body">
                  <h6 className="mb-3">
                    <i className="fas fa-clipboard-check me-2 text-primary"></i>Hospital Approval Status
                  </h6>
                  <div className="d-flex flex-wrap gap-3">
                    {approvalBreakdown.map((a, idx) => {
                      const statusColors = { approved: '#059669', pending: '#f77f00', rejected: '#e63946' };
                      const color = statusColors[a.approval_status] || '#6c757d';
                      return (
                        <div key={idx} style={{
                          flex: '1 1 200px',
                          padding: '16px',
                          borderRadius: '10px',
                          backgroundColor: color + '15',
                          borderLeft: `4px solid ${color}`,
                        }}>
                          <div style={{fontSize: '24px', fontWeight: 700, color}}>{a.count}</div>
                          <div style={{textTransform: 'capitalize', fontWeight: 500, fontSize: '13px'}}>{a.approval_status}</div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recent Hospitals */}
        <div className="row mt-4">
          <div className="col-12">
            <div className="card border-0 shadow-sm">
              <div className="card-header bg-white border-0 d-flex justify-content-between align-items-center">
                <div>
                  <h5 className="mb-0">
                    <i className="fas fa-clock me-2 text-info"></i>
                    Recently Added Hospitals
                  </h5>
                </div>
                <Link to="/admin/hospitals" className="btn btn-outline-primary btn-sm">
                  View All Hospitals
                </Link>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="bg-light">
                      <tr>
                        <th>Hospital</th>
                        <th>Type</th>
                        <th>District</th>
                        <th>Region</th>
                        <th>Staff</th>
                        <th>Departments</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentHospitals.length === 0 ? (
                        <tr>
                          <td colSpan="7" className="text-center py-4 text-muted">
                            No hospitals have been registered yet.
                          </td>
                        </tr>
                      ) : recentHospitals.map((h) => (
                        <tr key={h.id}>
                          <td><strong>{h.name}</strong></td>
                          <td>
                            <span className="badge" style={{
                              backgroundColor: (typeColors[h.hospital_type] || '#6c757d') + '20',
                              color: typeColors[h.hospital_type] || '#6c757d'
                            }}>
                              {h.hospital_type_display}
                            </span>
                          </td>
                          <td>{h.district_name}</td>
                          <td>{h.region_name}</td>
                          <td>{h.staff_count || 0}</td>
                          <td>{h.department_count || 0}</td>
                          <td>
                            {h.is_active ? (
                              <span className="badge bg-success">Active</span>
                            ) : (
                              <span className="badge bg-danger">Inactive</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default MinistryDashboard;

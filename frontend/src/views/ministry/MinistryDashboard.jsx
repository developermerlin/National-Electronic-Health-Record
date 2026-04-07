import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layout/DashboardLayout';

const navItems = [
  {
    label: 'Dashboard',
    items: [
      { path: '/ministry/dashboard', icon: 'fas fa-tachometer-alt', text: 'National Overview' },
    ]
  },
  {
    label: 'Organization',
    items: [
      { path: '/admin/regions', icon: 'fas fa-globe-africa', text: 'Regions' },
      { path: '/admin/districts', icon: 'fas fa-map-marked-alt', text: 'Districts' },
      { path: '/admin/hospitals', icon: 'fas fa-hospital', text: 'Hospitals' },
    ]
  },
  {
    label: 'Account',
    items: [
      { path: '/admin/profile', icon: 'fas fa-user-circle', text: 'My Profile' },
    ]
  }
];

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
      <DashboardLayout navItems={navItems} brandTitle="NEHR Ministry" roleBadge="Ministry of Health">
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
  const recentHospitals = data?.recent_hospitals || [];
  const maxHospitals = Math.max(...staffByRegion.map(r => r.hospital_count), 1);

  return (
    <DashboardLayout navItems={navItems} brandTitle="NEHR Ministry" roleBadge="Ministry of Health">
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

        <div className="row g-4">
          {/* Regional Distribution */}
          <div className="col-xl-8">
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
                    <p className="text-muted">No regional data available yet. Add regions and hospitals to see analytics.</p>
                    <Link to="/admin/regions" className="btn btn-primary btn-sm">
                      <i className="fas fa-plus me-1"></i>Add Regions
                    </Link>
                  </div>
                ) : (
                  <div>
                    {staffByRegion.map((region, idx) => (
                      <div key={idx} className="mb-4">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <strong>{region.region}</strong>
                          <div>
                            <span className="badge bg-primary bg-opacity-10 text-primary me-2">
                              {region.hospital_count} hospitals
                            </span>
                            <span className="badge bg-success bg-opacity-10 text-success me-2">
                              {region.staff_count} staff
                            </span>
                            <span className="badge bg-info bg-opacity-10 text-info">
                              {region.district_count} districts
                            </span>
                          </div>
                        </div>
                        <div className="progress" style={{ height: '12px' }}>
                          <div
                            className="progress-bar bg-primary"
                            role="progressbar"
                            style={{ width: `${(region.hospital_count / maxHospitals) * 100}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Hospitals by Type */}
          <div className="col-xl-4">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header bg-white border-0 pb-0">
                <h5 className="mb-0">
                  <i className="fas fa-hospital me-2 text-success"></i>
                  Hospitals by Type
                </h5>
              </div>
              <div className="card-body">
                {hospitalsByType.length === 0 ? (
                  <div className="text-center py-4">
                    <p className="text-muted">No hospitals registered yet.</p>
                  </div>
                ) : (
                  <div>
                    {hospitalsByType.map((item, idx) => (
                      <div key={idx} className="d-flex justify-content-between align-items-center py-2 border-bottom">
                        <div className="d-flex align-items-center">
                          <div
                            className="rounded-circle me-2"
                            style={{
                              width: '10px', height: '10px',
                              backgroundColor: typeColors[item.hospital_type] || '#6c757d'
                            }}
                          ></div>
                          <span>{hospitalTypeLabels[item.hospital_type] || item.hospital_type}</span>
                        </div>
                        <span className="badge bg-light text-dark">{item.count}</span>
                      </div>
                    ))}
                    <div className="d-flex justify-content-between align-items-center pt-3">
                      <strong>Total</strong>
                      <strong>{hospitalsByType.reduce((sum, h) => sum + h.count, 0)}</strong>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

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

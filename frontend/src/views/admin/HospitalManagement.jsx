import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layout/DashboardLayout';
import showToast from '../../utils/toast';
import ConfirmModal from '../../components/ConfirmModal';
import { getNavForUser, getBrandForUser, getRoleBadge } from '../../utils/navItems';

function HospitalManagement() {
  const { apiCall, user } = useAuth();
  const isReadOnly = user?.role === 'ministry_admin';
  const [hospitals, setHospitals] = useState([]);
  const [regions, setRegions] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [chiefdoms, setChiefdoms] = useState([]);
  const [towns, setTowns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedHospital, setSelectedHospital] = useState(null);
  const [filters, setFilters] = useState({ search: '', region: '', district: '', type: '' });
  const [confirmDelete, setConfirmDelete] = useState({ show: false, id: null });
  const [gpsLoading, setGpsLoading] = useState(false);
  const [formStep, setFormStep] = useState(1);
  const [selectedChiefdom, setSelectedChiefdom] = useState('');
  const [selectedTown, setSelectedTown] = useState('');
  const [formData, setFormData] = useState({
    // Basic
    name: '', facility_code: '', hospital_type: 'district_hospital',
    ownership_type: 'government', level_of_care: 'primary', operational_status: 'active',
    // Location
    country: 'Sierra Leone', district: '', chiefdom_ward: '', town_city: '',
    address: '', latitude: '', longitude: '',
    // Contact
    phone: '', secondary_phone: '', email: '', website: '', emergency_contact_line: '',
    // Administration
    hospital_admin_name: '', admin_user: '', medical_superintendent: '',
    facility_manager: '', license_number: '', license_expiry_date: '',
    // Services
    bed_capacity: 0, emergency_services: false, laboratory_available: false,
    pharmacy_available: false, radiology_available: false, maternity_services: false,
    surgery_services: false, outpatient_services: true, inpatient_services: false, ambulance_available: false,
    // System Config
    facility_timezone: 'Africa/Freetown', working_hours: '', patient_id_prefix: '',
    allow_external_access: false, data_sharing_consent: false,
    // Reporting
    reporting_facility_code: '', dhis2_code: '', catchment_population: '',
    referral_level: false, supervising_authority: '',
    // Audit
    is_active: true, approval_status: 'pending',
  });

  const generateHospitalCode = (name) => {
    if (!name) return '';
    const words = name.replace(/[^a-zA-Z\s]/g, '').split(/\s+/).filter(Boolean);
    let letters;
    if (words.length >= 2) {
      letters = words.slice(0, 3).map(w => w[0].toUpperCase()).join('');
    } else {
      letters = name.slice(0, 3).toUpperCase();
    }
    return `HSP-${letters}-001`;
  };

  useEffect(() => {
    fetchHospitals();
    fetchRegions();
    fetchDistricts();
  }, [filters]);

  const fetchHospitals = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (filters.search) params.append('search', filters.search);
      if (filters.region) params.append('region', filters.region);
      if (filters.district) params.append('district', filters.district);
      if (filters.type) params.append('type', filters.type);
      if (filters.ownership) params.append('ownership', filters.ownership);
      const response = await apiCall(`/admin/hospitals/?${params.toString()}`);
      const data = await response.json();
      if (response.ok) setHospitals(data);
    } catch {
      console.error('Error fetching hospitals');
    } finally {
      setLoading(false);
    }
  };

  const fetchRegions = async () => {
    try {
      const response = await apiCall('/admin/regions/');
      const data = await response.json();
      if (response.ok) setRegions(data);
    } catch {
      console.error('Error fetching regions');
    }
  };

  const fetchDistricts = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.region) params.append('region', filters.region);
      const response = await apiCall(`/admin/districts/?${params.toString()}`);
      const data = await response.json();
      if (response.ok) setDistricts(data);
    } catch {
      console.error('Error fetching districts');
    }
  };

  const fetchChiefdoms = async (districtId) => {
    if (!districtId) { setChiefdoms([]); return; }
    try {
      const response = await apiCall(`/admin/chiefdoms/?district=${districtId}`);
      const data = await response.json();
      if (response.ok) setChiefdoms(data);
      else setChiefdoms([]);
    } catch {
      setChiefdoms([]);
    }
  };

  const fetchTowns = async (districtId, chiefdomId) => {
    if (!districtId) { setTowns([]); return; }
    try {
      const params = new URLSearchParams();
      params.append('district', districtId);
      if (chiefdomId) params.append('chiefdom', chiefdomId);
      const response = await apiCall(`/admin/towns/?${params.toString()}`);
      const data = await response.json();
      if (response.ok) setTowns(data);
      else setTowns([]);
    } catch {
      setTowns([]);
    }
  };

  useEffect(() => {
    // When district changes, load chiefdoms and towns; reset selections and text fallbacks
    if (formData.district) {
      fetchChiefdoms(formData.district);
      fetchTowns(formData.district, selectedChiefdom || null);
    } else {
      setChiefdoms([]);
      setTowns([]);
      setSelectedChiefdom('');
      setSelectedTown('');
      setFormData(prev => ({ ...prev, chiefdom_ward: '', town_city: '' }));
    }
  }, [formData.district]);

  useEffect(() => {
    // When chiefdom changes, reload towns filtered by chiefdom
    if (formData.district) {
      fetchTowns(formData.district, selectedChiefdom || null);
      // Clear selected town and fallback text when chiefdom changes
      setSelectedTown('');
      setFormData(prev => ({ ...prev, town_city: '' }));
    }
  }, [selectedChiefdom]);

  const handleChiefdomChange = (e) => {
    const val = e.target.value;
    if (!val || val === '__other') {
      setSelectedChiefdom('');
      setFormData(prev => ({ ...prev, chiefdom_ward: '' }));
    } else {
      setSelectedChiefdom(val);
      const found = chiefdoms.find(c => String(c.id) === String(val));
      setFormData(prev => ({ ...prev, chiefdom_ward: found?.name || '' }));
    }
  };

  const handleTownChange = (e) => {
    const val = e.target.value;
    if (!val || val === '__other') {
      setSelectedTown('');
      setFormData(prev => ({ ...prev, town_city: '' }));
    } else {
      setSelectedTown(val);
      const found = towns.find(t => String(t.id) === String(val));
      setFormData(prev => ({ ...prev, town_city: found?.name || '' }));
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const response = await apiCall('/admin/hospitals/', {
        method: 'POST',
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        setShowCreateModal(false);
        resetForm();
        fetchHospitals();
        showToast.success('Hospital created successfully!');
      } else {
        const data = await response.json();
        const msg = Object.values(data).flat().join(', ');
        showToast.error(msg || 'Failed to create hospital');
      }
    } catch {
      showToast.error('Error creating hospital. Please try again.');
    }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const response = await apiCall(`/admin/hospitals/${selectedHospital.id}/`, {
        method: 'PUT',
        body: JSON.stringify(formData)
      });
      if (response.ok) {
        setShowEditModal(false);
        setSelectedHospital(null);
        resetForm();
        fetchHospitals();
        showToast.success('Hospital updated successfully!');
      } else {
        const data = await response.json();
        const msg = Object.values(data).flat().join(', ');
        showToast.error(msg || 'Failed to update hospital');
      }
    } catch {
      showToast.error('Error updating hospital. Please try again.');
    }
  };

  const handleDelete = (id) => {
    setConfirmDelete({ show: true, id });
  };

  const handleApprovalToggle = async (hospital) => {
    const newStatus = hospital.approval_status === 'approved' ? 'pending' : 'approved';
    try {
      const response = await apiCall(`/admin/hospitals/${hospital.id}/`, {
        method: 'PATCH',
        body: JSON.stringify({ approval_status: newStatus })
      });
      if (response.ok) {
        fetchHospitals();
        showToast.success(`Hospital ${newStatus === 'approved' ? 'approved' : 'set to pending'} successfully!`);
      } else {
        showToast.error('Failed to update approval status');
      }
    } catch {
      showToast.error('Error updating approval status. Please try again.');
    }
  };

  const confirmDeleteAction = async () => {
    try {
      const response = await apiCall(`/admin/hospitals/${confirmDelete.id}/`, { method: 'DELETE' });
      if (response.ok) {
        fetchHospitals();
        showToast.success('Hospital deleted successfully!');
      } else {
        showToast.error('Failed to delete hospital');
      }
    } catch {
      showToast.error('Error deleting hospital. Please try again.');
    } finally {
      setConfirmDelete({ show: false, id: null });
    }
  };

  const openEditModal = (hospital) => {
    setSelectedHospital(hospital);
    setFormData({
      name: hospital.name || '', facility_code: hospital.facility_code || '',
      hospital_type: hospital.hospital_type || 'district_hospital',
      ownership_type: hospital.ownership_type || 'government',
      level_of_care: hospital.level_of_care || 'primary',
      operational_status: hospital.operational_status || 'active',
      country: hospital.country || 'Sierra Leone', district: hospital.district || '',
      chiefdom_ward: hospital.chiefdom_ward || '', town_city: hospital.town_city || '',
      address: hospital.address || '', latitude: hospital.latitude || '', longitude: hospital.longitude || '',
      phone: hospital.phone || '', secondary_phone: hospital.secondary_phone || '',
      email: hospital.email || '', website: hospital.website || '',
      emergency_contact_line: hospital.emergency_contact_line || '',
      hospital_admin_name: hospital.hospital_admin_name || '', admin_user: hospital.admin_user || '',
      medical_superintendent: hospital.medical_superintendent || '',
      facility_manager: hospital.facility_manager || '',
      license_number: hospital.license_number || '', license_expiry_date: hospital.license_expiry_date || '',
      bed_capacity: hospital.bed_capacity || 0,
      emergency_services: hospital.emergency_services || false,
      laboratory_available: hospital.laboratory_available || false,
      pharmacy_available: hospital.pharmacy_available || false,
      radiology_available: hospital.radiology_available || false,
      maternity_services: hospital.maternity_services || false,
      surgery_services: hospital.surgery_services || false,
      outpatient_services: hospital.outpatient_services ?? true,
      inpatient_services: hospital.inpatient_services || false,
      ambulance_available: hospital.ambulance_available || false,
      facility_timezone: hospital.facility_timezone || 'Africa/Freetown',
      working_hours: hospital.working_hours || '', patient_id_prefix: hospital.patient_id_prefix || '',
      allow_external_access: hospital.allow_external_access || false,
      data_sharing_consent: hospital.data_sharing_consent || false,
      reporting_facility_code: hospital.reporting_facility_code || '',
      dhis2_code: hospital.dhis2_code || '', catchment_population: hospital.catchment_population || '',
      referral_level: hospital.referral_level || false, supervising_authority: hospital.supervising_authority || '',
      is_active: hospital.is_active ?? true, approval_status: hospital.approval_status || 'pending',
    });
    setFormStep(1);
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      name: '', facility_code: '', hospital_type: 'district_hospital',
      ownership_type: 'government', level_of_care: 'primary', operational_status: 'active',
      country: 'Sierra Leone', district: '', chiefdom_ward: '', town_city: '',
      address: '', latitude: '', longitude: '',
      phone: '', secondary_phone: '', email: '', website: '', emergency_contact_line: '',
      hospital_admin_name: '', admin_user: '', medical_superintendent: '',
      facility_manager: '', license_number: '', license_expiry_date: '',
      bed_capacity: 0, emergency_services: false, laboratory_available: false,
      pharmacy_available: false, radiology_available: false, maternity_services: false,
      surgery_services: false, outpatient_services: true, inpatient_services: false, ambulance_available: false,
      facility_timezone: 'Africa/Freetown', working_hours: '', patient_id_prefix: '',
      allow_external_access: false, data_sharing_consent: false,
      reporting_facility_code: '', dhis2_code: '', catchment_population: '',
      referral_level: false, supervising_authority: '',
      is_active: true, approval_status: 'pending',
    });
    setFormStep(1);
    setChiefdoms([]);
    setTowns([]);
    setSelectedChiefdom('');
    setSelectedTown('');
  };

  const hospitalTypes = [
    { value: 'government_hospital', label: 'Government Hospital' },
    { value: 'private_hospital', label: 'Private Hospital' },
    { value: 'clinic', label: 'Clinic' },
    { value: 'health_center', label: 'Health Center' },
    { value: 'community_health_post', label: 'Community Health Post' },
    { value: 'diagnostic_center', label: 'Diagnostic Center' },
    { value: 'pharmacy_facility', label: 'Pharmacy Facility' },
    { value: 'teaching_hospital', label: 'Teaching Hospital' },
    { value: 'regional_hospital', label: 'Regional Hospital' },
    { value: 'district_hospital', label: 'District Hospital' },
    { value: 'polyclinic', label: 'Polyclinic' },
  ];

  const ownershipTypes = [
    { value: 'government', label: 'Government' },
    { value: 'private', label: 'Private' },
    { value: 'ngo', label: 'NGO' },
    { value: 'faith_based', label: 'Faith-based' },
    { value: 'military', label: 'Military' },
  ];

  const levelsOfCare = [
    { value: 'community', label: 'Community Health Post (MCH/First Aid)' },
    { value: 'primary', label: 'Primary Health Center (PHU/CHC)' },
    { value: 'secondary_district', label: 'Secondary - District Hospital' },
    { value: 'secondary_regional', label: 'Secondary - Regional/County Hospital' },
    { value: 'tertiary', label: 'Tertiary - National/Specialized Hospital' },
    { value: 'teaching', label: 'Teaching/University Hospital' },
    { value: 'specialized', label: 'Specialized Center (Cancer/Cardiac/Mental)' },
    { value: 'diagnostic', label: 'Diagnostic/Imaging Center' },
    { value: 'rehabilitation', label: 'Rehabilitation/Palliative Care Center' },
  ];

  const operationalStatuses = [
    { value: 'active', label: 'Active' },
    { value: 'pending_approval', label: 'Pending Approval' },
    { value: 'suspended', label: 'Suspended' },
    { value: 'closed', label: 'Closed' },
  ];

  const approvalStatuses = [
    { value: 'pending', label: 'Pending' },
    { value: 'approved', label: 'Approved' },
    { value: 'rejected', label: 'Rejected' },
  ];

  const formSteps = [
    { num: 1, label: 'Basic Info', icon: 'fas fa-hospital' },
    { num: 2, label: 'Location', icon: 'fas fa-map-marker-alt' },
    { num: 3, label: 'Contact', icon: 'fas fa-phone-alt' },
    { num: 4, label: 'Administration', icon: 'fas fa-user-tie' },
    { num: 5, label: 'Services', icon: 'fas fa-stethoscope' },
    { num: 6, label: 'Config & Reporting', icon: 'fas fa-cogs' },
  ];

  const modalOverlay = {
    backgroundColor: 'rgba(0,0,0,0.5)', position: 'fixed', top: 0, left: 0,
    width: '100%', height: '100%', zIndex: 1050
  };

  const fetchCurrentLocation = () => {
    if (!navigator.geolocation) {
      showToast.error('Geolocation is not supported by your browser');
      return;
    }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          latitude: position.coords.latitude.toFixed(7),
          longitude: position.coords.longitude.toFixed(7)
        }));
        showToast.success('Location captured successfully!');
        setGpsLoading(false);
      },
      (error) => {
        const messages = {
          1: 'Location permission denied. Please allow location access.',
          2: 'Location unavailable. Please try again.',
          3: 'Location request timed out. Please try again.'
        };
        showToast.error(messages[error.code] || 'Could not get location');
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const renderStepIndicator = () => (
    <div className="d-flex justify-content-center mb-3 flex-wrap gap-1">
      {formSteps.map(s => (
        <button key={s.num} type="button"
          className={`btn btn-sm ${formStep === s.num ? 'btn-primary' : formStep > s.num ? 'btn-outline-success' : 'btn-outline-secondary'}`}
          onClick={() => setFormStep(s.num)} style={{fontSize: '12px', padding: '4px 10px'}}>
          <i className={`${s.icon} me-1`}></i>{s.label}
        </button>
      ))}
    </div>
  );

  const renderStep1 = () => (
    <div className="row g-3">
      <div className="col-12"><h6 className="text-primary mb-0"><i className="fas fa-hospital me-2"></i>Basic Facility Information</h6><hr className="mt-1 mb-2"/></div>
      <div className="col-md-8">
        <label className="form-label">Facility Name *</label>
        <input type="text" className="form-control" value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })} required
          placeholder="e.g. Connaught Hospital" />
      </div>
      {formData.name && (
        <div className="col-md-4">
          <label className="form-label">Facility Code</label>
          <div className="form-control bg-light d-flex align-items-center" style={{cursor: 'default'}}>
            <span className="badge bg-primary me-2" style={{fontSize: '13px', padding: '4px 10px', letterSpacing: '1px'}}>
              <i className="fas fa-code me-1"></i>{generateHospitalCode(formData.name)}
            </span>
            <small className="text-muted">Auto-generated</small>
          </div>
        </div>
      )}
      <div className="col-md-4">
        <label className="form-label">Facility Type *</label>
        <select className="form-select" value={formData.hospital_type}
          onChange={(e) => setFormData({ ...formData, hospital_type: e.target.value })} required>
          {hospitalTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>
      <div className="col-md-4">
        <label className="form-label">Ownership Type *</label>
        <select className="form-select" value={formData.ownership_type}
          onChange={(e) => setFormData({ ...formData, ownership_type: e.target.value })}>
          {ownershipTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>
      <div className="col-md-4">
        <label className="form-label">Level of Care *</label>
        <select className="form-select" value={formData.level_of_care}
          onChange={(e) => setFormData({ ...formData, level_of_care: e.target.value })}>
          {levelsOfCare.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>
      <div className="col-md-6">
        <label className="form-label">Operational Status</label>
        <select className="form-select" value={formData.operational_status}
          onChange={(e) => setFormData({ ...formData, operational_status: e.target.value })}>
          {operationalStatuses.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>
      <div className="col-md-6">
        <label className="form-label">Approval Status</label>
        <select className="form-select" value={formData.approval_status}
          onChange={(e) => setFormData({ ...formData, approval_status: e.target.value })}>
          {approvalStatuses.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>
      <div className="col-md-12">
        <div className="form-check">
          <input type="checkbox" className="form-check-input" id="hosp_active"
            checked={formData.is_active}
            onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })} />
          <label className="form-check-label" htmlFor="hosp_active">Active</label>
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="row g-3">
      <div className="col-12"><h6 className="text-primary mb-0"><i className="fas fa-map-marker-alt me-2"></i>Location Information</h6><hr className="mt-1 mb-2"/></div>
      <div className="col-md-6">
        <label className="form-label">Country</label>
        <input type="text" className="form-control" value={formData.country}
          onChange={(e) => setFormData({ ...formData, country: e.target.value })} />
      </div>
      <div className="col-md-6">
        <label className="form-label">District *</label>
        <select className="form-select" value={formData.district}
          onChange={(e) => setFormData({ ...formData, district: e.target.value })} required>
          <option value="">Select District</option>
          {districts.map(d => <option key={d.id} value={d.id}>{d.name} ({d.region_name})</option>)}
        </select>
      </div>
      <div className="col-md-6">
        <label className="form-label">Chiefdom / Ward</label>
        {chiefdoms.length > 0 && (
          <select className="form-select mb-2" value={selectedChiefdom || ''} onChange={handleChiefdomChange}>
            <option value="">Select Chiefdom</option>
            {chiefdoms.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
            <option value="__other">Other...</option>
          </select>
        )}
        {(chiefdoms.length === 0 || !selectedChiefdom) && (
          <input type="text" className="form-control" value={formData.chiefdom_ward}
            onChange={(e) => setFormData({ ...formData, chiefdom_ward: e.target.value })}
            placeholder="e.g. Marampa Chiefdom" />
        )}
      </div>
      <div className="col-md-6">
        <label className="form-label">Town / City</label>
        {towns.length > 0 && (
          <select className="form-select mb-2" value={selectedTown || ''} onChange={handleTownChange}>
            <option value="">Select Town</option>
            {towns.map(t => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
            <option value="__other">Other...</option>
          </select>
        )}
        {(towns.length === 0 || !selectedTown) && (
          <input type="text" className="form-control" value={formData.town_city}
            onChange={(e) => setFormData({ ...formData, town_city: e.target.value })}
            placeholder="e.g. Lunsar" />
        )}
      </div>
      <div className="col-md-12">
        <label className="form-label">Physical Address</label>
        <textarea className="form-control" rows="2" value={formData.address}
          onChange={(e) => setFormData({ ...formData, address: e.target.value })} />
      </div>
      <div className="col-md-12">
        <div className="card border rounded" style={{ backgroundColor: '#f8f9fa' }}>
          <div className="card-body py-3">
            <div className="d-flex justify-content-between align-items-center mb-2">
              <label className="form-label mb-0 fw-semibold">
                <i className="fas fa-map-marker-alt text-danger me-1"></i>GPS Location
              </label>
              <div className="d-flex gap-2">
                <button type="button" className="btn btn-sm btn-outline-primary" onClick={fetchCurrentLocation} disabled={gpsLoading}>
                  {gpsLoading ? (
                    <><span className="spinner-border spinner-border-sm me-1"></span>Locating...</>
                  ) : (
                    <><i className="fas fa-crosshairs me-1"></i>Use My Location</>
                  )}
                </button>
                {formData.latitude && formData.longitude && (
                  <a href={`https://www.google.com/maps?q=${formData.latitude},${formData.longitude}`}
                    target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-success">
                    <i className="fas fa-external-link-alt me-1"></i>View on Map
                  </a>
                )}
              </div>
            </div>
            <div className="row g-2">
              <div className="col-md-6">
                <div className="input-group input-group-sm">
                  <span className="input-group-text">Lat</span>
                  <input type="number" step="any" className="form-control" value={formData.latitude}
                    onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                    placeholder="e.g. 8.4840100" />
                </div>
              </div>
              <div className="col-md-6">
                <div className="input-group input-group-sm">
                  <span className="input-group-text">Lng</span>
                  <input type="number" step="any" className="form-control" value={formData.longitude}
                    onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                    placeholder="e.g. -13.2344400" />
                </div>
              </div>
            </div>
            {formData.latitude && formData.longitude && (
              <div className="mt-2">
                <small className="text-success">
                  <i className="fas fa-check-circle me-1"></i>
                  Coordinates: {formData.latitude}, {formData.longitude}
                </small>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="row g-3">
      <div className="col-12"><h6 className="text-primary mb-0"><i className="fas fa-phone-alt me-2"></i>Contact Information</h6><hr className="mt-1 mb-2"/></div>
      <div className="col-md-6">
        <label className="form-label">Primary Phone</label>
        <input type="tel" className="form-control" value={formData.phone}
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
          placeholder="+232 XX XXXXXX" />
      </div>
      <div className="col-md-6">
        <label className="form-label">Secondary Phone</label>
        <input type="tel" className="form-control" value={formData.secondary_phone}
          onChange={(e) => setFormData({ ...formData, secondary_phone: e.target.value })} />
      </div>
      <div className="col-md-6">
        <label className="form-label">Email</label>
        <input type="email" className="form-control" value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })} />
      </div>
      <div className="col-md-6">
        <label className="form-label">Website</label>
        <input type="url" className="form-control" value={formData.website}
          onChange={(e) => setFormData({ ...formData, website: e.target.value })}
          placeholder="https://" />
      </div>
      <div className="col-md-6">
        <label className="form-label">Emergency Contact Line</label>
        <input type="tel" className="form-control" value={formData.emergency_contact_line}
          onChange={(e) => setFormData({ ...formData, emergency_contact_line: e.target.value })}
          placeholder="Ambulance/emergency" />
      </div>
    </div>
  );

  const renderStep4 = () => (
    <div className="row g-3">
      <div className="col-12"><h6 className="text-primary mb-0"><i className="fas fa-user-tie me-2"></i>Administration Information</h6><hr className="mt-1 mb-2"/></div>
      <div className="col-md-6">
        <label className="form-label">Hospital Admin Name</label>
        <input type="text" className="form-control" value={formData.hospital_admin_name}
          onChange={(e) => setFormData({ ...formData, hospital_admin_name: e.target.value })}
          placeholder="Responsible administrator" />
      </div>
      <div className="col-md-6">
        <label className="form-label">Medical Superintendent</label>
        <input type="text" className="form-control" value={formData.medical_superintendent}
          onChange={(e) => setFormData({ ...formData, medical_superintendent: e.target.value })}
          placeholder="Head doctor" />
      </div>
      <div className="col-md-6">
        <label className="form-label">Facility Manager</label>
        <input type="text" className="form-control" value={formData.facility_manager}
          onChange={(e) => setFormData({ ...formData, facility_manager: e.target.value })}
          placeholder="Administrative head" />
      </div>
      <div className="col-md-6">
        <label className="form-label">License Number</label>
        <input type="text" className="form-control" value={formData.license_number}
          onChange={(e) => setFormData({ ...formData, license_number: e.target.value })}
          placeholder="Government license" />
      </div>
      <div className="col-md-6">
        <label className="form-label">License Expiry Date</label>
        <input type="date" className="form-control" value={formData.license_expiry_date}
          onChange={(e) => setFormData({ ...formData, license_expiry_date: e.target.value })} />
      </div>
    </div>
  );

  const renderStep5 = () => {
    const serviceFields = [
      { key: 'emergency_services', label: 'Emergency Services', icon: 'fas fa-ambulance' },
      { key: 'laboratory_available', label: 'Laboratory', icon: 'fas fa-flask' },
      { key: 'pharmacy_available', label: 'Pharmacy', icon: 'fas fa-pills' },
      { key: 'radiology_available', label: 'Radiology', icon: 'fas fa-x-ray' },
      { key: 'maternity_services', label: 'Maternity Services', icon: 'fas fa-baby' },
      { key: 'surgery_services', label: 'Surgery Services', icon: 'fas fa-procedures' },
      { key: 'outpatient_services', label: 'Outpatient Services', icon: 'fas fa-walking' },
      { key: 'inpatient_services', label: 'Inpatient Services', icon: 'fas fa-bed' },
      { key: 'ambulance_available', label: 'Ambulance Available', icon: 'fas fa-truck-medical' },
    ];
    return (
      <div className="row g-3">
        <div className="col-12"><h6 className="text-primary mb-0"><i className="fas fa-stethoscope me-2"></i>Services & Capacity</h6><hr className="mt-1 mb-2"/></div>
        <div className="col-md-4">
          <label className="form-label">Total Beds</label>
          <input type="number" className="form-control" value={formData.bed_capacity}
            onChange={(e) => setFormData({ ...formData, bed_capacity: parseInt(e.target.value) || 0 })} min="0" />
        </div>
        <div className="col-md-8"></div>
        {serviceFields.map(sf => (
          <div className="col-md-4" key={sf.key}>
            <div className="form-check form-switch">
              <input className="form-check-input" type="checkbox" id={sf.key}
                checked={formData[sf.key]}
                onChange={(e) => setFormData({ ...formData, [sf.key]: e.target.checked })} />
              <label className="form-check-label" htmlFor={sf.key}>
                <i className={`${sf.icon} me-1 text-muted`}></i>{sf.label}
              </label>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderStep6 = () => (
    <div className="row g-3">
      <div className="col-12"><h6 className="text-primary mb-0"><i className="fas fa-cogs me-2"></i>System Configuration</h6><hr className="mt-1 mb-2"/></div>
      <div className="col-md-4">
        <label className="form-label">Facility Timezone</label>
        <input type="text" className="form-control" value={formData.facility_timezone}
          onChange={(e) => setFormData({ ...formData, facility_timezone: e.target.value })} />
      </div>
      <div className="col-md-4">
        <label className="form-label">Working Hours</label>
        <input type="text" className="form-control" value={formData.working_hours}
          onChange={(e) => setFormData({ ...formData, working_hours: e.target.value })}
          placeholder="e.g. 8:00 AM - 5:00 PM" />
      </div>
      <div className="col-md-4">
        <label className="form-label">Patient ID Prefix</label>
        <input type="text" className="form-control" value={formData.patient_id_prefix}
          onChange={(e) => setFormData({ ...formData, patient_id_prefix: e.target.value })}
          placeholder="e.g. LUN" />
      </div>
      <div className="col-md-6">
        <div className="form-check form-switch">
          <input className="form-check-input" type="checkbox" id="allow_ext"
            checked={formData.allow_external_access}
            onChange={(e) => setFormData({ ...formData, allow_external_access: e.target.checked })} />
          <label className="form-check-label" htmlFor="allow_ext">Allow External Referral Access</label>
        </div>
      </div>
      <div className="col-md-6">
        <div className="form-check form-switch">
          <input className="form-check-input" type="checkbox" id="data_share"
            checked={formData.data_sharing_consent}
            onChange={(e) => setFormData({ ...formData, data_sharing_consent: e.target.checked })} />
          <label className="form-check-label" htmlFor="data_share">National Data Sharing Consent</label>
        </div>
      </div>

      <div className="col-12 mt-3"><h6 className="text-primary mb-0"><i className="fas fa-chart-bar me-2"></i>Reporting & Government Data</h6><hr className="mt-1 mb-2"/></div>
      <div className="col-md-4">
        <label className="form-label">Reporting Facility Code</label>
        <input type="text" className="form-control" value={formData.reporting_facility_code}
          onChange={(e) => setFormData({ ...formData, reporting_facility_code: e.target.value })}
          placeholder="National reporting ID" />
      </div>
      <div className="col-md-4">
        <label className="form-label">DHIS2 Code</label>
        <input type="text" className="form-control" value={formData.dhis2_code}
          onChange={(e) => setFormData({ ...formData, dhis2_code: e.target.value })} />
      </div>
      <div className="col-md-4">
        <label className="form-label">Catchment Population</label>
        <input type="number" className="form-control" value={formData.catchment_population}
          onChange={(e) => setFormData({ ...formData, catchment_population: e.target.value })}
          placeholder="Population served" min="0" />
      </div>
      <div className="col-md-6">
        <div className="form-check form-switch">
          <input className="form-check-input" type="checkbox" id="referral_lvl"
            checked={formData.referral_level}
            onChange={(e) => setFormData({ ...formData, referral_level: e.target.checked })} />
          <label className="form-check-label" htmlFor="referral_lvl">Can Receive Referrals</label>
        </div>
      </div>
      <div className="col-md-6">
        <label className="form-label">Supervising Authority</label>
        <input type="text" className="form-control" value={formData.supervising_authority}
          onChange={(e) => setFormData({ ...formData, supervising_authority: e.target.value })}
          placeholder="e.g. District Health Office" />
      </div>
    </div>
  );

  const renderHospitalFormFields = () => (
    <div className="modal-body" style={{maxHeight: '60vh', overflowY: 'auto'}}>
      {renderStepIndicator()}
      {formStep === 1 && renderStep1()}
      {formStep === 2 && renderStep2()}
      {formStep === 3 && renderStep3()}
      {formStep === 4 && renderStep4()}
      {formStep === 5 && renderStep5()}
      {formStep === 6 && renderStep6()}
      <div className="d-flex justify-content-between mt-3">
        <button type="button" className="btn btn-outline-secondary btn-sm" disabled={formStep === 1}
          onClick={() => setFormStep(formStep - 1)}>
          <i className="fas fa-arrow-left me-1"></i>Previous
        </button>
        {formStep < 6 && (
          <button type="button" className="btn btn-outline-primary btn-sm"
            onClick={() => setFormStep(formStep + 1)}>
            Next<i className="fas fa-arrow-right ms-1"></i>
          </button>
        )}
      </div>
    </div>
  );

  return (
    <DashboardLayout navItems={getNavForUser(user)} brandTitle={getBrandForUser(user)} roleBadge={getRoleBadge(user)}>
      <div className="container-fluid py-4">
        {/* Header */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h1 className="h3 mb-0">Hospital Management</h1>
                <p className="text-muted mb-0">Manage hospitals and health facilities across the country</p>
              </div>
              {!isReadOnly && (
                <button className="btn btn-primary" onClick={() => { resetForm(); setShowCreateModal(true); }}>
                  <i className="fas fa-plus me-2"></i>Add Hospital
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="row g-3 mb-4">
          <div className="col-xl-3 col-md-6">
            <div className="card border-0 shadow-sm">
              <div className="card-body d-flex align-items-center">
                <div className="rounded-circle bg-primary bg-opacity-10 p-3 me-3">
                  <i className="fas fa-hospital text-primary" style={{ fontSize: '24px' }}></i>
                </div>
                <div>
                  <h3 className="mb-0">{hospitals.length}</h3>
                  <small className="text-muted">Total Hospitals</small>
                </div>
              </div>
            </div>
          </div>
          <div className="col-xl-3 col-md-6">
            <div className="card border-0 shadow-sm">
              <div className="card-body d-flex align-items-center">
                <div className="rounded-circle bg-success bg-opacity-10 p-3 me-3">
                  <i className="fas fa-check-circle text-success" style={{ fontSize: '24px' }}></i>
                </div>
                <div>
                  <h3 className="mb-0">{hospitals.filter(h => h.is_active).length}</h3>
                  <small className="text-muted">Active</small>
                </div>
              </div>
            </div>
          </div>
          <div className="col-xl-3 col-md-6">
            <div className="card border-0 shadow-sm">
              <div className="card-body d-flex align-items-center">
                <div className="rounded-circle bg-info bg-opacity-10 p-3 me-3">
                  <i className="fas fa-map-marked-alt text-info" style={{ fontSize: '24px' }}></i>
                </div>
                <div>
                  <h3 className="mb-0">{regions.length}</h3>
                  <small className="text-muted">Regions</small>
                </div>
              </div>
            </div>
          </div>
          <div className="col-xl-3 col-md-6">
            <div className="card border-0 shadow-sm">
              <div className="card-body d-flex align-items-center">
                <div className="rounded-circle bg-warning bg-opacity-10 p-3 me-3">
                  <i className="fas fa-bed text-warning" style={{ fontSize: '24px' }}></i>
                </div>
                <div>
                  <h3 className="mb-0">{hospitals.reduce((sum, h) => sum + (h.bed_capacity || 0), 0)}</h3>
                  <small className="text-muted">Total Bed Capacity</small>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="card border-0 shadow-sm mb-4">
          <div className="card-body">
            <div className="row g-2">
              <div className="col-md-3">
                <input type="text" className="form-control form-control-sm" placeholder="Search hospitals..."
                  value={filters.search} onChange={(e) => setFilters({ ...filters, search: e.target.value })} />
              </div>
              <div className="col-md-2">
                <select className="form-select form-select-sm" value={filters.region}
                  onChange={(e) => setFilters({ ...filters, region: e.target.value, district: '' })}>
                  <option value="">All Regions</option>
                  {regions.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
              </div>
              <div className="col-md-2">
                <select className="form-select form-select-sm" value={filters.district}
                  onChange={(e) => setFilters({ ...filters, district: e.target.value })}>
                  <option value="">All Districts</option>
                  {districts.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </div>
              <div className="col-md-2">
                <select className="form-select form-select-sm" value={filters.type}
                  onChange={(e) => setFilters({ ...filters, type: e.target.value })}>
                  <option value="">All Types</option>
                  {hospitalTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="col-md-2">
                <select className="form-select form-select-sm" value={filters.ownership || ''}
                  onChange={(e) => setFilters({ ...filters, ownership: e.target.value })}>
                  <option value="">All Ownership</option>
                  {ownershipTypes.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="col-md-1">
                <button className="btn btn-outline-secondary btn-sm w-100"
                  onClick={() => setFilters({ search: '', region: '', district: '', type: '', ownership: '' })}>
                  Clear
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Table */}
        <div className="card border-0 shadow-sm">
          <div className="card-body p-0">
            {loading ? (
              <div className="text-center py-5">
                <div className="spinner-border text-primary" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="bg-light">
                    <tr>
                      <th>Facility</th>
                      <th>Code</th>
                      <th>Type</th>
                      <th>Ownership</th>
                      <th>Level</th>
                      <th>District</th>
                      <th>Beds</th>
                      <th>Op. Status</th>
                      <th>Approval</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {hospitals.length === 0 ? (
                      <tr>
                        <td colSpan="10" className="text-center py-4">
                          <i className="fas fa-hospital" style={{ fontSize: '36px', color: '#dee2e6', display: 'block', marginBottom: '8px' }}></i>
                          No hospitals found. Add your first hospital to get started.
                        </td>
                      </tr>
                    ) : hospitals.map((h) => (
                      <tr key={h.id}>
                        <td>
                          <strong>{h.name}</strong>
                          {h.town_city && <><br/><small className="text-muted">{h.town_city}</small></>}
                        </td>
                        <td><code style={{fontSize: '11px'}}>{h.code}</code></td>
                        <td>
                          <span className="badge bg-info bg-opacity-10 text-info" style={{fontSize: '11px'}}>
                            {h.hospital_type_display}
                          </span>
                        </td>
                        <td><small>{h.ownership_type_display}</small></td>
                        <td>
                          <span className={`badge ${h.level_of_care === 'tertiary' ? 'bg-danger' : h.level_of_care === 'secondary' ? 'bg-warning text-dark' : 'bg-secondary'} bg-opacity-75`} style={{fontSize: '11px'}}>
                            {h.level_of_care_display}
                          </span>
                        </td>
                        <td><small>{h.district_name}</small><br/><small className="text-muted">{h.region_name}</small></td>
                        <td>{h.bed_capacity || 0}</td>
                        <td>
                          <span className={`badge ${h.operational_status === 'active' ? 'bg-success' : h.operational_status === 'suspended' ? 'bg-danger' : 'bg-warning text-dark'}`} style={{fontSize: '11px'}}>
                            {h.operational_status_display}
                          </span>
                        </td>
                        <td>
                          {/* Approval Toggle Switch */}
                          <div className="form-check form-switch d-flex align-items-center gap-2" style={{ margin: 0, minHeight: 'auto' }}>
                            <input
                              className="form-check-input"
                              type="checkbox"
                              role="switch"
                              id={`approval-toggle-${h.id}`}
                              checked={h.approval_status === 'approved'}
                              onChange={() => handleApprovalToggle(h)}
                              style={{ width: '40px', height: '22px', cursor: 'pointer' }}
                            />
                            <label
                              className="form-check-label"
                              htmlFor={`approval-toggle-${h.id}`}
                              style={{
                                fontSize: '11px',
                                fontWeight: 600,
                                color: h.approval_status === 'approved' ? '#198754' : h.approval_status === 'rejected' ? '#dc3545' : '#6c757d',
                                cursor: 'pointer'
                              }}
                            >
                              {h.approval_status === 'approved' ? '✓ Approved' : h.approval_status === 'rejected' ? '✗ Rejected' : '○ Pending'}
                            </label>
                          </div>
                        </td>
                        <td>
                          {isReadOnly ? (
                            <span className="text-muted small">View only</span>
                          ) : (
                            <div className="btn-group btn-group-sm">
                              <button className="btn btn-outline-primary" onClick={() => openEditModal(h)} title="Edit">
                                <i className="fas fa-edit"></i>
                              </button>
                              <button className="btn btn-outline-danger" onClick={() => handleDelete(h.id)} title="Delete">
                                <i className="fas fa-trash"></i>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal show d-block" style={modalOverlay}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Add New Hospital</h5>
                <button type="button" className="btn-close" onClick={() => { setShowCreateModal(false); resetForm(); }}></button>
              </div>
              <form onSubmit={handleCreate}>
                {renderHospitalFormFields()}
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary"
                    onClick={() => { setShowCreateModal(false); resetForm(); }}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Create Hospital</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedHospital && (
        <div className="modal show d-block" style={modalOverlay}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Edit Hospital</h5>
                <button type="button" className="btn-close" onClick={() => { setShowEditModal(false); setSelectedHospital(null); resetForm(); }}></button>
              </div>
              <form onSubmit={handleUpdate}>
                <div className="modal-body pb-0">
                  <div className="mb-2">
                    <label className="form-label text-muted" style={{fontSize: '13px'}}>Hospital Code</label>
                    <div>
                      <span className="badge bg-secondary" style={{fontSize: '14px', padding: '8px 16px', letterSpacing: '1px'}}>
                        <i className="fas fa-code me-1"></i>{selectedHospital.code}
                      </span>
                      <small className="text-muted ms-2">Read-only</small>
                    </div>
                  </div>
                </div>
                {renderHospitalFormFields()}
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary"
                    onClick={() => { setShowEditModal(false); setSelectedHospital(null); resetForm(); }}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Update Hospital</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      <ConfirmModal
        show={confirmDelete.show}
        title="Delete Hospital?"
        message="This will permanently delete this hospital and may affect associated staff and departments."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={confirmDeleteAction}
        onCancel={() => setConfirmDelete({ show: false, id: null })}
      />
    </DashboardLayout>
  );
}

export default HospitalManagement;

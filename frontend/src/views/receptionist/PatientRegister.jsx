import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layout/DashboardLayout';

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

const initialFormData = {
  first_name: '',
  last_name: '',
  other_names: '',
  date_of_birth: '',
  gender: '',
  marital_status: '',
  nationality: 'Sierra Leonean',
  national_id: '',
  phone: '',
  alt_phone: '',
  email: '',
  address: '',
  city: '',
  region: '',
  district: '',
  chiefdom: '',
  town: '',
  blood_type: 'unknown',
  allergies: '',
  chronic_conditions: '',
  disabilities: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  emergency_contact_relationship: '',
};

function calculateAge(dob) {
  if (!dob) return null;
  const birthDate = new Date(dob);
  const today = new Date();
  if (isNaN(birthDate.getTime()) || birthDate > today) return null;
  let years = today.getFullYear() - birthDate.getFullYear();
  let months = today.getMonth() - birthDate.getMonth();
  let days = today.getDate() - birthDate.getDate();
  if (days < 0) {
    months--;
    const prevMonth = new Date(today.getFullYear(), today.getMonth(), 0);
    days += prevMonth.getDate();
  }
  if (months < 0) {
    years--;
    months += 12;
  }
  if (years >= 2) return `${years} years`;
  if (years === 1) return months > 0 ? `1 year, ${months} mo` : '1 year';
  if (months >= 1) return days > 0 ? `${months} mo, ${days} days` : `${months} mo`;
  return `${days} day${days !== 1 ? 's' : ''}`;
}

const DRAFT_KEY = 'nehr_patient_register_draft';

function PatientRegister() {
  const { apiCall } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      return saved ? { ...initialFormData, ...JSON.parse(saved) } : initialFormData;
    } catch { return initialFormData; }
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [step, setStep] = useState(1);
  const computedAge = calculateAge(formData.date_of_birth);

  // Auto-save draft to localStorage on every formData change
  useEffect(() => {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
  }, [formData]);

  // Camera / photo capture
  const [photoPreview, setPhotoPreview] = useState(null);
  const [photoFile, setPhotoFile] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user', width: 640, height: 480 } });
      streamRef.current = stream;
      setCameraActive(true); // render <video> first, then attach stream in useEffect
    } catch {
      setError('Unable to access camera. Please check permissions or use file upload instead.');
    }
  };

  // After cameraActive becomes true the <video> element is in the DOM — attach the stream
  useEffect(() => {
    if (cameraActive && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [cameraActive]);

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const video = videoRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    canvas.toBlob((blob) => {
      if (blob) {
        const file = new File([blob], `patient-photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
        setPhotoFile(file);
        setPhotoPreview(URL.createObjectURL(blob));
      }
    }, 'image/jpeg', 0.85);
    stopCamera();
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      setPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const removePhoto = () => {
    setPhotoFile(null);
    setPhotoPreview(null);
  };

  // Geographic cascading dropdowns
  const [regions, setRegions] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [chiefdoms, setChiefdoms] = useState([]);
  const [towns, setTowns] = useState([]);

  // Fetch regions on mount
  useEffect(() => {
    const fetchRegions = async () => {
      try {
        const res = await apiCall('/admin/regions/');
        if (res.ok) {
          const data = await res.json();
          setRegions(Array.isArray(data) ? data : data.results || []);
        }
      } catch { /* ignore */ }
    };
    fetchRegions();
  }, [apiCall]);

  // Fetch districts when region changes
  const fetchDistricts = useCallback(async (regionId) => {
    if (!regionId) { setDistricts([]); setChiefdoms([]); setTowns([]); return; }
    try {
      const res = await apiCall(`/admin/districts/?region=${regionId}`);
      if (res.ok) {
        const data = await res.json();
        setDistricts(Array.isArray(data) ? data : data.results || []);
      }
    } catch { /* ignore */ }
    setChiefdoms([]);
    setTowns([]);
  }, [apiCall]);

  // Fetch chiefdoms when district changes
  const fetchChiefdoms = useCallback(async (districtId) => {
    if (!districtId) { setChiefdoms([]); setTowns([]); return; }
    try {
      const res = await apiCall(`/admin/chiefdoms/?district=${districtId}`);
      if (res.ok) {
        const data = await res.json();
        setChiefdoms(Array.isArray(data) ? data : data.results || []);
      }
    } catch { /* ignore */ }
    setTowns([]);
  }, [apiCall]);

  // Fetch towns when chiefdom changes
  const fetchTowns = useCallback(async (districtId, chiefdomId) => {
    if (!districtId) { setTowns([]); return; }
    try {
      let url = `/admin/towns/?district=${districtId}`;
      if (chiefdomId) url += `&chiefdom=${chiefdomId}`;
      const res = await apiCall(url);
      if (res.ok) {
        const data = await res.json();
        setTowns(Array.isArray(data) ? data : data.results || []);
      }
    } catch { /* ignore */ }
  }, [apiCall]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleRegionChange = (e) => {
    const regionId = e.target.value;
    // Find region name text
    const regionObj = regions.find(r => String(r.id) === String(regionId));
    setFormData({ ...formData, region: regionObj ? regionObj.name : '', district: '', chiefdom: '', town: '' });
    fetchDistricts(regionId);
  };

  const handleDistrictChange = (e) => {
    const districtId = e.target.value;
    setFormData({ ...formData, district: districtId, chiefdom: '', town: '' });
    fetchChiefdoms(districtId);
    fetchTowns(districtId, '');
  };

  const handleChiefdomChange = (e) => {
    const chiefdomId = e.target.value;
    setFormData({ ...formData, chiefdom: chiefdomId, town: '' });
    fetchTowns(formData.district, chiefdomId);
  };

  const handleTownChange = (e) => {
    setFormData({ ...formData, town: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validate required fields
    if (!formData.first_name || !formData.last_name || !formData.date_of_birth || !formData.gender || !formData.phone) {
      setError('Please fill in all required fields: First Name, Last Name, Date of Birth, Gender, and Phone.');
      setStep(1);
      return;
    }

    try {
      setSaving(true);
      const fd = new FormData();
      Object.entries(formData).forEach(([key, val]) => {
        if (val !== '' && val !== null && val !== undefined) fd.append(key, val);
      });
      if (photoFile) fd.append('photo', photoFile);
      const response = await apiCall('/patients/', {
        method: 'POST',
        body: fd,
        isFormData: true,
      });
      const data = await response.json();
      if (response.ok) {
        localStorage.removeItem(DRAFT_KEY);
        setSuccess(`Patient ${data.patient.full_name} registered successfully! ID: ${data.patient.patient_id}`);
        setFormData(initialFormData);
        setStep(1);
        setTimeout(() => navigate('/receptionist/patients'), 2000);
      } else {
        const msg = data.error || data.detail || Object.values(data).flat().join(', ') || 'Registration failed.';
        setError(msg);
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const nextStep = () => {
    if (step === 1) {
      if (!formData.first_name || !formData.last_name || !formData.date_of_birth || !formData.gender || !formData.phone) {
        setError('Please fill in all required fields before proceeding.');
        return;
      }
      setError('');
    }
    setStep(s => Math.min(s + 1, 3));
  };
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  return (
    <DashboardLayout navItems={navItems} brandTitle="NEHR System" roleBadge="Receptionist">
      <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
        <div>
          <h4 className="mb-1"><i className="fas fa-user-plus me-2 text-primary"></i>Register New Patient</h4>
          <p className="text-muted mb-0">Fill in patient details to create a new record</p>
        </div>
        <button className="btn btn-outline-secondary btn-sm" onClick={() => navigate('/receptionist/patients')}>
          <i className="fas fa-arrow-left me-1"></i>Back to Patients
        </button>
      </div>

      {/* Step Indicator */}
      <div className="dash-card mb-4">
        <div className="dash-card-body">
          <div className="d-flex justify-content-between align-items-center" style={{maxWidth: '600px', margin: '0 auto'}}>
            {[
              { num: 1, label: 'Personal Info', icon: 'fas fa-user' },
              { num: 2, label: 'Contact & Address', icon: 'fas fa-map-marker-alt' },
              { num: 3, label: 'Medical & Emergency', icon: 'fas fa-heartbeat' },
            ].map((s, i) => (
              <div key={s.num} className="text-center" style={{flex: 1, position: 'relative'}}>
                <div
                  onClick={() => setStep(s.num)}
                  style={{
                    width: '40px', height: '40px', borderRadius: '50%', margin: '0 auto 6px',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    background: step >= s.num ? '#4361ee' : '#e9ecef',
                    color: step >= s.num ? '#fff' : '#6c757d',
                    cursor: 'pointer', fontSize: '14px', transition: 'all 0.2s',
                  }}
                >
                  <i className={s.icon}></i>
                </div>
                <small style={{fontSize: '11px', color: step >= s.num ? '#4361ee' : '#6c757d', fontWeight: step === s.num ? 600 : 400}}>
                  {s.label}
                </small>
                {i < 2 && (
                  <div style={{
                    position: 'absolute', top: '20px', left: '60%', width: '80%', height: '2px',
                    background: step > s.num ? '#4361ee' : '#e9ecef',
                  }}></div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Alerts */}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          <i className="fas fa-exclamation-triangle me-2"></i>{error}
          <button type="button" className="btn-close" onClick={() => setError('')}></button>
        </div>
      )}
      {success && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          <i className="fas fa-check-circle me-2"></i>{success}
          <button type="button" className="btn-close" onClick={() => setSuccess('')}></button>
        </div>
      )}

      <form>
        {/* Step 1: Personal Info */}
        {step === 1 && (
          <div className="dash-card">
            <div className="dash-card-header">
              <h6><i className="fas fa-user me-2"></i>Personal Information</h6>
            </div>
            <div className="dash-card-body">
              <div className="row g-3">
                <div className="col-md-4">
                  <label className="form-label">First Name <span className="text-danger">*</span></label>
                  <input type="text" className="form-control" name="first_name" value={formData.first_name} onChange={handleChange} required />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Other Names</label>
                  <input type="text" className="form-control" name="other_names" value={formData.other_names} onChange={handleChange} />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Last Name <span className="text-danger">*</span></label>
                  <input type="text" className="form-control" name="last_name" value={formData.last_name} onChange={handleChange} required />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Date of Birth <span className="text-danger">*</span></label>
                  <input type="date" className="form-control" name="date_of_birth" value={formData.date_of_birth} onChange={handleChange} max={new Date().toISOString().split('T')[0]} required />
                  {computedAge && (
                    <div className="mt-1">
                      <span className="badge bg-info text-dark" style={{fontSize: '12px'}}>
                        <i className="fas fa-birthday-cake me-1"></i>Age: {computedAge}
                      </span>
                    </div>
                  )}
                </div>
                <div className="col-md-4">
                  <label className="form-label">Gender <span className="text-danger">*</span></label>
                  <select className="form-select" name="gender" value={formData.gender} onChange={handleChange} required>
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label">Marital Status</label>
                  <select className="form-select" name="marital_status" value={formData.marital_status} onChange={handleChange}>
                    <option value="">Select</option>
                    <option value="single">Single</option>
                    <option value="married">Married</option>
                    <option value="divorced">Divorced</option>
                    <option value="widowed">Widowed</option>
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label">Nationality</label>
                  <input type="text" className="form-control" name="nationality" value={formData.nationality} onChange={handleChange} />
                </div>
                <div className="col-md-4">
                  <label className="form-label">National ID (NIN)</label>
                  <input type="text" className="form-control" name="national_id" value={formData.national_id} onChange={handleChange}
                    placeholder="e.g. 1234567890" />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Phone <span className="text-danger">*</span></label>
                  <input type="tel" className="form-control" name="phone" value={formData.phone} onChange={handleChange} required
                    placeholder="e.g. 076 123 456" />
                </div>

                {/* Patient Photo Capture */}
                <div className="col-12">
                  <hr className="mt-3" />
                  <h6 className="mb-3"><i className="fas fa-camera me-2 text-primary"></i>Patient Photo</h6>
                  <div className="d-flex align-items-start gap-3 flex-wrap">
                    {/* Preview / Camera area */}
                    <div style={{
                      width: cameraActive ? '100%' : '200px',
                      maxWidth: '480px',
                      minHeight: cameraActive ? '360px' : '160px',
                      border: '2px solid ' + (cameraActive ? '#4361ee' : '#dee2e6'),
                      borderRadius: '12px',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      overflow: 'hidden', background: '#000', position: 'relative',
                      transition: 'all 0.3s',
                    }}>
                      {cameraActive ? (
                        <video ref={videoRef} autoPlay playsInline muted
                          style={{width: '100%', height: '100%', objectFit: 'contain', display: 'block'}} />
                      ) : photoPreview ? (
                        <img src={photoPreview} alt="Patient" style={{width: '100%', height: '100%', objectFit: 'cover', borderRadius: '10px'}} />
                      ) : (
                        <div className="text-center text-muted" style={{padding: '20px', background: '#f8f9fa', width: '100%', height: '100%',
                          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'}}>
                          <i className="fas fa-user-circle" style={{fontSize: '48px', opacity: 0.3}}></i>
                          <div style={{fontSize: '11px', marginTop: '6px'}}>No photo</div>
                        </div>
                      )}
                    </div>

                    {/* Controls */}
                    <div className="d-flex flex-column gap-2">
                      {!cameraActive ? (
                        <>
                          <button type="button" className="btn btn-outline-primary btn-sm" onClick={startCamera}>
                            <i className="fas fa-camera me-1"></i>Open Camera
                          </button>
                          <label className="btn btn-outline-secondary btn-sm mb-0" style={{cursor: 'pointer'}}>
                            <i className="fas fa-upload me-1"></i>Upload Photo
                            <input type="file" accept="image/*" onChange={handleFileUpload} hidden />
                          </label>
                          {photoPreview && (
                            <button type="button" className="btn btn-outline-danger btn-sm" onClick={removePhoto}>
                              <i className="fas fa-trash me-1"></i>Remove
                            </button>
                          )}
                        </>
                      ) : (
                        <>
                          <button type="button" className="btn btn-success btn-sm" onClick={capturePhoto}>
                            <i className="fas fa-circle me-1"></i>Capture
                          </button>
                          <button type="button" className="btn btn-outline-secondary btn-sm" onClick={stopCamera}>
                            <i className="fas fa-times me-1"></i>Cancel
                          </button>
                        </>
                      )}
                    </div>
                    <canvas ref={canvasRef} style={{display: 'none'}} />
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Contact & Address */}
        {step === 2 && (
          <div className="dash-card">
            <div className="dash-card-header">
              <h6><i className="fas fa-map-marker-alt me-2"></i>Contact & Address</h6>
            </div>
            <div className="dash-card-body">
              <div className="row g-3">
                <div className="col-md-6">
                  <label className="form-label">Alternative Phone</label>
                  <input type="tel" className="form-control" name="alt_phone" value={formData.alt_phone} onChange={handleChange} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Email</label>
                  <input type="email" className="form-control" name="email" value={formData.email} onChange={handleChange} />
                </div>
                <div className="col-md-12">
                  <label className="form-label">Residential Address</label>
                  <textarea className="form-control" name="address" value={formData.address} onChange={handleChange} rows="2"
                    placeholder="House number, street, landmark"></textarea>
                </div>

                {/* Region dropdown - fetched from API */}
                <div className="col-md-6">
                  <label className="form-label">Region</label>
                  <select className="form-select" onChange={handleRegionChange}
                    value={regions.find(r => r.name === formData.region)?.id || ''}>
                    <option value="">Select Region</option>
                    {regions.map(r => (
                      <option key={r.id} value={r.id}>{r.name}</option>
                    ))}
                  </select>
                </div>

                {/* District dropdown - loads when region selected */}
                <div className="col-md-6">
                  <label className="form-label">District</label>
                  <select className="form-select" onChange={handleDistrictChange} value={formData.district}
                    disabled={districts.length === 0}>
                    <option value="">{districts.length === 0 ? 'Select Region first' : 'Select District'}</option>
                    {districts.map(d => (
                      <option key={d.id} value={d.id}>{d.name}</option>
                    ))}
                  </select>
                </div>

                {/* Chiefdom dropdown - loads when district selected */}
                <div className="col-md-6">
                  <label className="form-label">Chiefdom</label>
                  <select className="form-select" onChange={handleChiefdomChange} value={formData.chiefdom}
                    disabled={chiefdoms.length === 0}>
                    <option value="">{chiefdoms.length === 0 ? 'Select District first' : 'Select Chiefdom'}</option>
                    {chiefdoms.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                {/* Town dropdown - loads when district/chiefdom selected */}
                <div className="col-md-6">
                  <label className="form-label">Town</label>
                  <select className="form-select" onChange={handleTownChange} value={formData.town}
                    disabled={towns.length === 0}>
                    <option value="">{towns.length === 0 ? 'Select District first' : 'Select Town'}</option>
                    {towns.map(t => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                </div>

                <div className="col-md-6">
                  <label className="form-label">City / Town (text)</label>
                  <input type="text" className="form-control" name="city" value={formData.city} onChange={handleChange}
                    placeholder="Optional: type if not in dropdown" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Medical & Emergency */}
        {step === 3 && (
          <div className="dash-card">
            <div className="dash-card-header">
              <h6><i className="fas fa-heartbeat me-2"></i>Medical & Emergency Information</h6>
            </div>
            <div className="dash-card-body">
              <div className="row g-3">
                <div className="col-md-4">
                  <label className="form-label">Blood Type</label>
                  <select className="form-select" name="blood_type" value={formData.blood_type} onChange={handleChange}>
                    <option value="unknown">Unknown</option>
                    <option value="A+">A+</option><option value="A-">A-</option>
                    <option value="B+">B+</option><option value="B-">B-</option>
                    <option value="AB+">AB+</option><option value="AB-">AB-</option>
                    <option value="O+">O+</option><option value="O-">O-</option>
                  </select>
                </div>
                <div className="col-md-8">
                  <label className="form-label">Known Allergies</label>
                  <input type="text" className="form-control" name="allergies" value={formData.allergies} onChange={handleChange}
                    placeholder="e.g. Penicillin, Peanuts, Latex (comma-separated)" />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Chronic Conditions</label>
                  <input type="text" className="form-control" name="chronic_conditions" value={formData.chronic_conditions} onChange={handleChange}
                    placeholder="e.g. Diabetes, Hypertension, Asthma" />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Disabilities</label>
                  <input type="text" className="form-control" name="disabilities" value={formData.disabilities} onChange={handleChange}
                    placeholder="e.g. Visual impairment, Mobility issues" />
                </div>

                <hr className="mt-4" />
                <h6 className="mb-0"><i className="fas fa-phone-alt me-2 text-danger"></i>Emergency Contact</h6>
                <div className="col-md-4">
                  <label className="form-label">Full Name</label>
                  <input type="text" className="form-control" name="emergency_contact_name" value={formData.emergency_contact_name} onChange={handleChange} />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Phone Number</label>
                  <input type="tel" className="form-control" name="emergency_contact_phone" value={formData.emergency_contact_phone} onChange={handleChange} />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Relationship</label>
                  <select className="form-select" name="emergency_contact_relationship" value={formData.emergency_contact_relationship} onChange={handleChange}>
                    <option value="">Select</option>
                    <option value="Spouse">Spouse</option>
                    <option value="Parent">Parent</option>
                    <option value="Child">Child</option>
                    <option value="Sibling">Sibling</option>
                    <option value="Guardian">Guardian</option>
                    <option value="Friend">Friend</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

      </form>

      {/* Navigation Buttons — outside <form> to prevent any accidental submission */}
      <div className="d-flex justify-content-between mt-4">
        {step > 1 ? (
          <button type="button" className="btn btn-outline-secondary" onClick={prevStep}>
            <i className="fas fa-arrow-left me-1"></i>Previous
          </button>
        ) : <div></div>}

        {step < 3 ? (
          <button type="button" className="btn btn-primary" onClick={nextStep}>
            Next <i className="fas fa-arrow-right ms-1"></i>
          </button>
        ) : (
          <button type="button" className="btn btn-success" onClick={handleSubmit} disabled={saving}>
            {saving ? (
              <><span className="spinner-border spinner-border-sm me-1"></span>Registering...</>
            ) : (
              <><i className="fas fa-check-circle me-1"></i>Register Patient</>
            )}
          </button>
        )}
      </div>
    </DashboardLayout>
  );
}

export default PatientRegister;

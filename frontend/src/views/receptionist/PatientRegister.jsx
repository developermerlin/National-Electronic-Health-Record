import React, { useState } from 'react';
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
  nationality: 'Ghanaian',
  national_id: '',
  phone: '',
  alt_phone: '',
  email: '',
  address: '',
  city: '',
  region: '',
  blood_type: 'unknown',
  allergies: '',
  chronic_conditions: '',
  disabilities: '',
  insurance_provider: '',
  insurance_number: '',
  insurance_expiry: '',
  next_of_kin_name: '',
  next_of_kin_phone: '',
  next_of_kin_relationship: '',
  next_of_kin_address: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  emergency_contact_relationship: '',
};

function PatientRegister() {
  const { apiCall } = useAuth();
  const navigate = useNavigate();
  const [formData, setFormData] = useState(initialFormData);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [step, setStep] = useState(1);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
      const response = await apiCall('/patients/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (response.ok) {
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
    setStep(s => Math.min(s + 1, 4));
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
              { num: 3, label: 'Medical & Insurance', icon: 'fas fa-heartbeat' },
              { num: 4, label: 'Next of Kin', icon: 'fas fa-user-friends' },
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
                {i < 3 && (
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

      <form onSubmit={handleSubmit}>
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
                  <input type="date" className="form-control" name="date_of_birth" value={formData.date_of_birth} onChange={handleChange} required />
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
                  <label className="form-label">National ID (Ghana Card)</label>
                  <input type="text" className="form-control" name="national_id" value={formData.national_id} onChange={handleChange}
                    placeholder="GHA-XXXXXXXXX-X" />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Phone <span className="text-danger">*</span></label>
                  <input type="tel" className="form-control" name="phone" value={formData.phone} onChange={handleChange} required
                    placeholder="02XXXXXXXX" />
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
                <div className="col-md-6">
                  <label className="form-label">City / Town</label>
                  <input type="text" className="form-control" name="city" value={formData.city} onChange={handleChange} />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Region</label>
                  <select className="form-select" name="region" value={formData.region} onChange={handleChange}>
                    <option value="">Select Region</option>
                    <option value="Greater Accra">Greater Accra</option>
                    <option value="Ashanti">Ashanti</option>
                    <option value="Western">Western</option>
                    <option value="Eastern">Eastern</option>
                    <option value="Central">Central</option>
                    <option value="Northern">Northern</option>
                    <option value="Volta">Volta</option>
                    <option value="Upper East">Upper East</option>
                    <option value="Upper West">Upper West</option>
                    <option value="Brong Ahafo">Brong Ahafo</option>
                    <option value="Western North">Western North</option>
                    <option value="Ahafo">Ahafo</option>
                    <option value="Bono East">Bono East</option>
                    <option value="Oti">Oti</option>
                    <option value="North East">North East</option>
                    <option value="Savannah">Savannah</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Medical & Insurance */}
        {step === 3 && (
          <div className="dash-card">
            <div className="dash-card-header">
              <h6><i className="fas fa-heartbeat me-2"></i>Medical & Insurance Information</h6>
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
                <h6 className="mb-0"><i className="fas fa-shield-alt me-2 text-success"></i>Insurance Details</h6>
                <div className="col-md-4">
                  <label className="form-label">Insurance Provider</label>
                  <select className="form-select" name="insurance_provider" value={formData.insurance_provider} onChange={handleChange}>
                    <option value="">No Insurance</option>
                    <option value="NHIS">NHIS (National Health Insurance)</option>
                    <option value="Private">Private Insurance</option>
                    <option value="Company">Company Insurance</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                <div className="col-md-4">
                  <label className="form-label">Insurance Number</label>
                  <input type="text" className="form-control" name="insurance_number" value={formData.insurance_number} onChange={handleChange} />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Expiry Date</label>
                  <input type="date" className="form-control" name="insurance_expiry" value={formData.insurance_expiry} onChange={handleChange} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4: Next of Kin & Emergency */}
        {step === 4 && (
          <div className="dash-card">
            <div className="dash-card-header">
              <h6><i className="fas fa-user-friends me-2"></i>Next of Kin & Emergency Contact</h6>
            </div>
            <div className="dash-card-body">
              <div className="row g-3">
                <h6 className="mb-0 text-primary">Next of Kin</h6>
                <div className="col-md-4">
                  <label className="form-label">Full Name</label>
                  <input type="text" className="form-control" name="next_of_kin_name" value={formData.next_of_kin_name} onChange={handleChange} />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Phone Number</label>
                  <input type="tel" className="form-control" name="next_of_kin_phone" value={formData.next_of_kin_phone} onChange={handleChange} />
                </div>
                <div className="col-md-4">
                  <label className="form-label">Relationship</label>
                  <select className="form-select" name="next_of_kin_relationship" value={formData.next_of_kin_relationship} onChange={handleChange}>
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
                <div className="col-md-12">
                  <label className="form-label">Address</label>
                  <input type="text" className="form-control" name="next_of_kin_address" value={formData.next_of_kin_address} onChange={handleChange} />
                </div>

                <hr className="mt-4" />
                <h6 className="mb-0 text-danger">Emergency Contact</h6>
                <p className="text-muted" style={{fontSize: '12px', marginTop: '2px'}}>If different from next of kin</p>
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

        {/* Navigation Buttons */}
        <div className="d-flex justify-content-between mt-4">
          {step > 1 ? (
            <button type="button" className="btn btn-outline-secondary" onClick={prevStep}>
              <i className="fas fa-arrow-left me-1"></i>Previous
            </button>
          ) : <div></div>}

          {step < 4 ? (
            <button type="button" className="btn btn-primary" onClick={nextStep}>
              Next <i className="fas fa-arrow-right ms-1"></i>
            </button>
          ) : (
            <button type="submit" className="btn btn-success" disabled={saving}>
              {saving ? (
                <><span className="spinner-border spinner-border-sm me-1"></span>Registering...</>
              ) : (
                <><i className="fas fa-check-circle me-1"></i>Register Patient</>
              )}
            </button>
          )}
        </div>
      </form>
    </DashboardLayout>
  );
}

export default PatientRegister;

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layout/DashboardLayout';
import { getNavForUser, getBrandForUser, getRoleBadge } from '../../utils/navItems';

const genderColors = { male: '#4361ee', female: '#e63946', other: '#7c3aed' };

function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { apiCall, user } = useAuth();

  const [patient, setPatient] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details');
  const [visitHistory, setVisitHistory] = useState([]);
  const [loadingVisits, setLoadingVisits] = useState(false);
  const [expandedVisit, setExpandedVisit] = useState(null);

  // Edit modal state
  const [showEditModal, setShowEditModal] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);

  // Delete modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Portal account state
  const [showPortalModal, setShowPortalModal] = useState(false);
  const [portalForm, setPortalForm] = useState({ password: '', password2: '' });
  const [portalSaving, setPortalSaving] = useState(false);
  const [portalError, setPortalError] = useState('');
  const [portalSuccess, setPortalSuccess] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [showPwd2, setShowPwd2] = useState(false);

  // ── Visit recording state ──
  const [departments, setDepartments] = useState([]);
  const [doctors, setDoctors] = useState([]);

  // New visit modal
  const [showVisitModal, setShowVisitModal] = useState(false);
  const [visitForm, setVisitForm] = useState({
    visit_type: 'outpatient', chief_complaint: '', department: '', doctor: '',
    visit_date: new Date().toISOString().slice(0, 16), status: 'registered',
  });
  const [visitSaving, setVisitSaving] = useState(false);
  const [visitError, setVisitError] = useState('');

  // Vitals modal
  const [vitalsVisitId, setVitalsVisitId] = useState(null);
  const [showVitalsModal, setShowVitalsModal] = useState(false);
  const [vitalsForm, setVitalsForm] = useState({
    blood_pressure_systolic: '', blood_pressure_diastolic: '', heart_rate: '',
    respiratory_rate: '', temperature_celsius: '', weight_kg: '', height_cm: '',
    oxygen_saturation: '', blood_glucose: '', notes: '',
  });
  const [vitalsSaving, setVitalsSaving] = useState(false);

  // Clinical note modal
  const [noteVisitId, setNoteVisitId] = useState(null);
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteForm, setNoteForm] = useState({
    diagnosis: '', notes: '', prescription: '', treatment_plan: '', follow_up_date: '',
  });
  const [noteSaving, setNoteSaving] = useState(false);

  // Cancel visit state
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelVisitId, setCancelVisitId] = useState(null);
  const [cancelSaving, setCancelSaving] = useState(false);

  // Hospital letterhead data for print
  const [hospitalDetails, setHospitalDetails] = useState(null);

  // ── Emergency access (break-the-glass) state ──
  const [showEmergencyModal, setShowEmergencyModal] = useState(false);
  const [emergencyJustification, setEmergencyJustification] = useState('');
  const [emergencySaving, setEmergencySaving] = useState(false);
  const [emergencyError, setEmergencyError] = useState('');
  const [accessDenied, setAccessDenied] = useState(false);

  useEffect(() => {
    const fetchHospital = async () => {
      if (!user?.hospital_id) return;
      try {
        const res = await apiCall(`/admin/hospitals/${user.hospital_id}/`);
        if (res.ok) {
          const data = await res.json();
          setHospitalDetails(data);
        }
      } catch (err) { console.error('Error fetching hospital:', err); }
    };
    fetchHospital();
  }, [apiCall, user?.hospital_id]);

  const handlePrintRecord = () => {
    window.print();
  };

  const fetchPatient = useCallback(async () => {
    setLoading(true);
    setAccessDenied(false);
    setEmergencyError('');
    try {
      const res = await apiCall(`/patients/${id}/`);
      if (res.ok) {
        const data = await res.json();
        setPatient(data);
      } else if (res.status === 403) {
        setAccessDenied(true);
        try {
          const data = await res.json();
          setEmergencyError(data.error || 'Access denied to this patient record.');
        } catch {
          setEmergencyError('Access denied to this patient record.');
        }
      } else {
        // Other errors (404, 500, etc.)
        try {
          const data = await res.json();
          setEmergencyError(data.error || `Error ${res.status}: unable to load patient.`);
        } catch {
          setEmergencyError(`Error ${res.status}: unable to load patient.`);
        }
      }
    } catch {
      setEmergencyError('Network error. Unable to load patient record.');
    } finally {
      setLoading(false);
    }
  }, [id, apiCall]);

  const fetchVisitHistory = useCallback(async () => {
    setLoadingVisits(true);
    try {
      const res = await apiCall(`/visits/patient_history/${id}/`);
      if (res.ok) {
        const data = await res.json();
        setVisitHistory(Array.isArray(data) ? data : []);
      } else {
        setVisitHistory([]);
      }
    } catch {
      setVisitHistory([]);
    } finally {
      setLoadingVisits(false);
    }
  }, [id, apiCall]);

  const handleEmergencyAccess = async () => {
    if (!emergencyJustification.trim() || emergencyJustification.trim().length < 10) {
      setEmergencyError('Please provide a detailed justification (at least 10 characters).');
      return;
    }
    setEmergencySaving(true);
    setEmergencyError('');
    try {
      const res = await apiCall(`/patients/${id}/emergency_access/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ justification: emergencyJustification.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.allowed) {
        setPatient(data.patient);
        setAccessDenied(false);
        setShowEmergencyModal(false);
        setEmergencyJustification('');
      } else {
        setEmergencyError(data.error || 'Emergency access request denied.');
      }
    } catch {
      setEmergencyError('Network error. Please try again.');
    } finally {
      setEmergencySaving(false);
    }
  };

  const fetchLookups = useCallback(async () => {
    try {
      const [dRes, depRes] = await Promise.all([
        apiCall('/appointments/doctors/'),
        apiCall('/admin/departments/'),
      ]);
      if (dRes.ok) {
        const d = await dRes.json();
        setDoctors(d.doctors || []);
      }
      if (depRes.ok) {
        const dep = await depRes.json();
        setDepartments(Array.isArray(dep) ? dep : dep.results || []);
      }
    } catch (err) { console.error('Error fetching lookups:', err); }
  }, [apiCall]);

  useEffect(() => {
    fetchPatient();
    fetchVisitHistory();
  }, [fetchPatient, fetchVisitHistory]);

  const openEditModal = () => {
    setEditForm({
      first_name: patient.first_name || '',
      last_name: patient.last_name || '',
      other_names: patient.other_names || '',
      phone: patient.phone || '',
      alt_phone: patient.alt_phone || '',
      email: patient.email || '',
      address: patient.address || '',
      city: patient.city || '',
      region: patient.region || '',
      blood_type: patient.blood_type || 'unknown',
      allergies: patient.allergies || '',
      chronic_conditions: patient.chronic_conditions || '',
      emergency_contact_name: patient.emergency_contact_name || '',
      emergency_contact_phone: patient.emergency_contact_phone || '',
      emergency_contact_relationship: patient.emergency_contact_relationship || '',
      status: patient.status || 'active',
    });
    setShowEditModal(true);
  };

  const handleEditSave = async () => {
    setSaving(true);
    try {
      const res = await apiCall(`/patients/${id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        setShowEditModal(false);
        fetchPatient();
      }
    } catch {
      console.error('Error updating patient');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      const res = await apiCall(`/patients/${id}/`, { method: 'DELETE' });
      if (res.ok || res.status === 204) {
        navigate('/receptionist/patients');
      }
    } catch {
      console.error('Error deleting patient');
    } finally {
      setDeleting(false);
    }
  };

  const handleCreatePortalAccount = async () => {
    setPortalError('');
    if (!portalForm.password || !portalForm.password2) { setPortalError('Both fields are required.'); return; }
    if (portalForm.password !== portalForm.password2) { setPortalError('Passwords do not match.'); return; }
    if (portalForm.password.length < 8) { setPortalError('Password must be at least 8 characters.'); return; }
    setPortalSaving(true);
    try {
      const res = await apiCall(`/patients/${id}/create_portal_account/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(portalForm),
      });
      const data = await res.json();
      if (res.ok) {
        setPortalSuccess(`Portal account created! Patient can log in with: ${patient.email}`);
        fetchPatient();
      } else {
        setPortalError(data.error || 'Failed to create portal account.');
      }
    } catch { setPortalError('Network error. Please try again.'); }
    setPortalSaving(false);
  };

  // ── Create new visit ──
  const openVisitModal = () => {
    setVisitForm({
      visit_type: 'outpatient', chief_complaint: '', department: '', doctor: '',
      visit_date: new Date().toISOString().slice(0, 16), status: 'registered',
    });
    setVisitError('');
    fetchLookups();
    setShowVisitModal(true);
  };

  const handleCreateVisit = async () => {
    setVisitError('');
    if (!visitForm.chief_complaint.trim()) { setVisitError('Chief complaint is required.'); return; }
    setVisitSaving(true);
    try {
      const payload = {
        patient: Number(id),
        visit_type: visitForm.visit_type,
        chief_complaint: visitForm.chief_complaint,
        department: visitForm.department ? Number(visitForm.department) : null,
        doctor: visitForm.doctor ? Number(visitForm.doctor) : null,
        visit_date: visitForm.visit_date,
        status: visitForm.status,
      };
      const res = await apiCall('/visits/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setShowVisitModal(false);
        fetchVisitHistory();
        setActiveTab('visits');
      } else {
        const data = await res.json();
        setVisitError(data.detail || Object.values(data).flat().join(', ') || 'Failed to create visit.');
      }
    } catch {
      setVisitError('Network error. Please try again.');
    }
    setVisitSaving(false);
  };

  // ── Record vitals ──
  const openVitalsModal = (visitId) => {
    setVitalsVisitId(visitId);
    setVitalsForm({
      blood_pressure_systolic: '', blood_pressure_diastolic: '', heart_rate: '',
      respiratory_rate: '', temperature_celsius: '', weight_kg: '', height_cm: '',
      oxygen_saturation: '', blood_glucose: '', notes: '',
    });
    setShowVitalsModal(true);
  };

  const handleSaveVitals = async () => {
    setVitalsSaving(true);
    try {
      const res = await apiCall(`/visits/${vitalsVisitId}/add_vitals/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(vitalsForm),
      });
      if (res.ok) {
        setShowVitalsModal(false);
        fetchVisitHistory();
      }
    } catch { console.error('Error saving vitals'); }
    setVitalsSaving(false);
  };

  // ── Write clinical note ──
  const openNoteModal = (visitId) => {
    setNoteVisitId(visitId);
    setNoteForm({ diagnosis: '', notes: '', prescription: '', treatment_plan: '', follow_up_date: '' });
    setShowNoteModal(true);
  };

  const handleSaveNote = async () => {
    setNoteSaving(true);
    try {
      const payload = { ...noteForm };
      if (!payload.follow_up_date) delete payload.follow_up_date;
      const res = await apiCall(`/visits/${noteVisitId}/add_clinical_note/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (res.ok) {
        setShowNoteModal(false);
        fetchVisitHistory();
      }
    } catch { console.error('Error saving clinical note'); }
    setNoteSaving(false);
  };

  // ── Cancel visit ──
  const openCancelModal = (visitId) => {
    setCancelVisitId(visitId);
    setShowCancelModal(true);
  };

  const handleCancelVisit = async () => {
    setCancelSaving(true);
    try {
      const res = await apiCall(`/visits/${cancelVisitId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'cancelled' }),
      });
      if (res.ok) {
        setShowCancelModal(false);
        fetchVisitHistory();
      }
    } catch { console.error('Error cancelling visit'); }
    setCancelSaving(false);
  };

  if (loading) {
    return (
      <DashboardLayout navItems={getNavForUser(user)} brandTitle={getBrandForUser(user)} roleBadge={getRoleBadge(user)}>
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="mt-3 text-muted">Loading patient record...</p>
        </div>
      </DashboardLayout>
    );
  }

  if (!patient && accessDenied) {
    return (
      <DashboardLayout navItems={getNavForUser(user)} brandTitle={getBrandForUser(user)} roleBadge={getRoleBadge(user)}>
        <div className="screen-only">
          <div style={{ maxWidth: 560, margin: '60px auto', textAlign: 'center', padding: '40px 32px', borderRadius: '16px', background: '#fff', border: '1px solid #e2e8f0' }}>
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px' }}>
              <i className="fas fa-shield-alt" style={{ color: '#dc2626', fontSize: 24 }}></i>
            </div>
            <h3 style={{ fontWeight: 800, color: '#1a1a2e', marginBottom: 8 }}>Access Denied</h3>
            <p style={{ color: '#64748b', marginBottom: 20 }}>{emergencyError}</p>
            <button
              className="btn btn-danger"
              onClick={() => { setShowEmergencyModal(true); setEmergencyError(''); }}
              style={{ borderRadius: 10, fontWeight: 600 }}
            >
              <i className="fas fa-exclamation-triangle me-2"></i>
              Emergency Override
            </button>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  if (!patient) {
    return (
      <DashboardLayout navItems={getNavForUser(user)} brandTitle={getBrandForUser(user)} roleBadge={getRoleBadge(user)}>
        <div className="screen-only text-center py-5">
          <p className="text-muted">{emergencyError || 'Unable to load patient record.'}</p>
        </div>
      </DashboardLayout>
    );
  }

  const statusColor = patient.status === 'active' ? '#16a34a' : patient.status === 'deceased' ? '#dc2626' : '#d97706';
  const statusBg    = patient.status === 'active' ? '#dcfce7' : patient.status === 'deceased' ? '#fee2e2' : '#fef3c7';
  const gColor      = genderColors[patient.gender] || '#4361ee';
  const getInitials = (f, l) => ((f?.[0] || '') + (l?.[0] || '')).toUpperCase() || '??';

  const SectionTitle = ({ icon, color, label }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px', marginTop: '4px' }}>
      <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: color,
        display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <i className={icon} style={{ color: '#fff', fontSize: '13px' }}></i>
      </div>
      <span style={{ fontWeight: 700, fontSize: '14px', color: '#1a1a2e', letterSpacing: '0.2px' }}>{label}</span>
      <div style={{ flex: 1, height: '1px', background: '#e9ecef', marginLeft: '4px' }}></div>
    </div>
  );

  const Row = ({ children }) => (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: '12px 24px', marginBottom: '16px' }}>
      {children}
    </div>
  );

  const Field = ({ label, value, mono, span }) => (
    <div style={{ gridColumn: span ? `span ${span}` : undefined }}>
      <div style={{ fontSize: '10px', fontWeight: '700', color: '#8a94a6', textTransform: 'uppercase',
        letterSpacing: '0.7px', marginBottom: '4px' }}>{label}</div>
      <div style={{ fontSize: '14px', color: value ? '#1a1a2e' : '#c0c7d0', fontWeight: value ? '500' : '400',
        fontFamily: mono ? '"Courier New",monospace' : 'inherit',
        fontStyle: value ? 'normal' : 'italic', lineHeight: '1.4' }}>
        {value || 'Not provided'}
      </div>
    </div>
  );

  const Divider = () => <div style={{ borderTop: '1px solid #f0f2f5', margin: '20px 0' }}></div>;

  return (
    <DashboardLayout navItems={getNavForUser(user)} brandTitle={getBrandForUser(user)} roleBadge={getRoleBadge(user)}>

      {/* Back Button */}
      <div className="mb-3">
        <button className="btn btn-outline-secondary btn-sm" onClick={() => navigate(-1)}>
          <i className="fas fa-arrow-left me-2"></i>Back to Patient List
        </button>
      </div>

      {/* ═══ PRINT-ONLY COMPLETE PATIENT RECORD DOCUMENT ═══ */}
      <div className="print-document">
        {/* ── Letterhead ── */}
        <div className="print-header">
          <div className="print-logo">
            <i className="fas fa-heartbeat"></i>
          </div>
          <div className="print-hospital-info">
            <div className="print-hospital-name">{hospitalDetails?.name || user?.hospital_name || 'National Electronic Health Record'}</div>
            {hospitalDetails?.hospital_type_display && (
              <div className="print-hospital-type">{hospitalDetails.hospital_type_display}</div>
            )}
            <div className="print-hospital-address">
              {hospitalDetails?.address}{hospitalDetails?.town_city ? `, ${hospitalDetails.town_city}` : ''}
              {hospitalDetails?.district_name ? ` — ${hospitalDetails.district_name}` : ''}
              {hospitalDetails?.region_name ? `, ${hospitalDetails.region_name}` : ''}
            </div>
            <div className="print-hospital-contact">
              {hospitalDetails?.phone && <span><i className="fas fa-phone"></i> {hospitalDetails.phone}</span>}
              {hospitalDetails?.email && <span><i className="fas fa-envelope"></i> {hospitalDetails.email}</span>}
              {hospitalDetails?.website && <span><i className="fas fa-globe"></i> {hospitalDetails.website}</span>}
            </div>
          </div>
        </div>

        {/* ── Document Title ── */}
        <div className="print-doc-title">
          <h1>PATIENT MEDICAL RECORD</h1>
          <div className="print-doc-meta">
            <span>Patient ID: <strong>{patient.patient_id}</strong></span>
            <span>Printed: <strong>{new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</strong></span>
            <span>Status: <strong>{patient.status_display}</strong></span>
          </div>
        </div>

        {/* ── Patient Demographics Summary ── */}
        <div className="print-patient-summary">
          <div className="print-patient-name">{patient.full_name}</div>
          <div className="print-patient-meta">
            <span>{patient.gender_display}</span>
            <span>{patient.age ? `${patient.age} years old` : '—'}</span>
            <span>DOB: {patient.date_of_birth || '—'}</span>
            <span>Blood: {patient.blood_type_display || '—'}</span>
          </div>
        </div>

        {/* ── Personal Information ── */}
        <div className="print-section">
          <div className="print-section-title">1. Personal Information</div>
          <div className="print-grid-3">
            <div className="print-field"><span className="print-label">First Name</span><span className="print-value">{patient.first_name || '—'}</span></div>
            <div className="print-field"><span className="print-label">Other Names</span><span className="print-value">{patient.other_names || '—'}</span></div>
            <div className="print-field"><span className="print-label">Last Name</span><span className="print-value">{patient.last_name || '—'}</span></div>
            <div className="print-field"><span className="print-label">Date of Birth</span><span className="print-value">{patient.date_of_birth || '—'}</span></div>
            <div className="print-field"><span className="print-label">Age</span><span className="print-value">{patient.age ? `${patient.age} years` : '—'}</span></div>
            <div className="print-field"><span className="print-label">Gender</span><span className="print-value">{patient.gender_display || '—'}</span></div>
            <div className="print-field"><span className="print-label">Marital Status</span><span className="print-value">{patient.marital_status_display || '—'}</span></div>
            <div className="print-field"><span className="print-label">Nationality</span><span className="print-value">{patient.nationality || '—'}</span></div>
            <div className="print-field"><span className="print-label">National ID (NIN)</span><span className="print-value">{patient.national_id || '—'}</span></div>
          </div>
        </div>

        {/* ── Contact & Address ── */}
        <div className="print-section">
          <div className="print-section-title">2. Contact & Address</div>
          <div className="print-grid-3">
            <div className="print-field"><span className="print-label">Phone</span><span className="print-value">{patient.phone || '—'}</span></div>
            <div className="print-field"><span className="print-label">Alt Phone</span><span className="print-value">{patient.alt_phone || '—'}</span></div>
            <div className="print-field"><span className="print-label">Email</span><span className="print-value">{patient.email || '—'}</span></div>
            <div className="print-field"><span className="print-label">Region</span><span className="print-value">{patient.region || '—'}</span></div>
            <div className="print-field"><span className="print-label">District</span><span className="print-value">{patient.district_name || '—'}</span></div>
            <div className="print-field"><span className="print-label">Chiefdom</span><span className="print-value">{patient.chiefdom_name || '—'}</span></div>
            <div className="print-field"><span className="print-label">Town</span><span className="print-value">{patient.town_name || '—'}</span></div>
            <div className="print-field print-span-2"><span className="print-label">Residential Address</span><span className="print-value">{patient.address || '—'}</span></div>
          </div>
        </div>

        {/* ── Medical Information ── */}
        <div className="print-section">
          <div className="print-section-title">3. Medical Information</div>
          <div className="print-grid-3">
            <div className="print-field"><span className="print-label">Blood Type</span><span className="print-value">{patient.blood_type_display || '—'}</span></div>
            <div className="print-field"><span className="print-label">Known Allergies</span><span className="print-value">{patient.allergies || 'None recorded'}</span></div>
            <div className="print-field"><span className="print-label">Disabilities</span><span className="print-value">{patient.disabilities || 'None recorded'}</span></div>
            <div className="print-field print-span-3"><span className="print-label">Chronic Conditions</span><span className="print-value">{patient.chronic_conditions || 'None recorded'}</span></div>
          </div>
        </div>

        {/* ── Emergency Contact ── */}
        <div className="print-section">
          <div className="print-section-title">4. Emergency Contact</div>
          <div className="print-grid-3">
            <div className="print-field"><span className="print-label">Name</span><span className="print-value">{patient.emergency_contact_name || '—'}</span></div>
            <div className="print-field"><span className="print-label">Phone Number</span><span className="print-value">{patient.emergency_contact_phone || '—'}</span></div>
            <div className="print-field"><span className="print-label">Relationship</span><span className="print-value">{patient.emergency_contact_relationship || '—'}</span></div>
          </div>
        </div>

        {/* ── Record Information ── */}
        <div className="print-section">
          <div className="print-section-title">5. Record Information</div>
          <div className="print-grid-3">
            <div className="print-field"><span className="print-label">Patient ID</span><span className="print-value">{patient.patient_id}</span></div>
            <div className="print-field"><span className="print-label">Facility</span><span className="print-value">{patient.hospital_name || '—'}</span></div>
            <div className="print-field"><span className="print-label">Registered By</span><span className="print-value">{patient.registered_by_name || '—'}</span></div>
            <div className="print-field"><span className="print-label">Registered On</span><span className="print-value">{patient.created_at ? new Date(patient.created_at).toLocaleString() : '—'}</span></div>
            <div className="print-field"><span className="print-label">Last Updated</span><span className="print-value">{patient.updated_at ? new Date(patient.updated_at).toLocaleString() : '—'}</span></div>
          </div>
        </div>

        {/* ── Visit History ── */}
        <div className="print-section">
          <div className="print-section-title">6. Visit History ({visitHistory.length} visit{visitHistory.length !== 1 ? 's' : ''})</div>
          {visitHistory.length === 0 ? (
            <div className="print-no-data">No visits recorded for this patient.</div>
          ) : (
            visitHistory.map((visit, idx) => (
              <div key={visit.id} className="print-visit">
                <div className="print-visit-header">
                  <div>
                    <span className="print-visit-number">Visit #{idx + 1}</span>
                    <span className="print-visit-date">{new Date(visit.visit_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })}</span>
                  </div>
                  <div>
                    <span className={`print-visit-badge print-badge-${visit.status}`}>{visit.status_display}</span>
                    <span className="print-visit-type">{visit.visit_type_display}</span>
                  </div>
                </div>
                <div className="print-visit-details">
                  <div className="print-field print-span-2"><span className="print-label">Hospital</span><span className="print-value">{visit.hospital_name || '—'}</span></div>
                  <div className="print-field"><span className="print-label">Department</span><span className="print-value">{visit.department_name || '—'}</span></div>
                  <div className="print-field"><span className="print-label">Doctor</span><span className="print-value">{visit.doctor_name ? `Dr. ${visit.doctor_name}` : '—'}</span></div>
                  <div className="print-field print-span-3"><span className="print-label">Chief Complaint</span><span className="print-value">{visit.chief_complaint || '—'}</span></div>
                  {visit.diagnosis && <div className="print-field print-span-3"><span className="print-label">Diagnosis</span><span className="print-value">{visit.diagnosis}</span></div>}
                </div>

                {/* Vitals */}
                {visit.vitals && (
                  <div className="print-vitals-block">
                    <div className="print-subtitle"><i className="fas fa-heartbeat"></i> Vital Signs</div>
                    <div className="print-vitals-grid">
                      {visit.vitals.blood_pressure && <div><span>BP</span><strong>{visit.vitals.blood_pressure}</strong></div>}
                      {visit.vitals.heart_rate && <div><span>HR</span><strong>{visit.vitals.heart_rate} bpm</strong></div>}
                      {visit.vitals.temperature_celsius && <div><span>Temp</span><strong>{visit.vitals.temperature_celsius}°C</strong></div>}
                      {visit.vitals.respiratory_rate && <div><span>RR</span><strong>{visit.vitals.respiratory_rate}</strong></div>}
                      {visit.vitals.weight_kg && <div><span>Weight</span><strong>{visit.vitals.weight_kg} kg</strong></div>}
                      {visit.vitals.height_cm && <div><span>Height</span><strong>{visit.vitals.height_cm} cm</strong></div>}
                      {visit.vitals.oxygen_saturation && <div><span>SpO₂</span><strong>{visit.vitals.oxygen_saturation}%</strong></div>}
                      {visit.vitals.blood_glucose && <div><span>Glucose</span><strong>{visit.vitals.blood_glucose}</strong></div>}
                      {visit.vitals.bmi && <div><span>BMI</span><strong>{parseFloat(visit.vitals.bmi).toFixed(1)}</strong></div>}
                    </div>
                    {visit.vitals.notes && <div className="print-vitals-note">Notes: {visit.vitals.notes}</div>}
                    {visit.vitals.recorded_by_name && <div className="print-recorded-by">Recorded by: {visit.vitals.recorded_by_name}</div>}
                  </div>
                )}

                {/* Clinical Note */}
                {visit.clinical_note && (
                  <div className="print-note-block">
                    <div className="print-subtitle"><i className="fas fa-file-medical"></i> Clinical Note</div>
                    {visit.clinical_note.diagnosis && <div className="print-note-row"><span>Diagnosis:</span><strong>{visit.clinical_note.diagnosis}</strong></div>}
                    {visit.clinical_note.notes && <div className="print-note-row"><span>Notes:</span><div>{visit.clinical_note.notes}</div></div>}
                    {visit.clinical_note.prescription && <div className="print-note-row print-rx"><span>Prescription:</span><div>{visit.clinical_note.prescription}</div></div>}
                    {visit.clinical_note.treatment_plan && <div className="print-note-row print-plan"><span>Treatment Plan:</span><div>{visit.clinical_note.treatment_plan}</div></div>}
                    {visit.clinical_note.follow_up_date && <div className="print-note-row"><span>Follow-up:</span><div>{new Date(visit.clinical_note.follow_up_date).toLocaleDateString('en-GB')}</div></div>}
                    {visit.clinical_note.doctor_name && <div className="print-recorded-by">Doctor: Dr. {visit.clinical_note.doctor_name}</div>}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* ── Footer ── */}
        <div className="print-footer">
          <div className="print-footer-line"></div>
          <div className="print-footer-text">
            <span><i className="fas fa-shield-alt"></i> Confidential — National Electronic Health Record System</span>
            <span>Printed by: {user?.full_name || user?.username || 'System'} · {new Date().toLocaleString()}</span>
          </div>
        </div>
      </div>

      <div className="screen-only">

      {/* ═══ HEADER BANNER ═══ */}
      <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a5f 100%)',
        borderRadius: '16px', padding: '32px', marginBottom: '24px', position: 'relative' }}>

        <div style={{ display: 'flex', gap: '28px', alignItems: 'flex-start' }}>

          {/* Photo */}
          <div style={{ flexShrink: 0, position: 'relative' }}>
            <div style={{
              width: '120px', height: '148px', borderRadius: '14px',
              border: '3px solid rgba(255,255,255,0.25)',
              background: patient.photo ? 'transparent' : `linear-gradient(145deg,${gColor},${gColor}99)`,
              overflow: 'hidden', display: 'flex', alignItems: 'center',
              justifyContent: 'center', boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
            }}>
              {patient.photo
                ? <img src={patient.photo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '38px', fontWeight: 800, color: '#fff', lineHeight: 1 }}>
                      {getInitials(patient.first_name, patient.last_name)}
                    </div>
                    <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.55)', marginTop: '6px',
                      fontWeight: 600, letterSpacing: '1px' }}>NO PHOTO</div>
                  </div>
              }
            </div>
            <div style={{ position: 'absolute', bottom: '-5px', right: '-5px', width: '22px', height: '22px',
              borderRadius: '50%', background: statusColor, border: '3px solid #0f172a',
              boxShadow: `0 0 10px ${statusColor}` }}></div>
          </div>

          {/* Identity */}
          <div style={{ flex: 1, paddingTop: '4px' }}>
            <div style={{ fontSize: '10px', fontWeight: 600, color: 'rgba(255,255,255,0.4)',
              letterSpacing: '2.5px', textTransform: 'uppercase', marginBottom: '7px' }}>
              Patient Record · {patient.hospital_name || 'NEHR System'}
            </div>
            <h2 style={{ color: '#ffffff', margin: '0 0 14px', fontWeight: 800,
              fontSize: '30px', lineHeight: 1.15, letterSpacing: '-0.3px' }}>
              {patient.full_name}
            </h2>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '18px' }}>
              <span style={{ padding: '5px 14px', borderRadius: '6px', fontSize: '12px',
                fontFamily: 'monospace', fontWeight: 700, letterSpacing: '0.5px',
                background: 'rgba(255,255,255,0.13)', color: '#e2e8f0',
                border: '1px solid rgba(255,255,255,0.18)' }}>
                {patient.patient_id}
              </span>
              <span style={{ padding: '5px 14px', borderRadius: '6px', fontSize: '12px',
                fontWeight: 700, background: statusBg, color: statusColor }}>
                {patient.status_display}
              </span>
              <span style={{ padding: '5px 14px', borderRadius: '6px', fontSize: '12px',
                fontWeight: 600, background: 'rgba(255,255,255,0.1)', color: '#c7d2fe' }}>
                {patient.gender_display}
              </span>
              {patient.blood_type && patient.blood_type !== 'unknown' && (
                <span style={{ padding: '5px 14px', borderRadius: '6px', fontSize: '12px',
                  fontWeight: 700, background: 'rgba(220,38,38,0.2)', color: '#fca5a5',
                  border: '1px solid rgba(220,38,38,0.3)' }}>
                  <i className="fas fa-tint me-1" style={{ fontSize: '10px' }}></i>
                  {patient.blood_type_display || patient.blood_type}
                </span>
              )}
            </div>

            {/* Quick Facts Strip */}
            <div style={{ display: 'flex', background: 'rgba(255,255,255,0.07)',
              borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
              {[
                { icon: 'fas fa-birthday-cake',  label: 'Age',        val: patient.age ? `${patient.age} yrs` : '—' },
                { icon: 'fas fa-phone-alt',      label: 'Phone',      val: patient.phone || '—' },
                { icon: 'fas fa-map-marker-alt', label: 'District',   val: patient.district_name || '—' },
                { icon: 'fas fa-calendar-alt',   label: 'Registered', val: patient.created_at ? new Date(patient.created_at).toLocaleDateString('en-GB') : '—' },
                { icon: 'fas fa-hospital',       label: 'Hospital',   val: patient.hospital_name || '—' },
              ].map(({ icon, label, val }, i, arr) => (
                <div key={label} style={{ flex: 1, padding: '10px 14px', textAlign: 'center',
                  borderRight: i < arr.length - 1 ? '1px solid rgba(255,255,255,0.08)' : 'none' }}>
                  <i className={icon} style={{ color: '#93c5fd', fontSize: '12px', display: 'block', marginBottom: '3px' }}></i>
                  <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
                  <div style={{ fontSize: '12px', color: '#e2e8f0', fontWeight: 600, marginTop: '1px' }}>{val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0 }}>
            <button className="btn btn-light btn-sm" onClick={openEditModal}>
              <i className="fas fa-edit me-2"></i>Edit Patient
            </button>
            {!patient.has_portal_account && patient.email && (
              <button className="btn btn-outline-light btn-sm"
                onClick={() => { setPortalForm({ password: '', password2: '' }); setPortalError(''); setPortalSuccess(''); setShowPortalModal(true); }}>
                <i className="fas fa-user-shield me-2"></i>Create Portal
              </button>
            )}
            {patient.has_portal_account && (
              <span style={{ fontSize: '12px', color: '#86efac', fontWeight: 600, padding: '6px 0' }}>
                <i className="fas fa-check-circle me-1"></i>Portal Active
              </span>
            )}
            <button className="btn btn-outline-light btn-sm" onClick={handlePrintRecord}>
              <i className="fas fa-print me-2"></i>Print Record
            </button>
            <button className="btn btn-danger btn-sm" onClick={() => setShowDeleteModal(true)}>
              <i className="fas fa-trash me-2"></i>Delete
            </button>
          </div>
        </div>
      </div>

      {/* ═══ TABS ═══ */}
      <div style={{ background: '#fff', borderRadius: '16px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden' }}>

        {/* Tab Bar */}
        <div style={{ background: '#f8fafc', borderBottom: '1px solid #e9ecef',
          display: 'flex', padding: '0 32px', gap: '4px' }}>
          {[
            { key: 'details', icon: 'fas fa-id-card', label: 'Patient Details' },
            { key: 'visits',  icon: 'fas fa-history',  label: 'Visit History' },
          ].map(tab => (
            <button key={tab.key} onClick={() => {
              setActiveTab(tab.key);
              if (tab.key === 'visits' && visitHistory.length === 0) fetchVisitHistory();
            }} style={{
              padding: '14px 20px', border: 'none', background: 'transparent', cursor: 'pointer',
              fontWeight: activeTab === tab.key ? 700 : 500, fontSize: '13px',
              color: activeTab === tab.key ? '#4361ee' : '#64748b',
              borderBottom: activeTab === tab.key ? '3px solid #4361ee' : '3px solid transparent',
              marginBottom: '-1px', transition: 'all 0.15s',
            }}>
              <i className={tab.icon} style={{ marginRight: '7px' }}></i>{tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div style={{ padding: '32px' }}>

          {/* ── Patient Details Tab ── */}
          {activeTab === 'details' && <>
            <SectionTitle icon="fas fa-user" color="#4361ee" label="Personal Information" />
            <Row>
              <Field label="First Name"        value={patient.first_name} />
              <Field label="Other Names"       value={patient.other_names} />
              <Field label="Last Name"         value={patient.last_name} />
              <Field label="Date of Birth"     value={patient.date_of_birth} />
              <Field label="Age"               value={patient.age ? `${patient.age} years` : null} />
              <Field label="Gender"            value={patient.gender_display} />
              <Field label="Marital Status"    value={patient.marital_status_display} />
              <Field label="Nationality"       value={patient.nationality} />
              <Field label="National ID (NIN)" value={patient.national_id} mono />
            </Row>

            <Divider />

            <SectionTitle icon="fas fa-map-marker-alt" color="#0891b2" label="Contact & Address" />
            <Row>
              <Field label="Phone"              value={patient.phone} />
              <Field label="Alt Phone"          value={patient.alt_phone} />
              <Field label="Email"              value={patient.email} />
              <Field label="Region"             value={patient.region} />
              <Field label="District"           value={patient.district_name} />
              <Field label="Chiefdom"           value={patient.chiefdom_name} />
              <Field label="Town"               value={patient.town_name} />
              <Field label="Residential Address" value={patient.address} span={2} />
            </Row>

            <Divider />

            <SectionTitle icon="fas fa-heartbeat" color="#dc2626" label="Medical Information" />
            <Row>
              <Field label="Blood Type"         value={patient.blood_type_display} />
              <Field label="Known Allergies"    value={patient.allergies} />
              <Field label="Disabilities"       value={patient.disabilities} />
              <Field label="Chronic Conditions" value={patient.chronic_conditions} span={3} />
            </Row>

            <Divider />

            <SectionTitle icon="fas fa-phone-alt" color="#d97706" label="Emergency Contact" />
            <Row>
              <Field label="Name"         value={patient.emergency_contact_name} />
              <Field label="Phone Number" value={patient.emergency_contact_phone} />
              <Field label="Relationship" value={patient.emergency_contact_relationship} />
            </Row>

            <Divider />

            <SectionTitle icon="fas fa-info-circle" color="#64748b" label="Record Information" />
            <Row>
              <Field label="Patient ID"    value={patient.patient_id} mono />
              <Field label="Status"        value={patient.status_display} />
              <Field label="Facility"      value={patient.hospital_name} />
              <Field label="Registered By" value={patient.registered_by_name} />
              <Field label="Registered On" value={patient.created_at ? new Date(patient.created_at).toLocaleString() : '—'} />
              <Field label="Last Updated"  value={patient.updated_at ? new Date(patient.updated_at).toLocaleString() : '—'} />
            </Row>
          </>}

          {/* ── Visit History Tab ── */}
          {activeTab === 'visits' && (
            <div>
              {loadingVisits ? (
                <div style={{ textAlign: 'center', padding: '64px 0', color: '#64748b' }}>
                  <i className="fas fa-spinner fa-spin fa-2x mb-3" style={{ display: 'block', marginBottom: '12px' }}></i>
                  Loading visit history...
                </div>
              ) : visitHistory.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '80px 0' }}>
                  <i className="fas fa-history" style={{ fontSize: '56px', color: '#cbd5e1', display: 'block', marginBottom: '16px' }}></i>
                  <div style={{ fontSize: '18px', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>No visits recorded yet</div>
                  <div style={{ fontSize: '14px', color: '#94a3b8', marginBottom: '20px' }}>This patient has no visit history in the NEHR system.</div>
                  <button className="btn btn-primary btn-sm" onClick={openVisitModal}>
                    <i className="fas fa-plus me-2"></i>New Visit
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 500 }}>
                      <i className="fas fa-history me-2 text-primary"></i>
                      {visitHistory.length} visit{visitHistory.length !== 1 ? 's' : ''} recorded across all facilities
                    </span>
                    <button className="btn btn-primary btn-sm" onClick={openVisitModal}>
                      <i className="fas fa-plus me-2"></i>New Visit
                    </button>
                  </div>

                  <div style={{ position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '18px', top: '24px', bottom: '0',
                      width: '2px', background: '#e2e8f0' }}></div>

                    {visitHistory.map((visit) => {
                      const isExpanded = expandedVisit === visit.id;
                      const vStatusColor = {
                        completed: '#16a34a', in_progress: '#2563eb', cancelled: '#dc2626',
                        registered: '#d97706', waiting: '#9333ea', referred_out: '#0891b2',
                      }[visit.status] || '#64748b';
                      const vTypeIcon = {
                        outpatient: 'fas fa-stethoscope', inpatient: 'fas fa-bed',
                        emergency: 'fas fa-ambulance', follow_up: 'fas fa-redo',
                        referral: 'fas fa-share-square', routine_checkup: 'fas fa-check-circle',
                      }[visit.visit_type] || 'fas fa-notes-medical';

                      return (
                        <div key={visit.id} style={{ display: 'flex', gap: '16px', marginBottom: '12px', position: 'relative', zIndex: 1 }}>
                          <div style={{ flexShrink: 0, width: '38px', height: '38px', borderRadius: '50%',
                            background: vStatusColor + '18', border: `2px solid ${vStatusColor}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <i className={vTypeIcon} style={{ fontSize: '13px', color: vStatusColor }}></i>
                          </div>

                          <div style={{ flex: 1, background: '#fff', border: '1px solid #e9ecef',
                            borderRadius: '10px', overflow: 'hidden',
                            boxShadow: isExpanded ? '0 4px 16px rgba(0,0,0,0.08)' : '0 1px 3px rgba(0,0,0,0.04)' }}>

                            <div style={{ padding: '14px 18px', cursor: 'pointer', display: 'flex',
                              justifyContent: 'space-between', alignItems: 'center',
                              background: isExpanded ? '#f8fafc' : '#fff' }}
                              onClick={() => setExpandedVisit(isExpanded ? null : visit.id)}>
                              <div>
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '5px' }}>
                                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#1a1a2e' }}>
                                    {new Date(visit.visit_date).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}
                                  </span>
                                  <span style={{ fontSize: '11px', background: vStatusColor + '15', color: vStatusColor,
                                    padding: '2px 8px', borderRadius: '4px', fontWeight: 600 }}>
                                    {visit.status_display}
                                  </span>
                                  <span style={{ fontSize: '11px', background: '#f1f5f9', color: '#475569',
                                    padding: '2px 8px', borderRadius: '4px' }}>
                                    {visit.visit_type_display}
                                  </span>
                                </div>
                                <div style={{ fontSize: '13px', color: '#475569' }}>
                                  <i className="fas fa-hospital-alt me-1" style={{ color: '#94a3b8' }}></i>
                                  {visit.hospital_name}
                                  {visit.department_name && <span style={{ color: '#94a3b8' }}> · {visit.department_name}</span>}
                                  {visit.doctor_name && <span style={{ color: '#94a3b8' }}> · Dr. {visit.doctor_name}</span>}
                                </div>
                                <div style={{ fontSize: '12px', color: '#64748b', marginTop: '3px' }}>
                                  <i className="fas fa-comment-medical me-1" style={{ color: '#94a3b8' }}></i>
                                  {visit.chief_complaint}
                                </div>
                              </div>
                              <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'}`}
                                style={{ fontSize: '12px', color: '#94a3b8', marginLeft: '12px' }}></i>
                            </div>

                            {isExpanded && (
                              <div style={{ borderTop: '1px solid #f1f5f9', padding: '16px' }}>
                                {/* Action buttons */}
                                <div style={{ display: 'flex', gap: '8px', marginBottom: '14px', flexWrap: 'wrap' }}>
                                  <button className="btn btn-outline-danger btn-sm" onClick={(e) => { e.stopPropagation(); openVitalsModal(visit.id); }}>
                                    <i className="fas fa-heartbeat me-1"></i>Record Vitals
                                  </button>
                                  <button className="btn btn-outline-primary btn-sm" onClick={(e) => { e.stopPropagation(); openNoteModal(visit.id); }}>
                                    <i className="fas fa-file-medical me-1"></i>Write Clinical Note
                                  </button>
                                  {visit.status !== 'completed' && visit.status !== 'cancelled' && (
                                    <button className="btn btn-outline-secondary btn-sm" onClick={(e) => { e.stopPropagation(); openCancelModal(visit.id); }}>
                                      <i className="fas fa-ban me-1"></i>Cancel Visit
                                    </button>
                                  )}
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px 16px' }}>
                                  {/* Vitals */}
                                  {visit.vitals ? (
                                    <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '10px 12px' }}>
                                      <div style={{ fontSize: '10px', fontWeight: 700, color: '#e63946', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                                        <i className="fas fa-heartbeat me-1"></i>Vital Signs
                                      </div>
                                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px', fontSize: '12px' }}>
                                        {visit.vitals.blood_pressure && <div><span style={{ color: '#94a3b8' }}>BP:</span> <strong style={{ color: '#1a1a2e' }}>{visit.vitals.blood_pressure}</strong></div>}
                                        {visit.vitals.heart_rate && <div><span style={{ color: '#94a3b8' }}>HR:</span> <strong style={{ color: '#1a1a2e' }}>{visit.vitals.heart_rate} bpm</strong></div>}
                                        {visit.vitals.temperature_celsius && <div><span style={{ color: '#94a3b8' }}>Temp:</span> <strong style={{ color: '#1a1a2e' }}>{visit.vitals.temperature_celsius}°C</strong></div>}
                                        {visit.vitals.respiratory_rate && <div><span style={{ color: '#94a3b8' }}>RR:</span> <strong style={{ color: '#1a1a2e' }}>{visit.vitals.respiratory_rate}</strong></div>}
                                        {visit.vitals.weight_kg && <div><span style={{ color: '#94a3b8' }}>Wt:</span> <strong style={{ color: '#1a1a2e' }}>{visit.vitals.weight_kg} kg</strong></div>}
                                        {visit.vitals.height_cm && <div><span style={{ color: '#94a3b8' }}>Ht:</span> <strong style={{ color: '#1a1a2e' }}>{visit.vitals.height_cm} cm</strong></div>}
                                        {visit.vitals.oxygen_saturation && <div><span style={{ color: '#94a3b8' }}>SpO₂:</span> <strong style={{ color: '#1a1a2e' }}>{visit.vitals.oxygen_saturation}%</strong></div>}
                                        {visit.vitals.blood_glucose && <div><span style={{ color: '#94a3b8' }}>Glucose:</span> <strong style={{ color: '#1a1a2e' }}>{visit.vitals.blood_glucose}</strong></div>}
                                        {visit.vitals.bmi && <div><span style={{ color: '#94a3b8' }}>BMI:</span> <strong style={{ color: '#1a1a2e' }}>{parseFloat(visit.vitals.bmi).toFixed(1)}</strong></div>}
                                      </div>
                                      {visit.vitals.notes && (
                                        <div style={{ marginTop: '6px', fontSize: '11px', color: '#64748b', fontStyle: 'italic' }}>Notes: {visit.vitals.notes}</div>
                                      )}
                                      {visit.vitals.recorded_by_name && (
                                        <div style={{ marginTop: '4px', fontSize: '10px', color: '#94a3b8' }}>By {visit.vitals.recorded_by_name}</div>
                                      )}
                                    </div>
                                  ) : (
                                    <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '10px 12px', textAlign: 'center' }}>
                                      <div style={{ fontSize: '11px', color: '#94a3b8' }}><i className="fas fa-heartbeat me-1"></i>No vitals recorded</div>
                                    </div>
                                  )}

                                  {/* Clinical Note */}
                                  {visit.clinical_note ? (
                                    <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '10px 12px' }}>
                                      <div style={{ fontSize: '10px', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
                                        <i className="fas fa-file-medical me-1"></i>Clinical Note
                                      </div>
                                      {visit.clinical_note.diagnosis && (
                                        <div style={{ marginBottom: '4px', fontSize: '12px' }}>
                                          <span style={{ color: '#94a3b8' }}>Diagnosis:</span> <strong style={{ color: '#1a1a2e' }}>{visit.clinical_note.diagnosis}</strong>
                                        </div>
                                      )}
                                      {visit.clinical_note.notes && (
                                        <div style={{ marginBottom: '4px', fontSize: '12px', color: '#475569' }}>{visit.clinical_note.notes}</div>
                                      )}
                                      {visit.clinical_note.prescription && (
                                        <div style={{ marginBottom: '4px', fontSize: '11px', color: '#059669', background: '#ecfdf5', padding: '4px 8px', borderRadius: '4px' }}>
                                          <span style={{ fontWeight: 700 }}>Rx:</span> {visit.clinical_note.prescription}
                                        </div>
                                      )}
                                      {visit.clinical_note.treatment_plan && (
                                        <div style={{ marginBottom: '4px', fontSize: '11px', color: '#1d4ed8', background: '#eff6ff', padding: '4px 8px', borderRadius: '4px' }}>
                                          <span style={{ fontWeight: 700 }}>Plan:</span> {visit.clinical_note.treatment_plan}
                                        </div>
                                      )}
                                      {visit.clinical_note.follow_up_date && (
                                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>
                                          Follow-up: {new Date(visit.clinical_note.follow_up_date).toLocaleDateString('en-GB')}
                                        </div>
                                      )}
                                      {visit.clinical_note.doctor_name && (
                                        <div style={{ marginTop: '4px', fontSize: '10px', color: '#94a3b8' }}>By Dr. {visit.clinical_note.doctor_name}</div>
                                      )}
                                    </div>
                                  ) : (
                                    <div style={{ background: '#f8fafc', borderRadius: '8px', padding: '10px 12px', textAlign: 'center' }}>
                                      <div style={{ fontSize: '11px', color: '#94a3b8' }}><i className="fas fa-file-medical me-1"></i>No clinical note</div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div style={{ background: '#f8fafc', padding: '14px 32px', borderTop: '1px solid #e9ecef' }}>
          <span style={{ fontSize: '12px', color: '#8a94a6' }}>
            <i className="fas fa-shield-alt me-1" style={{ color: '#4361ee' }}></i>
            National Electronic Health Record — Confidential Patient Data
          </span>
        </div>
      </div>

      {/* ═══ EDIT MODAL ═══ */}
      {showEditModal && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1055 }}
          onClick={() => setShowEditModal(false)}>
          <div className="modal-dialog modal-lg modal-dialog-scrollable" onClick={e => e.stopPropagation()}>
            <div className="modal-content" style={{ borderRadius: '12px' }}>
              <div className="modal-header">
                <h5 className="modal-title"><i className="fas fa-edit me-2 text-primary"></i>Edit Patient</h5>
                <button className="btn-close" onClick={() => setShowEditModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  {[
                    { label: 'First Name', key: 'first_name' }, { label: 'Other Names', key: 'other_names' },
                    { label: 'Last Name', key: 'last_name' }, { label: 'Phone', key: 'phone' },
                    { label: 'Alt Phone', key: 'alt_phone' }, { label: 'Email', key: 'email' },
                    { label: 'City', key: 'city' }, { label: 'Region', key: 'region' },
                    { label: 'Allergies', key: 'allergies' },
                    { label: 'Emergency Contact Name', key: 'emergency_contact_name' },
                    { label: 'Emergency Contact Phone', key: 'emergency_contact_phone' },
                    { label: 'Emergency Contact Relationship', key: 'emergency_contact_relationship' },
                  ].map(f => (
                    <div className="col-md-4" key={f.key}>
                      <label className="form-label small fw-bold">{f.label}</label>
                      <input className="form-control form-control-sm" value={editForm[f.key] || ''}
                        onChange={e => setEditForm(prev => ({ ...prev, [f.key]: e.target.value }))} />
                    </div>
                  ))}
                  <div className="col-md-4">
                    <label className="form-label small fw-bold">Blood Type</label>
                    <select className="form-select form-select-sm" value={editForm.blood_type || 'unknown'}
                      onChange={e => setEditForm(prev => ({ ...prev, blood_type: e.target.value }))}>
                      {['unknown','A+','A-','B+','B-','AB+','AB-','O+','O-'].map(bt => (
                        <option key={bt} value={bt}>{bt}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small fw-bold">Status</label>
                    <select className="form-select form-select-sm" value={editForm.status || 'active'}
                      onChange={e => setEditForm(prev => ({ ...prev, status: e.target.value }))}>
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                      <option value="deceased">Deceased</option>
                    </select>
                  </div>
                  <div className="col-12">
                    <label className="form-label small fw-bold">Chronic Conditions</label>
                    <textarea className="form-control form-control-sm" rows={2} value={editForm.chronic_conditions || ''}
                      onChange={e => setEditForm(prev => ({ ...prev, chronic_conditions: e.target.value }))} />
                  </div>
                  <div className="col-12">
                    <label className="form-label small fw-bold">Address</label>
                    <textarea className="form-control form-control-sm" rows={2} value={editForm.address || ''}
                      onChange={e => setEditForm(prev => ({ ...prev, address: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary btn-sm" onClick={() => setShowEditModal(false)}>Cancel</button>
                <button className="btn btn-primary btn-sm" onClick={handleEditSave} disabled={saving}>
                  {saving ? <><span className="spinner-border spinner-border-sm me-2"></span>Saving...</> : <><i className="fas fa-save me-2"></i>Save Changes</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ DELETE MODAL ═══ */}
      {showDeleteModal && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1055 }}
          onClick={() => setShowDeleteModal(false)}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-content" style={{ borderRadius: '12px' }}>
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title text-danger"><i className="fas fa-exclamation-triangle me-2"></i>Delete Patient</h5>
                <button className="btn-close" onClick={() => setShowDeleteModal(false)}></button>
              </div>
              <div className="modal-body pt-2">
                <p className="text-muted">Are you sure you want to permanently delete <strong>{patient.full_name}</strong>? This action cannot be undone.</p>
              </div>
              <div className="modal-footer border-0">
                <button className="btn btn-secondary btn-sm" onClick={() => setShowDeleteModal(false)}>Cancel</button>
                <button className="btn btn-danger btn-sm" onClick={handleDelete} disabled={deleting}>
                  {deleting ? <><span className="spinner-border spinner-border-sm me-2"></span>Deleting...</> : <><i className="fas fa-trash me-2"></i>Delete</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ PORTAL ACCOUNT MODAL ═══ */}
      {showPortalModal && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1055 }}
          onClick={() => setShowPortalModal(false)}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '460px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-content" style={{ borderRadius: '16px', overflow: 'hidden' }}>
              <div style={{ background: 'linear-gradient(135deg,#4361ee,#7c3aed)', padding: '24px 28px 20px' }}>
                <h5 style={{ color: '#fff', fontWeight: 700, margin: 0 }}>
                  <i className="fas fa-user-shield me-2"></i>Create Portal Account
                </h5>
                <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: '13px', marginTop: '4px' }}>{patient.full_name}</div>
              </div>
              <div className="modal-body p-4">
                {portalSuccess ? (
                  <div className="alert alert-success">{portalSuccess}</div>
                ) : (
                  <>
                    {portalError && <div className="alert alert-danger py-2">{portalError}</div>}
                    <p className="text-muted small">Login email: <strong>{patient.email}</strong></p>
                    <div className="mb-3">
                      <label className="form-label small fw-bold">Password</label>
                      <div className="input-group">
                        <input type={showPwd ? 'text' : 'password'} className="form-control form-control-sm"
                          value={portalForm.password}
                          onChange={e => setPortalForm(p => ({ ...p, password: e.target.value }))} />
                        <button className="btn btn-outline-secondary btn-sm" onClick={() => setShowPwd(v => !v)}>
                          <i className={`fas fa-${showPwd ? 'eye-slash' : 'eye'}`}></i>
                        </button>
                      </div>
                    </div>
                    <div className="mb-3">
                      <label className="form-label small fw-bold">Confirm Password</label>
                      <div className="input-group">
                        <input type={showPwd2 ? 'text' : 'password'} className="form-control form-control-sm"
                          value={portalForm.password2}
                          onChange={e => setPortalForm(p => ({ ...p, password2: e.target.value }))} />
                        <button className="btn btn-outline-secondary btn-sm" onClick={() => setShowPwd2(v => !v)}>
                          <i className={`fas fa-${showPwd2 ? 'eye-slash' : 'eye'}`}></i>
                        </button>
                      </div>
                    </div>
                  </>
                )}
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary btn-sm" onClick={() => setShowPortalModal(false)}>Close</button>
                {!portalSuccess && (
                  <button className="btn btn-primary btn-sm" onClick={handleCreatePortalAccount} disabled={portalSaving}>
                    {portalSaving ? 'Creating...' : 'Create Account'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ NEW VISIT MODAL ═══ */}
      {showVisitModal && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1055 }} onClick={() => setShowVisitModal(false)}>
          <div className="modal-dialog modal-lg modal-dialog-scrollable" onClick={e => e.stopPropagation()}>
            <div className="modal-content" style={{ borderRadius: '12px' }}>
              <div className="modal-header">
                <h5 className="modal-title"><i className="fas fa-plus me-2 text-primary"></i>New Visit</h5>
                <button className="btn-close" onClick={() => setShowVisitModal(false)}></button>
              </div>
              <div className="modal-body">
                {visitError && <div className="alert alert-danger py-2">{visitError}</div>}
                <div className="row g-3">
                  <div className="col-md-6">
                    <label className="form-label small fw-bold">Visit Type</label>
                    <select className="form-select form-select-sm" value={visitForm.visit_type}
                      onChange={e => setVisitForm(p => ({ ...p, visit_type: e.target.value }))}>
                      {['outpatient','inpatient','emergency','follow_up','referral','routine_checkup'].map(t => (
                        <option key={t} value={t}>{t.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-bold">Status</label>
                    <select className="form-select form-select-sm" value={visitForm.status}
                      onChange={e => setVisitForm(p => ({ ...p, status: e.target.value }))}>
                      {['registered','triaged','waiting','in_progress','completed'].map(s => (
                        <option key={s} value={s}>{s.replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-bold">Department</label>
                    <select className="form-select form-select-sm" value={visitForm.department}
                      onChange={e => setVisitForm(p => ({ ...p, department: e.target.value }))}>
                      <option value="">— Select —</option>
                      {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-bold">Doctor</label>
                    <select className="form-select form-select-sm" value={visitForm.doctor}
                      onChange={e => setVisitForm(p => ({ ...p, doctor: e.target.value }))}>
                      <option value="">— Select —</option>
                      {doctors.map(d => <option key={d.id} value={d.id}>{d.full_name}</option>)}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-bold">Visit Date & Time</label>
                    <input type="datetime-local" className="form-control form-control-sm" value={visitForm.visit_date}
                      onChange={e => setVisitForm(p => ({ ...p, visit_date: e.target.value }))} />
                  </div>
                  <div className="col-12">
                    <label className="form-label small fw-bold">Chief Complaint <span className="text-danger">*</span></label>
                    <textarea className="form-control form-control-sm" rows={2} value={visitForm.chief_complaint}
                      onChange={e => setVisitForm(p => ({ ...p, chief_complaint: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary btn-sm" onClick={() => setShowVisitModal(false)}>Cancel</button>
                <button className="btn btn-primary btn-sm" onClick={handleCreateVisit} disabled={visitSaving}>
                  {visitSaving ? 'Creating...' : <><i className="fas fa-save me-2"></i>Create Visit</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ RECORD VITALS MODAL ═══ */}
      {showVitalsModal && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1055 }} onClick={() => setShowVitalsModal(false)}>
          <div className="modal-dialog modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-content" style={{ borderRadius: '12px' }}>
              <div className="modal-header">
                <h5 className="modal-title"><i className="fas fa-heartbeat me-2 text-danger"></i>Record Vitals</h5>
                <button className="btn-close" onClick={() => setShowVitalsModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  {[
                    { label: 'BP Systolic (mmHg)', key: 'blood_pressure_systolic', type: 'number' },
                    { label: 'BP Diastolic (mmHg)', key: 'blood_pressure_diastolic', type: 'number' },
                    { label: 'Heart Rate (bpm)', key: 'heart_rate', type: 'number' },
                    { label: 'Respiratory Rate', key: 'respiratory_rate', type: 'number' },
                    { label: 'Temperature (°C)', key: 'temperature_celsius', type: 'number', step: '0.1' },
                    { label: 'Weight (kg)', key: 'weight_kg', type: 'number', step: '0.1' },
                    { label: 'Height (cm)', key: 'height_cm', type: 'number' },
                    { label: 'Oxygen Saturation (%)', key: 'oxygen_saturation', type: 'number' },
                    { label: 'Blood Glucose (mmol/L)', key: 'blood_glucose', type: 'number', step: '0.1' },
                  ].map(f => (
                    <div className="col-md-4" key={f.key}>
                      <label className="form-label small fw-bold">{f.label}</label>
                      <input type={f.type} step={f.step || 1} className="form-control form-control-sm"
                        value={vitalsForm[f.key] || ''}
                        onChange={e => setVitalsForm(p => ({ ...p, [f.key]: e.target.value }))} />
                    </div>
                  ))}
                  <div className="col-12">
                    <label className="form-label small fw-bold">Nurse Notes</label>
                    <textarea className="form-control form-control-sm" rows={2} value={vitalsForm.notes || ''}
                      onChange={e => setVitalsForm(p => ({ ...p, notes: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary btn-sm" onClick={() => setShowVitalsModal(false)}>Cancel</button>
                <button className="btn btn-danger btn-sm" onClick={handleSaveVitals} disabled={vitalsSaving}>
                  {vitalsSaving ? 'Saving...' : <><i className="fas fa-save me-2"></i>Save Vitals</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ CLINICAL NOTE MODAL ═══ */}
      {showNoteModal && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1055 }} onClick={() => setShowNoteModal(false)}>
          <div className="modal-dialog modal-lg" onClick={e => e.stopPropagation()}>
            <div className="modal-content" style={{ borderRadius: '12px' }}>
              <div className="modal-header">
                <h5 className="modal-title"><i className="fas fa-file-medical me-2 text-primary"></i>Clinical Note</h5>
                <button className="btn-close" onClick={() => setShowNoteModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="row g-3">
                  <div className="col-12">
                    <label className="form-label small fw-bold">Diagnosis</label>
                    <textarea className="form-control form-control-sm" rows={2} value={noteForm.diagnosis}
                      onChange={e => setNoteForm(p => ({ ...p, diagnosis: e.target.value }))} />
                  </div>
                  <div className="col-12">
                    <label className="form-label small fw-bold">Notes</label>
                    <textarea className="form-control form-control-sm" rows={3} value={noteForm.notes}
                      onChange={e => setNoteForm(p => ({ ...p, notes: e.target.value }))} />
                  </div>
                  <div className="col-12">
                    <label className="form-label small fw-bold">Prescription</label>
                    <textarea className="form-control form-control-sm" rows={2} value={noteForm.prescription}
                      onChange={e => setNoteForm(p => ({ ...p, prescription: e.target.value }))} />
                  </div>
                  <div className="col-12">
                    <label className="form-label small fw-bold">Treatment Plan</label>
                    <textarea className="form-control form-control-sm" rows={2} value={noteForm.treatment_plan}
                      onChange={e => setNoteForm(p => ({ ...p, treatment_plan: e.target.value }))} />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label small fw-bold">Follow-up Date</label>
                    <input type="datetime-local" className="form-control form-control-sm" value={noteForm.follow_up_date}
                      onChange={e => setNoteForm(p => ({ ...p, follow_up_date: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-secondary btn-sm" onClick={() => setShowNoteModal(false)}>Cancel</button>
                <button className="btn btn-primary btn-sm" onClick={handleSaveNote} disabled={noteSaving}>
                  {noteSaving ? 'Saving...' : <><i className="fas fa-save me-2"></i>Save Note</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═══ CANCEL VISIT MODAL ═══ */}
      {showCancelModal && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 1055 }} onClick={() => setShowCancelModal(false)}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: '420px' }} onClick={e => e.stopPropagation()}>
            <div className="modal-content" style={{ borderRadius: '12px' }}>
              <div className="modal-header border-0 pb-0">
                <h5 className="modal-title text-warning"><i className="fas fa-exclamation-triangle me-2"></i>Cancel Visit</h5>
                <button className="btn-close" onClick={() => setShowCancelModal(false)}></button>
              </div>
              <div className="modal-body pt-2">
                <p className="text-muted">Are you sure you want to cancel this visit? The record will be preserved and marked as <strong>cancelled</strong>.</p>
              </div>
              <div className="modal-footer border-0">
                <button className="btn btn-secondary btn-sm" onClick={() => setShowCancelModal(false)}>No, Keep It</button>
                <button className="btn btn-warning btn-sm" onClick={handleCancelVisit} disabled={cancelSaving}>
                  {cancelSaving ? <><span className="spinner-border spinner-border-sm me-2"></span>Cancelling...</> : <><i className="fas fa-ban me-2"></i>Yes, Cancel Visit</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      </div>

      {/* ── Emergency Access Modal ── */}
      {showEmergencyModal && (
        <div className="modal fade show d-block" style={{ background: 'rgba(0,0,0,0.5)', zIndex: 9999 }}>
          <div className="modal-dialog modal-dialog-centered" style={{ maxWidth: 520 }}>
            <div className="modal-content border-0 shadow" style={{ borderRadius: 16 }}>
              <div className="modal-header border-0">
                <h5 className="modal-title fw-bold" style={{ color: '#dc2626' }}>
                  <i className="fas fa-exclamation-triangle me-2"></i>Emergency Override
                </h5>
                <button type="button" className="btn-close" onClick={() => setShowEmergencyModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="alert alert-warning" style={{ borderRadius: 10, fontSize: 13 }}>
                  <strong>Warning:</strong> This action will be logged and reviewed. Only use in genuine emergency situations where the patient requires immediate care.
                </div>
                <label className="form-label fw-semibold" style={{ fontSize: 13 }}>Justification (required)</label>
                <textarea
                  className="form-control"
                  rows={4}
                  placeholder="Describe the emergency situation and why you need access to this patient's record..."
                  value={emergencyJustification}
                  onChange={(e) => setEmergencyJustification(e.target.value)}
                  style={{ borderRadius: 10, fontSize: 14 }}
                />
                {emergencyError && (
                  <div className="alert alert-danger mt-3 mb-0" style={{ borderRadius: 10, fontSize: 13 }}>
                    {emergencyError}
                  </div>
                )}
              </div>
              <div className="modal-footer border-0">
                <button className="btn btn-light btn-sm" onClick={() => setShowEmergencyModal(false)}>Cancel</button>
                <button className="btn btn-danger btn-sm" onClick={handleEmergencyAccess} disabled={emergencySaving}>
                  {emergencySaving ? <><span className="spinner-border spinner-border-sm me-2"></span>Processing...</> : <><i className="fas fa-unlock me-2"></i>Grant Emergency Access</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        /* ── Screen: hide print document ── */
        .print-document {
          display: none;
        }

        /* ── Print: hide screen UI, show print document ── */
        @media print {
          @page {
            size: A4;
            margin: 15mm 18mm;
          }

          /* Hide screen-only content and UI chrome */
          .screen-only, .dash-sidebar, .dash-header, .dash-footer,
          .dash-sidebar-overlay, .color-theme-fab, .color-theme-panel,
          .mb-3, .btn, .modal, nav, aside, .sidebar {
            display: none !important;
          }

          /* Reset layout so content isn't pushed by sidebar */
          .dashboard-wrapper {
            display: block !important;
            background: white !important;
          }
          .dash-main, .dashboard-wrapper .dash-main, .dashboard-wrapper.sidebar-collapsed .dash-main {
            margin-left: 0 !important;
            width: 100% !important;
            padding: 0 !important;
            display: block !important;
            min-height: auto !important;
            background: white !important;
          }
          .dash-content {
            padding: 0 !important;
            margin: 0 !important;
            overflow: visible !important;
            max-width: 100% !important;
            background: white !important;
          }

          /* Show the print document */
          .print-document {
            display: block !important;
            font-family: 'Inter', 'Segoe UI', Arial, sans-serif;
            font-size: 10pt;
            line-height: 1.5;
            color: #1a1a2e;
          }

          .print-document * {
            box-shadow: none !important;
          }

          /* ── Letterhead ── */
          .print-header {
            text-align: center;
            padding-bottom: 16px;
            border-bottom: 2px solid #1e3a5f;
            margin-bottom: 20px;
          }
          .print-logo {
            width: 52px;
            height: 52px;
            background: #1e3a5f;
            color: #fff;
            border-radius: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            margin: 0 auto 12px auto;
          }
          .print-hospital-info {
            text-align: center;
          }
          .print-hospital-name {
            font-size: 18pt;
            font-weight: 800;
            color: #1e3a5f;
            margin-bottom: 2px;
          }
          .print-hospital-type {
            font-size: 9pt;
            color: #64748b;
            margin-bottom: 2px;
          }
          .print-hospital-address {
            font-size: 8.5pt;
            color: #64748b;
            margin-bottom: 2px;
          }
          .print-hospital-contact {
            font-size: 8.5pt;
            color: #64748b;
          }
          .print-hospital-contact span {
            margin-right: 14px;
          }
          .print-hospital-contact i {
            color: #4361ee;
            margin-right: 3px;
          }

          /* ── Document Title ── */
          .print-doc-title {
            text-align: center;
            margin-bottom: 16px;
            padding-bottom: 12px;
            border-bottom: 1px solid #e2e8f0;
          }
          .print-doc-title h1 {
            font-size: 16pt;
            font-weight: 800;
            color: #1e3a5f;
            margin: 0 0 8px 0;
            letter-spacing: 1px;
          }
          .print-doc-meta {
            display: flex;
            justify-content: center;
            gap: 24px;
            font-size: 9pt;
            color: #64748b;
          }
          .print-doc-meta strong {
            color: #1a1a2e;
          }

          /* ── Patient Summary ── */
          .print-patient-summary {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            padding: 12px 16px;
            margin-bottom: 16px;
            text-align: center;
          }
          .print-patient-name {
            font-size: 14pt;
            font-weight: 700;
            color: #1e3a5f;
            margin-bottom: 4px;
          }
          .print-patient-meta {
            display: flex;
            justify-content: center;
            gap: 20px;
            font-size: 9pt;
            color: #64748b;
          }
          .print-patient-meta span {
            padding: 2px 10px;
            background: #fff;
            border-radius: 4px;
            border: 1px solid #e2e8f0;
          }

          /* ── Sections ── */
          .print-section {
            margin-bottom: 14px;
            page-break-inside: avoid;
          }
          .print-section-title {
            font-size: 10pt;
            font-weight: 700;
            color: #1e3a5f;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            padding-bottom: 4px;
            border-bottom: 1px solid #e2e8f0;
            margin-bottom: 8px;
          }

          /* ── Grid Fields ── */
          .print-grid-3 {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 6px 16px;
          }
          .print-field {
            margin-bottom: 4px;
          }
          .print-label {
            display: block;
            font-size: 7.5pt;
            font-weight: 700;
            color: #8a94a6;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            margin-bottom: 1px;
          }
          .print-value {
            display: block;
            font-size: 9.5pt;
            color: #1a1a2e;
            font-weight: 500;
          }
          .print-span-2 {
            grid-column: span 2;
          }
          .print-span-3 {
            grid-column: span 3;
          }

          .print-no-data {
            font-size: 9pt;
            color: #94a3b8;
            font-style: italic;
            padding: 8px;
            text-align: center;
          }

          /* ── Visit Cards ── */
          .print-visit {
            border: 1px solid #e2e8f0;
            border-radius: 6px;
            margin-bottom: 12px;
            padding: 10px 12px;
            page-break-inside: avoid;
          }
          .print-visit-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 8px;
            padding-bottom: 6px;
            border-bottom: 1px solid #f1f5f9;
          }
          .print-visit-number {
            font-size: 9pt;
            font-weight: 700;
            color: #4361ee;
            margin-right: 10px;
          }
          .print-visit-date {
            font-size: 9pt;
            color: #64748b;
          }
          .print-visit-badge {
            font-size: 7.5pt;
            font-weight: 700;
            padding: 2px 8px;
            border-radius: 3px;
            margin-right: 6px;
          }
          .print-badge-completed { background: #dcfce7; color: #166534; }
          .print-badge-in_progress { background: #dbeafe; color: #1e40af; }
          .print-badge-cancelled { background: #fee2e2; color: #991b1b; }
          .print-badge-registered { background: #fef3c7; color: #92400e; }
          .print-badge-waiting { background: #f3e8ff; color: #6b21a8; }
          .print-badge-referred_out { background: #cffafe; color: #155e75; }
          .print-visit-type {
            font-size: 7.5pt;
            color: #64748b;
            background: #f1f5f9;
            padding: 2px 8px;
            border-radius: 3px;
          }
          .print-visit-details {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 4px 12px;
            margin-bottom: 8px;
          }

          /* ── Vitals Block ── */
          .print-vitals-block {
            background: #fef2f2;
            border: 1px solid #fecaca;
            border-radius: 4px;
            padding: 8px 10px;
            margin-top: 8px;
          }
          .print-subtitle {
            font-size: 8pt;
            font-weight: 700;
            color: #dc2626;
            text-transform: uppercase;
            letter-spacing: 0.3px;
            margin-bottom: 6px;
          }
          .print-subtitle i {
            margin-right: 4px;
          }
          .print-vitals-grid {
            display: grid;
            grid-template-columns: repeat(5, 1fr);
            gap: 4px 8px;
          }
          .print-vitals-grid div {
            text-align: center;
          }
          .print-vitals-grid div span {
            display: block;
            font-size: 7pt;
            color: #94a3b8;
          }
          .print-vitals-grid div strong {
            display: block;
            font-size: 9pt;
            color: #1a1a2e;
          }
          .print-vitals-note {
            font-size: 8pt;
            color: #64748b;
            font-style: italic;
            margin-top: 6px;
            padding-top: 4px;
            border-top: 1px dashed #fecaca;
          }
          .print-recorded-by {
            font-size: 7.5pt;
            color: #94a3b8;
            margin-top: 4px;
            text-align: right;
          }

          /* ── Clinical Note Block ── */
          .print-note-block {
            background: #f5f3ff;
            border: 1px solid #ddd6fe;
            border-radius: 4px;
            padding: 8px 10px;
            margin-top: 8px;
          }
          .print-note-block .print-subtitle {
            color: #7c3aed;
          }
          .print-note-row {
            margin-bottom: 4px;
            font-size: 9pt;
          }
          .print-note-row span {
            color: #94a3b8;
            font-weight: 600;
            margin-right: 6px;
          }
          .print-note-row strong {
            color: #1a1a2e;
          }
          .print-note-row div {
            color: #475569;
            margin-top: 2px;
          }
          .print-rx {
            background: #ecfdf5;
            color: #059669;
            padding: 4px 8px;
            border-radius: 3px;
            font-size: 8.5pt;
          }
          .print-plan {
            background: #eff6ff;
            color: #1d4ed8;
            padding: 4px 8px;
            border-radius: 3px;
            font-size: 8.5pt;
          }

          /* ── Footer ── */
          .print-footer {
            margin-top: 20px;
            padding-top: 10px;
          }
          .print-footer-line {
            border-top: 1px solid #e2e8f0;
            margin-bottom: 6px;
          }
          .print-footer-text {
            display: flex;
            justify-content: space-between;
            font-size: 7.5pt;
            color: #94a3b8;
          }
          .print-footer-text i {
            margin-right: 4px;
            color: #4361ee;
          }
        }
      `}</style>

    </DashboardLayout>
  );
}

export default PatientDetail;

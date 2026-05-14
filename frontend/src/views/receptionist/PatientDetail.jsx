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

  const fetchPatient = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiCall(`/patients/${id}/`);
      if (res.ok) {
        const data = await res.json();
        setPatient(data);
      } else {
        navigate(-1);
      }
    } catch {
      navigate(-1);
    } finally {
      setLoading(false);
    }
  }, [id, apiCall, navigate]);

  const fetchVisitHistory = useCallback(async () => {
    setLoadingVisits(true);
    try {
      const res = await apiCall(`/visits/patient_history/${id}/`);
      const data = await res.json();
      if (res.ok) setVisitHistory(Array.isArray(data) ? data : []);
    } catch {
      console.error('Error fetching visit history');
    } finally {
      setLoadingVisits(false);
    }
  }, [id, apiCall]);

  useEffect(() => {
    fetchPatient();
  }, [fetchPatient]);

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

  if (!patient) return null;

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
                  <div style={{ fontSize: '14px', color: '#94a3b8' }}>This patient has no visit history in the NEHR system.</div>
                </div>
              ) : (
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
                    <span style={{ fontSize: '14px', color: '#64748b', fontWeight: 500 }}>
                      <i className="fas fa-history me-2 text-primary"></i>
                      {visitHistory.length} visit{visitHistory.length !== 1 ? 's' : ''} recorded across all facilities
                    </span>
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
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px 24px' }}>
                                  {visit.diagnosis && (
                                    <div style={{ gridColumn: 'span 3' }}>
                                      <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '3px' }}>Diagnosis</div>
                                      <div style={{ fontSize: '13px', color: '#1a1a2e', fontWeight: 500 }}>{visit.diagnosis}</div>
                                    </div>
                                  )}
                                  {visit.discharge_date && (
                                    <div>
                                      <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '3px' }}>Discharged</div>
                                      <div style={{ fontSize: '13px', color: '#1a1a2e' }}>{new Date(visit.discharge_date).toLocaleDateString('en-GB')}</div>
                                    </div>
                                  )}
                                  <div>
                                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '3px' }}>Has Vitals</div>
                                    <div style={{ fontSize: '13px', color: visit.has_vitals ? '#16a34a' : '#94a3b8' }}>
                                      <i className={`fas fa-${visit.has_vitals ? 'check-circle' : 'times-circle'} me-1`}></i>
                                      {visit.has_vitals ? 'Recorded' : 'Not recorded'}
                                    </div>
                                  </div>
                                  <div>
                                    <div style={{ fontSize: '10px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '3px' }}>Clinical Note</div>
                                    <div style={{ fontSize: '13px', color: visit.has_clinical_note ? '#16a34a' : '#94a3b8' }}>
                                      <i className={`fas fa-${visit.has_clinical_note ? 'check-circle' : 'times-circle'} me-1`}></i>
                                      {visit.has_clinical_note ? 'Written' : 'Not written'}
                                    </div>
                                  </div>
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

    </DashboardLayout>
  );
}

export default PatientDetail;

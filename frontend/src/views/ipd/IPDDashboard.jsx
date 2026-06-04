import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layout/DashboardLayout';
import showToast from '../../utils/toast';
import { getNavForUser, getBrandForUser, getRoleBadge } from '../../utils/navItems';

const STATUS_BADGE = {
  admitted:    { bg: '#dbeafe', color: '#1e40af', label: 'Admitted' },
  discharged:  { bg: '#d1fae5', color: '#065f46', label: 'Discharged' },
  transferred: { bg: '#fef3c7', color: '#92400e', label: 'Transferred' },
};

export default function IPDDashboard() {
  const { user, apiCall } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({});
  const [admissions, setAdmissions] = useState([]);
  const [wardStats, setWardStats] = useState([]);
  const [wards, setWards] = useState([]);
  const [availableBeds, setAvailableBeds] = useState([]);

  // Modals
  const [showAdmit, setShowAdmit] = useState(false);
  const [showDischarge, setShowDischarge] = useState(false);
  const [showWardMgmt, setShowWardMgmt] = useState(false);
  const [selectedAdmission, setSelectedAdmission] = useState(null);

  // Admit form
  const [admitForm, setAdmitForm] = useState({ visit: '', ward: '', bed: '', admission_notes: '' });

  // Discharge form
  const [dischargeForm, setDischargeForm] = useState({ discharge_type: 'discharged', discharge_summary: '', discharge_medications: '', follow_up_date: '', follow_up_instructions: '' });

  // Ward management form
  const [wardForm, setWardForm] = useState({ name: '', ward_type: 'general_male', capacity: '', floor: '', phone: '', department: '' });
  const [bedForm, setBedForm] = useState({ ward: '', bed_number: '', bed_type: 'standard', notes: '' });

  const isAdmin = user?.role === 'hospital_admin' || user?.role === 'admin' || user?.role === 'ministry_admin';

  // Nursing notes state
  const [showNursingNotes, setShowNursingNotes]     = useState(false);
  const [nursingAdmission, setNursingAdmission]     = useState(null);
  const [nursingNotes, setNursingNotes]             = useState([]);
  const [nursingLoading, setNursingLoading]         = useState(false);
  const [showNursingForm, setShowNursingForm]       = useState(false);
  const EMPTY_NURSING = {
    shift: 'morning', note_date: new Date().toISOString().split('T')[0],
    temperature_celsius: '', blood_pressure: '', heart_rate: '', respiratory_rate: '',
    oxygen_saturation: '', pain_score: '',
    iv_fluids_given: '', oral_intake: '', urine_output: '',
    medications_given: '', wound_care: '', patient_education: '',
    nursing_assessment: '', nursing_plan: '', handover_notes: '',
  };
  const [nursingForm, setNursingForm]               = useState(EMPTY_NURSING);
  const [nursingSaving, setNursingSaving]           = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const res = await apiCall('/ipd/dashboard/');
        if (mounted && res.ok) {
          const data = await res.json();
          setStats(data.stats || {});
          setAdmissions(data.current_admissions || []);
          setWardStats(data.ward_stats || []);
        }
      } catch { /* ignore */ }
      try {
        const wres = await apiCall('/ipd/wards/');
        if (mounted && wres.ok) setWards(await wres.json());
      } catch { /* ignore */ }
      if (mounted) setLoading(false);
    })();
    return () => { mounted = false; };
  }, [apiCall]);

  const fetchAvailableBeds = async (wardId) => {
    try {
      const res = await apiCall(`/ipd/beds/available/?ward=${wardId}`);
      if (res.ok) setAvailableBeds(await res.json());
    } catch { setAvailableBeds([]); }
  };

  const handleAdmit = async () => {
    if (!admitForm.visit || !admitForm.bed) { showToast.error('Select a visit and bed'); return; }
    try {
      const res = await apiCall('/ipd/admissions/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(admitForm),
      });
      if (res.ok) {
        showToast.success('Patient admitted successfully');
        setShowAdmit(false);
        window.location.reload();
      } else {
        const err = await res.json();
        showToast.error(err.detail || 'Failed to admit');
      }
    } catch { showToast.error('Failed to admit patient'); }
  };

  const handleDischarge = async () => {
    if (!selectedAdmission) return;
    try {
      const res = await apiCall(`/ipd/admissions/${selectedAdmission.id}/discharge/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(dischargeForm),
      });
      if (res.ok) {
        showToast.success('Patient discharged');
        setShowDischarge(false);
        setSelectedAdmission(null);
        window.location.reload();
      } else {
        const err = await res.json();
        showToast.error(err.detail || 'Failed to discharge');
      }
    } catch { showToast.error('Failed to discharge patient'); }
  };

  const createWard = async () => {
    if (!wardForm.name) { showToast.error('Ward name is required'); return; }
    try {
      const res = await apiCall('/ipd/wards/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(wardForm),
      });
      if (res.ok) {
        showToast.success('Ward created');
        setWardForm({ name: '', ward_type: 'general_male', capacity: '', floor: '', phone: '', department: '' });
        window.location.reload();
      } else { showToast.error('Failed to create ward'); }
    } catch { showToast.error('Failed to create ward'); }
  };

  const createBed = async () => {
    if (!bedForm.ward || !bedForm.bed_number) { showToast.error('Ward and bed number required'); return; }
    try {
      const res = await apiCall('/ipd/beds/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bedForm),
      });
      if (res.ok) {
        showToast.success('Bed created');
        setBedForm({ ward: '', bed_number: '', bed_type: 'standard', notes: '' });
        window.location.reload();
      } else { showToast.error('Failed to create bed'); }
    } catch { showToast.error('Failed to create bed'); }
  };

  const openAdmit = () => {
    setAdmitForm({ visit: '', ward: '', bed: '', admission_notes: '' });
    setAvailableBeds([]);
    setShowAdmit(true);
  };

  const fetchNursingNotes = async (admissionId) => {
    setNursingLoading(true);
    try {
      const res = await apiCall(`/ipd/admissions/${admissionId}/nursing-notes/`);
      if (res.ok) setNursingNotes(await res.json());
    } catch { setNursingNotes([]); }
    setNursingLoading(false);
  };

  const openNursingNotes = (adm) => {
    setNursingAdmission(adm);
    setNursingNotes([]);
    setNursingForm(EMPTY_NURSING);
    setShowNursingForm(false);
    setShowNursingNotes(true);
    fetchNursingNotes(adm.id);
  };

  const handleSaveNursingNote = async () => {
    if (!nursingAdmission) return;
    setNursingSaving(true);
    try {
      const res = await apiCall(`/ipd/admissions/${nursingAdmission.id}/nursing-notes/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nursingForm),
      });
      if (res.ok) {
        showToast.success('Nursing note saved');
        setShowNursingForm(false);
        setNursingForm(EMPTY_NURSING);
        fetchNursingNotes(nursingAdmission.id);
      } else {
        const err = await res.json();
        showToast.error(err.detail || 'Failed to save note');
      }
    } catch { showToast.error('Failed to save nursing note'); }
    setNursingSaving(false);
  };

  const printDischargeCertificate = (adm, form) => {
    const hospital = user?.hospital_name || 'Hospital';
    const now = new Date().toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
    const html = `<!DOCTYPE html><html><head><title>Discharge Certificate</title><style>
      body{font-family:Arial,sans-serif;margin:0;padding:30px;color:#111;}
      .header{text-align:center;border-bottom:3px double #333;padding-bottom:18px;margin-bottom:20px;}
      .header h1{font-size:20px;margin:0 0 4px;} .header h2{font-size:15px;margin:0;color:#555;}
      .section{margin-bottom:18px;} .section h3{font-size:13px;font-weight:700;text-transform:uppercase;
        letter-spacing:.8px;color:#555;border-bottom:1px solid #ddd;padding-bottom:4px;margin-bottom:10px;}
      .grid{display:grid;grid-template-columns:1fr 1fr;gap:8px 24px;}
      .field{margin-bottom:6px;} .label{font-size:11px;color:#777;font-weight:700;display:block;}
      .value{font-size:13px;} .box{background:#f9f9f9;border:1px solid #ddd;border-radius:6px;
        padding:10px 14px;font-size:13px;white-space:pre-wrap;margin-top:4px;}
      .footer{text-align:center;font-size:11px;color:#777;margin-top:30px;padding-top:12px;
        border-top:1px solid #ddd;}
      .sig{display:grid;grid-template-columns:1fr 1fr;gap:60px;margin-top:40px;}
      .sig-line{border-top:1px solid #333;padding-top:6px;font-size:12px;text-align:center;}
      @media print{body{padding:15px;}}
    </style></head><body>
      <div class='header'>
        <h1>${hospital}</h1>
        <h2>DISCHARGE CERTIFICATE</h2>
        <p style='font-size:12px;color:#777;margin:4px 0 0'>Printed: ${now}</p>
      </div>
      <div class='section'><h3>Patient Information</h3>
        <div class='grid'>
          <div class='field'><span class='label'>Full Name</span><span class='value'>${adm.patient_name || '—'}</span></div>
          <div class='field'><span class='label'>Patient ID</span><span class='value'>${adm.patient_id_code || '—'}</span></div>
          <div class='field'><span class='label'>Gender</span><span class='value'>${adm.patient_gender || '—'}</span></div>
          <div class='field'><span class='label'>Bed / Ward</span><span class='value'>${adm.bed_info?.bed_number || '—'} / ${adm.ward_info?.name || '—'}</span></div>
        </div>
      </div>
      <div class='section'><h3>Admission &amp; Discharge</h3>
        <div class='grid'>
          <div class='field'><span class='label'>Admission Date</span><span class='value'>${adm.admission_date ? new Date(adm.admission_date).toLocaleDateString('en-GB') : '—'}</span></div>
          <div class='field'><span class='label'>Discharge Date</span><span class='value'>${now}</span></div>
          <div class='field'><span class='label'>Length of Stay</span><span class='value'>${adm.length_of_stay_days} day(s)</span></div>
          <div class='field'><span class='label'>Discharge Type</span><span class='value'>${(form.discharge_type || '').replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase())}</span></div>
        </div>
      </div>
      ${form.discharge_summary ? `<div class='section'><h3>Discharge Summary / Final Diagnosis</h3><div class='box'>${form.discharge_summary}</div></div>` : ''}
      ${form.discharge_medications ? `<div class='section'><h3>Medications on Discharge</h3><div class='box'>${form.discharge_medications}</div></div>` : ''}
      ${(form.follow_up_date || form.follow_up_instructions) ? `<div class='section'><h3>Follow-up</h3><div class='grid'>${form.follow_up_date ? `<div class='field'><span class='label'>Follow-up Date</span><span class='value'>${new Date(form.follow_up_date).toLocaleDateString('en-GB')}</span></div>` : ''}</div>${form.follow_up_instructions ? `<div class='box'>${form.follow_up_instructions}</div>` : ''}</div>` : ''}
      <div class='sig'>
        <div class='sig-line'>Discharging Officer / Date</div>
        <div class='sig-line'>Patient / Guardian Signature / Date</div>
      </div>
      <div class='footer'>This certificate is for official use only. ${hospital} &mdash; National Electronic Health Record</div>
    </body></html>`;
    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  };

  const openDischarge = (adm) => {
    setSelectedAdmission(adm);
    setDischargeForm({ discharge_type: 'discharged', discharge_summary: '', discharge_medications: '', follow_up_date: '', follow_up_instructions: '' });
    setShowDischarge(true);
  };

  return (
    <DashboardLayout navItems={getNavForUser(user)} brandTitle={getBrandForUser(user)} roleBadge={getRoleBadge(user)}>
      <div className="container-fluid py-4">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <div>
            <h1 className="h3 mb-0"><i className="fas fa-bed me-2 text-primary"></i>IPD Dashboard</h1>
            <p className="text-muted small mb-0">Inpatient admissions, wards & bed occupancy</p>
          </div>
          <div className="d-flex gap-2">
            {isAdmin && (
              <button className="btn btn-outline-secondary btn-sm" onClick={() => setShowWardMgmt(true)}>
                <i className="fas fa-cog me-1"></i>Ward & Bed Mgmt
              </button>
            )}
            <button className="btn btn-primary btn-sm" onClick={openAdmit}>
              <i className="fas fa-user-plus me-1"></i>Admit Patient
            </button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
        ) : (
          <>
            {/* Stats Cards */}
            <div className="row g-3 mb-4">
              <div className="col-6 col-md-3">
                <div className="card border-0 h-100" style={{ background: '#dbeafe' }}>
                  <div className="card-body p-3">
                    <div className="d-flex justify-content-between align-items-center">
                      <div><div className="small text-muted">Current Inpatients</div><div className="h4 mb-0 text-primary">{stats.current_inpatients || 0}</div></div>
                      <i className="fas fa-users fa-2x text-primary opacity-25"></i>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="card border-0 h-100" style={{ background: '#dcfce7' }}>
                  <div className="card-body p-3">
                    <div className="d-flex justify-content-between align-items-center">
                      <div><div className="small text-muted">Available Beds</div><div className="h4 mb-0 text-success">{stats.available_beds || 0}</div></div>
                      <i className="fas fa-bed fa-2x text-success opacity-25"></i>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="card border-0 h-100" style={{ background: '#fef3c7' }}>
                  <div className="card-body p-3">
                    <div className="d-flex justify-content-between align-items-center">
                      <div><div className="small text-muted">Occupancy Rate</div><div className="h4 mb-0" style={{ color: '#92400e' }}>{stats.occupancy_rate || 0}%</div></div>
                      <i className="fas fa-percent fa-2x opacity-25" style={{ color: '#92400e' }}></i>
                    </div>
                  </div>
                </div>
              </div>
              <div className="col-6 col-md-3">
                <div className="card border-0 h-100" style={{ background: 'linear-gradient(135deg, #4361ee, #7c3aed)', color: 'white' }}>
                  <div className="card-body p-3">
                    <div className="d-flex justify-content-between align-items-center">
                      <div><div className="small opacity-75">Total Beds</div><div className="h4 mb-0">{stats.total_beds || 0}</div></div>
                      <i className="fas fa-hospital fa-2x opacity-50"></i>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Ward occupancy strip */}
            <div className="card border-0 shadow-sm mb-4">
              <div className="card-body p-3">
                <h6 className="fw-bold mb-3"><i className="fas fa-hospital-alt me-2 text-primary"></i>Ward Occupancy</h6>
                <div className="row g-2">
                  {wardStats.map(w => (
                    <div className="col-md-4 col-lg-3" key={w.id}>
                      <div className="p-2" style={{ background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                        <div className="d-flex justify-content-between align-items-center">
                          <span className="small fw-bold text-truncate" style={{ maxWidth: 120 }} title={w.name}>{w.name}</span>
                          <span className="badge" style={{ background: w.occupancy_rate > 90 ? '#fecaca' : w.occupancy_rate > 70 ? '#fef3c7' : '#d1fae5', color: w.occupancy_rate > 90 ? '#b91c1c' : w.occupancy_rate > 70 ? '#92400e' : '#065f46', fontSize: 10 }}>{w.occupied}/{w.bed_total}</span>
                        </div>
                        <div className="progress mt-1" style={{ height: 6, borderRadius: 3 }}>
                          <div className="progress-bar" role="progressbar" style={{ width: `${w.occupancy_rate}%`, background: w.occupancy_rate > 90 ? '#ef4444' : w.occupancy_rate > 70 ? '#f59e0b' : '#22c55e' }}></div>
                        </div>
                        <div className="d-flex justify-content-between mt-1">
                          <span className="text-muted" style={{ fontSize: 10 }}>{w.occupancy_rate}% full</span>
                          <span className="text-muted" style={{ fontSize: 10 }}>{w.available} avail</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {wardStats.length === 0 && (
                    <div className="col-12 text-center text-muted small py-2">No wards configured yet.</div>
                  )}
                </div>
              </div>
            </div>

            {/* Current Admissions Table */}
            <div className="card border-0 shadow-sm">
              <div className="card-body p-0">
                <div className="d-flex justify-content-between align-items-center p-3 border-bottom">
                  <h6 className="fw-bold mb-0"><i className="fas fa-clipboard-list me-2 text-primary"></i>Current Admissions</h6>
                  <span className="badge bg-primary">{admissions.length}</span>
                </div>
                <div className="table-responsive">
                  <table className="table table-hover align-middle mb-0">
                    <thead style={{ background: '#f8fafc' }}>
                      <tr>
                        <th className="ps-3 py-3 small fw-semibold text-muted">Patient</th>
                        <th className="py-3 small fw-semibold text-muted">Bed / Ward</th>
                        <th className="py-3 small fw-semibold text-muted">Admitted</th>
                        <th className="py-3 small fw-semibold text-muted">LOS</th>
                        <th className="py-3 small fw-semibold text-muted">Care Team</th>
                        <th className="py-3 small fw-semibold text-muted">Status</th>
                        <th className="pe-3 py-3 small fw-semibold text-muted text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {admissions.map(adm => {
                        const sb = STATUS_BADGE[adm.status] || STATUS_BADGE.admitted;
                        return (
                          <tr key={adm.id}>
                            <td className="ps-3 py-3">
                              <div className="d-flex align-items-center gap-2">
                                <div style={{ width: 32, height: 32, borderRadius: '50%', background: '#e0e7ff', color: '#4361ee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700 }}>
                                  {(adm.patient_name || 'P').charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <div className="fw-bold small">{adm.patient_name}</div>
                                  <div className="text-muted" style={{ fontSize: 11 }}>{adm.patient_id_code} · {adm.patient_gender}</div>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 small">
                              {adm.bed_info ? (
                                <div>
                                  <div className="fw-bold">{adm.bed_info.bed_number}</div>
                                  <div className="text-muted" style={{ fontSize: 11 }}>{adm.ward_info?.name}</div>
                                </div>
                              ) : (
                                <span className="text-muted">—</span>
                              )}
                            </td>
                            <td className="py-3 small text-muted">
                              {adm.admission_date ? new Date(adm.admission_date).toLocaleDateString('en-GB') : '—'}
                              <div style={{ fontSize: 10 }}>{adm.admitted_by_name}</div>
                            </td>
                            <td className="py-3 small text-muted">{adm.length_of_stay_days}d</td>
                            <td className="py-3 small" style={{ maxWidth: 150 }}>
                              <div className="d-flex flex-wrap gap-1">
                                {(adm.care_team_names || []).slice(0, 2).map((n, i) => (
                                  <span key={i} className="badge bg-light text-dark border" style={{ fontSize: 10 }}>{n}</span>
                                ))}
                                {(adm.care_team_names || []).length > 2 && (
                                  <span className="badge bg-light text-muted border" style={{ fontSize: 10 }}>+{(adm.care_team_names || []).length - 2}</span>
                                )}
                              </div>
                            </td>
                            <td className="py-3">
                              <span className="badge" style={{ background: sb.bg, color: sb.color, fontSize: 10 }}>{sb.label}</span>
                            </td>
                            <td className="pe-3 py-3 text-end">
                              <div className="d-flex gap-1 justify-content-end">
                                <button className="btn btn-sm btn-outline-primary" onClick={() => openNursingNotes(adm)} title="Nursing Notes">
                                  <i className="fas fa-notes-medical"></i>
                                </button>
                                <button className="btn btn-sm btn-success" onClick={() => openDischarge(adm)} title="Discharge">
                                  <i className="fas fa-sign-out-alt"></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                      {admissions.length === 0 && (
                        <tr><td colSpan={7} className="text-center py-4 text-muted small">No current admissions.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {/* ══════════ ADMIT MODAL ══════════ */}
      {showAdmit && (
        <div className="modal" style={{ display: 'block', background: 'rgba(0,0,0,0.4)' }} onClick={() => setShowAdmit(false)}>
          <div className="modal-dialog modal-dialog-scrollable" onClick={e => e.stopPropagation()}>
            <div className="modal-content" style={{ borderRadius: 16 }}>
              <div className="modal-header" style={{ background: 'linear-gradient(135deg,#4361ee,#7c3aed)', borderRadius: '16px 16px 0 0', border: 'none' }}>
                <h5 className="modal-title text-white"><i className="fas fa-user-plus me-2"></i>Admit Patient</h5>
                <button className="btn-close btn-close-white" onClick={() => setShowAdmit(false)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label small fw-bold">Visit ID</label>
                  <input className="form-control form-control-sm" placeholder="Enter visit ID" value={admitForm.visit}
                    onChange={e => setAdmitForm(p => ({ ...p, visit: e.target.value }))} />
                  <div className="form-text small">Enter the visit ID of the patient to admit.</div>
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-bold">Ward</label>
                  <select className="form-select form-select-sm" value={admitForm.ward}
                    onChange={e => {
                      const wardId = e.target.value;
                      setAdmitForm(p => ({ ...p, ward: wardId, bed: '' }));
                      if (wardId) { fetchAvailableBeds(wardId); }
                    }}>
                    <option value="">— Select Ward —</option>
                    {wards.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-bold">Bed</label>
                  <select className="form-select form-select-sm" value={admitForm.bed}
                    onChange={e => setAdmitForm(p => ({ ...p, bed: e.target.value }))}>
                    <option value="">— Select Bed —</option>
                    {availableBeds.map(b => <option key={b.id} value={b.id}>{b.bed_number} ({b.bed_type_display})</option>)}
                  </select>
                  {admitForm.ward && availableBeds.length === 0 && (
                    <div className="text-danger small mt-1"><i className="fas fa-exclamation-circle me-1"></i>No available beds in this ward.</div>
                  )}
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-bold">Admission Notes</label>
                  <textarea className="form-control form-control-sm" rows={2} value={admitForm.admission_notes}
                    onChange={e => setAdmitForm(p => ({ ...p, admission_notes: e.target.value }))}
                    placeholder="Reason for admission, referral details…" />
                </div>
              </div>
              <div className="modal-footer" style={{ borderRadius: '0 0 16px 16px', border: 'none' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowAdmit(false)}>Cancel</button>
                <button className="btn btn-primary btn-sm" onClick={handleAdmit}><i className="fas fa-save me-1"></i>Admit</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ DISCHARGE MODAL ══════════ */}
      {showDischarge && selectedAdmission && (
        <div className="modal" style={{ display: 'block', background: 'rgba(0,0,0,0.4)' }} onClick={() => setShowDischarge(false)}>
          <div className="modal-dialog modal-dialog-scrollable" onClick={e => e.stopPropagation()}>
            <div className="modal-content" style={{ borderRadius: 16 }}>
              <div className="modal-header" style={{ background: 'linear-gradient(135deg,#059669,#10b981)', borderRadius: '16px 16px 0 0', border: 'none' }}>
                <h5 className="modal-title text-white"><i className="fas fa-sign-out-alt me-2"></i>Discharge Patient</h5>
                <button className="btn-close btn-close-white" onClick={() => setShowDischarge(false)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3 p-2" style={{ background: '#f8fafc', borderRadius: 10 }}>
                  <div className="fw-bold small">{selectedAdmission.patient_name}</div>
                  <div className="text-muted small">{selectedAdmission.patient_id_code} · Bed {selectedAdmission.bed_info?.bed_number} · {selectedAdmission.length_of_stay_days} days</div>
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-bold">Discharge Type</label>
                  <select className="form-select form-select-sm" value={dischargeForm.discharge_type}
                    onChange={e => setDischargeForm(p => ({ ...p, discharge_type: e.target.value }))}>
                    <option value="discharged">Discharged — improved</option>
                    <option value="discharged_ama">Discharged — against medical advice</option>
                    <option value="transferred">Transferred to another facility</option>
                    <option value="referred">Referred to specialist</option>
                    <option value="absconded">Absconded</option>
                    <option value="died">Died</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-bold">Discharge Summary</label>
                  <textarea className="form-control form-control-sm" rows={3} value={dischargeForm.discharge_summary}
                    onChange={e => setDischargeForm(p => ({ ...p, discharge_summary: e.target.value }))}
                    placeholder="Final diagnosis, procedures performed, outcome…" />
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-bold">Discharge Medications</label>
                  <textarea className="form-control form-control-sm" rows={2} value={dischargeForm.discharge_medications}
                    onChange={e => setDischargeForm(p => ({ ...p, discharge_medications: e.target.value }))}
                    placeholder="Medications to continue at home…" />
                </div>
                <div className="row g-2">
                  <div className="col-md-6">
                    <label className="form-label small fw-bold">Follow-up Date</label>
                    <input type="date" className="form-control form-control-sm" value={dischargeForm.follow_up_date}
                      onChange={e => setDischargeForm(p => ({ ...p, follow_up_date: e.target.value }))} />
                  </div>
                </div>
                <div className="mt-3">
                  <label className="form-label small fw-bold">Follow-up Instructions</label>
                  <textarea className="form-control form-control-sm" rows={2} value={dischargeForm.follow_up_instructions}
                    onChange={e => setDischargeForm(p => ({ ...p, follow_up_instructions: e.target.value }))}
                    placeholder="Diet, activity restrictions, warning signs…" />
                </div>
              </div>
              <div className="modal-footer" style={{ borderRadius: '0 0 16px 16px', border: 'none' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowDischarge(false)}>Cancel</button>
                <button className="btn btn-outline-secondary btn-sm" onClick={() => printDischargeCertificate(selectedAdmission, dischargeForm)}>
                  <i className="fas fa-print me-1"></i>Print Certificate
                </button>
                <button className="btn btn-success btn-sm" onClick={handleDischarge}><i className="fas fa-check me-1"></i>Confirm Discharge</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ WARD & BED MANAGEMENT MODAL ══════════ */}
      {/* ══════════ NURSING NOTES MODAL ══════════ */}
      {showNursingNotes && nursingAdmission && (
        <div className="modal" style={{ display: 'block', background: 'rgba(0,0,0,0.4)' }} onClick={() => setShowNursingNotes(false)}>
          <div className="modal-dialog modal-lg modal-dialog-scrollable" onClick={e => e.stopPropagation()}>
            <div className="modal-content" style={{ borderRadius: 16 }}>
              <div className="modal-header" style={{ background: 'linear-gradient(135deg,#0891b2,#0e7490)', borderRadius: '16px 16px 0 0', border: 'none' }}>
                <h5 className="modal-title text-white"><i className="fas fa-notes-medical me-2"></i>Nursing Notes — {nursingAdmission.patient_name}</h5>
                <button className="btn-close btn-close-white" onClick={() => setShowNursingNotes(false)}></button>
              </div>
              <div className="modal-body" style={{ maxHeight: '65vh', overflowY: 'auto' }}>
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <div className="small text-muted">Bed {nursingAdmission.bed_info?.bed_number} · {nursingAdmission.ward_info?.name} · {nursingAdmission.length_of_stay_days}d</div>
                  <button className="btn btn-primary btn-sm" onClick={() => setShowNursingForm(f => !f)}>
                    <i className={`fas fa-${showNursingForm ? 'minus' : 'plus'} me-1`}></i>{showNursingForm ? 'Cancel' : 'Add Note'}
                  </button>
                </div>

                {showNursingForm && (
                  <div className="p-3 mb-4" style={{ background: '#f0f9ff', borderRadius: 12, border: '1px solid #bae6fd' }}>
                    <h6 className="fw-bold mb-3" style={{ color: '#0369a1' }}>New Nursing Note</h6>
                    <div className="row g-2 mb-2">
                      <div className="col-md-4">
                        <label className="form-label small fw-bold">Shift</label>
                        <select className="form-select form-select-sm" value={nursingForm.shift}
                          onChange={e => setNursingForm(p => ({ ...p, shift: e.target.value }))}>
                          <option value="morning">Morning (6am–2pm)</option>
                          <option value="afternoon">Afternoon (2pm–10pm)</option>
                          <option value="night">Night (10pm–6am)</option>
                        </select>
                      </div>
                      <div className="col-md-4">
                        <label className="form-label small fw-bold">Date</label>
                        <input type="date" className="form-control form-control-sm" value={nursingForm.note_date}
                          onChange={e => setNursingForm(p => ({ ...p, note_date: e.target.value }))} />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label small fw-bold">Pain Score (0–10)</label>
                        <input type="number" min="0" max="10" className="form-control form-control-sm" value={nursingForm.pain_score}
                          onChange={e => setNursingForm(p => ({ ...p, pain_score: e.target.value }))} />
                      </div>
                    </div>
                    <div className="row g-2 mb-2">
                      <div className="col-md-3"><label className="form-label small fw-bold">Temp (°C)</label>
                        <input className="form-control form-control-sm" value={nursingForm.temperature_celsius}
                          onChange={e => setNursingForm(p => ({ ...p, temperature_celsius: e.target.value }))} /></div>
                      <div className="col-md-3"><label className="form-label small fw-bold">BP</label>
                        <input className="form-control form-control-sm" placeholder="120/80" value={nursingForm.blood_pressure}
                          onChange={e => setNursingForm(p => ({ ...p, blood_pressure: e.target.value }))} /></div>
                      <div className="col-md-3"><label className="form-label small fw-bold">HR (bpm)</label>
                        <input type="number" className="form-control form-control-sm" value={nursingForm.heart_rate}
                          onChange={e => setNursingForm(p => ({ ...p, heart_rate: e.target.value }))} /></div>
                      <div className="col-md-3"><label className="form-label small fw-bold">SpO₂ (%)</label>
                        <input type="number" className="form-control form-control-sm" value={nursingForm.oxygen_saturation}
                          onChange={e => setNursingForm(p => ({ ...p, oxygen_saturation: e.target.value }))} /></div>
                    </div>
                    <div className="row g-2 mb-2">
                      <div className="col-md-4"><label className="form-label small fw-bold">IV Fluids Given</label>
                        <input className="form-control form-control-sm" value={nursingForm.iv_fluids_given}
                          onChange={e => setNursingForm(p => ({ ...p, iv_fluids_given: e.target.value }))} /></div>
                      <div className="col-md-4"><label className="form-label small fw-bold">Oral Intake</label>
                        <input className="form-control form-control-sm" value={nursingForm.oral_intake}
                          onChange={e => setNursingForm(p => ({ ...p, oral_intake: e.target.value }))} /></div>
                      <div className="col-md-4"><label className="form-label small fw-bold">Urine Output</label>
                        <input className="form-control form-control-sm" value={nursingForm.urine_output}
                          onChange={e => setNursingForm(p => ({ ...p, urine_output: e.target.value }))} /></div>
                    </div>
                    <div className="mb-2">
                      <label className="form-label small fw-bold">Medications Given</label>
                      <textarea className="form-control form-control-sm" rows={2} value={nursingForm.medications_given}
                        onChange={e => setNursingForm(p => ({ ...p, medications_given: e.target.value }))}
                        placeholder="Drug name, dose, route, time…" />
                    </div>
                    <div className="mb-2">
                      <label className="form-label small fw-bold">Nursing Assessment</label>
                      <textarea className="form-control form-control-sm" rows={2} value={nursingForm.nursing_assessment}
                        onChange={e => setNursingForm(p => ({ ...p, nursing_assessment: e.target.value }))}
                        placeholder="Observations, patient condition…" />
                    </div>
                    <div className="mb-2">
                      <label className="form-label small fw-bold">Nursing Plan / Interventions</label>
                      <textarea className="form-control form-control-sm" rows={2} value={nursingForm.nursing_plan}
                        onChange={e => setNursingForm(p => ({ ...p, nursing_plan: e.target.value }))}
                        placeholder="Actions taken and planned…" />
                    </div>
                    <div className="mb-2">
                      <label className="form-label small fw-bold">Wound Care</label>
                      <input className="form-control form-control-sm" value={nursingForm.wound_care}
                        onChange={e => setNursingForm(p => ({ ...p, wound_care: e.target.value }))} />
                    </div>
                    <div className="mb-2">
                      <label className="form-label small fw-bold">Handover Notes</label>
                      <textarea className="form-control form-control-sm" rows={2} value={nursingForm.handover_notes}
                        onChange={e => setNursingForm(p => ({ ...p, handover_notes: e.target.value }))}
                        placeholder="Information for incoming shift…" />
                    </div>
                    <div className="d-flex justify-content-end mt-3">
                      <button className="btn btn-primary btn-sm" onClick={handleSaveNursingNote} disabled={nursingSaving}>
                        {nursingSaving ? <><i className="fas fa-spinner fa-spin me-1"></i>Saving…</> : <><i className="fas fa-save me-1"></i>Save Note</>}
                      </button>
                    </div>
                  </div>
                )}

                {nursingLoading ? (
                  <div className="text-center py-4"><div className="spinner-border text-primary spinner-border-sm"></div></div>
                ) : nursingNotes.length === 0 ? (
                  <div className="text-center text-muted py-4 small"><i className="fas fa-notes-medical d-block mb-2" style={{ fontSize: 28 }}></i>No nursing notes yet.</div>
                ) : (
                  nursingNotes.map(n => (
                    <div key={n.id} className="p-3 mb-3" style={{ background: '#f8fafc', borderRadius: 12, border: '1px solid #e2e8f0' }}>
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <div>
                          <span className="badge me-2" style={{ background: n.shift === 'morning' ? '#fef3c7' : n.shift === 'afternoon' ? '#e0e7ff' : '#1e293b', color: n.shift === 'morning' ? '#b45309' : n.shift === 'afternoon' ? '#3730a3' : '#f1f5f9', fontSize: 10 }}>{n.shift_display}</span>
                          <span className="small fw-bold text-dark">{new Date(n.note_date).toLocaleDateString('en-GB')}</span>
                        </div>
                        <span className="small text-muted">{n.nurse?.name || '—'}</span>
                      </div>
                      {(n.temperature_celsius || n.blood_pressure || n.heart_rate || n.oxygen_saturation) && (
                        <div className="d-flex gap-3 mb-2" style={{ fontSize: 12, color: '#374151' }}>
                          {n.temperature_celsius && <span><strong>T:</strong> {n.temperature_celsius}°C</span>}
                          {n.blood_pressure && <span><strong>BP:</strong> {n.blood_pressure}</span>}
                          {n.heart_rate && <span><strong>HR:</strong> {n.heart_rate}</span>}
                          {n.oxygen_saturation && <span><strong>SpO₂:</strong> {n.oxygen_saturation}%</span>}
                          {n.pain_score != null && <span><strong>Pain:</strong> {n.pain_score}/10</span>}
                        </div>
                      )}
                      {n.nursing_assessment && <div className="small mb-1"><strong>Assessment:</strong> {n.nursing_assessment}</div>}
                      {n.nursing_plan && <div className="small mb-1"><strong>Plan:</strong> {n.nursing_plan}</div>}
                      {n.medications_given && <div className="small mb-1"><strong>Medications:</strong> {n.medications_given}</div>}
                      {n.handover_notes && <div className="small" style={{ color: '#7c3aed' }}><strong>Handover:</strong> {n.handover_notes}</div>}
                    </div>
                  ))
                )}
              </div>
              <div className="modal-footer" style={{ borderRadius: '0 0 16px 16px', border: 'none' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowNursingNotes(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showWardMgmt && (
        <div className="modal" style={{ display: 'block', background: 'rgba(0,0,0,0.4)' }} onClick={() => setShowWardMgmt(false)}>
          <div className="modal-dialog modal-lg modal-dialog-scrollable" onClick={e => e.stopPropagation()}>
            <div className="modal-content" style={{ borderRadius: 16 }}>
              <div className="modal-header" style={{ background: 'linear-gradient(135deg,#f59e0b,#f97316)', borderRadius: '16px 16px 0 0', border: 'none' }}>
                <h5 className="modal-title text-white"><i className="fas fa-cog me-2"></i>Ward & Bed Management</h5>
                <button className="btn-close btn-close-white" onClick={() => setShowWardMgmt(false)}></button>
              </div>
              <div className="modal-body">
                {/* Create Ward */}
                <div className="mb-4 p-3" style={{ background: '#fffbeb', borderRadius: 12, border: '1px solid #fcd34d' }}>
                  <h6 className="fw-bold mb-2"><i className="fas fa-plus-circle me-1 text-warning"></i>New Ward</h6>
                  <div className="row g-2">
                    <div className="col-md-4">
                      <input className="form-control form-control-sm" placeholder="Ward name" value={wardForm.name}
                        onChange={e => setWardForm(p => ({ ...p, name: e.target.value }))} />
                    </div>
                    <div className="col-md-3">
                      <select className="form-select form-select-sm" value={wardForm.ward_type}
                        onChange={e => setWardForm(p => ({ ...p, ward_type: e.target.value }))}>
                        <option value="general_male">General Male</option>
                        <option value="general_female">General Female</option>
                        <option value="pediatric">Pediatric</option>
                        <option value="maternity">Maternity</option>
                        <option value="icu">ICU</option>
                        <option value="nicu">NICU</option>
                        <option value="surgical">Surgical</option>
                        <option value="isolation">Isolation</option>
                        <option value="private">Private</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="col-md-2">
                      <input className="form-control form-control-sm" placeholder="Capacity" type="number" min="0"
                        value={wardForm.capacity} onChange={e => setWardForm(p => ({ ...p, capacity: e.target.value }))} />
                    </div>
                    <div className="col-md-2">
                      <input className="form-control form-control-sm" placeholder="Floor" value={wardForm.floor}
                        onChange={e => setWardForm(p => ({ ...p, floor: e.target.value }))} />
                    </div>
                    <div className="col-md-1">
                      <button className="btn btn-warning btn-sm w-100" onClick={createWard}><i className="fas fa-plus"></i></button>
                    </div>
                  </div>
                </div>

                {/* Create Bed */}
                <div className="mb-4 p-3" style={{ background: '#eff6ff', borderRadius: 12, border: '1px solid #93c5fd' }}>
                  <h6 className="fw-bold mb-2"><i className="fas fa-plus-circle me-1 text-primary"></i>New Bed</h6>
                  <div className="row g-2">
                    <div className="col-md-3">
                      <select className="form-select form-select-sm" value={bedForm.ward}
                        onChange={e => setBedForm(p => ({ ...p, ward: e.target.value }))}>
                        <option value="">— Ward —</option>
                        {wards.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                      </select>
                    </div>
                    <div className="col-md-3">
                      <input className="form-control form-control-sm" placeholder="Bed number" value={bedForm.bed_number}
                        onChange={e => setBedForm(p => ({ ...p, bed_number: e.target.value }))} />
                    </div>
                    <div className="col-md-3">
                      <select className="form-select form-select-sm" value={bedForm.bed_type}
                        onChange={e => setBedForm(p => ({ ...p, bed_type: e.target.value }))}>
                        <option value="standard">Standard</option>
                        <option value="electric">Electric</option>
                        <option value="icu">ICU</option>
                        <option value="pediatric">Pediatric</option>
                        <option value="bassinet">Bassinet</option>
                        <option value="isolation">Isolation</option>
                        <option value="delivery">Delivery</option>
                        <option value="recovery">Recovery</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                    <div className="col-md-2">
                      <button className="btn btn-primary btn-sm w-100" onClick={createBed}><i className="fas fa-plus"></i></button>
                    </div>
                  </div>
                </div>

                {/* Existing Wards */}
                <h6 className="fw-bold mb-2">Existing Wards</h6>
                <div className="table-responsive">
                  <table className="table table-sm table-hover">
                    <thead style={{ background: '#f8fafc' }}>
                      <tr>
                        <th className="small text-muted">Name</th>
                        <th className="small text-muted">Type</th>
                        <th className="small text-muted">Capacity</th>
                        <th className="small text-muted">Occupied</th>
                        <th className="small text-muted">Available</th>
                        <th className="small text-muted">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {wards.map(w => (
                        <tr key={w.id}>
                          <td className="small fw-bold">{w.name}</td>
                          <td className="small">{w.ward_type_display}</td>
                          <td className="small">{w.capacity}</td>
                          <td className="small">{w.occupancy_count}</td>
                          <td className="small">{w.available_count}</td>
                          <td className="small"><span className="badge" style={{ fontSize: 10, background: w.status === 'active' ? '#d1fae5' : '#fee2e2', color: w.status === 'active' ? '#065f46' : '#991b1b' }}>{w.status_display}</span></td>
                        </tr>
                      ))}
                      {wards.length === 0 && (
                        <tr><td colSpan={6} className="text-center text-muted small py-3">No wards configured.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="modal-footer" style={{ borderRadius: '0 0 16px 16px', border: 'none' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setShowWardMgmt(false)}>Close</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

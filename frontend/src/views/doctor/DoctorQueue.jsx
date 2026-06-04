import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../layout/DashboardLayout';
import { getNavForUser, getBrandForUser, getRoleBadge } from '../../utils/navItems';
import { showToast } from '../../utils/toast';

function DoctorQueue() {
  const { apiCall, user } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    count: 0,
    waiting: 0,
    in_consultation: 0,
    scheduled: 0
  });
  const [currentTime, setCurrentTime] = useState(new Date());
  const [warningShown, setWarningShown] = useState(new Set()); // Track which appointments we've warned about
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('doctorQueueView') || 'card');

  // ── Prescription modal state ──────────────────────────────
  const [rxModal, setRxModal]             = useState(false);
  const [rxApt, setRxApt]                 = useState(null);
  const [rxLoading, setRxLoading]         = useState(false);
  const [rxSaving, setRxSaving]           = useState(false);
  const [rxDrugSearch, setRxDrugSearch]   = useState('');
  const [rxDrugResults, setRxDrugResults] = useState([]);
  const [rxNotes, setRxNotes]             = useState('');
  const [rxItems, setRxItems]             = useState([]);
  const EMPTY_ITEM = { drug: null, drug_name: '', strength: '', dosage_form: '', dose: '', route: 'oral', frequency: 'bd', duration_days: '', quantity: 1, instructions: '' };

  // ── Admit modal state ────────────────────────────────────
  const [admitModal, setAdmitModal]         = useState(false);
  const [admitApt, setAdmitApt]             = useState(null);
  const [wards, setWards]                   = useState([]);
  const [availBeds, setAvailBeds]           = useState([]);
  const [admitWard, setAdmitWard]           = useState('');
  const [admitBed, setAdmitBed]             = useState('');
  const [admitNotes, setAdmitNotes]         = useState('');
  const [admitSaving, setAdmitSaving]       = useState(false);

  // ── Lab order modal state ──────────────────────────────
  const [labModal, setLabModal]             = useState(false);
  const [labApt, setLabApt]                 = useState(null);
  const [labTests, setLabTests]             = useState([]);
  const [labForm, setLabForm]               = useState({ test_name: '', test_category: 'haematology', priority: 'routine', sample_type: 'blood', clinical_info: '' });
  const [labSaving, setLabSaving]           = useState(false);

  const openRxModal = async (apt) => {
    setRxApt(apt);
    setRxItems([{ ...EMPTY_ITEM }]);
    setRxNotes('');
    setRxDrugSearch('');
    setRxDrugResults([]);
    setRxLoading(true);
    setRxModal(true);
    if (apt.visit_id) {
      try {
        const res = await apiCall(`/visits/${apt.visit_id}/prescription/`);
        if (res.ok) {
          const data = await res.json();
          if (data && data.items && data.items.length > 0) {
            setRxItems(data.items.map(i => ({ drug: i.drug, drug_name: i.drug_name, strength: i.strength, dosage_form: i.dosage_form, dose: i.dose, route: i.route, frequency: i.frequency, duration_days: i.duration_days || '', quantity: i.quantity, instructions: i.instructions })));
            setRxNotes(data.notes || '');
          }
        }
      } catch { /* ignore */ }
    }
    setRxLoading(false);
  };

  const searchDrugs = async (q) => {
    setRxDrugSearch(q);
    if (q.length < 2) { setRxDrugResults([]); return; }
    try {
      const res = await apiCall(`/pharmacy/inventory/search/?q=${encodeURIComponent(q)}`);
      if (res.ok) setRxDrugResults(await res.json());
    } catch { setRxDrugResults([]); }
  };

  const addRxItem = () => setRxItems(p => [...p, { ...EMPTY_ITEM }]);
  const removeRxItem = (i) => setRxItems(p => p.filter((_, idx) => idx !== i));
  const updateRxItem = (i, field, val) => setRxItems(p => p.map((it, idx) => idx === i ? { ...it, [field]: val } : it));
  const selectDrug = (itemIdx, drug) => {
    setRxItems(p => p.map((it, idx) => idx === itemIdx ? { ...it, drug: drug.id, drug_name: drug.drug_name, strength: drug.strength, dosage_form: drug.dosage_form } : it));
    setRxDrugSearch('');
    setRxDrugResults([]);
  };

  const printPrescription = () => {
    const patient = rxApt?.patient_name || rxApt?.patient || 'Patient';
    const patientId = rxApt?.patient_id_code || '';
    const doctorName = rxApt?.doctor_name || '';
    const hospital = rxApt?.hospital_name || 'Hospital';
    const visitDate = rxApt?.scheduled_at ? new Date(rxApt.scheduled_at).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB');
    const validItems = rxItems.filter(i => i.drug_name.trim());
    const FREQ_LABELS = { od: 'Once daily', bd: 'Twice daily', tds: 'Three times daily', qds: 'Four times daily', nocte: 'At night', prn: 'As needed', stat: 'Immediately (stat)', weekly: 'Once a week' };
    const ROUTE_LABELS = { oral: 'Oral', im: 'IM', iv: 'IV', sc: 'SC', topical: 'Topical', sublingual: 'Sublingual', rectal: 'Rectal', inhaled: 'Inhaled', nasal: 'Nasal', optic: 'Optic', otic: 'Otic' };
    const rows = validItems.map((item, i) => `
      <tr>
        <td style='padding:8px 10px;border-bottom:1px solid #eee;font-weight:600'>${i + 1}. ${item.drug_name}${item.strength ? ` ${item.strength}` : ''}${item.dosage_form ? ` (${item.dosage_form})` : ''}</td>
        <td style='padding:8px 10px;border-bottom:1px solid #eee'>${item.dose || '—'}</td>
        <td style='padding:8px 10px;border-bottom:1px solid #eee'>${ROUTE_LABELS[item.route] || item.route || '—'}</td>
        <td style='padding:8px 10px;border-bottom:1px solid #eee'>${FREQ_LABELS[item.frequency] || item.frequency || '—'}</td>
        <td style='padding:8px 10px;border-bottom:1px solid #eee'>${item.duration_days ? `${item.duration_days} day(s)` : '—'}</td>
        <td style='padding:8px 10px;border-bottom:1px solid #eee'>${item.quantity || 1}</td>
        <td style='padding:8px 10px;border-bottom:1px solid #eee;color:#555'>${item.instructions || '—'}</td>
      </tr>`).join('');
    const html = `<!DOCTYPE html><html><head><title>Prescription</title><style>
      body{font-family:Arial,sans-serif;margin:0;padding:30px;color:#111;}
      .header{text-align:center;border-bottom:3px double #333;padding-bottom:16px;margin-bottom:18px;}
      .header h1{font-size:20px;margin:0 0 4px;} .header h2{font-size:15px;margin:0;color:#555;font-style:italic;}
      .meta{display:grid;grid-template-columns:1fr 1fr;gap:8px 20px;margin-bottom:18px;font-size:13px;}
      .meta .label{font-size:11px;font-weight:700;color:#888;display:block;} .meta .value{font-weight:600;}
      table{width:100%;border-collapse:collapse;font-size:12px;}
      thead th{background:#f4f4f4;padding:8px 10px;text-align:left;font-weight:700;border-bottom:2px solid #ccc;font-size:11px;text-transform:uppercase;letter-spacing:.6px;}
      .rx-symbol{font-size:32px;font-weight:900;color:#333;margin-bottom:8px;display:block;}
      .notes{background:#f9f9f9;border:1px solid #ddd;border-radius:6px;padding:10px 14px;margin-top:16px;font-size:13px;}
      .footer{text-align:center;font-size:11px;color:#888;margin-top:30px;padding-top:10px;border-top:1px solid #ddd;}
      .sig{margin-top:36px;display:grid;grid-template-columns:1fr 1fr;gap:40px;}
      .sig-line{border-top:1px solid #333;padding-top:5px;font-size:12px;text-align:center;}
      @media print{body{padding:15px;}}
    </style></head><body>
      <div class='header'>
        <h1>${hospital}</h1>
        <h2>PRESCRIPTION</h2>
      </div>
      <div class='meta'>
        <div><span class='label'>Patient Name</span><span class='value'>${patient}</span></div>
        <div><span class='label'>Patient ID</span><span class='value'>${patientId || '—'}</span></div>
        <div><span class='label'>Date</span><span class='value'>${visitDate}</span></div>
        <div><span class='label'>Prescribing Doctor</span><span class='value'>${doctorName || '—'}</span></div>
      </div>
      <span class='rx-symbol'>&#x211E;</span>
      <table>
        <thead><tr><th>Drug</th><th>Dose</th><th>Route</th><th>Frequency</th><th>Duration</th><th>Qty</th><th>Instructions</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      ${rxNotes ? `<div class='notes'><strong>Notes:</strong> ${rxNotes}</div>` : ''}
      <div class='sig'>
        <div class='sig-line'>Doctor's Signature / Stamp</div>
        <div class='sig-line'>Date</div>
      </div>
      <div class='footer'>${hospital} — National Electronic Health Record — Printed ${new Date().toLocaleString()}</div>
    </body></html>`;
    const win = window.open('', '_blank');
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(() => win.print(), 500);
  };

  const saveRx = async () => {
    if (!rxApt?.visit_id) { showToast.error('No visit linked to this appointment.'); return; }
    const validItems = rxItems.filter(i => i.drug_name.trim() && i.dose.trim());
    if (!validItems.length) { showToast.error('Add at least one drug with name and dose.'); return; }
    setRxSaving(true);
    try {
      const res = await apiCall(`/visits/${rxApt.visit_id}/prescription/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notes: rxNotes, items: validItems.map(i => ({ ...i, duration_days: i.duration_days || null })) }),
      });
      if (res.ok) {
        showToast.success('Prescription saved successfully');
        setRxModal(false);
      } else {
        const err = await res.json();
        showToast.error(err.detail || 'Failed to save prescription');
      }
    } catch { showToast.error('Failed to save prescription'); }
    setRxSaving(false);
  };

  // ── Admit handlers ─────────────────────────────────────
  const openAdmitModal = async (apt) => {
    setAdmitApt(apt);
    setAdmitWard(''); setAdmitBed(''); setAdmitNotes(''); setAvailBeds([]);
    setAdmitModal(true);
    try {
      const res = await apiCall('/ipd/wards/');
      if (res.ok) setWards(await res.json());
    } catch { setWards([]); }
  };

  const fetchAvailBeds = async (wardId) => {
    if (!wardId) { setAvailBeds([]); return; }
    try {
      const res = await apiCall(`/ipd/beds/available/?ward=${wardId}`);
      if (res.ok) setAvailBeds(await res.json());
      else setAvailBeds([]);
    } catch { setAvailBeds([]); }
  };

  const doAdmit = async () => {
    if (!admitApt?.visit_id) { showToast.error('No visit linked.'); return; }
    if (!admitBed) { showToast.error('Select a bed.'); return; }
    setAdmitSaving(true);
    try {
      const res = await apiCall('/ipd/admissions/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visit: admitApt.visit_id, bed: admitBed, ward: admitWard, admission_notes: admitNotes }),
      });
      if (res.ok) {
        showToast.success('Patient admitted successfully');
        setAdmitModal(false);
      } else {
        const err = await res.json();
        showToast.error(err.detail || 'Failed to admit');
      }
    } catch { showToast.error('Failed to admit patient'); }
    setAdmitSaving(false);
  };

  // ── Lab order handlers ───────────────────────────────────
  const openLabModal = async (apt) => {
    setLabApt(apt);
    setLabForm({ test_name: '', test_category: 'haematology', priority: 'routine', sample_type: 'blood', clinical_info: '' });
    setLabModal(true);
    if (apt.visit_id) {
      try {
        const res = await apiCall(`/lab/tests/?visit_id=${apt.visit_id}`);
        if (res.ok) setLabTests(await res.json());
        else setLabTests([]);
      } catch { setLabTests([]); }
    }
  };

  const doOrderLab = async () => {
    if (!labApt?.visit_id) { showToast.error('No visit linked.'); return; }
    if (!labForm.test_name.trim()) { showToast.error('Test name is required.'); return; }
    setLabSaving(true);
    try {
      const res = await apiCall('/lab/tests/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ visit_id: labApt.visit_id, ...labForm }),
      });
      if (res.ok) {
        showToast.success('Lab test ordered');
        setLabForm({ test_name: '', test_category: 'haematology', priority: 'routine', sample_type: 'blood', clinical_info: '' });
        const refresh = await apiCall(`/lab/tests/?visit_id=${labApt.visit_id}`);
        if (refresh.ok) setLabTests(await refresh.json());
      } else {
        const err = await res.json();
        showToast.error(err.error || 'Failed to order test');
      }
    } catch { showToast.error('Failed to order lab test'); }
    setLabSaving(false);
  };

  const setView = (mode) => {
    setViewMode(mode);
    localStorage.setItem('doctorQueueView', mode);
  };

  const roleColors = {
    admin: '#4361ee', ministry_admin: '#7c3aed', district_admin: '#059669',
    hospital_admin: '#f77f00', receptionist: '#0891b2', doctor: '#e63946', nurse: '#ec4899',
  };

  // Fetch queue
  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      const response = await apiCall('/appointments/my_queue/');
      if (response.ok) {
        const data = await response.json();
        setAppointments(data.appointments || []);
        setStats({
          count: data.count || 0,
          waiting: data.waiting || 0,
          in_consultation: data.in_consultation || 0,
          scheduled: data.scheduled || 0
        });
      }
    } catch {
      showToast.error('Failed to load queue');
    } finally {
      setLoading(false);
    }
  }, [apiCall]);

  useEffect(() => {
    fetchQueue();
    // Auto-refresh every 30 seconds
    const queueInterval = setInterval(fetchQueue, 30000);
    return () => clearInterval(queueInterval);
  }, [fetchQueue]);

  // Update current time every second for countdown timer
  useEffect(() => {
    const timerInterval = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timerInterval);
  }, []);

  // Calculate remaining time for consultation
  const getRemainingTime = useCallback((appointment) => {
    // Debug log
    if (appointment.status === 'in_consultation') {
      console.log('Consultation appointment:', {
        id: appointment.id,
        consultation_started_at: appointment.consultation_started_at,
        duration_minutes: appointment.duration_minutes
      });
    }
    
    if (appointment.status !== 'in_consultation') {
      return null;
    }
    
    // If consultation_started_at is missing, use current time as fallback
    const startTime = appointment.consultation_started_at 
      ? new Date(appointment.consultation_started_at)
      : new Date(); // Fallback to now if timestamp is missing
    
    const durationMs = (appointment.duration_minutes || 30) * 60 * 1000;
    const endTime = new Date(startTime.getTime() + durationMs);
    const remainingMs = endTime - currentTime;
    
    if (remainingMs <= 0) {
      return { expired: true, minutes: 0, seconds: 0 };
    }
    
    const minutes = Math.floor(remainingMs / 60000);
    const seconds = Math.floor((remainingMs % 60000) / 1000);
    
    return { expired: false, minutes, seconds };
  }, [currentTime]);

  // Check if we should show warning (1 minute remaining)
  const shouldShowWarning = useCallback((appointment) => {
    const remaining = getRemainingTime(appointment);
    if (!remaining || remaining.expired) return false;
    return remaining.minutes === 0 && remaining.seconds <= 60 && !warningShown.has(appointment.id);
  }, [getRemainingTime, warningShown]);

  // Show warning notification
  useEffect(() => {
    appointments.forEach(apt => {
      if (shouldShowWarning(apt)) {
        // Visual warning
        showToast.warning(`⏰ 1 minute remaining for ${apt.patient?.full_name}`);
        
        // Audio warning (using browser audio API)
        try {
          const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBiuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
          audio.play().catch(() => {}); // Ignore autoplay restrictions
        } catch {/* Ignore audio autoplay restrictions */}
        
        setWarningShown(prev => new Set([...prev, apt.id]));
      }
    });
  }, [appointments, currentTime, warningShown, shouldShowWarning]);

  // Auto-complete appointment when time expires
  useEffect(() => {
    const checkAndComplete = async () => {
      for (const apt of appointments) {
        const remaining = getRemainingTime(apt);
        if (remaining && remaining.expired && apt.status === 'in_consultation') {
          try {
            await apiCall(`/appointments/${apt.id}/complete/`, {
              method: 'POST'
            });
            showToast.success(`⏰ Appointment with ${apt.patient?.full_name} auto-completed`);
            fetchQueue(); // Refresh the queue
          } catch (error) {
            console.error('Failed to auto-complete appointment:', error);
          }
        }
      }
    };
    
    checkAndComplete();
  }, [currentTime, appointments, apiCall, fetchQueue, getRemainingTime]);

  // Format countdown display
  const formatCountdown = (remaining) => {
    if (!remaining) return null;
    if (remaining.expired) return "Time's up!";
    
    const min = String(remaining.minutes).padStart(2, '0');
    const sec = String(remaining.seconds).padStart(2, '0');
    return `${min}:${sec}`;
  };

  const handleStartConsultation = async (appointmentId) => {
    try {
      const response = await apiCall(`/appointments/${appointmentId}/start_consultation/`, {
        method: 'POST'
      });
      if (response.ok) {
        showToast.success('Consultation started');
        fetchQueue();
      } else {
        const error = await response.json();
        showToast.error(error.detail || 'Failed to start consultation');
      }
    } catch {
      showToast.error('Failed to start consultation');
    }
  };

  const handleComplete = async (appointmentId) => {
    try {
      const response = await apiCall(`/appointments/${appointmentId}/complete/`, {
        method: 'POST'
      });
      if (response.ok) {
        showToast.success('Appointment completed');
        fetchQueue();
      } else {
        const error = await response.json();
        showToast.error(error.detail || 'Failed to complete');
      }
    } catch {
      showToast.error('Failed to complete appointment');
    }
  };

  const handleCancel = async (appointmentId) => {
    if (!confirm('Are you sure you want to cancel this appointment?')) return;
    try {
      const response = await apiCall(`/appointments/${appointmentId}/cancel/`, {
        method: 'POST'
      });
      if (response.ok) {
        showToast.success('Appointment cancelled');
        fetchQueue();
      } else {
        const error = await response.json();
        showToast.error(error.detail || 'Failed to cancel');
      }
    } catch {
      showToast.error('Failed to cancel appointment');
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return '--';
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getWaitTime = (checkedInAt) => {
    if (!checkedInAt) return null;
    const diff = new Date() - new Date(checkedInAt);
    const minutes = Math.floor(diff / 60000);
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes} min`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  const getStatusCard = (status) => {
    const cards = {
      scheduled: { bg: '#dbeafe', border: '#3b82f6', icon: 'fa-calendar', label: 'Scheduled', desc: 'Waiting for patient' },
      checked_in: { bg: '#dcfce7', border: '#22c55e', icon: 'fa-check-circle', label: 'Checked In', desc: 'Patient waiting' },
      in_consultation: { bg: '#fef3c7', border: '#f59e0b', icon: 'fa-user-md', label: 'In Consultation', desc: 'Currently seeing patient' },
    };
    return cards[status] || cards.scheduled;
  };

  const filteredAppointments = appointments.filter(apt => {
    const matchesSearch = 
      apt.patient?.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.patient?.patient_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      apt.reason?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || apt.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  return (
    <DashboardLayout navItems={getNavForUser(user)} brandTitle={getBrandForUser(user)} roleBadge={getRoleBadge(user)}>
      <div className="container-fluid py-4">
        {/* Header */}
        <div className="row mb-4">
          <div className="col-12">
            <div className="d-flex justify-content-between align-items-center">
              <div>
                <h1 className="h3 mb-0">
                  <i className="fas fa-users-viewfinder me-2" style={{ color: roleColors[user?.role] || '#4361ee' }}></i>
                  Live Patient Queue
                </h1>
                <p className="text-muted mb-0 small">Real-time patient flow management</p>
              </div>
              <div className="d-flex gap-2 align-items-center flex-wrap">
                <div className="input-group input-group-sm" style={{ width: '220px' }}>
                  <span className="input-group-text bg-white border-end-0">
                    <i className="fas fa-search text-muted"></i>
                  </span>
                  <input 
                    type="text" 
                    className="form-control border-start-0" 
                    placeholder="Search patients..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <select 
                  className="form-select form-select-sm" 
                  style={{ width: '140px' }}
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <option value="all">All Status</option>
                  <option value="scheduled">Scheduled</option>
                  <option value="checked_in">Waiting</option>
                  <option value="in_consultation">In Progress</option>
                </select>
                {/* View toggle */}
                <div className="btn-group btn-group-sm" role="group">
                  <button
                    className={`btn ${viewMode === 'card' ? 'btn-primary' : 'btn-outline-secondary'}`}
                    onClick={() => setView('card')}
                    title="Card view"
                  >
                    <i className="fas fa-th-large"></i>
                  </button>
                  <button
                    className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-outline-secondary'}`}
                    onClick={() => setView('list')}
                    title="List view"
                  >
                    <i className="fas fa-list"></i>
                  </button>
                </div>
                <button className="btn btn-sm btn-outline-secondary" onClick={fetchQueue} disabled={loading}>
                  <i className={`fas fa-sync-alt ${loading ? 'fa-spin' : ''}`}></i>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="row g-3 mb-4">
          <div className="col-6 col-md-3">
            <div className="card border-0 h-100" style={{ background: '#dbeafe' }}>
              <div className="card-body p-3">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <div className="small text-muted">Scheduled</div>
                    <div className="h4 mb-0 text-primary">{stats.scheduled}</div>
                  </div>
                  <i className="fas fa-calendar fa-2x text-primary opacity-25"></i>
                </div>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card border-0 h-100" style={{ background: '#dcfce7' }}>
              <div className="card-body p-3">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <div className="small text-muted">Waiting</div>
                    <div className="h4 mb-0 text-success">{stats.waiting}</div>
                  </div>
                  <i className="fas fa-users fa-2x text-success opacity-25"></i>
                </div>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card border-0 h-100" style={{ background: '#fef3c7' }}>
              <div className="card-body p-3">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <div className="small text-muted">In Progress</div>
                    <div className="h4 mb-0" style={{ color: '#92400e' }}>{stats.in_consultation}</div>
                  </div>
                  <i className="fas fa-user-md fa-2x opacity-25" style={{ color: '#92400e' }}></i>
                </div>
              </div>
            </div>
          </div>
          <div className="col-6 col-md-3">
            <div className="card border-0 h-100" style={{ background: 'linear-gradient(135deg, #4361ee, #7c3aed)', color: 'white' }}>
              <div className="card-body p-3">
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <div className="small opacity-75">Total Today</div>
                    <div className="h4 mb-0">{stats.count}</div>
                  </div>
                  <i className="fas fa-list-alt fa-2x opacity-50"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Queue Cards */}
        {loading ? (
          <div className="text-center py-5">
            <div className="spinner-border text-primary"></div>
            <p className="text-muted mt-2">Updating live queue...</p>
          </div>
        ) : filteredAppointments.length === 0 ? (
          <div className="text-center py-5">
            <div className="mb-4">
              <div style={{
                width: '120px', height: '120px', margin: '0 auto',
                background: '#f3f4f6', borderRadius: '50%',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
              }}>
                <i className="fas fa-clipboard-check fa-3x text-muted"></i>
              </div>
            </div>
            <h4 className="text-muted">{searchQuery ? 'No matching patients' : 'No Appointments Today'}</h4>
            <p className="text-muted">{searchQuery ? 'Try a different search term' : 'Your queue is empty. Patients will appear here when they check in.'}</p>
          </div>
        ) : viewMode === 'card' ? (
          <div className="row g-3">
            {filteredAppointments.map((apt, index) => {
              const statusCard = getStatusCard(apt.status);
              const waitTime = apt.status === 'checked_in' ? getWaitTime(apt.checked_in_at) : null;
              const remainingTime = getRemainingTime(apt);
              
              return (
                <div key={apt.id} className="col-md-6 col-lg-4">
                  <div className="card border-0 shadow-sm h-100" style={{ 
                    borderLeft: `4px solid ${statusCard.border} !important`,
                    background: statusCard.bg
                  }}>
                    <div className="card-body p-4">
                      {/* Header */}
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <div>
                          <span className="badge" style={{ 
                            background: statusCard.border, color: 'white',
                            fontSize: '11px', padding: '4px 10px', borderRadius: '20px'
                          }}>
                            <i className={`fas ${statusCard.icon} me-1`}></i>
                            #{index + 1}
                          </span>
                        </div>
                        <div className="text-end">
                          <div className="fw-bold h5 mb-0">{formatTime(apt.scheduled_at)}</div>
                          {waitTime && (
                            <div className="small" style={{ color: '#92400e' }}>
                              <i className="fas fa-clock me-1"></i>Waiting: {waitTime}
                            </div>
                          )}
                          {remainingTime && (
                            <div className={`small ${remainingTime.expired ? 'text-danger' : remainingTime.minutes === 0 ? 'text-warning' : 'text-success'}`}>
                              <i className={`fas ${remainingTime.expired ? 'fa-stop-circle' : remainingTime.minutes === 0 ? 'fa-exclamation-triangle' : 'fa-hourglass-half'} me-1`}></i>
                              {remainingTime.expired ? 'Time expired' : `Time left: ${formatCountdown(remainingTime)}`}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Patient Info */}
                      <div className="d-flex align-items-center gap-3 mb-3">
                        <div style={{
                          width: '50px', height: '50px', borderRadius: '50%',
                          background: 'linear-gradient(135deg, #667eea, #764ba2)',
                          color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: '18px', fontWeight: 'bold'
                        }}>
                          {apt.patient?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?'}
                        </div>
                        <div>
                          <div className="fw-semibold fs-5">{apt.patient?.full_name || 'Unknown'}</div>
                          <div className="small text-muted">
                            {apt.patient?.patient_id} • {apt.patient?.phone}
                          </div>
                        </div>
                      </div>

                      {/* Details */}
                      <div className="mb-3">
                        <div className="small text-muted mb-1">
                          <i className="fas fa-building me-2"></i>{apt.hospital}
                        </div>
                        <div className="small text-muted mb-1">
                          <i className="fas fa-door-open me-2"></i>{apt.department || 'No Department'}
                        </div>
                        {apt.reason && (
                          <div className="small text-muted">
                            <i className="fas fa-stethoscope me-2"></i>{apt.reason}
                          </div>
                        )}
                      </div>

                      {/* Notes */}
                      {apt.notes && (
                        <div className="alert alert-light py-2 mb-3 small" style={{ background: 'rgba(255,255,255,0.7)' }}>
                          <i className="fas fa-info-circle me-1"></i>{apt.notes}
                        </div>
                      )}

                      {/* Priority Badge */}
                      {apt.priority !== 'normal' && (
                        <div className="mb-3">
                          <span className={`badge bg-${apt.priority === 'emergency' ? 'danger' : 'warning'}`}>
                            <i className="fas fa-exclamation-triangle me-1"></i>
                            {apt.priority.toUpperCase()}
                          </span>
                        </div>
                      )}

                      {/* Action Buttons */}
                      <div className="d-flex gap-2 mt-auto">
                        {apt.status === 'scheduled' && (
                          <>
                            <button className="btn btn-success flex-fill" 
                              onClick={() => handleStartConsultation(apt.id)}>
                              <i className="fas fa-play me-2"></i>Start
                            </button>
                            <button className="btn btn-outline-danger" 
                              onClick={() => handleCancel(apt.id)}>
                              <i className="fas fa-times"></i>
                            </button>
                          </>
                        )}
                        {apt.status === 'checked_in' && (
                          <>
                            <button className="btn btn-warning flex-fill"
                              style={{ background: '#f59e0b', borderColor: '#f59e0b', color: 'white' }}
                              onClick={() => handleStartConsultation(apt.id)}>
                              <i className="fas fa-user-md me-2"></i>See Patient
                            </button>
                            <button className="btn btn-outline-danger" 
                              onClick={() => handleCancel(apt.id)}>
                              <i className="fas fa-times"></i>
                            </button>
                          </>
                        )}
                        {apt.status === 'in_consultation' && (
                          <>
                            {/* Always show timer for in_consultation appointments */}
                            <div className={`alert py-2 mb-2 text-center ${remainingTime?.expired ? 'alert-danger' : remainingTime?.minutes === 0 ? 'alert-warning' : 'alert-info'}`} style={{ fontSize: '14px', fontWeight: 'bold' }}>
                              <div className="d-flex align-items-center justify-content-center">
                                <i className={`fas ${remainingTime?.expired ? 'fa-stop-circle' : remainingTime?.minutes === 0 ? 'fa-exclamation-triangle' : 'fa-stopwatch'} me-2`}></i>
                                <span>Session Timer: {formatCountdown(remainingTime || { expired: false, minutes: 0, seconds: 0 })}</span>
                              </div>
                              {remainingTime?.expired && (
                                <div className="small mt-1">
                                  <i className="fas fa-info-circle me-1"></i>Auto-completing...
                                </div>
                              )}
                              {!remainingTime && (
                                <div className="small mt-1 text-muted">
                                  <i className="fas fa-info-circle me-1"></i>Initializing timer...
                                </div>
                              )}
                            </div>
                            <div className="d-flex gap-2 w-100">
                              <button className="btn btn-primary flex-fill" onClick={() => openRxModal(apt)}>
                                <i className="fas fa-prescription me-1"></i>Write Rx
                              </button>
                              <button className="btn btn-outline-warning flex-fill" onClick={() => openLabModal(apt)}>
                                <i className="fas fa-flask me-1"></i>Order Lab
                              </button>
                              <button className="btn btn-outline-primary flex-fill" onClick={() => openAdmitModal(apt)}>
                                <i className="fas fa-bed me-1"></i>Admit
                              </button>
                              <button className="btn btn-success flex-fill" onClick={() => handleComplete(apt.id)}>
                                <i className="fas fa-check-double me-1"></i>Complete
                              </button>
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ── List / table view ── */
          <div className="card border-0 shadow-sm">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead style={{ background: '#f8fafc' }}>
                  <tr>
                    <th className="ps-4 py-3 fw-semibold text-muted small">#</th>
                    <th className="py-3 fw-semibold text-muted small">Patient</th>
                    <th className="py-3 fw-semibold text-muted small">Status</th>
                    <th className="py-3 fw-semibold text-muted small">Time</th>
                    <th className="py-3 fw-semibold text-muted small">Wait / Timer</th>
                    <th className="py-3 fw-semibold text-muted small">Department</th>
                    <th className="py-3 fw-semibold text-muted small">Reason</th>
                    <th className="py-3 fw-semibold text-muted small">Priority</th>
                    <th className="pe-4 py-3 fw-semibold text-muted small">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAppointments.map((apt, index) => {
                    const sc = getStatusCard(apt.status);
                    const waitTime = apt.status === 'checked_in' ? getWaitTime(apt.checked_in_at) : null;
                    const remainingTime = getRemainingTime(apt);
                    return (
                      <tr key={apt.id} style={{ borderLeft: `3px solid ${sc.border}` }}>
                        <td className="ps-4 py-3">
                          <span className="badge rounded-circle d-inline-flex align-items-center justify-content-center"
                            style={{ width: 28, height: 28, background: sc.border, color: '#fff', fontSize: 12 }}>
                            {index + 1}
                          </span>
                        </td>
                        <td className="py-3">
                          <div className="d-flex align-items-center gap-2">
                            <div style={{
                              width: 36, height: 36, borderRadius: '50%',
                              background: 'linear-gradient(135deg, #667eea, #764ba2)',
                              color: '#fff', display: 'flex', alignItems: 'center',
                              justifyContent: 'center', fontSize: 13, fontWeight: 700, flexShrink: 0,
                            }}>
                              {apt.patient?.full_name?.split(' ').map(n => n[0]).join('').toUpperCase() || '?'}
                            </div>
                            <div>
                              <div className="fw-semibold small">{apt.patient?.full_name || 'Unknown'}</div>
                              <div className="text-muted" style={{ fontSize: 11 }}>
                                {apt.patient?.patient_id} · {apt.patient?.phone}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3">
                          <span className="badge rounded-pill" style={{
                            fontSize: 11, padding: '3px 9px',
                            background: sc.bg, color: sc.border, border: `1px solid ${sc.border}`,
                          }}>
                            <i className={`fas ${sc.icon} me-1`}></i>{sc.label}
                          </span>
                        </td>
                        <td className="py-3 small text-muted fw-semibold">
                          {formatTime(apt.scheduled_at)}
                        </td>
                        <td className="py-3 small">
                          {waitTime && (
                            <span className="text-warning">
                              <i className="fas fa-clock me-1"></i>{waitTime}
                            </span>
                          )}
                          {remainingTime && (
                            <span className={remainingTime.expired ? 'text-danger' : remainingTime.minutes === 0 ? 'text-warning' : 'text-success'}>
                              <i className={`fas ${remainingTime.expired ? 'fa-stop-circle' : 'fa-stopwatch'} me-1`}></i>
                              {remainingTime.expired ? "Time's up" : formatCountdown(remainingTime)}
                            </span>
                          )}
                          {!waitTime && !remainingTime && <span className="text-muted">—</span>}
                        </td>
                        <td className="py-3 small text-muted">{apt.department || '—'}</td>
                        <td className="py-3 small text-muted" style={{ maxWidth: 160 }}>
                          <span className="text-truncate d-block" title={apt.reason}>{apt.reason || '—'}</span>
                        </td>
                        <td className="py-3">
                          {apt.priority && apt.priority !== 'normal' ? (
                            <span className={`badge bg-${apt.priority === 'emergency' ? 'danger' : 'warning'} text-uppercase`} style={{ fontSize: 10 }}>
                              {apt.priority}
                            </span>
                          ) : (
                            <span className="text-muted small">Normal</span>
                          )}
                        </td>
                        <td className="pe-4 py-3">
                          <div className="d-flex gap-1">
                            {apt.status === 'scheduled' && (
                              <>
                                <button className="btn btn-sm btn-success" onClick={() => handleStartConsultation(apt.id)} title="Start">
                                  <i className="fas fa-play"></i>
                                </button>
                                <button className="btn btn-sm btn-outline-danger" onClick={() => handleCancel(apt.id)} title="Cancel">
                                  <i className="fas fa-times"></i>
                                </button>
                              </>
                            )}
                            {apt.status === 'checked_in' && (
                              <>
                                <button className="btn btn-sm btn-warning text-white" onClick={() => handleStartConsultation(apt.id)} title="See Patient">
                                  <i className="fas fa-user-md"></i>
                                </button>
                                <button className="btn btn-sm btn-outline-danger" onClick={() => handleCancel(apt.id)} title="Cancel">
                                  <i className="fas fa-times"></i>
                                </button>
                              </>
                            )}
                            {apt.status === 'in_consultation' && (
                              <>
                                <button className="btn btn-sm btn-primary" onClick={() => openRxModal(apt)} title="Write Prescription">
                                  <i className="fas fa-prescription"></i>
                                </button>
                                <button className="btn btn-sm btn-outline-warning" onClick={() => openLabModal(apt)} title="Order Lab Test">
                                  <i className="fas fa-flask"></i>
                                </button>
                                <button className="btn btn-sm btn-outline-primary" onClick={() => openAdmitModal(apt)} title="Admit Patient">
                                  <i className="fas fa-bed"></i>
                                </button>
                                <button className="btn btn-sm btn-success" onClick={() => handleComplete(apt.id)} title="Complete">
                                  <i className="fas fa-check-double"></i>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* ═════════════════ PRESCRIPTION MODAL ═════════════════ */}
      {rxModal && rxApt && (
        <div className="modal" style={{ display: 'block', background: 'rgba(0,0,0,0.4)' }} onClick={() => { if (!rxSaving) setRxModal(false); }}>
          <div className="modal-dialog modal-lg modal-dialog-scrollable" onClick={e => e.stopPropagation()}>
            <div className="modal-content" style={{ borderRadius: 16 }}>
              <div className="modal-header" style={{ background: 'linear-gradient(135deg,#4361ee,#7c3aed)', borderRadius: '16px 16px 0 0', border: 'none' }}>
                <h5 className="modal-title text-white">
                  <i className="fas fa-prescription me-2"></i>Write Prescription
                </h5>
                <button type="button" className="btn-close btn-close-white" onClick={() => setRxModal(false)} disabled={rxSaving}></button>
              </div>
              <div className="modal-body">
                {rxLoading && (
                  <div className="text-center py-4">
                    <div className="spinner-border text-primary" style={{ width: 32, height: 32 }}></div>
                    <p className="text-muted small mt-2">Loading existing prescription…</p>
                  </div>
                )}

                {!rxLoading && (
                  <>
                    {/* Patient strip */}
                    <div className="d-flex align-items-center gap-2 mb-3 p-2" style={{ background: '#f8fafc', borderRadius: 10 }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#e0e7ff', color: '#4361ee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700 }}>
                        {(rxApt.patient?.full_name || 'P').charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="fw-bold" style={{ fontSize: 13 }}>{rxApt.patient?.full_name || 'Patient'}</div>
                        <div className="text-muted small">{rxApt.hospital} · {rxApt.department || '—'}</div>
                      </div>
                    </div>

                    {/* Drug autocomplete */}
                    <div className="mb-3 position-relative">
                      <label className="form-label small fw-bold">Search Drug from Inventory</label>
                      <div className="input-group input-group-sm">
                        <span className="input-group-text"><i className="fas fa-search text-muted"></i></span>
                        <input
                          type="text"
                          className="form-control form-control-sm"
                          placeholder="Type at least 2 letters…"
                          value={rxDrugSearch}
                          onChange={e => searchDrugs(e.target.value)}
                        />
                      </div>
                      {rxDrugResults.length > 0 && (
                        <div className="position-absolute w-100 mt-1 shadow-sm" style={{ zIndex: 1000, background: '#fff', border: '1px solid #e2e8f0', borderRadius: 8, maxHeight: 200, overflowY: 'auto' }}>
                          {rxDrugResults.map(d => (
                            <button key={d.id} className="d-block w-100 text-start border-0 px-3 py-2 small"
                              style={{ background: 'none', cursor: 'pointer', borderBottom: '1px solid #f1f5f9' }}
                              onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
                              onMouseLeave={e => e.currentTarget.style.background = 'none'}
                              onClick={() => { if (rxItems.length > 0) selectDrug(rxItems.length - 1, d); else { addRxItem(); setTimeout(() => selectDrug(0, d), 0); } }}>
                              <strong style={{ color: '#1e293b', fontSize: 12 }}>{d.drug_name} {d.strength}</strong>
                              <span className="text-muted ms-2" style={{ fontSize: 11 }}>{d.dosage_form} · Stock: {d.quantity_in_stock} {d.unit}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Items table */}
                    <div className="mb-3">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <label className="form-label small fw-bold mb-0">Prescription Items</label>
                        <button className="btn btn-sm btn-outline-primary" onClick={addRxItem}>
                          <i className="fas fa-plus me-1"></i>Add Drug
                        </button>
                      </div>
                      {rxItems.map((item, idx) => (
                        <div key={idx} className="p-2 mb-2" style={{ background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <span className="badge bg-secondary" style={{ fontSize: 10 }}>#{idx + 1}</span>
                            <button className="btn btn-sm btn-outline-danger" style={{ padding: '2px 6px', fontSize: 11 }} onClick={() => removeRxItem(idx)} disabled={rxItems.length === 1}>
                              <i className="fas fa-trash"></i>
                            </button>
                          </div>
                          <div className="row g-2">
                            <div className="col-md-4">
                              <input className="form-control form-control-sm" placeholder="Drug name" value={item.drug_name}
                                onChange={e => updateRxItem(idx, 'drug_name', e.target.value)} />
                            </div>
                            <div className="col-md-2">
                              <input className="form-control form-control-sm" placeholder="Strength" value={item.strength}
                                onChange={e => updateRxItem(idx, 'strength', e.target.value)} />
                            </div>
                            <div className="col-md-2">
                              <input className="form-control form-control-sm" placeholder="Form" value={item.dosage_form}
                                onChange={e => updateRxItem(idx, 'dosage_form', e.target.value)} />
                            </div>
                            <div className="col-md-2">
                              <input className="form-control form-control-sm" placeholder="Dose" value={item.dose}
                                onChange={e => updateRxItem(idx, 'dose', e.target.value)} />
                            </div>
                            <div className="col-md-2">
                              <input className="form-control form-control-sm" placeholder="Qty" type="number" min="1" value={item.quantity}
                                onChange={e => updateRxItem(idx, 'quantity', parseInt(e.target.value) || 1)} />
                            </div>
                            <div className="col-md-3">
                              <select className="form-select form-select-sm" value={item.route}
                                onChange={e => updateRxItem(idx, 'route', e.target.value)}>
                                <option value="oral">Oral</option>
                                <option value="iv">IV</option>
                                <option value="im">IM</option>
                                <option value="sc">SC</option>
                                <option value="topical">Topical</option>
                                <option value="inhalation">Inhalation</option>
                                <option value="rectal">Rectal</option>
                                <option value="sublingual">Sublingual</option>
                                <option value="ophthalmic">Ophthalmic</option>
                                <option value="otic">Otic</option>
                                <option value="nasal">Nasal</option>
                                <option value="other">Other</option>
                              </select>
                            </div>
                            <div className="col-md-3">
                              <select className="form-select form-select-sm" value={item.frequency}
                                onChange={e => updateRxItem(idx, 'frequency', e.target.value)}>
                                <option value="once">Stat</option>
                                <option value="od">OD (Once daily)</option>
                                <option value="bd">BD (Twice daily)</option>
                                <option value="tds">TDS (3x daily)</option>
                                <option value="qid">QID (4x daily)</option>
                                <option value="nocte">Nocte</option>
                                <option value="prn">PRN (As needed)</option>
                                <option value="weekly">Weekly</option>
                                <option value="other">Other</option>
                              </select>
                            </div>
                            <div className="col-md-3">
                              <input className="form-control form-control-sm" placeholder="Duration (days)" type="number" min="1"
                                value={item.duration_days} onChange={e => updateRxItem(idx, 'duration_days', e.target.value)} />
                            </div>
                            <div className="col-md-3">
                              <input className="form-control form-control-sm" placeholder="Instructions" value={item.instructions}
                                onChange={e => updateRxItem(idx, 'instructions', e.target.value)} />
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Notes */}
                    <div className="mb-2">
                      <label className="form-label small fw-bold">General Notes / Counselling</label>
                      <textarea className="form-control form-control-sm" rows={2} value={rxNotes}
                        onChange={e => setRxNotes(e.target.value)} placeholder="e.g. Take with food, avoid alcohol…" />
                    </div>
                  </>
                )}
              </div>
              <div className="modal-footer" style={{ borderRadius: '0 0 16px 16px', border: 'none' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setRxModal(false)} disabled={rxSaving}>
                  Cancel
                </button>
                <button className="btn btn-outline-secondary btn-sm" onClick={printPrescription} disabled={rxSaving || rxLoading}>
                  <i className="fas fa-print me-1"></i>Print
                </button>
                <button className="btn btn-primary btn-sm" onClick={saveRx} disabled={rxSaving}>
                  {rxSaving ? <><span className="spinner-border spinner-border-sm me-1" style={{ width: 14, height: 14 }}></span>Saving…</> : <><i className="fas fa-save me-1"></i>Save Prescription</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Admit Modal ── */}
      {admitModal && (
        <div className="modal" style={{ display: 'block', background: 'rgba(0,0,0,0.4)' }} onClick={() => setAdmitModal(false)}>
          <div className="modal-dialog modal-dialog-scrollable" onClick={e => e.stopPropagation()}>
            <div className="modal-content" style={{ borderRadius: 16 }}>
              <div className="modal-header" style={{ background: 'linear-gradient(135deg,#4361ee,#7c3aed)', borderRadius: '16px 16px 0 0', border: 'none' }}>
                <h5 className="modal-title text-white"><i className="fas fa-bed me-2"></i>Admit Patient</h5>
                <button className="btn-close btn-close-white" onClick={() => setAdmitModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3 p-2" style={{ background: '#f8fafc', borderRadius: 10 }}>
                  <div className="fw-bold small">{admitApt?.patient_name}</div>
                  <div className="text-muted small">Visit #{admitApt?.visit_id}</div>
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-bold">Ward</label>
                  <select className="form-select form-select-sm" value={admitWard}
                    onChange={e => { const w = e.target.value; setAdmitWard(w); setAdmitBed(''); fetchAvailBeds(w); }}>
                    <option value="">— Select Ward —</option>
                    {wards.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-bold">Bed</label>
                  <select className="form-select form-select-sm" value={admitBed}
                    onChange={e => setAdmitBed(e.target.value)}>
                    <option value="">— Select Bed —</option>
                    {availBeds.map(b => <option key={b.id} value={b.id}>{b.bed_number} ({b.bed_type_display})</option>)}
                  </select>
                  {admitWard && availBeds.length === 0 && (
                    <div className="text-danger small mt-1"><i className="fas fa-exclamation-circle me-1"></i>No available beds.</div>
                  )}
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-bold">Admission Notes</label>
                  <textarea className="form-control form-control-sm" rows={2} value={admitNotes}
                    onChange={e => setAdmitNotes(e.target.value)} placeholder="Reason for admission…" />
                </div>
              </div>
              <div className="modal-footer" style={{ borderRadius: '0 0 16px 16px', border: 'none' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setAdmitModal(false)} disabled={admitSaving}>Cancel</button>
                <button className="btn btn-primary btn-sm" onClick={doAdmit} disabled={admitSaving}>
                  {admitSaving ? <><span className="spinner-border spinner-border-sm me-1" style={{ width: 14, height: 14 }}></span>Admitting…</> : <><i className="fas fa-save me-1"></i>Admit</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── Lab Order Modal ── */}
      {labModal && (
        <div className="modal" style={{ display: 'block', background: 'rgba(0,0,0,0.4)' }} onClick={() => setLabModal(false)}>
          <div className="modal-dialog modal-dialog-scrollable" onClick={e => e.stopPropagation()}>
            <div className="modal-content" style={{ borderRadius: 16 }}>
              <div className="modal-header" style={{ background: 'linear-gradient(135deg,#f59e0b,#f97316)', borderRadius: '16px 16px 0 0', border: 'none' }}>
                <h5 className="modal-title text-white"><i className="fas fa-flask me-2"></i>Order Lab Test</h5>
                <button className="btn-close btn-close-white" onClick={() => setLabModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="mb-3 p-2" style={{ background: '#f8fafc', borderRadius: 10 }}>
                  <div className="fw-bold small">{labApt?.patient_name}</div>
                  <div className="text-muted small">Visit #{labApt?.visit_id}</div>
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-bold">Test Name</label>
                  <input className="form-control form-control-sm" placeholder="e.g. Full Blood Count, LFT, Creatinine…" value={labForm.test_name}
                    onChange={e => setLabForm(p => ({ ...p, test_name: e.target.value }))} />
                </div>
                <div className="row g-2 mb-3">
                  <div className="col-md-4">
                    <label className="form-label small fw-bold">Category</label>
                    <select className="form-select form-select-sm" value={labForm.test_category}
                      onChange={e => setLabForm(p => ({ ...p, test_category: e.target.value }))}>
                      <option value="haematology">Haematology</option>
                      <option value="biochemistry">Biochemistry</option>
                      <option value="microbiology">Microbiology</option>
                      <option value="serology">Serology</option>
                      <option value="urinalysis">Urinalysis</option>
                      <option value="parasitology">Parasitology</option>
                      <option value="histopathology">Histopathology</option>
                      <option value="radiology">Radiology</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small fw-bold">Priority</label>
                    <select className="form-select form-select-sm" value={labForm.priority}
                      onChange={e => setLabForm(p => ({ ...p, priority: e.target.value }))}>
                      <option value="routine">Routine</option>
                      <option value="urgent">Urgent</option>
                      <option value="stat">STAT</option>
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label small fw-bold">Sample</label>
                    <select className="form-select form-select-sm" value={labForm.sample_type}
                      onChange={e => setLabForm(p => ({ ...p, sample_type: e.target.value }))}>
                      <option value="blood">Blood (Venous)</option>
                      <option value="blood_capillary">Blood (Capillary)</option>
                      <option value="urine">Urine</option>
                      <option value="stool">Stool</option>
                      <option value="sputum">Sputum</option>
                      <option value="swab">Swab</option>
                      <option value="csf">CSF</option>
                      <option value="tissue">Tissue Biopsy</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                </div>
                <div className="mb-3">
                  <label className="form-label small fw-bold">Clinical Info</label>
                  <textarea className="form-control form-control-sm" rows={2} value={labForm.clinical_info}
                    onChange={e => setLabForm(p => ({ ...p, clinical_info: e.target.value }))}
                    placeholder="Indication, relevant history…" />
                </div>

                {labTests.length > 0 && (
                  <div className="mt-3">
                    <h6 className="small fw-bold text-muted mb-2"><i className="fas fa-list me-1"></i>Tests for this visit</h6>
                    <div className="table-responsive">
                      <table className="table table-sm mb-0">
                        <thead style={{ background: '#f8fafc' }}>
                          <tr><th className="small text-muted">Test</th><th className="small text-muted">Status</th><th className="small text-muted">Result</th></tr>
                        </thead>
                        <tbody>
                          {labTests.map(t => (
                            <tr key={t.id}>
                              <td className="small">{t.test_name} <span className="text-muted">({t.test_category_display})</span></td>
                              <td className="small"><span className="badge" style={{ fontSize: 9, background: t.status === 'completed' ? '#d1fae5' : '#fef3c7', color: t.status === 'completed' ? '#065f46' : '#92400e' }}>{t.status_display}</span></td>
                              <td className="small">{t.status === 'completed' ? <strong>{t.result_value}</strong> : <span className="text-muted">—</span>}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
              <div className="modal-footer" style={{ borderRadius: '0 0 16px 16px', border: 'none' }}>
                <button className="btn btn-secondary btn-sm" onClick={() => setLabModal(false)} disabled={labSaving}>Cancel</button>
                <button className="btn btn-warning btn-sm text-white" onClick={doOrderLab} disabled={labSaving}>
                  {labSaving ? <><span className="spinner-border spinner-border-sm me-1" style={{ width: 14, height: 14 }}></span>Ordering…</> : <><i className="fas fa-plus me-1"></i>Order Test</>}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}

export default DoctorQueue;

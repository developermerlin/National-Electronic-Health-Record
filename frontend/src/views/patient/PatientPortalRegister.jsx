import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';

const API = import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1';

export default function PatientPortalRegister() {
  const navigate = useNavigate();
  const [hospitals, setHospitals] = useState([]);
  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [error, setError]   = useState('');
  const [form, setForm] = useState({
    full_name: '', email: '', phone: '',
    date_of_birth: '', gender: '', hospital_id: '',
    password: '', password2: '',
  });

  useEffect(() => {
    axios.get(`${API}/portal/hospitals/`)
      .then(r => setHospitals(r.data))
      .catch(() => {});
  }, []);

  const set = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const step1Valid = form.full_name && form.email && form.phone && form.date_of_birth && form.gender && form.hospital_id;
  const step2Valid = form.password && form.password2;

  const handleSubmit = async () => {
    setError('');
    if (form.password !== form.password2) { setError('Passwords do not match.'); return; }
    if (form.password.length < 8)         { setError('Password must be at least 8 characters.'); return; }
    setSaving(true);
    try {
      await axios.post(`${API}/portal/register/`, form);
      navigate('/login', { state: { message: 'Account created! Please log in.' } });
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally { setSaving(false); }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      <div style={{ width: '100%', maxWidth: '520px' }}>

        {/* Logo / Brand */}
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ width: '56px', height: '56px', borderRadius: '16px', background: 'linear-gradient(135deg, #4361ee, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <i className="fas fa-heartbeat" style={{ color: '#fff', fontSize: '22px' }}></i>
          </div>
          <h2 style={{ color: '#fff', fontWeight: 700, margin: 0, fontSize: '24px' }}>Patient Portal</h2>
          <p style={{ color: '#94a3b8', margin: '6px 0 0', fontSize: '14px' }}>National Electronic Health Record</p>
        </div>

        <div style={{ background: '#fff', borderRadius: '20px', padding: '36px', boxShadow: '0 24px 64px rgba(0,0,0,0.4)' }}>

          {/* Step indicator */}
          <div style={{ display: 'flex', alignItems: 'center', marginBottom: '28px', gap: '8px' }}>
            {[1, 2].map((n, i) => (
              <div key={n} style={{ display: 'flex', alignItems: 'center', flex: n === 1 ? 1 : 'none' }}>
                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: step >= n ? '#4361ee' : '#e9ecef', color: step >= n ? '#fff' : '#6c757d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700, flexShrink: 0 }}>{n}</div>
                {i === 0 && <div style={{ flex: 1, height: '2px', background: step >= 2 ? '#4361ee' : '#e9ecef', margin: '0 8px' }}></div>}
              </div>
            ))}
            <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: step >= 2 ? '#4361ee' : '#e9ecef', color: step >= 2 ? '#fff' : '#6c757d', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '13px', fontWeight: 700 }}>2</div>
          </div>

          <h5 style={{ fontWeight: 700, marginBottom: '6px', color: '#1e293b' }}>
            {step === 1 ? 'Personal Information' : 'Create Password'}
          </h5>
          <p style={{ color: '#64748b', fontSize: '13px', marginBottom: '24px' }}>
            {step === 1 ? 'Tell us about yourself and choose your hospital.' : 'Set a secure password for your account.'}
          </p>

          {error && (
            <div className="alert alert-danger py-2 mb-3" style={{ fontSize: '13px' }}>
              <i className="fas fa-exclamation-circle me-2"></i>{error}
            </div>
          )}

          {step === 1 && (
            <div className="row g-3">
              <div className="col-12">
                <label className="form-label">Full Name <span className="text-danger">*</span></label>
                <input className="form-control" placeholder="e.g. Mariatu Sesay" value={form.full_name} onChange={set('full_name')} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Email Address <span className="text-danger">*</span></label>
                <input type="email" className="form-control" placeholder="you@example.com" value={form.email} onChange={set('email')} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Phone Number <span className="text-danger">*</span></label>
                <input type="tel" className="form-control" placeholder="+232..." value={form.phone} onChange={set('phone')} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Date of Birth <span className="text-danger">*</span></label>
                <input type="date" className="form-control" value={form.date_of_birth} onChange={set('date_of_birth')} max={new Date().toISOString().split('T')[0]} />
              </div>
              <div className="col-md-6">
                <label className="form-label">Gender <span className="text-danger">*</span></label>
                <select className="form-select" value={form.gender} onChange={set('gender')}>
                  <option value="">Select gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div className="col-12">
                <label className="form-label">Select Your Hospital <span className="text-danger">*</span></label>
                <select className="form-select" value={form.hospital_id} onChange={set('hospital_id')}>
                  <option value="">Choose hospital...</option>
                  {hospitals.map(h => (
                    <option key={h.id} value={h.id}>{h.name}{h.town_city ? ` — ${h.town_city}` : ''}</option>
                  ))}
                </select>
              </div>
              <div className="col-12 mt-1">
                <button className="btn btn-primary w-100" onClick={() => step1Valid ? setStep(2) : setError('Please fill in all fields.')} style={{ borderRadius: '10px', padding: '12px', fontWeight: 600 }}>
                  Continue <i className="fas fa-arrow-right ms-2"></i>
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="row g-3">
              <div className="col-12">
                <label className="form-label">Password <span className="text-danger">*</span></label>
                <input type="password" className="form-control" placeholder="Min. 8 characters" value={form.password} onChange={set('password')} />
              </div>
              <div className="col-12">
                <label className="form-label">Confirm Password <span className="text-danger">*</span></label>
                <input type="password" className="form-control" placeholder="Repeat password" value={form.password2} onChange={set('password2')} />
              </div>
              <div className="col-12 d-flex gap-2 mt-1">
                <button className="btn btn-outline-secondary" onClick={() => { setStep(1); setError(''); }} style={{ borderRadius: '10px', padding: '12px 20px' }}>
                  <i className="fas fa-arrow-left me-1"></i> Back
                </button>
                <button className="btn btn-success flex-fill" onClick={handleSubmit} disabled={saving || !step2Valid} style={{ borderRadius: '10px', padding: '12px', fontWeight: 600 }}>
                  {saving ? <><span className="spinner-border spinner-border-sm me-2"></span>Creating account...</> : <><i className="fas fa-check-circle me-2"></i>Create Account</>}
                </button>
              </div>
            </div>
          )}

          <hr style={{ margin: '24px 0' }} />
          <p style={{ textAlign: 'center', fontSize: '13px', color: '#64748b', margin: 0 }}>
            Already have an account?{' '}
            <Link to="/login" style={{ color: '#4361ee', fontWeight: 600, textDecoration: 'none' }}>Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}

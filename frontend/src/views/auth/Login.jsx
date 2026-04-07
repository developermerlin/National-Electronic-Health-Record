import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

function Login() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState('');
  const [passwordStrength, setPasswordStrength] = useState({ level: '', score: 0 });
  
  const { login } = useAuth();
  const navigate = useNavigate();

  const validateEmail = (email) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) return 'Email is required';
    if (!emailRegex.test(email)) return 'Please enter a valid email address';
    return '';
  };

  const calculatePasswordStrength = (password) => {
    let score = 0;
    const checks = {
      length: password.length >= 8,
      uppercase: /[A-Z]/.test(password),
      lowercase: /[a-z]/.test(password),
      numbers: /[0-9]/.test(password),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(password)
    };

    if (checks.length) score += 20;
    if (checks.uppercase) score += 20;
    if (checks.lowercase) score += 20;
    if (checks.numbers) score += 20;
    if (checks.special) score += 20;

    let level = '';
    if (score === 0) level = '';
    else if (score <= 40) level = 'weak';
    else if (score <= 80) level = 'medium';
    else level = 'strong';

    return { level, score, checks };
  };

  const validatePassword = (password) => {
    if (!password) return 'Password is required';
    
    const strength = calculatePasswordStrength(password);
    setPasswordStrength(strength);

    const errors = [];
    if (password.length < 8) errors.push('at least 8 characters');
    if (!/[A-Z]/.test(password)) errors.push('one uppercase letter');
    if (!/[a-z]/.test(password)) errors.push('one lowercase letter');
    if (!/[0-9]/.test(password)) errors.push('one number');
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.push('one special character');

    if (errors.length > 0) {
      return `Password must contain ${errors.join(', ')}`;
    }
    
    return '';
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const fieldValue = type === 'checkbox' ? checked : value;
    
    setFormData(prev => ({
      ...prev,
      [name]: fieldValue
    }));

    if (serverError) setServerError('');

    if (touched[name]) {
      validateField(name, fieldValue);
    }
  };

  const handleBlur = (e) => {
    const { name, value } = e.target;
    setTouched(prev => ({
      ...prev,
      [name]: true
    }));
    validateField(name, value);
  };

  const validateField = (name, value) => {
    let error = '';
    
    if (name === 'email') {
      error = validateEmail(value);
    } else if (name === 'password') {
      error = validatePassword(value);
    }

    setErrors(prev => ({
      ...prev,
      [name]: error
    }));

    return error;
  };

  const validateForm = () => {
    const emailError = validateEmail(formData.email);
    const passwordError = validatePassword(formData.password);

    setErrors({
      email: emailError,
      password: passwordError
    });

    setTouched({
      email: true,
      password: true
    });

    return !emailError && !passwordError;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setServerError('');

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      const result = await login(formData.email, formData.password);
      
      if (result.success) {
        const userRole = result.user.role;
        
        if (userRole === 'admin') {
          navigate('/admin/dashboard');
        } else if (userRole === 'ministry_admin') {
          navigate('/ministry/dashboard');
        } else if (userRole === 'district_admin') {
          navigate('/admin/districts');
        } else if (userRole === 'hospital_admin') {
          navigate('/admin/hospitals');
        } else if (userRole === 'doctor') {
          navigate('/doctor/dashboard');
        } else if (userRole === 'nurse') {
          navigate('/nurse/dashboard');
        } else if (userRole === 'receptionist') {
          navigate('/receptionist/dashboard');
        } else if (userRole === 'lab_technician') {
          navigate('/lab/dashboard');
        } else if (userRole === 'pharmacist') {
          navigate('/pharmacy/dashboard');
        } else if (userRole === 'patient') {
          navigate('/patient/dashboard');
        } else {
          navigate('/');
        }
      } else {
        const errorMsg = result.error || '';
        if (errorMsg.toLowerCase().includes('no active account') || errorMsg.toLowerCase().includes('not found')) {
          setServerError('Your account is not yet activated. Please contact your system administrator to enable login access.');
        } else {
          setServerError(errorMsg || 'Login failed. Please check your credentials.');
        }
      }
    } catch {
      setServerError('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page-wrapper" style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    }}>
      {/* Header */}
      <div style={{
        padding: '15px 20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <Link to="/" className="text-decoration-none text-white d-flex align-items-center">
          <i className="fas fa-arrow-left me-2"></i>
          <span style={{fontSize: '1rem', fontWeight: 500}}>Back to Home</span>
        </Link>
        <div className="text-white" style={{fontSize: '1rem', fontWeight: 600}}>
          <i className="fas fa-heartbeat me-2"></i>
          HealthInfo
        </div>
      </div>

      {/* Main Content */}
      <div style={{
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        padding: '10px 20px',
      }}>
      <div className="container">
        <div className="row justify-content-center">
          <div className="col-lg-5 col-md-8 col-sm-11">
            {/* Logo and Branding */}
            <div className="text-center mb-2">
              <Link to="/" className="text-decoration-none">
                <div className="login-logo mb-1">
                  <i className="fas fa-heartbeat" style={{fontSize: '32px', color: '#fff'}}></i>
                </div>
                <h3 className="text-white mb-0" style={{fontWeight: 600, fontSize: '1rem'}}>HealthInfo</h3>
              </Link>
              <h2 className="mt-2 mb-0" style={{fontWeight: 700, color: '#fff', fontSize: '1.4rem'}}>Welcome Back</h2>
              <p className="text-white-50 mb-0" style={{fontSize: '0.8rem'}}>Sign in to National EHR</p>
            </div>

            {/* Login Form Card */}
            <div className="auth-box card shadow-lg border-0">
              <div className="card-body px-3 py-2" style={{fontSize: '0.85rem'}}>
                <form onSubmit={handleSubmit} noValidate>
                  {serverError && (
                    <div className="alert alert-danger d-flex align-items-center mb-2 py-2" role="alert" style={{fontSize: '0.875rem'}}>
                      <i className="fas fa-exclamation-circle me-2"></i>
                      <div>{serverError}</div>
                    </div>
                  )}

                  {/* Email Input */}
                  <div className="mb-2">
                    <label htmlFor="email" className="form-label fw-semibold mb-1" style={{fontSize: '0.8rem'}}>
                      <i className="fas fa-envelope me-1 text-primary"></i>Email Address
                    </label>
                    <div className="input-group" style={{border: '2px solid #dee2e6', borderRadius: '8px', overflow: 'hidden'}}>
                      <span className="input-group-text bg-light border-0" style={{borderRight: '1px solid #e9ecef'}}>
                        <i className="fas fa-at text-muted"></i>
                      </span>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        className="form-control border-0 ps-2"
                        style={{boxShadow: 'none'}}
                        placeholder="Enter your email"
                        value={formData.email}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        autoComplete="email"
                      />
                    </div>
                    {touched.email && errors.email && (
                      <div className="text-danger mt-2" style={{fontSize: '0.875rem'}}>
                        <i className="fas fa-times-circle me-1"></i>{errors.email}
                      </div>
                    )}
                    {touched.email && !errors.email && formData.email && (
                      <div className="text-success mt-2" style={{fontSize: '0.875rem'}}>
                        <i className="fas fa-check-circle me-1"></i>Looks good!
                      </div>
                    )}
                  </div>

                  {/* Password Input */}
                  <div className="mb-2">
                    <label htmlFor="password" className="form-label fw-semibold mb-1" style={{fontSize: '0.8rem'}}>
                      <i className="fas fa-lock me-1 text-primary"></i>Password
                    </label>
                    <div className="input-group" style={{border: '2px solid #dee2e6', borderRadius: '8px', overflow: 'hidden'}}>
                      <span className="input-group-text bg-light border-0" style={{borderRight: '1px solid #e9ecef'}}>
                        <i className="fas fa-key text-muted"></i>
                      </span>
                      <input
                        type={showPassword ? 'text' : 'password'}
                        id="password"
                        name="password"
                        className="form-control border-0 ps-2"
                        style={{boxShadow: 'none'}}
                        placeholder="Enter your password"
                        value={formData.password}
                        onChange={handleChange}
                        onBlur={handleBlur}
                        autoComplete="current-password"
                      />
                      <button
                        type="button"
                        className="btn btn-link border-0 text-secondary"
                        onClick={() => setShowPassword(!showPassword)}
                        tabIndex="-1"
                        style={{borderLeft: '1px solid #e9ecef'}}
                      >
                        <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                      </button>
                    </div>

                    {/* Password Strength Indicator */}
                    <div className="mt-1">
                      <div className="d-flex justify-content-between align-items-center mb-1">
                        <small className="text-muted" style={{fontSize: '0.75rem'}}>Password Strength:</small>
                        <small className={`fw-bold ${
                          passwordStrength.level === 'weak' ? 'text-danger' :
                          passwordStrength.level === 'medium' ? 'text-warning' :
                          passwordStrength.level === 'strong' ? 'text-success' : 'text-muted'
                        }`} style={{fontSize: '0.75rem'}}>
                          {passwordStrength.level === 'weak' && <><i className="fas fa-exclamation-triangle me-1"></i>Weak</>}
                          {passwordStrength.level === 'medium' && <><i className="fas fa-shield-alt me-1"></i>Medium</>}
                          {passwordStrength.level === 'strong' && <><i className="fas fa-check-shield me-1"></i>Strong</>}
                          {!passwordStrength.level && <>-</>}
                        </small>
                      </div>
                      <div className="progress" style={{height: '4px', borderRadius: '2px'}}>
                        <div
                          className={`progress-bar ${
                            passwordStrength.level === 'weak' ? 'bg-danger' :
                            passwordStrength.level === 'medium' ? 'bg-warning' :
                            passwordStrength.level === 'strong' ? 'bg-success' : 'bg-secondary'
                          }`}
                          role="progressbar"
                          style={{width: `${passwordStrength.score}%`, transition: 'width 0.3s ease'}}
                        ></div>
                      </div>
                    </div>

                    {/* Validation Feedback */}
                    {touched.password && errors.password && (
                      <div className="text-danger mt-2" style={{fontSize: '0.875rem'}}>
                        <i className="fas fa-times-circle me-1"></i>{errors.password}
                      </div>
                    )}
                    {touched.password && !errors.password && formData.password && (
                      <div className="text-success mt-2" style={{fontSize: '0.875rem'}}>
                        <i className="fas fa-check-circle me-1"></i>Excellent! Your password meets all requirements
                      </div>
                    )}

                    {/* Password Requirements Checklist */}
                    <div className="mt-1">
                      <small className="text-muted d-block mb-1" style={{fontSize: '0.75rem'}}>
                        <i className="fas fa-info-circle me-1"></i>Password must contain:
                      </small>
                      <div className="ps-2" style={{lineHeight: '1.4'}}>
                        <small className={`d-block ${formData.password && formData.password.length >= 8 ? 'text-success' : 'text-muted'}`} style={{fontSize: '0.75rem'}}>
                          <i className={`fas ${formData.password && formData.password.length >= 8 ? 'fa-check-circle' : 'fa-circle'} me-1`} style={{fontSize: '0.65rem'}}></i>
                          At least 8 characters
                        </small>
                        <small className={`d-block ${formData.password && /[A-Z]/.test(formData.password) ? 'text-success' : 'text-muted'}`} style={{fontSize: '0.75rem'}}>
                          <i className={`fas ${formData.password && /[A-Z]/.test(formData.password) ? 'fa-check-circle' : 'fa-circle'} me-1`} style={{fontSize: '0.65rem'}}></i>
                          One uppercase letter (A-Z)
                        </small>
                        <small className={`d-block ${formData.password && /[a-z]/.test(formData.password) ? 'text-success' : 'text-muted'}`} style={{fontSize: '0.75rem'}}>
                          <i className={`fas ${formData.password && /[a-z]/.test(formData.password) ? 'fa-check-circle' : 'fa-circle'} me-1`} style={{fontSize: '0.65rem'}}></i>
                          One lowercase letter (a-z)
                        </small>
                        <small className={`d-block ${formData.password && /[0-9]/.test(formData.password) ? 'text-success' : 'text-muted'}`} style={{fontSize: '0.75rem'}}>
                          <i className={`fas ${formData.password && /[0-9]/.test(formData.password) ? 'fa-check-circle' : 'fa-circle'} me-1`} style={{fontSize: '0.65rem'}}></i>
                          One number (0-9)
                        </small>
                        <small className={`d-block ${formData.password && /[!@#$%^&*(),.?":{}|<>]/.test(formData.password) ? 'text-success' : 'text-muted'}`} style={{fontSize: '0.75rem'}}>
                          <i className={`fas ${formData.password && /[!@#$%^&*(),.?":{}|<>]/.test(formData.password) ? 'fa-check-circle' : 'fa-circle'} me-1`} style={{fontSize: '0.65rem'}}></i>
                          One special character (!@#$%^&*)
                        </small>
                      </div>
                    </div>
                  </div>

                  {/* Remember Me & Forgot Password */}
                  <div className="d-flex justify-content-between align-items-center mb-2">
                    <div className="form-check">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        id="rememberMe"
                        name="rememberMe"
                        checked={formData.rememberMe}
                        onChange={handleChange}
                      />
                      <label className="form-check-label" htmlFor="rememberMe" style={{fontSize: '0.8rem'}}>
                        Remember me
                      </label>
                    </div>
                    <Link to="/forgot-password" className="text-primary text-decoration-none" style={{fontSize: '0.8rem'}}>
                      <i className="fas fa-question-circle me-1"></i>Forgot Password?
                    </Link>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    className="btn btn-primary w-100 py-2 fw-semibold mb-2"
                    disabled={loading || (touched.email && errors.email) || (touched.password && errors.password)}
                    style={{fontSize: '16px'}}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Signing in...
                      </>
                    ) : (
                      <>
                        <i className="fas fa-sign-in-alt me-2"></i>
                        Sign In
                      </>
                    )}
                  </button>

                </form>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center mt-2">
              <small className="text-white-50" style={{fontSize: '0.7rem'}}>
                <i className="fas fa-shield-alt me-1"></i>
                Secure connection | &copy; {new Date().getFullYear()} HealthInfo
              </small>
            </div>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
}

export default Login;

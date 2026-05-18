import React, { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import showToast from '../../utils/toast';
import { useGoogleLogin } from '@react-oauth/google';

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
  
  const { login, socialLogin } = useAuth();
  const navigate = useNavigate();
  const [socialLoading, setSocialLoading] = useState('');

  const navigateByRole = useCallback((role) => {
    const routes = {
      admin: '/admin/dashboard',
      ministry_admin: '/ministry/dashboard',
      district_admin: '/admin/districts',
      hospital_admin: '/hospital-admin/dashboard',
      doctor: '/doctor/dashboard',
      nurse: '/nurse/dashboard',
      receptionist: '/receptionist/dashboard',
      triage: '/triage',
      lab_technician: '/lab/dashboard',
      pharmacist: '/pharmacy/dashboard',
      patient: '/patient/dashboard',
    };
    navigate(routes[role] || '/');
  }, [navigate]);

  const handleSocialLogin = useCallback(async (provider, accessToken) => {
    setSocialLoading(provider);
    setServerError('');
    try {
      const result = await socialLogin(provider, accessToken);
      if (result.success) {
        showToast.success(`Signed in with ${provider}!`);
        navigateByRole(result.user.role);
      } else {
        setServerError(result.error || `${provider} login failed`);
      }
    } catch {
      setServerError('An error occurred. Please try again.');
    } finally {
      setSocialLoading('');
    }
  }, [socialLogin, navigateByRole]);

  const googleLogin = useGoogleLogin({
    onSuccess: (tokenResponse) => {
      handleSocialLogin('google', tokenResponse.access_token);
    },
    onError: () => {
      showToast.error('Google sign-in was cancelled or failed.');
    },
  });

  const handleFacebookLogin = () => {
    if (!window.FB) {
      showToast.info('Facebook SDK is loading. Please try again in a moment.');
      return;
    }
    window.FB.login((response) => {
      if (response.authResponse) {
        handleSocialLogin('facebook', response.authResponse.accessToken);
      } else {
        showToast.error('Facebook sign-in was cancelled.');
      }
    }, { scope: 'email,public_profile' });
  };

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

    if (name === 'password') {
      setPasswordStrength(calculatePasswordStrength(fieldValue));
    }

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
          navigate('/hospital-admin/dashboard');
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
    <div style={{
      height: '100vh',
      display: 'flex',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #6B73C7 100%)',
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      overflow: 'hidden'
    }}>

      {/* Left Panel - Image Side */}
      <div style={{
        flex: '1 1 50%',
        position: 'relative',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        height: '100vh',
      }} className="d-none d-lg-flex">
        {/* Doctor Image */}
        <img
          src="/assets/img/doctor-login.jpg"
          alt="African Doctor"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            objectPosition: 'center 15%',
            transform: 'scale(1.15)',
          }}
        />
        {/* Gradient Overlay */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          background: 'linear-gradient(to top, rgba(102,126,234,0.92) 0%, rgba(118,75,162,0.6) 40%, rgba(0,0,0,0.15) 100%)',
        }}></div>

        {/* Brand Logo */}
        <div style={{
          position: 'absolute',
          top: '30px',
          left: '30px',
          zIndex: 2,
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'rgba(255,255,255,0.2)',
            backdropFilter: 'blur(10px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <i className="fas fa-heartbeat" style={{fontSize: '20px', color: '#fff'}}></i>
          </div>
          <span style={{color: '#fff', fontWeight: 700, fontSize: '1rem', letterSpacing: '-0.3px'}}>
            National Patient Health Record
          </span>
        </div>

        {/* Bottom Text Overlay */}
        <div style={{position: 'relative', zIndex: 2, padding: '40px 35px'}}>
          <h1 style={{
            color: '#fff',
            fontWeight: 800,
            fontSize: '2.4rem',
            lineHeight: 1.15,
            marginBottom: '12px',
            letterSpacing: '-1px'
          }}>
            Your Health,<br/>Our Priority
          </h1>
          <p style={{
            color: 'rgba(255,255,255,0.85)',
            fontSize: '1rem',
            marginBottom: '20px',
            maxWidth: '380px',
            lineHeight: 1.6
          }}>
            Securely access the National Patient Health Record system to manage and deliver quality healthcare.
          </p>
          {/* Trust Badges */}
          <div style={{display: 'flex', gap: '16px', alignItems: 'center'}}>
            <div style={{
              background: 'rgba(255,255,255,0.2)',
              backdropFilter: 'blur(10px)',
              borderRadius: '8px',
              padding: '8px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <i className="fas fa-shield-alt" style={{color: '#fff', fontSize: '14px'}}></i>
              <span style={{color: '#fff', fontSize: '0.8rem', fontWeight: 500}}>256-bit Encrypted</span>
            </div>
            <div style={{
              background: 'rgba(255,255,255,0.2)',
              backdropFilter: 'blur(10px)',
              borderRadius: '8px',
              padding: '8px 14px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <i className="fas fa-lock" style={{color: '#fff', fontSize: '14px'}}></i>
              <span style={{color: '#fff', fontSize: '0.8rem', fontWeight: 500}}>HIPAA Compliant</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Form Side */}
      <div style={{
        flex: '1 1 50%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        padding: '24px 20px',
        background: '#fff',
        overflowY: 'auto',
        height: '100vh',
      }}>
        <div style={{width: '100%', maxWidth: '370px'}}>
          {/* Mobile Brand (visible on small screens) */}
          <div className="d-lg-none text-center mb-4">
            <i className="fas fa-heartbeat" style={{fontSize: '28px', color: '#667eea'}}></i>
            <span style={{color: '#333', fontWeight: 700, fontSize: '0.95rem', marginLeft: '8px'}}>National Patient Health Record</span>
          </div>

          {/* Welcome Text */}
          <div style={{marginBottom: '14px', textAlign: 'center'}}>
            <h2 style={{
              color: '#2d3748',
              fontWeight: 800,
              fontSize: '1.45rem',
              marginBottom: '4px',
              letterSpacing: '-0.5px'
            }}>
              Sign In
            </h2>
            <p style={{color: '#718096', fontSize: '0.84rem', margin: 0}}>
              Sign in to access the National Patient Health Record
            </p>
          </div>

          {/* Server Error */}
          {serverError && (
            <div style={{
              background: '#fff5f5',
              border: '1px solid #fed7d7',
              borderRadius: '10px',
              padding: '12px 16px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '10px'
            }}>
              <i className="fas fa-exclamation-circle" style={{color: '#e53e3e', fontSize: '16px'}}></i>
              <span style={{color: '#e53e3e', fontSize: '0.85rem'}}>{serverError}</span>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} noValidate>
            {/* Email */}
            <div style={{marginBottom: '12px'}}>
              <label htmlFor="email" style={{
                display: 'block',
                color: '#4a5568',
                fontSize: '0.82rem',
                fontWeight: 600,
                marginBottom: '6px'
              }}>
                Email Address
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                background: '#f7fafc',
                border: touched.email && errors.email ? '1.5px solid #e53e3e' :
                  touched.email && !errors.email && formData.email ? '1.5px solid #667eea' :
                  '1.5px solid #e2e8f0',
                borderRadius: '10px',
                transition: 'border-color 0.2s',
              }}>
                <input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="example@healthinfo.com"
                  value={formData.email}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  autoComplete="email"
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#2d3748',
                    padding: '10px 14px',
                    fontSize: '0.85rem',
                  }}
                />
                {touched.email && !errors.email && formData.email && (
                  <i className="fas fa-check-circle" style={{color: '#667eea', marginRight: '12px', fontSize: '13px'}}></i>
                )}
              </div>
              {touched.email && errors.email && (
                <small style={{color: '#e53e3e', fontSize: '0.75rem', marginTop: '4px', display: 'block'}}>
                  <i className="fas fa-times-circle me-1"></i>{errors.email}
                </small>
              )}
            </div>

            {/* Password */}
            <div style={{marginBottom: '8px'}}>
              <label htmlFor="password" style={{
                display: 'block',
                color: '#4a5568',
                fontSize: '0.82rem',
                fontWeight: 600,
                marginBottom: '6px'
              }}>
                Password
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                background: '#f7fafc',
                border: touched.password && errors.password ? '1.5px solid #e53e3e' :
                  touched.password && !errors.password && formData.password ? '1.5px solid #667eea' :
                  '1.5px solid #e2e8f0',
                borderRadius: '10px',
                transition: 'border-color 0.2s',
              }}>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  name="password"
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  autoComplete="current-password"
                  style={{
                    flex: 1,
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#2d3748',
                    padding: '10px 14px',
                    fontSize: '0.85rem',
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  tabIndex="-1"
                  style={{
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '0 14px',
                    color: '#a0aec0'
                  }}
                >
                  <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'}`}></i>
                </button>
              </div>

              {/* Password Strength Bar */}
              {formData.password && (
                <div style={{marginTop: '8px'}}>
                  <div style={{
                    width: '100%',
                    height: '5px',
                    borderRadius: '3px',
                    background: '#e2e8f0',
                    overflow: 'hidden',
                  }}>
                    <div style={{
                      width: `${passwordStrength.score}%`,
                      height: '100%',
                      borderRadius: '3px',
                      background: passwordStrength.score <= 40
                        ? '#e53e3e'
                        : passwordStrength.score <= 80
                        ? 'linear-gradient(90deg, #e53e3e 0%, #d69e2e 100%)'
                        : 'linear-gradient(90deg, #e53e3e 0%, #d69e2e 40%, #38a169 100%)',
                      transition: 'width 0.3s ease, background 0.3s ease',
                    }}></div>
                  </div>
                  <div style={{display: 'flex', justifyContent: 'space-between', marginTop: '4px'}}>
                    <small style={{
                      color: passwordStrength.level === 'weak' ? '#e53e3e'
                        : passwordStrength.level === 'medium' ? '#d69e2e'
                        : passwordStrength.level === 'strong' ? '#38a169' : '#a0aec0',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                    }}>
                      {passwordStrength.level === 'weak' && 'Simple'}
                      {passwordStrength.level === 'medium' && 'Medium'}
                      {passwordStrength.level === 'strong' && 'Complex'}
                    </small>
                    <div style={{display: 'flex', gap: '8px'}}>
                      <small style={{fontSize: '0.68rem', color: passwordStrength.score >= 20 ? '#e53e3e' : '#cbd5e0', fontWeight: 500}}>Simple</small>
                      <small style={{fontSize: '0.68rem', color: passwordStrength.score > 40 ? '#d69e2e' : '#cbd5e0', fontWeight: 500}}>Medium</small>
                      <small style={{fontSize: '0.68rem', color: passwordStrength.score > 80 ? '#38a169' : '#cbd5e0', fontWeight: 500}}>Complex</small>
                    </div>
                  </div>
                </div>
              )}

              {touched.password && errors.password && (
                <small style={{color: '#e53e3e', fontSize: '0.78rem', marginTop: '6px', display: 'block'}}>
                  <i className="fas fa-times-circle me-1"></i>{errors.password}
                </small>
              )}
            </div>

            {/* Remember Me & Forgot Password */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '14px',
              marginTop: '8px'
            }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                cursor: 'pointer',
                color: '#718096',
                fontSize: '0.8rem'
              }}>
                <input
                  type="checkbox"
                  name="rememberMe"
                  checked={formData.rememberMe}
                  onChange={handleChange}
                  style={{
                    width: '15px',
                    height: '15px',
                    accentColor: '#667eea',
                    cursor: 'pointer'
                  }}
                />
                Remember me
              </label>
              <Link to="/forgot-password" style={{
                color: '#667eea',
                textDecoration: 'none',
                fontSize: '0.8rem',
                fontWeight: 500
              }}>
                Forgot Password?
              </Link>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading || (touched.email && errors.email) || (touched.password && errors.password)}
              style={{
                width: '100%',
                padding: '11px',
                borderRadius: '10px',
                border: 'none',
                background: loading ? 'rgba(102,126,234,0.5)' : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#fff',
                fontSize: '0.9rem',
                fontWeight: 700,
                cursor: loading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                letterSpacing: '0.3px',
                boxShadow: '0 4px 15px rgba(102,126,234,0.4)',
                opacity: (touched.email && errors.email) || (touched.password && errors.password) ? 0.5 : 1
              }}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true" style={{width:'16px', height:'16px'}}></span>
                  Signing in...
                </>
              ) : (
                'Log In'
              )}
            </button>
          </form>

          {/* Divider */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            margin: '14px 0',
            gap: '10px'
          }}>
            <div style={{flex: 1, height: '1px', background: '#e2e8f0'}}></div>
            <span style={{color: '#a0aec0', fontSize: '0.8rem', fontWeight: 500}}>Or</span>
            <div style={{flex: 1, height: '1px', background: '#e2e8f0'}}></div>
          </div>

          {/* OAuth Buttons */}
          <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
            <button
              type="button"
              onClick={() => googleLogin()}
              disabled={!!socialLoading}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '10px',
                border: '1.5px solid #e2e8f0',
                background: '#fff',
                color: '#4a5568',
                fontSize: '0.84rem',
                fontWeight: 600,
                cursor: socialLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                transition: 'all 0.2s',
                opacity: socialLoading && socialLoading !== 'google' ? 0.5 : 1
              }}
              onMouseEnter={(e) => { if (!socialLoading) e.currentTarget.style.background = '#f7fafc'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
            >
              {socialLoading === 'google' ? (
                <><span className="spinner-border spinner-border-sm text-secondary" style={{width:'16px', height:'16px'}}></span> Signing in...</>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                  Continue with Google
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleFacebookLogin}
              disabled={!!socialLoading}
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '10px',
                border: '1.5px solid #e2e8f0',
                background: '#fff',
                color: '#4a5568',
                fontSize: '0.84rem',
                fontWeight: 600,
                cursor: socialLoading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                transition: 'all 0.2s',
                opacity: socialLoading && socialLoading !== 'facebook' ? 0.5 : 1
              }}
              onMouseEnter={(e) => { if (!socialLoading) e.currentTarget.style.background = '#f7fafc'; }}
              onMouseLeave={(e) => { e.currentTarget.style.background = '#fff'; }}
            >
              {socialLoading === 'facebook' ? (
                <><span className="spinner-border spinner-border-sm text-secondary" style={{width:'16px', height:'16px'}}></span> Signing in...</>
              ) : (
                <>
                  <svg width="18" height="18" viewBox="0 0 24 24">
                    <path fill="#1877F2" d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                  </svg>
                  Continue with Facebook
                </>
              )}
            </button>
          </div>

          {/* Back to Home */}
          <div style={{textAlign: 'center', marginTop: '14px'}}>
            <Link to="/" style={{
              color: '#667eea',
              textDecoration: 'none',
              fontSize: '0.82rem',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              transition: 'color 0.2s'
            }}>
              <i className="fas fa-arrow-left" style={{fontSize: '11px'}}></i>
              Back to Home
            </Link>
          </div>

          {/* Footer */}
          <div style={{textAlign: 'center', marginTop: '10px'}}>
            <small style={{color: '#a0aec0', fontSize: '0.72rem'}}>
              <i className="fas fa-shield-alt me-1"></i>
              Secure connection | &copy; {new Date().getFullYear()} HealthInfo
            </small>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;

import React, { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:8000/api/v1';

function CreateNewPassword() {
  const [searchParams] = useSearchParams();

  const otp = searchParams.get('otp');
  const uidb64 = searchParams.get('uidb64');

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState({ level: '', score: 0 });

  const calculatePasswordStrength = (pwd) => {
    let score = 0;
    const checks = {
      length: pwd.length >= 8,
      uppercase: /[A-Z]/.test(pwd),
      lowercase: /[a-z]/.test(pwd),
      number: /[0-9]/.test(pwd),
      special: /[!@#$%^&*(),.?":{}|<>]/.test(pwd),
    };

    Object.values(checks).forEach(passed => { if (passed) score += 20; });

    let level = '';
    if (score <= 40) level = 'weak';
    else if (score <= 60) level = 'medium';
    else level = 'strong';

    if (pwd.length === 0) { level = ''; score = 0; }

    setPasswordStrength({ level, score });
  };

  const handlePasswordChange = (e) => {
    const value = e.target.value;
    setPassword(value);
    calculatePasswordStrength(value);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!otp || !uidb64) {
      setError('Invalid or expired reset link. Please request a new one.');
      return;
    }

    if (!password) {
      setError('Please enter a new password.');
      return;
    }

    if (password.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/user/password-change/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ otp, uidb64, password }),
      });
      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
      } else {
        setError(data.message || 'Failed to reset password. The link may have expired.');
      }
    } catch {
      setError('An error occurred. Please check your connection and try again.');
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
        <Link to="/login" className="text-decoration-none text-white d-flex align-items-center">
          <i className="fas fa-arrow-left me-2"></i>
          <span style={{fontSize: '1rem', fontWeight: 500}}>Back to Login</span>
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
            <div className="text-center mb-3">
              <Link to="/" className="text-decoration-none">
                <div className="login-logo mb-1">
                  <i className="fas fa-heartbeat" style={{fontSize: '32px', color: '#fff'}}></i>
                </div>
                <h3 className="text-white mb-0" style={{fontWeight: 600, fontSize: '1rem'}}>HealthInfo</h3>
              </Link>
              <h2 className="mt-2 mb-0" style={{fontWeight: 700, color: '#fff', fontSize: '1.4rem'}}>Create New Password</h2>
              <p className="text-white-50 mb-0" style={{fontSize: '0.8rem'}}>Enter and confirm your new password</p>
            </div>

            {/* Card */}
            <div className="auth-box card shadow-lg border-0">
              <div className="card-body px-4 py-3">

                {!success ? (
                  <form onSubmit={handleSubmit} noValidate>
                    {error && (
                      <div className="alert alert-danger d-flex align-items-center mb-3 py-2" role="alert" style={{fontSize: '0.875rem'}}>
                        <i className="fas fa-exclamation-circle me-2"></i>
                        <div>{error}</div>
                      </div>
                    )}

                    {(!otp || !uidb64) && (
                      <div className="alert alert-warning d-flex align-items-center mb-3 py-2" role="alert" style={{fontSize: '0.875rem'}}>
                        <i className="fas fa-exclamation-triangle me-2"></i>
                        <div>Invalid reset link. Please <Link to="/forgot-password">request a new one</Link>.</div>
                      </div>
                    )}

                    {/* New Password */}
                    <div className="mb-2">
                      <label htmlFor="password" className="form-label fw-semibold mb-1" style={{fontSize: '0.9rem'}}>
                        <i className="fas fa-lock me-1 text-primary"></i>New Password
                      </label>
                      <div className="input-group" style={{border: '2px solid #dee2e6', borderRadius: '8px', overflow: 'hidden'}}>
                        <span className="input-group-text bg-light border-0" style={{borderRight: '1px solid #e9ecef'}}>
                          <i className="fas fa-key text-muted"></i>
                        </span>
                        <input
                          type={showPassword ? 'text' : 'password'}
                          id="password"
                          className="form-control border-0 py-2"
                          placeholder="Enter new password"
                          value={password}
                          onChange={handlePasswordChange}
                          required
                        />
                        <button
                          type="button"
                          className="btn btn-light border-0"
                          onClick={() => setShowPassword(!showPassword)}
                          tabIndex={-1}
                        >
                          <i className={`fas ${showPassword ? 'fa-eye-slash' : 'fa-eye'} text-muted`}></i>
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
                            {passwordStrength.level === 'strong' && <><i className="fas fa-check-circle me-1"></i>Strong</>}
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

                      {/* Password Requirements */}
                      <div className="mt-1">
                        <small className="text-muted d-block mb-1" style={{fontSize: '0.75rem'}}>
                          <i className="fas fa-info-circle me-1"></i>Password must contain:
                        </small>
                        <div className="ps-2" style={{lineHeight: '1.4'}}>
                          <small className={`d-block ${password.length >= 8 ? 'text-success' : 'text-muted'}`} style={{fontSize: '0.75rem'}}>
                            <i className={`fas ${password.length >= 8 ? 'fa-check-circle' : 'fa-circle'} me-1`} style={{fontSize: '0.65rem'}}></i>
                            At least 8 characters
                          </small>
                          <small className={`d-block ${/[A-Z]/.test(password) ? 'text-success' : 'text-muted'}`} style={{fontSize: '0.75rem'}}>
                            <i className={`fas ${/[A-Z]/.test(password) ? 'fa-check-circle' : 'fa-circle'} me-1`} style={{fontSize: '0.65rem'}}></i>
                            One uppercase letter (A-Z)
                          </small>
                          <small className={`d-block ${/[a-z]/.test(password) ? 'text-success' : 'text-muted'}`} style={{fontSize: '0.75rem'}}>
                            <i className={`fas ${/[a-z]/.test(password) ? 'fa-check-circle' : 'fa-circle'} me-1`} style={{fontSize: '0.65rem'}}></i>
                            One lowercase letter (a-z)
                          </small>
                          <small className={`d-block ${/[0-9]/.test(password) ? 'text-success' : 'text-muted'}`} style={{fontSize: '0.75rem'}}>
                            <i className={`fas ${/[0-9]/.test(password) ? 'fa-check-circle' : 'fa-circle'} me-1`} style={{fontSize: '0.65rem'}}></i>
                            One number (0-9)
                          </small>
                          <small className={`d-block ${/[!@#$%^&*(),.?":{}|<>]/.test(password) ? 'text-success' : 'text-muted'}`} style={{fontSize: '0.75rem'}}>
                            <i className={`fas ${/[!@#$%^&*(),.?":{}|<>]/.test(password) ? 'fa-check-circle' : 'fa-circle'} me-1`} style={{fontSize: '0.65rem'}}></i>
                            One special character (!@#$%^&*)
                          </small>
                        </div>
                      </div>
                    </div>

                    {/* Confirm Password */}
                    <div className="mb-3">
                      <label htmlFor="confirmPassword" className="form-label fw-semibold mb-1" style={{fontSize: '0.9rem'}}>
                        <i className="fas fa-lock me-1 text-primary"></i>Confirm Password
                      </label>
                      <div className="input-group" style={{border: '2px solid #dee2e6', borderRadius: '8px', overflow: 'hidden'}}>
                        <span className="input-group-text bg-light border-0" style={{borderRight: '1px solid #e9ecef'}}>
                          <i className="fas fa-key text-muted"></i>
                        </span>
                        <input
                          type={showConfirmPassword ? 'text' : 'password'}
                          id="confirmPassword"
                          className="form-control border-0 py-2"
                          placeholder="Confirm your new password"
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          required
                        />
                        <button
                          type="button"
                          className="btn btn-light border-0"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          tabIndex={-1}
                        >
                          <i className={`fas ${showConfirmPassword ? 'fa-eye-slash' : 'fa-eye'} text-muted`}></i>
                        </button>
                      </div>
                      {confirmPassword && password !== confirmPassword && (
                        <small className="text-danger mt-1 d-block" style={{fontSize: '0.8rem'}}>
                          <i className="fas fa-times-circle me-1"></i>Passwords do not match
                        </small>
                      )}
                      {confirmPassword && password === confirmPassword && (
                        <small className="text-success mt-1 d-block" style={{fontSize: '0.8rem'}}>
                          <i className="fas fa-check-circle me-1"></i>Passwords match
                        </small>
                      )}
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      className="btn btn-primary w-100 py-2 fw-semibold mb-2"
                      disabled={loading || !otp || !uidb64}
                      style={{fontSize: '16px'}}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Resetting...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-save me-2"></i>Reset Password
                        </>
                      )}
                    </button>
                  </form>
                ) : (
                  /* Success State */
                  <div className="text-center py-4">
                    <div style={{
                      width: '70px',
                      height: '70px',
                      borderRadius: '50%',
                      background: '#d4edda',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginBottom: '15px'
                    }}>
                      <i className="fas fa-check" style={{fontSize: '30px', color: '#28a745'}}></i>
                    </div>
                    <h5 className="fw-bold mb-2">Password Reset Successful!</h5>
                    <p className="text-muted mb-3" style={{fontSize: '0.85rem'}}>
                      Your password has been successfully changed. You can now sign in with your new password.
                    </p>
                    <Link to="/login" className="btn btn-primary px-4 py-2">
                      <i className="fas fa-sign-in-alt me-2"></i>Sign In
                    </Link>
                  </div>
                )}

              </div>
            </div>

            {/* Footer */}
            <div className="text-center mt-3">
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

export default CreateNewPassword;

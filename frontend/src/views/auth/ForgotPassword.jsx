import React, { useState } from 'react';
import { Link } from 'react-router-dom';

const API_BASE_URL = 'http://localhost:8000/api/v1';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [emailSent, setEmailSent] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`${API_BASE_URL}/user/password-reset/${email}/`);
      const data = await response.json();

      if (response.ok) {
        setMessage(data.message || 'Password reset email sent successfully. Please check your inbox.');
        setEmailSent(true);
      } else {
        setError(data.error || 'Failed to send reset email. Please try again.');
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
              <h2 className="mt-2 mb-0" style={{fontWeight: 700, color: '#fff', fontSize: '1.4rem'}}>Forgot Password?</h2>
              <p className="text-white-50 mb-0" style={{fontSize: '0.8rem'}}>Enter your email to receive a reset link</p>
            </div>

            {/* Card */}
            <div className="auth-box card shadow-lg border-0">
              <div className="card-body px-4 py-4">

                {!emailSent ? (
                  <form onSubmit={handleSubmit} noValidate>
                    {error && (
                      <div className="alert alert-danger d-flex align-items-center mb-3 py-2" role="alert" style={{fontSize: '0.875rem'}}>
                        <i className="fas fa-exclamation-circle me-2"></i>
                        <div>{error}</div>
                      </div>
                    )}

                    <div className="text-center mb-3">
                      <div style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #667eea, #764ba2)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '10px'
                      }}>
                        <i className="fas fa-lock" style={{fontSize: '24px', color: '#fff'}}></i>
                      </div>
                      <p className="text-muted mb-0" style={{fontSize: '0.85rem'}}>
                        Enter the email address associated with your account and we'll send you a link to reset your password.
                      </p>
                    </div>

                    {/* Email Input */}
                    <div className="mb-3">
                      <label htmlFor="email" className="form-label fw-semibold mb-1" style={{fontSize: '0.9rem'}}>
                        <i className="fas fa-envelope me-1 text-primary"></i>Email Address
                      </label>
                      <div className="input-group" style={{border: '2px solid #dee2e6', borderRadius: '8px', overflow: 'hidden'}}>
                        <span className="input-group-text bg-light border-0" style={{borderRight: '1px solid #e9ecef'}}>
                          <i className="fas fa-at text-muted"></i>
                        </span>
                        <input
                          type="email"
                          id="email"
                          className="form-control border-0 py-2"
                          placeholder="Enter your email address"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          required
                        />
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button
                      type="submit"
                      className="btn btn-primary w-100 py-2 fw-semibold mb-3"
                      disabled={loading}
                      style={{fontSize: '16px'}}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                          Sending...
                        </>
                      ) : (
                        <>
                          <i className="fas fa-paper-plane me-2"></i>Send Reset Link
                        </>
                      )}
                    </button>

                    <div className="text-center">
                      <Link to="/login" className="text-primary text-decoration-none" style={{fontSize: '0.875rem'}}>
                        <i className="fas fa-arrow-left me-1"></i>Back to Sign In
                      </Link>
                    </div>
                  </form>
                ) : (
                  /* Success State */
                  <div className="text-center py-3">
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
                    <h5 className="fw-bold mb-2">Email Sent!</h5>
                    <p className="text-muted mb-3" style={{fontSize: '0.85rem'}}>
                      {message}
                    </p>
                    <p className="text-muted mb-3" style={{fontSize: '0.8rem'}}>
                      Didn't receive the email? Check your spam folder or
                    </p>
                    <button
                      className="btn btn-outline-primary btn-sm mb-3"
                      onClick={() => { setEmailSent(false); setMessage(''); }}
                    >
                      <i className="fas fa-redo me-1"></i>Try Again
                    </button>
                    <div>
                      <Link to="/login" className="text-primary text-decoration-none" style={{fontSize: '0.875rem'}}>
                        <i className="fas fa-arrow-left me-1"></i>Back to Sign In
                      </Link>
                    </div>
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

export default ForgotPassword;

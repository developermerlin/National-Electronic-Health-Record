import React from 'react'
import { Link } from 'react-router-dom'

function Header({ hideAuthButtons = false }) {
  return (
    <header id="header" className="header fixed-top">

      <div className="topbar d-flex align-items-center dark-background">
        <div className="container d-flex justify-content-center justify-content-md-between">
          <div className="contact-info d-flex align-items-center">
            <i className="bi bi-envelope d-flex align-items-center"><a className="text-decoration-none"
              href="mailto:contact@example.com">medicalrecord@moh.gov.sl</a></i>
            <i className="bi bi-phone d-flex align-items-center ms-4"><span>+232 76 978000/+23277800111</span></i>
        </div>
          <div className="social-links d-none d-md-flex align-items-center">
            <a href="#!" className="twitter"><i className="bi bi-twitter-x"></i></a>
            <a href="#!" className="facebook"><i className="bi bi-facebook"></i></a>
            <a href="#!" className="instagram"><i className="bi bi-instagram"></i></a>
            <a href="#!" className="linkedin"><i className="bi bi-linkedin"></i></a>
        </div>
      </div>
    </div>

      <div className="branding d-flex align-items-center">

        <div className="container position-relative d-flex align-items-center justify-content-between">
          <Link to={'/'} className="logo d-flex align-items-center text-decoration-none">
            <h1 className="sitename">HealthInfo</h1>
        </Link>

          <nav id="navmenu" className="navmenu">
          <ul>
              <li><a href="index.html" className="active text-decoration-none">Home</a></li>
            <li><a href="about.html" className="text-decoration-none">About</a></li>
            {/* <li><a href="departments.html" className="text-decoration-none">Departments</a></li> */}
            <li><a href="services.html" className="text-decoration-none">Services</a></li>
            <li><a href="doctors.html" className="text-decoration-none">Doctors</a></li>
              <li className="dropdown"><a href="#" className="text-decoration-none"><span>More Pages</span> <i className="bi bi-chevron-down toggle-dropdown"></i></a>
            <ul>
              <li><a href="department-details.html" className="text-decoration-none">Department Details</a></li>
              <li><a href="service-details.html" className="text-decoration-none">Service Details</a></li>
              <li><a href="appointment.html" className="text-decoration-none">Appointment</a></li>
              <li><a href="testimonials.html" className="text-decoration-none">Testimonials</a></li>
              <li><a href="faq.html" className="text-decoration-none">Frequently Asked Questions</a></li>
              <li><a href="gallery.html" className="text-decoration-none">Gallery</a></li>
              <li><a href="terms.html" className="text-decoration-none">Terms</a></li>
              <li><a href="privacy.html" className="text-decoration-none">Privacy</a></li>
              <li><a href="404.html" className="text-decoration-none">404</a></li>
            </ul>
            </li>
              {/* <li className="dropdown"><a href="#" className="text-decoration-none"><span>Dropdown</span> <i className="bi bi-chevron-down toggle-dropdown"></i></a>
              <ul>
                <li><a href="#" className="text-decoration-none">Dropdown 1</a></li>
                  <li className="dropdown"><a href="#" className="text-decoration-none"><span>Deep Dropdown</span> <i className="bi bi-chevron-down toggle-dropdown"></i></a>
                  <ul>
                    <li><a href="#" className="text-decoration-none">Deep Dropdown 1</a></li>
                    <li><a href="#" className="text-decoration-none">Deep Dropdown 2</a></li>
                    <li><a href="#" className="text-decoration-none">Deep Dropdown 3</a></li>
                    <li><a href="#" className="text-decoration-none">Deep Dropdown 4</a></li>
                    <li><a href="#" className="text-decoration-none">Deep Dropdown 5</a></li>
                  </ul>
                </li>
                <li><a href="#" className="text-decoration-none">Dropdown 2</a></li>
                <li><a href="#" className="text-decoration-none">Dropdown 3</a></li>
                <li><a href="#" className="text-decoration-none">Dropdown 4</a></li>
              </ul>
            </li> */}
            {/* <li><a href="contact.html" className="text-decoration-none">Contact</a></li> */}
          </ul>
            <i className="mobile-nav-toggle d-xl-none bi bi-list"></i>
        </nav>

        {!hideAuthButtons && (
          <div className="auth-buttons d-flex align-items-center ms-3">
            <Link to="/login" className="btn btn-outline-primary btn-sm me-2 d-flex align-items-center">
              <i className="fas fa-sign-in-alt me-1"></i>
              Login
            </Link>
            {/* <Link to={'/signup'} className="btn btn-primary btn-sm d-flex align-items-center">
              <i className="fas fa-user-plus me-1"></i>
              Sign Up
            </Link> */}
          </div>
        )}

      </div>

    </div>

    </header>
  )
}

export default Header
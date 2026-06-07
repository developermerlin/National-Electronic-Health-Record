/**
 * Role-aware sidebar navigation helpers.
 */

const ministryNav = [
  {
    label: 'Dashboard',
    items: [
      { path: '/ministry/dashboard', icon: 'fas fa-tachometer-alt', text: 'National Overview' },
    ],
  },
  {
    label: 'Organization',
    items: [
      { path: '/admin/regions', icon: 'fas fa-globe-africa', text: 'Regions' },
      { path: '/admin/districts', icon: 'fas fa-map-marked-alt', text: 'Districts' },
      { path: '/admin/hospitals', icon: 'fas fa-hospital', text: 'Hospitals' },
    ],
  },
  {
    label: 'Security',
    items: [
      { path: '/audit/logs', icon: 'fas fa-shield-alt', text: 'Audit Logs' },
    ],
  },
  {
    label: 'Communication',
    items: [
      { path: '/chat', icon: 'fas fa-comments', text: 'Live Chat' },
      { path: '/messages', icon: 'fas fa-envelope', text: 'Messages' },
    ],
  },
  {
    label: 'Account',
    items: [
      { path: '/admin/profile', icon: 'fas fa-user-circle', text: 'My Profile' },
    ],
  },
];

const adminNav = [
  {
    label: 'Dashboard',
    items: [
      { path: '/admin/dashboard', icon: 'fas fa-tachometer-alt', text: 'Overview' },
    ],
  },
  {
    label: 'User Management',
    items: [
      { path: '/admin/users', icon: 'fas fa-users', text: 'All Users' },
      { path: '/admin/roles', icon: 'fas fa-user-tag', text: 'Roles & Permissions' },
    ],
  },
  {
    label: 'Organization',
    items: [
      { path: '/admin/regions', icon: 'fas fa-globe-africa', text: 'Regions' },
      { path: '/admin/districts', icon: 'fas fa-map-marked-alt', text: 'Districts' },
      { path: '/admin/chiefdoms', icon: 'fas fa-sitemap', text: 'Chiefdoms' },
      { path: '/admin/towns', icon: 'fas fa-city', text: 'Towns' },
      { path: '/admin/hospitals', icon: 'fas fa-hospital', text: 'Hospitals' },
    ],
  },
  {
    label: 'Security',
    items: [
      { path: '/audit/logs', icon: 'fas fa-shield-alt', text: 'Audit Logs' },
    ],
  },
  {
    label: 'Communication',
    items: [
      { path: '/chat', icon: 'fas fa-comments', text: 'Live Chat' },
      { path: '/messages', icon: 'fas fa-envelope', text: 'Messages' },
    ],
  },
  {
    label: 'Account',
    items: [
      { path: '/admin/profile', icon: 'fas fa-user-circle', text: 'My Profile' },
    ],
  },
];

const receptionistNav = [
  {
    label: 'Dashboard',
    items: [
      { path: '/receptionist/dashboard', icon: 'fas fa-tachometer-alt', text: 'Overview' },
    ],
  },
  {
    label: 'Patients',
    items: [
      { path: '/receptionist/patients', icon: 'fas fa-users', text: 'All Patients' },
      { path: '/receptionist/patients/register', icon: 'fas fa-user-plus', text: 'Register New' },
    ],
  },
  {
    label: 'Management',
    items: [
      { path: '/receptionist/appointments', icon: 'fas fa-calendar-check', text: 'Appointments' },
      { path: '/receptionist/queue', icon: 'fas fa-list-ol', text: 'Patient Queue' },
      { path: '/triage',           icon: 'fas fa-heartbeat',      text: 'Triage Dashboard' },
      { path: '/receptionist/referrals', icon: 'fas fa-share-square', text: 'Referral Cases' },
      { path: '/billing', icon: 'fas fa-file-invoice-dollar', text: 'Billing & Invoices' },
    ],
  },
  {
    label: 'Communication',
    items: [
      { path: '/chat', icon: 'fas fa-comments', text: 'Live Chat' },
      { path: '/messages', icon: 'fas fa-envelope', text: 'Messages' },
    ],
  },
  {
    label: 'Account',
    items: [
      { path: '/admin/profile', icon: 'fas fa-user-circle', text: 'My Profile' },
    ],
  },
];

const doctorNav = [
  {
    label: 'Dashboard',
    items: [
      { path: '/doctor/dashboard', icon: 'fas fa-tachometer-alt', text: 'Overview' },
    ],
  },
  {
    label: 'Appointments',
    items: [
      { path: '/doctor/appointment-requests', icon: 'fas fa-calendar-plus', text: 'Appointment Requests' },
      { path: '/doctor/availability',         icon: 'fas fa-clock',         text: 'My Availability' },
    ],
  },
  {
    label: 'Patients',
    items: [
      { path: '/doctor/queue', icon: 'fas fa-list-ol', text: 'My Queue' },
      { path: '/doctor/patients', icon: 'fas fa-users', text: 'My Patients' },
      { path: '/doctor/lab-results', icon: 'fas fa-flask', text: 'Lab Results' },
      { path: '/ipd/dashboard', icon: 'fas fa-bed', text: 'IPD Admissions' },
    ],
  },
  {
    label: 'Telemedicine',
    items: [
      { path: '/telemedicine/dashboard', icon: 'fas fa-video', text: 'Virtual Consultations' },
    ],
  },
  {
    label: 'Communication',
    items: [
      { path: '/chat', icon: 'fas fa-comments', text: 'Live Chat' },
      { path: '/messages', icon: 'fas fa-envelope', text: 'Messages' },
    ],
  },
  {
    label: 'Account',
    items: [
      { path: '/admin/profile', icon: 'fas fa-user-circle', text: 'My Profile' },
    ],
  },
];

const nurseNav = [
  {
    label: 'Dashboard',
    items: [
      { path: '/nurse/dashboard', icon: 'fas fa-tachometer-alt', text: 'Overview' },
    ],
  },
  {
    label: 'Triage & Vitals',
    items: [
      { path: '/triage',          icon: 'fas fa-th-large',       text: 'Triage Dashboard' },
      { path: '/nurse/walkin',    icon: 'fas fa-walking',        text: 'Walk-in Triage' },
    ],
  },
  {
    label: 'MCH',
    items: [
      { path: '/mch/dashboard',     icon: 'fas fa-heartbeat',     text: 'MCH Overview' },
      { path: '/mch/anc',           icon: 'fas fa-female',        text: 'ANC Visits' },
      { path: '/mch/immunizations', icon: 'fas fa-syringe',       text: 'Immunizations' },
    ],
  },
  {
    label: 'Patients',
    items: [
      { path: '/receptionist/patients', icon: 'fas fa-users', text: 'Patient Records' },
      { path: '/ipd/dashboard', icon: 'fas fa-bed', text: 'IPD Admissions' },
    ],
  },
  {
    label: 'Communication',
    items: [
      { path: '/chat',     icon: 'fas fa-comments', text: 'Live Chat' },
      { path: '/messages', icon: 'fas fa-envelope',  text: 'Messages' },
    ],
  },
  {
    label: 'Account',
    items: [
      { path: '/admin/profile', icon: 'fas fa-user-circle', text: 'My Profile' },
    ],
  },
];

// ── Nurse department-aware nav ────────────────────────────────────────────
const _nurseSection = {
  overview: {
    label: 'Dashboard',
    items: [{ path: '/nurse/dashboard', icon: 'fas fa-tachometer-alt', text: 'Overview' }],
  },
  triage: {
    label: 'Triage & Vitals',
    items: [
      { path: '/triage',       icon: 'fas fa-th-large', text: 'Triage Dashboard' },
      { path: '/nurse/walkin', icon: 'fas fa-walking',  text: 'Walk-in Triage'   },
    ],
  },
  ipd: {
    label: 'Inpatient Care',
    items: [
      { path: '/nurse/dashboard', icon: 'fas fa-user-nurse', text: 'Nursing Overview' },
      { path: '/ipd/dashboard',   icon: 'fas fa-bed',        text: 'IPD Admissions'   },
    ],
  },
  mch: {
    label: 'MCH',
    items: [
      { path: '/mch/dashboard',     icon: 'fas fa-heartbeat', text: 'MCH Overview'  },
      { path: '/mch/anc',           icon: 'fas fa-female',    text: 'ANC Visits'    },
      { path: '/mch/immunizations', icon: 'fas fa-syringe',   text: 'Immunizations' },
    ],
  },
  patients: {
    label: 'Patients',
    items: [
      { path: '/receptionist/patients',          icon: 'fas fa-users',     text: 'Patient Records'  },
      { path: '/receptionist/patients/register', icon: 'fas fa-user-plus', text: 'Register Patient' },
    ],
  },
  communication: {
    label: 'Communication',
    items: [
      { path: '/chat',     icon: 'fas fa-comments', text: 'Live Chat' },
      { path: '/messages', icon: 'fas fa-envelope',  text: 'Messages'  },
    ],
  },
  account: {
    label: 'Account',
    items: [{ path: '/admin/profile', icon: 'fas fa-user-circle', text: 'My Profile' }],
  },
};

const _nurseDeptNav = {
  triage:        [_nurseSection.triage                                          ],
  opd:           [_nurseSection.triage                                          ],
  emergency:     [_nurseSection.triage, _nurseSection.ipd                       ],
  ipd:           [                      _nurseSection.ipd                       ],
  ward:          [                      _nurseSection.ipd                       ],
  surgery:       [                      _nurseSection.ipd                       ],
  maternity:     [_nurseSection.mch,    _nurseSection.ipd                       ],
  pediatrics:    [_nurseSection.mch                                             ],
  dental:        [                                                               ],
  eye_clinic:    [                                                               ],
  physiotherapy: [                                                               ],
};

const _nurseOverviewPath = {
  triage:    '/triage',
  opd:       '/triage',
  emergency: '/triage',
  ipd:       '/nurse/dashboard',
  ward:      '/nurse/dashboard',
  surgery:   '/nurse/dashboard',
  maternity: '/mch/dashboard',
  pediatrics:'/mch/dashboard',
};

function getNurseNav(user) {
  const dept = user?.department_name;
  const sections = dept ? (_nurseDeptNav[dept] || null) : null;
  if (!sections) return nurseNav;
  const overviewPath = _nurseOverviewPath[dept] || '/nurse/dashboard';
  const overview = { label: 'Dashboard', items: [{ path: overviewPath, icon: 'fas fa-tachometer-alt', text: 'Overview' }] };
  return [
    overview,
    ...sections,
    _nurseSection.patients,
    { label: 'HR', items: [{ path: '/hospital-admin/leave', icon: 'fas fa-calendar-minus', text: 'My Leave Requests' }] },
    _nurseSection.communication,
    _nurseSection.account,
  ];
}

// ── Doctor department-aware nav ─────────────────────────────────────────────
const _doctorSection = {
  overview: {
    label: 'Dashboard',
    items: [{ path: '/doctor/dashboard', icon: 'fas fa-tachometer-alt', text: 'Overview' }],
  },
  appointments: {
    label: 'Appointments',
    items: [
      { path: '/doctor/appointment-requests', icon: 'fas fa-calendar-plus', text: 'Appointment Requests' },
      { path: '/doctor/availability',         icon: 'fas fa-clock',         text: 'My Availability'      },
      { path: '/doctor/completed-appointments', icon: 'fas fa-check-circle', text: 'Completed'           },
    ],
  },
  queue: {
    label: 'Consultations',
    items: [
      { path: '/doctor/queue',    icon: 'fas fa-list-ol', text: 'My Queue'    },
      { path: '/doctor/patients', icon: 'fas fa-users',   text: 'My Patients' },
    ],
  },
  ipd: {
    label: 'Inpatient Care',
    items: [
      { path: '/ipd/dashboard',   icon: 'fas fa-bed',   text: 'IPD Admissions' },
      { path: '/doctor/patients', icon: 'fas fa-users', text: 'My Patients'    },
    ],
  },
  mch: {
    label: 'MCH',
    items: [
      { path: '/mch/dashboard',     icon: 'fas fa-heartbeat', text: 'MCH Overview'  },
      { path: '/mch/anc',           icon: 'fas fa-female',    text: 'ANC Visits'    },
      { path: '/mch/immunizations', icon: 'fas fa-syringe',   text: 'Immunizations' },
    ],
  },
  emergency: {
    label: 'Emergency',
    items: [
      { path: '/triage',        icon: 'fas fa-procedures', text: 'Triage Queue'  },
      { path: '/doctor/queue',  icon: 'fas fa-list-ol',    text: 'Doctor Queue'  },
    ],
  },
  billing: {
    label: 'Billing',
    items: [{ path: '/doctor/billing', icon: 'fas fa-file-invoice-dollar', text: 'My Billing' }],
  },
  telemedicine: {
    label: 'Telemedicine',
    items: [{ path: '/telemedicine/dashboard', icon: 'fas fa-video', text: 'Virtual Consultations' }],
  },
  communication: {
    label: 'Communication',
    items: [
      { path: '/chat',     icon: 'fas fa-comments', text: 'Live Chat' },
      { path: '/messages', icon: 'fas fa-envelope',  text: 'Messages'  },
    ],
  },
  account: {
    label: 'Account',
    items: [{ path: '/admin/profile', icon: 'fas fa-user-circle', text: 'My Profile' }],
  },
};

const _doctorDeptNav = {
  opd:          [_doctorSection.appointments, _doctorSection.queue                          ],
  emergency:    [_doctorSection.emergency,    _doctorSection.queue                          ],
  ipd:          [_doctorSection.ipd                                                         ],
  ward:         [_doctorSection.ipd                                                         ],
  surgery:      [_doctorSection.ipd,          _doctorSection.queue                          ],
  maternity:    [_doctorSection.mch,          _doctorSection.ipd                            ],
  pediatrics:   [_doctorSection.mch,          _doctorSection.queue                          ],
  dental:       [_doctorSection.appointments, _doctorSection.queue                          ],
  eye_clinic:   [_doctorSection.appointments, _doctorSection.queue                          ],
  physiotherapy:[_doctorSection.appointments, _doctorSection.queue                          ],
};

const _doctorDeptHome = {
  ipd:          '/ipd/dashboard',
  ward:         '/ipd/dashboard',
  surgery:      '/ipd/dashboard',
  maternity:    '/mch/dashboard',
  pediatrics:   '/mch/dashboard',
  emergency:    '/triage',
};

const _doctorOverviewPath = {
  ipd:          '/ipd/dashboard',
  ward:         '/ipd/dashboard',
  surgery:      '/ipd/dashboard',
  maternity:    '/mch/dashboard',
  pediatrics:   '/mch/dashboard',
  emergency:    '/triage',
};

function getDoctorNav(user) {
  const dept = user?.department_name;
  const sections = dept ? (_doctorDeptNav[dept] || null) : null;
  if (!sections) return doctorNav;
  const overviewPath = _doctorOverviewPath[dept] || '/doctor/dashboard';
  const overview = { label: 'Dashboard', items: [{ path: overviewPath, icon: 'fas fa-tachometer-alt', text: 'Overview' }] };
  return [
    overview,
    ...sections,
    _doctorSection.billing,
    _doctorSection.telemedicine,
    { label: 'HR', items: [{ path: '/hospital-admin/leave', icon: 'fas fa-calendar-minus', text: 'My Leave Requests' }] },
    _doctorSection.communication,
    _doctorSection.account,
  ];
}

// ── Shared building blocks ──────────────────────────────────────────────────
const _haSection = {
  dashboard: {
    label: 'Dashboard',
    items: [{ path: '/hospital-admin/dashboard', icon: 'fas fa-tachometer-alt', text: 'Hospital Overview' }],
  },
  staff: {
    label: 'Staff Management',
    items: [
      { path: '/admin/users',           icon: 'fas fa-users',        text: 'Department Staff' },
      { path: '/admin/specialties',     icon: 'fas fa-stethoscope',  text: 'Medical Specialties' },
      { path: '/hospital-admin/wards',  icon: 'fas fa-hospital-user', text: 'Wards & Beds'     },
    ],
  },
  patients: {
    label: 'Patients',
    items: [
      { path: '/receptionist/patients',          icon: 'fas fa-user-injured', text: 'Patient Records' },
      { path: '/receptionist/patients/register', icon: 'fas fa-user-plus',    text: 'Register Patient' },
    ],
  },
  appointments: {
    label: 'Operations',
    items: [
      { path: '/receptionist/appointments', icon: 'fas fa-calendar-check', text: 'Appointments' },
      { path: '/receptionist/referrals',    icon: 'fas fa-share-square',   text: 'Referral Cases' },
    ],
  },
  departments: {
    label: 'Operations',
    items: [
      { path: '/receptionist/appointments',      icon: 'fas fa-calendar-check',       text: 'Appointments'         },
      { path: '/receptionist/referrals',         icon: 'fas fa-share-square',         text: 'Referral Cases'       },
      { path: '/hospital-admin/departments',     icon: 'fas fa-building',             text: 'Departments'          },
      { path: '/hospital-admin/prescriptions',   icon: 'fas fa-prescription-bottle-alt', text: 'Prescriptions'     },
      { path: '/hospital-admin/analytics',       icon: 'fas fa-chart-line',           text: 'Analytics & Reports'  },
      { path: '/hospital-admin/notifications',   icon: 'fas fa-bell',                 text: 'Notification Center'  },
      { path: '/telemedicine/dashboard',         icon: 'fas fa-video',                text: 'Telemedicine'         },
      { path: '/billing',                        icon: 'fas fa-file-invoice-dollar',  text: 'Billing & Invoices'   },
      { path: '/billing/nhia-claims',            icon: 'fas fa-shield-alt',           text: 'NHIA Claims'          },
      { path: '/billing/reports',                icon: 'fas fa-chart-bar',            text: 'Financial Reports'    },
      { path: '/billing/insurance',              icon: 'fas fa-shield-alt',           text: 'Insurance / NHIA'     },
    ],
  },
  compliance: {
    label: 'Compliance',
    items: [
      { path: '/admin/audit-compliance', icon: 'fas fa-clipboard-check', text: 'Audit & Compliance' },
    ],
  },
  wards:    { label: 'Facility', items: [{ path: '/hospital-admin/wards', icon: 'fas fa-hospital-user', text: 'Wards & Beds' }] },
  doctor:   { label: 'Clinical', items: [{ path: '/hospital-admin/doctors', icon: 'fas fa-user-md', text: 'Doctor Overview' }] },
  pharmacy: { label: 'Clinical', items: [{ path: '/pharmacy/dashboard', icon: 'fas fa-pills',      text: 'Pharmacy Dashboard' }] },
  nursing:  { label: 'Clinical', items: [{ path: '/nurse/dashboard',    icon: 'fas fa-user-nurse', text: 'Nursing & MCH Dashboard' }] },
  lab:      { label: 'Clinical', items: [{ path: '/lab/dashboard',      icon: 'fas fa-flask',      text: 'Laboratory Dashboard' }] },
  triage:   { label: 'Clinical', items: [{ path: '/triage',             icon: 'fas fa-heartbeat',  text: 'Triage Dashboard' }] },
  communication: {
    label: 'Communication',
    items: [
      { path: '/chat',     icon: 'fas fa-comments', text: 'Live Chat' },
      { path: '/messages', icon: 'fas fa-envelope', text: 'Messages' },
    ],
  },
  leave: {
    label: 'HR',
    items: [{ path: '/hospital-admin/leave', icon: 'fas fa-calendar-minus', text: 'My Leave Requests' }],
  },
  account: {
    label: 'Account',
    items: [{ path: '/admin/profile', icon: 'fas fa-user-circle', text: 'My Profile' }],
  },
};

// ── Department → nav sections map ──────────────────────────────────────────
const _deptNav = {
  pharmacy:      [_haSection.pharmacy, _haSection.patients, _haSection.departments, _haSection.compliance],
  laboratory:    [_haSection.lab,      _haSection.patients, _haSection.departments, _haSection.compliance],
  radiology:     [_haSection.lab,      _haSection.patients, _haSection.departments, _haSection.compliance],
  triage:        [_haSection.triage,   _haSection.patients, _haSection.departments, _haSection.compliance],
  opd:           [_haSection.doctor,   _haSection.triage, _haSection.patients, _haSection.departments, _haSection.compliance],
  ipd:           [_haSection.doctor,   _haSection.nursing, _haSection.patients, _haSection.departments, _haSection.compliance],
  emergency:     [_haSection.doctor,   _haSection.triage,  _haSection.patients, _haSection.departments, _haSection.compliance],
  surgery:       [_haSection.doctor,   _haSection.patients, _haSection.departments, _haSection.compliance],
  maternity:     [_haSection.nursing,  _haSection.patients, _haSection.departments, _haSection.compliance],
  pediatrics:    [_haSection.doctor,   _haSection.patients, _haSection.departments, _haSection.compliance],
  dental:        [_haSection.doctor,   _haSection.patients, _haSection.departments, _haSection.compliance],
  eye_clinic:    [_haSection.doctor,   _haSection.patients, _haSection.departments, _haSection.compliance],
  physiotherapy: [_haSection.patients, _haSection.departments, _haSection.compliance],
  ward:          [_haSection.nursing,  _haSection.patients, _haSection.departments, _haSection.compliance],
  records:       [_haSection.patients, _haSection.departments, _haSection.compliance],
  admin:         [_haSection.patients, _haSection.departments, _haSection.compliance],
  other:         [_haSection.patients, _haSection.departments, _haSection.compliance],
};

/**
 * Returns a navigation array scoped to the hospital admin's assigned department.
 * Falls back to the full hospital admin nav when no department is assigned.
 */
function getHospitalAdminNav() {
  // All hospital admins get full navigation with Departments and Billing
  // Updated: 2026-06-05 - Includes Operations section with Departments & Billing
  return hospitalAdminNav;
}

// ── Static full-access nav (used when no department is assigned) ────────────
const hospitalAdminNav = [
  _haSection.dashboard,
  _haSection.staff,
  {
    label: 'Patients',
    items: [
      { path: '/receptionist/patients',          icon: 'fas fa-user-injured', text: 'Patient Records' },
      { path: '/receptionist/patients/register', icon: 'fas fa-user-plus',    text: 'Register Patient' },
    ],
  },
  {
    label: 'Clinical Departments',
    items: [
      { path: '/hospital-admin/doctors', icon: 'fas fa-user-md', text: 'Doctor Overview' },
      { path: '/pharmacy/dashboard', icon: 'fas fa-pills',      text: 'Pharmacy' },
      { path: '/nurse/dashboard',    icon: 'fas fa-user-nurse', text: 'Nursing & MCH' },
      { path: '/lab/dashboard',      icon: 'fas fa-flask',      text: 'Laboratory' },
      { path: '/ipd/dashboard',      icon: 'fas fa-bed',        text: 'IPD' },
      { path: '/triage',             icon: 'fas fa-heartbeat',  text: 'Triage' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { path: '/receptionist/appointments',      icon: 'fas fa-calendar-check',       text: 'Appointments' },
      { path: '/receptionist/referrals',         icon: 'fas fa-share-square',         text: 'Referral Cases' },
      { path: '/hospital-admin/departments',     icon: 'fas fa-building',             text: 'Departments' },
      { path: '/hospital-admin/prescriptions',   icon: 'fas fa-prescription-bottle-alt', text: 'Prescriptions' },
      { path: '/hospital-admin/analytics',       icon: 'fas fa-chart-line',           text: 'Analytics & Reports' },
      { path: '/hospital-admin/notifications',   icon: 'fas fa-bell',                 text: 'Notification Center' },
      { path: '/telemedicine/dashboard',         icon: 'fas fa-video',                text: 'Telemedicine' },
      { path: '/billing',                        icon: 'fas fa-file-invoice-dollar',  text: 'Billing & Invoices' },
      { path: '/billing/nhia-claims',            icon: 'fas fa-shield-alt',           text: 'NHIA Claims' },
      { path: '/billing/reports',                icon: 'fas fa-chart-bar',            text: 'Financial Reports' },
      { path: '/billing/insurance',              icon: 'fas fa-shield-alt',           text: 'Insurance / NHIA' },
    ],
  },
  {
    label: 'Facility',
    items: [
      { path: '/hospital-admin/wards', icon: 'fas fa-hospital-user', text: 'Wards & Beds' },
    ],
  },
  {
    label: 'Compliance',
    items: [
      { path: '/admin/audit-compliance', icon: 'fas fa-clipboard-check', text: 'Audit & Compliance' },
      { path: '/audit/logs', icon: 'fas fa-shield-alt', text: 'Audit Logs' },
    ],
  },
  _haSection.leave,
  _haSection.communication,
  _haSection.account,
];

const patientNav = [
  {
    label: 'My Health',
    items: [
      { path: '/patient/dashboard', icon: 'fas fa-heartbeat', text: 'Dashboard' },
      { path: '/patient/book', icon: 'fas fa-calendar-plus', text: 'Book Appointment' },
      { path: '/patient/medical-history', icon: 'fas fa-notes-medical', text: 'Medical History' },
      { path: '/patient/lab-results', icon: 'fas fa-flask', text: 'Lab Results' },
      { path: '/patient/billing', icon: 'fas fa-file-invoice-dollar', text: 'My Billing' },
    ],
  },
  {
    label: 'Account',
    items: [
      { path: '/admin/profile', icon: 'fas fa-user-circle', text: 'My Profile' },
    ],
  },
];

const labTechNav = [
  {
    label: 'Dashboard',
    items: [
      { path: '/lab/dashboard', icon: 'fas fa-tachometer-alt', text: 'Lab Overview' },
    ],
  },
  {
    label: 'Laboratory',
    items: [
      { path: '/lab/tests', icon: 'fas fa-flask', text: 'All Test Requests' },
      { path: '/lab/queue', icon: 'fas fa-list-ol', text: 'Pending Queue' },
    ],
  },
  {
    label: 'Patients',
    items: [
      { path: '/receptionist/patients', icon: 'fas fa-users', text: 'Patient Records' },
    ],
  },
  {
    label: 'HR',
    items: [{ path: '/hospital-admin/leave', icon: 'fas fa-calendar-minus', text: 'My Leave Requests' }],
  },
  {
    label: 'Communication',
    items: [
      { path: '/chat', icon: 'fas fa-comments', text: 'Live Chat' },
      { path: '/messages', icon: 'fas fa-envelope', text: 'Messages' },
    ],
  },
  {
    label: 'Account',
    items: [
      { path: '/admin/profile', icon: 'fas fa-user-circle', text: 'My Profile' },
    ],
  },
];

const pharmacistNav = [
  {
    label: 'Dashboard',
    items: [
      { path: '/pharmacy/dashboard', icon: 'fas fa-tachometer-alt', text: 'Pharmacy Overview' },
    ],
  },
  {
    label: 'Dispensing',
    items: [
      { path: '/pharmacy/prescriptions', icon: 'fas fa-file-prescription', text: 'Prescriptions' },
      { path: '/pharmacy/queue',         icon: 'fas fa-list-ol',            text: 'Dispense Queue' },
    ],
  },
  {
    label: 'Inventory',
    items: [
      { path: '/pharmacy/inventory', icon: 'fas fa-boxes', text: 'Drug Inventory' },
    ],
  },
  {
    label: 'Patients',
    items: [
      { path: '/receptionist/patients', icon: 'fas fa-users', text: 'Patient Records' },
    ],
  },
  {
    label: 'HR',
    items: [{ path: '/hospital-admin/leave', icon: 'fas fa-calendar-minus', text: 'My Leave Requests' }],
  },
  {
    label: 'Communication',
    items: [
      { path: '/chat', icon: 'fas fa-comments', text: 'Live Chat' },
      { path: '/messages', icon: 'fas fa-envelope', text: 'Messages' },
    ],
  },
  {
    label: 'Account',
    items: [
      { path: '/admin/profile', icon: 'fas fa-user-circle', text: 'My Profile' },
    ],
  },
];

const triageNav = [
  {
    label: 'Triage',
    items: [
      { path: '/triage', icon: 'fas fa-th-large', text: 'Triage Dashboard' },
      { path: '/nurse/walkin', icon: 'fas fa-walking', text: 'Walk-in Triage' },
    ],
  },
  {
    label: 'Patients',
    items: [
      { path: '/receptionist/patients', icon: 'fas fa-users', text: 'All Patients' },
      { path: '/receptionist/patients/register', icon: 'fas fa-user-plus', text: 'Register Patient' },
    ],
  },
  {
    label: 'HR',
    items: [{ path: '/hospital-admin/leave', icon: 'fas fa-calendar-minus', text: 'My Leave Requests' }],
  },
  {
    label: 'Communication',
    items: [
      { path: '/chat', icon: 'fas fa-comments', text: 'Live Chat' },
      { path: '/messages', icon: 'fas fa-envelope', text: 'Messages' },
    ],
  },
  {
    label: 'Account',
    items: [
      { path: '/admin/profile', icon: 'fas fa-user-circle', text: 'My Profile' },
    ],
  },
];

export function getNavForUser(user) {
  const role = user?.role;
  if (role === 'ministry_admin') return ministryNav;
  if (role === 'hospital_admin') return getHospitalAdminNav(user);
  if (role === 'receptionist') return receptionistNav;
  if (role === 'doctor') return getDoctorNav(user);
  if (role === 'nurse') return getNurseNav(user);
  if (role === 'triage') return triageNav;
  if (role === 'lab_technician') return labTechNav;
  if (role === 'pharmacist') return pharmacistNav;
  if (role === 'patient') return patientNav;
  return adminNav;
}

export function getBrandForUser(user) {
  const role = user?.role;
  if (role === 'ministry_admin') return 'NEHR Ministry';
  if (role === 'hospital_admin') return 'NEHR Hospital';
  if (role === 'receptionist') return 'NEHR System';
  if (role === 'doctor') return 'NEHR Clinic';
  if (role === 'nurse') return 'NEHR Nursing';
  if (role === 'triage') return 'NEHR Triage';
  if (role === 'lab_technician') return 'NEHR Laboratory';
  if (role === 'pharmacist') return 'NEHR Pharmacy';
  if (role === 'patient') return 'Patient Portal';
  return 'NEHR Admin';
}

export function getRoleBadge(user) {
  const role = user?.role;
  if (role === 'ministry_admin') return 'Ministry of Health';
  if (role === 'admin') return 'Administrator';
  if (role === 'receptionist') return 'Receptionist';
  if (role === 'hospital_admin') return user?.department_display ? `${user.department_display} Admin` : 'Hospital Admin';
  if (role === 'district_admin') return 'District Admin';
  if (role === 'doctor') return 'Doctor';
  if (role === 'nurse') return 'Nurse';
  if (role === 'triage') return 'Triage Officer';
  if (role === 'lab_technician') return 'Lab Technician';
  if (role === 'pharmacist') return 'Pharmacist';
  if (role === 'patient') return 'Patient';
  return 'User';
}

const _nurseDeptHome = {
  triage:        '/triage',
  opd:           '/triage',
  emergency:     '/triage',
  ipd:           '/nurse/dashboard',
  ward:          '/nurse/dashboard',
  surgery:       '/nurse/dashboard',
  maternity:     '/mch/dashboard',
  pediatrics:    '/mch/dashboard',
};

export function getHomeDashboard(user) {
  const role = user?.role;
  const dept = user?.department_name;
  switch (role) {
    case 'admin':           return '/admin/dashboard';
    case 'ministry_admin':  return '/ministry/dashboard';
    case 'district_admin':  return '/district-admin/dashboard';
    case 'hospital_admin':  return '/hospital-admin/dashboard';
    case 'receptionist':    return '/receptionist/dashboard';
    case 'doctor':          return _doctorDeptHome[dept] || '/doctor/dashboard';
    case 'nurse':           return _nurseDeptHome[dept] || '/nurse/dashboard';
    case 'triage':          return '/triage';
    case 'lab_technician':  return '/lab/dashboard';
    case 'pharmacist':      return '/pharmacy/dashboard';
    case 'patient':         return '/patient/dashboard';
    default:                return '/';
  }
}

export { ministryNav, adminNav, hospitalAdminNav, receptionistNav, doctorNav, nurseNav, triageNav, labTechNav, pharmacistNav, patientNav, getHospitalAdminNav };

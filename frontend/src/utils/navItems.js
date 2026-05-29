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
      { path: '/admin/departments', icon: 'fas fa-building', text: 'Departments' },
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

// ── Shared building blocks ──────────────────────────────────────────────────
const _haSection = {
  dashboard: {
    label: 'Dashboard',
    items: [{ path: '/hospital-admin/dashboard', icon: 'fas fa-tachometer-alt', text: 'Hospital Overview' }],
  },
  staff: {
    label: 'Staff Management',
    items: [{ path: '/admin/users', icon: 'fas fa-users', text: 'Department Staff' }],
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
      { path: '/receptionist/appointments', icon: 'fas fa-calendar-check', text: 'Appointments' },
      { path: '/receptionist/referrals',    icon: 'fas fa-share-square',   text: 'Referral Cases' },
      { path: '/admin/departments',         icon: 'fas fa-building',        text: 'Departments' },
    ],
  },
  doctor:   { label: 'Clinical', items: [{ path: '/doctor/dashboard',   icon: 'fas fa-user-md',    text: 'Doctor Dashboard' }] },
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
  account: {
    label: 'Account',
    items: [{ path: '/admin/profile', icon: 'fas fa-user-circle', text: 'My Profile' }],
  },
};

// ── Department → nav sections map ──────────────────────────────────────────
const _deptNav = {
  pharmacy:      [_haSection.pharmacy, _haSection.patients, _haSection.appointments],
  laboratory:    [_haSection.lab,      _haSection.patients, _haSection.appointments],
  radiology:     [_haSection.lab,      _haSection.patients, _haSection.appointments],
  triage:        [_haSection.triage,   _haSection.patients],
  opd:           [_haSection.doctor,   _haSection.triage, _haSection.patients, _haSection.appointments],
  ipd:           [_haSection.doctor,   _haSection.nursing, _haSection.patients],
  emergency:     [_haSection.doctor,   _haSection.triage,  _haSection.patients, _haSection.appointments],
  surgery:       [_haSection.doctor,   _haSection.patients, _haSection.appointments],
  maternity:     [_haSection.nursing,  _haSection.patients, _haSection.appointments],
  pediatrics:    [_haSection.doctor,   _haSection.patients, _haSection.appointments],
  dental:        [_haSection.doctor,   _haSection.patients, _haSection.appointments],
  eye_clinic:    [_haSection.doctor,   _haSection.patients, _haSection.appointments],
  physiotherapy: [_haSection.patients, _haSection.appointments],
  ward:          [_haSection.nursing,  _haSection.patients],
  records:       [_haSection.patients, _haSection.departments],
  admin:         [_haSection.patients, _haSection.departments],
  other:         [_haSection.patients, _haSection.appointments],
};

/**
 * Returns a navigation array scoped to the hospital admin's assigned department.
 * Falls back to the full hospital admin nav when no department is assigned.
 */
function getHospitalAdminNav(user) {
  const dept = user?.department_name;
  const specific = dept ? (_deptNav[dept] || [_haSection.patients, _haSection.appointments]) : null;

  if (!specific) {
    // No department assigned → show full hospital view (legacy fallback)
    return hospitalAdminNav;
  }

  return [
    _haSection.dashboard,
    _haSection.staff,
    ...specific,
    _haSection.communication,
    _haSection.account,
  ];
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
      { path: '/doctor/dashboard',   icon: 'fas fa-user-md',    text: 'Doctor' },
      { path: '/pharmacy/dashboard', icon: 'fas fa-pills',      text: 'Pharmacy' },
      { path: '/nurse/dashboard',    icon: 'fas fa-user-nurse', text: 'Nursing & MCH' },
      { path: '/lab/dashboard',      icon: 'fas fa-flask',      text: 'Laboratory' },
      { path: '/triage',             icon: 'fas fa-heartbeat',  text: 'Triage' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { path: '/receptionist/appointments', icon: 'fas fa-calendar-check', text: 'Appointments' },
      { path: '/receptionist/referrals',    icon: 'fas fa-share-square',   text: 'Referral Cases' },
      { path: '/admin/departments',         icon: 'fas fa-building',        text: 'Departments' },
    ],
  },
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
  if (role === 'doctor') return doctorNav;
  if (role === 'nurse') return nurseNav;
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

export { ministryNav, adminNav, hospitalAdminNav, receptionistNav, doctorNav, nurseNav, triageNav, labTechNav, pharmacistNav, patientNav, getHospitalAdminNav };

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
      { path: '/nurse/triage',    icon: 'fas fa-heartbeat',      text: 'Triage Queue' },
      { path: '/nurse/walkin',    icon: 'fas fa-walking',        text: 'Walk-in Triage' },
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

const patientNav = [
  {
    label: 'My Health',
    items: [
      { path: '/patient/dashboard', icon: 'fas fa-heartbeat', text: 'Dashboard' },
      { path: '/patient/book', icon: 'fas fa-calendar-plus', text: 'Book Appointment' },
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
  if (role === 'receptionist') return receptionistNav;
  if (role === 'doctor') return doctorNav;
  if (role === 'nurse') return nurseNav;
  if (role === 'patient') return patientNav;
  return adminNav;
}

export function getBrandForUser(user) {
  const role = user?.role;
  if (role === 'ministry_admin') return 'NEHR Ministry';
  if (role === 'receptionist') return 'NEHR System';
  if (role === 'doctor') return 'NEHR Clinic';
  if (role === 'nurse') return 'NEHR Nursing';
  if (role === 'patient') return 'Patient Portal';
  return 'NEHR Admin';
}

export function getRoleBadge(user) {
  const role = user?.role;
  if (role === 'ministry_admin') return 'Ministry of Health';
  if (role === 'admin') return 'Administrator';
  if (role === 'receptionist') return 'Receptionist';
  if (role === 'hospital_admin') return 'Hospital Admin';
  if (role === 'district_admin') return 'District Admin';
  if (role === 'doctor') return 'Doctor';
  if (role === 'nurse') return 'Nurse';
  if (role === 'patient') return 'Patient';
  return 'User';
}

export { ministryNav, adminNav, receptionistNav, doctorNav, nurseNav, patientNav };

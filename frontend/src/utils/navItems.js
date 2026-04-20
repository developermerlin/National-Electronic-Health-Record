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

export function getNavForUser(user) {
  const role = user?.role;
  if (role === 'ministry_admin') return ministryNav;
  if (role === 'receptionist') return receptionistNav;
  return adminNav;
}

export function getBrandForUser(user) {
  const role = user?.role;
  if (role === 'ministry_admin') return 'NEHR Ministry';
  if (role === 'receptionist') return 'NEHR System';
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
  return 'User';
}

export { ministryNav, adminNav, receptionistNav };

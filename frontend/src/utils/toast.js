import React from 'react';
import { toast } from 'react-toastify';

const VARIANTS = {
  success: {
    icon: 'fas fa-check-circle',
    iconColor: '#16a34a',
    iconBg: '#f0fdf4',
    bar: '#16a34a',
    autoClose: 3500,
  },
  error: {
    icon: 'fas fa-times-circle',
    iconColor: '#dc2626',
    iconBg: '#fff0f0',
    bar: '#dc2626',
    autoClose: 6000,
  },
  warning: {
    icon: 'fas fa-exclamation-triangle',
    iconColor: '#d97706',
    iconBg: '#fffbeb',
    bar: '#d97706',
    autoClose: 5000,
  },
  info: {
    icon: 'fas fa-info-circle',
    iconColor: '#2563eb',
    iconBg: '#eff6ff',
    bar: '#2563eb',
    autoClose: 4000,
  },
};

function ToastContent({ variant, title, message }) {
  const cfg = VARIANTS[variant] || VARIANTS.info;
  const e = React.createElement;
  return e('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 12, padding: '2px 0' } },
    e('div', { style: { width: 36, height: 36, borderRadius: '50%', background: cfg.iconBg, flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' } },
      e('i', { className: cfg.icon, style: { fontSize: 17, color: cfg.iconColor } })
    ),
    e('div', { style: { flex: 1, minWidth: 0 } },
      e('div', { style: { fontWeight: 700, fontSize: 13.5, color: '#0f172a', marginBottom: 2 } }, title),
      e('div', { style: { fontSize: 12.5, color: '#64748b', lineHeight: 1.45 } }, message)
    )
  );
}

const base = (variant, title, message, extra = {}) => {
  const cfg = VARIANTS[variant] || VARIANTS.info;
  toast(React.createElement(ToastContent, { variant, title, message }), {
    position: 'top-right',
    autoClose: cfg.autoClose,
    hideProgressBar: false,
    closeOnClick: true,
    pauseOnHover: true,
    draggable: true,
    icon: false,
    style: {
      background: '#ffffff',
      borderRadius: 12,
      boxShadow: '0 8px 30px rgba(0,0,0,0.12)',
      padding: '12px 16px',
      borderLeft: `4px solid ${cfg.bar}`,
      minWidth: 300,
    },
    progressStyle: { background: cfg.bar, height: 3 },
    ...extra,
  });
};

export const showToast = {
  success: (message, title = 'Success') => base('success', title, message),
  error:   (message, title = 'Error')   => base('error',   title, message),
  warning: (message, title = 'Warning') => base('warning', title, message),
  info:    (message, title = 'Info')    => base('info',    title, message),

  created:     (item) => base('success', `${item} Created`,     `${item} has been added to the system successfully.`),
  updated:     (item) => base('success', `${item} Updated`,     `Changes to ${item.toLowerCase()} have been saved.`),
  deleted:     (item) => base('success', `${item} Deleted`,     `${item} has been permanently removed.`),
  approved:    (item) => base('success', `${item} Approved`,    `${item} is now approved and active.`),
  rejected:    (item) => base('warning', `${item} Rejected`,    `${item} approval has been rejected.`),
  activated:   (item) => base('success', `${item} Activated`,   `${item} is now active in the system.`),
  deactivated: (item) => base('warning', `${item} Deactivated`, `${item} has been deactivated.`),
  saved:       ()     => base('success', 'Changes Saved',       'Your changes have been saved successfully.'),

  createError:     (item) => base('error', 'Creation Failed',     `Failed to create ${item.toLowerCase()}. Please try again.`),
  updateError:     (item) => base('error', 'Update Failed',       `Failed to update ${item.toLowerCase()}. Please try again.`),
  deleteError:     (item) => base('error', 'Deletion Failed',     `Failed to delete ${item.toLowerCase()}. Please try again.`),
  fetchError:      (item) => base('error', 'Load Failed',         `Unable to load ${item.toLowerCase()}. Please refresh.`),
  serverError:     ()     => base('error', 'Server Error',        'A server error occurred. Please contact your administrator.'),
  networkError:    ()     => base('error', 'Connection Lost',     'Network connection lost. Please check your connection.'),
  permissionError: ()     => base('error', 'Access Denied',       'You do not have permission to perform this action.'),
  sessionExpired:  ()     => base('error', 'Session Expired',     'Your session has expired. Please log in again.', { autoClose: 8000 }),
};

export default showToast;

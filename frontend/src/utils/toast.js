import { toast } from 'react-toastify';

// Professional toast configuration for National EHR System
const defaultOptions = {
  position: 'top-right',
  autoClose: 4000,
  hideProgressBar: false,
  closeOnClick: true,
  pauseOnHover: true,
  draggable: true,
  progressClassName: 'toast-progress',
  className: 'toast-container-custom',
};

const successOptions = {
  ...defaultOptions,
  autoClose: 3000,
  icon: '✓',
  style: {
    borderLeft: '4px solid #198754',
    fontWeight: 500,
  },
};

const errorOptions = {
  ...defaultOptions,
  autoClose: 6000,
  icon: '✕',
  style: {
    borderLeft: '4px solid #dc3545',
    fontWeight: 500,
  },
};

const warningOptions = {
  ...defaultOptions,
  autoClose: 5000,
  icon: '⚠',
  style: {
    borderLeft: '4px solid #ffc107',
    fontWeight: 500,
  },
};

const infoOptions = {
  ...defaultOptions,
  autoClose: 3000,
  icon: 'ℹ',
  style: {
    borderLeft: '4px solid #0dcaf0',
    fontWeight: 500,
  },
};

export const showToast = {
  success: (message) => toast.success(message, successOptions),
  error: (message) => toast.error(message, errorOptions),
  warning: (message) => toast.warning(message, warningOptions),
  info: (message) => toast.info(message, infoOptions),

  // Professional system notifications
  created: (item) => toast.success(`${item} created successfully.`, successOptions),
  updated: (item) => toast.success(`${item} updated successfully.`, successOptions),
  deleted: (item) => toast.success(`${item} deleted successfully.`, successOptions),
  activated: (item) => toast.success(`${item} has been activated.`, successOptions),
  deactivated: (item) => toast.success(`${item} has been deactivated.`, successOptions),
  saved: () => toast.success('Changes saved successfully.', successOptions),

  // Error notifications
  createError: (item) => toast.error(`Failed to create ${item.toLowerCase()}. Please try again.`, errorOptions),
  updateError: (item) => toast.error(`Failed to update ${item.toLowerCase()}. Please try again.`, errorOptions),
  deleteError: (item) => toast.error(`Failed to delete ${item.toLowerCase()}. Please try again.`, errorOptions),
  fetchError: (item) => toast.error(`Unable to load ${item.toLowerCase()}. Please refresh the page.`, errorOptions),
  serverError: () => toast.error('A server error occurred. Please contact system administrator.', errorOptions),
  networkError: () => toast.error('Network connection lost. Please check your connection.', errorOptions),
  permissionError: () => toast.error('You do not have permission to perform this action.', errorOptions),

  // Action confirmations
  confirmDelete: (item) => toast.warning(`Are you sure you want to delete this ${item.toLowerCase()}?`, warningOptions),
  confirmDeactivate: (item) => toast.warning(`Are you sure you want to deactivate this ${item.toLowerCase()}?`, warningOptions),
  sessionExpired: () => toast.error('Your session has expired. Please log in again.', { ...errorOptions, autoClose: 8000 }),

  // Approval notifications
  approved: (item) => toast.success(`${item} approved successfully.`, successOptions),
  rejected: (item) => toast.warning(`${item} has been rejected.`, warningOptions),
  pending: (item) => toast.info(`${item} is pending approval.`, infoOptions),
};

export default showToast;

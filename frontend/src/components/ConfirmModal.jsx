import React from 'react';

const modalOverlay = {
  backgroundColor: 'rgba(0,0,0,0.5)',
  position: 'fixed',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  zIndex: 1060,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};

function ConfirmModal({ show, title, message, confirmLabel = 'Confirm', cancelLabel = 'Cancel', variant = 'danger', onConfirm, onCancel }) {
  if (!show) return null;

  const iconMap = {
    danger: { icon: 'fas fa-exclamation-triangle', color: '#dc3545' },
    warning: { icon: 'fas fa-exclamation-circle', color: '#ffc107' },
    info: { icon: 'fas fa-info-circle', color: '#0d6efd' },
  };

  const { icon, color } = iconMap[variant] || iconMap.danger;

  return (
    <div style={modalOverlay} onClick={onCancel}>
      <div className="modal-dialog" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-content border-0 shadow">
          <div className="modal-body text-center py-4">
            <i className={icon} style={{ fontSize: '48px', color, marginBottom: '16px', display: 'block' }}></i>
            <h5 className="mb-2">{title || 'Are you sure?'}</h5>
            <p className="text-muted mb-0">{message}</p>
          </div>
          <div className="modal-footer border-0 justify-content-center pb-4">
            <button type="button" className="btn btn-secondary px-4" onClick={onCancel}>
              {cancelLabel}
            </button>
            <button type="button" className={`btn btn-${variant} px-4`} onClick={onConfirm}>
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;

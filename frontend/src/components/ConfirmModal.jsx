import React from 'react';

function ConfirmModal({
  show,
  title,
  message,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'danger',
  onConfirm,
  onCancel,
}) {
  if (!show) return null;

  const variantMap = {
    danger:  { icon: 'fas fa-trash-alt',          iconBg: '#fff0f0', iconColor: '#dc3545', btnBg: '#dc3545', btnHover: '#b91c1c' },
    warning: { icon: 'fas fa-exclamation-circle',  iconBg: '#fffbeb', iconColor: '#d97706', btnBg: '#d97706', btnHover: '#b45309' },
    info:    { icon: 'fas fa-info-circle',          iconBg: '#eff6ff', iconColor: '#2563eb', btnBg: '#2563eb', btnHover: '#1d4ed8' },
  };
  const cfg = variantMap[variant] || variantMap.danger;

  return (
    <div
      onClick={onCancel}
      style={{
        position: 'fixed', inset: 0, zIndex: 99999,
        background: 'rgba(15,23,42,0.60)',
        backdropFilter: 'blur(3px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '16px',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#ffffff',
          borderRadius: '20px',
          boxShadow: '0 24px 60px rgba(0,0,0,0.25)',
          width: '100%',
          maxWidth: '420px',
          overflow: 'hidden',
          animation: 'cmFadeIn 0.18s ease',
        }}
      >
        {/* Top accent bar */}
        <div style={{ height: '4px', background: cfg.btnBg }} />

        {/* Body */}
        <div style={{ padding: '36px 32px 24px', textAlign: 'center' }}>
          {/* Icon circle */}
          <div style={{
            width: 72, height: 72, borderRadius: '50%',
            background: cfg.iconBg,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            margin: '0 auto 20px',
          }}>
            <i className={cfg.icon} style={{ fontSize: 32, color: cfg.iconColor }}></i>
          </div>

          <h4 style={{ margin: '0 0 10px', fontWeight: 700, fontSize: 20, color: '#0f172a' }}>
            {title || 'Are you sure?'}
          </h4>
          <p style={{ margin: 0, fontSize: 14, color: '#64748b', lineHeight: 1.6 }}>
            {message}
          </p>
        </div>

        {/* Footer */}
        <div style={{
          padding: '0 32px 28px',
          display: 'flex', gap: 12, justifyContent: 'center',
        }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              flex: 1, maxWidth: 160,
              padding: '11px 0',
              borderRadius: 10,
              border: '1.5px solid #e2e8f0',
              background: '#f8fafc',
              color: '#475569',
              fontSize: 14, fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.borderColor = '#cbd5e1'; }}
            onMouseLeave={e => { e.currentTarget.style.background = '#f8fafc'; e.currentTarget.style.borderColor = '#e2e8f0'; }}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              flex: 1, maxWidth: 160,
              padding: '11px 0',
              borderRadius: 10,
              border: 'none',
              background: cfg.btnBg,
              color: '#fff',
              fontSize: 14, fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s',
              boxShadow: `0 4px 14px ${cfg.btnBg}55`,
            }}
            onMouseEnter={e => { e.currentTarget.style.background = cfg.btnHover; }}
            onMouseLeave={e => { e.currentTarget.style.background = cfg.btnBg; }}
          >
            {confirmLabel}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes cmFadeIn {
          from { opacity: 0; transform: scale(0.95) translateY(8px); }
          to   { opacity: 1; transform: scale(1)    translateY(0);   }
        }
      `}</style>
    </div>
  );
}

export default ConfirmModal;

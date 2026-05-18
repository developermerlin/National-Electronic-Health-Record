import React from 'react';

const VARIANTS = {
  primary:           { gradient: 'linear-gradient(135deg, #4361ee 0%, #3a0ca3 100%)', shadow: 'rgba(67,97,238,0.35)',  color: '#fff' },
  danger:            { gradient: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)', shadow: 'rgba(239,68,68,0.35)',  color: '#fff' },
  success:           { gradient: 'linear-gradient(135deg, #22c55e 0%, #15803d 100%)', shadow: 'rgba(22,163,74,0.35)',  color: '#fff' },
  warning:           { gradient: 'linear-gradient(135deg, #f59e0b 0%, #b45309 100%)', shadow: 'rgba(245,158,11,0.35)', color: '#fff' },
  info:              { gradient: 'linear-gradient(135deg, #0891b2 0%, #0e7490 100%)', shadow: 'rgba(8,145,178,0.35)',  color: '#fff' },
  secondary:         { gradient: 'linear-gradient(135deg, #64748b 0%, #334155 100%)', shadow: 'rgba(100,116,139,0.25)', color: '#fff' },
  'outline-primary': { gradient: 'transparent', shadow: 'none', color: '#4361ee', border: '2px solid #4361ee' },
  'outline-danger':  { gradient: 'transparent', shadow: 'none', color: '#ef4444', border: '2px solid #ef4444' },
  'outline-secondary': { gradient: 'transparent', shadow: 'none', color: '#64748b', border: '2px solid #cbd5e1' },
};

function PrimaryButton({
  onClick,
  icon,
  children,
  disabled = false,
  variant = 'primary',
  type = 'button',
  size,
  gradient: gradientProp,
  shadow: shadowProp,
}) {
  const v = VARIANTS[variant] || VARIANTS.primary;
  const gradient = gradientProp || v.gradient;
  const shadow   = shadowProp   || v.shadow;
  const color    = v.color;
  const border   = v.border || 'none';

  const isOutline = variant.startsWith('outline');
  const padding = size === 'sm' ? '7px 14px' : '10px 20px';
  const fontSize = size === 'sm' ? 13 : 14;
  const iconSize = size === 'sm' ? 22 : 26;

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        padding, borderRadius: 12, border,
        background: disabled ? '#cbd5e1' : gradient,
        color: disabled ? '#94a3b8' : color,
        fontWeight: 700, fontSize,
        cursor: disabled ? 'not-allowed' : 'pointer',
        boxShadow: disabled ? 'none' : shadow === 'none' ? 'none' : `0 4px 14px ${shadow}`,
        transition: 'all 0.2s',
        opacity: disabled ? 0.65 : 1,
        textDecoration: 'none',
        whiteSpace: 'nowrap',
      }}
      onMouseEnter={e => {
        if (!disabled) {
          if (shadow !== 'none') e.currentTarget.style.boxShadow = `0 6px 20px ${shadow.replace('0.35', '0.55').replace('0.25', '0.40')}`;
          e.currentTarget.style.transform = 'translateY(-1px)';
          if (isOutline) e.currentTarget.style.background = color;
          if (isOutline) e.currentTarget.style.color = '#fff';
        }
      }}
      onMouseLeave={e => {
        e.currentTarget.style.boxShadow = disabled ? 'none' : shadow === 'none' ? 'none' : `0 4px 14px ${shadow}`;
        e.currentTarget.style.transform = 'translateY(0)';
        if (isOutline) e.currentTarget.style.background = 'transparent';
        if (isOutline) e.currentTarget.style.color = color;
      }}
    >
      {icon && (
        <span style={{
          width: iconSize, height: iconSize, borderRadius: 8,
          background: isOutline ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.18)',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
        }}>
          <i className={icon} style={{ fontSize: size === 'sm' ? 11 : 12 }}></i>
        </span>
      )}
      {children}
    </button>
  );
}

export default PrimaryButton;

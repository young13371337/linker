import React, { useEffect, useRef, useState } from 'react';

interface ToastAction {
  label: string;
  // action may be async; return value ignored
  onClick: () => void | Promise<void>;
  style?: React.CSSProperties;
}

interface ToastProps {
  type: 'error' | 'success';
  message: string;
  duration?: number;
  onClose: () => void;
  actions?: ToastAction[];
}

const ToastNotification: React.FC<ToastProps> = ({ type, message, duration = 4000, onClose, actions }) => {
  const [visible, setVisible] = useState(true);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Always show an indeterminate spinner (compact) — this matches the desired visual.
  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, duration);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [duration, onClose]);

  return (
    <div
      style={{
        position: 'fixed', right: 32, bottom: 32, zIndex: 200,
        minWidth: 260, maxWidth: 420, padding: '14px 18px',
        borderRadius: 12, background: '#0f1214', color: '#fff', fontWeight: 700, fontSize: 18,
        boxShadow: '0 6px 26px rgba(0,0,0,0.6)', transition: 'opacity .2s, transform .2s', opacity: visible ? 1 : 0,
        display: 'flex', alignItems: 'center', gap: 12, transform: visible ? 'translateY(0)' : 'translateY(6px)'
      }}
    >
      {/* compact indeterminate spinner to the left */}
      <div style={{display:'flex', alignItems:'center'}}>
        <div style={{width:14,height:14,borderRadius:14,border:'2.5px solid rgba(255,255,255,0.06)', borderLeftColor: type === 'error' ? '#ff5252' : '#4caf50', boxSizing:'border-box', animation:'tn-spin 1s linear infinite'}} />
      </div>
      <style>{`@keyframes tn-spin { to { transform: rotate(360deg); } }`}</style>
      <div style={{flex:1, lineHeight:1}}>{message}</div>
      {actions && actions.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 8, width: '100%', justifyContent: actions.length === 1 ? 'flex-end' : 'space-between' }}>
          {actions.map((a, idx) => {
            const isTwo = actions.length === 2;
            const base: React.CSSProperties = {
              padding: '6px 10px',
              borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.04)',
              cursor: 'pointer',
              background: 'rgba(28,30,32,0.65)',
              color: '#e6e6e6',
              fontWeight: 700,
              fontSize: 13,
              lineHeight: '1',
              textAlign: 'center' as const,
            };
            const style: React.CSSProperties = isTwo ? { ...base, flex: '0 0 48%' } : { ...base, minWidth: 92 };
            return (
              <button
                key={idx}
                onClick={async () => {
                  try {
                    await a.onClick();
                  } catch (e) {
                    console.error('Toast action error', e);
                  }
                  setVisible(false);
                  setTimeout(onClose, 200);
                }}
                style={{ ...style, ...(a.style || {}) }}
              >
                {a.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ToastNotification;
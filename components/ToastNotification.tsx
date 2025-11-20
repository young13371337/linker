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
      <>
      <div style={{ position: 'fixed', right: 24, bottom: 28, zIndex: 200, display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
      <div
        style={{
          minWidth: 300, maxWidth: 560, padding: '14px 18px',
            borderRadius: 10, background: 'rgba(18,20,24,0.92)', color: '#e6eef6', fontWeight: 700, fontSize: 14,
            boxShadow: '0 8px 30px rgba(0,0,0,0.32)', transition: 'opacity .22s ease, transform .18s ease', opacity: visible ? 1 : 0,
            display: 'flex', alignItems: 'center', gap: 12, transform: visible ? 'translateY(0)' : 'translateY(8px)', border: '1px solid rgba(255,255,255,0.03)', backdropFilter: 'blur(6px)'
        }}
        className="toast"
        role="status"
        aria-live="polite"
      >
        {/* no icon: keep spacing optional via an empty divider to align text consistently */}
        <div style={{ flex: 1, lineHeight: 1.2, color: '#e7f6ff', fontWeight: 600, fontSize: 15 }}>{message}</div>
      {actions && actions.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginLeft: 12, justifyContent: actions.length === 1 ? 'flex-end' : 'flex-start' }}>
          {actions.map((a, idx) => {
            const isTwo = actions.length === 2;
            const base: React.CSSProperties = {
              padding: '6px 10px',
              borderRadius: 8,
              cursor: 'pointer',
              background: 'transparent',
              color: '#9fb4bd',
              fontWeight: 700,
              fontSize: 13,
              lineHeight: '1',
              textAlign: 'center' as const,
              border: 'none'
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
      {/* progress bar below the toast and connected to it */}
      <div style={{ width: '100%', maxWidth: 560, marginTop: 6 }}>
        <div style={{ height: 5, borderRadius: 8, overflow: 'hidden', width: '100%', background: 'rgba(255,255,255,0.03)' }}>
          <div className="progressInner" style={{ height: '100%', width: '100%', background: type === 'success' ? '#23a86b' : '#ff5252', transformOrigin: 'left', animation: `toastProgress ${duration}ms linear forwards` }} />
        </div>
      </div>
      </div>
      <style jsx>{`
        @keyframes toastProgress {
          0% { transform: scaleX(1); }
          100% { transform: scaleX(0); }
        }
        .toast:hover .progressInner { animation-play-state: paused !important; }
        .toast { transform-origin: bottom right; }
        `}</style>
        </>
  );
};

export default ToastNotification;

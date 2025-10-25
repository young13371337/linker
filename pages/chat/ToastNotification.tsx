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
  const [progress, setProgress] = useState(100);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    timerRef.current = setTimeout(() => {
      setVisible(false);
      setTimeout(onClose, 300);
    }, duration);
    const interval = setInterval(() => {
      setProgress(prev => Math.max(0, prev - 100 / (duration / 50)));
    }, 50);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      clearInterval(interval);
    };
  }, [duration, onClose]);

  return (
    <div
      style={{
        position: 'fixed', right: 32, bottom: 32, zIndex: 200,
        minWidth: 240, maxWidth: 340, padding: '18px 24px 14px 24px',
        borderRadius: 14, background: '#181a1f', color: '#fff', fontWeight: 500, fontSize: 17,
        boxShadow: '0 2px 12px #2228', transition: 'opacity .3s', opacity: visible ? 1 : 0,
        display: 'flex', flexDirection: 'column', gap: 8
      }}
    >
      <div style={{height:6,width:'100%',borderRadius:4,background:'#222',overflow:'hidden',marginBottom:8}}>
        <div style={{height:'100%',width:`${progress}%`,background:type==='error'?'#ff5252':'#4caf50',transition:'width .2s'}} />
      </div>
      <span style={{fontSize:17}}>{message}</span>
      {actions && actions.length > 0 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          {actions.map((a, idx) => (
            <button
              key={idx}
              onClick={async () => {
                try {
                  await a.onClick();
                } catch (e) {
                  // ignore action errors here
                  console.error('Toast action error', e);
                }
                setVisible(false);
                setTimeout(onClose, 200);
              }}
              style={{
                padding: '8px 12px', borderRadius: 10, border: 'none', cursor: 'pointer',
                background: type === 'error' ? '#ff5252' : '#229ed9', color: '#fff', fontWeight: 600,
                ...(a.style || {})
              }}
            >
              {a.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ToastNotification;
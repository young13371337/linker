import React, { useEffect, useState } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
  variant?: 'chat-list' | 'default';
};

export default function SettingsModal({ open, onClose, variant = 'default' }: Props) {
  const [color, setColor] = useState<string>('#229ed9');

  useEffect(() => {
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('chatMessageColor') : null;
      if (stored) setColor(stored);
    } catch (e) {}
  }, [open]);

  const applyColor = (c: string) => {
    try {
      localStorage.setItem('chatMessageColor', c);
    } catch (e) {}
    // Notify other components
    try {
      window.dispatchEvent(new CustomEvent('chat-color-changed', { detail: c }));
    } catch (e) {}
  };

  // keep a CSS variable on :root in sync so components/CSS can use var(--chat-accent)
  useEffect(() => {
    try {
      const initial = typeof window !== 'undefined' ? localStorage.getItem('chatMessageColor') : null;
      if (initial) {
        document.documentElement.style.setProperty('--chat-accent', initial);
        // light shadow tint
        document.documentElement.style.setProperty('--chat-accent-shadow', initial + '33');
      }
    } catch (e) {}
  }, []);

  // update CSS var whenever color changes locally
  useEffect(() => {
    try {
      if (color) {
        document.documentElement.style.setProperty('--chat-accent', color);
        document.documentElement.style.setProperty('--chat-accent-shadow', color + '33');
      }
    } catch (e) {}
  }, [color]);

  if (!open) return null;

  // Variant specific styles
  const isChatList = variant === 'chat-list';

  return (
    <div
      style={{
        position: 'fixed',
        left: 0,
        top: 0,
        right: 0,
        bottom: 0,
        zIndex: 2000,
        display: 'flex',
        alignItems: isChatList ? 'flex-start' : 'center',
        justifyContent: isChatList ? 'flex-end' : 'center',
        paddingTop: isChatList ? 72 : 0,
        paddingRight: isChatList ? 24 : 0,
        background: 'rgba(0,0,0,0.4)'
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: isChatList ? 300 : 360,
          maxWidth: '92%',
          background: isChatList ? '#0b0b0b' : '#0e0f12',
          borderRadius: isChatList ? 10 : 12,
          border: isChatList ? '1px solid rgba(255,255,255,0.04)' : undefined,
          boxShadow: isChatList ? '0 6px 26px rgba(0,0,0,0.6)' : '0 8px 40px rgba(0,0,0,0.6)',
          padding: 14,
          color: '#fff'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
          <div style={{ fontSize: 16, fontWeight: 700 }}>{isChatList ? 'Настройки чата' : 'Настройки'}</div>
          <button onClick={onClose} aria-label="close" style={{ background: 'transparent', border: 'none', color: '#999', cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ marginBottom: 8, fontSize: 13, color: '#bbb' }}>Цвет сообщений в чате</div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {/* Visible swatch: black-styled control that triggers the native color input */}
          <div style={{ position: 'relative', width: 56, height: 36 }}>
            <div
              onClick={() => {
                const el = document.getElementById('settings-color-input');
                try { (el as HTMLInputElement | null)?.click(); } catch (e) {}
              }}
              style={{
                width: 56,
                height: 36,
                background: '#000',
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.06)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                boxShadow: 'inset 0 -2px 6px rgba(0,0,0,0.6)'
              }}
              title="Открыть палитру"
            >
              {/* small indicator showing currently selected color */}
              <div style={{ width: 28, height: 20, borderRadius: 6, background: color, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.25)' }} />
            </div>
            <input id="settings-color-input" aria-label="color" type="color" value={color} onChange={(e) => { setColor(e.target.value); applyColor(e.target.value); }} style={{ position: 'absolute', left: 0, top: 0, width: 56, height: 36, opacity: 0, border: 'none', padding: 0, margin: 0, cursor: 'pointer' }} />
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: '#ddd' }}>Выбранный цвет: <span style={{ fontWeight: 700 }}>{color}</span></div>
            <div style={{ marginTop: 8 }}>
              <button onClick={() => { applyColor(color); onClose(); }} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: color || '#229ed9', color: '#fff', cursor: 'pointer' }}>Сохранить</button>
              <button onClick={onClose} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: '#222', color: '#fff', cursor: 'pointer', marginLeft: 8 }}>Отмена</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

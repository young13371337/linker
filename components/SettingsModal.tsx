import React, { useEffect, useState } from 'react';

type Props = {
  open: boolean;
  onClose: () => void;
};

export default function SettingsModal({ open, onClose }: Props) {
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

  if (!open) return null;

  return (
    <div style={{ position: 'fixed', left: 0, top: 0, right: 0, bottom: 0, zIndex: 2000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,0.4)' }} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} style={{ width: 360, maxWidth: '92%', background: '#0e0f12', borderRadius: 12, boxShadow: '0 8px 40px rgba(0,0,0,0.6)', padding: 18, color: '#fff' }}>
        <div style={{ textAlign: 'center', fontSize: 18, fontWeight: 700, marginBottom: 12 }}>Настройки</div>
        <div style={{ marginBottom: 10, fontSize: 13, color: '#bbb' }}>Цвет сообщений в чате</div>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <input type="color" value={color} onChange={(e) => { setColor(e.target.value); applyColor(e.target.value); }} style={{ width: 56, height: 36, border: 'none', background: 'transparent', cursor: 'pointer' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 13, color: '#ddd' }}>Выбранный цвет: <span style={{ fontWeight: 700 }}>{color}</span></div>
            <div style={{ marginTop: 8 }}>
              <button onClick={() => { applyColor(color); onClose(); }} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: '#229ed9', color: '#fff', cursor: 'pointer' }}>Сохранить</button>
              <button onClick={onClose} style={{ padding: '8px 12px', borderRadius: 8, border: 'none', background: '#222', color: '#fff', cursor: 'pointer', marginLeft: 8 }}>Отмена</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

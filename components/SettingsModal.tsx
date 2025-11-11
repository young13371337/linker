import React, { useEffect, useState } from 'react';
import styles from './SettingsModal.module.css';

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

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div onClick={(e) => e.stopPropagation()} className={styles.modal}>
        <div className={styles.title}>Настройки</div>
        <div className={styles.label}>Цвет сообщений в чате</div>
        <div className={styles.row}>
          <input
            type="color"
            value={color}
            onChange={(e) => {
              setColor(e.target.value);
              applyColor(e.target.value);
            }}
            className={styles.colorInput}
            aria-label="Выбор цвета сообщений"
          />
          <div className={styles.meta}>
            <div className="selected">Выбранный цвет: <span style={{ fontWeight: 700 }}>{color}</span></div>
            <div className={styles.actions}>
              <button onClick={() => { applyColor(color); onClose(); }} className={`${styles.btn} ${styles.btnPrimary}`}>Сохранить</button>
              <button onClick={onClose} className={`${styles.btn} ${styles.btnSecondary}`}>Отмена</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

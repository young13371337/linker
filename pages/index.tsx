

import React, { useState, useEffect } from "react";
import LottiePlayer from "../lib/LottiePlayer";

const Landing: React.FC = () => {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 600);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <div style={{ background: '#111', minHeight: '100vh', width: '100vw', position: 'relative', overflow: 'hidden' }}>
      {/* Верхняя панель */}
      <header
        style={{
          width: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: isMobile ? '18px 8px 0 8px' : '32px 32px 0 32px',
          position: 'absolute',
          top: 0,
          left: 0,
          zIndex: 2,
          flexDirection: isMobile ? 'column' : 'row',
        }}
      >
        {/* Логотип слева */}
        <div style={{ display: 'flex', alignItems: 'center', gap: isMobile ? 8 : 16 }}>
          <img src="/logo.svg" alt="Logo" style={{ height: isMobile ? 32 : 44 }} />
        </div>
        {/* Кнопки по центру */}
        <div style={{
          position: isMobile ? 'static' : 'fixed',
          top: isMobile ? undefined : 32,
          left: isMobile ? undefined : '50%',
          transform: isMobile ? undefined : 'translateX(-50%)',
          display: 'flex',
          gap: isMobile ? 14 : 32,
          zIndex: 10,
          marginTop: isMobile ? 10 : 0,
          justifyContent: isMobile ? 'center' : undefined,
        }}>
          <button style={{ background: 'none', color: '#fff', fontWeight: 700, fontSize: isMobile ? 15 : 17, border: 'none', boxShadow: 'none', cursor: 'pointer', padding: 0, transition: 'color 0.2s', textDecoration: 'underline' }} onClick={() => window.open('https://t.me/linkerofficial', '_blank')}>Telegram</button>
          <button style={{ background: 'none', color: '#fff', fontWeight: 700, fontSize: isMobile ? 15 : 17, border: 'none', boxShadow: 'none', cursor: 'pointer', padding: 0, transition: 'color 0.2s', textDecoration: 'underline' }}>Support</button>
        </div>
        {/* Кнопки справа */}
        <div style={{ display: 'flex', gap: isMobile ? 8 : 18, alignItems: 'center', marginRight: isMobile ? 0 : 64, marginTop: isMobile ? 10 : 0 }}>
          <button
            style={{ background: 'none', color: '#fff', fontWeight: 700, fontSize: isMobile ? 15 : 17, border: '2px solid #fff', borderRadius: 22, padding: isMobile ? '6px 18px' : '8px 28px', boxShadow: 'none', cursor: 'pointer', transition: 'color 0.2s, border 0.2s', marginRight: 0 }}
            onClick={() => window.location.href = '/auth/register'}
          >Создать аккаунт</button>
          <button
            style={{ background: '#fff', color: '#23272f', fontWeight: 700, fontSize: isMobile ? 15 : 17, borderRadius: 22, padding: isMobile ? '6px 18px' : '8px 28px', border: 'none', boxShadow: '0 2px 12px #0002', cursor: 'pointer', transition: 'background 0.2s', maxWidth: isMobile ? 100 : 120, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
            onClick={() => window.location.href = '/auth/login'}
          >Войти</button>
        </div>
      </header>
      {/* Контент */}
      <div
        style={{
          display: isMobile ? 'block' : 'flex',
          alignItems: isMobile ? undefined : 'center',
          justifyContent: isMobile ? undefined : 'flex-start',
          height: '100vh',
          width: '100vw',
          position: 'relative',
          zIndex: 1,
        }}
      >
        {/* Для мобильных: текст и анимация под кнопками */}
        {isMobile && (
          <div style={{ marginTop: 120, padding: '0 8px' }}>
            <h1
              style={{
                fontSize: 26,
                fontWeight: 900,
                color: '#fff',
                marginBottom: 10,
                lineHeight: 1.08,
                letterSpacing: 1,
                textAlign: 'center',
              }}
            >
              Linker Social Зашифровано. Быстро.
            </h1>
            <p
              style={{
                fontSize: 14,
                color: '#b3c2e6',
                marginBottom: 14,
                fontWeight: 400,
                lineHeight: 1.4,
                textAlign: 'center',
              }}
            >
              Анонимный, полностью зашифрованный мессенджер для быстрого общения, обмена эмоциями и безопасного обмена моментами жизни.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', margin: '18px 0' }}>
              <div
                style={{
                  width: 120,
                  height: 120,
                  maxWidth: '100%',
                  maxHeight: '20vh',
                }}
              >
                <LottiePlayer src="/aui/hello.json" width={120} height={120} loop={true} />
              </div>
            </div>
          </div>
        )}
        {/* Для десктопа: текст и анимация слева/справа */}
        {!isMobile && (
          <>
            <div
              style={{
                flex: 1,
                maxWidth: 600,
                paddingLeft: 64,
                paddingTop: 120,
                paddingRight: 0,
                textAlign: 'left',
              }}
            >
              <h1
                style={{
                  fontSize: 64,
                  fontWeight: 900,
                  color: '#fff',
                  marginBottom: 18,
                  lineHeight: 1.08,
                  letterSpacing: 1,
                }}
              >
                Linker Social Зашифровано. Быстро.
              </h1>
              <p
                style={{
                  fontSize: 22,
                  color: '#b3c2e6',
                  marginBottom: 32,
                  fontWeight: 400,
                  lineHeight: 1.4,
                }}
              >
                Анонимный, полностью зашифрованный мессенджер для быстрого общения, обмена эмоциями и безопасного обмена моментами жизни.
              </p>
            </div>
            <div
              style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                height: '100vh',
                minWidth: 320,
                marginTop: 0,
              }}
            >
              <div
                style={{
                  width: 320,
                  height: 320,
                  maxWidth: '100%',
                  maxHeight: '60vh',
                }}
              >
                <LottiePlayer src="/aui/hello.json" width={320} height={320} loop={true} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};



export default Landing;




import React, { useState, useEffect } from "react";
import Head from "next/head";
import LottiePlayer from "../lib/LottiePlayer";

const Landing: React.FC = () => {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= 600);
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <>
      <Head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
        <title>Linker Social — Зашифровано. Быстро.</title>
      </Head>
      <div style={{ background: '#111', minHeight: '100vh', width: '100vw', position: 'relative', overflow: 'hidden', fontFamily: 'Segoe UI, Arial, sans-serif' }}>
        <div
          style={{
            minHeight: '100vh',
            width: '100vw',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            padding: isMobile ? '24px 8px 18px 8px' : '64px 0 0 0',
            boxSizing: 'border-box',
          }}
        >
          {/* Логотип */}
          <img src="/logo.svg" alt="Logo" style={{ height: isMobile ? 38 : 54, marginBottom: isMobile ? 18 : 32 }} />
          {/* Кнопки */}
          <div style={{ display: 'flex', gap: isMobile ? 10 : 32, marginBottom: isMobile ? 18 : 32, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button style={{ background: 'none', color: '#fff', fontWeight: 700, fontSize: isMobile ? 16 : 18, border: 'none', boxShadow: 'none', cursor: 'pointer', padding: 0, transition: 'color 0.2s', textDecoration: 'underline' }} onClick={() => window.open('https://t.me/linkerofficial', '_blank')}>Telegram</button>
            <button style={{ background: 'none', color: '#fff', fontWeight: 700, fontSize: isMobile ? 16 : 18, border: 'none', boxShadow: 'none', cursor: 'pointer', padding: 0, transition: 'color 0.2s', textDecoration: 'underline' }}>Support</button>
          </div>
          {/* Заголовок */}
          <h1
            style={{
              fontSize: isMobile ? 28 : 64,
              fontWeight: 900,
              color: '#fff',
              marginBottom: isMobile ? 12 : 24,
              lineHeight: isMobile ? 1.18 : 1.08,
              letterSpacing: 1,
              textAlign: 'center',
              maxWidth: 600,
            }}
          >
            Linker Social<br />Зашифровано. Быстро.
          </h1>
          {/* Описание */}
          <p
            style={{
              fontSize: isMobile ? 16 : 22,
              color: '#b3c2e6',
              marginBottom: isMobile ? 18 : 32,
              fontWeight: 400,
              lineHeight: 1.4,
              textAlign: 'center',
              maxWidth: 480,
            }}
          >
            Анонимный, полностью зашифрованный мессенджер для быстрого общения, обмена эмоциями и безопасного обмена моментами жизни.
          </p>
          {/* Кнопки регистрации/входа */}
          <div style={{ display: 'flex', gap: isMobile ? 10 : 18, alignItems: 'center', marginBottom: isMobile ? 18 : 32, flexWrap: 'wrap', justifyContent: 'center' }}>
            <button
              style={{ background: 'none', color: '#fff', fontWeight: 700, fontSize: isMobile ? 16 : 18, border: '2px solid #fff', borderRadius: 22, padding: isMobile ? '8px 22px' : '10px 32px', boxShadow: 'none', cursor: 'pointer', transition: 'color 0.2s, border 0.2s', marginRight: 0 }}
              onClick={() => window.location.href = '/auth/register'}
            >Создать аккаунт</button>
            <button
              style={{ background: '#fff', color: '#23272f', fontWeight: 700, fontSize: isMobile ? 16 : 18, borderRadius: 22, padding: isMobile ? '8px 22px' : '10px 32px', border: 'none', boxShadow: '0 2px 12px #0002', cursor: 'pointer', transition: 'background 0.2s', maxWidth: isMobile ? 120 : 140, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}
              onClick={() => window.location.href = '/auth/login'}
            >Войти</button>
          </div>
          {/* Lottie-анимация */}
          <div
            style={{
              width: isMobile ? 140 : 320,
              height: isMobile ? 140 : 320,
              maxWidth: '100%',
              maxHeight: isMobile ? '22vh' : '60vh',
              margin: isMobile ? '0 auto' : '0',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <LottiePlayer src="/aui/hello.json" width={isMobile ? 140 : 320} height={isMobile ? 140 : 320} loop={true} />
          </div>
        </div>
      </div>
    </>
  );
};



export default Landing;

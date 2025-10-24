


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
        {/* Верхняя панель */}
        <header
          style={{
            width: '100%',
            display: 'flex',
            alignItems: isMobile ? 'flex-start' : 'center',
            justifyContent: 'space-between',
            padding: isMobile ? '16px 8px 0 8px' : '32px 32px 0 32px',
            position: 'absolute',
            top: 0,
            left: 0,
            zIndex: 2,
            flexDirection: isMobile ? 'column' : 'row',
            gap: isMobile ? 10 : 0,
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
            gap: isMobile ? 10 : 32,
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
        <main
          style={{
            display: isMobile ? 'block' : 'flex',
            alignItems: isMobile ? undefined : 'center',
            justifyContent: isMobile ? undefined : 'flex-start',
            minHeight: '100vh',
            width: '100vw',
            position: 'relative',
            zIndex: 1,
            paddingTop: isMobile ? 70 : 120,
          }}
        >
          {/* Левая часть с текстом */}
          <section
            style={{
              flex: 1,
              maxWidth: isMobile ? '100%' : 600,
              paddingLeft: isMobile ? 12 : 64,
              paddingRight: isMobile ? 12 : 0,
              textAlign: isMobile ? 'center' : 'left',
              marginBottom: isMobile ? 24 : 0,
            }}
          >
            <h1
              style={{
                fontSize: isMobile ? 26 : 64,
                fontWeight: 900,
                color: '#fff',
                marginBottom: isMobile ? 10 : 18,
                lineHeight: 1.08,
                letterSpacing: 1,
              }}
            >
              Linker Social<br />Зашифровано. Быстро.
            </h1>
            <p
              style={{
                fontSize: isMobile ? 15 : 22,
                color: '#b3c2e6',
                marginBottom: isMobile ? 18 : 32,
                fontWeight: 400,
                lineHeight: 1.4,
              }}
            >
              Анонимный, полностью зашифрованный мессенджер для быстрого общения, обмена эмоциями и безопасного обмена моментами жизни.
            </p>
          </section>
          {/* Правая часть с Lottie-анимацией */}
          <section
            style={{
              flex: 1,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              height: isMobile ? 'auto' : '100vh',
              minWidth: isMobile ? '100%' : 320,
              marginTop: isMobile ? 18 : 0,
            }}
          >
            <div
              style={{
                width: isMobile ? 140 : 320,
                height: isMobile ? 140 : 320,
                maxWidth: '100%',
                maxHeight: isMobile ? '22vh' : '60vh',
              }}
            >
              {/* Lottie-анимация hello.js */}
              <LottiePlayer src="/aui/hello.json" width={isMobile ? 140 : 320} height={isMobile ? 140 : 320} loop={true} />
            </div>
          </section>
        </main>
      </div>
    </>
  );
};



export default Landing;

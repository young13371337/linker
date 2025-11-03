import Head from 'next/head';
import ToastNotification from "../chat/ToastNotification";
import Lottie from "lottie-react";
import registerAnimation from "../../public/aui/register.json";

import { useState, useEffect } from "react";
import { useRouter } from "next/router";

export default function RegisterPage() {
  const [toast, setToast] = useState<{type: 'error'|'success', message: string}|null>(null);
  const [login, setLogin] = useState("");
  const [link, setLink] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();
  const siteKey = process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY as string | undefined;
  const [greReady, setGreReady] = useState(false);

  // Poll for grecaptcha availability (the script is loaded async in <Head>) and mark ready.
  useEffect(() => {
    if (!siteKey) return;
    let cancelled = false;
    const tryReady = () => {
      const g = (window as any).grecaptcha;
      if (g && typeof g.execute === 'function') {
        try {
          // prefer grecaptcha.ready callback if available
          g.ready(() => { if (!cancelled) setGreReady(true); });
        } catch (e) {
          if (!cancelled) setGreReady(true);
        }
        return true;
      }
      return false;
    };

    if (tryReady()) return;
    const iv = setInterval(() => { if (tryReady()) clearInterval(iv); }, 300);
    const to = setTimeout(() => { clearInterval(iv); if (!cancelled) setGreReady(false); }, 15000);
    return () => { cancelled = true; clearInterval(iv); clearTimeout(to); };
  }, [siteKey]);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Пример логики, можно заменить на свою
    if (!login || !password || !link) {
      setToast({ type: 'error', message: 'Заполните все поля' });
      return;
    }
    // client-side validation for link: only letters, numbers and underscore, 3..32
    const re = /^[A-Za-z0-9_]{3,32}$/;
    if (!re.test(link)) {
      setToast({ type: 'error', message: 'Неверный формат линка (A-Z, 0-9, _ , 3-32 символа)' });
      return;
    }
    try {
      // If reCAPTCHA is configured, obtain a token first
      let recaptchaToken: string | null = null;
      if (siteKey) {
        if (!greReady) {
          setToast({ type: 'error', message: 'reCAPTCHA инициализируется, подождите чуть-чуть' });
          return;
        }
        try {
          await (window as any).grecaptcha.ready();
          recaptchaToken = await (window as any).grecaptcha.execute(siteKey, { action: 'register' });
        } catch (e) {
          console.warn('reCAPTCHA execution failed', e);
          setToast({ type: 'error', message: 'Не удалось получить reCAPTCHA токен. Попробуйте позже.' });
          return;
        }
      }

      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password, link, recaptchaToken }),
      });
      const data = await res.json();
      if (res.ok) {
        // Перенаправляем пользователя на страницу входа
        router.push('/auth/login');
        setToast({ type: 'success', message: "Регистрация успешна! Перенаправление..." });
      } else {
        setToast({ type: 'error', message: data.error || "Ошибка регистрации" });
      }
    } catch (e) {
      setToast({ type: 'error', message: "Сервер недоступен" });
    }
  };

  return (
    <>
      <Head>
        {/* Load reCAPTCHA only on the registration page when site key is configured */}
        {process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY && (
          <script src={`https://www.google.com/recaptcha/api.js?render=${process.env.NEXT_PUBLIC_RECAPTCHA_SITE_KEY}`} async />
        )}
      </Head>
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#111" }}>
      {/* Slightly raise the auth card for better button visibility while keeping centered */}
      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', transform: 'translateY(-6vh)' }}>
        <div style={{ display: "flex", justifyContent: "center", marginTop: 64, marginBottom: 18 }}>
          <div style={{ width: 220, height: 220 }}>
            <Lottie animationData={registerAnimation} loop={true} />
          </div>
        </div>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16, width: 360, maxWidth: "90vw", margin: "0 auto" }}>
        <input
          type="text"
          placeholder="Логин"
          value={login}
          onChange={e => setLogin(e.target.value)}
          required
          style={{ padding: "12px 16px", borderRadius: 8, border: "1px solid #333", background: "#222", color: "#fff", fontSize: 16, outline: "none" }}
        />
        <input
          type="text"
          placeholder="Линк"
          value={link}
          onChange={e => setLink(e.target.value)}
          required
          style={{ padding: "12px 16px", borderRadius: 8, border: "1px solid #333", background: "#222", color: "#fff", fontSize: 16, outline: "none" }}
        />
        <input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          style={{ padding: "12px 16px", borderRadius: 8, border: "1px solid #333", background: "#222", color: "#fff", fontSize: 16, outline: "none" }}
        />
        <button
          type="submit"
          disabled={!!siteKey && !greReady}
          style={{ width: "100%", padding: "12px 0", borderRadius: 8, border: "none", background: "#4fc3f7", color: "#111", fontWeight: 600, fontSize: 18, cursor: "pointer", transition: "background .2s", opacity: (!!siteKey && !greReady) ? 0.6 : 1 }}
        >
          {siteKey && !greReady ? 'Инициализация reCAPTCHA...' : 'Зарегистрироваться'}
        </button>
        {toast && (
          <ToastNotification
            type={toast.type}
            message={toast.message}
            onClose={()=>setToast(null)}
            duration={4000}
          />
        )}
        </form>
        <div style={{ marginTop: 18, textAlign: "center", fontSize: 15 }}>
          Уже есть аккаунт? <a href="/auth/login" style={{ color: "#4fc3f7" }}>Войти</a>
        </div>
      </div>
      {/* end raised wrapper */}
    </div>
    </>
  );
}

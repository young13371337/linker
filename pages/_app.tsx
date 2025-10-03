
import "../styles/globals.css";
import Head from "next/head";
import Sidebar from "../components/Sidebar";
import { SessionProvider } from "next-auth/react";

// ToastContainer — глобальный компонент для уведомлений
import { useEffect, useRef } from "react";

function ToastContainer() {
  const wsRef = useRef<WebSocket | null>(null);
  useEffect(() => {
    // Подключение к WebSocket (замените на свой адрес при деплое)
    const ws = new window.WebSocket('ws://localhost:3001');
    wsRef.current = ws;
    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'friend_request') {
          showToast(`Новая заявка в друзья от ${data.fromName || 'Пользователь'}`);
        } else if (data.type === 'login') {
          showToast(`Вход в аккаунт: ${data.device || 'Новое устройство'}`);
        } else if (data.type === 'profile_update') {
          showToast(`Профиль обновлён: ${data.userName || 'Пользователь'}`);
        }
      } catch {}
    };
    return () => { ws.close(); };
  }, []);
  // Глобальная функция показа toast
  function showToast(msg: string) {
    const id = "global-toast";
    let toast = document.getElementById(id);
    if (!toast) {
      toast = document.createElement("div");
      toast.id = id;
      toast.style.position = "fixed";
      toast.style.right = "32px";
      toast.style.bottom = "32px";
      toast.style.zIndex = "9999";
      toast.style.background = "#229ed9";
      toast.style.color = "#fff";
      toast.style.padding = "14px 28px";
      toast.style.borderRadius = "14px";
      toast.style.fontSize = "16px";
      toast.style.fontFamily = "Segoe UI, Verdana, Arial, sans-serif";
      toast.style.boxShadow = "0 4px 24px #0006";
      toast.style.transition = "opacity .3s";
      toast.style.opacity = "0";
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.style.opacity = "1";
    setTimeout(() => {
      if (toast) toast.style.opacity = "0";
    }, 2500);
  }
  return null;
}

export default function App({ Component, pageProps }: AppProps) {
  const isAuthPage = typeof window !== 'undefined' && ["/auth/login", "/auth/register", "/welcome"].includes(window.location.pathname);
  return (
    <>
      <Head>
        <title>Linker Social</title>
      </Head>
      <SessionProvider session={pageProps.session}>
        {!isAuthPage && <Sidebar />}
        <Component {...pageProps} />
        <ToastContainer />
      </SessionProvider>
    </>
  );
}

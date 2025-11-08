import "../styles/globals.css";
import Head from "next/head";
import Sidebar from "../components/Sidebar";
import { SessionProvider } from "next-auth/react";
import { useEffect, useRef, useState } from "react";

function ToastContainer() {
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
  const ws = new WebSocket('wss://websocket-ecru.vercel.app/');
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
      } catch (err) {
        console.error(err);
      }
    };

    return () => {
      ws.close();
    };
  }, []);

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
  toast.style.fontFamily = "Roboto, Verdana, Arial, sans-serif";
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

function MyApp({ Component, pageProps }: any) {
  const [isAuthPage, setIsAuthPage] = useState(false);

  useEffect(() => {
    const path = window.location.pathname;
    setIsAuthPage(["/auth/login", "/auth/register", "/welcome"].includes(path));
  }, []);

  return (
    <SessionProvider session={pageProps.session}>
      <Head>
        <title>Linker Social</title>
      </Head>
      {!isAuthPage && <Sidebar />}
      <Component {...pageProps} />
      <ToastContainer />
    </SessionProvider>
  );
}

// ✅ Обязательный дефолтный экспорт
export default MyApp;

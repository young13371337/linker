
import "../styles/globals.css";
import Head from "next/head";
import type { AppProps } from "next/app";
import Sidebar from "../components/Sidebar";
import { SessionProvider } from "next-auth/react";

// ToastContainer — глобальный компонент для уведомлений

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
  {/* ToastContainer удалён, уведомления больше не используются */}
      </SessionProvider>
    </>
  );
}

import Sidebar from "../components/Sidebar";
import type { AppProps } from "next/app";
import "../styles/globals.css";
import { SessionProvider } from "next-auth/react";

export default function App({ Component, pageProps: { session, ...pageProps } }: AppProps) {
  // Hide sidebar on login/register pages
  const isAuthPage = typeof window !== 'undefined' && ["/auth/login", "/auth/register", "/welcome"].includes(window.location.pathname);
  return (
    <SessionProvider session={session}>
      {!isAuthPage && <Sidebar />}
      <Component {...pageProps} />
    </SessionProvider>
  );
}

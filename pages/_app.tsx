import "../styles/globals.css";
import Head from "next/head";
import type { AppProps } from "next/app";
import Sidebar from "../components/Sidebar";
import { SessionProvider } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function App({ Component, pageProps }: AppProps) {
  const router = useRouter();
  // Главная страница доступна всем, редирект убран
  const hideSidebarRoutes = ["/auth/login", "/auth/register", "/"];
  const showSidebar = !hideSidebarRoutes.includes(router.pathname);
  return (
    <>
      <Head>
        <title>Linker Social</title>
      </Head>
      <SessionProvider session={pageProps.session}>
  {showSidebar && <Sidebar />}
        <Component {...pageProps} />
      </SessionProvider>
    </>
  );
}
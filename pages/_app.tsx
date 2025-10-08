import "../styles/globals.css";
import Head from "next/head";
import type { AppProps } from "next/app";
import Sidebar from "../components/Sidebar";
import { SessionProvider } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function App({ Component, pageProps }: AppProps) {
  const [showSidebar, setShowSidebar] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const authPages = ["/auth/login", "/auth/register", "/welcome"];
    const handleRouteChange = (url: string) => {
      setShowSidebar(!authPages.includes(url));
    };
    handleRouteChange(router.pathname);
    router.events.on("routeChangeComplete", handleRouteChange);
    return () => {
      router.events.off("routeChangeComplete", handleRouteChange);
    };
  }, [router]);

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
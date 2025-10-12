import "../styles/globals.css";
import Head from "next/head";
import type { AppProps } from "next/app";
import Sidebar from "../components/Sidebar";
import { SessionProvider } from "next-auth/react";
import { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Linker Social</title>
      </Head>
      <SessionProvider session={pageProps.session}>
        <Sidebar />
        <Component {...pageProps} />
      </SessionProvider>
    </>
  );
}
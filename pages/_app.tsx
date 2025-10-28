import "../styles/globals.css";
import Head from "next/head";
import type { AppProps } from "next/app";
import dynamic from "next/dynamic";
import { SessionProvider, useSession } from "next-auth/react";
import { useEffect } from "react";
import { useRouter } from "next/router";
import { SWRConfig, mutate } from "swr";
import { swrConfig, profileKey, chatsKey, messagesKey } from "../lib/hooks";
import { Toaster, toast } from 'react-hot-toast';
import { MessageToast } from '../components/MessageToast';
import { getPusherClient } from '../lib/pusher';
import { useRef } from 'react';

const Sidebar = dynamic(() => import("../components/Sidebar"), { ssr: false });

function MainApp({ Component, pageProps }: AppProps) {
  const router = useRouter();
  const { data: session } = useSession();

  // Главная страница доступна всем, редирект убран
  const hideSidebarRoutes = ["/auth/login", "/auth/register", "/"];
  const showSidebar = !hideSidebarRoutes.includes(router.pathname);

  useEffect(() => {
    if (!session?.user?.id) return;
    const userId = (session.user as any).id;
    let cancelled = false;

    const prefetch = async () => {
      // prefetch profile
      try {
        const pKey = profileKey(userId);
        const profileRes = await fetch(pKey, { credentials: 'include' });
        const profileJson = await profileRes.json().catch(() => null);
        if (!cancelled) await mutate(pKey, profileJson, false);
      } catch (e) {}

      // prefetch chats and recent messages for top chats
      try {
        const chatsRes = await fetch(chatsKey, { credentials: 'include' });
        const chatsJson = await chatsRes.json().catch(() => null);
        if (!cancelled) await mutate(chatsKey, chatsJson, false);

        const chatsList = (chatsJson && (chatsJson.chats || chatsJson)) || [];
        const top = chatsList.slice(0, 6);
        await Promise.all(
          top.map(async (c: any) => {
            try {
              const mKey = messagesKey(c.id);
              const mRes = await fetch(mKey, { credentials: 'include' });
              const mJson = await mRes.json().catch(() => null);
              if (!cancelled) await mutate(mKey, mJson, false);
            } catch (e) {}
          })
        );
      } catch (e) {}
    };

    prefetch();

    return () => {
      cancelled = true;
    };
  }, [session?.user?.id]);

  // Global Pusher listener for incoming messages -> show toast on any page
  const audioRef = useRef<HTMLAudioElement | null>(null);
  useEffect(() => {
    if (!session?.user?.id) return;
    const userId = (session.user as any).id;
    const channelName = `user-${userId}`;

    try {
      const pusherClient = getPusherClient();
      if (!pusherClient) return;
      const channel = pusherClient.subscribe(channelName);
      const handler = (data: any) => {
        // data expected: { chatId, senderId, senderAvatar, senderName, senderRole?, content }
        // if user currently viewing the same chat, skip the toast
        try {
          const onChatPage = router.pathname === '/chat/[id]';
          const currentChatId = onChatPage ? String(router.query.id || '') : '';
          if (onChatPage && currentChatId && data.chatId && String(data.chatId) === currentChatId) {
            // optionally still play sound? we skip toast to avoid duplication
            return;
          }
        } catch (e) {}

        try {
          audioRef.current?.play().catch(() => {});
        } catch (e) {}

        toast.custom((t) => (
          <MessageToast
            t={t}
            avatar={data.senderAvatar || '/media/linker/hello.png'}
            username={data.senderName || 'Новый пользователь'}
            role={data.senderRole}
            message={data.content || ''}
            chatId={data.chatId}
          />
        ));
      };

      channel.bind('new-message', handler);

      return () => {
        try { channel.unbind('new-message', handler); } catch (e) {}
        try { pusherClient.unsubscribe(channelName); } catch (e) {}
      };
    } catch (e) {
      // ignore
    }
  }, [session?.user?.id]);

  return (
    <>
      <Head>
        <title>Linker Social</title>
      </Head>
      {showSidebar && <Sidebar />}
      <Component {...pageProps} />
      <Toaster position="top-right" />
      {/* Audio fallback: try /sounds first (existing), then /sound */}
      <audio ref={audioRef} preload="none">
        <source src="/sounds/notification.mp3" />
        <source src="/sound/notification.mp3" />
        Your browser does not support the audio element.
      </audio>
    </>
  );
}

export default function App(props: AppProps) {
  return (
    <SessionProvider session={props.pageProps.session}>
      <SWRConfig value={swrConfig}>
        <MainApp {...props} />
      </SWRConfig>
    </SessionProvider>
  );
}
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
  const synthFallbackRef = useRef<boolean>(false);
  const audioContextRef = useRef<any>(null);

  // Try to detect whether notification file exists; if not, enable synth fallback
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await fetch('/sounds/notification.mp3', { method: 'HEAD' });
        if (!mounted) return;
        if (!res.ok) {
          // try fallback path
          const res2 = await fetch('/sound/notification.mp3', { method: 'HEAD' });
          synthFallbackRef.current = !res2.ok;
        } else {
          synthFallbackRef.current = false;
        }
      } catch (e) {
        synthFallbackRef.current = true;
      }
    })();
    return () => { mounted = false; };
  }, []);

  const playSynth = () => {
    try {
      if (!audioContextRef.current) audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const ctx = audioContextRef.current;
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.value = 880;
      g.gain.value = 0.05;
      o.connect(g);
      g.connect(ctx.destination);
      o.start();
      setTimeout(() => { try { o.stop(); } catch (e) {} }, 150);
    } catch (e) {
      // last-resort no-op
    }
  };

  const playSound = async () => {
    try {
      if (synthFallbackRef.current) {
        playSynth();
        return;
      }
      const audio = audioRef.current;
      if (audio) {
        const p = audio.play();
        if (p && typeof p.then === 'function') {
          await p.catch(() => {
            // autoplay blocked — don't crash, fallback to synth
            playSynth();
          });
        }
      } else {
        playSynth();
      }
    } catch (e) {
      playSynth();
    }
  };
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
          playSound();
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

  // Sliding session refresh on user activity.
  // We'll call /api/auth/session (no-store) to force NextAuth to refresh the JWT when updateAge=0.
  // Throttle calls to once every 25 seconds to avoid spamming the server.
  useEffect(() => {
    if (!session) return;
    let mounted = true;
    const lastRef = { last: 0 } as { last: number };

    const doRefresh = async () => {
      try {
        const now = Date.now();
        if (now - lastRef.last < 25_000) return; // throttle 25s
        lastRef.last = now;
        // call NextAuth session endpoint to force refresh (updateAge=0 will make backend refresh)
        await fetch('/api/auth/session', { credentials: 'include', cache: 'no-store' }).catch(() => null);
      } catch (e) {
        // ignore
      }
    };

    const onActivity = () => {
      if (!mounted) return;
      void doRefresh();
    };

    // Listen to a set of user interactions
    window.addEventListener('mousemove', onActivity);
    window.addEventListener('keydown', onActivity);
    window.addEventListener('click', onActivity);
    window.addEventListener('touchstart', onActivity);
    window.addEventListener('scroll', onActivity, { passive: true });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') onActivity();
    });

    // also refresh once on mount
    void doRefresh();

    return () => {
      mounted = false;
      window.removeEventListener('mousemove', onActivity);
      window.removeEventListener('keydown', onActivity);
      window.removeEventListener('click', onActivity);
      window.removeEventListener('touchstart', onActivity);
      window.removeEventListener('scroll', onActivity);
    };
  }, [session]);

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
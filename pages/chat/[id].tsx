import Pusher from 'pusher-js';
import React, { useEffect, useState, useRef } from 'react';
import Head from 'next/head';
import { FaPaperPlane, FaCheck, FaCheckDouble } from 'react-icons/fa';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';

// Кастомный компонент для голосовых сообщений
const VoiceMessage: React.FC<{ audioUrl: string; isOwn?: boolean }> = ({ audioUrl, isOwn }) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onLoaded = () => setDuration(audio.duration);
    const onTime = () => setCurrent(audio.currentTime);
    audio.addEventListener('loadedmetadata', onLoaded);
    audio.addEventListener('timeupdate', onTime);
    return () => {
      audio.removeEventListener('loadedmetadata', onLoaded);
      audio.removeEventListener('timeupdate', onTime);
    };
  }, []);

  const playAudio = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.play();
    setPlaying(true);
    audio.onended = () => setPlaying(false);
  };

  const pauseAudio = () => {
    const audio = audioRef.current;
    if (!audio) return;
    audio.pause();
    setPlaying(false);
  };

  const formatTime = (t: number) => {
    const m = Math.floor(t / 60);
    const s = Math.floor(t % 60);
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
  };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      background: isOwn ? 'linear-gradient(90deg,#229ed9 60%,#1e2a3a 100%)' : 'linear-gradient(90deg,#222 60%,#23243a 100%)',
      borderRadius: 16, padding: '8px 18px', boxShadow: '0 2px 8px #2222', minWidth: 120, maxWidth: 320
    }}>
      {!playing ? (
        <button
          onClick={playAudio}
          style={{
            width: 36, height: 36, borderRadius: '50%', background: '#fff',
            border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px #229ed933', cursor: 'pointer', transition: 'background .2s', marginRight: 2
          }}
          aria-label="Воспроизвести"
        >
          <svg width={22} height={22} viewBox="0 0 24 24"><polygon points="6,4 20,12 6,20" fill="#229ed9"/></svg>
        </button>
      ) : (
        <button
          onClick={pauseAudio}
          style={{
            width: 36, height: 36, borderRadius: '50%', background: '#229ed9',
            border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 6px #229ed933', cursor: 'pointer', transition: 'background .2s', marginRight: 2
          }}
          aria-label="Пауза"
        >
          <svg width={22} height={22} viewBox="0 0 24 24"><rect x="6" y="5" width="4" height="14" fill="#fff"/><rect x="14" y="5" width="4" height="14" fill="#fff"/></svg>
        </button>
      )}
      <audio ref={audioRef} src={audioUrl.startsWith('/') ? audioUrl : '/' + audioUrl} style={{ display: 'none' }} />
      <div style={{ flex: 1 }}>
        <div style={{ height: 4, background: '#229ed9', borderRadius: 2, position: 'relative', marginBottom: 4 }}>
          <div style={{ position: 'absolute', left: 0, top: 0, height: 4, borderRadius: 2, background: '#fff', width: duration ? `${(current/duration)*100}%` : '0%' }} />
        </div>
        <div style={{ fontSize: 13, color: '#fff', fontWeight: 500 }}>{formatTime(current)} / {formatTime(duration)}</div>
      </div>
      {/* Индикатор звука удалён по запросу */}
    </div>
  );
};

interface Message {
  id: string;
  sender: string;
  text: string;
  createdAt: string;
  audioUrl?: string;
}

const ChatWithFriend: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [friend, setFriend] = useState<{id: string, name: string, avatar?: string | null, role?: string} | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);
  const [hoveredMsgId, setHoveredMsgId] = useState<string | null>(null);
  const [isTyping, setIsTyping] = useState<string | null>(null);
  const [isSpeaking, setIsSpeaking] = useState<string | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordTime, setRecordTime] = useState(0);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordInterval = useRef<NodeJS.Timeout | null>(null);
  const chatScrollRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const { id } = router.query;
  const { data: session, status } = useSession();
  const [lastMsgId, setLastMsgId] = useState<string | null>(null); // для анимации
  const [animatedMsgIds, setAnimatedMsgIds] = useState<Set<string>>(new Set()); // ids для анимации

  // Компонент индикатора "печатает..."
  const TypingIndicator = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, marginLeft: 8 }}>
      <span style={{ color: '#bbb', fontSize: 14 }}>{isTyping} печатает</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', height: 16 }}>
        <span className="typing-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#229ed9', margin: '0 2px', opacity: 0.7, animation: 'typingDot 1.2s infinite', animationDelay: '0s' }} />
        <span className="typing-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#229ed9', margin: '0 2px', opacity: 0.7, animation: 'typingDot 1.2s infinite', animationDelay: '0.3s' }} />
        <span className="typing-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#229ed9', margin: '0 2px', opacity: 0.7, animation: 'typingDot 1.2s infinite', animationDelay: '0.6s' }} />
      </span>
      <style>{`
        @keyframes typingDot {
          0% { transform: translateY(0); opacity: 0.7; }
          20% { transform: translateY(-4px); opacity: 1; }
          40% { transform: translateY(0); opacity: 0.7; }
        }
      `}</style>
    </div>
  );
  // Компонент индикатора "говорит..."
  const SpeakingIndicator = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, marginLeft: 8 }}>
      <span style={{ color: '#bbb', fontSize: 14 }}>{isSpeaking} говорит</span>
      <span style={{ display: 'inline-flex', alignItems: 'center', height: 16 }}>
        <span className="typing-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#76e08a', margin: '0 2px', opacity: 0.7, animation: 'typingDot 1.2s infinite', animationDelay: '0s' }} />
        <span className="typing-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#76e08a', margin: '0 2px', opacity: 0.7, animation: 'typingDot 1.2s infinite', animationDelay: '0.3s' }} />
        <span className="typing-dot" style={{ width: 6, height: 6, borderRadius: '50%', background: '#76e08a', margin: '0 2px', opacity: 0.7, animation: 'typingDot 1.2s infinite', animationDelay: '0.6s' }} />
      </span>
    </div>
  );

  // Функция остановки записи
  const stopRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach((track: any) => track.stop());
      audioChunksRef.current = [];
    }
  };
  const cancelRecording = () => {
    if (mediaRecorder && isRecording) {
      mediaRecorder.onstop = null; // отключаем обработчик отправки
      mediaRecorder.stop();
      mediaRecorder.stream.getTracks().forEach((track: any) => track.stop());
      audioChunksRef.current = [];
      setIsRecording(false);
      setRecordTime(0);
    }
  };

  // Подключение к Pusher для получения новых сообщений
  useEffect(() => {
    if (!chatId || !session) return;
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY || '', {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || '',
      forceTLS: true,
    });
    const channel = pusher.subscribe(`chat-${chatId}`);
    channel.bind('new-message', (msg: Message) => {
      setMessages((prev) => {
        if (prev.some((m) => m.id === msg.id)) return prev;
        return [...prev, msg];
      });
    });
    // --- обработка события "typing" ---
    let typingTimeout: NodeJS.Timeout | null = null;
    channel.bind('typing', (data: { userId: string, name: string }) => {
      // показывать только если не текущий пользователь
      if (data.userId !== (session.user as any).id) {
        setIsTyping(data.name || 'Друг');
        if (typingTimeout) clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => setIsTyping(null), 2000); // скрыть через 2 сек
      }
    });
    return () => {
      channel.unbind_all();
      channel.unsubscribe();
      pusher.disconnect();
      if (typingTimeout) clearTimeout(typingTimeout);
    };
  }, [chatId, session]);
  // --- Автоскролл только при добавлении нового сообщения ---
  useEffect(() => {
    if (chatScrollRef.current) {
      chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
    }
  }, [messages.length]);

  // Загрузка данных чата и друга
  useEffect(() => {
    if (status === "loading" || !session) return;
    const userId = (session?.user && (session.user as any).id) ? (session.user as any).id : undefined;
    if (!id || !userId) return;
    // Получить профиль друга
    fetch(`/api/profile?userId=${id}`, { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.user) {
          setFriend({
            id: data.user.id,
            name: data.user.login,
            avatar: data.user.avatar || null,
            role: data.user.role || undefined
          });
          try {
            localStorage.setItem('chat-friend', JSON.stringify({
              id: data.user.id,
              name: data.user.login,
              avatar: data.user.avatar || null,
              role: data.user.role || undefined
            }));
          } catch {}
        } else {
          setFriend(null);
        }
      });
    // Получить или создать чат между двумя пользователями
    fetch(`/api/chats?userIds=${userId},${id}`)
      .then(res => res.json())
      .then(data => {
        if (data && data.chat && data.chat.id) {
          setChatId(data.chat.id);
          // Получить сообщения
          fetch(`/api/messages?chatId=${data.chat.id}`, { credentials: 'include' })
            .then(res => res.json())
            .then(data => {
              if (Array.isArray(data.messages)) {
                const msgs = data.messages.map((msg: any) => ({
                  id: msg.id,
                  sender: msg.senderId,
                  text: msg.text,
                  createdAt: msg.createdAt,
                  audioUrl: msg.audioUrl || undefined
                }));
                setMessages(msgs);
                try {
                  localStorage.setItem('chat-messages', JSON.stringify(msgs));
                } catch {}
              } else {
                setMessages([]);
                try { localStorage.removeItem('chat-messages'); } catch {}
              }
            });
        } else {
          setChatId(null);
          setMessages([]);
          try { localStorage.removeItem('chat-messages'); } catch {}
        }
      });
  }, [id, session, status]);

  useEffect(() => {
    if (session) {
      console.log('session:', session);
    }
  }, [session]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !chatId || !session) return;
    fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ chatId, text: newMessage })
    })
      .then(res => res.json())
      .then((data) => {
        if (data.message) {
          setMessages([...messages, {
            id: data.message.id,
            sender: data.message.senderId,
            text: data.message.text,
            createdAt: data.message.createdAt
          }]);
          setAnimatedMsgIds(prev => {
            const next = new Set(prev);
            next.add(data.message.id);
            return next;
          });
        }
        setNewMessage('');
      });
  };

  // Показываем UI сразу, даже если данные ещё не загружены
  if (!session) {
    return (
      <div style={{minHeight:'100vh',display:'flex',alignItems:'flex-start',justifyContent:'center',background:'#111'}}>
        <div style={{marginTop:80,color:'#bbb',fontSize:22,fontWeight:500}}>
          Для общения в чате нужно авторизоваться.
        </div>
      </div>
    );
  }

  // Адаптивные стили для ПК и мобильных
  const isMobile = typeof window !== 'undefined' ? window.innerWidth <= 600 : false;
  const chatContainerStyle = isMobile
    ? {
        width: '100%',
        maxWidth: '480px',
        minWidth: '0',
        height: '100vh',
        background: 'linear-gradient(120deg,#18191c 60%,#23242a 100%)',
        borderRadius: '0',
        boxShadow: '0 4px 32px #000c',
        margin: '0',
        display: 'flex',
        flexDirection: 'column' as const,
        padding: '12px 6px 8px 6px',
    position: 'relative' as const,
      }
    : {
        width: '100%',
        maxWidth: '480px',
        minWidth: '260px',
        height: '48vh',
        background: 'linear-gradient(120deg,#18191c 60%,#23242a 100%)',
        borderRadius: '18px',
        boxShadow: '0 4px 32px #000c',
        margin: '0 auto',
        display: 'flex',
        flexDirection: 'column' as const,
        padding: '22px 18px 16px 18px',
        position: 'relative' as const,
      };
  const avatarStyle = isMobile
    ? { width: '44px', height: '44px', borderRadius: '50%', objectFit: 'cover' as const, background: '#222', boxShadow: '0 2px 8px #2226' }
    : { width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' as const, background: '#222', boxShadow: '0 2px 8px #2226' };
  const nameStyle = isMobile
    ? { fontWeight: 600, fontSize: '18px', color: '#e3e8f0', display: 'flex', alignItems: 'center', gap: '6px' }
    : { fontWeight: 600, fontSize: '17px', color: '#e3e8f0', display: 'flex', alignItems: 'center', gap: '6px' };
  const messageStyle = isMobile
  ? { background: '#229ed9', color: '#fff', padding: '10px 18px', borderRadius: '12px', display: 'inline-block', boxShadow: '0 2px 6px #2222', fontSize: '16px', maxWidth: '80vw', wordBreak: 'break-word' as const, position: 'relative' as 'relative' }
  : { background: '#229ed9', color: '#fff', padding: '7px 14px', borderRadius: '9px', display: 'inline-block', boxShadow: '0 2px 6px #2222', fontSize: '14px', position: 'relative' as 'relative' };
  const inputStyle = isMobile
    ? { flex: 1, padding: '14px 16px', borderRadius: '12px', border: 'none', background: '#18191c', color: '#fff', fontSize: '16px', boxShadow: '0 2px 6px #2222', outline: 'none', minWidth: '0' }
    : { flex: 1, padding: '9px 12px', borderRadius: '9px', border: 'none', background: '#18191c', color: '#fff', fontSize: '14px', boxShadow: '0 2px 6px #2222', outline: 'none' };
  const buttonStyle = isMobile
    ? { width: 44, height: 44, borderRadius: '50%', background: '#229ed9', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, boxShadow: '0 2px 6px #229ed933', transition: 'background .2s', cursor: 'pointer' }
    : { width: 36, height: 36, borderRadius: '50%', background: '#229ed9', color: '#fff', border: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, boxShadow: '0 2px 6px #229ed933', transition: 'background .2s', cursor: 'pointer' };
  return (
    <>
      <Head>
        <style>{`
          .chat-messages-scroll {
            overflow-y: auto;
            scrollbar-width: thin;
            scrollbar-color: rgba(180,216,255,0.35) rgba(34,34,34,0.1);
          }
          .chat-messages-scroll::-webkit-scrollbar {
            width: 8px;
            background: rgba(34,34,34,0.1);
          }
          .chat-messages-scroll::-webkit-scrollbar-thumb {
            background: linear-gradient(120deg,rgba(180,216,255,0.35),rgba(34,158,217,0.25));
            border-radius: 8px;
            opacity: 0.5;
            transition: opacity 0.2s;
          }
          .chat-messages-scroll:hover::-webkit-scrollbar-thumb {
            opacity: 0.8;
          }
          /* Анимация появления сообщения */
          .chat-msg-appear {
            animation: chatMsgFadeIn 0.38s cubic-bezier(.23,1.02,.36,1) both;
          }
          @keyframes chatMsgFadeIn {
            from {
              opacity: 0;
              transform: translateY(18px) scale(0.98);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
        `}</style>
      </Head>
      <div
        style={{
          minHeight: '100vh',
          background: '#111',
          color: '#e3e8f0',
          fontFamily: 'Segoe UI,Arial,sans-serif',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
        }}
      >
        <div style={chatContainerStyle}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginBottom: isMobile ? 10 : 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => router.push('/chat')}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                marginRight: 6,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                color: '#bbb',
                fontSize: isMobile ? 28 : 22,
                transition: 'color 0.2s',
              }}
              title="Назад к чатам"
              aria-label="Назад к чатам"
              onMouseOver={e => (e.currentTarget.style.color = '#229ed9')}
              onMouseOut={e => (e.currentTarget.style.color = '#bbb')}
            >
              <svg width={isMobile ? 28 : 22} height={isMobile ? 28 : 22} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M15.5 19L9.5 12L15.5 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <img src={friend?.avatar || '/window.svg'} alt="avatar" style={avatarStyle} />
            <span style={nameStyle}>
              {friend?.name || <span style={{color:'#888'}}>Загрузка...</span>}
              {/* Иконка роли */}
              {friend?.role === 'admin' && <img src="/role-icons/admin.svg" alt="admin" title="Админ" style={{ width: 16, height: 16, marginLeft: 2 }} />}
              {friend?.role === 'moderator' && <img src="/role-icons/moderator.svg" alt="moderator" title="Модератор" style={{ width: 16, height: 16, marginLeft: 2 }} />}
              {friend?.role === 'verif' && <img src="/role-icons/verif.svg" alt="verif" title="Верифицирован" style={{ width: 16, height: 16, marginLeft: 2 }} />}
              {friend?.role === 'pepe' && <img src="/role-icons/pepe.svg" alt="pepe" title="Пепешка" style={{ width: 16, height: 16, marginLeft: 2 }} />}
            </span>
          </div>
        </div>
        <div
            className="chat-messages-scroll"
            style={{
              flex: 1,
              borderRadius: 16,
              padding: '4px 0',
              marginBottom: isMobile ? 10 : 12,
              display: 'flex',
              flexDirection: 'column',
              gap: isMobile ? 8 : 6,
              minHeight: 0,
              maxHeight: isMobile ? 'calc(100vh - 180px)' : '32vh',
              overflowY: 'auto',
              background: '#232228', // светло-серый/серый фон как на скрине
              boxShadow: '0 2px 16px #0002',
            }}
            ref={chatScrollRef}
        >
          {messages.length === 0 ? (
            <div style={{ color: '#bbb', fontSize: 16, textAlign: 'center', marginTop: 32 }}><i>Нет сообщений</i></div>
          ) : (
            (() => {
              // Группировка сообщений по дням
              const groups: { label: string; date: string; items: Message[] }[] = [];
              const today = new Date();
              const yesterday = new Date();
              yesterday.setDate(today.getDate() - 1);
              const dayBeforeYesterday = new Date();
              dayBeforeYesterday.setDate(today.getDate() - 2);
              function getDayLabel(dateStr: string) {
                const date = new Date(dateStr);
                const d = date.getDate(), m = date.getMonth(), y = date.getFullYear();
                if (d === today.getDate() && m === today.getMonth() && y === today.getFullYear()) return 'Сегодня';
                if (d === yesterday.getDate() && m === yesterday.getMonth() && y === yesterday.getFullYear()) return 'Вчера';
                if (d === dayBeforeYesterday.getDate() && m === dayBeforeYesterday.getMonth() && y === dayBeforeYesterday.getFullYear()) return 'Позавчера';
                return date.toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });
              }
              let lastDate = '';
              messages.forEach(msg => {
                const date = new Date(msg.createdAt);
                const dateKey = date.toISOString().slice(0, 10);
                if (!groups.length || groups[groups.length - 1].date !== dateKey) {
                  groups.push({ label: getDayLabel(msg.createdAt), date: dateKey, items: [msg] });
                } else {
                  groups[groups.length - 1].items.push(msg);
                }
              });
              return groups.map(group => (
                <React.Fragment key={group.date}>
                  <div style={{ textAlign: 'center', color: '#bbb', fontWeight: 500, fontSize: 15, margin: '18px 0 8px 0', letterSpacing: 0.5 }}>
                    {group.label}
                  </div>
                  {group.items.map((msg) => {
                    const isOwn = msg.sender === (session?.user as any)?.id;
                    // --- callback ref для анимации только для новых сообщений ---
                    const getMsgRef = (el: HTMLDivElement | null) => {
                      if (el && animatedMsgIds.has(msg.id)) {
                        el.classList.add('chat-msg-appear');
                        setTimeout(() => {
                          el.classList.remove('chat-msg-appear');
                          setAnimatedMsgIds(prev => {
                            const next = new Set(prev);
                            next.delete(msg.id);
                            return next;
                          });
                        }, 400);
                      }
                    };
                    return (
                      <div
                        key={msg.id}
                        ref={getMsgRef}
                        className={animatedMsgIds.has(msg.id) ? 'chat-msg-appear' : ''}
                        style={{
                          marginBottom: 0,
                          display: 'flex',
                          flexDirection: 'row',
                          justifyContent: isOwn ? 'flex-end' : 'flex-start',
                          width: '100%',
                          position: 'relative',
                          alignItems: 'center',
                        }}
                        onMouseEnter={() => setHoveredMsgId(msg.id)}
                        onMouseLeave={() => setHoveredMsgId(null)}
                      >
                        {isOwn && hoveredMsgId === msg.id && (
                          <button
                            onClick={async () => {
                              const res = await fetch(`/api/messages/${msg.id}`, { method: 'DELETE', credentials: 'include' });
                              if (res.status === 204) {
                                setMessages(messages.filter(m => m.id !== msg.id));
                              } else {
                                const data = await res.json().catch(() => ({}));
                                alert('Ошибка удаления: ' + (data?.error || res.status));
                              }
                            }}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#888',
                              cursor: 'pointer',
                              fontSize: 16,
                              padding: 0,
                              marginRight: 8,
                              transition: 'color .15s',
                              alignSelf: 'center',
                            }}
                            title="Удалить сообщение"
                          >
                            ×
                          </button>
                        )}
                        {msg.audioUrl ? (
                          <VoiceMessage audioUrl={msg.audioUrl} isOwn={isOwn} />
                        ) : (
                          <span
                            style={isOwn
                              ? {
                                  ...messageStyle,
                                  display: 'inline-block',
                                  background: '#229ed9',
                                  color: '#fff',
                                  borderRadius: '16px',
                                  minWidth: 48,
                                  wordBreak: 'break-word',
                                  padding: '7px 14px',
                                  fontSize: '15px',
                                  boxShadow: '0 2px 6px #2222',
                                }
                              : { ...messageStyle, background: '#222', display: 'inline-block', wordBreak: 'break-word', borderRadius: '16px', fontSize: '15px', padding: '7px 14px' }}
                          >
                            <span style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                              <span style={{}}>{msg.text}</span>
                              {isOwn && (
                                <>
                                  <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.85)', marginLeft: 4, marginRight: 2, minWidth: 32, textAlign: 'right', letterSpacing: 0 }}>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </>
                              )}
                            </span>
                          </span>
                        )}
                      </div>
                    );
                  })}
                </React.Fragment>
              ));
            })()
          )}
        </div>
        <form
          onSubmit={handleSendMessage}
          style={{
            display: 'flex',
            gap: 8,
            marginTop: 0,
            paddingBottom: isMobile ? 8 : 0,
            alignItems: 'center',
          }}
        >
          {/* Кнопка скрепки слева */}
          <button
            type="button"
            style={{
              width: isMobile ? 44 : 36,
              height: isMobile ? 44 : 36,
              borderRadius: '50%',
              background: inputStyle.background,
              border: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginRight: 2,
              cursor: 'pointer',
              boxShadow: inputStyle.boxShadow,
              color: '#bbb',
              fontSize: isMobile ? 22 : 18,
              transition: 'background .2s',
            }}
            title="Отправить фото или файл"
            aria-label="Отправить фото или файл"
            onClick={() => {
              // Открытие проводника/выбор файла
              if (isMobile) {
                document.getElementById('file-input')?.click();
              } else {
                document.getElementById('file-input')?.click();
              }
            }}
          >
            {/* SVG иконка скрепки */}
            <svg width={isMobile ? 22 : 18} height={isMobile ? 22 : 18} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M17.657 11.314l-6.364 6.364a4 4 0 01-5.657-5.657l9.192-9.192a3 3 0 114.243 4.243l-9.193 9.192a2 2 0 102.828 2.828l6.364-6.364" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
          {/* Скрытый input для выбора файла/медиа */}
          <input
            id="file-input"
            type="file"
            accept={isMobile ? 'image/*,video/*,audio/*,.pdf,.doc,.docx,.txt' : '*'}
            style={{ display: 'none' }}
            onChange={(e) => {
              // Пока что заглушка
              const file = e.target.files?.[0];
              if (file) {
                alert(`Выбран файл: ${file.name}`);
              }
            }}
          />
          {isRecording ? (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              flex: 1,
              margin: '0 8px',
              color: '#d32f2f',
              fontSize: 16,
              fontWeight: 600,
              background: '#23232a',
              borderRadius: 12,
              padding: '6px 16px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
              maxWidth: '100%',
              justifyContent: 'space-between',
              gap: 0,
            }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#d32f2f', marginRight: 6, boxShadow: '0 0 8px #d32f2f88' }} />
                
                <span style={{ marginLeft: 12, fontVariantNumeric: 'tabular-nums', fontWeight: 700 }}>
                  {String(Math.floor(recordTime / 60)).padStart(2, '0')}:{String(recordTime % 60).padStart(2, '0')}
                </span>
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                {/* Кнопка удаления (крестик) */}
                <button
                  type="button"
                  style={{
                    background: '#d32f2f',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '50%',
                    width: 36,
                    height: 36,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    fontSize: 22,
                    boxShadow: '0 2px 8px #d32f2f44',
                    transition: 'background .18s',
                  }}
                  aria-label="Удалить голосовое сообщение"
                  title="Удалить голосовое сообщение"
                  onClick={cancelRecording}
                >
                  &#10006;
                </button>
                {/* Кнопка отправки (иконка микрофона с галочкой) */}
                <button
                  type="button"
                  style={{
                    ...buttonStyle,
                    padding: 0,
                    background: '#229ed9',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    width: isMobile ? 44 : 36,
                    height: isMobile ? 44 : 36,
                    boxShadow: 'none',
                    transition: 'background .18s, opacity .15s, transform .1s',
                    cursor: 'pointer',
                    opacity: 1,
                    transform: 'scale(1.05)',
                  }}
                  aria-label="Отправить голосовое сообщение"
                  title="Отправить голосовое сообщение"
                  onMouseOver={e => { e.currentTarget.style.background = '#23243a'; }}
                  onMouseOut={e => { e.currentTarget.style.background = '#229ed9'; }}
                  onClick={() => {
                    if (mediaRecorder && isRecording) {
                      // обработчик onstop уже установлен для отправки
                      mediaRecorder.stop();
                      mediaRecorder.stream.getTracks().forEach(track => track.stop());
                    }
                  }}
                >
                  <img src="/send.svg" alt="Отправить" style={{ width: isMobile ? 28 : 22, height: isMobile ? 28 : 22, display: 'block' }} />
                </button>
              </div>
            </div>
          ) : (
            <>
              <input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onInput={async () => {
                  if (!chatId || !session) return;
                  await fetch('/api/messages/typing', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ chatId })
                  });
                }}
                placeholder="Сообщение..."
                style={inputStyle}
              />
              {newMessage.trim() ? (
                <button
                  type="submit"
                  style={{
                    ...buttonStyle,
                    padding: 0,
                    background: '#229ed9',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    width: isMobile ? 44 : 36,
                    height: isMobile ? 44 : 36,
                    boxShadow: 'none',
                    transition: 'background .18s, opacity .15s, transform .1s',
                    cursor: 'pointer',
                    opacity: 1,
                    transform: 'scale(1.05)',
                  }}
                  aria-label="Отправить"
                  title="Отправить"
                  onMouseOver={e => { e.currentTarget.style.background = '#23243a'; }}
                  onMouseOut={e => { e.currentTarget.style.background = '#229ed9'; }}
                >
                  <img src="/send.svg" alt="Отправить" style={{ width: isMobile ? 28 : 22, height: isMobile ? 28 : 22, display: 'block' }} />
                </button>
              ) : (
                <button
                  type="button"
                  style={{
                    ...buttonStyle,
                    padding: 0,
                    background: isRecording ? '#d32f2f' : '#444457',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    borderRadius: '50%',
                    width: isMobile ? 44 : 36,
                    height: isMobile ? 44 : 36,
                    boxShadow: 'none',
                    transition: 'background .18s, opacity .15s, transform .1s',
                    cursor: 'pointer',
                    opacity: 0.85,
                  }}
                  aria-label="Голосовое сообщение"
                  title="Голосовое сообщение"
                  onClick={async () => {
                    if (!isRecording) {
                      // Начать запись
                      if (!navigator.mediaDevices) return;
                      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                      const recorder = new MediaRecorder(stream);
                      setMediaRecorder(recorder);
                      audioChunksRef.current = [];
                      setIsRecording(true);
                      setRecordTime(0);
                      if (recordInterval.current) clearInterval(recordInterval.current);
                      recordInterval.current = setInterval(() => setRecordTime(t => t + 1), 1000);
                      recorder.ondataavailable = (e) => {
                        audioChunksRef.current.push(e.data);
                      };
                      recorder.onstop = async () => {
                        if (recordInterval.current) clearInterval(recordInterval.current);
                        setIsRecording(false);
                        setRecordTime(0);
                        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/mp3' });
                        audioChunksRef.current = [];
                        const formData = new FormData();
                        formData.append('chatId', chatId || '');
                        formData.append('audio', audioBlob, 'voice.mp3');
                        const res = await fetch('/api/messages/voice-upload', {
                          method: 'POST',
                          body: formData,
                        });
                        const data = await res.json();
                        if (data.audioUrl && data.message && data.message.id) {
                          setMessages((prev) => [...prev, {
                            id: data.message.id,
                            sender: (session?.user as any)?.id,
                            text: '',
                            createdAt: data.message.createdAt || new Date().toISOString(),
                            audioUrl: data.audioUrl,
                          }]);
                        }
                      };
                      recorder.start();
                    } else {
                      // Остановить запись и отправить
                      if (mediaRecorder && isRecording) {
                        mediaRecorder.stop();
                        mediaRecorder.stream.getTracks().forEach(track => track.stop());
                      }
                    }
                  }}
                >
                  <svg
                    width={isMobile ? 26 : 20}
                    height={isMobile ? 26 : 20}
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    style={{ display: 'block' }}
                  >
                    <path d="M12 17a4 4 0 004-4V7a4 4 0 10-8 0v6a4 4 0 004 4zm5-4a1 1 0 112 0 7 7 0 01-14 0 1 1 0 112 0 5 5 0 0010 0z" fill="#fff"/>
                  </svg>
                </button>
              )}
            </>
          )}
        </form>
        {/* (удалено дублирующееся отображение индикатора записи) */}
        {/* Статус "печатает..." чуть выше поля ввода, слева */}
        {isTyping && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            minHeight: 24,
            margin: '8px 0 2px 0',
            marginLeft: 4,
            color: '#4fc3f7',
            fontSize: 15,
            fontWeight: 500,
            maxWidth: '60%',
          }}>
            <TypingIndicator />
          </div>
        )}
      </div>
      </div>
    </>
  );
};

export default ChatWithFriend;
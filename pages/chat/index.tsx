import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import dynamic from 'next/dynamic';
import Pusher from 'pusher-js';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/router';
const ToastNotification = dynamic(() => import('./ToastNotification'), { ssr: false });

interface Chat {
  id: string;
  name?: string | null;
  users: { id: string; login: string; avatar?: string | null; role?: string }[];
  unreadCount?: number;
}

interface LastMessage {
  id: string;
  text: string;
  createdAt: string;
  senderId: string;
  audioUrl?: string;
  videoUrl?: string;
}

// Обновлён компонент для воспроизведения/индикации видео в списке.
// Сделан компактным: меньший круг и меньший треугольник.
const VideoPlayCircle: React.FC<{ videoUrl: string }> = ({ videoUrl }) => {
  const [playing, setPlaying] = React.useState(false);
  const [ended, setEnded] = React.useState(false);
  const videoRef = React.useRef<HTMLVideoElement | null>(null);

  React.useEffect(() => {
    return () => {
      if (videoRef.current) {
        try { videoRef.current.pause(); } catch {}
        videoRef.current.src = '';
        videoRef.current = null;
      }
    };
  }, []);

  const handlePlay = async () => {
    setEnded(false);
    if (!videoRef.current) {
      const v = document.createElement('video');
      v.src = videoUrl;
      v.preload = 'metadata';
      v.onplay = () => setPlaying(true);
      v.onpause = () => setPlaying(false);
      v.onended = () => { setPlaying(false); setEnded(true); };
      videoRef.current = v;
    }
    try {
      await videoRef.current.play();
    } catch (e) {
      // autoplay may be blocked
      setPlaying(false);
    }
  };

  return (
    <button
      onClick={handlePlay}
      aria-label="play video"
      title="Воспроизвести"
      style={{ background: 'transparent', border: 'none', padding: 0, margin: 0, cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}
    >
      <style>{`
        /* Компактный круг по умолчанию (уменьшено) */
        .vpc-wrap { width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; }
        /* круг с легкой обводкой */
        .vpc-ring { width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; border-radius: 50%; transition: border-radius .28s ease, transform .28s ease, background .28s ease, width .18s ease, height .18s ease; border: 1px solid rgba(79,195,247,0.14); background: transparent; }
        .vpc-inner { width: 10px; height: 10px; display:inline-flex; align-items:center; justify-content:center; color: #4fc3f7; transition: transform .28s ease; }
        /* вращение внутренней иконки во время воспроизведения */
        .vpc-rotating .vpc-inner { animation: vpc-spin 1s linear infinite; }
        @keyframes vpc-spin { to { transform: rotate(360deg); } }
        /* когда закончилось — компактный заполненный круг */
        .vpc-ended { background: rgba(79,195,247,0.18) !important; border-color: rgba(79,195,247,0.22) !important; transform: scale(0.96); }
        .vpc-ended .vpc-inner { transform: scale(0.92); }
      `}</style>
      <span className="vpc-wrap">
        <span className={`vpc-ring ${playing ? 'vpc-rotating' : ''} ${ended ? 'vpc-ended' : ''}`}>
          <span className="vpc-inner">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 5v14l11-7-11-7z" fill="#4fc3f7"/>
            </svg>
          </span>
        </span>
      </span>
    </button>
  );
};

const ChatPage: React.FC = () => {
  const [toast, setToast] = useState<{type: 'error'|'success', message: string}|null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [lastMessages, setLastMessages] = useState<Record<string, LastMessage | null>>({});
  const [showCreateModal, setShowCreateModal] = useState(false);
  const { data: session } = useSession();
  const router = useRouter();

  const fetchChats = async () => {
    const userId = (session?.user && (session.user as any).id) ? (session.user as any).id : undefined;
    if (!userId) return;
    const res = await fetch('/api/chats', { credentials: 'include' });
    if (!res.ok) return setChats([]);
    const data = await res.json();
    const chatsList: Chat[] = data.chats || [];
    setChats(chatsList);
    console.log('chatsList', chatsList);
    // Получить последние сообщения для каждого чата
    for (const chat of chatsList) {
      const msgRes = await fetch(`/api/messages?chatId=${chat.id}`);
      const msgData = await msgRes.json();
      if (Array.isArray(msgData.messages) && msgData.messages.length > 0) {
        const lastMsg = msgData.messages[msgData.messages.length - 1];
        setLastMessages(prev => ({ ...prev, [chat.id]: {
          id: lastMsg.id,
          text: lastMsg.text || '',
          createdAt: lastMsg.createdAt,
          senderId: lastMsg.senderId,
          audioUrl: lastMsg.audioUrl,
          videoUrl: lastMsg.videoUrl
        }}));
      } else {
        setLastMessages(prev => ({ ...prev, [chat.id]: null }));
      }
    }
  };

  // Pusher подписка на новые сообщения для обновления последних сообщений
  const pusherRef = useRef<Pusher|null>(null);

  useEffect(() => {
    fetchChats();

    // Подписка на Pusher для всех чатов
    if (pusherRef.current) {
      pusherRef.current.disconnect();
      pusherRef.current = null;
    }
    if (!chats.length) return;
    const pusher = new Pusher(process.env.NEXT_PUBLIC_PUSHER_KEY || '', {
      cluster: process.env.NEXT_PUBLIC_PUSHER_CLUSTER || '',
      forceTLS: true,
    });
    pusherRef.current = pusher;
    chats.forEach(chat => {
      const channel = pusher.subscribe(`chat-${chat.id}`);
      channel.bind('new-message', (msg: any) => {
        setLastMessages(prev => ({ ...prev, [chat.id]: msg }));
      });
      // Subscribe to status changes for the other participant (1:1 chats)
      if (!chat.name) {
        const meId = (session?.user as any)?.id as string | undefined;
        const otherUser = chat.users.find(u => u.id !== meId);
        if (otherUser) {
          try {
            const uChannel = pusher.subscribe(`user-${otherUser.id}`);
            uChannel.bind('status-changed', (data: any) => {
              // expected data: { userId, status }
              setChats(prev => prev.map(c => ({
                ...c,
                users: c.users.map(u => u.id === data.userId ? { ...u, status: data.status } : u)
              })));
            });
          } catch (e) {
            // ignore
          }
        }
      }
    });
    return () => {
      if (pusherRef.current) {
        pusherRef.current.disconnect();
        pusherRef.current = null;
      }
    };
    // eslint-disable-next-line
  }, [session, chats.length]);

  // Вынесите useMemo на верхний уровень компонента
  const chatList = useMemo(() => chats.map(chat => {
    const isGroup = !!chat.name;
    let title = chat.name;
    let role: string | undefined;
    const meId = (session?.user as any)?.id as string | undefined;
    // find other participant for 1:1 chats
    const other = !isGroup ? chat.users.find(u => u.id !== meId) : null;
    if (!isGroup) {
      if (other) {
        title = other.login;
        role = other.role;
      }
    } else {
      // Для группового чата показываем роль текущего пользователя, если есть
      const me = chat.users.find(u => u.id === meId);
      role = me?.role;
      // If group has no explicit name, build fallback: "Группа (admin) и (another)"
      if (!title) {
        const admin = chat.users.find(u => u.role === 'admin') || chat.users[0];
        const otherMember = chat.users.find(u => u.id !== admin?.id) || chat.users[1] || chat.users[0];
        const adminNick = admin?.login || 'user';
        const otherNick = otherMember?.login || 'user';
        title = `Группа (${adminNick}) и (${otherNick})`;
      }
    }
    const bgUrl = (other as any)?.backgroundUrl || undefined;
    const itemBackground = bgUrl
      ? `linear-gradient(rgba(10,11,13,0.6), rgba(10,11,13,0.6)), url(${bgUrl}) center/cover no-repeat`
      : '#191a1e';

    // Helper render for avatars: single avatar or stacked for groups
    const renderAvatar = () => {
      const fallback = 'https://spng.pngfind.com/pngs/s/64-647085_teamwork-png-teamwork-symbol-png-transparent-png.png';
      if (!isGroup) {
        const src = (other && other.avatar) ? other.avatar : '/window.svg';
        return (
          <div style={{ position: 'relative', width: 44, height: 44 }}>
            <img src={src} alt="avatar" style={{width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', background: '#444'}} />
            {/* status overlay in chat list: show only online or dnd */}
            {((other as any)?.status === 'online') && (
              <span style={{ position: 'absolute', right: 0, bottom: 0, width: 12, height: 12, borderRadius: '50%', background: '#1ed760', border: '2px solid #0f1113' }} />
            )}
            {((other as any)?.status === 'dnd') && (
              <img src="/moon-dnd.svg" alt="dnd" style={{ position: 'absolute', right: -2, bottom: -2, width: 16, height: 16 }} />
            )}
          </div>
        );
      }
      // For groups: show up to 3 avatars overlapped like Telegram
      const avatars = (chat.users || []).slice(0, 3).map(u => u.avatar || fallback);
      return (
        <div style={{width:44,height:44,position:'relative'}}>
          {avatars.map((a, idx) => {
            const size = 28 - idx * 6; // 28,22,16
            const right = idx * 10;
            return (
              <img key={idx} src={a} alt={`g${idx}`} style={{position:'absolute',right:`${right}px`,bottom:0,width:size,height:size,borderRadius:'50%',objectFit:'cover',border:'2px solid #0f1113',background:'#333'}} />
            );
          })}
        </div>
      );
    };

    return (
      <a
        key={chat.id}
        href={`/chat/${isGroup ? chat.id : chat.users.find(u => u.id !== meId)?.id}`}
        style={{
          display: 'flex', alignItems: 'center', gap: 18, padding: '18px 28px', borderRadius: 14,
          background: itemBackground, boxShadow: '0 2px 8px #2222',
          transition: 'background 0.2s', textDecoration: 'none', cursor: 'pointer'
        }}
      >
  {renderAvatar()}
        <div style={{display:'flex',flexDirection:'column',flex:1}}>
          <span style={{fontWeight: 600, fontSize: 20, color: '#e3e8f0', display:'flex',alignItems:'center',gap:8}}>
            {title || 'Группа'}
            {role === 'admin' && <img src="/role-icons/admin.svg" alt="admin" style={{width:20, height:20, marginLeft:4}} />}
            {role === 'moderator' && <img src="/role-icons/moderator.svg" alt="moderator" style={{width:20, height:20, marginLeft:4}} />}
            {role === 'verif' && <img src="/role-icons/verif.svg" alt="verif" style={{width:20, height:20, marginLeft:4}} />}
          </span>
          {/* group member list removed from chat preview; group name will be shown inside the chat */}
          {}
          {false ? (
            <span style={{fontSize: 13, color: '#4fc3f7', display: 'flex', alignItems: 'center', gap: 4}}>
              Печатает
              <span style={{display:'inline-flex',alignItems:'center',height:16}}>
                <span className="typing-dot" style={{width:6,height:6,borderRadius:'50%',background:'#4fc3f7',margin:'0 2px',opacity:0.7,animation:'typingDot 1.2s infinite',animationDelay:'0s'}} />
                <span className="typing-dot" style={{width:6,height:6,borderRadius:'50%',background:'#4fc3f7',margin:'0 2px',opacity:0.7,animation:'typingDot 1.2s infinite',animationDelay:'0.3s'}} />
                <span className="typing-dot" style={{width:6,height:6,borderRadius:'50%',background:'#4fc3f7',margin:'0 2px',opacity:0.7,animation:'typingDot 1.2s infinite',animationDelay:'0.6s'}} />
              </span>
              <style>{`
                @keyframes typingDot {
                  0% { transform: translateY(0); opacity: 0.7; }
                  20% { transform: translateY(-4px); opacity: 1; }
                  40% { transform: translateY(0); opacity: 0.7; }
                }
              `}</style>
            </span>
          ) : lastMessages[chat.id] && (
            lastMessages[chat.id]?.videoUrl ? (
              /* компактный вид для видеосообщения: меньший gap и более тонкая подпись */
              <div style={{display:'flex',alignItems:'center',gap:6}}>
                <VideoPlayCircle videoUrl={lastMessages[chat.id]!.videoUrl!} />
                <span style={{fontSize: 13, color: '#4fc3f7', lineHeight: '1'}}>Видеосообщение</span>
              </div>
            ) : lastMessages[chat.id]?.audioUrl ? (
              <span style={{fontSize: 13, color: '#4fc3f7', display:'flex',alignItems:'center',gap:6}}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{display:'inline'}} xmlns="http://www.w3.org/2000/svg"><path d="M8 5v14l11-7z" fill="#4fc3f7"/></svg>
                Голосовое сообщение
              </span>
            ) : (
              <div style={{display:'flex',flexDirection:'column'}}>
                <span style={{fontSize: 13, color: '#bbb'}}>
                  {lastMessages[chat.id]!.text.length > 60
                    ? lastMessages[chat.id]!.text.slice(0, 60) + '...'
                    : lastMessages[chat.id]!.text}
                </span>
                {/* Removed textual status from chat list — only avatar icons remain */}
                {/* 
                {(!isGroup && (other as any)?.status && ((other as any).status === 'online' || (other as any).status === 'dnd')) && (
                  <span style={{fontSize: 12, color: (other as any).status === 'online' ? '#229ed9' : '#9aa0a6', marginTop: 6}}>
                    {(other as any).status === 'online' ? 'В сети' : 'Не беспокоить'}
                  </span>
                )}
                */}
              </div>
            )
          )}
        </div>
      </a>
    );
  }), [chats, lastMessages, session]);

  // Group info modal via click was removed: clicking a chat (group or 1:1) navigates into the chat directly

  return (
    <div style={{minHeight: '100vh', width: '100vw', background: '#111', fontFamily: 'Segoe UI, Arial, sans-serif', margin: 0, padding: 0, position: 'relative'}}>
      <div style={{maxWidth: 500, margin: '0 auto', paddingTop: 60}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:10, position: 'relative'}}>
          <div style={{width:44}} />
          <h2 style={{color: '#e3e8f0', fontWeight: 700, fontSize: 28, textAlign: 'center'}}>Чаты</h2>
          <button
            title="Создать чат"
            aria-label="Создать чат"
            onClick={() => { setShowCreateModal(true); }}
            style={{
              width: 44,
              height: 44,
              borderRadius: 10,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              transition: 'transform .12s ease-in-out, box-shadow .12s'
            }}
            onMouseOver={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1.04)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.25)'; }}
            onMouseOut={e => { (e.currentTarget as HTMLButtonElement).style.transform = 'scale(1)'; (e.currentTarget as HTMLButtonElement).style.boxShadow = 'none'; }}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="3" y="3" width="18" height="18" rx="4" stroke="#e3e8f0" strokeWidth="1.2" fill="none" opacity="0.06"/>
              <path d="M7 17.5L16.2 8.3a1 1 0 0 0 0-1.4l-1.6-1.6a1 1 0 0 0-1.4 0L4 14.5V18h3.5z" stroke="#e3e8f0" strokeWidth="1.2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        {chats.length === 0 ? (
          <div style={{color: '#bbb', fontSize: 20, textAlign: 'center', marginTop: 80}}>Нет чатов.<br />Создайте группу или добавьте друзей!</div>
        ) : (
          <div style={{
            display: 'flex', flexDirection: 'column', gap: 18,
            maxHeight: '65vh', overflowY: 'auto',
            scrollbarWidth: 'thin',
            scrollbarColor: '#4fc3f7cc #222',
          }}
            className="chat-list-scroll"
          >
            <style jsx global>{`
              .chat-list-scroll::-webkit-scrollbar {
                width: 7px;
                background: transparent;
              }
              .chat-list-scroll::-webkit-scrollbar-thumb {
                background: rgba(79,195,247,0.25);
                border-radius: 6px;
                transition: background 0.2s;
              }
              .chat-list-scroll:hover::-webkit-scrollbar-thumb {
                background: rgba(79,195,247,0.45);
              }
            `}</style>
            {chatList}
          </div>
        )}
        {/* Плавное уведомление справа снизу с индикатором времени */}
        {toast && (
          <ToastNotification
            type={toast.type}
            message={toast.message}
            onClose={()=>setToast(null)}
            duration={4000}
          />
        )}
      </div>
    </div>
  );
};

export default ChatPage;


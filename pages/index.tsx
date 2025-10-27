import React, { useState, useEffect, useRef, useMemo, Suspense } from 'react';
import dynamic from 'next/dynamic';
import Pusher from 'pusher-js';
import { useSession } from 'next-auth/react';
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

const ChatPage: React.FC = () => {
  const [toast, setToast] = useState<{type: 'error'|'success', message: string}|null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [lastMessages, setLastMessages] = useState<Record<string, LastMessage | null>>({});
  const { data: session } = useSession();

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
    let avatar = '/window.svg';
    let role;
    // find other participant once and reuse
    const other = !isGroup ? chat.users.find(u => u.id !== (session?.user as any)?.id) : null;
    if (!isGroup) {
      if (other) {
        title = other.login;
        avatar = other.avatar || '/window.svg';
        role = other.role;
      }
    } else {
      // Для группового чата показываем роль текущего пользователя, если есть
      const me = chat.users.find(u => u.id === (session?.user as any)?.id);
      role = me?.role;
    }
  const bgUrl = (other as any)?.backgroundUrl || undefined;
    const itemBackground = bgUrl
      ? `linear-gradient(rgba(10,11,13,0.6), rgba(10,11,13,0.6)), url(${bgUrl}) center/cover no-repeat`
      : '#191a1e';

    return (
      <a
        key={chat.id}
        href={`/chat/${isGroup ? chat.id : chat.users.find(u => u.id !== (session?.user as any)?.id)?.id}`}
        style={{
          display: 'flex', alignItems: 'center', gap: 18, padding: '18px 28px', borderRadius: 14,
          background: itemBackground, boxShadow: '0 2px 8px #2222',
          transition: 'background 0.2s', textDecoration: 'none', cursor: 'pointer'
        }}
      >
        <img src={avatar} alt="avatar" style={{width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', background: '#444'}} />
        <div style={{display:'flex',flexDirection:'column',flex:1}}>
          <span style={{fontWeight: 600, fontSize: 20, color: '#e3e8f0', display:'flex',alignItems:'center',gap:8}}>
            {title || 'Группа'}
            {role === 'admin' && <img src="/role-icons/admin.svg" alt="admin" style={{width:20, height:20, marginLeft:4}} />}
            {role === 'moderator' && <img src="/role-icons/moderator.svg" alt="moderator" style={{width:20, height:20, marginLeft:4}} />}
            {role === 'verif' && <img src="/role-icons/verif.svg" alt="verif" style={{width:20, height:20, marginLeft:4}} />}
          </span>
          {isGroup && (
            <span style={{fontSize: 14, color: '#aaa', display: 'flex', alignItems: 'center', gap: 6}}>
              {chat.users.map(u => u.login).join(', ')}
            </span>
          )}
          {/* Статус "Печатает..." с анимированными точками (пример, без реального статуса) */}
          {/* TODO: заменить isTyping на реальный статус из Pusher, если потребуется */}
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
              <span style={{fontSize: 13, color: '#4fc3f7', display:'flex',alignItems:'center',gap:6}}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{display:'inline'}} xmlns="http://www.w3.org/2000/svg"><rect x="3" y="5" width="18" height="14" rx="2" fill="#4fc3f7"/><polygon points="10,9 16,12 10,15" fill="#0b1116"/></svg>
                Видеосообщение
              </span>
            ) : lastMessages[chat.id]?.audioUrl ? (
              <span style={{fontSize: 13, color: '#4fc3f7', display:'flex',alignItems:'center',gap:6}}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" style={{display:'inline'}} xmlns="http://www.w3.org/2000/svg"><path d="M8 5v14l11-7z" fill="#4fc3f7"/></svg>
                Голосовое сообщение
              </span>
            ) : (
              <span style={{fontSize: 13, color: '#bbb'}}>
                {lastMessages[chat.id]!.text.length > 60
                  ? lastMessages[chat.id]!.text.slice(0, 60) + '...'
                  : lastMessages[chat.id]!.text}
              </span>
            )
          )}
        </div>
      </a>
    );
  }), [chats, lastMessages, session]);

  return (
    <div style={{minHeight: '100vh', width: '100vw', background: '#111', fontFamily: 'Segoe UI, Arial, sans-serif', margin: 0, padding: 0, position: 'relative'}}>
      <div style={{maxWidth: 500, margin: '0 auto', paddingTop: 60}}>
        <div style={{display:'flex',alignItems:'flex-end',justifyContent:'flex-start',marginBottom:10}}>
          <h2 style={{color: '#e3e8f0', fontWeight: 700, fontSize: 28}}>Выберите чат</h2>
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


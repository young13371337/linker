import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { useSession } from 'next-auth/react';

interface Message {
  id: string;
  sender: string;
  text: string;
  createdAt: string;
}

const ChatWithFriend: React.FC = () => {
  const router = useRouter();
  const { id } = router.query;
  const { data: session, status } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [friend, setFriend] = useState<{id: string, name: string, avatar?: string | null, role?: string} | null>(null);
  const [chatId, setChatId] = useState<string | null>(null);

  useEffect(() => {
    if (status === "loading" || !session) return;
    const userId = (session?.user && (session.user as any).id) ? (session.user as any).id : undefined;
    if (!id || !userId) return;
    // Получить профиль друга
    fetch(`/api/profile?userId=${id}`, { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        if (data && data.user) {
          setFriend({
            id: data.user.id,
            name: data.user.login,
            avatar: data.user.avatar || null,
            role: data.user.role || undefined
          });
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
                setMessages(data.messages.map((msg: any) => ({
                  id: msg.id,
                  sender: msg.senderId,
                  text: msg.text,
                  createdAt: msg.createdAt
                })));
              } else {
                setMessages([]);
              }
            });
        } else {
          setChatId(null);
          setMessages([]);
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
      .then(data => {
        if (data.message) {
          setMessages([...messages, {
            id: data.message.id,
            sender: data.message.senderId,
            text: data.message.text,
            createdAt: data.message.createdAt
          }]);
        }
        setNewMessage('');
      });
  };

  if (status === "loading") {
    return (
      <div style={{minHeight:'100vh',display:'flex',alignItems:'flex-start',justifyContent:'center',background:'#111'}}>
        <div style={{marginTop:80,color:'#bbb',fontSize:22,fontWeight:500}}>
          Загрузка...
        </div>
      </div>
    );
  }
  if (!session) {
    return (
      <div style={{minHeight:'100vh',display:'flex',alignItems:'flex-start',justifyContent:'center',background:'#111'}}>
        <div style={{marginTop:80,color:'#bbb',fontSize:22,fontWeight:500}}>
          Для общения в чате нужно авторизоваться.
        </div>
      </div>
    );
  }
  if (!friend) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'flex-start',justifyContent:'center',background:'#111'}}>
      <div style={{marginTop:80,color:'#bbb',fontSize:22,fontWeight:500}}>
        Загрузка чата...
      </div>
    </div>
  );

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
    ? { background: '#229ed9', color: '#fff', padding: '10px 18px', borderRadius: '12px', display: 'inline-block', boxShadow: '0 2px 6px #2222', fontSize: '16px', maxWidth: '80vw', wordBreak: 'break-word' as const }
    : { background: '#229ed9', color: '#fff', padding: '7px 14px', borderRadius: '9px', display: 'inline-block', boxShadow: '0 2px 6px #2222', fontSize: '14px' };
  const inputStyle = isMobile
    ? { flex: 1, padding: '14px 16px', borderRadius: '12px', border: 'none', background: '#18191c', color: '#fff', fontSize: '16px', boxShadow: '0 2px 6px #2222', outline: 'none', minWidth: '0' }
    : { flex: 1, padding: '9px 12px', borderRadius: '9px', border: 'none', background: '#18191c', color: '#fff', fontSize: '14px', boxShadow: '0 2px 6px #2222', outline: 'none' };
  const buttonStyle = isMobile
    ? { padding: '0 22px', borderRadius: '12px', background: '#229ed9', color: '#fff', border: 'none', fontWeight: 600, fontSize: '18px', boxShadow: '0 2px 6px #229ed933', transition: 'background .2s', cursor: 'pointer' }
    : { padding: '0 16px', borderRadius: '9px', background: '#229ed9', color: '#fff', border: 'none', fontWeight: 600, fontSize: '14px', boxShadow: '0 2px 6px #229ed933', transition: 'background .2s', cursor: 'pointer' };
  return (
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: isMobile ? 10 : 16 }}>
          <img src={friend.avatar || '/window.svg'} alt="avatar" style={avatarStyle} />
          <span style={nameStyle}>
            {friend.name}
              {/* Иконка роли */}
              {friend.role === 'admin' && <img src="/role-icons/admin.svg" alt="admin" title="Админ" style={{ width: 16, height: 16, marginLeft: 2 }} />}
              {friend.role === 'moderator' && <img src="/role-icons/moderator.svg" alt="moderator" title="Модератор" style={{ width: 16, height: 16, marginLeft: 2 }} />}
              {friend.role === 'verif' && <img src="/role-icons/verif.svg" alt="verif" title="Верифицирован" style={{ width: 16, height: 16, marginLeft: 2 }} />}
              {friend.role === 'pepe' && <img src="/role-icons/pepe.svg" alt="pepe" title="Пепешка" style={{ width: 16, height: 16, marginLeft: 2 }} />}
          </span>
        </div>
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            background: 'none',
            borderRadius: 12,
            padding: '4px 0',
            marginBottom: isMobile ? 10 : 12,
            display: 'flex',
            flexDirection: 'column',
            gap: isMobile ? 8 : 6,
            scrollBehavior: 'smooth',
            minHeight: 0,
          }}
        >
          {messages.length === 0 ? (
            <div style={{ color: '#bbb', fontSize: 16, textAlign: 'center', marginTop: 32 }}><i>Нет сообщений</i></div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                style={{
                  marginBottom: 0,
                  textAlign: msg.sender === session?.user?.name ? 'right' : 'left',
                  width: '100%',
                }}
              >
                <span style={msg.sender === session?.user?.name ? messageStyle : { ...messageStyle, background: '#222' }}>{msg.text}</span>
                <span style={{ fontSize: 11, color: '#888', marginLeft: 8 }}>{new Date(msg.createdAt).toLocaleTimeString()}</span>
              </div>
            ))
          )}
        </div>
        <form
          onSubmit={handleSendMessage}
          style={{
            display: 'flex',
            gap: 8,
            marginTop: 0,
            paddingBottom: isMobile ? 8 : 0,
          }}
        >
          <input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Сообщение..."
            style={inputStyle}
          />
          <button type="submit" style={buttonStyle}>→</button>
        </form>
      </div>
    </div>
  );
};

export default ChatWithFriend;

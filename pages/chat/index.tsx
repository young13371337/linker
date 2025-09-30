import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';

interface Friend {
  id: string;
  login: string;
  avatar?: string | null;
  role?: string;
  isOnline?: boolean;
}

const ChatPage: React.FC = () => {
  const { data: session } = useSession();
  const [friends, setFriends] = useState<Friend[]>([]);
  useEffect(() => {
    const userId = (session?.user && (session.user as any).id) ? (session.user as any).id : undefined;
    if (!userId) return;
    fetch(`/api/profile?userId=${userId}`, { credentials: 'include' })
      .then(async res => {
        if (!res.ok) return setFriends([]);
        const data = await res.json();
        setFriends(data.user?.friends || []);
      })
      .catch(() => setFriends([]));
  }, [session]);

  return (
    <div style={{minHeight: '100vh', width: '100vw', background: '#111', fontFamily: 'Segoe UI, Arial, sans-serif', margin: 0, padding: 0}}>
      <div style={{maxWidth: 500, margin: '0 auto', paddingTop: 60}}>
        <h2 style={{color: '#e3e8f0', fontWeight: 700, fontSize: 28, marginBottom: 32}}>Выберите чат</h2>
        {friends.length === 0 ? (
          <div style={{color: '#bbb', fontSize: 20, textAlign: 'center', marginTop: 80}}>Нету ручек - нет конфетки.<br />Тоже самое с друзьями, заведите себе новых друзей, чтобы образовался чат</div>
        ) : (
          <div style={{display: 'flex', flexDirection: 'column', gap: 18}}>
            {friends.map(friend => (
              <a
                key={friend.id}
                href={`/chat/${friend.id}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 18, padding: '18px 28px', borderRadius: 14,
                  background: 'linear-gradient(90deg,#23272f 60%,#2c313a 100%)', boxShadow: '0 2px 8px #2222',
                  transition: 'background 0.2s', textDecoration: 'none', cursor: 'pointer'
                }}
              >
                <img src={friend.avatar || '/window.svg'} alt="avatar" style={{width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', background: '#444'}} />
                <div style={{display:'flex',flexDirection:'column',flex:1}}>
                  <span style={{fontWeight: 600, fontSize: 20, color: '#e3e8f0', display:'flex',alignItems:'center',gap:8}}>
                    {friend.login}
                    {friend.role === 'admin' && <img src="/role-icons/admin.svg" alt="admin" style={{width:20, height:20, marginLeft:4}} />}
                    {friend.role === 'moderator' && <img src="/role-icons/moderator.svg" alt="moderator" style={{width:20, height:20, marginLeft:4}} />}
                    {friend.role === 'verif' && <img src="/role-icons/verif.svg" alt="verif" style={{width:20, height:20, marginLeft:4}} />}
                  </span>
                  <span style={{fontSize: 14, color: '#aaa', display: 'flex', alignItems: 'center', gap: 6}}>
                    {friend.isOnline ? <span style={{marginLeft:4}}>• онлайн</span> : null}
                  </span>
                  {/* Здесь предполагается, что lastMessage будет приходить с backend, пока заглушка: */}
                  {false
                    ? <span style={{fontSize: 13, color: '#bbb', marginTop: 2}}>{/* lastMessage */}</span>
                    : <span style={{fontSize: 13, color: '#bbb', marginTop: 2}}><i>Начните общаться!</i></span>
                  }
                </div>
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ChatPage;


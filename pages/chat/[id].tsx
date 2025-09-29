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
  const { data: session } = useSession();
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [friend, setFriend] = useState<{id: string, name: string} | null>(null);

  useEffect(() => {
    if (!id) return;
    // Получить данные друга (можно заменить на реальный API)
    fetch('/api/friends', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        let friends = Array.isArray(data) ? data : data.result || [];
        const f = friends.find((fr: any) => fr.id === id);
        setFriend(f || null);
      });
    // Получить сообщения (заглушка)
    setMessages([
      { id: '1', sender: 'me', text: 'Привет!', createdAt: new Date().toISOString() },
      { id: '2', sender: String(id), text: 'Привет, как дела?', createdAt: new Date().toISOString() }
    ]);
  }, [id]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    setMessages([...messages, {
      id: Math.random().toString(36).slice(2),
      sender: session?.user?.name || 'me',
      text: newMessage,
      createdAt: new Date().toISOString()
    }]);
    setNewMessage('');
  };

  if (!friend) return <div style={{color:'#fff',padding:40}}>Загрузка...</div>;

  return (
    <div style={{minHeight:'100vh',background:'#111',color:'#e3e8f0',fontFamily:'Segoe UI,Arial,sans-serif'}}>
      <div style={{maxWidth:500,margin:'0 auto',paddingTop:60}}>
        <h2 style={{fontWeight:700,fontSize:24,marginBottom:24}}>Чат с {friend.name}</h2>
        <div style={{background:'#23272f',borderRadius:12,padding:18,minHeight:200,marginBottom:18}}>
          {messages.map(msg => (
            <div key={msg.id} style={{marginBottom:10,textAlign:msg.sender===session?.user?.name?'right':'left'}}>
              <span style={{background:msg.sender===session?.user?.name?'#3b82f6':'#444',color:'#fff',padding:'6px 14px',borderRadius:8,display:'inline-block'}}>{msg.text}</span>
              <span style={{fontSize:12,color:'#aaa',marginLeft:8}}>{new Date(msg.createdAt).toLocaleTimeString()}</span>
            </div>
          ))}
        </div>
        <form onSubmit={handleSendMessage} style={{display:'flex',gap:8}}>
          <input value={newMessage} onChange={e=>setNewMessage(e.target.value)} placeholder="Сообщение..." style={{flex:1,padding:10,borderRadius:8,border:'none',background:'#23272f',color:'#fff'}} />
          <button type="submit" style={{padding:'0 18px',borderRadius:8,background:'#3b82f6',color:'#fff',border:'none',fontWeight:600}}>Отправить</button>
        </form>
      </div>
    </div>
  );
};

export default ChatWithFriend;

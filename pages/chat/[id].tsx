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
    // Получить данные друга
    fetch('/api/friends', { credentials: 'include' })
      .then(res => res.json())
      .then(data => {
        let friends = Array.isArray(data) ? data : data.result || [];
        const f = friends.find((fr: any) => fr.id === id);
        setFriend(f || null);
      });
    // Получить реальные сообщения
    fetch(`/api/messages?chatId=${id}`, { credentials: 'include' })
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
  }, [id]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ chatId: id, text: newMessage })
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

  if (!friend) return (
    <div style={{minHeight:'100vh',display:'flex',alignItems:'flex-start',justifyContent:'center',background:'#111'}}>
      <div style={{marginTop:80,color:'#bbb',fontSize:22,fontWeight:500}}>
        Загрузка чата...
      </div>
    </div>
  );

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

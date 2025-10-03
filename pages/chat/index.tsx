
import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import ToastNotification from './ToastNotification';

interface Chat {
  id: string;
  name?: string | null;
  users: { id: string; login: string; avatar?: string | null; role?: string }[];
}

const ChatPage: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");
  const [toast, setToast] = useState<{type: 'error'|'success', message: string}|null>(null);
  const [chats, setChats] = useState<Chat[]>([]);
  const [lastMessages, setLastMessages] = useState<Record<string, { text: string; createdAt: string; senderId: string } | null>>({});
  const [friends, setFriends] = useState<{id: string, login: string, avatar?: string|null, role?: string}[]>([]);
  const [groupAvatar, setGroupAvatar] = useState<string>("");
  const { data: session } = useSession();
  // Загрузка друзей пользователя для выбора участников группы
  useEffect(() => {
    const fetchFriends = async () => {
      const userId = (session?.user && (session.user as any).id) ? (session.user as any).id : undefined;
      if (!userId) return;
      const res = await fetch(`/api/profile?userId=${userId}`);
      if (!res.ok) return;
      const data = await res.json();
      // Добавляем самого себя в список друзей для выбора
      const self = session?.user ? {
        id: (session.user as any).id,
        login: (session.user as any).login || (session.user as any).name || 'Вы',
        avatar: (session.user as any).avatar || undefined,
        role: (session.user as any).role || undefined
      } : null;
      let allFriends = Array.isArray(data.friends) ? data.friends : [];
      if (self && !allFriends.some((f: {id: string}) => f.id === self.id)) {
        allFriends = [self, ...allFriends];
      }
      setFriends(allFriends);
      // По умолчанию выбран сам пользователь
      setSelected(sel => sel.includes(self?.id) ? sel : self && self.id ? [self.id, ...sel] : sel);
    };
    fetchFriends();
  }, [session]);

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      setToast({ type: 'error', message: 'Введите название группы' });
      return;
    }
    if (selected.length < 2) {
      setToast({ type: 'error', message: 'Слишком мало участников, минимум - 3' });
      return;
    }
    try {
      const res = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: groupName, avatar: groupAvatar, userIds: selected })
      });
      const data = await res.json();
      if (res.ok) {
        setToast({ type: 'success', message: 'Группа успешно создана!' });
        setShowModal(false);
        setSelected([]);
        setGroupName("");
        setGroupAvatar("");
        // Обновить список чатов после создания
        await fetchChats();
      } else {
        setToast({ type: 'error', message: data.error || 'Ошибка создания группы' });
      }
    } catch {
      setToast({ type: 'error', message: 'Ошибка сети' });
    }
  };

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
    chatsList.forEach(async (chat) => {
      const msgRes = await fetch(`/api/messages?chatId=${chat.id}`);
      const msgData = await msgRes.json();
      if (Array.isArray(msgData.messages) && msgData.messages.length > 0) {
        const lastMsg = msgData.messages[msgData.messages.length - 1];
        setLastMessages(prev => ({ ...prev, [chat.id]: lastMsg }));
      } else {
        setLastMessages(prev => ({ ...prev, [chat.id]: null }));
      }
    });
  };

  useEffect(() => {
    fetchChats();
    // eslint-disable-next-line
  }, [session]);

  return (
  <div style={{minHeight: '100vh', width: '100vw', background: '#111', fontFamily: 'Segoe UI, Arial, sans-serif', margin: 0, padding: 0, position: 'relative'}}>
  <div style={{maxWidth: 500, margin: '0 auto', paddingTop: 60}}>
        <div style={{display:'flex',alignItems:'flex-end',justifyContent:'space-between',marginBottom:10}}>
          <h2 style={{color: '#e3e8f0', fontWeight: 700, fontSize: 28}}>Выберите чат</h2>
          <div style={{marginLeft:12,marginBottom:4}}>
            <button
              onClick={() => setShowModal(true)}
              style={{width:40,height:40,borderRadius:'50%',background:'#4fc3f7',border:'none',display:'flex',alignItems:'center',justifyContent:'center',boxShadow:'0 2px 8px #2224',cursor:'pointer',transition:'background .2s'}}
              title="Создать группу"
            >
              <svg width="22" height="22" viewBox="0 0 28 28" fill="none"><circle cx="14" cy="14" r="14" fill="#4fc3f7"/><path d="M14 8v12M8 14h12" stroke="#fff" strokeWidth="2" strokeLinecap="round"/></svg>
            </button>
          </div>
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
            {chats.map(chat => {
              // Группа — только если есть название (name)
              const isGroup = !!chat.name;
              let title = chat.name;
              let avatar = '/window.svg';
              let role;
              if (!isGroup) {
                const other = chat.users.find(u => u.id !== (session?.user as any)?.id);
                if (other) {
                  title = other.login;
                  avatar = other.avatar || '/window.svg';
                  role = other.role;
                }
              }
              return (
                <a
                  key={chat.id}
                  href={`/chat/${isGroup ? chat.id : chat.users.find(u => u.id !== (session?.user as any)?.id)?.id}`}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 18, padding: '18px 28px', borderRadius: 14,
                    background: '#191a1e', boxShadow: '0 2px 8px #2222',
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
                    {lastMessages[chat.id] && (
                      <span style={{fontSize: 13, color: '#bbb'}}>
                        {/* <span style={{color:'#229ed9',fontWeight:500}}>{lastMessages[chat.id]!.senderId === (session?.user as any)?.id ? 'Вы: ' : ''}</span> */}
                        {lastMessages[chat.id]!.text.length > 60
                          ? lastMessages[chat.id]!.text.slice(0, 60) + '...'
                          : lastMessages[chat.id]!.text}
                      </span>
                    )}
                  </div>
                </a>
              );
            })}
          </div>
        )}
        {/* ...удалена кнопка снизу справа... */}
        {/* Модальное окно */}
        {showModal && (
          <div style={{position:'fixed',top:0,left:0,width:'100vw',height:'100vh',background:'#000a',zIndex:101,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <div style={{background:'#181818',borderRadius:16,padding:32,minWidth:320,maxWidth:400,boxShadow:'0 4px 32px #0007',display:'flex',flexDirection:'column',gap:18}}>
              <h3 style={{color:'#e3e8f0',fontWeight:600,fontSize:22,marginBottom:8}}>Создать группу</h3>
              <input
                type="text"
                placeholder="Название группы"
                value={groupName}
                onChange={e=>setGroupName(e.target.value)}
                style={{padding:'10px 14px',borderRadius:8,border:'1px solid #333',background:'#222',color:'#fff',fontSize:16,outline:'none'}}
                required
              />
              <input
                type="text"
                placeholder="URL аватарки группы (необязательно)"
                value={groupAvatar}
                onChange={e=>setGroupAvatar(e.target.value)}
                style={{padding:'10px 14px',borderRadius:8,border:'1px solid #333',background:'#222',color:'#fff',fontSize:16,outline:'none'}}
              />
              <div style={{maxHeight:180,overflowY:'auto',marginBottom:8,display:'flex',flexWrap:'wrap',gap:10}}>
                {friends.map(friend => {
                  const isSelected = selected.includes(friend.id);
                  const isSelf = (session?.user && friend.id === (session.user as any).id);
                  return (
                    <div
                      key={friend.id}
                      onClick={() => {
                        if (isSelf) return; // нельзя снять себя
                        setSelected(sel =>
                          isSelected ? sel.filter(id => id !== friend.id) : [...sel, friend.id]
                        );
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 7, padding: '8px 12px', fontSize: 16,
                        borderRadius: 8, background: isSelected ? '#222c3a' : '#23242a', minWidth: 140,
                        flex: '1 1 140px', boxSizing: 'border-box', color: isSelected ? '#fff' : '#e3e8f0',
                        boxShadow: isSelected ? '0 2px 8px #229ed966' : 'none', cursor: isSelf ? 'not-allowed' : 'pointer', border: isSelected ? '2px solid #4fc3f7' : '2px solid transparent', transition: 'all .15s', opacity: isSelf ? 0.7 : 1
                      }}
                      title={isSelf ? 'Вы всегда участник группы' : undefined}
                    >
                      <img src={friend.avatar || '/window.svg'} alt="avatar" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', background: '#444', marginRight: 6 }} />
                      <span style={{ fontWeight: 500 }}>{friend.login}{isSelf && ' (Вы)'}</span>
                    </div>
                  );
                })}
              </div>
              <div style={{display:'flex',gap:12,marginTop:8}}>
                <button
                  onClick={handleCreateGroup}
                  style={{flex:1,padding:'12px 0',borderRadius:8,border:'none',background:'#4fc3f7',color:'#111',fontWeight:600,fontSize:18,cursor:'pointer',transition:'background .2s'}}
                >Создать</button>
                <button
                  onClick={()=>setShowModal(false)}
                  style={{flex:1,padding:'12px 0',borderRadius:8,border:'none',background:'#333',color:'#fff',fontWeight:600,fontSize:18,cursor:'pointer',transition:'background .2s'}}
                >Отмена</button>
              </div>
            </div>
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


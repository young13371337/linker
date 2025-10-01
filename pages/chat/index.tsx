import React, { useState, useEffect } from 'react';
import { useSession } from 'next-auth/react';
import ToastNotification from './ToastNotification';

interface Friend {
  id: string;
  login: string;
  avatar?: string | null;
  role?: string;
  isOnline?: boolean;
}

const ChatPage: React.FC = () => {
  const [showModal, setShowModal] = useState(false);
  const [selected, setSelected] = useState<string[]>([]);
  const [groupName, setGroupName] = useState("");
  const [toast, setToast] = useState<{type: 'error'|'success', message: string}|null>(null);

  const handleCreateGroup = async () => {
    if (selected.length < 2) {
      setToast({ type: 'error', message: 'Слишком мало участников, минимум - 3' });
      return;
    }
    try {
      const res = await fetch('/api/chats', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: groupName, userIds: selected })
      });
      const data = await res.json();
      if (res.ok) {
        setToast({ type: 'success', message: 'Группа успешно создана!' });
        setShowModal(false);
        setSelected([]);
        setGroupName("");
      } else {
        setToast({ type: 'error', message: data.error || 'Ошибка создания группы' });
      }
    } catch {
      setToast({ type: 'error', message: 'Ошибка сети' });
    }
  };
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
        {/* ...удалена кнопка снизу справа... */}
        {/* Модальное окно */}
        {showModal && (
          <div style={{position:'fixed',top:0,left:0,width:'100vw',height:'100vh',background:'#000a',zIndex:101,display:'flex',alignItems:'center',justifyContent:'center'}}>
            <div style={{background:'#181818',borderRadius:16,padding:32,minWidth:320,maxWidth:400,boxShadow:'0 4px 32px #0007',display:'flex',flexDirection:'column',gap:18}}>
              <h3 style={{color:'#e3e8f0',fontWeight:600,fontSize:22,marginBottom:8}}>Создать группу</h3>
              <input
                type="text"
                placeholder="Название группы (необязательно)"
                value={groupName}
                onChange={e=>setGroupName(e.target.value)}
                style={{padding:'10px 14px',borderRadius:8,border:'1px solid #333',background:'#222',color:'#fff',fontSize:16,outline:'none'}}
              />
              <div style={{maxHeight:180,overflowY:'auto',marginBottom:8,display:'flex',flexWrap:'wrap',gap:10}}>
                {friends.map(friend => {
                  const isSelected = selected.includes(friend.id);
                  return (
                    <div
                      key={friend.id}
                      onClick={() => {
                        setSelected(sel =>
                          isSelected ? sel.filter(id => id !== friend.id) : [...sel, friend.id]
                        );
                      }}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 7, padding: '8px 12px', fontSize: 16,
                        borderRadius: 8, background: isSelected ? '#222c3a' : '#23242a', minWidth: 140,
                        flex: '1 1 140px', boxSizing: 'border-box', color: isSelected ? '#fff' : '#e3e8f0',
                        boxShadow: isSelected ? '0 2px 8px #229ed966' : 'none', cursor: 'pointer', border: isSelected ? '2px solid #4fc3f7' : '2px solid transparent', transition: 'all .15s'
                      }}
                    >
                      <img src={friend.avatar || '/window.svg'} alt="avatar" style={{ width: 24, height: 24, borderRadius: '50%', objectFit: 'cover', background: '#444', marginRight: 6 }} />
                      <span style={{ fontWeight: 500 }}>{friend.login}</span>
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


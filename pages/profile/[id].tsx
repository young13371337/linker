import React, { useEffect, useState } from "react";

// Small copy button component used on other users' profile page
function CopyButton({ idToCopy }: { idToCopy: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(idToCopy);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch (e) {
      // ignore
    }
  };
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <button onClick={handleCopy} aria-label="Copy UserID" style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, background: 'transparent', border: '1px solid rgba(255,255,255,0.06)', color: '#e6e6e6', cursor: 'pointer' }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="9" y="9" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.2"/><rect x="4" y="4" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.2"/></svg>
      </button>
      {copied && <span style={{ fontSize: 13, color: '#9aa0a6' }}>Скопировано</span>}
    </div>
  );
}
import { useRouter } from "next/router";

export default function UserProfile() {
  const router = useRouter();
  const { id } = router.query;
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isFriend, setIsFriend] = useState(false);
  const [requestSent, setRequestSent] = useState(false);
  const [currentUser, setCurrentUser] = useState<{id:string,login:string}|null>(null);

  useEffect(() => {
    if (!id) return;
    // Получаем текущего пользователя из localStorage
    let loadedUser = null;
    try {
      const u = localStorage.getItem('app_user') || localStorage.getItem('user');
      if (u) loadedUser = JSON.parse(u);
    } catch {}
    setCurrentUser(loadedUser);
    fetch(`/api/profile?userId=${id}`)
      .then(r => r.json())
      .then(data => {
        setUser(data.user);
        setLoading(false);
        // Проверяем, друг ли этот пользователь — поиск только по полю link
        if (data.user && loadedUser && data.user.link) {
          const q = encodeURIComponent(data.user.link);
          fetch(`/api/friends/search?link=${q}&userId=${loadedUser.id}`)
            .then(r => r.json())
            .then(fdata => {
              if (Array.isArray(fdata.users)) {
                const found = fdata.users.find((u: any) => u.id === data.user.id);
                setIsFriend(!!(found && found.isFriend));
              } else {
                setIsFriend(false);
              }
            })
            .catch(() => setIsFriend(false));
        } else {
          setIsFriend(false);
        }
      })
      .catch(() => {
        setUser(null);
        setLoading(false);
      });
  }, [id]);

  if (loading) return <div style={{ color: "#bbb", textAlign: "center", marginTop: 40 }}>Загрузка профиля...</div>;
  if (!user) return <div style={{ color: "#e74c3c", textAlign: "center", marginTop: 40 }}>Пользователь не найден</div>;

  return (
    <div
      style={{
        maxWidth: 600,
        margin: "40px auto",
        padding: 32,
        borderRadius: 18,
        boxShadow: "0 2px 24px #0006",
        color: "#fff",
        fontFamily: "Segoe UI, Verdana, Arial, sans-serif",
        background: "#23242a",
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      {user.backgroundUrl && (
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 160,
          zIndex: 0,
          borderRadius: '18px 18px 0 0',
          background: `linear-gradient(rgba(30,32,42,0.25),rgba(30,32,42,0.45)), url(${user.backgroundUrl}) center/cover no-repeat`
        }} />
      )}
  <div style={{ display: "flex", alignItems: "center", gap: 18, paddingBottom: 18, borderBottom: "1px solid #333" }}>
        <div style={{ position: "relative" }}>
          {user.avatar ? (
            <img src={user.avatar} alt="avatar" style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", background: "#444" }} />
          ) : (
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#444", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 38, color: "#bbb" }}>{(user.link ? user.link[0] : user.login[0]).toUpperCase()}</div>
          )}
          {/* Статус dnd/online/offline */}
          {user.status === 'dnd' ? (
            <img src="/moon-dnd.svg" alt="dnd" style={{ position: "absolute", left: 48, top: 44, width: 18, height: 18 }} />
          ) : (
            <span style={{ position: "absolute", left: 50, top: 46, width: 14, height: 14, borderRadius: "50%", background: user.status === 'online' ? "#1ed760" : "#bbb", border: "2px solid #fff" }} />
          )}
        </div>
  <div style={{ flex: 1 }}>
          <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: 1, display: "flex", flexDirection: "column", gap: 4 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, position: 'relative' }}>
              <span style={{ fontFamily: 'Segoe UI, Roboto, sans-serif' }}>{user.link ? `@${user.link}` : user.login}</span>
              {user.role === "admin" && (
              <span
                style={{ position: 'relative', display: 'inline-block' }}
                onMouseEnter={e => {
                  const tip = document.createElement('div');
                  tip.innerText = 'Этот аккаунт принадлежит создателю Linker';
                  Object.assign(tip.style, {
                    position: 'absolute', top: '32px', left: '0', background: '#23242a', color: '#fff', padding: '7px 16px', borderRadius: '10px', fontSize: '15px', boxShadow: '0 2px 16px #229ED944', zIndex: 1000, whiteSpace: 'nowrap'
                  });
                  tip.className = 'admin-tooltip';
                  if (e.currentTarget) e.currentTarget.appendChild(tip);
                }}
                onMouseLeave={e => {
                  if (e.currentTarget) {
                    const tips = e.currentTarget.querySelectorAll('.admin-tooltip');
                    tips.forEach((tip: any) => tip.remove());
                  }
                }}
              >
                <img src="/role-icons/admin.svg" alt="admin" style={{width:18, height:18, marginLeft:2, verticalAlign:'middle', cursor:'pointer'}} />
              </span>
            )}
            {user.role === "pepe" && (
              <span
                style={{ position: 'relative', display: 'inline-block' }}
                onMouseEnter={e => {
                  const tip = document.createElement('div');
                  tip.innerText = 'пепешка дается только легендам, или же разработчикам - эта и тем, и другим';
                  Object.assign(tip.style, {
                    position: 'absolute', top: '40px', left: '0', background: '#23242a', color: '#fff', padding: '7px 16px', borderRadius: '10px', fontSize: '15px', boxShadow: '0 2px 16px #229ED944', zIndex: 1000, whiteSpace: 'nowrap'
                  });
                  tip.className = 'pepe-tooltip';
                  if (e.currentTarget) e.currentTarget.appendChild(tip);
                }}
                onMouseLeave={e => {
                  if (e.currentTarget) {
                    const tips = e.currentTarget.querySelectorAll('.pepe-tooltip');
                    tips.forEach((tip: any) => tip.remove());
                  }
                }}
              >
                <img src="/role-icons/pepe.svg" alt="pepe" style={{width:40, height:40, marginLeft:0, verticalAlign:'middle', cursor:'pointer'}} />
              </span>
            )}
            {user.role === "moderator" && (
              <span
                style={{ position: 'relative', display: 'inline-block' }}
                onMouseEnter={e => {
                  const tip = document.createElement('div');
                  tip.innerText = 'Аккаунт имеет статус модератора, отвечает за вашу безопасность';
                  Object.assign(tip.style, {
                    position: 'absolute', top: '32px', left: '0', background: '#23242a', color: '#fff', padding: '7px 16px', borderRadius: '10px', fontSize: '15px', boxShadow: '0 2px 16px #229ED944', zIndex: 1000, whiteSpace: 'nowrap'
                  });
                  tip.className = 'moderator-tooltip';
                  if (e.currentTarget) e.currentTarget.appendChild(tip);
                }}
                onMouseLeave={e => {
                  if (e.currentTarget) {
                    const tips = e.currentTarget.querySelectorAll('.moderator-tooltip');
                    tips.forEach((tip: any) => tip.remove());
                  }
                }}
              >
                <img src="/role-icons/moderator.svg" alt="moderator" style={{width:18, height:18, marginLeft:2, verticalAlign:'middle', cursor:'pointer'}} />
              </span>
            )}
            {user.role === "verif" && (
              <span
                style={{ position: 'relative', display: 'inline-block' }}
                onMouseEnter={e => {
                  const tip = document.createElement('div');
                  tip.innerText = 'Аккаунт верифицирован компаниней Linker';
                  Object.assign(tip.style, {
                    position: 'absolute', top: '32px', left: '0', background: '#23242a', color: '#fff', padding: '7px 16px', borderRadius: '10px', fontSize: '15px', boxShadow: '0 2px 16px #229ED944', zIndex: 1000, whiteSpace: 'nowrap'
                  });
                  tip.className = 'verif-tooltip';
                  if (e.currentTarget) e.currentTarget.appendChild(tip);
                }}
                onMouseLeave={e => {
                  if (e.currentTarget) {
                    const tips = e.currentTarget.querySelectorAll('.verif-tooltip');
                    tips.forEach((tip: any) => tip.remove());
                  }
                }}
              >
                <img src="/role-icons/verif.svg" alt="verif" style={{width:18, height:18, marginLeft:2, verticalAlign:'middle', cursor:'pointer'}} />
              </span>
            )}
            {/* Кнопка заявки */}
            {currentUser && user && currentUser.id !== user.id && !isFriend && (
              requestSent ? (
                <span style={{ color: '#229ed9', fontWeight: 500, fontSize: 15, marginLeft: 12 }}>Заявка отправлена</span>
              ) : (
                <button
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: '#229ed9',
                    border: 'none',
                    borderRadius: 18,
                    color: '#fff',
                    fontWeight: 500,
                    fontSize: 15,
                    padding: '7px 18px',
                    boxShadow: '0 2px 12px #229ed944',
                    cursor: 'pointer',
                    transition: 'background .18s',
                  }}
                  title="Отправить заявку в друзья"
                  onClick={async () => {
                    if (!currentUser || !user) return;
                    try {
                      const res = await fetch('/api/friends/request', {
                        method: 'POST',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: currentUser.id, friendId: user.id })
                      });
                      if (res.ok) {
                        setRequestSent(true);
                      } else {
                        const data = await res.json().catch(() => ({}));
                        alert(data?.error || 'Ошибка при отправке заявки');
                      }
                    } catch (e) {
                      alert('Ошибка сети');
                    }
                  }}
                >
                  + В друзья
                </button>
              )
            )}
            </div>
            <div style={{ fontSize: 15, color: "#bbb", marginTop: 2 }}>{user.description}</div>
            {isFriend && (
              <div style={{ fontSize: 14, color: '#6e6e6eff', fontWeight: 500, marginTop: 4 }}>Ваш друг</div>
            )}
          </div>
        </div>
      </div>
      {/* If this user is a friend, show their UserID and a copy button */}
      {isFriend && user && user.id && (
        <div style={{ marginTop: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: 'rgba(255,255,255,0.02)', padding: '8px 12px', borderRadius: 10, color: '#ccc', marginTop: 12 }}>
            <div style={{ fontSize: 13, color: '#bfbfbf' }}>UserID — <span style={{ color: '#9aa0a6', fontWeight: 700 }}>{user.id}</span></div>
            <CopyButton idToCopy={user.id} />
          </div>
        </div>
      )}
    </div>
  );
}

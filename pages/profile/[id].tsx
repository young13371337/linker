import React, { useEffect, useState } from "react";
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
        // Проверяем, друг ли этот пользователь
        if (data.user && loadedUser && data.user.login) {
          fetch(`/api/friends/search?login=${data.user.login}&userId=${loadedUser.id}`)
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
        background: user.backgroundUrl
          ? `linear-gradient(rgba(30,32,42,0.65),rgba(30,32,42,0.82)), url(${user.backgroundUrl}) center/cover no-repeat`
          : "#23242a"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 18, paddingBottom: 18, borderBottom: "1px solid #333" }}>
        <div style={{ position: "relative" }}>
          {user.avatar ? (
            <img src={user.avatar} alt="avatar" style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", background: "#444" }} />
          ) : (
            <div style={{ width: 64, height: 64, borderRadius: "50%", background: "#444", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 38, color: "#bbb" }}>{user.login[0].toUpperCase()}</div>
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
              <span>{user.login}</span>
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
                    await fetch('/api/friends/request', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ userId: currentUser.id, friendId: user.id })
                    });
                    setRequestSent(true);
                  }}
                >
                  + В друзья
                </button>
              )
            )}
            </div>
            <div style={{ fontSize: 15, color: "#bbb", marginTop: 2 }}>{user.description}</div>
            {isFriend && (
              <div style={{ fontSize: 14, color: '#1ed760', fontWeight: 500, marginTop: 4 }}>Ваш друг</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

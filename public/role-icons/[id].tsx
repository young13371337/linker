import React, { useEffect, useState } from "react";
import { useRouter } from "next/router";

export default function UserProfile() {
  const router = useRouter();
  const { id } = router.query;
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    fetch(`/api/profile?userId=${id}`)
      .then(r => r.json())
      .then(data => {
        setUser(data.user);
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
  fontFamily: 'inherit',
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
          {/* Статус онлайн/оффлайн */}
          <span style={{ position: "absolute", left: 48, top: 44, width: 14, height: 14, borderRadius: "50%", background: user.isOnline ? "#1ed760" : "#bbb", border: "2px solid #fff" }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: 1, display: "flex", alignItems: "center", gap: 10 }}>
            {user.login}
            {/* Бейджик роли */}
            {user.role === "admin" && (
              <span style={{ position: 'relative', display: 'inline-block' }}
                onMouseEnter={e => {
                  const tip = document.createElement('div');
                  tip.innerText = 'Этот аккаунт принадлежит создателю Linker';
                  tip.style.position = 'absolute';
                  tip.style.top = '32px';
                  tip.style.left = '0';
                  tip.style.background = '#23242a';
                  tip.style.color = '#fff';
                  tip.style.padding = '7px 16px';
                  tip.style.borderRadius = '10px';
                  tip.style.fontSize = '15px';
                  tip.style.boxShadow = '0 2px 16px #229ED944';
                  tip.style.zIndex = '1000';
                  tip.style.whiteSpace = 'nowrap';
                  tip.className = 'admin-tooltip';
                  if (e.currentTarget) e.currentTarget.appendChild(tip);
                }}
                onMouseLeave={e => {
                  if (e.currentTarget) {
                    const tips = e.currentTarget.querySelectorAll('.admin-tooltip');
                    tips.forEach(tip => tip.remove());
                  }
                }}
              >
                <img src="/role-icons/admin.svg" alt="admin" style={{width:18, height:18, marginLeft:2, verticalAlign:'middle', cursor:'pointer'}} />
              </span>
            )}
            {user.role === "pepe" && (
              <span style={{ position: 'relative', display: 'inline-block' }}
                onMouseEnter={e => {
                  const tip = document.createElement('div');
                  tip.innerText = 'пепешка дается только легендам, или же разработчикам - эта и тем, и другим';
                  tip.style.position = 'absolute';
                  tip.style.top = '40px';
                  tip.style.left = '0';
                  tip.style.background = '#23242a';
                  tip.style.color = '#fff';
                  tip.style.padding = '7px 16px';
                  tip.style.borderRadius = '10px';
                  tip.style.fontSize = '15px';
                  tip.style.boxShadow = '0 2px 16px #229ED944';
                  tip.style.zIndex = '1000';
                  tip.style.whiteSpace = 'nowrap';
                  tip.className = 'pepe-tooltip';
                  if (e.currentTarget) e.currentTarget.appendChild(tip);
                }}
                onMouseLeave={e => {
                  if (e.currentTarget) {
                    const tips = e.currentTarget.querySelectorAll('.pepe-tooltip');
                    tips.forEach(tip => tip.remove());
                  }
                }}
              >
                <img src="/role-icons/pepe.svg" alt="pepe" style={{width:40, height:40, marginLeft:0, verticalAlign:'middle', cursor:'pointer'}} />
              </span>
            )}
            {user.role === "moderator" && (
              <span style={{ position: 'relative', display: 'inline-block' }}
                onMouseEnter={e => {
                  const tip = document.createElement('div');
                  tip.innerText = 'Аккаунт имеет статус модератора, отвечает за вашу безопасность';
                  tip.style.position = 'absolute';
                  tip.style.top = '32px';
                  tip.style.left = '0';
                  tip.style.background = '#23242a';
                  tip.style.color = '#fff';
                  tip.style.padding = '7px 16px';
                  tip.style.borderRadius = '10px';
                  tip.style.fontSize = '15px';
                  tip.style.boxShadow = '0 2px 16px #229ED944';
                  tip.style.zIndex = '1000';
                  tip.style.whiteSpace = 'nowrap';
                  tip.className = 'moderator-tooltip';
                  if (e.currentTarget) e.currentTarget.appendChild(tip);
                }}
                onMouseLeave={e => {
                  if (e.currentTarget) {
                    const tips = e.currentTarget.querySelectorAll('.moderator-tooltip');
                    tips.forEach(tip => tip.remove());
                  }
                }}
              >
                <img src="/role-icons/moderator.svg" alt="moderator" style={{width:18, height:18, marginLeft:2, verticalAlign:'middle', cursor:'pointer'}} />
              </span>
            )}
            {user.role === "verif" && (
              <span style={{ position: 'relative', display: 'inline-block' }}
                onMouseEnter={e => {
                  const tip = document.createElement('div');
                  tip.innerText = 'Аккаунт верифицирован компаниней Linker';
                  tip.style.position = 'absolute';
                  tip.style.top = '32px';
                  tip.style.left = '0';
                  tip.style.background = '#23242a';
                  tip.style.color = '#fff';
                  tip.style.padding = '7px 16px';
                  tip.style.borderRadius = '10px';
                  tip.style.fontSize = '15px';
                  tip.style.boxShadow = '0 2px 16px #229ED944';
                  tip.style.zIndex = '1000';
                  tip.style.whiteSpace = 'nowrap';
                  tip.className = 'verif-tooltip';
                  if (e.currentTarget) e.currentTarget.appendChild(tip);
                }}
                onMouseLeave={e => {
                  if (e.currentTarget) {
                    const tips = e.currentTarget.querySelectorAll('.verif-tooltip');
                    tips.forEach(tip => tip.remove());
                  }
                }}
              >
                <img src="/role-icons/verif.svg" alt="verif" style={{width:18, height:18, marginLeft:2, verticalAlign:'middle', cursor:'pointer'}} />
              </span>
            )}
          </div>
          <div style={{ fontSize: 15, color: "#bbb", marginTop: 6 }}>{user.description}</div>
        </div>
      </div>
    </div>
  );
}

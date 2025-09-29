import React, { useState, useEffect } from "react";
import { getUser } from "../lib/session";
import { FaUserCircle, FaCog, FaShieldAlt, FaPalette } from "react-icons/fa";

function generate2FAToken() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789&?_+-";
  let token = "";
  for (let i = 0; i < 128; i++) token += chars[Math.floor(Math.random() * chars.length)];
  return token;
}

export default function ProfilePage() {
  const [user, setUser] = useState<{ id: string; login: string; verified?: boolean } | null>(null);
  const [userRole, setUserRole] = useState<string>("user");
  const [removeFriendId, setRemoveFriendId] = useState<string | null>(null);
  const [desc, setDesc] = useState<string>("");
  const [avatar, setAvatar] = useState<string>("");
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [has2FA, setHas2FA] = useState<boolean>(false);
  const [token, setToken] = useState<string>("");

  // Проверка наличия 2FA при загрузке профиля (с защитой от ошибок)
  useEffect(() => {
    if (!user) return;
    fetch(`/api/profile?userId=${user.id}`)
      .then(r => r.json())
      .then(data => {
        setHas2FA(!!data.user.twoFactorToken);
        setToken(data.user.twoFactorToken || "");
        setUserRole(data.user.role || "user");
        setDesc(data.user.description || "");
        setAvatar(data.user.avatar || "");
        setFriends(data.user.friends || []);
        setSessions(data.user.sessions || []);
      })
      .catch(() => {
        setHas2FA(false);
        setToken("");
        setUserRole("user");
        setDesc("");
        setAvatar("");
        setFriends([]);
        setSessions([]);
      });
  }, [user]);

  // Включить 2FA
  async function handleEnable2FA() {
    if (!user) return;
    const newToken = generate2FAToken();
    setToken(newToken);
    setHas2FA(true);
    await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, twoFactorToken: newToken })
    });
  }

  // Отключить 2FA
  async function handleDisable2FA() {
    if (!user) return;
    setToken("");
    setHas2FA(false);
    await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id, twoFactorToken: null })
    });
  }
  const [newPassword, setNewPassword] = useState<string>("");
  const [passwordChanged, setPasswordChanged] = useState<boolean>(false);
  const [friends, setFriends] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);

  const handleRemoveFriend = async () => {
    if (!user || !removeFriendId) return;
    await fetch("/api/friends/remove", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, friendId: removeFriendId })
    });
    // Обновить список друзей
    fetch(`/api/profile?userId=${user.id}`)
      .then(r => r.json())
      .then(data => {
        setFriends(data.user.friends || []);
      });
    setRemoveFriendId(null);
  };
  // ...existing code...
  useEffect(() => {
    const u = getUser();
    setUser(u);
  }, []);

  // ...existing code...

  return (
    <div style={{ maxWidth: 600, margin: "40px auto", padding: 32, background: "#23242a", borderRadius: 18, boxShadow: "0 2px 24px #0006", color: "#fff", fontFamily: "Segoe UI, Verdana, Arial, sans-serif" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 18, paddingBottom: 18, borderBottom: "1px solid #333" }}>
        <div style={{ position: "relative" }}>
          {avatar ? (
            <img src={avatar} alt="avatar" style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", background: "#444" }} />
          ) : (
            <FaUserCircle style={{ fontSize: 64, color: "#444" }} />
          )}
          {/* Статус */}
          <span style={{ position: "absolute", left: 48, top: 44, width: 14, height: 14, borderRadius: "50%", background: "#1ed760", border: "2px solid #23242a" }} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: 1, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {user?.login || "user"}
              {userRole === "admin" && (
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
                  <img src="/role-icons/admin.svg" alt="admin" style={{width:24, height:24, marginLeft:2, verticalAlign:'middle', cursor:'pointer'}} />
                </span>
              )}
              {userRole === "moderator" && (
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
                  <img src="/role-icons/moderator.svg" alt="moderator" style={{width:24, height:24, marginLeft:2, verticalAlign:'middle', cursor:'pointer'}} />
                </span>
              )}
              {userRole === "verif" && (
                <span style={{ position: 'relative', display: 'inline-block' }}
                  onMouseEnter={e => {
                    const tip = document.createElement('div');
                    tip.innerText = 'аккаунт верифицирован';
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
                  <img src="/role-icons/verif.svg" alt="verif" style={{width:24, height:24, marginLeft:2, verticalAlign:'middle', cursor:'pointer'}} />
                </span>
              )}
            </span>
          </div>
          <div style={{ fontSize: 15, color: "#bbb", marginTop: 2 }}>{desc || "Нет описания"}</div>
        </div>
  <button onClick={() => setShowSettings(true)} style={{ background: "#23242a", color: "#fff", border: "1px solid #444", borderRadius: 12, padding: "8px 18px", fontSize: 15, cursor: "pointer", fontWeight: 500, display: "flex", alignItems: "center", gap: 8, transition: "background 0.2s, box-shadow 0.2s" }} onMouseOver={e => {e.currentTarget.style.background="#2a2b32";e.currentTarget.style.boxShadow="0 2px 12px #4fc3f7a0"}} onMouseOut={e => {e.currentTarget.style.background="#23242a";e.currentTarget.style.boxShadow="none"}}>
          <FaCog /> Настройки
        </button>
      </div>

      {/* Список друзей и устройства */}
  <div style={{ display: "flex", gap: 24, marginTop: 24, transition: "gap 0.3s" }}>
        {/* Список друзей */}
        <div style={{ flex: 1, background: "#23242a", borderRadius: 14, padding: 16, boxShadow: "0 1px 8px #0003" }}>
          <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 10 }}>Список друзей</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {friends.length === 0 ? (
              <div style={{ color: "#bbb", fontSize: 16 }}>Нет :(</div>
            ) : friends.map(f => (
              <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 12, background: "#23242a", borderRadius: 14, padding: "12px 16px", boxShadow: "0 2px 12px #0006", transition: "background 0.2s, box-shadow 0.2s", position: "relative" }} onMouseOver={e => {e.currentTarget.style.background="#292a2e";e.currentTarget.style.boxShadow="0 2px 16px #229ED944"}} onMouseOut={e => {e.currentTarget.style.background="#23242a";e.currentTarget.style.boxShadow="0 2px 12px #0006"}}>
                <div style={{ position: "relative", width: 44, height: 44, borderRadius: "50%", background: "#444", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }} onClick={() => window.location.href = `/profile/${f.id}`}> 
                  <img src={f.avatar || "https://ui-avatars.com/api/?name=" + (f.login || f.friendId)} alt="avatar" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", background: "#444" }} />
                  <span style={{ position: "absolute", left: 32, top: 32, width: 12, height: 12, borderRadius: "50%", background: f.isOnline ? "#1ed760" : "#888", border: "2px solid #23242a" }} />
                </div>
                <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span style={{ fontSize: 17, fontWeight: 600, cursor: "pointer", color: "#fff" }} onClick={() => window.location.href = `/profile/${f.id}`}>{f.login || f.friendId}</span>
                  {f.role === "admin" && (
                    <img src="/role-icons/admin.svg" alt="admin" style={{width:24, height:24, marginLeft:4, verticalAlign:'middle'}} />
                  )}
                  {f.role === "moderator" && (
                    <img src="/role-icons/moderator.svg" alt="moderator" style={{width:24, height:24, marginLeft:4, verticalAlign:'middle'}} />
                  )}
                  {f.role === "verif" && (
                    <img src="/role-icons/verif.svg" alt="verif" style={{width:24, height:24, marginLeft:4, verticalAlign:'middle'}} />
                  )}
                </span>
                <button onClick={() => setRemoveFriendId(f.id)} style={{ position: "absolute", right: -10, top: 10, background: "transparent", color: "#fff", border: "none", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, cursor: "pointer", opacity: 0.5, transition: "opacity 0.2s", zIndex: 2 }} title="Удалить друга" onMouseOver={e => e.currentTarget.style.opacity = "0.8"} onMouseOut={e => e.currentTarget.style.opacity = "0.5"}>
                  ×
                </button>
              </div>
            ))}
            {removeFriendId && (
              <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "#000a", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <div style={{ background: "#23242a", borderRadius: 18, padding: 32, minWidth: 320, boxShadow: "0 2px 24px #0008", color: "#fff", position: "relative", textAlign: "center" }}>
                  <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 18 }}>Вы уверены, что хотите удалить друга?</div>
                  <div style={{ display: "flex", gap: 18, justifyContent: "center" }}>
                    <button onClick={handleRemoveFriend} style={{ background: "#e74c3c", color: "#fff", border: "none", borderRadius: 8, padding: "8px 22px", fontSize: 16, fontWeight: 600, cursor: "pointer", boxShadow: "0 2px 8px #e74c3c44" }}>Да</button>
                    <button onClick={() => setRemoveFriendId(null)} style={{ background: "#444", color: "#fff", border: "none", borderRadius: 8, padding: "8px 22px", fontSize: 16, fontWeight: 600, cursor: "pointer" }}>Отменить</button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        {/* Устройства/сессии */}
        <div style={{ flex: 1, background: "#23242a", borderRadius: 14, padding: 16, boxShadow: "0 1px 8px #0003" }}>
          <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 10 }}>Ваши устройства</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {sessions.length === 0 ? (
              <div style={{ color: "#bbb", fontSize: 16 }}>Нет устройств</div>
            ) : (
              <>
                {/* Текущая сессия */}
                {sessions.filter(s => s.isActive).map(current => (
                  <div key={current.id} style={{ background: "#18191c", borderRadius: 10, padding: "8px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ color: "#fff", fontWeight: 600 }}>
                      {current.deviceName} <span style={{ color: "#1ed760", fontSize: 13, marginLeft: 6 }}>(текущий)</span>
                    </span>
                    <button
                      onClick={async () => {
                        if (!user) return;
                        await fetch("/api/session-end", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ userId: user.id, sessionId: current.id })
                        });
                        localStorage.removeItem("user");
                        window.location.href = "/auth/login";
                      }}
                      style={{
                        background: 'transparent',
                        color: '#e74c3c',
                        border: 'none',
                        borderRadius: 7,
                        padding: '4px 10px',
                        fontSize: 13,
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'background 0.18s, color 0.18s',
                      }}
                      onMouseOver={e => {
                        e.currentTarget.style.background = '#e74c3c';
                        e.currentTarget.style.color = '#fff';
                      }}
                      onMouseOut={e => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = '#e74c3c';
                      }}
                    >Завершить</button>
                  </div>
                ))}
                {/* Остальные сессии */}
                {sessions.filter(s => !s.isActive).length > 0 && (
                  <div style={{ marginTop: 6 }}>
                    {sessions.filter(s => !s.isActive).map(s => (
                      <div key={s.id} style={{ background: "#18191c", borderRadius: 10, padding: "8px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 6 }}>
                        <span style={{ color: "#bbb", fontWeight: 400 }}>{s.deviceName}</span>
                        <button
                          onClick={async () => {
                            if (!user) return;
                            await fetch("/api/session-end", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ userId: user.id, sessionId: s.id })
                            });
                            // Обновить список сессий после завершения
                            fetch(`/api/profile?userId=${user.id}`)
                              .then(r => r.json())
                              .then(data => {
                                setSessions(data.user.sessions || []);
                              });
                          }}
                          style={{ background: "#e74c3c", color: "#fff", border: "none", borderRadius: 7, padding: "6px 14px", fontSize: 14, fontWeight: 500, cursor: "pointer" }}
                        >Завершить</button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Модальное окно настроек */}
      {showSettings && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "#000a", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", animation: "fadeIn 0.3s" }}>
          <div style={{ background: "#23242a", borderRadius: 18, padding: 32, minWidth: 320, boxShadow: "0 2px 24px #0008", color: "#fff", position: "relative", transition: "box-shadow 0.3s, background 0.3s", maxHeight: "80vh", overflowY: "auto", scrollbarWidth: "none" }}>
            <button onClick={() => setShowSettings(false)} style={{ position: "sticky", top: 0, right: 0, float: "right", zIndex: 100, background: "none", border: "none", color: "#fff", fontSize: 22, cursor: "pointer", transition: "color 0.2s", marginLeft: "calc(100% - 40px)", marginBottom: 8 }} onMouseOver={e => {e.currentTarget.style.color="#4fc3f7"}} onMouseOut={e => {e.currentTarget.style.color="#fff"}}>✕</button>
            <h3 style={{ fontSize: 20, fontWeight: 600, marginBottom: 18 }}>Настройки профиля</h3>
            {/* Безопасность */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <FaShieldAlt style={{ color: '#bbb', fontSize: 22 }} />
              <span style={{ color: '#bbb', fontWeight: 700, fontSize: 17, letterSpacing: 0.5 }}>Безопасность</span>
            </div>
            <div style={{ marginBottom: 22, marginLeft: 0, maxWidth: 320, transition: "box-shadow 0.2s, background 0.2s" }}>
              <label style={{ fontSize: 15, fontWeight: 500 }}>Новый пароль:</label><br />
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} style={{ marginTop: 6, width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #444", background: "#18191c", color: "#fff", fontSize: 15 }} />
              <button
                style={{ marginTop: 10, background: "#18191c", color: "#fff", border: "1px solid #444", borderRadius: 8, padding: "8px 18px", fontSize: 15, cursor: "pointer", fontWeight: 500 }}
                onClick={async () => {
                  if (!user || !newPassword) return;
                  await fetch('/api/profile', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: user.id, password: newPassword })
                  });
                  setNewPassword("");
                  setPasswordChanged(true);
                  setTimeout(() => setPasswordChanged(false), 2000);
                }}
              >Сменить пароль</button>
              {passwordChanged && <span style={{ marginLeft: 12, color: "#1ed760", fontWeight: 500 }}>Пароль изменён!</span>}
            </div>
            {/* 2FA (улучшенный UX) */}
            <div style={{ marginBottom: 22, marginLeft: 0, maxWidth: 420, padding: '16px 0', borderRadius: 10, background: '#18191c', boxShadow: '0 1px 6px #0002', display: 'flex', alignItems: 'flex-start', gap: 18 }}>
              <FaShieldAlt style={{ color: has2FA ? '#1ed760' : '#bbb', fontSize: 22, marginLeft: 12, marginTop: 4 }} />
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 600, fontSize: 15, color: '#fff' }}>Двухфакторная аутентификация</div>
                <div style={{ fontSize: 13, color: has2FA ? '#1ed760' : '#bbb', marginTop: 2, marginBottom: 8 }}>
                  {has2FA ? 'Включена' : 'Отключена'}
                </div>
                {has2FA && (
                  <div style={{ fontSize: 13, color: '#bbb', marginBottom: 8 }}>
                    <div style={{ marginBottom: 4 }}>Ваш токен:</div>
                    <div
                      style={{
                        width: '100%',
                        fontFamily: 'monospace',
                        color: '#fff',
                        background: '#23242a',
                        border: '1px solid #444',
                        borderRadius: 6,
                        padding: '8px 6px 8px 6px',
                        fontSize: 15,
                        wordBreak: 'break-all',
                        whiteSpace: 'pre-wrap',
                        lineHeight: 1.5,
                        marginBottom: 8,
                        minHeight: 40,
                        maxHeight: 120,
                        overflow: 'hidden',
                        boxSizing: 'border-box',
                        userSelect: 'all',
                        cursor: 'text',
                        textAlign: 'left'
                      }}
                    >{token}</div>
                    <button
                      style={{ background: '#4fc3f7', color: '#23242a', border: 'none', borderRadius: 7, padding: '6px 14px', fontSize: 14, fontWeight: 600, cursor: 'pointer', marginRight: 10 }}
                      onClick={() => {navigator.clipboard.writeText(token)}}
                    >Скопировать токен</button>
                    <button
                      style={{ background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 7, padding: '6px 14px', fontSize: 14, fontWeight: 500, cursor: 'pointer' }}
                      onClick={handleDisable2FA}
                    >Отключить 2FA</button>
                  </div>
                )}
                {!has2FA && (
                  <button
                    style={{ background: '#1ed760', color: '#23242a', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 15, cursor: 'pointer', fontWeight: 600, minWidth: 110 }}
                    onClick={handleEnable2FA}
                  >Включить 2FA</button>
                )}
              </div>
            </div>
            {/* Кастомизация */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10, marginTop: 24 }}>
              <FaPalette style={{ color: '#bbb', fontSize: 22 }} />
              <span style={{ color: '#bbb', fontWeight: 700, fontSize: 17, letterSpacing: 0.5 }}>Кастомизация</span>
            </div>
            <div style={{ marginBottom: 22, marginLeft: 0, maxWidth: 320, transition: "box-shadow 0.2s, background 0.2s" }}>
              <label style={{ fontSize: 15, fontWeight: 500 }}>Описание:</label><br />
              <input type="text" value={desc} onChange={e => setDesc(e.target.value)} style={{ marginTop: 6, width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #444", background: "#18191c", color: "#fff", fontSize: 15 }} />
              <button
                style={{ marginTop: 10, background: "#18191c", color: "#fff", border: "1px solid #444", borderRadius: 8, padding: "8px 18px", fontSize: 15, cursor: "pointer", fontWeight: 500 }}
                onClick={async () => {
                  if (!user) return;
                  await fetch('/api/profile', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: user.id, description: desc })
                  });
                  // Обновить профиль после сохранения
                  fetch(`/api/profile?userId=${user.id}`)
                    .then(r => r.json())
                    .then(data => {
                      setDesc(data.user.description || "");
                    });
                }}
              >Сохранить описание</button>
            </div>
            <div style={{ marginBottom: 22, marginLeft: 0, maxWidth: 320, transition: "box-shadow 0.2s, background 0.2s" }}>
              <label style={{ fontSize: 15, fontWeight: 500 }}>Аватарка (URL):</label><br />
              <input type="text" value={avatar} onChange={e => setAvatar(e.target.value)} style={{ marginTop: 6, width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #444", background: "#18191c", color: "#fff", fontSize: 15 }} />
              <button
                style={{ marginTop: 10, background: "#18191c", color: "#fff", border: "1px solid #444", borderRadius: 8, padding: "8px 18px", fontSize: 15, cursor: "pointer", fontWeight: 500 }}
                onClick={async () => {
                  if (!user) return;
                  await fetch('/api/profile', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: user.id, avatar })
                  });
                  // Обновить профиль после сохранения
                  fetch(`/api/profile?userId=${user.id}`)
                    .then(r => r.json())
                    .then(data => {
                      setAvatar(data.user.avatar || "");
                    });
                }}
              >Сохранить аватарку</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

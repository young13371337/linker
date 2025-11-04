import React, { useState, useEffect, useRef } from "react";
import UserStatus, { UserStatusType, statusLabels } from "../components/UserStatus";
import { useSession, signOut } from "next-auth/react";
// 2FA 6-digit input component
type CodeInputProps = {
  value: string;
  onChange: (val: string) => void;
  length?: number;
  disabled?: boolean;
};
function CodeInput({ value, onChange, length = 6, disabled = false }: CodeInputProps) {
  const inputsRef = useRef<Array<HTMLInputElement | null>>([]);
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>, idx: number) => {
    const val = e.target.value.replace(/[^0-9]/g, "").slice(0, 1);
  let newValueArr = value.split("");
  newValueArr[idx] = val;
  onChange(newValueArr.join(""));
    // Move focus to next input
    if (val && idx < (length - 1)) {
      const nextInput = inputsRef.current[idx + 1];
      if (nextInput) nextInput.focus();
    }
  };
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === "Backspace" && !value[idx] && idx > 0) {
      const prevInput = inputsRef.current[idx - 1];
      if (prevInput) prevInput.focus();
    }
  };
  return (
    <div style={{ display: "flex", gap: 8, justifyContent: "center", margin: "12px 0" }}>
      {Array.from({ length }).map((_, idx) => (
        <input
          key={idx}
          ref={el => { inputsRef.current[idx] = el; }}
          type="password"
          inputMode="numeric"
          maxLength={1}
          value={value[idx] || ""}
          onChange={e => handleChange(e, idx)}
          onKeyDown={e => handleKeyDown(e, idx)}
          disabled={disabled}
          style={{
            width: 38,
            height: 48,
            fontSize: 28,
            textAlign: "center",
            borderRadius: 10,
            border: "2px solid #444",
            background: "#18191c",
            color: "#fff",
            fontWeight: 700,
            boxShadow: "0 2px 8px #0002",
            outline: "none",
            transition: "border 0.2s, box-shadow 0.2s"
          }}
          onFocus={e => e.target.select()}
        />
      ))}
    </div>
  );
}
import ToastNotification from "./chat/ToastNotification";
import LottiePlayer from "../lib/LottiePlayer";
// Форма смены логина
type UserType = { id: string; login: string; link?: string | null; verified?: boolean; status?: 'online' | 'offline' | 'dnd' } | null;
type ChangeLoginFormProps = {
  user: UserType;
  setUser: (u: any) => void;
  setFriends: (f: any[]) => void;
};
function ChangeLoginForm({ user, setUser, setFriends }: ChangeLoginFormProps) {
  const [newLogin, setNewLogin] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState<string>("");

  const handleChangeLogin = async () => {
    if (!newLogin || !user) return;
    setLoading(true);
    setStatus("");
    setShowToast(false);
    setToastMsg("");
    setStatus("");
    setShowToast(false);
    setToastMsg("");
    const res = await fetch('/api/profile/change-login', {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ newLogin })
    });
    const data = await res.json();
    if (res.ok) {
      setToastMsg('Логин успешно изменён!');
      setShowToast(true);
      setUser(data.user);
      // refresh friends
      fetch(`/api/profile?userId=${data.user.id}`).then(r => r.json()).then(profile => setFriends(profile.user.friends || [])).catch(()=>{});
      try { localStorage.setItem('user', JSON.stringify({ id: data.user.id, login: data.user.login, link: data.user.link || null })); } catch {}
    } else {
      if (data.error === 'Login is already taken') {
        setToastMsg('Логин уже занят.');
        setShowToast(true);
      } else {
        setStatus(data.error || 'Ошибка при смене логина');
      }
    }
    setLoading(false);
  };

  return (
    <div style={{ marginBottom: 22, marginLeft: 0, maxWidth: 320, position: 'relative' }}>
      <label style={{ fontSize: 15, fontWeight: 500 }}>Смена логина</label><br />
  <input type="text" value={newLogin} onChange={e => setNewLogin(e.target.value)} style={{ marginTop: 6, width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #444", background: "#18191c", color: "#fff", fontSize: 15 }} />
      <button
        style={{ marginTop: 10, background: "#18191c", color: "#fff", border: "1px solid #444", borderRadius: 8, padding: "8px 18px", fontSize: 15, cursor: "pointer", fontWeight: 500 }}
        onClick={handleChangeLogin}
        disabled={loading}
      >{loading ? "Проверка..." : "Сменить"}</button>
      {status && <span style={{ marginLeft: 12, color: status.includes("успешно") ? "#1ed760" : "#e74c3c", fontWeight: 500 }}>{status}</span>}
      {showToast && (
        <ToastNotification
          type={toastMsg === "Логин успешно изменён!" ? "success" : "error"}
          message={toastMsg}
          duration={3000}
          onClose={() => setShowToast(false)}
        />
      )}
    </div>
  );
}
import { getUser } from "../lib/session";
import { forbiddenPasswords } from "../lib/forbidden-passwords";
import { FaUserCircle, FaCog, FaShieldAlt, FaPalette, FaLaptop, FaMobileAlt, FaDesktop, FaSignOutAlt, FaUserSecret } from "react-icons/fa";
// Функция для определения типа устройства и возврата иконки и названия
function getDeviceIconAndName(deviceName: string) {
  const ua = (deviceName || "").toLowerCase();
  // Return only an icon component based on detected device type (no text)
  if (ua.includes("android") || ua.includes("iphone") || ua.includes("mobile")) {
    return React.createElement(FaMobileAlt, { style: { fontSize: 18 } });
  }
  if ((ua.includes("windows") && ua.includes("touch")) || ua.includes("notebook") || ua.includes("laptop")) {
    return React.createElement(FaLaptop, { style: { fontSize: 18 } });
  }
  if (ua.includes("macintosh") || ua.includes("macbook")) {
    return React.createElement(FaLaptop, { style: { fontSize: 18 } });
  }
  if (ua.includes("windows") || ua.includes("linux")) {
    return React.createElement(FaDesktop, { style: { fontSize: 18 } });
  }
  // Fallback: generic desktop icon
  return React.createElement(FaDesktop, { style: { fontSize: 18 } });
}

function generate2FAToken() {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789&?_+-";
  let token = "";
  for (let i = 0; i < 128; i++) token += chars[Math.floor(Math.random() * chars.length)];
  return token;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const [user, setUser] = useState<UserType>(null);
  const [userRole, setUserRole] = useState<string>("user");
  const [desc, setDesc] = useState<string>("");
  const [avatar, setAvatar] = useState<string>("");
  const [backgroundUrl, setBackgroundUrl] = useState<string>("");
  const [has2FA, setHas2FA] = useState<boolean>(false);
  const [bgOpacity, setBgOpacity] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('profileBgOpacity');
      if (saved !== null) return Number(saved);
    }
    return 100;
  });
  const [showNewsModal, setShowNewsModal] = useState(false);
  const [removeFriendId, setRemoveFriendId] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState<boolean>(false);
  const [settingsTab, setSettingsTab] = useState<'customization'|'security'|'privacy' | null>(null);
  // role icon src mapping for modal display
  const roleIconSrc = userRole === 'admin' ? '/role-icons/admin.svg' : userRole === 'moderator' ? '/role-icons/moderator.svg' : userRole === 'verif' ? '/role-icons/verif.svg' : userRole === 'pepe' ? '/role-icons/pepe.svg' : null;
  // menu indicator animation settings
  const menuButtonHeight = 44; // px
  const menuButtonGap = 8; // px
  const menuIndex = settingsTab === 'customization' ? 0 : settingsTab === 'security' ? 1 : settingsTab === 'privacy' ? 2 : -1;
  // offset indicator by container padding (6px) so it aligns exactly behind buttons
  const menuIndicatorTop = menuIndex >= 0 ? (6 + menuIndex * (menuButtonHeight + menuButtonGap)) : -9999;
  const [token, setToken] = useState<string>("");
  const [setupQr, setSetupQr] = useState<string | null>(null);
  const [setupSecret, setSetupSecret] = useState<string | null>(null);
  const [showSetup, setShowSetup] = useState<boolean>(false);
  const [verificationCode, setVerificationCode] = useState<string>("");
  const [setupLoading, setSetupLoading] = useState<boolean>(false);
  const [verifyLoading, setVerifyLoading] = useState<boolean>(false);
  const [disableLoading, setDisableLoading] = useState<boolean>(false);
  const [isAnonymized, setIsAnonymized] = useState<boolean>(false);
  const [anonymizeLoading, setAnonymizeLoading] = useState<boolean>(false);
  // initialize anonymize from localStorage if present
  useEffect(() => {
    try {
      const stored = localStorage.getItem('anonymize');
      if (stored !== null) setIsAnonymized(stored === 'true');
    } catch (e) {}
  }, []);
  const [newPassword, setNewPassword] = useState<string>("");
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [passwordChanged, setPasswordChanged] = useState<boolean>(false);
  const [passwordError, setPasswordError] = useState<string>("");
  const [showToast, setShowToast] = useState(false);
  const [toastMsg, setToastMsg] = useState<string>("");
  const [toastType, setToastType] = useState<'success'|'error'>('success');
  const [friends, setFriends] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const currentSessionId = session && session.user ? (session.user as any).sessionId : null;

  // Загружаем профиль пользователя после успешного входа
  useEffect(() => {
    if (status === "loading") return;
    if (!session || !session.user || !session.user.id) {
      setUser(null);
      return;
    }
    // Загружаем профиль с сервера
    fetch(`/api/profile?userId=${session.user.id}`)
      .then(r => r.json())
      .then(data => {
        setUser(data.user);
        setHas2FA(!!data.user.twoFactorEnabled);
        setUserRole(data.user.role || "user");
        setDesc(data.user.description || "");
        setAvatar(data.user.avatar || "");
  setBackgroundUrl(data.user.backgroundUrl || "");
  // Не трогаем bgOpacity из API, используем localStorage
        setFriends(data.user.friends || []);
        setSessions((data.user.sessions || []).filter((s: any) => s.isActive));
        try {
          localStorage.setItem("user", JSON.stringify({ id: data.user.id, login: data.user.login, link: data.user.link || null }));
          // После успешной загрузки профиля вызываем событие для Sidebar only — use profile-updated so we don't trigger login-only UI
          window.dispatchEvent(new Event("profile-updated"));
        } catch {}
      })
      .catch(() => {
        setUser(null);
        setHas2FA(false);
        setUserRole("user");
        setDesc("");
        setAvatar("");
        setBackgroundUrl("");
        setFriends([]);
        setSessions([]);
      });
  }, [session, status]);

  // If user has 3 or more friends, enable compact scroll for the friends list
  const isFriendsScrollable = Array.isArray(friends) && friends.length >= 3;

  // Включить 2FA
  // Включить 2FA через Google Authenticator
  async function handleEnable2FA() {
    if (!user) return;
    try {
      setSetupLoading(true);
  const resp = await fetch('/api/2fa/setup', { credentials: 'same-origin' });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        return alert(err.error || 'Не удалось сгенерировать 2FA');
      }
      const data = await resp.json();
      setSetupQr(data.qr || null);
      setSetupSecret(data.secret || null);
      setShowSetup(true);
    } finally {
      setSetupLoading(false);
    }
  }

  // Форма смены линка (username)
  function ChangeLinkForm({ user, setUser, setFriends }: ChangeLoginFormProps) {
    const [newLink, setNewLink] = useState("");
    const [loading, setLoading] = useState(false);
    const [toastMsg, setToastMsg] = useState<string>("");
    const [showToast, setShowToast] = useState(false);

    const handleChangeLink = async () => {
      if (!newLink || !user) return;
      // client-side validation
      const re = /^[A-Za-z0-9_]{3,32}$/;
      if (!re.test(newLink)) {
        setToastMsg('Неверный формат линка'); setShowToast(true); return;
      }
      setLoading(true);
  const res = await fetch('/api/profile/change-link', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ newLink }) });
      const data = await res.json();
      if (res.ok) {
        setUser(data.user);
        fetch(`/api/profile?userId=${data.user.id}`).then(r=>r.json()).then(profile=>setFriends(profile.user.friends || [])).catch(()=>{});
        try { localStorage.setItem('user', JSON.stringify({ id: data.user.id, login: data.user.login, link: data.user.link || null })); } catch {}
        setToastMsg('Линк успешно изменён!'); setShowToast(true);
        setNewLink('');
      } else {
        if (data.error === 'Link is already taken') setToastMsg('Линк уже занят');
        else if (data.error === 'Invalid link format') setToastMsg('Неверный формат линка');
        else setToastMsg(data.error || 'Ошибка при смене линка');
        setShowToast(true);
      }
      setLoading(false);
    };

    return (
      <div style={{ marginBottom: 22, marginLeft: 0, maxWidth: 320, position: 'relative' }}>
        <label style={{ fontSize: 15, fontWeight: 500 }}>Смена линка</label><br />
        <input type="text" value={newLink} onChange={e=>setNewLink(e.target.value)} placeholder="" style={{ marginTop: 6, width: '100%', padding: '8px 10px', borderRadius:8, border: '1px solid #444', background:'#18191c', color:'#fff', fontSize:15 }} />
        <button style={{ marginTop:10, background: '#18191c', color:'#fff', border:'1px solid #444', borderRadius:8, padding:'8px 18px', fontSize:15, cursor:'pointer', fontWeight:500 }} onClick={handleChangeLink} disabled={loading}>{loading ? 'Проверка...' : 'Сменить'}</button>
        {showToast && <ToastNotification type={toastMsg.includes('Успешно') ? 'success' : 'error'} message={toastMsg} duration={3000} onClose={()=>setShowToast(false)} />}
      </div>
    );
  }

  // Отключить 2FA
  async function handleDisable2FA() {
    if (!user) return;
    if (!confirm('Отключить 2FA?')) return;
    try {
      setDisableLoading(true);
  const resp = await fetch('/api/2fa/disable', { method: 'POST', credentials: 'same-origin' });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        return alert(err.error || 'Не удалось отключить 2FA');
      }
      setHas2FA(false);
      setSetupQr(null);
      setSetupSecret(null);
      setShowSetup(false);
      setToken("");
    } finally {
      setDisableLoading(false);
    }
  }

  async function handleVerifySetup() {
    if (!verificationCode || !user) return alert('Введите код из приложения');
    try {
      setVerifyLoading(true);
      const resp = await fetch('/api/2fa/verify', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: verificationCode })
      });
      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        return alert(err.error || 'Неверный код');
      }
      setHas2FA(true);
      setShowSetup(false);
      setSetupQr(null);
      setSetupSecret(null);
      setVerificationCode("");
      // обновим профиль
      fetch(`/api/profile?userId=${user.id}`).then(r => r.json()).then(d => setUser(d.user)).catch(()=>{});
      alert('2FA успешно включена');
    } finally {
      setVerifyLoading(false);
    }
  }

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
  // Проверка авторизации через NextAuth (после всех хуков)
  if (status === "loading" || !session || !session.user || !session.user.id || !user) {
    return <div style={{color:'#bbb',textAlign:'center',marginTop:80,fontSize:22}}></div>;
  }
  if (!session || !session.user || !session.user.id || !user) {
    return <div style={{color:'#fff',textAlign:'center',marginTop:80,fontSize:22}}>Вы не авторизованы</div>;
  }

  return (
    <div style={{
      maxWidth: 600,
      margin: "40px auto",
      padding: 32,
      borderRadius: 18,
      boxShadow: "0 2px 24px #0006",
      position: 'relative',
      background: "#23242a",
      overflowX: "auto",
      WebkitOverflowScrolling: "touch"
    }}>
      {backgroundUrl && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 0,
            pointerEvents: 'none',
            borderRadius: 18,
            background: `url('${backgroundUrl}') center/cover no-repeat`,
            opacity: Math.max(0.01, bgOpacity / 100)
          }}
        />
      )}
      <div style={{ position: 'relative', zIndex: 1 }}>
  {/* ...остальной JSX... */}
      <div style={{ display: "flex", alignItems: "center", gap: 18, paddingBottom: 18, borderBottom: "1px solid #333" }}>
        <div style={{ position: "relative" }}>
          <img
            src={avatar || "data:image/jpeg;base64,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"}
            alt="avatar"
            style={{ width: 64, height: 64, borderRadius: "50%", objectFit: "cover", background: "#444" }}
          />
          {/* Статус dnd/online/offline */}
          {user?.status === 'dnd' ? (
            <img src="/moon-dnd.svg" alt="dnd" style={{ position: "absolute", left: 48, top: 44, width: 18, height: 18 }} />
          ) : (
            <span style={{ position: "absolute", left: 50, top: 46, width: 14, height: 14, borderRadius: "50%", background: user?.status === 'online' ? "#1ed760" : "#bbb", border: "2px solid #23242a" }} />
          )}
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 22, fontWeight: 600, letterSpacing: 1, display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              {user?.link ? `@${user.link}` : (user?.login || "user")}
              {userRole === "admin" && (
                <span style={{ position: 'relative', display: 'inline-block' }}
                  onMouseEnter={e => {
                    const tip = document.createElement('div');
                    tip.innerText = 'Linker Developer';
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
                    tip.innerText = 'Модератор Linker';
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
                    tip.innerText = 'Оффициальный аккаунт';
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
              {userRole === "pepe" && (
                <span style={{ position: 'relative', display: 'inline-block' }}
                  onMouseEnter={e => {
                    const tip = document.createElement('div');
                    tip.innerText = 'Linker Developer';
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
                  <div style={{width:24, height:24, marginLeft:0, verticalAlign:'middle', cursor:'pointer'}}>
                    {/* TGS-анимация через LottiePlayer */}
                    {String(userRole) === "krip" && (
                      <LottiePlayer src="/role-icons/krip.json" width={28} height={28} loop={true} />
                    )}
                    {String(userRole) === "pepe" && (
                      <LottiePlayer src="/role-icons/pepe.json" width={28} height={28} loop={true} />
                    )}
                  </div>
                </span>
              )}
              {/* 'ban' role removed: no longer displayed */}
            </span>
          </div>
          <div style={{ fontSize: 15, color: "#bbb", marginTop: 2 }}>{desc || "Нет описания"}</div>
          {/* ...удалено: любимый трек... */}
        </div>
  <button onClick={() => { setSettingsTab(null); setShowSettings(true); }} style={{ background: "transparent", color: "#fff", border: "1px solid rgba(255,255,255,0.04)", borderRadius: 12, padding: "8px 18px", fontSize: 15, cursor: "pointer", fontWeight: 500, display: "flex", alignItems: "center", gap: 8, transition: "background 0.18s, box-shadow 0.18s" }} onMouseOver={e => {e.currentTarget.style.background="rgba(255,255,255,0.02)";e.currentTarget.style.boxShadow="0 2px 12px rgba(79,195,247,0.12)"}} onMouseOut={e => {e.currentTarget.style.background="transparent";e.currentTarget.style.boxShadow="none"}}>
          <FaCog /> 
        </button>
      </div>

    {/* Список друзей и новости */}
    {/* Показываем UserID сразу под шапкой профиля (под линией) */}
    {user && user.id && (
      <div style={{ marginTop: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, background: 'rgba(255,255,255,0.02)', padding: '8px 12px', borderRadius: 10, color: '#ccc', marginBottom: 12 }}>
          <div style={{ fontSize: 13, color: '#bfbfbf' }}>Ваш UserID — <span style={{ color: '#9aa0a6', fontWeight: 700 }}>{user.id}</span></div>
            <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(user.id);
                setToastMsg('Скопировано в буфер');
                setToastType('success');
                setShowToast(true);
                setTimeout(() => setShowToast(false), 1500);
              } catch (e) {
                setToastMsg('Не удалось скопировать');
                setToastType('error');
                setShowToast(true);
                setTimeout(() => setShowToast(false), 2000);
              }
            }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 10, background: 'transparent', border: '1px solid rgba(255,255,255,0.06)', color: '#e6e6e6', cursor: 'pointer' }}
            aria-label="Copy UserID"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect x="9" y="9" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.2"/><rect x="4" y="4" width="10" height="10" rx="2" stroke="currentColor" strokeWidth="1.2"/></svg>
          </button>
        </div>
      </div>
    )}
        <div style={{ display: "flex", gap: 24, marginTop: 24, transition: "gap 0.3s" }}>
      {/* Список друзей */}
  <div style={{ flex: 1, background: "rgba(35,36,42,0.16)", borderRadius: 14, padding: 16, boxShadow: "0 1px 8px #0003" }}>
  <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 10 }}>{`Список друзей (${friends?.length || 0})`}</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div
            className={isFriendsScrollable ? "custom-scrollbar" : undefined}
            // make the container shorter so 3+ friends will trigger scrolling on most screens
            style={isFriendsScrollable ? { maxHeight: 160, overflowY: 'auto', paddingRight: 4, scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.12) transparent' } : { paddingRight: 4 }}
          >
            <style>{`
              /* thin, subtle scrollbar for the friends list when it's scrollable */
              .custom-scrollbar::-webkit-scrollbar { width: 6px; background: transparent; }
              .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
              .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.16); border-radius: 6px; }
              .custom-scrollbar { scrollbar-width: thin; scrollbar-color: rgba(255,255,255,0.16) transparent; overflow-x: hidden; }
            `}</style>
            <div style={{ overflowX: 'hidden' }}>
              {friends.length === 0 ? (
                <div style={{ color: "#bbb", fontSize: 16 }}>У вас нет друзей</div>
              ) : friends.map(f => (
                <div key={f.id} style={{ display: "flex", alignItems: "center", gap: 12, background: "rgba(35,36,42,0.10)", borderRadius: 14, padding: "12px 16px", boxShadow: "none", transition: "background 0.18s, box-shadow 0.18s", position: "relative", border: '1px solid rgba(255,255,255,0.02)' }} onMouseOver={e => {e.currentTarget.style.background="rgba(35,36,42,0.18)"; e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.25)'; }} onMouseOut={e => {e.currentTarget.style.background="rgba(35,36,42,0.10)"; e.currentTarget.style.boxShadow = 'none'; }}>
                  <div style={{ position: "relative", width: 44, height: 44, borderRadius: "50%", background: "#444", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", boxShadow: 'none' }} onClick={() => window.location.href = `/profile/${f.id}`}> 
                    <img src={f.avatar || "https://www.svgrepo.com/show/452030/avatar-default.svg"} alt="avatar" style={{ width: 44, height: 44, borderRadius: "50%", objectFit: "cover", background: "#444", boxShadow: 'none' }} />
                    <span style={{ position: "absolute", left: 32, top: 32, width: 12, height: 12, borderRadius: "50%", background: f.isOnline ? "#1ed760" : "#888", border: "2px solid #23242a" }} />
                  </div>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <span style={{ fontSize: 17, fontWeight: 600, cursor: "pointer", color: "#fff" }} onClick={() => window.location.href = `/profile/${f.id}`}>{f.link ? `@${f.link}` : (f.login || f.friendId)}</span>
                    {f.role === "admin" && (
                      <img src="/role-icons/admin.svg" alt="admin" style={{width:24, height:24, marginLeft:4, verticalAlign:'middle'}} />
                    )}
                    {f.role === "moderator" && (
                      <img src="/role-icons/moderator.svg" alt="moderator" style={{width:24, height:24, marginLeft:4, verticalAlign:'middle'}} />
                    )}
                    {f.role === "verif" && (
                      <img src="/role-icons/verif.svg" alt="verif" style={{width:24, height:24, marginLeft:4, verticalAlign:'middle'}} />
                    )}
                    {f.role === "pepe" && (
                      <img src="/role-icons/pepe.svg" alt="pepe" style={{width:32, height:32, marginLeft:4, verticalAlign:'middle'}} title="Linker Developer" />
                    )}
                    {/* 'ban' role removed: no longer displayed */}
                  </span>
                  <button onClick={() => setRemoveFriendId(f.id)} style={{ position: "absolute", right: 8, top: 12, background: "transparent", color: "#fff", border: "none", borderRadius: "50%", width: 22, height: 22, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, cursor: "pointer", opacity: 0.5, transition: "opacity 0.2s", zIndex: 2, boxShadow: 'none' }} title="Удалить друга" onMouseOver={e => e.currentTarget.style.opacity = "0.8"} onMouseOut={e => e.currentTarget.style.opacity = "0.5"}>
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>
          {removeFriendId && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: 'blur(6px)' }}>
              <style>{`\n                @keyframes modalPop { from { opacity: 0; transform: translateY(10px) scale(0.98); } to { opacity: 1; transform: translateY(0) scale(1); } }\n              `}</style>
              <div style={{ background: "linear-gradient(180deg, rgba(35,36,42,0.98), rgba(28,29,32,0.98))", borderRadius: 16, padding: 28, minWidth: 420, maxWidth: '90vw', boxShadow: "0 10px 40px rgba(0,0,0,0.6)", color: "#fff", position: "relative", textAlign: "center", animation: 'modalPop 220ms cubic-bezier(.2,.9,.2,1) both' }}>
                {/* Close button removed as it's redundant - use Отменить to close */}
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, color: '#fff' }}>Вы уверены, что хотите удалить друга?</div>
                <div style={{ color: '#bfc9cf', marginBottom: 20 }}>Это действие удалит чат и историю сообщений с этим пользователем.</div>
                <div style={{ display: "flex", gap: 14, justifyContent: "center", alignItems: 'center' }}>
                  <button onClick={handleRemoveFriend} style={{ background: "linear-gradient(180deg,#ff6b6b,#e04141)", color: "#fff", border: "none", borderRadius: 10, padding: "10px 26px", fontSize: 15, fontWeight: 700, cursor: "pointer", boxShadow: "0 6px 18px rgba(224,65,65,0.26)" }}>Да, удалить</button>
                  <button onClick={() => setRemoveFriendId(null)} style={{ background: "transparent", color: "#d1d7db", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 10, padding: "10px 22px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>Отменить</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
  {/* Сессии */}
  <div style={{ flex: 1, background: "rgba(35,36,42,0.16)", borderRadius: 14, padding: 16, boxShadow: "0 1px 8px #0003" }}>
        <div style={{ fontSize: 17, fontWeight: 600, marginBottom: 10 }}>Сессии</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sessions && sessions.length > 0 ? sessions.map((s: any) => {
            const isCurrent = s.id === currentSessionId;
            return (
            <div key={s.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0,0,0,0.05)', padding: 10, borderRadius: 10, position: 'relative' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 8 }}>
                  {React.cloneElement(getDeviceIconAndName(s.deviceName) as any, { style: { fontSize: 18, color: '#fff' } })}
                </div>
                <div>
                  <div style={{ color: '#fff', fontWeight: 600 }}>{s.deviceName || 'Неизвестное устройство'} {isCurrent ? <span style={{ display:'inline-block', marginLeft:8, padding:'2px 8px', background:'#1ed760', color:'#022', borderRadius:12, fontSize:12, fontWeight:700 }}>Это вы</span> : null}</div>
                  <div style={{ color: '#bbb', fontSize: 13 }}>{s.ip || 'IP неизвестен'}</div>
                  <div style={{ color: '#999', fontSize: 12, marginTop: 4 }}>{new Date(s.createdAt).toLocaleString()}</div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ position: 'relative' }}>
                  <button onClick={(e) => { e.stopPropagation(); setOpenMenuId(openMenuId === s.id ? null : s.id); }} aria-label="Меню сессии" style={{ width: 34, height: 34, borderRadius: 8, border: 'none', background: 'transparent', color: '#fff', cursor: 'pointer' }}>⋯</button>
                  {openMenuId === s.id && (
                    <div style={{ position: 'absolute', right: 8, top: 44, background: '#23242a', border: '1px solid #333', borderRadius: 10, padding: 8, zIndex: 60, boxShadow: '0 4px 16px #0008' }}>
                      <button onClick={async () => {
                        if (!user) return;
                        if (!confirm('Завершить эту сессию?')) return;
                        try {
                          const resp = await fetch('/api/session-end', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: user.id, sessionId: s.id }) });
                              if (resp.ok) {
                            setOpenMenuId(null);
                            // Optimistically remove session from local UI
                            setSessions(prev => prev.filter((ss: any) => ss.id !== s.id));
                            setToastMsg('Сессия завершена'); setToastType('success'); setShowToast(true);
                            // If user ended the current session, sign them out (same as logout)
                            if (isCurrent) {
                              // small delay to allow UI update
                              setTimeout(() => signOut({ callbackUrl: `${window.location.origin}/` }), 300);
                              return;
                            }
                          } else {
                            alert('Не удалось завершить сессию');
                          }
                        } catch (e) { alert('Ошибка'); }
                      }} style={{ background: 'transparent', color: '#ff6b6b', border: 'none', padding: '6px 10px', cursor: 'pointer', fontWeight: 600 }}>Завершить</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}) : (
            <div style={{ color: '#bbb' }}>Активных сессий не найдено.</div>
          )}
        </div>
      </div>

      

      {/* Модальное окно с новостью */}
      {showNewsModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: '#000a', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', animation: 'fadeIn 0.3s' }}>
          <div style={{ background: '#23242a', borderRadius: 18, padding: 0, minWidth: 340, maxWidth: 420, boxShadow: '0 2px 24px #0008', color: '#fff', position: 'relative', textAlign: 'center', overflow: 'hidden' }}>
            <button onClick={() => setShowNewsModal(false)} style={{ position: 'absolute', top: 10, right: 16, zIndex: 100, background: 'none', border: 'none', color: '#fff', fontSize: 22, cursor: 'pointer', transition: 'color 0.2s' }} onMouseOver={e => {e.currentTarget.style.color="#4fc3f7"}} onMouseOut={e => {e.currentTarget.style.color="#fff"}}>✕</button>
            <img src="/news-images/update.jpg" alt="Новое обновление" style={{ width: '100%', maxHeight: 220, objectFit: 'cover', display: 'block', borderTopLeftRadius: 18, borderTopRightRadius: 18 }} />
            <div style={{ padding: '24px 22px 18px 22px' }}>
              <div style={{ fontSize: 19, fontWeight: 700, marginBottom: 10 }}>Новое обновление v8.0</div>
              <div style={{ color: '#bbb', fontSize: 16, marginBottom: 8 }}>
                Обновление v8.0
                Линк - как юзернейм, стало намного безопаснее и удобнее
                Новое шифрование всех сообщений
                Статусы, отображение фона профиля и чата, исправление проблем с UserID
                Отображение UserID в профиле друга/своем. Google 2FA доделан, и работает полноценно. Доработаны видео и голосовые сообщения, все шифруется и отправляется.<br />
                <br />
                
              </div>
            </div>
          </div>
        </div>
      )}
    </div>

      {/* Модальное окно настроек */}
      {showSettings && (
  <div style={{ position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", background: "#000a", zIndex: 9999, display: "flex", alignItems: "flex-start", justifyContent: "center", paddingTop: 6, animation: "fadeIn 0.3s" }}>
          <div style={{ background: "#23242a", borderRadius: 18, padding: 28, minWidth: settingsTab === 'privacy' ? 420 : 320, boxShadow: "0 2px 24px #0008", color: "#fff", position: "relative", transition: "box-shadow 0.3s, background 0.3s, min-width 200ms", maxHeight: "80vh", overflowY: "auto", scrollbarWidth: "none" }}>
  <button onClick={() => setShowSettings(false)} aria-label="Close settings" style={{ position: "absolute", top: 12, right: 12, zIndex: 120, background: "none", border: "none", color: "#fff", fontSize: 22, cursor: "pointer", transition: "color 0.2s" }} onMouseOver={e => {e.currentTarget.style.color="#4fc3f7"}} onMouseOut={e => {e.currentTarget.style.color="#fff"}}>✕</button>

      {/* Compact header with avatar + vertical menu (matches provided mock)
        the header block shows user's profile background up to the divider line */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 18,
        background: 'transparent',
        borderRadius: 12, padding: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <div style={{ position: 'relative', width: 76, height: 76, borderRadius: 12, overflow: 'visible', background: 'transparent', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ width: 64, height: 64, borderRadius: 10, overflow: 'hidden', background: 'transparent', position: 'relative' }}>
                    <img src={avatar || "https://www.svgrepo.com/show/452030/avatar-default.svg"} alt="avatar" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  </div>
                  {/* status indicator positioned overlapping bottom-right corner of avatar */}
                  {user?.status === 'dnd' ? (
                    <img src="/moon-dnd.svg" alt="dnd" style={{ position: 'absolute', right: -6, bottom: -6, width: 20, height: 20, zIndex: 3 }} />
                  ) : (
                    <span style={{ position: 'absolute', right: -6, bottom: -6, width: 12, height: 12, borderRadius: '50%', background: user?.status === 'online' ? '#1ed760' : '#bbb', zIndex: 3 }} />
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ fontSize: 16, fontWeight: 700, color: '#fff' }}>{user?.link ? `@${user.link}` : (user?.login || 'Профиль')}</div>
                    {roleIconSrc && (
                      <img src={roleIconSrc} alt="role" style={{ width: 18, height: 18, borderRadius: 6 }} />
                    )}
                  </div>
                  <div style={{ fontSize: 13, color: '#bfbfbf' }}>{desc || 'Нет описания'}</div>
                </div>
              </div>
              <div style={{ height: 1, background: 'linear-gradient(90deg, rgba(255,255,255,0.06), rgba(255,255,255,0.02))', borderRadius: 2 }} />

                <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: 8, padding: 6 }}>
                  {/* animated grey rounded indicator behind selected button */}
                  <div style={{ position: 'absolute', left: 6, right: 6, height: menuButtonHeight, borderRadius: 10, background: '#2e3033', top: menuIndicatorTop, transition: 'top 220ms cubic-bezier(.2,.9,.2,1), opacity 160ms', zIndex: settingsTab ? 0 : -1, opacity: settingsTab ? 1 : 0 }} />
                  <button onClick={() => setSettingsTab('customization')} style={{ textAlign: 'left', padding: '10px 12px', height: menuButtonHeight, borderRadius: 10, background: settingsTab === 'customization' ? 'transparent' : 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 12, position: 'relative', zIndex: 1, transition: 'color 180ms' }}>
                    <FaPalette style={{ fontSize: 16, color: settingsTab === 'customization' ? '#fff' : '#bbb', marginLeft: 2 }} />
                    <span style={{ color: settingsTab === 'customization' ? '#fff' : '#ddd' }}>Кастомизация</span>
                  </button>
                  <button onClick={() => setSettingsTab('security')} style={{ textAlign: 'left', padding: '10px 12px', height: menuButtonHeight, borderRadius: 10, background: settingsTab === 'security' ? 'transparent' : 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 12, position: 'relative', zIndex: 1, transition: 'color 180ms' }}>
                    <FaShieldAlt style={{ fontSize: 16, color: settingsTab === 'security' ? '#fff' : '#bbb', marginLeft: 2 }} />
                    <span style={{ color: settingsTab === 'security' ? '#fff' : '#ddd' }}>Безопасность</span>
                  </button>
                  <button onClick={() => setSettingsTab('privacy')} style={{ textAlign: 'left', padding: '10px 12px', height: menuButtonHeight, borderRadius: 10, background: settingsTab === 'privacy' ? 'transparent' : 'transparent', border: 'none', color: '#fff', cursor: 'pointer', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 12, position: 'relative', zIndex: 1, transition: 'color 180ms' }}>
                    <FaUserCircle style={{ fontSize: 16, color: settingsTab === 'privacy' ? '#fff' : '#bbb', marginLeft: 2 }} />
                    <span style={{ color: settingsTab === 'privacy' ? '#fff' : '#ddd' }}>Конфиденциальность</span>
                  </button>
                </div>
            </div>

            {/* Panels */}
            {settingsTab === 'security' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <FaShieldAlt style={{ color: '#bbb', fontSize: 22 }} />
                  <span style={{ color: '#bbb', fontWeight: 700, fontSize: 17, letterSpacing: 0.5 }}>Безопасность</span>
                </div>
                <div style={{ marginBottom: 22, marginLeft: 0, maxWidth: 320, transition: "box-shadow 0.2s, background 0.2s" }}>
              <label style={{ fontSize: 15, fontWeight: 500 }}>Смена пароля</label><br />
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <input
                  type={showPassword ? "text" : "password"}
                  value={newPassword}
                  onChange={e => {
                    setNewPassword(e.target.value);
                    setPasswordError("");
                  }}
                  style={{ marginTop: 6, width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #444", background: "#18191c", color: "#fff", fontSize: 15 }}
                  autoComplete="new-password"
                />
                <button
                  type="button"
                  style={{ marginTop: 6, background: "#23242a", color: "#fff", border: "1px solid #444", borderRadius: 8, padding: "8px 10px", fontSize: 15, cursor: "pointer", fontWeight: 500 }}
                  onClick={() => setShowPassword(v => !v)}
                  title={showPassword ? "Скрыть пароль" : "Показать пароль"}
                >{showPassword ? "🙈" : "👁️"}</button>
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                <button
                  style={{ background: "#18191c", color: "#fff", border: "1px solid #444", borderRadius: 8, padding: "8px 18px", fontSize: 15, cursor: "pointer", fontWeight: 500 }}
                  onClick={async () => {
                    if (!user || !newPassword) return;
                    if (forbiddenPasswords.includes(newPassword)) {
                      setToastType('error');
                      setToastMsg('Слишком простой пароль!');
                      setShowToast(true);
                      return;
                    }
                    await fetch('/api/profile', {
                      method: 'POST',
                      credentials: 'include',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ userId: user.id, password: newPassword })
                    });
                    setNewPassword("");
                    setToastType('success');
                    setToastMsg('Пароль изменён! Вы же его сохранили?');
                    setShowToast(true);
                  }}
                >Сменить пароль</button>
                <button
                  type="button"
                  style={{ background: "#23242a", color: "#fff", border: "1px solid #444", borderRadius: 8, padding: "8px 18px", fontSize: 15, cursor: "pointer", fontWeight: 500 }}
                  onClick={() => {
                    // Генерация пароля
                    const charset = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*_+-";
                    let pass = "";
                    for (let i = 0; i < 12; i++) pass += charset[Math.floor(Math.random() * charset.length)];
                    setNewPassword(pass);
                    setPasswordError("");
                    setTimeout(() => {
                      try {
                        const input = document.querySelector('input[type="password"],input[type="text"]');
                        if (input) (input as HTMLInputElement).focus();
                        // Триггерим событие input для браузера
                        if (input) {
                          const event = new Event('input', { bubbles: true });
                          input.dispatchEvent(event);
                        }
                      } catch {}
                    }, 100);
                  }}
                  title="Сгенерировать безопасный пароль"
                >Сгенерировать</button>
              </div>
              {showToast && (
                <ToastNotification
                  type={toastType}
                  message={toastMsg}
                  duration={3000}
                  onClose={() => setShowToast(false)}
                />
              )}
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
                    <div style={{ marginBottom: 8 }}>При входе в аккаунт запросится 6-значный код.</div>
                    <button
                      style={{ background: '#e74c3c', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 14px', fontSize: 14, cursor: 'pointer', fontWeight: 600 }}
                      onClick={handleDisable2FA}
                      disabled={disableLoading}
                    >{disableLoading ? 'Отключаем...' : 'Отключить 2FA'}</button>
                  </div>
                )}
                {!has2FA && (
                  <div>
                    <button
                      style={{ background: '#1ed760', color: '#23242a', border: 'none', borderRadius: 8, padding: '8px 18px', fontSize: 15, cursor: 'pointer', fontWeight: 600, minWidth: 110 }}
                      onClick={handleEnable2FA}
                      disabled={setupLoading}
                    >{setupLoading ? 'Генерация...' : 'Включить 2FA'}</button>
                    {showSetup && (
                      <div style={{ marginTop: 12, padding: 14, background: 'transparent', borderRadius: 10, border: 'none', boxShadow: 'none' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                          {setupQr ? (
                            <div style={{ width: 176, height: 176, padding: 10, background: '#fff', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto' }}>
                              <img src={setupQr} alt="QR" style={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 8 }} />
                            </div>
                          ) : (
                            <div style={{ width: 176, height: 176, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#111', borderRadius: 12, color: '#555', margin: '0 auto' }}>Загрузка...</div>
                          )}
                          <div style={{ width: 360, maxWidth: '100%', textAlign: 'center' }}>
                            <div style={{ color: '#fff', fontSize: 15, fontWeight: 700, marginBottom: 6 }}>Настройка Google Authenticator</div>
                            <div style={{ color: '#bbb', fontSize: 13, marginBottom: 10 }}>Отсканируйте QR-код в приложении-генераторе кодов (Google Authenticator, Authy и т.д.).</div>
                            <div style={{ color: '#aaa', fontSize: 12, marginBottom: 6 }}>Если не можете сканировать, используйте секрет:</div>
                            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 12 }}>
                              <div style={{ flex: 1, fontFamily: 'monospace', background: '#151618', color: '#e6eef6', padding: '8px 10px', borderRadius: 8, border: '1px solid #26292b', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{setupSecret}</div>
                              <button onClick={() => { if (setupSecret) { navigator.clipboard.writeText(setupSecret); alert('Секрет скопирован'); } }} style={{ padding: '8px 10px', borderRadius: 8, background: '#2f3336', border: 'none', color: '#fff', cursor: 'pointer' }}>Копировать</button>
                            </div>
                            <CodeInput value={verificationCode} onChange={setVerificationCode} length={6} disabled={verifyLoading} />
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 12 }}>
                              <button onClick={handleVerifySetup} disabled={verifyLoading} style={{ width: '100%', padding: '12px 14px', borderRadius: 8, background: '#4fc3f7', border: 'none', color: '#092024', fontWeight: 700, cursor: 'pointer' }}>{verifyLoading ? 'Проверка...' : 'Подтвердить'}</button>
                              <button onClick={() => { setShowSetup(false); setSetupQr(null); setSetupSecret(null); setVerificationCode(''); }} style={{ width: '100%', padding: '12px 14px', borderRadius: 8, background: '#232629', border: '1px solid #1a1c1d', color: '#ddd', cursor: 'pointer' }}>Отменить</button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
            </>
            )}

            {settingsTab === 'customization' && (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <FaPalette style={{ color: '#bbb', fontSize: 22 }} />
                  <span style={{ color: '#bbb', fontWeight: 700, fontSize: 17, letterSpacing: 0.5 }}>Кастомизация</span>
                </div>
                <ChangeLoginForm user={user} setUser={setUser} setFriends={setFriends} />
                <ChangeLinkForm user={user} setUser={setUser} setFriends={setFriends} />
                <div style={{ marginBottom: 22, marginLeft: 0, maxWidth: 320, transition: "box-shadow 0.2s, background 0.2s" }}>
              <label style={{ fontSize: 15, fontWeight: 500 }}>Описание:</label><br />
              <input type="text" value={desc} onChange={e => setDesc(e.target.value)} style={{ marginTop: 6, width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #444", background: "#18191c", color: "#fff", fontSize: 15 }} />
              <button
                style={{ marginTop: 10, background: "#18191c", color: "#fff", border: "1px solid #444", borderRadius: 8, padding: "8px 18px", fontSize: 15, cursor: "pointer", fontWeight: 500 }}
                onClick={async () => {
                  if (!user) return;
                  await fetch('/api/profile', {
                    method: 'POST',
                    credentials: 'include',
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
              >Сохранить</button>
            </div>
            <div style={{ marginBottom: 22, marginLeft: 0, maxWidth: 320, transition: "box-shadow 0.2s, background 0.2s" }}>
              <label style={{ fontSize: 15, fontWeight: 500 }}>Аватарка (URL):</label><br />
              <input type="text" value={avatar} onChange={e => setAvatar(e.target.value)} style={{ marginTop: 6, width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #444", background: "#18191c", color: "#fff", fontSize: 15 }} />
              <button
                style={{ marginTop: 10, background: "#18191c", color: "#fff", border: "1px solid #444", borderRadius: 8, padding: "8px 18px", fontSize: 15, cursor: "pointer", fontWeight: 500 }}
                onClick={async () => {
                  if (!user) return;
                  // Генерация 2FA setup (пример, если нужно)
                  await fetch('/api/2fa/setup', {
                    credentials: 'same-origin',
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ login: user.login })
                  });
                  // Сохраняем аватарку
                  await fetch('/api/profile', {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: user.id, avatar })
                  });
                  // Обновить профиль после сохранения
                  fetch(`/api/profile?userId=${user.id}`)
                    .then(r => r.json())
                    .then(data => {
                      setAvatar(data.user.avatar || "");
                      try { window.dispatchEvent(new Event('profile-updated')); } catch (e) {}
                    });
                }}
              >Сохранить</button>
            </div>
            <div style={{ marginBottom: 22, marginLeft: 0, maxWidth: 320, transition: "box-shadow 0.2s, background 0.2s" }}>
              <label style={{ fontSize: 15, fontWeight: 500 }}>Фон чата и профиля</label><br />
              <input type="text" value={backgroundUrl} onChange={e => setBackgroundUrl(e.target.value)} style={{ marginTop: 6, width: "100%", padding: "8px 10px", borderRadius: 8, border: "1px solid #444", background: "#18191c", color: "#fff", fontSize: 15 }} placeholder="" />
              <div style={{ marginTop: 12 }}>
                <label style={{ fontSize: 15, fontWeight: 500 }}>Выделенность фона: {bgOpacity}%</label><br />
                <input
                  type="range"
                  min={1}
                  max={100}
                  value={bgOpacity}
                  onChange={e => {
                    const val = Number(e.target.value);
                    setBgOpacity(val);
                    try {
                      localStorage.setItem('profileBgOpacity', String(val));
                    } catch {}
                  }}
                  style={{ width: "100%", marginTop: 6 }}
                />
              </div>
              <button
                style={{ marginTop: 10, background: "#18191c", color: "#fff", border: "1px solid #444", borderRadius: 8, padding: "8px 18px", fontSize: 15, cursor: "pointer", fontWeight: 500 }}
                onClick={async () => {
                  if (!user) return;
                  await fetch('/api/profile', {
                    method: 'POST',
                    credentials: 'include',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId: user.id, backgroundUrl })
                  });
                  // Обновить профиль после сохранения
                  fetch(`/api/profile?userId=${user.id}`)
                    .then(r => r.json())
                    .then(data => {
                      setBackgroundUrl(data.user.backgroundUrl || "");
                    });
                  // Сохраняем видимость в localStorage
                  try {
                    localStorage.setItem('profileBgOpacity', String(bgOpacity));
                  } catch {}
                }}
              >Сохранить</button>
              </div>
              </>
            )}
              {settingsTab === 'privacy' && (
                <>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                    <FaUserCircle style={{ color: '#bbb', fontSize: 22 }} />
                    <span style={{ color: '#bbb', fontWeight: 700, fontSize: 17, letterSpacing: 0.5 }}>Конфиденциальность</span>
                  </div>
                  <div style={{ marginBottom: 22, marginLeft: 0, maxWidth: 320, transition: "box-shadow 0.2s, background 0.2s", background: '#18191c', borderRadius: 10, boxShadow: '0 1px 6px #0002', padding: '16px 0' }}>
                    <label style={{ fontSize: 15, fontWeight: 500, marginBottom: 8, display: 'block' }}></label>
                    <div style={{ display: 'flex', gap: 24, alignItems: 'center', marginTop: 8, justifyContent: 'center' }}>
                      <button
                        key="online_priv"
                        style={{
                          background: user?.status === 'online' ? '#23242a' : '#18191c',
                          border: user?.status === 'online' ? '2px solid #4caf50' : '1px solid #444',
                          borderRadius: '50%',
                          width: 38,
                          height: 38,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'border 0.2s',
                          outline: 'none',
                          boxShadow: user?.status === 'online' ? '0 2px 8px #4caf5044' : 'none'
                        }}
                        title={statusLabels['online']}
                        onClick={async () => {
                          if (!user) return;
                          await fetch('/api/profile', {
                            method: 'POST',
                            credentials: 'include',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userId: user.id, status: 'online' })
                          });
                          setUser({ ...user, status: 'online' });
                        }}
                      >
                        <UserStatus status="online" size={18} />
                      </button>
                      <button
                        key="offline_priv"
                        style={{
                          background: user?.status === 'offline' ? '#23242a' : '#18191c',
                          border: user?.status === 'offline' ? '2px solid #9e9e9e' : '1px solid #444',
                          borderRadius: '50%',
                          width: 38,
                          height: 38,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'border 0.2s',
                          outline: 'none',
                          boxShadow: user?.status === 'offline' ? '0 2px 8px #9e9e9e44' : 'none'
                        }}
                        title={statusLabels['offline']}
                        onClick={async () => {
                          if (!user) return;
                          await fetch('/api/profile', {
                            method: 'POST',
                            credentials: 'include',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userId: user.id, status: 'offline' })
                          });
                          setUser({ ...user, status: 'offline' });
                        }}
                      >
                        <UserStatus status="offline" size={18} />
                      </button>
                      <button
                        key="dnd_priv"
                        style={{
                          background: user?.status === 'dnd' ? '#23242a' : '#18191c',
                          border: user?.status === 'dnd' ? '2px solid #b8b814' : '1px solid #444',
                          borderRadius: '50%',
                          width: 38,
                          height: 38,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          transition: 'border 0.2s',
                          outline: 'none',
                          boxShadow: user?.status === 'dnd' ? '0 2px 8px #4fc3f744' : 'none'
                        }}
                        title={statusLabels['dnd']}
                        onClick={async () => {
                          if (!user) return;
                          await fetch('/api/profile', {
                            method: 'POST',
                            credentials: 'include',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ userId: user.id, status: 'dnd' })
                          });
                          setUser({ ...user, status: 'dnd' });
                        }}
                      >
                        <img src="/moon-dnd.svg" alt="Не беспокоить" style={{ width: 18, height: 18, verticalAlign: 'middle' }} />
                      </button>
                    </div>
                    <div style={{ marginTop: 18, padding: '0', color: '#fff', fontSize: 15, fontWeight: 500, textAlign: 'center', minHeight: 44 }}>
                      {user?.status === 'online' && (
                        <>
                          <span style={{ color: '#4caf50', fontWeight: 700 }}>В сети</span><br />
                          Все ваши друзья будут видеть что вы в онлайне.
                        </>
                      )}
                      {user?.status === 'offline' && (
                        <>
                          <span style={{ color: '#9e9e9e', fontWeight: 700 }}>Не в сети</span><br />
                          Анонимный статус, никто не сможет видеть вас, зато сможете видеть вы.
                        </>
                      )}
                      {user?.status === 'dnd' && (
                        <>
                          <span style={{ color: '#b8b814', fontWeight: 700 }}>Не беспокоить</span><br />
                          Уведомления о новых сообщениях и заявках отключены, но вы в сети.
                        </>
                      )}
                    </div>
                  </div>
                  {/* Анонимизация */}
                  <div style={{ marginTop: 12, marginBottom: 6, padding: 16, maxWidth: 360, background: '#18191c', borderRadius: 10 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <FaUserSecret style={{ fontSize: 18, color: '#bbb' }} />
                      <div style={{ fontSize: 15, fontWeight: 700 }}>Анонимизация</div>
                    </div>
                    <div style={{ color: '#bfbfbf', fontSize: 13, marginBottom: 12 }}>Данная функция максимально уменьшает сбор данных и шифрует всё возможное (аватар, включённые настройки, поиск и заявки друзей). Ваши чаты уже зашифрованы.</div>
                    <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                      <button
                        onClick={async () => {
                          if (!user || anonymizeLoading) return;
                          // turning on -> slower (1.5s), turning off -> faster (600ms)
                          const turningOn = !isAnonymized;
                          setAnonymizeLoading(true);
                          const delay = turningOn ? 1500 : 600;
                          setTimeout(async () => {
                            try {
                              const resp = await fetch('/api/profile', {
                                method: 'POST',
                                credentials: 'include',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ userId: user.id, anonymize: turningOn })
                              });
                              if (resp.ok) {
                                setIsAnonymized(turningOn);
                                try { setUser({ ...user, anonymized: turningOn } as any); } catch {}
                              } else {
                                const data = await resp.json().catch(() => ({}));
                                alert(data.error || 'Ошибка при обновлении анонимизации');
                              }
                            } catch (e) {
                              console.error(e);
                              alert('Ошибка сети');
                            } finally {
                              setAnonymizeLoading(false);
                            }
                          }, delay);
                        }}
                        disabled={anonymizeLoading}
                        style={{ padding: '10px 14px', borderRadius: 8, background: anonymizeLoading ? '#2b2d2f' : (isAnonymized ? '#3a3c3f' : '#1ed760'), color: isAnonymized ? '#fff' : '#022', border: 'none', cursor: anonymizeLoading ? 'default' : 'pointer', fontWeight: 700 }}
                      >
                        {anonymizeLoading ? (isAnonymized ? 'Отключаем...' : 'Включаем...') : (isAnonymized ? 'Включено' : 'Включить')}
                      </button>
                      <div style={{ color: '#999', fontSize: 13 }}>{isAnonymized ? 'Анонимный режим активен' : 'Анонимизация выключена'}</div>
                    </div>
                  </div>
                </>
              )}
            {/* Вставка любимой песни удалена по запросу пользователя */}
          </div>
        </div>
      )}
      </div>
      </div>
    );
}

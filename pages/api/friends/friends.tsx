import React, { useState, useEffect } from "react";
import { getUser } from "../../../lib/session";
import Sidebar from "../../../components/Sidebar";
import ToastNotification from "../../chat/ToastNotification";
import { FiSearch, FiUserPlus, FiCheck, FiX } from "react-icons/fi";

export default function FriendsPage() {
  // Отправить заявку в друзья
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const sendRequest = async (friendId: string) => {
    if (!user?.id || friendId === user.id) return;
    await fetch(`/api/friends/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, friendId })
    });
  setSearchResult(null);
  setToast({ type: 'success', message: 'Заявка отправлена' });
  };

  // Принять заявку
  const handleAccept = async (requestId: string) => {
    await fetch(`/api/friends/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user?.id, requestId })
    });
  setRequests(requests.filter(r => r.id !== requestId));
  setToast({ type: 'success', message: 'Заявка принята' });
  };

  // Отклонить заявку
  const handleDecline = async (requestId: string) => {
    await fetch(`/api/friends/decline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user?.id, requestId })
    });
  setRequests(requests.filter(r => r.id !== requestId));
  setToast({ type: 'success', message: 'Заявка отклонена' });
  };
  const [user, setUser] = useState<{ id: string; login: string } | null>(null);
  const [search, setSearch] = useState("");
  const [searchResult, setSearchResult] = useState<any>(null);
  const [friends, setFriends] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const friendsSafe = Array.isArray(friends) ? friends : [];
  // Автоматический поиск при вводе
  useEffect(() => {
    if (!search || search.length < 2) {
      setSearchResult([]);
      return;
    }
    let active = true;
    setLoading(true);
    fetch(`/api/friends/search?link=${encodeURIComponent(search)}&userId=${user?.id || ''}`)
      .then(res => res.json())
      .then(data => {
        if (active) {
          setSearchResult(Array.isArray(data.users) ? data.users : []);
          setLoading(false);
        }
      });
    return () => { active = false; };
  }, [search]);
  useEffect(() => {
    const u = getUser();
    setUser(u);
    const profileUrl = u ? `/api/profile?userId=${u.id}` : `/api/profile`;
    fetch(profileUrl, { credentials: 'include' })
      .then(async (r) => {
        if (r.status === 401) {
          window.location.href = '/auth/login';
          return;
        }
        const data = await r.json().catch(() => ({}));
        const profile = data && data.user ? data.user : null;
        if (!profile) {
          console.warn('Profile fetch did not return user:', data);
          if (!u) {
            window.location.href = '/auth/login';
            return;
          }
          setFriends([]);
          setRequests([]);
          return;
        }
        setFriends(profile.friends || []);
        setRequests(profile.friendRequests || []);
      }).catch(e => {
        console.error('Failed to fetch profile:', e);
        setFriends([]);
        setRequests([]);
      });
  }, []);

  return (
    <>
      <h2 style={{ textAlign: "center", fontSize: 44, fontWeight: 700, margin: "72px 0 56px 0", color: "#fff" }}></h2>
      {toast && (
        <ToastNotification
          type={toast.type}
          message={toast.message}
          duration={2500}
          onClose={() => setToast(null)}
        />
      )}
      <div style={{ display: "flex", flexDirection: "row", gap: 60, justifyContent: "center", alignItems: "flex-start", width: "100%", marginTop: 32, overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        {/* Поиск друзей смещён правее */}
        <div style={{ flex: 1, minWidth: 320, maxWidth: 400, padding: "18px 10px 18px 0", marginLeft: 180 }}>
          <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 18, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
            <FiSearch style={{ fontSize: 22, color: "#229ED9" }} /> Поиск друзей
          </div>
          <div style={{ marginBottom: 8 }}>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Поиск по линку"
              style={{
                padding: "12px 16px",
                borderRadius: "10px",
                border: "none",
                background: "none",
                color: "#e3e8f0",
                fontSize: "16px",
                width: "100%",
                outline: "none",
                boxShadow: "none",
                fontWeight: 500,
                letterSpacing: "0.1px",
                transition: "box-shadow 0.2s",
              }}
            />
          </div>
          {loading && <div style={{ color: "#bbb", marginTop: 12, fontSize: 16 }}>Поиск...</div>}
          {Array.isArray(searchResult) && searchResult.length === 0 && !loading && (
            <div style={{ background: "none", borderRadius: 0, padding: "12px 18px", marginTop: 22, textAlign: "center", color: "#bbb", fontSize: 17, boxShadow: "none" }}>Пользователь с таким линком не найден</div>
          )}
          {Array.isArray(searchResult) && searchResult.length > 0 && (
            <div style={{ marginTop: 14 }}>
              {searchResult.map(foundUser => (
                <div key={foundUser.id} style={{ display: 'flex', alignItems: 'center', gap: 18, padding: '10px 0', borderBottom: '1px solid #2a2b3d' }}>
                  <div style={{ position: 'relative' }}>
                    <img src={foundUser.avatar || '/window.svg'} alt="avatar" style={{ width: 48, height: 48, borderRadius: '50%', objectFit: 'cover', background: 'none', marginRight: 8, boxShadow: 'none' }} />
                    {foundUser.status === 'dnd' ? (
                      <img src="/moon-dnd.svg" alt="dnd" style={{ position: 'absolute', left: 34, top: 34, width: 18, height: 18 }} />
                    ) : (
                      <span style={{ position: 'absolute', left: 36, top: 36, width: 10, height: 10, borderRadius: '50%', background: foundUser.status === 'online' ? '#1ed760' : '#888', border: '2px solid #23242a' }} />
                    )}
                  </div>
                  <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 6 }}>
                    <div style={{ color: '#e3e8f0', fontWeight: 500 }}>{foundUser.link ? `@${foundUser.link}` : foundUser.login}</div>
                    {foundUser.role === 'admin' && <img src="/role-icons/admin.svg" alt="admin" style={{ width: 24, height: 24 }} />}
                    {foundUser.role === 'moderator' && <img src="/role-icons/moderator.svg" alt="moderator" style={{ width: 24, height: 24 }} />}
                    {foundUser.role === 'verif' && <img src="/role-icons/verif.svg" alt="verif" style={{ width: 24, height: 24 }} />}
                  </div>
                  {foundUser.isFriend ? (
                    <span style={{ color: '#aaa', fontSize: 13 }}>Уже друг</span>
                  ) : (foundUser.id === user?.id) ? (
                    <span style={{ color: '#229ed9', fontSize: 15, fontWeight: 600 }}>Это вы</span>
                  ) : (
                    <button type="button" title="Добавить" className="chat-btn-circle xs" style={{ background: '#229ed9', color: '#fff', fontSize: 22, fontWeight: 700 }} onClick={() => sendRequest(foundUser.id)}>
                      +
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        {/* Входящие заявки справа */}
        <div style={{ flex: 1, minWidth: 280, maxWidth: 400, padding: "18px 0 18px 22px" }}>
          <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 18, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
            <FiUserPlus style={{ fontSize: 22, color: "#229ED9" }} /> Входящие заявки
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {Array.isArray(requests) && requests.length > 0 ? requests.map(r => (
              r && typeof r.login === "string" ? (
                <div key={r.id} style={{ background: "none", borderRadius: 0, padding: "10px 16px", display: "flex", alignItems: "center", gap: 8, boxShadow: "none", border: "none", transition: "none" }}>
                  <div style={{ position: 'relative' }}>
                    <img src={r.avatar || '/window.svg'} alt="avatar" style={{ width: 40, height: 40, borderRadius: '50%', objectFit: 'cover', background: 'none', marginRight: 6, boxShadow: 'none' }} />
                    {r.status === 'dnd' ? (
                      <img src="/moon-dnd.svg" alt="dnd" style={{ position: 'absolute', left: 26, top: 26, width: 16, height: 16 }} />
                    ) : (
                      <span style={{ position: 'absolute', left: 28, top: 28, width: 10, height: 10, borderRadius: '50%', background: r.status === 'online' ? '#1ed760' : '#888', border: '2px solid #23242a' }} />
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 15, fontWeight: 500, cursor: "pointer", color: "#fff" }} onClick={() => window.location.href = `/profile/${r.id}`}>{r.link ? `@${r.link}` : r.login}</span>
                    {r.role === 'admin' && <img src="/role-icons/admin.svg" alt="admin" style={{ width: 22, height: 22 }} />}
                    {r.role === 'moderator' && <img src="/role-icons/moderator.svg" alt="moderator" style={{ width: 22, height: 22 }} />}
                    {r.role === 'verif' && <img src="/role-icons/verif.svg" alt="verif" style={{ width: 22, height: 22 }} />}
                    {/* Принять: плюс */}
                    <button type="button" title="Принять" className="chat-btn-circle xs" style={{ background: '#229ed9', color: '#fff', fontSize: 22, fontWeight: 700, marginLeft: 8 }} onClick={() => handleAccept(r.id)}>
                      +
                    </button>
                    {/* Отклонить: крестик */}
                    <button type="button" title="Отклонить" className="chat-btn-circle xs" style={{ background: '#ff1a1a', color: '#fff', fontSize: 22, fontWeight: 700, marginLeft: 4 }} onClick={() => handleDecline(r.id)}>
                      ×
                    </button>
                  </div>
                </div>
              ) : null
            )) : <div style={{ color: "#bbb", fontSize: 16, textAlign: "left", marginTop: 0, paddingLeft: 0 }}>Нет входящих заявок</div>}
          </div>
        </div>
      </div>
    </>
  );
}

import React, { useState, useEffect } from "react";
import { getUser } from "../lib/session";
import Sidebar from "../components/Sidebar";
import ToastNotification from "./chat/ToastNotification";
import { FiSearch, FiUserPlus, FiCheck, FiX } from "react-icons/fi";

export default function FriendsPage() {
  // Отправить заявку в друзья
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const sendRequest = async (friendId: string) => {
    if (!user?.id || friendId === user.id) return;
    try {
      const res = await fetch(`/api/friends/request`, {
        method: "POST",
        credentials: 'include',
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, friendId })
      });
      if (res.ok) {
        setSearchResult(null);
        setToast({ type: 'success', message: 'Заявка отправлена' });
      } else {
        const data = await res.json().catch(() => ({}));
        setToast({ type: 'error', message: data?.error || 'Ошибка при отправке заявки' });
      }
    } catch (e) {
      setToast({ type: 'error', message: 'Ошибка сети' });
    }
  };

  // Принять заявку
  const handleAccept = async (requestId: string) => {
    const res = await fetch(`/api/friends/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user?.id, requestId })
    });
    const data = await res.json();
    
    setRequests(requests.filter(r => r.id !== requestId));
    setToast({ type: 'success', message: 'Заявка принята' });
    
    // Do not navigate automatically after accept; server still creates chat if needed.
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
    if (!u) {
      window.location.href = "/auth/login";
      return;
    }
    fetch(`/api/profile?userId=${u.id}`)
      .then(r => r.json().catch(() => ({})))
      .then(data => {
        const profile = data && data.user ? data.user : null;
        if (!profile) {
          // profile not returned (maybe unauthorized or server error) - don't crash
          console.warn('Profile fetch did not return user:', data);
          setFriends([]);
          setRequests([]);
          return;
        }
        setFriends(Array.isArray(profile.friends) ? profile.friends : []);
        setRequests(Array.isArray(profile.friendRequests) ? profile.friendRequests : []);
      }).catch(e => {
        console.error('Failed to fetch profile:', e);
        setFriends([]);
        setRequests([]);
      });
  }, []);

  return (
    <>
      <h2 style={{ textAlign: "center", fontSize: 36, fontWeight: 800, margin: "48px 0 24px 0", color: "#fff" }}>Меню друзей</h2>
      <p style={{ textAlign: 'center', color: '#bfc9cf', marginTop: 0, marginBottom: 28 }}>Поиск и заявки, взаимная дружба создана для общения в чатах</p>
      {toast && (
        <ToastNotification
          type={toast.type}
          message={toast.message}
          duration={2500}
          onClose={() => setToast(null)}
        />
      )}
      <div style={{ display: 'flex', gap: 36, justifyContent: 'center', alignItems: 'flex-start', width: '100%', marginTop: 8, padding: '0 20px', boxSizing: 'border-box' }}>
        <div className="friends-grid" style={{ width: 720, maxWidth: '100%', display: 'flex', gap: 20 }}>
          <div className="friend-panel" style={{ flex: 1, background: '#1e2124', borderRadius: 14, padding: 18, boxShadow: '0 8px 30px rgba(0,0,0,0.55)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
              <FiSearch style={{ fontSize: 22, color: '#4fc3f7' }} />
              <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>Поиск друзей</div>
            </div>
            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <input
                type="text"
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Поиск по линку или имени"
                style={{ flex: 1, padding: '12px 14px', borderRadius: 12, border: '1px solid rgba(255,255,255,0.04)', background: 'rgba(10,12,18,0.4)', color: '#e6eef8', fontSize: 15, outline: 'none' }}
              />
              <button onClick={() => setSearch('')} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.04)', color: '#bfc9cf', padding: '10px 12px', borderRadius: 10, cursor: 'pointer' }}>Очистить</button>
            </div>

            <div style={{ marginTop: 14 }}>
              {loading && <div style={{ color: '#9fbfe6' }}>Поиск...</div>}
              {Array.isArray(searchResult) && searchResult.length === 0 && !loading && (
                <div style={{ color: '#99a2b6', padding: 18 }}>Ничего не найдено</div>
              )}
              {Array.isArray(searchResult) && searchResult.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {searchResult.map(foundUser => (
                    <div key={foundUser.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: 12, borderRadius: 10, background: 'rgba(20,22,26,0.6)' }}>
                      <div style={{ position: 'relative' }}>
                        <img src={foundUser.avatar || '/window.svg'} alt="avatar" style={{ width: 52, height: 52, borderRadius: '50%', objectFit: 'cover', boxShadow: '0 4px 14px rgba(2,6,23,0.6)' }} />
                        {foundUser.status === 'dnd' ? (
                          <img src="/moon-dnd.svg" alt="dnd" style={{ position: 'absolute', left: 36, top: 36, width: 16, height: 16 }} />
                        ) : (
                          <span style={{ position: 'absolute', left: 40, top: 40, width: 10, height: 10, borderRadius: '50%', background: foundUser.status === 'online' ? '#1ed760' : '#888', border: '2px solid #0f1113' }} />
                        )}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ color: '#e6eef8', fontWeight: 700 }}>{foundUser.link ? `@${foundUser.link}` : foundUser.login}</div>
                          <img src={`/role-icons/${foundUser.role || 'user'}.svg`} alt={foundUser.role || 'user'} style={{ width: 16, height: 16 }} />
                        </div>
                        <div style={{ color: '#9fbfe6', fontSize: 13 }}>{foundUser.description || ''}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 8 }}>
                        {foundUser.isFriend ? (
                          <div style={{ padding: '8px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.03)', color: '#bfc9cf' }}>Уже друг</div>
                        ) : (foundUser.id === user?.id) ? (
                          <div style={{ color: '#4fc3f7', fontWeight: 700 }}>Это вы</div>
                        ) : (
                          <button onClick={() => sendRequest(foundUser.id)} style={{ background: '#4fc3f7', color: '#06121a', border: 'none', padding: '10px 14px', borderRadius: 10, cursor: 'pointer', fontWeight: 800 }}>Добавить</button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="friend-panel" style={{ width: 320, background: '#1e2124', borderRadius: 14, padding: 18, boxShadow: '0 8px 30px rgba(0,0,0,0.55)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <FiUserPlus style={{ fontSize: 20, color: '#4fc3f7' }} />
              <div style={{ fontSize: 18, fontWeight: 700, color: '#fff' }}>Входящие заявки</div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {Array.isArray(requests) && requests.length > 0 ? requests.map(r => (
                r && typeof r.login === 'string' ? (
                  <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 10, borderRadius: 10, background: 'rgba(20,22,26,0.55)' }}>
                    <div style={{ position: 'relative' }}>
                      <img src={r.avatar || '/window.svg'} alt="avatar" style={{ width: 46, height: 46, borderRadius: '50%', objectFit: 'cover', boxShadow: '0 6px 18px rgba(2,6,23,0.6)' }} />
                      {r.status === 'dnd' ? (
                        <img src="/moon-dnd.svg" alt="dnd" style={{ position: 'absolute', left: 30, top: 30, width: 14, height: 14 }} />
                      ) : (
                        <span style={{ position: 'absolute', left: 32, top: 32, width: 9, height: 9, borderRadius: '50%', background: r.status === 'online' ? '#1ed760' : '#888', border: '2px solid #0f1113' }} />
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <div style={{ color: '#fff', fontWeight: 700, cursor: 'pointer' }} onClick={() => window.location.href = `/profile/${r.id}`}>{r.link ? `@${r.link}` : r.login}</div>
                        <img src={`/role-icons/${r.role || 'user'}.svg`} alt={r.role || 'user'} style={{ width: 16, height: 16 }} />
                      </div>
                      <div style={{ color: '#9fbfe6', fontSize: 13 }}>{r.description || ''}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button title="Принять" onClick={() => handleAccept(r.id)} style={{ background: '#4fc3f7', color: '#06121a', padding: '8px 12px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 700 }}>Принять</button>
                      <button title="Отклонить" onClick={() => handleDecline(r.id)} style={{ background: 'transparent', color: '#ff6b6b', padding: '8px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.04)', cursor: 'pointer', fontWeight: 700 }}>Отклонить</button>
                    </div>
                  </div>
                ) : null
              )) : <div style={{ color: '#99a2b6' }}>Нет входящих заявок</div>}
            </div>
          </div>
        </div>
      </div>
      <style jsx global>{`
        /* Remove panel backgrounds but preserve layout/padding/content */
        .friend-panel { background: transparent !important; box-shadow: none !important; border-radius: 0 !important; }
        /* Responsive: stack panels on mobile */
        .friends-grid { display: flex; gap: 20px; }
        @media (max-width: 820px) {
          .friends-grid { flex-direction: column; width: 100% !important; }
          .friends-grid > div { width: 100% !important; }
        }
        @media (max-width: 480px) {
          h2 { font-size: 28px !important; margin: 28px 0 16px 0 !important; }
          .friend-panel { padding: 12px !important; }
        }
      `}</style>
    </>
  );
}

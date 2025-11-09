import React, { useState, useEffect } from "react";
import { FiSearch, FiUserPlus, FiCheck, FiX } from "react-icons/fi";

export default function FriendsPage() {
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
      setSearchResult(null);
      return;
    }
    let active = true;
    setLoading(true);
    fetch(`/api/friends/search?link=${encodeURIComponent(search)}&userId=${user?.id || ''}`)
      .then(res => res.json())
      .then(data => {
        if (active) {
          setSearchResult(data.user === null ? "notfound" : data.user);
          setLoading(false);
        }
      });
    return () => { active = false; };
  }, [search]);
  // ...existing code...

  // ...existing code...

  const sendRequest = async (friendId: string) => {
    if (!user?.id || user.id === friendId) return;
    await fetch(`/api/friends/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, friendId })
    });
    setSearchResult(null);
  };

  const handleAccept = async (requestId: string) => {
    await fetch(`/api/friends/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user?.id, requestId })
    });
    setRequests(requests.filter(r => r.id !== requestId));
  };

  const handleDecline = async (requestId: string) => {
    await fetch(`/api/friends/decline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user?.id, requestId })
    });
    setRequests(requests.filter(r => r.id !== requestId));
  };

  return (
    <div style={{ maxWidth: 700, margin: "40px auto", padding: 32, background: "#23242a", borderRadius: 24, boxShadow: "0 6px 32px #0008", color: "#fff", fontFamily: "Segoe UI, Verdana, Arial, sans-serif" }}>
      <h2 style={{ fontSize: 32, fontWeight: 700, marginBottom: 32, textAlign: "center", letterSpacing: 1, color: "#fff", textShadow: "none" }}>Друзья и заявки</h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 32, alignItems: "flex-start", justifyContent: "space-between" }}>
        {/* Поиск друзей */}
        <div style={{ flex: 1, minWidth: 280, background: "#23242a", borderRadius: 16, padding: "18px 22px", boxShadow: "0 2px 12px #0004" }}>
          <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 18, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
            <FiSearch style={{ fontSize: 22, color: "#229ED9" }} /> Поиск друзей
          </div>
          <div style={{ marginBottom: 8 }}>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{
                padding: "12px 16px",
                borderRadius: "10px",
                border: "none",
                background: "#18191c",
                color: "#e3e8f0",
                fontSize: "16px",
                width: "100%",
                outline: "none",
                boxShadow: "none",
                fontWeight: 500,
                margin: "0",
                letterSpacing: "0.1px",
                transition: "box-shadow 0.2s",
              }}
              placeholder="Поиск по логину..."
            />
          </div>
          {loading && <div style={{ color: "#bbb", marginTop: 12, fontSize: 16 }}>Поиск...</div>}
          {searchResult && (
            searchResult === "notfound" ? (
              <div style={{ background: "#292a2e", borderRadius: 10, padding: "12px 18px", marginTop: 22, textAlign: "center", color: "#bbb", fontSize: 17, boxShadow: "0 2px 12px #0003" }}>Такого пользователя нет, может вы ошиблись?</div>
            ) : (
              <div style={{ background: "#18191c", borderRadius: 14, padding: "16px 22px", marginTop: 22, display: "flex", alignItems: "center", gap: 18, boxShadow: "0 2px 16px #0006", transition: "box-shadow 0.2s" }}>
                <img src={searchResult.avatar || "/logo.svg"} alt="avatar" style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", background: "#292a2e", marginRight: 8, boxShadow: "0 2px 8px #0003" }} />
                <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <span style={{ fontSize: 17, fontWeight: 600, color: "#fff", display: 'flex', alignItems: 'center', gap: 8 }}>
                    {searchResult.login}
                    {searchResult.role === 'admin' && <img src="/role-icons/admin.svg" alt="admin" style={{width:20, height:20, marginLeft:4}} />}
                    {searchResult.role === 'moderator' && <img src="/role-icons/moderator.svg" alt="moderator" style={{width:20, height:20, marginLeft:4}} />}
                    {searchResult.role === 'verif' && <img src="/role-icons/verif.svg" alt="verif" style={{width:20, height:20, marginLeft:4}} />}
                  </span>
                </div>
                {searchResult.isFriend ? (
                  <span style={{ color: '#4fc3f7', fontWeight: 600, fontSize: 15, marginLeft: 16 }}>Уже в друзьях</span>
                ) : user?.id !== searchResult.id && (
                  <button
                    onClick={() => sendRequest(searchResult.id)}
                    style={{
                      background: "#229ED9",
                      color: "#fff",
                      border: "none",
                      borderRadius: 8,
                      padding: "10px",
                      fontSize: 18,
                      fontWeight: 500,
                      cursor: "pointer",
                      boxShadow: "none",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      minWidth: 0,
                      width: 38,
                      height: 38,
                    }}
                    aria-label="Добавить в друзья"
                  >
                    <FiUserPlus style={{ fontSize: 22 }} />
                  </button>
                )}
              </div>
            )
          )}
        </div>
        {/* Входящие заявки */}
        <div style={{ flex: 1, minWidth: 280, background: "#23242a", borderRadius: 16, padding: "18px 22px", boxShadow: "0 2px 12px #0004" }}>
          <div style={{ fontSize: 20, fontWeight: 600, marginBottom: 18, color: "#fff", display: "flex", alignItems: "center", gap: 8 }}>
            <FiUserPlus style={{ fontSize: 22, color: "#229ED9" }} /> Входящие заявки
          </div>
          <div style={{ maxHeight: 220, overflowY: "auto", display: "flex", flexDirection: "column", gap: 14 }}>
            {Array.isArray(requests) && requests.length > 0 ? requests.map(r => (
              r && typeof r.login === "string" ? (
                <div key={r.id} style={{ background: "#18191c", borderRadius: 12, padding: "10px 16px", display: "flex", alignItems: "center", gap: 12, boxShadow: "0 2px 8px #0003", border: "none", transition: "box-shadow 0.2s" }}>
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#292a2e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, color: "#fff", fontWeight: 600, cursor: "pointer", boxShadow: "0 2px 6px #0002" }} onClick={() => window.location.href = `/profile/${r.id}`}>{r.login[0].toUpperCase()}</div>
                  <span style={{ fontSize: 15, fontWeight: 500, cursor: "pointer", color: "#fff" }} onClick={() => window.location.href = `/profile/${r.id}`}>{r.login}</span>
                  <button onClick={() => handleAccept(r.id)} style={{ background: "#229ED9", color: "#fff", border: "none", borderRadius: 7, padding: "7px 14px", fontSize: 15, fontWeight: 500, cursor: "pointer", boxShadow: "none", display: "flex", alignItems: "center", gap: 6 }}><FiCheck style={{ fontSize: 16 }} /> Принять</button>
                  <button onClick={() => handleDecline(r.id)} style={{ background: "#444", color: "#fff", border: "none", borderRadius: 7, padding: "7px 14px", fontSize: 15, fontWeight: 500, cursor: "pointer", boxShadow: "none", display: "flex", alignItems: "center", gap: 6 }}><FiX style={{ fontSize: 16 }} /> Отклонить</button>
                </div>
              ) : null
            )) : <div style={{ color: "#bbb", fontSize: 16, textAlign: "left", marginTop: 0, paddingLeft: 0 }}>Нет входящих заявок</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

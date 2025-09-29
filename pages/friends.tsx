import React, { useState, useEffect } from "react";
import { getUser } from "../lib/session";

export default function FriendsPage() {
  const [user, setUser] = useState<{ id: string; login: string } | null>(null);
  const [search, setSearch] = useState("");
  const [searchResult, setSearchResult] = useState<any>(null);
  const [friends, setFriends] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  // Безопасный friends для рендера
  const friendsSafe = Array.isArray(friends) ? friends : [];
  useEffect(() => {
    const u = getUser();
    setUser(u);
    if (!u) {
      window.location.href = "/auth/login";
      return;
    }
    fetch(`/api/profile?userId=${u.id}`)
      .then(r => r.json())
      .then(data => {
        setFriends(data.user.friends || []);
        setRequests(data.user.friendRequests || []);
      });
  }, []);

  const handleSearch = async () => {
  setLoading(true);
  const res = await fetch(`/api/friends/search?login=${search}`);
  const data = await res.json();
  setSearchResult(data.user === null ? "notfound" : data.user);
  setLoading(false);
  };

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
  <div style={{ maxWidth: 600, margin: "40px auto", padding: 32, background: "#23242a", borderRadius: 22, boxShadow: "0 4px 32px #0008", color: "#fff", fontFamily: "Segoe UI, Verdana, Arial, sans-serif" }}>
      <h2 style={{ fontSize: 28, fontWeight: 700, marginBottom: 28, textAlign: "center", letterSpacing: 1, color: "#fff", textShadow: "none" }}>Друзья и заявки</h2>
  <div style={{ display: "flex", gap: 32, alignItems: "flex-start", justifyContent: "space-between" }}>
        {/* Поиск друзей */}
  <div style={{ flex: 1, background: "#23242a", borderRadius: 0, padding: "14px 16px", boxShadow: "none", minWidth: 260 }}>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 14, color: "#fff" }}>Поиск друзей</div>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Поиск по логину..." style={{ padding: "7px 12px", borderRadius: 8, border: "1.5px solid #222", background: "#18191c", color: "#fff", fontSize: 15, minWidth: 140, outline: "none", boxShadow: "none" }} />
            <button onClick={handleSearch} style={{ background: "#229ED9", color: "#fff", border: "none", borderRadius: 6, padding: "7px 16px", fontSize: 15, fontWeight: 500, cursor: "pointer", boxShadow: "none", transition: "background 0.2s" }}>Найти</button>
          </div>
          {loading && <div style={{ color: "#bbb", marginTop: 12, fontSize: 15 }}>Поиск...</div>}
          {searchResult && (
            searchResult === "notfound" ? (
              <div style={{ background: "#292a2e", borderRadius: 8, padding: "10px 16px", marginTop: 18, textAlign: "center", color: "#bbb", fontSize: 16 }}>Нет пользователя с таким логином</div>
            ) : (
              <div style={{ background: "#18191c", borderRadius: 10, padding: "12px 18px", marginTop: 18, display: "flex", alignItems: "center", gap: 14, boxShadow: "0 2px 12px #0006" }}>
                <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#292a2e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, color: "#fff", fontWeight: 600, cursor: "pointer" }} onClick={() => window.location.href = `/profile/${searchResult.id}`}>{typeof searchResult.login === "string" && searchResult.login.length > 0 ? searchResult.login[0].toUpperCase() : "?"}</div>
                <span style={{ fontSize: 15, fontWeight: 500, cursor: "pointer", color: "#fff" }} onClick={() => window.location.href = `/profile/${searchResult.id}`}>{typeof searchResult.login === "string" ? searchResult.login : "Неизвестно"}</span>
                {user?.id !== searchResult.id && (
                  <button onClick={() => sendRequest(searchResult.id)} style={{ background: "#229ED9", color: "#fff", border: "none", borderRadius: 6, padding: "7px 16px", fontSize: 15, fontWeight: 500, cursor: "pointer", boxShadow: "none" }}>Добавить</button>
                )}
              </div>
            )
          )}
        </div>
        {/* Входящие заявки */}
  <div style={{ flex: 1, background: "#23242a", borderRadius: 0, padding: "18px 22px", boxShadow: "none", minWidth: 260 }}>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 14, color: "#fff" }}>Входящие заявки</div>
          <div style={{ maxHeight: 180, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10 }}>
            {Array.isArray(requests) && requests.length > 0 ? requests.map(r => (
              r && typeof r.login === "string" ? (
                <div key={r.id} style={{ background: "#18191c", borderRadius: 0, padding: "7px 10px", display: "flex", alignItems: "center", gap: 8, boxShadow: "none", border: "none" }}>
                  <div style={{ width: 28, height: 28, borderRadius: "50%", background: "#292a2e", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, color: "#fff", fontWeight: 500, cursor: "pointer" }} onClick={() => window.location.href = `/profile/${r.id}`}>{r.login[0].toUpperCase()}</div>
                  <span style={{ fontSize: 13, fontWeight: 500, cursor: "pointer", color: "#fff" }} onClick={() => window.location.href = `/profile/${r.id}`}>{r.login}</span>
                  <button onClick={() => handleAccept(r.id)} style={{ background: "#229ED9", color: "#fff", border: "none", borderRadius: 5, padding: "5px 10px", fontSize: 13, fontWeight: 500, cursor: "pointer", boxShadow: "none" }}>Принять</button>
                  <button onClick={() => handleDecline(r.id)} style={{ background: "#444", color: "#fff", border: "none", borderRadius: 5, padding: "5px 10px", fontSize: 13, fontWeight: 500, cursor: "pointer", boxShadow: "none" }}>Отклонить</button>
                </div>
              ) : null
            )) : <div style={{ color: "#bbb", fontSize: 15, textAlign: "left", marginTop: 0, paddingLeft: 0 }}>Нет входящих заявок</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

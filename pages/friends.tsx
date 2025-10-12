import React, { useState, useEffect } from "react";
import { getUser } from "../lib/session";
import Sidebar from "../components/Sidebar";
import { FiSearch, FiUserPlus, FiCheck, FiX } from "react-icons/fi";

export default function FriendsPage() {
  // Отправить заявку в друзья
  const sendRequest = async (friendId: string) => {
    if (!user?.id || user.id === friendId) return;
    await fetch(`/api/friends/request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, friendId })
    });
    setSearchResult(null);
  };

  // Принять заявку
  const handleAccept = async (requestId: string) => {
    await fetch(`/api/friends/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user?.id, requestId })
    });
    setRequests(requests.filter(r => r.id !== requestId));
  };

  // Отклонить заявку
  const handleDecline = async (requestId: string) => {
    await fetch(`/api/friends/decline`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user?.id, requestId })
    });
    setRequests(requests.filter(r => r.id !== requestId));
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
      setSearchResult(null);
      return;
    }
    let active = true;
    setLoading(true);
    fetch(`/api/friends/search?login=${search}&userId=${user?.id || ''}`)
      .then(res => res.json())
      .then(data => {
        if (active) {
          setSearchResult(data.user === null ? "notfound" : data.user);
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
      .then(r => r.json())
      .then(data => {
        setFriends(data.user.friends || []);
        setRequests(data.user.friendRequests || []);
      });
  }, []);

  return (
    <>
      <h2 style={{ textAlign: "center", fontSize: 44, fontWeight: 700, margin: "72px 0 56px 0", color: "#fff" }}>Друзья и заявки</h2>
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
              placeholder="Поиск по логину..."
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
          {searchResult && (
            searchResult === "notfound" ? (
              <div style={{ background: "none", borderRadius: 0, padding: "12px 18px", marginTop: 22, textAlign: "center", color: "#bbb", fontSize: 17, boxShadow: "none" }}>Нет пользователя с таким логином</div>
            ) : (
              <div style={{ background: "none", borderRadius: 0, padding: "16px 22px", marginTop: 22, display: "flex", alignItems: "center", gap: 18, boxShadow: "none", transition: "none" }}>
                <img src={searchResult.avatar || "/logo.svg"} alt="avatar" style={{ width: 48, height: 48, borderRadius: "50%", objectFit: "cover", background: "none", marginRight: 8, boxShadow: "none" }} />
                <span style={{ fontSize: 17, fontWeight: 500, color: "#fff" }}>{searchResult.login}</span>
                <button onClick={() => sendRequest(searchResult.id)} style={{ background: "#229ED9", color: "#fff", border: "none", borderRadius: 7, padding: "7px 14px", fontSize: 15, fontWeight: 500, cursor: "pointer", boxShadow: "none", display: "flex", alignItems: "center", gap: 6 }}><FiUserPlus style={{ fontSize: 16 }} /> Добавить</button>
              </div>
            )
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
                <div key={r.id} style={{ background: "none", borderRadius: 0, padding: "10px 16px", display: "flex", alignItems: "center", gap: 12, boxShadow: "none", border: "none", transition: "none" }}>
                  <div style={{ width: 34, height: 34, borderRadius: "50%", background: "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 17, color: "#fff", fontWeight: 600, cursor: "pointer", boxShadow: "none" }} onClick={() => window.location.href = `/profile/${r.id}`}>{r.login[0].toUpperCase()}</div>
                  <span style={{ fontSize: 15, fontWeight: 500, cursor: "pointer", color: "#fff" }} onClick={() => window.location.href = `/profile/${r.id}`}>{r.login}</span>
                  <button onClick={() => handleAccept(r.id)} style={{ background: "#229ED9", color: "#fff", border: "none", borderRadius: 7, padding: "7px 14px", fontSize: 15, fontWeight: 500, cursor: "pointer", boxShadow: "none", display: "flex", alignItems: "center", gap: 6 }}><FiCheck style={{ fontSize: 16 }} /></button>
                  <button onClick={() => handleDecline(r.id)} style={{ background: "#444", color: "#fff", border: "none", borderRadius: 7, padding: "7px 14px", fontSize: 15, fontWeight: 500, cursor: "pointer", boxShadow: "none", display: "flex", alignItems: "center", gap: 6 }}><FiX style={{ fontSize: 16 }} /></button>
                </div>
              ) : null
            )) : <div style={{ color: "#bbb", fontSize: 16, textAlign: "left", marginTop: 0, paddingLeft: 0 }}>Нет входящих заявок</div>}
          </div>
        </div>
      </div>
    </>
  );
}

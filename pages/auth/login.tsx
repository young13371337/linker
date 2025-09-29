import { useState } from "react";
import { useRouter } from "next/router";
import { saveUser } from "../../lib/session";


export default function LoginPage() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [show2FA, setShow2FA] = useState(false);
  const [token, setToken] = useState("");
  const [pendingUser, setPendingUser] = useState<any>(null);
  const [forgotMsg, setForgotMsg] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password })
      });
      const data = await response.json();
      if (response.ok) {
        if (data.require2FA) {
          setPendingUser(data.user); // store user for next step
          setShow2FA(true);
        } else {
          saveUser(data.user);
          router.push("/profile");
        }
      } else {
        setError(data.error || "Неверный логин или пароль");
      }
    } catch (e) {
      setError("Сервер недоступен");
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#111" }}>
      {/* 2FA Modal */}
      {show2FA && (
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#111", position: "fixed", top: 0, left: 0, width: "100vw", height: "100vh", zIndex: 2000 }}>
          <div style={{ background: "#181818", borderRadius: 16, boxShadow: "0 4px 32px #0007", padding: 36, width: 360, maxWidth: "90vw", textAlign: "center", position: "relative", border: "1.5px solid #222" }}>
              <button onClick={() => setShow2FA(false)} style={{ position: "absolute", top: 12, right: 16, background: "none", border: "none", color: "#fff", fontSize: 22, cursor: "pointer", transition: "color 0.2s" }} onMouseOver={e => {e.currentTarget.style.color="#4fc3f7"}} onMouseOut={e => {e.currentTarget.style.color="#fff"}}>✕</button>
              <h2 style={{ textAlign: "center", marginBottom: 24, fontWeight: 600, fontSize: 28, color: "#4fc3f7" }}>Вход по 2FA</h2>
              <form onSubmit={async (e) => {
                e.preventDefault();
                setError("");
                if (!pendingUser) return;
                try {
                  const resp = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ login: pendingUser.login, password, token })
                  });
                  const data = await resp.json();
                  if (resp.ok) {
                    saveUser(data.user);
                    router.push('/profile');
                  } else {
                    setError(data.error || "Неверный токен");
                  }
                } catch (e) {
                  setError("Сервер недоступен");
                }
              }} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <input
                  type="text"
                  placeholder="Токен 2FA"
                  value={token}
                  onChange={e => setToken(e.target.value)}
                  required
                  style={{ padding: "12px 16px", borderRadius: 8, border: "1px solid #333", background: "#222", color: "#fff", fontSize: 16, outline: "none" }}
                />
                <button type="submit" style={{ width: "100%", padding: "12px 0", borderRadius: 8, border: "none", background: "#4fc3f7", color: "#111", fontWeight: 600, fontSize: 18, cursor: "pointer", transition: "background .2s" }}>Войти</button>
                {error && <div style={{ color: '#ff5252', marginTop: 4, textAlign: "center" }}>{error}</div>}
              </form>
              <div style={{ marginTop: 24, textAlign: "center", fontSize: 15 }}>
                <span style={{ color: "#4fc3f7", cursor: "pointer", textDecoration: "underline" }} onClick={() => setForgotMsg('Обратитесь к администратору для сброса токена в телеграмм - @cowqd')}>Забыл токен?</span>
                {forgotMsg && <div style={{ color: '#4fc3f7', marginTop: 10 }}>{forgotMsg}</div>}
              </div>
          </div>
        </div>
      )}
      <div style={{ background: "#181818", borderRadius: 16, boxShadow: "0 4px 32px #0007", padding: 36, width: 360, maxWidth: "90vw" }}>
        <h2 style={{ textAlign: "center", marginBottom: 24, fontWeight: 600, fontSize: 28 }}>Вход</h2>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <input
            type="text"
            placeholder="Логин"
            value={login}
            onChange={e => setLogin(e.target.value)}
            required
            style={{
              padding: "12px 16px",
              borderRadius: 8,
              border: "1px solid #333",
              background: "#222",
              color: "#fff",
              fontSize: 16,
              outline: "none"
            }}
          />
          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{
              padding: "12px 16px",
              borderRadius: 8,
              border: "1px solid #333",
              background: "#222",
              color: "#fff",
              fontSize: 16,
              outline: "none"
            }}
          />
          <button type="submit" style={{
            width: "100%",
            padding: "12px 0",
            borderRadius: 8,
            border: "none",
            background: "#4fc3f7",
            color: "#111",
            fontWeight: 600,
            fontSize: 18,
            cursor: "pointer",
            transition: "background .2s"
          }}>Войти</button>
          {error && <div style={{ color: "#ff5252", marginTop: 4, textAlign: "center" }}>{error}</div>}
        </form>
        <div style={{ marginTop: 24, textAlign: "center", fontSize: 15 }}>
          Нет аккаунта? <a href="/auth/register" style={{ color: "#4fc3f7" }}>Зарегистрироваться</a>
        </div>
      </div>
    </div>
  );
}


import { useState } from "react";
import { useRouter } from "next/router";

export default function RegisterPage() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess("Регистрация успешна! Теперь войдите.");
        setTimeout(() => router.push("/auth/login"), 900);
      } else {
        setError(data.error || "Ошибка регистрации");
      }
    } catch (e: any) {
      setError("Сервер недоступен");
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#111" }}>
      <div style={{ background: "#181818", borderRadius: 16, boxShadow: "0 4px 32px #0007", padding: 36, width: 360, maxWidth: "90vw" }}>
        <h2 style={{ textAlign: "center", marginBottom: 24, fontWeight: 600, fontSize: 28 }}>Регистрация</h2>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <input
            type="text"
            placeholder="Логин"
            value={login}
            onChange={e => setLogin(e.target.value)}
            required
            style={{ padding: "12px 16px", borderRadius: 8, border: "1px solid #333", background: "#222", color: "#fff", fontSize: 16, outline: "none" }}
          />
          <input
            type="password"
            placeholder="Пароль"
            value={password}
            onChange={e => setPassword(e.target.value)}
            required
            style={{ padding: "12px 16px", borderRadius: 8, border: "1px solid #333", background: "#222", color: "#fff", fontSize: 16, outline: "none" }}
          />
          <button type="submit" style={{ width: "100%", padding: "12px 0", borderRadius: 8, border: "none", background: "#4fc3f7", color: "#111", fontWeight: 600, fontSize: 18, cursor: "pointer", transition: "background .2s" }}>Зарегистрироваться</button>
          {error && <div style={{ color: "#ff5252", marginTop: 4, textAlign: "center" }}>{error}</div>}
          {success && <div style={{ color: "#4caf50", marginTop: 4, textAlign: "center" }}>{success}</div>}
        </form>
        <div style={{ marginTop: 24, textAlign: "center", fontSize: 15 }}>
          Уже есть аккаунт? <a href="/auth/login" style={{ color: "#4fc3f7" }}>Войти</a>
        </div>
      </div>
    </div>
  );
}

import ToastNotification from "../chat/ToastNotification";
import Lottie from "lottie-react";
import registerAnimation from "../../public/aui/register.json";

import { useState } from "react";
import { useRouter } from "next/router";

export default function RegisterPage() {
  const [toast, setToast] = useState<{type: 'error'|'success', message: string}|null>(null);
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Пример логики, можно заменить на свою
    if (!login || !password) {
      setToast({ type: 'error', message: 'Заполните все поля' });
      return;
    }
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password }),
      });
      const data = await res.json();
      if (res.ok) {
        // Перенаправляем пользователя на страницу входа
        router.push('/auth/login');
        setToast({ type: 'success', message: "Регистрация успешна! Перенаправление..." });
      } else {
        setToast({ type: 'error', message: data.error || "Ошибка регистрации" });
      }
    } catch (e) {
      setToast({ type: 'error', message: "Сервер недоступен" });
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#111" }}>
      <div style={{ display: "flex", justifyContent: "center", marginTop: 64, marginBottom: 18 }}>
        <div style={{ width: 220, height: 220 }}>
          <Lottie animationData={registerAnimation} loop={true} />
        </div>
      </div>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16, width: 360, maxWidth: "90vw", margin: "0 auto" }}>
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
        {toast && (
          <ToastNotification
            type={toast.type}
            message={toast.message}
            onClose={()=>setToast(null)}
            duration={4000}
          />
        )}
      </form>
      <div style={{ marginTop: 18, textAlign: "center", fontSize: 15 }}>
        Уже есть аккаунт? <a href="/auth/login" style={{ color: "#4fc3f7" }}>Войти</a>
      </div>
    </div>
  );
}

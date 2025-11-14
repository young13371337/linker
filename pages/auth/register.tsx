import ToastNotification from "../../components/ToastNotification";
import Lottie from "lottie-react";
import registerAnimation from "../../public/aui/register.json";

import { useState } from "react";
import { useRouter } from "next/router";

export default function RegisterPage() {
  const [toast, setToast] = useState<{type: 'error'|'success', message: string}|null>(null);
  const [login, setLogin] = useState("");
  const [link, setLink] = useState("");
  const [password, setPassword] = useState("");
  const router = useRouter();
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    // Пример логики, можно заменить на свою
    if (!login || !password || !link) {
      setToast({ type: 'error', message: 'Заполните все поля' });
      return;
    }
    // client-side validation for link: only letters, numbers and underscore, 3..32
    const re = /^[A-Za-z0-9_]{3,32}$/;
    if (!re.test(link)) {
      setToast({ type: 'error', message: 'Неверный формат линка (A-Z, 0-9, _ , 3-32 символа)' });
      return;
    }
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password, link }),
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
          className="auth-input--alt"
        />
        <input
          type="text"
          placeholder="Линк"
          value={link}
          onChange={e => setLink(e.target.value)}
          required
          className="auth-input--alt"
        />
        <input
          type="password"
          placeholder="Пароль"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          className="auth-input--alt"
        />
        <button type="submit" className="auth-btn">Зарегистрироваться</button>
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

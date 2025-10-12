import { useState } from "react";
import { useRouter } from "next/router";
import Lottie from "lottie-react";
import ToastNotification from "../chat/ToastNotification";
import loginAnimation from "../../public/aui/login.json";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [token, setToken] = useState("");
  const [show2FA, setShow2FA] = useState(false);
  const [toast, setToast] = useState<{ type: "error" | "success"; message: string } | null>(null);
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setToast(null);

    if (!login || !password) {
      setToast({ type: "error", message: "Заполните все поля" });
      return;
    }

    try {
      const signInData: any = {
        redirect: false,
        login,
        password,
      };

      if (show2FA && token.trim() !== "") {
        signInData.twoFactorToken = token;
      }

      const res = await signIn("credentials", signInData);

      if (res?.error) {
        setToast({
          type: "error",
          message: res.error === "CredentialsSignin" ? "Ошибка входа, проверьте данные" : res.error,
        });
      } else {
        try {
          const resp = await fetch(`/api/profile?login=${encodeURIComponent(login)}`);
          const data = await resp.json();
          if (data.user && data.user.id) {
            // Сохраняем пользователя для Sidebar
            try {
              const { saveUser } = await import("../../lib/session");
              saveUser({ id: data.user.id, login: data.user.login });
              window.dispatchEvent(new Event("user-login"));
            } catch (e) {
              // ignore
            }
          }
        } catch {
          console.warn("Не удалось получить профиль");
        }

        setToast({ type: "success", message: "Успешный вход, Загрузка..." });
        setTimeout(() => router.push("/profile"), 800);
      }
    } catch (err) {
      console.error(err);
      setToast({ type: "error", message: "Сервер недоступен" });
    }
  };

  const handleLoginBlur = async () => {
    setShow2FA(false);
    setToken("");
    if (!login.trim()) return;

    try {
      const resp = await fetch(`/api/profile?login=${encodeURIComponent(login)}`);
      const data = await resp.json();
      if (data.user && data.user.twoFactorToken) {
        setShow2FA(true);
      }
    } catch {
      console.warn("Ошибка при проверке 2FA");
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#111" }}>
      <div style={{ display: "flex", justifyContent: "center", marginTop: 64, marginBottom: 18 }}>
        <div style={{ width: 220, height: 220 }}>
          <Lottie animationData={loginAnimation} loop={true} />
        </div>
      </div>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16, width: 360, maxWidth: "90vw", margin: "0 auto" }}>
        <input
          type="text"
          placeholder="Логин"
          value={login}
          onChange={e => setLogin(e.target.value)}
          onBlur={handleLoginBlur}
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
        {show2FA && (
          <input
            type="text"
            placeholder="2FA Токен"
            value={token}
            onChange={e => setToken(e.target.value)}
            style={{ padding: "12px 16px", borderRadius: 8, border: "1px solid #333", background: "#222", color: "#fff", fontSize: 16, outline: "none" }}
          />
        )}
        <button type="submit" style={{ width: "100%", padding: "12px 0", borderRadius: 8, border: "none", background: "#4fc3f7", color: "#111", fontWeight: 600, fontSize: 18, cursor: "pointer", transition: "background .2s" }}>Войти</button>
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
        Нет аккаунта? <a href="/auth/register" style={{ color: "#4fc3f7" }}>Зарегистрироваться</a>
      </div>
    </div>
  );
}

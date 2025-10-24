import { useState } from "react";
import CodeInput from "../../components/CodeInput";
import { useRouter } from "next/router";
import Lottie from "lottie-react";
import ToastNotification from "../chat/ToastNotification";
import loginAnimation from "../../public/aui/login.json";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
    // ...удалено: состояние для twoFactorToken...
  const [toast, setToast] = useState<{ type: "error" | "success"; message: string } | null>(null);
  const [show2FA, setShow2FA] = useState(false);
  const [pending2FA, setPending2FA] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setToast(null);

    if (!login || !password) {
      setToast({ type: "error", message: "Заполните все поля" });
      return;
    }

    try {
      if (!show2FA) {
        // Первый этап: только логин и пароль
        const signInData: any = {
          redirect: false,
          login,
          password,
        };
        const res = await signIn("credentials", signInData);
        if (res?.error) {
          // Если ошибка про 2FA — показываем поле для кода
          if (res.error.toLowerCase().includes("2fa code required")) {
            setShow2FA(true);
            setPending2FA(true);
            setToast({ type: "error", message: "Введите 2FA код" });
          } else {
            setToast({ type: "error", message: res.error === "CredentialsSignin" ? "Ошибка входа, проверьте данные" : res.error });
          }
        } else {
          // Успешный вход без 2FA
          setToast({ type: "success", message: "Загрузка данных..." });
          setTimeout(() => router.push("/profile"), 800);
        }
      } else {
        // Второй этап: логин, пароль, 2FA
        const signInData: any = {
          redirect: false,
          login,
          password,
          twoFactorCode: twoFactorCode.trim(),
        };
        const res = await signIn("credentials", signInData);
        if (res?.error) {
          setToast({ type: "error", message: res.error === "CredentialsSignin" ? "Ошибка входа, проверьте данные" : res.error });
        } else {
          setToast({ type: "success", message: "Загрузка данных..." });
          setTimeout(() => router.push("/profile"), 800);
        }
      }
    } catch (err) {
      console.error(err);
      setToast({ type: "error", message: "Сервер выключен." });
    }
  };

  const handleLoginBlur = async () => {
  // ...удалено: вызовы setShow2FA и setToken...
    if (!login.trim()) return;

    try {
      const resp = await fetch(`/api/profile?login=${encodeURIComponent(login)}`);
      const data = await resp.json();
      if (data.user && data.user.twoFactorEnabled) {
        setShow2FA(true);
      } else {
        setShow2FA(false);
      }
    } catch {
      console.warn("Неверный 2FA");
    }
  };

  return (
  <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", background: "#111", paddingTop: "7vh" }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
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
          <CodeInput
            value={twoFactorCode}
            onChange={setTwoFactorCode}
            length={6}
            autoFocus={pending2FA}
            onComplete={() => {}}
            size="small"
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

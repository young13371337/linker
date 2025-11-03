import { useState } from "react";
import CodeInput from "../../components/CodeInputMobile";
import { useRouter } from "next/router";
import Lottie from "lottie-react";
import ToastNotification from "../chat/ToastNotification";
import loginAnimation from "../../public/aui/login.json";
import { signIn, signOut } from "next-auth/react";

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
          const err = String(res.error).toLowerCase();
          if (err.includes("2fa") || err.includes("twofactor") || err.includes("two-factor") || err.includes("two factor")) {
            setShow2FA(true);
            setPending2FA(true);
            setToast({ type: "error", message: "Введите 2FA код" });
          } else if (res.error === "CredentialsSignin") {
            // Backend may return null from authorize() for 2FA-required case, which surfaces as CredentialsSignin.
            // Try to detect if the account has 2FA enabled and show the 2FA input instead of generic error.
            try {
              const resp = await fetch(`/api/profile?login=${encodeURIComponent(login)}`);
              const data = await resp.json();
              if (data.user && data.user.twoFactorEnabled) {
                setShow2FA(true);
                setPending2FA(true);
                setToast({ type: "error", message: "Введите 2FA код" });
              } else {
                setToast({ type: "error", message: "Ошибка входа, проверьте данные" });
              }
            } catch (e) {
              setToast({ type: "error", message: "Ошибка входа, проверьте данные" });
            }
          } else {
            setToast({ type: "error", message: res.error });
          }
        } else {
          // Успешный вход without 2FA — check whether account is banned
          try {
            const resp = await fetch(`/api/profile?login=${encodeURIComponent(login)}`);
            const data = await resp.json().catch(() => null);
            if (data && data.user && data.user.role === 'ban') {
              // show persistent toast informing about ban and force sign out
              setToast({ type: 'error', message: 'Аккаунт заблокирован за нарушение правил. Войти нельзя.' });
              try { await signOut({ redirect: false }); } catch (e) {}
              return;
            }
          } catch (e) {
            // ignore and proceed
          }
          // Notify the app this is an explicit login so we can show the bottom loading toast only now
          try { window.dispatchEvent(new Event("user-login")); } catch (e) {}
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
          // Successful 2FA sign-in — verify ban status
          try {
            const resp = await fetch(`/api/profile?login=${encodeURIComponent(login)}`);
            const data = await resp.json().catch(() => null);
            if (data && data.user && data.user.role === 'ban') {
              setToast({ type: 'error', message: 'Аккаунт заблокирован за нарушение правил. Войти нельзя.' });
              try { await signOut({ redirect: false }); } catch (e) {}
              return;
            }
          } catch (e) {}

          // Successful 2FA sign-in: dispatch explicit login event so prefetch shows bottom toast once
          try { window.dispatchEvent(new Event("user-login")); } catch (e) {}
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
    {/* Slightly raise the auth card for better button visibility while keeping centered */}
    <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', transform: 'translateY(-6vh)' }}>
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
        <div style={{ width: 220, height: 220 }}>
          <Lottie animationData={loginAnimation} loop={true} />
        </div>
      </div>
      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: show2FA ? 8 : 16, width: 360, maxWidth: "90vw", margin: "0 auto" }}>
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
          <>
            <div style={{ textAlign: 'center', color: '#ddd', fontSize: 13, marginTop: 6, marginBottom: 6 }}></div>
            <CodeInput
              value={twoFactorCode}
              onChange={setTwoFactorCode}
              length={6}
              autoFocus={pending2FA}
              onComplete={() => {}}
              size="small" /* use compact size by default; mobile component will remain compact on narrow screens */
            />
          </>
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
    {/* end raised wrapper */}
    </div>
  );
}

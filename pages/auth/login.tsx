import { useState, useCallback } from "react";
import CodeInput from "../../components/CodeInputMobile";
import { useRouter } from "next/router";
import dynamic from 'next/dynamic';
// Lottie should only render on the client to avoid SSR/client markup mismatches
const Lottie = dynamic(() => import('lottie-react'), { ssr: false });
import ToastNotification from "../chat/ToastNotification";
import loginAnimation from "../../public/aui/login.json";
import { signIn } from "next-auth/react";

export default function LoginPage() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");

  const [toast, setToast] = useState<{ type: "error" | "success"; message: string } | null>(null);

  const [show2FA, setShow2FA] = useState(false);         // показывать поле для кода 2FA
  const [pending2FA, setPending2FA] = useState(false);   // автофокус при первой проверке
  const [twoFactorCode, setTwoFactorCode] = useState("");

  const router = useRouter();

  // ✅ Стабильная проверка 2FA (не вызывает повторных ререндеров)
  const safeCheck2FA = useCallback(async (userLogin: string) => {
    try {
      const resp = await fetch(`/api/profile?login=${encodeURIComponent(userLogin)}`);
      const data = await resp.json();

      const enabled = Boolean(data?.user?.twoFactorEnabled);

      // Меняем стейт ТОЛЬКО если действительно нужно
      setShow2FA(prev => (prev !== enabled ? enabled : prev));

      return enabled;
    } catch {
      return false;
    }
  }, []);

  // ✅ Обработчик отправки формы
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setToast(null);

    if (!login || !password) {
      setToast({ type: "error", message: "Заполните все поля" });
      return;
    }

    try {
      // --- Первый этап: логин + пароль ---
      if (!show2FA) {
        const res: any = await signIn("credentials", {
          redirect: false,
          login,
          password
        });

        if (res?.error) {
          const err = String(res.error).toLowerCase();

          // Backend говорит, что нужна 2FA
          if (err.includes("2fa") || err.includes("twofactor") || err.includes("two-factor") || err.includes("two factor")) {
            setPending2FA(true);
            setShow2FA(true);
            setToast({ type: "error", message: "Введите 2FA код" });
            return;
          }

          // Проверяем профиль — включена ли 2FA
          const enabled = await safeCheck2FA(login);
          if (enabled) {
            setPending2FA(true);
            setToast({ type: "error", message: "Введите 2FA код" });
            return;
          }

          setToast({ type: "error", message: "Ошибка входа, проверьте данные" });
          return;
        }

        // ✅ успешный вход без 2FA
        try { window.dispatchEvent(new Event("user-login")); } catch {}
        setTimeout(() => router.push("/profile"), 600);
        return;
      }

      // --- Второй этап: логин + пароль + 2FA ---
      const res2: any = await signIn("credentials", {
        redirect: false,
        login,
        password,
        twoFactorCode: twoFactorCode.trim(),
      });

      if (res2?.error) {
        setToast({
          type: "error",
          message: res2.error === "CredentialsSignin"
            ? "Ошибка входа, проверьте данные"
            : res2.error
        });
        return;
      }

      // ✅ успешный вход с 2FA
      try { window.dispatchEvent(new Event("user-login")); } catch {}
      setTimeout(() => router.push("/profile"), 600);

    } catch (err) {
      console.error(err);
      setToast({ type: "error", message: "Сервер выключен." });
    }
  };

  // ✅ Проверка логина на 2FA (без лишних ререндеров)
  const handleLoginBlur = async () => {
    if (!login.trim()) return;
    await safeCheck2FA(login);
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      background: "#111",
      paddingTop: "7vh"
    }}>
      <div style={{
        width: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        transform: 'translateY(-6vh)'
      }}>
        <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
          <div style={{ width: 220, height: 220 }}>
            <Lottie animationData={loginAnimation} loop={true} />
          </div>
        </div>

        <form onSubmit={handleSubmit}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: show2FA ? 8 : 16,
            width: 360,
            maxWidth: "90vw",
            margin: "0 auto"
          }}
        >
          <input
            type="text"
            placeholder="Логин"
            value={login}
            onChange={e => setLogin(e.target.value)}
            onBlur={handleLoginBlur}
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

          {show2FA && (
            <>
              <div style={{
                textAlign: 'center',
                color: '#ddd',
                fontSize: 13,
                marginTop: 6,
                marginBottom: 6
              }}>
                Введите код из приложения
              </div>

              <CodeInput
                value={twoFactorCode}
                onChange={setTwoFactorCode}
                length={6}
                autoFocus={pending2FA}
                onComplete={() => {}}
                size="small"
              />
            </>
          )}

          <button type="submit"
            style={{
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
            }}
          >
            Войти
          </button>

          {toast && (
            <ToastNotification
              type={toast.type}
              message={toast.message}
              onClose={() => setToast(null)}
              duration={4000}
            />
          )}
        </form>

        <div style={{ marginTop: 18, textAlign: "center", fontSize: 15 }}>
          Нет аккаунта?{" "}
          <a href="/auth/register" style={{ color: "#4fc3f7" }}>
            Зарегистрироваться
          </a>
        </div>
      </div>
    </div>
  );
}

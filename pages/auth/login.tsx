import { useState } from "react";
import { useRouter } from "next/router";
import { signIn } from "next-auth/react";
import { saveUser } from "../../lib/session";


export default function LoginPage() {
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [token, setToken] = useState("");
  const [show2FA, setShow2FA] = useState(false);
  const [pendingUser, setPendingUser] = useState<any>(null);
  const [forgotMsg, setForgotMsg] = useState("");
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    const signInData: any = {
      redirect: false,
      login,
      password
    };
    // twoFactorToken добавляем только если show2FA и token не пустой
    if (show2FA && token && token.trim() !== "") {
      signInData.twoFactorToken = token;
    }
    const res = await signIn("credentials", signInData);
    if (res?.error) {
      if (res.error === "CredentialsSignin") {
        setError("Ошибка входа, проверьте данные");
      } else {
        setError(res.error);
      }
    } else {
      // Получить id пользователя и сохранить в localStorage
      try {
        const resp = await fetch(`/api/profile?login=${encodeURIComponent(login)}`);
        const data = await resp.json();
        if (data.user && data.user.id) {
          saveUser({ id: data.user.id, login });
        }
      } catch {}
      router.push("/profile");
    }
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#111" }}>
      <div style={{ background: "#181818", borderRadius: 16, boxShadow: "0 4px 32px #0007", padding: 36, width: 360, maxWidth: "90vw" }}>
        <h2 style={{ textAlign: "center", marginBottom: 24, fontWeight: 600, fontSize: 28 }}>Вход</h2>
        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <input
            type="text"
            placeholder="Логин"
            value={login}
            onChange={e => setLogin(e.target.value)}
            onBlur={async () => {
              setShow2FA(false);
              setToken("");
              if (!login) return;
              try {
                // Получаем пользователя по логину
                const resp = await fetch(`/api/profile?login=${encodeURIComponent(login)}`);
                const data = await resp.json();
                if (data.user && data.user.twoFactorToken) {
                  setShow2FA(true);
                } else {
                  setShow2FA(false);
                }
              } catch {}
            }}
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
                <input
                  type="text"
                  placeholder="2FA Токен"
                  value={token}
                  onChange={e => setToken(e.target.value)}
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
          )}
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

import { useState, useEffect } from "react";
import Link from "next/link";
import { getUser, clearUser } from "../lib/session";
import { useRouter } from "next/router";
import { FaComments, FaUser, FaSignOutAlt } from "react-icons/fa";
import styles from "../styles/Sidebar.module.css"; // создадим CSS для hover и анимаций

export default function Sidebar() {
  const router = useRouter();
  const [user, setUser] = useState(getUser());
  const [open, setOpen] = useState(false);
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  // SSR-safe isMobile detection
  const [isMobile, setIsMobile] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);
  useEffect(() => {
    setIsMobile(window.innerWidth <= 600);
    const checkMobile = () => setIsMobile(window.innerWidth <= 600);
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // --- Загрузка количества pending friend requests ---
  useEffect(() => {
    let mounted = true;

    const fetchPending = async () => {
      try {
        const res = await fetch("/api/friends/pending");
        const data = await res.json();
        if (mounted) setPendingCount(data.count || 0);
      } catch (err) {
        console.error(err);
      }
    };

    fetchPending();

    const handleVisibility = () => {
      const u = getUser();
      setUser(u);
      if (!u) setOpen(false); // скрыть сайдбар если пользователь вышел
    };
    window.addEventListener("focus", handleVisibility);
    window.addEventListener("visibilitychange", handleVisibility);

    return () => {
      mounted = false;
      window.removeEventListener("focus", handleVisibility);
      window.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  useEffect(() => {
    // Проверяем пользователя при монтировании
    const u = getUser();
    setUser(u);
    if (!u) setOpen(false);

    // Слушаем событие входа
    const handleLogin = () => {
      const u = getUser();
      setUser(u);
    };
    window.addEventListener("user-login", handleLogin);
    return () => {
      window.removeEventListener("user-login", handleLogin);
    };
  }, []);

  const logout = () => {
    clearUser();
    setUser(null);
    setOpen(false);
    router.push("/auth/login");
  };

  if (!user || !mounted) return null;

  return (
    <>
      <aside
        className={`${styles.sidebar} ${open ? styles.open : styles.closed}`}
        style={mounted && isMobile ? { width: open ? '80vw' : 0, minWidth: 0, maxWidth: '320px', zIndex: 1000 } : {}}
      >
        <div className={styles.logo}>
          <img
            src={open ? "/logo.svg" : "/logo2.svg"}
            alt="Logo"
            className={styles.logoImg}
          />
        </div>

        <nav className={styles.nav}>
          <SidebarLink href="/chat" icon={<FaComments />} text="Чат" open={open} />
          <SidebarLink
            href="/friends"
            icon={
              <span className={styles.iconWrapper}>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  width="18"
                  height="18"
                  fill="white"
                >
                  <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05C15.64 13.36 17 14.28 17 15.5V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z" />
                </svg>
                {pendingCount === null ? (
                  <span className={styles.pendingDotGrey} />
                ) : pendingCount > 0 ? (
                  <span className={styles.pendingDotRed} />
                ) : null}
              </span>
            }
            text="Друзья"
            open={open}
          />
          <SidebarLink href="/profile" icon={<FaUser />} text="Профиль" open={open} />
        </nav>

        <div className={styles.footer}>
          <button className={styles.logoutBtn} onClick={logout}>
            <FaSignOutAlt />
            {open && <span>Выход</span>}
          </button>
        </div>
      </aside>
      {/* Кнопка открытия/закрытия фиксирована вне сайдбара, всегда в левом верхнем углу */}
      <button
        aria-label={open ? "Close sidebar" : "Open sidebar"}
        className={styles.toggleBtn}
        onClick={() => setOpen(!open)}
        style={{
          position: 'fixed',
          left: 12,
          top: 18,
          zIndex: 1101,
          background: '#0f0f0f',
          borderRadius: 8,
          padding: 8,
          fontSize: 18,
          boxShadow: 'none',
          border: 'none',
          textDecoration: 'none',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'background 0.2s',
        }}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M6.83496 3.99992C6.38353 4.00411 6.01421 4.0122 5.69824 4.03801C5.31232 4.06954 5.03904 4.12266 4.82227 4.20012L4.62207 4.28606C4.18264 4.50996 3.81498 4.85035 3.55859 5.26848L3.45605 5.45207C3.33013 5.69922 3.25006 6.01354 3.20801 6.52824C3.16533 7.05065 3.16504 7.71885 3.16504 8.66301V11.3271C3.16504 12.2712 3.16533 12.9394 3.20801 13.4618C3.25006 13.9766 3.33013 14.2909 3.45605 14.538L3.55859 14.7216C3.81498 15.1397 4.18266 15.4801 4.62207 15.704L4.82227 15.79C5.03904 15.8674 5.31234 15.9205 5.69824 15.9521C6.01398 15.9779 6.383 15.986 6.83398 15.9902L6.83496 3.99992ZM18.165 11.3271C18.165 12.2493 18.1653 12.9811 18.1172 13.5702C18.0745 14.0924 17.9916 14.5472 17.8125 14.9648L17.7295 15.1415C17.394 15.8 16.8834 16.3511 16.2568 16.7353L15.9814 16.8896C15.5157 17.1268 15.0069 17.2285 14.4102 17.2773C13.821 17.3254 13.0893 17.3251 12.167 17.3251H7.83301C6.91071 17.3251 6.17898 17.3254 5.58984 17.2773C5.06757 17.2346 4.61294 17.1508 4.19531 16.9716L4.01855 16.8896C3.36014 16.5541 2.80898 16.0434 2.4248 15.4169L2.27051 15.1415C2.03328 14.6758 1.93158 14.167 1.88281 13.5702C1.83468 12.9811 1.83496 12.2493 1.83496 11.3271V8.66301C1.83496 7.74072 1.83468 7.00898 1.88281 6.41985C1.93157 5.82309 2.03329 5.31432 2.27051 4.84856L2.4248 4.57317C2.80898 3.94666 3.36012 3.436 4.01855 3.10051L4.19531 3.0175C4.61285 2.83843 5.06771 2.75548 5.58984 2.71281C6.17898 2.66468 6.91071 2.66496 7.83301 2.66496H12.167C13.0893 2.66496 13.821 2.66468 14.4102 2.71281C15.0069 2.76157 15.5157 2.86329 15.9814 3.10051L16.2568 3.25481C16.8833 3.63898 17.394 4.19012 17.7295 4.84856L17.8125 5.02531C17.9916 5.44285 18.0745 5.89771 18.1172 6.41985C18.1653 7.00898 18.165 7.74072 18.165 8.66301V11.3271ZM8.16406 15.995H12.167C13.1112 15.995 13.7794 15.9947 14.3018 15.9521C14.8164 15.91 15.1308 15.8299 15.3779 15.704L15.5615 15.6015C15.9797 15.3451 16.32 14.9774 16.5439 14.538L16.6299 14.3378C16.7074 14.121 16.7605 13.8478 16.792 13.4618C16.8347 12.9394 16.835 12.2712 16.835 11.3271V8.66301C16.835 7.71885 16.8347 7.05065 16.792 6.52824C16.7605 6.14232 16.7073 5.86904 16.6299 5.65227L16.5439 5.45207C16.32 5.01264 15.9796 4.64498 15.5615 4.3886L15.3779 4.28606C15.1308 4.16013 14.8165 4.08006 14.3018 4.03801C13.7794 3.99533 13.1112 3.99504 12.167 3.99504H8.16406C8.16407 3.99667 8.16504 3.99829 8.16504 3.99992L8.16406 15.995Z" fill="currentColor" />
        </svg>
      </button>
    </>
  );
}

function SidebarLink({ href, icon, text, open }: any) {
  return (
    <Link href={href} className={styles.link}>
      <div className={styles.linkContent}>
        <span className={styles.icon}>{icon}</span>
        {open && <span style={{ textDecoration: 'none', pointerEvents: 'none' }}>{text}</span>}
      </div>
    </Link>
  );
}
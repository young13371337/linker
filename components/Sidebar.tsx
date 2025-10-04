import { useState, useEffect } from "react";
import Link from "next/link";
import { getUser, clearUser } from "../lib/session";
import { useRouter } from "next/router";
import { FaComments, FaUser, FaSignOutAlt, FaRegEdit } from "react-icons/fa";
import styles from "../styles/Sidebar.module.css"; // создадим CSS для hover и анимаций

export default function Sidebar() {
  const router = useRouter();
  const [user, setUser] = useState(getUser()); // синхронно сразу есть пользователь
  const [open, setOpen] = useState(true);
  const [pendingCount, setPendingCount] = useState<number | null>(null);

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

    const handleVisibility = () => setUser(getUser());
    window.addEventListener("focus", handleVisibility);
    window.addEventListener("visibilitychange", handleVisibility);

    return () => {
      mounted = false;
      window.removeEventListener("focus", handleVisibility);
      window.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  const logout = () => {
    clearUser();
    setUser(null);
    router.push("/auth/login");
  };

  if (!user) return null;

  return (
    <>
      <button
        aria-label={open ? "Close sidebar" : "Open sidebar"}
        className={styles.toggleBtn}
        onClick={() => setOpen((v) => !v)}
      >
        {open ? "✕" : "☰"}
      </button>

      <aside
        className={`${styles.sidebar} ${open ? styles.open : styles.closed}`}
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
          <SidebarLink href="/wall" icon={<FaRegEdit />} text="Посты" open={open} />
          <SidebarLink href="/profile" icon={<FaUser />} text="Профиль" open={open} />
        </nav>

        <div className={styles.footer}>
          <button className={styles.logoutBtn} onClick={logout}>
            <FaSignOutAlt />
            {open && <span>Выйти</span>}
          </button>
        </div>
      </aside>
    </>
  );
}

function SidebarLink({ href, icon, text, open }: any) {
  return (
    <Link href={href} className={styles.link}>
      <div className={styles.linkContent}>
        <span className={styles.icon}>{icon}</span>
        {open && <span>{text}</span>}
      </div>
    </Link>
  );
}

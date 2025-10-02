
import { useState, useEffect } from "react";
import Link from "next/link";
import { getUser, clearUser } from "../lib/session";
import { useRouter } from "next/router";
import { FaComments, FaUser, FaSignOutAlt, FaRegEdit } from "react-icons/fa";

function showTempToast(msg = "Временно недоступно") {
  const id = "sidebar-temp-toast";
  let toast = document.getElementById(id);
  if (!toast) {
    toast = document.createElement("div");
    toast.id = id;
    toast.style.position = "fixed";
    toast.style.right = "32px";
    toast.style.bottom = "32px";
    toast.style.zIndex = "9999";
    toast.style.background = "#222d";
    toast.style.color = "#fff";
    toast.style.padding = "14px 28px";
    toast.style.borderRadius = "14px";
    toast.style.fontSize = "16px";
    toast.style.fontFamily = "Segoe UI, Verdana, Arial, sans-serif";
    toast.style.boxShadow = "0 4px 24px #0006";
    toast.style.transition = "opacity .3s";
    toast.style.opacity = "0";
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.opacity = "1";
  setTimeout(() => {
    if (toast) toast.style.opacity = "0";
  }, 1800);
}


export default function Sidebar() {
  const [open, setOpen] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const router = useRouter();
  useEffect(() => {
    // load initial user from localStorage
    setUser(getUser());

    // update user on route changes (login redirects) and when page becomes visible
    const handleRoute = () => setUser(getUser());
    const handleVisibility = () => setUser(getUser());

    router.events.on("routeChangeComplete", handleRoute);
    window.addEventListener("visibilitychange", handleVisibility);
    window.addEventListener("focus", handleVisibility);

    // fetch pending friend requests
    async function fetchPending() {
      try {
        const res = await fetch("/api/friends/pending");
        const data = await res.json();
        setPendingCount(data.count || 0);
      } catch {}
    }
    fetchPending();
    // refetch on focus
    window.addEventListener("focus", fetchPending);
    return () => {
      router.events.off("routeChangeComplete", handleRoute);
      window.removeEventListener("visibilitychange", handleVisibility);
      window.removeEventListener("focus", handleVisibility);
      window.removeEventListener("focus", fetchPending);
    };
  }, [router.events]);
  function logout() {
    clearUser();
    setUser(null);
    router.push("/auth/login");
  }

  // Sidebar only for authenticated users
  if (!user) return null;

  const width = open ? 260 : 0;
  const iconOnly = !open;

  return (
    <>
      <button
        aria-label={open ? "Close sidebar" : "Open sidebar"}
        onClick={() => setOpen((v) => !v)}
        style={{
          position: "fixed",
          top: 18,
          left: width + 8,
          zIndex: 1100,
          background: "#0f0f0f",
          color: "#fff",
          border: "none",
          borderRadius: 8,
          padding: 8,
          cursor: "pointer",
          boxShadow: "unset",
        }}
      >
        {open ? "✕" : "☰"}
      </button>

      <aside
        aria-label="Main sidebar"
        style={{
          position: "fixed",
          top: 0,
          left: 0,
          width,
          height: "100vh",
          background: "#000",
          color: "#fff",
          boxShadow: "2px 0 24px rgba(0,0,0,0.6)",
          transition: "width 320ms cubic-bezier(.2,.9,.2,1), opacity 320ms cubic-bezier(.2,.9,.2,1)",
          opacity: open ? 1 : 0.2,
          zIndex: 1000,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div style={{ padding: 0, borderBottom: "1px solid rgba(255,255,255,0.03)", display: 'flex', alignItems: 'center', gap: 0, justifyContent: 'center' }}>
          {iconOnly ? (
            <div style={{ width: '100%', height: 90, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', boxSizing: 'border-box', padding: 0 }}>
              <img
                src="/logo2.svg"
                alt="Logo"
                style={{
                  width: '48px',
                  height: '48px',
                  objectFit: 'contain',
                  objectPosition: 'center',
                  display: 'block',
                }}
              />
            </div>
          ) : (
            <div style={{ width: '100%', height: 90, background: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', boxSizing: 'border-box', padding: 0 }}>
              <img
                src="/logo.svg"
                alt="Logo"
                style={{
                  width: '220px',
                  height: '80px',
                  objectFit: 'contain',
                  objectPosition: 'center',
                  display: 'block',
                }}
              />
            </div>
          )}
        </div>

  <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, padding: '16px 12px' }}>
          <Link href="/chat" style={{ color: '#fff', textDecoration: 'none' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 10px',
              borderRadius: 14,
              transition: 'background .12s',
              cursor: 'pointer',
              fontFamily: 'Segoe UI, Verdana, Arial, sans-serif',
              fontWeight: 500,
              fontSize: 15,
            }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.13)'}
              onMouseOut={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ width: 22, textAlign: 'center', color: '#fff', fontSize: 18 }}><FaComments /></span>
              {!iconOnly && <span style={{ fontSize: 15, marginLeft: 2 }}>Чат</span>}
            </div>
          </Link>
          <Link href="/friends" style={{ color: '#fff', textDecoration: 'none' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 10px',
              borderRadius: 14,
              transition: 'background .12s',
              cursor: 'pointer',
              fontFamily: 'Segoe UI, Verdana, Arial, sans-serif',
              fontWeight: 500,
              fontSize: 15,
              position: 'relative',
            }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.13)'}
              onMouseOut={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ width: 22, textAlign: 'center', color: '#fff', fontSize: 18, position: 'relative' }}>
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="white"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5s-3 1.34-3 3 1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05C15.64 13.36 17 14.28 17 15.5V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
                {pendingCount > 0 && (
                  <span style={{
                    position: 'absolute',
                    top: -3,
                    right: -3,
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    background: '#e74c3c',
                    boxShadow: '0 0 6px #e74c3c',
                    border: '2px solid #fff',
                    zIndex: 2,
                  }} />
                )}
              </span>
              {!iconOnly && <span style={{ fontSize: 15, marginLeft: 2 }}>Друзья</span>}
            </div>
          </Link>
          <Link href="/wall" style={{ color: '#fff', textDecoration: 'none' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 10px',
              borderRadius: 14,
              transition: 'background .12s',
              cursor: 'pointer',
              fontFamily: 'Segoe UI, Verdana, Arial, sans-serif',
              fontWeight: 500,
              fontSize: 15,
            }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.13)'}
              onMouseOut={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ width: 22, textAlign: 'center', color: '#fff', fontSize: 18 }}>
                <FaRegEdit style={{ width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', verticalAlign: 'middle' }} />
              </span>
              {!iconOnly && <span style={{ fontSize: 15, marginLeft: 2 }}>Посты</span>}
            </div>
          </Link>
          <Link href="/profile" style={{ color: '#fff', textDecoration: 'none' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              padding: '8px 10px',
              borderRadius: 14,
              transition: 'background .12s',
              cursor: 'pointer',
              fontFamily: 'Segoe UI, Verdana, Arial, sans-serif',
              fontWeight: 500,
              fontSize: 15,
            }}
              onMouseOver={e => e.currentTarget.style.background = 'rgba(255,255,255,0.13)'}
              onMouseOut={e => e.currentTarget.style.background = 'transparent'}
            >
              <span style={{ width: 22, textAlign: 'center', color: '#fff', fontSize: 18 }}><FaUser /></span>
              {!iconOnly && <span style={{ fontSize: 15, marginLeft: 2 }}>Профиль</span>}
            </div>
          </Link>

        </nav>
        <div style={{ padding: 18, borderTop: "1px solid rgba(255,255,255,0.04)" }}>
          <button
            onClick={logout}
            style={{
              background: "#000",
              color: "#fff",
              border: "none",
              borderRadius: 8,
              padding: "8px 16px",
              cursor: "pointer",
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 10,
              fontSize: 16,
              transition: "background .15s, color .15s"
            }}
            onMouseOver={e => {
              e.currentTarget.style.background = '#e74c3c';
              e.currentTarget.style.color = '#fff';
            }}
            onMouseOut={e => {
              e.currentTarget.style.background = '#000';
              e.currentTarget.style.color = '#fff';
            }}
          >
            <FaSignOutAlt style={{ fontSize: 18, color: '#fff' }} />
            {!iconOnly && <span>Выйти</span>}
          </button>
        </div>
      </aside>
    </>
  );
}

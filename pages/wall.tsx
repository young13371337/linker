import { useSession, signIn } from "next-auth/react";
import React from "react";

export default function WallPage() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div style={{ color: '#fff', padding: 40 }}>Загрузка...</div>;
  }

  if (!session) {
    return (
      <div style={{ color: '#fff', padding: 40 }}>
        <h2>Только для авторизованных пользователей</h2>
        <button onClick={() => signIn()} style={{ background: '#1ed760', color: '#fff', border: 'none', borderRadius: 8, padding: '10px 24px', fontSize: 17, fontWeight: 600, cursor: 'pointer', marginTop: 18 }}>Войти</button>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 700, margin: '40px auto', padding: 32, borderRadius: 18, boxShadow: '0 2px 24px #0006', color: '#fff', fontFamily: 'Segoe UI, Verdana, Arial, sans-serif', background: '#23242a' }}>
      <h1 style={{ fontSize: 28, fontWeight: 700, marginBottom: 24 }}>Посты</h1>
      {/* Здесь будет список постов и форма создания */}
      <div style={{ color: '#bbb', fontSize: 18 }}>Посты скоро появятся!</div>
    </div>
  );
}

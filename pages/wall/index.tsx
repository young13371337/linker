import { useEffect, useState } from "react";
import Image from "next/image";
import { FaRegEdit, FaTimes } from "react-icons/fa";
import { useSession, signIn } from "next-auth/react";

export default function WallPage() {
  const { data: session, status } = useSession();
  const [posts, setPosts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [photoUrl, setPhotoUrl] = useState("");

  useEffect(() => {
    fetch("/api/posts" + (session?.user?.id ? `?userId=${session.user.id}` : ""))
      .then(r => r.json())
      .then(data => {
        setPosts(data.posts || []);
        setLoading(false);
      })
      .catch(() => {
        setPosts([]);
        setLoading(false);
      });
  }, [submitting, session]);

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
  <div style={{ maxWidth: 600, margin: "10px auto 0 auto", padding: 32 }}>
  <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", marginBottom: 24, marginTop: 0 }}>
        <button
          style={{ background: '#229ed9', color: '#fff', border: 'none', borderRadius: 14, padding: '8px 22px', fontWeight: 500, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          onClick={() => setShowForm(v => !v)}
        >
          <FaRegEdit style={{ fontSize: 22 }} />
        </button>
      </div>
      {showForm && (
        <form
          onSubmit={async e => {
            e.preventDefault();
            if (!title.trim() || !description.trim()) return;
            setSubmitting(true);
            await fetch("/api/posts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId: session.user.id, title, description, photoUrl })
            });
            setTitle("");
            setDescription("");
            setShowForm(false);
            setSubmitting(false);
          }}
          style={{
            marginBottom: 24,
            background: '#23242a',
            borderRadius: 10,
            padding: '18px 18px 14px 18px',
            boxShadow: 'none',
            border: '1px solid #222',
            transition: 'box-shadow .18s',
          }}
        >
          <div style={{ marginBottom: 10 }}>
            <input
              type="text"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="Заголовок поста"
              style={{
                width: '100%',
                padding: '6px 10px',
                fontSize: 16,
                borderRadius: 6,
                border: '1px solid #333',
                marginBottom: 8,
                background: '#18191c',
                color: '#fff',
                fontWeight: 500,
                outline: 'none',
                boxShadow: 'none',
                transition: 'border .18s',
              }}
              maxLength={64}
              required
              onFocus={e => e.currentTarget.style.border = '1.5px solid #229ed9'}
              onBlur={e => e.currentTarget.style.border = '1px solid #333'}
            />
            <input
              type="text"
              value={photoUrl}
              onChange={e => setPhotoUrl(e.target.value)}
              placeholder="URL картинки (необязательно)"
              style={{
                width: '100%',
                padding: '6px 10px',
                fontSize: 15,
                borderRadius: 6,
                border: '1px solid #333',
                marginBottom: 8,
                background: '#18191c',
                color: '#fff',
                fontWeight: 400,
                outline: 'none',
                boxShadow: 'none',
                transition: 'border .18s',
              }}
              maxLength={256}
              onFocus={e => e.currentTarget.style.border = '1.5px solid #229ed9'}
              onBlur={e => e.currentTarget.style.border = '1px solid #333'}
            />
            <textarea
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Описание поста"
              style={{
                width: '100%',
                padding: '8px 12px',
                fontSize: 15,
                borderRadius: 6,
                border: '1px solid #333',
               minHeight: 48,
                background: '#18191c',
                color: '#fff',
                fontWeight: 400,
                outline: 'none',
                boxShadow: 'none',
                transition: 'border .18s',
              }}
              maxLength={512}
              required
              onFocus={e => e.currentTarget.style.border = '1.5px solid #229ed9'}
              onBlur={e => e.currentTarget.style.border = '1px solid #333'}
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            style={{
              background: submitting ? '#229ed988' : '#229ed9',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '8px 18px',
              fontWeight: 600,
              fontSize: 15,
              cursor: submitting ? 'not-allowed' : 'pointer',
              boxShadow: 'none',
              transition: 'background .18s',
            }}
          >
            {submitting ? 'Публикуем...' : 'Опубликовать'}
          </button>
        </form>
      )}
      {loading ? (
        <div style={{ color: '#bbb', textAlign: 'center', marginTop: 40 }}>Загрузка...</div>
      ) : posts.length === 0 ? (
        <div style={{ color: '#bbb', textAlign: 'center', marginTop: 120, fontSize: 20, fontWeight: 500 }}>
          Похоже, постов нет
        </div>
      ) : (
        <div>
          {posts.map(post => (
            <div key={post.id} style={{ marginBottom: 28, padding: 18, borderRadius: 14, background: '#23242a', color: '#fff', boxShadow: 'none', position: 'relative' }}>
              <div style={{ fontSize: 18, fontWeight: 600 }}>{post.title}</div>
              {post.photoUrl && (
                <div style={{ margin: '12px 0' }}>
                  <img src={post.photoUrl} alt="post" style={{ maxWidth: '100%', maxHeight: 320, borderRadius: 10, border: '1px solid #222', objectFit: 'cover', background: '#18191c' }} />
                </div>
              )}
              <div style={{ fontSize: 15, marginTop: 6 }}>{post.description}</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: '#bbb', marginTop: 8 }}>
                <a
                  href={session?.user?.id === post.author?.id ? '/profile' : `/profile/${post.author?.id}`}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', color: 'inherit', cursor: 'pointer' }}
                  title={session?.user?.id === post.author?.id ? 'Мой профиль' : `Профиль пользователя ${post.author?.login}`}
                >
                  {post.author?.avatar ? (
                    <img src={post.author.avatar} alt="avatar" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover', border: '1px solid #333' }} />
                  ) : (
                    <div style={{ width: 28, height: 28, borderRadius: '50%', background: '#444', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, color: '#fff' }}>
                      {post.author?.login?.[0]?.toUpperCase() || '?'}
                    </div>
                  )}
                  <span style={{ fontWeight: 500 }}>{post.author?.login || 'user'}</span>
                </a>
                {post.author?.role && post.author.role !== 'user' && (
                  <Image
                    src={`/role-icons/${post.author.role}.svg`}
                    alt={post.author.role}
                    width={22}
                    height={22}
                    style={{ marginLeft: 4, verticalAlign: 'middle' }}
                  />
                )}
              </div>
              {session?.user?.id === post.author?.id && (
                <button
                  style={{ position: 'absolute', top: 12, right: 12, background: 'none', color: '#e74c3c', border: 'none', borderRadius: 0, width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: 0 }}
                  title="Удалить пост"
                  onClick={async () => {
                    if (!window.confirm('Удалить этот пост?')) return;
                    const res = await fetch(`/api/posts?id=${post.id}`, {
                      method: 'DELETE',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ userId: session.user.id })
                    });
                    if (res.ok) {
                      setPosts(posts.filter(p => p.id !== post.id));
                    }
                  }}
                >
                  <FaTimes style={{ fontSize: 22, color: '#e74c3c' }} />
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

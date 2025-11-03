import React, { useState } from 'react';
import UserStatus from './UserStatus';
import { useSession } from 'next-auth/react';

const FriendSearch: React.FC = () => {
  const { data: session } = useSession();
  const [toast, setToast] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  type UserResult = {
  id: string;
  login: string;
  link?: string | null;
  avatar?: string;
  role?: string;
  isFriend?: boolean;
  requestSent?: boolean;
  status?: import('./UserStatus').UserStatusType;
  };
  const [results, setResults] = useState<UserResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    setError('');
  const userIdParam = session?.user ? `&userId=${encodeURIComponent((session.user as any).id)}` : '';
  fetch(`/api/friends/search?link=${encodeURIComponent(query)}${userIdParam}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) setError(data.error);
        else setResults(data.users || []);
      })
      .catch(() => setError('Ошибка поиска'))
      .finally(() => setLoading(false));
  }, [query]);

  return (
  <div style={{ background: '#1e2124', borderRadius: 14, padding: 14, boxShadow: '0 8px 30px rgba(0,0,0,0.55)', maxWidth: 420, margin: '24px auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(79,195,247,0.12)', borderRadius: 10 }}>
          <svg width={20} height={20} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="11" cy="11" r="8" stroke="#4fc3f7" strokeWidth="1.6" />
            <line x1="17" y1="17" x2="22" y2="22" stroke="#4fc3f7" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
        </div>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Поиск по линку или имени"
          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: '#e6eef8', fontSize: 16, fontWeight: 600, padding: '8px 6px' }}
          aria-label="Поиск друзей"
        />
        <button onClick={() => setQuery('')} style={{ background: 'transparent', border: '1px solid rgba(255,255,255,0.04)', color: '#bfc9cf', padding: '8px 10px', borderRadius: 10, cursor: 'pointer' }}>Очистить</button>
      </div>
      {loading && <div style={{ color: '#9fbfe6', marginTop: 10 }}>Поиск...</div>}
      {error && <div style={{ color: '#e34f4f', marginTop: 10 }}>{error}</div>}
      {results.length > 0 && (
        <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {results.map(user => (
            <div key={user.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: 10, borderRadius: 10, background: 'rgba(20,22,26,0.6)' }}>
              <img src={user.avatar || 'https://www.svgrepo.com/show/452030/avatar-default.svg'} alt="avatar" style={{ width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', boxShadow: '0 6px 18px rgba(2,6,23,0.6)' }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#e6eef8', fontWeight: 700 }}>{user.link ? `@${user.link}` : user.login}</span>
                  {user.status && <UserStatus status={user.status} size={12} />}
                </div>
                <div style={{ color: '#9fbfe6', fontSize: 13 }}>{user.role || 'user'}</div>
              </div>
              <div>
                {user.isFriend ? (
                  <div style={{ color: '#bfc9cf', padding: '8px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.02)' }}>Уже друг</div>
                ) : user.requestSent ? (
                  <div style={{ color: '#bfc9cf', padding: '8px 12px', borderRadius: 10, background: 'rgba(255,255,255,0.02)' }}>Заявка отправлена</div>
                ) : (
                  <button
                    title="Добавить"
                    style={{ background: '#4fc3f7', color: '#06121a', borderRadius: 10, padding: '8px 12px', border: 'none', cursor: 'pointer', fontWeight: 700 }}
                    onClick={async () => {
                      try {
                        const res = await fetch('/api/friends/request', {
                          method: 'POST',
                          credentials: 'include',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ friendId: user.id })
                        });
                        if (res.ok) {
                          setToast('Заявка отправлена');
                          setResults(prev => prev.map(r => r.id === user.id ? { ...r, requestSent: true } : r));
                        } else {
                          const data = await res.json().catch(() => ({}));
                          setToast(data?.error || 'Ошибка при отправке заявки');
                        }
                      } catch (err) {
                        setToast('Ошибка при отправке заявки');
                      }
                      setTimeout(() => setToast(null), 2500);
                    }}
                  >Добавить</button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
      {toast && (
        <div style={{ position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)', background: '#4fc3f7', color: '#06121a', padding: '10px 20px', borderRadius: 12, fontSize: 15, fontWeight: 700, boxShadow: '0 6px 22px rgba(2,6,23,0.6)', zIndex: 9999 }}>
          {toast}
        </div>
      )}
    </div>
  );
};

export default FriendSearch;

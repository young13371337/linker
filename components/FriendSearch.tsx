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
    fetch(`/api/friends/search?login=${encodeURIComponent(query)}${userIdParam}`)
      .then(res => res.json())
      .then(data => {
        if (data.error) setError(data.error);
        else setResults(data.users || []);
      })
      .catch(() => setError('Ошибка поиска'))
      .finally(() => setLoading(false));
  }, [query]);

  return (
    <div style={{
      background: '#23243a', borderRadius: 14, padding: '10px 18px', boxShadow: '0 2px 8px #2222', maxWidth: 340, margin: '24px auto'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28 }}>
          <svg width={22} height={22} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <circle cx="11" cy="11" r="8" stroke="#229ed9" strokeWidth="2" />
            <line x1="17" y1="17" x2="22" y2="22" stroke="#229ed9" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </span>
        <input
          type="text"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Поиск..."
          style={{
            flex: 1,
            background: 'none',
            border: 'none',
            outline: 'none',
            color: '#e3e8f0',
            fontSize: 17,
            fontWeight: 500,
            padding: '4px 0',
          }}
          aria-label="Поиск друзей"
        />
      </div>
      {loading && <div style={{ color: '#229ed9', marginTop: 10 }}>Поиск...</div>}
      {error && <div style={{ color: '#e34f4f', marginTop: 10 }}>{error}</div>}
      {results.length > 0 && (
        <div style={{ marginTop: 14 }}>
          {results.map(user => (
            <div key={user.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px 0', borderBottom: '1px solid #2a2b3d' }}>
              <img src={user.avatar || 'https://www.svgrepo.com/show/452030/avatar-default.svg'} alt="avatar" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', background: '#222' }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ color: '#e3e8f0', fontWeight: 500 }}>{user.login}</span>
                  {user.status && <UserStatus status={user.status} size={12} />}
                </div>
                <div style={{ color: '#229ed9', fontSize: 13 }}>{user.role || 'user'}</div>
              </div>
              {user.isFriend ? (
                <span style={{ color: '#aaa', fontSize: 13 }}>Уже друг</span>
              ) : user.requestSent ? (
                <span style={{ color: '#bbb', fontSize: 13 }}>Заявка отправлена</span>
              ) : (
                <span
                  title="Добавить"
                  style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: '#1aff1a', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer' }}
                  onClick={async () => {
                    // Send friend request to API; server will infer current user from session cookies
                    try {
                      const res = await fetch('/api/friends/request', {
                        method: 'POST',
                        credentials: 'include',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ friendId: user.id })
                      });
                      if (res.ok) {
                        setToast('Заявка отправлена');
                        // mark locally as sent
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
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="none"><rect x="9" y="3" width="2" height="12" rx="1" fill="#1aff1a" stroke="#0f0" strokeWidth="2"/><rect x="8" y="15" width="4" height="2" rx="1" fill="#222"/></svg>
                </span>
              )}
      {toast && (
        <div style={{ position: 'fixed', top: 32, left: '50%', transform: 'translateX(-50%)', background: '#1aff1a', color: '#222', padding: '10px 28px', borderRadius: 12, fontSize: 17, fontWeight: 600, boxShadow: '0 2px 16px #0006', zIndex: 9999 }}>
          {toast}
        </div>
      )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default FriendSearch;

import React, { useState, useEffect, useRef } from 'react';
// Sidebar is rendered globally from _app.tsx - don't render it again in the page
// import Sidebar from '../components/Sidebar';
import ToastNotification from '../components/ToastNotification';

export default function PostsPage() {
  const [previewImg, setPreviewImg] = useState<{ src: string; mime?: string } | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  // full content removed: only description is used
  const [creating, setCreating] = useState(false);
  const [toast, setToast] = useState<{ type: 'success'|'error'; message: string } | null>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [openCreate, setOpenCreate] = useState(false);
    const titleRef = useRef<HTMLInputElement | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);

  // Close modal on Escape key press
  useEffect(() => {
    if (!openCreate) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenCreate(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openCreate]);

  // clear input fields when modal closes
  useEffect(() => {
    if (!openCreate) {
      setTitle(''); setDescription(''); setFile(null);
    }
  }, [openCreate]);

  useEffect(() => {
    if (openCreate) {
      setTimeout(() => titleRef.current?.focus(), 50);
    }
  }, [openCreate]);

  // Prevent page scroll while modal open using robust method (fixed positioning + restore scroll)
  useEffect(() => {
    let originalOverflow = document.body.style.overflow || '';
    let originalPaddingRight = document.body.style.paddingRight || '';
    let originalPosition = document.body.style.position || '';
    let originalTop = document.body.style.top || '';
    let scrollY = 0;
    if (openCreate) {
      scrollY = window.scrollY || window.pageYOffset || 0;
      const scrollBarWidth = window.innerWidth - document.documentElement.clientWidth;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.overflow = 'hidden';
      if (scrollBarWidth > 0) document.body.style.paddingRight = `${scrollBarWidth}px`;
      try { document.documentElement.style.overflow = 'hidden'; document.documentElement.style.touchAction = 'none'; } catch (e) {}
    }
    return () => {
      // Restore original document styles and jump back to previous scroll position
      document.body.style.position = originalPosition;
      document.body.style.top = originalTop;
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.overflow = originalOverflow;
      try { document.documentElement.style.overflow = ''; document.documentElement.style.touchAction = ''; } catch (e) {}
      document.body.style.paddingRight = originalPaddingRight;
      try { if (typeof window !== 'undefined') window.scrollTo(0, scrollY); } catch (e) {}
    };
  }, [openCreate]);

  // Add a body class to handle page-level styles while modal open
  useEffect(() => {
    if (openCreate) document.body.classList.add('modal-open');
    else document.body.classList.remove('modal-open');
    return () => document.body.classList.remove('modal-open');
  }, [openCreate]);

  useEffect(() => { fetchPosts(); }, []);

  async function fetchPosts(){
    const r = await fetch('/api/posts', { credentials: 'include' });
    if (r.ok) {
      const j = await r.json().catch(()=>({posts:[]}));
      console.log('[CLIENT:/posts] fetched posts response=', j);
      setPosts(j.posts || []);
      if ((!j.posts || j.posts.length === 0)) {
        try {
          // fallback to the simple SQL-based endpoint to handle production schema mismatches
          const rf = await fetch('/api/posts/simple');
          if (rf.ok) {
            const jf = await rf.json().catch(()=>({posts:[]}));
            console.log('[CLIENT:/posts] simple posts fallback response=', jf);
            setPosts(jf.posts || []);
          }
        } catch (e) {}
      }
    }
  }

  async function handleUploadAndCreate(){
    setCreating(true);
    try {
      let mediaId: string | undefined = undefined;
      if (file) {
        console.log('[CLIENT:/posts] Creating post with inline file', { title, description, fileName: file.name, fileSize: file.size });
        // Attach file directly to posts/create (server will accept multipart and store bytes in Post)
        // Upload the file via /api/media/upload first (more robust, avoids inline storage)
        const uploadFd = new FormData();
        uploadFd.append('file', file, file.name);
        uploadFd.append('ownerId', '');
        const uploadRes = await fetch('/api/media/upload', { method: 'POST', body: uploadFd, credentials: 'include' });
        const uploadJson = await uploadRes.json().catch(() => null);
        if (!uploadRes.ok) {
          setToast({ type: 'error', message: (uploadJson && uploadJson.error) || 'Failed to upload media' });
          setCreating(false);
          return;
        }
        const mediaId = uploadJson?.mediaId;
        const createRes = await fetch('/api/posts/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, description, mediaId }), credentials: 'include' });
        const createJson = await createRes.json().catch(() => null);
        console.log('[CLIENT:/posts] create response', { status: createRes.status, json: createJson });
        if (!createRes.ok) {
          const er = createJson || { error: 'failed' };
          setToast({ type: 'error', message: er.error || 'Failed to create post' });
          setCreating(false);
          return;
        }
        setToast({ type: 'success', message: 'Пост опубликован' });
        setFile(null);
        setTitle(''); setDescription(''); setOpenCreate(false);
        await fetchPosts();
        return;
      }

      const createRes = await fetch('/api/posts/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ title, description, mediaId }), credentials: 'include' });
      if (!createRes.ok) {
        const er = await createRes.json().catch(()=>({error:'failed'}));
        setToast({ type: 'error', message: er.error || 'Failed to create post' });
        setCreating(false);
        return;
      }
      setToast({ type: 'success', message: 'Пост опубликован' });
      setFile(null);
      setTitle(''); setDescription(''); setOpenCreate(false);
      await fetchPosts();
    } catch (e: any) {
      console.error('create post error', e);
      setToast({ type: 'error', message: e?.message || 'Ошибка' });
    } finally { setCreating(false); }
  }

  return (
    <div style={{ display: 'flex' }}>
      {/* Sidebar is rendered by _app.tsx, so we don't render it here to avoid duplication */}
      <div style={{ padding: 24, width: '100%', position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h2 style={{ color: '#fff' }}>Посты</h2>

        {/* Floating create button top-right */}
        <button
          onClick={() => setOpenCreate(s => !s)}
          title="Создать пост"
          className="floatingCreate"
        >
          {openCreate ? '✕' : '+'}
        </button>

        {openCreate && (
          <div className="modalBackdrop" onClick={() => setOpenCreate(false)}>
            <div className="modalDialog" role="dialog" aria-modal="true" onClick={e => e.stopPropagation()}>
              <div className="modalHeader">
                <div style={{ fontWeight: 700, color: '#fff', fontSize: 18 }}>Создать пост</div>
                <button className="closeBtn" onClick={() => setOpenCreate(false)} aria-label="Закрыть">✕</button>
              </div>
              <form className="postForm" onSubmit={(e)=>{ e.preventDefault(); void handleUploadAndCreate(); }}>
                <input ref={titleRef} className="input title" placeholder="Заголовок" value={title} onChange={e=>setTitle(e.target.value)} />
                <input className="input desc" placeholder="Краткое описание" value={description} onChange={e=>setDescription(e.target.value)} />
                {/* Full content removed: only description is used */}
                <div className="row">
                  <label className="fileBtn" title="Прикрепить файл" aria-label="Прикрепить файл" tabIndex={0} onKeyDown={(e)=>{ if (e.key === 'Enter' || e.key === ' ') { const input = (e.currentTarget as HTMLElement).querySelector('input[type="file"]') as HTMLElement | null; input?.click(); } }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden focusable="false">
                      <path d="M21 12.5V6.5a4.5 4.5 0 0 0-9 0v6a3.5 3.5 0 0 0 7 0V7" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                      <path d="M7 12.5v6a4.5 4.5 0 0 0 9 0v-6" stroke="#fff" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    <input className="fileInputHidden" type="file" accept="image/*" onChange={e=>setFile(e.target.files ? e.target.files[0] : null)} />
                  </label>
                  <button type="submit" className="publishBtn" disabled={creating} aria-label="Поделиться">
                    {creating ? (
                      <svg className="spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden>
                        <circle cx="12" cy="12" r="9" stroke="#cfe9f7" strokeOpacity="0.18" strokeWidth="2" />
                        <path d="M4 12a8 8 0 0 0 16 0" stroke="#cfe9f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" transform="rotate(45 12 12)"/>
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden focusable="false">
                        <path d="M7 17L17 7" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        <path d="M7 7h10v10" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </button>
                </div>
                {file && <div className="fileName">Выбран: {file.name}</div>}
              </form>
            </div>
          </div>
        )}

        <div style={{ marginTop: 28, width: '100%', display: 'flex', justifyContent: 'center' }}>
          <div style={{ width: '100%', maxWidth: 920 }}>
            {posts.map(p=> (
              <div key={p.id} className="postCard" role="article">

                <div className="postHeader">
                <div className="authorWrap" onClick={()=> window.location.href = `/profile/${p.author?.id}`}>
                  {p.author?.avatar ? <img src={p.author.avatar} className="postAvatar" /> : <div className="postAvatarFallback">{p.author?.login?.[0] || 'U'}</div>}
                  <div className="authorCol">
                    <div className="authorName">{p.author?.link ? `@${p.author.link}` : (p.author?.login || 'User')}</div>
                    <div className="authorMeta">{new Date(p.createdAt).toLocaleString()}</div>
                  </div>
                </div>
                {p.isOwner && (
                  <div className="ownerMenuWrap">
                    <button className="dotBtn" onClick={()=> setMenuOpenId(menuOpenId === p.id ? null : p.id)} aria-label="Меню поста">⋯</button>
                    {menuOpenId === p.id && (
                      <div className="dotMenu">
                        <button className="dotMenuItem" onClick={async()=>{
                          if (!confirm('Удалить пост?')) return;
                          try {
                            const r = await fetch(`/api/posts/${p.id}`, { method: 'DELETE', credentials: 'include' });
                            const bodyText = await r.text().catch(() => null);
                            let j = null; try { j = bodyText ? JSON.parse(bodyText) : null; } catch(e){ j=null; }
                            if (!r.ok) {
                              const errMsg = j?.error || j?.detail || bodyText || 'Ошибка удаления';
                              setMenuOpenId(null);
                              setToast({ type: 'error', message: errMsg });
                              return;
                            }
                            setMenuOpenId(null);
                                // optimistic removal
                                const prev = posts.map(x => ({ ...x }));
                                setPosts(ps => ps.filter(x => x.id !== p.id));
                                try {
                                  const json = j || null;
                                  if (!json) {
                                    await fetchPosts();
                                  }
                                  setToast({ type: 'success', message: 'Пост удален' });
                                } catch (e) {
                                  setPosts(prev);
                                  throw e;
                                }
                          } catch (e: any) {
                            console.error('delete post error', e);
                            setToast({ type: 'error', message: e?.message || 'Ошибка удаления' });
                          }
                        }}>Удалить</button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {p.title ? <div className="postTitle">{p.title}</div> : <div className="postTitle" style={{ color:'#9fb0bf', fontWeight:600 }}>Без заголовка</div>}
                {p.description ? <div className="postDescription">{p.description}</div> : <div className="postDescription" style={{ color:'#9fb0bf' }}>Без описания</div>}
              {(p.imageMime || p.imageSize) ? (
                <div className="mediaWrap">
                  <img
                    src={`/api/posts/${p.id}/image`}
                    className="postImage"
                    width={p.imageWidth || undefined}
                    height={p.imageHeight || undefined}
                    style={{ aspectRatio: p.imageWidth && p.imageHeight ? `${p.imageWidth}/${p.imageHeight}` : undefined }}
                    onError={async (e) => {
                      const el = e.currentTarget as HTMLImageElement;
                      const url = el.src;
                      try {
                        const head = await fetch(url, { method: 'HEAD', credentials: 'include' });
                        console.warn('[CLIENT:/posts] Image HEAD failed or error', { url, status: head.status, headers: Object.fromEntries(head.headers.entries()) });
                      } catch (err) {
                        console.warn('[CLIENT:/posts] Image onError HEAD fetch failed', { url, err });
                      }
                      el.src = '/lost-image.png';
                    }}
                    onClick={() => setPreviewImg({ src: `/api/posts/${p.id}/image`, mime: p.imageMime || undefined })}
                    alt={p.title || 'image'}
                  />
                </div>
              ) : (p.media && p.media.id && (
                <div className="mediaWrap">
                  <img
                    src={`/api/media/${p.media.id}`}
                    className="postImage"
                    width={p.media?.width || undefined}
                    height={p.media?.height || undefined}
                    style={{ aspectRatio: p.media?.width && p.media?.height ? `${p.media.width}/${p.media.height}` : undefined }}
                    onError={async (e) => {
                      const el = e.currentTarget as HTMLImageElement;
                      const url = el.src;
                      try {
                        const head = await fetch(url, { method: 'HEAD', credentials: 'include' });
                        console.warn('[CLIENT:/posts] Media image HEAD failed or error', { url, status: head.status, headers: Object.fromEntries(head.headers.entries()) });
                      } catch (err) {
                        console.warn('[CLIENT:/posts] Media image onError HEAD fetch failed', { url, err });
                      }
                      el.src = '/lost-image.png';
                    }}
                    onClick={() => setPreviewImg({ src: `/api/media/${p.media.id}`, mime: p.media?.mime })}
                    alt={p.title || 'image'}
                  />
                </div>
              ))}

              {/* Controls row below content: like button and timestamp */}
                <div className="controlsRow">
                <div>
                  <button aria-pressed={p.likedByCurrentUser} className={`likeBtn ${p.likedByCurrentUser ? 'liked' : ''}`} onClick={async()=>{
                    // Optimistic update: toggle state immediately
                    const previous = posts.map(x => ({ ...x }));
                    setPosts(ps => ps.map(x => x.id === p.id ? { ...x, likedByCurrentUser: !x.likedByCurrentUser, likesCount: (x.likesCount || 0) + (x.likedByCurrentUser ? -1 : 1) } : x));
                    try {
                      if (p.likedByCurrentUser) {
                        const r = await fetch(`/api/posts/${p.id}/like`, { method: 'DELETE', credentials: 'include' });
                        if (!r.ok) {
                          const er = await r.json().catch(() => null);
                          const errMsg = er?.error || `Ошибка: ${r.status}`;
                          if (r.status === 401) setToast({ type: 'error', message: 'Пожалуйста, войдите в систему' });
                          else setToast({ type: 'error', message: errMsg });
                          // revert optimistic update and stop
                          setPosts(previous);
                          return;
                        }
                        // update post with returned counts if provided
                        const json = await r.json().catch(() => null);
                        if (json) {
                          setPosts(ps => ps.map(x => x.id === p.id ? { ...x, likesCount: json.likesCount ?? x.likesCount, likedByCurrentUser: json.likedByCurrentUser ?? false } : x));
                        }
                      } else {
                        const r = await fetch(`/api/posts/${p.id}/like`, { method: 'POST', credentials: 'include' });
                        if (!r.ok) {
                          const er = await r.json().catch(() => null);
                          const errMsg = er?.error || `Ошибка: ${r.status}`;
                          if (r.status === 401) setToast({ type: 'error', message: 'Пожалуйста, войдите в систему' });
                          else setToast({ type: 'error', message: errMsg });
                          // revert optimistic update and stop
                          setPosts(previous);
                          return;
                        }
                        const json = await r.json().catch(() => null);
                        if (json) {
                          setPosts(ps => ps.map(x => x.id === p.id ? { ...x, likesCount: json.likesCount ?? x.likesCount, likedByCurrentUser: json.likedByCurrentUser ?? true } : x));
                        }
                      }
                    } catch (e: any) {
                      console.error('like toggle error', e);
                      setToast({ type: 'error', message: e?.message || 'Ошибка' });
                      // revert optimistic update on error
                      setPosts(previous);
                    }
                  }}>
                    <span className="heart">{p.likedByCurrentUser ? '♥' : '♡'}</span>
                    <span className="likeCount">{p.likesCount || 0}</span>
                  </button>
                </div>

                <div className="timestamp">{new Date(p.createdAt).toLocaleString()}</div>
              </div>

              </div>
            ))}
          </div>
        </div>
      
      <style jsx>{`
        .createWrap{ width:100%; display:flex; justify-content:center; margin-top:8px }
        .modalBackdrop{ position:fixed; inset:0; background: rgba(3,6,7,0.6); display:flex; align-items:center; justify-content:center; z-index: 1200 }
        .modalDialog{ width: 520px; max-width: calc(100% - 40px); background:#0f1216; border-radius:12px; padding:18px; border: none; overflow: hidden; box-shadow: 0 12px 40px rgba(0,0,0,0.7); max-height: calc(100vh - 80px); align-self:center; margin:auto }
        .modalHeader{ display:flex; align-items:center; justify-content:space-between; margin-bottom:12px }
        .closeBtn{ background:transparent; border: none; color:#9fb0bf; font-size:18px; cursor:pointer }
        .postForm{
          background:#0f1214; padding:20px; border-radius:10px; max-width:920px; width:100%; box-shadow: none; box-sizing: border-box; overflow: hidden; margin: 0;
        }
        .fileBtn{ display:inline-flex; align-items:center; justify-content:center; width:48px; height:48px; border-radius:50%; background: linear-gradient(180deg,#161819,#1f2326); border:1px solid rgba(255,255,255,0.04); color:#fff; cursor:pointer; transition: transform .12s ease, box-shadow .12s ease }
        .fileBtn svg{ opacity: 0.95; display:block }
        .fileBtnText{ display:none }
        .postTitle{ font-weight:800; color:#fff; margin-top:10px; font-size:16px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis }
        .fileBtn:hover{ transform: translateY(-2px); box-shadow: 0 6px 16px rgba(0,0,0,0.5) }
        .fileBtn:focus{ outline:none; box-shadow: 0 0 0 4px rgba(79,195,247,0.08) }
        .publishBtn:hover{ transform: translateY(-3px); box-shadow: 0 14px 36px rgba(34,160,220,0.25) }
        .publishBtn:focus{ outline:none; box-shadow: 0 0 0 6px rgba(79,195,247,0.08) }
        .modalDialog .postForm{ overflow-y: auto; }
        .input{ width:100%; padding:12px 14px; border-radius:10px; border:1px solid #222; background:#0b0d0e; color:#fff; margin-top:10px; outline:none }
        .input.title{ font-size:18px; font-weight:700 }
        .input.desc{ font-size:14px; color:#ddd }
        .textarea{ width:100%; min-height:160px; margin-top:10px; padding:12px; border-radius:10px; border:1px solid #222; background:#0b0d0e; color:#fff; resize:vertical; outline:none }
        .row{ display:flex; gap:12px; align-items:center; margin-top:12px }
        /* legacy fileBtn: removed */
        .input:focus, .textarea:focus { outline: none; box-shadow: 0 0 0 4px rgba(34,158,217,0.06); }
        .input{box-sizing: border-box}
        .fileInputHidden{ display:none }
        .publishBtn{ background: linear-gradient(90deg,#23a8e3,#1fb6ff); color:#fff; padding:0; width:50px; height:50px; display:inline-flex; align-items:center; justify-content:center; border-radius:50%; border:none; cursor:pointer; font-weight:700; box-shadow: 0 8px 28px rgba(34,160,220,0.18); transition: transform .12s ease, box-shadow .12s ease }
        .publishBtn:disabled{ opacity:0.6; cursor:default }
        .publishBtn svg{ transform: translateY(0); }
        @keyframes spin { to { transform: rotate(360deg) } }
        .spinner{ animation: spin 1s linear infinite }
        .fileName{ margin-top:8px; color:#bfc7cf; font-size:13px }
        @media (max-width:760px){ .postForm{ padding:14px } }
        @media (max-width:560px){ .modalDialog{ width: calc(100% - 32px); margin: 0 16px; } }
        /* Post cards - Minimal rounded design */
        .postCard{ background:#0b0f12; padding:16px; border-radius:14px; margin-bottom:14px; position:relative; box-shadow: 0 6px 24px rgba(3,6,7,0.5); border: 1px solid rgba(255,255,255,0.02); transition: transform 140ms ease, box-shadow 140ms ease }
        .postCard:hover{ transform: translateY(-6px); box-shadow: 0 18px 48px rgba(0,0,0,0.6) }
        body.modal-open .postCard:hover{ transform:none; box-shadow: 0 6px 24px rgba(0,0,0,0.1) }
        .postHeader{ color:#fff; display:flex; align-items:center; gap:12px; justify-content:space-between }
        .authorWrap{ display:flex; align-items:center; gap:12px; cursor:pointer }
        .postAvatar{ width:40px; height:40px; border-radius:10px; object-fit:cover; box-shadow: inset 0 0 0 1px rgba(255,255,255,0.02) }
        .postAvatarFallback{ width:40px; height:40px; border-radius:10px; display:flex; align-items:center; justify-content:center; background:#222; color:#fff; font-weight:700 }
        .authorCol{ display:flex; flex-direction:column }
        .authorName{ font-weight:700; font-size:14px }
        .authorMeta{ color:#8b99a6; font-size:12px }
        .postDescription{ color:#d9e0e6; margin-top:12px; font-size:15px; line-height:1.45 }
        .mediaWrap{ margin-top:12px; border-radius:12px; overflow:hidden; display:flex; align-items:center; justify-content:center }
        /* Prevent huge images — cap displayed size and center them */
        .postImage{ max-width:100%; width:auto; height:auto; max-height:480px; display:block; margin:0 auto; object-fit:contain; cursor:pointer }
        @media (max-width:760px) { .postImage{ max-height:320px } }
        .controlsRow{ display:flex; align-items:center; gap:12px; margin-top:10px; justify-content:space-between }
        .likeBtn{ display:inline-flex; align-items:center; gap:10px; border-radius:999px; padding:8px 12px; cursor:pointer; border:1px solid rgba(255,255,255,0.02); background:transparent; color:#9fb0bf; font-weight:700 }
        .likeBtn .heart{ font-size:14px }
        .likeBtn.liked{ background: linear-gradient(90deg,#ff6b6b,#ff8a00); color:#fff; border:none; box-shadow: 0 6px 18px rgba(255,106,106,0.12); transform: translateY(-1px) }
        .likeBtn{ transition: all 160ms ease; }
        .likeBtn:hover{ transform: translateY(-2px); }
        .likeBtn.liked .heart{ animation: pop 220ms cubic-bezier(.2,.9,.3,1) }
        @keyframes pop { 0%{ transform: scale(0.8) } 50%{ transform: scale(1.1) } 100%{ transform: scale(1) } }
        .likeBtn.liked .heart{ color:#fff }
        .likeCount{ font-weight:700 }
        .timestamp{ color:#8b99a6; font-size:12px; margin-left:12px }
        .ownerMenuWrap{ position:relative }
        .dotBtn{ background:transparent; color:#8b99a6; border:0; padding:6px 8px; border-radius:8px; font-weight:700 }
        .dotMenu{ position:absolute; right:0; top:36px; background:#0d1112; border: 1px solid rgba(255,255,255,0.01); border-radius:8px; padding:8px; box-shadow: 0 10px 30px rgba(0,0,0,0.6) }
        .dotMenuItem{ background:transparent; border:none; color:#f66; padding:6px 8px; cursor:pointer; font-weight:700 }
        /* Floating create button positioned near the header center-right */
        .floatingCreate{ position: fixed; top: 40px; left: calc(50% + 350px); z-index: 1100; width: 44px; height: 44px; border-radius: 22px; background: #777; color: #fff; border: none; font-size: 24px; display: flex; align-items: center; justify-content: center; box-shadow: 0 6px 18px rgba(0,0,0,0.4); cursor: pointer }
        @media (max-width: 980px){ .floatingCreate{ left: calc(50% + 220px); top: 40px } }
        @media (max-width: 760px){ .floatingCreate{ left: auto; right: 28px; bottom: 22px; top: auto } }
      `}</style>
      </div>

      {toast && (
        <ToastNotification type={toast.type === 'success' ? 'success' : 'error'} message={toast.message} duration={2500} onClose={()=>setToast(null)} />
      )}
    </div>
  );
}

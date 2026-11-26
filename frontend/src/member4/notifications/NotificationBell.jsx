import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../api/client.js';
import { openNotification } from '../data/memberApi.js';
import './notificationBell.css';

export default function NotificationBell({ ownerId }) {
  return ownerId ? <AccountBell key={ownerId} /> : null;
}

function AccountBell() {
  const [snapshot, setSnapshot] = useState(null);
  const [toast, setToast] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const menu = useRef(null);
  const refresh = useRef(null);
  const mounted = useRef(false);
  const navigate = useNavigate();

  useEffect(() => {
    mounted.current = true;
    let active = true;
    let controller;
    let seen = null;
    let toastTimer;
    async function check() {
      if (!active || controller || document.hidden) return;
      controller = new AbortController();
      try {
        const { data } = await api.get('/member-tools/inbox?page=1&limit=20', { signal: controller.signal });
        if (!active) return;
        const rows = data.data;
        const fresh = seen && rows.filter(n => !seen.has(n.id) && !n.read && n.available && n.source !== 'LOST_FOUND');
        if (!seen) seen = new Set();
        rows.forEach(n => seen.add(n.id));
        setSnapshot(data);
        setError('');
        if (fresh?.length) {
          setToast(fresh[0]);
          clearTimeout(toastTimer);
          toastTimer = setTimeout(() => setToast(null), 8000);
        }
      } catch {
        if (active) setError('Notifications could not refresh.');
      } finally { controller = null; }
    }
    refresh.current = check;
    check();
    const interval = setInterval(check, 15000);
    document.addEventListener('visibilitychange', check);
    window.addEventListener('member4:inbox-changed', check);
    return () => {
      active = false;
      mounted.current = false;
      controller?.abort();
      clearInterval(interval);
      clearTimeout(toastTimer);
      document.removeEventListener('visibilitychange', check);
      window.removeEventListener('member4:inbox-changed', check);
      refresh.current = null;
    };
  }, []);

  async function open(id) {
    setBusy(true);
    try {
      const destination = await openNotification(id);
      if (!mounted.current) return;
      setToast(null);
      if (menu.current) menu.current.open = false;
      navigate(destination.href, { state: { returnTo: '/notifications' } });
      refresh.current?.();
    } catch (failure) {
      if (mounted.current) setError(failure.message);
    } finally { if (mounted.current) setBusy(false); }
  }

  const unread = snapshot?.meta?.unread;
  const title = n => n.available ? (n.item || n.notice)?.title || 'Notification' : 'Source no longer available';
  return <div className="m4-bell">
    <details ref={menu} onToggle={e => { if (e.currentTarget.open) refresh.current?.(); }} onKeyDown={e => { if (e.key === 'Escape') { e.currentTarget.open = false; e.currentTarget.querySelector('summary')?.focus(); } }}>
      <summary aria-label={unread == null ? 'Notifications' : 'Notifications, ' + unread + ' unread'}>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4"/></svg>
        {unread > 0 && <span className="m4-bell-count">{unread > 99 ? '99+' : unread}</span>}
      </summary>
      <div className="m4-bell-panel">
        <strong>Notifications</strong>
        {error && <p role="status">{error}</p>}
        {!snapshot && !error && <p>Loading…</p>}
        {snapshot?.data.length === 0 && <p>No notifications yet.</p>}
        {snapshot?.data.slice(0,5).map(n => <button type="button" key={n.id} disabled={!n.available || busy} onClick={() => open(n.id)} className={n.read ? '' : 'm4-unread'}>{!n.read && '● '}{title(n)}</button>)}
        <Link to="/notifications" onClick={() => { if (menu.current) menu.current.open = false; }}>View all notifications</Link>
      </div>
    </details>
    {toast && <aside className="m4-bell-toast" role="status"><strong>New university notification</strong><p>{title(toast)}</p><button type="button" disabled={busy} onClick={() => open(toast.id)}>View notice</button> <button type="button" onClick={() => setToast(null)}>Dismiss</button></aside>}
  </div>;
}

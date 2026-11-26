import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import MemberPage from '../components/MemberPage.jsx';
import useMemberQuery from '../data/useMemberQuery.js';
import { setNotificationRead, markAllNotificationsRead, openNotification } from '../data/memberApi.js';
import Button from '../../components/ui/Button.jsx';
import Alert from '../../components/ui/Alert.jsx';
import Pagination from '../../components/ui/Pagination.jsx';
import { DataState } from '../../components/ui/States.jsx';
import { formatDateTime } from '../../lib/time.js';

const labels = { NOTICE_PUBLISHED: 'Notice published', NOTICE_SCHEDULED: 'Scheduled notice published', NOTICE_CORRECTED: 'Notice corrected', EVENT_POSTPONED: 'Event postponed', EVENT_CANCELLED: 'Event cancelled', LF_CLAIM_APPROVED: 'Ownership claim approved', LF_CLAIM_REJECTED: 'Ownership claim not accepted', LF_CLAIM_RELEASED: 'Ownership approval released', LF_ITEM_HANDED_OVER: 'Item collected' };
export default function InboxApp() {
  return <MemberPage title="Notifications" description="Updates from your followed notice topics and your lost-and-found cases. Refresh to check for new information."><AccountInbox /></MemberPage>;
}
function AccountInbox() {
  const [page, setPage] = useState(1);
  const inbox = useMemberQuery(`/member-tools/inbox?page=${page}&limit=20`);
  const [pending, setPending] = useState('');
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();
  const unreadStatus = useRef(null);
  const active = useRef(false);
  useEffect(() => {
    active.current = true;
    return () => { active.current = false; };
  }, []);
  useEffect(() => {
    if (location.state?.focusReturn && !inbox.loading) unreadStatus.current?.focus();
  }, [location.state?.focusReturn, inbox.loading]);
  async function change(id, action) {
    setPending(id); setError('');
    try { await action(); inbox.reload(); window.dispatchEvent(new Event('member4:inbox-changed')); }
    catch (failure) { setError(failure.message); }
    finally { setPending(''); }
  }
  async function open(id) {
    setPending(id); setError('');
    try {
      const destination = await openNotification(id);
      window.dispatchEvent(new Event('member4:inbox-changed'));
      if (active.current) navigate(destination.href, { state: { returnTo: '/notifications' } });
    } catch (failure) {
      if (active.current) { setError(failure.message); inbox.reload(); }
    } finally { if (active.current) setPending(''); }
  }
  return <div className="stack">
    <div className="row-between"><div className="row"><Button variant="secondary" onClick={inbox.reload}>Refresh inbox</Button><Button variant="secondary" busy={pending === 'all'} disabled={Boolean(pending) || !inbox.data?.meta.unread} onClick={() => change('all', markAllNotificationsRead)}>Mark all as read</Button></div><Link to="/saved-interests">Topics and preferences</Link></div>
    {error && <Alert type="error">{error}</Alert>}
    <DataState {...inbox} onRetry={inbox.reload} isEmpty={(data) => !data.data.length} emptyTitle="No notifications yet" emptyText="Follow notice topics or check back for updates to your lost-and-found cases.">{(data) => <>
      <p role="status" ref={unreadStatus} tabIndex={-1}>{data.meta.unread} unread {data.meta.unread === 1 ? 'notification' : 'notifications'}</p>
      <div className="stack">{data.data.map((notification) => {
        const source = notification.item || notification.notice;
        const caseUpdate = notification.source === 'LOST_FOUND';
        return <article className="card stack" key={notification.id}><div className="row-between"><span className="tag">{notification.read ? 'Read' : 'Unread'} · {labels[notification.type] || (caseUpdate ? 'Lost-and-found update' : 'Notice update')}</span><time dateTime={notification.occurredAt}>{formatDateTime(notification.occurredAt)}</time></div><h2 style={{ fontSize: '1.15rem', margin: 0 }}>{notification.available && source ? source.title : 'Source no longer available'}</h2>{notification.available && source ? <p>{source.summary}</p> : <p>This source is no longer visible to your account. Its details are hidden.</p>}<div className="row">{notification.available && <Button variant="secondary" busy={pending === notification.id} disabled={Boolean(pending)} onClick={() => open(notification.id)}>{caseUpdate ? 'Open case' : 'Open notice'}</Button>}<Button variant="secondary" size="sm" disabled={Boolean(pending)} onClick={() => change(notification.id, () => setNotificationRead(notification.id, !notification.read))}>{notification.read ? 'Mark unread' : 'Mark read'}</Button></div></article>;
      })}</div>
      <Pagination meta={data.meta} onPage={setPage} />
    </>}</DataState>
  </div>;
}

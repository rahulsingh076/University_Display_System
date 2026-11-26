import { useEffect, useRef, useState } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import useAuth from '../../hooks/useAuth';
import { pendingCount } from '../../api/notices';
import Icon from '../ui/Icon';
import NotificationBell from '../../member4/notifications/NotificationBell.jsx';
import { humanize } from '../../lib/labels';

/** Role-specific tools stay in the account menu; the server enforces access. */
export default function NavBar() {
  const { user, hasRole, logout } = useAuth();
  const [openPath, setOpenPath] = useState(null);
  const [pendingResult, setPendingResult] = useState(null);
  const [logoutError, setLogoutError] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const menuButtonRef = useRef(null);
  const accountMenuRef = useRef(null);
  const open = openPath === location.pathname;
  const canReview = hasRole('REVIEWER', 'ADMIN');
  const pending = canReview && pendingResult?.path === location.pathname ? pendingResult.count : null;

  useEffect(() => {
    let active = true;
    if (canReview) pendingCount().then((count) => active && setPendingResult({ path: location.pathname, count })).catch(() => active && setPendingResult(null));
    return () => { active = false; };
  }, [canReview, location.pathname]);

  useEffect(() => {
    if (!open) return;
    const close = (event) => { if (event.key === 'Escape') { setOpenPath(null); menuButtonRef.current?.focus(); } };
    document.addEventListener('keydown', close);
    return () => document.removeEventListener('keydown', close);
  }, [open]);

  useEffect(() => {
    const dismiss = (event) => {
      const menu = accountMenuRef.current;
      if (menu?.open && !menu.contains(event.target)) menu.open = false;
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, []);

  async function handleLogout() {
    setLogoutError(null);
    try { await logout(); navigate('/'); }
    catch (error) { setLogoutError(error.message || 'Could not log out. Please try again.'); }
  }

  return (
    <header className="topbar">
      <div className="utility-bar"><div className="container"><span><Icon name="building" size={13} />Kyungdong University · Global Campus</span><span className="utility-right">University Information Display System<span className="utility-separator" aria-hidden="true">|</span>Asia/Seoul · KST<span className="utility-separator" aria-hidden="true">|</span><a className="utility-official-link" href="https://kduniv.ac.kr/global/Main.do" target="_blank" rel="noopener noreferrer">Official KDU website<span className="visually-hidden"> (opens in a new tab)</span></a></span></div></div>
      <div className="container topbar-inner">
        <Link to="/" className="brand" aria-label="KDU Global campus portal home"><img className="brand-logo official-university-logo" src="/assets/kdu-official-logo.gif" width="175" height="64" alt="Kyungdong University" /></Link>
        <nav id="main-nav" className={`nav-links ${open ? 'open' : ''}`} aria-label="Main">
          <NavLink to="/" end>Home</NavLink><NavLink to="/notices">Notices</NavLink><NavLink to="/events">Events</NavLink><NavLink to="/professors">Directory</NavLink><NavLink to="/items">Lost &amp; found</NavLink><NavLink className="nav-search" to="/search?source=all"><Icon name="search" size={17} /><span>Search</span></NavLink>
        </nav>
        <div className="nav-controls">
          <NotificationBell ownerId={user && (user.id || user._id)} />
          {user ? (
            <details ref={accountMenuRef} className="account-menu" key={location.pathname} onKeyDown={(event) => {
              if (event.key === 'Escape' && event.currentTarget.open) {
                event.preventDefault();
                event.stopPropagation();
                event.currentTarget.open = false;
                event.currentTarget.querySelector('summary')?.focus();
              }
            }}>
              <summary aria-label={`Account menu for ${user.name}`}><span className="user-avatar">{user.name?.trim().slice(0, 1).toUpperCase() || 'U'}</span><span className="account-summary-name">{user.name?.split(' ')[0]}<small>{humanize(user.role)}</small></span><Icon name="chevronDown" size={14} /></summary>
              <div className="account-dropdown"><div className="account-identity"><strong>{user.name}</strong><span>{user.email}</span><span className="tag">{humanize(user.role)}</span></div>
                <Link to="/account-security">Account security</Link>
                <Link to="/saved-interests"><Icon name="book" size={16} />Saved interests</Link><Link to="/notifications"><Icon name="mail" size={16} />Notifications</Link>
                {hasRole('AUTHOR', 'ADMIN') && <Link to="/author/notices"><Icon name="edit" size={16} />My notices</Link>}
                {canReview && <Link to="/reviewer/queue"><Icon name="check" size={16} />Review queue{pending !== null && <span className="nav-count">{pending}</span>}</Link>}
                {hasRole('ADMIN') && <><div className="account-menu-label">ADMINISTRATION</div><Link to="/admin"><Icon name="building" size={16} />Dashboard</Link><Link to="/admin/professors"><Icon name="user" size={16} />Manage professors</Link><Link to="/admin/departments"><Icon name="book" size={16} />Departments</Link><Link to="/admin/users"><Icon name="shield" size={16} />Users &amp; roles</Link></>}
                {hasRole('REVIEWER') && <Link to="/admin/domain-events"><Icon name="list" size={16} />Domain events</Link>}
                <button type="button" onClick={handleLogout}><Icon name="logout" size={16} />Log out</button>
              </div>
            </details>
          ) : <Link to="/login" className="nav-login"><Icon name="user" size={16} />Log in<Icon name="arrowRight" size={15} /></Link>}
          <button ref={menuButtonRef} type="button" className="menu-button" aria-expanded={open} aria-controls="main-nav" onClick={() => setOpenPath(open ? null : location.pathname)}><Icon name={open ? 'close' : 'menu'} size={22} /><span className="visually-hidden">{open ? 'Close menu' : 'Open menu'}</span></button>
        </div>
        {logoutError && <p className="nav-error" role="alert">{logoutError}</p>}
      </div>
    </header>
  );
}

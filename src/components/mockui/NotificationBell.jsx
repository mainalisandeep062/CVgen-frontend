import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell, BellOff, CheckCheck, ExternalLink } from 'lucide-react';

import {
  listMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/api/notifications';
import { timeAgo } from '@/admin/format';

const POLL_INTERVAL_MS = 60_000;
const PAGE_SIZE = 10;

const LEVEL_LABEL = {
  INFO: 'Info',
  SUCCESS: 'Success',
  WARNING: 'Warning',
  CRITICAL: 'Critical',
};

/** In-app path. "//host" is protocol-relative, i.e. external — never navigate to it. */
function isInternalLink(link) {
  return typeof link === 'string' && link.startsWith('/') && !link.startsWith('//');
}

function isExternalLink(link) {
  return typeof link === 'string' && link.startsWith('https://');
}

/**
 * NotificationBell — unread badge + dropdown of the user's latest notifications.
 *
 * Polls `GET /api/notifications?size=10` every 60s while mounted, and only
 * while the tab is visible: `visibilitychange` stops the interval when the tab
 * is hidden and refetches immediately when it comes back, so a background tab
 * never hammers the API. Opening the panel also refetches.
 *
 * Failures are QUIET by design: this sits on every page, and a toast per poll
 * would be spam (the endpoint may simply not be deployed yet). A failed poll
 * keeps the last good list; with nothing loaded the panel says so inline.
 *
 * Clicking an item marks it read optimistically (the next poll resyncs if the
 * request failed), then follows its link: in-app paths via the router, https
 * links as a real anchor in a new tab with rel="noopener noreferrer". Any other
 * link shape is ignored rather than followed.
 *
 * Dismissal mirrors UserMenu: pointerdown outside closes, Escape closes and
 * returns focus to the bell.
 */
export default function NotificationBell() {
  const navigate = useNavigate();
  const wrapperRef = useRef(null);
  const buttonRef = useRef(null);

  const [open, setOpen] = useState(false);
  const [items, setItems] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  // idle: never loaded · ready: have data · error: never managed to load
  const [status, setStatus] = useState('idle');

  const load = useCallback(async () => {
    try {
      const data = await listMyNotifications({ size: PAGE_SIZE });
      setItems(Array.isArray(data?.items) ? data.items : []);
      setUnreadCount(Math.max(0, Number(data?.unreadCount) || 0));
      setStatus('ready');
    } catch {
      setStatus((current) => (current === 'ready' ? 'ready' : 'error'));
    }
  }, []);

  // Visibility-aware polling.
  useEffect(() => {
    let timer = null;
    const start = () => {
      if (timer === null) timer = setInterval(load, POLL_INTERVAL_MS);
    };
    const stop = () => {
      if (timer !== null) clearInterval(timer);
      timer = null;
    };
    const onVisibilityChange = () => {
      if (document.hidden) {
        stop();
      } else {
        load();
        start();
      }
    };

    if (!document.hidden) {
      load();
      start();
    }
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [load]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  useEffect(() => {
    if (!open) return undefined;
    const onPointerDown = (event) => {
      if (!wrapperRef.current?.contains(event.target)) setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [open]);

  const markRead = (notification) => {
    if (notification.read) return;
    setItems((current) =>
      current.map((item) => (item.id === notification.id ? { ...item, read: true } : item))
    );
    setUnreadCount((count) => Math.max(0, count - 1));
    markNotificationRead(notification.id).catch(() => {
      // Quiet: the next poll brings the server's truth back.
    });
  };

  const handleItemClick = (notification) => {
    markRead(notification);
    if (isInternalLink(notification.link)) {
      setOpen(false);
      navigate(notification.link);
    }
  };

  const handleMarkAll = async () => {
    setItems((current) => current.map((item) => ({ ...item, read: true })));
    setUnreadCount(0);
    try {
      await markAllNotificationsRead();
    } catch {
      load();
    }
  };

  const badge = unreadCount > 99 ? '99+' : String(unreadCount);

  const renderItemContent = (notification) => (
    <>
      <span className={`notif-dot level-${notification.level}`} aria-hidden="true" />
      <span className="notif-item-body">
        <span className="notif-item-title">
          <span>{notification.title}</span>
          {!notification.read && <span className="notif-new">New</span>}
        </span>
        {notification.body && <span className="notif-item-text">{notification.body}</span>}
        <span className="notif-item-meta">
          <span>{LEVEL_LABEL[notification.level] ?? notification.level}</span>
          <span aria-hidden="true">·</span>
          <span>{timeAgo(notification.createdAt, '')}</span>
          {isExternalLink(notification.link) && (
            <ExternalLink size={12} aria-label="Opens in a new tab" />
          )}
        </span>
      </span>
    </>
  );

  return (
    <div className="notif" ref={wrapperRef}>
      <button
        ref={buttonRef}
        type="button"
        className="notif-trigger"
        aria-haspopup="true"
        aria-expanded={open}
        aria-label={unreadCount > 0 ? `Notifications, ${unreadCount} unread` : 'Notifications'}
        onClick={() => setOpen((value) => !value)}
      >
        <Bell aria-hidden="true" />
        {unreadCount > 0 && (
          <span className="notif-count" aria-hidden="true">
            {badge}
          </span>
        )}
      </button>

      {open && (
        <div className="notif-panel" role="region" aria-label="Notifications">
          <div className="notif-header">
            <span className="notif-title">Notifications</span>
            {unreadCount > 0 && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={handleMarkAll}>
                <CheckCheck aria-hidden="true" />
                Mark all read
              </button>
            )}
          </div>

          {status === 'error' && items.length === 0 && (
            <div className="notif-empty">
              <BellOff aria-hidden="true" />
              <div>Notifications are unavailable right now.</div>
            </div>
          )}

          {status === 'idle' && (
            <div className="notif-empty" role="status">
              Loading…
            </div>
          )}

          {status === 'ready' && items.length === 0 && (
            <div className="notif-empty">
              <Bell aria-hidden="true" />
              <div>You&apos;re all caught up.</div>
            </div>
          )}

          {items.length > 0 && (
            <ul className="notif-list">
              {items.map((notification) => (
                <li key={notification.id}>
                  {isExternalLink(notification.link) ? (
                    <a
                      className={`notif-item${notification.read ? '' : ' unread'}`}
                      href={notification.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => markRead(notification)}
                    >
                      {renderItemContent(notification)}
                    </a>
                  ) : (
                    <button
                      type="button"
                      className={`notif-item${notification.read ? '' : ' unread'}`}
                      onClick={() => handleItemClick(notification)}
                    >
                      {renderItemContent(notification)}
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, Loader2 } from 'lucide-react';
import { useNotificationSocket } from '../../hooks/useNotificationSocket';
import {
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../../services/notifications';
import { getAccessToken, isAuthenticated } from '../../services/storage';
import NotificationListItem from './NotificationListItem.jsx';
import { getNotificationRoute } from './notificationUtils';
import { requestNotificationPermission, showBrowserNotification } from './useNotificationAlerts';

function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

const POLL_FALLBACK_MS = 60_000;

export default function NotificationBell() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const authed = isAuthenticated();
  const accessToken = getAccessToken();
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);
  const btnRef = useRef(null);

  const handleSocketNotification = useCallback(
    (notification) => {
      queryClient.setQueryData(['notifications', 'list'], (old = []) => {
        if (!Array.isArray(old)) return [notification];
        if (old.some((n) => n.id === notification.id)) return old;
        return [notification, ...old];
      });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'inbox'] });
      showBrowserNotification(notification);
    },
    [queryClient]
  );

  const { connected, unreadCount, setUnreadCount, refetchUnread } = useNotificationSocket(
    accessToken,
    {
      enabled: authed,
      onNotification: handleSocketNotification,
    }
  );

  const listQuery = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: getNotifications,
    enabled: authed && open,
    staleTime: 15_000,
  });

  useEffect(() => {
    if (!connected && authed) {
      const id = window.setInterval(() => refetchUnread(), POLL_FALLBACK_MS);
      return () => window.clearInterval(id);
    }
    return undefined;
  }, [connected, authed, refetchUnread]);

  useEffect(() => {
    if (!open) return undefined;
    const onDoc = (e) => {
      const t = e.target;
      if (wrapRef.current?.contains(t) || btnRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    if (authed) refetchUnread();
  }, [location.pathname, authed, refetchUnread]);

  const markOneMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: (_data, id) => {
      setUnreadCount((c) => Math.max(0, c - 1));
      queryClient.setQueryData(['notifications', 'list'], (old = []) =>
        Array.isArray(old)
          ? old.map((n) => (n.id === id ? { ...n, is_read: true } : n))
          : old
      );
    },
  });

  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => {
      setUnreadCount(0);
      queryClient.setQueryData(['notifications', 'list'], (old = []) =>
        Array.isArray(old) ? old.map((n) => ({ ...n, is_read: true })) : old
      );
    },
  });

  const handleOpen = () => {
    setOpen((v) => !v);
    if (!open) {
      if (typeof Notification !== 'undefined' && Notification.permission === 'default') {
        requestNotificationPermission();
      }
      if (authed) listQuery.refetch();
    }
  };

  const handleItemClick = async (item) => {
    if (!item.is_read) {
      try {
        await markOneMutation.mutateAsync(item.id);
      } catch {
        /* navigate anyway */
      }
    }
    setOpen(false);
    navigate(getNotificationRoute(item));
  };

  const notifications = listQuery.data ?? [];
  const showBadge = unreadCount > 0;

  return (
    <div className="relative" ref={wrapRef}>
      <button
        ref={btnRef}
        type="button"
        onClick={handleOpen}
        className={cx(
          'relative grid h-10 w-10 place-items-center rounded-xl text-white/75 transition',
          'hover:bg-white/10 hover:text-white',
          open && 'bg-white/10 text-white'
        )}
        aria-label={showBadge ? `${unreadCount} unread notifications` : 'Notifications'}
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Bell className="h-5 w-5" />
        {connected ? (
          <span
            className="absolute bottom-1 left-1 h-1.5 w-1.5 rounded-full bg-emerald-400 ring-1 ring-purple-900/80"
            title="Live updates connected"
            aria-hidden
          />
        ) : null}
        {showBadge ? (
          <span className="absolute right-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white ring-2 ring-purple-900/80">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className={cx(
            'absolute right-0 z-50 mt-2 w-[min(92vw,380px)] overflow-hidden rounded-2xl border shadow-2xl',
            'border-slate-700 bg-slate-900'
          )}
          role="menu"
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-700/80 px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-slate-50">Notifications</h2>
              {showBadge ? (
                <p className="text-[11px] text-slate-400">
                  {unreadCount} unread
                  {connected ? ' · Live' : ''}
                </p>
              ) : (
                <p className="text-[11px] text-slate-400">
                  You&apos;re all caught up
                  {connected ? ' · Live' : ''}
                </p>
              )}
            </div>
            {unreadCount > 0 ? (
              <button
                type="button"
                disabled={markAllMutation.isPending}
                onClick={() => markAllMutation.mutate()}
                className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold text-violet-300 transition hover:bg-slate-800 disabled:opacity-50"
              >
                {markAllMutation.isPending ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <CheckCheck className="h-3.5 w-3.5" />
                )}
                Mark all read
              </button>
            ) : null}
          </div>

          <div className="max-h-[min(70vh,420px)] overflow-y-auto">
            {listQuery.isLoading ? (
              <div className="space-y-0 divide-y divide-slate-800">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="flex animate-pulse gap-3 px-4 py-3">
                    <div className="h-9 w-9 rounded-full bg-slate-800" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 w-3/4 rounded bg-slate-800" />
                      <div className="h-2 w-1/3 rounded bg-slate-800/70" />
                    </div>
                  </div>
                ))}
              </div>
            ) : listQuery.isError ? (
              <div className="px-4 py-8 text-center text-sm text-slate-400">
                Unable to load notifications.
                <button
                  type="button"
                  onClick={() => listQuery.refetch()}
                  className="mt-2 block w-full text-xs font-semibold text-violet-300 hover:underline"
                >
                  Retry
                </button>
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-10 text-center">
                <Bell className="mx-auto h-8 w-8 text-slate-600" />
                <p className="mt-2 text-sm font-medium text-slate-300">No notifications yet</p>
                <p className="mt-1 text-xs text-slate-500">Updates on leave and feed activity appear here.</p>
              </div>
            ) : (
              <ul className="divide-y divide-slate-800">
                {notifications.map((item) => (
                  <li key={item.id} role="none">
                    <div role="menuitem">
                      <NotificationListItem
                        item={item}
                        onClick={handleItemClick}
                        compact
                      />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}

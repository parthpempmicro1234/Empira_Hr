import { useCallback, useEffect, useRef, useState } from 'react';
import { getUnreadNotificationCount } from '../services/notifications';
import { buildNotificationSocketUrl } from '../utils/notificationSocketUrl';

const FALLBACK_POLL_MS = 60_000;
const MAX_RECONNECT_DELAY_MS = 30_000;

/**
 * Real-time notifications via WebSocket with REST fallback polling when disconnected.
 */
export function useNotificationSocket(accessToken, { enabled = true, onNotification } = {}) {
  const [connected, setConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const wsRef = useRef(null);
  const reconnectDelayRef = useRef(1000);
  const reconnectTimerRef = useRef(null);
  const pollRef = useRef(null);
  const onNotificationRef = useRef(onNotification);

  useEffect(() => {
    onNotificationRef.current = onNotification;
  }, [onNotification]);

  const clearReconnectTimer = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = null;
    }
  }, []);

  const stopFallbackPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
  }, []);

  const startFallbackPoll = useCallback(() => {
    if (pollRef.current || !accessToken || !enabled) return;
    pollRef.current = window.setInterval(() => {
      getUnreadNotificationCount()
        .then((count) => setUnreadCount(count))
        .catch(() => {});
    }, FALLBACK_POLL_MS);
  }, [accessToken, enabled]);

  const fetchUnreadCount = useCallback(async () => {
    if (!accessToken || !enabled) return;
    try {
      const count = await getUnreadNotificationCount();
      setUnreadCount(count);
    } catch {
      /* ignore */
    }
  }, [accessToken, enabled]);

  const connect = useCallback(() => {
    if (!accessToken || !enabled) return;

    const url = buildNotificationSocketUrl(accessToken);
    if (!url) return;

    try {
      wsRef.current?.close();
    } catch {
      /* ignore */
    }

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      reconnectDelayRef.current = 1000;
      clearReconnectTimer();
      stopFallbackPoll();
      fetchUnreadCount();
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'connection.established') return;

        if (data.type === 'notification.new') {
          if (typeof data.unread_count === 'number') {
            setUnreadCount(data.unread_count);
          } else {
            setUnreadCount((c) => c + 1);
          }
          if (data.notification) {
            onNotificationRef.current?.(data.notification);
          }
        }
      } catch {
        /* ignore malformed frames */
      }
    };

    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;
      startFallbackPoll();

      clearReconnectTimer();
      const delay = reconnectDelayRef.current;
      reconnectDelayRef.current = Math.min(delay * 2, MAX_RECONNECT_DELAY_MS);
      reconnectTimerRef.current = window.setTimeout(connect, delay);
    };

    ws.onerror = () => {
      try {
        ws.close();
      } catch {
        /* ignore */
      }
    };
  }, [
    accessToken,
    enabled,
    clearReconnectTimer,
    fetchUnreadCount,
    startFallbackPoll,
    stopFallbackPoll,
  ]);

  useEffect(() => {
    if (!accessToken || !enabled) {
      setConnected(false);
      setUnreadCount(0);
      try {
        wsRef.current?.close();
      } catch {
        /* ignore */
      }
      wsRef.current = null;
      stopFallbackPoll();
      clearReconnectTimer();
      return undefined;
    }

    fetchUnreadCount();
    connect();

    return () => {
      clearReconnectTimer();
      stopFallbackPoll();
      try {
        wsRef.current?.close();
      } catch {
        /* ignore */
      }
      wsRef.current = null;
    };
  }, [
    accessToken,
    enabled,
    connect,
    fetchUnreadCount,
    clearReconnectTimer,
    stopFallbackPoll,
  ]);

  return {
    connected,
    unreadCount,
    setUnreadCount,
    refetchUnread: fetchUnreadCount,
  };
}

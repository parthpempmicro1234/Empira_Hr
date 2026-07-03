/**
 * Build WebSocket URL for /ws/notifications/
 * Dev: uses Vite proxy at /ws → backend (see vite.config.ts)
 * Prod: derives host from VITE_API_URL
 */
export function buildNotificationSocketUrl(accessToken) {
  if (!accessToken) return null;

  const explicit = import.meta.env.VITE_WS_NOTIFICATIONS_URL;
  if (typeof explicit === 'string' && explicit.trim()) {
    const base = explicit.trim().replace(/\/$/, '');
    const joiner = base.includes('?') ? '&' : '?';
    return `${base}${joiner}token=${encodeURIComponent(accessToken)}`;
  }

  if (import.meta.env.DEV) {
    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${wsProtocol}//${window.location.host}/ws/notifications/?token=${encodeURIComponent(accessToken)}`;
  }

  const apiUrl = (import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000/').replace(/\/+$/, '');
  let parsed;
  try {
    parsed = new URL(apiUrl);
  } catch {
    return `ws://127.0.0.1:8000/ws/notifications/?token=${encodeURIComponent(accessToken)}`;
  }

  const wsProtocol = parsed.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${wsProtocol}//${parsed.host}/ws/notifications/?token=${encodeURIComponent(accessToken)}`;
}

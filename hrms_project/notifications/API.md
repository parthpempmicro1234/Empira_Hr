# Notifications API (REST + WebSocket)

## REST (unchanged)

| Method | URL | Description |
|--------|-----|-------------|
| GET | `/notifications/` | List notifications (paginated, 50 per page; `?page=2`, optional `?page_size=`) |
| GET | `/notifications/unread_count/` | Badge count |
| POST | `/notifications/mark_all_as_read/` | Mark all read |
| POST | `/notifications/{id}/mark_as_read/` | Mark one read |

Auth: `Authorization: Bearer <access_token>`

### Leave apply — notify colleagues (separate from reason)

On `POST /leave/employeeleaves/`, send optional write-only fields:

- `notify_employee_ids` — array of `Employee.id` (max 20); only these users get `leave_notify`
- `notify_message` — optional note (supports `@Display Name` mentions)

**HR is not auto-notified** on apply. Use `@` in `reason` or `notify_message` to mention someone.  
Full frontend spec: [FRONTEND_LEAVE_NOTIFY.md](./FRONTEND_LEAVE_NOTIFY.md).

---

## WebSocket (real-time)

### Connect

```
ws://localhost:8000/ws/notifications/?token=<JWT_ACCESS_TOKEN>
```

Production: `wss://your-api-host/ws/notifications/?token=...`

- Token is the same JWT access token used for REST.
- Connection rejected (closed) if token is missing, invalid, or user has no `employee` profile.

### Server → client events

**Connection OK**

```json
{ "type": "connection.established" }
```

**New notification** (instant when Celery creates a row)

```json
{
  "type": "notification.new",
  "notification": {
    "id": 42,
    "actor_id": 7,
    "actor_name": "Riya Shah",
    "notification_type": "leave_approved",
    "content": "Your Casual leave was approved.",
    "is_read": false,
    "data": { "leave_id": 15 },
    "created_at": "2026-05-25T10:30:00.000Z"
  },
  "unread_count": 3
}
```

Use `notification` for inbox UI; use `unread_count` for bell badge.

### Client → server

No messages required for v1.

---

## React + Vite integration

### 1. Vite proxy (`vite.config.js`)

```js
export default defineConfig({
  server: {
    proxy: {
      '/api': { target: 'http://localhost:8000', changeOrigin: true },
      '/ws': { target: 'ws://localhost:8000', ws: true },
    },
  },
});
```

Adjust paths if your REST base URL differs. WebSocket URL in dev:

```js
const wsUrl = `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}/ws/notifications/?token=${accessToken}`;
```

If not using proxy, connect directly: `ws://localhost:8000/ws/notifications/?token=...`

### 2. Hook example (`src/hooks/useNotificationSocket.js`)

```javascript
import { useCallback, useEffect, useRef, useState } from 'react';

const POLL_INTERVAL_MS = 60000;
const MAX_RECONNECT_DELAY_MS = 30000;

export function useNotificationSocket(accessToken, { onNotification, apiBase = '' } = {}) {
  const [connected, setConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const wsRef = useRef(null);
  const reconnectDelay = useRef(1000);
  const pollRef = useRef(null);

  const fetchUnreadCount = useCallback(async () => {
    if (!accessToken) return;
    const res = await fetch(`${apiBase}/notifications/unread_count/`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (res.ok) {
      const data = await res.json();
      setUnreadCount(data.unread_count);
    }
  }, [accessToken, apiBase]);

  const connect = useCallback(() => {
    if (!accessToken) return;

    const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
    const host = import.meta.env.DEV
      ? `${window.location.hostname}:8000`
      : window.location.host;
    const url = `${protocol}://${host}/ws/notifications/?token=${encodeURIComponent(accessToken)}`;

    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      setConnected(true);
      reconnectDelay.current = 1000;
      fetchUnreadCount();
      if (pollRef.current) clearInterval(pollRef.current);
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'notification.new') {
        if (typeof data.unread_count === 'number') {
          setUnreadCount(data.unread_count);
        } else {
          setUnreadCount((c) => c + 1);
        }
        onNotification?.(data.notification);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      wsRef.current = null;
      if (!pollRef.current) {
        pollRef.current = setInterval(fetchUnreadCount, POLL_INTERVAL_MS);
      }
      const delay = reconnectDelay.current;
      reconnectDelay.current = Math.min(delay * 2, MAX_RECONNECT_DELAY_MS);
      setTimeout(connect, delay);
    };

    ws.onerror = () => ws.close();
  }, [accessToken, fetchUnreadCount, onNotification]);

  useEffect(() => {
    if (!accessToken) return;
    fetchUnreadCount();
    connect();
    return () => {
      wsRef.current?.close();
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [accessToken, connect, fetchUnreadCount]);

  return { connected, unreadCount, setUnreadCount, refetchUnread: fetchUnreadCount };
}
```

### 3. Bell component usage

```jsx
const { connected, unreadCount, setUnreadCount } = useNotificationSocket(token, {
  onNotification: (n) => setInbox((prev) => [n, ...prev]),
});

// On mark as read:
await fetch(`/notifications/${id}/mark_as_read/`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } });
setUnreadCount((c) => Math.max(0, c - 1));
```

### 4. Navigation on click

```javascript
function openNotification(n) {
  const { notification_type, data } = n;
  if (['leave_requested', 'leave_approved', 'leave_rejected', 'leave_cancelled'].includes(notification_type)) {
    if (data?.leave_id) navigate(`/leaves/${data.leave_id}`);
    return;
  }
  if (data?.post_id) navigate(`/feed/${data.post_id}`);
}
```

---

## Running the stack locally

```bash
redis-server
celery -A core worker -l info
daphne -b 0.0.0.0 -p 8000 core.asgi:application
```

Use **Daphne** (not `runserver`) so WebSockets work. REST and WS share port 8000.

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| No push, REST works | Start Celery worker + Redis; channel layer uses Redis db `2` |
| WS connects then closes 4001 | Invalid/expired JWT in query string |
| WS closes 4002 | User has no linked `employee` |
| CORS OK but WS fails | Check `ALLOWED_HOSTS` and use same host as API |

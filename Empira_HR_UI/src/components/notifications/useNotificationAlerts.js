import { getNotificationRoute } from './notificationUtils';

function canUseBrowserNotifications() {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export async function requestNotificationPermission() {
  if (!canUseBrowserNotifications()) return 'denied';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  return Notification.requestPermission();
}

/** Native browser toast when tab is visible (user is on the app). */
export function showBrowserNotification(notification) {
  if (!canUseBrowserNotifications()) return;
  if (Notification.permission !== 'granted') return;
  if (document.visibilityState !== 'visible') return;
  if (!notification?.content) return;

  const tag = `empira-notification-${notification.id}`;
  const n = new Notification('Empira HR', {
    body: notification.content,
    tag,
    icon: '/favicon.ico',
  });
  n.onclick = () => {
    window.focus();
    const path = getNotificationRoute(notification);
    if (path) window.location.assign(path);
    n.close();
  };
}

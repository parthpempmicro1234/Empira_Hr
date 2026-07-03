import {
  AtSign,
  BarChart3,
  Bell,
  CalendarDays,
  Heart,
  Megaphone,
  MessageCircle,
} from 'lucide-react';

const LEAVE_TYPES = new Set([
  'leave_requested',
  'leave_approved',
  'leave_rejected',
  'leave_cancelled',
  'leave_notify',
]);

const FEED_TYPES = new Set([
  'mention',
  'post_comment',
  'post_reaction',
  'poll_vote',
  'system',
]);

export function formatNotificationTime(iso) {
  if (!iso) return '';
  const d = new Date(iso.includes('T') ? iso : iso.replace(' ', 'T'));
  if (Number.isNaN(d.getTime())) return '';
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function getNotificationIcon(type) {
  if (LEAVE_TYPES.has(type)) return CalendarDays;
  if (type === 'mention') return AtSign;
  if (type === 'post_comment') return MessageCircle;
  if (type === 'post_reaction') return Heart;
  if (type === 'poll_vote') return BarChart3;
  if (type === 'system') return Megaphone;
  return Bell;
}

export function getNotificationIconClass(type) {
  if (LEAVE_TYPES.has(type)) return 'text-emerald-400 bg-emerald-500/15';
  if (type === 'mention') return 'text-violet-400 bg-violet-500/15';
  if (type === 'post_comment') return 'text-blue-400 bg-blue-500/15';
  if (type === 'post_reaction') return 'text-rose-400 bg-rose-500/15';
  if (type === 'poll_vote') return 'text-amber-400 bg-amber-500/15';
  if (type === 'system') return 'text-orange-400 bg-orange-500/15';
  return 'text-slate-400 bg-slate-500/15';
}

/**
 * Deep link routes aligned with Empira HR app paths.
 */
export function getNotificationRoute(notification) {
  const { notification_type: type, data = {} } = notification;
  const leaveId = data.leave_id;
  const postId = data.post_id;

  if ((LEAVE_TYPES.has(type) || type === 'leave_notify') && leaveId != null) {
    return `/me/leave/${leaveId}`;
  }
  if (type === 'mention' && leaveId != null && postId == null) {
    return `/me?tab=leave&leaveId=${leaveId}`;
  }
  if (FEED_TYPES.has(type) && postId != null) {
    const params = new URLSearchParams({ postId: String(postId) });
    if (data.comment_id != null) params.set('commentId', String(data.comment_id));
    return `/?${params.toString()}`;
  }
  if (LEAVE_TYPES.has(type)) return '/me/leave';
  if (FEED_TYPES.has(type)) return '/';
  return '/';
}

export function getActorInitials(name) {
  const parts = String(name ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '—';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

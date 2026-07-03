import React from 'react';
import {
  formatNotificationTime,
  getActorInitials,
  getNotificationIcon,
  getNotificationIconClass,
} from './notificationUtils';

function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

export default function NotificationListItem({ item, onClick, compact = false }) {
  const Icon = getNotificationIcon(item.notification_type);
  const iconClass = getNotificationIconClass(item.notification_type);

  return (
    <button
      type="button"
      onClick={() => onClick?.(item)}
      className={cx(
        'flex w-full gap-3 text-left transition hover:bg-slate-800/80',
        compact ? 'px-4 py-3' : 'px-4 py-3.5',
        !item.is_read && 'bg-slate-800/40'
      )}
    >
      <div
        className={cx(
          'grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold',
          iconClass
        )}
      >
        {item.actor_name ? (
          <span className="text-[10px] text-white/90">{getActorInitials(item.actor_name)}</span>
        ) : (
          <Icon className="h-4 w-4" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p
          className={cx(
            'text-sm leading-snug text-slate-200',
            !item.is_read && 'font-semibold text-slate-50'
          )}
        >
          {item.content}
        </p>
        <p className="mt-1 text-[11px] text-slate-500">
          {formatNotificationTime(item.created_at)}
          {item.actor_name ? ` · ${item.actor_name}` : ''}
        </p>
      </div>
      {!item.is_read ? (
        <span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-violet-400" aria-hidden />
      ) : null}
    </button>
  );
}

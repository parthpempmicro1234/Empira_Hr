import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Bell, CheckCheck, ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import NotificationListItem from '../../components/notifications/NotificationListItem.jsx';
import { getNotificationRoute } from '../../components/notifications/notificationUtils';
import {
  getNotificationsPage,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../../services/notifications';

function cx(...classes) {
  return classes.filter(Boolean).join(' ');
}

const PAGE_SIZE_OPTIONS = [25, 50, 100];

export default function InboxNotificationsTab() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);

  const listQuery = useQuery({
    queryKey: ['notifications', 'inbox', page, pageSize],
    queryFn: () => getNotificationsPage({ page, page_size: pageSize }),
    staleTime: 20_000,
  });

  const data = listQuery.data;
  const items = data?.results ?? [];
  const totalCount = data?.count ?? 0;
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(totalCount / pageSize) || 1),
    [totalCount, pageSize]
  );

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const markOneMutation = useMutation({
    mutationFn: markNotificationAsRead,
    onSuccess: (_res, id) => {
      queryClient.setQueriesData({ queryKey: ['notifications'] }, (old) => {
        if (!old) return old;
        if (Array.isArray(old)) {
          return old.map((n) => (n.id === id ? { ...n, is_read: true } : n));
        }
        if (old.results) {
          return {
            ...old,
            results: old.results.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
          };
        }
        return old;
      });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread'] });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: markAllNotificationsAsRead,
    onSuccess: () => {
      queryClient.setQueriesData({ queryKey: ['notifications'] }, (old) => {
        if (!old) return old;
        if (Array.isArray(old)) return old.map((n) => ({ ...n, is_read: true }));
        if (old.results) {
          return { ...old, results: old.results.map((n) => ({ ...n, is_read: true })) };
        }
        return old;
      });
      queryClient.invalidateQueries({ queryKey: ['notifications', 'unread'] });
    },
  });

  const unreadOnPage = items.filter((n) => !n.is_read).length;

  const handleItemClick = async (item) => {
    if (!item.is_read) {
      try {
        await markOneMutation.mutateAsync(item.id);
      } catch {
        /* navigate anyway */
      }
    }
    navigate(getNotificationRoute(item));
  };

  const handlePageSizeChange = (e) => {
    setPageSize(Number(e.target.value));
    setPage(1);
  };

  const rangeStart = totalCount === 0 ? 0 : (page - 1) * pageSize + 1;
  const rangeEnd = Math.min(page * pageSize, totalCount);

  return (
    <div className="rounded-xl border border-[#2a3447] bg-[#151b2b] font-sans text-gray-100 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[#2a3447] px-4 py-3 sm:px-5">
        <div>
          <h2 className="text-sm font-semibold text-white">All notifications</h2>
          <p className="mt-0.5 text-xs text-gray-400">
            {totalCount > 0
              ? `Showing ${rangeStart}–${rangeEnd} of ${totalCount}`
              : 'No notifications yet'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs text-gray-400">
            <span className="whitespace-nowrap">Per page</span>
            <select
              value={pageSize}
              onChange={handlePageSizeChange}
              className="rounded-lg border border-[#2a3447] bg-[#1b2333] px-2 py-1.5 text-xs text-gray-100 focus:border-[#5746AF] focus:outline-none focus:ring-1 focus:ring-[#5746AF]/40"
            >
              {PAGE_SIZE_OPTIONS.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
          {unreadOnPage > 0 ? (
            <button
              type="button"
              disabled={markAllMutation.isPending}
              onClick={() => markAllMutation.mutate()}
              className="inline-flex items-center gap-1.5 rounded-lg border border-[#2a3447] bg-[#1b2333] px-3 py-1.5 text-xs font-semibold text-violet-300 transition hover:bg-[#232d42] disabled:opacity-50"
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
      </div>

      <div className="min-h-[200px]">
        {listQuery.isLoading ? (
          <div className="divide-y divide-[#2a3447]">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="flex animate-pulse gap-3 px-4 py-4">
                <div className="h-9 w-9 rounded-full bg-[#2a3447]" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 w-3/4 rounded bg-[#2a3447]" />
                  <div className="h-2 w-1/3 rounded bg-[#2a3447]/70" />
                </div>
              </div>
            ))}
          </div>
        ) : listQuery.isError ? (
          <div className="px-4 py-12 text-center">
            <p className="text-sm text-gray-400">Unable to load notifications.</p>
            <button
              type="button"
              onClick={() => listQuery.refetch()}
              className="mt-3 text-xs font-semibold text-violet-300 hover:underline"
            >
              Retry
            </button>
          </div>
        ) : items.length === 0 ? (
          <div className="px-4 py-14 text-center">
            <Bell className="mx-auto h-9 w-9 text-gray-600" />
            <p className="mt-3 text-sm font-medium text-gray-300">No notifications yet</p>
            <p className="mt-1 text-xs text-gray-500">
              Leave updates, mentions, and feed activity will appear here.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-[#2a3447]">
            {items.map((item) => (
              <li key={item.id}>
                <NotificationListItem item={item} onClick={handleItemClick} />
              </li>
            ))}
          </ul>
        )}
      </div>

      {totalCount > 0 ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#2a3447] px-4 py-3 sm:px-5">
          <p className="text-xs text-gray-400">
            Page {page} of {totalPages}
          </p>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || listQuery.isFetching}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className={cx(
                'inline-flex items-center gap-1 rounded-lg border border-[#2a3447] px-3 py-1.5 text-xs font-semibold transition',
                page <= 1
                  ? 'cursor-not-allowed text-gray-600'
                  : 'text-gray-200 hover:bg-[#1b2333]'
              )}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages || !data?.next || listQuery.isFetching}
              onClick={() => setPage((p) => p + 1)}
              className={cx(
                'inline-flex items-center gap-1 rounded-lg border border-[#2a3447] px-3 py-1.5 text-xs font-semibold transition',
                page >= totalPages || !data?.next
                  ? 'cursor-not-allowed text-gray-600'
                  : 'text-gray-200 hover:bg-[#1b2333]'
              )}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

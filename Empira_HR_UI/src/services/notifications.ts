import { api } from './api';

export interface NotificationItem {
  id: number;
  actor_id: number | null;
  actor_name: string | null;
  notification_type: string;
  content: string;
  is_read: boolean;
  data: Record<string, unknown>;
  created_at: string;
}

export interface UnreadCountResponse {
  unread_count: number;
}

export interface MarkReadResponse {
  status?: string;
  message?: string;
}

export interface PaginatedNotificationsResponse {
  count: number;
  next: string | null;
  previous: string | null;
  results: NotificationItem[];
}

export interface GetNotificationsPageParams {
  page?: number;
  page_size?: number;
}

const DEFAULT_PAGE_SIZE = 50;

function normalizePaginatedResponse(
  data: unknown,
  page: number,
  pageSize: number
): PaginatedNotificationsResponse {
  if (Array.isArray(data)) {
    return {
      count: data.length,
      next: null,
      previous: null,
      results: data,
    };
  }
  const raw = data as Partial<PaginatedNotificationsResponse> | null;
  const results = Array.isArray(raw?.results) ? raw.results : [];
  return {
    count: typeof raw?.count === 'number' ? raw.count : results.length,
    next: raw?.next ?? null,
    previous: raw?.previous ?? null,
    results,
  };
}

export async function getNotificationsPage(
  params: GetNotificationsPageParams = {}
): Promise<PaginatedNotificationsResponse> {
  const page = params.page ?? 1;
  const page_size = params.page_size ?? DEFAULT_PAGE_SIZE;
  const res = await api.get<NotificationItem[] | PaginatedNotificationsResponse>('notifications/', {
    params: { page, page_size },
  });
  return normalizePaginatedResponse(res.data, page, page_size);
}

/** First page preview (bell dropdown). */
export async function getNotifications(): Promise<NotificationItem[]> {
  const { results } = await getNotificationsPage({ page: 1, page_size: DEFAULT_PAGE_SIZE });
  return results;
}

export async function getNotification(id: number | string): Promise<NotificationItem> {
  const res = await api.get<NotificationItem>(`notifications/${id}/`);
  return res.data;
}

export async function getUnreadNotificationCount(): Promise<number> {
  const res = await api.get<UnreadCountResponse>('notifications/unread_count/');
  return Number(res.data?.unread_count ?? 0) || 0;
}

export async function markNotificationAsRead(id: number | string): Promise<MarkReadResponse> {
  const res = await api.post<MarkReadResponse>(`notifications/${id}/mark_as_read/`, {});
  return res.data;
}

export async function markAllNotificationsAsRead(): Promise<MarkReadResponse> {
  const res = await api.post<MarkReadResponse>('notifications/mark_all_as_read/', {});
  return res.data;
}

import apiFetch from './api';
import type { NotificationItem } from '@/components/common/NotificationCard';

interface NotificationListResponse { data: { notifications: NotificationItem[] } }
interface UnreadCountResponse { data: { count: number } }
interface NotificationResponse { data: { notification: NotificationItem } }

export async function getNotifications({ skip = 0, limit = 20 } = {}) {
  const data = await apiFetch<NotificationListResponse>(`/notifications?skip=${skip}&limit=${limit}`, { method: 'GET' });
  return data.data.notifications;
}

export async function getUnreadCount() {
  const data = await apiFetch<UnreadCountResponse>('/notifications/unread/count', { method: 'GET' });
  return data.data.count;
}

export async function markRead(id: string) {
  const data = await apiFetch<NotificationResponse>(`/notifications/${id}/read`, { method: 'PATCH' });
  return data.data.notification;
}

export async function markAllRead() {
  const res = await apiFetch('/notifications/mark-all-read', { method: 'PATCH' });
  return res.data;
}

export async function deleteNotification(id: string) {
  const res = await apiFetch(`/notifications/${id}`, { method: 'DELETE' });
  return res.data;
}

export async function deleteAllNotifications() {
  const res = await apiFetch('/notifications', { method: 'DELETE' });
  return res.data;
}

interface CreateNotificationPayload {
  userId: string;
  actorId?: string;
  type: string;
  title: string;
  body?: string;
  data?: Record<string, unknown>;
}

export async function createNotification(payload: CreateNotificationPayload) {
  const data = await apiFetch<NotificationResponse>('/notifications', { method: 'POST', body: JSON.stringify(payload) });
  return data.data.notification;
}

export default { getNotifications, getUnreadCount, markRead, markAllRead, createNotification };

import apiFetch from './api';

export async function getNotifications({ skip = 0, limit = 20 } = {}) {
  const data = await apiFetch<any>(`/notifications?skip=${skip}&limit=${limit}`, { method: 'GET' });
  return data.data.notifications;
}

export async function getUnreadCount() {
  const data = await apiFetch<any>('/notifications/unread/count', { method: 'GET' });
  return data.data.count;
}

export async function markRead(id: string) {
  const data = await apiFetch<any>(`/notifications/${id}/read`, { method: 'PATCH' });
  return data.data.notification;
}

export async function markAllRead() {
  const data = await apiFetch<any>('/notifications/mark-all-read', { method: 'PATCH' });
  return data;
}

export async function createNotification(payload: any) {
  const data = await apiFetch<any>('/notifications', { method: 'POST', body: JSON.stringify(payload) });
  return data.data.notification;
}

export default { getNotifications, getUnreadCount, markRead, markAllRead, createNotification };

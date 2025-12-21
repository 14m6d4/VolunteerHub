import { useState, useEffect, useCallback } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import * as notificationService from '@/services/notification.service';

type UseNotificationsReturn = {
  unreadCount: number;
  notifications: any[];
  isOpen: boolean;
  openPanel: () => Promise<void>;
  closePanel: () => void;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
  deleteNotification: (id: string) => Promise<void>;
  deleteAllNotifications: () => Promise<void>;
  refetch: () => Promise<any>;
};

export default function useNotifications(): UseNotificationsReturn {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);

  const unreadQuery = useQuery({
    queryKey: ['notifications', 'unreadCount'],
    queryFn: () => notificationService.getUnreadCount(),
    refetchInterval: 30000,
    enabled: Boolean(localStorage.getItem('accessToken')),
  });

  const listQuery = useQuery({
    queryKey: ['notifications', 'list'],
    queryFn: () => notificationService.getNotifications({ skip: 0, limit: 20 }),
    enabled: false,
  });

  useEffect(() => {
    const onToken = () => {
      unreadQuery.refetch();
    };
    window.addEventListener('authTokenChanged', onToken);
    return () => window.removeEventListener('authTokenChanged', onToken);
  }, [unreadQuery]);

  const openPanel = useCallback(async () => {
    setOpen(true);
    await listQuery.refetch();
    await unreadQuery.refetch();
  }, [listQuery, unreadQuery]);

  const closePanel = useCallback(() => setOpen(false), []);

  const markRead = useCallback(async (id: string) => {
    await notificationService.markRead(id);
    await listQuery.refetch();
    await unreadQuery.refetch();
    qc.invalidateQueries({ queryKey: ['notifications', 'list'] });
    qc.invalidateQueries({ queryKey: ['notifications', 'unreadCount'] });
  }, [listQuery, unreadQuery, qc]);

  const markAllRead = useCallback(async () => {
    await notificationService.markAllRead();
    await listQuery.refetch();
    await unreadQuery.refetch();
    qc.invalidateQueries({ queryKey: ['notifications', 'list'] });
    qc.invalidateQueries({ queryKey: ['notifications', 'unreadCount'] });
  }, [listQuery, unreadQuery, qc]);

  const deleteNotification = useCallback(async (id: string) => {
    await notificationService.deleteNotification(id);
    await listQuery.refetch();
    await unreadQuery.refetch();
    qc.invalidateQueries({ queryKey: ['notifications', 'list'] });
    qc.invalidateQueries({ queryKey: ['notifications', 'unreadCount'] });
  }, [listQuery, unreadQuery, qc]);

  const deleteAllNotifications = useCallback(async () => {
    if (!window.confirm('Are you sure you want to delete all notifications?')) return;
    await notificationService.deleteAllNotifications();
    await listQuery.refetch();
    await unreadQuery.refetch();
    qc.invalidateQueries({ queryKey: ['notifications', 'list'] });
    qc.invalidateQueries({ queryKey: ['notifications', 'unreadCount'] });
  }, [listQuery, unreadQuery, qc]);

  return {
    unreadCount: unreadQuery.data || 0,
    notifications: listQuery.data || [],
    isOpen: open,
    openPanel,
    closePanel,
    markRead,
    markAllRead,
    deleteNotification,
    deleteAllNotifications,
    refetch: listQuery.refetch,
  };
}

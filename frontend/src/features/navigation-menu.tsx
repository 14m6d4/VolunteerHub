"use client";

import { useNavigate } from "react-router-dom";
import useAuth from "@/hooks/useAuth";
import { Navbar01 } from "@/components/common/Navbar";
import useNotifications from '@/hooks/useNotifications';

export default function NavBar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const notifications = useNotifications();

  // eslint-disable-next-line no-console
  console.log('[NavBar] Rendering with user:', user ? (user.username || user.email) : 'null', 'unread:', notifications.unreadCount);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleNotificationClick = () => {
    if (notifications.isOpen) notifications.closePanel();
    else notifications.openPanel();
  };

  return (
    <div className="relative w-full h-16">
      <Navbar01
        user={user}
        onLogout={handleLogout}
        onNotificationClick={handleNotificationClick}
        hasNotifications={notifications.unreadCount > 0}
        notificationDropdownOpen={notifications.isOpen}
        notifications={notifications.notifications}
        onMarkAllRead={notifications.markAllRead}
        onMarkRead={notifications.markRead}
      />
    </div>
  );
}

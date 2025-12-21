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
    navigate("/feed");
  };

  const handleNotificationClick = () => {
    if (notifications.isOpen) notifications.closePanel();
    else notifications.openPanel();
  };

  const getLinks = () => {
    const commonLinks = [
      { href: "/feed", label: "Home" },
    ];

    // Default/Guest links
    if (!user) {
      return [
        { href: "/", label: "Home" },
        { href: "/events", label: "Events" }, // Public events
        { href: "/users", label: "Users" }, // Public users?
        { href: "/about", label: "About" },
      ];
    }

    if (user.role === 'manager') {
      return [
        ...commonLinks,
        { href: "/manage-events", label: "Events Management" },
        { href: "/users", label: "Users" },
        { href: "/about", label: "About" },
      ];
    }

    // Volunteer and Admin share the same structure as per request
    // Admin: Home (/feed), Events (/events), Users (/users), About
    // Volunteer: Home (/feed), Events (/events), Users (/users), About
    return [
      ...commonLinks,
      { href: "/events", label: "Events" },
      { href: "/users", label: "Users" },
      { href: "/about", label: "About" },
    ];
  };

  return (
    <div className="relative w-full h-16">
      <Navbar01
        user={user}
        navigationLinks={getLinks()}
        onLogout={handleLogout}
        onNotificationClick={handleNotificationClick}
        hasNotifications={notifications.unreadCount > 0}
        notificationDropdownOpen={notifications.isOpen}
        notifications={notifications.notifications}
        onMarkAllRead={notifications.markAllRead}
        onMarkRead={notifications.markRead}
        onDeleteNotification={notifications.deleteNotification}
        onDeleteAllNotifications={notifications.deleteAllNotifications}
      />
    </div>
  );
}

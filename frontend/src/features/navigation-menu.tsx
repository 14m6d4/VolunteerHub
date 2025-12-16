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
      />

      {/* Notification dropdown */}
      {notifications.isOpen && (
        <div className="absolute right-4 top-14 w-80 bg-white border rounded shadow-lg z-50">
          <div className="p-2 border-b flex justify-between items-center">
            <strong>Notifications</strong>
            <button className="text-xs text-muted-foreground" onClick={() => notifications.markAllRead()}>Mark all read</button>
          </div>
          <div className="max-h-64 overflow-auto">
            {notifications.notifications.length === 0 && (
              <div className="p-4 text-sm text-muted-foreground">No notifications</div>
            )}
            {notifications.notifications.map((n: any) => (
              <div key={n._id} className={`p-3 border-b hover:bg-slate-50 cursor-pointer ${n.isRead ? 'opacity-70' : ''}`} onClick={() => notifications.markRead(n._id)}>
                <div className="font-medium">{n.title}</div>
                {n.body && <div className="text-xs text-muted-foreground">{n.body}</div>}
                <div className="text-xs text-muted-foreground mt-1">{new Date(n.createdAt).toLocaleString()}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

"use client";

import { useNavigate } from "react-router-dom";
import useAuth from "@/hooks/useAuth";
import { Navbar01 } from "@/components/common/Navbar";

export default function NavBar() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  
  // eslint-disable-next-line no-console
  console.log('[NavBar] Rendering with user:', user ? (user.username || user.email) : 'null');

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleNotificationClick = () => {
    console.log("Notifications clicked");
    // Add your notification logic here
  };

  return (
    <div className="relative w-full h-16\">
      <Navbar01
        user={user}
        onLogout={handleLogout}
        onNotificationClick={handleNotificationClick}
        hasNotifications={true}
      /> as any
    </div>
  );
}

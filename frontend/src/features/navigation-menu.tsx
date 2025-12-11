"use client";

import { useContext } from "react";
import { useNavigate } from "react-router-dom";
import "../../styles.css";
import { AuthContext } from "../../context/AuthContext";
import { Navbar01 } from "@/components/common/Navbar";

export default function NavBar() {
  const navigate = useNavigate();
  const { user, logout } = useContext(AuthContext);

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleNotificationClick = () => {
    console.log("Notifications clicked");
    // Add your notification logic here
  };

  // Check for token in localStorage
  const isLoggedIn = Boolean(localStorage.getItem("token"));

  return (
    <div className="relative w-full h-16">
      <Navbar01
        user={user}
        onLogout={handleLogout}
        onNotificationClick={handleNotificationClick}
        hasNotifications={true}
      />
    </div>
  );
}

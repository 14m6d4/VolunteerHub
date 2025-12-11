import { createContext, useState, useEffect } from "react";

export const AuthContext = createContext();

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || "http://localhost:3000";

export default function AuthProvider({ children }) {
  // Sử dụng key "token" để đồng bộ với Login.jsx và các file khác
  const [token, setToken] = useState(localStorage.getItem("token"));
  const [user, setUser] = useState(null);

  // Fetch user profile khi có token
  useEffect(() => {
    async function fetchUser() {
      if (!token) {
        setUser(null);
        return;
      }

      try {
        // FIX 1: Sử dụng full URL BACKEND_URL
        const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();

          // FIX 2: Map dữ liệu từ Backend (fullname, username) sang format Navbar cần (name, email)
          const mappedUser = {
            ...data,
            name: data.fullname,
            email: data.username,
            avatar: data.avatarUrl,
          };

          setUser(mappedUser);
        } else {
          // Token hết hạn hoặc không hợp lệ
          console.log("Token invalid, logging out...");
          setToken(null);
          localStorage.removeItem("token");
          setUser(null);
        }
      } catch (err) {
        console.error("Error fetching user:", err);
      }
    }

    fetchUser();
  }, [token]);

  function login(newToken) {
    setToken(newToken);
    localStorage.setItem("token", newToken);
  }

  function logout() {
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
  }

  return (
    <AuthContext.Provider value={{ user, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

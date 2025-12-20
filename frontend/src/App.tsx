import AdminGuard from "@/components/auth/AdminGuard";
import "./App.css"
// Theme CSS files are now loaded dynamically by theme-provider
import { BrowserRouter, Routes, Route, Outlet, useSearchParams, Navigate } from "react-router-dom"
import { ThemeProvider } from "@/components/theme-provider"
import LoginPage from "@/pages/auth/Login"
import BannedPage from "@/pages/auth/Banned"
import SignupPage from "./pages/auth/Register"
import PasswordResetPage from "./pages/auth/PasswordReset"
import UserProfilePage from "@/pages/[username]"
import EventsTest from "./pages/test/TestRouter";
import FriendsPage from '@/pages/Friends';
import SearchUsersPage from '@/pages/SearchUsers';
import AdminReportsPage from "@/pages/admin/Reports";
import AdminUsersPage from "@/pages/admin/Users";
// New Admin Dashboard imports
import AdminLayout from "@/pages/admin/AdminLayout";
import UsersManagement from "@/pages/admin/UsersManagement";
import EventsManagement from "@/pages/admin/EventsManagement";
import ReportsManagement from "@/pages/admin/ReportsManagement";
import AnalyticsDashboard from "@/pages/admin/AnalyticsDashboard";
import { EventsList } from "@/pages/EventsList";
import { ManagerEventDashboard } from "@/pages/manager/ManagerEventDashboard";
import DiscussionPage from "@/pages/discussion/Discussion";
import FeedPage from "@/pages/Feed";
import Error404 from "./components/errors/404"
import Error500 from "./components/errors/500"
import Error503 from "./components/errors/503"
import Error403 from "./components/errors/403"
import Error401 from "./components/errors/401"
import Footer from "@/components/common/Footer"
import NavBar from "@/features/navigation-menu"
import { useEffect } from "react"
import * as authService from "@/services/auth.service"
import QueryProvider from "./providers/QueryProvider"
import { AuthProvider } from "@/context/AuthContext"

function HomePage() {
  const [searchParams] = useSearchParams()

  useEffect(() => {
    // If accessToken in URL (from Google OAuth redirect), store it
    const accessToken = searchParams.get('accessToken')
    if (accessToken) {
      // eslint-disable-next-line no-console
      console.log('[HomePage] Captured accessToken from URL:', accessToken.substring(0, 20) + '...');
      authService.setAuthToken(accessToken)
      // Clean URL by redirecting without params
      window.history.replaceState({}, document.title, '/')
    } else {
      // eslint-disable-next-line no-console
      console.log('[HomePage] No accessToken in URL params');
    }
  }, [searchParams])

  return (
    <header className="w-full flex justify-end p-4">
      {/* ModeToggle moved to NavBar */}
    </header>
  )
}

function AppContent() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Routes>
        {/* Nhóm các trang CÓ NavBar và Footer */}
        <Route
          element={
            <>
              <NavBar />
              <main className="flex-1">
                <Outlet />
              </main>
              <Footer />
            </>
          }
        >
          <Route path="/" element={<HomePage />} />
          {/* Thêm các route chính khác cần footer vào đây */}
          <Route path="/feed" element={<FeedPage />} />
          <Route path="/feed/events/:eventId/posts/:postId" element={<FeedPage />} />
          <Route path="/events" element={<EventsList />} />
          <Route path="/events" element={<EventsList />} />
          <Route path="/events/:eventId" element={<DiscussionPage />} />
          <Route path="/events/:eventId/posts/:postId" element={<DiscussionPage />} />
          <Route path="/manage-events" element={<ManagerEventDashboard />} />
          <Route path="/manage-events" element={<ManagerEventDashboard />} />
          {/* <Route path="/test/events" element={<EventsTest />} /> */}
          <Route path="/u" element={<FriendsPage />} />
          <Route path="/search" element={<SearchUsersPage />} />

          {/* Legacy admin routes */}
          <Route element={<AdminGuard />}>
            <Route path="/admin/reports" element={<AdminReportsPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
          </Route>

          <Route path="/u/:username" element={<UserProfilePage />} />
        </Route>

        {/* New Admin Dashboard with Sidebar Layout */}
        <Route
          element={
            <>
              <NavBar />
              <AdminGuard />
            </>
          }
        >
          <Route path="/manage" element={<AdminLayout />}>
            <Route index element={<Navigate to="/manage/users" replace />} />
            <Route path="users" element={<UsersManagement />} />
            <Route path="events" element={<EventsManagement />} />
            <Route path="reports" element={<ReportsManagement />} />
            <Route path="analytics" element={<AnalyticsDashboard />} />
          </Route>
        </Route>

        {/* Nhóm các trang KHÔNG CÓ NavBar và Footer */}
        <Route
          element={
            <main className="flex-1">
              <Outlet />
            </main>
          }
        >
          <Route path="/login" element={<LoginPage />} />
          <Route path="/banned" element={<BannedPage />} />
          <Route path="/register" element={<SignupPage />} />
          <Route path="/password_reset" element={<PasswordResetPage />} />
          <Route path="500" element={<Error500 />} />
          <Route path="503" element={<Error503 />} />
          <Route path="403" element={<Error403 />} />
          <Route path="401" element={<Error401 />} />
          <Route path="*" element={<Error404 />} />
          <Route path="/test/EventsTest" element={<EventsTest />} />
        </Route>
      </Routes>
    </div>
  )
}

function App() {
  return (

    <QueryProvider>
      <AuthProvider>
        <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
          <BrowserRouter>
            <AppContent />
          </BrowserRouter>
        </ThemeProvider>
      </AuthProvider>
    </QueryProvider>
  )
}

export default App

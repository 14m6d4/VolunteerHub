import "./App.css"
import { BrowserRouter, Routes, Route, Outlet } from "react-router-dom"
import { ThemeProvider } from "@/components/theme-provider"
import { ModeToggle } from "@/components/mode-toggle"
import LoginPage from "@/pages/auth/Login"
import SignupPage from "./pages/auth/Register"
import PasswordResetPage from "./pages/auth/PasswordReset"
import Error404 from "./components/errors/404"
import Error500 from "./components/errors/500"
import Error503 from "./components/errors/503"
import Error403 from "./components/errors/403"
import Error401 from "./components/errors/401"
import Footer from "@/components/common/Footer"

function AppContent() {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <Routes>
        {/* Nhóm các trang CÓ Footer */}
        <Route
          element={
            <>
              <main className="flex-1">
                <Outlet />
              </main>
              <Footer />
            </>
          }
        >
          <Route
            path="/"
            element={
              <header className="w-full flex justify-end p-4">
                <ModeToggle />
              </header>
            }
          />
          {/* Thêm các route chính khác cần footer vào đây */}
        </Route>

        {/* Nhóm các trang KHÔNG CÓ Footer */}
        <Route
          element={
            <main className="flex-1">
              <Outlet />
            </main>
          }
        >
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<SignupPage />} />
          <Route path="/password_reset" element={<PasswordResetPage />} />
          <Route path="500" element={<Error500 />} />
          <Route path="503" element={<Error503 />} />
          <Route path="403" element={<Error403 />} />
          <Route path="401" element={<Error401 />} />
          <Route path="*" element={<Error404 />} />
        </Route>
      </Routes>
    </div>
  )
}

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App

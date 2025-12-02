import "./App.css"
import { BrowserRouter, Routes, Route } from "react-router-dom"
import { ThemeProvider } from "@/components/theme-provider"
import { ModeToggle } from "@/components/mode-toggle"
import LoginPage from "@/pages/auth/Login"
import SignupPage from "./pages/auth/Register"
import PasswordResetPage from "./pages/auth/PasswordReset"
import EventsTest from "./pages/test/EventsTest";

function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="vite-ui-theme">
      <BrowserRouter>
        <div className="min-h-screen bg-background text-foreground flex flex-col">
          <main className="flex-1">
            <Routes>
              <Route
                path="/"
                element={
                  <header className="w-full flex justify-end p-4">
                    <ModeToggle />
                  </header>
                }
              />
              <Route path="/login" element={<LoginPage />} />
              <Route path="/register" element={<SignupPage />} />
              <Route path="/password_reset" element={<PasswordResetPage />} />
              <Route path="/test/events" element={<EventsTest />} />
            </Routes>
          </main>
        </div>
      </BrowserRouter>
    </ThemeProvider>
  )
}

export default App

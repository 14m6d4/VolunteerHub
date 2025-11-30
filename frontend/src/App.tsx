import './App.css'
import { ThemeProvider } from "@/components/theme-provider"
import { ModeToggle } from "@/components/mode-toggle"

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <div className="min-h-screen p-4">
        <div className="flex justify-end mb-4">
          <ModeToggle />
        </div>
        <main>
          <div className="h-screen flex items-center justify-center">
            <h1 className="text-3xl font-bold underline">
              Hello, Vite + React!
            </h1>
          </div>
        </main>
      </div>
    </ThemeProvider>
  )
}
 
export default App

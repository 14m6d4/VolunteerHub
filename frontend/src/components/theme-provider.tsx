import { createContext, useContext, useEffect, useState } from "react"
import { loadGoogleFonts } from "@/utils/font-loader"

type Theme = "dark" | "light" | "system"
type CustomTheme = "default" | "vintage-paper" | "neo-brutalism" | "doom-64" | "nature" | "everforest" | "bubblegum" | "perpetuity" | "notebook"

type ThemeProviderProps = {
  children: React.ReactNode
  defaultTheme?: Theme
  defaultCustomTheme?: CustomTheme
  storageKey?: string
  customThemeStorageKey?: string
}

type ThemeProviderState = {
  theme: Theme
  setTheme: (theme: Theme) => void
  customTheme: CustomTheme
  setCustomTheme: (theme: CustomTheme) => void
}

const initialState: ThemeProviderState = {
  theme: "system",
  setTheme: () => null,
  customTheme: "default",
  setCustomTheme: () => null,
}

const THEME_STYLE_ID = "dynamic-theme-style"

const themeModules: Record<Exclude<CustomTheme, "default">, () => Promise<{ default: string }>> = {
  "vintage-paper": () => import("@/styles/themes/vintage-paper.css?inline"),
  "neo-brutalism": () => import("@/styles/themes/neo-brutalism.css?inline"),
  "doom-64": () => import("@/styles/themes/doom-64.css?inline"),
  "nature": () => import("@/styles/themes/nature.css?inline"),
  "everforest": () => import("@/styles/themes/everforest.css?inline"),
  "bubblegum": () => import("@/styles/themes/bubblegum.css?inline"),
  "perpetuity": () => import("@/styles/themes/perpetuity.css?inline"),
  "notebook": () => import("@/styles/themes/notebook.css?inline"),
}

async function loadThemeStylesheet(theme: CustomTheme) {
  const existingStyle = document.getElementById(THEME_STYLE_ID)
  if (existingStyle) {
    existingStyle.remove()
  }

  loadGoogleFonts(theme)

  if (theme === "default") {
    return
  }

  try {
    const themeModule = await themeModules[theme]()
    const style = document.createElement("style")
    style.id = THEME_STYLE_ID
    style.textContent = themeModule.default
    document.head.appendChild(style)
  } catch (error) {
    console.error(`Failed to load theme: ${theme}`, error)
  }
}

export const ThemeProviderContext = createContext<ThemeProviderState>(initialState)

export function ThemeProvider({
  children,
  defaultTheme = "system",
  defaultCustomTheme = "default",
  storageKey = "vite-ui-theme",
  customThemeStorageKey = "vite-ui-custom-theme",
  ...props
}: ThemeProviderProps) {
  const [theme, setTheme] = useState<Theme>(
    () => (localStorage.getItem(storageKey) as Theme) || defaultTheme
  )
  
  const [customTheme, setCustomTheme] = useState<CustomTheme>(
    () => (localStorage.getItem(customThemeStorageKey) as CustomTheme) || defaultCustomTheme
  )
  
  const [isThemeLoaded, setIsThemeLoaded] = useState(false)

  useEffect(() => {
    const root = window.document.documentElement

    root.classList.remove("light", "dark")

    if (theme === "system") {
      const systemTheme = window.matchMedia("(prefers-color-scheme: dark)")
        .matches
        ? "dark"
        : "light"

      root.classList.add(systemTheme)
      return
    }

    root.classList.add(theme)
  }, [theme])

  useEffect(() => {
    const root = window.document.documentElement
    
    loadThemeStylesheet(customTheme).then(() => {
      setIsThemeLoaded(true)
    })
    
    if (customTheme === "default") {
      root.removeAttribute("data-theme")
    } else {
      root.setAttribute("data-theme", customTheme)
    }
  }, [customTheme])

  useEffect(() => {
    const savedTheme = localStorage.getItem(customThemeStorageKey) as CustomTheme
    if (savedTheme && savedTheme !== "default") {
      loadThemeStylesheet(savedTheme)
    }
  }, [customThemeStorageKey])

  const value = {
    theme,
    setTheme: (theme: Theme) => {
      localStorage.setItem(storageKey, theme)
      setTheme(theme)
    },
    customTheme,
    setCustomTheme: (theme: CustomTheme) => {
      localStorage.setItem(customThemeStorageKey, theme)
      setCustomTheme(theme)
    }
  }

  return (
    <ThemeProviderContext.Provider {...props} value={value}>
      {children}
    </ThemeProviderContext.Provider>
  )
}

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}
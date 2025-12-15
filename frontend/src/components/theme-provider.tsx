import { createContext, useContext, useEffect, useState } from "react"

type Theme = "dark" | "light" | "system"
type CustomTheme = "default" | "vintage-paper" | "neo-brutalism" | "doom-64"

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
    if (customTheme === "default") {
        root.removeAttribute("data-theme")
    } else {
        root.setAttribute("data-theme", customTheme)
    }
  }, [customTheme])

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
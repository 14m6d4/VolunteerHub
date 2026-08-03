import { createContext, useContext } from "react"

export type Theme = "dark" | "light" | "system"
export type CustomTheme = "default" | "vintage-paper" | "neo-brutalism" | "doom-64" | "nature" | "everforest" | "bubblegum" | "perpetuity" | "notebook"

export type ThemeProviderState = {
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

export const useTheme = () => {
  const context = useContext(ThemeProviderContext)

  if (context === undefined)
    throw new Error("useTheme must be used within a ThemeProvider")

  return context
}

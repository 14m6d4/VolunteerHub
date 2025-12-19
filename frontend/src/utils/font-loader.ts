const GOOGLE_FONTS_LINK_ID = "dynamic-google-fonts"

// Map of theme fonts to their Google Fonts names
const themeFonts: Record<string, string[]> = {
  "default": [],
  "vintage-paper": ["Libre Baskerville", "IBM Plex Mono", "Lora"],
  "neo-brutalism": ["DM Sans", "Space Mono"],
  "doom-64": ["Oxanium", "Source Code Pro"],
  "nature": ["Montserrat", "Source Code Pro", "Merriweather"],
  "everforest": ["IBM Plex Sans", "IBM Plex Mono", "IBM Plex Serif"],
  "bubblegum": ["Poppins", "Fira Code", "Lora"],
  "perpetuity": ["Source Code Pro"],
  "notebook": ["Architects Daughter", "Fira Code"],
}

// Fonts that are typically available as system fonts (no need to load)
const systemFonts = [
  "sans-serif",
  "serif",
  "monospace",
  "ui-serif",
  "Georgia",
  "Cambria",
  "Times New Roman",
  "Times",
  "Courier New",
  "Courier",
]

export function loadGoogleFonts(themeId: string): void {
  // Remove existing Google Fonts link
  const existingLink = document.getElementById(GOOGLE_FONTS_LINK_ID)
  if (existingLink) {
    existingLink.remove()
  }

  const fonts = themeFonts[themeId]
  if (!fonts || fonts.length === 0) {
    return
  }

  // Filter out system fonts
  const fontsToLoad = fonts.filter(
    (font) => !systemFonts.some((sf) => font.toLowerCase().includes(sf.toLowerCase()))
  )

  if (fontsToLoad.length === 0) {
    return
  }

  // Build Google Fonts URL
  const fontFamilies = fontsToLoad
    .map((font) => {
      // Format font name for URL (replace spaces with +)
      const formattedFont = font.replace(/\s+/g, "+")
      // Request multiple weights for flexibility
      return `family=${formattedFont}:wght@400;500;600;700`
    })
    .join("&")

  const googleFontsUrl = `https://fonts.googleapis.com/css2?${fontFamilies}&display=swap`

  // Create and append link element
  const link = document.createElement("link")
  link.id = GOOGLE_FONTS_LINK_ID
  link.rel = "stylesheet"
  link.href = googleFontsUrl
  document.head.appendChild(link)
}

export function preloadGoogleFonts(themeId: string): void {
  const fonts = themeFonts[themeId]
  if (!fonts || fonts.length === 0) {
    return
  }

  const fontsToLoad = fonts.filter(
    (font) => !systemFonts.some((sf) => font.toLowerCase().includes(sf.toLowerCase()))
  )

  if (fontsToLoad.length === 0) {
    return
  }

  const fontFamilies = fontsToLoad
    .map((font) => {
      const formattedFont = font.replace(/\s+/g, "+")
      return `family=${formattedFont}:wght@400;500;600;700`
    })
    .join("&")

  const googleFontsUrl = `https://fonts.googleapis.com/css2?${fontFamilies}&display=swap`

  // Preload the fonts
  const preloadLink = document.createElement("link")
  preloadLink.rel = "preload"
  preloadLink.as = "style"
  preloadLink.href = googleFontsUrl
  document.head.appendChild(preloadLink)
}

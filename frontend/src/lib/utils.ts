import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const COVER_PLACEHOLDER = "/event-cover-placeholder.svg"

/** An event's cover image, or the bundled placeholder when it has none. */
export function coverImageUrl(url?: string | null) {
  return url || COVER_PLACEHOLDER
}

/** `onError` for a cover image <img>: swap a file that failed to load for the placeholder. */
export function showCoverPlaceholder(e: React.SyntheticEvent<HTMLImageElement>) {
  const img = e.currentTarget
  if (!img.src.endsWith(COVER_PLACEHOLDER)) img.src = COVER_PLACEHOLDER
}

import { useSyncExternalStore } from "react"

const STORAGE_KEY = "imgedit-theme"
const DARK_CLASS = "dark"
const mediaQueryList =
  typeof window === "undefined"
    ? null
    : window.matchMedia("(prefers-color-scheme: dark)")
const listeners = new Set<() => void>()

export type Theme = "light" | "dark"

export const THEME_BOOTSTRAP_SCRIPT = `(() => {
  const storageKey = "${STORAGE_KEY}";
  const darkClass = "${DARK_CLASS}";
  const stored = window.localStorage.getItem(storageKey);
  const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  const theme = stored === "dark" || stored === "light"
    ? stored
    : prefersDark
      ? "dark"
      : "light";

  document.documentElement.classList.toggle(darkClass, theme === "dark");
})();`

function readStoredTheme(): Theme | null {
  if (typeof window === "undefined") {
    return null
  }

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    return stored === "dark" || stored === "light" ? stored : null
  } catch {
    return null
  }
}

function readSystemTheme(): Theme {
  return mediaQueryList?.matches ? "dark" : "light"
}

function getThemeSnapshot(): Theme {
  if (typeof document === "undefined") {
    return "light"
  }

  return readStoredTheme() ?? readSystemTheme()
}

function notifyThemeChange() {
  for (const listener of listeners) {
    listener()
  }
}

function subscribeTheme(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function setTheme(theme: Theme) {
  if (typeof document === "undefined") {
    return
  }

  document.documentElement.classList.toggle(DARK_CLASS, theme === "dark")

  try {
    window.localStorage.setItem(STORAGE_KEY, theme)
  } catch {
    // no-op
  }

  notifyThemeChange()
}

export function useTheme() {
  return useSyncExternalStore(subscribeTheme, getThemeSnapshot, () => "light")
}

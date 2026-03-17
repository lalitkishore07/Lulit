const KEY = "lulit-ui-preferences";

export const defaultPreferences = {
  motionEffects: true,
  compactMode: false,
  autoRefreshFeed: false,
  blurSensitiveMedia: false
};

export function loadPreferences() {
  if (typeof window === "undefined") return defaultPreferences;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return defaultPreferences;
    const parsed = JSON.parse(raw);
    return { ...defaultPreferences, ...parsed };
  } catch {
    return defaultPreferences;
  }
}

export function savePreferences(preferences) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(KEY, JSON.stringify(preferences));
}

export function applyPreferences(preferences) {
  if (typeof document === "undefined") return;
  const root = document.documentElement;
  root.setAttribute("data-motion", preferences.motionEffects ? "full" : "reduced");
  root.setAttribute("data-density", preferences.compactMode ? "compact" : "comfortable");
  root.setAttribute("data-sensitive-media", preferences.blurSensitiveMedia ? "blur" : "off");
}


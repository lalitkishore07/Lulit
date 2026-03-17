import AsyncStorage from "@react-native-async-storage/async-storage";

export const PREFERENCES_KEY = "lulit_preferences";

export const defaultPreferences = {
  autoRefreshFeed: false,
  blurSensitiveMedia: false
};

export async function loadPreferences() {
  try {
    const raw = await AsyncStorage.getItem(PREFERENCES_KEY);
    if (!raw) return defaultPreferences;
    const parsed = JSON.parse(raw);
    return { ...defaultPreferences, ...parsed };
  } catch {
    return defaultPreferences;
  }
}

export async function savePreferences(preferences) {
  await AsyncStorage.setItem(PREFERENCES_KEY, JSON.stringify(preferences));
}

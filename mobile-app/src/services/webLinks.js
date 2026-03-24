import { Linking } from "react-native";

function getConfiguredBaseUrl() {
  const explicit = process.env.EXPO_PUBLIC_WEB_APP_URL;
  if (explicit) {
    return explicit.replace(/\/+$/, "");
  }

  const daoFallback = process.env.EXPO_PUBLIC_WEB_DAO_FALLBACK_URL;
  if (daoFallback) {
    return daoFallback.replace(/\/dao\/?$/, "").replace(/\/+$/, "");
  }

  return "https://frontend-peach-eight-mhrkt5iw5h.vercel.app";
}

export const WEB_APP_BASE_URL = getConfiguredBaseUrl();

export function getMessagesUrl(username) {
  if (username) {
    return `${WEB_APP_BASE_URL}/messages?with=${encodeURIComponent(String(username).replace(/^@/, ""))}`;
  }
  return `${WEB_APP_BASE_URL}/messages`;
}

export function getDaoUrl() {
  return `${WEB_APP_BASE_URL}/dao`;
}

export async function openMessages(username) {
  await Linking.openURL(getMessagesUrl(username));
}

export async function openDao() {
  await Linking.openURL(getDaoUrl());
}

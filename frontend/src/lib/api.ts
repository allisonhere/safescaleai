import { API_KEY_COOKIE, API_KEY_STORAGE } from "@/lib/api-constants";

export function getStoredApiKey(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const stored = window.localStorage.getItem(API_KEY_STORAGE);
    if (stored) {
      return stored;
    }
    const match = document.cookie.match(new RegExp(`${API_KEY_COOKIE}=([^;]+)`));
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

export function setStoredApiKey(value: string | null) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    if (!value) {
      window.localStorage.removeItem(API_KEY_STORAGE);
    } else {
      window.localStorage.setItem(API_KEY_STORAGE, value);
    }
  } catch {
    // Ignore storage errors (private mode, disabled storage, etc.).
  }
}

export function apiHeaders() {
  const envKey = process.env.NEXT_PUBLIC_API_KEY;
  const localKey = getStoredApiKey();
  const apiKey = localKey ?? envKey;
  if (!apiKey) {
    return {} as Record<string, string>;
  }
  return { "X-API-Key": apiKey };
}

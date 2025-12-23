import { AUTH_TOKEN_COOKIE, AUTH_TOKEN_STORAGE } from "@/lib/api-constants";

export function getStoredAuthToken(): string | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const stored = window.localStorage.getItem(AUTH_TOKEN_STORAGE);
    if (stored) {
      return stored;
    }
    const match = document.cookie.match(new RegExp(`${AUTH_TOKEN_COOKIE}=([^;]+)`));
    return match ? decodeURIComponent(match[1]) : null;
  } catch {
    return null;
  }
}

export function setStoredAuthToken(value: string | null) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    if (!value) {
      window.localStorage.removeItem(AUTH_TOKEN_STORAGE);
    } else {
      window.localStorage.setItem(AUTH_TOKEN_STORAGE, value);
    }
  } catch {
    // Ignore storage errors (private mode, disabled storage, etc.).
  }
}

export function apiHeaders() {
  const token = getStoredAuthToken();
  const envKey = process.env.NEXT_PUBLIC_API_KEY;
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  if (envKey) {
    return { "X-API-Key": envKey };
  }
  return {} as Record<string, string>;
}

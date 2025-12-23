import { cookies } from "next/headers";

import { AUTH_TOKEN_COOKIE } from "@/lib/api-constants";

export async function getServerAuthToken(): Promise<string | null> {
  try {
    const store = await Promise.resolve(cookies() as unknown);
    const getter =
      store && typeof (store as { get?: (name: string) => { value?: string } | undefined }).get === "function"
        ? (store as { get: (name: string) => { value?: string } | undefined }).get
        : null;
    const cookieToken = getter ? getter(AUTH_TOKEN_COOKIE)?.value : null;
    return cookieToken ?? null;
  } catch {
    return null;
  }
}

export async function apiHeadersServer(): Promise<Record<string, string>> {
  const token = await getServerAuthToken();
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  const envKey = process.env.NEXT_PUBLIC_API_KEY;
  if (envKey) {
    return { "X-API-Key": envKey };
  }
  return {};
}

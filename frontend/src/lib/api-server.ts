import { cookies } from "next/headers";

import { API_KEY_COOKIE } from "@/lib/api-constants";

export async function getServerApiKey(): Promise<string | null> {
  try {
    const store = await Promise.resolve(cookies() as unknown);
    const getter =
      store && typeof (store as { get?: (name: string) => { value?: string } | undefined }).get === "function"
        ? (store as { get: (name: string) => { value?: string } | undefined }).get
        : null;
    const cookieKey = getter ? getter(API_KEY_COOKIE)?.value : null;
    return cookieKey ?? process.env.NEXT_PUBLIC_API_KEY ?? null;
  } catch {
    return process.env.NEXT_PUBLIC_API_KEY ?? null;
  }
}

export async function apiHeadersServer(): Promise<Record<string, string>> {
  const apiKey = await getServerApiKey();
  if (!apiKey) {
    return {};
  }
  return { "X-API-Key": apiKey };
}

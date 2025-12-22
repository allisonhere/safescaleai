export function apiHeaders() {
  const apiKey = process.env.NEXT_PUBLIC_API_KEY;
  if (!apiKey) {
    return {} as Record<string, string>;
  }
  return { "X-API-Key": apiKey };
}

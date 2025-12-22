"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { API_KEY_COOKIE } from "@/lib/api-constants";
import { getStoredApiKey, setStoredApiKey } from "@/lib/api";

const COOKIE_MAX_AGE = 60 * 60 * 24 * 30;

type Status = "idle" | "saved" | "cleared" | "error";

function setApiKeyCookie(value: string | null) {
  if (typeof document === "undefined") {
    return;
  }
  if (!value) {
    document.cookie = `${API_KEY_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
    return;
  }
  document.cookie = `${API_KEY_COOKIE}=${encodeURIComponent(value)}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

export function ApiKeyPanel() {
  const envKey = process.env.NEXT_PUBLIC_API_KEY;
  const [apiKey, setApiKey] = React.useState("");
  const [storedKey, setStoredKey] = React.useState<string | null>(null);
  const [status, setStatus] = React.useState<Status>("idle");

  React.useEffect(() => {
    const existing = getStoredApiKey();
    setStoredKey(existing);
    setApiKey(existing ?? "");
  }, []);

  const save = () => {
    const trimmed = apiKey.trim();
    if (!trimmed) {
      setStatus("error");
      return;
    }
    setStoredApiKey(trimmed);
    setApiKeyCookie(trimmed);
    setStoredKey(trimmed);
    setStatus("saved");
  };

  const clear = () => {
    setStoredApiKey(null);
    setApiKeyCookie(null);
    setApiKey("");
    setStoredKey(null);
    setStatus("cleared");
  };

  const statusMessage =
    status === "saved"
      ? "Saved locally."
      : status === "cleared"
      ? "Cleared."
      : status === "error"
      ? "Enter an API key to save."
      : storedKey
      ? "Using stored key."
      : envKey
      ? "Using env key."
      : "No API key set.";

  return (
    <div className="rounded-2xl border border-emerald-200/60 bg-white/70 px-4 py-3 text-sm shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
          API Key
        </label>
        <input
          value={apiKey}
          onChange={(event) => {
            setApiKey(event.target.value);
            setStatus("idle");
          }}
          placeholder="Paste org API key"
          className="min-w-[220px] flex-1 rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-800 focus:border-emerald-400 focus:outline-none"
        />
        <Button size="sm" onClick={save}>
          Save
        </Button>
        <Button size="sm" variant="ghost" onClick={clear}>
          Clear
        </Button>
      </div>
      <p className="mt-2 text-xs text-zinc-500">{statusMessage}</p>
    </div>
  );
}

"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { AUTH_TOKEN_COOKIE } from "@/lib/api-constants";
import { getStoredAuthToken, setStoredAuthToken } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7;

type Status = "idle" | "saved" | "cleared" | "error";

function setAuthCookie(value: string | null) {
  if (typeof document === "undefined") {
    return;
  }
  if (!value) {
    document.cookie = `${AUTH_TOKEN_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
    return;
  }
  document.cookie = `${AUTH_TOKEN_COOKIE}=${encodeURIComponent(value)}; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax`;
}

export function AuthPanel() {
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [orgName, setOrgName] = React.useState("");
  const [status, setStatus] = React.useState<Status>("idle");
  const [message, setMessage] = React.useState<string | null>(null);
  const [storedToken, setStoredToken] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const token = getStoredAuthToken();
    setStoredToken(token);
  }, []);

  const handleResponse = async (response: Response) => {
    if (!response.ok) {
      const payload = await response.json().catch(() => ({}));
      throw new Error(payload.detail ?? "Authentication failed");
    }
    const data = (await response.json()) as { access_token: string };
    setStoredAuthToken(data.access_token);
    setAuthCookie(data.access_token);
    setStoredToken(data.access_token);
    setStatus("saved");
    setMessage("Signed in.");
  };

  const login = async () => {
    setLoading(true);
    setStatus("idle");
    setMessage(null);
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      await handleResponse(response);
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  const register = async () => {
    setLoading(true);
    setStatus("idle");
    setMessage(null);
    try {
      if (!orgName.trim()) {
        throw new Error("Organization name is required");
      }
      const response = await fetch(`${API_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, org_name: orgName.trim() }),
      });
      await handleResponse(response);
    } catch (err) {
      setStatus("error");
      setMessage(err instanceof Error ? err.message : "Registration failed");
    } finally {
      setLoading(false);
    }
  };

  const clear = () => {
    setStoredAuthToken(null);
    setAuthCookie(null);
    setStoredToken(null);
    setStatus("cleared");
    setMessage("Signed out.");
  };

  const helper =
    status === "error"
      ? message
      : storedToken
      ? "Authenticated."
      : "Use login or create a new account.";

  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
            Email
          </label>
          <input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            type="email"
            placeholder="you@company.com"
            className="w-full rounded-lg border theme-input px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none"
          />
        </div>
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
            Password
          </label>
          <input
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            type="password"
            placeholder="••••••••"
            maxLength={128}
            className="w-full rounded-lg border theme-input px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none"
          />
        </div>
      </div>
      <div className="space-y-2">
        <label className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-600">
          Organization
        </label>
        <input
          value={orgName}
          onChange={(event) => setOrgName(event.target.value)}
          type="text"
          placeholder="Acme"
          className="w-full rounded-lg border theme-input px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none"
        />
      </div>
      <div className="flex flex-wrap gap-3">
        <Button onClick={login} disabled={loading}>
          {loading ? "Working..." : "Log in"}
        </Button>
        <Button variant="secondary" onClick={register} disabled={loading}>
          Create account
        </Button>
        <Button variant="ghost" onClick={clear} disabled={loading}>
          Sign out
        </Button>
      </div>
      <p className={`text-xs ${status === "error" ? "text-rose-600" : "theme-muted"}`}>
        {helper}
      </p>
    </div>
  );
}

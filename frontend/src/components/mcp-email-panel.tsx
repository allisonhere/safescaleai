"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiHeaders } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type EmailSummary = {
  id: number;
  from?: string | null;
  to?: string | null;
  subject?: string | null;
  date?: string | null;
};

type EmailDetail = EmailSummary & {
  body?: string | null;
};

type MCPResponse<T> = {
  ok: boolean;
  data?: T | null;
  error?: string | null;
};

export function MCPEmailPanel() {
  const [messages, setMessages] = React.useState<EmailSummary[]>([]);
  const [selected, setSelected] = React.useState<EmailDetail | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchList = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/mcp/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...apiHeaders() },
        body: JSON.stringify({ resource: "email_mbox", action: "list", payload: { limit: 10 } }),
      });
      const payload = (await response.json()) as MCPResponse<{ messages: EmailSummary[] }>;
      if (!payload.ok) {
        throw new Error(payload.error ?? "Failed to load MCP messages");
      }
      setMessages(payload.data?.messages ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load MCP messages");
    } finally {
      setLoading(false);
    }
  };

  const fetchMessage = async (id: number) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/mcp/dispatch`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...apiHeaders() },
        body: JSON.stringify({ resource: "email_mbox", action: "get", payload: { id } }),
      });
      const payload = (await response.json()) as MCPResponse<EmailDetail>;
      if (!payload.ok) {
        throw new Error(payload.error ?? "Failed to load message");
      }
      setSelected(payload.data ?? null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load message");
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    void fetchList();
  }, []);

  return (
    <Card className="bg-[var(--surface)]">
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>MCP email preview</CardTitle>
          <CardDescription>Secure read-only access to your inbox via MCP.</CardDescription>
        </div>
        <Button variant="ghost" size="sm" onClick={fetchList} disabled={loading}>
          {loading ? "Refreshing..." : "Refresh"}
        </Button>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        {messages.length === 0 ? (
            <p className="text-sm theme-muted">No messages found.</p>
          ) : (
            <div className="grid gap-3">
              {messages.map((message) => (
                <button
                  key={message.id}
                  className="flex flex-col gap-1 rounded-xl border theme-border theme-surface-2 px-4 py-3 text-left transition hover:bg-[var(--surface)]"
                  onClick={() => fetchMessage(message.id)}
                >
                  <div className="flex items-center justify-between">
                    <p className="font-semibold text-[var(--foreground)]">
                      {message.subject ?? "(no subject)"}
                    </p>
                    <Badge className="bg-[var(--surface-2)] text-[var(--muted-foreground)]">
                      ID {message.id}
                    </Badge>
                  </div>
                  <p className="text-xs theme-muted">{message.from ?? "Unknown sender"}</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{message.date ?? ""}</p>
                </button>
              ))}
            </div>
          )}

        {selected ? (
          <div className="rounded-xl border border-[var(--accent-soft)] bg-[var(--accent-soft)] px-4 py-3">
            <p className="text-sm font-semibold text-[var(--foreground)]">{selected.subject}</p>
            <p className="text-xs theme-muted">From: {selected.from}</p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--foreground)]">
              {selected.body ?? "(empty message)"}
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

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
    <Card className="bg-white/90">
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
          <p className="text-sm text-zinc-500">No messages found.</p>
        ) : (
          <div className="grid gap-3">
            {messages.map((message) => (
              <button
                key={message.id}
                className="flex flex-col gap-1 rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3 text-left transition hover:bg-white"
                onClick={() => fetchMessage(message.id)}
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold text-zinc-900">{message.subject ?? "(no subject)"}</p>
                  <Badge className="bg-zinc-100 text-zinc-600">ID {message.id}</Badge>
                </div>
                <p className="text-xs text-zinc-500">{message.from ?? "Unknown sender"}</p>
                <p className="text-xs text-zinc-400">{message.date ?? ""}</p>
              </button>
            ))}
          </div>
        )}

        {selected ? (
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 px-4 py-3">
            <p className="text-sm font-semibold text-emerald-900">{selected.subject}</p>
            <p className="text-xs text-emerald-700">From: {selected.from}</p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-emerald-900">
              {selected.body ?? "(empty message)"}
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}

"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { apiHeaders } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export function ScraperTrigger() {
  const [message, setMessage] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(false);

  const runScraper = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const response = await fetch(`${API_URL}/scraper/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...apiHeaders() },
        body: "{}",
      });
      if (!response.ok) {
        throw new Error("Scraper failed");
      }
      const data = (await response.json()) as { alerts_created: number };
      setMessage(`Scraper finished: ${data.alerts_created} new alerts`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Scraper failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button variant="ghost" onClick={runScraper} disabled={loading}>
        {loading ? "Syncing alerts..." : "Run scraper now"}
      </Button>
      {message ? <p className="text-xs text-zinc-500">{message}</p> : null}
    </div>
  );
}

"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { apiHeaders } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type ActionState = {
  message: string | null;
  isLoading: boolean;
};

export function HeaderActions() {
  const router = useRouter();
  const [scanState, setScanState] = React.useState<ActionState>({
    message: null,
    isLoading: false,
  });
  const [scraperState, setScraperState] = React.useState<ActionState>({
    message: null,
    isLoading: false,
  });

  const runScan = async () => {
    setScanState({ message: null, isLoading: true });
    try {
      const response = await fetch(`${API_URL}/scan/run`, {
        method: "POST",
        headers: apiHeaders(),
      });
      if (!response.ok) {
        throw new Error("Scan failed");
      }
      const data = (await response.json()) as { score: number; rating: string };
      setScanState({ message: `Scan complete: ${data.score} (${data.rating})`, isLoading: false });
      setTimeout(() => router.refresh(), 800);
    } catch (error) {
      setScanState({
        message: error instanceof Error ? error.message : "Scan failed",
        isLoading: false,
      });
    }
  };

  const runScraper = async () => {
    setScraperState({ message: null, isLoading: true });
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
      setScraperState({
        message: `Scraper finished: ${data.alerts_created} new alerts`,
        isLoading: false,
      });
      setTimeout(() => router.refresh(), 800);
    } catch (error) {
      setScraperState({
        message: error instanceof Error ? error.message : "Scraper failed",
        isLoading: false,
      });
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-3">
        <Button variant="secondary" onClick={() => document.getElementById("policy-audit")?.scrollIntoView({ behavior: "smooth" })}>
          Upload policy PDF
        </Button>
        <Button onClick={runScan} disabled={scanState.isLoading}>
          {scanState.isLoading ? "Running scan..." : "Run compliance scan"}
        </Button>
        <Button variant="ghost" onClick={runScraper} disabled={scraperState.isLoading}>
          {scraperState.isLoading ? "Syncing alerts..." : "Refresh alerts"}
        </Button>
      </div>
      {scanState.message ? <p className="text-xs text-zinc-500">{scanState.message}</p> : null}
      {scraperState.message ? <p className="text-xs text-zinc-500">{scraperState.message}</p> : null}
    </div>
  );
}

"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { apiHeaders } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type FeedResponse = {
  feeds: string[];
};

export function ScraperFeedsPanel() {
  const [feeds, setFeeds] = React.useState<string[]>([]);
  const [newFeed, setNewFeed] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [message, setMessage] = React.useState<string | null>(null);

  const loadFeeds = React.useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/scraper/feeds`, {
        headers: apiHeaders(),
      });
      if (!response.ok) {
        throw new Error("Failed to load feeds");
      }
      const data = (await response.json()) as FeedResponse;
      setFeeds(data.feeds ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load feeds");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    void loadFeeds();
  }, [loadFeeds]);

  const addFeed = () => {
    const trimmed = newFeed.trim();
    if (!trimmed) {
      return;
    }
    if (feeds.includes(trimmed)) {
      setNewFeed("");
      return;
    }
    setFeeds((prev) => [...prev, trimmed]);
    setNewFeed("");
  };

  const removeFeed = (value: string) => {
    setFeeds((prev) => prev.filter((item) => item !== value));
  };

  const saveFeeds = async () => {
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const response = await fetch(`${API_URL}/scraper/feeds`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...apiHeaders() },
        body: JSON.stringify({ feeds }),
      });
      if (!response.ok) {
        throw new Error("Failed to save feeds");
      }
      const data = (await response.json()) as FeedResponse;
      setFeeds(data.feeds ?? []);
      setMessage("Feeds updated.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save feeds");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        <input
          value={newFeed}
          onChange={(event) => setNewFeed(event.target.value)}
          placeholder="https://example.com/rss.xml"
          className="min-w-[240px] flex-1 rounded-lg border theme-input px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none"
        />
        <Button variant="secondary" onClick={addFeed} disabled={loading}>
          Add feed
        </Button>
        <Button onClick={saveFeeds} disabled={saving || loading}>
          {saving ? "Saving..." : "Save feeds"}
        </Button>
      </div>
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
      {message ? <p className="text-xs text-emerald-600">{message}</p> : null}
      {loading ? (
        <p className="text-xs theme-muted">Loading feeds...</p>
      ) : feeds.length === 0 ? (
        <p className="text-xs theme-muted">No feeds saved yet.</p>
      ) : (
        <div className="space-y-2">
          {feeds.map((feed) => (
            <div
              key={feed}
              className="flex items-center justify-between rounded-lg border theme-border theme-surface-2 px-3 py-2 text-sm"
            >
              <span className="truncate text-[var(--foreground)]">{feed}</span>
              <Button variant="ghost" size="sm" onClick={() => removeFeed(feed)}>
                Remove
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

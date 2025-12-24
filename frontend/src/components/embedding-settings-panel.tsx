"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { EmbeddingThreshold } from "@shared/contracts/admin";
import { apiHeaders } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export function EmbeddingSettingsPanel() {
  const [value, setValue] = React.useState(0.45);
  const [isSaving, setIsSaving] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);
  const [isResetting, setIsResetting] = React.useState(false);

  const loadValue = React.useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/admin/embeddings/threshold`, {
        headers: apiHeaders(),
      });
      if (!response.ok) {
        return;
      }
      const payload = (await response.json()) as EmbeddingThreshold;
      setValue(payload.value);
    } catch {
      // ignore
    }
  }, []);

  React.useEffect(() => {
    void loadValue();
  }, [loadValue]);

  const saveValue = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      const response = await fetch(`${API_URL}/admin/embeddings/threshold`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...apiHeaders() },
        body: JSON.stringify({ value }),
      });
      if (!response.ok) {
        throw new Error("Failed to update threshold");
      }
      setMessage("Threshold updated");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Update failed");
    } finally {
      setIsSaving(false);
    }
  };

  const resetChecklist = async () => {
    setIsResetting(true);
    setMessage(null);
    try {
      const response = await fetch(`${API_URL}/admin/checklist/reset`, {
        method: "POST",
        headers: apiHeaders(),
      });
      if (!response.ok) {
        throw new Error("Failed to reset checklist");
      }
      const payload = (await response.json()) as { items: number };
      setMessage(`Checklist reset (${payload.items} items).`);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Reset failed");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Card className="bg-[var(--surface)]">
      <CardHeader>
        <CardTitle>Embedding threshold</CardTitle>
        <CardDescription>Higher values are stricter matching for audits.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="theme-muted">Current value</span>
          <span className="text-[var(--foreground)]">{value.toFixed(2)}</span>
        </div>
        <input
          type="range"
          min={0.1}
          max={0.95}
          step={0.05}
          value={value}
          onChange={(event) => setValue(Number(event.target.value))}
          className="w-full"
        />
        <div className="flex flex-wrap gap-2">
          <Button onClick={saveValue} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save threshold"}
          </Button>
          <Button variant="secondary" onClick={resetChecklist} disabled={isResetting}>
            {isResetting ? "Resetting..." : "Reset checklist"}
          </Button>
        </div>
        {message ? <p className="text-xs theme-muted">{message}</p> : null}
      </CardContent>
    </Card>
  );
}

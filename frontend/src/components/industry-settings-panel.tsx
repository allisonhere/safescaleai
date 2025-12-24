"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { IndustrySetting } from "@shared/contracts/admin";
import { apiHeaders } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

const INDUSTRIES = [
  { value: "general", label: "General" },
  { value: "saas", label: "SaaS" },
  { value: "fintech", label: "Fintech" },
  { value: "healthcare", label: "Healthcare" },
  { value: "retail", label: "Retail" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "energy", label: "Energy" },
  { value: "government", label: "Government" },
  { value: "education", label: "Education" },
  { value: "telecom", label: "Telecom" },
];

export function IndustrySettingsPanel() {
  const [value, setValue] = React.useState("general");
  const [isSaving, setIsSaving] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  const loadValue = React.useCallback(async () => {
    try {
      const response = await fetch(`${API_URL}/admin/industry`, {
        headers: apiHeaders(),
      });
      if (!response.ok) {
        return;
      }
      const payload = (await response.json()) as IndustrySetting;
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
      const response = await fetch(`${API_URL}/admin/industry`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", ...apiHeaders() },
        body: JSON.stringify({ value }),
      });
      if (!response.ok) {
        throw new Error("Failed to update industry");
      }
      setMessage("Industry updated");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Update failed");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Card className="bg-[var(--surface)]">
      <CardHeader>
        <CardTitle>Industry</CardTitle>
        <CardDescription>Used to tailor default checklists and labels.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <label className="space-y-2">
          <span className="text-xs theme-muted">Organization industry</span>
          <select
            className="w-full rounded-lg border theme-input px-3 py-2 text-sm focus:border-[var(--accent)] focus:outline-none"
            value={value}
            onChange={(event) => setValue(event.target.value)}
          >
            {INDUSTRIES.map((industry) => (
              <option key={industry.value} value={industry.value}>
                {industry.label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex flex-wrap gap-2">
          <Button onClick={saveValue} disabled={isSaving}>
            {isSaving ? "Saving..." : "Save industry"}
          </Button>
        </div>
        {message ? <p className="text-xs theme-muted">{message}</p> : null}
      </CardContent>
    </Card>
  );
}

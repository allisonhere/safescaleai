"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { OrgResetResponse } from "@shared/contracts/admin";
import { apiHeaders } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export function OrgResetPanel() {
  const [isResetting, setIsResetting] = React.useState(false);
  const [message, setMessage] = React.useState<string | null>(null);

  const resetOrg = async () => {
    setMessage(null);
    const confirmed = window.confirm(
      "This will delete audits, alerts, scores, usage events, audit logs, settings, and checklists for this org. Continue?"
    );
    if (!confirmed) {
      return;
    }
    setIsResetting(true);
    try {
      const response = await fetch(`${API_URL}/admin/org/reset`, {
        method: "POST",
        headers: apiHeaders(),
      });
      if (!response.ok) {
        throw new Error("Failed to reset org data");
      }
      const payload = (await response.json()) as OrgResetResponse;
      setMessage(
        `Cleared ${payload.audits} audits, ${payload.alerts} alerts, ` +
          `${payload.scores} scores, ${payload.usage_events} usage events, ` +
          `${payload.audit_logs} audit logs, ${payload.settings} settings; ` +
          `reseeded ${payload.checklist_seeded} checklist items.`
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Reset failed");
    } finally {
      setIsResetting(false);
    }
  };

  return (
    <Card className="bg-[var(--surface)]">
      <CardHeader>
        <CardTitle>Testing reset</CardTitle>
        <CardDescription>Wipe org data and reseed checklists for testing.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-xs theme-muted">
          This is destructive. Use only for test environments.
        </p>
        <Button variant="secondary" onClick={resetOrg} disabled={isResetting}>
          {isResetting ? "Resetting..." : "Reset org data"}
        </Button>
        {message ? <p className="text-xs theme-muted">{message}</p> : null}
      </CardContent>
    </Card>
  );
}

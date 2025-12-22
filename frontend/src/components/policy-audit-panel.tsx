"use client";

import * as React from "react";

import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { PolicyAuditRecord } from "@shared/contracts/policy-audit";
import { apiHeaders } from "@/lib/api";
import { AuditDownloadButton } from "@/components/audit-download-button";
import { AuditReportViewer } from "@/components/audit-report-viewer";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type PolicyAuditPanelProps = {
  initialAudit: PolicyAuditRecord | null;
};

export function PolicyAuditPanel({ initialAudit }: PolicyAuditPanelProps) {
  const [audit, setAudit] = React.useState<PolicyAuditRecord | null>(initialAudit);
  const [isUploading, setIsUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleUpload = async () => {
    setError(null);
    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setError("Select a PDF file to audit.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);

    setIsUploading(true);
    try {
      const response = await fetch(`${API_URL}/policy/audit`, {
        method: "POST",
        headers: apiHeaders(),
        body: formData,
      });
      if (!response.ok) {
        throw new Error("Upload failed");
      }
      const result = (await response.json()) as PolicyAuditRecord;
      setAudit(result);
      fileInputRef.current.value = "";
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="bg-white/90">
      <CardHeader>
        <CardTitle>AI policy auditor</CardTitle>
        <CardDescription>Upload a PDF to compare against the Gold Standard checklist.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf"
            className="w-full rounded-xl border border-zinc-200 bg-white px-3 py-2 text-sm"
          />
          <Button onClick={handleUpload} disabled={isUploading}>
            {isUploading ? "Auditing..." : "Run audit"}
          </Button>
        </div>
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}

        {audit ? (
          <div className="space-y-3 rounded-2xl border border-zinc-100 bg-zinc-50 px-4 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="bg-emerald-100 text-emerald-700">{audit.rating}</Badge>
              <span className="text-sm text-zinc-600">Score: {audit.score}</span>
              <span className="text-xs text-zinc-400">{new Date(audit.created_at).toLocaleString()}</span>
            </div>
            <p className="text-sm text-zinc-600">File: {audit.filename}</p>
            {audit.doc_type || audit.jurisdiction ? (
              <p className="text-xs text-zinc-500">
                Classified as {audit.doc_type ?? "general"} ({audit.jurisdiction ?? "general"})
              </p>
            ) : null}
            <div className="text-sm text-zinc-600">
              Matched items: {audit.matched_items.length} · Gaps: {audit.gaps.length}
            </div>
            <p className="text-xs text-zinc-500">{audit.guardrail_note}</p>
            {audit ? (
              <AuditDownloadButton auditId={audit.id} filename={audit.filename} />
            ) : null}
            {audit ? <AuditReportViewer auditId={audit.id} initialReport={audit} /> : null}
          </div>
        ) : (
          <p className="text-sm text-zinc-500">No audits yet. Upload a PDF to generate one.</p>
        )}
        <div>
          <Button asChild variant="ghost" size="sm">
            <Link href="/audits">View audit history</Link>
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

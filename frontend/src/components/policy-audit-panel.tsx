"use client";

import * as React from "react";

import Link from "next/link";
import { useRouter } from "next/navigation";

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
  const router = useRouter();
  const [audit, setAudit] = React.useState<PolicyAuditRecord | null>(initialAudit);
  const [isUploading, setIsUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [scanMessage, setScanMessage] = React.useState<string | null>(null);
  const [scanLoading, setScanLoading] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleUpload = async (file?: File) => {
    setError(null);
    setScanMessage(null);
    const selected = file ?? fileInputRef.current?.files?.[0];
    if (!selected) {
      setError("Select a PDF file to audit.");
      return;
    }

    const formData = new FormData();
    formData.append("file", selected);

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

  const runScan = async () => {
    setScanMessage(null);
    setError(null);
    setScanLoading(true);
    try {
      const response = await fetch(`${API_URL}/scan/run`, {
        method: "POST",
        headers: apiHeaders(),
      });
      if (!response.ok) {
        throw new Error("Scan failed");
      }
      const data = (await response.json()) as { score: number; rating: string };
      setScanMessage(`Scan complete: ${data.score} (${data.rating})`);
      setTimeout(() => router.refresh(), 800);
    } catch (scanError) {
      setScanMessage(scanError instanceof Error ? scanError.message : "Scan failed");
    } finally {
      setScanLoading(false);
    }
  };

  return (
    <Card className="bg-white/90">
      <CardHeader>
        <CardTitle>AI policy auditor</CardTitle>
        <CardDescription>Upload a PDF to compare against the Gold Standard checklist.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? "Uploading..." : "Upload PDF"}
          </Button>
          <Button variant="secondary" onClick={runScan} disabled={scanLoading}>
            {scanLoading ? "Running scan..." : "Run compliance scan"}
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/pdf"
          onChange={(event) => handleUpload(event.target.files?.[0])}
          className="hidden"
        />
        {error ? <p className="text-sm text-rose-600">{error}</p> : null}
        {scanMessage ? <p className="text-sm text-zinc-500">{scanMessage}</p> : null}

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

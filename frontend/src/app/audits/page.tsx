import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AuditDownloadButton } from "@/components/audit-download-button";
import { AuditReportViewer } from "@/components/audit-report-viewer";
import { DownloadFileButton } from "@/components/download-file-button";
import type { PolicyAuditRecord } from "@shared/contracts/policy-audit";
import { apiHeadersServer, getServerAuthToken } from "@/lib/api-server";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

async function loadAudits(): Promise<PolicyAuditRecord[]> {
  try {
    const response = await fetch(`${API_URL}/policy/audits`, {
      cache: "no-store",
      headers: await apiHeadersServer(),
    });
    if (!response.ok) {
      return [];
    }
    return (await response.json()) as PolicyAuditRecord[];
  } catch {
    return [];
  }
}

function ratingColor(rating: string): string {
  const normalized = rating.toLowerCase();
  if (normalized.includes("track")) {
    return "bg-emerald-100 text-emerald-700";
  }
  if (normalized.includes("attention")) {
    return "bg-amber-100 text-amber-700";
  }
  return "bg-rose-100 text-rose-700";
}

export default async function AuditsPage() {
  const hasAuth = Boolean(await getServerAuthToken());
  const audits = await loadAudits();

  return (
    <div className="min-h-screen theme-page">
      <div className="relative mx-auto max-w-6xl px-6 pb-16 pt-10">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
              SafeScale AI
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Policy audit history</h1>
            <p className="text-base theme-muted">
              Review recent audits and download reports for your records.
            </p>
          </div>
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="secondary">
              <Link href="/">Back to dashboard</Link>
            </Button>
            <DownloadFileButton
              endpoint="/reports/audits.csv"
              filename="policy-audits.csv"
              label="Export audits CSV"
              variant="ghost"
            />
            <DownloadFileButton
              endpoint="/reports/audits.pdf"
              filename="policy-audits.pdf"
              label="Export audits PDF"
              variant="ghost"
            />
            <Button asChild variant="ghost">
              <Link href="/settings">Settings</Link>
            </Button>
          </div>
        </header>

        <section className="mt-8 grid gap-6">
          {audits.length === 0 ? (
            <Card>
              <CardHeader>
                <CardTitle>No audits yet</CardTitle>
                <CardDescription>
                  {hasAuth
                    ? "Upload a PDF on the dashboard to generate your first audit."
                    : "Sign in to load audit history."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild>
                  <Link href="/">Go to dashboard</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            audits.map((audit) => (
              <Card key={audit.id} className="bg-[var(--surface)]">
                <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle>{audit.filename}</CardTitle>
                    <CardDescription>
                      {new Date(audit.created_at).toLocaleString()} · Score {audit.score}
                    </CardDescription>
                  </div>
                  <Badge className={ratingColor(audit.rating)}>{audit.rating}</Badge>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex flex-wrap gap-4 text-sm theme-muted">
                    <span>Matched: {audit.matched_items.length}</span>
                    <span>Gaps: {audit.gaps.length}</span>
                  </div>
                  <p className="text-xs theme-muted">{audit.guardrail_note}</p>
                  <div className="flex flex-wrap gap-3">
                    <AuditDownloadButton auditId={audit.id} filename={audit.filename} />
                    <AuditReportViewer auditId={audit.id} />
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </section>
      </div>
    </div>
  );
}

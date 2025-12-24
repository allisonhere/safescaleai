"use client";

import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DownloadFileButton } from "@/components/download-file-button";
import { apiHeaders } from "@/lib/api";
import type { PolicyGap, PolicyAuditRecord } from "@shared/contracts/policy-audit";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type AuditReport = {
  id: number;
  filename: string;
  score: number;
  rating: string;
  matched_items: string[];
  gaps: PolicyGap[];
  guardrail_note: string;
  doc_type?: string;
  jurisdiction?: string;
  classifier_notes?: Record<string, string>;
  created_at: string;
};

type AuditReportViewerProps = {
  auditId: number;
  initialReport?: PolicyAuditRecord;
};

function severityClassName(severity?: string): string {
  if (severity === "high") {
    return "bg-rose-100 text-rose-700";
  }
  if (severity === "low") {
    return "bg-emerald-100 text-emerald-700";
  }
  if (severity === "medium") {
    return "bg-amber-100 text-amber-700";
  }
  return "bg-[var(--surface-2)] text-[var(--muted-foreground)]";
}

function severityRank(severity?: string): number {
  if (severity === "high") {
    return 3;
  }
  if (severity === "medium") {
    return 2;
  }
  if (severity === "low") {
    return 1;
  }
  return 0;
}

export function AuditReportViewer({ auditId, initialReport }: AuditReportViewerProps) {
  const [report, setReport] = React.useState<AuditReport | null>(initialReport ?? null);
  const [expanded, setExpanded] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const loadReport = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}/policy/audits/${auditId}/report`, {
        headers: apiHeaders(),
      });
      if (!response.ok) {
        throw new Error("Failed to load report");
      }
      const data = (await response.json()) as AuditReport;
      setReport(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load report");
    } finally {
      setLoading(false);
    }
  };

  const toggle = async () => {
    if (!expanded && !report) {
      await loadReport();
    }
    setExpanded((prev) => !prev);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <Button size="sm" variant="secondary" onClick={toggle} disabled={loading}>
          {loading ? "Loading..." : expanded ? "Hide report" : "View report"}
        </Button>
        <DownloadFileButton
          endpoint={`/policy/audits/${auditId}/report.pdf`}
          filename={`policy-audit-${auditId}.pdf`}
          label="Download PDF"
          variant="ghost"
        />
      </div>
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
      {expanded && report ? (
        <div className="rounded-xl border theme-border theme-surface px-4 py-3 text-sm text-[var(--foreground)]">
          <p className="font-semibold">{report.rating} · Score {report.score}</p>
          <p className="text-xs theme-muted">{new Date(report.created_at).toLocaleString()}</p>
          {report.doc_type || report.jurisdiction ? (
            <p className="mt-2 text-xs theme-muted">
              Classification: {report.doc_type ?? "general"} · {report.jurisdiction ?? "general"}
            </p>
          ) : null}
          <div className="mt-4 rounded-lg border theme-border theme-surface-2 px-3 py-3">
            <p className="text-xs font-semibold">Summary</p>
            <p className="mt-1 text-xs theme-muted">
              {report.matched_items.length} matched · {report.gaps.length} gaps
            </p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <Badge className={severityClassName("high")}>
                High: {report.gaps.filter((gap) => gap.severity === "high").length}
              </Badge>
              <Badge className={severityClassName("medium")}>
                Medium: {report.gaps.filter((gap) => gap.severity === "medium").length}
              </Badge>
              <Badge className={severityClassName("low")}>
                Low: {report.gaps.filter((gap) => gap.severity === "low").length}
              </Badge>
            </div>
            {report.gaps.length > 0 ? (
              <div className="mt-3">
                <p className="text-xs font-semibold theme-muted">Top gaps</p>
                <ul className="mt-1 list-disc pl-4 text-xs theme-muted">
                  {report.gaps
                    .slice()
                    .sort((a, b) => severityRank(b.severity) - severityRank(a.severity))
                    .slice(0, 3)
                    .map((gap) => (
                      <li key={gap.checklist_item}>{gap.checklist_item}</li>
                    ))}
                </ul>
              </div>
            ) : null}
            {report.matched_items.length > 0 ? (
              <div className="mt-3">
                <p className="text-xs font-semibold theme-muted">Top matches</p>
                <ul className="mt-1 list-disc pl-4 text-xs theme-muted">
                  {report.matched_items.slice(0, 3).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold theme-muted">Matched items</p>
            <ul className="list-disc pl-5">
              {report.matched_items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold theme-muted">Gaps</p>
            <ul className="list-disc pl-5">
              {report.gaps.map((gap) => (
                <li key={gap.checklist_item}>
                  <Badge className={`mr-2 ${severityClassName(gap.severity)}`}>
                    {(gap.severity ?? "medium").toUpperCase()}
                  </Badge>
                  <span className="font-medium">Missing:</span> {gap.checklist_item}
                  {gap.reason ? <span className="text-xs theme-muted"> — {gap.reason}</span> : null}
                </li>
              ))}
            </ul>
          </div>
          {report.classifier_notes ? (
            <div className="mt-3 rounded-lg border theme-border theme-surface-2 px-3 py-2 text-xs">
              <p className="font-semibold">Classifier notes</p>
              <p className="mt-1 theme-muted">
                Provider: {report.classifier_notes.provider ?? "unknown"}
              </p>
              {report.classifier_notes.reasoning ? (
                <p className="mt-1 theme-muted">
                  {report.classifier_notes.reasoning.slice(0, 280)}
                  {report.classifier_notes.reasoning.length > 280 ? "…" : ""}
                </p>
              ) : null}
            </div>
          ) : null}
          <p className="mt-3 text-xs theme-muted">{report.guardrail_note}</p>
        </div>
      ) : null}
    </div>
  );
}

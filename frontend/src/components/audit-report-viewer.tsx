"use client";

import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  return "bg-zinc-100 text-zinc-600";
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
      <Button size="sm" variant="secondary" onClick={toggle} disabled={loading}>
        {loading ? "Loading..." : expanded ? "Hide report" : "View report"}
      </Button>
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
      {expanded && report ? (
        <div className="rounded-xl border border-zinc-100 bg-white px-4 py-3 text-sm text-zinc-700">
          <p className="font-semibold text-zinc-900">{report.rating} · Score {report.score}</p>
          <p className="text-xs text-zinc-500">{new Date(report.created_at).toLocaleString()}</p>
          {report.doc_type || report.jurisdiction ? (
            <p className="mt-2 text-xs text-zinc-500">
              Classification: {report.doc_type ?? "general"} · {report.jurisdiction ?? "general"}
            </p>
          ) : null}
          <div className="mt-3">
            <p className="text-xs font-semibold text-zinc-500">Matched items</p>
            <ul className="list-disc pl-5">
              {report.matched_items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </div>
          <div className="mt-3">
            <p className="text-xs font-semibold text-zinc-500">Gaps</p>
            <ul className="list-disc pl-5">
              {report.gaps.map((gap) => (
                <li key={gap.checklist_item}>
                  <Badge className={`mr-2 ${severityClassName(gap.severity)}`}>
                    {(gap.severity ?? "medium").toUpperCase()}
                  </Badge>
                  <span className="font-medium">Missing:</span> {gap.checklist_item}
                  {gap.reason ? <span className="text-xs text-zinc-500"> — {gap.reason}</span> : null}
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-3 text-xs text-zinc-500">{report.guardrail_note}</p>
        </div>
      ) : null}
    </div>
  );
}

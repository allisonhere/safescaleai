import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AutoRefresh } from "@/components/auto-refresh";
import { EmbeddingSettingsPanel } from "@/components/embedding-settings-panel";
import { HeaderActions } from "@/components/header-actions";
import { MCPEmailPanel } from "@/components/mcp-email-panel";
import { PolicyAuditPanel } from "@/components/policy-audit-panel";
import type { AuditLogRead } from "@shared/contracts/audit";
import type { UsageSummary } from "@shared/contracts/billing";
import type { ComplianceDashboard } from "@shared/contracts/compliance";
import type { PolicyAuditRecord } from "@shared/contracts/policy-audit";
import type { ScraperStatus } from "@shared/contracts/scraper";
import { apiHeaders } from "@/lib/api";

const fallbackDashboard: ComplianceDashboard = {
  score: { score: 78, rating: "Needs attention" },
  active_alerts: [
    {
      id: "fallback-privacy",
      title: "Awaiting regulatory sync",
      summary: "Run the agentic scraper to populate live alerts.",
      severity: "Low",
      source_url: "safescale.ai",
      published_at: "Just now",
    },
  ],
};

const fallbackAuditTrail: AuditLogRead[] = [
  {
    id: 1,
    action: "policy_audit",
    actor: "system",
    target: null,
    outcome: "success",
    summary: "Ready to audit your first policy document.",
    metadata: {},
    created_at: new Date().toISOString(),
  },
];

const fallbackUsage: UsageSummary = {
  total_cost: 0,
  total_scans: 0,
};

const fallbackAudit: PolicyAuditRecord | null = null;
const fallbackScraper: ScraperStatus = {
  enabled: false,
  last_run_at: null,
  next_run_at: null,
  status: null,
  scanned: 0,
  alerts_created: 0,
  notes: [],
};

async function loadDashboard(): Promise<ComplianceDashboard> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  try {
    const response = await fetch(`${baseUrl}/dashboard`, {
      cache: "no-store",
      headers: apiHeaders(),
    });
    if (!response.ok) {
      return fallbackDashboard;
    }
    return (await response.json()) as ComplianceDashboard;
  } catch {
    return fallbackDashboard;
  }
}

async function loadAuditTrail(): Promise<AuditLogRead[]> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  try {
    const response = await fetch(`${baseUrl}/audit/recent`, {
      cache: "no-store",
      headers: apiHeaders(),
    });
    if (!response.ok) {
      return fallbackAuditTrail;
    }
    return (await response.json()) as AuditLogRead[];
  } catch {
    return fallbackAuditTrail;
  }
}

async function loadUsage(): Promise<UsageSummary> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  try {
    const response = await fetch(`${baseUrl}/billing/usage`, {
      cache: "no-store",
      headers: apiHeaders(),
    });
    if (!response.ok) {
      return fallbackUsage;
    }
    return (await response.json()) as UsageSummary;
  } catch {
    return fallbackUsage;
  }
}

async function loadLatestAudit(): Promise<PolicyAuditRecord | null> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  try {
    const response = await fetch(`${baseUrl}/policy/audits/latest`, {
      cache: "no-store",
      headers: apiHeaders(),
    });
    if (!response.ok) {
      return fallbackAudit;
    }
    return (await response.json()) as PolicyAuditRecord | null;
  } catch {
    return fallbackAudit;
  }
}

async function loadScraperStatus(): Promise<ScraperStatus> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  try {
    const response = await fetch(`${baseUrl}/scraper/status`, {
      cache: "no-store",
      headers: apiHeaders(),
    });
    if (!response.ok) {
      return fallbackScraper;
    }
    return (await response.json()) as ScraperStatus;
  } catch {
    return fallbackScraper;
  }
}

function toHostname(url: string): string {
  try {
    return new URL(url).hostname;
  } catch {
    return url;
  }
}

export default async function Home() {
  const dashboard = await loadDashboard();
  const auditTrail = await loadAuditTrail();
  const usage = await loadUsage();
  const latestAudit = await loadLatestAudit();
  const scraperStatus = await loadScraperStatus();
  const includedScans = 25;
  const usagePercent = Math.min(100, (usage.total_scans / includedScans) * 100);
  const alerts = dashboard.active_alerts.map((alert) => ({
    ...alert,
    source: toHostname(alert.source_url),
    date: alert.published_at,
  }));

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#d9f5e3,_#f7f6f2_40%,_#f2f6ff_100%)] text-zinc-900">
      <AutoRefresh intervalMs={45000} />
      <div className="absolute left-10 top-12 h-32 w-32 rounded-full bg-emerald-200/60 blur-3xl" />
      <div className="absolute right-10 top-24 h-40 w-40 rounded-full bg-sky-200/60 blur-3xl" />
      <div className="relative mx-auto max-w-6xl px-6 pb-16 pt-10">
        <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
              SafeScale AI
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Compliance command center
            </h1>
            <p className="max-w-xl text-base text-zinc-600">
              Monitor regulatory shifts, audit policy gaps, and track every automated action with
              full traceability.
            </p>
          </div>
          <HeaderActions />
        </header>

        <section className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="border-emerald-200/70 bg-white/80">
            <CardHeader>
              <CardTitle>Compliance score</CardTitle>
              <CardDescription>Updated 2 hours ago after last scan.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between gap-6">
                <div>
                  <p className="text-5xl font-semibold text-emerald-600">{dashboard.score.score}</p>
                  <p className="text-sm text-zinc-500">{dashboard.score.rating}</p>
                </div>
                <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm text-emerald-800">
                  <p className="font-semibold">Gold Standard Alignment</p>
                  <p className="mt-1 text-emerald-700">72% mapped · 11 pending</p>
                </div>
              </div>
              <div className="mt-6 space-y-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500">Privacy controls</span>
                  <span className="font-semibold text-zinc-900">92%</span>
                </div>
                <Progress value={92} />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500">Employee handbook</span>
                  <span className="font-semibold text-zinc-900">78%</span>
                </div>
                <Progress value={78} className="bg-amber-100" />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-zinc-500">Vendor security</span>
                  <span className="font-semibold text-zinc-900">65%</span>
                </div>
                <Progress value={65} className="bg-rose-100" />
              </div>
            </CardContent>
          </Card>

          <div id="policy-audit">
            <PolicyAuditPanel initialAudit={latestAudit} />
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader>
              <CardTitle>Active regulatory alerts</CardTitle>
              <CardDescription>Monitored by the autonomous agentic scraper.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {alerts.map((alert) => (
                <div
                  key={alert.id}
                  className="flex flex-col gap-3 rounded-xl border border-zinc-100 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge
                        className={
                          alert.severity === "High"
                            ? "bg-rose-100 text-rose-700"
                            : alert.severity === "Medium"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-emerald-100 text-emerald-700"
                        }
                      >
                        {alert.severity}
                      </Badge>
                      <span className="text-xs text-zinc-500">{alert.date}</span>
                    </div>
                    <p className="text-base font-semibold text-zinc-900">{alert.title}</p>
                    <p className="text-sm text-zinc-500">{alert.summary}</p>
                  </div>
                  <div className="text-right text-xs text-zinc-500">
                    <p>Source</p>
                    <p className="font-semibold text-zinc-800">{alert.source}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="bg-white/90">
              <CardHeader>
                <CardTitle>Scraper status</CardTitle>
                <CardDescription>Autonomous agent monitoring regulatory sources.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-zinc-500">Status</span>
                  <Badge
                    className={
                      scraperStatus.status === "success"
                        ? "bg-emerald-100 text-emerald-700"
                        : scraperStatus.status === "partial"
                        ? "bg-amber-100 text-amber-700"
                        : "bg-zinc-100 text-zinc-600"
                    }
                  >
                    {scraperStatus.status ?? "Idle"}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-zinc-500">
                  <span>Last run</span>
                  <span className="text-zinc-900">
                    {scraperStatus.last_run_at
                      ? new Date(scraperStatus.last_run_at).toLocaleString()
                      : "Not yet"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-zinc-500">
                  <span>Next run</span>
                  <span className="text-zinc-900">
                    {scraperStatus.next_run_at
                      ? new Date(scraperStatus.next_run_at).toLocaleString()
                      : scraperStatus.enabled
                      ? "Pending"
                      : "Disabled"}
                  </span>
                </div>
                <div className="flex items-center justify-between text-zinc-500">
                  <span>Scanned</span>
                  <span className="text-zinc-900">{scraperStatus.scanned}</span>
                </div>
                <div className="flex items-center justify-between text-zinc-500">
                  <span>New alerts</span>
                  <span className="text-zinc-900">{scraperStatus.alerts_created}</span>
                </div>
              </CardContent>
            </Card>
            <EmbeddingSettingsPanel />
            <MCPEmailPanel />
            <Card className="border-zinc-200/70 bg-white/90">
              <CardHeader>
                <CardTitle>Usage-based billing</CardTitle>
                <CardDescription>$4.50 per compliance scan</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3">
                  <p className="text-sm text-zinc-600">September usage</p>
                  <div className="mt-2 flex items-baseline justify-between">
                    <p className="text-3xl font-semibold text-zinc-900">
                      ${usage.total_cost.toFixed(2)}
                    </p>
                    <p className="text-sm text-zinc-500">{usage.total_scans} scans</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-sm text-zinc-500">
                    <span>Included scans</span>
                    <span className="text-zinc-900">{includedScans}</span>
                  </div>
                  <Progress value={usagePercent} className="bg-zinc-100" />
                </div>
                <div className="flex items-center gap-3 text-sm">
                  <Badge className="bg-emerald-100 text-emerald-700">On track</Badge>
                  <span className="text-zinc-500">Projected spend: $112</span>
                </div>
              </CardContent>
            </Card>
            <Card className="bg-white/90">
              <CardHeader>
                <CardTitle>AI audit trail</CardTitle>
                <CardDescription>Last automated actions logged.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                {auditTrail.map((item) => (
                  <div
                    key={`${item.id}-${item.action}`}
                    className="rounded-xl border border-zinc-100 bg-zinc-50 px-4 py-3"
                  >
                    <p className="font-semibold text-zinc-900">{item.action.replace(/_/g, " ")}</p>
                    <p className="text-zinc-500">{item.summary ?? "Logged action"}</p>
                    <p className="mt-2 text-xs text-zinc-400">
                      {new Date(item.created_at).toLocaleString()}
                    </p>
                  </div>
                ))}
                <Button variant="ghost" className="w-full justify-center">
                  View full audit trail
                </Button>
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}

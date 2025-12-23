import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { AutoRefresh } from "@/components/auto-refresh";
import { AlertsHeaderActions } from "@/components/alerts-header-actions";
import { HeaderActions } from "@/components/header-actions";
import { PolicyAuditPanel } from "@/components/policy-audit-panel";
import type { AuditLogRead } from "@shared/contracts/audit";
import type { UsageSummary } from "@shared/contracts/billing";
import type { ComplianceDashboard } from "@shared/contracts/compliance";
import type { PolicyAuditRecord } from "@shared/contracts/policy-audit";
import type { ScraperStatus } from "@shared/contracts/scraper";
import { apiHeadersServer, getServerAuthToken } from "@/lib/api-server";

async function loadDashboard(): Promise<ComplianceDashboard | null> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  try {
    const response = await fetch(`${baseUrl}/dashboard`, {
      cache: "no-store",
      headers: await apiHeadersServer(),
    });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as ComplianceDashboard;
  } catch {
    return null;
  }
}

async function loadAuditTrail(): Promise<AuditLogRead[]> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  try {
    const response = await fetch(`${baseUrl}/audit/recent`, {
      cache: "no-store",
      headers: await apiHeadersServer(),
    });
    if (!response.ok) {
      return [];
    }
    return (await response.json()) as AuditLogRead[];
  } catch {
    return [];
  }
}

async function loadUsage(): Promise<UsageSummary | null> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  try {
    const response = await fetch(`${baseUrl}/billing/usage`, {
      cache: "no-store",
      headers: await apiHeadersServer(),
    });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as UsageSummary;
  } catch {
    return null;
  }
}

async function loadLatestAudit(): Promise<PolicyAuditRecord | null> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  try {
    const response = await fetch(`${baseUrl}/policy/audits/latest`, {
      cache: "no-store",
      headers: await apiHeadersServer(),
    });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as PolicyAuditRecord | null;
  } catch {
    return null;
  }
}

async function loadScraperStatus(): Promise<ScraperStatus | null> {
  const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
  try {
    const response = await fetch(`${baseUrl}/scraper/status`, {
      cache: "no-store",
      headers: await apiHeadersServer(),
    });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as ScraperStatus;
  } catch {
    return null;
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
  const authToken = await getServerAuthToken();
  const hasAuth = Boolean(authToken);
  const dashboard = await loadDashboard();
  const auditTrail = await loadAuditTrail();
  const usage = await loadUsage();
  const latestAudit = await loadLatestAudit();
  const scraperStatus = await loadScraperStatus();
  const includedScans = 25;
  const usagePercent = usage
    ? Math.min(100, (usage.total_scans / includedScans) * 100)
    : 0;
  const alerts = (dashboard?.active_alerts ?? []).map((alert) => ({
    ...alert,
    source: toHostname(alert.source_url),
    date: alert.published_at,
  }));

  return (
    <div className="min-h-screen theme-page">
      <AutoRefresh intervalMs={45000} />
      <div className="absolute left-10 top-12 h-32 w-32 rounded-full bg-[var(--glow-1)] blur-3xl" />
      <div className="absolute right-10 top-24 h-40 w-40 rounded-full bg-[var(--glow-2)] blur-3xl" />
      <div className="relative mx-auto max-w-6xl px-6 pb-16 pt-10">
        <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
              SafeScale AI
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              Compliance command center
            </h1>
            <p className="max-w-xl text-base theme-muted">
              Monitor regulatory shifts, audit policy gaps, and track every automated action with
              full traceability.
            </p>
          </div>
          <HeaderActions />
        </header>
        {!hasAuth ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm text-amber-800">
            Sign in to load live data from the backend.
          </div>
        ) : null}

        <section className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <Card className="border theme-border bg-[var(--surface)]">
            <CardHeader>
              <CardTitle>Compliance score</CardTitle>
              <CardDescription>Updated 2 hours ago after last scan.</CardDescription>
            </CardHeader>
            <CardContent>
              {dashboard ? (
                <>
                  <div className="flex items-center justify-between gap-6">
                    <div>
                      <p className="text-5xl font-semibold text-emerald-600">
                        {dashboard.score.score}
                      </p>
                      <p className="text-sm theme-muted">{dashboard.score.rating}</p>
                    </div>
                    <div className="rounded-2xl border border-[var(--accent-soft)] bg-[var(--accent-soft)] px-5 py-4 text-sm text-[var(--foreground)]">
                      <p className="font-semibold">Gold Standard Alignment</p>
                      <p className="mt-1 text-[var(--muted-foreground)]">72% mapped · 11 pending</p>
                    </div>
                  </div>
                  <div className="mt-6 space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="theme-muted">Privacy controls</span>
                      <span className="font-semibold text-[var(--foreground)]">92%</span>
                    </div>
                    <Progress value={92} />
                    <div className="flex items-center justify-between text-sm">
                      <span className="theme-muted">Employee handbook</span>
                      <span className="font-semibold text-[var(--foreground)]">78%</span>
                    </div>
                    <Progress value={78} className="bg-[var(--surface-2)]" />
                    <div className="flex items-center justify-between text-sm">
                      <span className="theme-muted">Vendor security</span>
                      <span className="font-semibold text-[var(--foreground)]">65%</span>
                    </div>
                    <Progress value={65} className="bg-[var(--surface-2)]" />
                  </div>
                </>
              ) : (
                <div className="rounded-2xl border border-dashed theme-border theme-surface-2 px-4 py-4 text-sm theme-muted">
                  <p className="font-semibold text-[var(--foreground)]">No score available yet.</p>
                  <p className="mt-1">
                    {hasAuth
                      ? "Run a scan to generate your first score."
                      : "Sign in to load your compliance data."}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          <div id="policy-audit">
            <PolicyAuditPanel initialAudit={latestAudit} />
          </div>
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle>Active regulatory alerts</CardTitle>
                <CardDescription>Monitored by the autonomous agentic scraper.</CardDescription>
              </div>
              <AlertsHeaderActions />
            </CardHeader>
            <CardContent className="space-y-4">
              {alerts.length === 0 ? (
                <div className="rounded-xl border border-dashed theme-border theme-surface-2 px-4 py-4 text-sm theme-muted">
                  <p className="font-semibold text-[var(--foreground)]">No alerts yet.</p>
                  <p className="mt-1">
                    {hasAuth
                      ? "Run the scraper to populate regulatory alerts."
                      : "Sign in to fetch alerts from your backend."}
                  </p>
                </div>
              ) : (
                alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="flex flex-col gap-3 rounded-xl border theme-border bg-[var(--surface)] p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between"
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
                        <span className="text-xs theme-muted">{alert.date}</span>
                      </div>
                    <p className="text-base font-semibold text-[var(--foreground)]">{alert.title}</p>
                    <p className="text-sm theme-muted">{alert.summary}</p>
                    <a
                      href={alert.source_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-semibold text-[var(--accent)] hover:text-[var(--accent-strong)]"
                    >
                      Read article
                    </a>
                  </div>
                  <div className="text-right text-xs theme-muted">
                    <p>Source</p>
                    <p className="font-semibold text-[var(--foreground)]">{alert.source}</p>
                  </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="bg-[var(--surface)]">
              <CardHeader>
                <CardTitle>Scraper status</CardTitle>
                <CardDescription>Autonomous agent monitoring regulatory sources.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                {scraperStatus ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span className="theme-muted">Status</span>
                      <Badge
                        className={
                          scraperStatus.status === "success"
                            ? "bg-emerald-100 text-emerald-700"
                            : scraperStatus.status === "partial"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-[var(--surface-2)] text-[var(--muted-foreground)]"
                        }
                      >
                        {scraperStatus.status ?? "Idle"}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between theme-muted">
                      <span>Last run</span>
                      <span className="text-[var(--foreground)]">
                        {scraperStatus.last_run_at
                          ? new Date(scraperStatus.last_run_at).toLocaleString()
                          : "Not yet"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between theme-muted">
                      <span>Next run</span>
                      <span className="text-[var(--foreground)]">
                        {scraperStatus.next_run_at
                          ? new Date(scraperStatus.next_run_at).toLocaleString()
                          : scraperStatus.enabled
                          ? "Pending"
                          : "Disabled"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between theme-muted">
                      <span>Scanned</span>
                      <span className="text-[var(--foreground)]">{scraperStatus.scanned}</span>
                    </div>
                    <div className="flex items-center justify-between theme-muted">
                      <span>New alerts</span>
                      <span className="text-[var(--foreground)]">{scraperStatus.alerts_created}</span>
                    </div>
                  </>
                ) : (
                  <div className="rounded-xl border border-dashed theme-border theme-surface-2 px-4 py-3 theme-muted">
                    <p className="font-semibold text-[var(--foreground)]">Scraper status unavailable.</p>
                    <p className="mt-1 text-xs">
                      {hasAuth
                        ? "Run the scraper to generate a status snapshot."
                        : "Sign in to load scraper status."}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className="border theme-border bg-[var(--surface)]">
              <CardHeader>
                <CardTitle>Usage-based billing</CardTitle>
                <CardDescription>$4.50 per compliance scan</CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {usage ? (
                  <>
                    <div className="rounded-xl border theme-border theme-surface-2 px-4 py-3">
                      <p className="text-sm theme-muted">September usage</p>
                      <div className="mt-2 flex items-baseline justify-between">
                        <p className="text-3xl font-semibold text-[var(--foreground)]">
                          ${usage.total_cost.toFixed(2)}
                        </p>
                        <p className="text-sm theme-muted">{usage.total_scans} scans</p>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-sm theme-muted">
                        <span>Included scans</span>
                        <span className="text-[var(--foreground)]">{includedScans}</span>
                      </div>
                      <Progress value={usagePercent} className="bg-[var(--surface-2)]" />
                    </div>
                    <div className="flex items-center gap-3 text-sm">
                      <Badge className="bg-emerald-100 text-emerald-700">On track</Badge>
                      <span className="theme-muted">Projected spend: $112</span>
                    </div>
                  </>
                ) : (
                  <div className="rounded-xl border border-dashed theme-border theme-surface-2 px-4 py-4 text-sm theme-muted">
                    <p className="font-semibold text-[var(--foreground)]">No usage data yet.</p>
                    <p className="mt-1">
                      {hasAuth
                        ? "Run a scan to start tracking usage."
                        : "Sign in to load billing data."}
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
            <Card className="bg-[var(--surface)]">
              <CardHeader>
                <CardTitle>AI audit trail</CardTitle>
                <CardDescription>Last automated actions logged.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                {auditTrail.length === 0 ? (
                  <div className="rounded-xl border border-dashed theme-border theme-surface-2 px-4 py-4 text-sm theme-muted">
                    <p className="font-semibold text-[var(--foreground)]">No audit events yet.</p>
                    <p className="mt-1">
                      {hasAuth
                        ? "Trigger a scan or policy audit to populate the log."
                        : "Sign in to load your audit history."}
                    </p>
                  </div>
                ) : (
                  <>
                    {auditTrail.map((item) => (
                      <div
                        key={`${item.id}-${item.action}`}
                        className="rounded-xl border theme-border theme-surface-2 px-4 py-3"
                      >
                        <p className="font-semibold text-[var(--foreground)]">
                          {item.action.replace(/_/g, " ")}
                        </p>
                        <p className="theme-muted">{item.summary ?? "Logged action"}</p>
                        <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                          {new Date(item.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))}
                    <Button variant="ghost" className="w-full justify-center">
                      View full audit trail
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </section>
      </div>
    </div>
  );
}

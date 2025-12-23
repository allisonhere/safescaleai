import Link from "next/link";

import { AuthPanel } from "@/components/auth-panel";
import { EmbeddingSettingsPanel } from "@/components/embedding-settings-panel";
import { MCPEmailPanel } from "@/components/mcp-email-panel";
import { ScraperFeedsPanel } from "@/components/scraper-feeds-panel";
import { ScraperTrigger } from "@/components/scraper-trigger";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerAuthToken } from "@/lib/api-server";

export default async function SettingsPage() {
  const hasAuth = Boolean(await getServerAuthToken());

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#d9f5e3,_#f7f6f2_40%,_#f2f6ff_100%)] text-zinc-900">
      <div className="relative mx-auto max-w-5xl px-6 pb-16 pt-10">
        <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-emerald-600">
              SafeScale AI
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Settings</h1>
            <p className="text-base text-zinc-600">
              Manage API access, embeddings, and MCP integrations.
            </p>
          </div>
          <Button asChild variant="secondary">
            <Link href="/">Back to dashboard</Link>
          </Button>
        </header>

        {!hasAuth ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm text-amber-800">
            Sign in to unlock backend settings and live data.
          </div>
        ) : null}

        <section className="mt-8 space-y-6">
          <Card className="bg-white/90">
            <CardHeader>
            <CardTitle>Account access</CardTitle>
            <CardDescription>Log in or create a new account.</CardDescription>
          </CardHeader>
          <CardContent>
            <AuthPanel />
          </CardContent>
        </Card>

          <Card className="bg-white/90">
            <CardHeader>
              <CardTitle>Embeddings</CardTitle>
              <CardDescription>Adjust similarity thresholds for policy audits.</CardDescription>
            </CardHeader>
            <CardContent>
              <EmbeddingSettingsPanel />
            </CardContent>
          </Card>

          <Card className="bg-white/90">
            <CardHeader>
              <CardTitle>MCP email connector</CardTitle>
              <CardDescription>Inspect the local MBOX connector.</CardDescription>
            </CardHeader>
            <CardContent>
              <MCPEmailPanel />
            </CardContent>
          </Card>

          <Card className="bg-white/90">
            <CardHeader>
              <CardTitle>Scraper controls</CardTitle>
              <CardDescription>Manually sync the regulatory scraper.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <ScraperTrigger />
                <div className="border-t border-zinc-200 pt-4">
                  <div className="space-y-2">
                    <p className="text-sm font-semibold text-zinc-900">Feed sources</p>
                    <p className="text-xs text-zinc-500">
                      Add or remove RSS/Atom feeds for the scraper.
                    </p>
                  </div>
                  <div className="mt-3">
                    <ScraperFeedsPanel />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}

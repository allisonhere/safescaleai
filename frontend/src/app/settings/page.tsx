import Link from "next/link";

import { ApiKeyPanel } from "@/components/api-key-panel";
import { EmbeddingSettingsPanel } from "@/components/embedding-settings-panel";
import { MCPEmailPanel } from "@/components/mcp-email-panel";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getServerApiKey } from "@/lib/api-server";

export default async function SettingsPage() {
  const hasApiKey = Boolean(await getServerApiKey());

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

        {!hasApiKey ? (
          <div className="mt-6 rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm text-amber-800">
            Add your org API key to unlock backend settings and live data.
          </div>
        ) : null}

        <section className="mt-8 space-y-6">
          <Card className="bg-white/90">
            <CardHeader>
              <CardTitle>API access</CardTitle>
              <CardDescription>Store your org API key for local use.</CardDescription>
            </CardHeader>
            <CardContent>
              <ApiKeyPanel />
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
        </section>
      </div>
    </div>
  );
}

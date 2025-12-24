"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { apiHeaders } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type DownloadFileButtonProps = {
  endpoint: string;
  filename: string;
  label: string;
  variant?: "primary" | "secondary" | "ghost";
};

export function DownloadFileButton({
  endpoint,
  filename,
  label,
  variant = "ghost",
}: DownloadFileButtonProps) {
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const download = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_URL}${endpoint}`, {
        headers: apiHeaders(),
      });
      if (!response.ok) {
        throw new Error("Export failed");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Export failed");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-1">
      <Button variant={variant} size="sm" onClick={download} disabled={isLoading}>
        {isLoading ? "Exporting..." : label}
      </Button>
      {error ? <p className="text-xs text-rose-600">{error}</p> : null}
    </div>
  );
}

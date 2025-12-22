"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { apiHeaders } from "@/lib/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

type AuditDownloadButtonProps = {
  auditId: number;
  filename?: string | null;
};

export function AuditDownloadButton({ auditId, filename }: AuditDownloadButtonProps) {
  const [isLoading, setIsLoading] = React.useState(false);

  const download = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/policy/audits/${auditId}/report`, {
        headers: apiHeaders(),
      });
      if (!response.ok) {
        throw new Error("Download failed");
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename ? `policy-audit-${auditId}-${filename}.json` : `policy-audit-${auditId}.json`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Button size="sm" onClick={download} disabled={isLoading}>
      {isLoading ? "Downloading..." : "Download report"}
    </Button>
  );
}

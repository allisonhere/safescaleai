"use client";

import * as React from "react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";

export function HeaderActions() {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-3">
        <ThemeToggle />
        <Button variant="ghost" asChild>
          <Link href="/settings">Settings</Link>
        </Button>
      </div>
    </div>
  );
}

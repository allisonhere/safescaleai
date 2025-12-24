"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";

const STORAGE_KEY = "safescale_theme";

const THEMES = ["light", "dark", "jellyseerr", "obsidian"] as const;
type Theme = (typeof THEMES)[number];

const THEME_LABELS: Record<Theme, string> = {
  light: "Light",
  dark: "Dark",
  jellyseerr: "Jellyseerr",
  obsidian: "Obsidian",
};

function getCurrentTheme(): Theme {
  if (typeof document === "undefined") {
    return "light";
  }
  const attr = document.documentElement.dataset.theme as Theme | undefined;
  return attr && THEMES.includes(attr) ? attr : "light";
}

export function ThemeToggle() {
  const [theme, setTheme] = React.useState<Theme>("light");

  React.useEffect(() => {
    setTheme(getCurrentTheme());
  }, []);

  const toggleTheme = () => {
    const index = THEMES.indexOf(theme);
    const next = THEMES[(index + 1) % THEMES.length];
    document.documentElement.dataset.theme = next;
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore storage errors.
    }
    setTheme(next);
  };

  return (
    <Button variant="ghost" onClick={toggleTheme}>
      Theme: {THEME_LABELS[theme]}
    </Button>
  );
}

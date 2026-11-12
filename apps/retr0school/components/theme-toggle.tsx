"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";

export const THEME_KEY = "w3h-theme";

function applyTheme(theme: "light" | "dark") {
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
  localStorage.setItem(THEME_KEY, theme);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark" | "unknown">("unknown");

  useEffect(() => {
    const stored = localStorage.getItem(THEME_KEY);
    const dark = stored !== "light";
    document.documentElement.classList.toggle("dark", dark);
    document.documentElement.style.colorScheme = dark ? "dark" : "light";
    setTheme(dark ? "dark" : "light");
  }, []);

  function toggle() {
    const next = document.documentElement.classList.contains("dark") ? "light" : "dark";
    applyTheme(next);
    setTheme(next);
  }

  const label =
    theme === "dark" ? "Switch to light theme" : theme === "light" ? "Switch to dark theme" : "Toggle color theme";

  return (
    <Button type="button" variant="outline" size="icon" data-testid="theme-toggle" aria-label={label} onClick={toggle}>
      {theme === "dark" ? <Sun className="h-4 w-4" aria-hidden /> : <Moon className="h-4 w-4" aria-hidden />}
    </Button>
  );
}

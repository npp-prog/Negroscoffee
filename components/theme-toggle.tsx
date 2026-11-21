"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const noop = () => () => {};

export function ThemeToggle({
  className,
  variant = "glass",
}: {
  className?: string;
  variant?: "glass" | "ghost";
}) {
  const { resolvedTheme, setTheme } = useTheme();
  // Avoid hydration mismatch: theme is only known on the client.
  const mounted = useSyncExternalStore(
    noop,
    () => true,
    () => false,
  );
  const isDark = mounted && resolvedTheme === "dark";

  return (
    <Button
      variant={variant}
      size="icon"
      className={cn("rounded-full", className)}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => setTheme(isDark ? "light" : "dark")}
    >
      {isDark ? <Sun /> : <Moon />}
    </Button>
  );
}

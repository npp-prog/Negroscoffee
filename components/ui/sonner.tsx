"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner, type ToasterProps } from "sonner";

export function Toaster(props: ToasterProps) {
  const { resolvedTheme } = useTheme();
  return (
    <Sonner
      theme={(resolvedTheme as ToasterProps["theme"]) ?? "system"}
      position="top-center"
      toastOptions={{
        classNames: {
          toast: "!rounded-2xl !border-border !bg-surface !text-foreground !shadow-float",
          description: "!text-muted-foreground",
        },
      }}
      {...props}
    />
  );
}

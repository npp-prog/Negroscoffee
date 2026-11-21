"use client";

import { useEffect } from "react";

/** Registers the service worker in production builds only (dev would cache stale assets). */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch((err) => {
      console.warn("Service worker registration failed", err);
    });
  }, []);
  return null;
}

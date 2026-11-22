import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import { preconnect } from "react-dom";

import { Providers } from "@/components/providers";
import { PwaRegister } from "@/components/pwa-register";
import { Toaster } from "@/components/ui/sonner";
import { siteUrl } from "@/lib/site";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"], display: "swap" });
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  axes: ["SOFT", "opsz"],
});

const site = siteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: { default: "Kape Negros — Coffee shops on Negros Island", template: "%s · Kape Negros" },
  description:
    "Find every coffee shop on Negros Island — Bacolod, Dumaguete and beyond — by price and style, on one beautiful map.",
  applicationName: "Kape Negros",
  appleWebApp: { capable: true, title: "Kape Negros", statusBarStyle: "default" },
  icons: {
    icon: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
  openGraph: { siteName: "Kape Negros", locale: "en_PH", type: "website" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F6F1EA" },
    { media: "(prefers-color-scheme: dark)", color: "#15100C" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  // Start TLS handshakes to the map and data hosts before the map code asks for them.
  preconnect("https://api.maptiler.com", { crossOrigin: "anonymous" });
  if (process.env.NEXT_PUBLIC_SUPABASE_URL) {
    preconnect(process.env.NEXT_PUBLIC_SUPABASE_URL, { crossOrigin: "anonymous" });
  }
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${fraunces.variable}`}>
      <body className="min-h-dvh">
        <Providers>
          {children}
          <Toaster />
          <PwaRegister />
        </Providers>
      </body>
    </html>
  );
}

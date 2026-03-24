import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ServiceWorkerRegistration } from "@/components/pwa-registration";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RakshaTap - Offline Women Safety App | HackXtreme",
  description: "One-tap emergency safety app with local AI. Voice-activated SOS, offline AI advisor, zero cloud costs. 100% privacy - runs completely offline.",
  keywords: [
    "women safety",
    "emergency app",
    "SOS",
    "offline app",
    "local AI",
    "HackXtreme",
    "privacy",
    "voice activated",
    "PWA",
    "RunAnywhere"
  ],
  authors: [{ name: "RakshaTap Team" }],
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/logo.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/logo.svg", type: "image/svg+xml" },
    ],
  },
  openGraph: {
    title: "RakshaTap - Offline Women Safety App",
    description: "One-tap emergency safety with local AI. Voice-activated SOS, works offline, zero cloud costs.",
    url: "https://github.com/Nishu15205/rakshaTap",
    siteName: "RakshaTap",
    type: "website",
    images: [
      {
        url: "/logo.svg",
        width: 512,
        height: 512,
        alt: "RakshaTap Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "RakshaTap - Offline Women Safety App",
    description: "One-tap emergency safety with local AI. Voice-activated SOS, works offline.",
    images: ["/logo.svg"],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "RakshaTap",
  },
  formatDetection: {
    telephone: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#dc2626" },
    { media: "(prefers-color-scheme: dark)", color: "#09090b" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* PWA Meta Tags */}
        <meta name="application-name" content="RakshaTap" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="RakshaTap" />
        <meta name="msapplication-TileColor" content="#dc2626" />
        <meta name="msapplication-tap-highlight" content="no" />
        
        {/* Offline capability hint */}
        <meta name="offline-capable" content="yes" />
        
        {/* RunAnywhere SDK hint */}
        <meta name="run-anywhere" content="enabled" />
      </head>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ServiceWorkerRegistration />
        {children}
        <Toaster />
      </body>
    </html>
  );
}

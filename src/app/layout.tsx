import type { Metadata } from "next";
import { Geist, Geist_Mono, Sora } from "next/font/google";
import Script from "next/script";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/providers";
import { PresenceTracker } from "@/components/presence-tracker";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const sora = Sora({
  variable: "--font-sora",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Music Prompt Generator - AI-Powered Music Creation Prompts",
  description: "Create detailed music prompts for AI music generators like Suno, Udio, Google Music Flow, Mureka, and Happy Shrimp. Transform simple ideas into rich, detailed prompts.",
  keywords: ["Music AI", "Suno", "Udio", "Google Music Flow", "Mureka", "Happy Shrimp", "Prompt Generator", "AI Music", "Music Creation", "ViaWeb"],
  authors: [{ name: "ViaWeb", url: "https://www.viaweb.pro" }],
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
    apple: "/favicon.svg",
  },
  verification: {
    google: "muBojmZJeaB-Y201dx2ZEJ8wGWqEaef6u33dD8lVBAU",
  },
};

const GA_ID = process.env.NEXT_PUBLIC_GA_ID;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${sora.variable} antialiased bg-background text-foreground`}
      >
        <Providers>
          {children}
          <Toaster />
          <PresenceTracker />
        </Providers>

        {/* Google Analytics 4 (GA4) Integration */}
        {GA_ID && (
          <>
            <Script
              strategy="afterInteractive"
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_ID}`}
            />
            <Script
              id="google-analytics"
              strategy="afterInteractive"
              dangerouslySetInnerHTML={{
                __html: `
                  window.dataLayer = window.dataLayer || [];
                  function gtag(){dataLayer.push(arguments);}
                  gtag('js', new Date());
                  gtag('config', '${GA_ID}', {
                    page_path: window.location.pathname,
                  });
                `,
              }}
            />
          </>
        )}
      </body>
    </html>
  );
}

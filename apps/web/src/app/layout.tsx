import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "@/components/ui/sonner";

import "./globals.css";
import "./clerk.css";
import Script from "next/script";
import { CSPostHogProvider } from "./providers";
import PostHogPageView from "@/components/PostHogPageView";

export const metadata: Metadata = {
  title: "Flowble",
  other: {
    "google-adsense-account": "ca-pub-3191192737129047",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>
      <html lang="en" className="dark">
        <Script
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-3191192737129047"
          crossOrigin="anonymous"
        />
        <CSPostHogProvider>
          <body className="antialiased font-dmSans">
            <PostHogPageView />
            <div vaul-drawer-wrapper="">{children}</div>
            <Toaster />
          </body>
        </CSPostHogProvider>
      </html>
    </ClerkProvider>
  );
}

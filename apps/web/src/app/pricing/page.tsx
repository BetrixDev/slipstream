import { Footer } from "@/components/footer";
import TopNav from "@/components/top-nav";
import { HeroHighlight } from "@/components/ui/hero-highlight";
import { Suspense } from "react";
import { Server } from "./components/server";
import { Fallback } from "./components/fallback";
import { type Metadata } from "next";
import { IMAGE_LINKS } from "@/lib/utils";

export const experimental_ppr = true;

export const metadata: Metadata = {
  title: "Pricing - Flowble",
  description: "Pricing for Flowble",
  keywords: [
    "Flowble",
    "Pricing",
    "Pro",
    "Business",
    "Enterprise",
    "Video Sharing",
    "Upload Videos",
    "Trim Videos",
    "Fast Uploads",
    "Free",
    "Stream",
  ],
  icons: {
    icon: "/favicon.ico",
  },
  twitter: {
    title: "Pricing - Flowble",
    description: "Pricing for Flowble",
    card: "summary_large_image",
    images: IMAGE_LINKS,
  },
  openGraph: {
    title: "Pricing - Flowble",
    description: "Pricing for Flowble",
    images: IMAGE_LINKS,
    locale: "en-US",
    siteName: "Flowble",
    url: "https://flowble.app/pricing",
    type: "website",
  },
};

export default async function Page() {
  return (
    <HeroHighlight className="min-h-screen flex flex-col">
      <TopNav />
      <Suspense fallback={<Fallback />}>
        <Server />
      </Suspense>
      <Footer />
    </HeroHighlight>
  );
}

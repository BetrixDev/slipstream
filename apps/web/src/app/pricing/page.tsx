import { Footer } from "@/components/footer";
import TopNav from "@/components/top-nav";
import { HeroHighlight } from "@/components/ui/hero-highlight";
import { Suspense } from "react";
import { Server } from "./components/server";
import { Fallback } from "./components/fallback";
import TopNavFallback from "@/components/top-nav-fallback";

export const experimental_ppr = true;

export default async function Page() {
  return (
    <HeroHighlight className="min-h-screen flex flex-col">
      <Suspense fallback={<TopNavFallback />}>
        <TopNav />
      </Suspense>
      <Suspense fallback={<Fallback />}>
        <Server />
      </Suspense>
      <Footer />
    </HeroHighlight>
  );
}

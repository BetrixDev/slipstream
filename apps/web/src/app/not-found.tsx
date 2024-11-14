import TopNav from "@/components/top-nav";
import TopNavFallback from "@/components/top-nav-fallback";
import { Suspense } from "react";

export const experimental_ppr = true;

export default function NotFound() {
  return (
    <main className="h-screen flex flex-col justify-center">
      <Suspense fallback={<TopNavFallback />}>
        <TopNav />
      </Suspense>
      <div className="text-xl grow flex items-center justify-center">Page not found</div>
    </main>
  );
}

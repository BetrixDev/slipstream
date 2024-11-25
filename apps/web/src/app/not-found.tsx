import TopNav from "@/components/top-nav";

export const experimental_ppr = true;

export default function NotFound() {
  return (
    <main className="h-screen flex flex-col justify-center">
      <TopNav />
      <div className="text-xl grow flex items-center justify-center">Page not found</div>
    </main>
  );
}

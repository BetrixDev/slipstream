import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Toaster } from "@/components/ui/sonner";

import "./globals.css";
import "./clerk.css";

export const metadata: Metadata = {
  title: "Flowble",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider publishableKey={process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY}>
      <html lang="en">
        <body className="antialiased font-dmSans">
          <div vaul-drawer-wrapper="">{children}</div>
          <Toaster />
        </body>
      </html>
    </ClerkProvider>
  );
}

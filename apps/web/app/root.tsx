import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "@remix-run/react";
import type { LinksFunction, LoaderFunction, MetaFunction } from "@vercel/remix";
import { dark } from "@clerk/themes";
import { rootAuthLoader } from "@clerk/remix/ssr.server";
import { ClerkApp } from "@clerk/remix";
import { SpeedInsights } from "@vercel/speed-insights/remix";
import { cssBundleHref } from "@remix-run/css-bundle";
import { Analytics } from "@vercel/analytics/react";
import styles from "./tailwind.css?url";
import sonnerStyles from "./sonner.css?url";
import clerkStyles from "./clerk.css?url";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "./components/ui/sonner";

export const meta: MetaFunction = () => {
  return [
    { title: "Flowble" },
    { name: "description", content: "The fastest video sharing service" },
  ];
};

export const loader: LoaderFunction = (args) => rootAuthLoader(args);

export const links: LinksFunction = () => [
  {
    rel: "stylesheet",
    href: styles,
  },
  {
    rel: "stylesheet",
    href: sonnerStyles,
  },
  {
    rel: "stylesheet",
    href: clerkStyles,
  },
  {
    rel: "icon",
    href: "/icons/favicon-16x16.ico",
    sizes: "16x16",
    type: "image/x-icon",
  },
  {
    rel: "icon",
    href: "/icons/favicon-32x32.png",
    sizes: "32x32",
    type: "image/png",
  },
  {
    rel: "icon",
    href: "/icons/favicon-192x192.png",
    sizes: "192x192",
    type: "image/png",
  },
  {
    rel: "icon",
    href: "/icons/favicon-512x512.png",
    sizes: "512x512",
    type: "image/png",
  },
  {
    rel: "apple-touch-icon",
    href: "/icons/favicon-192x192.png",
    sizes: "192x192",
  },
  ...(cssBundleHref ? [{ rel: "stylesheet", href: cssBundleHref }] : []),
];

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
      refetchOnWindowFocus: false,
    },
  },
});

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <Meta />
        <Links />
      </head>
      <body className="dark">
        <QueryClientProvider client={queryClient}>
          {children}
          <Toaster />
          <ScrollRestoration />
          <Scripts />
          <SpeedInsights />
          <Analytics />
        </QueryClientProvider>
      </body>
    </html>
  );
}

function App() {
  return <Outlet />;
}

export default ClerkApp(App, {
  appearance: {
    baseTheme: dark,
  },
});

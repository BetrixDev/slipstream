import type { MetaFunction } from "@remix-run/node";
import { Button } from "~/components/ui/button";
import { Link } from "@remix-run/react";
import { Input } from "~/components/ui/input";
import { Share2, Upload, Zap } from "lucide-react";
import TopNav from "~/components/TopNav";
import { SignUpButton } from "@clerk/remix";
import { HeroHighlight } from "~/components/ui/hero-highlight";

export const meta: MetaFunction = () => {
  return [
    { title: "Flowble" },
    { name: "og:title", content: "Flowble" },
    { name: "twitter:title", content: "Flowble" },
    { name: "description", content: "The fastest video sharing service" },
    { name: "og:description", content: "The fastest video sharing service" },
    { name: "twitter:description", content: "The fastest video sharing service" },
    {
      name: "og:type",
      content: "website",
    },
    {
      name: "twitter:card",
      content: "summary",
    },
    {
      name: "twitter:url",
      content: "https://www.flowble.app",
    },
    {
      name: "twitter:image",
      content: "https://utfs.io/f/GtjuzTxrWKtnc6xRppAT9nGXFIZqmMfu6KvNV0jWoxkREwr8",
    },
    {
      name: "og:image",
      content: "https://utfs.io/f/GtjuzTxrWKtnc6xRppAT9nGXFIZqmMfu6KvNV0jWoxkREwr8",
    },
  ];
};

export default function Index() {
  const origin = typeof window === "object" ? window.origin : "";

  return (
    <HeroHighlight>
      <TopNav />
      <div className="flex flex-col min-h-screen">
        <main className="flex-1">
          <section className="w-full h-96 md:h-[700px] flex justify-center items-center">
            <div className="container px-4 md:px-6">
              <div className="flex flex-col items-center space-y-4 text-center">
                <div className="space-y-2">
                  <h1 className="text-4xl sm:text-6xl font-bold text-primary bg-clip-text">
                    Share Videos in a Flash
                  </h1>
                  <p className="mx-auto max-w-[700px] text-gray-500 md:text-xl dark:text-gray-400">
                    Flowble makes it incredibly easy and fast to share your favorite moments with
                    friends. Upload, send, and enjoy videos together in seconds.
                  </p>
                </div>
                <div className="space-x-4">
                  <SignUpButton forceRedirectUrl={`${origin}/videos`}>
                    <Button className="">Start Sharing</Button>
                  </SignUpButton>
                  <Button variant="outline" disabled>
                    How It Works
                  </Button>
                </div>
              </div>
            </div>
          </section>
          <section className="w-full min-h-96 py-4 flex items-center justify-center bg-background/5 backdrop-blur-sm">
            <div>
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-center mb-12">
                Why Users Love Flowble
              </h2>
              <div className="grid gap-10 sm:grid-cols-1 lg:grid-cols-3">
                <div className="flex flex-col items-center space-y-3 text-center">
                  <Upload className="h-12 w-12 text-blue-300" />
                  <h3 className="text-xl font-bold">Quick Uploads</h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Upload your videos in seconds with our streamlined interface.
                  </p>
                </div>
                <div className="flex flex-col items-center space-y-3 text-center">
                  <Share2 className="h-12 w-12 text-emerald-600" />
                  <h3 className="text-xl font-bold">Instant Sharing</h3>
                  <div className="text-gray-500 dark:text-gray-400">
                    Share videos with anyone immediately after uploading.
                    <p className="text-sm">
                      We generate an optmized version of your video in the background
                    </p>
                  </div>
                </div>
                <div className="flex flex-col items-center space-y-3 text-center ">
                  <Zap className="h-12 w-12 text-primary text-yellow-300" />
                  <h3 className="text-xl font-bold">Lightning Fast</h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Experience rapid video loading and smooth playback.
                  </p>
                </div>
              </div>
            </div>
          </section>
          <section className="w-full flex justify-center items-center h-96">
            <div className="container px-4 md:px-6">
              <div className="flex flex-col items-center justify-center space-y-4 text-center">
                <div className="space-y-2">
                  <h2 className="text-3xl font-bold tracking-tighter sm:text-5xl">
                    Ready to Share Your Moments?
                  </h2>
                  <p className="max-w-[600px] text-gray-500 md:text-xl/relaxed lg:text-base/relaxed xl:text-xl/relaxed dark:text-gray-400">
                    Join Flowble today and start sharing your videos in no time.
                  </p>
                </div>
                <div className="w-full max-w-sm space-y-2">
                  <form className="flex space-x-2">
                    <Input
                      className="max-w-lg flex-1 bg-background/50 backdrop-blur-md"
                      placeholder="Enter your email"
                      type="email"
                    />
                    <Button type="submit">Sign Up</Button>
                  </form>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    By signing up, you agree to our{" "}
                    <Link className="underline underline-offset-2" to="#">
                      Terms & Conditions
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </section>
        </main>
        <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t bg-background/5 backdrop-blur-sm">
          <p className="text-xs text-gray-500 dark:text-gray-400">
            © 2024 Flowble. All rights reserved.
          </p>
          <nav className="sm:ml-auto flex gap-4 sm:gap-6">
            <Link className="text-xs hover:underline underline-offset-4" to="#">
              Terms of Service
            </Link>
            <Link className="text-xs hover:underline underline-offset-4" to="#">
              Privacy
            </Link>
          </nav>
        </footer>
      </div>
    </HeroHighlight>
  );
}

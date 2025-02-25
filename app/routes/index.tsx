import { Footer } from "../components/footer";
import TopNav from "../components/top-nav";
import { Button } from "@/components/ui/button";
import { HeroHighlight } from "@/components/ui/hero-highlight";
import { Input } from "@/components/ui/input";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ClapperboardIcon, Share2Icon, UploadIcon } from "lucide-react";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
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
                    Slipstream makes it incredibly easy and fast to share your
                    favorite moments with friends. Upload, send, and enjoy
                    videos together in seconds.
                  </p>
                </div>
                <div className="space-x-4">
                  <Link to="/videos">
                    <Button>Start Sharing</Button>
                  </Link>
                </div>
              </div>
            </div>
          </section>
          <section className="w-full min-h-96 py-4 flex items-center justify-center bg-background/5 backdrop-blur-sm">
            <div>
              <h2 className="text-3xl font-bold tracking-tighter sm:text-4xl md:text-5xl text-center mb-12">
                Why Users Love Slipstream
              </h2>
              <div className="grid gap-10 sm:grid-cols-1 lg:grid-cols-3">
                <div className="flex flex-col items-center space-y-3 text-center">
                  <UploadIcon className="h-12 w-12 text-red-500" />
                  <h3 className="text-xl font-bold">Quick Uploads</h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Upload your videos in seconds with our streamlined interface
                  </p>
                </div>
                <div className="flex flex-col items-center space-y-3 text-center">
                  <Share2Icon className="h-12 w-12 text-red-400" />
                  <h3 className="text-xl font-bold">Instant Sharing</h3>
                  <div className="text-gray-500 dark:text-gray-400">
                    Share videos with anyone immediately after uploading
                  </div>
                </div>
                <div className="flex flex-col items-center space-y-3 text-center ">
                  <ClapperboardIcon className="h-12 w-12 text-red-500" />
                  <h3 className="text-xl font-bold">Trim Videos</h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    Trim any video before upload to speed up upload time
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
                    Join Slipstream today and start sharing your videos in no
                    time.
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
                    <Link className="underline underline-offset-2" to="/">
                      Terms & Conditions
                    </Link>
                  </p>
                </div>
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </div>
    </HeroHighlight>
  );
}

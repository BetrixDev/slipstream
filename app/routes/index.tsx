import { BlurFade } from "@/components/blur-fade-text";
import { Button } from "@/components/ui/button";
import { HeroHighlight } from "@/components/ui/hero-highlight";
import { Link, createFileRoute } from "@tanstack/react-router";
import {
  ChevronRightIcon,
  GlobeIcon,
  PlayIcon,
  ShieldIcon,
  UploadIcon,
  UsersIcon,
  ZapIcon,
} from "lucide-react";
import { Footer } from "../components/footer";
import TopNav from "../components/top-nav";

export const Route = createFileRoute("/")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <HeroHighlight>
      <TopNav />
      <main className="flex-1">
        <section className="lg:mx-32 md:mx-12 relative py-20 lg:py-24 overflow-hidden h-[calc(100vh-15rem)]">
          <div className="container relative z-10">
            <div className="grid md:grid-cols-2 gap-12 items-center">
              <div className="space-y-6">
                <h1 className="text-4xl md:text-6xl font-bold tracking-tight md:text-left text-center text-balance">
                  <BlurFade>
                    Share videos instantly{" "}
                    <ZapIcon
                      fill="currentColor"
                      className="text-red-400 w-12 h-12 hidden md:inline-block"
                    />
                  </BlurFade>
                  <BlurFade delay={0.25}>with anyone</BlurFade>
                </h1>
                <p className="text-xl text-muted-foreground md:text-left text-center text-balance">
                  Slipstream makes it simple to share high-quality videos with friends or embed them
                  beautifully on your website.
                </p>
                <div className="flex flex-row gap-4 justify-center md:justify-start">
                  <Link to="/videos">
                    <Button size="lg" className="gap-2">
                      Get Started <ChevronRightIcon className="h-4 w-4" />
                    </Button>
                  </Link>
                </div>
                <div className="text-sm text-muted-foreground md:text-left text-center">
                  No credit card required • Free plan available
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 md:py-32 bg-muted">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold">
              Simple, fast video sharing for everyone
            </h2>
            <p className="text-xl text-muted-foreground">
              Slipstream provides all the tools you need to share videos quickly and embed them
              anywhere.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8 lg:mx-32 md:mx-8 mx-2">
            {[
              {
                icon: <UploadIcon className="h-10 w-10 text-primary" />,
                title: "Instant sharing",
                description:
                  "Upload and share videos in seconds with a simple link that works everywhere.",
              },
              {
                icon: <GlobeIcon className="h-10 w-10 text-primary" />,
                title: "Beautiful embeds",
                description:
                  "Embed your videos on any website with customizable players that look great.",
              },
              {
                icon: <ShieldIcon className="h-10 w-10 text-primary" />,
                title: "Privacy controls",
                description:
                  "Choose who can view your videos with simple privacy settings and password protection.",
              },
              {
                icon: <UsersIcon className="h-10 w-10 text-primary" />,
                title: "Easy sharing",
                description:
                  "Share directly to friends via email, messaging apps, or social media with one click.",
              },
              {
                icon: <ZapIcon className="h-10 w-10 text-primary" />,
                title: "Lightning fast",
                description:
                  "Videos load instantly with our optimized delivery network, no matter the device.",
              },
              {
                icon: <PlayIcon className="h-10 w-10 text-primary" />,
                title: "High quality",
                description:
                  "Share in stunning 4K quality without compression, keeping your videos looking perfect.",
              },
            ].map((feature) => (
              <div
                key={feature.title}
                className="bg-zinc-900/50 rounded-lg p-6 border border-zinc-500/25 shadow-sm hover:shadow-md transition-shadow"
              >
                <div className="mb-4">{feature.icon}</div>
                <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How It Works Section */}
        <section className="py-20 md:py-32 mx-4">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold">How Slipstream works</h2>
            <p className="text-xl text-muted-foreground">
              Share your videos in three simple steps.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              {
                step: "01",
                title: "Upload your video",
                description: "We support most formats up at any quality.",
              },
              {
                step: "02",
                title: "Get your link",
                description: "Instantly receive a shareable link or embed code for your video.",
              },
              {
                step: "03",
                title: "Share anywhere",
                description: "Send to friends, family, or embed on your website with one click.",
              },
            ].map((step, i) => (
              <div key={step.step} className="relative">
                <div className="bg-background rounded-lg p-8 border border-zinc-500/25 shadow-sm h-full">
                  <div className="text-5xl font-bold text-primary/20 mb-4">{step.step}</div>
                  <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
                  <p className="text-muted-foreground">{step.description}</p>
                </div>
                {i < 2 && (
                  <div className="hidden md:block absolute top-1/2 -right-4 transform -translate-y-1/2 z-10">
                    <ChevronRightIcon className="h-8 w-8 text-muted-foreground translate-x-4" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-20 md:py-32 mx-4">
          <div className="max-w-4xl mx-auto text-center bg-primary/5 border border-primary/20 rounded-xl p-8 md:p-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to share your videos?</h2>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Start sharing high-quality videos with friends or embedding them on your website in
              seconds - no account required.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/videos">
                <Button size="lg" className="gap-2">
                  Upload a video <ChevronRightIcon className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </HeroHighlight>
  );
}

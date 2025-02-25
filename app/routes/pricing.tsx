import TopNav from "../components/top-nav";
import { HeroHighlight } from "@/components/ui/hero-highlight";
import { createFileRoute } from "@tanstack/react-router";
import { Footer } from "../components/footer";
import { useUser } from "@clerk/tanstack-start";
import { useState } from "react";
import { Tabs } from "../components/tabs";
import { AccountTierText } from "../components/account-tier-text";
import {
  ArrowRightIcon,
  CheckIcon,
  Crown,
  PiggyBank,
  Star,
  Zap,
} from "lucide-react";
import { ButtonLink } from "../components/pricing/button-link";
import { seo } from "@/lib/seo";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Description } from "@radix-ui/react-dialog";

const buttonStyles = {
  default: cn(
    "h-12 bg-white dark:bg-zinc-900",
    "hover:bg-zinc-50 dark:hover:bg-zinc-800",
    "text-zinc-900 dark:text-zinc-100",
    "border border-zinc-200 dark:border-zinc-800",
    "hover:border-zinc-300 dark:hover:border-zinc-700",
    "shadow-sm hover:shadow-md",
    "text-sm font-medium"
  ),
  highlight: cn(
    "h-12 bg-zinc-900 dark:bg-zinc-100",
    "hover:bg-zinc-800 dark:hover:bg-zinc-300",
    "text-white dark:text-zinc-900",
    "shadow-[0_1px_15px_rgba(0,0,0,0.1)]",
    "hover:shadow-[0_1px_20px_rgba(0,0,0,0.15)]",
    "font-semibold text-base"
  ),
};

const badgeStyles = cn(
  "px-4 py-1.5 text-sm font-medium",
  "bg-zinc-900 dark:bg-zinc-100",
  "text-white dark:text-zinc-900",
  "border-none shadow-md"
);

export const Route = createFileRoute("/pricing")({
  component: RouteComponent,
  head: () => ({
    meta: seo({
      title: "Pricing",
      description: "Choose the perfect plan for your video sharing needs",
    }),
  }),
});

function RouteComponent() {
  const { user } = useUser();

  const userEmail = user?.primaryEmailAddress?.emailAddress;
  const userAccountTier = user?.publicMetadata?.accountTier as
    | string
    | undefined;

  const [billingOption, setBillingOption] = useState<string>("monthly");

  const isYearly = billingOption === "yearly";

  return (
    <HeroHighlight className="min-h-screen flex flex-col">
      <TopNav />
      <div className="relative overflow-hidden bg-transparent">
        <div className="mx-auto max-w-7xl px-6 pt-16 text-center lg:px-8">
          <div className="mx-auto max-w-4xl">
            <h1 className="text-4xl font-extrabold text-primary sm:text-5xl sm:tracking-tight lg:text-6xl">
              Slipstream Pricing
            </h1>
          </div>
          <p className="text-lg text-gray-600 dark:text-gray-400 text-center">
            Choose the perfect plan for your video sharing needs
          </p>
          <div className="w-full flex justify-center py-4">
            <Tabs
              className="bg-background w-[10.8rem] rounded-md border border-secondary shadow-md overflow-visible"
              setTab={setBillingOption}
              tabs={[
                { title: "Monthly", value: "monthly" },
                { title: "Yearly", value: "yearly" },
              ]}
            />
          </div>
        </div>
        <div className="flow-root z-20 bg-transparent pb-24 sm:pb-32 mt-4">
          <div className="px-4 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-4">
              {tiers.map((tier) => (
                <div
                  key={tier.name}
                  className={cn(
                    "relative group backdrop-blur-sm basis-1/3",
                    "rounded-3xl transition-all duration-300",
                    "flex flex-col",
                    tier.highlight
                      ? "bg-gradient-to-b from-zinc-100/80 to-transparent dark:from-zinc-400/[0.15]"
                      : "bg-white dark:bg-zinc-800/50",
                    "border",
                    tier.highlight
                      ? "border-zinc-400/50 dark:border-zinc-400/20 shadow-xl"
                      : "border-zinc-200 dark:border-zinc-700 shadow-md",
                    "hover:translate-y-0 hover:shadow-lg"
                  )}
                >
                  {tier.badge && tier.highlight && (
                    <div className="absolute -top-4 left-6">
                      <Badge className={badgeStyles}>
                        <div className="relative">
                          <div className="absolute inset-0 bg-gradient-to-r from-gray-500/30 to-gray-500/30 blur-2xl rounded-full" />
                          {tier.badge}
                        </div>
                      </Badge>
                    </div>
                  )}

                  <div className="p-8 flex-1">
                    <div className="flex items-center justify-between mb-4">
                      <div
                        className={cn(
                          "p-3 rounded-xl",
                          tier.highlight
                            ? "bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                            : "bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                        )}
                      >
                        {tier.icon}
                      </div>
                      <Badge
                        className={cn(
                          badgeStyles,
                          "dark:bg-background bg-background"
                        )}
                      >
                        <AccountTierText
                          accountTier={tier.name}
                          defaultColor="text-primary"
                        >
                          {tier.name}
                        </AccountTierText>
                      </Badge>
                    </div>

                    <div className="mb-6">
                      <div className="flex items-baseline gap-2">
                        <span className="text-4xl font-bold text-zinc-900 dark:text-zinc-100">
                          ${isYearly ? tier.price.yearly : tier.price.monthly}
                        </span>
                        <span className="text-sm text-zinc-500 dark:text-zinc-400">
                          /{isYearly ? "year" : "month"}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
                        {tier.description}
                      </p>
                    </div>

                    <div className="space-y-4">
                      {tier.features.map((feature) => (
                        <div key={feature.name} className="flex gap-4">
                          <div
                            className={cn(
                              "mt-1 p-0.5 rounded-full transition-colors duration-200 text-red-600 dark:text-red-400"
                            )}
                          >
                            <CheckIcon className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                              {feature.name}
                            </div>
                            <div className="text-sm text-zinc-500 dark:text-zinc-400">
                              {feature.description}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-8 pt-0 mt-auto">
                    <Button
                      className={cn(
                        "w-full relative transition-all duration-300",
                        tier.highlight
                          ? buttonStyles.highlight
                          : buttonStyles.default
                      )}
                    >
                      <span className="relative z-10 flex items-center justify-center gap-2">
                        {tier.price.monthly > 0 ? (
                          <>
                            Buy now
                            <ArrowRightIcon className="w-4 h-4" />
                          </>
                        ) : (
                          <>
                            Get started
                            <ArrowRightIcon className="w-4 h-4" />
                          </>
                        )}
                      </span>
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
      <Footer />
    </HeroHighlight>
  );
}

type Feature = {
  name: string;
  description?: string;
};

type PricingTier = {
  name: string;
  price: {
    monthly: number;
    yearly: number;
  };
  description: string;
  features: Feature[];
  highlight?: boolean;
  badge?: string;
  icon: React.ReactNode;
};

const tiers: PricingTier[] = [
  {
    name: "Free",
    price: {
      monthly: 0,
      yearly: 0,
    },
    description: "Perfect for sharing videos between friends",
    icon: (
      <PiggyBank className="w-7 h-7 relative z-10 text-gray-500 dark:text-gray-400 animate-[float_3s_ease-in-out_infinite]" />
    ),
    features: [
      {
        name: "3GB of storage space",
        description: "Determined by the file sizes you upload",
      },
      {
        name: "512mb max size per video",
        description:
          "Videos larger than 512mb will be automatically downscaled",
      },
      {
        name: "Upload 3 videos each day",
        description:
          "This is a limit on the number of videos you can upload each day",
      },
      {
        name: "Native video quality",
        description: "You can always view the exact file you uploaded",
      },
      {
        name: "Basic analytics",
        description: "Basic analytics includes total views on a video",
      },
      {
        name: "100 day video retention",
        description: "Videos will be deleted after 100 days",
      },
    ],
  },
  {
    name: "Pro",
    price: {
      monthly: 4,
      yearly: 40,
    },
    highlight: true,
    badge: "Great Value!",
    icon: (
      <Zap className="w-7 h-7 relative z-10 text-gray-500 dark:text-gray-400 animate-[float_3s_ease-in-out_infinite]" />
    ),
    description: "For when you don't want to lose your videos",
    features: [
      {
        name: "Everything in Free Tier",
        description: "You get all the features of the free tier",
      },
      {
        name: "100GB of storage space",
        description: "You can upload up to 100GB of videos",
      },
      {
        name: "Infinite video retention",
        description: "Videos will never be deleted",
      },
      {
        name: "Ad-free experience",
        description: "No banner ads when watching videos",
      },
      {
        name: "4GB max size per video",
        description: "You can upload videos up to 4GB in size",
      },
      {
        name: "Upload 12 videos each day",
        description: "You can upload up to 12 videos each day",
      },
    ],
  },
  {
    name: "Premium",
    price: {
      monthly: 12,
      yearly: 120,
    },
    description: "For that person who has too many videos",
    icon: (
      <Crown className="w-7 h-7 relative z-10 text-gray-500 dark:text-gray-400 animate-[float_3s_ease-in-out_infinite]" />
    ),
    features: [
      {
        name: "Everything in Pro Tier",
        description: "You get all the features of the pro tier",
      },
      {
        name: "800GB of storage space",
        description: "You can upload up to 800GB of videos",
      },
      {
        name: "No daily video upload limit",
        description: "You can upload as many videos as you want each day",
      },
    ],
  },
];

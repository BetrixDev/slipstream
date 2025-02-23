import TopNav from "../components/top-nav";
import { HeroHighlight } from "@/components/ui/hero-highlight";
import { createFileRoute } from "@tanstack/react-router";
import { Footer } from "../components/footer";
import { useUser } from "@clerk/tanstack-start";
import { useState } from "react";
import { Tabs } from "../components/tabs";
import { AccountTierText } from "../components/account-tier-text";
import { CheckIcon } from "lucide-react";
import { ButtonLink } from "../components/pricing/button-link";
import { seo } from "@/lib/seo";

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

  return (
    <HeroHighlight className="min-h-screen flex flex-col">
      <TopNav />
      <div className="relative overflow-hidden bg-transparent">
        <div className="mx-auto max-w-7xl px-6 pt-16 text-center lg:px-8">
          <div className="mx-auto max-w-4xl">
            <h1 className="text-4xl font-extrabold text-primary sm:text-5xl sm:tracking-tight lg:text-6xl">
              Flowble Pricing
            </h1>
          </div>
          <p className="text-lg text-gray-500 dark:text-gray-400 text-center">
            Choose the perfect plan for your video sharing needs
          </p>
          <div className="w-full flex justify-center py-4">
            <Tabs
              className="bg-background w-[11.95rem] rounded-md border border-secondary shadow-md overflow-visible"
              setTab={setBillingOption}
              tabs={[
                { title: "Monthly", value: "monthly" },
                { title: "Annually", value: "annually" },
              ]}
            />
          </div>
        </div>
        <div className="flow-root z-20 bg-transparent pb-24 sm:pb-32">
          <div className="mx-auto px-6 lg:px-8">
            <div className="flex justify-center gap-4 flex-wrap">
              {tiers.map((tier) => (
                <div
                  key={tier.id}
                  className="flex z-10 flex-col justify-between rounded-3xl bg-background p-6 shadow-xl ring-1 ring-gray-900/10 sm:p-8 dark:[border:1px_solid_rgba(100,100,255,.1)]"
                >
                  <div>
                    <AccountTierText
                      accountTier={tier.id}
                      defaultColor="text-blue-500"
                    >
                      <span className="text-lg font-bold leading-7">
                        {tier.name}
                      </span>
                    </AccountTierText>
                    <div className="mt-4 flex items-baseline">
                      <span className="text-4xl font-bold">$</span>
                      <span className="text-5xl font-bold tracking-tight text-primary font-sans">
                        {billingOption === "monthly"
                          ? tier.priceMonthly
                          : tier.priceAnually}
                      </span>
                      <span className="text-base font-semibold leading-7 text-primary">
                        /{billingOption === "monthly" ? "month" : "year"}
                      </span>
                    </div>
                    <p className="mt-2 text-base leading-7  text-primary">
                      {tier.description}
                    </p>
                    <ul className="mt-6 space-y-3 text-sm leading-6  text-primary">
                      {tier.features.map((feature) => (
                        <li key={feature.text} className="flex gap-x-3">
                          <CheckIcon
                            className="h-6 w-5 flex-none text-blue-600/90"
                            aria-hidden="true"
                          />
                          {feature.text}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <ButtonLink
                    accountTier={userAccountTier}
                    email={userEmail}
                    paymentLink={
                      (billingOption === "monthly"
                        ? tier.monthlyPaymentLink
                        : tier.annualPaymentLink) ?? ""
                    }
                    paymentTier={tier.id}
                  />
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

const tiers = [
  {
    name: "Free",
    id: "free",
    priceMonthly: "0",
    priceAnually: "0",
    description: "Perfect for sharing videos between friends",
    features: [
      {
        text: "3GB of storage space",
        infoTip:
          "Storage space is determined by the size of the uploaded video file. We will automatically create a seperate transcoded version of the video to ensure it is viewable on all devices with no extra space used on your account.",
      },
      {
        text: "512mb max size per video",
      },
      {
        text: "Upload 3 videos each day",
      },
      {
        text: "Native video quality",
        infoTip:
          "We retain and give you the ability to view the native video file you uploaded at any time. Upgrade to a paid tier to have mutliple video qualities available",
      },
      {
        text: "Basic analytics",
        infoTip: "Basic analytics includes total views on a video",
      },
      {
        text: "100 day video retention",
        infoTip: "Videos will be automatically deleted after 100 days",
      },
      {
        text: "Private and unlisted videos",
        infoTip:
          'Unlisted videos are not searchable and can only be viewed by those with the link. Private videos are only viewable by the owner. "Public" video with the typical definition are not apart of Flowble.',
      },
    ],
  },
  {
    name: "Pro",
    id: "pro",
    monthlyPaymentLink: "https://pay.flowble.app/b/aEU16U4CQdRP80w8wE",
    annualPaymentLink: "https://pay.flowble.app/b/14k02Qedq00Z0y44gp",
    priceMonthly: "4",
    priceAnually: "40",
    description: "Great for anyone who needs more storage",
    features: [
      { text: "Everything in Free Tier" },
      { text: "100GB of storage space" },
      { text: "Infinite video retention" },
      { text: "Multiple qualities for each video" },
      { text: "Ad-free experience" },
      { text: "4GB max size per video" },
      { text: "Upload 12 videos each day" },
    ],
  },
  {
    name: "Premium",
    id: "premium",
    monthlyPaymentLink: "https://pay.flowble.app/b/14k7vib1e00Za8E14a",
    annualPaymentLink: "https://pay.flowble.app/b/4gw8zm0mA5lja8E6oy",
    priceMonthly: "12",
    priceAnually: "120",
    description: "For professionals looking to reach everyone",
    features: [
      { text: "Everything in Pro Tier" },
      { text: "800GB of storage space" },
      {
        text: "Higher quality processed videos",
        infoTip:
          "The additional quality levels of your video we process will be a higher quality.",
      },
      { text: "No daily video upload limit" },
    ],
  },
];

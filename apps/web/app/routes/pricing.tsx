import { SignUpButton } from "@clerk/remix";
import { getAuth } from "@clerk/remix/ssr.server";
import { LoaderFunctionArgs, MetaFunction } from "@remix-run/node";
import { json } from "@vercel/remix";
import { Link, useLoaderData } from "@remix-run/react";
import { Check, Info } from "lucide-react";
import React, { useState } from "react";
import TopNav from "~/components/TopNav";
import { Button } from "~/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "~/components/ui/card";
import { HeroHighlight } from "~/components/ui/hero-highlight";
import { Tabs } from "~/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "~/components/ui/tooltip";
import { db } from "db";
import { Footer } from "~/components/Footer";

export const meta: MetaFunction = () => {
  return [
    { title: "Pricing | Flowble" },
    {
      name: "og:title",
      content: "Flowble Pricing",
    },
    {
      name: "description",
      content: "Choose the perfect plan for your video sharing needs",
    },
    {
      name: "og:description",
      content: "Choose the perfect plan for your video sharing needs",
    },
    {
      name: "og:url",
      content: "https://www.flowble.app/pricing",
    },
    {
      name: "og:type",
      content: "website",
    },
    {
      name: "twitter:card",
      content: "summary",
    },
    {
      name: "twitter:title",
      content: "Flowble Pricing",
    },
    {
      name: "twitter:description",
      content: "Choose the perfect plan for your video sharing needs",
    },
    {
      name: "twitter:url",
      content: "https://www.flowble.app/pricing",
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

export async function loader(args: LoaderFunctionArgs) {
  const { userId } = await getAuth(args);

  if (!userId) {
    return json({ email: null });
  }

  const userData = await db.query.users.findFirst({
    where: (table, { eq }) => eq(table.id, userId),
  });

  if (!userData) {
    return json({ email: null });
  }

  return json({ email: userData.email });
}

const Pricing: React.FC = () => {
  const tiers: {
    name: string;
    price: number;
    annualPrice?: number;
    description: string;
    monthlyPaymentLink?: string;
    annualPaymentLink?: string;
    features: { text: string; infoTip?: React.ReactNode }[];
  }[] = [
    {
      name: "Free",
      price: 0,
      description: "Perfect for sharing videos between friends",
      features: [
        {
          text: "5GB of storage space",
          infoTip:
            "Storage space is determined by the size of the uploaded video file. We will automatically create a seperate transcoded version of the video to ensure it is viewable on all devices with no extra space used on your account",
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
        {
          text: "Community support",
          infoTip: (
            <p>
              Community support is accessible within our{" "}
              <Link to="www.google.com">
                <span className="underline text-blue-600">Discord server</span>
              </Link>
            </p>
          ),
        },
      ],
    },
    {
      name: "Pro",
      price: 3,
      annualPrice: 33,
      description: "Great for anyone who needs more storage",
      monthlyPaymentLink: "https://buy.stripe.com/28o7vi1qEfZX3Kg4gk",
      annualPaymentLink: "https://buy.stripe.com/9AQ9Dq9XaaFD3KgeUZ",
      features: [
        { text: "Everything in Free Tier" },
        { text: "100GB of storage space" },
        { text: "Infinite video retention" },
        { text: "Ad-free experience" },
      ],
    },
    {
      name: "Premium",
      price: 12,
      annualPrice: 132,
      monthlyPaymentLink: "https://buy.stripe.com/14k7vib1e00Za8E14a",
      annualPaymentLink: "https://buy.stripe.com/fZeg1O5GU7trbcIeV1",
      description: "For professionals looking to reach everyone",
      features: [{ text: "Everything in Pro Tier" }, { text: "1TB of storage space" }],
    },
  ];

  const loaderData = useLoaderData<typeof loader>();

  const [billingOption, setBillingOption] = useState("monthly");

  const origin = typeof window === "object" ? window.origin : "";

  return (
    <HeroHighlight className=" min-h-screen flex flex-col">
      <TopNav />
      <div className="flex-grow">
        <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
          <div className="text-center space-y-1">
            <h1 className="text-4xl font-extrabold text-primary sm:text-5xl sm:tracking-tight lg:text-6xl">
              Flowble Pricing
            </h1>
            <p className="text-xl text-gray-500 dark:text-gray-400 text-center">
              Choose the perfect plan for your video sharing needs
            </p>
          </div>
          <div className="w-full flex justify-center py-4">
            <Tabs
              className="bg-background w-[11.5rem] rounded-md border border-secondary shadow-md"
              setTab={setBillingOption}
              tabs={[
                { title: "Monthly", value: "monthly" },
                { title: "Annually", value: "annually" },
              ]}
            />
          </div>
          <div className="mt-8 grid gap-8 lg:grid-cols-3 lg:gap-x-8">
            {tiers.map((tier) => (
              <div key={tier.name}>
                <Card className="flex flex-col bg-background shadow-lg justify-between h-[480px] border-4 border-blue-400 dark:border-blue-800">
                  <CardHeader>
                    <CardTitle className="text-2xl font-bold">
                      {tier.name === "Premium" ? (
                        <p className="font-extrabold">
                          <span className="bg-gradient-to-r from-pink-500 to-purple-400 bg-clip-text text-transparent">
                            {tier.name}
                          </span>
                        </p>
                      ) : tier.name === "Pro" ? (
                        <p className="font-extrabold">
                          <span className="bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent">
                            {tier.name}
                          </span>
                        </p>
                      ) : (
                        tier.name
                      )}
                    </CardTitle>
                    <CardDescription className="text-4xl font-extrabold mt-2 text-primary">
                      ${billingOption === "monthly" ? tier.price : tier.annualPrice ?? tier.price}
                      <span className="text-base font-medium text-muted-foreground">
                        /{billingOption === "monthly" ? "month" : "year"}
                      </span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="h-full">
                    <p className="text-muted-foreground mb-4">{tier.description}</p>
                    <ul className="space-y-3">
                      {tier.features.map((feature) => {
                        if (feature.infoTip !== undefined) {
                          return (
                            <li key={feature.text} className="flex items-center">
                              <Check className="h-5 w-5 text-green-500 mr-2" />
                              <span>{feature.text}</span>
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <Info className="text-blue-400 h-5 w-5 ml-1" />
                                  </TooltipTrigger>
                                  <TooltipContent className="max-w-96 text-sm bg-background border border-input text-primary shadow-sm">
                                    {feature.infoTip}
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </li>
                          );
                        }

                        return (
                          <li key={feature.text} className="flex items-center">
                            <Check className="h-5 w-5 text-green-500 mr-2" />
                            <span>{feature.text}</span>
                          </li>
                        );
                      })}
                    </ul>
                  </CardContent>
                  <CardFooter>
                    {tier.monthlyPaymentLink !== undefined ? (
                      <Link
                        className="w-full"
                        to={
                          loaderData.email === null
                            ? "/sign-up"
                            : billingOption === "monthly"
                              ? `${tier.monthlyPaymentLink}?prefilled_email=${loaderData.email}`
                              : `${tier.annualPaymentLink}?prefilled_email=${loaderData.email}`
                        }
                      >
                        <Button className="w-full">
                          {tier.name === "Free" ? "Sign Up" : "Subscribe"}
                        </Button>
                      </Link>
                    ) : (
                      <SignUpButton forceRedirectUrl={`${origin}/videos`}>
                        <Button className="w-full">
                          {tier.name === "Free" ? "Sign Up" : "Subscribe"}
                        </Button>
                      </SignUpButton>
                    )}
                  </CardFooter>
                </Card>
              </div>
            ))}
          </div>
        </div>
        <Footer />
      </div>
    </HeroHighlight>
  );
};

export default Pricing;

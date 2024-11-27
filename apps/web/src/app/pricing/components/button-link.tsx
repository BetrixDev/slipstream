"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";

const TIER_WEIGHTS: Record<string, number> = {
  free: 1,
  pro: 2,
  premium: 3,
  ultimate: 4,
};

type ButtonLinkProps = {
  paymentLink: string;
  paymentTier: string;
  accountTier: string | null;
  email: string | null;
};

export function ButtonLink({ paymentLink, paymentTier, accountTier, email }: ButtonLinkProps) {
  if (!email || !accountTier) {
    return (
      <Link
        target={paymentTier === "free" && accountTier === "free" ? undefined : "_blank"}
        rel={paymentTier === "free" && accountTier === "free" ? undefined : "noopener noreferrer"}
        href="/sign-up"
      >
        <Button
          disabled={paymentTier === "free" && accountTier === "free"}
          className="w-full h-10 mt-6 block rounded-md bg-blue-600/90 px-3.5 py-2 text-center text-sm font-semibold leading-6 text-white shadow-sm hover:bg-blue-500/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600/90"
        >
          Sign Up
        </Button>
      </Link>
    );
  }

  const isUserPayingCustomer = TIER_WEIGHTS[accountTier] > 1;

  return (
    <Link
      target={paymentTier === "free" && accountTier === "free" ? undefined : "_blank"}
      rel={paymentTier === "free" && accountTier === "free" ? undefined : "noopener noreferrer"}
      href={
        isUserPayingCustomer
          ? `https://polar.sh/flowble${email !== null ? `?prefilled_email=${encodeURIComponent(email)}` : ""}`
          : paymentTier === "free"
            ? "/videos"
            : `${paymentLink}${email !== null ? `?prefilled_email=${encodeURIComponent(email)}` : ""}`
      }
    >
      <Button
        disabled={paymentTier === "free" && accountTier === "free"}
        className="w-full h-10 mt-6 block rounded-md bg-blue-600/90 px-3.5 py-2 text-center text-sm font-semibold leading-6 text-white shadow-sm hover:bg-blue-500/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600/90"
      >
        {paymentTier === "free" && accountTier === "free"
          ? "You have the free tier"
          : isUserPayingCustomer
            ? "Update subscription"
            : "Purchase"}
      </Button>
    </Link>
  );
}

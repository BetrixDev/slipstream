import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

const TIER_WEIGHTS: Record<string, number> = {
  free: 1,
  pro: 2,
  premium: 3,
  ultimate: 4,
};

type ButtonLinkProps = {
  paymentLink: string;
  paymentTier: string;
  accountTier?: string;
  email?: string;
};

export function ButtonLink({
  paymentLink,
  paymentTier,
  accountTier,
  email,
}: ButtonLinkProps) {
  if (!email || !accountTier) {
    return (
      <Link to="/sign-up/$">
        <Button
          disabled={paymentTier === "free" && accountTier === "free"}
          className="w-full h-10 mt-6 block rounded-md bg-red-600/90 px-3.5 py-2 text-center text-sm font-semibold leading-6 text-white shadow-sm hover:bg-red-500/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600/90"
        >
          Sign Up
        </Button>
      </Link>
    );
  }

  const isUserPayingCustomer = TIER_WEIGHTS[accountTier] > 1;

  return (
    <Link
      target={
        paymentTier === "free" && accountTier === "free" ? undefined : "_blank"
      }
      rel={
        paymentTier === "free" && accountTier === "free"
          ? undefined
          : "noopener noreferrer"
      }
      to={
        isUserPayingCustomer
          ? `https://billing.stripe.com/p/login/14k6qN8w0dsueFG000${
              email !== null
                ? `?prefilled_email=${encodeURIComponent(email)}`
                : ""
            }`
          : paymentTier === "free"
            ? "/videos"
            : `${paymentLink}${
                email !== null
                  ? `?prefilled_email=${encodeURIComponent(email)}`
                  : ""
              }`
      }
    >
      <Button
        disabled={paymentTier === "free" && accountTier === "free"}
        className="w-full h-10 mt-6 block rounded-md bg-red-600/90 px-3.5 py-2 text-center text-sm font-semibold leading-6 text-white shadow-sm hover:bg-red-500/90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600/90"
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

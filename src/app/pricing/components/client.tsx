"use client";

import { AccountTierText } from "@/components/account-tier-text";
import { Tabs } from "@/components/tabs";
import { CheckIcon } from "lucide-react";
import { useState } from "react";
import { ButtonLink } from "../components/button-link";
import { tiers } from "../tiers";

type ClientProps = {
  accountTier: string | null;
  email: string | null;
};

export function Client({ accountTier, email }: ClientProps) {
  const [billingOption, setBillingOption] = useState<string>("monthly");

  return (
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
                  <AccountTierText accountTier={tier.id} defaultColor="text-blue-500">
                    <span className="text-lg font-bold leading-7">{tier.name}</span>
                  </AccountTierText>
                  <div className="mt-4 flex items-baseline">
                    <span className="text-4xl font-bold">$</span>
                    <span className="text-5xl font-bold tracking-tight text-primary font-sans">
                      {billingOption === "monthly" ? tier.priceMonthly : tier.priceAnually}
                    </span>
                    <span className="text-base font-semibold leading-7 text-primary">
                      /{billingOption === "monthly" ? "month" : "year"}
                    </span>
                  </div>
                  <p className="mt-2 text-base leading-7  text-primary">{tier.description}</p>
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
                  accountTier={accountTier}
                  email={email}
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
  );
}

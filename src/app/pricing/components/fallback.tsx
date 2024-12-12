import { Skeleton } from "@/components/ui/skeleton";
import { CheckIcon } from "lucide-react";
import { tiers } from "../tiers";

export function Fallback() {
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
        <div className="w-full flex justify-center py-4 h-[74px]" />
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
                  <h3 id={tier.id} className="font-semibold leading-7 text-blue-500/90 text-lg">
                    {tier.name}
                  </h3>
                  <div className="mt-4 flex items-baseline">
                    <span className="text-4xl font-bold">$</span>
                    <span className="text-5xl font-bold tracking-tight text-primary font-sans">
                      {tier.priceMonthly}
                    </span>
                    <span className="text-base font-semibold leading-7 text-primary">/month</span>
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
                <Skeleton className="w-full h-10 mt-6 bg-blue-600" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

import { cn } from "@/lib/utils";

export function AccountTierText({
  accountTier,
  children,
  defaultColor = "text-inherit",
  className,
}: {
  accountTier: string;
  children: React.ReactNode;
  defaultColor?: string;
  className?: string;
}) {
  if (accountTier.toLowerCase() === "pro") {
    return (
      <span
        className={cn(
          "bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent font-bold",
          className,
        )}
      >
        {children}
      </span>
    );
  }

  if (accountTier.toLowerCase() === "premium") {
    return (
      <span
        className={cn(
          "bg-gradient-to-r from-pink-500 to-purple-300 bg-clip-text text-transparent font-bold",
          className,
        )}
      >
        {children}
      </span>
    );
  }

  if (accountTier.toLowerCase() === "ultimate") {
    return (
      <span
        className={cn(
          "bg-gradient-to-r from-yellow-400 via-amber-500 to-orange-600 bg-clip-text text-transparent font-bold",
          className,
        )}
      >
        {children}
      </span>
    );
  }

  return <span className={cn(defaultColor, "font-bold", className)}>{children}</span>;
}

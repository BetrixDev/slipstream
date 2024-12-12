export function AccountTierText({
  accountTier,
  children,
  defaultColor = "text-inherit",
}: {
  accountTier: string;
  children: React.ReactNode;
  defaultColor?: string;
}) {
  if (accountTier === "pro") {
    return (
      <span className="bg-gradient-to-r from-orange-400 to-red-400 bg-clip-text text-transparent font-bold">
        {children}
      </span>
    );
  }

  if (accountTier === "premium") {
    return (
      <span className="bg-gradient-to-r from-pink-500 to-purple-300 bg-clip-text text-transparent font-bold">
        {children}
      </span>
    );
  }

  return <span className={defaultColor}>{children}</span>;
}

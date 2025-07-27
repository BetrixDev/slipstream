import { AccountTierText } from "@/components/account-tier-text";
import { authorDataQueryOptions } from "@/lib/query-utils";
import { useQuery } from "@tanstack/react-query";

export function AuthorInfo({ authorId }: { authorId: string }) {
  const { data } = useQuery(authorDataQueryOptions(authorId));

  if (!data) {
    return null;
  }

  const { username, profileImageUrl, accountTier } = data;

  return (
    <div className="flex items-center gap-2">
      <img
        className="w-8 h-8 rounded-full"
        src={profileImageUrl}
        alt={username ?? "User profile image"}
      />
      <AccountTierText accountTier={accountTier}>{username}</AccountTierText>
    </div>
  );
}

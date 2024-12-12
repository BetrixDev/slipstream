import { AccountTierText } from "@/components/account-tier-text";
import { getVideoAuthorData } from "../data";

export async function AuthorInfo({ authorId }: { authorId: string }) {
  const { username, profileImageUrl, accountTier } = await getVideoAuthorData(authorId);

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

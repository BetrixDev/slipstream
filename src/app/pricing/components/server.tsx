import { currentUser } from "@clerk/nextjs/server";
import { Client } from "./client";

export async function Server() {
  const user = await currentUser();

  const userEmail = user?.primaryEmailAddress?.emailAddress ?? null;
  const userAccountTier = (user?.publicMetadata?.accountTier as string | null) ?? null;

  return <Client accountTier={userAccountTier} email={userEmail} />;
}

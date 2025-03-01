import {
  SignedIn,
  SignedOut,
  UserButton,
  useUser,
} from "@clerk/tanstack-start";
import { Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "@tanstack/react-router";
import { AccountTierText } from "./account-tier-text";
import { Badge } from "./ui/badge";
import { safeParseAccountTier, TIER_TO_TEXT } from "@/lib/utils";

type TopNavProps = {
  showTierPill?: boolean;
};

export default function TopNav({ showTierPill = true }: TopNavProps) {
  const { user } = useUser();

  const accountTier = safeParseAccountTier(user?.publicMetadata?.accountTier);

  return (
    <div className="sticky md:top-2 flex justify-center z-[99] w-full">
      <header className="px-3 max-w-[64rem] md:w-[90%] w-full bg-white/95 md:dark:bg-zinc-950/30 dark:bg-zinc-950/50 md:border border-border/50 border-b md:rounded-full flex items-center justify-between h-14 reltive backdrop-blur-md shadow-sm sticky">
        <Link className="flex items-center" to="/" preload="intent">
          <Button
            variant="ghost"
            className="flex-shrink-0 flex items-center rounded-full z-50"
          >
            <Video className="h-8 w-8 text-red-500" />
            <span className="ml-2 text-lg z-10 hidden md:inline md:text-2xl font-bold pointer-events-none">
              Slipstream
            </span>
          </Button>
        </Link>
        <div className="absolute w-full">
          <nav className="hidden sm:flex mx-auto justify-center gap-4 sm:gap-6">
            <Link
              className="text-sm font-medium hover:underline underline-offset-4"
              to="/pricing"
              preload="intent"
            >
              Pricing
            </Link>
            <Link
              className="text-sm font-medium hover:underline underline-offset-4"
              to="/videos"
              preload="intent"
            >
              Your Videos
            </Link>
            <a
              className="text-sm font-medium hover:underline underline-offset-4"
              href="mailto:support@slipstream.video"
              target="_blank"
              rel="noreferrer"
            >
              Support
            </a>
          </nav>
          <div className="flex justify-center sm:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="rounded-full">
                  Navigate
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="z-[99]">
                <DropdownMenuItem>
                  <Link
                    className="text-sm font-medium hover:underline underline-offset-4"
                    to="/"
                    preload="intent"
                  >
                    Home
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link
                    className="text-sm font-medium hover:underline underline-offset-4"
                    to="/pricing"
                    preload="intent"
                  >
                    Pricing
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link
                    className="text-sm font-medium hover:underline underline-offset-4"
                    to="/videos"
                    preload="intent"
                  >
                    Your Videos
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <a
                    className="text-sm font-medium hover:underline underline-offset-4"
                    href="mailto:support@slipstream.video"
                  >
                    Support
                  </a>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <SignedOut>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="outline"
                className="rounded-full md:hidden block z-50"
              >
                Account
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="z-[99]">
              <DropdownMenuItem>
                <Link
                  className="text-sm font-medium hover:underline underline-offset-4"
                  to="/sign-in/$"
                  preload="intent"
                >
                  Sign in
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link
                  className="text-sm font-medium hover:underline underline-offset-4"
                  to="/sign-up/$"
                  preload="intent"
                >
                  Sign Up
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SignedOut>
        <SignedIn>
          <span className="md:flex hidden items-center gap-2">
            {showTierPill && (
              <Badge variant="outline" className="h-8">
                <AccountTierText
                  accountTier={accountTier}
                  className="pointer-events-none"
                >
                  {TIER_TO_TEXT[accountTier]} Tier
                </AccountTierText>
              </Badge>
            )}

            <UserButton />
          </span>
          <span className="flex md:hidden items-center">
            <UserButton />
          </span>
        </SignedIn>
        <SignedOut>
          <div className="hidden md:flex gap-2 w-40 justify-end z-10">
            <Link to="/sign-in/$" preload="intent">
              <Button className="rounded-full" variant="ghost">
                Sign in
              </Button>
            </Link>
            <Link to="/sign-up/$" preload="intent">
              <Button className="rounded-full" variant="secondary">
                Sign Up
              </Button>
            </Link>
          </div>
        </SignedOut>
      </header>
    </div>
  );
}

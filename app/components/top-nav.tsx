import {
  SignedIn,
  SignedOut,
  useClerk,
  UserButton,
  useUser,
} from "@clerk/tanstack-start";
import {
  CrownIcon,
  HomeIcon,
  LogOutIcon,
  MailIcon,
  MenuIcon,
  UploadIcon,
  UserIcon,
  Video,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link, useRouter } from "@tanstack/react-router";
import { AccountTierText } from "./account-tier-text";
import { Badge } from "./ui/badge";
import {
  cn,
  humanFileSize,
  notNanOrDefault,
  safeParseAccountTier,
  TIER_TO_TEXT,
} from "@/lib/utils";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "./ui/sheet";
import { usageDataQueryOptions } from "@/lib/query-utils";
import { useQuery } from "@tanstack/react-query";
import { Progress } from "./ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";

type TopNavProps = {
  showTierPill?: boolean;
};

export default function TopNav({ showTierPill = true }: TopNavProps) {
  const { user } = useUser();

  const accountTier = safeParseAccountTier(user?.publicMetadata?.accountTier);

  return <NewTopNav />;

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

function NewTopNav() {
  const { state } = useRouter();

  const { data: usageData } = useQuery(usageDataQueryOptions);

  const { user } = useUser();

  const currentPath = state.location.pathname;
  const accountTier = safeParseAccountTier(user?.publicMetadata?.accountTier);

  const storageUsedPercentage = Math.max(
    notNanOrDefault(usageData?.totalStorageUsed, 0) /
      notNanOrDefault(usageData?.maxStorage, 1),
    1
  );

  return (
    <>
      <header className="sticky top-0 z-10 flex items-center justify-between p-4 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:hidden">
        <Link to="/">
          <div className="flex items-center gap-2">
            <Video className="w-8 h-8 text-red-500" />
            <span className="font-semibold">Slipstream</span>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="icon"
            className="rounded-full"
            asChild
          >
            <Link to="/videos">
              <UploadIcon className="w-4 h-4" />
              <span className="sr-only">Upload</span>
            </Link>
          </Button>

          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" className="rounded-full">
                <MenuIcon className="w-4 h-4" />
                <span className="sr-only">Menu</span>
              </Button>
            </SheetTrigger>
            <SheetContent>
              <div className="flex flex-col gap-6 mt-6">
                <SignedOut>
                  <div className="flex gap-2">
                    <Link to="/sign-in/$" preload="intent">
                      <Button variant="outline" className="rounded-full">
                        Sign in
                      </Button>
                    </Link>
                    <Link to="/sign-up/$" preload="intent">
                      <Button variant="secondary" className="rounded-full">
                        Sign Up
                      </Button>
                    </Link>
                  </div>
                </SignedOut>
                <SignedIn>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 flex items-center justify-center overflow-hidden rounded-full bg-muted">
                      <AccountDropdown />
                    </div>
                    <div>
                      <p className="text-medium text-primary">
                        {user?.username}
                      </p>
                      <p className="font-sm">
                        <AccountTierText accountTier={accountTier}>
                          {TIER_TO_TEXT[accountTier]} Tier
                        </AccountTierText>
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm font-medium">Storage</p>
                    <Progress value={storageUsedPercentage} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {humanFileSize(
                        notNanOrDefault(usageData?.totalStorageUsed)
                      )}{" "}
                      / {humanFileSize(notNanOrDefault(usageData?.maxStorage))}
                    </p>
                  </div>
                </SignedIn>

                <nav className="grid gap-2">
                  <SheetClose>
                    <Link
                      to="/"
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 text-sm transition-colors rounded-md hover:bg-accent",
                        currentPath === "/" && "bg-accent"
                      )}
                    >
                      <HomeIcon className="w-4 h-4" />
                      Home
                    </Link>
                  </SheetClose>
                  <SheetClose>
                    <Link
                      to="/pricing"
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 text-sm transition-colors rounded-md hover:bg-accent",
                        currentPath === "/pricing" && "bg-accent"
                      )}
                    >
                      <CrownIcon className="w-4 h-4" />
                      Pricing
                    </Link>
                  </SheetClose>
                  <SheetClose>
                    <Link
                      to="/videos"
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 text-sm transition-colors rounded-md hover:bg-accent",
                        currentPath === "/videos" && "bg-accent"
                      )}
                    >
                      <Video className="w-4 h-4" />
                      Your Videos
                    </Link>
                  </SheetClose>
                  <SheetClose>
                    <a
                      href="mailto:support@slipstream.video"
                      className="flex items-center gap-3 px-3 py-2 text-sm transition-colors rounded-md hover:bg-accent"
                    >
                      <MailIcon className="w-4 h-4" />
                      Support
                    </a>
                  </SheetClose>
                </nav>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </header>
      {/* Header for desktop */}
      <header className="hidden items-center justify-between p-4 border-b md:flex bg-background">
        <div className="flex items-center gap-3">
          <Link to="/" className="flex items-center gap-2">
            <Video className="w-5 h-5 text-red-500" />
            <span className="font-semibold">Slipstream</span>
          </Link>

          <nav className="flex items-center ml-8 gap-6">
            <Link
              to="/pricing"
              className={cn(
                currentPath === "/pricing"
                  ? "text-sm font-medium"
                  : "text-sm text-muted-foreground hover:text-foreground"
              )}
            >
              Pricing
            </Link>
            <Link
              to="/videos"
              className={cn(
                currentPath === "/videos"
                  ? "text-sm font-medium"
                  : "text-sm text-muted-foreground hover:text-foreground"
              )}
            >
              Your Videos
            </Link>
            <a
              href="mailto:support@slipstream.video"
              className="text-sm text-muted-foreground hover:text-foreground"
            >
              Support
            </a>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <SignedOut>
            <Link to="/sign-in/$" preload="intent">
              <Button variant="outline" className="rounded-full">
                Sign in
              </Button>
            </Link>
            <Link to="/sign-up/$" preload="intent">
              <Button variant="secondary" className="rounded-full">
                Sign Up
              </Button>
            </Link>
          </SignedOut>
          <SignedIn>
            <span className="text-sm font-medium">
              {true && (
                <Badge variant="outline" className="h-8">
                  <AccountTierText
                    accountTier={accountTier}
                    className="pointer-events-none"
                  >
                    {TIER_TO_TEXT[accountTier]} Tier
                  </AccountTierText>
                </Badge>
              )}
            </span>
            <div className="w-8 h-8 overflow-hidden rounded-full bg-muted flex items-center justify-center">
              <AccountDropdown />
            </div>
          </SignedIn>
        </div>
      </header>
    </>
  );
}

type AccountDropdownProps = {
  inSheet?: boolean;
};

function AccountDropdown({ inSheet = false }: AccountDropdownProps) {
  const { user } = useUser();
  const { openUserProfile, signOut } = useClerk();

  if (!user) {
    return null;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="focus:outline-none">
        <Avatar className="border border-border">
          <AvatarImage src={user.imageUrl} alt={user.username ?? ""} />
          <AvatarFallback>{user.username?.[0]}</AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 bg-background">
        <DropdownMenuLabel className="font-normal">
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium">{user.username}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild onClick={() => openUserProfile()}>
          {inSheet ? (
            <SheetClose>
              <UserIcon className="mr-2 h-4 w-4" />
              <span>My Profile</span>
            </SheetClose>
          ) : (
            <div className="flex items-center gap-2">
              <UserIcon className="mr-2 h-4 w-4" />
              <span>My Profile</span>
            </div>
          )}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-destructive focus:text-destructive cursor-pointer"
          onClick={() => signOut()}
        >
          <LogOutIcon className="mr-2 h-4 w-4" />
          <span>Sign out</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

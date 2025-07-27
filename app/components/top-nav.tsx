import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { usageDataQueryOptions } from "@/lib/query-utils";
import {
  TIER_TO_TEXT,
  cn,
  humanFileSize,
  notNanOrDefault,
  safeParseAccountTier,
} from "@/lib/utils";
import { SignedIn, SignedOut, UserButton, useClerk, useUser } from "@clerk/tanstack-start";
import { useQuery } from "@tanstack/react-query";
import { Link, useRouter } from "@tanstack/react-router";
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
import { AccountTierText } from "./account-tier-text";
import { Avatar, AvatarFallback, AvatarImage } from "./ui/avatar";
import { Badge } from "./ui/badge";
import { Progress } from "./ui/progress";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "./ui/sheet";

type TopNavProps = {
  showTierPill?: boolean;
};

export default function TopNav({ showTierPill = true }: TopNavProps) {
  const { state } = useRouter();

  const { data: usageData } = useQuery(usageDataQueryOptions);

  const { user } = useUser();

  const currentPath = state.location.pathname;
  const accountTier = safeParseAccountTier(user?.publicMetadata?.accountTier);

  const storageUsedPercentage = Math.max(
    notNanOrDefault(usageData?.totalStorageUsed, 0) / notNanOrDefault(usageData?.maxStorage, 1),
    1,
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
          <Button variant="outline" size="icon" className="rounded-full" asChild>
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
                      <Button variant="outline" className="rounded-lg">
                        Sign in
                      </Button>
                    </Link>
                    <Link to="/sign-up/$" preload="intent">
                      <Button className="rounded-lg">Sign Up</Button>
                    </Link>
                  </div>
                </SignedOut>
                <SignedIn>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 flex items-center justify-center overflow-hidden rounded-full bg-muted">
                      <AccountDropdown />
                    </div>
                    <div>
                      <p className="text-medium text-primary">{user?.username}</p>
                      {showTierPill && (
                        <p className="font-sm">
                          <AccountTierText accountTier={accountTier}>
                            {TIER_TO_TEXT[accountTier]} Tier
                          </AccountTierText>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="text-sm font-medium">Storage</p>
                    <Progress value={storageUsedPercentage} className="h-2" />
                    <p className="text-xs text-muted-foreground">
                      {humanFileSize(notNanOrDefault(usageData?.totalStorageUsed))} /{" "}
                      {humanFileSize(notNanOrDefault(usageData?.maxStorage))}
                    </p>
                  </div>
                </SignedIn>

                <nav className="grid gap-2">
                  <SheetClose>
                    <Link
                      to="/"
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 text-sm transition-colors rounded-md hover:bg-accent",
                        currentPath === "/" && "bg-accent",
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
                        currentPath === "/pricing" && "bg-accent",
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
                        currentPath === "/videos" && "bg-accent",
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
                  : "text-sm text-muted-foreground hover:text-foreground",
              )}
            >
              Pricing
            </Link>
            <Link
              to="/videos"
              className={cn(
                currentPath === "/videos"
                  ? "text-sm font-medium"
                  : "text-sm text-muted-foreground hover:text-foreground",
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
              <Button variant="outline" className="rounded-lg">
                Sign in
              </Button>
            </Link>
            <Link to="/sign-up/$" preload="intent">
              <Button className="rounded-lg">Sign Up</Button>
            </Link>
          </SignedOut>
          <SignedIn>
            <span className="text-sm font-medium">
              {showTierPill && (
                <Badge variant="outline" className="h-8">
                  <AccountTierText accountTier={accountTier} className="pointer-events-none">
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

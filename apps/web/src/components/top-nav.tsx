import { SignedIn, UserButton, SignedOut } from "@clerk/nextjs";
import { Button } from "./ui/button";
import { Video } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import Link from "next/link";

export default function TopNav() {
  return (
    <div className="sticky md:top-2 flex justify-center z-[99] w-full">
      <header className="px-3 max-w-[48rem] md:w-[80%] w-full bg-background/70 md:border border-b md:rounded-full flex items-center justify-between h-14 reltive backdrop-blur-md shadow-sm">
        <Link className="flex items-center" href="/" prefetch>
          <Button variant="ghost" className="flex-shrink-0 flex items-center rounded-full z-50">
            <Video className="h-8 w-8 text-blue-500" />
            <span className="ml-2 text-lg z-10 hidden md:inline md:text-2xl font-bold pointer-events-none">
              Flowble
            </span>
          </Button>
        </Link>
        <div className="absolute w-full">
          <nav className="hidden sm:flex mx-auto justify-center gap-4 sm:gap-6">
            <Link
              className="text-sm font-medium hover:underline underline-offset-4"
              href="/pricing"
              prefetch
            >
              Pricing
            </Link>
            <Link className="text-sm font-medium hover:underline underline-offset-4" href="/videos">
              Your Videos
            </Link>
            <Link
              className="text-sm font-medium hover:underline underline-offset-4"
              href="mailto:support@flowble.app"
              target="_blank"
              rel="noreferrer"
            >
              Support
            </Link>
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
                    href={{ pathname: "/" }}
                  >
                    Home
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link
                    className="text-sm font-medium hover:underline underline-offset-4"
                    href="/pricing"
                  >
                    Pricing
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link
                    className="text-sm font-medium hover:underline underline-offset-4"
                    href="/videos"
                  >
                    Your Videos
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link
                    className="text-sm font-medium hover:underline underline-offset-4"
                    href="mailto:support@flowble.app"
                  >
                    Support
                  </Link>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        <SignedOut>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="rounded-full md:hidden block z-50">
                Account
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="z-[99]">
              <DropdownMenuItem>
                <Link
                  className="text-sm font-medium hover:underline underline-offset-4"
                  href="/sign-in"
                >
                  Sign in
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link
                  className="text-sm font-medium hover:underline underline-offset-4"
                  href="/waitlist"
                >
                  Join Waitlist
                </Link>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SignedOut>
        <SignedIn>
          <span className="md:flex hidden items-center">
            <UserButton />
          </span>
          <span className="flex md:hidden items-center">
            <UserButton />
          </span>
        </SignedIn>
        <SignedOut>
          <div className="hidden md:flex gap-2 w-40 justify-end z-10">
            <Link href="/sign-in">
              <Button className="rounded-full" variant="ghost">
                Sign in
              </Button>
            </Link>
            <Link href="/waitlist">
              <Button className="rounded-full" variant="secondary">
                Join Waitlist
              </Button>
            </Link>
          </div>
        </SignedOut>
      </header>
    </div>
  );
}

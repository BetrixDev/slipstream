import { SignedIn, UserButton, SignedOut } from "@clerk/remix";
import { Button } from "./ui/button";
import { Link } from "@remix-run/react";
import { Video } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

export default function TopNav() {
  return (
    <div className="sticky top-2 flex justify-center z-[9999]">
      <header className=" px-3 max-w-[48rem] w-[80%] bg-background/70 border rounded-full flex items-center justify-between h-14 reltive backdrop-blur-md shadow-sm">
        <Link className="flex items-center" to="/" prefetch="render">
          <Button variant="ghost" className="flex-shrink-0 flex items-center rounded-full">
            <Video className="h-8 w-8 text-blue-500" />
            <span className="ml-2 text-lg hidden md:inline md:text-2xl font-bold">Flowble</span>
          </Button>
        </Link>
        <div className="absolute w-full">
          <nav className="hidden sm:flex mx-auto justify-center gap-4 sm:gap-6">
            <Link
              className="text-sm font-medium hover:underline underline-offset-4"
              to="/pricing"
              prefetch="render"
            >
              Pricing
            </Link>
            <Link
              className="text-sm font-medium hover:underline underline-offset-4"
              to="/videos"
              prefetch="intent"
            >
              Your Videos
            </Link>
            <Link
              className="text-sm font-medium hover:underline underline-offset-4"
              to="https://www.google.com"
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
              <DropdownMenuContent>
                <DropdownMenuItem>
                  <Link
                    className="text-sm font-medium hover:underline underline-offset-4"
                    to="/pricing"
                  >
                    Pricing
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link
                    className="text-sm font-medium hover:underline underline-offset-4"
                    to="/videos"
                  >
                    Your Videos
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Link
                    className="text-sm font-medium hover:underline underline-offset-4"
                    to="https://www.google.com"
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
              <Button variant="outline" className="rounded-full md:hidden block">
                Account
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
              <DropdownMenuItem>
                <Link
                  className="text-sm font-medium hover:underline underline-offset-4"
                  to="/sign-in"
                >
                  Sign in
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Link
                  className="text-sm font-medium hover:underline underline-offset-4"
                  to="/sign-up"
                >
                  Sign Up
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
            <Link to="/sign-in">
              <Button className="rounded-full" variant="ghost">
                Sign in
              </Button>
            </Link>
            <Link to="/sign-up">
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

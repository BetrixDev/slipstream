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
      <header className=" px-4 max-w-[48rem] w-[80%] bg-background/70 border rounded-full flex items-center justify-between h-14 reltive backdrop-blur-md shadow-sm">
        <Link className="flex items-center" to="/">
          <Button variant="ghost" className="flex-shrink-0 flex items-center rounded-full">
            <Video className="h-8 w-8 text-blue-500" />
            <span className="ml-2 text-lg md:text-2xl font-bold">Flowble</span>
          </Button>
        </Link>
        <div className="grow flex justify-center items-center">
          <nav className="hidden md:flex mx-auto justify-center gap-4 sm:gap-6">
            <Link className="text-sm font-medium hover:underline underline-offset-4" to="/pricing">
              Pricing
            </Link>
            <Link className="text-sm font-medium hover:underline underline-offset-4" to="/videos">
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
          <div className="block md:hidden">
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Button variant="outline">Navigate</Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem></DropdownMenuItem>
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
        <div className="flex gap-2 w-40 justify-end z-10">
          <SignedIn>
            <span className="md:flex hidden items-center">
              <UserButton showName />
            </span>
            <span className="flex md:hidden items-center">
              <UserButton />
            </span>
          </SignedIn>
          <SignedOut>
            <Link to="sign-in">
              <Button className="rounded-full" variant="ghost">
                Sign in
              </Button>
            </Link>
            <Link to="sign-up">
              <Button className="rounded-full" variant="secondary">
                Sign Up
              </Button>
            </Link>
          </SignedOut>
        </div>
      </header>
    </div>
  );
}

import { Link } from "@tanstack/react-router";

export function Footer() {
  return (
    <footer className="flex flex-col gap-2 sm:flex-row py-6 w-full shrink-0 items-center px-4 md:px-6 border-t bg-background/5 backdrop-blur-sm">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        © {new Date().getFullYear()} Slipstream
      </p>
      <nav className="sm:ml-auto flex gap-4 sm:gap-6">
        <Link className="text-xs hover:underline underline-offset-4" to="/terms-of-service">
          Terms of Service
        </Link>
        <Link className="text-xs hover:underline underline-offset-4" to="/privacy-policy">
          Privacy Policy
        </Link>
      </nav>
    </footer>
  );
}

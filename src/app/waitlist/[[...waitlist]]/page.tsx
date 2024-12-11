import { Footer } from "@/components/footer";
import { IMAGE_LINKS } from "@/lib/utils";
import { Waitlist } from "@clerk/nextjs";

export const experimental_ppr = true;

export const metadata = {
  title: "Join the Flowble Waitlist",
  description:
    "Sign up for the Flowble waitlist to be among the first to experience our revolutionary video sharing platform",
  keywords: [
    "Flowble",
    "Waitlist",
    "Video Sharing",
    "Upcoming Platform",
    "Early Access",
    "Innovative",
    "Stream",
    "Video Hosting",
    "Beta",
  ],
  icons: {
    icon: "/favicon.ico",
  },
  twitter: {
    title: "Join the Flowble Waitlist",
    description: "Be the first to experience Flowble's innovative video sharing platform",
    card: "summary_large_image",
    images: IMAGE_LINKS,
  },
  openGraph: {
    title: "Join the Flowble Waitlist",
    description: "Sign up for early access to Flowble's game-changing video sharing platform",
    images: IMAGE_LINKS,
    locale: "en-US",
    siteName: "Flowble",
    url: "https://flowble.app/waitlist",
    type: "website",
  },
};

export default async function Page() {
  return (
    <div className="h-screen flex flex-col justify-center items-center">
      <div className="grow flex items-center justify-center">
        <Waitlist signInUrl="/sign-in" />
      </div>
      <Footer />
    </div>
  );
}

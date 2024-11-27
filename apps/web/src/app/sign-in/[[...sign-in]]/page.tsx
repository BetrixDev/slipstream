import { Footer } from "@/components/footer";
import { SignIn } from "@clerk/nextjs";
import { IMAGE_LINKS } from "@/lib/utils";

export const experimental_ppr = true;

export const metadata = {
  title: "Sign in to Flowble",
  description: "Sign in to Flowble to upload and watch videos",
  keywords: [
    "Flowble",
    "Share Videos",
    "Upload Videos",
    "Trim Videos",
    "Fast Uploads",
    "Free",
    "Stream",
    "Video Sharing",
    "Sign in",
  ],
  icons: {
    icon: "/favicon.ico",
  },
  twitter: {
    title: "Sign in to Flowble",
    description: "Sign in to Flowble to upload and watch videos",
    card: "summary_large_image",
    images: IMAGE_LINKS,
  },
  openGraph: {
    title: "Sign in to Flowble",
    description: "Sign in to Flowble to upload and watch videos",
    images: IMAGE_LINKS,
    type: "website",
    siteName: "Flowble",
    url: "https://flowble.app/sign-in",
    locale: "en-US",
  },
};

export default async function Page() {
  return (
    <div className="h-screen flex flex-col justify-center items-center">
      <div className="grow flex items-center justify-center">
        <SignIn signUpUrl="/sign-up" waitlistUrl="/waitlist" fallbackRedirectUrl="/" />
      </div>
      <Footer />
    </div>
  );
}

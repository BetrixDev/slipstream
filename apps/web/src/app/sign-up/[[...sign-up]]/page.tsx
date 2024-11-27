import { Footer } from "@/components/footer";
import { IMAGE_LINKS } from "@/lib/utils";
import { SignUp } from "@clerk/nextjs";

export const experimental_ppr = true;

export const metadata = {
  title: "Sign up for Flowble",
  description: "Sign up for Flowble to upload and watch videos",
  keywords: [
    "Flowble",
    "Share Videos",
    "Upload Videos",
    "Trim Videos",
    "Fast Uploads",
    "Free",
    "Stream",
    "Video Sharing",
    "Sign up",
  ],
  icons: {
    icon: "/favicon.ico",
  },
  twitter: {
    title: "Sign up for Flowble",
    description: "Sign up for Flowble to upload and watch videos",
    card: "summary_large_image",
    images: IMAGE_LINKS,
  },
  openGraph: {
    title: "Sign up for Flowble",
    description: "Sign up for Flowble to upload and watch videos",
    images: IMAGE_LINKS,
    locale: "en-US",
    siteName: "Flowble",
    url: "https://flowble.app/sign-up",
    type: "website",
  },
};

export default async function Page() {
  return (
    <div className="h-screen flex flex-col justify-center items-center">
      <div className="grow flex items-center justify-center">
        <SignUp signInUrl="/sign-in" waitlistUrl="/waitlist" fallbackRedirectUrl="/" />
      </div>
      <Footer />
    </div>
  );
}

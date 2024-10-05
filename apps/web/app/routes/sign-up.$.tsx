import { SignUp } from "@clerk/remix";
import { MetaFunction } from "@vercel/remix";
import { Footer } from "~/components/Footer";

export const meta: MetaFunction = () => {
  return [
    { title: "Sign Up | Flowble" },
    {
      name: "og:title",
      content: "Sign Up | Flowble",
    },
    {
      name: "twitter:title",
      content: "Sign Up | Flowble",
    },
    { name: "description", content: "Sign up for the fastest video sharing service" },
    {
      name: "og:type",
      content: "website",
    },
    {
      name: "twitter:card",
      content: "summary",
    },
    {
      name: "twitter:url",
      content: "https://www.flowble.app/sign-up",
    },
    {
      name: "twitter:image",
      content: "https://utfs.io/f/GtjuzTxrWKtnc6xRppAT9nGXFIZqmMfu6KvNV0jWoxkREwr8",
    },
    {
      name: "og:image",
      content: "https://utfs.io/f/GtjuzTxrWKtnc6xRppAT9nGXFIZqmMfu6KvNV0jWoxkREwr8",
    },
  ];
};

export default function SignUpPage() {
  return (
    <div className="h-screen flex flex-col justify-center items-center">
      <div className="grow flex items-center justify-center">
        <SignUp />
      </div>
      <Footer />
    </div>
  );
}

import { SignIn } from "@clerk/remix";
import { MetaFunction } from "@vercel/remix";

export const meta: MetaFunction = () => {
  return [
    { title: "Sign In | Flowble" },
    { name: "og:title", content: "Sign In | Flowble" },
    { name: "twitter:title", content: "Sign In | Flowble" },
    { name: "description", content: "Sign in to the fastest video sharing service" },
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
      content: "https://www.flowble.app/sign-in",
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

export default function SignInPage() {
  return (
    <div className="h-screen flex justify-center items-center">
      <SignIn />
    </div>
  );
}

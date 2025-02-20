import { Footer } from "../components/footer";
import { SignIn } from "@clerk/tanstack-start";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/sign-in/$")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="h-screen flex flex-col justify-center items-center">
      <div className="grow flex items-center justify-center">
        <SignIn signUpUrl="/sign-up" fallbackRedirectUrl="/" />
      </div>
      <Footer />
    </div>
  );
}

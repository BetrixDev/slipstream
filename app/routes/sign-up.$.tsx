import { Footer } from "@/components/footer";
import { SignUp } from "@clerk/tanstack-start";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/sign-up/$")({
  component: RouteComponent,
});

function RouteComponent() {
  return (
    <div className="h-screen flex flex-col justify-center items-center">
      <div className="grow flex items-center justify-center">
        <SignUp signInUrl="/sign-in" fallbackRedirectUrl="/" />
      </div>
      <Footer />
    </div>
  );
}

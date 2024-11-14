import { Footer } from "@/components/footer";
import { SignUp } from "@clerk/nextjs";

export const experimental_ppr = true;

export default async function Page() {
  return (
    <div className="h-screen flex flex-col justify-center items-center">
      <div className="grow flex items-center justify-center">
        <SignUp />
      </div>
      <Footer />
    </div>
  );
}

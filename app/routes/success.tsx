import { Footer } from "@/components/footer";
import TopNav from "@/components/top-nav";
import { HeroHighlight } from "@/components/ui/hero-highlight";
import { getAuth } from "@clerk/tanstack-start/server";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute, redirect, useRouter } from "@tanstack/react-router";
import { createServerFn, useServerFn } from "@tanstack/start";
import { getWebRequest } from "@tanstack/start/server";
import { useRealtimeRun } from "@trigger.dev/react-hooks";
import { runs, auth as triggerAuth } from "@trigger.dev/sdk/v3";
import { CheckCircleIcon, Loader2Icon, XCircleIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { z } from "zod";
import Confetti from "react-confetti-boom";

export const Route = createFileRoute("/success")({
  component: RouteComponent,
});

const ERROR_STATUSES = [
  "TIMED_OUT",
  "EXPIRED",
  "SYSTEM_FAILURE",
  "INTERRUPTED",
  "CRASHED",
  "FAILED",
  "CANCELED",
];

const numberSchema = z.number().min(0).max(100);

type ProcessingStatus = "loading" | "success" | "error";

function RouteComponent() {
  const navigate = Route.useNavigate();

  const getPolarEventHandlerForUserServer = useServerFn(
    getPolarEventHandlerForUserServerFn
  );

  const [status, setStatus] = useState<ProcessingStatus>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [progress, setProgress] = useState(0);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["success", "polarEventHandler"],
    queryFn: async () => {
      const data = await getPolarEventHandlerForUserServer();

      return data;
    },
  });

  const { run } = useRealtimeRun(data?.runId, {
    accessToken: data?.token,
    enabled: !!data?.runId && !!data?.token && !isLoading,
  });

  useEffect(() => {
    if (!isError) {
      return;
    }

    setStatus("error");
    setErrorMessage(
      "Failed to fetch payment status. Don't worry, your payment will be processed soon"
    );
    setTimeout(() => {
      navigate({ to: "/videos" });
    }, 5000);
  }, [isError, navigate]);

  useEffect(() => {
    if (!run?.metadata?.progress) {
      return;
    }

    const { data: progressValue } = numberSchema.safeParse(
      run.metadata.progress
    );

    if (progressValue) {
      setProgress(progressValue);
    }
  }, [run]);

  useEffect(() => {
    if (!run?.status) {
      return;
    }

    if (run.status === "COMPLETED") {
      setStatus("success");
      navigate({ to: "/videos" });
      return;
    }

    if (ERROR_STATUSES.includes(run.status)) {
      setStatus("error");
      setErrorMessage(
        "An error occurred while processing your payment. Please contact support"
      );

      setTimeout(() => {
        navigate({ to: "/videos" });
      }, 7500);

      return;
    }
  }, [run, navigate]);

  return (
    <HeroHighlight>
      <div className="absolute inset-0">
        <Confetti
          particleCount={75}
          shapeSize={15}
          deg={250}
          effectCount={1}
          spreadDeg={100}
          x={0.5}
          y={0.5}
          launchSpeed={1}
        />
      </div>
      <TopNav showTierPill={false} />
      <div className="w-full min-h-[calc(100dvh-8rem)] flex items-center justify-center">
        {/* Status Card */}
        <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-8 shadow-lg">
          {/* Header */}
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold mb-2">
              {status === "loading" && "Processing Your Order"}
              {status === "success" && "Order Complete!"}
              {status === "error" && "Processing Error"}
            </h1>
            <p className="text-zinc-400">
              {status === "loading" &&
                "Please wait while we process your payment..."}
              {status === "success" &&
                "Your payment has been processed successfully."}
              {status === "error" && errorMessage}
            </p>
          </div>

          {/* Status Icon */}
          <div className="flex justify-center mb-6">
            {status === "loading" && (
              <div className="relative">
                <Loader2Icon className="h-20 w-20 text-red-500 animate-spin" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-medium">{progress}%</span>
                </div>
              </div>
            )}
            {status === "success" && (
              <CheckCircleIcon className="h-20 w-20 text-green-500" />
            )}
            {status === "error" && (
              <XCircleIcon className="h-20 w-20 text-red-500" />
            )}
          </div>

          {/* Progress Bar (only shown during loading) */}
          {status === "loading" && (
            <div className="w-full bg-zinc-800 rounded-full h-2 mb-6">
              <div
                className="bg-red-500 h-2 rounded-full transition-all duration-300 ease-in-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}
        </div>
      </div>
      <Footer />
    </HeroHighlight>
  );
}

const getPolarEventHandlerForUserServerFn = createServerFn({
  method: "POST",
}).handler(async () => {
  const { userId } = await getAuth(getWebRequest()!);

  if (!userId) {
    throw redirect({ to: "/" });
  }

  const runningTasks = await runs.list({ tag: userId });

  const polarEventHandler = runningTasks.data.find(
    (t) => t.taskIdentifier === "polar-event-handler"
  );

  if (!polarEventHandler) {
    throw redirect({ to: "/videos" });
  }

  const accessToken = await triggerAuth.createPublicToken({
    expirationTime: 1000 * 60 * 5,
    scopes: {
      read: {
        tags: [userId],
      },
    },
  });

  return {
    token: accessToken,
    runId: polarEventHandler.id,
  };
});

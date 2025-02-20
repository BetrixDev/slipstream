import { AwsInstrumentation } from "@opentelemetry/instrumentation-aws-sdk";
import { ffmpeg } from "@trigger.dev/build/extensions/core";
import { syncVercelEnvVars } from "@trigger.dev/build/extensions/core";
import { defineConfig } from "@trigger.dev/sdk/v3";

export default defineConfig({
  project: "proj_kgjuvdnaikcqgregnfjq",
  runtime: "node",
  logLevel: "log",
  retries: {
    enabledInDev: true,
    default: {
      maxAttempts: 3,
      minTimeoutInMs: 1000,
      maxTimeoutInMs: 10000,
      factor: 2,
      randomize: true,
    },
  },
  dirs: ["./app/trigger"],
  build: {
    extensions: [ffmpeg(), syncVercelEnvVars()],
    external: ["sharp"],
  },
  instrumentations: [new AwsInstrumentation()],
});

export default defineNitroConfig({
  srcDir: "server",
  experimental: {
    tasks: true,
  },
  scheduledTasks: {
    "*/5 * * * *": ["incrementViews"],
  },
});

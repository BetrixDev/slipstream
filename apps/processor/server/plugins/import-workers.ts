export default defineNitroPlugin(async () => {
  await import("../workers/thumbnail");
  await import("../workers/transcoding");
});

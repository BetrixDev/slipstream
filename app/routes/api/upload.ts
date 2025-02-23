import { createRouteHandler } from "uploadthing/server";
import { uploadRouter } from "../../server/uploadthing";
import { createAPIFileRoute } from "@tanstack/start/api";

const handlers = createRouteHandler({ router: uploadRouter });

export const APIRoute = createAPIFileRoute("/api/upload")({
  GET: handlers,
  POST: handlers,
});

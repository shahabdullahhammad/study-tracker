import { httpRouter } from "convex/server";
import { internal } from "./_generated/api";
import { httpAction } from "./_generated/server";
import { auth } from "./auth";

const http = httpRouter();

auth.addHttpRoutes(http);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

http.route({
  path: "/client-debug-log",
  method: "OPTIONS",
  handler: httpAction(async () => {
    return new Response(null, { status: 204, headers: corsHeaders });
  }),
});

http.route({
  path: "/client-debug-log",
  method: "POST",
  handler: httpAction(async (ctx, request) => {
    if (process.env.ALLOW_CLIENT_DEBUG_LOGS !== "true") {
      return new Response(null, { status: 404 });
    }
    const line = await request.text();
    if (!line || line.length > 12000) {
      return new Response(null, { status: 400, headers: corsHeaders });
    }
    await ctx.runMutation(internal.debugIngest.append, { line });
    return new Response(null, { status: 204, headers: corsHeaders });
  }),
});

export default http;

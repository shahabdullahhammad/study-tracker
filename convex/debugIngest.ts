import { v } from "convex/values";
import { internalMutation, query } from "./_generated/server";

const MAX_ROWS = 120;

export const append = internalMutation({
  args: { line: v.string() },
  handler: async (ctx, { line }) => {
    if (process.env.ALLOW_CLIENT_DEBUG_LOGS !== "true") return;
    const trimmed = line.length > 12000 ? line.slice(0, 12000) : line;
    await ctx.db.insert("debugClientLogs", { line: trimmed });
    const rows = await ctx.db.query("debugClientLogs").order("desc").take(MAX_ROWS + 20);
    if (rows.length > MAX_ROWS) {
      for (let i = MAX_ROWS; i < rows.length; i++) {
        await ctx.db.delete(rows[i]._id);
      }
    }
  },
});

/** Read recent client debug lines (CLI / dashboard). Disabled unless env flag set. */
export const peek = query({
  args: {},
  handler: async (ctx) => {
    if (process.env.ALLOW_CLIENT_DEBUG_LOGS !== "true") {
      return [] as { _id: string; line: string }[];
    }
    const rows = await ctx.db.query("debugClientLogs").order("desc").take(80);
    return rows.map((r) => ({ _id: r._id, line: r.line }));
  },
});

import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "./_generated/server";

export const listMySavedRooms = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    const rows = await ctx.db
      .query("userSavedRooms")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return [...rows].sort((a, b) => b.updatedAt - a.updatedAt);
  },
});

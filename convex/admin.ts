import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";

const OWNER_EMAIL =
  process.env.OWNER_EMAIL ?? "abuabdullah3382@gmail.com";

async function assertSiteOwner(ctx: MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (userId === null) throw new Error("Not authenticated");
  const user = await ctx.db.get(userId);
  const email = user?.email?.toLowerCase();
  if (!email || email !== OWNER_EMAIL.toLowerCase()) {
    throw new Error("Forbidden: site owner only");
  }
}

async function deleteRoomCascade(ctx: MutationCtx, roomId: Id<"rooms">) {
  for (const row of await ctx.db
    .query("taskMemberTime")
    .withIndex("by_room", (q) => q.eq("roomId", roomId))
    .collect()) {
    await ctx.db.delete(row._id);
  }
  for (const row of await ctx.db
    .query("taskCompletions")
    .withIndex("by_room", (q) => q.eq("roomId", roomId))
    .collect()) {
    await ctx.db.delete(row._id);
  }
  for (const row of await ctx.db
    .query("tasks")
    .withIndex("by_room", (q) => q.eq("roomId", roomId))
    .collect()) {
    await ctx.db.delete(row._id);
  }
  for (const row of await ctx.db
    .query("messages")
    .withIndex("by_room_created", (q) => q.eq("roomId", roomId))
    .collect()) {
    await ctx.db.delete(row._id);
  }
  for (const row of await ctx.db
    .query("roomMemberStats")
    .withIndex("by_room_name", (q) => q.eq("roomId", roomId))
    .collect()) {
    await ctx.db.delete(row._id);
  }
  for (const row of await ctx.db
    .query("roomMembers")
    .withIndex("by_room", (q) => q.eq("roomId", roomId))
    .collect()) {
    await ctx.db.delete(row._id);
  }
  for (const row of await ctx.db
    .query("userSavedRooms")
    .withIndex("by_room", (q) => q.eq("roomId", roomId))
    .collect()) {
    await ctx.db.delete(row._id);
  }
  await ctx.db.delete(roomId);
}

export const deleteRoomByName = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    await assertSiteOwner(ctx);
    const roomName = args.name.trim();
    if (!roomName) throw new Error("Enter a room name");
    const room = await ctx.db
      .query("rooms")
      .withIndex("by_name", (q) => q.eq("name", roomName))
      .first();
    if (!room) throw new Error("Room not found");
    await deleteRoomCascade(ctx, room._id);
    return { deleted: true as const };
  },
});

export const isSiteOwner = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return false;
    const user = await ctx.db.get(userId);
    const email = user?.email?.toLowerCase();
    return Boolean(email && email === OWNER_EMAIL.toLowerCase());
  },
});

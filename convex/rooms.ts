import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const MAX_ROOM_NAME_LENGTH = 120;

function normalizeRoomName(name: string): string {
  return name.trim();
}

export const getRoom = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.roomId);
  },
});

export const createRoom = mutation({
  args: {
    name: v.string(),
    createdBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const name = normalizeRoomName(args.name);
    if (!name) throw new Error("Room name cannot be empty");
    if (name.length > MAX_ROOM_NAME_LENGTH) {
      throw new Error("Room name is too long");
    }
    const now = Date.now();
    return await ctx.db.insert("rooms", {
      name,
      createdAt: now,
      createdBy: args.createdBy,
      taskSeq: 0,
    });
  },
});

export const createOrJoinRoom = mutation({
  args: {
    name: v.string(),
    createdBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const name = normalizeRoomName(args.name);
    if (!name) throw new Error("Room name cannot be empty");
    if (name.length > MAX_ROOM_NAME_LENGTH) {
      throw new Error("Room name is too long");
    }
    const existing = await ctx.db
      .query("rooms")
      .withIndex("by_name", (q) => q.eq("name", name))
      .first();
    if (existing) {
      return { roomId: existing._id, created: false as const };
    }
    const now = Date.now();
    const roomId = await ctx.db.insert("rooms", {
      name,
      createdAt: now,
      createdBy: args.createdBy,
      taskSeq: 0,
    });
    return { roomId, created: true as const };
  },
});

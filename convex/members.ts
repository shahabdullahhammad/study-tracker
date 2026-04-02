import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { namesMatch } from "./identity";
import { query } from "./_generated/server";

export const listRoomMembers = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) return null;
    const rows = await ctx.db
      .query("roomMembers")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();
    const ownerName = room.createdBy;
    return [...rows]
      .sort((a, b) => a.joinedAt - b.joinedAt)
      .map((m) => ({
        _id: m._id,
        displayName: m.displayName,
        joinedAt: m.joinedAt,
        isOwner: ownerName != null && namesMatch(m.displayName, ownerName),
        isAdmin: m.isAdmin === true,
        pendingJoin: m.userId === undefined,
      }));
  },
});

export const getMyRoomMembership = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;

    const rows = await ctx.db
      .query("roomMembers")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();

    const me = rows.find((r) => r.userId === userId);
    if (!me) return null;

    const room = await ctx.db.get(args.roomId);
    const ownerName = room?.createdBy ?? null;

    return {
      roomId: args.roomId,
      displayName: me.displayName,
      isAdmin: me.isAdmin === true,
      isOwner:
        ownerName != null && namesMatch(me.displayName, ownerName),
      pendingJoin: me.userId === undefined,
    };
  },
});

export const listMemberStatsByRoom = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) return null;
    const rows = await ctx.db
      .query("roomMemberStats")
      .withIndex("by_room_name", (q) => q.eq("roomId", args.roomId))
      .collect();
    return [...rows].sort(
      (a, b) => b.totalStudySeconds - a.totalStudySeconds,
    );
  },
});

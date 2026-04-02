import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";

async function requireRoomMemberByUserId(
  ctx: MutationCtx | QueryCtx,
  roomId: Id<"rooms">,
  userId: Id<"users">,
): Promise<{ displayName: string }> {
  const rows = await ctx.db
    .query("roomMembers")
    .withIndex("by_room", (q) => q.eq("roomId", roomId))
    .collect();
  const me = rows.find((r: any) => r.userId === userId);
  if (!me) throw new Error("NOT_MEMBER: Join the room to stream music.");
  return { displayName: me.displayName };
}

export const generateRoomMusicUploadUrl = mutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, { roomId }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("SIGN_IN_REQUIRED");
    await requireRoomMemberByUserId(ctx, roomId, userId);
    return await ctx.storage.generateUploadUrl();
  },
});

export const startRoomMusicStream = mutation({
  args: {
    roomId: v.id("rooms"),
    trackStorageId: v.id("_storage"),
    trackFileName: v.string(),
    startPositionMs: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("SIGN_IN_REQUIRED");

    const member = await requireRoomMemberByUserId(
      ctx,
      args.roomId,
      userId,
    );

    const now = Date.now();
    const startPos = args.startPositionMs ?? 0;
    const positionMs = Math.max(0, Math.floor(startPos));
    await ctx.db.insert("roomMusicStreams", {
      roomId: args.roomId,
      hostUserId: userId,
      hostDisplayName: member.displayName,
      trackStorageId: args.trackStorageId,
      trackFileName: args.trackFileName,
      status: "playing",
      positionMs,
      startedAtMs: now,
      createdAt: now,
      updatedAt: now,
    });
  },
});

export const pauseRoomMusicStream = mutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, { roomId }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("SIGN_IN_REQUIRED");
    await requireRoomMemberByUserId(ctx, roomId, userId);

    const latest = await ctx.db
      .query("roomMusicStreams")
      .withIndex("by_room", (q) => q.eq("roomId", roomId))
      .order("desc")
      .first();
    if (!latest) throw new Error("NO_STREAM");
    if (latest.hostUserId !== userId) throw new Error("NOT_HOST");
    if (latest.status !== "playing") return;
    if (latest.startedAtMs === undefined) return;

    const elapsed = Date.now() - latest.startedAtMs;
    const nextPos = Math.max(0, latest.positionMs + elapsed);
    await ctx.db.patch(latest._id, {
      status: "paused",
      startedAtMs: undefined,
      positionMs: nextPos,
      updatedAt: Date.now(),
    });
  },
});

export const resumeRoomMusicStream = mutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, { roomId }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("SIGN_IN_REQUIRED");
    await requireRoomMemberByUserId(ctx, roomId, userId);

    const latest = await ctx.db
      .query("roomMusicStreams")
      .withIndex("by_room", (q) => q.eq("roomId", roomId))
      .order("desc")
      .first();
    if (!latest) throw new Error("NO_STREAM");
    if (latest.hostUserId !== userId) throw new Error("NOT_HOST");

    if (latest.status === "playing") return;
    const now = Date.now();
    await ctx.db.patch(latest._id, {
      status: "playing",
      startedAtMs: now,
      updatedAt: now,
    });
  },
});

export const stopRoomMusicStream = mutation({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, { roomId }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("SIGN_IN_REQUIRED");
    await requireRoomMemberByUserId(ctx, roomId, userId);

    const latest = await ctx.db
      .query("roomMusicStreams")
      .withIndex("by_room", (q) => q.eq("roomId", roomId))
      .order("desc")
      .first();
    if (!latest) return;
    if (latest.hostUserId !== userId) throw new Error("NOT_HOST");

    await ctx.db.patch(latest._id, {
      status: "stopped",
      startedAtMs: undefined,
      positionMs: 0,
      updatedAt: Date.now(),
    });
  },
});

export const getRoomMusicStream = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, { roomId }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    await requireRoomMemberByUserId(ctx, roomId, userId);

    const latest = await ctx.db
      .query("roomMusicStreams")
      .withIndex("by_room", (q) => q.eq("roomId", roomId))
      .order("desc")
      .first();
    if (!latest) return null;
    if (latest.status === "stopped") return null;

    const trackUrl = await ctx.storage.getUrl(latest.trackStorageId);
    // If storage URL can't be generated for some reason, hide stream.
    if (!trackUrl) return null;

    return {
      _id: latest._id,
      roomId: latest.roomId,
      hostUserId: latest.hostUserId,
      hostDisplayName: latest.hostDisplayName,
      trackFileName: latest.trackFileName,
      trackUrl,
      status: latest.status,
      positionMs: latest.positionMs,
      startedAtMs: latest.startedAtMs,
      updatedAt: latest.updatedAt,
    };
  },
});


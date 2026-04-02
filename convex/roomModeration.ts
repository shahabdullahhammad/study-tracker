import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { mutation } from "./_generated/server";
import {
  MAX_DISPLAY_NAME_LENGTH,
  nameKeyFromRaw,
  namesMatch,
  normalizeDisplayName,
} from "./identity";

async function getMemberRow(
  ctx: MutationCtx,
  roomId: Id<"rooms">,
  displayName: string,
) {
  const nameKey = nameKeyFromRaw(displayName);
  if (!nameKey) return null;
  return await ctx.db
    .query("roomMembers")
    .withIndex("by_room_nameKey", (q) =>
      q.eq("roomId", roomId).eq("nameKey", nameKey),
    )
    .first();
}

async function assertOwner(
  ctx: MutationCtx,
  roomId: Id<"rooms">,
  actorDisplayName: string,
) {
  const room = await ctx.db.get(roomId);
  if (!room) throw new Error("Room not found");
  if (!room.createdBy || !namesMatch(room.createdBy, actorDisplayName)) {
    throw new Error("Only the room owner can do this");
  }
  return room;
}

async function assertOwnerOrAdmin(
  ctx: MutationCtx,
  roomId: Id<"rooms">,
  actorDisplayName: string,
) {
  const room = await ctx.db.get(roomId);
  if (!room) throw new Error("Room not found");
  if (room.createdBy && namesMatch(room.createdBy, actorDisplayName)) {
    return { room, role: "owner" as const };
  }
  const m = await getMemberRow(ctx, roomId, actorDisplayName);
  if (m?.isAdmin === true) return { room, role: "admin" as const };
  throw new Error("Only the room owner or a room admin can do this");
}

async function deleteMemberData(
  ctx: MutationCtx,
  roomId: Id<"rooms">,
  nameKey: string,
  displayName: string,
) {
  for (const row of await ctx.db
    .query("taskCompletions")
    .withIndex("by_room", (q) => q.eq("roomId", roomId))
    .collect()) {
    if (row.nameKey === nameKey) await ctx.db.delete(row._id);
  }
  for (const row of await ctx.db
    .query("taskMemberTime")
    .withIndex("by_room", (q) => q.eq("roomId", roomId))
    .collect()) {
    if (row.nameKey === nameKey) await ctx.db.delete(row._id);
  }
  const stat = await ctx.db
    .query("roomMemberStats")
    .withIndex("by_room_name", (q) =>
      q.eq("roomId", roomId).eq("displayName", displayName),
    )
    .first();
  if (stat) await ctx.db.delete(stat._id);
}

export const promoteToRoomAdmin = mutation({
  args: {
    roomId: v.id("rooms"),
    targetDisplayName: v.string(),
    actorDisplayName: v.string(),
  },
  handler: async (ctx, args) => {
    await getAuthUserId(ctx);
    const room = await assertOwner(ctx, args.roomId, args.actorDisplayName);
    const targetName = normalizeDisplayName(args.targetDisplayName);
    if (!targetName) throw new Error("Invalid name");
    if (room.createdBy && namesMatch(room.createdBy, targetName)) {
      throw new Error("The owner is already in charge; use admins for others");
    }
    const row = await getMemberRow(ctx, args.roomId, targetName);
    if (!row) throw new Error("That person is not in this room");
    await ctx.db.patch(row._id, { isAdmin: true });
  },
});

export const demoteRoomAdmin = mutation({
  args: {
    roomId: v.id("rooms"),
    targetDisplayName: v.string(),
    actorDisplayName: v.string(),
  },
  handler: async (ctx, args) => {
    await getAuthUserId(ctx);
    await assertOwner(ctx, args.roomId, args.actorDisplayName);
    const targetName = normalizeDisplayName(args.targetDisplayName);
    const row = await getMemberRow(ctx, args.roomId, targetName);
    if (!row) throw new Error("That person is not in this room");
    await ctx.db.patch(row._id, { isAdmin: false });
  },
});

export const removeRoomMember = mutation({
  args: {
    roomId: v.id("rooms"),
    targetDisplayName: v.string(),
    actorDisplayName: v.string(),
  },
  handler: async (ctx, args) => {
    await getAuthUserId(ctx);
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found");
    const targetName = normalizeDisplayName(args.targetDisplayName);
    const actorName = normalizeDisplayName(args.actorDisplayName);
    if (!targetName || !actorName) throw new Error("Invalid name");

    if (room.createdBy && namesMatch(room.createdBy, targetName)) {
      throw new Error("Cannot remove the room owner");
    }

    const targetRow = await getMemberRow(ctx, args.roomId, targetName);
    if (!targetRow) throw new Error("That person is not in this room");

    const actorIsOwner =
      room.createdBy && namesMatch(room.createdBy, actorName);
    const actorRow = await getMemberRow(ctx, args.roomId, actorName);
    const actorIsAdmin = actorRow?.isAdmin === true;

    if (!actorIsOwner && !actorIsAdmin) {
      throw new Error("Only the owner or a room admin can remove members");
    }
    if (actorIsAdmin && !actorIsOwner && targetRow.isAdmin === true) {
      throw new Error("Only the owner can remove another admin");
    }

    const nk = targetRow.nameKey;
    const canon = targetRow.displayName;
    await ctx.db.delete(targetRow._id);
    await deleteMemberData(ctx, args.roomId, nk, canon);
  },
});

/** Pre-register a name so that person can join later with the room password (claim). */
export const addMemberPlaceholder = mutation({
  args: {
    roomId: v.id("rooms"),
    displayName: v.string(),
    actorDisplayName: v.string(),
  },
  handler: async (ctx, args) => {
    await getAuthUserId(ctx);
    await assertOwnerOrAdmin(ctx, args.roomId, args.actorDisplayName);

    const displayName = normalizeDisplayName(args.displayName);
    if (!displayName) throw new Error("Enter a name");
    if (displayName.length > MAX_DISPLAY_NAME_LENGTH) {
      throw new Error("Name is too long");
    }
    const nameKey = nameKeyFromRaw(args.displayName);
    if (!nameKey) throw new Error("Enter a name");

    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found");
    if (room.createdBy && namesMatch(room.createdBy, displayName)) {
      throw new Error("That name is already the owner");
    }

    const taken = await ctx.db
      .query("roomMembers")
      .withIndex("by_room_nameKey", (q) =>
        q.eq("roomId", args.roomId).eq("nameKey", nameKey),
      )
      .first();
    if (taken) {
      throw new Error("That name is already in the room");
    }

    await ctx.db.insert("roomMembers", {
      roomId: args.roomId,
      displayName,
      nameKey,
      joinedAt: Date.now(),
      userId: undefined,
      isAdmin: false,
    });
  },
});

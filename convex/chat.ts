import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import {
  nameKeyFromRaw,
  namesMatch,
  requireRoomMember,
} from "./identity";

const MAX_BODY_LENGTH = 2000;
const MAX_NAME_LENGTH = 80;
const MAX_MESSAGES_PER_ROOM = 400;
const MAX_MESSAGES_PER_ROOM_PER_MINUTE = 30;
const RATE_WINDOW_MS = 60_000;

async function getMyRoomMemberRow(
  ctx: Parameters<typeof requireRoomMember>[0],
  roomId: Id<"rooms">,
  userId: Id<"users">,
) {
  const rows = await ctx.db
    .query("roomMembers")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();
  return rows.find((r) => r.roomId === roomId) ?? null;
}

export const listMessagesByRoom = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) return null;
    const all = await ctx.db
      .query("messages")
      .withIndex("by_room_created", (q) => q.eq("roomId", args.roomId))
      .order("desc")
      .take(120);
    const reversed = all.reverse();

    const userId = await getAuthUserId(ctx);
    let hiddenMessageIds = new Set<string>();
    if (userId) {
      const hidden = await ctx.db
        .query("messageHidden")
        .withIndex("by_user_room", (q) =>
          q.eq("userId", userId).eq("roomId", args.roomId),
        )
        .collect();
      hiddenMessageIds = new Set(hidden.map((h) => h.messageId.toString()));
    }

    const out: any[] = [];
    for (const m of reversed) {
      if (hiddenMessageIds.has(m._id.toString())) continue;
      let imageUrl: string | undefined = undefined;
      if (m.imageStorageId) {
        const url = await ctx.storage.getUrl(m.imageStorageId);
        imageUrl = url ?? undefined;
      }
      out.push({
        _id: m._id,
        roomId: m.roomId,
        authorName: m.authorName,
        authorUserId: m.userId ?? undefined,
        body: m.body,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt ?? undefined,
        imageUrl,
        imageFileName: m.imageFileName ?? undefined,
        nameKey: m.nameKey ?? undefined,
      });
    }

    return out;
  },
});

export const sendMessage = mutation({
  args: {
    roomId: v.id("rooms"),
    authorName: v.string(),
    body: v.string(),
    imageStorageId: v.optional(v.id("_storage")),
    imageFileName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("SIGN_IN_REQUIRED");
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found");
    const { displayName: authorName } = await requireRoomMember(
      ctx,
      args.roomId,
      args.authorName,
    );
    if (authorName.length > MAX_NAME_LENGTH) {
      throw new Error("Name is too long");
    }

    const body = args.body.trim();
    const hasImage = Boolean(args.imageStorageId);
    if (!body && !hasImage) throw new Error("Message cannot be empty");
    if (body.length > MAX_BODY_LENGTH) throw new Error("Message is too long");

    const inRoom = await ctx.db
      .query("messages")
      .withIndex("by_room_created", (q) => q.eq("roomId", args.roomId))
      .collect();
    if (inRoom.length >= MAX_MESSAGES_PER_ROOM) {
      throw new Error("This room has too many messages");
    }
    const now = Date.now();
    const recent = inRoom.filter((m) => m.createdAt > now - RATE_WINDOW_MS).length;
    if (recent >= MAX_MESSAGES_PER_ROOM_PER_MINUTE) {
      throw new Error(
        "RATE_LIMIT: Too many messages in this room. Wait a moment.",
      );
    }

    await ctx.db.insert("messages", {
      roomId: args.roomId,
      authorName,
      body,
      nameKey: nameKeyFromRaw(authorName),
      userId,
      imageStorageId: args.imageStorageId,
      imageFileName: args.imageFileName,
      createdAt: now,
    });
  },
});

export const editChatMessage = mutation({
  args: {
    roomId: v.id("rooms"),
    messageId: v.id("messages"),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("SIGN_IN_REQUIRED");

    const msg = await ctx.db.get(args.messageId);
    if (!msg || msg.roomId !== args.roomId) throw new Error("Message not found");

    const me = await getMyRoomMemberRow(ctx, args.roomId, userId);
    const isAuthor =
      (msg.userId != null && msg.userId === userId) ||
      (me ? namesMatch(msg.authorName, me.displayName) : false);
    if (!isAuthor) throw new Error("FORBIDDEN: You can only edit your own message");

    const nextBody = args.body.trim();
    if (!nextBody) throw new Error("Message cannot be empty");
    if (nextBody.length > MAX_BODY_LENGTH) throw new Error("Message is too long");

    await ctx.db.patch(args.messageId, { body: nextBody, updatedAt: Date.now() });
  },
});

export const deleteChatMessageForMe = mutation({
  args: {
    roomId: v.id("rooms"),
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("SIGN_IN_REQUIRED");

    const msg = await ctx.db.get(args.messageId);
    if (!msg || msg.roomId !== args.roomId) throw new Error("Message not found");

    const me = await getMyRoomMemberRow(ctx, args.roomId, userId);
    if (!me) throw new Error("NOT_MEMBER");

    const existing = await ctx.db
      .query("messageHidden")
      .withIndex("by_message_user", (q) =>
        q.eq("messageId", args.messageId).eq("userId", userId),
      )
      .first();
    if (existing) return;

    await ctx.db.insert("messageHidden", {
      roomId: args.roomId,
      messageId: args.messageId,
      userId,
      createdAt: Date.now(),
    });
  },
});

export const deleteChatMessageForAll = mutation({
  args: {
    roomId: v.id("rooms"),
    messageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("SIGN_IN_REQUIRED");

    const msg = await ctx.db.get(args.messageId);
    if (!msg || msg.roomId !== args.roomId) throw new Error("Message not found");

    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found");

    const me = await getMyRoomMemberRow(ctx, args.roomId, userId);
    if (!me) throw new Error("NOT_MEMBER");

    const isOwner = room.createdBy != null && namesMatch(room.createdBy, me.displayName);
    const isAdmin = me.isAdmin === true;
    const isAuthor =
      (msg.userId != null && msg.userId === userId) ||
      namesMatch(msg.authorName, me.displayName);

    if (!isOwner && !isAdmin && !isAuthor) {
      throw new Error("FORBIDDEN: You cannot delete this message for everyone");
    }

    await ctx.db.delete(args.messageId);
  },
});

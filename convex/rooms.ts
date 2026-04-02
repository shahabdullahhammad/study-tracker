import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import {
  MAX_DISPLAY_NAME_LENGTH,
  nameKeyFromRaw,
  normalizeDisplayName,
} from "./identity";

async function upsertSavedRoom(
  ctx: MutationCtx,
  userId: Id<"users">,
  roomId: Id<"rooms">,
  roomName: string,
) {
  const now = Date.now();
  const existing = await ctx.db
    .query("userSavedRooms")
    .withIndex("by_user_room", (q) =>
      q.eq("userId", userId).eq("roomId", roomId),
    )
    .first();
  if (existing) {
    await ctx.db.patch(existing._id, { roomName, updatedAt: now });
  } else {
    await ctx.db.insert("userSavedRooms", {
      userId,
      roomId,
      roomName,
      updatedAt: now,
    });
  }
}

const MAX_ROOM_NAME_LENGTH = 120;
const MIN_PASSWORD_LENGTH = 4;

function normalizeRoomName(name: string): string {
  return name.trim();
}

async function sha256Hex(message: string): Promise<string> {
  const data = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

function randomHex(byteLength: number): string {
  const arr = new Uint8Array(byteLength);
  crypto.getRandomValues(arr);
  return Array.from(arr)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

async function hashPassword(
  password: string,
  salt: string,
): Promise<string> {
  return sha256Hex(`${salt}:${password}`);
}

async function verifyPassword(
  password: string,
  salt: string | undefined,
  hash: string | undefined,
): Promise<boolean> {
  if (!salt || !hash) return false;
  return (await hashPassword(password, salt)) === hash;
}

export const previewRoomByName = query({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const roomName = normalizeRoomName(args.name);
    if (!roomName) return null;
    const existing = await ctx.db
      .query("rooms")
      .withIndex("by_name", (q) => q.eq("name", roomName))
      .first();
    if (!existing) return { exists: false as const, hasPassword: false };
    return {
      exists: true as const,
      hasPassword: Boolean(existing.passwordHash),
    };
  },
});

export const getRoom = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const r = await ctx.db.get(args.roomId);
    if (!r) return null;
    return {
      _id: r._id,
      name: r.name,
      createdAt: r.createdAt,
      createdBy: r.createdBy,
      hasPassword: Boolean(r.passwordHash),
    };
  },
});

export const createRoom = mutation({
  args: {
    name: v.string(),
    createdBy: v.optional(v.string()),
    password: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const name = normalizeRoomName(args.name);
    if (!name) throw new Error("Room name cannot be empty");
    if (name.length > MAX_ROOM_NAME_LENGTH) {
      throw new Error("Room name is too long");
    }
    const now = Date.now();
    const pw = args.password?.trim() ?? "";
    if (pw.length > 0) {
      if (pw.length < MIN_PASSWORD_LENGTH) {
        throw new Error(
          `Password must be at least ${MIN_PASSWORD_LENGTH} characters`,
        );
      }
      const salt = randomHex(16);
      const passwordHash = await hashPassword(pw, salt);
      return await ctx.db.insert("rooms", {
        name,
        createdAt: now,
        createdBy: args.createdBy,
        taskSeq: 0,
        passwordSalt: salt,
        passwordHash,
      });
    }
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
    displayName: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("SIGN_IN_REQUIRED");
    }

    const roomName = normalizeRoomName(args.name);
    if (!roomName) throw new Error("Room name cannot be empty");
    if (roomName.length > MAX_ROOM_NAME_LENGTH) {
      throw new Error("Room name is too long");
    }

    const displayName = normalizeDisplayName(args.displayName);
    if (!displayName) throw new Error("Enter your name");
    if (displayName.length > MAX_DISPLAY_NAME_LENGTH) {
      throw new Error("Name is too long");
    }
    const nameKey = nameKeyFromRaw(args.displayName);
    if (!nameKey) throw new Error("Enter your name");

    const existing = await ctx.db
      .query("rooms")
      .withIndex("by_name", (q) => q.eq("name", roomName))
      .first();

    const now = Date.now();

    if (!existing) {
      const pw = args.password.trim();
      if (pw.length < MIN_PASSWORD_LENGTH) {
        throw new Error(
          `Choose a room password of at least ${MIN_PASSWORD_LENGTH} characters (only you should share it).`,
        );
      }
      const salt = randomHex(16);
      const passwordHash = await hashPassword(pw, salt);
      const roomId = await ctx.db.insert("rooms", {
        name: roomName,
        createdAt: now,
        createdBy: displayName,
        taskSeq: 0,
        passwordSalt: salt,
        passwordHash,
      });
      await ctx.db.insert("roomMembers", {
        roomId,
        displayName,
        nameKey,
        joinedAt: now,
        userId,
      });
      await upsertSavedRoom(ctx, userId, roomId, roomName);
      return { roomId, created: true as const, displayName };
    }

    if (existing.passwordHash) {
      if (
        !(await verifyPassword(
          args.password,
          existing.passwordSalt,
          existing.passwordHash,
        ))
      ) {
        throw new Error("Wrong room password");
      }
    }

    const taken = await ctx.db
      .query("roomMembers")
      .withIndex("by_room_nameKey", (q) =>
        q.eq("roomId", existing._id).eq("nameKey", nameKey),
      )
      .first();
    if (taken) {
      if (taken.userId === undefined) {
        await ctx.db.patch(taken._id, { userId });
        await upsertSavedRoom(ctx, userId, existing._id, existing.name);
        return { roomId: existing._id, created: false as const, displayName };
      }
      throw new Error(
        "NAME_TAKEN: Someone already uses that name in this room (names are unique, ignoring capitalization).",
      );
    }

    await ctx.db.insert("roomMembers", {
      roomId: existing._id,
      displayName,
      nameKey,
      joinedAt: now,
      userId,
    });
    await upsertSavedRoom(ctx, userId, existing._id, existing.name);
    return { roomId: existing._id, created: false as const, displayName };
  },
});

export const joinRoomById = mutation({
  args: {
    roomId: v.id("rooms"),
    displayName: v.string(),
    password: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) {
      throw new Error("SIGN_IN_REQUIRED");
    }

    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found");

    const displayName = normalizeDisplayName(args.displayName);
    if (!displayName) throw new Error("Enter your name");
    if (displayName.length > MAX_DISPLAY_NAME_LENGTH) {
      throw new Error("Name is too long");
    }
    const nameKey = nameKeyFromRaw(args.displayName);
    if (!nameKey) throw new Error("Enter your name");

    if (room.passwordHash) {
      if (
        !(await verifyPassword(
          args.password,
          room.passwordSalt,
          room.passwordHash,
        ))
      ) {
        throw new Error("Wrong room password");
      }
    }

    const taken = await ctx.db
      .query("roomMembers")
      .withIndex("by_room_nameKey", (q) =>
        q.eq("roomId", args.roomId).eq("nameKey", nameKey),
      )
      .first();
    if (taken) {
      if (taken.userId === undefined) {
        await ctx.db.patch(taken._id, { userId });
        await upsertSavedRoom(ctx, userId, args.roomId, room.name);
        return { displayName };
      }
      throw new Error(
        "NAME_TAKEN: Someone already uses that name in this room (names are unique, ignoring capitalization).",
      );
    }

    await ctx.db.insert("roomMembers", {
      roomId: args.roomId,
      displayName,
      nameKey,
      joinedAt: Date.now(),
      userId,
    });
    await upsertSavedRoom(ctx, userId, args.roomId, room.name);
    return { displayName };
  },
});

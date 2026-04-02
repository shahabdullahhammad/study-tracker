import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import {
  MAX_DISPLAY_NAME_LENGTH,
  nameKeyFromRaw,
  namesMatch,
} from "./identity";

const ALLOWED_GRADES = new Set([
  "1st",
  "2nd",
  "3rd",
  "4th",
  "5th",
  "6th",
  "7th",
  "8th",
  "9th",
  "10th",
  "11th",
  "12th",
  "1st year",
  "2nd year",
  "3rd year",
]);

function isGrade10OrBelow(grade: string | undefined): boolean {
  if (!grade) return true;
  return [
    "1st",
    "2nd",
    "3rd",
    "4th",
    "5th",
    "6th",
    "7th",
    "8th",
    "9th",
    "10th",
  ].includes(grade);
}

function needsStream(grade: string | undefined): boolean {
  if (!grade) return false;
  return ["11th", "12th", "1st year", "2nd year", "3rd year"].includes(
    grade,
  );
}

export const getMyProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;

    let avatarUrl: string | null = null;
    if (user.imageStorageId) {
      avatarUrl = (await ctx.storage.getUrl(user.imageStorageId)) ?? null;
    }
    if (!avatarUrl && user.image) {
      avatarUrl = user.image;
    }

    return { ...user, avatarUrl };
  },
});

export const updateMyProfile = mutation({
  args: {
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    gradeLevel: v.optional(v.string()),
    stream: v.optional(v.union(v.literal("pcb"), v.literal("pcm"))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const patch: Record<string, unknown> = {};

    const oldName = user.name ?? "";
    const oldNameTrim = oldName.trim();

    if (args.name !== undefined) {
      const n = args.name.trim();
      if (!n) throw new Error("Display name cannot be empty");
      if (n.length > MAX_DISPLAY_NAME_LENGTH) {
        throw new Error("Display name is too long");
      }
      patch.name = n;
    }

    if (args.image !== undefined) {
      const i = args.image.trim();
      if (i.length === 0) {
        patch.image = undefined;
      } else {
        if (user.imageStorageId) {
          await ctx.storage.delete(user.imageStorageId);
        }
        patch.imageStorageId = undefined;
        patch.image = i;
      }
    }

    let nextGrade = user.gradeLevel;
    if (args.gradeLevel !== undefined) {
      const g = args.gradeLevel.trim();
      if (g && !ALLOWED_GRADES.has(g)) {
        throw new Error("Invalid class or year");
      }
      nextGrade = g.length > 0 ? g : undefined;
      patch.gradeLevel = nextGrade;
    }

    if (args.gradeLevel !== undefined && isGrade10OrBelow(nextGrade)) {
      patch.stream = undefined;
    } else if (args.stream !== undefined) {
      if (needsStream(nextGrade)) {
        patch.stream = args.stream;
      }
    }

    if (!needsStream(nextGrade)) {
      patch.stream = undefined;
    }

    await ctx.db.patch(userId, patch);

    // If display name changed, sync it across all rooms where this user is a member.
    if (args.name !== undefined) {
      const newName = (patch.name as string | undefined) ?? undefined;
      if (!newName) return;
      const newNameKey = nameKeyFromRaw(newName);

      const memberships = await ctx.db
        .query("roomMembers")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .collect();

      for (const mem of memberships) {
        const roomId = mem.roomId;
        const oldMemberDisplayName = mem.displayName;
        const oldMemberNameKey = mem.nameKey;

        const conflict = await ctx.db
          .query("roomMembers")
          .withIndex("by_room_nameKey", (q) =>
            q.eq("roomId", roomId).eq("nameKey", newNameKey),
          )
          .first();
        if (conflict) {
          const sameRow = conflict._id === mem._id;
          if (!sameRow && conflict.userId !== userId) {
            throw new Error(
              "Name is already taken in one of your rooms. Choose a different display name.",
            );
          }
        }

        await ctx.db.patch(mem._id, {
          displayName: newName,
          nameKey: newNameKey,
        });

        // Update per-task records.
        const compRows = await ctx.db
          .query("taskCompletions")
          .withIndex("by_room_nameKey", (q) =>
            q.eq("roomId", roomId).eq("nameKey", oldMemberNameKey),
          )
          .collect();
        for (const r of compRows) {
          await ctx.db.patch(r._id, {
            displayName: newName,
            nameKey: newNameKey,
          });
        }

        const timeRows = await ctx.db
          .query("taskMemberTime")
          .withIndex("by_room_nameKey", (q) =>
            q.eq("roomId", roomId).eq("nameKey", oldMemberNameKey),
          )
          .collect();
        for (const r of timeRows) {
          await ctx.db.patch(r._id, {
            displayName: newName,
            nameKey: newNameKey,
          });
        }

        // Update room member stats display name.
        const statsRows = await ctx.db
          .query("roomMemberStats")
          .withIndex("by_room_name", (q) =>
            q.eq("roomId", roomId).eq("displayName", oldMemberDisplayName),
          )
          .collect();
        for (const r of statsRows) {
          await ctx.db.patch(r._id, { displayName: newName });
        }

        // Keep room owner label aligned so owner badge stays correct.
        const room = await ctx.db.get(roomId);
        if (room?.createdBy && namesMatch(room.createdBy, oldNameTrim)) {
          await ctx.db.patch(roomId, { createdBy: newName });
        }
      }
    }
  },
});

export const generateAvatarUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    return await ctx.storage.generateUploadUrl();
  },
});

export const saveAvatarUpload = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, { storageId }) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

    const oldId = user.imageStorageId;
    if (oldId && oldId !== storageId) {
      await ctx.storage.delete(oldId);
    }
    await ctx.db.patch(userId, { imageStorageId: storageId });
  },
});

export const removeAvatarUpload = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    const user = await ctx.db.get(userId);
    if (!user?.imageStorageId) return;
    await ctx.storage.delete(user.imageStorageId);
    await ctx.db.patch(userId, { imageStorageId: undefined });
  },
});

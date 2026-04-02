import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

export const MAX_DISPLAY_NAME_LENGTH = 80;

export function namesMatch(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

export function nameKeyFromRaw(raw: string): string {
  return raw.trim().toLowerCase();
}

export function normalizeDisplayName(raw: string): string {
  return raw.trim();
}

/**
 * Ensures the caller is a registered room member (or legacy first user in an old open room).
 * Returns the canonical display name stored for stats/chat.
 */
export async function requireRoomMember(
  ctx: MutationCtx,
  roomId: Id<"rooms">,
  rawName: string,
): Promise<{ displayName: string }> {
  const trimmed = normalizeDisplayName(rawName);
  if (!trimmed) throw new Error("Name is required");
  if (trimmed.length > MAX_DISPLAY_NAME_LENGTH) {
    throw new Error("Name is too long");
  }
  const nameKey = nameKeyFromRaw(rawName);
  if (!nameKey) throw new Error("Name is required");

  const existing = await ctx.db
    .query("roomMembers")
    .withIndex("by_room_nameKey", (q) =>
      q.eq("roomId", roomId).eq("nameKey", nameKey),
    )
    .first();
  if (existing) return { displayName: existing.displayName };

  const room = await ctx.db.get(roomId);
  if (!room) throw new Error("Room not found");

  if (room.passwordHash) {
    throw new Error(
      "NOT_MEMBER: Join this room from the home page or invite link with your name and password.",
    );
  }

  const members = await ctx.db
    .query("roomMembers")
    .withIndex("by_room", (q) => q.eq("roomId", roomId))
    .collect();
  if (members.length > 0) {
    throw new Error(
      "NOT_MEMBER: Join this room from the home page with your name (rooms without a password still require a unique name per person).",
    );
  }

  const now = Date.now();
  await ctx.db.insert("roomMembers", {
    roomId,
    displayName: trimmed,
    nameKey,
    joinedAt: now,
  });
  return { displayName: trimmed };
}

import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { nameKeyFromRaw, requireRoomMember } from "./identity";

const MAX_TASKS_PER_ROOM = 500;
const MAX_TITLE_LENGTH = 500;
/** Soft cap: new tasks per room per rolling minute (abuse / accidental spam). */
const MAX_NEW_TASKS_PER_ROOM_PER_MINUTE = 45;
const RATE_WINDOW_MS = 60_000;

export const listTasksByRoom = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) return null;
    return await ctx.db
      .query("tasks")
      .withIndex("by_room_order", (q) => q.eq("roomId", args.roomId))
      .order("asc")
      .collect();
  },
});

export const createTask = mutation({
  args: {
    roomId: v.id("rooms"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found");
    const title = args.title.trim();
    if (!title) throw new Error("Title cannot be empty");
    if (title.length > MAX_TITLE_LENGTH) throw new Error("Title is too long");
    const inRoom = await ctx.db
      .query("tasks")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();
    if (inRoom.length >= MAX_TASKS_PER_ROOM) {
      throw new Error("This room has too many tasks");
    }

    const now = Date.now();
    const recentCreates = inRoom.filter(
      (t) => t.createdAt > now - RATE_WINDOW_MS,
    ).length;
    if (recentCreates >= MAX_NEW_TASKS_PER_ROOM_PER_MINUTE) {
      throw new Error(
        "RATE_LIMIT: Too many new tasks in this room. Wait a bit and try again.",
      );
    }

    const maxOrder =
      inRoom.length === 0 ? -1 : Math.max(...inRoom.map((t) => t.order));
    const nextFromTasks = maxOrder + 1;
    const nextOrder =
      room.taskSeq !== undefined
        ? Math.max(room.taskSeq, nextFromTasks)
        : nextFromTasks;

    const taskId = await ctx.db.insert("tasks", {
      roomId: args.roomId,
      title,
      completed: false,
      order: nextOrder,
      createdAt: now,
      updatedAt: now,
      timeSpentSeconds: 0,
    });
    await ctx.db.patch(args.roomId, { taskSeq: nextOrder + 1 });
    return taskId;
  },
});

export const toggleTaskComplete = mutation({
  args: {
    roomId: v.id("rooms"),
    taskId: v.id("tasks"),
    // Client's last known updatedAt; rejects if another writer changed the task first.
    expectedUpdatedAt: v.number(),
    completedBy: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");
    if (task.roomId !== args.roomId) {
      throw new Error("Task does not belong to this room");
    }
    if (task.updatedAt !== args.expectedUpdatedAt) {
      throw new Error(
        "CONFLICT: Task was updated by someone else. Refresh or try again.",
      );
    }
    const now = Date.now();
    const completed = !task.completed;
    let completedBy: string | undefined;
    if (completed && args.completedBy != null && args.completedBy !== "") {
      const { displayName } = await requireRoomMember(
        ctx,
        args.roomId,
        args.completedBy,
      );
      completedBy = displayName;
    }
    await ctx.db.patch(args.taskId, {
      completed,
      updatedAt: now,
      completedBy,
      completedAt: completed ? now : undefined,
    });
    return { completed, updatedAt: now };
  },
});

export const setMyTaskCompletion = mutation({
  args: {
    roomId: v.id("rooms"),
    taskId: v.id("tasks"),
    completed: v.boolean(),
    contributorName: v.string(),
  },
  handler: async (ctx, args) => {
    const { displayName } = await requireRoomMember(
      ctx,
      args.roomId,
      args.contributorName,
    );
    const nameKey = nameKeyFromRaw(args.contributorName);
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");
    if (task.roomId !== args.roomId) {
      throw new Error("Task does not belong to this room");
    }
    const now = Date.now();
    const existing = await ctx.db
      .query("taskCompletions")
      .withIndex("by_task_member", (q) =>
        q.eq("taskId", args.taskId).eq("nameKey", nameKey),
      )
      .first();
    if (existing) {
      await ctx.db.patch(existing._id, {
        completed: args.completed,
        displayName,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("taskCompletions", {
        roomId: args.roomId,
        taskId: args.taskId,
        displayName,
        nameKey,
        completed: args.completed,
        updatedAt: now,
      });
    }
  },
});

export const listTaskCompletionsByRoom = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) return null;
    return await ctx.db
      .query("taskCompletions")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();
  },
});

export const listTaskMemberTimesByRoom = query({
  args: { roomId: v.id("rooms") },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) return null;
    return await ctx.db
      .query("taskMemberTime")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();
  },
});

const MAX_SECONDS_PER_ADD = 8 * 60 * 60;
const MAX_TOTAL_STUDY_SECONDS = 999 * 60 * 60;
const MAX_MEMBER_TOTAL_SECONDS = 99999 * 60 * 60;

export const addTaskTime = mutation({
  args: {
    roomId: v.id("rooms"),
    taskId: v.id("tasks"),
    secondsToAdd: v.number(),
    /** Must match a name you registered when joining this room. */
    contributorName: v.string(),
  },
  handler: async (ctx, args) => {
    const { displayName: contributorName } = await requireRoomMember(
      ctx,
      args.roomId,
      args.contributorName,
    );
    if (args.secondsToAdd <= 0 || args.secondsToAdd > MAX_SECONDS_PER_ADD) {
      throw new Error("Add between 1 second and 8 hours per sync");
    }
    const task = await ctx.db.get(args.taskId);
    if (!task) throw new Error("Task not found");
    if (task.roomId !== args.roomId) {
      throw new Error("Task does not belong to this room");
    }
    const prev = task.timeSpentSeconds ?? 0;
    if (prev + args.secondsToAdd > MAX_TOTAL_STUDY_SECONDS) {
      throw new Error("Total study time for this task is too large");
    }
    const now = Date.now();
    await ctx.db.patch(args.taskId, {
      timeSpentSeconds: prev + args.secondsToAdd,
      updatedAt: now,
    });

    const existing = await ctx.db
      .query("roomMemberStats")
      .withIndex("by_room_name", (q) =>
        q.eq("roomId", args.roomId).eq("displayName", contributorName),
      )
      .first();
    const memberPrev = existing?.totalStudySeconds ?? 0;
    if (memberPrev + args.secondsToAdd > MAX_MEMBER_TOTAL_SECONDS) {
      throw new Error("Recorded study time for this name is too large");
    }
    if (existing) {
      await ctx.db.patch(existing._id, {
        totalStudySeconds: memberPrev + args.secondsToAdd,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("roomMemberStats", {
        roomId: args.roomId,
        displayName: contributorName,
        totalStudySeconds: args.secondsToAdd,
        updatedAt: now,
      });
    }

    const nk = nameKeyFromRaw(contributorName);
    const tmt = await ctx.db
      .query("taskMemberTime")
      .withIndex("by_task_member", (q) =>
        q.eq("taskId", args.taskId).eq("nameKey", nk),
      )
      .first();
    if (tmt) {
      await ctx.db.patch(tmt._id, {
        seconds: tmt.seconds + args.secondsToAdd,
        displayName: contributorName,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("taskMemberTime", {
        roomId: args.roomId,
        taskId: args.taskId,
        displayName: contributorName,
        nameKey: nk,
        seconds: args.secondsToAdd,
        updatedAt: now,
      });
    }

    return { timeSpentSeconds: prev + args.secondsToAdd };
  },
});

export const reorderTasks = mutation({
  args: {
    roomId: v.id("rooms"),
    orderedTaskIds: v.array(v.id("tasks")),
    // Parallel to orderedTaskIds: each task's updatedAt before reorder, for optimistic locking.
    expectedUpdatedAts: v.array(v.number()),
  },
  handler: async (ctx, args) => {
    const room = await ctx.db.get(args.roomId);
    if (!room) throw new Error("Room not found");
    if (args.orderedTaskIds.length !== args.expectedUpdatedAts.length) {
      throw new Error("expectedUpdatedAts must match orderedTaskIds length");
    }
    const current = await ctx.db
      .query("tasks")
      .withIndex("by_room", (q) => q.eq("roomId", args.roomId))
      .collect();
    const idSet = new Set(current.map((t) => t._id));
    if (args.orderedTaskIds.length !== idSet.size) {
      throw new Error("Task list must include every task in this room exactly once");
    }
    for (const id of args.orderedTaskIds) {
      if (!idSet.has(id)) {
        throw new Error("Task does not belong to this room");
      }
    }
    for (let i = 0; i < args.orderedTaskIds.length; i++) {
      const t = await ctx.db.get(args.orderedTaskIds[i]);
      if (!t || t.updatedAt !== args.expectedUpdatedAts[i]) {
        throw new Error(
          "CONFLICT: Tasks changed while reordering. Refresh or try again.",
        );
      }
    }
    const now = Date.now();
    for (let i = 0; i < args.orderedTaskIds.length; i++) {
      await ctx.db.patch(args.orderedTaskIds[i], { order: i, updatedAt: now });
    }
  },
});

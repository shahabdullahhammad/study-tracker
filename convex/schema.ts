import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,
  /** Extended users row: optional uploaded avatar in Convex file storage (see profile.ts). */
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    imageStorageId: v.optional(v.id("_storage")),
    /** e.g. 1st–12th, 1st year–3rd year — see dashboard class selector. */
    gradeLevel: v.optional(v.string()),
    /** PCB vs PCM for class 11th+ (including 1st–3rd year). */
    stream: v.optional(v.union(v.literal("pcb"), v.literal("pcm"))),
  })
    .index("email", ["email"])
    .index("phone", ["phone"]),

  rooms: defineTable({
    name: v.string(),
    createdAt: v.number(),
    /** Display name of whoever created the room (shown as owner). */
    createdBy: v.optional(v.string()),
    // Monotonic counter for assigning task order; avoids duplicate orders under concurrent creates.
    taskSeq: v.optional(v.number()),
    /** Present when the room has a password; joiners must match. */
    passwordSalt: v.optional(v.string()),
    passwordHash: v.optional(v.string()),
  }).index("by_name", ["name"]),

  tasks: defineTable({
    roomId: v.id("rooms"),
    title: v.string(),
    completed: v.boolean(),
    order: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    completedBy: v.optional(v.string()),
    completedAt: v.optional(v.number()),
    /** Cumulative seconds logged as study time for this task. */
    timeSpentSeconds: v.optional(v.number()),
  })
    .index("by_room", ["roomId"])
    .index("by_room_order", ["roomId", "order"])
    .index("by_room_completed", ["roomId", "completed"]),

  /** Chat messages in a study room (real-time for everyone in the room). */
  messages: defineTable({
    roomId: v.id("rooms"),
    authorName: v.string(),
    /** Optional canonical key for permission checks. */
    nameKey: v.optional(v.string()),
    /** Auth user who authored the message (when available). */
    userId: v.optional(v.id("users")),
    body: v.string(),
    /** Optional photo attachment for chat. */
    imageStorageId: v.optional(v.id("_storage")),
    imageFileName: v.optional(v.string()),
    /** Legacy PrimeGPT marker (optional; AI feature is removed). */
    isPrimeGpt: v.optional(v.boolean()),
    updatedAt: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_room_created", ["roomId", "createdAt"]),

  /** Message visibility state for "delete for me". */
  messageHidden: defineTable({
    roomId: v.id("rooms"),
    messageId: v.id("messages"),
    userId: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_user_room", ["userId", "roomId"])
    .index("by_message_user", ["messageId", "userId"]),

  /** Per-person study time logged in this room (visible to all members). */
  roomMemberStats: defineTable({
    roomId: v.id("rooms"),
    displayName: v.string(),
    totalStudySeconds: v.number(),
    updatedAt: v.number(),
  }).index("by_room_name", ["roomId", "displayName"]),

  /** Registered people in a room; displayName uniqueness is enforced per room (case-insensitive). */
  roomMembers: defineTable({
    roomId: v.id("rooms"),
    displayName: v.string(),
    nameKey: v.string(),
    joinedAt: v.number(),
    userId: v.optional(v.id("users")),
    /** Set by room owner; can moderate members (not the owner). */
    isAdmin: v.optional(v.boolean()),
  })
    .index("by_room_nameKey", ["roomId", "nameKey"])
    .index("by_room", ["roomId"])
    .index("by_user", ["userId"]),

  /** Per-person completion on a task (your checkbox is yours; everyone sees who finished). */
  taskCompletions: defineTable({
    roomId: v.id("rooms"),
    taskId: v.id("tasks"),
    displayName: v.string(),
    nameKey: v.string(),
    completed: v.boolean(),
    updatedAt: v.number(),
  })
    .index("by_task_member", ["taskId", "nameKey"])
    .index("by_room", ["roomId"])
    .index("by_room_nameKey", ["roomId", "nameKey"]),

  /** Per-person seconds logged per task (from automatic timer). */
  taskMemberTime: defineTable({
    roomId: v.id("rooms"),
    taskId: v.id("tasks"),
    displayName: v.string(),
    nameKey: v.string(),
    seconds: v.number(),
    updatedAt: v.number(),
  })
    .index("by_task_member", ["taskId", "nameKey"])
    .index("by_room", ["roomId"])
    .index("by_room_nameKey", ["roomId", "nameKey"]),

  /** Logged-in user’s saved rooms for the dashboard. */
  userSavedRooms: defineTable({
    userId: v.id("users"),
    roomId: v.id("rooms"),
    roomName: v.string(),
    updatedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_room", ["userId", "roomId"])
    .index("by_room", ["roomId"]),

  /** Room-shared music stream (host uploads MP3 + others join in sync-ish). */
  roomMusicStreams: defineTable({
    roomId: v.id("rooms"),
    /** Auth userId of the host who started/paused/stopped the stream. */
    hostUserId: v.id("users"),
    hostDisplayName: v.string(),
    trackStorageId: v.id("_storage"),
    trackFileName: v.string(),

    status: v.union(v.literal("playing"), v.literal("paused"), v.literal("stopped")),
    /**
     * Current playhead in ms.
     * - When `status === "playing"`, this is the position at `startedAtMs`.
     * - When `status === "paused"`, this is the paused position.
     */
    positionMs: v.number(),
    /** Server timestamp in ms for when we entered `playing`. */
    startedAtMs: v.optional(v.number()),

    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_room", ["roomId"]),

  /** Completed dashboard practice quizzes (score + time). */
  quizAttempts: defineTable({
    userId: v.id("users"),
    /** e.g. lower:math, pcb:physics, pcm:chemistry */
    quizKey: v.string(),
    subjectId: v.string(),
    subjectLabel: v.string(),
    gradeLevel: v.optional(v.string()),
    stream: v.optional(v.union(v.literal("pcb"), v.literal("pcm"))),
    score: v.number(),
    totalQuestions: v.number(),
    durationMs: v.number(),
    completedAt: v.number(),
  }).index("by_user_completed", ["userId", "completedAt"]),

  /**
   * Optional client debug lines (HTTP ingest). Only written when
   * ALLOW_CLIENT_DEBUG_LOGS=true on the deployment. See debugIngest.ts.
   */
  debugClientLogs: defineTable({
    line: v.string(),
  }),
});

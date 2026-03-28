import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  rooms: defineTable({
    name: v.string(),
    createdAt: v.number(),
    createdBy: v.optional(v.string()),
    // Monotonic counter for assigning task order; avoids duplicate orders under concurrent creates.
    taskSeq: v.optional(v.number()),
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
  })
    .index("by_room", ["roomId"])
    .index("by_room_order", ["roomId", "order"])
    .index("by_room_completed", ["roomId", "completed"]),
});

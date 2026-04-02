import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const recordQuizAttempt = mutation({
  args: {
    quizKey: v.string(),
    subjectId: v.string(),
    subjectLabel: v.string(),
    gradeLevel: v.optional(v.string()),
    stream: v.optional(v.union(v.literal("pcb"), v.literal("pcm"))),
    score: v.number(),
    totalQuestions: v.number(),
    durationMs: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    if (args.totalQuestions <= 0) throw new Error("Invalid quiz");
    if (args.score < 0 || args.score > args.totalQuestions) {
      throw new Error("Invalid score");
    }
    if (args.durationMs < 0 || args.durationMs > 24 * 60 * 60 * 1000) {
      throw new Error("Invalid duration");
    }
    await ctx.db.insert("quizAttempts", {
      userId,
      quizKey: args.quizKey,
      subjectId: args.subjectId,
      subjectLabel: args.subjectLabel,
      gradeLevel: args.gradeLevel,
      stream: args.stream,
      score: args.score,
      totalQuestions: args.totalQuestions,
      durationMs: args.durationMs,
      completedAt: Date.now(),
    });
  },
});

export const listMyQuizAttempts = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return [];
    const lim = Math.min(Math.max(1, args.limit ?? 40), 100);
    return await ctx.db
      .query("quizAttempts")
      .withIndex("by_user_completed", (q) => q.eq("userId", userId))
      .order("desc")
      .take(lim);
  },
});

export const getMyQuizProgressSummary = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const all = await ctx.db
      .query("quizAttempts")
      .withIndex("by_user_completed", (q) => q.eq("userId", userId))
      .collect();

    const totalAttempts = all.length;
    const totalDurationMs = all.reduce((a, r) => a + r.durationMs, 0);
    const totalCorrect = all.reduce((a, r) => a + r.score, 0);
    const totalQuestions = all.reduce((a, r) => a + r.totalQuestions, 0);

    const byKey = new Map<
      string,
      {
        quizKey: string;
        subjectLabel: string;
        attempts: number;
        bestScore: number;
        totalQuestions: number;
        totalDurationMs: number;
        lastCompletedAt: number;
      }
    >();

    for (const r of all) {
      const prev = byKey.get(r.quizKey);
      if (!prev) {
        byKey.set(r.quizKey, {
          quizKey: r.quizKey,
          subjectLabel: r.subjectLabel,
          attempts: 1,
          bestScore: r.score,
          totalQuestions: r.totalQuestions,
          totalDurationMs: r.durationMs,
          lastCompletedAt: r.completedAt,
        });
      } else {
        prev.attempts += 1;
        prev.bestScore = Math.max(prev.bestScore, r.score);
        prev.totalDurationMs += r.durationMs;
        if (r.completedAt > prev.lastCompletedAt) {
          prev.lastCompletedAt = r.completedAt;
          prev.subjectLabel = r.subjectLabel;
        }
      }
    }

    const perSubject = [...byKey.values()].sort(
      (a, b) => b.lastCompletedAt - a.lastCompletedAt,
    );

    return {
      totalAttempts,
      totalDurationMs,
      totalCorrect,
      totalQuestionsAnswered: totalQuestions,
      perSubject,
    };
  },
});

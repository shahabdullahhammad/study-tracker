export const GRADE_OPTIONS = [
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
] as const;

export type GradeOption = (typeof GRADE_OPTIONS)[number];

export function needsStreamSelection(grade: string | undefined): boolean {
  if (!grade) return false;
  return (
    grade === "11th" ||
    grade === "12th" ||
    grade === "1st year" ||
    grade === "2nd year" ||
    grade === "3rd year"
  );
}

const GRADES_10_AND_BELOW = new Set([
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
]);

export function isGrade10OrBelow(grade: string | undefined): boolean {
  if (!grade) return false;
  return GRADES_10_AND_BELOW.has(grade);
}

export type Difficulty = "easy" | "medium" | "hard";

export type QuizQuestion = {
  difficulty: Difficulty;
  question: string;
  options: [string, string, string, string];
  correctIndex: 0 | 1 | 2 | 3;
};

/** Stable id for storing attempts: lower:math, pcb:physics, … */
export function buildQuizKey(
  grade: string,
  stream: "pcb" | "pcm" | undefined,
  subjectId: string,
): string {
  if (isGrade10OrBelow(grade)) return `lower:${subjectId}`;
  if (stream === "pcb") return `pcb:${subjectId}`;
  if (stream === "pcm") return `pcm:${subjectId}`;
  return `misc:${subjectId}`;
}

/** Human-readable duration for quiz time (ms). */
export function formatQuizDuration(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) {
    return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  }
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

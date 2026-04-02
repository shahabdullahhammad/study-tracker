import { useCallback, useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import type { Doc } from "../convex/_generated/dataModel";
import { api } from "../convex/_generated/api";
import {
  buildQuizKey,
  formatQuizDuration,
  GRADE_OPTIONS,
  needsStreamSelection,
  type QuizQuestion,
} from "./gradeQuizConfig";
import { getQuizSubjects } from "./quizData";

type ProfileShape = Doc<"users"> & { avatarUrl?: string | null };

type Props = {
  myProfile: ProfileShape | null | undefined;
  onSaveLearningProfile: (args: {
    gradeLevel: string;
    stream?: "pcb" | "pcm";
  }) => Promise<void>;
  setNotice: (msg: string | null) => void;
};

type ActiveQuiz = {
  subjectId: string;
  subjectLabel: string;
  questions: QuizQuestion[];
  index: number;
  selected: (number | null)[];
  phase: "doing" | "done";
  startedAt: number;
  /** Set when finishing (ms spent in quiz). */
  durationMs?: number;
};

export function DashboardQuizzes({
  myProfile,
  onSaveLearningProfile,
  setNotice,
}: Props) {
  const [gradeDraft, setGradeDraft] = useState("");
  const [streamDraft, setStreamDraft] = useState<"pcb" | "pcm" | "">("");
  const [saving, setSaving] = useState(false);
  const [active, setActive] = useState<ActiveQuiz | null>(null);
  const [tick, setTick] = useState(0);

  const quizSummary = useQuery(api.quizProgress.getMyQuizProgressSummary);
  const recentAttempts = useQuery(api.quizProgress.listMyQuizAttempts, {
    limit: 20,
  });
  const recordQuizAttempt = useMutation(api.quizProgress.recordQuizAttempt);

  useEffect(() => {
    if (!myProfile) return;
    setGradeDraft(myProfile.gradeLevel ?? "");
    setStreamDraft(
      myProfile.stream === "pcb" || myProfile.stream === "pcm"
        ? myProfile.stream
        : "",
    );
  }, [myProfile?._id, myProfile?.gradeLevel, myProfile?.stream]);

  useEffect(() => {
    if (!active || active.phase !== "doing") return;
    const id = window.setInterval(() => setTick((x) => x + 1), 1000);
    return () => clearInterval(id);
  }, [active?.phase, active?.startedAt, active?.subjectId]);

  const subjects = getQuizSubjects(
    gradeDraft,
    streamDraft === "" ? undefined : streamDraft,
  );

  const canSave =
    gradeDraft.trim().length > 0 &&
    (!needsStreamSelection(gradeDraft) ||
      streamDraft === "pcb" ||
      streamDraft === "pcm");

  const canShowQuizzes = canSave && subjects.length > 0;

  const onSave = useCallback(async () => {
    if (!canSave) {
      setNotice(
        needsStreamSelection(gradeDraft)
          ? "Choose PCB or PCM for class 11th and above."
          : "Choose your class or year.",
      );
      return;
    }
    setSaving(true);
    setNotice(null);
    try {
      await onSaveLearningProfile({
        gradeLevel: gradeDraft.trim(),
        stream:
          needsStreamSelection(gradeDraft) && streamDraft
            ? streamDraft
            : undefined,
      });
      setNotice("Learning profile saved.");
    } catch (e) {
      setNotice(e instanceof Error ? e.message : "Could not save");
    } finally {
      setSaving(false);
    }
  }, [canSave, gradeDraft, streamDraft, onSaveLearningProfile, setNotice]);

  const startQuiz = (subjectId: string, subjectLabel: string, qs: QuizQuestion[]) => {
    setTick(0);
    setActive({
      subjectId,
      subjectLabel,
      questions: qs,
      index: 0,
      selected: qs.map(() => null),
      phase: "doing",
      startedAt: Date.now(),
    });
  };

  const computeScore = (a: ActiveQuiz) => {
    let sc = 0;
    for (let i = 0; i < a.questions.length; i++) {
      const sel = a.selected[i];
      if (sel !== null && sel === a.questions[i].correctIndex) sc += 1;
    }
    return sc;
  };

  const finishQuiz = (a: ActiveQuiz) => {
    const durationMs = Date.now() - a.startedAt;
    const sc = computeScore(a);
    const streamArg =
      streamDraft === "pcb" || streamDraft === "pcm" ? streamDraft : undefined;
    void recordQuizAttempt({
      quizKey: buildQuizKey(gradeDraft, streamArg, a.subjectId),
      subjectId: a.subjectId,
      subjectLabel: a.subjectLabel,
      gradeLevel: gradeDraft.trim() || undefined,
      stream: streamArg,
      score: sc,
      totalQuestions: a.questions.length,
      durationMs,
    }).catch((e) =>
      setNotice(e instanceof Error ? e.message : "Could not save quiz result"),
    );
    setActive({ ...a, phase: "done", durationMs });
  };

  let score = 0;
  if (active) {
    for (let i = 0; i < active.questions.length; i++) {
      const sel = active.selected[i];
      if (
        sel !== null &&
        sel === active.questions[i].correctIndex
      ) {
        score += 1;
      }
    }
  }

  const elapsedMs = useMemo(() => {
    if (!active || active.phase !== "doing") return 0;
    return Date.now() - active.startedAt;
  }, [active, tick]);

  return (
    <section className="card dashboard-learning">
      <h2 className="sidebar-heading">Learning profile & quizzes</h2>
      <p className="muted small sidebar-lead">
        Pick your class/year (and stream if needed), save your profile, then
        start practice quizzes. Your score, accuracy, and time are tracked
        automatically.
      </p>
      {quizSummary === undefined ? (
        <p className="muted small quiz-progress-empty">Loading quiz progress…</p>
      ) : quizSummary != null && quizSummary.totalAttempts > 0 ? (
        <div className="quiz-progress-summary">
          <h3 className="quiz-progress-subheading">Your quiz progress</h3>
          <div className="quiz-progress-stats">
            <div className="quiz-stat">
              <span className="quiz-stat-label">Quizzes completed</span>
              <span className="quiz-stat-value">{quizSummary.totalAttempts}</span>
            </div>
            <div className="quiz-stat">
              <span className="quiz-stat-label">Total time on quizzes</span>
              <span className="quiz-stat-value">
                {formatQuizDuration(quizSummary.totalDurationMs)}
              </span>
            </div>
            <div className="quiz-stat">
              <span className="quiz-stat-label">Overall accuracy</span>
              <span className="quiz-stat-value">
                {quizSummary.totalQuestionsAnswered > 0
                  ? `${Math.round(
                      (quizSummary.totalCorrect /
                        quizSummary.totalQuestionsAnswered) *
                        100,
                    )}%`
                  : "—"}
              </span>
            </div>
          </div>
          {quizSummary.perSubject.length > 0 ? (
            <div className="quiz-per-subject-wrap">
              <p className="muted small quiz-per-subject-title">By subject</p>
              <ul className="quiz-per-subject-list">
                {quizSummary.perSubject.map((row) => (
                  <li key={row.quizKey} className="quiz-per-subject-row">
                    <span className="quiz-per-name">{row.subjectLabel}</span>
                    <span className="quiz-per-meta">
                      Best {row.bestScore}/{row.totalQuestions} ·{" "}
                      {row.attempts} attempt{row.attempts === 1 ? "" : "s"} · avg{" "}
                      {formatQuizDuration(
                        Math.round(row.totalDurationMs / row.attempts),
                      )}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ) : quizSummary != null ? (
        <p className="muted small quiz-progress-empty">
          Finish a quiz below to track your score, accuracy, and time taken.
        </p>
      ) : null}

      {recentAttempts !== undefined && recentAttempts.length > 0 ? (
        <div className="quiz-recent-block">
          <h3 className="quiz-progress-subheading">Recent attempts</h3>
          <div className="quiz-recent-table-wrap">
            <table className="quiz-recent-table">
              <thead>
                <tr>
                  <th>When</th>
                  <th>Subject</th>
                  <th>Score</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {recentAttempts.map((r) => (
                  <tr key={r._id}>
                    <td>
                      {new Date(r.completedAt).toLocaleString(undefined, {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </td>
                    <td>{r.subjectLabel}</td>
                    <td>
                      {r.score}/{r.totalQuestions} (
                      {Math.round((r.score / r.totalQuestions) * 100)}%)
                    </td>
                    <td>{formatQuizDuration(r.durationMs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <h2 className="sidebar-heading quiz-main-heading">Class &amp; practice quizzes</h2>
      <p className="muted small dashboard-learning-lead">
        Pick your class or year. From 11th through 3rd year, choose PCB
        (Physics, Chemistry, Biology) or PCM (Physics, Chemistry, Math). Each
        section has ten multiple-choice questions at mixed difficulty. Content
        is bundled for offline practice (not fetched live from the web).
      </p>

      <div className="learning-profile-row">
        <label className="label learning-profile-field">
          Class / year
          <select
            className="input"
            value={gradeDraft}
            onChange={(e) => {
              const v = e.target.value;
              setGradeDraft(v);
              if (!needsStreamSelection(v)) setStreamDraft("");
            }}
          >
            <option value="">Select…</option>
            {GRADE_OPTIONS.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>

        {needsStreamSelection(gradeDraft) ? (
          <fieldset className="learning-stream-fieldset">
            <legend className="learning-stream-legend">Stream</legend>
            <label className="learning-stream-option">
              <input
                type="radio"
                name="stream"
                checked={streamDraft === "pcb"}
                onChange={() => setStreamDraft("pcb")}
              />
              PCB
            </label>
            <label className="learning-stream-option">
              <input
                type="radio"
                name="stream"
                checked={streamDraft === "pcm"}
                onChange={() => setStreamDraft("pcm")}
              />
              PCM
            </label>
          </fieldset>
        ) : null}

        <button
          type="button"
          className="btn primary learning-save-btn"
          disabled={saving || !canSave}
          onClick={() => void onSave()}
        >
          {saving ? "Saving…" : "Save learning profile"}
        </button>
      </div>

      {!canShowQuizzes ? (
        <p className="muted small">
          {gradeDraft && needsStreamSelection(gradeDraft) && !streamDraft
            ? "Select PCB or PCM to unlock quizzes."
            : "Save your class (and stream if needed) to see quizzes."}
        </p>
      ) : (
        <ul className="quiz-subject-list">
          {subjects.map((s) => (
            <li key={s.id} className="quiz-subject-card">
              <div className="quiz-subject-head">
                <h3 className="quiz-subject-title">{s.label}</h3>
                <span className="quiz-subject-meta">
                  10 questions · mixed difficulty
                </span>
              </div>
              <button
                type="button"
                className="btn primary compact"
                disabled={Boolean(active)}
                onClick={() => startQuiz(s.id, s.label, s.questions)}
              >
                Start quiz
              </button>
            </li>
          ))}
        </ul>
      )}

      {active && active.phase === "doing" ? (
        <div className="quiz-modal-overlay" role="dialog" aria-modal="true">
          <div className="quiz-modal card">
            <div className="quiz-modal-head">
              <h3 className="quiz-modal-title">{active.subjectLabel}</h3>
              <div className="quiz-modal-meta">
                <span className="muted small">
                  Question {active.index + 1} / {active.questions.length}
                </span>
                <span className="quiz-elapsed" aria-live="polite">
                  {formatQuizDuration(elapsedMs)}
                </span>
              </div>
            </div>
            {(() => {
              const q = active.questions[active.index];
              return (
                <>
                  <p className="quiz-q-difficulty">
                    <span className={`diff-badge diff-${q.difficulty}`}>
                      {q.difficulty}
                    </span>
                  </p>
                  <p className="quiz-question-text">{q.question}</p>
                  <div className="quiz-options">
                    {q.options.map((opt, oi) => (
                      <label key={oi} className="quiz-option-label">
                        <input
                          type="radio"
                          name="q"
                          checked={active.selected[active.index] === oi}
                          onChange={() => {
                            const next = [...active.selected];
                            next[active.index] = oi;
                            setActive({ ...active, selected: next });
                          }}
                        />
                        {opt}
                      </label>
                    ))}
                  </div>
                  <div className="quiz-modal-actions">
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={() => setActive(null)}
                    >
                      Close
                    </button>
                    {active.index > 0 ? (
                      <button
                        type="button"
                        className="btn ghost"
                        onClick={() =>
                          setActive({ ...active, index: active.index - 1 })
                        }
                      >
                        Back
                      </button>
                    ) : null}
                    {active.index < active.questions.length - 1 ? (
                      <button
                        type="button"
                        className="btn primary"
                        disabled={active.selected[active.index] === null}
                        onClick={() =>
                          setActive({ ...active, index: active.index + 1 })
                        }
                      >
                        Next
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="btn primary"
                        disabled={active.selected[active.index] === null}
                        onClick={() => finishQuiz(active)}
                      >
                        Finish
                      </button>
                    )}
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      ) : null}

      {active && active.phase === "done" ? (
        <div className="quiz-modal-overlay" role="dialog" aria-modal="true">
          <div className="quiz-modal card">
            <h3 className="quiz-modal-title">{active.subjectLabel} — results</h3>
            <p className="quiz-score-line">
              You scored{" "}
              <strong>
                {score} / {active.questions.length}
              </strong>
              {active.durationMs != null ? (
                <>
                  {" "}
                  in{" "}
                  <strong>{formatQuizDuration(active.durationMs)}</strong>
                </>
              ) : null}
              .
            </p>
            <ul className="quiz-review-list">
              {active.questions.map((q, i) => {
                const sel = active.selected[i];
                const ok = sel === q.correctIndex;
                return (
                  <li
                    key={i}
                    className={`quiz-review-item ${ok ? "correct" : "wrong"}`}
                  >
                    <span className="quiz-review-q">{q.question}</span>
                    <span className="quiz-review-ans">
                      {ok ? "Correct" : `Correct: ${q.options[q.correctIndex]}`}
                    </span>
                  </li>
                );
              })}
            </ul>
            <div className="quiz-modal-actions">
              <button
                type="button"
                className="btn primary"
                onClick={() => setActive(null)}
              >
                Done
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}

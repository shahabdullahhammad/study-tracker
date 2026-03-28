import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../convex/_generated/api";
import type { Doc, Id } from "../convex/_generated/dataModel";

function getRoomIdFromSearch(): string | null {
  const id = new URLSearchParams(window.location.search).get("room");
  return id && id.trim() !== "" ? id : null;
}

function setRoomInUrl(roomId: string | null) {
  const url = new URL(window.location.href);
  if (roomId) url.searchParams.set("room", roomId);
  else url.searchParams.delete("room");
  window.history.replaceState({}, "", url.toString());
}

export default function App() {
  const [roomId, setRoomIdState] = useState<string | null>(getRoomIdFromSearch);

  useEffect(() => {
    const onPop = () => setRoomIdState(getRoomIdFromSearch());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const setRoomId = useCallback((id: string | null) => {
    setRoomIdState(id);
    setRoomInUrl(id);
  }, []);

  const room = useQuery(
    api.rooms.getRoom,
    roomId ? { roomId: roomId as Id<"rooms"> } : "skip",
  );
  const tasks = useQuery(
    api.tasks.listTasksByRoom,
    roomId ? { roomId: roomId as Id<"rooms"> } : "skip",
  );

  const createOrJoinRoom = useMutation(api.rooms.createOrJoinRoom);
  const createTask = useMutation(api.tasks.createTask);
  const toggleTaskComplete = useMutation(api.tasks.toggleTaskComplete);

  const [roomName, setRoomName] = useState("");
  const [newTask, setNewTask] = useState("");
  const [joining, setJoining] = useState(false);
  const [adding, setAdding] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const taskList = tasks ?? [];
  const groupProgress = useMemo(() => {
    const total = taskList.length;
    const completed = taskList.filter((t) => t.completed).length;
    const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const completedLastHour = taskList.filter(
      (t) =>
        t.completed &&
        t.completedAt != null &&
        t.completedAt >= oneHourAgo,
    ).length;
    return { total, completed, pct, completedLastHour };
  }, [taskList]);

  const onJoin = async (e: FormEvent) => {
    e.preventDefault();
    if (joining) return;
    setNotice(null);
    setJoining(true);
    try {
      const { roomId: id } = await createOrJoinRoom({ name: roomName });
      setRoomId(id);
      setRoomName("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not join room";
      setNotice(msg);
    } finally {
      setJoining(false);
    }
  };

  const onAddTask = async (e: FormEvent) => {
    e.preventDefault();
    if (!roomId || adding) return;
    const title = newTask.trim();
    if (!title) return;
    setNotice(null);
    setAdding(true);
    try {
      await createTask({ roomId: roomId as Id<"rooms">, title });
      setNewTask("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not add task";
      setNotice(
        msg.includes("RATE_LIMIT")
          ? "This room is adding tasks too quickly. Wait a moment."
          : msg,
      );
    } finally {
      setAdding(false);
    }
  };

  const onToggle = async (task: Doc<"tasks">) => {
    if (togglingId || !roomId) return;
    setNotice(null);
    setTogglingId(task._id);
    try {
      await toggleTaskComplete({
        roomId: roomId as Id<"rooms">,
        taskId: task._id,
        expectedUpdatedAt: task.updatedAt,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Update failed";
      setNotice(
        msg.includes("CONFLICT")
          ? "Another student updated this task. Try again."
          : msg,
      );
    } finally {
      setTogglingId(null);
    }
  };

  if (!roomId) {
    return (
      <main className="shell">
        <div className="card">
          <h1 className="title">Study Tracker</h1>
          <p className="muted">
            Create or join a room by name. Everyone in the same room sees updates
            instantly.
          </p>
          {notice ? (
            <div className="notice-row" role="status">
              <p className="notice">{notice}</p>
              <button
                type="button"
                className="btn notice-dismiss"
                aria-label="Dismiss message"
                onClick={() => setNotice(null)}
              >
                ×
              </button>
            </div>
          ) : null}
          <form onSubmit={onJoin} className="stack">
            <label className="label">
              Room name
              <input
                className="input"
                value={roomName}
                onChange={(e) => setRoomName(e.target.value)}
                placeholder="e.g. CS101 finals"
                autoComplete="off"
                autoFocus
              />
            </label>
            <button
              type="submit"
              className="btn primary"
              disabled={joining || !roomName.trim()}
            >
              {joining ? "Joining…" : "Create or join room"}
            </button>
          </form>
        </div>
      </main>
    );
  }

  if (room === undefined || tasks === undefined) {
    return (
      <main className="shell">
        <div className="card">
          <p className="muted">Loading room…</p>
        </div>
      </main>
    );
  }

  if (room === null) {
    return (
      <main className="shell">
        <div className="card">
          <p className="error">This room does not exist or was removed.</p>
          <button
            type="button"
            className="btn"
            onClick={() => setRoomId(null)}
          >
            Back to home
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="shell">
      <header className="header">
        <div>
          <h1 className="title">{room.name}</h1>
          <p className="muted small">
            Real-time · share this URL to study together
          </p>
        </div>
        <button
          type="button"
          className="btn ghost"
          onClick={() => setRoomId(null)}
        >
          Leave room
        </button>
      </header>

      <section
        className="card progress-card"
        aria-label="Group study progress"
      >
        <h2 className="progress-heading">Group progress</h2>
        {groupProgress.total === 0 ? (
          <p className="muted small progress-empty">
            No tasks yet. Add topics below to track how much the group has finished.
          </p>
        ) : (
          <>
            <div
              className="progress-track"
              role="progressbar"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={groupProgress.pct}
              aria-label={`${groupProgress.pct} percent of tasks completed`}
            >
              <div
                className="progress-fill"
                style={{ width: `${groupProgress.pct}%` }}
              />
            </div>
            <p className="progress-caption">
              <strong>
                {groupProgress.completed} of {groupProgress.total}
              </strong>{" "}
              tasks done
              <span className="progress-pct"> ({groupProgress.pct}%)</span>
            </p>
            <p className="muted small progress-sub">
              {groupProgress.completedLastHour} completed in the last hour ·
              updates live for everyone in this room
            </p>
          </>
        )}
      </section>

      <section className="card">
        {notice ? (
          <div className="notice-row" role="status">
            <p className="notice">{notice}</p>
            <button
              type="button"
              className="btn notice-dismiss"
              aria-label="Dismiss message"
              onClick={() => setNotice(null)}
            >
              ×
            </button>
          </div>
        ) : null}
        <form onSubmit={onAddTask} className="row">
          <input
            className="input grow"
            value={newTask}
            onChange={(e) => setNewTask(e.target.value)}
            placeholder="Add a topic to study…"
            autoComplete="off"
          />
          <button
            type="submit"
            className="btn primary"
            disabled={adding || !newTask.trim()}
          >
            {adding ? "Adding…" : "Add task"}
          </button>
        </form>

        <ul className="task-list">
          {taskList.length === 0 ? (
            <li className="muted list-placeholder">No tasks yet. Add one above.</li>
          ) : (
            taskList.map((t) => (
              <li key={t._id} className="task-item">
                <label className="task-label">
                  <input
                    type="checkbox"
                    checked={t.completed}
                    disabled={togglingId === t._id}
                    onChange={() => void onToggle(t)}
                  />
                  <span className={t.completed ? "done" : undefined}>{t.title}</span>
                </label>
              </li>
            ))
          )}
        </ul>
      </section>
    </main>
  );
}

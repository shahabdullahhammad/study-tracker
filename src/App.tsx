import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import {
  Authenticated,
  AuthLoading,
  Unauthenticated,
  useMutation,
  useQuery,
} from "convex/react";
import { useAuthToken } from "@convex-dev/auth/react";
import { api } from "../convex/_generated/api";
import type { Doc, Id } from "../convex/_generated/dataModel";
import { APP_NAME } from "./brand";
import { SignInPage } from "./SignInPage";
import { agentLog, copyAgentDebugLogToClipboard } from "./debugSession";
import { DashboardQuizzes } from "./DashboardQuizzes";
import { StudyMusicPlayer } from "./StudyMusicPlayer";
import { RoomMusicStream } from "./RoomMusicStream";

const DISPLAY_NAME_KEY = "study-tracker-display-name";
const ROOM_JOIN_PREFIX = "study-tracker-room-join-";

function readJoinedSession(roomId: string): string | null {
  try {
    return sessionStorage.getItem(`${ROOM_JOIN_PREFIX}${roomId}`);
  } catch {
    return null;
  }
}

function writeJoinedSession(roomId: string, displayName: string) {
  try {
    sessionStorage.setItem(`${ROOM_JOIN_PREFIX}${roomId}`, displayName);
  } catch {
    /* ignore */
  }
}

function clearJoinedSession(roomId: string) {
  try {
    sessionStorage.removeItem(`${ROOM_JOIN_PREFIX}${roomId}`);
  } catch {
    /* ignore */
  }
}

function namesMatch(a: string, b: string): boolean {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}

function readStoredDisplayName(): string {
  try {
    return localStorage.getItem(DISPLAY_NAME_KEY) ?? "";
  } catch {
    return "";
  }
}

function persistDisplayName(name: string) {
  try {
    localStorage.setItem(DISPLAY_NAME_KEY, name);
  } catch {
    /* ignore */
  }
}

/** Total study time as `HH:MM:SS` (hours may exceed two digits if needed). */
function formatDurationHMS(totalSeconds: number): string {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const hh = h < 100 ? String(h).padStart(2, "0") : String(h);
  return `${hh}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
}

/** Live session segment as `HH:MM:SS`. */
function formatSessionClock(totalSeconds: number): string {
  return formatDurationHMS(totalSeconds);
}

/** Current local time as `HH:MM:SS` (updates every second in `RoomWallClock`). */
function formatWallTime(ts: number): string {
  const d = new Date(ts);
  return [
    String(d.getHours()).padStart(2, "0"),
    String(d.getMinutes()).padStart(2, "0"),
    String(d.getSeconds()).padStart(2, "0"),
  ].join(":");
}

function RoomWallClock({ compact }: { compact?: boolean }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <div
      className={
        compact ? "room-wall-clock room-wall-clock--compact" : "room-wall-clock"
      }
      role="timer"
      aria-live="polite"
      aria-atomic="true"
    >
      <span className="room-wall-clock-label">Local time</span>
      <time
        className="room-wall-clock-time"
        dateTime={new Date(now).toISOString()}
      >
        {formatWallTime(now)}
      </time>
    </div>
  );
}

function doneNamesForTask(
  taskId: Id<"tasks">,
  task: Doc<"tasks">,
  rows: { taskId: Id<"tasks">; displayName: string; completed: boolean }[],
): string[] {
  const names = rows
    .filter((c) => c.taskId === taskId && c.completed)
    .map((c) => c.displayName);
  const seen = new Set<string>();
  const out: string[] = [];
  for (const n of names) {
    const k = n.trim().toLowerCase();
    if (!seen.has(k)) {
      seen.add(k);
      out.push(n);
    }
  }
  if (out.length === 0 && task.completed && task.completedBy) {
    out.push(task.completedBy);
  }
  return out;
}

function formatChatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

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

/** Logs auth token context shape (never logs token value). */
function AuthSessionDebug() {
  const token = useAuthToken();
  useEffect(() => {
    // #region agent log
    agentLog("App.tsx:AuthSessionDebug", "useAuthToken snapshot", "H2", {
      tokenUndefined: token === undefined,
      tokenNull: token === null,
      hasNonEmptyStringToken:
        typeof token === "string" ? token.length > 0 : false,
    });
    // #endregion
  }, [token]);
  return null;
}

/** DEV-only: copies NDJSON debug trace to clipboard for pasting into the agent chat. */
function DevDebugLogButton() {
  const [hint, setHint] = useState<string | null>(null);
  if (!import.meta.env.DEV) return null;
  return (
    <div
      style={{
        position: "fixed",
        bottom: 8,
        right: 8,
        zIndex: 9999,
        display: "flex",
        gap: 8,
        alignItems: "center",
      }}
    >
      {hint ? (
        <span
          style={{
            fontSize: 12,
            background: "#f3f4f6",
            color: "#1a1a2e",
            padding: "4px 8px",
            borderRadius: 6,
            maxWidth: 220,
          }}
        >
          {hint}
        </span>
      ) : null}
      <button
        type="button"
        style={{
          fontSize: 12,
          padding: "6px 10px",
          cursor: "pointer",
          borderRadius: 6,
        }}
        onClick={() => {
          void copyAgentDebugLogToClipboard().then((ok) => {
            setHint(ok ? "Copied — paste into chat" : "Copy failed — use console");
          });
        }}
      >
        Copy debug log
      </button>
    </div>
  );
}

export default function App() {
  const [devSkipAuth, setDevSkipAuth] = useState(false);

  if (import.meta.env.DEV && devSkipAuth) {
    return (
      <>
        <AuthSessionDebug />
        <DevDebugLogButton />
        <StudyApp />
      </>
    );
  }

  return (
    <>
      <AuthSessionDebug />
      <DevDebugLogButton />
      <AuthLoading>
        <main className="shell">
          <div className="card">
            <p className="muted">Loading session…</p>
          </div>
        </main>
      </AuthLoading>
      <Unauthenticated>
        <SignInPage onDevSkip={import.meta.env.DEV ? () => setDevSkipAuth(true) : undefined} />
      </Unauthenticated>
      <Authenticated>
        <StudyApp />
      </Authenticated>
    </>
  );
}

function StudyApp() {
  const [roomId, setRoomIdState] = useState<string | null>(getRoomIdFromSearch);
  const [sessionJoinName, setSessionJoinName] = useState<string | null>(() => {
    const id = getRoomIdFromSearch();
    return id ? readJoinedSession(id) : null;
  });
  const [displayName, setDisplayName] = useState(readStoredDisplayName);

  useEffect(() => {
    const onPop = () => setRoomIdState(getRoomIdFromSearch());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  useEffect(() => {
    if (!roomId) {
      setSessionJoinName(null);
      return;
    }
    setSessionJoinName(readJoinedSession(roomId));
  }, [roomId]);

  useEffect(() => {
    if (sessionJoinName) {
      setDisplayName(sessionJoinName);
      persistDisplayName(sessionJoinName);
    }
  }, [sessionJoinName]);

  const setRoomId = useCallback((id: string | null) => {
    setRoomIdState((prev) => {
      if (prev && !id) clearJoinedSession(prev);
      return id;
    });
    setRoomInUrl(id);
  }, []);

  const [roomName, setRoomName] = useState("");
  const [roomPassword, setRoomPassword] = useState("");
  const [invitePassword, setInvitePassword] = useState("");
  const [newTask, setNewTask] = useState("");
  const [chatDraft, setChatDraft] = useState("");
  const [chatImageFile, setChatImageFile] = useState<File | null>(null);
  const [chatImageUploading, setChatImageUploading] = useState(false);
  const [chatEditId, setChatEditId] = useState<Id<"messages"> | null>(null);
  const [chatEditDraft, setChatEditDraft] = useState("");
  const [chatMessageBusyId, setChatMessageBusyId] = useState<
    Id<"messages"> | null
  >(null);
  const [chatDeleteMenuForId, setChatDeleteMenuForId] = useState<
    Id<"messages"> | null
  >(null);
  const [chatPhotoModal, setChatPhotoModal] = useState<{
    url: string;
    fileName?: string;
  } | null>(null);
  const [joining, setJoining] = useState(false);
  const [joinMode, setJoinMode] = useState<"create" | "join" | null>(null);
  const [inviteJoining, setInviteJoining] = useState(false);
  const [adminDeleteName, setAdminDeleteName] = useState("");
  const [adminDeleting, setAdminDeleting] = useState(false);
  const [addMemberDraft, setAddMemberDraft] = useState("");
  const [moderationBusyKey, setModerationBusyKey] = useState<string | null>(
    null,
  );
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileNameDraft, setProfileNameDraft] = useState("");
  const [profileImageDraft, setProfileImageDraft] = useState("");
  const [profileSaving, setProfileSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [sendingChat, setSendingChat] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [studyingTaskId, setStudyingTaskId] = useState<Id<"tasks"> | null>(null);
  const [studyTick, setStudyTick] = useState(0);
  const pendingStudyRef = useRef(0);
  const chatEndRef = useRef<HTMLDivElement | null>(null);
  const profileSeededRef = useRef(false);

  const room = useQuery(
    api.rooms.getRoom,
    roomId ? { roomId: roomId as Id<"rooms"> } : "skip",
  );
  const tasks = useQuery(
    api.tasks.listTasksByRoom,
    roomId ? { roomId: roomId as Id<"rooms"> } : "skip",
  );
  const taskCompletions = useQuery(
    api.tasks.listTaskCompletionsByRoom,
    roomId ? { roomId: roomId as Id<"rooms"> } : "skip",
  );
  const taskMemberTimes = useQuery(
    api.tasks.listTaskMemberTimesByRoom,
    roomId ? { roomId: roomId as Id<"rooms"> } : "skip",
  );
  const memberStats = useQuery(
    api.members.listMemberStatsByRoom,
    roomId ? { roomId: roomId as Id<"rooms"> } : "skip",
  );
  const chatMessages = useQuery(
    api.chat.listMessagesByRoom,
    roomId ? { roomId: roomId as Id<"rooms"> } : "skip",
  );
  const roomMembers = useQuery(
    api.members.listRoomMembers,
    roomId ? { roomId: roomId as Id<"rooms"> } : "skip",
  );
  const myRoomMembership = useQuery(
    api.members.getMyRoomMembership,
    roomId ? { roomId: roomId as Id<"rooms"> } : "skip",
  );

  useEffect(() => {
    if (!roomId) return;
    if (sessionJoinName) return;
    if (!myRoomMembership) return;
    const canon = myRoomMembership.displayName;
    setSessionJoinName(canon);
    writeJoinedSession(roomId, canon);
  }, [roomId, myRoomMembership, sessionJoinName]);

  const roomPreview = useQuery(
    api.rooms.previewRoomByName,
    !roomId && roomName.trim()
      ? { name: roomName.trim() }
      : "skip",
  );

  const { signOut } = useAuthActions();
  const myProfile = useQuery(api.profile.getMyProfile);
  const savedRooms = useQuery(api.dashboard.listMySavedRooms);
  const isSiteOwner = useQuery(api.admin.isSiteOwner);
  const createOrJoinRoom = useMutation(api.rooms.createOrJoinRoom);
  const joinRoomById = useMutation(api.rooms.joinRoomById);
  const updateMyProfile = useMutation(api.profile.updateMyProfile);
  const generateAvatarUploadUrl = useMutation(
    api.profile.generateAvatarUploadUrl,
  );
  const saveAvatarUpload = useMutation(api.profile.saveAvatarUpload);
  const removeAvatarUpload = useMutation(api.profile.removeAvatarUpload);
  const deleteRoomByName = useMutation(api.admin.deleteRoomByName);
  const promoteToRoomAdmin = useMutation(api.roomModeration.promoteToRoomAdmin);
  const demoteRoomAdmin = useMutation(api.roomModeration.demoteRoomAdmin);
  const removeRoomMember = useMutation(api.roomModeration.removeRoomMember);
  const addMemberPlaceholder = useMutation(
    api.roomModeration.addMemberPlaceholder,
  );
  const createTask = useMutation(api.tasks.createTask);

  useEffect(() => {
    if (!myProfile || profileSeededRef.current) return;
    const n =
      myProfile.name?.trim() ||
      myProfile.email?.split("@")[0] ||
      "";
    if (n) {
      setDisplayName((d) => {
        const next = d.trim() ? d : n;
        persistDisplayName(next);
        return next;
      });
      profileSeededRef.current = true;
    }
  }, [myProfile]);

  useEffect(() => {
    // #region agent log
    agentLog("App.tsx:StudyApp", "convex shell snapshot", "H4", {
      hasRoomId: Boolean(roomId),
      myProfileUndefined: myProfile === undefined,
      hasProfileEmail: Boolean(myProfile?.email),
      savedRoomsUndefined: savedRooms === undefined,
      savedRoomsCount: Array.isArray(savedRooms) ? savedRooms.length : -1,
    });
    // #endregion
  }, [roomId, myProfile, savedRooms]);

  const setMyTaskCompletion = useMutation(api.tasks.setMyTaskCompletion);
  const addTaskTime = useMutation(api.tasks.addTaskTime);
  const sendMessage = useMutation(api.chat.sendMessage);
  const editChatMessage = useMutation(api.chat.editChatMessage);
  const deleteChatMessageForMe = useMutation(api.chat.deleteChatMessageForMe);
  const deleteChatMessageForAll = useMutation(api.chat.deleteChatMessageForAll);

  const isMembershipLoading =
    Boolean(roomId && !sessionJoinName && myRoomMembership === undefined);
  const needsNameGate = Boolean(
    roomId && !sessionJoinName && myRoomMembership === null,
  );
  const trimmedName = displayName.trim();

  const iAmRoomOwner = Boolean(
    room?.createdBy && namesMatch(room.createdBy, trimmedName),
  );
  const iAmRoomAdmin = Boolean(
    roomMembers?.some(
      (m) => namesMatch(m.displayName, trimmedName) && m.isAdmin,
    ),
  );
  const canModerateMembers = iAmRoomOwner || iAmRoomAdmin;

  const taskList = tasks ?? [];
  const completionRows = taskCompletions ?? [];
  const memberTimeRows = taskMemberTimes ?? [];

  const groupProgress = useMemo(() => {
    const total = taskList.length;
    const tasksWithDone = new Set<string>();
    for (const c of completionRows) {
      if (c.completed) tasksWithDone.add(c.taskId);
    }
    for (const t of taskList) {
      if (
        t.completed &&
        !completionRows.some((c) => c.taskId === t._id)
      ) {
        tasksWithDone.add(t._id);
      }
    }
    const completed = tasksWithDone.size;
    const pct = total === 0 ? 0 : Math.round((completed / total) * 100);
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    let completedLastHour = 0;
    for (const c of completionRows) {
      if (c.completed && c.updatedAt >= oneHourAgo) {
        completedLastHour += 1;
      }
    }
    for (const t of taskList) {
      if (
        t.completed &&
        t.completedAt != null &&
        t.completedAt >= oneHourAgo &&
        !completionRows.some((c) => c.taskId === t._id)
      ) {
        completedLastHour += 1;
      }
    }
    const totalStudySeconds = taskList.reduce(
      (acc, t) => acc + (t.timeSpentSeconds ?? 0),
      0,
    );
    return {
      total,
      completed,
      pct,
      completedLastHour,
      totalStudySeconds,
    };
  }, [taskList, completionRows]);

  const messagesList = chatMessages ?? [];

  const flushStudySeconds = useCallback(
    async (taskId: Id<"tasks">, seconds: number) => {
      if (!roomId || seconds <= 0 || !trimmedName) return;
      await addTaskTime({
        roomId: roomId as Id<"rooms">,
        taskId,
        secondsToAdd: seconds,
        contributorName: trimmedName,
      });
    },
    [roomId, trimmedName, addTaskTime],
  );

  useEffect(() => {
    if (!studyingTaskId || !roomId || !trimmedName) return;
    pendingStudyRef.current = 0;
    const id = window.setInterval(() => {
      pendingStudyRef.current += 1;
      setStudyTick((x) => x + 1);
    }, 1000);
    return () => {
      clearInterval(id);
    };
  }, [studyingTaskId, roomId, trimmedName]);

  useEffect(() => {
    if (!studyingTaskId || !roomId || !trimmedName) return;
    const flushId = window.setInterval(() => {
      const n = pendingStudyRef.current;
      if (n <= 0) return;
      pendingStudyRef.current = 0;
      void flushStudySeconds(studyingTaskId, n).catch(() => {
        pendingStudyRef.current += n;
      });
    }, 15000);
    return () => clearInterval(flushId);
  }, [studyingTaskId, roomId, trimmedName, flushStudySeconds]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== "hidden" || !studyingTaskId || !roomId) {
        return;
      }
      const n = pendingStudyRef.current;
      if (n <= 0) return;
      pendingStudyRef.current = 0;
      void flushStudySeconds(studyingTaskId, n).catch(() => {
        pendingStudyRef.current += n;
      });
    };
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [studyingTaskId, roomId, flushStudySeconds]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messagesList.length]);

  const attemptCreateOrJoin = async (mode: "create" | "join") => {
    if (joining) return;
    const name = displayName.trim();
    const roomN = roomName.trim();
    const pw = roomPassword;
    if (!name || !roomN) return;

    if (roomN && roomPreview === undefined) {
      setNotice("Wait for the room check to finish, then try again.");
      return;
    }

    if (mode === "create") {
      if (roomPreview?.exists === true) {
        setNotice(
          'A room with this name already exists. Use "Join room" instead.',
        );
        return;
      }
      if (roomPreview?.exists !== false) {
        setNotice("Enter a new room name that is not already taken.");
        return;
      }
      if (pw.trim().length < 4) {
        setNotice("Choose a room password of at least 4 characters.");
        return;
      }
    } else {
      if (roomPreview?.exists !== true) {
        setNotice("Room not found.");
        return;
      }
      if (roomPreview.hasPassword && !pw.trim()) {
        setNotice(
          "Enter the room password (ask the person who created the room).",
        );
        return;
      }
    }

    setNotice(null);
    setJoining(true);
    setJoinMode(mode);
    try {
      const { roomId: id, displayName: canon } = await createOrJoinRoom({
        name: roomN,
        displayName: name,
        password: pw,
      });
      setDisplayName(canon);
      persistDisplayName(canon);
      writeJoinedSession(id, canon);
      setSessionJoinName(canon);
      setRoomId(id);
      setRoomName("");
      setRoomPassword("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not join room";
      setNotice(msg);
    } finally {
      setJoining(false);
      setJoinMode(null);
    }
  };

  const onInviteGateSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (inviteJoining || !roomId) return;
    const n = displayName.trim();
    if (!n) {
      setNotice("Set your profile display name first (from Dashboard > Profile).");
      return;
    }
    const roomPw = invitePassword;
    if (room?.hasPassword && !roomPw.trim()) {
      setNotice("Enter the room password.");
      return;
    }
    setNotice(null);
    setInviteJoining(true);
    try {
      const { displayName: canon } = await joinRoomById({
        roomId: roomId as Id<"rooms">,
        displayName: n,
        password: roomPw,
      });
      setDisplayName(canon);
      persistDisplayName(canon);
      writeJoinedSession(roomId, canon);
      setSessionJoinName(canon);
      setInvitePassword("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not join room";
      setNotice(msg);
    } finally {
      setInviteJoining(false);
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

  const flushPendingForTask = async (taskId: Id<"tasks">) => {
    const n = pendingStudyRef.current;
    if (n <= 0) return;
    pendingStudyRef.current = 0;
    try {
      await flushStudySeconds(taskId, n);
    } catch {
      pendingStudyRef.current += n;
    }
  };

  const toggleStudying = async (taskId: Id<"tasks">) => {
    if (!roomId || !trimmedName) return;
    if (studyingTaskId === taskId) {
      await flushPendingForTask(taskId);
      setStudyingTaskId(null);
      return;
    }
    if (studyingTaskId) {
      await flushPendingForTask(studyingTaskId);
    }
    pendingStudyRef.current = 0;
    setStudyingTaskId(taskId);
  };

  const onMyCompletionChange = async (task: Doc<"tasks">, completed: boolean) => {
    if (togglingId || !roomId || !trimmedName) return;
    setNotice(null);
    setTogglingId(task._id);
    try {
      await setMyTaskCompletion({
        roomId: roomId as Id<"rooms">,
        taskId: task._id,
        completed,
        contributorName: trimmedName,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Update failed";
      setNotice(msg);
    } finally {
      setTogglingId(null);
    }
  };

  const onSendChat = async (e: FormEvent) => {
    e.preventDefault();
    if (!roomId || sendingChat || !trimmedName) return;
    const body = chatDraft.trim();
    const hasImage = Boolean(chatImageFile);
    if (!body && !hasImage) return;
    setNotice(null);
    setSendingChat(true);
    setChatImageUploading(hasImage);
    try {
      let imageStorageId: Id<"_storage"> | undefined;
      let imageFileName: string | undefined;

      if (chatImageFile) {
        const uploadUrl = await generateAvatarUploadUrl();
        const res = await fetch(uploadUrl, {
          method: "POST",
          headers: {
            "Content-Type":
              chatImageFile.type || "application/octet-stream",
          },
          body: chatImageFile,
        });
        if (!res.ok) throw new Error("Upload failed");
        const json = (await res.json()) as { storageId: string };
        imageStorageId = json.storageId as Id<"_storage">;
        imageFileName = chatImageFile.name;
      }

      await sendMessage({
        roomId: roomId as Id<"rooms">,
        authorName: trimmedName,
        body,
        imageStorageId,
        imageFileName,
      });
      setChatDraft("");
      if (chatImageFile) setChatImageFile(null);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Could not send";
      setNotice(msg);
    } finally {
      setSendingChat(false);
      setChatImageUploading(false);
    }
  };

  const onAvatarFileSelected = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setNotice("Please choose an image file.");
      return;
    }
    const maxBytes = 4 * 1024 * 1024;
    if (file.size > maxBytes) {
      setNotice("Image must be 4 MB or smaller.");
      return;
    }
    setAvatarUploading(true);
    setNotice(null);
    try {
      const uploadUrl = await generateAvatarUploadUrl();
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type },
        body: file,
      });
      if (!res.ok) throw new Error("Upload failed");
      const json = (await res.json()) as { storageId: string };
      await saveAvatarUpload({ storageId: json.storageId as Id<"_storage"> });
    } catch (e) {
      setNotice(
        e instanceof Error ? e.message : "Could not upload photo",
      );
    } finally {
      setAvatarUploading(false);
    }
  };

  if (!roomId) {
    return (
      <div className="dash">
        {/* ── Top bar ── */}
        <header className="dash-topbar">
          <div className="dash-topbar-inner">
            <span className="dash-topbar-brand">{APP_NAME}</span>
            <div className="dash-topbar-right">
              <div className="dash-topbar-user">
                {myProfile?.avatarUrl ? (
                  <img
                    src={myProfile.avatarUrl}
                    alt=""
                    className="avatar-img dash-topbar-avatar"
                    width={32}
                    height={32}
                  />
                ) : (
                  <div className="avatar-fallback dash-topbar-avatar" style={{ width: 32, height: 32 }} aria-hidden />
                )}
                <span className="dash-topbar-name">
                  {myProfile?.name || myProfile?.email?.split("@")[0] || "…"}
                </span>
              </div>
              <button
                type="button"
                className="btn ghost dash-topbar-btn"
                onClick={() => {
                  setProfileNameDraft(myProfile?.name ?? "");
                  setProfileImageDraft(myProfile?.image ?? "");
                  setProfileOpen(true);
                }}
              >
                Profile
              </button>
              <button
                type="button"
                className="btn ghost dash-topbar-btn"
                onClick={() => void signOut()}
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        <main className="dash-body">
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

          <div className="dash-grid">
            {/* ── Left column: rooms + create/join ── */}
            <aside className="dash-sidebar">
              {/* Quick actions */}
              <section className="card dash-card">
                <h2 className="dash-card-title">Create or join a room</h2>
                <p className="muted small dash-card-desc">
                  Rooms are password-protected. Create one or join with the
                  room name and password from the owner.
                </p>
                <form
                  onSubmit={(e) => { e.preventDefault(); }}
                  className="dash-form-stack"
                >
                  <label className="label">
                    Room name
                    <input
                      className="input"
                      value={roomName}
                      onChange={(e) => setRoomName(e.target.value)}
                      placeholder="e.g. CS101 finals"
                      autoComplete="off"
                    />
                  </label>
                  <label className="label">
                    Room password
                    <input
                      className="input"
                      type="password"
                      value={roomPassword}
                      onChange={(e) => setRoomPassword(e.target.value)}
                      placeholder={
                        roomPreview?.exists === false
                          ? "Min 4 chars — you choose"
                          : roomPreview?.exists === true && roomPreview.hasPassword
                            ? "From the room owner"
                            : "Leave blank for older rooms"
                      }
                      autoComplete="new-password"
                    />
                  </label>
                  {roomName.trim() && roomPreview === undefined ? (
                    <p className="muted small">Checking room…</p>
                  ) : roomPreview?.exists === false ? (
                    <p className="muted small">
                      New room — set a password (min 4 chars).
                    </p>
                  ) : roomPreview?.exists === true && roomPreview.hasPassword ? (
                    <p className="muted small">
                      Password-protected. Enter the owner's password.
                    </p>
                  ) : null}
                  <div className="dash-form-actions">
                    <button
                      type="button"
                      className="btn primary"
                      disabled={
                        joining ||
                        !displayName.trim() ||
                        !roomName.trim() ||
                        (Boolean(roomName.trim()) && roomPreview === undefined) ||
                        roomPreview?.exists === true
                      }
                      onClick={() => void attemptCreateOrJoin("create")}
                    >
                      {joining && joinMode === "create" ? "Creating…" : "Create"}
                    </button>
                    <button
                      type="button"
                      className="btn dash-join-btn"
                      disabled={
                        joining ||
                        !displayName.trim() ||
                        !roomName.trim() ||
                        (Boolean(roomName.trim()) && roomPreview === undefined) ||
                        roomPreview?.exists === false
                      }
                      onClick={() => void attemptCreateOrJoin("join")}
                    >
                      {joining && joinMode === "join" ? "Joining…" : "Join"}
                    </button>
                  </div>
                </form>
              </section>

              {/* Saved rooms */}
              <section className="card dash-card">
                <h2 className="dash-card-title">Your rooms</h2>
                {savedRooms && savedRooms.length > 0 ? (
                  <ul className="dash-room-list">
                    {savedRooms.map((r) => (
                      <li key={r._id}>
                        <button
                          type="button"
                          className="dash-room-item"
                          onClick={() => setRoomId(r.roomId)}
                        >
                          <span className="dash-room-icon" aria-hidden>⬡</span>
                          <span className="dash-room-name">{r.roomName}</span>
                          <span className="dash-room-arrow" aria-hidden>→</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="muted small">No rooms yet. Create or join one above.</p>
                )}
              </section>

              {/* Site admin */}
              {isSiteOwner ? (
                <section className="card dash-card admin-card">
                  <h2 className="dash-card-title">Site admin</h2>
                  <p className="muted small dash-card-desc">
                    Delete any room by exact name.
                  </p>
                  <div className="dash-form-row">
                    <input
                      className="input grow"
                      value={adminDeleteName}
                      onChange={(e) => setAdminDeleteName(e.target.value)}
                      placeholder="Room name"
                      autoComplete="off"
                    />
                    <button
                      type="button"
                      className="btn danger-outline"
                      disabled={adminDeleting || !adminDeleteName.trim()}
                      onClick={() => {
                        void (async () => {
                          setAdminDeleting(true);
                          setNotice(null);
                          try {
                            await deleteRoomByName({ name: adminDeleteName.trim() });
                            setAdminDeleteName("");
                            setNotice("Room deleted.");
                          } catch (e) {
                            setNotice(e instanceof Error ? e.message : "Could not delete");
                          } finally {
                            setAdminDeleting(false);
                          }
                        })();
                      }}
                    >
                      {adminDeleting ? "…" : "Delete"}
                    </button>
                  </div>
                </section>
              ) : null}
            </aside>

            {/* ── Right column: quizzes + profile ── */}
            <div className="dash-main">
              {profileOpen ? (
                <section className="card dash-card profile-editor">
                  <h2 className="dash-card-title">Your profile</h2>
                  <p className="muted small dash-card-desc">
                    Display name is your label in rooms. Upload a photo or paste
                    an image URL.
                  </p>
                  <div className="profile-avatar-row">
                    {myProfile?.avatarUrl ? (
                      <img
                        src={myProfile.avatarUrl}
                        alt=""
                        className="avatar-img profile-avatar-preview"
                        width={72}
                        height={72}
                      />
                    ) : (
                      <div
                        className="avatar-fallback profile-avatar-preview"
                        aria-hidden
                      />
                    )}
                    <div className="profile-avatar-actions">
                      <label className="btn ghost profile-upload-label">
                        {avatarUploading ? "Uploading…" : "Upload photo"}
                        <input
                          type="file"
                          accept="image/*"
                          className="visually-hidden"
                          disabled={avatarUploading}
                          onChange={(e) => {
                            const f = e.target.files?.[0] ?? null;
                            e.target.value = "";
                            void onAvatarFileSelected(f);
                          }}
                        />
                      </label>
                      {myProfile?.imageStorageId ? (
                        <button
                          type="button"
                          className="btn ghost small"
                          disabled={avatarUploading}
                          onClick={() => {
                            void (async () => {
                              setNotice(null);
                              try {
                                await removeAvatarUpload();
                              } catch (err) {
                                setNotice(
                                  err instanceof Error
                                    ? err.message
                                    : "Could not remove photo",
                                );
                              }
                            })();
                          }}
                        >
                          Remove upload
                        </button>
                      ) : null}
                    </div>
                  </div>
                  <label className="label">
                    Display name
                    <input
                      className="input"
                      value={profileNameDraft}
                      onChange={(e) => setProfileNameDraft(e.target.value)}
                      autoComplete="name"
                    />
                  </label>
                  <label className="label">
                    Profile picture URL (optional)
                    <input
                      className="input"
                      value={profileImageDraft}
                      onChange={(e) => setProfileImageDraft(e.target.value)}
                      placeholder="https://…"
                      autoComplete="off"
                    />
                  </label>
                  <div className="dash-form-actions">
                    <button
                      type="button"
                      className="btn primary"
                      disabled={profileSaving}
                      onClick={() => {
                        void (async () => {
                          setProfileSaving(true);
                          setNotice(null);
                          try {
                            await updateMyProfile({
                              name: profileNameDraft,
                              image: profileImageDraft,
                            });
                            setProfileOpen(false);
                            setDisplayName(profileNameDraft.trim());
                            persistDisplayName(profileNameDraft.trim());
                            if (roomId) {
                              writeJoinedSession(roomId, profileNameDraft.trim());
                              setSessionJoinName(profileNameDraft.trim());
                            }
                          } catch (e) {
                            setNotice(
                              e instanceof Error ? e.message : "Could not save",
                            );
                          } finally {
                            setProfileSaving(false);
                          }
                        })();
                      }}
                    >
                      {profileSaving ? "Saving…" : "Save profile"}
                    </button>
                    <button
                      type="button"
                      className="btn ghost"
                      onClick={() => setProfileOpen(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </section>
              ) : null}

              <DashboardQuizzes
                myProfile={myProfile ?? undefined}
                onSaveLearningProfile={async (args) => {
                  await updateMyProfile(args);
                }}
                setNotice={setNotice}
              />
            </div>
          </div>
        </main>
      </div>
    );
  }

  if (needsNameGate) {
    if (room === undefined) {
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
      <main className="shell landing-shell">
        <div className="card landing-card">
          <div className="landing-card-clock-row">
            <p className="brand-mark">{APP_NAME}</p>
            <RoomWallClock compact />
          </div>
          <h1 className="brand-title">Join this room</h1>
          <p className="muted landing-lead">
            Enter the room password from the owner.
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
          <form onSubmit={(e) => void onInviteGateSubmit(e)} className="stack">
            <label className="label">
              Room password
              <input
                className="input"
                type="password"
                value={invitePassword}
                onChange={(e) => setInvitePassword(e.target.value)}
                placeholder={
                  room.hasPassword
                    ? "Password from the room owner"
                    : "Leave empty (older rooms may have no password)"
                }
                autoComplete="new-password"
              />
            </label>
            <button
              type="submit"
              className="btn primary"
              disabled={
                inviteJoining ||
                !displayName.trim() ||
                (room.hasPassword && !invitePassword.trim())
              }
            >
              {inviteJoining ? "Joining…" : "Join room"}
            </button>
            <button
              type="button"
              className="btn ghost"
              onClick={() => setRoomId(null)}
            >
              Back to home
            </button>
          </form>
        </div>
      </main>
    );
  }

  if (isMembershipLoading) {
    return (
      <main className="shell">
        <div className="card">
          <p className="muted">Loading room…</p>
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

  const statsRows = memberStats ?? [];

  return (
    <main className="shell room-shell">
      <header className="header">
        <div>
          <p className="room-brand">{APP_NAME}</p>
          <h1 className="title">{room.name}</h1>
          <p className="muted small">
            Signed in as <strong className="you-name">{trimmedName}</strong>
            {room.createdBy ? (
              <>
                {" "}
                · Owner: <strong>{room.createdBy}</strong>
              </>
            ) : null}{" "}
            · share this URL to study together
          </p>
        </div>
        <div className="header-actions">
          <RoomWallClock />
          <button
            type="button"
            className="btn ghost"
            onClick={() => {
              void (async () => {
                if (studyingTaskId) await flushPendingForTask(studyingTaskId);
                setStudyingTaskId(null);
                setRoomId(null);
              })();
            }}
          >
            Leave room
          </button>
        </div>
      </header>

      <div className="room-grid">
        <div className="room-main">
          <div className="room-media-section">
            <h2 className="room-media-title">Study media</h2>
            <div className="room-media-stack">
              <StudyMusicPlayer />
              <RoomMusicStream
                roomId={roomId as Id<"rooms">}
                myUserId={myProfile?._id}
              />
            </div>
          </div>
          <section
            className="card progress-card"
            aria-label="Group study progress"
          >
            <h2 className="progress-heading">Group progress</h2>
            {groupProgress.total === 0 ? (
              <>
                <p className="muted small progress-empty">
                  No tasks yet. Add topics below to track how much the group has
                  finished.
                </p>
                <p className="progress-group-time">
                  Group study time logged:{" "}
                  <strong>
                    {formatDurationHMS(groupProgress.totalStudySeconds)}
                  </strong>{" "}
                  (everyone sees this)
                </p>
              </>
            ) : (
              <>
                <div
                  className="progress-track"
                  role="progressbar"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={groupProgress.pct}
                  aria-label={`${groupProgress.pct} percent of topics with someone finished`}
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
                  topics with at least one person finished
                  <span className="progress-pct"> ({groupProgress.pct}%)</span>
                </p>
                <p className="muted small progress-sub">
                  {groupProgress.completedLastHour} personal completions in the
                  last hour · each checkbox is only yours; everyone sees who is
                  done
                </p>
                <p className="progress-group-time">
                  Group study time logged:{" "}
                  <strong>
                    {formatDurationHMS(groupProgress.totalStudySeconds)}
                  </strong>{" "}
                  (everyone sees this)
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
                <li className="muted list-placeholder">
                  No tasks yet. Add one above.
                </li>
              ) : (
                taskList.map((t) => {
                  const myDone =
                    completionRows.find(
                      (c) =>
                        c.taskId === t._id &&
                        namesMatch(c.displayName, trimmedName),
                    )?.completed ?? false;
                  const doneNames = doneNamesForTask(t._id, t, completionRows);
                  const myRowSec =
                    memberTimeRows.find(
                      (r) =>
                        r.taskId === t._id &&
                        namesMatch(r.displayName, trimmedName),
                    )?.seconds ?? 0;
                  const pendingLocal =
                    studyingTaskId === t._id ? pendingStudyRef.current : 0;
                  void studyTick;
                  return (
                    <li key={t._id} className="task-item">
                      <label className="task-label">
                        <input
                          type="checkbox"
                          checked={myDone}
                          disabled={togglingId === t._id}
                          onChange={(e) =>
                            void onMyCompletionChange(t, e.target.checked)
                          }
                        />
                        <span className={myDone ? "done" : undefined}>
                          {t.title}
                        </span>
                      </label>
                      {doneNames.length > 0 ? (
                        <p className="task-done-by muted small">
                          Done by: {doneNames.join(", ")}
                        </p>
                      ) : null}
                      <div className="task-study-row">
                        <div className="task-study-meta">
                          <span className="task-study-total">
                            You:{" "}
                            {formatDurationHMS(myRowSec + pendingLocal)} · Group:{" "}
                            {formatDurationHMS(t.timeSpentSeconds ?? 0)}
                          </span>
                          {studyingTaskId === t._id ? (
                            <span className="task-session-live">
                              Session{" "}
                              {formatSessionClock(pendingLocal)}
                            </span>
                          ) : null}
                        </div>
                        <button
                          type="button"
                          className={
                            studyingTaskId === t._id
                              ? "btn btn-study btn-study-on"
                              : "btn btn-study"
                          }
                          onClick={() => void toggleStudying(t._id)}
                        >
                          {studyingTaskId === t._id
                            ? "Stop timer"
                            : "Study (timer)"}
                        </button>
                      </div>
                    </li>
                  );
                })
              )}
            </ul>
          </section>
        </div>

        <aside className="room-sidebar" aria-label="People and chat">
          <section className="card sidebar-card">
            <h2 className="sidebar-heading">Members</h2>
            <p className="muted small sidebar-lead">
              Names are unique per room. The owner can promote admins. Admins can
              remove members or add a reserved name for someone who will join
              with the room password.
            </p>
            {canModerateMembers && roomId ? (
              <div className="member-add-row">
                <input
                  className="input grow"
                  value={addMemberDraft}
                  onChange={(e) => setAddMemberDraft(e.target.value)}
                  placeholder="Reserve a name for a new member…"
                  autoComplete="off"
                  maxLength={80}
                />
                <button
                  type="button"
                  className="btn secondary compact"
                  disabled={
                    !addMemberDraft.trim() ||
                    moderationBusyKey === "add" ||
                    !roomId
                  }
                  onClick={() => {
                    void (async () => {
                      setModerationBusyKey("add");
                      setNotice(null);
                      try {
                        await addMemberPlaceholder({
                          roomId: roomId as Id<"rooms">,
                          displayName: addMemberDraft.trim(),
                          actorDisplayName: trimmedName,
                        });
                        setAddMemberDraft("");
                        setNotice("Name reserved — they can join with that name and the room password.");
                      } catch (e) {
                        setNotice(
                          e instanceof Error ? e.message : "Could not add",
                        );
                      } finally {
                        setModerationBusyKey(null);
                      }
                    })();
                  }}
                >
                  {moderationBusyKey === "add" ? "…" : "Add"}
                </button>
              </div>
            ) : null}
            {roomMembers === undefined ? (
              <p className="muted small">Loading…</p>
            ) : roomMembers === null || roomMembers.length === 0 ? (
              <p className="muted small">No members yet.</p>
            ) : (
              <ul className="member-roster-list">
                {roomMembers.map((m) => {
                  const isYou = namesMatch(m.displayName, trimmedName);
                  const busyKey = `${m._id}`;
                  const canRemoveThis =
                    canModerateMembers &&
                    room &&
                    !m.isOwner &&
                    (iAmRoomOwner || !m.isAdmin);
                  const showPromote =
                    iAmRoomOwner && room && !m.isOwner && !m.isAdmin;
                  const showDemote = iAmRoomOwner && m.isAdmin && !m.isOwner;
                  return (
                    <li key={m._id} className="member-roster-row">
                      <div className="member-roster-main">
                        <span
                          className={
                            isYou ? "member-name you" : "member-name"
                          }
                        >
                          {m.displayName}
                          {m.isOwner ? (
                            <span className="owner-badge"> Owner</span>
                          ) : null}
                          {m.isAdmin ? (
                            <span className="admin-badge"> Admin</span>
                          ) : null}
                          {m.pendingJoin ? (
                            <span className="pending-badge"> Pending</span>
                          ) : null}
                          {isYou ? " (you)" : ""}
                        </span>
                        {(showPromote || showDemote || canRemoveThis) &&
                        roomId ? (
                          <div className="member-roster-actions">
                            {showPromote ? (
                              <button
                                type="button"
                                className="btn ghost compact"
                                disabled={moderationBusyKey === busyKey}
                                onClick={() => {
                                  void (async () => {
                                    setModerationBusyKey(busyKey);
                                    setNotice(null);
                                    try {
                                      await promoteToRoomAdmin({
                                        roomId: roomId as Id<"rooms">,
                                        targetDisplayName: m.displayName,
                                        actorDisplayName: trimmedName,
                                      });
                                    } catch (e) {
                                      setNotice(
                                        e instanceof Error
                                          ? e.message
                                          : "Could not promote",
                                      );
                                    } finally {
                                      setModerationBusyKey(null);
                                    }
                                  })();
                                }}
                              >
                                Make admin
                              </button>
                            ) : null}
                            {showDemote ? (
                              <button
                                type="button"
                                className="btn ghost compact"
                                disabled={moderationBusyKey === busyKey}
                                onClick={() => {
                                  void (async () => {
                                    setModerationBusyKey(busyKey);
                                    setNotice(null);
                                    try {
                                      await demoteRoomAdmin({
                                        roomId: roomId as Id<"rooms">,
                                        targetDisplayName: m.displayName,
                                        actorDisplayName: trimmedName,
                                      });
                                    } catch (e) {
                                      setNotice(
                                        e instanceof Error
                                          ? e.message
                                          : "Could not demote",
                                      );
                                    } finally {
                                      setModerationBusyKey(null);
                                    }
                                  })();
                                }}
                              >
                                Demote
                              </button>
                            ) : null}
                            {canRemoveThis ? (
                              <button
                                type="button"
                                className="btn ghost compact danger-text"
                                disabled={moderationBusyKey === busyKey}
                                onClick={() => {
                                  void (async () => {
                                    if (
                                      !window.confirm(
                                        `Remove ${m.displayName} from this room? Their study stats for this room will be deleted.`,
                                      )
                                    ) {
                                      return;
                                    }
                                    setModerationBusyKey(busyKey);
                                    setNotice(null);
                                    try {
                                      await removeRoomMember({
                                        roomId: roomId as Id<"rooms">,
                                        targetDisplayName: m.displayName,
                                        actorDisplayName: trimmedName,
                                      });
                                      if (isYou) {
                                        setRoomId(null);
                                      }
                                    } catch (e) {
                                      setNotice(
                                        e instanceof Error
                                          ? e.message
                                          : "Could not remove",
                                      );
                                    } finally {
                                      setModerationBusyKey(null);
                                    }
                                  })();
                                }}
                              >
                                Remove
                              </button>
                            ) : null}
                          </div>
                        ) : null}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          <section className="card sidebar-card">
            <h2 className="sidebar-heading">Everyone&apos;s study time</h2>
            <p className="muted small sidebar-lead">
              Time from the Study (timer) on each task is tracked automatically
              and shown here for the whole room.
            </p>
            {statsRows.length === 0 ? (
              <p className="muted small">No one has logged time yet.</p>
            ) : (
              <ul className="member-stats-list">
                {statsRows.map((row) => (
                  <li key={row._id} className="member-stat-row">
                    <span
                      className={
                        namesMatch(row.displayName, trimmedName)
                          ? "member-name you"
                          : "member-name"
                      }
                    >
                      {row.displayName}
                      {namesMatch(row.displayName, trimmedName)
                        ? " (you)"
                        : ""}
                    </span>
                    <span className="member-time">
                      {formatDurationHMS(row.totalStudySeconds)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="card sidebar-card chat-card">
            <h2 className="sidebar-heading">Room chat</h2>
            <div
              className="chat-log"
              role="log"
              aria-live="polite"
              aria-relevant="additions"
            >
              {chatMessages === undefined ? (
                <p className="muted small">Loading messages…</p>
              ) : messagesList.length === 0 ? (
                <p className="muted small chat-empty">
                  No messages yet. Say hi below.
                </p>
              ) : (
                messagesList.map((m) => {
                  const myUserId = myProfile?._id;
                  const isMine =
                    Boolean(myUserId && m.authorUserId) &&
                    m.authorUserId === myUserId;
                  const isOwnerOrAdmin = iAmRoomOwner || iAmRoomAdmin;

                  const canEdit = isMine;
                  const canDeleteForAll = isMine || isOwnerOrAdmin;
                  const canDeleteForMe = true;

                  const isEditing = chatEditId === m._id;
                  return (
                    <div key={m._id} className="chat-msg">
                      <div className="chat-msg-meta">
                        <span className="chat-author">{m.authorName}</span>
                        <span className="chat-time">
                          {formatChatTime(m.createdAt)}
                        </span>
                      </div>

                      {m.imageUrl ? (
                        <img
                          src={m.imageUrl}
                          alt={m.imageFileName ?? "Attachment"}
                          className="chat-image"
                          onClick={() =>
                            setChatPhotoModal({
                              url: m.imageUrl,
                              fileName: m.imageFileName ?? undefined,
                            })
                          }
                          role="button"
                          tabIndex={0}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              setChatPhotoModal({
                                url: m.imageUrl,
                                fileName: m.imageFileName ?? undefined,
                              });
                            }
                          }}
                        />
                      ) : null}

                      {isEditing ? (
                        <div className="chat-edit-row">
                          <textarea
                            className="chat-edit-input"
                            value={chatEditDraft}
                            onChange={(e) => setChatEditDraft(e.target.value)}
                            maxLength={2000}
                          />
                          <div className="chat-edit-actions">
                            <button
                              type="button"
                              className="btn ghost compact"
                              disabled={chatMessageBusyId === m._id}
                              onClick={() => setChatEditId(null)}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              className="btn primary compact"
                              disabled={
                                chatMessageBusyId === m._id ||
                                !chatEditDraft.trim()
                              }
                              onClick={() =>
                                void (async () => {
                                  setChatMessageBusyId(m._id);
                                  setNotice(null);
                                  try {
                                    await editChatMessage({
                                      roomId: roomId as Id<"rooms">,
                                      messageId: m._id,
                                      body: chatEditDraft,
                                    });
                                    setChatEditId(null);
                                  } catch (e) {
                                    setNotice(
                                      e instanceof Error
                                        ? e.message
                                        : "Edit failed",
                                    );
                                  } finally {
                                    setChatMessageBusyId(null);
                                  }
                                })()
                              }
                            >
                              Save
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="chat-body">{m.body}</p>
                      )}

                      {!isEditing ? (
                        <div className="chat-msg-actions">
                          {canEdit ? (
                            <button
                              type="button"
                              className="btn ghost compact"
                              disabled={chatMessageBusyId === m._id}
                              onClick={() => {
                                setChatEditId(m._id);
                                setChatEditDraft(m.body);
                              }}
                            >
                              Edit
                            </button>
                          ) : null}

                          {(canDeleteForMe || canDeleteForAll) ? (
                            <div className="chat-delete-wrap">
                              <button
                                type="button"
                                className="btn ghost compact danger-text"
                                disabled={chatMessageBusyId === m._id}
                                onClick={() =>
                                  setChatDeleteMenuForId((cur) =>
                                    cur === m._id ? null : m._id,
                                  )
                                }
                              >
                                Delete
                              </button>
                              {chatDeleteMenuForId === m._id ? (
                                <div className="chat-delete-options">
                                  <button
                                    type="button"
                                    className="btn ghost compact danger-text"
                                    disabled={chatMessageBusyId === m._id}
                                    onClick={() =>
                                      void (async () => {
                                        setChatDeleteMenuForId(null);
                                        setChatMessageBusyId(m._id);
                                        setNotice(null);
                                        try {
                                          await deleteChatMessageForMe({
                                            roomId:
                                              roomId as Id<"rooms">,
                                            messageId: m._id,
                                          });
                                        } catch (e) {
                                          setNotice(
                                            e instanceof Error
                                              ? e.message
                                              : "Delete failed",
                                          );
                                        } finally {
                                          setChatMessageBusyId(null);
                                        }
                                      })()
                                    }
                                  >
                                    Delete for me
                                  </button>
                                  {canDeleteForAll ? (
                                    <button
                                      type="button"
                                      className="btn ghost compact danger-text"
                                      disabled={chatMessageBusyId === m._id}
                                      onClick={() =>
                                        void (async () => {
                                          if (
                                            !window.confirm(
                                              "Delete this message for everyone in the room?",
                                            )
                                          ) {
                                            return;
                                          }
                                          setChatDeleteMenuForId(null);
                                          setChatMessageBusyId(m._id);
                                          setNotice(null);
                                          try {
                                            await deleteChatMessageForAll({
                                              roomId: roomId as Id<"rooms">,
                                              messageId: m._id,
                                            });
                                          } catch (e) {
                                            setNotice(
                                              e instanceof Error
                                                ? e.message
                                                : "Delete failed",
                                            );
                                          } finally {
                                            setChatMessageBusyId(null);
                                          }
                                        })()
                                      }
                                    >
                                      Delete for everyone
                                    </button>
                                  ) : null}
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                        </div>
                      ) : null}
                    </div>
                  );
                })
              )}
              <div ref={chatEndRef} />
            </div>
            <form onSubmit={onSendChat} className="chat-form">
              <input
                className="input chat-input"
                value={chatDraft}
                onChange={(e) => setChatDraft(e.target.value)}
                placeholder="Message the room…"
                autoComplete="off"
                maxLength={2000}
              />
              <label className="btn ghost chat-attach-btn">
                {chatImageFile ? "Replace photo" : "Attach photo"}
                <input
                  type="file"
                  accept="image/*"
                  className="visually-hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0] ?? null;
                    e.target.value = "";
                    setChatImageFile(f);
                  }}
                  disabled={sendingChat || chatImageUploading}
                />
              </label>
              <button
                type="submit"
                className="btn primary chat-send"
                disabled={
                  sendingChat ||
                  chatImageUploading ||
                  (!chatDraft.trim() && !chatImageFile)
                }
              >
                {sendingChat ? "…" : "Send"}
              </button>
            </form>
          </section>
        </aside>
        {chatPhotoModal ? (
          <div
            className="chat-photo-modal-overlay"
            role="dialog"
            aria-modal="true"
            onClick={() => setChatPhotoModal(null)}
          >
            <div
              className="chat-photo-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="chat-photo-modal-top">
                <h3 className="chat-photo-modal-title">
                  Photo
                </h3>
                <button
                  type="button"
                  className="btn ghost compact"
                  onClick={() => setChatPhotoModal(null)}
                >
                  Close
                </button>
              </div>
              <img
                src={chatPhotoModal.url}
                alt={chatPhotoModal.fileName ?? "Photo"}
                className="chat-photo-modal-img"
              />
              <div className="chat-photo-modal-actions">
                <a
                  className="btn primary compact"
                  href={chatPhotoModal.url}
                  download={chatPhotoModal.fileName ?? "photo"}
                  target="_blank"
                  rel="noreferrer"
                >
                  Save to device
                </a>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </main>
  );
}

import { useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { useMutation, useQuery } from "convex/react";
import type { Id } from "../convex/_generated/dataModel";
import { api } from "../convex/_generated/api";

type Props = {
  roomId: Id<"rooms">;
  myUserId: Id<"users"> | undefined | null;
};

function formatStreamTime(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
  if (m > 0) return `${m}m ${sec}s`;
  return `${sec}s`;
}

export function RoomMusicStream({ roomId, myUserId }: Props) {
  const stream = useQuery(api.roomMusic.getRoomMusicStream, { roomId });

  const [fileName, setFileName] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [joining, setJoining] = useState(false);

  const [following, setFollowing] = useState(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pendingSeekRef = useRef<{ seconds: number; shouldPlay: boolean } | null>(null);

  const generateUploadUrl = useMutation(
    api.roomMusic.generateRoomMusicUploadUrl,
  );
  const startStream = useMutation(api.roomMusic.startRoomMusicStream);
  const pauseStream = useMutation(api.roomMusic.pauseRoomMusicStream);
  const resumeStream = useMutation(api.roomMusic.resumeRoomMusicStream);
  const stopStream = useMutation(api.roomMusic.stopRoomMusicStream);

  const isHost = useMemo(() => {
    if (!stream || !myUserId) return false;
    return stream.hostUserId === myUserId;
  }, [stream, myUserId]);

  // Host should listen to the stream immediately.
  useEffect(() => {
    if (!stream) return;
    if (isHost) setFollowing(true);
  }, [stream?._id, isHost]);

  // Load metadata then seek if needed.
  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    const onLoaded = () => {
      const pending = pendingSeekRef.current;
      if (!pending) return;
      pendingSeekRef.current = null;
      el.currentTime = pending.seconds;
      if (pending.shouldPlay) {
        void el.play().catch(() => {});
      } else {
        el.pause();
      }
    };
    el.addEventListener("loadedmetadata", onLoaded);
    return () => el.removeEventListener("loadedmetadata", onLoaded);
  }, []);

  const syncAudioToStream = () => {
    const el = audioRef.current;
    if (!el) return;
    if (!following) {
      el.pause();
      return;
    }
    if (!stream) {
      el.pause();
      return;
    }

    // If track changed, update src.
    if (el.src !== stream.trackUrl) {
      el.src = stream.trackUrl;
      // Ensure play/pause waits for metadata.
      el.load();
    }

    const status = stream.status;

    const startedAtMs = stream.startedAtMs ?? undefined;
    const elapsed = startedAtMs ? Date.now() - startedAtMs : 0;
    const targetMs =
      status === "playing"
        ? stream.positionMs + elapsed
        : stream.positionMs;
    const targetSeconds = Math.max(0, targetMs / 1000);
    const shouldPlay = status === "playing";

    // If metadata not ready, queue seek.
    if (!Number.isFinite(el.duration) || el.readyState < 1) {
      pendingSeekRef.current = { seconds: targetSeconds, shouldPlay };
      return;
    }

    el.currentTime = targetSeconds;
    if (shouldPlay) {
      void el.play().catch(() => {});
    } else {
      el.pause();
    }
  };

  // Keep playback synced while following.
  useEffect(() => {
    if (!following) return;
    syncAudioToStream();
    // Re-sync every ~2s while playing for a smoother approximation.
    if (stream?.status === "playing") {
      const id = window.setInterval(() => syncAudioToStream(), 2000);
      return () => window.clearInterval(id);
    }
    return;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stream?._id, stream?.status, stream?.positionMs, stream?.startedAtMs, stream?.trackUrl, following]);

  // Pause audio when user leaves follow-mode.
  useEffect(() => {
    if (!following) return;
    // When stream disappears, `stream` becomes null and we don't follow anymore.
  }, [stream, following]);

  const onPickFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    e.target.value = "";
    if (!f) return;
    if (!f.type.startsWith("audio/")) return;
    setFile(f);
    setFileName(f.name);
  };

  const onStartUploadAndStream = async () => {
    if (!file) return;
    if (!myUserId) return;
    setUploading(true);
    setJoining(false);
    try {
      const uploadUrl = await generateUploadUrl({ roomId });
      const res = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": file.type || "audio/mpeg" },
        body: file,
      });
      if (!res.ok) throw new Error("Upload failed");
      const json = (await res.json()) as { storageId: string };
      await startStream({
        roomId,
        trackStorageId: json.storageId as Id<"_storage">,
        trackFileName: file.name,
        startPositionMs: 0,
      });
      setFollowing(true);
    } finally {
      setUploading(false);
    }
  };

  const streamPlayStatusLabel = useMemo(() => {
    if (!stream) return null;
    return stream.status === "playing" ? "Playing" : "Paused";
  }, [stream]);

  const onJoin = () => {
    if (!stream) return;
    setJoining(true);
    setFollowing(true);
    setJoining(false);
  };

  const onLeave = () => {
    setFollowing(false);
    audioRef.current?.pause();
  };

  return (
    <section className="card room-music-stream-card" aria-label="Room music stream">
      <h2 className="sidebar-heading">Room music stream</h2>
      <p className="muted small room-music-stream-lead">
        {stream
          ? "Everyone in the room can see what you’re playing and join the stream."
          : "Upload an MP3 to start a shared stream. Other members can join playback."}
      </p>

      {stream ? (
        <div className="room-music-stream-now">
          <div className="room-music-now-title">
            <span className="room-music-now-label">Now:</span>{" "}
            <span className="room-music-now-track">{stream.trackFileName}</span>
          </div>
          <div className="room-music-now-meta muted small">
            Host: <strong>{stream.hostDisplayName}</strong> ·{" "}
            {streamPlayStatusLabel} ·{" "}
            {formatStreamTime(stream.positionMs)}
          </div>
          <div className="room-music-actions">
            {isHost ? (
              <>
                <button
                  type="button"
                  className="btn primary compact"
                  disabled={stream.status === "playing" || uploading}
                  onClick={() => void pauseStream({ roomId })}
                >
                  Pause
                </button>
                <button
                  type="button"
                  className="btn primary compact"
                  disabled={stream.status === "paused" || uploading}
                  onClick={() => void resumeStream({ roomId })}
                >
                  Resume
                </button>
                <button
                  type="button"
                  className="btn ghost compact danger-text"
                  disabled={uploading}
                  onClick={() => void stopStream({ roomId })}
                >
                  Stop
                </button>
              </>
            ) : following ? (
              <button type="button" className="btn ghost compact" onClick={onLeave}>
                Leave stream
              </button>
            ) : (
              <button
                type="button"
                className="btn primary compact"
                disabled={joining}
                onClick={onJoin}
              >
                Join stream
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="room-music-upload-row">
          <label className="btn ghost room-music-upload-btn">
            {fileName ? "Replace MP3" : "Import MP3"}
            <input
              type="file"
              accept="audio/mpeg,audio/mp3,.mp3,audio/*"
              className="visually-hidden"
              onChange={onPickFile}
            />
          </label>
          <button
            type="button"
            className="btn primary"
            disabled={!file || uploading}
            onClick={() => void onStartUploadAndStream()}
          >
            {uploading ? "Starting…" : "Start stream"}
          </button>
        </div>
      )}

      {/* Local playback source (synced by stream state). */}
      <audio ref={audioRef} preload="metadata" />
    </section>
  );
}


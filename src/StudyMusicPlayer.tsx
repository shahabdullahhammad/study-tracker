import { useEffect, useRef, useState, type ChangeEvent } from "react";

/**
 * Local MP3 playback only — files stay on your device (object URLs, not uploaded).
 */
export function StudyMusicPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [objectUrl, setObjectUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [volume, setVolume] = useState(0.75);
  const [loop, setLoop] = useState(true);

  useEffect(() => {
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [objectUrl]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.volume = volume;
  }, [volume]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el) return;
    el.loop = loop;
  }, [loop, objectUrl]);

  useEffect(() => {
    const el = audioRef.current;
    if (!el || !objectUrl) return;
    const onEnded = () => setPlaying(false);
    el.addEventListener("ended", onEnded);
    return () => el.removeEventListener("ended", onEnded);
  }, [objectUrl]);

  const onPickFile = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;

    if (objectUrl) URL.revokeObjectURL(objectUrl);

    const url = URL.createObjectURL(f);
    setObjectUrl(url);
    setFileName(f.name);
    setPlaying(false);
  };

  const clearTrack = () => {
    const el = audioRef.current;
    if (el) {
      el.pause();
      el.currentTime = 0;
    }
    if (objectUrl) URL.revokeObjectURL(objectUrl);
    setObjectUrl(null);
    setFileName(null);
    setPlaying(false);
  };

  const togglePlay = () => {
    const el = audioRef.current;
    if (!el || !objectUrl) return;
    if (playing) {
      el.pause();
    } else {
      void el.play().catch(() => setPlaying(false));
    }
  };

  return (
    <section className="card study-music-card" aria-label="Personal study music">
      <h2 className="sidebar-heading">Personal music (solo)</h2>
      <p className="muted small study-music-lead">
        Import an MP3 from your device. Playback stays in your browser — nothing
        is uploaded to the server.
      </p>

      <div className="study-music-toolbar">
        <label className="btn ghost study-music-file-btn">
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
          className="btn primary study-music-play"
          disabled={!objectUrl}
          onClick={() => void togglePlay()}
          aria-pressed={playing}
        >
          {playing ? "Pause" : "Play"}
        </button>
        <button
          type="button"
          className="btn ghost"
          disabled={!objectUrl}
          onClick={clearTrack}
        >
          Clear
        </button>
      </div>

      {fileName ? (
        <p className="study-music-now muted small" title={fileName}>
          Now: <span className="study-music-name">{fileName}</span>
        </p>
      ) : null}

      <div className="study-music-sliders">
        <label className="study-music-vol-label">
          Volume
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={volume}
            onChange={(e) => setVolume(Number(e.target.value))}
            className="study-music-range"
          />
        </label>
        <label className="study-music-loop">
          <input
            type="checkbox"
            checked={loop}
            onChange={(e) => setLoop(e.target.checked)}
          />
          Loop
        </label>
      </div>

      <audio
        ref={audioRef}
        src={objectUrl ?? undefined}
        preload="metadata"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
      />
    </section>
  );
}

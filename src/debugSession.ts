/** Debug-mode NDJSON ingest (session 3232e1). No secrets / PII. */
const DEBUG_ENDPOINT =
  "http://127.0.0.1:7323/ingest/33c6cea5-43d2-420c-a7f7-32c72b2b6c5a";
const DEBUG_SESSION = "3232e1";
const LS_KEY = "debug-session-3232e1-ndjson";
const LS_MAX = 80;

export function agentLog(
  location: string,
  message: string,
  hypothesisId: string,
  data: Record<string, unknown> = {},
): void {
  const line = {
    sessionId: DEBUG_SESSION,
    location,
    message,
    hypothesisId,
    data,
    timestamp: Date.now(),
  };
  const ndjson = JSON.stringify(line);

  // #region agent log
  if (import.meta.env.DEV) {
    console.info("[agent-debug]", ndjson);
  }
  try {
    const prev = localStorage.getItem(LS_KEY);
    const arr: string[] = prev ? (JSON.parse(prev) as string[]) : [];
    arr.push(ndjson);
    while (arr.length > LS_MAX) arr.shift();
    localStorage.setItem(LS_KEY, JSON.stringify(arr));
  } catch {
    /* ignore */
  }
  fetch(DEBUG_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Debug-Session-Id": DEBUG_SESSION,
    },
    body: ndjson,
  }).catch(() => {});

  const site = import.meta.env.VITE_CONVEX_SITE_URL;
  if (typeof site === "string" && site.length > 0) {
    const base = site.replace(/\/$/, "");
    fetch(`${base}/client-debug-log`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: ndjson,
    }).catch(() => {});
  }
  // #endregion
}

/** NDJSON lines for the agent (clipboard). */
export async function copyAgentDebugLogToClipboard(): Promise<boolean> {
  try {
    const prev = localStorage.getItem(LS_KEY);
    const arr: string[] = prev ? (JSON.parse(prev) as string[]) : [];
    const text = arr.length > 0 ? arr.join("\n") : "";
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

/** Paste output in chat for analysis (browser DevTools → Console). */
export function dumpAgentDebugLogToConsole(): void {
  try {
    const prev = localStorage.getItem(LS_KEY);
    const arr: string[] = prev ? (JSON.parse(prev) as string[]) : [];
    console.info("[agent-debug-dump]", arr.join("\n"));
  } catch (e) {
    console.warn("[agent-debug-dump] failed", e);
  }
}

// Expose for quick copy from console: window.__dumpAgentDebug()
declare global {
  interface Window {
    __dumpAgentDebug?: () => void;
  }
}
if (typeof window !== "undefined") {
  window.__dumpAgentDebug = dumpAgentDebugLogToConsole;
}

import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { ConvexAuthProvider } from "@convex-dev/auth/react";
import { ConvexReactClient } from "convex/react";
import App from "./App";
import { APP_NAME } from "./brand";
import { agentLog } from "./debugSession";
import "./index.css";

const convexUrl = import.meta.env.VITE_CONVEX_URL;

// #region agent log
if (!convexUrl) {
  agentLog("main.tsx", "bootstrap branch missing VITE_CONVEX_URL", "H1", {
    hasConvexUrl: false,
  });
} else {
  agentLog("main.tsx", "bootstrap branch Convex client render", "H1", {
    hasConvexUrl: true,
    urlCharLength: convexUrl.length,
  });
}
// #endregion

function MissingConvexConfig() {
  return (
    <main className="shell landing-shell">
      <div className="card landing-card">
        <p className="brand-mark">{APP_NAME}</p>
        <h1 className="brand-title">Configuration needed</h1>
        <p className="muted landing-lead">
          The app needs your Convex deployment URL. Add an environment variable{" "}
          <code className="inline-code">VITE_CONVEX_URL</code> in your host (e.g.
          Vercel → Project → Settings → Environment Variables), then redeploy.
        </p>
        <p className="muted small">
          Local: copy <code className="inline-code">.env.local.example</code> to{" "}
          <code className="inline-code">.env.local</code> and set{" "}
          <code className="inline-code">VITE_CONVEX_URL</code> from{" "}
          <code className="inline-code">npx convex dev</code>.
        </p>
      </div>
    </main>
  );
}

if (!convexUrl) {
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <MissingConvexConfig />
    </StrictMode>,
  );
} else {
  const convex = new ConvexReactClient(convexUrl);
  createRoot(document.getElementById("root")!).render(
    <StrictMode>
      <ConvexAuthProvider client={convex}>
        <App />
      </ConvexAuthProvider>
    </StrictMode>,
  );
}

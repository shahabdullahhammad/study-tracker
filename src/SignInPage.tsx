import { useEffect, useId } from "react";
import { useAuthActions } from "@convex-dev/auth/react";
import { APP_NAME } from "./brand";
import { agentLog } from "./debugSession";

function LayersIcon({ gradId }: { gradId: string }) {
  return (
    <svg
      className="landing-hero-icon-svg"
      viewBox="0 0 80 88"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M40 4L72 22V44L40 62L8 44V22L40 4Z"
        stroke={`url(#${gradId})`}
        strokeWidth="2.2"
        fill="rgba(96, 165, 250, 0.12)"
      />
      <path
        d="M40 18L62 30.5V47L40 59.5L18 47V30.5L40 18Z"
        stroke={`url(#${gradId})`}
        strokeWidth="2"
        fill="rgba(96, 165, 250, 0.18)"
      />
      <path
        d="M40 30L54 38V50L40 58L26 50V38L40 30Z"
        stroke={`url(#${gradId})`}
        strokeWidth="1.8"
        fill="rgba(147, 197, 253, 0.25)"
      />
      <defs>
        <linearGradient
          id={gradId}
          x1="8"
          y1="4"
          x2="72"
          y2="62"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#38bdf8" />
          <stop offset="1" stopColor="#3b82f6" />
        </linearGradient>
      </defs>
    </svg>
  );
}

export function SignInPage() {
  const { signIn } = useAuthActions();
  const iconGradId = useId().replace(/:/g, "");

  useEffect(() => {
    // #region agent log
    agentLog("SignInPage.tsx", "unauthenticated shell mounted", "H3", {});
    // #endregion
  }, []);

  const signInWithLog = (provider: "google" | "github" | "discord") => {
    // #region agent log
    agentLog("SignInPage.tsx", "signIn called", "H3", { provider });
    // #endregion
    void signIn(provider);
  };

  return (
    <main className="shell landing-shell landing-hero-page">
      <div className="landing-hero-grid" aria-hidden />
      <div className="landing-hero-glow" aria-hidden />

      <div className="card landing-card landing-card--hero">
        <div className="landing-hero-content">
          <div className="landing-hero-icon-wrap">
            <div className="landing-hero-rings" aria-hidden />
            <LayersIcon gradId={`landingIconGrad-${iconGradId}`} />
          </div>

          <h1 className="landing-hero-title">{APP_NAME}</h1>
          <p className="landing-hero-subtitle">
            Redefining Collaborative Productivity
          </p>

          <div className="landing-url-pill" role="status">
            <span className="landing-url-pill-dot" aria-hidden />
            <span className="landing-url-pill-text">
              primestudytracker.vercel.app
            </span>
          </div>

          <p className="muted small landing-hero-signin-hint">
            Use Google, GitHub, or Discord. Then open your dashboard and study
            rooms.
          </p>

          <div className="stack auth-provider-btns landing-hero-auth">
            <button
              type="button"
              className="btn primary"
              onClick={() => signInWithLog("google")}
            >
              Continue with Google
            </button>
            <button
              type="button"
              className="btn landing-join"
              onClick={() => signInWithLog("github")}
            >
              Continue with GitHub
            </button>
            <button
              type="button"
              className="btn discord"
              onClick={() => signInWithLog("discord")}
            >
              Continue with Discord
            </button>
          </div>
        </div>

        <footer className="landing-hero-footer-inline">
          <span>NIT SRINAGAR CURSOR HACKATHON 2026</span>
          <span>SHAH ABDULLAH HAMMAAD</span>
        </footer>
      </div>
    </main>
  );
}

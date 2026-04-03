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
        fill="rgba(108, 92, 231, 0.08)"
      />
      <path
        d="M40 18L62 30.5V47L40 59.5L18 47V30.5L40 18Z"
        stroke={`url(#${gradId})`}
        strokeWidth="2"
        fill="rgba(108, 92, 231, 0.12)"
      />
      <path
        d="M40 30L54 38V50L40 58L26 50V38L40 30Z"
        stroke={`url(#${gradId})`}
        strokeWidth="1.8"
        fill="rgba(108, 92, 231, 0.18)"
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
          <stop stopColor="#8b7cf7" />
          <stop offset="1" stopColor="#6c5ce7" />
        </linearGradient>
      </defs>
    </svg>
  );
}

const FEATURES = [
  {
    icon: "👥",
    title: "Study Rooms",
    desc: "Create password-protected rooms and invite study partners. Everyone sees shared progress in real time.",
  },
  {
    icon: "⏱",
    title: "Focus Timers",
    desc: "Track study time per topic with built-in timers. See how long you and your group have studied.",
  },
  {
    icon: "📝",
    title: "Practice Quizzes",
    desc: "Grade-specific quizzes with score tracking, accuracy stats, and per-subject breakdowns.",
  },
  {
    icon: "💬",
    title: "Room Chat",
    desc: "Real-time messaging with image sharing, editing, and moderation controls for room owners.",
  },
  {
    icon: "🎵",
    title: "Study Music",
    desc: "Play local audio or share music with your entire room for synchronized study sessions.",
  },
  {
    icon: "📊",
    title: "Progress Dashboard",
    desc: "Track group completion, personal study time, quiz history, and per-member statistics at a glance.",
  },
];

export function SignInPage({ onDevSkip }: { onDevSkip?: () => void }) {
  const { signIn } = useAuthActions();
  const iconGradId = useId().replace(/:/g, "");

  useEffect(() => {
    agentLog("SignInPage.tsx", "unauthenticated shell mounted", "H3", {});
  }, []);

  const signInWithLog = (provider: "google" | "github" | "discord") => {
    agentLog("SignInPage.tsx", "signIn called", "H3", { provider });
    void signIn(provider);
  };

  return (
    <div className="lp">
      {/* ── Nav ── */}
      <nav className="lp-nav">
        <div className="lp-nav-inner">
          <div className="lp-nav-brand">
            <LayersIcon gradId={`navIcon-${iconGradId}`} />
            <span className="lp-nav-brand-text">{APP_NAME}</span>
          </div>
          <button
            type="button"
            className="btn primary lp-nav-cta"
            onClick={() => signInWithLog("google")}
          >
            Get Started
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="lp-hero">
        <div className="lp-hero-inner">
          <div className="lp-hero-badge">
            <span className="lp-hero-badge-dot" aria-hidden />
            Live collaborative study platform
          </div>
          <h1 className="lp-hero-title">
            Study together.<br />
            <span className="lp-hero-title-accent">Achieve more.</span>
          </h1>
          <p className="lp-hero-subtitle">
            Create shared study rooms with real-time tasks, focus timers, practice
            quizzes, and group chat. Built for students who learn better together.
          </p>
          <div className="lp-hero-actions">
            <button
              type="button"
              className="btn primary lp-hero-btn"
              onClick={() => signInWithLog("google")}
            >
              Continue with Google
            </button>
            <button
              type="button"
              className="btn lp-hero-btn lp-hero-btn-secondary"
              onClick={() => signInWithLog("github")}
            >
              Continue with GitHub
            </button>
          </div>
          <p className="lp-hero-hint">
            Also available with{" "}
            <button
              type="button"
              className="lp-hero-hint-link"
              onClick={() => signInWithLog("discord")}
            >
              Discord
            </button>
            {" "}sign-in
            {onDevSkip ? (
              <>
                {" · "}
                <button
                  type="button"
                  className="lp-hero-hint-link"
                  onClick={onDevSkip}
                >
                  Skip auth (dev)
                </button>
              </>
            ) : null}
          </p>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="lp-features">
        <div className="lp-features-inner">
          <h2 className="lp-section-title">Everything you need to study smarter</h2>
          <p className="lp-section-subtitle">
            A focused toolkit that keeps your group accountable and on track.
          </p>
          <div className="lp-features-grid">
            {FEATURES.map((f) => (
              <div key={f.title} className="lp-feature-card">
                <span className="lp-feature-icon" aria-hidden>{f.icon}</span>
                <h3 className="lp-feature-title">{f.title}</h3>
                <p className="lp-feature-desc">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA band ── */}
      <section className="lp-cta-band">
        <div className="lp-cta-inner">
          <h2 className="lp-cta-title">Ready to get started?</h2>
          <p className="lp-cta-subtitle">
            Sign in and create your first study room in under a minute.
          </p>
          <div className="lp-hero-actions">
            <button
              type="button"
              className="btn primary lp-hero-btn"
              onClick={() => signInWithLog("google")}
            >
              Get Started Free
            </button>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-brand">
            <LayersIcon gradId={`footerIcon-${iconGradId}`} />
            <span className="lp-nav-brand-text">{APP_NAME}</span>
          </div>
          <div className="lp-footer-meta">
            <span>NIT Srinagar Cursor Hackathon 2026</span>
            <span>Shah Abdullah Hammaad</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

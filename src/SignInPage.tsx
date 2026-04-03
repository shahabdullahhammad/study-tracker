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
    <main className="mercury-landing">
      <header className="mercury-header">
        <div className="mercury-logo">
          <LayersIcon gradId={`landingIconGrad-${iconGradId}`} />
          <span className="mercury-brand-name">{APP_NAME}</span>
        </div>
        <nav className="mercury-nav">
          <a href="#">Products</a>
          <a href="#">Solutions</a>
          <a href="#">Resources</a>
          <a href="#">About</a>
          <a href="#">Pricing</a>
        </nav>
        <div className="mercury-auth-nav">
          <button className="mercury-btn-link" onClick={() => signInWithLog("github")}>Log In</button>
          <button className="mercury-btn-primary" onClick={() => signInWithLog("google")}>Open Account</button>
        </div>
      </header>

      <section className="mercury-hero">
        <h1 className="mercury-title">Redefining Collaborative Productivity.</h1>
        <p className="mercury-subtitle">
          Use Google, GitHub, or Discord. Then open your dashboard and study rooms.
        </p>
        
        <div className="mercury-actions">
          <button className="mercury-btn-primary" onClick={() => signInWithLog("google")}>
            Continue with Google
          </button>
          <button className="mercury-btn-secondary" onClick={() => signInWithLog("github")}>
            Continue with GitHub
          </button>
          <button className="mercury-btn-secondary" onClick={() => signInWithLog("discord")}>
            Continue with Discord
          </button>
        </div>
      </section>

      <section className="mercury-mockup-section">
        <div className="mercury-mockup-wrapper">
          <img 
            src="/dashboard-mockup.png" 
            alt="Dashboard Mockup" 
            className="mercury-mockup-img" 
            onError={(e) => {
              e.currentTarget.style.display = 'none';
              e.currentTarget.parentElement?.classList.add('mercury-mockup-placeholder');
            }}
          />
        </div>
      </section>
    </main>
  );
}

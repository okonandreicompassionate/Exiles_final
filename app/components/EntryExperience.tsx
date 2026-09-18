"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { Anton, Permanent_Marker } from "next/font/google";
import "./entry-experience.css";

const tagFont = Anton({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-tag",
});

const markerFont = Permanent_Marker({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-marker",
});

const STORAGE_KEY = "ex1les-entry-seen";

const BOOT_LINES = [
  "NOVA CORP // SECURE_NET v4.2",
  "> session request... received",
  "> access_token: DENIED",
  "> retrying with elevated creds",
  "> firewall.rules — bypassing [######----] 61%",
  "> firewall.rules — bypassed",
  "> root@nova: permission granted",
  "> unknown process attached: ANDREI",
];

const BOOT_LINE_MS = 190;

const AMBIENT_LOG = [
  "root@nova:~$ inject exiles.payload",
  "root@nova:~$ chmod -R 000 /nova/control",
  'root@nova:~$ echo "NOVA CORP IS DONE" >> motd',
  "root@nova:~$ rm -rf /nova/pr/talking_points",
];

/* ------------------------------------------------------------------ */
/* External-store reads: localStorage and prefers-reduced-motion are  */
/* browser-only, so we use useSyncExternalStore rather than an effect */
/* + setState. React reconciles the server/client mismatch for us,    */
/* and no manual setState call happens in an effect body.             */
/* ------------------------------------------------------------------ */

function subscribeToStorage(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}
function getSeenSnapshot() {
  return window.localStorage.getItem(STORAGE_KEY) === "true";
}
function getSeenServerSnapshot() {
  return false;
}

function subscribeToMotionPref(callback: () => void) {
  const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}
function getMotionSnapshot() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
function getMotionServerSnapshot() {
  return false;
}

function Arrow({ className }: { className: string }) {
  return (
    <svg
      className={`entry-arrow-svg ${className}`}
      viewBox="0 0 120 160"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M60 6 C 55 40, 68 80, 50 120 C 44 132, 40 140, 38 150"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
      />
      <path
        d="M20 128 C 28 136, 32 142, 38 150 C 44 140, 50 134, 60 126"
        stroke="currentColor"
        strokeWidth="5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function EntryExperience() {
  const router = useRouter();

  const isReturning = useSyncExternalStore(
    subscribeToStorage,
    getSeenSnapshot,
    getSeenServerSnapshot,
  );
  const reducedMotion = useSyncExternalStore(
    subscribeToMotionPref,
    getMotionSnapshot,
    getMotionServerSnapshot,
  );

  // bootPhase is owned entirely by timers below — it always starts
  // "boot" on both server and client, so there's nothing to reconcile
  // on hydration, and every setPhase call happens inside a timer
  // callback rather than synchronously in the effect body.
  const [bootPhase, setBootPhase] = useState<
    "boot" | "glitch" | "takeover" | "exit"
  >("boot");
  const [visibleLines, setVisibleLines] = useState(0);

  useEffect(() => {
    if (isReturning) return;

    const tickMs = reducedMotion ? 1 : BOOT_LINE_MS;

    const lineTimer = window.setInterval(() => {
      setVisibleLines((n) => Math.min(n + 1, BOOT_LINES.length));
    }, tickMs);

    const glitchTimer = window.setTimeout(
      () => {
        window.clearInterval(lineTimer);
        setBootPhase("glitch");
      },
      BOOT_LINES.length * tickMs + (reducedMotion ? 1 : 260),
    );

    const takeoverTimer = window.setTimeout(
      () => setBootPhase("takeover"),
      BOOT_LINES.length * tickMs + (reducedMotion ? 2 : 520),
    );

    return () => {
      window.clearInterval(lineTimer);
      window.clearTimeout(glitchTimer);
      window.clearTimeout(takeoverTimer);
    };
    // Deliberately NOT depending on bootPhase: this effect schedules the
    // whole boot -> glitch -> takeover chain once. Including bootPhase
    // here would re-run the effect every time one of these timers fires,
    // and the cleanup would cancel the next timer before it lands.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isReturning, reducedMotion]);

  function enterExile() {
    window.localStorage.setItem(STORAGE_KEY, "true");
    setBootPhase("exit");

    window.setTimeout(
      () => {
        router.push("/shop");
      },
      reducedMotion ? 150 : 700,
    );
  }

  // Single derived value the JSX below switches on.
  const uiPhase =
    bootPhase === "exit" ? "exit" : isReturning ? "returning" : bootPhase;

  const showTakeover = uiPhase === "takeover" || uiPhase === "exit";

  return (
    <main
      className={`entry-screen ${tagFont.variable} ${markerFont.variable} ${
        uiPhase === "exit" ? "entry-screen--exit" : ""
      }`}
    >
      <div className="entry-texture" aria-hidden="true" />
      <div className="entry-scanlines" aria-hidden="true" />
      <div className="entry-vignette" aria-hidden="true" />

      <div className="entry-shell">
        {/* ================= BOOT ================= */}
        {uiPhase === "boot" && (
          <section className="entry-boot" aria-live="polite">
            {BOOT_LINES.slice(0, visibleLines).map((line, i) => (
              <p
                key={line}
                className={`entry-boot-line ${
                  i === BOOT_LINES.length - 1 ? "entry-boot-line--flag" : ""
                }`}
              >
                {line}
              </p>
            ))}
            <span className="entry-cursor">_</span>
          </section>
        )}

        {/* ================= GLITCH ================= */}
        {uiPhase === "glitch" && (
          <section className="entry-glitch" aria-hidden="true">
            <p className="entry-boot-line entry-glitch-line">
              NOVA CORP // SECURE_NET
            </p>
            <p className="entry-boot-line entry-boot-line--flag entry-glitch-line">
              root@nova: permission granted
            </p>
          </section>
        )}

        {/* ================= TAKEOVER / EXIT ================= */}
        {showTakeover && (
          <section
            className={`entry-takeover ${
              uiPhase === "exit" ? "entry-takeover--exit" : ""
            }`}
          >
            <header className="entry-corp-header">
              <span className="entry-corp-strike">NOVA CORP</span>
              <span className="entry-corp-meta">INTERNAL SYSTEM · LAGOS</span>
            </header>

            <div className="entry-status-row">
              <span className="entry-status-label">SYSTEM STATUS:</span>
              <span className="entry-status-old">NORMAL</span>
              <span className="entry-status-stamp">COMPROMISED</span>
            </div>

            <p className="entry-op-stamp">OPERATOR: ANDREI</p>

            <div className="entry-tagwrap">
              <span className="entry-tag-shadow" aria-hidden="true">
                EX1LES
              </span>
              <h1 className="entry-tag">EX1LES</h1>
              <span className="entry-tag-note">
                NOVA CORP NO LONGER CONTROLS THIS SYSTEM
              </span>
            </div>

            <p className="entry-note entry-note--one">EXILES WAS HERE.</p>
            <Arrow className="entry-arrow entry-arrow--one" />

            <p className="entry-note entry-note--two">LOOK CLOSER.</p>
            <Arrow className="entry-arrow entry-arrow--two" />

            <p className="entry-note entry-note--three">
              NO PERMISSION NEEDED.
            </p>

            <div className="entry-cta-wrap">
              <button className="entry-cta" onClick={enterExile} type="button">
                ENTER EX1LES <span className="entry-cta-arrow">→</span>
              </button>
              <span className="entry-cta-note">GO HERE</span>
            </div>

            <footer className="entry-footer">
              <span>EX1LES®</span>
              <span className="entry-footer-sig">— ANDREI</span>
              <span>FILE 001 · ACTIVE</span>
            </footer>

            <div className="entry-ambient-log" aria-hidden="true">
              {AMBIENT_LOG.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>

            {uiPhase === "exit" && (
              <div className="entry-exit-overlay" aria-hidden="true">
                <span className="entry-exit-line entry-exit-line--one">
                  ACCESS OVERRIDDEN.
                </span>
                <span className="entry-exit-line entry-exit-line--two">
                  WELCOME TO EX1LES.
                </span>
              </div>
            )}
          </section>
        )}

        {/* ================= RETURNING ================= */}
        {uiPhase === "returning" && (
          <section className="entry-returning">
            <p className="entry-corp-strike entry-corp-strike--small">
              NOVA CORP
            </p>
            <h1 className="entry-returning-title">
              SYSTEM STILL
              <br />
              <span className="entry-returning-emph">COMPROMISED.</span>
            </h1>
            <p className="entry-returning-sub">EXILES WAS HERE. — ANDREI</p>

            <button className="entry-cta" onClick={enterExile} type="button">
              ENTER EX1LES <span className="entry-cta-arrow">→</span>
            </button>
          </section>
        )}
      </div>

      {bootPhase === "exit" && !isReturning && (
        <div className="entry-exit-flash" aria-hidden="true" />
      )}
    </main>
  );
}

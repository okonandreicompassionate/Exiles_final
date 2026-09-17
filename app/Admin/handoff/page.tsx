"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase, isSupabaseConfigured } from "../../../lib/supabase";
import { useToast } from "../../components/toastProvider";
import { Logo } from "../../components/Logo";
import { AdminNav } from "../AdminNav";
import { HANDOFF_CONTENT } from "./content";
import { Copy, CheckCircle2, Download } from "lucide-react";

const inputClass =
  "w-full glass-input text-zinc-900 text-sm px-4 py-3 rounded-xl outline-none transition-colors placeholder-zinc-400";

export default function HandoffPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [checkingSession, setCheckingSession] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [role, setRole] = useState<"god" | "admin" | null>(null);
  const [myEmail, setMyEmail] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  async function fetchMyAdminRow(
    accessToken: string
  ): Promise<{ role: "god" | "admin"; email: string } | null> {
    try {
      const res = await fetch("/api/admin/me", { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!res.ok) return null;
      const json = await res.json();
      return json.admin ?? null;
    } catch {
      return null;
    }
  }

  useEffect(() => {
    async function bootstrap() {
      if (!isSupabaseConfigured || !supabase) {
        setCheckingSession(false);
        return;
      }
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      if (!token) {
        setCheckingSession(false);
        return;
      }
      const adminRow = await fetchMyAdminRow(token);
      if (adminRow) {
        setAuthed(true);
        setRole(adminRow.role);
        setMyEmail(adminRow.email);
      } else {
        await supabase.auth.signOut();
      }
      setCheckingSession(false);
    }
    bootstrap();
  }, []);

  async function handleLogin() {
    if (!supabase) {
      showToast("Supabase is not configured. Add your environment variables first.", "error");
      return;
    }
    if (!loginEmail || !loginPassword) {
      showToast("Enter email and password", "error");
      return;
    }
    setLoginLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({ email: loginEmail, password: loginPassword });
    if (error || !data.user || !data.session) {
      showToast(error?.message ?? "Login failed", "error");
      setLoginLoading(false);
      return;
    }
    const adminRow = await fetchMyAdminRow(data.session.access_token);
    if (!adminRow) {
      await supabase.auth.signOut();
      showToast("This account is not an admin", "error");
      setLoginLoading(false);
      return;
    }
    setAuthed(true);
    setRole(adminRow.role);
    setMyEmail(adminRow.email);
    setLoginPassword("");
    setLoginLoading(false);
  }

  async function handleLogout() {
    if (supabase) await supabase.auth.signOut();
    setAuthed(false);
    setRole(null);
    router.push("/Admin/handoff");
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(HANDOFF_CONTENT);
      setCopied(true);
      showToast("Copied — paste it as your first message to the new agent", "success");
      setTimeout(() => setCopied(false), 2500);
    } catch {
      showToast("Copy failed — select the text manually instead", "error");
    }
  }

  function handleDownload() {
    const blob = new Blob([HANDOFF_CONTENT], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ex1les-handoff.md";
    a.click();
    URL.revokeObjectURL(url);
  }

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-5 h-5 rounded-full border-2 border-zinc-900/15 border-t-zinc-900 animate-spin" />
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-white text-zinc-900 flex items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center flex flex-col items-center gap-3">
            <Logo showText={false} markClassName="h-10" />
            <div>
              <h1 className="font-bold tracking-[0.4em] text-sm uppercase mb-1">EX1LES</h1>
              <p className="text-zinc-400 text-xs tracking-widest uppercase">Admin Access</p>
            </div>
          </div>
          <div className="space-y-3">
            <input
              type="email"
              placeholder="Email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className={inputClass}
              autoComplete="username"
            />
            <input
              type="password"
              placeholder="Password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className={inputClass}
              autoComplete="current-password"
            />
            <button
              onClick={handleLogin}
              disabled={loginLoading}
              className="w-full py-3.5 bg-zinc-900 text-white text-xs tracking-[0.25em] uppercase font-semibold rounded-xl hover:bg-zinc-700 transition-colors disabled:opacity-50"
            >
              {loginLoading ? "Signing in..." : "Sign In"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (role !== "god") {
    return (
      <div className="min-h-screen bg-white text-zinc-900">
        <AdminNav role={role} onLogout={handleLogout} email={myEmail} />
        <div className="flex flex-col items-center justify-center gap-4 px-4 py-20 text-center">
          <p className="text-sm text-zinc-500">This page is only available to the god account.</p>
          <button
            onClick={() => router.push("/Admin/dashboard")}
            className="text-xs tracking-widest uppercase text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            ← Back to dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <AdminNav role={role} onLogout={handleLogout} email={myEmail} />

      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-10 pb-24 space-y-6">
        <div>
          <p className="text-[10px] tracking-[0.4em] uppercase text-amber-700 font-medium mb-2">
            AI Agent Handoff
          </p>
          <h2 className="text-xl font-semibold mb-2">Bring a new AI agent up to speed</h2>
          <p className="text-sm text-zinc-500 leading-relaxed max-w-2xl">
            Copy the block below and paste it as the first message to a new AI coding session
            working on this project. It&apos;s a snapshot of the architecture, decisions, and gotchas
            from building this out — no passwords or keys, just how things fit together.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-2 px-5 py-3 bg-zinc-900 text-white text-xs tracking-widest uppercase font-semibold rounded-xl hover:bg-zinc-700 transition-colors"
          >
            {copied ? <CheckCircle2 size={14} className="text-emerald-400" /> : <Copy size={14} />}
            {copied ? "Copied" : "Copy to clipboard"}
          </button>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-5 py-3 glass text-zinc-600 hover:text-zinc-900 hover:bg-zinc-900/5 text-xs tracking-widest uppercase font-medium rounded-xl transition-colors"
          >
            <Download size={14} />
            Download .md
          </button>
        </div>

        <div className="glass rounded-2xl p-5">
          <pre className="text-xs text-zinc-700 whitespace-pre-wrap leading-relaxed font-mono">
            {HANDOFF_CONTENT}
          </pre>
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase, isSupabaseConfigured } from "../../../lib/supabase";
import { useToast } from "../../components/toastProvider";
import { Logo } from "../../components/Logo";
import { AdminNav } from "../AdminNav";
import { Trash2, UserPlus } from "lucide-react";

const inputClass =
  "w-full glass-input text-zinc-900 text-sm px-4 py-3 rounded-xl outline-none transition-colors placeholder-zinc-400";

type AdminRole = "god" | "admin";
type AdminUser = { id: string; email: string; role: AdminRole; created_at: string };

export default function ManageAdminsPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [checkingSession, setCheckingSession] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [role, setRole] = useState<AdminRole | null>(null);
  const [myEmail, setMyEmail] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [admins, setAdmins] = useState<AdminUser[]>([]);
  const [adminsLoading, setAdminsLoading] = useState(false);
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [addingAdmin, setAddingAdmin] = useState(false);

  async function fetchMyAdminRow(
    accessToken: string
  ): Promise<{ admin: { role: AdminRole; email: string } | null; error: string | null }> {
    try {
      const res = await fetch("/api/admin/me", { headers: { Authorization: `Bearer ${accessToken}` } });
      const json = await res.json();
      if (!res.ok) return { admin: null, error: json.error ?? `Request failed (${res.status})` };
      return { admin: json.admin ?? null, error: null };
    } catch (err) {
      return { admin: null, error: err instanceof Error ? err.message : "Network error" };
    }
  }

  async function authHeader(): Promise<Record<string, string>> {
    if (!supabase) return {};
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  useEffect(() => {
    async function bootstrap() {
      if (!isSupabaseConfigured || !supabase) {
        setCheckingSession(false);
        return;
      }
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        setCheckingSession(false);
        return;
      }
      const { admin: adminRow, error: adminErr } = await fetchMyAdminRow(token);
      if (adminRow) {
        setAuthed(true);
        setRole(adminRow.role);
        setMyEmail(adminRow.email);
      } else {
        if (adminErr && adminErr !== "Not an admin") {
          showToast(`Admin check failed: ${adminErr}`, "error");
        }
        await supabase.auth.signOut();
      }
      setCheckingSession(false);
    }
    bootstrap();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (authed && role === "god") fetchAdmins();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed, role]);

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
    const { admin: adminRow, error: adminErr } = await fetchMyAdminRow(data.session.access_token);
    if (!adminRow) {
      await supabase.auth.signOut();
      showToast(
        adminErr && adminErr !== "Not an admin" ? `Admin check failed: ${adminErr}` : "This account is not an admin",
        "error"
      );
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
    router.push("/Admin/admins");
  }

  async function fetchAdmins() {
    setAdminsLoading(true);
    try {
      const res = await fetch("/api/admin/list-admins", { headers: await authHeader() });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      setAdmins(json.admins ?? []);
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to load admins", "error");
    }
    setAdminsLoading(false);
  }

  async function handleAddAdmin() {
    if (!newAdminEmail || !newAdminPassword) {
      showToast("Enter email and password for the new admin", "error");
      return;
    }
    setAddingAdmin(true);
    try {
      const res = await fetch("/api/admin/create-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({ email: newAdminEmail, password: newAdminPassword }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      showToast(`Admin added: ${newAdminEmail}`, "success");
      setNewAdminEmail("");
      setNewAdminPassword("");
      fetchAdmins();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to add admin", "error");
    }
    setAddingAdmin(false);
  }

  async function handleRemoveAdmin(id: string, email: string) {
    if (!confirm(`Remove admin access for ${email}?`)) return;
    try {
      const res = await fetch("/api/admin/remove-admin", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(await authHeader()) },
        body: JSON.stringify({ id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      showToast(`Removed ${email}`, "info");
      fetchAdmins();
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Failed to remove admin", "error");
    }
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

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <AdminNav role={role} onLogout={handleLogout} email={myEmail} />

      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-10 pb-24">
        {role !== "god" ? (
          <div className="flex flex-col items-center justify-center gap-3 py-20 text-center">
            <p className="text-sm text-zinc-500">This page is only available to the god account.</p>
            <button
              onClick={() => router.push("/Admin/dashboard")}
              className="text-xs tracking-widest uppercase text-zinc-500 hover:text-zinc-900 transition-colors"
            >
              ← Back to dashboard
            </button>
          </div>
        ) : (
          <div className="glass rounded-2xl p-5 sm:p-6 space-y-5">
            <p className="text-[10px] tracking-[0.4em] uppercase text-amber-700 font-medium">Manage Admins</p>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                placeholder="New admin email"
                value={newAdminEmail}
                onChange={(e) => setNewAdminEmail(e.target.value)}
                className={inputClass}
              />
              <input
                type="password"
                placeholder="Temporary password (min 8 chars)"
                value={newAdminPassword}
                onChange={(e) => setNewAdminPassword(e.target.value)}
                className={inputClass}
              />
              <button
                onClick={handleAddAdmin}
                disabled={addingAdmin}
                className="flex items-center justify-center gap-1.5 px-5 py-3 bg-zinc-900 text-white text-xs tracking-widest uppercase font-semibold rounded-xl hover:bg-zinc-700 transition-colors disabled:opacity-50 flex-shrink-0"
              >
                <UserPlus size={14} />
                Add
              </button>
            </div>

            <div className="space-y-2">
              {adminsLoading && <p className="text-xs text-zinc-400">Loading...</p>}
              {!adminsLoading && admins.map((a) => (
                <div key={a.id} className="flex items-center justify-between px-4 py-3 rounded-xl bg-zinc-900/[0.03]">
                  <div>
                    <p className="text-sm text-zinc-900">{a.email}</p>
                    <p className="text-[10px] uppercase tracking-widest text-zinc-400">{a.role}</p>
                  </div>
                  {a.role !== "god" && (
                    <button
                      onClick={() => handleRemoveAdmin(a.id, a.email)}
                      className="text-zinc-400 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
              {!adminsLoading && admins.length === 0 && (
                <p className="text-xs text-zinc-400">No admins yet.</p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase, isSupabaseConfigured } from "../../lib/supabase";
import { Plus, Trash2, CheckCircle } from "lucide-react";
import { useToast } from "../components/toastProvider";
import { Logo } from "../components/Logo";
import { ImageUploadField } from "../components/ImageUploadField";
import { AdminNav } from "./AdminNav";

type Category = { id: string; name: string; slug: string };
type SizeRow = { size: string; stock: number };
type AdminRole = "god" | "admin";

const ALL_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

const inputClass = "w-full glass-input text-zinc-900 text-sm px-4 py-3 rounded-xl outline-none transition-colors placeholder-zinc-400";

export default function AdminPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [checkingSession, setCheckingSession] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [role, setRole] = useState<AdminRole | null>(null);
  const [myEmail, setMyEmail] = useState("");
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    image_url: "",
    category_id: "",
    is_featured: false,
  });

  const [sizes, setSizes] = useState<SizeRow[]>([
    { size: "XS", stock: 0 },
    { size: "S", stock: 0 },
    { size: "M", stock: 0 },
    { size: "L", stock: 0 },
    { size: "XL", stock: 0 },
  ]);

  const [images, setImages] = useState<string[]>(["", "", ""]);

  // Verified server-side via the service-role key (bypasses RLS entirely) —
  // the same path the /api/admin/* routes use, so it can never disagree with
  // what the SQL editor shows you. Surfaces the real error (e.g. a missing
  // SUPABASE_SERVICE_ROLE_KEY on this deployment) instead of masking every
  // failure as "not an admin".
  async function fetchMyAdminRow(
    accessToken: string
  ): Promise<{ admin: { role: AdminRole; email: string } | null; error: string | null }> {
    try {
      const res = await fetch("/api/admin/me", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      const json = await res.json();
      if (!res.ok) {
        return { admin: null, error: json.error ?? `Request failed (${res.status})` };
      }
      return { admin: json.admin ?? null, error: null };
    } catch (err) {
      return { admin: null, error: err instanceof Error ? err.message : "Network error" };
    }
  }

  // ── SESSION BOOTSTRAP ──
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
  }, []);

  async function fetchCategories() {
    if (!supabase) return;
    const { data, error } = await supabase.from("categories").select("id, name, slug");
    if (error) {
      showToast(`Failed to load categories: ${error.message}`, "error");
      return;
    }
    if ((data ?? []).length === 0) {
      showToast("No categories found — run the seed insert in supabase/schema.sql", "error");
    }
    setCategories(data ?? []);
  }

  useEffect(() => {
    if (authed) fetchCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

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

    const { data, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });

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
    router.push("/Admin");
  }

  function handleFormChange(e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) {
    const target = e.target;
    const value = target instanceof HTMLInputElement && target.type === "checkbox"
      ? target.checked
      : target.value;
    setForm({ ...form, [target.name]: value });
  }

  function handleSizeStock(idx: number, stock: number) {
    const updated = [...sizes];
    updated[idx].stock = stock;
    setSizes(updated);
  }

  function toggleSize(size: string) {
    const exists = sizes.find((s) => s.size === size);
    if (exists) {
      setSizes(sizes.filter((s) => s.size !== size));
    } else {
      setSizes([...sizes, { size, stock: 0 }].sort(
        (a, b) => ALL_SIZES.indexOf(a.size) - ALL_SIZES.indexOf(b.size)
      ));
    }
  }

  function handleImageChange(idx: number, val: string) {
    const updated = [...images];
    updated[idx] = val;
    setImages(updated);
  }

  function addImageSlot() {
    setImages([...images, ""]);
  }

  function removeImageSlot(idx: number) {
    setImages(images.filter((_, i) => i !== idx));
  }

  async function handleSubmit() {
    if (!supabase) {
      showToast("Supabase is not configured. Add your environment variables first.", "error");
      return;
    }

    if (!form.name || !form.price || !form.image_url || !form.category_id) {
      showToast("Fill in all required fields!", "error");
      return;
    }

    if (sizes.length === 0) {
      showToast("Add at least one size!", "error");
      return;
    }

    setLoading(true);

    try {
      const priceInKobo = Math.round(parseFloat(form.price) * 100);

      const { data: product, error: productError } = await supabase
        .from("products")
        .insert({
          name: form.name,
          description: form.description,
          price: priceInKobo,
          image_url: form.image_url,
          category_id: form.category_id,
          is_featured: form.is_featured,
        })
        .select()
        .single();

      if (productError || !product) {
        showToast("Failed to add product: " + productError?.message, "error");
        setLoading(false);
        return;
      }

      const { error: variantError } = await supabase
        .from("variants")
        .insert(
          sizes.map((s) => ({
            product_id: product.id,
            size: s.size,
            stock: s.stock,
          }))
        );

      if (variantError) {
        showToast("Failed to add variants: " + variantError.message, "error");
        setLoading(false);
        return;
      }

      const validImages = images
        .map((url, idx) => ({ url: url.trim(), idx }))
        .filter((i) => i.url !== "");

      if (validImages.length > 0) {
        const { error: imageError } = await supabase
          .from("product_images")
          .insert(
            validImages.map((i) => ({
              product_id: product.id,
              image_url: i.url,
              position: i.idx,
            }))
          );

        if (imageError) {
          showToast("Failed to add images: " + imageError.message, "error");
          setLoading(false);
          return;
        }
      }

      setSuccess(true);
      showToast("Product added to shop", "success");
      setForm({
        name: "",
        description: "",
        price: "",
        image_url: "",
        category_id: "",
        is_featured: false,
      });
      setSizes([
        { size: "XS", stock: 0 },
        { size: "S", stock: 0 },
        { size: "M", stock: 0 },
        { size: "L", stock: 0 },
        { size: "XL", stock: 0 },
      ]);
      setImages(["", "", ""]);
      setTimeout(() => setSuccess(false), 3000);

    } catch (err) {
      console.error(err);
      showToast("Something went wrong!", "error");
    }

    setLoading(false);
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

        {/* SUCCESS BANNER */}
        {success && (
          <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 px-4 py-3 rounded-xl mb-6 text-sm">
            <CheckCircle size={16} />
            Product added successfully! It&apos;s live on your shop now.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* LEFT — BASIC INFO */}
          <div className="space-y-6">

            {/* PRODUCT INFO */}
            <div>
              <p className="text-[10px] tracking-[0.4em] uppercase text-amber-700 font-medium mb-4">
                Product Info
              </p>
              <div className="space-y-3">
                <input
                  type="text"
                  name="name"
                  placeholder="Product Name *"
                  value={form.name}
                  onChange={handleFormChange}
                  className={inputClass}
                />

                <textarea
                  name="description"
                  placeholder="Description"
                  value={form.description}
                  onChange={handleFormChange}
                  rows={3}
                  className={`${inputClass} resize-none`}
                />

                <div className="grid grid-cols-2 gap-3">
                  {/* PRICE */}
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400 text-sm">₦</span>
                    <input
                      type="number"
                      name="price"
                      placeholder="Price *"
                      value={form.price}
                      onChange={handleFormChange}
                      className={`${inputClass} pl-8`}
                    />
                  </div>

                  {/* CATEGORY */}
                  <select
                    name="category_id"
                    value={form.category_id}
                    onChange={handleFormChange}
                    className={inputClass}
                  >
                    <option value="">Category *</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* FEATURED TOGGLE */}
                <label className="flex items-center gap-3 px-4 py-3 glass rounded-xl cursor-pointer hover:bg-zinc-900/5 transition-colors">
                  <div className={`w-10 h-5 rounded-full transition-colors relative ${form.is_featured ? "bg-zinc-900" : "bg-zinc-300"}`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-all ${form.is_featured ? "left-5" : "left-0.5"}`} />
                  </div>
                  <div>
                    <p className="text-xs text-zinc-900">Mark as New Arrival</p>
                    <p className="text-[10px] text-zinc-400">Shows &quot;New&quot; badge on product card</p>
                  </div>
                  <input
                    type="checkbox"
                    name="is_featured"
                    checked={form.is_featured}
                    onChange={handleFormChange}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* SIZES + STOCK */}
            <div>
              <p className="text-[10px] tracking-[0.4em] uppercase text-amber-700 font-medium mb-4">
                Sizes & Stock
              </p>

              {/* SIZE TOGGLES */}
              <div className="flex gap-2 flex-wrap mb-4">
                {ALL_SIZES.map((size) => {
                  const active = sizes.find((s) => s.size === size);
                  return (
                    <button
                      key={size}
                      onClick={() => toggleSize(size)}
                      className={`w-12 h-12 rounded-xl text-xs font-medium transition-all ${
                        active
                          ? "bg-zinc-900 text-white"
                          : "glass text-zinc-500 hover:text-zinc-900"
                      }`}
                    >
                      {size}
                    </button>
                  );
                })}
              </div>

              {/* STOCK INPUTS */}
              <div className="space-y-2">
                {sizes.map((s, idx) => (
                  <div key={s.size} className="flex items-center gap-3">
                    <span className="text-xs text-zinc-500 w-8 text-center font-medium">{s.size}</span>
                    <input
                      type="number"
                      min={0}
                      value={s.stock}
                      onChange={(e) => handleSizeStock(idx, parseInt(e.target.value) || 0)}
                      className={`${inputClass} flex-1`}
                      placeholder="Stock quantity"
                    />
                    <span className="text-[10px] text-zinc-400 w-10">
                      {s.stock === 0 ? "OOS" : "in stock"}
                    </span>
                  </div>
                ))}
              </div>
            </div>

          </div>

          {/* RIGHT — IMAGES */}
          <div className="space-y-6">

            {/* MAIN IMAGE */}
            <div>
              <p className="text-[10px] tracking-[0.4em] uppercase text-amber-700 font-medium mb-4">
                Main Image (Shop Grid)
              </p>
              <ImageUploadField
                value={form.image_url}
                onChange={(url) => setForm((f) => ({ ...f, image_url: url }))}
                placeholder="Upload from your device, or paste an image URL *"
              />
            </div>

            {/* EXTRA IMAGES */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] tracking-[0.4em] uppercase text-amber-700 font-medium">
                  Gallery Images (Product Page)
                </p>
                <button
                  onClick={addImageSlot}
                  className="flex items-center gap-1 text-[10px] tracking-widest uppercase text-zinc-500 hover:text-zinc-900 transition-colors"
                >
                  <Plus size={11} />
                  Add
                </button>
              </div>

              <div className="space-y-3">
                {images.map((url, idx) => (
                  <div key={idx} className="flex gap-2 items-start">
                    <div className="flex-1">
                      <ImageUploadField
                        value={url}
                        onChange={(v) => handleImageChange(idx, v)}
                        placeholder={`Image ${idx + 1} — upload or paste a URL`}
                        previewClassName="h-24"
                      />
                    </div>
                    <button
                      onClick={() => removeImageSlot(idx)}
                      className="mt-3 text-zinc-300 hover:text-red-500 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>

        {/* SUBMIT */}
        <div className="mt-10 border-t border-zinc-900/10 pt-8">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className={`w-full py-4 text-xs tracking-[0.3em] uppercase font-semibold rounded-xl transition-all duration-300 ${
              loading
                ? "bg-zinc-200 text-zinc-400 cursor-not-allowed"
                : "bg-zinc-900 text-white hover:bg-zinc-700 shadow-lg shadow-zinc-900/10"
            }`}
          >
            {loading ? "Adding Product..." : "Add Product to Shop"}
          </button>
          <p className="text-zinc-400 text-[10px] tracking-wide text-center mt-3">
            Product goes live instantly after adding
          </p>
        </div>

      </div>
    </div>
  );
}

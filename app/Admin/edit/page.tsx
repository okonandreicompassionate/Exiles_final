"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../lib/supabase";
import { Pencil, Trash2, Plus, CheckCircle, X, ChevronDown, ChevronUp } from "lucide-react";

const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD ?? "";

const ALL_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

const inputClass =
  "w-full bg-zinc-900 border border-zinc-800 text-white text-sm px-4 py-3 rounded-xl outline-none focus:border-zinc-600 transition-colors placeholder-zinc-600";

type Category = { id: string; name: string; slug: string };
type Variant = { id?: string; size: string; stock: number };
type ProductImage = { id?: string; image_url: string; position: number };

type Product = {
  id: string;
  name: string;
  description: string;
  price: number; // in kobo
  image_url: string;
  category_id: string;
  is_featured: boolean;
  variants: Variant[];
  product_images: ProductImage[];
};

export default function EditProductsPage() {
  const router = useRouter();

  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Record<string, Product>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  function handleLogin() {
    if (password === ADMIN_PASSWORD) setAuthed(true);
    else alert("Wrong password!");
  }

  useEffect(() => {
    if (authed) {
      fetchProducts();
      fetchCategories();
    }
  }, [authed]);

  async function fetchCategories() {
    const { data } = await supabase.from("categories").select("id, name, slug");
    setCategories(data ?? []);
  }

  async function fetchProducts() {
    const { data, error } = await supabase
      .from("products")
      .select(`
        id, name, description, price, image_url, category_id, is_featured,
        variants (id, size, stock),
        product_images (id, image_url, position)
      `)
      .order("created_at", { ascending: false });

    if (error) { alert("Failed to load products: " + error.message); return; }

    const parsed: Product[] = (data ?? []).map((p: any) => ({
      ...p,
      variants: (p.variants ?? []).sort(
        (a: Variant, b: Variant) => ALL_SIZES.indexOf(a.size) - ALL_SIZES.indexOf(b.size)
      ),
      product_images: (p.product_images ?? []).sort(
        (a: ProductImage, b: ProductImage) => a.position - b.position
      ),
    }));

    setProducts(parsed);

    // seed editData
    const seed: Record<string, Product> = {};
    parsed.forEach((p) => { seed[p.id] = JSON.parse(JSON.stringify(p)); });
    setEditData(seed);
  }

  function toggleExpand(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  function updateField(id: string, field: keyof Product, value: any) {
    setEditData((prev) => ({ ...prev, [id]: { ...prev[id], [field]: value } }));
  }

  function updateVariantStock(productId: string, idx: number, stock: number) {
    const variants = [...editData[productId].variants];
    variants[idx] = { ...variants[idx], stock };
    updateField(productId, "variants", variants);
  }

  function toggleVariantSize(productId: string, size: string) {
    const variants = editData[productId].variants;
    const exists = variants.find((v) => v.size === size);
    const updated = exists
      ? variants.filter((v) => v.size !== size)
      : [...variants, { size, stock: 0 }].sort(
          (a, b) => ALL_SIZES.indexOf(a.size) - ALL_SIZES.indexOf(b.size)
        );
    updateField(productId, "variants", updated);
  }

  function updateImageUrl(productId: string, idx: number, url: string) {
    const images = [...editData[productId].product_images];
    images[idx] = { ...images[idx], image_url: url };
    updateField(productId, "product_images", images);
  }

  function addImageSlot(productId: string) {
    const images = editData[productId].product_images;
    updateField(productId, "product_images", [
      ...images,
      { image_url: "", position: images.length },
    ]);
  }

  function removeImageSlot(productId: string, idx: number) {
    const images = editData[productId].product_images.filter((_, i) => i !== idx);
    updateField(productId, "product_images", images);
  }

  async function handleSave(id: string) {
    const p = editData[id];
    setSaving(id);

    try {
      const priceInKobo = Math.round(parseFloat(String(p.price / 100)) * 100);

      // Update product
      const { error: pErr } = await supabase
        .from("products")
        .update({
          name: p.name,
          description: p.description,
          price: p.price,
          image_url: p.image_url,
          category_id: p.category_id,
          is_featured: p.is_featured,
        })
        .eq("id", id);
      if (pErr) throw new Error(pErr.message);

      // Delete old variants, reinsert
      await supabase.from("variants").delete().eq("product_id", id);
      if (p.variants.length > 0) {
        const { error: vErr } = await supabase.from("variants").insert(
          p.variants.map((v) => ({ product_id: id, size: v.size, stock: v.stock }))
        );
        if (vErr) throw new Error(vErr.message);
      }

      // Delete old images, reinsert
      await supabase.from("product_images").delete().eq("product_id", id);
      const validImages = p.product_images.filter((img) => img.image_url.trim() !== "");
      if (validImages.length > 0) {
        const { error: iErr } = await supabase.from("product_images").insert(
          validImages.map((img, idx) => ({
            product_id: id,
            image_url: img.image_url.trim(),
            position: idx,
          }))
        );
        if (iErr) throw new Error(iErr.message);
      }

      setSaved(id);
      setTimeout(() => setSaved(null), 3000);
      await fetchProducts();
    } catch (err: any) {
      alert("Save failed: " + err.message);
    }

    setSaving(null);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this product? This cannot be undone.")) return;
    setDeleting(id);
    await supabase.from("variants").delete().eq("product_id", id);
    await supabase.from("product_images").delete().eq("product_id", id);
    await supabase.from("products").delete().eq("id", id);
    setDeleting(null);
    await fetchProducts();
  }

  // ── LOGIN ──
  if (!authed) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center">
            <h1 className="font-bold tracking-[0.4em] text-sm uppercase mb-2">EXILES</h1>
            <p className="text-zinc-600 text-xs tracking-widest uppercase">Admin Access</p>
          </div>
          <div className="space-y-3">
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className={inputClass}
            />
            <button
              onClick={handleLogin}
              className="w-full py-3.5 bg-white text-zinc-950 text-xs tracking-[0.25em] uppercase font-semibold rounded-xl hover:bg-zinc-100 transition-colors"
            >
              Enter
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── MAIN ──
  return (
    <div className="min-h-screen bg-zinc-950 text-white">

      {/* NAV */}
      <nav className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/60">
        <div className="max-w-4xl mx-auto px-4 sm:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-6">
            <h1 className="font-bold tracking-[0.4em] text-sm uppercase">EXILES Admin</h1>
            <span className="text-zinc-700 text-xs">|</span>
            <span className="text-zinc-400 text-xs tracking-widest uppercase">Edit Products</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/admin")}
              className="text-xs tracking-widest uppercase text-zinc-500 hover:text-white transition-colors"
            >
              + Add New
            </button>
            <button
              onClick={() => router.push("/")}
              className="text-xs tracking-widest uppercase text-zinc-500 hover:text-white transition-colors"
            >
              View Shop
            </button>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-10 pb-24 space-y-3">

        <p className="text-[10px] tracking-[0.4em] uppercase text-zinc-600 mb-6">
          {products.length} product{products.length !== 1 ? "s" : ""} — click to expand and edit
        </p>

        {products.map((product) => {
          const ed = editData[product.id];
          const isOpen = expandedId === product.id;
          if (!ed) return null;

          return (
            <div
              key={product.id}
              className="border border-zinc-800/60 rounded-2xl overflow-hidden bg-zinc-900/30"
            >
              {/* ROW HEADER */}
              <div
                className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-zinc-800/20 transition-colors"
                onClick={() => toggleExpand(product.id)}
              >
                {/* Thumbnail */}
                <div className="w-12 h-12 rounded-lg overflow-hidden bg-zinc-800 flex-shrink-0">
                  {product.image_url && (
                    <img
                      src={product.image_url}
                      alt={product.name}
                      className="w-full h-full object-cover"
                    />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white font-medium truncate">{product.name}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    ₦{(product.price / 100).toLocaleString()} &nbsp;·&nbsp;{" "}
                    {product.variants.length} size{product.variants.length !== 1 ? "s" : ""}
                    {product.is_featured && (
                      <span className="ml-2 text-[10px] bg-white/10 text-zinc-300 px-2 py-0.5 rounded-full">
                        New Arrival
                      </span>
                    )}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {saved === product.id && (
                    <span className="flex items-center gap-1 text-green-400 text-[10px]">
                      <CheckCircle size={12} /> Saved
                    </span>
                  )}
                  <button
                    onClick={() => handleDelete(product.id)}
                    disabled={deleting === product.id}
                    className="p-2 text-zinc-700 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                {isOpen ? (
                  <ChevronUp size={16} className="text-zinc-600 flex-shrink-0" />
                ) : (
                  <ChevronDown size={16} className="text-zinc-600 flex-shrink-0" />
                )}
              </div>

              {/* EXPANDED EDIT FORM */}
              {isOpen && (
                <div className="border-t border-zinc-800/60 px-5 py-6 space-y-6">

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                    {/* LEFT */}
                    <div className="space-y-4">

                      {/* Basic fields */}
                      <div>
                        <p className="text-[10px] tracking-[0.4em] uppercase text-zinc-500 mb-3">
                          Product Info
                        </p>
                        <div className="space-y-3">
                          <input
                            type="text"
                            placeholder="Product Name *"
                            value={ed.name}
                            onChange={(e) => updateField(product.id, "name", e.target.value)}
                            className={inputClass}
                          />
                          <textarea
                            placeholder="Description"
                            value={ed.description}
                            onChange={(e) => updateField(product.id, "description", e.target.value)}
                            rows={3}
                            className={`${inputClass} resize-none`}
                          />
                          <div className="grid grid-cols-2 gap-3">
                            {/* Price — display in naira, store in kobo */}
                            <div className="relative">
                              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">₦</span>
                              <input
                                type="number"
                                placeholder="Price"
                                value={ed.price / 100}
                                onChange={(e) =>
                                  updateField(
                                    product.id,
                                    "price",
                                    Math.round(parseFloat(e.target.value || "0") * 100)
                                  )
                                }
                                className={`${inputClass} pl-8`}
                              />
                            </div>
                            <select
                              value={ed.category_id}
                              onChange={(e) => updateField(product.id, "category_id", e.target.value)}
                              className={inputClass}
                            >
                              <option value="">Category</option>
                              {categories.map((cat) => (
                                <option key={cat.id} value={cat.id}>{cat.name}</option>
                              ))}
                            </select>
                          </div>

                          {/* Featured toggle */}
                          <label className="flex items-center gap-3 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl cursor-pointer hover:border-zinc-700 transition-colors">
                            <div
                              className={`w-10 h-5 rounded-full transition-colors relative ${ed.is_featured ? "bg-white" : "bg-zinc-700"}`}
                            >
                              <div
                                className={`absolute top-0.5 w-4 h-4 bg-zinc-950 rounded-full transition-all ${ed.is_featured ? "left-5" : "left-0.5"}`}
                              />
                            </div>
                            <div>
                              <p className="text-xs text-white">Mark as New Arrival</p>
                              <p className="text-[10px] text-zinc-600">Shows "New" badge on product card</p>
                            </div>
                            <input
                              type="checkbox"
                              checked={ed.is_featured}
                              onChange={(e) => updateField(product.id, "is_featured", e.target.checked)}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>

                      {/* Sizes & Stock */}
                      <div>
                        <p className="text-[10px] tracking-[0.4em] uppercase text-zinc-500 mb-3">
                          Sizes & Stock
                        </p>
                        <div className="flex gap-2 flex-wrap mb-3">
                          {ALL_SIZES.map((size) => {
                            const active = ed.variants.find((v) => v.size === size);
                            return (
                              <button
                                key={size}
                                onClick={() => toggleVariantSize(product.id, size)}
                                className={`w-12 h-12 rounded-xl text-xs font-medium transition-all border ${
                                  active
                                    ? "bg-white text-zinc-950 border-white"
                                    : "bg-zinc-900 text-zinc-500 border-zinc-800 hover:border-zinc-600"
                                }`}
                              >
                                {size}
                              </button>
                            );
                          })}
                        </div>
                        <div className="space-y-2">
                          {ed.variants.map((v, idx) => (
                            <div key={v.size} className="flex items-center gap-3">
                              <span className="text-xs text-zinc-400 w-8 text-center font-medium">{v.size}</span>
                              <input
                                type="number"
                                min={0}
                                value={v.stock}
                                onChange={(e) =>
                                  updateVariantStock(product.id, idx, parseInt(e.target.value) || 0)
                                }
                                className={`${inputClass} flex-1`}
                                placeholder="Stock"
                              />
                              <span className="text-[10px] text-zinc-600 w-10">
                                {v.stock === 0 ? "OOS" : "in stock"}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* RIGHT — Images */}
                    <div className="space-y-4">
                      {/* Main image */}
                      <div>
                        <p className="text-[10px] tracking-[0.4em] uppercase text-zinc-500 mb-3">
                          Main Image
                        </p>
                        <input
                          type="text"
                          placeholder="https://... main image URL"
                          value={ed.image_url}
                          onChange={(e) => updateField(product.id, "image_url", e.target.value)}
                          className={inputClass}
                        />
                        {ed.image_url && (
                          <div className="mt-3 h-40 rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800">
                            <img
                              src={ed.image_url}
                              alt="Preview"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                      </div>

                      {/* Gallery images */}
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-[10px] tracking-[0.4em] uppercase text-zinc-500">
                            Gallery Images
                          </p>
                          <button
                            onClick={() => addImageSlot(product.id)}
                            className="flex items-center gap-1 text-[10px] tracking-widest uppercase text-zinc-500 hover:text-white transition-colors"
                          >
                            <Plus size={11} /> Add
                          </button>
                        </div>
                        <div className="space-y-2">
                          {ed.product_images.map((img, idx) => (
                            <div key={idx} className="flex gap-2 items-start">
                              <div className="flex-1 space-y-1">
                                <input
                                  type="text"
                                  placeholder={`Image ${idx + 1} URL`}
                                  value={img.image_url}
                                  onChange={(e) => updateImageUrl(product.id, idx, e.target.value)}
                                  className={inputClass}
                                />
                                {img.image_url && (
                                  <div className="h-20 rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800">
                                    <img
                                      src={img.image_url}
                                      alt=""
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                )}
                              </div>
                              <button
                                onClick={() => removeImageSlot(product.id, idx)}
                                className="mt-3 text-zinc-700 hover:text-red-400 transition-colors"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* SAVE BUTTON */}
                  <div className="pt-4 border-t border-zinc-800/60">
                    <button
                      onClick={() => handleSave(product.id)}
                      disabled={saving === product.id}
                      className={`w-full py-4 text-xs tracking-[0.3em] uppercase font-semibold rounded-xl transition-all duration-300 ${
                        saving === product.id
                          ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                          : "bg-white text-zinc-950 hover:bg-zinc-100 shadow-lg shadow-white/5"
                      }`}
                    >
                      {saving === product.id ? "Saving..." : "Save Changes"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
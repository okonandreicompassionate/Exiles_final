"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../lib/supabase";
import { Plus, Trash2, Upload, CheckCircle } from "lucide-react";
const ADMIN_PASSWORD = process.env.NEXT_PUBLIC_ADMIN_PASSWORD ?? "";

type Category = { id: string; name: string; slug: string };

type SizeRow = { size: string; stock: number };

const ALL_SIZES = ["XS", "S", "M", "L", "XL", "XXL"];

const inputClass = "w-full bg-zinc-900 border border-zinc-800 text-white text-sm px-4 py-3 rounded-xl outline-none focus:border-zinc-600 transition-colors placeholder-zinc-600";

export default function AdminPage() {
  const router = useRouter();

  const [authed, setAuthed] = useState(false);
  const [password, setPassword] = useState("");
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

  useEffect(() => {
    if (authed) fetchCategories();
  }, [authed]);

  async function fetchCategories() {
    const { data } = await supabase.from("categories").select("id, name, slug");
    setCategories(data ?? []);
  }

  function handleLogin() {
    if (password === ADMIN_PASSWORD) {
      setAuthed(true);
    } else {
      alert("Wrong password!");
    }
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
    if (!form.name || !form.price || !form.image_url || !form.category_id) {
      alert("Fill in all required fields!");
      return;
    }

    if (sizes.length === 0) {
      alert("Add at least one size!");
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
        alert("Failed to add product: " + productError?.message);
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
        alert("Failed to add variants: " + variantError.message);
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
          alert("Failed to add images: " + imageError.message);
          setLoading(false);
          return;
        }
      }

      setSuccess(true);
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
      alert("Something went wrong!");
    }

    setLoading(false);
  }

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

  return (
    <div className="min-h-screen bg-zinc-950 text-white">

      {/* NAV */}
      <nav className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/60">
        <div className="max-w-4xl mx-auto px-4 sm:px-8 py-4 flex items-center justify-between">
          <h1 className="font-bold tracking-[0.4em] text-sm uppercase">EXILES Admin</h1>
          <button
            onClick={() => router.push("/")}
            className="text-xs tracking-widest uppercase text-zinc-500 hover:text-white transition-colors"
          >
            View Shop
          </button>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 sm:px-8 py-10 pb-24">

        {/* SUCCESS BANNER */}
        {success && (
          <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/20 text-green-400 px-4 py-3 rounded-xl mb-6 text-sm">
            <CheckCircle size={16} />
            Product added successfully! It's live on your shop now.
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

          {/* LEFT — BASIC INFO */}
          <div className="space-y-6">

            {/* PRODUCT INFO */}
            <div>
              <p className="text-[10px] tracking-[0.4em] uppercase text-zinc-500 mb-4">
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
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-500 text-sm">₦</span>
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
                <label className="flex items-center gap-3 px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-xl cursor-pointer hover:border-zinc-700 transition-colors">
                  <div className={`w-10 h-5 rounded-full transition-colors relative ${form.is_featured ? "bg-white" : "bg-zinc-700"}`}>
                    <div className={`absolute top-0.5 w-4 h-4 bg-zinc-950 rounded-full transition-all ${form.is_featured ? "left-5" : "left-0.5"}`} />
                  </div>
                  <div>
                    <p className="text-xs text-white">Mark as New Arrival</p>
                    <p className="text-[10px] text-zinc-600">Shows "New" badge on product card</p>
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
              <p className="text-[10px] tracking-[0.4em] uppercase text-zinc-500 mb-4">
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

              {/* STOCK INPUTS */}
              <div className="space-y-2">
                {sizes.map((s, idx) => (
                  <div key={s.size} className="flex items-center gap-3">
                    <span className="text-xs text-zinc-400 w-8 text-center font-medium">{s.size}</span>
                    <input
                      type="number"
                      min={0}
                      value={s.stock}
                      onChange={(e) => handleSizeStock(idx, parseInt(e.target.value) || 0)}
                      className={`${inputClass} flex-1`}
                      placeholder="Stock quantity"
                    />
                    <span className="text-[10px] text-zinc-600 w-10">
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
              <p className="text-[10px] tracking-[0.4em] uppercase text-zinc-500 mb-4">
                Main Image (Shop Grid)
              </p>
              <input
                type="text"
                name="image_url"
                placeholder="https://... paste image URL *"
                value={form.image_url}
                onChange={handleFormChange}
                className={inputClass}
              />
              {form.image_url && (
                <div className="mt-3 aspect-[3/4] rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800">
                  <img
                    src={form.image_url}
                    alt="Preview"
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).style.display = "none";
                    }}
                  />
                </div>
              )}
            </div>

            {/* EXTRA IMAGES */}
            <div>
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] tracking-[0.4em] uppercase text-zinc-500">
                  Gallery Images (Product Page)
                </p>
                <button
                  onClick={addImageSlot}
                  className="flex items-center gap-1 text-[10px] tracking-widest uppercase text-zinc-500 hover:text-white transition-colors"
                >
                  <Plus size={11} />
                  Add
                </button>
              </div>

              <div className="space-y-3">
                {images.map((url, idx) => (
                  <div key={idx} className="flex gap-2 items-start">
                    <div className="flex-1 space-y-2">
                      <input
                        type="text"
                        placeholder={`Image ${idx + 1} URL`}
                        value={url}
                        onChange={(e) => handleImageChange(idx, e.target.value)}
                        className={inputClass}
                      />
                      {url && (
                        <div className="h-24 rounded-xl overflow-hidden bg-zinc-900 border border-zinc-800">
                          <img
                            src={url}
                            alt={`Preview ${idx + 1}`}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = "none";
                            }}
                          />
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => removeImageSlot(idx)}
                      className="mt-3 text-zinc-700 hover:text-red-400 transition-colors"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>

              {/* IMGUR TIP */}
              <div className="mt-4 px-4 py-3 bg-zinc-900/60 rounded-xl border border-zinc-800/40">
                <p className="text-[10px] text-zinc-500 leading-relaxed">
                  💡 Upload photos at <span className="text-zinc-300">imgur.com</span> → right click image → Copy Image Address → paste above
                </p>
              </div>
            </div>

          </div>
        </div>

        {/* SUBMIT */}
        <div className="mt-10 border-t border-zinc-800/60 pt-8">
          <button
            onClick={handleSubmit}
            disabled={loading}
            className={`w-full py-4 text-xs tracking-[0.3em] uppercase font-semibold rounded-xl transition-all duration-300 ${
              loading
                ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                : "bg-white text-zinc-950 hover:bg-zinc-100 shadow-lg shadow-white/5"
            }`}
          >
            {loading ? "Adding Product..." : "Add Product to Shop"}
          </button>
          <p className="text-zinc-700 text-[10px] tracking-wide text-center mt-3">
            Product goes live instantly after adding
          </p>
        </div>

      </div>
    </div>
  );
}
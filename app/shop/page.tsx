"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useCart } from "../components/cartProvider";
import { supabase } from "../../lib/supabase";
import { ShoppingCart, ChevronDown } from "lucide-react";

type Variant = {
  id: string;
  size: string;
  stock: number;
};

type Category = {
  name: string;
};

type Product = {
  id: string;
  name: string;
  image_url: string;
  is_featured: boolean;
  price: number;
  category_id: string;
  categories: Category[] | null;
  variants: Variant[];
};

const CATEGORIES = [
  { name: "ALL", label: "All", emoji: "🖤" },
  { name: "NEW", label: "New Arrivals", emoji: "✦" },
  { name: "Hoodies", label: "Hoodies", emoji: "🧥" },
  { name: "Jackets", label: "Jackets", emoji: "🪡" },
  { name: "Tees", label: "T-Shirts", emoji: "👕" },
  { name: "Trousers", label: "Trousers", emoji: "👖" },
  { name: "Accessories", label: "Accessories", emoji: "🧣" },
];

export default function LandingPage() {
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [addedId, setAddedId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { addToCart, cartItems } = useCart();

  useEffect(() => {
    async function fetchProducts() {
      const { data, error } = await supabase
        .from("products")
        .select(`
          id,
          name,
          image_url,
          is_featured,
          price,
          category_id,
          categories ( name ),
          variants ( id, size, stock )
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching products:", error.message);
        setLoading(false);
        return;
      }

      setProducts(data ?? []);
      setLoading(false);
    }

    fetchProducts();
  }, []);

  const filteredProducts =
    activeFilter === "ALL"
      ? products
      : activeFilter === "NEW"
      ? products.filter((p) => p.is_featured)
      : products.filter((p) => p.categories?.[0]?.name === activeFilter);

  const handleQuickAdd = (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();

    const defaultVariant = product.variants[0];
    if (!defaultVariant) return;

    addToCart({
      id: defaultVariant.id,
      product_id: product.id,
      name: product.name,
      image_url: product.image_url,
      size: defaultVariant.size,
      price: product.price,
      quantity: 1,
    });

    setAddedId(product.id);
    setTimeout(() => setAddedId(null), 1500);
  };

  return (
    <div className="bg-zinc-950 min-h-screen text-white">

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/60">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-4 flex items-center">
          {/* LEFT NAV */}
          <div className="hidden md:flex gap-8 text-xs tracking-[0.2em] uppercase flex-1">
            <button onClick={() => setActiveFilter("NEW")} className={`transition-colors ${activeFilter === "NEW" ? "text-white" : "text-zinc-500 hover:text-zinc-200"}`}>New</button>
            <button onClick={() => setActiveFilter("Hoodies")} className={`transition-colors ${activeFilter === "Hoodies" ? "text-white" : "text-zinc-500 hover:text-zinc-200"}`}>Hoodies</button>
            <button onClick={() => setActiveFilter("Jackets")} className={`transition-colors ${activeFilter === "Jackets" ? "text-white" : "text-zinc-500 hover:text-zinc-200"}`}>Jackets</button>
          </div>

          {/* LOGO */}
          <h1 className="font-bold tracking-[0.5em] text-sm uppercase flex-1 text-center">
            EXILES
          </h1>

          {/* RIGHT NAV */}
          <div className="flex items-center justify-end flex-1">
            <Link href="/cart" className="relative flex items-center gap-2 text-zinc-400 hover:text-white transition-colors">
              <ShoppingCart size={18} strokeWidth={1.5} />
              {cartItems.length > 0 && (
                <span className="absolute -top-2 -right-2 w-4 h-4 bg-white text-black text-[10px] rounded-full flex items-center justify-center font-bold">
                  {cartItems.length}
                </span>
              )}
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <div className="relative w-full h-screen overflow-hidden">
        <img
          src="https://images.unsplash.com/photo-1618354691438-25bc04584c23"
          alt="Hero"
          className="w-full h-full object-cover object-top"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/50 via-transparent to-zinc-950" />
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/30 to-transparent" />

        {/* HERO TEXT */}
        <div className="absolute bottom-32 left-8 sm:left-16">
          <p className="text-[10px] tracking-[0.5em] uppercase text-zinc-400 mb-4">
            Limited Edition Styles
          </p>
          <h2 className="text-5xl sm:text-7xl font-light leading-none tracking-tight text-white">
            Exile<br />
            <span className="font-semibold">Culture</span>
          </h2>
          <p className="text-[10px] tracking-[0.4em] uppercase text-zinc-400 mt-5">
            Designed to Stand Out
          </p>
        </div>

        {/* SCROLL INDICATOR */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <p className="text-[9px] tracking-[0.4em] uppercase text-zinc-600">Scroll</p>
          <div className="w-7 h-7 rounded-full border border-zinc-700 flex items-center justify-center animate-bounce">
            <ChevronDown size={12} className="text-zinc-400" />
          </div>
        </div>

        {/* HERO DOTS */}
        <div className="absolute bottom-12 left-8 sm:left-16 flex gap-1.5 items-center">
          <div className="w-5 h-0.5 bg-white rounded-full" />
          <div className="w-1.5 h-0.5 bg-zinc-600 rounded-full" />
          <div className="w-1.5 h-0.5 bg-zinc-600 rounded-full" />
        </div>
      </div>

      {/* SHOP BY CATEGORY */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 pt-16 pb-8">
        <p className="text-[10px] tracking-[0.4em] uppercase text-zinc-500 mb-6">
          Shop by Category
        </p>
        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.name}
              onClick={() => setActiveFilter(cat.name)}
              className={`flex flex-col items-center gap-2.5 p-3 sm:p-4 rounded-2xl border transition-all duration-300 ${
                activeFilter === cat.name
                  ? "border-zinc-600 bg-zinc-800 text-white shadow-lg shadow-black/20"
                  : "border-zinc-800/60 bg-zinc-900/60 text-zinc-500 hover:border-zinc-700 hover:text-zinc-300 hover:bg-zinc-800/60"
              }`}
            >
              <span className="text-xl sm:text-2xl">{cat.emoji}</span>
              <span className="text-[9px] sm:text-[10px] tracking-[0.1em] uppercase text-center leading-tight">
                {cat.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* DIVIDER */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-4">
        <div className="border-t border-zinc-800/60" />
      </div>

      {/* PRODUCTS SECTION */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-8 pb-20">

        {/* SECTION HEADER */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-xs tracking-[0.3em] uppercase text-zinc-300">
              {activeFilter === "ALL" ? "All Products" : activeFilter === "NEW" ? "New Arrivals" : activeFilter}
            </h2>
            <p className="text-[10px] text-zinc-600 mt-1 tracking-wider">
              {filteredProducts.length} {filteredProducts.length === 1 ? "item" : "items"}
            </p>
          </div>

          {/* FILTER */}
          <div className="relative">
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              className="appearance-none bg-zinc-900 border border-zinc-800 text-zinc-300 text-[10px] tracking-widest uppercase px-4 py-2 pr-8 outline-none cursor-pointer rounded-xl transition-colors hover:border-zinc-700"
            >
              <option value="ALL">All</option>
              <option value="NEW">New</option>
              <option value="Hoodies">Hoodies</option>
              <option value="Jackets">Jackets</option>
            </select>
            <ChevronDown size={11} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          </div>
        </div>

        {/* SKELETON */}
        {loading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-zinc-900/80 rounded-2xl overflow-hidden animate-pulse">
                <div className="aspect-[3/4] bg-zinc-800" />
                <div className="p-4 space-y-2.5">
                  <div className="h-2.5 bg-zinc-800 rounded-full w-3/4" />
                  <div className="h-2.5 bg-zinc-800 rounded-full w-1/3" />
                  <div className="h-8 bg-zinc-800 rounded-xl mt-3" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PRODUCT GRID */}
        {!loading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="group bg-zinc-900/80 rounded-2xl overflow-hidden border border-zinc-800/40 hover:border-zinc-700/60 transition-all duration-500 hover:shadow-xl hover:shadow-black/30 flex flex-col"
              >
                {/* IMAGE */}
                <div className="aspect-[3/4] overflow-hidden bg-zinc-800 relative">
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  />
                  {/* GRADIENT OVERLAY */}
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  {/* NEW BADGE */}
                  {product.is_featured && (
                    <span className="absolute top-3 left-3 text-[9px] uppercase tracking-widest text-white bg-zinc-900/80 backdrop-blur-md px-2.5 py-1 rounded-full border border-zinc-700/50">
                      New
                    </span>
                  )}
                </div>

                {/* INFO */}
                <div className="p-3 sm:p-4 flex flex-col flex-grow gap-2.5">
                  <div>
                    <p className="text-xs sm:text-sm text-zinc-100 font-medium truncate leading-snug">
                      {product.name}
                    </p>
                    <p className="text-[10px] text-zinc-600 mt-0.5 tracking-wide">
                      {product.categories?.[0]?.name ?? "EXILES"}
                    </p>
                  </div>

                  <p className="text-sm font-semibold text-white">
                    ₦{(product.price / 100).toLocaleString()}
                  </p>

                  {/* SIZE PILLS */}
                  <div className="flex gap-1 flex-wrap">
                    {product.variants.slice(0, 4).map((v) => (
                      <span key={v.id} className={`text-[9px] px-1.5 py-0.5 rounded-md border tracking-wide ${v.stock === 0 ? "border-zinc-800 text-zinc-700" : "border-zinc-700 text-zinc-400"}`}>
                        {v.size}
                      </span>
                    ))}
                  </div>

                  {/* BUTTONS */}
                  <div className="flex gap-2 mt-auto pt-1">
                    <Link
                      href={`/product/${product.id}`}
                      className="flex-1 py-2 text-[10px] tracking-widest uppercase text-center border border-zinc-700 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200 transition-all duration-300 rounded-xl"
                    >
                      Details
                    </Link>
                    <button
                      onClick={(e) => handleQuickAdd(e, product)}
                      className={`flex-1 py-2 text-[10px] tracking-widest uppercase font-semibold rounded-xl transition-all duration-300 ${
                        addedId === product.id
                          ? "bg-white text-zinc-950"
                          : "bg-zinc-800 text-zinc-200 hover:bg-zinc-700"
                      }`}
                    >
                      {addedId === product.id ? "Added ✓" : "Add"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* EMPTY STATE */}
        {!loading && filteredProducts.length === 0 && (
          <div className="flex flex-col items-center justify-center h-64 gap-4">
            <p className="text-zinc-700 text-[10px] tracking-[0.3em] uppercase">
              No products in this category yet
            </p>
            <button
              onClick={() => setActiveFilter("ALL")}
              className="text-[10px] tracking-widest uppercase text-zinc-400 border border-zinc-800 px-6 py-2.5 rounded-xl hover:border-zinc-600 hover:text-white transition-all"
            >
              View All
            </button>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <footer className="bg-zinc-900/50 text-white border-t border-zinc-800/60">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-12 sm:py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2 md:col-span-1">
              <h2 className="font-bold tracking-[0.5em] text-sm mb-4">EXILES</h2>
              <p className="text-xs text-zinc-600 leading-relaxed">
                Clean silhouettes. Premium everyday wear built for presence.
              </p>
            </div>
            <div>
              <p className="text-[10px] tracking-[0.3em] uppercase text-zinc-500 mb-4">Shop</p>
              <ul className="space-y-2.5 text-xs text-zinc-600">
                <li onClick={() => setActiveFilter("NEW")} className="hover:text-zinc-300 cursor-pointer transition-colors">New Arrivals</li>
                <li onClick={() => setActiveFilter("Hoodies")} className="hover:text-zinc-300 cursor-pointer transition-colors">Hoodies</li>
                <li onClick={() => setActiveFilter("Jackets")} className="hover:text-zinc-300 cursor-pointer transition-colors">Jackets</li>
              </ul>
            </div>
            <div>
              <p className="text-[10px] tracking-[0.3em] uppercase text-zinc-500 mb-4">Support</p>
              <ul className="space-y-2.5 text-xs text-zinc-600">
                <li className="hover:text-zinc-300 cursor-pointer transition-colors">Contact</li>
                <li className="hover:text-zinc-300 cursor-pointer transition-colors">Shipping</li>
                <li className="hover:text-zinc-300 cursor-pointer transition-colors">Returns</li>
              </ul>
            </div>
            <div className="col-span-2 md:col-span-1">
              <p className="text-[10px] tracking-[0.3em] uppercase text-zinc-500 mb-4">Stay Updated</p>
              <p className="text-xs text-zinc-600 mb-4 leading-relaxed">Get early access to drops.</p>
              <div className="flex border border-zinc-800 rounded-xl overflow-hidden bg-zinc-900/60">
                <input
                  type="email"
                  placeholder="Email address"
                  className="flex-1 px-4 py-2.5 outline-none text-xs bg-transparent text-white placeholder-zinc-700"
                />
                <button className="bg-zinc-700 text-white px-4 text-[10px] uppercase tracking-widest font-medium hover:bg-zinc-600 transition-colors">
                  Join
                </button>
              </div>
            </div>
          </div>
          <div className="border-t border-zinc-800/60 mt-12 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] text-zinc-700 tracking-widest uppercase">
            <p>© {new Date().getFullYear()} EXILES. All rights reserved.</p>
            <div className="flex gap-6">
              <span className="hover:text-zinc-400 cursor-pointer transition-colors">Instagram</span>
              <span className="hover:text-zinc-400 cursor-pointer transition-colors">Twitter</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
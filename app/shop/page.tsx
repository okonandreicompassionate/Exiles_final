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
    <div className="bg-black min-h-screen text-white">

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/60 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-4 flex justify-between items-center">
          {/* LEFT NAV */}
          <div className="hidden md:flex gap-8 text-xs tracking-[0.2em] uppercase">
            <button onClick={() => setActiveFilter("NEW")} className={`transition ${activeFilter === "NEW" ? "text-white" : "text-zinc-500 hover:text-white"}`}>New</button>
            <button onClick={() => setActiveFilter("Hoodies")} className={`transition ${activeFilter === "Hoodies" ? "text-white" : "text-zinc-500 hover:text-white"}`}>Hoodies</button>
            <button onClick={() => setActiveFilter("Jackets")} className={`transition ${activeFilter === "Jackets" ? "text-white" : "text-zinc-500 hover:text-white"}`}>Jackets</button>
          </div>

          {/* LOGO */}
          <h1 className="font-bold tracking-[0.5em] text-sm uppercase absolute left-1/2 -translate-x-1/2">
            EXILES
          </h1>

          {/* RIGHT NAV */}
          <div className="flex items-center gap-6 ml-auto">
            <Link href="/cart" className="relative flex items-center gap-2 text-zinc-400 hover:text-white transition">
              <ShoppingCart size={18} />
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
          className="w-full h-full object-cover object-top scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black" />

        {/* HERO TEXT */}
        <div className="absolute bottom-32 left-8 sm:left-16">
          <p className="text-xs tracking-[0.4em] uppercase text-zinc-400 mb-3">
            Limited Edition Styles
          </p>
          <h2 className="text-5xl sm:text-7xl font-semibold leading-none tracking-tight">
            Exile<br />Culture
          </h2>
          <p className="text-xs tracking-[0.3em] uppercase text-zinc-400 mt-4">
            Designed to Stand Out
          </p>
        </div>

        {/* SCROLL INDICATOR */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <p className="text-[10px] tracking-[0.3em] uppercase text-zinc-500">Scroll</p>
          <div className="w-8 h-8 rounded-full border border-white/30 flex items-center justify-center animate-bounce">
            <ChevronDown size={14} className="text-white" />
          </div>
        </div>

        {/* HERO DOTS */}
        <div className="absolute bottom-10 left-8 sm:left-16 flex gap-2">
          <div className="w-6 h-1 bg-white rounded-full" />
          <div className="w-2 h-1 bg-white/30 rounded-full" />
          <div className="w-2 h-1 bg-white/30 rounded-full" />
        </div>
      </div>

      {/* SHOP BY CATEGORY */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-16">
        <h2 className="text-sm tracking-[0.3em] uppercase text-zinc-400 mb-8">
          Shop by Category
        </h2>
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-7 gap-3">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.name}
              onClick={() => setActiveFilter(cat.name)}
              className={`flex flex-col items-center gap-3 p-4 rounded-xl border transition-all duration-300 ${
                activeFilter === cat.name
                  ? "border-white bg-white/10 text-white"
                  : "border-white/10 bg-zinc-900 text-zinc-400 hover:border-white/30 hover:text-white"
              }`}
            >
              <span className="text-2xl">{cat.emoji}</span>
              <span className="text-[10px] tracking-[0.15em] uppercase text-center leading-tight">
                {cat.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* DIVIDER */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8">
        <div className="border-t border-white/10" />
      </div>

      {/* PRODUCTS SECTION */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-12">

        {/* SECTION HEADER */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-sm tracking-[0.3em] uppercase text-white">
              {activeFilter === "ALL" ? "All Products" : activeFilter === "NEW" ? "New Arrivals" : activeFilter}
            </h2>
            <p className="text-xs text-zinc-600 mt-1">
              {filteredProducts.length} {filteredProducts.length === 1 ? "item" : "items"}
            </p>
          </div>

          {/* FILTER DROPDOWN */}
          <div className="relative">
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              className="appearance-none bg-zinc-900 border border-white/10 text-white text-xs tracking-widest uppercase px-4 py-2 pr-8 outline-none cursor-pointer rounded-lg"
            >
              <option value="ALL">All</option>
              <option value="NEW">New</option>
              <option value="Hoodies">Hoodies</option>
              <option value="Jackets">Jackets</option>
            </select>
            <ChevronDown size={12} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          </div>
        </div>

        {/* SKELETON */}
        {loading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="bg-zinc-900 rounded-xl border border-zinc-800 animate-pulse">
                <div className="aspect-[3/4] rounded-t-xl bg-zinc-800" />
                <div className="p-4 space-y-2">
                  <div className="h-3 bg-zinc-800 rounded w-3/4" />
                  <div className="h-3 bg-zinc-800 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PRODUCT GRID */}
        {!loading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
            {filteredProducts.map((product) => (
              <div
                key={product.id}
                className="group bg-zinc-900 rounded-xl border border-transparent hover:border-zinc-700 transition-all duration-300 overflow-hidden flex flex-col"
              >
                {/* IMAGE */}
                <div className="aspect-[3/4] overflow-hidden bg-zinc-800 relative">
                  <img
                    src={product.image_url}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  />
                  {product.is_featured && (
                    <span className="absolute top-3 left-3 text-[10px] uppercase tracking-widest text-white bg-black/70 backdrop-blur-sm px-2 py-1 rounded-full border border-white/20">
                      New
                    </span>
                  )}
                </div>

                {/* INFO */}
                <div className="p-4 flex flex-col flex-grow gap-3">
                  <div>
                    <p className="text-sm text-white font-medium truncate">
                      {product.name}
                    </p>
                    <p className="text-xs text-zinc-500 mt-0.5">
                      {product.categories?.[0]?.name ?? "EXILES"}
                    </p>
                  </div>

                  <p className="font-semibold text-sm text-white">
                    ₦{(product.price / 100).toLocaleString()}
                  </p>

                  {/* BUTTONS */}
                  <div className="flex flex-col gap-2 mt-auto">
                    <Link
                      href={`/product/${product.id}`}
                      className="w-full py-2 text-[10px] tracking-widest uppercase text-center border border-white/20 text-zinc-300 hover:border-white hover:text-white transition-colors rounded-lg"
                    >
                      View Details
                    </Link>
                    <button
                      onClick={(e) => handleQuickAdd(e, product)}
                      className={`w-full py-2 text-[10px] tracking-widest uppercase font-semibold rounded-lg transition-all duration-300 ${
                        addedId === product.id
                          ? "bg-white text-black"
                          : "bg-white/10 text-white hover:bg-white hover:text-black"
                      }`}
                    >
                      {addedId === product.id
                        ? "Added ✓"
                        : `Add — ${product.variants[0]?.size ?? "N/A"}`}
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
            <p className="text-zinc-600 text-xs tracking-widest uppercase">
              No products in this category yet
            </p>
            <button
              onClick={() => setActiveFilter("ALL")}
              className="text-xs tracking-widest uppercase text-white border border-white/20 px-6 py-2 hover:bg-white hover:text-black transition-colors"
            >
              View All
            </button>
          </div>
        )}
      </div>

      {/* FOOTER */}
      <footer className="bg-zinc-950 text-white mt-auto border-t border-zinc-800">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-12 sm:py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2 md:col-span-1">
              <h2 className="font-bold tracking-[0.5em] text-sm mb-4">EXILES</h2>
              <p className="text-sm text-zinc-500">
                Clean silhouettes. Premium everyday wear built for presence.
              </p>
            </div>
            <div>
              <p className="text-xs tracking-[0.2em] uppercase font-medium mb-4">Shop</p>
              <ul className="space-y-2 text-sm text-zinc-500">
                <li onClick={() => setActiveFilter("NEW")} className="hover:text-white cursor-pointer transition">New Arrivals</li>
                <li onClick={() => setActiveFilter("Hoodies")} className="hover:text-white cursor-pointer transition">Hoodies</li>
                <li onClick={() => setActiveFilter("Jackets")} className="hover:text-white cursor-pointer transition">Jackets</li>
              </ul>
            </div>
            <div>
              <p className="text-xs tracking-[0.2em] uppercase font-medium mb-4">Support</p>
              <ul className="space-y-2 text-sm text-zinc-500">
                <li className="hover:text-white cursor-pointer transition">Contact</li>
                <li className="hover:text-white cursor-pointer transition">Shipping</li>
                <li className="hover:text-white cursor-pointer transition">Returns</li>
              </ul>
            </div>
            <div className="col-span-2 md:col-span-1">
              <p className="text-xs tracking-[0.2em] uppercase font-medium mb-4">Stay Updated</p>
              <p className="text-sm text-zinc-500 mb-4">Get early access to drops.</p>
              <div className="flex border border-zinc-700 rounded-lg overflow-hidden">
                <input
                  type="email"
                  placeholder="Email address"
                  className="flex-1 px-4 py-2.5 outline-none text-sm bg-transparent text-white placeholder-zinc-600"
                />
                <button className="bg-white text-black px-5 text-xs uppercase tracking-widest font-medium hover:bg-zinc-200 transition">
                  Join
                </button>
              </div>
            </div>
          </div>
          <div className="border-t border-zinc-800 mt-12 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-xs text-zinc-600 tracking-widest uppercase">
            <p>© {new Date().getFullYear()} EXILES. All rights reserved.</p>
            <div className="flex gap-6">
              <span className="hover:text-white cursor-pointer transition">Instagram</span>
              <span className="hover:text-white cursor-pointer transition">Twitter</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
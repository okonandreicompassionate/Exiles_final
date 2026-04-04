"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useCart } from "../components/cartProvider";
import { supabase } from "../../lib/supabase";

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

export default function LandingPage() {
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [addedId, setAddedId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const { addToCart } = useCart();

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
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-black/80 border-b border-zinc-800">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-4 grid grid-cols-3 items-center">
          <div className="hidden md:flex gap-6 text-sm tracking-wide justify-start">
            <button
              onClick={() => setActiveFilter("NEW")}
              className={`transition ${activeFilter === "NEW" ? "text-white font-semibold" : "text-zinc-400 hover:text-white"}`}
            >
              NEW
            </button>
            <button
              onClick={() => setActiveFilter("Hoodies")}
              className={`transition ${activeFilter === "Hoodies" ? "text-white font-semibold" : "text-zinc-400 hover:text-white"}`}
            >
              HOODIES
            </button>
            <button
              onClick={() => setActiveFilter("Jackets")}
              className={`transition ${activeFilter === "Jackets" ? "text-white font-semibold" : "text-zinc-400 hover:text-white"}`}
            >
              JACKETS
            </button>
          </div>
          <h1 className="font-bold tracking-[0.3em] text-sm justify-self-center">
            EXILES
          </h1>
          <div className="flex items-center gap-4 text-sm justify-end">
            <Link href="/cart" className="text-zinc-300 hover:text-white transition">
              Cart
              
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <div className="px-4 sm:px-6 mt-6">
        <div className="max-w-[1400px] mx-auto bg-zinc-900 rounded-2xl p-6 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-6 border border-zinc-800">
          <div>
            <h2 className="text-3xl sm:text-4xl font-semibold leading-tight">
              Minimal Fits<br />Maximum Presence
            </h2>
            <p className="text-sm text-zinc-500 mt-3">
              Built for everyday wear. Clean silhouettes. Premium feel.
            </p>
          </div>
          <img
            src="https://images.unsplash.com/photo-1618354691438-25bc04584c23"
            alt="Hero"
            className="w-full h-[250px] sm:h-[300px] md:h-auto md:w-[300px] object-cover rounded-xl"
          />
        </div>
      </div>

      {/* FILTER BAR */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 mt-8 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-sm text-zinc-400">
        <span className="font-medium">
          Showing {filteredProducts.length} products
        </span>
        <div className="flex gap-3 w-full sm:w-auto">
          <div className="relative w-full sm:w-auto">
            <select
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
              className="appearance-none border border-zinc-700 bg-zinc-900 text-white px-4 py-2.5 pr-8 rounded-full outline-none focus:ring-1 focus:ring-white transition w-full sm:w-auto cursor-pointer"
            >
              <option value="ALL">All Products</option>
              <option value="NEW">Featured</option>
              <option value="Hoodies">Hoodies</option>
              <option value="Jackets">Jackets</option>
            </select>
            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
              <svg className="fill-current text-zinc-400 h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" fillRule="evenodd" />
              </svg>
            </div>
          </div>
          <button
            onClick={() => setActiveFilter("ALL")}
            className="border border-zinc-700 bg-zinc-900 px-5 py-2.5 rounded-full hover:bg-zinc-800 transition whitespace-nowrap"
          >
            Clear Filter
          </button>
        </div>
      </div>

      {/* SKELETON LOADING */}
      {loading && (
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 pt-8 pb-12 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {[...Array(8)].map((_, i) => (
            <div key={i} className="bg-zinc-900 rounded-xl p-2 sm:p-3 border border-zinc-800 animate-pulse">
              <div className="aspect-[3/4] rounded-lg bg-zinc-800" />
              <div className="mt-3 space-y-2">
                <div className="h-3 bg-zinc-800 rounded w-3/4" />
                <div className="h-3 bg-zinc-800 rounded w-1/4" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* GRID */}
      {!loading && (
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 pt-8 pb-12 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6">
          {filteredProducts.map((product) => (
            <div
              key={product.id}
              className="bg-zinc-900 rounded-xl p-2 sm:p-3 hover:shadow-lg hover:shadow-white/5 transition-all duration-300 border border-transparent hover:border-zinc-800 flex flex-col"
            >
              {/* IMAGE */}
              <div className="aspect-[3/4] overflow-hidden rounded-lg bg-zinc-800 relative">
                <img
                  src={product.image_url}
                  alt={product.name}
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-700 ease-out"
                />
                {product.is_featured && (
                  <span className="absolute top-2 right-2 text-[10px] uppercase tracking-widest text-white bg-black/60 px-2 py-0.5 rounded">
                    New
                  </span>
                )}
              </div>

              {/* INFO */}
              <div className="mt-3 flex flex-col flex-grow gap-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-zinc-300 truncate">
                    {product.name}
                  </p>
                </div>
                <p className="font-semibold text-sm tracking-tight">
                  ${(product.price / 100).toFixed(2)}
                </p>

                {/* BUTTONS — always visible */}
                <div className="flex flex-col gap-2 mt-1">
                  <Link
                    href={`/product/${product.id}`}
                    className="w-full py-2 text-xs tracking-widest uppercase text-center border border-white/20 text-zinc-300 hover:border-white hover:text-white transition-colors rounded-lg"
                  >
                    View Details
                  </Link>
                  <button
                    onClick={(e) => handleQuickAdd(e, product)}
                    className={`w-full py-2 text-xs tracking-widest uppercase font-semibold rounded-lg transition-colors ${
                      addedId === product.id
                        ? "bg-white text-black"
                        : "bg-white/10 text-white hover:bg-white hover:text-black"
                    }`}
                  >
                    {addedId === product.id
                      ? "Added ✓"
                      : `Add to Cart — ${product.variants[0]?.size ?? "N/A"}`}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* FOOTER */}
      <footer className="bg-zinc-950 text-white mt-auto border-t border-zinc-800">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 py-12 sm:py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2 md:col-span-1">
              <h2 className="font-bold tracking-[0.5em] text-sm mb-4">EXILES</h2>
              <p className="text-sm text-zinc-500">
                Clean silhouettes. Premium everyday wear built for presence.
              </p>
            </div>
            <div>
              <p className="text-sm font-medium mb-4">Shop</p>
              <ul className="space-y-2 text-sm text-zinc-500">
                <li onClick={() => setActiveFilter("NEW")} className="hover:text-white cursor-pointer transition">New Arrivals</li>
                <li onClick={() => setActiveFilter("Hoodies")} className="hover:text-white cursor-pointer transition">Hoodies</li>
                <li onClick={() => setActiveFilter("Jackets")} className="hover:text-white cursor-pointer transition">Jackets</li>
              </ul>
            </div>
            <div>
              <p className="text-sm font-medium mb-4">Support</p>
              <ul className="space-y-2 text-sm text-zinc-500">
                <li className="hover:text-white cursor-pointer transition">Contact</li>
                <li className="hover:text-white cursor-pointer transition">Shipping</li>
                <li className="hover:text-white cursor-pointer transition">Returns</li>
              </ul>
            </div>
            <div className="col-span-2 md:col-span-1">
              <p className="text-sm font-medium mb-4">Stay Updated</p>
              <p className="text-sm text-zinc-500 mb-4">Get early access to drops.</p>
              <div className="flex border border-zinc-700 rounded-full overflow-hidden">
                <input
                  type="email"
                  placeholder="Email address"
                  className="flex-1 px-4 py-2.5 outline-none text-sm bg-transparent text-white placeholder-zinc-600"
                />
                <button className="bg-white text-black px-5 text-sm font-medium hover:bg-zinc-200 transition">
                  Join
                </button>
              </div>
            </div>
          </div>
          <div className="border-t border-zinc-800 mt-12 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-sm text-zinc-600">
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
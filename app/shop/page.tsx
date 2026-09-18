"use client";

import { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useCart } from "../components/cartProvider";
import { useWishlist } from "../components/wishlistProvider";
import { useToast } from "../components/toastProvider";
import { Logo } from "../components/Logo";
import { isSupabaseConfigured, supabase } from "../../lib/supabase";
import { ShoppingCart, ChevronDown, Search, Heart, Menu, X, ArrowUp, SlidersHorizontal } from "lucide-react";
import { FiGrid, FiStar, FiBox, FiLayers, FiShoppingBag } from "react-icons/fi";
import { GiHoodie, GiTrousers } from "react-icons/gi";

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
  // products.category_id -> categories.id is many-to-one, so PostgREST
  // embeds it as a single object, not an array.
  categories: Category | null;
  colors: string[];
  variants: Variant[];
};

type SortOption = "newest" | "price-asc" | "price-desc";

export const CATEGORIES = [
  { name: "ALL", label: "All", icon: FiGrid },
  { name: "NEW", label: "New Drops", icon: FiStar },
  { name: "Hoodies", label: "Hoodies", icon: GiHoodie },
  { name: "Jackets", label: "Jackets", icon: FiLayers },
  { name: "Tees", label: "T-Shirts", icon: FiShoppingBag },
  { name: "Trousers", label: "Trousers", icon: GiTrousers },
  { name: "Accessories", label: "Accessories", icon: FiBox },
];

export default function LandingPage() {
  const router = useRouter();
  const [activeFilter, setActiveFilter] = useState("ALL");
  const [addedId, setAddedId] = useState<string | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [sort, setSort] = useState<SortOption>("newest");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [newsletterEmail, setNewsletterEmail] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  const { addToCart, cartItems } = useCart();
  const { toggleWishlist, isWishlisted, wishlist } = useWishlist();
  const { showToast } = useToast();

  useEffect(() => {
    async function fetchProducts() {
      if (!isSupabaseConfigured || !supabase) {
        setProducts([]);
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("products")
        .select(`
          id,
          name,
          image_url,
          is_featured,
          price,
          category_id,
          colors,
          categories ( name ),
          variants ( id, size, stock )
        `)
        .order("created_at", { ascending: false });

      if (error) {
        console.warn("Error fetching products:", error.message);
        setLoading(false);
        return;
      }

      // supabase-js's loose inference types embeds as arrays regardless of
      // FK direction; at runtime this one is an object (many-to-one).
      // Normalize defensively rather than trust either shape blindly.
      setProducts(
        (data ?? []).map((p) => ({
          ...p,
          categories: Array.isArray(p.categories) ? p.categories[0] ?? null : p.categories,
        }))
      );
      setLoading(false);
    }

    fetchProducts();
  }, []);

  useEffect(() => {
    const onScroll = () => setShowBackToTop(window.scrollY > 700);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (searchOpen) searchInputRef.current?.focus();
  }, [searchOpen]);

  const filteredProducts = useMemo(() => {
    let list =
      activeFilter === "ALL"
        ? products
        : activeFilter === "NEW"
        ? products.filter((p) => p.is_featured)
        : products.filter((p) => p.categories?.name === activeFilter);

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }

    if (sort === "price-asc") list = [...list].sort((a, b) => a.price - b.price);
    if (sort === "price-desc") list = [...list].sort((a, b) => b.price - a.price);

    return list;
  }, [products, activeFilter, search, sort]);

  const handleQuickAdd = (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();

    const defaultVariant = product.variants[0];
    if (!defaultVariant) return;

    // Colors need an explicit pick — a silent default here is exactly the
    // kind of order-confusion this feature exists to prevent.
    if (product.colors.length > 0) {
      router.push(`/product/${product.id}`);
      return;
    }

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
    showToast(`${product.name} added to bag`, "success");
    setTimeout(() => setAddedId(null), 1500);
  };

  const handleWishlistToggle = (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();
    const wasWishlisted = isWishlisted(product.id);
    toggleWishlist(product.id);
    showToast(
      wasWishlisted ? `Removed ${product.name} from wishlist` : `Saved ${product.name} to wishlist`,
      "info"
    );
  };

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) {
      showToast("Enter an email address first", "error");
      return;
    }
    showToast("You're on the list. Watch your inbox.", "success");
    setNewsletterEmail("");
  };

  const scrollToProducts = () => {
    document.getElementById("products")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="bg-white min-h-screen text-zinc-900">

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-nav">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-4 flex items-center gap-3">
          {/* MOBILE MENU TOGGLE */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden text-zinc-600 hover:text-zinc-900 transition-colors"
            aria-label="Open menu"
          >
            <Menu size={20} strokeWidth={1.5} />
          </button>

          {/* LEFT NAV */}
          <div className="hidden md:flex gap-8 text-xs tracking-[0.2em] uppercase flex-1">
            <button onClick={() => setActiveFilter("NEW")} className={`transition-colors ${activeFilter === "NEW" ? "text-zinc-900" : "text-zinc-500 hover:text-zinc-800"}`}>New</button>
            <button onClick={() => setActiveFilter("Hoodies")} className={`transition-colors ${activeFilter === "Hoodies" ? "text-zinc-900" : "text-zinc-500 hover:text-zinc-800"}`}>Hoodies</button>
            <button onClick={() => setActiveFilter("Jackets")} className={`transition-colors ${activeFilter === "Jackets" ? "text-zinc-900" : "text-zinc-500 hover:text-zinc-800"}`}>Jackets</button>
          </div>

          {/* LOGO */}
          <Link href="/shop" className="flex-1 md:flex-1 flex justify-center">
            <Logo textClassName="text-sm" />
          </Link>

          {/* RIGHT NAV */}
          <div className="flex items-center justify-end flex-1 gap-4 sm:gap-5">
            <button
              onClick={() => setSearchOpen((v) => !v)}
              className="text-zinc-600 hover:text-zinc-900 transition-colors"
              aria-label="Search"
            >
              {searchOpen ? <X size={18} strokeWidth={1.5} /> : <Search size={18} strokeWidth={1.5} />}
            </button>
            <button
              onClick={() => setActiveFilter("WISHLIST")}
              className="relative hidden sm:block text-zinc-600 hover:text-zinc-900 transition-colors"
              aria-label="Wishlist"
              title="Wishlist"
            >
              <Heart size={18} strokeWidth={1.5} className={wishlist.length > 0 ? "fill-red-500 text-red-500" : ""} />
              {wishlist.length > 0 && (
                <span className="absolute -top-2 -right-2 w-4 h-4 bg-zinc-900 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                  {wishlist.length}
                </span>
              )}
            </button>
            <Link href="/cart" className="relative flex items-center gap-2 text-zinc-600 hover:text-zinc-900 transition-colors">
              <ShoppingCart size={18} strokeWidth={1.5} />
              {cartItems.length > 0 && (
                <span className="absolute -top-2 -right-2 w-4 h-4 bg-zinc-900 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                  {cartItems.length}
                </span>
              )}
            </Link>
          </div>
        </div>

        {/* SEARCH BAR — expands under nav */}
        {searchOpen && (
          <div className="border-t border-zinc-900/10 px-4 sm:px-8 py-3 animate-fade-in-up" style={{ animationDuration: "0.25s" }}>
            <div className="max-w-[1400px] mx-auto flex items-center gap-2 glass-input rounded-xl px-4 py-2.5">
              <Search size={15} className="text-zinc-500 flex-shrink-0" />
              <input
                ref={searchInputRef}
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products..."
                className="flex-1 bg-transparent outline-none text-sm text-zinc-900 placeholder-zinc-400"
              />
              {search && (
                <button onClick={() => setSearch("")} className="text-zinc-500 hover:text-zinc-900">
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        )}
      </nav>

      {/* MOBILE MENU DRAWER */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-[60] md:hidden">
          <div
            className="absolute inset-0 bg-zinc-900/30 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="absolute top-0 left-0 bottom-0 w-[78%] max-w-xs glass-strong p-6 flex flex-col gap-1 animate-fade-in-up" style={{ animationDuration: "0.3s" }}>
            <div className="flex items-center justify-between mb-6">
              <Logo textClassName="text-xs" markClassName="h-6 w-auto" />
              <button onClick={() => setMobileMenuOpen(false)} className="text-zinc-500 hover:text-zinc-900">
                <X size={20} />
              </button>
            </div>
            {CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <button
                  key={cat.name}
                  onClick={() => {
                    setActiveFilter(cat.name);
                    setMobileMenuOpen(false);
                  }}
                  className={`flex items-center gap-3 px-3 py-3 rounded-xl text-xs tracking-[0.15em] uppercase transition-colors ${
                    activeFilter === cat.name ? "bg-zinc-900/8 text-zinc-900" : "text-zinc-500 hover:bg-zinc-900/5 hover:text-zinc-900"
                  }`}
                >
                  <Icon size={16} />
                  {cat.label}
                </button>
              );
            })}
            <div className="border-t border-zinc-900/10 my-3" />
            <Link
              href="/cart"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-xs tracking-[0.15em] uppercase text-zinc-500 hover:bg-zinc-900/5 hover:text-zinc-900 transition-colors"
            >
              <ShoppingCart size={16} />
              Bag ({cartItems.length})
            </Link>
            <button
              onClick={() => {
                setActiveFilter("WISHLIST");
                setMobileMenuOpen(false);
              }}
              className="flex items-center gap-3 px-3 py-3 rounded-xl text-xs tracking-[0.15em] uppercase text-zinc-500 hover:bg-zinc-900/5 hover:text-zinc-900 transition-colors"
            >
              <Heart size={16} />
              Wishlist ({wishlist.length})
            </button>
          </div>
        </div>
      )}

      {/* HERO — sits on the photo, keeps light-on-dark treatment regardless of page theme */}
      <div className="relative w-full h-screen overflow-hidden">
        <img
          src="https://i.imgur.com/XOTz8wd.jpeg"
          alt="Hero"
          className="w-full h-full object-cover object-top animate-slow-zoom"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-zinc-950/50 via-transparent to-white" />
        <div className="absolute inset-0 bg-gradient-to-r from-zinc-950/30 to-transparent" />

        {/* HERO TEXT */}
        <div className="absolute bottom-32 left-6 sm:left-16 right-6 sm:right-auto">
          <p className="text-[10px] tracking-[0.5em] uppercase text-zinc-300 mb-4">
            Limited Edition Styles
          </p>
          <h2 className="font-brand text-6xl sm:text-8xl leading-[0.9] tracking-wide text-white">
            EX1LES<br />
            <span className="text-zinc-200">Culture</span>
          </h2>
          <p className="text-[10px] tracking-[0.4em] uppercase text-zinc-300 mt-5 mb-6">
            Drop coming soon
          </p>
          <button
            onClick={scrollToProducts}
            className="bg-white/90 text-zinc-900 backdrop-blur-md px-7 py-3.5 rounded-full text-[11px] tracking-[0.3em] uppercase font-medium hover:bg-white transition-all duration-300 hover:scale-[1.03] active:scale-[0.98] shadow-lg shadow-black/10"
          >
            Shop the Drop
          </button>
        </div>

        {/* SCROLL INDICATOR */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2">
          <p className="text-[9px] tracking-[0.4em] uppercase text-zinc-300">Scroll</p>
          <div className="w-7 h-7 rounded-full bg-white/20 backdrop-blur-md border border-white/30 flex items-center justify-center animate-bounce">
            <ChevronDown size={12} className="text-white" />
          </div>
        </div>

        {/* HERO DOTS */}
        <div className="absolute bottom-12 left-8 sm:left-16 flex gap-1.5 items-center">
          <div className="w-5 h-0.5 bg-white rounded-full" />
          <div className="w-1.5 h-0.5 bg-white/40 rounded-full" />
          <div className="w-1.5 h-0.5 bg-white/40 rounded-full" />
        </div>
      </div>

      {/* SHOP BY CATEGORY */}
      <div id="products" className="max-w-[1400px] mx-auto px-4 sm:px-8 pt-16 pb-8">
        <p className="text-[10px] tracking-[0.4em] uppercase text-amber-700 font-medium mb-6">
          Shop by Category
        </p>

        <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
          {CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const isActive = activeFilter === cat.name;

            return (
              <button
                key={cat.name}
                onClick={() => setActiveFilter(cat.name)}
                className={`group relative flex flex-col items-center gap-2.5 p-3 sm:p-4 rounded-2xl transition-all duration-300 overflow-hidden

                ${
                  isActive
                    ? "glass-strong text-zinc-900 shadow-[0_0_20px_rgba(234,179,8,0.15)] scale-[1.04] ring-1 ring-amber-500/40"
                    : "glass text-zinc-500 hover:text-zinc-900 hover:bg-zinc-900/[0.04] hover:scale-[1.03]"
                }`}
              >
                {/* ICON */}
                <Icon
                  className={`text-xl sm:text-2xl transition-all duration-300
                  ${
                    isActive
                      ? "text-amber-600 scale-110"
                      : "text-zinc-400 group-hover:text-zinc-900 group-hover:scale-110"
                  }`}
                />

                {/* LABEL */}
                <span
                  className={`text-[9px] sm:text-[10px] tracking-[0.12em] uppercase text-center leading-tight transition
                  ${
                    isActive
                      ? "text-zinc-900"
                      : "text-zinc-500 group-hover:text-zinc-700"
                  }`}
                >
                  {cat.label}
                </span>

                {/* ACTIVE TOP BAR */}
                <span
                  className={`absolute top-0 left-0 h-[2px] bg-amber-500 transition-all duration-300
                  ${isActive ? "w-full" : "w-0 group-hover:w-full opacity-40"}`}
                />
              </button>
            );
          })}
        </div>
      </div>

      {/* DIVIDER */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-4">
        <div className="border-t border-zinc-900/10" />
      </div>

      {/* PRODUCTS SECTION */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-8 pb-20">

        {/* SECTION HEADER */}
        <div className="flex flex-wrap justify-between items-center gap-3 mb-8">
          <div>
            <h2 className="text-xs tracking-[0.3em] uppercase text-zinc-700">
              {activeFilter === "ALL"
                ? "All Products"
                : activeFilter === "NEW"
                ? "New Arrivals"
                : activeFilter === "WISHLIST"
                ? "Your Wishlist"
                : activeFilter}
            </h2>
            <p className="text-[10px] text-zinc-500 mt-1 tracking-wider">
              {activeFilter === "WISHLIST"
                ? `${wishlist.length} ${wishlist.length === 1 ? "item" : "items"} saved`
                : `${filteredProducts.length} ${filteredProducts.length === 1 ? "item" : "items"}`}
            </p>
          </div>

          {/* SORT */}
          <div className="relative">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as SortOption)}
              className="glass appearance-none text-zinc-600 text-[10px] tracking-widest uppercase pl-8 pr-8 py-2.5 outline-none cursor-pointer rounded-xl transition-colors hover:bg-zinc-900/5"
            >
              <option value="newest" className="bg-white">Newest</option>
              <option value="price-asc" className="bg-white">Price: Low to High</option>
              <option value="price-desc" className="bg-white">Price: High to Low</option>
            </select>
            <SlidersHorizontal size={11} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
            <ChevronDown size={11} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
          </div>
        </div>

        {/* SKELETON */}
        {loading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="glass rounded-2xl overflow-hidden">
                <div className="aspect-[3/4] animate-shimmer" />
                <div className="p-4 space-y-2.5">
                  <div className="h-2.5 rounded-full w-3/4 animate-shimmer" />
                  <div className="h-2.5 rounded-full w-1/3 animate-shimmer" />
                  <div className="h-8 rounded-xl mt-3 animate-shimmer" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* PRODUCT GRID */}
        {!loading && (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5">
            {(activeFilter === "WISHLIST"
              ? products.filter((p) => wishlist.includes(p.id))
              : filteredProducts
            ).map((product) => (
              <div
                key={product.id}
                className="group glass rounded-2xl overflow-hidden hover:bg-zinc-900/[0.03] hover:border-zinc-900/15 transition-all duration-500 hover:shadow-xl hover:shadow-zinc-900/10 hover:-translate-y-1 flex flex-col"
              >
                {/* IMAGE */}
                <Link href={`/product/${product.id}`} className="aspect-[3/4] overflow-hidden bg-zinc-100 relative block">
                  <img
                    src={product.image_url}
                    alt={product.name}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700 ease-out"
                  />
                  {/* GRADIENT OVERLAY */}
                  <div className="absolute inset-0 bg-gradient-to-t from-zinc-900/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

                  {/* NEW BADGE */}
                  {product.is_featured && (
                    <span className="absolute top-3 left-3 text-[9px] uppercase tracking-widest text-zinc-900 glass-strong px-2.5 py-1 rounded-full">
                      New
                    </span>
                  )}

                  {/* WISHLIST HEART */}
                  <button
                    onClick={(e) => handleWishlistToggle(e, product)}
                    className="absolute top-3 right-3 w-8 h-8 rounded-full glass-strong flex items-center justify-center hover:scale-110 active:scale-95 transition-transform"
                    aria-label="Toggle wishlist"
                  >
                    <Heart
                      size={14}
                      className={isWishlisted(product.id) ? "fill-red-500 text-red-500" : "text-zinc-800"}
                    />
                  </button>
                </Link>

                {/* INFO */}
                <div className="p-3 sm:p-4 flex flex-col flex-grow gap-2.5">
                  <div>
                    <Link href={`/product/${product.id}`}>
                      <p className="text-xs sm:text-sm text-zinc-800 font-medium truncate leading-snug hover:text-zinc-950">
                        {product.name}
                      </p>
                    </Link>
                    <p className="text-[10px] text-zinc-500 mt-0.5 tracking-wide">
                      {product.categories?.name ?? "EXILES"}
                    </p>
                  </div>

                  <p className="text-sm font-semibold text-zinc-900">
                    ₦{(product.price / 100).toLocaleString()}
                  </p>

                  {/* SIZE PILLS */}
                  <div className="flex gap-1 flex-wrap">
                    {product.variants.slice(0, 4).map((v) => (
                      <span key={v.id} className={`text-[9px] px-1.5 py-0.5 rounded-md border tracking-wide ${v.stock === 0 ? "border-zinc-200 text-zinc-300" : "border-zinc-300 text-zinc-600"}`}>
                        {v.size}
                      </span>
                    ))}
                  </div>

                  {/* BUTTONS */}
                  <div className="flex gap-2 mt-auto pt-1">
                    <Link
                      href={`/product/${product.id}`}
                      className="flex-1 py-2 text-[10px] tracking-widest uppercase text-center glass text-zinc-600 hover:text-zinc-900 hover:bg-zinc-900/5 transition-all duration-300 rounded-xl"
                    >
                      Details
                    </Link>
                    <button
                      onClick={(e) => handleQuickAdd(e, product)}
                      className={`flex-1 py-2 text-[10px] tracking-widest uppercase font-semibold rounded-xl transition-all duration-300 ${
                        addedId === product.id
                          ? "bg-emerald-600 text-white"
                          : "bg-zinc-900 text-white hover:bg-zinc-700"
                      }`}
                    >
                      {addedId === product.id ? "Added ✓" : product.colors.length > 0 ? "Choose" : "Add"}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* EMPTY STATE */}
        {!loading &&
          (activeFilter === "WISHLIST"
            ? wishlist.length === 0
            : filteredProducts.length === 0) && (
            <div className="flex flex-col items-center justify-center h-64 gap-4">
              <p className="text-zinc-400 text-[10px] tracking-[0.3em] uppercase text-center px-4">
                {activeFilter === "WISHLIST"
                  ? "Nothing saved yet"
                  : search
                  ? `No results for "${search}"`
                  : "No products in this category yet"}
              </p>
              <button
                onClick={() => {
                  setActiveFilter("ALL");
                  setSearch("");
                }}
                className="text-[10px] tracking-widest uppercase text-zinc-600 glass px-6 py-2.5 rounded-xl hover:text-zinc-900 hover:bg-zinc-900/5 transition-all"
              >
                View All
              </button>
            </div>
          )}
      </div>

      <section className="w-full flex justify-center px-4 py-6">
        <div className="max-w-2xl rounded-2xl glass p-5 text-center">
          <p className="text-sm font-medium uppercase tracking-[0.2em] text-amber-700">
            Pre-Drop Notice
          </p>

          <h2 className="mt-2 text-2xl font-bold text-zinc-900">
            Early Access Before the Official Drop
          </h2>

          <p className="mt-3 text-sm leading-relaxed text-neutral-600">
            This is a pre-drop release. The official launch date for the full drop
            will be announced in the coming days. Stay locked in — limited pieces
            may go live before the main release.
          </p>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="glass-nav border-x-0 border-b-0 text-zinc-900">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-12 sm:py-16">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="col-span-2 md:col-span-1">
              <Logo textClassName="text-sm" markClassName="h-7 w-auto" className="mb-4" />
              <p className="text-xs text-zinc-500 leading-relaxed">
                Clean silhouettes. Premium everyday wear built for presence.
              </p>
            </div>
            <div>
              <p className="text-[10px] tracking-[0.3em] uppercase text-amber-700 font-medium mb-4">Shop</p>
              <ul className="space-y-2.5 text-xs text-zinc-500">
                <li onClick={() => setActiveFilter("NEW")} className="hover:text-zinc-900 cursor-pointer transition-colors">Latest drop</li>
                <li onClick={() => setActiveFilter("Hoodies")} className="hover:text-zinc-900 cursor-pointer transition-colors">Hoodies</li>
                <li onClick={() => setActiveFilter("Jackets")} className="hover:text-zinc-900 cursor-pointer transition-colors">Jackets</li>
              </ul>
            </div>
            <div>
              <p className="text-[10px] tracking-[0.3em] uppercase text-amber-700 font-medium mb-4">Support</p>
              <ul className="space-y-2.5 text-xs text-zinc-500">
                <li><Link href="/shipping_policy" className="hover:text-zinc-900 cursor-pointer transition-colors">Shipping</Link></li>
                <li className="hover:text-zinc-900 cursor-pointer transition-colors">Contact</li>
                <li className="hover:text-zinc-900 cursor-pointer transition-colors">Returns</li>
              </ul>
            </div>
            <div className="col-span-2 md:col-span-1">
              <p className="text-[10px] tracking-[0.3em] uppercase text-amber-700 font-medium mb-4">Stay Updated</p>
              <p className="text-xs text-zinc-500 mb-4 leading-relaxed">Get early access to drops.</p>
              <form onSubmit={handleNewsletterSubmit} className="flex glass-input rounded-xl overflow-hidden">
                <input
                  type="email"
                  value={newsletterEmail}
                  onChange={(e) => setNewsletterEmail(e.target.value)}
                  placeholder="Email address"
                  className="flex-1 px-4 py-2.5 outline-none text-xs bg-transparent text-zinc-900 placeholder-zinc-400 min-w-0"
                />
                <button type="submit" className="bg-zinc-900 text-white px-4 text-[10px] uppercase tracking-widest font-medium hover:bg-zinc-700 transition-colors flex-shrink-0">
                  Join
                </button>
              </form>
            </div>
          </div>
          <div className="border-t border-zinc-900/10 mt-12 pt-6 flex flex-col sm:flex-row justify-between items-center gap-4 text-[10px] text-zinc-400 tracking-widest uppercase">
            <p>© {new Date().getFullYear()} EX1LES. All rights reserved.</p>
            <div className="flex gap-6">
              <span className="hover:text-zinc-900 cursor-pointer transition-colors">Instagram</span>
              <span className="hover:text-zinc-900 cursor-pointer transition-colors">Twitter</span>
            </div>
          </div>
        </div>
      </footer>

      {/* BACK TO TOP */}
      {showBackToTop && (
        <button
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="fixed bottom-6 right-6 z-40 w-11 h-11 rounded-full glass-strong text-zinc-900 flex items-center justify-center hover:bg-zinc-900/5 transition-all hover:-translate-y-1 shadow-lg shadow-zinc-900/10"
          aria-label="Back to top"
        >
          <ArrowUp size={16} />
        </button>
      )}
    </div>
  );
}

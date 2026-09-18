"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ShoppingCart, ChevronRight, Heart, X, ZoomIn } from "lucide-react";
import { useCart } from "../../components/cartProvider";
import { useWishlist } from "../../components/wishlistProvider";
import { useToast } from "../../components/toastProvider";
import { Logo } from "../../components/Logo";
import { isSupabaseConfigured, supabase } from "../../../lib/supabase";
import { FiArrowLeft } from "react-icons/fi";

type Variant = {
  id: string;
  size: string;
  stock: number;
};

type ProductImage = {
  id: string;
  image_url: string;
  position: number;
};

type Product = {
  id: string;
  name: string;
  description: string;
  image_url: string;
  price: number;
  // products.category_id -> categories.id is many-to-one, so PostgREST
  // embeds it as a single object, not an array.
  categories: { name: string } | null;
  colors: string[];
  variants: Variant[];
  product_images: ProductImage[];
};

const THREE_XL_SURCHARGE = 500000;

function priceForSize(price: number, size?: string) {
  return price + (size === "3XL" ? THREE_XL_SURCHARGE : 0);
}

export default function ProductPage() {
  const params = useParams();
  const router = useRouter();
  const { addToCart, cartItems } = useCart();
  const { toggleWishlist, isWishlisted } = useWishlist();
  const { showToast } = useToast();

  const [product, setProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [mainImage, setMainImage] = useState("");
  const [activeThumb, setActiveThumb] = useState(0);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  useEffect(() => {
    async function fetchProduct() {
      if (!isSupabaseConfigured || !supabase) {
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from("products")
        .select(`
          id,
          name,
          description,
          image_url,
          price,
          colors,
          categories ( name ),
          variants ( id, size, stock ),
          product_images ( id, image_url, position )
        `)
        .eq("id", params.id)
        .single();

      if (error || !data) {
        console.warn("Product fetch error:", error?.message);
        setLoading(false);
        return;
      }

      const sorted = [...(data.product_images ?? [])].sort(
        (a, b) => a.position - b.position
      );

      // supabase-js's loose inference types embeds as arrays regardless of
      // FK direction; at runtime this one is an object (many-to-one).
      // Normalize defensively rather than trust either shape blindly.
      const categories = Array.isArray(data.categories) ? data.categories[0] ?? null : data.categories;

      const colors = data.colors ?? [];

      setProduct({ ...data, categories, colors, product_images: sorted });
      setMainImage(sorted[0]?.image_url ?? data.image_url);
      // Nothing to choose if there's only one option.
      if (colors.length === 1) setSelectedColor(colors[0]);
      setLoading(false);
    }

    fetchProduct();
  }, [params.id]);

  useEffect(() => {
    if (!lightboxOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxOpen]);

  const needsColor = (product?.colors.length ?? 0) > 0;
  const readyToAdd = !!selectedVariant && (!needsColor || !!selectedColor);

  const handleAddToCart = () => {
    if (!readyToAdd || !selectedVariant || !product) return;

    addToCart({
      id: selectedVariant.id,
      product_id: product.id,
      name: product.name,
      image_url: product.image_url,
      size: selectedVariant.size,
      color: selectedColor,
      price: priceForSize(product.price, selectedVariant.size),
      quantity: 1,
    });

    setAdded(true);
    showToast(`${product.name} added to bag`, "success");
    setTimeout(() => {
      setAdded(false);
      router.push("/cart");
    }, 1000);
  };

  const handleWishlistToggle = () => {
    if (!product) return;
    const wasWishlisted = isWishlisted(product.id);
    toggleWishlist(product.id);
    showToast(
      wasWishlisted ? "Removed from wishlist" : "Saved to wishlist",
      "info"
    );
  };

  const handleThumb = (img: ProductImage, idx: number) => {
    setMainImage(img.image_url);
    setActiveThumb(idx);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex">
        {/* SKELETON LEFT */}
        <div className="w-full md:w-1/2 h-screen animate-shimmer" />
        {/* SKELETON RIGHT */}
        <div className="hidden md:flex flex-col gap-6 flex-1 p-16 pt-24">
          <div className="h-3 rounded-full w-1/4 animate-shimmer" />
          <div className="h-8 rounded-full w-3/4 animate-shimmer" />
          <div className="h-6 rounded-full w-1/4 animate-shimmer" />
          <div className="flex gap-3 mt-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="w-12 h-12 rounded-xl animate-shimmer" />
            ))}
          </div>
          <div className="h-14 rounded-2xl mt-4 animate-shimmer" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-white text-zinc-900 flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-zinc-500 text-xs tracking-[0.3em] uppercase">Product not found</p>
          <Link href="/shop" className="text-xs tracking-widest uppercase text-zinc-600 hover:text-zinc-900 transition-colors glass px-6 py-3 rounded-xl inline-block hover:bg-zinc-900/5">
            Back to Shop
          </Link>
        </div>
      </div>
    );
  }

  const gallery =
    product.product_images.length > 0
      ? product.product_images
      : [{ id: "main", image_url: product.image_url, position: 0 }];

  return (
    <div className="bg-white min-h-screen text-zinc-900">

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass-nav">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-4 flex items-center">
          <button
            onClick={() => router.back()}
            className="group flex items-center gap-2 text-zinc-500 hover:text-zinc-900 transition-all duration-300 text-xs tracking-widest uppercase flex-1"
          >
            <FiArrowLeft
              size={14}
              className="transition-transform duration-300 group-hover:-translate-x-1"
            />
            <span className="group-hover:tracking-[0.2em] transition-all duration-300">
              Back
            </span>
          </button>

          <Link href="/shop" className="flex-1 flex justify-center">
            <Logo textClassName="text-sm" />
          </Link>
          <div className="flex items-center justify-end flex-1 gap-4">
            <button
              onClick={handleWishlistToggle}
              className="text-zinc-600 hover:text-zinc-900 transition-colors"
              aria-label="Toggle wishlist"
            >
              <Heart size={18} strokeWidth={1.5} className={isWishlisted(product.id) ? "fill-red-500 text-red-500" : ""} />
            </button>
            <Link href="/cart" className="relative text-zinc-600 hover:text-zinc-900 transition-colors">
              <ShoppingCart size={18} strokeWidth={1.5} />
              {cartItems.length > 0 && (
                <span className="absolute -top-2 -right-2 w-4 h-4 bg-zinc-900 text-white text-[10px] rounded-full flex items-center justify-center font-bold">
                  {cartItems.length}
                </span>
              )}
            </Link>
          </div>
        </div>
      </nav>

      {/* BREADCRUMB */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 pt-24 pb-4">
        <div className="flex items-center gap-2 text-[10px] tracking-widest uppercase text-zinc-400">
          <Link href="/shop" className="hover:text-zinc-700 transition-colors">Shop</Link>
          <ChevronRight size={10} />
          <span className="text-zinc-500">{product.categories?.name ?? "Product"}</span>
          <ChevronRight size={10} />
          <span className="text-zinc-600 truncate max-w-[200px]">{product.name}</span>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 pb-28 lg:pb-20">
        <div className="grid md:grid-cols-2 gap-8 lg:gap-16">

          {/* LEFT — IMAGE GALLERY */}
          <div className="flex gap-3">

            {/* THUMBNAILS — vertical strip */}
            {gallery.length > 1 && (
              <div className="hidden sm:flex flex-col gap-2 w-16 flex-shrink-0">
                {gallery.map((img, idx) => (
                  <button
                    key={img.id}
                    onClick={() => handleThumb(img, idx)}
                    className={`w-16 h-16 rounded-xl overflow-hidden border-2 transition-all duration-300 flex-shrink-0 ${
                      activeThumb === idx
                        ? "border-zinc-900/60 opacity-100"
                        : "border-zinc-900/10 opacity-50 hover:opacity-80 hover:border-zinc-900/30"
                    }`}
                  >
                    <img
                      src={img.image_url}
                      alt=""
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* MAIN IMAGE */}
            <div className="flex-1 relative">
              <button
                onClick={() => setLightboxOpen(true)}
                className="w-full rounded-2xl overflow-hidden glass aspect-[3/4] relative group"
              >
                <img
                  src={mainImage}
                  alt={product.name}
                  className="w-full h-full object-cover transition-all duration-500"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                  <span className="w-11 h-11 rounded-full glass-strong text-zinc-900 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <ZoomIn size={18} />
                  </span>
                </div>
              </button>

              {/* MOBILE THUMBS */}
              {gallery.length > 1 && (
                <div className="flex sm:hidden gap-2 mt-3 justify-center">
                  {gallery.map((img, idx) => (
                    <button
                      key={img.id}
                      onClick={() => handleThumb(img, idx)}
                      className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                        activeThumb === idx ? "border-zinc-900/60" : "border-zinc-900/10 opacity-50"
                      }`}
                    >
                      <img src={img.image_url} alt="" loading="lazy" className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT — PRODUCT INFO */}
          <div className="flex flex-col gap-6 md:pt-4">

            {/* CATEGORY + NAME + PRICE */}
            <div>
              <p className="text-[10px] tracking-[0.4em] uppercase text-zinc-500 mb-2">
                {product.categories?.name ?? "EXILES"}
              </p>
              <h1 className="text-2xl sm:text-3xl font-light leading-snug text-zinc-900">
                {product.name}
              </h1>
              <div className="flex items-baseline gap-3 mt-3">
                <p className="text-2xl font-semibold text-zinc-900">
                  ₦{(priceForSize(product.price, selectedVariant?.size) / 100).toLocaleString()}
                  {selectedVariant?.size === "3XL" && <span className="text-xs text-amber-700 ml-2">3XL +₦5,000</span>}
                </p>
              </div>
            </div>

            {/* DIVIDER */}
            <div className="border-t border-zinc-900/10" />

            {/* COLOR SELECTOR */}
            {needsColor && (
              <div>
                <p className="text-xs tracking-[0.2em] uppercase text-zinc-500 mb-3">
                  Select Color
                  {selectedColor && <span className="text-zinc-900 ml-2">— {selectedColor}</span>}
                </p>
                <div className="flex gap-2 flex-wrap">
                  {product.colors.map((color) => {
                    const isSelected = selectedColor === color;
                    return (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        title={color}
                        className={`flex items-center gap-2 pl-2 pr-3.5 h-10 rounded-xl text-xs font-medium transition-all duration-300 ${
                          isSelected
                            ? "bg-zinc-900 text-white border-2 border-zinc-900 shadow-lg shadow-zinc-900/10"
                            : "glass text-zinc-600 hover:border-zinc-900/30 hover:text-zinc-900"
                        }`}
                      >
                        <span
                          className="w-5 h-5 rounded-full border border-zinc-900/15 flex-shrink-0"
                          style={{ backgroundColor: color.toLowerCase().replace(/\s+/g, "") }}
                        />
                        {color}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SIZE SELECTOR */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs tracking-[0.2em] uppercase text-zinc-500">
                  Select Size
                  {selectedVariant && (
                    <span className="text-zinc-900 ml-2">— {selectedVariant.size}</span>
                  )}
                </p>
                <button className="text-[10px] tracking-widest uppercase text-zinc-400 hover:text-zinc-700 transition-colors underline underline-offset-2">
                  Size Guide
                </button>
              </div>

              <div className="flex gap-2 flex-wrap">
                {product.variants.map((variant) => {
                  const outOfStock = variant.stock === 0;
                  const isSelected = selectedVariant?.id === variant.id;
                  return (
                    <button
                      key={variant.id}
                      onClick={() => !outOfStock && setSelectedVariant(variant)}
                      disabled={outOfStock}
                      className={`w-12 h-12 rounded-xl text-xs font-medium transition-all duration-300 relative ${
                        outOfStock
                          ? "glass text-zinc-300 cursor-not-allowed opacity-60"
                          : isSelected
                          ? "bg-zinc-900 text-white border-2 border-zinc-900 shadow-lg shadow-zinc-900/10"
                          : "glass text-zinc-600 hover:border-zinc-900/30 hover:text-zinc-900"
                      }`}
                    >
                      <span>{variant.size}</span>
                      {variant.size === "3XL" && <span className="absolute -bottom-4 left-1/2 -translate-x-1/2 whitespace-nowrap text-[8px] text-amber-700">+₦5K</span>}
                      {outOfStock && (
                        <span className="absolute inset-0 flex items-center justify-center">
                          <span className="w-8 h-px bg-zinc-300 rotate-45 absolute" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {selectedVariant && selectedVariant.stock > 0 && selectedVariant.stock <= 3 && (
                <p className="text-[10px] text-red-500 mt-3 uppercase tracking-widest">
                  Only {selectedVariant.stock} left in stock
                </p>
              )}
            </div>

            {/* ADD TO CART — desktop/inline */}
            <div className="hidden lg:flex gap-3">
              <button
                onClick={handleAddToCart}
                disabled={!readyToAdd || added}
                className={`flex-1 py-4 rounded-2xl text-xs tracking-[0.3em] uppercase font-semibold transition-all duration-300 ${
                  added
                    ? "bg-emerald-600 text-white cursor-not-allowed"
                    : !readyToAdd
                    ? "glass text-zinc-400 cursor-not-allowed"
                    : "bg-zinc-900 text-white hover:bg-zinc-700 shadow-lg shadow-zinc-900/10"
                }`}
              >
                {added
                  ? "✓ Added to Bag"
                  : needsColor && !selectedColor
                  ? "Select a Color"
                  : !selectedVariant
                  ? "Select a Size"
                  : "Add to Bag"}
              </button>
              <button
                onClick={handleWishlistToggle}
                className="w-14 h-14 rounded-2xl glass text-zinc-800 flex items-center justify-center hover:bg-zinc-900/5 transition-colors flex-shrink-0"
                aria-label="Toggle wishlist"
              >
                <Heart size={18} className={isWishlisted(product.id) ? "fill-red-500 text-red-500" : ""} />
              </button>
            </div>

            {/* DIVIDER */}
            <div className="border-t border-zinc-900/10" />

            {/* DESCRIPTION */}
            <div className="space-y-4">
              <div>
                <p className="text-[10px] tracking-[0.3em] uppercase text-zinc-500 mb-2">
                  About This Piece
                </p>
                <p className="text-sm text-zinc-600 leading-relaxed">
                  {product.description}
                </p>
              </div>

              {/* DETAILS GRID */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="glass rounded-xl p-4">
                  <p className="text-[9px] tracking-[0.3em] uppercase text-zinc-500 mb-1">Delivery</p>
                  <p className="text-xs text-zinc-700">3–4 working days after drop</p>
                </div>
                <div className="glass rounded-xl p-4">
                  <p className="text-[9px] tracking-[0.3em] uppercase text-zinc-500 mb-1">Returns</p>
                  <p className="text-xs text-zinc-700">2 day policy</p>
                </div>
                <div className="glass rounded-xl p-4">
                  <p className="text-[9px] tracking-[0.3em] uppercase text-zinc-500 mb-1">Material</p>
                  <p className="text-xs text-zinc-700">Premium quality</p>
                </div>
                <div className="glass rounded-xl p-4">
                  <p className="text-[9px] tracking-[0.3em] uppercase text-zinc-500 mb-1">Origin</p>
                  <p className="text-xs text-zinc-700">EX1LES Studio</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>

      {/* MOBILE/TABLET FIXED ADD TO BAG BAR */}
      <div className="fixed bottom-0 left-0 right-0 lg:hidden z-40 glass-nav border-t border-zinc-900/10 p-4 flex items-center gap-3">
        <button
          onClick={handleWishlistToggle}
          className="w-14 h-14 rounded-2xl glass text-zinc-800 flex items-center justify-center flex-shrink-0"
          aria-label="Toggle wishlist"
        >
          <Heart size={18} className={isWishlisted(product.id) ? "fill-red-500 text-red-500" : ""} />
        </button>
        <button
          onClick={handleAddToCart}
          disabled={!readyToAdd || added}
          className={`flex-1 py-4 rounded-2xl text-xs tracking-[0.3em] uppercase font-semibold transition-all duration-300 ${
            added
              ? "bg-emerald-600 text-white cursor-not-allowed"
              : !readyToAdd
              ? "glass text-zinc-400 cursor-not-allowed"
              : "bg-zinc-900 text-white hover:bg-zinc-700 shadow-lg shadow-zinc-900/10"
          }`}
        >
          {added
            ? "✓ Added to Bag"
            : needsColor && !selectedColor
            ? "Select a Color"
            : !selectedVariant
            ? "Select a Size"
            : `Add to Bag — ₦${(priceForSize(product.price, selectedVariant?.size) / 100).toLocaleString()}`}
        </button>
      </div>

      {/* LIGHTBOX */}
      {lightboxOpen && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-md flex items-center justify-center p-4"
          onClick={() => setLightboxOpen(false)}
        >
          <button
            className="absolute top-5 right-5 w-10 h-10 rounded-full glass-strong text-zinc-900 flex items-center justify-center"
            onClick={() => setLightboxOpen(false)}
            aria-label="Close"
          >
            <X size={18} />
          </button>
          <img
            src={mainImage}
            alt={product.name}
            className="max-w-full max-h-full object-contain rounded-xl"
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

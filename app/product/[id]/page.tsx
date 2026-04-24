"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ShoppingCart, ArrowLeft, ChevronRight } from "lucide-react";
import { useCart } from "../../components/cartProvider";
import { supabase } from "../../../lib/supabase";

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
  categories: { name: string }[] | null;
  variants: Variant[];
  product_images: ProductImage[];
};

export default function ProductPage() {
  const params = useParams();
  const router = useRouter();
  const { addToCart, cartItems } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [mainImage, setMainImage] = useState("");
  const [activeThumb, setActiveThumb] = useState(0);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    async function fetchProduct() {
      const { data, error } = await supabase
        .from("products")
        .select(`
          id,
          name,
          description,
          image_url,
          price,
          categories ( name ),
          variants ( id, size, stock ),
          product_images ( id, image_url, position )
        `)
        .eq("id", params.id)
        .single();

      if (error || !data) {
        console.error("Product fetch error:", error?.message);
        setLoading(false);
        return;
      }

      const sorted = [...(data.product_images ?? [])].sort(
        (a, b) => a.position - b.position
      );

      setProduct({ ...data, product_images: sorted });
      setMainImage(sorted[0]?.image_url ?? data.image_url);
      setLoading(false);
    }

    fetchProduct();
  }, [params.id]);

  const handleAddToCart = () => {
    if (!selectedVariant || !product) return;

    addToCart({
      id: selectedVariant.id,
      product_id: product.id,
      name: product.name,
      image_url: product.image_url,
      size: selectedVariant.size,
      price: product.price,
      quantity: 1,
    });

    setAdded(true);
    setTimeout(() => {
      setAdded(false);
      router.push("/cart");
    }, 1000);
  };

  const handleThumb = (img: ProductImage, idx: number) => {
    setMainImage(img.image_url);
    setActiveThumb(idx);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-zinc-950 flex">
        {/* SKELETON LEFT */}
        <div className="w-full md:w-1/2 h-screen bg-zinc-900 animate-pulse" />
        {/* SKELETON RIGHT */}
        <div className="hidden md:flex flex-col gap-6 flex-1 p-16 pt-24">
          <div className="h-3 bg-zinc-800 rounded-full w-1/4 animate-pulse" />
          <div className="h-8 bg-zinc-800 rounded-full w-3/4 animate-pulse" />
          <div className="h-6 bg-zinc-800 rounded-full w-1/4 animate-pulse" />
          <div className="flex gap-3 mt-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="w-12 h-12 bg-zinc-800 rounded-xl animate-pulse" />
            ))}
          </div>
          <div className="h-14 bg-zinc-800 rounded-2xl mt-4 animate-pulse" />
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-zinc-600 text-xs tracking-[0.3em] uppercase">Product not found</p>
          <Link href="/" className="text-xs tracking-widest uppercase text-zinc-400 hover:text-white transition-colors border border-zinc-800 px-6 py-3 rounded-xl inline-block hover:border-zinc-600">
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
    <div className="bg-zinc-950 min-h-screen text-white">

      {/* NAV */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/60">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-4 flex items-center">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-xs tracking-widest uppercase flex-1"
          >
            <ArrowLeft size={14} strokeWidth={1.5} />
            Back
          </button>

          <Link href="/" className="font-bold tracking-[0.5em] text-sm uppercase flex-1 text-center">
            EXILES
          </Link>

          <div className="flex justify-end flex-1">
            <Link href="/cart" className="relative text-zinc-400 hover:text-white transition-colors">
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

      {/* BREADCRUMB */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 pt-24 pb-4">
        <div className="flex items-center gap-2 text-[10px] tracking-widest uppercase text-zinc-600">
          <Link href="/" className="hover:text-zinc-400 transition-colors">Shop</Link>
          <ChevronRight size={10} />
          <span className="text-zinc-500">{product.categories?.[0]?.name ?? "Product"}</span>
          <ChevronRight size={10} />
          <span className="text-zinc-400 truncate max-w-[200px]">{product.name}</span>
        </div>
      </div>

      {/* MAIN CONTENT */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 pb-20">
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
                        ? "border-white/60 opacity-100"
                        : "border-zinc-800 opacity-50 hover:opacity-80 hover:border-zinc-600"
                    }`}
                  >
                    <img
                      src={img.image_url}
                      alt=""
                      className="w-full h-full object-cover"
                    />
                  </button>
                ))}
              </div>
            )}

            {/* MAIN IMAGE */}
            <div className="flex-1 relative">
              <div className="rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800/60 aspect-[3/4]">
                <img
                  src={mainImage}
                  alt={product.name}
                  className="w-full h-full object-cover transition-all duration-500"
                />
              </div>

              {/* MOBILE THUMBS */}
              {gallery.length > 1 && (
                <div className="flex sm:hidden gap-2 mt-3 justify-center">
                  {gallery.map((img, idx) => (
                    <button
                      key={img.id}
                      onClick={() => handleThumb(img, idx)}
                      className={`w-12 h-12 rounded-lg overflow-hidden border-2 transition-all ${
                        activeThumb === idx ? "border-white/60" : "border-zinc-800 opacity-50"
                      }`}
                    >
                      <img src={img.image_url} alt="" className="w-full h-full object-cover" />
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
              <p className="text-[10px] tracking-[0.4em] uppercase text-zinc-600 mb-2">
                {product.categories?.[0]?.name ?? "EXILES"}
              </p>
              <h1 className="text-2xl sm:text-3xl font-light leading-snug text-white">
                {product.name}
              </h1>
              <div className="flex items-baseline gap-3 mt-3">
                <p className="text-2xl font-semibold text-white">
                  ₦{(product.price / 100).toLocaleString()}
                </p>
              </div>
            </div>

            {/* DIVIDER */}
            <div className="border-t border-zinc-800/60" />

            {/* SIZE SELECTOR */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs tracking-[0.2em] uppercase text-zinc-400">
                  Select Size
                  {selectedVariant && (
                    <span className="text-white ml-2">— {selectedVariant.size}</span>
                  )}
                </p>
                <button className="text-[10px] tracking-widest uppercase text-zinc-600 hover:text-zinc-400 transition-colors underline underline-offset-2">
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
                          ? "bg-zinc-900/50 text-zinc-700 cursor-not-allowed border border-zinc-800/50"
                          : isSelected
                          ? "bg-white text-zinc-950 border-2 border-white shadow-lg shadow-white/10"
                          : "bg-zinc-900 text-zinc-300 border border-zinc-700 hover:border-zinc-500 hover:text-white"
                      }`}
                    >
                      {variant.size}
                      {outOfStock && (
                        <span className="absolute inset-0 flex items-center justify-center">
                          <span className="w-8 h-px bg-zinc-700 rotate-45 absolute" />
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {selectedVariant && selectedVariant.stock > 0 && selectedVariant.stock <= 3 && (
                <p className="text-[10px] text-red-400/80 mt-3 uppercase tracking-widest">
                  Only {selectedVariant.stock} left in stock
                </p>
              )}
            </div>

            {/* ADD TO CART */}
            <button
              onClick={handleAddToCart}
              disabled={!selectedVariant || added}
              className={`w-full py-4 rounded-2xl text-xs tracking-[0.3em] uppercase font-semibold transition-all duration-300 ${
                added
                  ? "bg-zinc-800 text-zinc-400 cursor-not-allowed"
                  : !selectedVariant
                  ? "bg-zinc-900 text-zinc-600 cursor-not-allowed border border-zinc-800"
                  : "bg-white text-zinc-950 hover:bg-zinc-100 shadow-lg shadow-white/5"
              }`}
            >
              {added
                ? "✓ Added to Bag"
                : !selectedVariant
                ? "Select a Size"
                : "Add to Bag"}
            </button>

            {/* DIVIDER */}
            <div className="border-t border-zinc-800/60" />

            {/* DESCRIPTION */}
            <div className="space-y-4">
              <div>
                <p className="text-[10px] tracking-[0.3em] uppercase text-zinc-500 mb-2">
                  About This Piece
                </p>
                <p className="text-sm text-zinc-400 leading-relaxed">
                  {product.description}
                </p>
              </div>

              {/* DETAILS GRID */}
              <div className="grid grid-cols-2 gap-3 mt-4">
                <div className="bg-zinc-900/60 rounded-xl p-4 border border-zinc-800/40">
                  <p className="text-[9px] tracking-[0.3em] uppercase text-zinc-600 mb-1">Delivery</p>
                  <p className="text-xs text-zinc-300">3–4 working days</p>
                </div>
                <div className="bg-zinc-900/60 rounded-xl p-4 border border-zinc-800/40">
                  <p className="text-[9px] tracking-[0.3em] uppercase text-zinc-600 mb-1">Returns</p>
                  <p className="text-xs text-zinc-300">7 day policy</p>
                </div>
                <div className="bg-zinc-900/60 rounded-xl p-4 border border-zinc-800/40">
                  <p className="text-[9px] tracking-[0.3em] uppercase text-zinc-600 mb-1">Material</p>
                  <p className="text-xs text-zinc-300">Premium quality</p>
                </div>
                <div className="bg-zinc-900/60 rounded-xl p-4 border border-zinc-800/40">
                  <p className="text-[9px] tracking-[0.3em] uppercase text-zinc-600 mb-1">Origin</p>
                  <p className="text-xs text-zinc-300">EXILES Studio</p>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
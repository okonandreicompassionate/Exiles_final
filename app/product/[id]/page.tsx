"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
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
  const { addToCart } = useCart();

  const [product, setProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<Variant | null>(null);
  const [mainImage, setMainImage] = useState("");
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

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <p className="text-zinc-600 text-xs tracking-widest uppercase animate-pulse">
          Loading...
        </p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Product Not Found</h1>
          <Link href="/" className="text-zinc-400 hover:text-white underline">
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
    <div className="bg-black min-h-screen text-white">

      {/* NAV */}
      <nav className="sticky top-0 z-50 backdrop-blur-md bg-black/70 border-b border-zinc-800">
        <div className="max-w-[1200px] mx-auto px-4 py-4 flex justify-between items-center text-sm">
          <button
            onClick={() => router.back()}
            className="text-zinc-400 hover:text-white transition"
          >
            Back
          </button>
          <h1 className="tracking-[0.3em] font-bold">EXILES</h1>
          <Link href="/cart" className="text-zinc-300 hover:text-white transition">
            Cart
          </Link>
        </div>
      </nav>

      <div className="max-w-[1200px] mx-auto px-4 py-8 grid md:grid-cols-2 gap-10">

        {/* IMAGE GALLERY */}
        <div className="bg-zinc-900 rounded-2xl p-4 border border-zinc-800">
          <img
            src={mainImage}
            alt={product.name}
            className="rounded-xl w-full h-[400px] sm:h-[500px] object-cover mb-4"
          />
          <div className="flex gap-3 justify-center">
            {gallery.map((img) => (
              <img
                key={img.id}
                src={img.image_url}
                onClick={() => setMainImage(img.image_url)}
                className={`w-20 h-20 object-cover rounded-lg border-2 cursor-pointer transition ${
                  mainImage === img.image_url
                    ? "border-white"
                    : "border-zinc-700 hover:border-zinc-500"
                }`}
              />
            ))}
          </div>
        </div>

        {/* INFO */}
        <div className="space-y-6 flex flex-col justify-center">

          <div>
            <p className="text-xs tracking-widest text-zinc-500 uppercase">
              {product.categories?.[0]?.name ?? "EXILES"}
            </p>
            <h1 className="text-3xl font-semibold mt-2">{product.name}</h1>
            <p className="text-xl mt-2 font-medium">
              ${(product.price / 100).toFixed(2)}
            </p>
          </div>

          {/* SIZE SELECTOR */}
          <div>
            <p className="text-sm mb-3 text-zinc-300">
              Select Size {selectedVariant && `— ${selectedVariant.size}`}
            </p>
            <div className="flex gap-3 flex-wrap">
              {product.variants.map((variant) => {
                const outOfStock = variant.stock === 0;
                return (
                  <button
                    key={variant.id}
                    onClick={() => !outOfStock && setSelectedVariant(variant)}
                    disabled={outOfStock}
                    className={`px-5 py-2 rounded-full border text-sm font-medium transition-all ${
                      outOfStock
                        ? "border-zinc-800 text-zinc-700 cursor-not-allowed line-through"
                        : selectedVariant?.id === variant.id
                        ? "bg-white text-black border-white"
                        : "border-zinc-700 text-zinc-300 hover:border-white"
                    }`}
                  >
                    {variant.size}
                  </button>
                );
              })}
            </div>

            {selectedVariant && selectedVariant.stock > 0 && selectedVariant.stock <= 3 && (
              <p className="text-xs text-red-400 mt-2 uppercase tracking-wider">
                Only {selectedVariant.stock} left in stock
              </p>
            )}
          </div>

          {/* ADD TO CART */}
          <button
            onClick={handleAddToCart}
            disabled={!selectedVariant || added}
            className={`w-full py-3 rounded-full text-lg font-semibold tracking-wide transition-colors ${
              added
                ? "bg-white/20 text-zinc-400 cursor-not-allowed"
                : !selectedVariant
                ? "bg-zinc-800 text-zinc-600 cursor-not-allowed"
                : "bg-white text-black hover:bg-zinc-200"
            }`}
          >
            {added ? "Added ✓" : !selectedVariant ? "Select a Size" : "Add to Cart"}
          </button>

          {/* DESCRIPTION + SHIPPING */}
          <div className="space-y-4">
            <div className="bg-zinc-900 p-5 rounded-xl border border-zinc-800">
              <h3 className="font-medium mb-2">Description</h3>
              <p className="text-sm text-zinc-400">{product.description}</p>
            </div>
            <div className="bg-zinc-900 p-5 rounded-xl border border-zinc-800">
              <h3 className="font-medium mb-2">Shipping</h3>
              <p className="text-sm text-zinc-400">3–4 working days delivery.</p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
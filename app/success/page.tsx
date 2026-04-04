"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useCart } from "../components/cartProvider";

export default function SuccessPage() {
  const { clearCart } = useCart();

  useEffect(() => {
    clearCart();
  }, []);

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-6 px-4">
      <p className="text-4xl">🎉</p>
      <h1 className="text-xl font-bold tracking-[0.2em] uppercase">
        Order Confirmed
      </h1>
      <p className="text-zinc-500 text-sm tracking-widest text-center">
        Your payment was successful. We'll be in touch soon.
      </p>
      <Link
        href="/shop"
        className="border border-white/20 text-white text-xs tracking-[0.25em] uppercase px-8 py-3 hover:bg-white hover:text-black transition-colors duration-300"
      >
        Continue Shopping
      </Link>
    </div>
  );
}
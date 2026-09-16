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
    <div className="min-h-screen bg-white text-zinc-900 flex flex-col items-center justify-center gap-6 px-4">
      <div className="glass-strong rounded-3xl p-10 flex flex-col items-center gap-6 max-w-sm w-full text-center">
        <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-3xl">
          🎉
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-[0.2em] uppercase">
            Order Confirmed
          </h1>
          <p className="text-zinc-500 text-sm tracking-wide text-center mt-3 leading-relaxed">
            Your payment was successful. We'll be in touch soon with delivery updates.
          </p>
        </div>
        <Link
          href="/shop"
          className="w-full bg-zinc-900 text-white text-xs tracking-[0.25em] uppercase px-8 py-3.5 rounded-xl font-semibold hover:bg-zinc-700 transition-colors duration-300"
        >
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}
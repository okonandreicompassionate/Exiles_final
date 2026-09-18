"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Copy, CheckCircle2 } from "lucide-react";
import { useToast } from "../components/toastProvider";
import { useCart } from "../components/cartProvider";
import { supabase, isSupabaseConfigured } from "../../lib/supabase";

export default function PayPage() {
  const [order, setOrder] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const { showToast } = useToast();
  const { clearCart } = useCart();

  useEffect(() => {
    const savedOrder = localStorage.getItem("pendingOrder");

    if (savedOrder) {
      setOrder(JSON.parse(savedOrder));
    }
  }, []);

  const copyAccount = async () => {
    await navigator.clipboard.writeText("80828268947");

    setCopied(true);
    showToast("Account number copied", "success");

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  if (!order) {
    return (
      <div className="min-h-screen bg-white text-zinc-900 flex items-center justify-center gap-3">
        <div className="w-5 h-5 rounded-full border-2 border-zinc-900/15 border-t-zinc-900 animate-spin" />
        <span className="text-sm text-zinc-500 tracking-wide">
          Loading order...
        </span>
      </div>
    );
  }

  const markPaymentClaimed = () => {
    const orderId = localStorage.getItem("pendingOrderId");
    if (!orderId || !isSupabaseConfigured || !supabase) return;
    clearCart();
    localStorage.removeItem("pendingOrder");
    // Best-effort — the WhatsApp proof is still what the admin actually
    // confirms against before fulfilling. This just gets it out of "pending".
    supabase
      .from("orders")
      .update({ status: "paid" })
      .eq("id", orderId)
      .then(({ error }) => {
        if (error)
          console.warn(
            "Order status update failed (non-blocking):",
            error.message,
          );
      });
  };

  const whatsappMessage = encodeURIComponent(`
NEW ORDER - EXILES

Name: ${order.form.name}
Order code: ${order.orderCode ?? "Pending"}
Phone: ${order.form.phone}
State: ${order.form.state}

Items:
${order.cartItems.map((item: any) => `- ${item.name} | Size: ${item.size}${item.color ? ` | Color: ${item.color}` : ""} | Qty: ${item.quantity}`).join("\n")}

Total: ₦${(order.total / 100).toLocaleString()}

I have completed payment.
`);

  return (
    <div className="min-h-screen bg-white text-zinc-900 px-4 py-10">
      <div className="max-w-xl mx-auto">
        <div className="mb-8">
          <p className="text-zinc-500 uppercase tracking-[0.3em] text-xs mb-3">
            Complete Payment
          </p>

          <h1 className="text-3xl font-bold">Pay Directly by Transfer</h1>
          <p className="mt-2 text-sm text-zinc-600 leading-relaxed">
            Transfer the exact total below, then tap the button to send your
            payment proof on WhatsApp.
          </p>
          <p className="mt-2 text-sm text-amber-700 font-semibold tracking-wide">
            Order code: {order.orderCode ?? "Pending"}
          </p>
        </div>

        <div className="glass-strong rounded-3xl p-6 space-y-6">
          <div>
            <p className="text-zinc-500 text-xs uppercase tracking-widest mb-2">
              Amount
            </p>

            <h2 className="text-4xl font-bold">
              ₦{(order.total / 100).toLocaleString()}
            </h2>
          </div>

          {/* ORDER RECAP */}
          {Array.isArray(order.cartItems) && order.cartItems.length > 0 && (
            <div className="border-t border-zinc-900/10 pt-4 space-y-2">
              {order.cartItems.map((item: any) => (
                <div
                  key={`${item.id}-${item.size}-${item.color ?? ""}`}
                  className="flex justify-between text-xs text-zinc-500"
                >
                  <span className="truncate pr-2">
                    {item.name} ({item.size}
                    {item.color ? `, ${item.color}` : ""}) ×{item.quantity}
                  </span>
                  <span className="text-zinc-700 flex-shrink-0">
                    ₦{((item.price * item.quantity) / 100).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div className="border-t border-zinc-900/10 pt-6 space-y-4">
            <div>
              <p className="text-zinc-500 text-xs uppercase tracking-widest mb-1">
                Bank
              </p>

              <p className="text-lg font-bold tracking-wide">PALMPAY</p>
            </div>

            <div>
              <p className="text-zinc-500 text-xs uppercase tracking-widest mb-1">
                Account Number
              </p>

              <div className="flex items-center justify-between glass rounded-2xl px-4 py-4">
                <span className="text-xl font-bold tracking-wider">
                  80828268947
                </span>

                <button
                  onClick={copyAccount}
                  className="text-zinc-500 hover:text-zinc-900 transition-colors"
                  aria-label="Copy account number"
                >
                  {copied ? (
                    <CheckCircle2 size={18} className="text-emerald-600" />
                  ) : (
                    <Copy size={18} />
                  )}
                </button>
              </div>
            </div>

            <div>
              <p className="text-zinc-500 text-xs uppercase tracking-widest mb-1">
                Account Name
              </p>

              <p className="text-lg font-bold">Tolu aina</p>
            </div>
          </div>

          <a
            href={`https://wa.me/2347071879241?text=${whatsappMessage}`}
            target="_blank"
            onClick={markPaymentClaimed}
            className="block w-full text-center py-4 bg-zinc-900 text-white rounded-2xl font-semibold tracking-[0.2em] uppercase text-xs hover:bg-zinc-700 transition-colors"
          >
            I’ve Made Payment
          </a>

          <p className="text-zinc-500 text-xs text-center leading-relaxed">
            After payment, tap the button above and send your proof of payment
            on WhatsApp.
          </p>
        </div>

        <Link
          href="/shop"
          className="block text-center text-zinc-500 hover:text-zinc-900 text-xs uppercase tracking-[0.2em] mt-6 transition-colors"
        >
          Continue Shopping
        </Link>
      </div>
    </div>
  );
}

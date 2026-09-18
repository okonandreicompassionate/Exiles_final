"use client";

import { FormEvent, useEffect, useState } from "react";
import Link from "next/link";
import { Copy, Search, CheckCircle2 } from "lucide-react";

const statusStyles: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-700",
  paid: "bg-sky-500/10 text-sky-700",
  fulfilled: "bg-emerald-500/10 text-emerald-700",
  cancelled: "bg-red-500/10 text-red-600",
};

function naira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString()}`;
}

export default function OrdersPage() {
  const [code, setCode] = useState("");
  const [orders, setOrders] = useState<any[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const queryCode =
      new URLSearchParams(window.location.search).get("code") ?? "";
    const savedCodes = JSON.parse(
      window.localStorage.getItem("exiles-order-codes") ?? "[]",
    );
    const codes = Array.isArray(savedCodes)
      ? savedCodes.filter((value) => typeof value === "string")
      : [];
    const allCodes =
      queryCode && !codes.includes(queryCode.toUpperCase())
        ? [queryCode.toUpperCase(), ...codes]
        : codes;
    if (queryCode) setCode(queryCode.toUpperCase());
    if (allCodes.length > 0) void loadOrders(allCodes);
  }, []);

  async function loadOrders(codes: string[]) {
    setLoading(true);
    const results = await Promise.all(
      codes.map(async (savedCode) => {
        const response = await fetch(
          `/api/order-track?code=${encodeURIComponent(savedCode)}`,
        );
        if (!response.ok) return null;
        const body = await response.json();
        return body.order ?? null;
      }),
    );
    setOrders(results.filter(Boolean));
    setLoading(false);
  }

  async function searchOrder(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");
    setOrders([]);

    try {
      const response = await fetch(
        `/api/order-track?code=${encodeURIComponent(code)}`,
      );
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Order not found.");
      setOrders([body.order]);
      const savedCodes = JSON.parse(
        localStorage.getItem("exiles-order-codes") ?? "[]",
      );
      const codes = Array.isArray(savedCodes)
        ? savedCodes.filter((value) => typeof value === "string")
        : [];
      if (!codes.includes(body.order.orderCode)) {
        localStorage.setItem(
          "exiles-order-codes",
          JSON.stringify([body.order.orderCode, ...codes]),
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Order not found.");
    } finally {
      setLoading(false);
    }
  }

  async function copyCode() {
    if (!orders[0]?.orderCode) return;
    await navigator.clipboard.writeText(orders[0].orderCode);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <main className="min-h-screen bg-white text-zinc-900 px-4 py-10">
      <div className="max-w-xl mx-auto">
        <Link
          href="/shop"
          className="text-xs uppercase tracking-[0.25em] text-zinc-500 hover:text-zinc-900"
        >
          ← Back to shop
        </Link>
        <div className="mt-16 mb-8">
          <p className="text-[10px] uppercase tracking-[0.4em] text-amber-700 mb-3">
            EX1LES order archive
          </p>
          <h1 className="text-3xl sm:text-4xl font-semibold">
            Track your order
          </h1>
          <p className="text-sm text-zinc-500 mt-3 leading-relaxed">
            Your order code is your receipt. No account or login is required.
          </p>
        </div>

        <form onSubmit={searchOrder} className="flex gap-2">
          <input
            value={code}
            onChange={(event) => setCode(event.target.value.toUpperCase())}
            placeholder="EX-260918-A1B2C3"
            className="flex-1 glass-input rounded-xl px-4 py-3.5 outline-none font-mono tracking-wider"
            aria-label="Order code"
          />
          <button
            type="submit"
            disabled={loading}
            className="px-5 rounded-xl bg-zinc-900 text-white disabled:opacity-50"
            aria-label="Search order"
          >
            <Search size={17} />
          </button>
        </form>

        {error && <p className="mt-4 text-sm text-red-600">{error}</p>}

        {orders.length > 0 && (
          <section className="mt-8 space-y-4">
            <p className="text-[10px] uppercase tracking-[0.3em] text-zinc-400">
              Saved order history
            </p>
            {orders.map((order) => (
              <article
                key={order.orderCode}
                className="glass rounded-2xl p-5 sm:p-6 space-y-6"
              >
                <div className="flex items-start justify-between gap-4 border-b border-zinc-900/10 pb-5">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-zinc-400">
                      Order code
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <h2 className="font-mono text-lg font-semibold tracking-wider">
                        {order.orderCode}
                      </h2>
                      <button
                        type="button"
                        onClick={copyCode}
                        className="text-zinc-500 hover:text-zinc-900"
                        aria-label="Copy order code"
                      >
                        {copied && orders[0]?.orderCode === order.orderCode ? (
                          <CheckCircle2
                            size={16}
                            className="text-emerald-600"
                          />
                        ) : (
                          <Copy size={16} />
                        )}
                      </button>
                    </div>
                  </div>
                  <span
                    className={`text-[10px] uppercase tracking-widest px-2.5 py-1.5 rounded-full ${statusStyles[order.status] ?? "bg-zinc-900/5 text-zinc-600"}`}
                  >
                    {order.status}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-zinc-400">
                      Placed
                    </p>
                    <p className="mt-1">
                      {new Date(order.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-widest text-zinc-400">
                      Total
                    </p>
                    <p className="mt-1 font-semibold">{naira(order.total)}</p>
                  </div>
                </div>

                <div className="border-t border-zinc-900/10 pt-5 space-y-3">
                  <p className="text-[10px] uppercase tracking-widest text-zinc-400">
                    Items
                  </p>
                  {order.items.map((item: any, index: number) => (
                    <div
                      key={`${item.name}-${index}`}
                      className="flex justify-between gap-4 text-sm"
                    >
                      <span>
                        {item.name} · {item.size ?? "One size"}
                        {item.color ? ` · ${item.color}` : ""} ×{item.quantity}
                      </span>
                      <span className="font-medium">
                        {naira(item.price * item.quantity)}
                      </span>
                    </div>
                  ))}
                </div>
              </article>
            ))}
          </section>
        )}

        <p className="text-xs text-zinc-400 mt-8 leading-relaxed">
          Keep your order code private. EX1LES will use it to identify your
          order when you contact us.
        </p>
      </div>
    </main>
  );
}

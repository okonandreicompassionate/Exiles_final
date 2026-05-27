"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Copy, CheckCircle2 } from "lucide-react";

export default function PayPage() {
  const [order, setOrder] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const data = localStorage.getItem("pendingOrder");

    if (data) {
      setOrder(JSON.parse(data));
    }
  }, []);

  const copyAccount = async () => {
    await navigator.clipboard.writeText("1234567890");
    setCopied(true);

    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  if (!order) {
    return (
      <div className="min-h-screen bg-zinc-950 text-white flex items-center justify-center">
        Loading...
      </div>
    );
  }

  const whatsappMessage = encodeURIComponent(`
NEW ORDER — EXILES

Name: ${order.form.name}
Phone: ${order.form.phone}
State: ${order.form.state}

Total Paid: ₦${(order.total / 100).toLocaleString()}

I have completed payment.
  `);

  return (
    <div className="min-h-screen bg-zinc-950 text-white px-4 py-10">
      <div className="max-w-xl mx-auto">

        <div className="mb-8">
          <p className="text-zinc-500 uppercase tracking-[0.3em] text-xs mb-3">
            Complete Payment
          </p>

          <h1 className="text-3xl font-bold">
            Bank Transfer
          </h1>
        </div>

        <div className="bg-zinc-900 border border-zinc-800 rounded-3xl p-6 space-y-6">

          {/* TOTAL */}
          <div>
            <p className="text-zinc-500 text-xs uppercase tracking-widest mb-2">
              Amount
            </p>

            <h2 className="text-4xl font-bold">
              ₦{(order.total / 100).toLocaleString()}
            </h2>
          </div>

          {/* ACCOUNT */}
          <div className="border-t border-zinc-800 pt-6 space-y-4">

            <div>
              <p className="text-zinc-500 text-xs uppercase tracking-widest mb-1">
                Bank
              </p>

              <p className="text-lg font-medium">
                Opay
              </p>
            </div>

            <div>
              <p className="text-zinc-500 text-xs uppercase tracking-widest mb-1">
                Account Number
              </p>

              <div className="flex items-center justify-between bg-zinc-950 border border-zinc-800 rounded-2xl px-4 py-4">
                <span className="text-xl font-bold tracking-wider">
                  1234567890
                </span>

                <button
                  onClick={copyAccount}
                  className="text-zinc-400 hover:text-white transition-colors"
                >
                  <Copy size={18} />
                </button>
              </div>

              {copied && (
                <p className="text-green-500 text-xs mt-2 flex items-center gap-1">
                  <CheckCircle2 size={12} />
                  Copied
                </p>
              )}
            </div>

            <div>
              <p className="text-zinc-500 text-xs uppercase tracking-widest mb-1">
                Account Name
              </p>

              <p className="text-lg font-medium">
                YOUR NAME
              </p>
            </div>

          </div>

          {/* WHATSAPP */}
          <a
            href={`https://wa.me/234XXXXXXXXXX?text=${whatsappMessage}`}
            target="_blank"
            className="block w-full text-center py-4 bg-white text-zinc-950 rounded-2xl font-semibold tracking-[0.2em] uppercase text-xs hover:bg-zinc-200 transition-colors"
          >
            I’ve Made Payment
          </a>

          <p className="text-zinc-600 text-xs text-center leading-relaxed">
            After making payment, tap the button above and send your payment proof on WhatsApp for confirmation.
          </p>

        </div>

        <Link
          href="/shop"
          className="block text-center text-zinc-600 hover:text-white transition-colors text-xs uppercase tracking-[0.2em] mt-6"
        >
          Continue Shopping
        </Link>

      </div>
    </div>
  );
}
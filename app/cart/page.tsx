"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "../components/cartProvider";

const NIGERIAN_STATES = [
  "Abia", "Adamawa", "Akwa Ibom", "Anambra", "Bauchi", "Bayelsa",
  "Benue", "Borno", "Cross River", "Delta", "Ebonyi", "Edo",
  "Ekiti", "Enugu", "Gombe", "Imo", "Jigawa", "Kaduna", "Kano",
  "Katsina", "Kebbi", "Kogi", "Kwara", "Nasarawa", "Niger",
  "Ogun", "Ondo", "Osun", "Oyo", "Plateau", "Rivers",
  "Sokoto", "Taraba", "Yobe", "Zamfara",
];

const EXPRESS_STATES = ["Lagos", "Abuja", "Rivers"];

const DELIVERY_PRICES: Record<string, number> = {
  Lagos: 1500,
  Abuja: 2000,
  Rivers: 2000,
  other: 3500,
};

function getDeliveryFee(state: string): number {
  if (!state) return 0;
  if (EXPRESS_STATES.includes(state)) return DELIVERY_PRICES[state];
  return DELIVERY_PRICES.other;
}

function getDeliveryLabel(state: string): string {
  if (!state) return "Select a state";
  if (EXPRESS_STATES.includes(state)) return `₦${getDeliveryFee(state).toLocaleString()} — Express`;
  return `₦${getDeliveryFee(state).toLocaleString()} — Standard (5–7 days)`;
}

export default function CartPage() {
  const { cartItems, removeFromCart, updateQuantity } = useCart();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    whatsapp: "",
    address: "",
    city: "",
    state: "",
  });

  const orderTotal = cartItems.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );

  const deliveryFee = getDeliveryFee(form.state);
  const grandTotal = orderTotal + deliveryFee * 100;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleCheckout = async () => {
    if (!form.email || !form.name || !form.phone || !form.address || !form.state) {
      alert("Please fill in all required fields including your state!");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/paystack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: form.email,
          amount: grandTotal,
          metadata: {
            name: form.name,
            phone: form.phone,
            whatsapp: form.whatsapp,
            address: form.address,
            city: form.city,
            state: form.state,
            delivery_fee: deliveryFee,
            items: cartItems.map((item) => ({
              name: item.name,
              size: item.size,
              quantity: item.quantity,
              price: item.price,
            })),
          },
        }),
      });

      const data = await response.json();

      if (data.url) {
        window.location.href = data.url;
      } else {
        alert("Checkout failed. Try again!");
        setLoading(false);
      }
    } catch (err) {
      console.error("Checkout error:", err);
      alert("Something went wrong. Try again!");
      setLoading(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-black text-white flex flex-col items-center justify-center gap-6 px-4">
        <p className="text-zinc-500 tracking-[0.2em] uppercase text-sm">
          Your cart is empty
        </p>
        <Link
          href="/"
          className="border border-white/20 text-white text-xs tracking-[0.25em] uppercase px-8 py-3 hover:bg-white hover:text-black transition-colors duration-300"
        >
          Return to Shop
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-white">

      {/* NAV */}
      <nav className="sticky top-0 z-50 bg-black/80 backdrop-blur-md border-b border-white/10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex justify-between items-center">
          <button
            onClick={() => window.history.back()}
            className="text-zinc-400 text-xs tracking-[0.2em] uppercase hover:text-white transition-colors"
          >
            Back
          </button>
          <Link href="/" className="text-xs font-bold tracking-[0.35em] uppercase text-white">
            EXILES
          </Link>
          <span className="text-zinc-500 text-xs tracking-widest uppercase">
            {cartItems.length} {cartItems.length === 1 ? "item" : "items"}
          </span>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-6 py-12 grid grid-cols-1 lg:grid-cols-3 gap-12">

        {/* LEFT — CART ITEMS + DELIVERY FORM */}
        <div className="lg:col-span-2 space-y-10">

          {/* CART ITEMS */}
          <div className="space-y-px">
            <p className="text-xs tracking-[0.3em] uppercase text-zinc-500 mb-6">
              Your Bag
            </p>
            {cartItems.map((item) => (
              <div
                key={`${item.id}-${item.size}`}
                className="flex gap-5 py-6 border-b border-white/10"
              >
                <div className="w-24 h-28 bg-zinc-900 flex-shrink-0 overflow-hidden">
                  {item.image_url ? (
                    <img
                      src={item.image_url}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-zinc-800" />
                  )}
                </div>

                <div className="flex-1 flex flex-col justify-between">
                  <div className="flex justify-between items-start">
                    <div>
                      <h2 className="text-sm tracking-[0.1em] uppercase font-medium">
                        {item.name}
                      </h2>
                      <p className="text-zinc-500 text-xs tracking-widest mt-1 uppercase">
                        Size {item.size}
                      </p>
                    </div>
                    <span className="text-sm text-white">
                      ${((item.price * item.quantity) / 100).toFixed(2)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-4">
                    <div className="flex items-center border border-white/20">
                      <button
                        onClick={() =>
                          item.quantity > 1
                            ? updateQuantity(item.id, item.size, item.quantity - 1)
                            : removeFromCart(item.id, item.size)
                        }
                        className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors text-lg leading-none"
                      >
                        −
                      </button>
                      <span className="w-8 text-center text-sm tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          updateQuantity(item.id, item.size, item.quantity + 1)
                        }
                        className="w-8 h-8 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-white/10 transition-colors text-lg leading-none"
                      >
                        +
                      </button>
                    </div>
                    <button
                      onClick={() => removeFromCart(item.id, item.size)}
                      className="text-xs tracking-widest uppercase text-zinc-600 hover:text-red-400 transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* DELIVERY FORM */}
          <div>
            <p className="text-xs tracking-[0.3em] uppercase text-zinc-500 mb-6">
              Delivery Details
            </p>
            <div className="space-y-3">
              <input
                type="text"
                name="name"
                placeholder="Full Name *"
                value={form.name}
                onChange={handleChange}
                className="w-full bg-black border border-white/20 text-white text-xs tracking-wide px-4 py-3 outline-none focus:border-white/50 transition-colors placeholder-zinc-600"
              />
              <input
                type="email"
                name="email"
                placeholder="Email Address *"
                value={form.email}
                onChange={handleChange}
                className="w-full bg-black border border-white/20 text-white text-xs tracking-wide px-4 py-3 outline-none focus:border-white/50 transition-colors placeholder-zinc-600"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="tel"
                  name="phone"
                  placeholder="Phone Number *"
                  value={form.phone}
                  onChange={handleChange}
                  className="w-full bg-black border border-white/20 text-white text-xs tracking-wide px-4 py-3 outline-none focus:border-white/50 transition-colors placeholder-zinc-600"
                />
                <input
                  type="tel"
                  name="whatsapp"
                  placeholder="WhatsApp Number"
                  value={form.whatsapp}
                  onChange={handleChange}
                  className="w-full bg-black border border-white/20 text-white text-xs tracking-wide px-4 py-3 outline-none focus:border-white/50 transition-colors placeholder-zinc-600"
                />
              </div>
              <input
                type="text"
                name="address"
                placeholder="Delivery Address *"
                value={form.address}
                onChange={handleChange}
                className="w-full bg-black border border-white/20 text-white text-xs tracking-wide px-4 py-3 outline-none focus:border-white/50 transition-colors placeholder-zinc-600"
              />
              <input
                type="text"
                name="city"
                placeholder="City"
                value={form.city}
                onChange={handleChange}
                className="w-full bg-black border border-white/20 text-white text-xs tracking-wide px-4 py-3 outline-none focus:border-white/50 transition-colors placeholder-zinc-600"
              />

              {/* STATE DROPDOWN */}
              <div>
                <select
                  name="state"
                  value={form.state}
                  onChange={handleChange}
                  className="w-full bg-black border border-white/20 text-white text-xs tracking-wide px-4 py-3 outline-none focus:border-white/50 transition-colors appearance-none cursor-pointer"
                >
                  <option value="">Select State * (affects delivery fee)</option>
                  <optgroup label="— Express Delivery —">
                    {EXPRESS_STATES.map((s) => (
                      <option key={s} value={s}>
                        {s} — ₦{DELIVERY_PRICES[s].toLocaleString()}
                      </option>
                    ))}
                  </optgroup>
                  <optgroup label="— Standard Delivery ₦3,500 —">
                    {NIGERIAN_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </optgroup>
                </select>

                {/* DELIVERY FEE TAG */}
                {form.state && (
                  <div className="mt-2 px-3 py-2 bg-white/5 border border-white/10 text-xs text-zinc-400 tracking-wide">
                    🚚 Delivery to {form.state}: {getDeliveryLabel(form.state)}
                  </div>
                )}
              </div>

            </div>
          </div>
        </div>

        {/* RIGHT — ORDER SUMMARY */}
        <div className="lg:col-span-1">
          <div className="bg-zinc-900 border border-white/10 p-6 space-y-5 sticky top-24">
            <p className="text-xs tracking-[0.3em] uppercase text-zinc-400 border-b border-white/10 pb-4">
              Order Summary
            </p>

            {cartItems.map((item) => (
              <div key={`${item.id}-${item.size}`} className="flex justify-between text-xs text-zinc-500">
                <span className="truncate pr-2">{item.name} — {item.size} x{item.quantity}</span>
                <span className="flex-shrink-0">${((item.price * item.quantity) / 100).toFixed(2)}</span>
              </div>
            ))}

            <div className="border-t border-white/10 pt-3 space-y-3">
              <div className="flex justify-between text-sm text-zinc-400">
                <span>Subtotal</span>
                <span>${(orderTotal / 100).toFixed(2)}</span>
              </div>

              {/* DELIVERY FEE LINE */}
              <div className="flex justify-between text-sm text-zinc-400">
                <span>Delivery</span>
                {form.state ? (
                  <span className="text-white">₦{deliveryFee.toLocaleString()}</span>
                ) : (
                  <span className="text-zinc-600 italic">Select state</span>
                )}
              </div>

              <div className="border-t border-white/10 pt-3 flex justify-between text-white font-medium">
                <span className="text-xs uppercase tracking-[0.2em]">Total</span>
                <span>${(grandTotal / 100).toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={loading}
              className={`w-full py-4 text-xs tracking-[0.25em] uppercase transition-colors ${
                loading
                  ? "bg-white/10 text-zinc-500 cursor-not-allowed"
                  : "bg-white text-black hover:bg-zinc-200"
              }`}
            >
              {loading ? "Redirecting..." : "Pay with Paystack"}
            </button>

            <p className="text-zinc-600 text-[10px] tracking-wide text-center">
              * Fill all delivery details before paying
            </p>

            <Link
              href="/"
              className="block text-center text-xs tracking-[0.2em] uppercase text-zinc-600 hover:text-white transition-colors pt-2"
            >
              Continue Shopping
            </Link>
          </div>
        </div>

      </div>
    </div>
  );
}
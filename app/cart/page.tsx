"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ShoppingBag, Truck, ChevronDown } from "lucide-react";
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
  if (!state) return "";
  if (EXPRESS_STATES.includes(state)) return `Express Delivery — ₦${DELIVERY_PRICES[state].toLocaleString()}`;
  return `Standard Delivery (5–7 days) — ₦${DELIVERY_PRICES.other.toLocaleString()}`;
}

const inputClass = "w-full bg-zinc-900/60 border border-zinc-800 text-white text-sm px-4 py-3.5 rounded-xl outline-none focus:border-zinc-600 transition-colors placeholder-zinc-600";

export default function CartPage() {
  const { cartItems, removeFromCart, updateQuantity } = useCart();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"bag" | "delivery">("bag");
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
      alert("Please fill in all required fields!");
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
      <div className="min-h-screen bg-zinc-950 text-white flex flex-col items-center justify-center gap-6 px-4">
        <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center">
          <ShoppingBag size={24} strokeWidth={1.5} className="text-zinc-600" />
        </div>
        <div className="text-center">
          <p className="text-white font-medium mb-1">Your bag is empty</p>
          <p className="text-zinc-600 text-xs tracking-wide">Add something to get started</p>
        </div>
        <Link
          href="/"
          className="bg-white text-zinc-950 text-xs tracking-[0.2em] uppercase px-8 py-3.5 rounded-xl font-semibold hover:bg-zinc-100 transition-colors"
        >
          Shop Now
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-white">

      {/* NAV */}
      <nav className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-xl border-b border-zinc-800/60">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-4 flex items-center justify-between">
          <button
            onClick={() => step === "delivery" ? setStep("bag") : window.history.back()}
            className="flex items-center gap-2 text-zinc-500 hover:text-white transition-colors text-xs tracking-widest uppercase"
          >
            <ArrowLeft size={14} strokeWidth={1.5} />
            Back
          </button>
          <Link href="/" className="font-bold tracking-[0.5em] text-sm uppercase">
            EXILES
          </Link>
          <span className="text-zinc-600 text-xs tracking-widest uppercase">
            {cartItems.length} {cartItems.length === 1 ? "item" : "items"}
          </span>
        </div>

        {/* PROGRESS BAR — mobile friendly */}
        <div className="flex border-t border-zinc-800/60">
          <button
            onClick={() => setStep("bag")}
            className={`flex-1 py-2.5 text-[10px] tracking-[0.2em] uppercase transition-colors flex items-center justify-center gap-1.5 ${step === "bag" ? "text-white border-b-2 border-white" : "text-zinc-600"}`}
          >
            <ShoppingBag size={11} />
            Bag
          </button>
          <button
            onClick={() => setStep("delivery")}
            className={`flex-1 py-2.5 text-[10px] tracking-[0.2em] uppercase transition-colors flex items-center justify-center gap-1.5 ${step === "delivery" ? "text-white border-b-2 border-white" : "text-zinc-600"}`}
          >
            <Truck size={11} />
            Delivery
          </button>
        </div>
      </nav>

      <div className="max-w-5xl mx-auto px-4 sm:px-8 py-8 pb-32 lg:pb-12">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* LEFT COLUMN */}
          <div className="lg:col-span-2 space-y-6">

            {/* STEP 1 — BAG */}
            {step === "bag" && (
              <div>
                <p className="text-[10px] tracking-[0.4em] uppercase text-zinc-500 mb-5">
                  Your Bag
                </p>
                <div className="space-y-3">
                  {cartItems.map((item) => (
                    <div
                      key={`${item.id}-${item.size}`}
                      className="flex gap-4 p-4 bg-zinc-900/60 rounded-2xl border border-zinc-800/40"
                    >
                      {/* THUMBNAIL */}
                      <div className="w-20 h-24 sm:w-24 sm:h-28 bg-zinc-800 rounded-xl flex-shrink-0 overflow-hidden">
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

                      {/* DETAILS */}
                      <div className="flex-1 flex flex-col justify-between min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0">
                            <h2 className="text-sm font-medium text-white truncate">
                              {item.name}
                            </h2>
                            <p className="text-zinc-500 text-xs mt-0.5">
                              Size {item.size}
                            </p>
                          </div>
                          <span className="text-sm font-semibold text-white flex-shrink-0">
                            ₦{((item.price * item.quantity) / 100).toLocaleString()}
                          </span>
                        </div>

                        <div className="flex items-center justify-between mt-3">
                          {/* QTY CONTROL */}
                          <div className="flex items-center bg-zinc-800/60 rounded-xl overflow-hidden">
                            <button
                              onClick={() =>
                                item.quantity > 1
                                  ? updateQuantity(item.id, item.size, item.quantity - 1)
                                  : removeFromCart(item.id, item.size)
                              }
                              className="w-9 h-9 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors text-lg leading-none"
                            >
                              −
                            </button>
                            <span className="w-8 text-center text-sm tabular-nums text-white">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() => updateQuantity(item.id, item.size, item.quantity + 1)}
                              className="w-9 h-9 flex items-center justify-center text-zinc-400 hover:text-white hover:bg-zinc-700 transition-colors text-lg leading-none"
                            >
                              +
                            </button>
                          </div>

                          <button
                            onClick={() => removeFromCart(item.id, item.size)}
                            className="text-[10px] tracking-widest uppercase text-zinc-600 hover:text-red-400 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* CONTINUE TO DELIVERY — mobile step button */}
                <button
                  onClick={() => setStep("delivery")}
                  className="w-full mt-6 py-4 bg-zinc-800 text-white text-xs tracking-[0.25em] uppercase rounded-xl hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2 lg:hidden"
                >
                  Continue to Delivery
                  <Truck size={14} strokeWidth={1.5} />
                </button>
              </div>
            )}

            {/* STEP 2 — DELIVERY FORM */}
            {(step === "delivery" || true) && (
              <div className={step === "bag" ? "hidden lg:block" : "block"}>
                <p className="text-[10px] tracking-[0.4em] uppercase text-zinc-500 mb-5">
                  Delivery Details
                </p>
                <div className="space-y-3">

                  <input
                    type="text"
                    name="name"
                    placeholder="Full Name *"
                    value={form.name}
                    onChange={handleChange}
                    className={inputClass}
                  />

                  <input
                    type="email"
                    name="email"
                    placeholder="Email Address *"
                    value={form.email}
                    onChange={handleChange}
                    className={inputClass}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="tel"
                      name="phone"
                      placeholder="Phone *"
                      value={form.phone}
                      onChange={handleChange}
                      className={inputClass}
                    />
                    <input
                      type="tel"
                      name="whatsapp"
                      placeholder="WhatsApp"
                      value={form.whatsapp}
                      onChange={handleChange}
                      className={inputClass}
                    />
                  </div>

                  <input
                    type="text"
                    name="address"
                    placeholder="Delivery Address *"
                    value={form.address}
                    onChange={handleChange}
                    className={inputClass}
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <input
                      type="text"
                      name="city"
                      placeholder="City"
                      value={form.city}
                      onChange={handleChange}
                      className={inputClass}
                    />

                    {/* STATE SELECT */}
                    <div className="relative">
                      <select
                        name="state"
                        value={form.state}
                        onChange={handleChange}
                        className={`${inputClass} appearance-none cursor-pointer pr-10`}
                      >
                        <option value="">State *</option>
                        <optgroup label="Express Delivery">
                          {EXPRESS_STATES.map((s) => (
                            <option key={s} value={s}>
                              {s} — ₦{DELIVERY_PRICES[s].toLocaleString()}
                            </option>
                          ))}
                        </optgroup>
                        <optgroup label="Standard ₦3,500">
                          {NIGERIAN_STATES.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </optgroup>
                      </select>
                      <ChevronDown size={14} className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                    </div>
                  </div>

                  {/* DELIVERY INFO TAG */}
                  {form.state && (
                    <div className="flex items-center gap-3 px-4 py-3 bg-zinc-900 rounded-xl border border-zinc-800">
                      <Truck size={14} strokeWidth={1.5} className="text-zinc-500 flex-shrink-0" />
                      <p className="text-xs text-zinc-400">
                        {getDeliveryLabel(form.state)}
                      </p>
                    </div>
                  )}

                </div>
              </div>
            )}
          </div>

          {/* RIGHT — ORDER SUMMARY */}
          <div className="lg:col-span-1">
            <div className="bg-zinc-900/60 border border-zinc-800/40 rounded-2xl p-5 space-y-4 lg:sticky lg:top-32">
              <p className="text-[10px] tracking-[0.4em] uppercase text-zinc-500 pb-3 border-b border-zinc-800/60">
                Order Summary
              </p>

              {/* ITEMS */}
              <div className="space-y-2.5">
                {cartItems.map((item) => (
                  <div key={`${item.id}-${item.size}`} className="flex justify-between text-xs">
                    <span className="text-zinc-500 truncate pr-2">
                      {item.name} ({item.size}) ×{item.quantity}
                    </span>
                    <span className="text-zinc-300 flex-shrink-0">
                      ₦{((item.price * item.quantity) / 100).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-zinc-800/60 pt-3 space-y-2.5">
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>Subtotal</span>
                  <span>₦{(orderTotal / 100).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>Delivery</span>
                  {form.state ? (
                    <span className="text-white">₦{deliveryFee.toLocaleString()}</span>
                  ) : (
                    <span className="text-zinc-700 italic">Select state</span>
                  )}
                </div>
                <div className="flex justify-between text-sm font-semibold text-white pt-2 border-t border-zinc-800/60">
                  <span>Total</span>
                  <span>₦{(grandTotal / 100).toLocaleString()}</span>
                </div>
              </div>

              {/* CHECKOUT BUTTON */}
              <button
                onClick={handleCheckout}
                disabled={loading}
                className={`w-full py-4 text-xs tracking-[0.25em] uppercase font-semibold rounded-xl transition-all duration-300 ${
                  loading
                    ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
                    : "bg-white text-zinc-950 hover:bg-zinc-100 shadow-lg shadow-white/5"
                }`}
              >
                {loading ? "Redirecting..." : "Pay with Paystack"}
              </button>

              <p className="text-zinc-700 text-[10px] tracking-wide text-center">
                Fill all required fields before paying
              </p>

              <Link
                href="/"
                className="block text-center text-[10px] tracking-[0.2em] uppercase text-zinc-600 hover:text-white transition-colors"
              >
                ← Continue Shopping
              </Link>
            </div>
          </div>

        </div>
      </div>

      {/* MOBILE FIXED BOTTOM CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 bg-zinc-950/95 backdrop-blur-xl border-t border-zinc-800/60 lg:hidden">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-zinc-500 uppercase tracking-widest">Total</span>
          <span className="text-sm font-semibold text-white">
            ₦{(grandTotal / 100).toLocaleString()}
          </span>
        </div>
        <button
          onClick={step === "bag" ? () => setStep("delivery") : handleCheckout}
          disabled={loading}
          className={`w-full py-4 text-xs tracking-[0.25em] uppercase font-semibold rounded-xl transition-all ${
            loading
              ? "bg-zinc-800 text-zinc-500 cursor-not-allowed"
              : "bg-white text-zinc-950 hover:bg-zinc-100"
          }`}
        >
          {loading
            ? "Redirecting..."
            : step === "bag"
            ? "Continue to Delivery"
            : "Pay with Paystack"}
        </button>
      </div>

    </div>
  );
}
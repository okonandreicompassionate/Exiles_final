"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, ShoppingBag, Truck, ChevronDown } from "lucide-react";
import { useCart } from "../components/cartProvider";
import { useToast } from "../components/toastProvider";
import { Logo } from "../components/Logo";
import { supabase, isSupabaseConfigured } from "../../lib/supabase";

const NIGERIAN_STATES = [
  "Abia",
  "Adamawa",
  "Akwa Ibom",
  "Anambra",
  "Bauchi",
  "Bayelsa",
  "Benue",
  "Borno",
  "Cross River",
  "Delta",
  "Ebonyi",
  "Edo",
  "Ekiti",
  "Enugu",
  "Gombe",
  "Imo",
  "Jigawa",
  "Kaduna",
  "Kano",
  "Katsina",
  "Kebbi",
  "Kogi",
  "Kwara",
  "Nasarawa",
  "Niger",
  "Ogun",
  "Ondo",
  "Osun",
  "Oyo",
  "Plateau",
  "Rivers",
  "Sokoto",
  "Taraba",
  "Yobe",
  "Zamfara",
];

const EXPRESS_STATES = ["Lagos", "Abuja", "Rivers"];

const DELIVERY_PRICES: Record<string, number> = {
  Lagos: 6000,
  Abuja: 11000,
  Rivers: 11000,
  other: 11500,
};

function getDeliveryFee(state: string): number {
  if (!state) return 0;
  if (EXPRESS_STATES.includes(state)) return DELIVERY_PRICES[state];
  return DELIVERY_PRICES.other;
}

function getDeliveryLabel(state: string): string {
  if (!state) return "";
  if (EXPRESS_STATES.includes(state))
    return `Express Delivery — ₦${DELIVERY_PRICES[state].toLocaleString()}`;
  return `Standard Delivery (5–7 days) — ₦${DELIVERY_PRICES.other.toLocaleString()}`;
}

const inputClass =
  "w-full glass-input text-zinc-900 text-sm px-4 py-3.5 rounded-xl outline-none transition-colors placeholder-zinc-400";

export default function CartPage() {
  const { cartItems, removeFromCart, updateQuantity, clearCart } = useCart();
  const { showToast } = useToast();
  const [payingCard, setPayingCard] = useState(false);
  const [payingTransfer, setPayingTransfer] = useState(false);
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
    0,
  );

  const deliveryFee = getDeliveryFee(form.state);
  const grandTotal = orderTotal + deliveryFee * 100;

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const validateForm = () => {
    if (
      !form.email ||
      !form.name ||
      !form.phone ||
      !form.address ||
      !form.state
    ) {
      showToast("Please fill in all required fields", "error");
      return false;
    }
    return true;
  };

  // Records the order so it shows up in the admin dashboard/metrics and
  // returns its id, or null if that failed. Used by both payment paths.
  const createOrder = async (
    paymentMethod: "bank_transfer" | "squad",
  ): Promise<{ id: string; orderCode: string } | null> => {
    if (!isSupabaseConfigured || !supabase) {
      showToast("Supabase is not configured", "error");
      return null;
    }

    try {
      const productIds = [...new Set(cartItems.map((item) => item.product_id))];
      const { data: currentVariants, error: variantsErr } = await supabase
        .from("variants")
        .select("id, product_id, size")
        .in("product_id", productIds);

      if (variantsErr) {
        console.error("Variant lookup failed:", variantsErr);
        showToast(`Could not verify sizes: ${variantsErr.message}`, "error");
        return null;
      }

      const variantIds = new Map(
        (currentVariants ?? []).map((variant) => [
          `${variant.product_id}:${variant.size}`,
          variant.id,
        ]),
      );
      const resolvedItems = cartItems.map((item) => ({
        item,
        variantId: variantIds.get(`${item.product_id}:${item.size}`),
      }));
      const missingItem = resolvedItems.find(({ variantId }) => !variantId);

      if (missingItem) {
        showToast(
          `${missingItem.item.name} size ${missingItem.item.size} is no longer available. Remove it and add the current size again.`,
          "error",
        );
        return null;
      }

      const { data: order, error: orderErr } = await supabase
        .from("orders")
        .insert({
          customer_name: form.name,
          customer_email: form.email,
          customer_phone: form.phone,
          customer_whatsapp: form.whatsapp || null,
          address: form.address,
          city: form.city || null,
          state: form.state,
          subtotal: orderTotal,
          delivery_fee: deliveryFee * 100,
          total: grandTotal,
          payment_method: paymentMethod,
          status: "pending",
        })
        .select("id, order_code")
        .single();

      if (orderErr || !order) {
        console.error("Order creation failed:", orderErr);
        showToast(
          `Order creation failed: ${orderErr?.message ?? "No order was returned"}`,
          "error",
        );
        return null;
      }

      const { error: itemsErr } = await supabase.from("order_items").insert(
        resolvedItems.map(({ item, variantId }) => ({
          order_id: order.id,
          product_id: item.product_id,
          variant_id: variantId,
          name: item.name,
          size: item.size,
          color: item.color ?? null,
          price: item.price,
          quantity: item.quantity,
        })),
      );
      if (itemsErr) {
        console.error("Order items creation failed:", itemsErr);
        showToast(`Order items failed: ${itemsErr.message}`, "error");
        return null;
      }

      localStorage.setItem("pendingOrderId", order.id);
      const savedCodes = JSON.parse(
        localStorage.getItem("exiles-order-codes") ?? "[]",
      );
      const orderCodes = Array.isArray(savedCodes)
        ? savedCodes.filter((code) => typeof code === "string")
        : [];
      if (!orderCodes.includes(order.order_code)) {
        localStorage.setItem(
          "exiles-order-codes",
          JSON.stringify([order.order_code, ...orderCodes]),
        );
      }
      return { id: order.id, orderCode: order.order_code };
    } catch (err) {
      console.warn("Order recording failed:", err);
      showToast("Order recording failed. Check the database setup.", "error");
      return null;
    }
  };

  const handleBankTransfer = async () => {
    if (!validateForm()) return;
    setPayingTransfer(true);

    localStorage.setItem(
      "pendingOrder",
      JSON.stringify({
        form,
        cartItems,
        subtotal: orderTotal,
        deliveryFee,
        total: grandTotal,
      }),
    );

    const createdOrder = await createOrder("bank_transfer");
    if (!createdOrder) {
      setPayingTransfer(false);
      return;
    }

    localStorage.setItem(
      "pendingOrder",
      JSON.stringify({
        form,
        cartItems,
        subtotal: orderTotal,
        deliveryFee,
        total: grandTotal,
        orderCode: createdOrder.orderCode,
      }),
    );

    clearCart();

    window.location.href = "/pay";
  };

  const handlePayCard = async () => {
    if (!validateForm()) return;
    setPayingCard(true);

    const createdOrder = await createOrder("squad");
    if (!createdOrder) {
      showToast("Couldn't start checkout — try bank transfer instead", "error");
      setPayingCard(false);
      return;
    }

    const orderId = createdOrder.id;

    localStorage.setItem(
      "pendingOrder",
      JSON.stringify({
        form,
        cartItems,
        subtotal: orderTotal,
        deliveryFee,
        total: grandTotal,
        orderCode: createdOrder.orderCode,
      }),
    );

    try {
      const res = await fetch("/api/squad/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          email: form.email,
          amount: grandTotal,
          name: form.name,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.checkout_url)
        throw new Error(json.error ?? "Could not start card payment");
      window.location.href = json.checkout_url;
    } catch (err) {
      showToast(
        err instanceof Error
          ? err.message
          : "Card payment isn't available right now — try bank transfer",
        "error",
      );
      setPayingCard(false);
    }
  };

  if (cartItems.length === 0) {
    return (
      <div className="min-h-screen bg-white text-zinc-900 flex flex-col items-center justify-center gap-6 px-4">
        <div className="w-16 h-16 rounded-2xl glass flex items-center justify-center">
          <ShoppingBag size={24} strokeWidth={1.5} className="text-zinc-400" />
        </div>
        <div className="text-center">
          <p className="text-zinc-900 font-medium mb-1">Your bag is empty</p>
          <p className="text-zinc-400 text-xs tracking-wide">
            Add something to get started
          </p>
        </div>
        <Link
          href="/shop"
          className="bg-zinc-900 text-white text-xs tracking-[0.2em] uppercase px-8 py-3.5 rounded-xl font-semibold hover:bg-zinc-700 transition-colors"
        >
          Shop Now
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      {/* NAV */}
      <nav className="sticky top-0 z-50 glass-nav">
        <div className="max-w-5xl mx-auto px-4 sm:px-8 py-4 flex items-center justify-between">
          <button
            onClick={() =>
              step === "delivery" ? setStep("bag") : window.history.back()
            }
            className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 transition-colors text-xs tracking-widest uppercase"
          >
            <ArrowLeft size={14} strokeWidth={1.5} />
            Back
          </button>
          <Link href="/shop">
            <Logo textClassName="text-sm" />
          </Link>
          <span className="text-zinc-400 text-xs tracking-widest uppercase">
            {cartItems.length} {cartItems.length === 1 ? "item" : "items"}
          </span>
        </div>

        {/* PROGRESS BAR — mobile friendly */}
        <div className="flex border-t border-zinc-900/10">
          <button
            onClick={() => setStep("bag")}
            className={`flex-1 py-2.5 text-[10px] tracking-[0.2em] uppercase transition-colors flex items-center justify-center gap-1.5 ${step === "bag" ? "text-zinc-900 border-b-2 border-zinc-900" : "text-zinc-400"}`}
          >
            <ShoppingBag size={11} />
            Bag
          </button>
          <button
            onClick={() => setStep("delivery")}
            className={`flex-1 py-2.5 text-[10px] tracking-[0.2em] uppercase transition-colors flex items-center justify-center gap-1.5 ${step === "delivery" ? "text-zinc-900 border-b-2 border-zinc-900" : "text-zinc-400"}`}
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
                      key={`${item.id}-${item.size}-${item.color ?? ""}`}
                      className="flex gap-4 p-4 glass rounded-2xl"
                    >
                      {/* THUMBNAIL */}
                      <div className="w-20 h-24 sm:w-24 sm:h-28 bg-zinc-100 rounded-xl flex-shrink-0 overflow-hidden">
                        {item.image_url ? (
                          <img
                            src={item.image_url}
                            alt={item.name}
                            loading="lazy"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-zinc-100" />
                        )}
                      </div>

                      {/* DETAILS */}
                      <div className="flex-1 flex flex-col justify-between min-w-0">
                        <div className="flex justify-between items-start gap-2">
                          <div className="min-w-0">
                            <h2 className="text-sm font-medium text-zinc-900 truncate">
                              {item.name}
                            </h2>
                            <p className="text-zinc-500 text-xs mt-0.5">
                              Size {item.size}
                              {item.size === "3XL" ? " · +₦5,000" : ""}
                              {item.color ? ` · Color ${item.color}` : ""}
                            </p>
                          </div>
                          <span className="text-sm font-semibold text-zinc-900 flex-shrink-0">
                            ₦
                            {(
                              (item.price * item.quantity) /
                              100
                            ).toLocaleString()}
                          </span>
                        </div>

                        <div className="flex items-center justify-between mt-3">
                          {/* QTY CONTROL */}
                          <div className="flex items-center glass rounded-xl overflow-hidden">
                            <button
                              onClick={() =>
                                item.quantity > 1
                                  ? updateQuantity(
                                      item.id,
                                      item.size,
                                      item.quantity - 1,
                                      item.color,
                                    )
                                  : removeFromCart(
                                      item.id,
                                      item.size,
                                      item.color,
                                    )
                              }
                              className="w-9 h-9 flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:bg-zinc-900/5 transition-colors text-lg leading-none"
                            >
                              −
                            </button>
                            <span className="w-8 text-center text-sm tabular-nums text-zinc-900">
                              {item.quantity}
                            </span>
                            <button
                              onClick={() =>
                                updateQuantity(
                                  item.id,
                                  item.size,
                                  item.quantity + 1,
                                  item.color,
                                )
                              }
                              className="w-9 h-9 flex items-center justify-center text-zinc-500 hover:text-zinc-900 hover:bg-zinc-900/5 transition-colors text-lg leading-none"
                            >
                              +
                            </button>
                          </div>

                          <button
                            onClick={() => {
                              removeFromCart(item.id, item.size, item.color);
                              showToast(`Removed ${item.name}`, "info");
                            }}
                            className="text-[10px] tracking-widest uppercase text-zinc-400 hover:text-red-500 transition-colors"
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
                  className="w-full mt-6 py-4 bg-zinc-900 text-white text-xs tracking-[0.25em] uppercase rounded-xl hover:bg-zinc-700 transition-colors flex items-center justify-center gap-2 lg:hidden"
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
                        <optgroup label="Standard ₦11,500">
                          {NIGERIAN_STATES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </optgroup>
                      </select>
                      <ChevronDown
                        size={14}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none"
                      />
                    </div>
                  </div>

                  {/* DELIVERY INFO TAG */}
                  {form.state && (
                    <div className="flex items-center gap-3 px-4 py-3 glass rounded-xl">
                      <Truck
                        size={14}
                        strokeWidth={1.5}
                        className="text-zinc-500 flex-shrink-0"
                      />
                      <p className="text-xs text-zinc-600">
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
            <div className="glass rounded-2xl p-5 space-y-4 lg:sticky lg:top-32">
              <p className="text-[10px] tracking-[0.4em] uppercase text-zinc-500 pb-3 border-b border-zinc-900/10">
                Order Summary
              </p>

              {/* ITEMS */}
              <div className="space-y-2.5">
                {cartItems.map((item) => (
                  <div
                    key={`${item.id}-${item.size}`}
                    className="flex justify-between text-xs"
                  >
                    <span className="text-zinc-500 truncate pr-2">
                      {item.name} ({item.size}) ×{item.quantity}
                    </span>
                    <span className="text-zinc-700 flex-shrink-0">
                      ₦{((item.price * item.quantity) / 100).toLocaleString()}
                    </span>
                  </div>
                ))}
              </div>

              <div className="border-t border-zinc-900/10 pt-3 space-y-2.5">
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>Subtotal</span>
                  <span>₦{(orderTotal / 100).toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs text-zinc-500">
                  <span>Delivery</span>
                  {form.state ? (
                    <span className="text-zinc-900">
                      ₦{deliveryFee.toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-zinc-400 italic">Select state</span>
                  )}
                </div>
                <div className="flex justify-between text-sm font-semibold text-zinc-900 pt-2 border-t border-zinc-900/10">
                  <span>Total</span>
                  <span>₦{(grandTotal / 100).toLocaleString()}</span>
                </div>
              </div>

              {/* PAYMENT OPTIONS */}
              <button
                onClick={handleBankTransfer}
                disabled={payingCard || payingTransfer}
                className={`direct-transfer-glow w-full py-4 text-xs tracking-[0.25em] uppercase font-semibold rounded-xl transition-all duration-300 ${
                  payingCard || payingTransfer
                    ? "bg-zinc-200 text-zinc-400 cursor-not-allowed"
                    : "bg-zinc-900 text-white hover:bg-zinc-700 shadow-lg shadow-amber-900/20"
                }`}
              >
                {payingTransfer
                  ? "Opening transfer details..."
                  : "Pay Directly by Bank Transfer"}
              </button>

              <p className="text-zinc-400 text-[10px] tracking-wide text-center">
                Fill all required fields before paying — see our{" "}
                <a
                  className="text-zinc-600 underline hover:text-zinc-900 transition-colors"
                  href="/shipping_policy"
                >
                  shipping policy
                </a>
              </p>

              <Link
                href="/shop"
                className="block text-center text-[10px] tracking-[0.2em] uppercase text-zinc-500 hover:text-zinc-900 transition-colors"
              >
                ← Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* MOBILE FIXED BOTTOM CTA */}
      <div className="fixed bottom-0 left-0 right-0 p-4 glass-nav lg:hidden">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs text-zinc-500 uppercase tracking-widest">
            Total
          </span>
          <span className="text-sm font-semibold text-zinc-900">
            ₦{(grandTotal / 100).toLocaleString()}
          </span>
        </div>
        <button
          onClick={
            step === "bag" ? () => setStep("delivery") : handleBankTransfer
          }
          disabled={payingCard || payingTransfer}
          className={`w-full py-4 text-xs tracking-[0.25em] uppercase font-semibold rounded-xl transition-all ${
            payingCard || payingTransfer
              ? "bg-zinc-200 text-zinc-400 cursor-not-allowed"
              : "bg-zinc-900 text-white hover:bg-zinc-700"
          }`}
        >
          {step === "bag"
            ? "Continue to Delivery"
            : payingTransfer
              ? "Opening transfer details..."
              : "Pay Directly by Transfer"}
        </button>
      </div>
    </div>
  );
}

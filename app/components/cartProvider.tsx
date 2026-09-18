"use client";

import { createContext, useContext, useState, useEffect } from "react";

type CartItem = {
  id: string;
  product_id: string;
  name: string;
  image_url: string;
  size: string;
  color?: string | null;
  price: number;
  quantity: number;
};

type CartContextType = {
  cartItems: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string, size: string, color?: string | null) => void;
  updateQuantity: (id: string, size: string, quantity: number, color?: string | null) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextType | null>(null);

// Two lines are "the same" only if id, size, AND color all match — different
// colors of the same size must stay as separate line items, otherwise a
// customer adding a black M and a white M would silently merge into one
// line with no way to tell which color they meant.
function sameLine(i: CartItem, id: string, size: string, color?: string | null) {
  return i.id === id && i.size === size && (i.color ?? null) === (color ?? null);
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("exiles-cart");
    if (stored) setCartItems(JSON.parse(stored));
  }, []);

  useEffect(() => {
    localStorage.setItem("exiles-cart", JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (item: CartItem) => {
    setCartItems((prev) => {
      const existing = prev.find((i) => sameLine(i, item.id, item.size, item.color));
      if (existing) {
        return prev.map((i) =>
          sameLine(i, item.id, item.size, item.color) ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, item];
    });
  };

  const removeFromCart = (id: string, size: string, color?: string | null) => {
    setCartItems((prev) => prev.filter((i) => !sameLine(i, id, size, color)));
  };

  const updateQuantity = (id: string, size: string, quantity: number, color?: string | null) => {
    setCartItems((prev) =>
      prev.map((i) => (sameLine(i, id, size, color) ? { ...i, quantity } : i))
    );
  };

  const clearCart = () => setCartItems([]);

  return (
    <CartContext.Provider
      value={{ cartItems, addToCart, removeFromCart, updateQuantity, clearCart }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}

"use client";

import { createContext, useContext, useState, useEffect } from "react";

interface CartItem {
  id: string;
  product_id: string;
  name: string;
  image_url: string;
  size: string;
  price: number;
  quantity: number;
}

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (id: string, size: string) => void;
  updateQuantity: (id: string, size: string, quantity: number) => void;
}

const CartContext = createContext<CartContextType | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const storedCart = localStorage.getItem("exiles-cart");
    if (storedCart) setCartItems(JSON.parse(storedCart));
  }, []);

  useEffect(() => {
    localStorage.setItem("exiles-cart", JSON.stringify(cartItems));
  }, [cartItems]);

  const addToCart = (incomingItem: CartItem) => {
    setCartItems((prev) => {
      const existing = prev.find((item) => item.id === incomingItem.id && item.size === incomingItem.size);
      if (existing) {
        return prev.map((item) =>
          item.id === incomingItem.id && item.size === incomingItem.size
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { ...incomingItem, quantity: 1 }];
    });
  };

  const removeFromCart = (id: string, size: string) => {
    setCartItems((prev) => prev.filter((item) => !(item.id === id && item.size === size)));
  };

  const updateQuantity = (id: string, size: string, quantity: number) => {
    if (quantity <= 0) return removeFromCart(id, size);
    setCartItems((prev) => prev.map((item) => (item.id === id && item.size === size ? { ...item, quantity } : item)));
  };

  return (
    <CartContext.Provider value={{ cartItems, addToCart, removeFromCart, updateQuantity }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside CartProvider");
  return context;
}
"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { supabase, isSupabaseConfigured } from "../../../lib/supabase";
import { useToast } from "../../components/toastProvider";
import { Logo } from "../../components/Logo";
import { AdminNav } from "../AdminNav";
import {
  Search,
  ShoppingBag,
  Clock,
  CheckCircle2,
  PackageCheck,
  XCircle,
  TrendingUp,
  Wallet,
  Boxes,
  LayoutGrid,
  LineChart,
  MapPin,
  X,
} from "lucide-react";

const inputClass =
  "w-full glass-input text-zinc-900 text-sm px-4 py-3 rounded-xl outline-none transition-colors placeholder-zinc-400";

type StockVariant = { size: string; stock: number };
type StockProduct = {
  id: string;
  name: string;
  imageUrl: string;
  categoryId: string | null;
  categoryName: string;
  totalStock: number;
  outOfStockVariants: number;
  lowStockVariants: number;
  variants: StockVariant[];
};
type StockCategoryAgg = {
  categoryId: string | null;
  categoryName: string;
  totalStock: number;
  outOfStock: number;
  productCount: number;
};
type OrderRow = {
  id: string;
  orderCode: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerWhatsapp: string | null;
  address: string;
  city: string | null;
  state: string;
  subtotal: number;
  deliveryFee: number;
  paymentMethod: string;
  gatewayReference: string | null;
  status: "pending" | "paid" | "fulfilled" | "cancelled";
  createdAt: string;
  itemCount: number;
  items: {
    name: string;
    size: string | null;
    color: string | null;
    quantity: number;
    price: number;
  }[];
  total: number;
};
type DashboardData = {
  role: "god" | "admin";
  stock: {
    products: StockProduct[];
    categories: StockCategoryAgg[];
    categoryOptions: { id: string; name: string }[];
  };
  orders: {
    total: number;
    byStatus: Record<string, number>;
    recent: OrderRow[];
  };
  revenue?: {
    totalRevenue: number;
    averageOrderValue: number;
    paidOrderCount: number;
    last14Days: { day: string; order_count: number; revenue: number }[];
    topProducts: { name: string; revenue: number; quantity: number }[];
  };
  analytics?: {
    revenueByCategory: { categoryName: string; revenue: number }[];
    ordersByState: { state: string; count: number }[];
    ordersByWeekday: { label: string; revenue: number; orders: number }[];
    funnel: {
      pending: number;
      paid: number;
      fulfilled: number;
      cancelled: number;
      fulfillmentRate: number;
      cancellationRate: number;
    };
  };
};

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-500/10 text-amber-700",
  paid: "bg-sky-500/10 text-sky-700",
  fulfilled: "bg-emerald-500/10 text-emerald-700",
  cancelled: "bg-red-500/10 text-red-600",
};

const STOCK_FILTERS = [
  { key: "all", label: "All" },
  { key: "in", label: "In Stock" },
  { key: "low", label: "Low Stock" },
  { key: "out", label: "Out of Stock" },
] as const;

function naira(kobo: number) {
  return `₦${(kobo / 100).toLocaleString()}`;
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { showToast } = useToast();

  const [checkingSession, setCheckingSession] = useState(true);
  const [authed, setAuthed] = useState(false);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const [data, setData] = useState<DashboardData | null>(null);
  const [loadingData, setLoadingData] = useState(false);

  const [categoryFilter, setCategoryFilter] = useState<string>("ALL");
  const [stockStatusFilter, setStockStatusFilter] =
    useState<(typeof STOCK_FILTERS)[number]["key"]>("all");
  const [search, setSearch] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const [selectedOrder, setSelectedOrder] = useState<OrderRow | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<string | null>(null);

  async function authHeader(): Promise<Record<string, string>> {
    if (!supabase) return {};
    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData.session?.access_token;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  async function loadDashboard() {
    setLoadingData(true);
    try {
      const res = await fetch("/api/admin/dashboard", {
        headers: await authHeader(),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load dashboard");
      setData(json);
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to load dashboard",
        "error",
      );
    }
    setLoadingData(false);
  }

  // ── SESSION BOOTSTRAP ──
  useEffect(() => {
    async function bootstrap() {
      if (!isSupabaseConfigured || !supabase) {
        setCheckingSession(false);
        return;
      }
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setCheckingSession(false);
        return;
      }
      setAuthed(true);
      setCheckingSession(false);
    }
    bootstrap();
  }, []);

  useEffect(() => {
    if (authed) loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authed]);

  async function handleLogin() {
    if (!supabase) {
      showToast(
        "Supabase is not configured. Add your environment variables first.",
        "error",
      );
      return;
    }
    if (!loginEmail || !loginPassword) {
      showToast("Enter email and password", "error");
      return;
    }
    setLoginLoading(true);
    const { data: signInData, error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });
    if (error || !signInData.user || !signInData.session) {
      showToast(error?.message ?? "Login failed", "error");
      setLoginLoading(false);
      return;
    }

    const res = await fetch("/api/admin/dashboard", {
      headers: { Authorization: `Bearer ${signInData.session.access_token}` },
    });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      await supabase.auth.signOut();
      showToast(json.error ?? "This account is not an admin", "error");
      setLoginLoading(false);
      return;
    }

    setAuthed(true);
    setLoginPassword("");
    setLoginLoading(false);
  }

  async function handleLogout() {
    if (supabase) await supabase.auth.signOut();
    setAuthed(false);
    setData(null);
    router.push("/Admin/dashboard");
  }

  async function updateOrderStatus(id: string, status: string) {
    setUpdatingOrderId(id);
    try {
      const res = await fetch("/api/admin/orders/status", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(await authHeader()),
        },
        body: JSON.stringify({ id, status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error);
      showToast(`Order marked ${status}`, "success");
      await loadDashboard();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to update order",
        "error",
      );
    }
    setUpdatingOrderId(null);
  }

  const visibleOrders = (data?.orders.recent ?? []).filter((order) => {
    const query = orderSearch.trim().toLowerCase();
    if (!query) return true;
    return [
      order.orderCode,
      order.customerName,
      order.customerEmail,
      order.customerPhone,
      order.state,
    ].some((value) => value?.toLowerCase().includes(query));
  });

  const filteredProducts = useMemo(() => {
    if (!data) return [];
    return data.stock.products.filter((p) => {
      if (categoryFilter !== "ALL" && p.categoryId !== categoryFilter)
        return false;
      if (stockStatusFilter === "out" && p.totalStock !== 0) return false;
      if (
        stockStatusFilter === "low" &&
        !(p.totalStock > 0 && p.lowStockVariants > 0)
      )
        return false;
      if (stockStatusFilter === "in" && p.totalStock === 0) return false;
      if (
        search.trim() &&
        !p.name.toLowerCase().includes(search.trim().toLowerCase())
      )
        return false;
      return true;
    });
  }, [data, categoryFilter, stockStatusFilter, search]);

  if (checkingSession) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-5 h-5 rounded-full border-2 border-zinc-900/15 border-t-zinc-900 animate-spin" />
      </div>
    );
  }

  if (!authed) {
    return (
      <div className="min-h-screen bg-white text-zinc-900 flex items-center justify-center px-4">
        <div className="w-full max-w-sm space-y-6">
          <div className="text-center flex flex-col items-center gap-3">
            <Logo showText={false} markClassName="h-10" />
            <div>
              <h1 className="font-bold tracking-[0.4em] text-sm uppercase mb-1">
                EX1LES
              </h1>
              <p className="text-zinc-400 text-xs tracking-widest uppercase">
                Admin Access
              </p>
            </div>
          </div>
          <div className="space-y-3">
            <input
              type="email"
              placeholder="Email"
              value={loginEmail}
              onChange={(e) => setLoginEmail(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className={inputClass}
              autoComplete="username"
            />
            <input
              type="password"
              placeholder="Password"
              value={loginPassword}
              onChange={(e) => setLoginPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              className={inputClass}
              autoComplete="current-password"
            />
            <button
              onClick={handleLogin}
              disabled={loginLoading}
              className="w-full py-3.5 bg-zinc-900 text-white text-xs tracking-[0.25em] uppercase font-semibold rounded-xl hover:bg-zinc-700 transition-colors disabled:opacity-50"
            >
              {loginLoading ? "Signing in..." : "Sign In"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const byStatus = data?.orders.byStatus ?? {
    pending: 0,
    paid: 0,
    fulfilled: 0,
    cancelled: 0,
  };
  const maxDailyRevenue = Math.max(
    1,
    ...(data?.revenue?.last14Days.map((d) => d.revenue) ?? [1]),
  );

  return (
    <div className="min-h-screen bg-white text-zinc-900">
      <AdminNav role={data?.role ?? null} onLogout={handleLogout} />

      {/* QUICK-JUMP — same sections, same order, findable at a glance */}
      {data && (
        <div className="sticky top-[calc(4rem+1px)] z-40 glass-nav border-t border-zinc-900/5">
          <div className="max-w-6xl mx-auto px-4 sm:px-8 py-2.5 flex items-center gap-5 overflow-x-auto">
            <a
              href="#overview"
              className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-zinc-500 hover:text-zinc-900 transition-colors whitespace-nowrap"
            >
              <LayoutGrid size={12} /> Overview
            </a>
            {data.analytics && (
              <a
                href="#analytics"
                className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-zinc-500 hover:text-zinc-900 transition-colors whitespace-nowrap"
              >
                <LineChart size={12} /> Analytics
              </a>
            )}
            <a
              href="#stock"
              className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-zinc-500 hover:text-zinc-900 transition-colors whitespace-nowrap"
            >
              <Boxes size={12} /> Stock
            </a>
            <a
              href="#orders"
              className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-zinc-500 hover:text-zinc-900 transition-colors whitespace-nowrap"
            >
              <ShoppingBag size={12} /> Orders
            </a>
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto px-4 sm:px-8 py-10 pb-24 space-y-14">
        {loadingData && !data && (
          <div className="flex justify-center py-20">
            <div className="w-5 h-5 rounded-full border-2 border-zinc-900/15 border-t-zinc-900 animate-spin" />
          </div>
        )}

        {data && (
          <>
            {/* ── KPI CARDS ── */}
            <div
              id="overview"
              className="grid grid-cols-2 lg:grid-cols-4 gap-4 scroll-mt-28"
            >
              <KpiCard
                icon={ShoppingBag}
                label="Orders"
                value={String(data.orders.total)}
              />
              <KpiCard
                icon={Clock}
                label="Pending"
                value={String(byStatus.pending ?? 0)}
                accent="text-amber-600"
              />
              <KpiCard
                icon={PackageCheck}
                label="Fulfilled"
                value={String(byStatus.fulfilled ?? 0)}
                accent="text-emerald-600"
              />
              <KpiCard
                icon={XCircle}
                label="Cancelled"
                value={String(byStatus.cancelled ?? 0)}
                accent="text-red-500"
              />

              {data.revenue && (
                <>
                  <KpiCard
                    icon={Wallet}
                    label="Total Revenue"
                    value={naira(data.revenue.totalRevenue)}
                    accent="text-amber-700"
                    className="col-span-2"
                  />
                  <KpiCard
                    icon={TrendingUp}
                    label="Avg Order Value"
                    value={naira(data.revenue.averageOrderValue)}
                    accent="text-amber-700"
                  />
                  <KpiCard
                    icon={CheckCircle2}
                    label="Paid Orders"
                    value={String(data.revenue.paidOrderCount)}
                    accent="text-sky-600"
                  />
                </>
              )}
            </div>

            {/* ── REVENUE CHART + TOP PRODUCTS ── */}
            {data.revenue && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 glass rounded-2xl p-5">
                  <p className="text-[10px] tracking-[0.4em] uppercase text-amber-700 font-medium mb-6">
                    Revenue — Last 14 Days
                  </p>
                  {data.revenue.last14Days.length === 0 ? (
                    <p className="text-xs text-zinc-400 py-10 text-center">
                      No paid orders yet.
                    </p>
                  ) : (
                    <div className="flex items-end gap-1.5 h-40">
                      {data.revenue.last14Days.map((d) => (
                        <div
                          key={d.day}
                          className="flex-1 flex flex-col items-center gap-1.5 group relative"
                        >
                          <div className="w-full flex items-end h-32">
                            <div
                              className="w-full bg-zinc-900 rounded-t-md group-hover:bg-amber-600 transition-colors"
                              style={{
                                height: `${Math.max(4, (d.revenue / maxDailyRevenue) * 100)}%`,
                              }}
                            />
                          </div>
                          <span className="text-[8px] text-zinc-400 tabular-nums">
                            {new Date(d.day).toLocaleDateString(undefined, {
                              day: "numeric",
                              month: "short",
                            })}
                          </span>
                          <div className="pointer-events-none absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity glass-strong text-[10px] px-2 py-1 rounded-lg whitespace-nowrap">
                            {naira(d.revenue)}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="glass rounded-2xl p-5">
                  <p className="text-[10px] tracking-[0.4em] uppercase text-amber-700 font-medium mb-4">
                    Top Products
                  </p>
                  {data.revenue.topProducts.length === 0 ? (
                    <p className="text-xs text-zinc-400">Nothing sold yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {data.revenue.topProducts.map((p, i) => (
                        <div key={p.name} className="flex items-center gap-3">
                          <span className="w-5 h-5 rounded-full bg-zinc-900/5 text-zinc-500 text-[10px] flex items-center justify-center flex-shrink-0">
                            {i + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs text-zinc-800 truncate">
                              {p.name}
                            </p>
                            <p className="text-[10px] text-zinc-400">
                              {p.quantity} sold
                            </p>
                          </div>
                          <span className="text-xs font-semibold text-zinc-900 flex-shrink-0">
                            {naira(p.revenue)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── ANALYTICS — god only: patterns beyond the headline numbers ── */}
            {data.analytics && (
              <div id="analytics" className="scroll-mt-28">
                <div className="flex items-center gap-2 mb-4">
                  <LineChart size={14} className="text-amber-700" />
                  <p className="text-[10px] tracking-[0.4em] uppercase text-amber-700 font-medium">
                    Analytics
                  </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                  {/* FUNNEL */}
                  <div className="glass rounded-2xl p-5">
                    <p className="text-[10px] tracking-[0.3em] uppercase text-zinc-400 mb-4">
                      Order Funnel
                    </p>
                    <div className="space-y-3">
                      {(
                        [
                          {
                            label: "Pending",
                            value: data.analytics.funnel.pending,
                            color: "bg-amber-500",
                          },
                          {
                            label: "Paid",
                            value: data.analytics.funnel.paid,
                            color: "bg-sky-500",
                          },
                          {
                            label: "Fulfilled",
                            value: data.analytics.funnel.fulfilled,
                            color: "bg-emerald-500",
                          },
                          {
                            label: "Cancelled",
                            value: data.analytics.funnel.cancelled,
                            color: "bg-red-400",
                          },
                        ] as const
                      ).map((row) => {
                        const max = Math.max(
                          1,
                          data.analytics!.funnel.pending,
                          data.analytics!.funnel.paid,
                          data.analytics!.funnel.fulfilled,
                          data.analytics!.funnel.cancelled,
                        );
                        return (
                          <div
                            key={row.label}
                            className="flex items-center gap-3"
                          >
                            <span className="w-16 text-[10px] uppercase tracking-widest text-zinc-500 flex-shrink-0">
                              {row.label}
                            </span>
                            <div className="flex-1 h-2.5 rounded-full bg-zinc-900/5 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${row.color}`}
                                style={{
                                  width: `${Math.max(3, (row.value / max) * 100)}%`,
                                }}
                              />
                            </div>
                            <span className="w-8 text-right text-xs text-zinc-700 tabular-nums flex-shrink-0">
                              {row.value}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                    <div className="flex gap-4 mt-4 pt-4 border-t border-zinc-900/10 text-[10px] text-zinc-500">
                      <span>
                        <span className="text-zinc-900 font-semibold">
                          {data.analytics.funnel.fulfillmentRate}%
                        </span>{" "}
                        paid or fulfilled
                      </span>
                      <span>
                        <span className="text-zinc-900 font-semibold">
                          {data.analytics.funnel.cancellationRate}%
                        </span>{" "}
                        cancelled
                      </span>
                    </div>
                  </div>

                  {/* ORDERS BY WEEKDAY */}
                  <div className="glass rounded-2xl p-5">
                    <p className="text-[10px] tracking-[0.3em] uppercase text-zinc-400 mb-4">
                      Busiest Days
                    </p>
                    <div className="flex items-end gap-2 h-28">
                      {data.analytics.ordersByWeekday.map((d) => {
                        const max = Math.max(
                          1,
                          ...data.analytics!.ordersByWeekday.map(
                            (x) => x.orders,
                          ),
                        );
                        return (
                          <div
                            key={d.label}
                            className="flex-1 flex flex-col items-center gap-1.5 group relative"
                          >
                            <div className="w-full flex items-end h-20">
                              <div
                                className="w-full bg-zinc-900 rounded-t-md group-hover:bg-amber-600 transition-colors"
                                style={{
                                  height: `${Math.max(4, (d.orders / max) * 100)}%`,
                                }}
                              />
                            </div>
                            <span className="text-[9px] text-zinc-400">
                              {d.label}
                            </span>
                            <div className="pointer-events-none absolute -top-8 opacity-0 group-hover:opacity-100 transition-opacity glass-strong text-[10px] px-2 py-1 rounded-lg whitespace-nowrap">
                              {d.orders} orders · {naira(d.revenue)}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* REVENUE BY CATEGORY */}
                  <div className="glass rounded-2xl p-5">
                    <p className="text-[10px] tracking-[0.3em] uppercase text-zinc-400 mb-4">
                      Revenue by Category
                    </p>
                    {data.analytics.revenueByCategory.length === 0 ? (
                      <p className="text-xs text-zinc-400">
                        No paid orders yet.
                      </p>
                    ) : (
                      <div className="space-y-2.5">
                        {data.analytics.revenueByCategory.map((c) => {
                          const max = Math.max(
                            1,
                            ...data.analytics!.revenueByCategory.map(
                              (x) => x.revenue,
                            ),
                          );
                          return (
                            <div
                              key={c.categoryName}
                              className="flex items-center gap-3"
                            >
                              <span className="w-20 text-xs text-zinc-600 truncate flex-shrink-0">
                                {c.categoryName}
                              </span>
                              <div className="flex-1 h-2 rounded-full bg-zinc-900/5 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-amber-600"
                                  style={{
                                    width: `${Math.max(3, (c.revenue / max) * 100)}%`,
                                  }}
                                />
                              </div>
                              <span className="text-xs text-zinc-900 font-medium flex-shrink-0">
                                {naira(c.revenue)}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>

                  {/* ORDERS BY STATE */}
                  <div className="glass rounded-2xl p-5">
                    <div className="flex items-center gap-1.5 mb-4">
                      <MapPin size={12} className="text-zinc-400" />
                      <p className="text-[10px] tracking-[0.3em] uppercase text-zinc-400">
                        Top Delivery States
                      </p>
                    </div>
                    {data.analytics.ordersByState.length === 0 ? (
                      <p className="text-xs text-zinc-400">
                        No paid orders yet.
                      </p>
                    ) : (
                      <div className="space-y-2.5">
                        {data.analytics.ordersByState.map((s) => {
                          const max = Math.max(
                            1,
                            ...data.analytics!.ordersByState.map(
                              (x) => x.count,
                            ),
                          );
                          return (
                            <div
                              key={s.state}
                              className="flex items-center gap-3"
                            >
                              <span className="w-20 text-xs text-zinc-600 truncate flex-shrink-0">
                                {s.state}
                              </span>
                              <div className="flex-1 h-2 rounded-full bg-zinc-900/5 overflow-hidden">
                                <div
                                  className="h-full rounded-full bg-sky-600"
                                  style={{
                                    width: `${Math.max(3, (s.count / max) * 100)}%`,
                                  }}
                                />
                              </div>
                              <span className="text-xs text-zinc-900 font-medium flex-shrink-0">
                                {s.count}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── STOCK TRACKER ── */}
            <div id="stock" className="scroll-mt-28">
              <div className="flex items-center gap-2 mb-4">
                <Boxes size={14} className="text-amber-700" />
                <p className="text-[10px] tracking-[0.4em] uppercase text-amber-700 font-medium">
                  Stock Tracker
                </p>
              </div>

              {/* Category chips */}
              <div className="flex gap-2 flex-wrap mb-4">
                <button
                  onClick={() => setCategoryFilter("ALL")}
                  className={`px-3.5 py-2 rounded-xl text-[10px] uppercase tracking-widest transition-colors ${
                    categoryFilter === "ALL"
                      ? "bg-zinc-900 text-white"
                      : "glass text-zinc-500 hover:text-zinc-900"
                  }`}
                >
                  All Categories
                </button>
                {data.stock.categories.map((c) => (
                  <button
                    key={c.categoryId ?? "none"}
                    onClick={() => setCategoryFilter(c.categoryId ?? "none")}
                    className={`px-3.5 py-2 rounded-xl text-[10px] uppercase tracking-widest transition-colors flex items-center gap-1.5 ${
                      categoryFilter === (c.categoryId ?? "none")
                        ? "bg-zinc-900 text-white"
                        : "glass text-zinc-500 hover:text-zinc-900"
                    }`}
                  >
                    {c.categoryName}
                    <span className="opacity-60">· {c.totalStock}</span>
                    {c.outOfStock > 0 && (
                      <span
                        className="w-1.5 h-1.5 rounded-full bg-red-500"
                        title={`${c.outOfStock} size(s) out of stock`}
                      />
                    )}
                  </button>
                ))}
              </div>

              {/* Search + status filter */}
              <div className="flex flex-col sm:flex-row gap-2 mb-4">
                <div className="relative flex-1">
                  <Search
                    size={14}
                    className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-400"
                  />
                  <input
                    type="text"
                    placeholder="Search products..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className={`${inputClass} pl-10`}
                  />
                </div>
                <div className="flex gap-1.5 glass rounded-xl p-1">
                  {STOCK_FILTERS.map((f) => (
                    <button
                      key={f.key}
                      onClick={() => setStockStatusFilter(f.key)}
                      className={`px-3 py-2 rounded-lg text-[10px] uppercase tracking-widest transition-colors ${
                        stockStatusFilter === f.key
                          ? "bg-zinc-900 text-white"
                          : "text-zinc-500 hover:text-zinc-900"
                      }`}
                    >
                      {f.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Table */}
              <div className="glass rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-900/10 text-[10px] uppercase tracking-widest text-zinc-400">
                        <th className="text-left py-3 px-4 font-medium">
                          Product
                        </th>
                        <th className="text-left py-3 px-4 font-medium hidden sm:table-cell">
                          Category
                        </th>
                        <th className="text-left py-3 px-4 font-medium">
                          Sizes
                        </th>
                        <th className="text-right py-3 px-4 font-medium">
                          Total
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredProducts.map((p) => (
                        <tr
                          key={p.id}
                          className="border-b border-zinc-900/5 last:border-0 hover:bg-zinc-900/[0.02]"
                        >
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-lg overflow-hidden bg-zinc-100 flex-shrink-0">
                                {p.imageUrl && (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={p.imageUrl}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                )}
                              </div>
                              <span className="truncate text-zinc-800">
                                {p.name}
                              </span>
                            </div>
                          </td>
                          <td className="py-3 px-4 text-zinc-500 hidden sm:table-cell">
                            {p.categoryName}
                          </td>
                          <td className="py-3 px-4">
                            <div className="flex gap-1 flex-wrap">
                              {p.variants.map((v) => (
                                <span
                                  key={v.size}
                                  className={`text-[9px] px-1.5 py-0.5 rounded-md border tracking-wide ${
                                    v.stock === 0
                                      ? "border-red-200 text-red-500 bg-red-50"
                                      : v.stock <= 3
                                        ? "border-amber-200 text-amber-700 bg-amber-50"
                                        : "border-zinc-200 text-zinc-600"
                                  }`}
                                >
                                  {v.size} · {v.stock}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-zinc-900">
                            {p.totalStock}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {filteredProducts.length === 0 && (
                    <p className="text-center text-xs text-zinc-400 py-10">
                      No products match these filters.
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* ── RECENT ORDERS ── */}
            <div id="orders" className="scroll-mt-28">
              <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 mb-4">
                <div>
                  <p className="text-[10px] tracking-[0.4em] uppercase text-amber-700 font-medium">
                    Recent Orders
                  </p>
                  <p className="text-xs text-zinc-400 mt-1">
                    Search by order code, name, phone, or state. Click any order
                    for full details.
                  </p>
                </div>
                <input
                  type="search"
                  value={orderSearch}
                  onChange={(e) => setOrderSearch(e.target.value)}
                  placeholder="Search EX-..."
                  className={`${inputClass} sm:w-64`}
                />
              </div>
              <div className="glass rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-zinc-900/10 text-[10px] uppercase tracking-widest text-zinc-400">
                        <th className="text-left py-3 px-4 font-medium">
                          Customer
                        </th>
                        <th className="text-left py-3 px-4 font-medium hidden sm:table-cell">
                          State
                        </th>
                        <th className="text-left py-3 px-4 font-medium">
                          Items
                        </th>
                        <th className="text-right py-3 px-4 font-medium">
                          Total
                        </th>
                        <th className="text-left py-3 px-4 font-medium">
                          Status
                        </th>
                        <th className="text-right py-3 px-4 font-medium">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleOrders.map((o) => (
                        <tr
                          key={o.id}
                          onClick={() => setSelectedOrder(o)}
                          className="border-b border-zinc-900/5 last:border-0 hover:bg-zinc-900/[0.02] cursor-pointer"
                        >
                          <td className="py-3 px-4">
                            <p className="text-amber-700 text-[10px] font-semibold tracking-wider">
                              {o.orderCode}
                            </p>
                            <p className="text-zinc-800">{o.customerName}</p>
                            <p className="text-[10px] text-zinc-400">
                              {o.customerPhone}
                            </p>
                          </td>
                          <td className="py-3 px-4 text-zinc-500 hidden sm:table-cell">
                            {o.state}
                          </td>
                          <td className="py-3 px-4 text-zinc-600">
                            <span>{o.itemCount}</span>
                            <div className="mt-1 space-y-0.5">
                              {o.items.map((item, index) => (
                                <p
                                  key={`${item.name}-${item.size}-${item.color}-${index}`}
                                  className="text-[10px] text-zinc-400"
                                >
                                  {item.name} · {item.size ?? "One size"}
                                  {item.color ? ` · ${item.color}` : ""} ×
                                  {item.quantity}
                                </p>
                              ))}
                            </div>
                          </td>
                          <td className="py-3 px-4 text-right font-medium text-zinc-900">
                            {naira(o.total)}
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`text-[10px] uppercase tracking-widest px-2 py-1 rounded-full ${STATUS_STYLES[o.status]}`}
                            >
                              {o.status}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <select
                              onClick={(e) => e.stopPropagation()}
                              value={o.status}
                              disabled={updatingOrderId === o.id}
                              onChange={(e) =>
                                updateOrderStatus(o.id, e.target.value)
                              }
                              className="glass text-[10px] uppercase tracking-widest text-zinc-600 rounded-lg px-2 py-1.5 outline-none cursor-pointer disabled:opacity-50"
                            >
                              <option value="pending">Pending</option>
                              <option value="paid">Paid</option>
                              <option value="fulfilled">Fulfilled</option>
                              <option value="cancelled">Cancelled</option>
                            </select>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {visibleOrders.length === 0 && (
                    <p className="text-center text-xs text-zinc-400 py-10">
                      No matching orders.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      {selectedOrder && (
        <div className="fixed inset-0 z-[80] flex justify-end">
          <button
            type="button"
            aria-label="Close order details"
            onClick={() => setSelectedOrder(null)}
            className="absolute inset-0 bg-zinc-950/25 backdrop-blur-sm"
          />
          <aside className="relative w-full max-w-lg h-full overflow-y-auto bg-white shadow-2xl p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4 border-b border-zinc-900/10 pb-5">
              <div>
                <p className="text-[10px] tracking-[0.3em] uppercase text-amber-700 font-semibold">
                  Order details
                </p>
                <h2 className="text-2xl font-semibold text-zinc-900 mt-1">
                  {selectedOrder.orderCode}
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  {new Date(selectedOrder.createdAt).toLocaleString()}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedOrder(null)}
                className="p-2 text-zinc-400 hover:text-zinc-900"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3 py-5 text-sm">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-zinc-400">
                  Status
                </p>
                <p className="mt-1 font-medium uppercase">
                  {selectedOrder.status}
                </p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest text-zinc-400">
                  Payment
                </p>
                <p className="mt-1 font-medium uppercase">
                  {selectedOrder.paymentMethod}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-[10px] uppercase tracking-widest text-zinc-400">
                  Customer
                </p>
                <p className="mt-1 font-medium">{selectedOrder.customerName}</p>
                <p className="text-zinc-500">{selectedOrder.customerEmail}</p>
                <p className="text-zinc-500">
                  {selectedOrder.customerPhone}
                  {selectedOrder.customerWhatsapp
                    ? ` · WhatsApp ${selectedOrder.customerWhatsapp}`
                    : ""}
                </p>
              </div>
              <div className="col-span-2">
                <p className="text-[10px] uppercase tracking-widest text-zinc-400">
                  Delivery address
                </p>
                <p className="mt-1 text-zinc-700">{selectedOrder.address}</p>
                <p className="text-zinc-500">
                  {selectedOrder.city ? `${selectedOrder.city}, ` : ""}
                  {selectedOrder.state}
                </p>
              </div>
            </div>

            <div className="border-y border-zinc-900/10 py-5 space-y-3">
              <p className="text-[10px] uppercase tracking-widest text-zinc-400">
                Items
              </p>
              {selectedOrder.items.map((item, index) => (
                <div
                  key={`${item.name}-${index}`}
                  className="flex justify-between gap-4 text-sm"
                >
                  <span>
                    {item.name} · {item.size ?? "One size"}
                    {item.color ? ` · ${item.color}` : ""} ×{item.quantity}
                  </span>
                  <span className="font-medium">
                    {naira(item.quantity * item.price)}
                  </span>
                </div>
              ))}
              <div className="flex justify-between pt-3 border-t border-zinc-900/10 font-semibold">
                <span>Total</span>
                <span>{naira(selectedOrder.total)}</span>
              </div>
            </div>

            <div className="pt-5 space-y-3">
              <p className="text-[10px] uppercase tracking-widest text-zinc-400">
                Payment verification
              </p>
              <p className="text-xs text-zinc-500">
                Confirm the transfer against this order code before marking the
                order paid or fulfilled.
              </p>
              {selectedOrder.gatewayReference && (
                <p className="text-xs font-mono text-zinc-600 break-all">
                  Gateway: {selectedOrder.gatewayReference}
                </p>
              )}
              <select
                value={selectedOrder.status}
                disabled={updatingOrderId === selectedOrder.id}
                onChange={async (e) => {
                  await updateOrderStatus(selectedOrder.id, e.target.value);
                  setSelectedOrder({
                    ...selectedOrder,
                    status: e.target.value as OrderRow["status"],
                  });
                }}
                className="w-full glass-input px-4 py-3 rounded-xl text-sm uppercase tracking-widest"
              >
                <option value="pending">Pending</option>
                <option value="paid">Paid</option>
                <option value="fulfilled">Fulfilled</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  accent = "text-zinc-900",
  className = "",
}: {
  icon: React.ComponentType<{ size?: number; className?: string }>;
  label: string;
  value: string;
  accent?: string;
  className?: string;
}) {
  return (
    <div className={`glass rounded-2xl p-4 ${className}`}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={13} className={accent} />
        <p className="text-[10px] uppercase tracking-widest text-zinc-400">
          {label}
        </p>
      </div>
      <p
        className={`text-xl font-semibold ${accent === "text-zinc-900" ? "text-zinc-900" : accent}`}
      >
        {value}
      </p>
    </div>
  );
}

import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../../lib/supabaseAdmin";
import { getRequestingAdmin } from "../../../../lib/verifyAdmin";

type StockCategoryAgg = {
  categoryId: string | null;
  categoryName: string;
  totalStock: number;
  outOfStock: number;
  productCount: number;
};

export async function GET(req: NextRequest) {
  const requester = await getRequestingAdmin(req);
  if ("error" in requester) {
    return NextResponse.json({ error: requester.error }, { status: requester.status });
  }
  const { role } = requester.admin;
  const db = supabaseAdmin!;

  // ── STOCK ──
  const { data: stockRows, error: stockErr } = await db
    .from("product_stock_summary")
    .select("*")
    .order("product_name", { ascending: true });

  if (stockErr) {
    return NextResponse.json({ error: stockErr.message }, { status: 400 });
  }

  const { data: categories } = await db.from("categories").select("id, name").order("name");

  const { data: variantRows } = await db
    .from("variants")
    .select("product_id, size, stock")
    .order("size", { ascending: true });

  const variantsByProduct = new Map<string, { size: string; stock: number }[]>();
  (variantRows ?? []).forEach((v) => {
    const list = variantsByProduct.get(v.product_id) ?? [];
    list.push({ size: v.size, stock: v.stock });
    variantsByProduct.set(v.product_id, list);
  });

  const stockProducts = (stockRows ?? []).map((p) => ({
    id: p.product_id as string,
    name: p.product_name as string,
    imageUrl: p.image_url as string,
    categoryId: p.category_id as string | null,
    categoryName: (p.category_name as string | null) ?? "Uncategorized",
    totalStock: p.total_stock as number,
    outOfStockVariants: p.out_of_stock_variants as number,
    lowStockVariants: p.low_stock_variants as number,
    variants: variantsByProduct.get(p.product_id as string) ?? [],
  }));

  const categoryMap = new Map<string, StockCategoryAgg>();
  stockProducts.forEach((p) => {
    const key = p.categoryId ?? "none";
    const entry = categoryMap.get(key) ?? {
      categoryId: p.categoryId,
      categoryName: p.categoryName,
      totalStock: 0,
      outOfStock: 0,
      productCount: 0,
    };
    entry.totalStock += p.totalStock;
    entry.outOfStock += p.outOfStockVariants;
    entry.productCount += 1;
    categoryMap.set(key, entry);
  });

  // ── ORDERS ──
  const { data: orderRows, error: ordersErr } = await db
    .from("orders")
    .select(
      "id, customer_name, customer_phone, state, status, total, created_at, order_items(name, size, quantity, price)"
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (ordersErr) {
    return NextResponse.json({ error: ordersErr.message }, { status: 400 });
  }

  const byStatus = { pending: 0, paid: 0, fulfilled: 0, cancelled: 0 };
  (orderRows ?? []).forEach((o) => {
    const key = o.status as keyof typeof byStatus;
    if (key in byStatus) byStatus[key] += 1;
  });

  const orders = (orderRows ?? []).map((o) => ({
    id: o.id as string,
    customerName: o.customer_name as string,
    customerPhone: o.customer_phone as string,
    state: o.state as string,
    status: o.status as string,
    createdAt: o.created_at as string,
    itemCount: ((o.order_items as { quantity: number }[]) ?? []).reduce((sum, i) => sum + i.quantity, 0),
    total: role === "god" ? (o.total as number) : null,
  }));

  const payload: Record<string, unknown> = {
    role,
    stock: {
      products: stockProducts,
      categories: Array.from(categoryMap.values()),
      categoryOptions: categories ?? [],
    },
    orders: {
      total: orderRows?.length ?? 0,
      byStatus,
      recent: orders,
    },
  };

  // ── REVENUE — god only ──
  if (role === "god") {
    const { data: dailyRows } = await db.from("daily_revenue").select("*").limit(14);

    const { data: paidOrders } = await db.from("orders").select("total").in("status", ["paid", "fulfilled"]);

    const totalRevenue = (paidOrders ?? []).reduce((sum, o) => sum + (o.total as number), 0);
    const paidOrderCount = paidOrders?.length ?? 0;
    const averageOrderValue = paidOrderCount > 0 ? Math.round(totalRevenue / paidOrderCount) : 0;

    const { data: itemRows } = await db
      .from("order_items")
      .select("name, price, quantity, orders!inner(status)")
      .in("orders.status", ["paid", "fulfilled"]);

    const topMap = new Map<string, { name: string; revenue: number; quantity: number }>();
    (itemRows ?? []).forEach((i) => {
      const row = i as unknown as { name: string; price: number; quantity: number };
      const entry = topMap.get(row.name) ?? { name: row.name, revenue: 0, quantity: 0 };
      entry.revenue += row.price * row.quantity;
      entry.quantity += row.quantity;
      topMap.set(row.name, entry);
    });

    const topProducts = Array.from(topMap.values())
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    payload.revenue = {
      totalRevenue,
      averageOrderValue,
      paidOrderCount,
      last14Days: (dailyRows ?? []).slice().reverse(),
      topProducts,
    };
  }

  return NextResponse.json(payload);
}

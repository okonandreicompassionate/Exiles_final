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

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export async function GET(req: NextRequest) {
  const requester = await getRequestingAdmin(req);
  if ("error" in requester) {
    return NextResponse.json(
      { error: requester.error },
      { status: requester.status },
    );
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

  const { data: categories } = await db
    .from("categories")
    .select("id, name")
    .order("name");

  const { data: variantRows } = await db
    .from("variants")
    .select("product_id, size, stock")
    .order("size", { ascending: true });

  const variantsByProduct = new Map<
    string,
    { size: string; stock: number }[]
  >();
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

  const productCategoryName = new Map<string, string>();
  stockProducts.forEach((p) => productCategoryName.set(p.id, p.categoryName));

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

  // ── ORDERS (recent, for the table) ──
  const { data: orderRows, error: ordersErr } = await db
    .from("orders")
    .select(
      "id, customer_name, customer_phone, state, status, total, created_at, order_items(name, size, color, quantity, price)",
    )
    .order("created_at", { ascending: false })
    .limit(100);

  if (ordersErr) {
    return NextResponse.json({ error: ordersErr.message }, { status: 400 });
  }

  const orders = (orderRows ?? []).map((o) => ({
    id: o.id as string,
    customerName: o.customer_name as string,
    customerPhone: o.customer_phone as string,
    state: o.state as string,
    status: o.status as string,
    createdAt: o.created_at as string,
    items: (
      (o.order_items as {
        name: string;
        size: string | null;
        color: string | null;
        quantity: number;
      }[]) ?? []
    ).map((item) => ({
      name: item.name,
      size: item.size,
      color: item.color,
      quantity: item.quantity,
    })),
    itemCount: ((o.order_items as { quantity: number }[]) ?? []).reduce(
      (sum, i) => sum + i.quantity,
      0,
    ),
    total: o.total as number,
  }));

  // ── FUNNEL — every order's status, not just the last 100 ──
  const { data: allStatusRows } = await db.from("orders").select("status");
  const byStatus = { pending: 0, paid: 0, fulfilled: 0, cancelled: 0 };
  (allStatusRows ?? []).forEach((o) => {
    const key = o.status as keyof typeof byStatus;
    if (key in byStatus) byStatus[key] += 1;
  });

  const payload: Record<string, unknown> = {
    role,
    stock: {
      products: stockProducts,
      categories: Array.from(categoryMap.values()),
      categoryOptions: categories ?? [],
    },
    orders: {
      total: allStatusRows?.length ?? 0,
      byStatus,
      recent: orders,
    },
  };

  // ── REVENUE — every admin sees the basics now ──
  const { data: dailyRows } = await db
    .from("daily_revenue")
    .select("*")
    .limit(14);

  const { data: paidOrders } = await db
    .from("orders")
    .select("total, state, created_at")
    .in("status", ["paid", "fulfilled"]);

  const totalRevenue = (paidOrders ?? []).reduce(
    (sum, o) => sum + (o.total as number),
    0,
  );
  const paidOrderCount = paidOrders?.length ?? 0;
  const averageOrderValue =
    paidOrderCount > 0 ? Math.round(totalRevenue / paidOrderCount) : 0;

  const { data: itemRows } = await db
    .from("order_items")
    .select("name, price, quantity, product_id, orders!inner(status)")
    .in("orders.status", ["paid", "fulfilled"]);

  const topMap = new Map<
    string,
    { name: string; revenue: number; quantity: number }
  >();
  const categoryRevenueMap = new Map<string, number>();
  (itemRows ?? []).forEach((i) => {
    const row = i as unknown as {
      name: string;
      price: number;
      quantity: number;
      product_id: string | null;
    };
    const lineRevenue = row.price * row.quantity;

    const entry = topMap.get(row.name) ?? {
      name: row.name,
      revenue: 0,
      quantity: 0,
    };
    entry.revenue += lineRevenue;
    entry.quantity += row.quantity;
    topMap.set(row.name, entry);

    const catName =
      (row.product_id && productCategoryName.get(row.product_id)) ||
      "Uncategorized";
    categoryRevenueMap.set(
      catName,
      (categoryRevenueMap.get(catName) ?? 0) + lineRevenue,
    );
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

  // ── ANALYTICS — god only: deeper patterns beyond the headline numbers ──
  if (role === "god") {
    const revenueByCategory = Array.from(categoryRevenueMap.entries())
      .map(([categoryName, revenue]) => ({ categoryName, revenue }))
      .sort((a, b) => b.revenue - a.revenue);

    const stateMap = new Map<string, number>();
    const weekdayRevenue = new Array(7).fill(0);
    const weekdayOrders = new Array(7).fill(0);
    (paidOrders ?? []).forEach((o) => {
      const state = (o.state as string) || "Unknown";
      stateMap.set(state, (stateMap.get(state) ?? 0) + 1);

      const day = new Date(o.created_at as string).getDay();
      weekdayRevenue[day] += o.total as number;
      weekdayOrders[day] += 1;
    });

    const ordersByState = Array.from(stateMap.entries())
      .map(([state, count]) => ({ state, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const ordersByWeekday = WEEKDAY_LABELS.map((label, i) => ({
      label,
      revenue: weekdayRevenue[i],
      orders: weekdayOrders[i],
    }));

    const totalOrders = allStatusRows?.length ?? 0;
    const funnel = {
      pending: byStatus.pending,
      paid: byStatus.paid,
      fulfilled: byStatus.fulfilled,
      cancelled: byStatus.cancelled,
      fulfillmentRate:
        totalOrders > 0
          ? Math.round(
              ((byStatus.paid + byStatus.fulfilled) / totalOrders) * 100,
            )
          : 0,
      cancellationRate:
        totalOrders > 0
          ? Math.round((byStatus.cancelled / totalOrders) * 100)
          : 0,
    };

    payload.analytics = {
      revenueByCategory,
      ordersByState,
      ordersByWeekday,
      funnel,
    };
  }

  return NextResponse.json(payload);
}

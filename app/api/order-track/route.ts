import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "../../../lib/supabaseAdmin";

export async function GET(req: NextRequest) {
  const rawCode = req.nextUrl.searchParams.get("code") ?? "";
  const orderCode = rawCode.trim().toUpperCase();

  if (!/^EX-\d{6}-[A-F0-9]{6}$/.test(orderCode)) {
    return NextResponse.json(
      { error: "Enter a valid order code." },
      { status: 400 },
    );
  }
  if (!supabaseAdmin) {
    return NextResponse.json(
      { error: "Order tracking is not configured." },
      { status: 500 },
    );
  }

  const { data, error } = await supabaseAdmin
    .from("orders")
    .select(
      "order_code, status, total, created_at, order_items(name, size, color, quantity, price)",
    )
    .eq("order_code", orderCode)
    .maybeSingle();

  if (error) {
    return NextResponse.json(
      { error: "Could not look up this order." },
      { status: 500 },
    );
  }
  if (!data) {
    return NextResponse.json(
      { error: "Order code not found." },
      { status: 404 },
    );
  }

  return NextResponse.json({
    order: {
      orderCode: data.order_code,
      status: data.status,
      total: data.total,
      createdAt: data.created_at,
      items: (
        (data.order_items as {
          name: string;
          size: string | null;
          color: string | null;
          quantity: number;
          price: number;
        }[]) ?? []
      ).map((item) => ({
        name: item.name,
        size: item.size,
        color: item.color,
        quantity: item.quantity,
        price: item.price,
      })),
    },
  });
}

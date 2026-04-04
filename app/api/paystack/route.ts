import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { email, amount } = await req.json();

  const response = await fetch("https://api.paystack.co/transaction/initialize", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      email,
      amount,
      currency: "NGN",
      callback_url: "http://localhost:3000/success",
    }),
  });

  const data = await response.json();

  if (!data.status) {
    return NextResponse.json({ error: "Payment init failed" }, { status: 500 });
  }

  return NextResponse.json({ url: data.data.authorization_url });
}
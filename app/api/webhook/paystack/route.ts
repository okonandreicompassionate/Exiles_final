import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    if (body.event !== "charge.success") {
      return NextResponse.json({ received: true });
    }

    const data = body.data;
    const meta = data.metadata;
    const amount = data.amount;
    const reference = data.reference;

    const itemsList = meta.items
      .map((item: any) => `${item.name} — Size ${item.size} x${item.quantity} — ₦${((item.price * item.quantity) / 100).toLocaleString()}`)
      .join("\n");

    const deliveryFee = meta.delivery_fee ?? 0;
    const subtotal = amount - deliveryFee * 100;

    // EMAIL TO YOU
    await resend.emails.send({
      from: "onboarding@resend.dev",
      to: process.env.YOUR_EMAIL!,
      subject: `🛍️ New EXILES Order — ${reference}`,
      text: `
NEW ORDER RECEIVED!

Reference: ${reference}

CUSTOMER DETAILS:
Name: ${meta.name}
Email: ${data.customer.email}
Phone: ${meta.phone}
WhatsApp: ${meta.whatsapp || "Not provided"}

DELIVERY ADDRESS:
${meta.address}
${meta.city ? meta.city + ", " : ""}${meta.state}

ITEMS ORDERED:
${itemsList}

Subtotal: ₦${(subtotal / 100).toLocaleString()}
Delivery: ₦${deliveryFee.toLocaleString()}
TOTAL PAID: ₦${(amount / 100).toLocaleString()}

---
Reach out to customer on WhatsApp: ${meta.whatsapp || meta.phone}
      `.trim(),
    });

    // EMAIL TO CUSTOMER
    await resend.emails.send({
      from: "onboarding@resend.dev",
      to: data.customer.email,
      subject: `Your EXILES Order is Confirmed ✓`,
      text: `
Hi ${meta.name},

Your order has been confirmed! We'll be in touch shortly to arrange delivery.

ORDER SUMMARY:
${itemsList}

Delivery to: ${meta.address}, ${meta.city ? meta.city + ", " : ""}${meta.state}
Delivery fee: ₦${deliveryFee.toLocaleString()}
Total paid: ₦${(amount / 100).toLocaleString()}
Reference: ${reference}

We'll contact you on ${meta.whatsapp || meta.phone} to confirm delivery details.

— EXILES
      `.trim(),
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Webhook error:", err);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}
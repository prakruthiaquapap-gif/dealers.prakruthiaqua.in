import { NextRequest, NextResponse } from "next/server";
import Razorpay from "razorpay";

export async function POST(req: NextRequest) {
  try {
    const { amount } = await req.json();

    // Force keys to be strings and trim them
    const key_id = (process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || "").trim();
    const key_secret = (process.env.RAZORPAY_KEY_SECRET || "").trim();

    if (!key_id || !key_secret) {
      return NextResponse.json({ error: "Keys missing" }, { status: 500 });
    }

    const razorpay = new Razorpay({
      key_id: key_id,
      key_secret: key_secret,
    });

    // Razorpay fails if amount has ANY decimals. 
    // Example: 500.00 -> 50000 (Correct)
    const amountInPaise = Math.floor(Number(amount) * 100);

    const options = {
      amount: amountInPaise,
      currency: "INR",
      receipt: `rcpt_${Date.now()}`,
    };

    const order = await razorpay.orders.create(options);
    return NextResponse.json(order);
    
  } catch (err: any) {
    // Look at your VS CODE TERMINAL for this output
    console.error("RAZORPAY SERVER ERROR:", err);
    return NextResponse.json(
      { error: err.description || "Order creation failed" },
      { status: 500 }
    );
  }
}
import { NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    const { orderId, status, customerName, items, customerEmail, totalAmount } = await req.json();

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS, // Your 16-character App Password
      },
    });

    const mailOptions = {
      from: `"Prakruthi Aqua" <${process.env.EMAIL_USER}>`,
      to: customerEmail,
      subject: `Order ${orderId}: ${status}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: auto; border: 1px solid #e2e8f0; border-radius: 20px; overflow: hidden;">
          <div style="background: #4f46e5; padding: 25px; text-align: center; color: white;">
            <h1 style="margin:0; font-size: 20px;">PRAKRUTHI AQUA</h1>
          </div>
          <div style="padding: 30px; color: #1e293b;">
            <p>Hello <strong>${customerName}</strong>,</p>
            <p>Your order status has been updated to: <strong>${status}</strong></p>
            <hr style="border:none; border-top: 1px solid #f1f5f9; margin: 20px 0;">
            <table style="width: 100%;">
              ${items?.map((item: any) => `
                <tr>
                  <td style="padding: 10px 0; font-weight: bold;">${item.product_name || item.name || "Product Item"}</td>
                  <td style="padding: 10px 0; text-align: right;">x${item.quantity}</td>
                </tr>
              `).join('')}
            </table>
            <div style="margin-top: 20px; text-align: right; font-size: 18px; font-weight: 900;">
              Total: ₹${totalAmount.toLocaleString()}
            </div>
          </div>
          <div style="background: #f8fafc; padding: 20px; text-align: center; font-size: 10px; color: #94a3b8;">
            OFFICIAL MANAGEMENT PORTAL
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
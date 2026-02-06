'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase';
import { useRouter } from 'next/navigation';
import { MdLocalShipping, MdPayment, MdCheckCircle, MdArrowBack, MdReceipt } from 'react-icons/md';
import toast from 'react-hot-toast';
import Script from 'next/script';

export default function CheckoutPage() {
    const supabase = createClient();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [cartItems, setCartItems] = useState<any[]>([]);
    const [userRole, setUserRole] = useState('');

    const [formData, setFormData] = useState({
        name: '', phone: '', alt_phone: '', house_no: '',
        area: '', city: '', state: '', pincode: ''
    });

    useEffect(() => {
        fetchInitialData();
    }, []);

    const fetchInitialData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return router.push('/login');

            const { data: dealer } = await supabase.from('dealers').select('role').eq('user_id', user.id).single();
            const role = dealer?.role?.toLowerCase().trim() || 'retailer outlet';
            setUserRole(role);

            const { data: cartData } = await supabase.from('dealer_cart').select(`*, products(product_name)`).eq('dealer_id', user.id);

            if (cartData && cartData.length > 0) {
                const productIds = cartData.map(item => item.product_id);
                const { data: variants } = await supabase.from('product_variants').select('*').in('product_id', productIds);

                const mergedItems = cartData.map(item => {
                    const variant = variants?.find(v => v.product_id === item.product_id);
                    let discountKey = (role === 'dealer' || role === 'main dealer') ? 'dealer_discount' : (role === 'sub dealer' ? 'subdealer_discount' : 'retail_discount');
                    return { ...item, discount_percentage: variant ? Number(variant[discountKey]) : 0 };
                });
                setCartItems(mergedItems);
            }

            const { data: addr } = await supabase.from('dealer_shipping_address').select('*').eq('dealer_id', user.id).single();
            if (addr) setFormData({ ...addr });
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    // --- CALCULATIONS ---
    const subtotal = Number(cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0).toFixed(2));
    const totalDiscount = Number(cartItems.reduce((acc, item) => acc + (item.price * item.quantity * (item.discount_percentage / 100)), 0).toFixed(2));
    const finalTotal = Number((subtotal - totalDiscount).toFixed(2));

    // --- ORDER LOGIC ---
    const finalizeOrder = async (userId: string, paymentId: string) => {
        try {
            setSubmitting(true);

            let targetTable = 'dealer_orders';
            let idColumn = 'dealer_id';
            const formattedRole = userRole.toLowerCase().trim();

            if (formattedRole === 'sub dealer') {
                targetTable = 'subdealer_orders';
                idColumn = 'subdealer_id';
            } else if (formattedRole === 'retailer outlet' || formattedRole === 'retailer') {
                targetTable = 'retail_orders';
                idColumn = 'retail_id';
            }

            const orderData: any = {
                [idColumn]: userId,
                total_amount: finalTotal,
                token_amount: finalTotal,
                paid_amount: finalTotal,
                remaining_amount: 0,
                payment_status: 'paid',
                payment_id: paymentId,
                delivery_status: 'pending',
                shipping_address: formData,
                items: cartItems,
            };

            if (targetTable === 'subdealer_orders') {
                orderData.updated_at = new Date();
            }

            const { data: order, error: orderError } = await supabase
                .from(targetTable)
                .insert([orderData])
                .select()
                .single();

            if (orderError) throw orderError;

            // Insert into payment_logs
            const { error: logError } = await supabase.from('payment_logs').insert([{
                order_id: order.id.toString(),
                user_id: userId,
                amount_paid: finalTotal,
                remaining_balance: 0
            }]);

            if (logError) console.error("Payment Log Error:", logError);

            await supabase.from('dealer_cart').delete().eq('dealer_id', userId);

            toast.success(`Order Placed Successfully!`);
            window.dispatchEvent(new Event('cartUpdated'));
            router.push('/pages/orders');

        } catch (err: any) {
            toast.error(`Order Failed: ${err.message || 'Unknown Error'}`);
        } finally {
            setSubmitting(false);
        }
    };

    const initiateRazorpay = async (userId: string, email: string) => {
        if (finalTotal < 1) {
            toast.error("Minimum order amount is ₹1.00");
            return;
        }

        try {
            setSubmitting(true);
            const response = await fetch('/api/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: Number(finalTotal) }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.error || "Failed to create order");
            }

            const orderData = await response.json();

            const options = {
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                amount: orderData.amount,
                currency: "INR",
                name: "Prakruthi Aqua",
                description: "Dealer Purchase",
                order_id: orderData.id,
                handler: (res: any) => {
                    finalizeOrder(userId, res.razorpay_payment_id);
                },
                prefill: {
                    name: formData.name,
                    contact: formData.phone,
                    email: email
                },
                theme: { color: "#108542" },
                modal: {
                    ondismiss: () => setSubmitting(false)
                }
            };

            const rzp = new (window as any).Razorpay(options);
            rzp.open();
        } catch (err: any) {
            toast.error(err.message || "Payment initiation failed");
            setSubmitting(false);
        }
    };

    const handleOrder = async (e: React.FormEvent) => {
        e.preventDefault();

        if (finalTotal < 1) {
            toast.error("Order total must be at least ₹1.00");
            return;
        }

        setSubmitting(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        try {
            await supabase.from('dealer_shipping_address').upsert({
                dealer_id: user.id,
                ...formData,
                updated_at: new Date()
            }, { onConflict: 'dealer_id' });

            await initiateRazorpay(user.id, user.email || '');
        } catch (err) {
            toast.error("Checkout process failed");
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-20 text-center font-black animate-pulse text-[#2c4305]">PREPARING CHECKOUT...</div>;

    return (
        <div className="max-w-6xl mx-auto px-4 py-10">
            <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

            <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-400 font-bold mb-6 uppercase text-xs tracking-widest hover:text-black">
                <MdArrowBack /> Back to Cart
            </button>

            <form onSubmit={handleOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* SHIPPING FORM */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-black text-slate-800 uppercase flex items-center gap-3">
                                <div className="p-3 bg-green-50 rounded-2xl text-[#2c4305]">
                                    <MdLocalShipping size={24} />
                                </div>
                                Shipping Address
                            </h2>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-4">Full Name</label>
                                <input
                                    required
                                    placeholder="e.g. John Doe"
                                    className="w-full p-4 bg-gray-50/50 rounded-2xl border border-gray-100 text-black outline-none focus:border-[#2c4305] transition-all"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-4">Primary Phone</label>
                                <input
                                    required
                                    placeholder="10-digit number"
                                    className="w-full p-4 bg-gray-50/50 rounded-2xl border border-gray-100 text-black outline-none focus:border-[#2c4305] transition-all"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1 md:col-span-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-4">House No. / Building Name</label>
                                <input
                                    required
                                    className="w-full p-4 bg-gray-50/50 rounded-2xl border border-gray-100 text-black outline-none focus:border-[#2c4305] transition-all"
                                    value={formData.house_no}
                                    onChange={e => setFormData({ ...formData, house_no: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1 md:col-span-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-4">Area / Street / Landmark</label>
                                <input
                                    required
                                    className="w-full p-4 bg-gray-50/50 rounded-2xl border border-gray-100 text-black outline-none focus:border-[#2c4305] transition-all"
                                    value={formData.area}
                                    onChange={e => setFormData({ ...formData, area: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:col-span-2">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-4">City</label>
                                    <input required className="w-full p-4 bg-gray-50/50 rounded-2xl border border-gray-100 text-black outline-none focus:border-[#2c4305]" value={formData.city} onChange={e => setFormData({ ...formData, city: e.target.value })} />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-4">State</label>
                                    <input required className="w-full p-4 bg-gray-50/50 rounded-2xl border border-gray-100 text-black outline-none focus:border-[#2c4305]" value={formData.state} onChange={e => setFormData({ ...formData, state: e.target.value })} />
                                </div>
                                <div className="space-y-1 col-span-2 md:col-span-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-4">Pincode</label>
                                    <input required className="w-full p-4 bg-gray-50/50 rounded-2xl border border-gray-100 text-black outline-none focus:border-[#2c4305] font-mono" value={formData.pincode} onChange={e => setFormData({ ...formData, pincode: e.target.value })} />
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 p-6 bg-blue-50/50 border border-blue-100 rounded-[2rem]">
                        <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-blue-500 shadow-sm">
                            <MdPayment size={20} />
                        </div>
                        <div>
                            <p className="text-xs font-black text-slate-800 uppercase">Secure Transaction</p>
                            <p className="text-[10px] text-slate-500">Payments are processed securely via Razorpay.</p>
                        </div>
                    </div>
                </div>

                {/* PAYMENT SUMMARY */}
                <div className="bg-[#1a2b4b] text-white p-8 rounded-[3rem] shadow-xl flex flex-col h-fit gap-y-6">
                    {/* Section 1: Pricing */}
                    <div>
                        <h3 className="font-black text-lg uppercase flex items-center gap-2 border-b border-white/10 pb-4 mb-4">
                            <MdReceipt /> Order Summary
                        </h3>
                        <div className="space-y-3 text-sm">
                            <div className="flex justify-between text-blue-200 uppercase font-bold">
                                <span>Subtotal</span>
                                <span>₹{subtotal.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-green-400 uppercase font-bold">
                                <span>Total Savings</span>
                                <span>- ₹{totalDiscount.toFixed(2)}</span>
                            </div>
                            <div className="pt-6 text-center border-t border-white/10 mt-4">
                                <p className="text-[10px] text-blue-300 uppercase font-black tracking-widest">Grand Total</p>
                                <p className="text-5xl font-black">₹{finalTotal.toFixed(2)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Section 2: Payment Status Indicator */}
                    <div className="space-y-3">
                        <div className="w-full p-4 rounded-2xl border-2 border-green-500 bg-green-500/10 flex items-center justify-between">
                            <div className="text-left">
                                <p className="font-black text-xs uppercase">Pay Online Now</p>
                                <p className="text-[9px] text-blue-300">Secure UPI/Card Payment</p>
                            </div>
                            <MdCheckCircle size={24} className="text-green-500" />
                        </div>
                    </div>

                    {/* Section 3: Action & Policy */}
                    <div className="space-y-3">
                        <button
                            type="submit"
                            disabled={submitting || finalTotal <= 0}
                            className="w-full bg-[#2c4305] hover:bg-[#0d6e36] text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {submitting ? 'PROCESSING...' : 'CONFIRM & PAY'}
                        </button>

                        {/* No Refund Policy Note */}
                        <p className="text-[9px] text-center text-gray-400 uppercase font-bold tracking-tighter opacity-70">
                            * Note: All sales are final. No refunds available once the order is placed.
                        </p>

                        {finalTotal < 1 && finalTotal > 0 && (
                            <p className="text-[10px] text-center text-red-400 font-bold uppercase animate-pulse">
                                Add ₹{(1 - finalTotal).toFixed(2)} more to enable checkout
                            </p>
                        )}
                    </div>
                </div>
            </form>
        </div>
    );
}
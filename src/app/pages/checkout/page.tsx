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
    const [paymentMethod, setPaymentMethod] = useState<'online' | 'cod'>('online');
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

    // --- CALCULATIONS (Fixed for Precision) ---
    const subtotal = Number(cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0).toFixed(2));
    const totalDiscount = Number(cartItems.reduce((acc, item) => acc + (item.price * item.quantity * (item.discount_percentage / 100)), 0).toFixed(2));
    const finalTotal = Number((subtotal - totalDiscount).toFixed(2));

    // --- ORDER LOGIC ---
    // --- UPDATED ORDER LOGIC ---
    const finalizeOrder = async (userId: string, paymentId: string) => {
        try {
            // 1. Insert into dealer_orders
            const { data: order, error: orderError } = await supabase.from('dealer_orders').insert([{
                dealer_id: userId,
                total_amount: finalTotal,
                token_amount: paymentMethod === 'online' ? finalTotal : 0,
                remaining_amount: paymentMethod === 'online' ? 0 : finalTotal,
                payment_status: paymentMethod === 'online' ? 'paid' : 'pending',
                delivery_status: 'pending',
                payment_id: paymentId,
                shipping_address: formData,
                items: cartItems,
                paid_amount: paymentMethod === 'online' ? finalTotal : 0
            }]).select().single();

            if (orderError) throw orderError;

            // 2. Insert into payment_logs (Required for your SQL table)
            if (paymentMethod === 'online' || paymentId !== 'CASH_ON_DELIVERY') {
                const { error: logError } = await supabase.from('payment_logs').insert([{
                    order_id: order.id.toString(),
                    user_id: userId,
                    amount_paid: finalTotal,
                    remaining_balance: 0
                }]);
                if (logError) console.error("Payment Log Error:", logError);
            }

            // 3. Clear Cart
            await supabase.from('dealer_cart').delete().eq('dealer_id', userId);

            toast.success("Order Placed Successfully!");

            // Refresh cart count globally
            window.dispatchEvent(new Event('cartUpdated'));

            // --- REDIRECT TO ORDERS PAGE ---
            router.push('/pages/orders');

        } catch (err) {
            toast.error("Error saving order details");
            console.error(err);
        } finally {
            setSubmitting(false);
        }
    };

    const initiateRazorpay = async (userId: string, email: string) => {
        if (finalTotal < 1) {
            toast.error("Minimum order amount is ₹1.00");
            setSubmitting(false);
            return;
        }
        // ... rest of logic

        try {
            setSubmitting(true);

            // 2. Create Order on Backend
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

            // 3. Open Razorpay Modal
            const options = {
                key: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID,
                amount: orderData.amount,
                currency: "INR",
                name: "Prakruthi Aqua",
                description: "Dealer Purchase",
                order_id: orderData.id,
                handler: (res: any) => {
                    // This triggers on successful payment
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
            console.error("Payment Error:", err);
            toast.error(err.message || "Payment initiation failed");
            setSubmitting(false);
        }
    };
    const handleOrder = async (e: React.FormEvent) => {
        e.preventDefault();

        // 1. IMMEDIATE CHECK: Prevent order if amount is too low
        if (finalTotal < 1) {
            toast.error("Order total must be at least ₹1.00", {
                style: {
                    borderRadius: '10px',
                    background: '#333',
                    color: '#fff',
                },
            });
            return; // Stop execution here
        }

        setSubmitting(true);

        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        try {
            // ... rest of your code (Address upsert and finalize/initiate)
            // Update Shipping Address
            await supabase.from('dealer_shipping_address').upsert({
                dealer_id: user.id,
                ...formData,
                updated_at: new Date()
            }, { onConflict: 'dealer_id' });

            if (paymentMethod === 'cod') {
                await finalizeOrder(user.id, 'CASH_ON_DELIVERY');
            } else {
                await initiateRazorpay(user.id, user.email || '');
            }
        } catch (err) {
            toast.error("Checkout process failed");
            setSubmitting(false);
        }
    };

    if (loading) return <div className="p-20 text-center font-black animate-pulse text-[#108542]">PREPARING CHECKOUT...</div>;

    return (
        <div className="max-w-6xl mx-auto px-4 py-10">
            <Script src="https://checkout.razorpay.com/v1/checkout.js" strategy="lazyOnload" />

            <button onClick={() => router.back()} className="flex items-center gap-2 text-gray-400 font-bold mb-6 uppercase text-xs tracking-widest hover:text-black">
                <MdArrowBack /> Back to Cart
            </button>

            <form onSubmit={handleOrder} className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* SHIPPING FORM */}
                {/* SHIPPING FORM */}
                <div className="lg:col-span-2 space-y-6">
                    <div className="bg-white p-8 rounded-[2.5rem] border border-gray-100 shadow-sm transition-all hover:shadow-md">
                        <div className="flex items-center justify-between mb-8">
                            <h2 className="text-2xl font-black text-slate-800 uppercase flex items-center gap-3">
                                <div className="p-3 bg-green-50 rounded-2xl text-[#108542]">
                                    <MdLocalShipping size={24} />
                                </div>
                                Shipping Address
                            </h2>

                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                            {/* Primary Contact Group */}
                            <div className="space-y-1 md:col-span-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-4">Full Name</label>
                                <input
                                    required
                                    placeholder="e.g. John Doe"
                                    className="w-full p-4 bg-gray-50/50 rounded-2xl border border-gray-100 text-black outline-none focus:border-[#108542] focus:bg-white focus:ring-4 focus:ring-green-500/5 transition-all"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1 md:col-span-1">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-4">Primary Phone</label>
                                <input
                                    required
                                    placeholder="10-digit number"
                                    className="w-full p-4 bg-gray-50/50 rounded-2xl border border-gray-100 text-black outline-none focus:border-[#108542] focus:bg-white focus:ring-4 focus:ring-green-500/5 transition-all"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1 md:col-span-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-4">House No. / Building Name</label>
                                <input
                                    required
                                    placeholder="Apartment, suite, unit, etc."
                                    className="w-full p-4 bg-gray-50/50 rounded-2xl border border-gray-100 text-black outline-none focus:border-[#108542] focus:bg-white focus:ring-4 focus:ring-green-500/5 transition-all"
                                    value={formData.house_no}
                                    onChange={e => setFormData({ ...formData, house_no: e.target.value })}
                                />
                            </div>

                            <div className="space-y-1 md:col-span-2">
                                <label className="text-[10px] font-bold text-slate-400 uppercase ml-4">Area / Street / Landmark</label>
                                <input
                                    required
                                    placeholder="Near City Center..."
                                    className="w-full p-4 bg-gray-50/50 rounded-2xl border border-gray-100 text-black outline-none focus:border-[#108542] focus:bg-white focus:ring-4 focus:ring-green-500/5 transition-all"
                                    value={formData.area}
                                    onChange={e => setFormData({ ...formData, area: e.target.value })}
                                />
                            </div>

                            {/* Location Details Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:col-span-2">
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-4">City</label>
                                    <input
                                        required
                                        className="w-full p-4 bg-gray-50/50 rounded-2xl border border-gray-100 text-black outline-none focus:border-[#108542] transition-all"
                                        value={formData.city}
                                        onChange={e => setFormData({ ...formData, city: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-4">State</label>
                                    <input
                                        required
                                        className="w-full p-4 bg-gray-50/50 rounded-2xl border border-gray-100 text-black outline-none focus:border-[#108542] transition-all"
                                        value={formData.state}
                                        onChange={e => setFormData({ ...formData, state: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-1 col-span-2 md:col-span-1">
                                    <label className="text-[10px] font-bold text-slate-400 uppercase ml-4">Pincode</label>
                                    <input
                                        required
                                        className="w-full p-4 bg-gray-50/50 rounded-2xl border border-gray-100 text-black outline-none focus:border-[#108542] transition-all font-mono tracking-widest"
                                        value={formData.pincode}
                                        onChange={e => setFormData({ ...formData, pincode: e.target.value })}
                                    />
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
                            <p className="text-[10px] text-slate-500">Your details are encrypted and safe with us.</p>
                        </div>
                    </div>
                </div>

                {/* PAYMENT SUMMARY */}
                <div className="bg-[#1a2b4b] text-white p-8 rounded-[3rem] shadow-xl space-y-6 flex flex-col justify-between">
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

                    <div className="space-y-3 pt-4">
                        <button type="button" onClick={() => setPaymentMethod('online')} className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center justify-between ${paymentMethod === 'online' ? 'border-green-500 bg-green-500/10' : 'border-white/5 bg-white/5 hover:bg-white/10'}`}>
                            <div className="text-left">
                                <p className="font-black text-xs uppercase">Pay Online Now</p>
                                <p className="text-[9px] text-blue-300">Secure UPI/Card Payment</p>
                            </div>
                            {paymentMethod === 'online' && <MdCheckCircle size={24} className="text-green-500" />}
                        </button>

                        <button type="button" onClick={() => setPaymentMethod('cod')} className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center justify-between ${paymentMethod === 'cod' ? 'border-green-500 bg-green-500/10' : 'border-white/5 bg-white/5 hover:bg-white/10'}`}>
                            <div className="text-left">
                                <p className="font-black text-xs uppercase">Cash on Delivery</p>
                                <p className="text-[9px] text-blue-300">Pay when you receive</p>
                            </div>
                            {paymentMethod === 'cod' && <MdCheckCircle size={24} className="text-green-500" />}
                        </button>
                    </div>

                    <div className="space-y-2">
                        <button
                            type="submit"
                            disabled={submitting || finalTotal <= 0}
                            className="w-full bg-[#108542] hover:bg-[#0d6e36] text-white py-5 rounded-2xl font-black uppercase tracking-widest shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-2"
                        >
                            {submitting ? 'PROCESSING...' : 'CONFIRM ORDER'}
                        </button>

                        {/* Helpful hint for the user */}
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
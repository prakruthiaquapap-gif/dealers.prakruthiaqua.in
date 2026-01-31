'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase';
import { MdDeleteOutline, MdShoppingCart, MdArrowBack, MdAdd, MdRemove, MdPayment, MdLocalOffer } from 'react-icons/md';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function CartPage() {
    const supabase = createClient();
    const router = useRouter();

    const [cartItems, setCartItems] = useState<any[]>([]);
    const [userRole, setUserRole] = useState('');
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchCartAndUser();
    }, []);

    const fetchCartAndUser = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: dealer } = await supabase.from('dealers').select('role').eq('user_id', user.id).single();
            const role = dealer?.role?.toLowerCase().trim() || 'retailer outlet';
            setUserRole(role);

            // UPDATED QUERY: Fetching variant details (quantity_value/unit)
            const { data, error } = await supabase
                .from('dealer_cart')
                .select(`
                    *,
                    products (product_name, image_url, subcategory),
                    product_variants!fk_variant (quantity_value, quantity_unit, dealer_discount, subdealer_discount, retail_discount)
                `)
                .eq('dealer_id', user.id);

            if (error) throw error;

            const mergedItems = data?.map(item => {
                const variant = item.product_variants;
                let discountKey = 'retail_discount';
                if (role === 'dealer' || role === 'main dealer') discountKey = 'dealer_discount';
                else if (role === 'sub dealer') discountKey = 'subdealer_discount';

                return {
                    ...item,
                    discount_percentage: variant ? Number(variant[discountKey]) : 0,
                    variant_label: variant ? `${variant.quantity_value}${variant.quantity_unit}` : ''
                };
            });

            setCartItems(mergedItems || []);
        } catch (err) {
            toast.error("Error loading cart");
        } finally {
            setLoading(false);
        }
    };

    const updateQuantity = async (id: number, newQty: number) => {
        if (newQty < 25) return toast.error("Minimum order is 25");
        const { error } = await supabase.from('dealer_cart').update({ quantity: newQty }).eq('id', id);
        if (!error) setCartItems(cartItems.map(item => item.id === id ? { ...item, quantity: newQty } : item));
    };

    const removeItem = async (id: number) => {
        const { error } = await supabase.from('dealer_cart').delete().eq('id', id);
        if (!error) {
            setCartItems(cartItems.filter(item => item.id !== id));
            window.dispatchEvent(new Event('cartUpdated'));
            toast.success("Item removed");
        }
    };

    // --- CALCULATIONS ---
    const subtotal = cartItems.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const totalDiscount = cartItems.reduce((acc, item) => acc + (item.price * item.quantity * (item.discount_percentage / 100)), 0);
    const finalTotal = subtotal - totalDiscount;

    if (loading) return <div className="p-20 text-center font-black animate-pulse text-[#108542]">LOADING CART...</div>;

    return (
        <div className="max-w-6xl mx-auto px-4 py-10 space-y-8">
            <div className="flex items-center justify-between">
                <button onClick={() => router.push('/pages/products')} className="flex items-center gap-2 text-gray-400 hover:text-slate-800 font-bold transition-all uppercase text-xs tracking-widest">
                    <MdArrowBack size={18} /> Back to Catalog
                </button>
                <h2 className="text-2xl font-black text-slate-800 uppercase">Cart ({cartItems.length})</h2>
            </div>

            {cartItems.length === 0 ? (
                <div className="bg-white rounded-[3rem] p-20 text-center border border-gray-100 shadow-sm">
                    <MdShoppingCart size={60} className="mx-auto text-gray-100 mb-4" />
                    <p className="text-gray-400 font-bold uppercase tracking-widest">Empty Basket</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    <div className="lg:col-span-2 space-y-4">
                        {cartItems.map((item) => {
                            const rawTotal = item.price * item.quantity;
                            const discountAmount = rawTotal * (item.discount_percentage / 100);
                            const itemFinalTotal = rawTotal - discountAmount;

                            return (
                                <div key={item.id} className="bg-white p-6 rounded-[2.5rem] border border-gray-100 flex flex-col md:flex-row gap-6 items-center shadow-sm relative">
                                    <div className="w-24 h-24 bg-gray-50 rounded-3xl p-2 flex-shrink-0">
                                        <img src={item.products.image_url} className="w-full h-full object-contain" alt="product" />
                                    </div>

                                    <div className="flex-1">
                                        <div className="flex items-center gap-2">
                                            <p className="text-[10px] font-black text-[#108542] uppercase">{item.products.subcategory}</p>
                                            <span className="bg-[#1a2b4b] text-white text-[9px] px-2 py-0.5 rounded-full font-bold">{item.variant_label}</span>
                                        </div>
                                        <h4 className="font-black text-slate-800 text-lg leading-tight">{item.products.product_name}</h4>

                                        {/* Unit Price Info */}
                                        <p className="text-xs text-gray-400 mt-1 font-bold">
                                            Unit Price: ₹{item.price.toFixed(2)} × {item.quantity} units
                                        </p>

                                        <div className="flex items-center gap-4 mt-4">
                                            <div className="flex items-center bg-gray-50 rounded-xl border p-1">
                                                <button onClick={() => updateQuantity(item.id, item.quantity - 1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm text-slate-400 disabled:opacity-30" disabled={item.quantity <= 25}><MdRemove /></button>
                                                <span className="w-12 text-center text-sm font-black text-slate-800">{item.quantity}</span>
                                                <button onClick={() => updateQuantity(item.id, item.quantity + 1)} className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm text-slate-400"><MdAdd /></button>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col items-end text-right min-w-[140px]">
                                        {/* Delete Button */}
                                        <button
                                            onClick={() => removeItem(item.id)}
                                            className="p-2 text-gray-300 hover:text-red-500 transition-all mb-3"
                                        >
                                            <MdDeleteOutline size={22} />
                                        </button>

                                        <div className="space-y-1 w-full">
                                            {/* Gross Price */}
                                            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-tight">
                                                Gross: ₹{rawTotal.toFixed(2)}
                                            </p>

                                            {/* Discount Row - Using flex to ensure '-' is never hidden */}
                                            {item.discount_percentage > 0 && (
                                                <div className="flex justify-end items-center gap-1 text-green-600 bg-green-50 px-2 py-1 rounded-lg">
                                                    <span className="text-[10px] font-black uppercase">
                                                        Disc. ({item.discount_percentage}%)
                                                    </span>
                                                    <span className="text-sm font-black whitespace-nowrap">
                                                        - ₹{discountAmount.toFixed(2)}
                                                    </span>
                                                </div>
                                            )}

                                            {/* Final Item Price */}
                                            <div className="pt-1">
                                                <p className="text-2xl font-black text-slate-900 leading-none">
                                                    ₹{itemFinalTotal.toFixed(2)}
                                                </p>
                                                <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest mt-1">
                                                    Net Amount
                                                </p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {/* TOTAL BOX */}
                    <div className="bg-[#1a2b4b] text-white p-8 rounded-[3rem] shadow-xl h-fit">
                        <h3 className="font-black text-xl uppercase border-b border-white/10 pb-4 mb-6 flex items-center gap-2"><MdPayment /> Summary</h3>

                        <div className="space-y-4">
                            <div className="flex justify-between text-xs font-bold uppercase text-blue-200">
                                <span>Cart Subtotal</span>
                                <span>₹{subtotal.toFixed(2)}</span>
                            </div>
                            {totalDiscount > 0 && (
                                <div className="flex justify-between text-xs font-bold uppercase text-green-400">
                                    <span>Total Savings</span>
                                    <span>- ₹{totalDiscount.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="pt-6 mt-6 border-t border-white/10 text-center">
                                <p className="text-[10px] font-black text-blue-300 uppercase tracking-widest">Amount to Pay</p>
                                <p className="text-4xl font-black">₹{finalTotal.toFixed(2)}</p>
                            </div>

                            <button onClick={() => router.push('/pages/checkout')} className="w-full bg-[#108542] hover:bg-[#0d6e36] text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest mt-4 shadow-lg">
                                PROCEED TO CHECKOUT
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
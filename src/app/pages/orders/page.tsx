'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase';
import { useRouter } from 'next/navigation';
import { MdReceipt, MdLocalShipping, MdPayment, MdAccessTime, MdArrowBack, MdChevronRight } from 'react-icons/md';
import { format } from 'date-fns';

export default function OrdersPage() {
    const supabase = createClient();
    const router = useRouter();
    const [orders, setOrders] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchOrders();
    }, []);

    const fetchOrders = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return router.push('/login');

            const { data, error } = await supabase
                .from('dealer_orders')
                .select('*')
                .eq('dealer_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setOrders(data || []);
        } catch (error) {
            console.error('Error fetching orders:', error);
        } finally {
            setLoading(false);
        }
    };

    const getStatusColor = (status: string) => {
        switch (status.toLowerCase()) {
            case 'delivered': return 'bg-green-100 text-green-700';
            case 'shipped': return 'bg-blue-100 text-blue-700';
            case 'pending': return 'bg-amber-100 text-amber-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    };

    if (loading) return <div className="p-20 text-center font-black animate-pulse text-[#108542]">LOADING YOUR ORDERS...</div>;

    return (
        <div className="max-w-5xl mx-auto px-4 py-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-10">
                <div>
                    <button onClick={() => router.push('/pages/dashboard')} className="flex items-center gap-2 text-gray-400 font-bold mb-2 uppercase text-[10px] tracking-widest hover:text-black transition-all">
                        <MdArrowBack /> Dashboard
                    </button>
                    <h1 className="text-3xl font-black text-slate-800 uppercase tracking-tight flex items-center gap-3">
                        My Purchase History
                    </h1>
                </div>
                <div className="bg-white px-6 py-3 rounded-2xl border border-gray-100 shadow-sm">
                    <p className="text-[10px] font-black text-gray-400 uppercase">Total Orders</p>
                    <p className="text-2xl font-black text-[#108542]">{orders.length}</p>
                </div>
            </div>

            {orders.length === 0 ? (
                <div className="text-center py-20 bg-gray-50 rounded-[3rem] border-2 border-dashed border-gray-200">
                    <MdReceipt size={48} className="mx-auto text-gray-300 mb-4" />
                    <p className="font-bold text-gray-500">No orders found yet.</p>
                    <button onClick={() => router.push('/pages/products')} className="mt-4 text-[#108542] font-black uppercase text-xs underline">Start Shopping</button>
                </div>
            ) : (
                <div className="space-y-6">
                    {orders.map((order) => (
                        <div key={order.id} className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-all">
                            {/* Order Header */}
                            <div className="p-6 md:p-8 flex flex-col md:flex-row justify-between gap-6 border-b border-gray-50 bg-gray-50/30">
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 flex-1">
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Order Date</p>
                                        <p className="text-sm font-bold text-slate-800">{format(new Date(order.created_at), 'dd MMM yyyy')}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Total Amount</p>
                                        <p className="text-sm font-black text-[#108542]">₹{order.total_amount.toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Payment</p>
                                        <span className={`text-[10px] px-3 py-1 rounded-full font-bold uppercase ${order.payment_status === 'paid' ? 'bg-green-500 text-white' : 'bg-slate-200 text-slate-600'}`}>
                                            {order.payment_status}
                                        </span>
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Status</p>
                                        <span className={`text-[10px] px-3 py-1 rounded-full font-bold uppercase ${getStatusColor(order.delivery_status)}`}>
                                            {order.delivery_status}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    <p className="text-[10px] font-mono text-gray-400 bg-white border px-3 py-2 rounded-xl">ID: #{order.id.toString().slice(-6)}</p>
                                </div>
                            </div>

                            {/* Order Items */}
                            <div className="p-6 md:p-8">
                                <div className="space-y-4">
                                    {order.items?.map((item: any, idx: number) => (
                                        <div key={idx} className="flex items-center justify-between group">
                                            <div className="flex items-center gap-4">
                                                <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center font-black text-slate-400 text-xs">
                                                    {item.quantity}x
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-slate-800 group-hover:text-[#108542] transition-colors">
                                                        {item.products?.product_name || 'Product'}
                                                    </p>
                                                    <p className="text-[10px] text-gray-400 uppercase font-bold">Unit Price: ₹{item.price}</p>
                                                </div>
                                            </div>
                                            <p className="text-sm font-bold text-slate-800">₹{(item.price * item.quantity).toFixed(2)}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Shipping Summary Mini-View */}
                                <div className="mt-8 pt-6 border-t border-gray-50 flex items-center gap-4 text-gray-500">
                                    <MdLocalShipping size={18} />
                                    <p className="text-xs font-medium">
                                        Deliver to: <span className="text-slate-800 font-bold">{order.shipping_address?.name}</span>, {order.shipping_address?.city}, {order.shipping_address?.pincode}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase';
import {
  FiSearch, FiEye, FiX, FiPackage, FiTruck, FiMail, FiClock, FiCheckCircle, FiAlertCircle, FiMapPin, FiCalendar
} from 'react-icons/fi';
import toast, { Toaster } from 'react-hot-toast';

export default function DealerOrders() {
  const supabase = createClient();
  const [statusFilter, setStatusFilter] = useState<'all' | string>('all');

  const [orders, setOrders] = useState<any[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const STATUS_FLOW = ['pending', 'Processing', 'Shipped', 'Delivered'];
  const isOptionDisabled = (current: string, option: string) => {
    const currentIndex = STATUS_FLOW.indexOf(current || 'pending');
    const optionIndex = STATUS_FLOW.indexOf(option);

    // Disable all previous statuses
    return optionIndex < currentIndex;
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const [dRes, sRes, rRes, profileRes] = await Promise.all([
        supabase.from('dealer_orders').select('*'),
        supabase.from('subdealer_orders').select('*'),
        supabase.from('retail_orders').select('*'),
        supabase.from('dealers').select('id, user_id, email')
      ]);

      // Map using both ID and User_ID just to be safe based on your schema
      const emailMap = new Map();
      profileRes.data?.forEach(d => {
        emailMap.set(d.id, d.email);
        emailMap.set(d.user_id, d.email);
      });

      const allOrders = [
        ...(dRes.data || []).map(o => ({
          ...o,
          role: 'Dealer',
          displayId: `D-${o.id}`,
          userEmail: emailMap.get(o.dealer_id) || emailMap.get(o.dealer_user_id)
        })),
        ...(sRes.data || []).map(o => ({
          ...o,
          role: 'Sub Dealer',
          displayId: `SD-${o.id}`,
          userEmail: emailMap.get(o.subdealer_id)
        })),
        ...(rRes.data || []).map(o => ({
          ...o,
          role: 'Retail',
          displayId: `RT-${o.id}`,
          userEmail: emailMap.get(o.retail_id)
        })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setOrders(allOrders);
      setFilteredOrders(allOrders);
    } catch (error) {
      console.error(error);
      toast.error("Failed to sync orders");
    } finally {
      setLoading(false);
    }
  };

  /**
   * EMAIL NOTIFICATION LOGIC
   * Integration point for Resend/SendGrid/Supabase Edge Functions
   */
  const sendEmailNotification = async (order: any, newStatus: string) => {
    const addr = getAddress(order);
    const targetEmail = order.userEmail || addr?.email;

    if (!targetEmail || targetEmail === 'Email Not Found') {
      toast.error("No valid email found to notify customer");
      return;
    }

    try {
      const response = await fetch('/api/send-status-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: order.displayId,
          status: newStatus,
          customerName: addr?.name || 'Valued Customer',
          items: getItems(order), // This uses your existing helper
          customerEmail: targetEmail,
          totalAmount: order.total_amount
        }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Failed to send');

      toast.success(`Notification sent to ${targetEmail}`);
    } catch (error: any) {
      console.error("Email Error:", error);
      toast.error("Order updated, but email failed: " + error.message);
    }
  };

  const updateOrderStatus = async (order: any, newStatus: string) => {
    if (order.delivery_status === newStatus) return;

    const loadingToast = toast.loading(`Updating to ${newStatus}...`);

    try {
      const tableName =
        order.role === 'Dealer'
          ? 'dealer_orders'
          : order.role === 'Sub Dealer'
            ? 'subdealer_orders'
            : 'retail_orders';

      // ✅ Optimistic UI update
      setOrders(prev =>
        prev.map(o =>
          o.displayId === order.displayId
            ? { ...o, delivery_status: newStatus }
            : o
        )
      );

      setFilteredOrders(prev =>
        prev.map(o =>
          o.displayId === order.displayId
            ? { ...o, delivery_status: newStatus }
            : o
        )
      );

      // ✅ DB update
      const { error } = await supabase
        .from(tableName)
        .update({ delivery_status: newStatus })
        .eq('id', order.id);

      if (error) throw error;

      // ✅ Email gets UPDATED order
      await sendEmailNotification(
        { ...order, delivery_status: newStatus },
        newStatus
      );

      toast.success('Status updated & Email sent', { id: loadingToast });

      // optional but safe
      fetchOrders();
    } catch (err) {
      toast.error('Update failed', { id: loadingToast });
    }
  };

  const getItems = (order: any) => {
    try {
      const rawItems = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
      if (!rawItems) return [];
      return (Array.isArray(rawItems) ? rawItems : [rawItems]).map(item => ({
        name: item.name || item.products?.product_name || item.product_name || "Unknown Product",
        quantity: item.quantity || 0,
        price: item.price || item.price_at_purchase || 0
      }));
    } catch (e) { return []; }
  };

  const getAddress = (order: any) => {
    try {
      return typeof order.shipping_address === 'string' ? JSON.parse(order.shipping_address) : order.shipping_address;
    } catch (e) { return {}; }
  };

useEffect(() => {
  const result = orders.filter(o => {
    const addr = getAddress(o);
    const searchLower = search.toLowerCase();

    const matchesSearch =
      o.displayId.toLowerCase().includes(searchLower) ||
      (o.userEmail || '').toLowerCase().includes(searchLower) ||
      (addr?.name || '').toLowerCase().includes(searchLower);

    const matchesStatus =
      statusFilter === 'all' || o.delivery_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  setFilteredOrders(result);
}, [search, statusFilter, orders]);

  return (
    <div className="min-h-screen bg-[#F4F6F4] p-4 text-slate-900 font-sans">
      <Toaster position="top-right" />

      {/* 1. TOP STATS PANEL */}
      <div className="max-w-6xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatBox label="Total Order" count={orders.length} icon={<FiPackage />} color="bg-white text-slate-900" />
        <StatBox label="Pending" count={orders.filter(o => o.delivery_status === 'pending').length} icon={<FiClock />} color="bg-white text-slate-900" />
        <StatBox label="Shipping" count={orders.filter(o => o.delivery_status === 'Shipped').length} icon={<FiTruck />} color="bg-white text-slate-900" />
        <StatBox label="Delivered" count={orders.filter(o => o.delivery_status === 'Delivered').length} icon={<FiCheckCircle />} color="bg-white text-slate-900" />
      </div>

      {/* 2. HEADER & SEARCH */}
      <div className="max-w-6xl mx-auto mb-6 flex flex-col md:flex-row justify-between items-center gap-4">
  <div>
    <h1 className="text-2xl font-black text-[#2c4305]">Order CONTROL</h1>
    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center md:text-left">
      Real-time Order Management
    </p>
  </div>

  <div className="flex gap-3 w-full md:w-auto">
    {/* Search */}
    <div className="relative w-full md:w-72">
      <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
      <input
        type="text"
        placeholder="Search orders..."
        className="w-full pl-12 pr-4 py-3 rounded-2xl border-none shadow-sm font-bold text-sm focus:ring-2 focus:ring-[#2c4305]"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
    </div>

    {/* Status Filter */}
    <select
      value={statusFilter}
      onChange={(e) => setStatusFilter(e.target.value)}
      className="px-4 py-3 rounded-2xl bg-white shadow-sm border border-slate-200 text-sm font-black uppercase
        focus:ring-2 focus:ring-[#2c4305] cursor-pointer"
    >
      <option value="all">All Status</option>
      <option value="pending">Pending</option>
      <option value="Processing">Processing</option>
      <option value="Shipped">Shipped</option>
      <option value="Delivered">Delivered</option>
    </select>
  </div>
</div>


      {/* 3. TABLE */}
    {/* 3. RESPONSIVE TABLE & CARDS */}
<div className="max-w-6xl mx-auto bg-white rounded-3xl shadow-xl overflow-hidden border border-slate-200">
  
  {/* DESKTOP TABLE (Hidden on Mobile) */}
  <div className="hidden md:block overflow-x-auto">
    <table className="w-full text-left text-sm">
      <thead className="bg-[#2c4305] text-white">
        <tr>
          <th className="px-6 py-4 font-black uppercase text-[10px] tracking-wider">Order Details</th>
          <th className="px-6 py-4 font-black uppercase text-[10px] tracking-wider">Customer & Email</th>
          <th className="px-6 py-4 font-black uppercase text-[10px] tracking-wider text-center">Status</th>
          <th className="px-6 py-4 font-black uppercase text-[10px] tracking-wider text-center">Action</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-100 font-bold">
        {loading ? (
          <tr><td colSpan={4} className="py-24 text-center animate-pulse text-slate-300 italic">Fetching Logistics...</td></tr>
        ) : filteredOrders.map((order) => (
          <DesktopOrderRow 
            key={`${order.role}-${order.id}`} 
            order={order} 
            getAddress={getAddress} 
            STATUS_FLOW={STATUS_FLOW} 
            isOptionDisabled={isOptionDisabled} 
            updateOrderStatus={updateOrderStatus} 
            setSelectedOrder={setSelectedOrder} 
          />
        ))}
      </tbody>
    </table>
  </div>

  {/* MOBILE LIST VIEW (Hidden on Desktop) */}
  <div className="md:hidden divide-y divide-slate-100">
    {loading ? (
      <div className="py-12 text-center animate-pulse text-slate-300 font-black uppercase text-xs">Loading Orders...</div>
    ) : filteredOrders.map((order) => (
      <MobileOrderCard 
        key={`${order.role}-${order.id}`} 
        order={order} 
        getAddress={getAddress} 
        STATUS_FLOW={STATUS_FLOW} 
        isOptionDisabled={isOptionDisabled} 
        updateOrderStatus={updateOrderStatus} 
        setSelectedOrder={setSelectedOrder} 
      />
    ))}
  </div>

  {!loading && filteredOrders.length === 0 && (
    <div className="py-20 text-center text-slate-400 font-bold">No orders matched your search.</div>
  )}
</div>

      {/* 4. MODAL */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-6 bg-[#2c4305] text-white flex justify-between items-center">
              <div>
                <h2 className="text-xl font-black">{selectedOrder.displayId}</h2>
                <p className="text-[10px] uppercase font-bold text-white/60 italic">Ordered on {new Date(selectedOrder.created_at).toLocaleDateString()}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="p-2 bg-white/10 rounded-xl hover:bg-red-500 transition-all">
                <FiX size={24} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto">
              <div className="mb-6">
                <p className="text-[10px] font-black uppercase text-slate-400 mb-4 flex items-center gap-2"><FiPackage /> Items Summary</p>
                <div className="space-y-3">
                  {getItems(selectedOrder).map((item, i) => (
                    <div key={i} className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl border border-slate-200/50">
                      <div>
                        <p className="font-black text-slate-800 text-sm uppercase">{item.name}</p>
                        <p className="text-[10px] font-bold text-slate-400 tracking-tighter">RATE: ₹{item.price}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-xs font-black text-white bg-[#2c4305] px-3 py-1 rounded-lg">x{item.quantity}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-100 mb-6">
                <p className="text-[10px] font-black uppercase text-slate-400 mb-2 flex items-center gap-2"><FiMapPin /> Shipping To</p>
                <p className="text-sm font-black text-slate-700 leading-relaxed">
                  {getAddress(selectedOrder)?.name}<br />

                  {getAddress(selectedOrder)?.house_no}, {getAddress(selectedOrder)?.area}<br />

                  {getAddress(selectedOrder)?.city}, {getAddress(selectedOrder)?.state} - {getAddress(selectedOrder)?.pincode}
                </p>

                {(getAddress(selectedOrder)?.phone ||
                  getAddress(selectedOrder)?.mobile ||
                  getAddress(selectedOrder)?.phone_number) && (
                    <p className="mt-3 text-sm font-black text-slate-700 flex items-center gap-2">
                      <FiAlertCircle className="text-[#2c4305]" />
                      {getAddress(selectedOrder)?.phone ||
                        getAddress(selectedOrder)?.mobile ||
                        getAddress(selectedOrder)?.phone_number}
                    </p>
                  )}

              </div>

              <div className="flex justify-between items-center bg-[#2c4305] p-6 rounded-3xl text-white shadow-lg">
                <span className="font-black text-xs uppercase opacity-60">Total Amount</span>
                <span className="text-3xl font-black">₹{Number(selectedOrder.total_amount).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function StatBox({ label, count, icon, color }: any) {
  return (
    <div className={`${color} p-5 rounded-3xl shadow-sm border border-slate-200/50 flex items-center gap-4`}>
      <div className="p-3 bg-black/5 rounded-2xl text-xl">{icon}</div>
      <div>
        <p className="text-[10px] font-black uppercase opacity-60 tracking-widest mb-1">{label}</p>
        <p className="text-2xl font-black">{count}</p>
      </div>
    </div>
  );
}


// 1. Desktop Row Component
const DesktopOrderRow = ({ order, getAddress, STATUS_FLOW, isOptionDisabled, updateOrderStatus, setSelectedOrder }: any) => {
  const addr = getAddress(order);
  const orderDate = new Date(order.created_at).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric'
  });

  return (
    <tr className="hover:bg-slate-50 transition-all">
      <td className="px-6 py-5">
        <p className="text-[#2c4305] font-black">{order.displayId}</p>
        <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-1"><FiCalendar /> {orderDate}</p>
      </td>
      <td className="px-6 py-5">
        <p className="text-slate-900">{addr?.name || 'User'}</p>
        <p className="text-[11px] text-slate-400 font-medium truncate max-w-[200px]">{order.userEmail ?? addr?.email ?? 'N/A'}</p>
      </td>
      <td className="px-6 py-5 text-center">
        <select
          value={order.delivery_status || 'pending'}
          onChange={(e) => updateOrderStatus(order, e.target.value)}
          disabled={order.delivery_status === 'Delivered'}
          className="text-[11px] bg-white border border-slate-200 rounded-lg px-3 py-1.5 font-black uppercase outline-none focus:ring-2 focus:ring-[#2c4305] cursor-pointer"
        >
        {STATUS_FLOW.map((status: string) => (
  <option key={status} value={status} disabled={isOptionDisabled(order.delivery_status, status)}>{status}</option>
))}
        </select>
      </td>
      <td className="px-6 py-5 text-center">
        <button onClick={() => setSelectedOrder(order)} className="p-2 bg-slate-100 text-[#2c4305] rounded-xl hover:bg-[#2c4305] hover:text-white transition-all">
          <FiEye size={18} />
        </button>
      </td>
    </tr>
  );
};

// 2. Mobile Card Component
const MobileOrderCard = ({ order, getAddress, STATUS_FLOW, isOptionDisabled, updateOrderStatus, setSelectedOrder }: any) => {
  const addr = getAddress(order);
  const orderDate = new Date(order.created_at).toLocaleDateString('en-IN', {
    day: '2-digit', month: 'short'
  });

  return (
    <div className="p-5 flex flex-col gap-3 bg-white">
      <div className="flex justify-between items-start">
        <div>
          <span className="text-[9px] font-black px-2 py-0.5 bg-slate-100 rounded text-slate-500 uppercase tracking-tighter mb-1 inline-block">
            {order.role}
          </span>
          <h3 className="text-lg font-black text-[#2c4305] leading-none">{order.displayId}</h3>
          <p className="text-[10px] text-slate-400 font-bold mt-1">{orderDate} • {addr?.name || 'User'}</p>
        </div>
        <button onClick={() => setSelectedOrder(order)} className="p-3 bg-slate-50 text-[#2c4305] rounded-2xl active:scale-90 transition-transform">
          <FiEye size={20} />
        </button>
      </div>

      <div className="flex flex-col gap-2 mt-2">
        <label className="text-[9px] font-black uppercase text-slate-300">Update Logistics Status</label>
        <div className="flex items-center gap-2">
          <select
            value={order.delivery_status || 'pending'}
            onChange={(e) => updateOrderStatus(order, e.target.value)}
            disabled={order.delivery_status === 'Delivered'}
            className={`flex-1 text-xs bg-slate-50 border-none rounded-xl px-4 py-3 font-black uppercase outline-none focus:ring-2 focus:ring-[#2c4305] 
              ${order.delivery_status === 'Delivered' ? 'text-green-600' : 'text-slate-700'}`}
          >
        {STATUS_FLOW.map((status: string) => (
  <option key={status} value={status} disabled={isOptionDisabled(order.delivery_status, status)}>{status}</option>
))}
          </select>
          <div className="px-4 py-3 bg-[#2c4305]/10 text-[#2c4305] rounded-xl font-black text-xs">
            ₹{Number(order.total_amount).toLocaleString()}
          </div>
        </div>
      </div>
    </div>
  );
};
'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase';
import { 
  FiSearch, FiDownload, FiChevronLeft, FiChevronRight, 
  FiFilter, FiPackage, FiHash, FiClock, FiAlertCircle, 
  FiCheckCircle, FiTruck, FiBox, FiXCircle
} from 'react-icons/fi';
import * as XLSX from 'xlsx';

const ITEMS_PER_PAGE = 10;

export default function DealerOrders() {
  const supabase = createClient();

  const [orders, setOrders] = useState<any[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const [dRes, sRes, rRes] = await Promise.all([
        supabase.from('dealer_orders').select('*'),
        supabase.from('subdealer_orders').select('*'),
        supabase.from('retail_orders').select('*'),
      ]);

      const allOrders = [
        ...(dRes.data || []).map(o => ({ ...o, role: 'Dealer', displayId: `D-${o.id}` })),
        ...(sRes.data || []).map(o => ({ ...o, role: 'Sub Dealer', displayId: `SD-${o.id}` })),
        ...(rRes.data || []).map(o => ({ ...o, role: 'Retail', displayId: `RT-${o.id}` })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setOrders(allOrders);
      setFilteredOrders(allOrders);
    } catch (error) {
      console.error('Fetch Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: number, role: string, newStatus: string) => {
    try {
      let tableName = '';
      if (role === 'Dealer') tableName = 'dealer_orders';
      else if (role === 'Sub Dealer') tableName = 'subdealer_orders';
      else tableName = 'retail_orders';

      const { error } = await supabase
        .from(tableName)
        .update({ delivery_status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      setOrders(prev => prev.map(o => 
        (o.id === orderId && o.role === role) ? { ...o, delivery_status: newStatus } : o
      ));
    } catch (error) {
      console.error("Error updating status:", error);
      alert("Failed to update status");
    }
  };

  useEffect(() => {
    const result = orders.filter((o) => {
      const searchLower = search.toLowerCase();
      const matchesSearch = 
        o.displayId.toLowerCase().includes(searchLower) ||
        (o.dealer_id || o.subdealer_id || o.retail_id || '').includes(searchLower);
      const matchesRole = roleFilter === 'All' || o.role === roleFilter;
      return matchesSearch && matchesRole;
    });
    setFilteredOrders(result);
    setCurrentPage(1);
  }, [search, roleFilter, orders]);

  const exportToExcel = () => {
    const data = filteredOrders.map((o) => ({
      'Order Ref': o.displayId,
      'User Type': o.role,
      'Payment': o.payment_status.toUpperCase(),
      'Delivery': o.delivery_status || 'Pending',
      'Total Amount': o.total_amount,
      'Balance Due': o.remaining_amount,
      'Date': new Date(o.created_at).toLocaleDateString()
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Orders');
    XLSX.writeFile(wb, `Prakruthi_Orders_${new Date().toLocaleDateString()}.xlsx`);
  };

  const currentData = filteredOrders.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 lg:p-12 font-sans text-slate-900">
      
      {/* --- HEADER --- */}
      <div className="max-w-7xl mx-auto mb-10 flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <h1 className="text-4xl font-black tracking-tight text-slate-900 mb-2">Order Management</h1>
          <p className="text-slate-500 font-medium">Approve and track deliveries across all partners</p>
        </div>
        <button 
          onClick={exportToExcel}
          className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-emerald-200"
        >
          <FiDownload size={20}/> Export Data
        </button>
      </div>

      {/* --- SUMMARY STATS --- */}
      <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        {[
          { label: 'New Orders', count: orders.filter(o => !o.delivery_status || o.delivery_status === 'pending').length, color: 'text-amber-600', bg: 'bg-amber-50', icon: <FiClock /> },
          { label: 'Confirmed', count: orders.filter(o => o.delivery_status === 'Confirmed').length, color: 'text-indigo-600', bg: 'bg-indigo-50', icon: <FiCheckCircle /> },
          { label: 'In Transit', count: orders.filter(o => o.delivery_status === 'Shipped').length, color: 'text-blue-600', bg: 'bg-blue-50', icon: <FiTruck /> },
          { label: 'Delivered', count: orders.filter(o => o.delivery_status === 'Delivered').length, color: 'text-emerald-600', bg: 'bg-emerald-50', icon: <FiBox /> },
        ].map((stat, i) => (
          <div key={i} className={`${stat.bg} p-6 rounded-[2rem] border border-white shadow-sm flex flex-col justify-between`}>
            <div className={`${stat.color} text-xl mb-4`}>{stat.icon}</div>
            <div>
              <p className={`text-[10px] font-black uppercase tracking-widest ${stat.color} mb-1`}>{stat.label}</p>
              <p className="text-3xl font-black text-slate-900">{stat.count}</p>
            </div>
          </div>
        ))}
      </div>

      {/* --- FILTERS --- */}
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="md:col-span-2 relative">
          <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
          <input 
            type="text"
            placeholder="Search Order Ref or User ID..."
            className="w-full pl-12 pr-4 py-4 bg-white border-none rounded-2xl shadow-sm focus:ring-2 focus:ring-indigo-500 transition-all outline-none text-slate-700"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="relative">
          <FiFilter className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <select 
            className="w-full pl-12 pr-4 py-4 bg-white border-none rounded-2xl shadow-sm appearance-none focus:ring-2 focus:ring-indigo-500 outline-none font-bold text-slate-600"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <option value="All">All Partner Tiers</option>
            <option value="Dealer">Dealers</option>
            <option value="Sub Dealer">Sub Dealers</option>
            <option value="Retail">Retailers</option>
          </select>
        </div>
      </div>

      {/* --- TABLE --- */}
      <div className="max-w-7xl mx-auto bg-white rounded-[2.5rem] shadow-xl shadow-slate-200/50 overflow-hidden border border-slate-100">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100">
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Reference</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Partner</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Items Ordered</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Financials</th>
                <th className="px-8 py-6 text-[10px] font-black uppercase tracking-widest text-slate-400">Approval / Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loading ? (
                <tr><td colSpan={5} className="py-20 text-center font-bold text-slate-400 animate-pulse">Synchronizing Cloud Database...</td></tr>
              ) : currentData.map((order) => (
                <tr key={order.displayId} className="hover:bg-slate-50/80 transition-colors group">
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-3">
                      <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl group-hover:scale-110 transition-transform">
                        <FiHash />
                      </div>
                      <div>
                        <p className="font-black text-slate-900">{order.displayId}</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase">{new Date(order.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </td>

                  <td className="px-8 py-6">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter border ${
                      order.role === 'Dealer' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                      order.role === 'Sub Dealer' ? 'bg-purple-50 text-purple-600 border-purple-100' :
                      'bg-orange-50 text-orange-600 border-orange-100'
                    }`}>
                      {order.role}
                    </span>
                  </td>

                  <td className="px-8 py-6">
                    <div className="flex flex-wrap gap-2 max-w-[350px]">
                      {order.items?.map((item: any, idx: number) => (
                        <div key={idx} className="bg-slate-100 px-3 py-1.5 rounded-lg flex items-center gap-2 border border-slate-200">
                          <FiPackage size={12} className="text-slate-400" />
                          <span className="text-xs font-bold text-slate-700">
                            {item.products?.product_name || item.name || 'Item'} × {item.quantity}
                          </span>
                        </div>
                      ))}
                    </div>
                  </td>

                  <td className="px-8 py-6">
                    <div className="space-y-1">
                      <p className="text-sm font-black text-slate-900">₹{order.total_amount.toLocaleString()}</p>
                      <div className="flex flex-col gap-1">
                        <p className="text-[10px] font-bold text-slate-400 uppercase">Paid: ₹{Number(order.paid_amount || 0).toLocaleString()}</p>
                        {order.remaining_amount > 0 && (
                          <div className="flex items-center gap-1 text-[9px] font-black text-red-500 uppercase bg-red-50 px-2 py-0.5 rounded w-fit">
                            <FiAlertCircle size={10}/> Due: ₹{order.remaining_amount.toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>

                  <td className="px-8 py-6">
                    <div className="flex flex-col gap-3">
                      {/* Workflow Dropdown */}
                      <div className="relative w-fit">
                        <select
                          value={order.delivery_status || 'pending'}
                          onChange={(e) => updateOrderStatus(order.id, order.role, e.target.value)}
                          className={`appearance-none pl-3 pr-8 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border-2 transition-all cursor-pointer outline-none ${
                            order.delivery_status === 'Delivered' ? 'bg-emerald-50 border-emerald-200 text-emerald-600' :
                            order.delivery_status === 'Shipped' ? 'bg-blue-50 border-blue-200 text-blue-600' :
                            order.delivery_status === 'Confirmed' ? 'bg-indigo-50 border-indigo-200 text-indigo-600' :
                            order.delivery_status === 'Cancelled' ? 'bg-red-50 border-red-200 text-red-600' :
                            'bg-slate-50 border-slate-200 text-slate-500'
                          }`}
                        >
                          <option value="pending">Pending</option>
                          <option value="Confirmed">Confirm</option>
                          <option value="Shipped">Ship</option>
                          <option value="Delivered">Deliver</option>
                          <option value="Cancelled">Cancel</option>
                        </select>
                        <FiChevronRight className="absolute right-3 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none opacity-40" size={12} />
                      </div>

                      {/* Payment Status Label */}
                      <div className="flex items-center gap-2 border-t border-slate-100 pt-2">
                        <div className={`flex items-center gap-1 font-black text-[9px] uppercase tracking-widest ${
                          order.payment_status === 'paid' ? 'text-emerald-500' : 
                          order.paid_amount > 0 ? 'text-blue-500' : 'text-amber-500'
                        }`}>
                          {order.payment_status === 'paid' ? <FiCheckCircle size={12}/> : <FiClock size={12}/>}
                          {order.payment_status === 'paid' ? 'Paid' : order.paid_amount > 0 ? 'Partial' : 'Pending'}
                        </div>
                        {order.payment_id === 'CASH_ON_DELIVERY' && (
                          <span className="text-[8px] bg-slate-100 text-slate-500 px-2 py-0.5 rounded font-black">COD</span>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* --- PAGINATION --- */}
      <div className="max-w-7xl mx-auto mt-8 flex items-center justify-between bg-white p-4 rounded-3xl shadow-sm border border-slate-100">
        <button 
          disabled={currentPage === 1}
          onClick={() => setCurrentPage(p => p - 1)}
          className="p-3 rounded-xl hover:bg-slate-50 disabled:opacity-30 transition-all border border-slate-100"
        >
          <FiChevronLeft size={20} />
        </button>
        <div className="text-[11px] font-black text-slate-400 uppercase tracking-[0.2em]">
          Page <span className="text-indigo-600">{currentPage}</span> / {totalPages || 1}
        </div>
        <button 
          disabled={currentPage === totalPages}
          onClick={() => setCurrentPage(p => p + 1)}
          className="p-3 rounded-xl hover:bg-slate-50 disabled:opacity-30 transition-all border border-slate-100"
        >
          <FiChevronRight size={20} />
        </button>
      </div>
    </div>
  );
}
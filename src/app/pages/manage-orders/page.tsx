// app/dealer-orders/page.tsx (for App Router in Next.js 13+)

'use client';

import React, { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase'; // Fixed import
import { 
  FiSearch, FiDownload, FiChevronLeft, FiChevronRight, 
  FiFilter, FiPackage, FiCalendar, FiCreditCard, FiHash 
} from 'react-icons/fi';
import * as XLSX from 'xlsx';

const ITEMS_PER_PAGE = 10;

// Define types for TypeScript
interface OrderItem {
  name?: string;
  product_name?: string;
  quantity_value?: string;
  quantity_unit?: string;
  quantity: number;
}

interface Order {
  id: number;
  role: string;
  userId: string;
  items?: OrderItem[];
  total_amount: number;
  token_amount: number;
  remaining_amount: number;
  payment_status: string;
  created_at: string;
}

export default function DealerOrders() {
  const supabase = createClient(); // Create the supabase client instance

  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const [isMobile, setIsMobile] = useState(false);

  // Handle Resize for Responsive Layout
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    setIsMobile(window.innerWidth < 1024);
    fetchOrders();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const [
        { data: dOrders, error: dErr },
        { data: sOrders, error: sErr },
        { data: rOrders, error: rErr }
      ] = await Promise.all([
        supabase.from('dealer_orders').select('*'),
        supabase.from('subdealer_orders').select('*'),
        supabase.from('retail_orders').select('*'),
      ]);

      if (dErr || sErr || rErr) throw new Error('Fetch error occurred');

      const allOrders: Order[] = [
        ...(dOrders || []).map((o) => ({ ...o, role: 'Dealer', userId: o.dealer_id })),
        ...(sOrders || []).map((o) => ({ ...o, role: 'Sub Dealer', userId: o.subdealer_id })),
        ...(rOrders || []).map((o) => ({ ...o, role: 'Retail', userId: o.retail_id })),
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      setOrders(allOrders);
      setFilteredOrders(allOrders);
    } catch (error) {
      console.error('Detailed Error:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const result = orders.filter((o) => {
      const matchesSearch = String(o.userId).toLowerCase().includes(search.toLowerCase()) ||
        String(o.id).includes(search);
      const matchesRole = roleFilter === 'All' || o.role === roleFilter;
      return matchesSearch && matchesRole;
    });
    setFilteredOrders(result);
    setCurrentPage(1);
  }, [search, roleFilter, orders]);

  const exportToExcel = () => {
    const data = filteredOrders.map((o) => ({
      'Order ID': o.id,
      'User Type': o.role,
      'User ID': o.userId,
      'Products': (o.items || []).map(i => 
        `${i.name || i.product_name} (${i.quantity_value || ''}${i.quantity_unit || ''}) (x${i.quantity})`
      ).join(', '),
      'Total Amount': o.total_amount,
      'Paid Amount': o.token_amount,
      'Balance Amount': o.remaining_amount,
      'Payment Status': o.payment_status,
      'Order Date': new Date(o.created_at).toLocaleDateString(),
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'All Orders');
    XLSX.writeFile(wb, `Orders_Report_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const totalPages = Math.ceil(filteredOrders.length / ITEMS_PER_PAGE);
  const currentData = filteredOrders.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const roleColors: { [key: string]: string } = {
    'Dealer': 'bg-blue-50 text-blue-700 border-blue-200',
    'Sub Dealer': 'bg-purple-50 text-purple-700 border-purple-200',
    'Retail': 'bg-orange-50 text-orange-700 border-orange-200'
  };

  return (
    <div className="bg-white min-h-screen p-4 md:p-10 font-inter">
      {/* Header */}
      <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} justify-between items-start md:items-end gap-4 mb-8`}>
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900">Orders Overview</h1>
          <p className="text-gray-600 text-sm mt-1">Consolidated view of all transaction records</p>
        </div>
        <button
          onClick={exportToExcel}
          className={`px-4 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all flex items-center gap-2 ${isMobile ? 'w-full justify-center' : ''}`}
        >
          <FiDownload /> Export Report
        </button>
      </div>

      {/* Controls */}
      <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} gap-4 mb-6`}>
        <div className="relative flex-1">
          <FiSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            placeholder="Search Order or User ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        
        <div className={`flex gap-3 ${isMobile ? 'w-full' : ''}`}>
          <div className="relative flex-1">
            <FiFilter className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-white border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="All">All Categories</option>
              <option value="Dealer">Dealers</option>
              <option value="Sub Dealer">Sub Dealers</option>
              <option value="Retail">Retail Outlets</option>
            </select>
          </div>
          {(search !== '' || roleFilter !== 'All') && (
            <button
              onClick={() => { setSearch(''); setRoleFilter('All'); }}
              className="px-4 py-3 bg-gray-100 text-gray-600 rounded-xl font-semibold hover:bg-gray-200 transition-all"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Main Content */}
      {loading ? (
        <div className="text-center py-24 text-gray-500">Fetching transaction data...</div>
      ) : currentData.length > 0 ? (
        isMobile ? (
          /* MOBILE CARD LIST */
          <div className="space-y-4">
            {currentData.map((o) => (
              <div key={`${o.role}-${o.id}`} className="bg-white border border-gray-200 rounded-2xl p-4 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <span className="flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm font-bold">
                    <FiHash size={14} /> {o.id}
                  </span>
                  <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${roleColors[o.role]}`}>
                    {o.role}
                  </span>
                </div>
                
                <div className="space-y-2 py-4 border-y border-gray-100 mb-4">
                  {o.items?.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center">
                      <span className="text-sm font-semibold text-gray-900">{item.name || item.product_name}</span>
                      <span className="text-sm text-gray-500">
                        {item.quantity_value}{item.quantity_unit} <span className="text-indigo-600 font-bold">x{item.quantity}</span>
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center">
                  <div className="flex flex-col">
                    <span className="text-xs font-bold text-gray-400 uppercase">Payment</span>
                    <span className="flex items-center gap-2 text-sm font-semibold capitalize">
                      <div className={`w-2 h-2 rounded-full ${o.payment_status === 'paid' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                      {o.payment_status}
                    </span>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className="text-xs font-bold text-gray-400 uppercase">Due Amount</span>
                    <span className="text-red-600 font-bold">₹{Number(o.remaining_amount).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* DESKTOP TABLE VIEW */
          <div className="bg-white border border-gray-200 rounded-2xl shadow-sm overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Reference</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Partner Type</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Product Details</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Grand Total</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Balance Due</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Fulfillment</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {currentData.map((o) => (
                  <tr key={`${o.role}-${o.id}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-2 px-3 py-1 bg-gray-100 text-gray-700 rounded-lg text-sm font-bold">
                        <FiHash size={14} /> {o.id}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 rounded-lg text-xs font-bold border ${roleColors[o.role]}`}>
                        {o.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-2">
                        {o.items?.map((item, idx) => (
                          <div key={idx} className="flex items-center gap-3 bg-gray-50 px-3 py-2 rounded-lg">
                            <FiPackage size={14} className="text-indigo-600" />
                            <div className="flex-1">
                              <div className="text-sm font-semibold text-gray-900">{item.name || item.product_name}</div>
                              <div className="text-xs text-gray-500">{item.quantity_value} {item.quantity_unit}</div>
                            </div>
                            <span className="text-indigo-600 font-bold text-sm">x{item.quantity}</span>
                          </div>
                        ))}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-gray-900">₹{Number(o.total_amount).toLocaleString()}</td>
                    <td className="px-6 py-4 font-bold text-red-600">₹{Number(o.remaining_amount).toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className="flex items-center gap-2 font-semibold capitalize">
                        <div className={`w-2 h-2 rounded-full ${o.payment_status === 'paid' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                        {o.payment_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-gray-500">
                      {new Date(o.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <div className="text-center py-24 text-gray-500">No records found.</div>
      )}

      {/* Pagination */}
      <div className={`flex ${isMobile ? 'flex-col-reverse' : 'flex-row'} justify-between items-center gap-4 mt-8`}>
        <span className="text-sm text-gray-600">
          Showing <span className="font-bold">{currentData.length}</span> of {filteredOrders.length}
        </span>
        <div className="flex items-center gap-2">
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage(p => p - 1)}
            className={`p-3 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-all ${
              currentPage === 1 ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <FiChevronLeft />
          </button>
          <span className="px-4 py-2 font-semibold">{currentPage} / {totalPages || 1}</span>
          <button
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage(p => p + 1)}
            className={`p-3 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 transition-all ${
              currentPage === totalPages ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <FiChevronRight />
          </button>
        </div>
      </div>
    </div>
  );
}
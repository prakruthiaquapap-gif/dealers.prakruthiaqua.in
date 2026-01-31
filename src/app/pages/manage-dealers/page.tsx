// app/manage-dealers/page.tsx (for App Router in Next.js 13+)

'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase'; // Fixed import
import {
  FiSearch, FiDownload, FiUser, FiX, FiCheck, FiSlash,
  FiPhone, FiMail, FiMapPin, FiArrowUpRight, FiArrowDownLeft,
  FiPrinter, FiFileText, FiActivity
} from 'react-icons/fi';
import toast, { Toaster } from 'react-hot-toast';

const PAGE_SIZE = 10;

// Define types for TypeScript
interface Dealer {
  id: number;
  user_id: string;
  first_name: string;
  last_name: string;
  company_name: string;
  role: string;
  approval_status: string;
  phone: string;
  email: string;
  address: string;
  created_at: string;
  approved_at?: string;
}

interface Order {
  id: number;
  total_amount: number;
  order_id?: string;
  created_at: string;
}

interface PaymentLog {
  id: number;
  amount: number;
  transaction_id?: string;
  created_at: string;
}

export default function ManageDealers() {
  const supabase = createClient(); // Create the supabase client instance

  const [rows, setRows] = useState<Dealer[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [role, setRole] = useState('');
  const [search, setSearch] = useState('');
  const [isMobile, setIsMobile] = useState(false);

  // Modal State
  const [selectedUser, setSelectedUser] = useState<Dealer | null>(null);
  const [userOrders, setUserOrders] = useState<Order[]>([]);
  const [paymentLogs, setPaymentLogs] = useState<PaymentLog[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('ledger');
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    setIsMobile(window.innerWidth < 768);
    fetchData();
    return () => window.removeEventListener('resize', handleResize);
  }, [page, role, search]);

  async function fetchData() {
    setLoading(true);
    let query = supabase
      .from('dealers')
      .select('*', { count: 'exact' })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
      .order('created_at', { ascending: false });

    if (role) query = query.eq('role', role);
    if (search) {
      query = query.or(`first_name.ilike.%${search}%,company_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    const { data, count, error } = await query;
    if (!error) {
      setRows(data || []);
      setTotalCount(count || 0);
    } else {
      toast.error('Failed to load data');
    }
    setLoading(false);
  }

  async function handleStatusUpdate(userId: number, newStatus: string) {
    const originalRows = [...rows];
    setRows(rows.map(r => r.id === userId ? { ...r, approval_status: newStatus } : r));
    const { error } = await supabase
      .from('dealers')
      .update({
        approval_status: newStatus,
        approved_at: newStatus === 'approved' ? new Date().toISOString() : null
      })
      .eq('id', userId);

    if (error) {
      toast.error(error.message);
      setRows(originalRows);
    } else {
      toast.success('Partner status updated');
    }
  }

  async function handleViewDetails(user: Dealer) {
    setSelectedUser(user);
    setIsModalOpen(true);
    setModalLoading(true);

    const roleKey = user.role?.toLowerCase().replace(/_|-/g, '').trim();
    let tableName = roleKey === 'dealer' ? 'dealer_orders' : roleKey === 'subdealer' ? 'subdealer_orders' : 'retail_orders';
    let idColumnName = roleKey === 'dealer' ? 'dealer_id' : roleKey === 'subdealer' ? 'subdealer_id' : 'retail_id';

    try {
      const [ordersRes, paymentsRes] = await Promise.all([
        supabase.from(tableName).select('*').eq(idColumnName, user.user_id).order('created_at', { ascending: false }),
        supabase.from('payment_logs').select('*').eq('user_id', user.user_id).order('created_at', { ascending: false })
      ]);

      setUserOrders(ordersRes.data || []);
      setPaymentLogs(paymentsRes.data || []);
    } catch (error) {
      toast.error('Failed to load details');
    }
    setModalLoading(false);
  }

  // Calculate totals
  const totalInvoiced = userOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
  const totalPaid = paymentLogs.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const outstandingBalance = totalInvoiced - totalPaid;

  const combinedLedger = [
    ...userOrders.map(o => ({
      id: o.id,
      type: 'DEBIT',
      label: 'Order Purchase',
      ref: o.order_id || o.id,
      displayAmount: o.total_amount, // Standardized key
      created_at: o.created_at
    })),
    ...paymentLogs.map(p => ({
      id: p.id,
      type: 'CREDIT',
      label: 'Payment Received',
      ref: p.transaction_id || 'Cash/UPI',
      displayAmount: p.amount, // Standardized key
      created_at: p.created_at
    }))
  ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto font-inter bg-gray-50 min-h-screen">
      <Toaster position="top-right" />

      <header className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900">Partner Network</h1>
          <p className="text-gray-600 text-sm">Financial Ledgers & Approvals</p>
        </div>
        <button className="px-4 py-2 bg-white text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-all">
          <FiDownload />
        </button>
      </header>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder="Search partners..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
      </div>

      {isMobile ? (
        <div className="space-y-4">
          {loading ? (
            <div className="text-center py-24 text-gray-500">Loading...</div>
          ) : (
            rows.map(r => (
              <div key={r.id} className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <div className="font-bold text-gray-900">{r.first_name} {r.last_name}</div>
                    <div className="text-sm text-gray-500">{r.company_name}</div>
                  </div>
                  <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-bold uppercase">
                    {r.role}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                  <button
                    onClick={() => handleViewDetails(r)}
                    className="px-4 py-2 bg-purple-50 text-purple-600 rounded-lg font-semibold text-sm hover:bg-purple-100 transition-all flex items-center gap-2"
                  >
                    <FiFileText /> View Ledger
                  </button>
                  <div className="flex bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => handleStatusUpdate(r.id, 'approved')}
                      className={`px-3 py-2 rounded-md font-semibold text-sm transition-all flex items-center gap-1 ${r.approval_status === 'approved' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-600'
                        }`}
                    >
                      <FiCheck />
                    </button>
                    <button
                      onClick={() => handleStatusUpdate(r.id, 'rejected')}
                      className={`px-3 py-2 rounded-md font-semibold text-sm transition-all flex items-center gap-1 ${r.approval_status === 'rejected' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-600'
                        }`}
                    >
                      <FiSlash />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Company</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-24 text-center text-gray-500">Loading...</td>
                </tr>
              ) : (
                rows.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 font-bold text-gray-900">{r.first_name} {r.last_name}</td>
                    <td className="px-6 py-4 text-gray-700">{r.company_name}</td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-xs font-bold uppercase">
                        {r.role}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex bg-gray-100 rounded-lg p-1 w-fit">
                        <button
                          onClick={() => handleStatusUpdate(r.id, 'approved')}
                          className={`px-3 py-2 rounded-md font-semibold text-sm transition-all flex items-center gap-1 ${r.approval_status === 'approved' ? 'bg-white text-green-600 shadow-sm' : 'text-gray-600'
                            }`}
                        >
                          <FiCheck />
                        </button>
                        <button
                          onClick={() => handleStatusUpdate(r.id, 'rejected')}
                          className={`px-3 py-2 rounded-md font-semibold text-sm transition-all flex items-center gap-1 ${r.approval_status === 'rejected' ? 'bg-white text-red-600 shadow-sm' : 'text-gray-600'
                            }`}
                        >
                          <FiSlash />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <button
                        onClick={() => handleViewDetails(r)}
                        className="px-4 py-2 bg-purple-50 text-purple-600 rounded-lg font-semibold text-sm hover:bg-purple-100 transition-all flex items-center gap-2"
                      >
                        <FiFileText /> View Ledger
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Pagination */}
      {totalCount > PAGE_SIZE && (
        <div className="flex justify-center items-center gap-4 mt-6">
          <button
            disabled={page === 0}
            onClick={() => setPage(page - 1)}
            className="px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Prev
          </button>
          <span className="text-sm text-gray-600">
            Page {page + 1} of {Math.ceil(totalCount / PAGE_SIZE)}
          </span>
          <button
            disabled={(page + 1) * PAGE_SIZE >= totalCount}
            onClick={() => setPage(page + 1)}
            className="px-4 py-2 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}

      {/* Modal */}
      {isModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex justify-center items-center p-4 z-50">
          <div className={`bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col ${isMobile ? 'w-full h-[92vh] rounded-t-3xl' : 'w-full max-w-2xl max-h-[85vh]'
            }`}>
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-indigo-600 text-white rounded-xl flex items-center justify-center text-xl">
                  <FiActivity />
                </div>
                <div>
                  <h3 className="text-xl font-black text-gray-900 m-0">{selectedUser.company_name}</h3>
                  <span className="text-sm text-gray-500">Partner ID: {selectedUser.user_id}</span>
                </div>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-10 h-10 bg-white border border-gray-300 rounded-full flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-all"
              >
                <FiX size={20} />
              </button>
            </div>

            {/* Summary Bar */}
            <div className="flex bg-gray-50 border-b border-gray-200">
              <div className="flex-1 p-4 text-center">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">Total Sales</div>
                <div className="text-xl font-black text-gray-900">₹{totalInvoiced.toLocaleString()}</div>
              </div>
              <div className="flex-1 p-4 text-center border-l border-gray-200">
                <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">Received</div>
                <div className="text-xl font-black text-green-600">₹{totalPaid.toLocaleString()}</div>
              </div>
              <div className="flex-1 p-4 text-center border-l border-gray-200 bg-red-50">
                <div className="text-xs font-bold text-red-600 uppercase tracking-wide">Balance Due</div>
                <div className="text-xl font-black text-red-600">₹{outstandingBalance.toLocaleString()}</div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-6 px-6 bg-white border-b border-gray-200">
              <button
                onClick={() => setActiveTab('ledger')}
                className={`py-4 font-semibold text-sm transition-all ${activeTab === 'ledger' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'
                  }`}
              >
                Transaction History
              </button>
              <button
                onClick={() => setActiveTab('profile')}
                className={`py-4 font-semibold text-sm transition-all ${activeTab === 'profile' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500'
                  }`}
              >
                Contact Details
              </button>
            </div>

            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-6">
              {modalLoading ? (
                <div className="text-center py-24 text-gray-500">Loading details...</div>
              ) : activeTab === 'ledger' ? (
                <div className="space-y-4">
                  {combinedLedger.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl ${item.type === 'DEBIT' ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                        }`}>
                        {item.type === 'DEBIT' ? <FiArrowUpRight /> : <FiArrowDownLeft />}
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-semibold text-gray-900">{item.label}</span>
                          <span className={`font-bold ${item.type === 'DEBIT' ? 'text-gray-900' : 'text-green-600'}`}>
                            {item.type === 'DEBIT' ? '-' : '+'} ₹{Number(item.displayAmount).toLocaleString()}
                          </span></div>
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                          {new Date(item.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                          <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                          Ref: {item.ref}
                        </div>
                      </div>
                    </div>
                  ))}
                  {combinedLedger.length === 0 && (
                    <div className="text-center py-16 text-gray-500">No transactions recorded.</div>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <FiUser className="text-gray-600" size={20} />
                    <span className="text-gray-700">{selectedUser.first_name} {selectedUser.last_name}</span>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <FiPhone className="text-gray-600" size={20} />
                    <span className="text-gray-700">{selectedUser.phone}</span>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <FiMail className="text-gray-600" size={20} />
                    <span className="text-gray-700">{selectedUser.email}</span>
                  </div>
                  <div className="flex items-center gap-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <FiMapPin className="text-gray-600" size={20} />
                    <span className="text-gray-700">{selectedUser.address}</span>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-200 bg-white">
              <button
                className="w-full py-3 bg-gray-900 text-white rounded-xl font-bold hover:bg-gray-800 transition-all flex items-center justify-center gap-2"
                onClick={() => window.print()}
              >
                <FiPrinter /> Print Statement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
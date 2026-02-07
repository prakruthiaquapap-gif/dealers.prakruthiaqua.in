'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/utils/supabase';
import {
  FiSearch, FiUser, FiX, FiCheck, FiSlash,
  FiPhone, FiMail, FiMapPin, FiArrowUpRight, FiArrowDownLeft,
  FiPrinter, FiBriefcase, FiCalendar, FiHash, FiFilter, FiUsers, FiClock, FiAlertCircle
} from 'react-icons/fi';
import toast, { Toaster } from 'react-hot-toast';

const PAGE_SIZE = 12;

export default function ManageDealers() {
  const supabase = createClient();
  const brandColor = "#2c4305";

  const [rows, setRows] = useState<any[]>([]);
  const [allStats, setAllStats] = useState({ total: 0, dealer: 0, subdealer: 0, retail: 0, pending: 0 });
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');

  // Filters
  const [activeRoleFilter, setActiveRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all');

  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [paymentLogs, setPaymentLogs] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'ledger' | 'profile'>('ledger');
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    fetchStats();
    fetchData();
  }, [page, search, activeRoleFilter, statusFilter, timeFilter]);

  // 1. Updated Stats Logic to handle Case Sensitivity
  async function fetchStats() {
    const { data } = await supabase.from('dealers').select('role, approval_status');
    if (data) {
      setAllStats({
        total: data.length,
        dealer: data.filter(d => {
          const r = d.role?.toLowerCase() || '';
          return r === 'dealer' || (r.includes('dealer') && !r.includes('sub'));
        }).length,
        subdealer: data.filter(d => d.role?.toLowerCase().includes('sub')).length,
        retail: data.filter(d => d.role?.toLowerCase().includes('retail')).length,
        pending: data.filter(d => d.approval_status === 'pending').length
      });
    }
  }

  // 2. Updated Fetch Logic with Case-Insensitive 'ilike'
  async function fetchData() {
    setLoading(true);
    let query = supabase
      .from('dealers')
      .select('*', { count: 'exact' })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
      .order('created_at', { ascending: false });

    if (search.trim() !== '') {
      query = query.or(`company_name.ilike.%${search}%,first_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    if (activeRoleFilter !== 'all') {
      if (activeRoleFilter === 'subdealer') {
        query = query.ilike('role', '%sub%dealer%');
      } else if (activeRoleFilter === 'retail') {
        query = query.ilike('role', '%retail%');
      } else if (activeRoleFilter === 'dealer') {
        // This catches "Dealer", "dealer", "DEALER"
        query = query.ilike('role', 'dealer');
      }
    }

    if (statusFilter !== 'all') {
      query = query.eq('approval_status', statusFilter);
    }

    if (timeFilter === 'new') {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      query = query.gte('created_at', thirtyDaysAgo.toISOString());
    }

    const { data, count, error } = await query;
    if (!error) {
      setRows(data || []);
      setTotalCount(count || 0);
    }
    setLoading(false);
  }

  async function handleStatusUpdate(id: string, newStatus: string) {
    const { error } = await supabase.from('dealers').update({ approval_status: newStatus }).eq('id', id);
    if (error) toast.error(error.message);
    else {
      setRows(rows.map(r => r.id === id ? { ...r, approval_status: newStatus } : r));
      fetchStats();
      toast.success(`Status updated to ${newStatus}`);
    }
  }

  async function handleViewDetails(user: any) {
    setSelectedUser(user);
    setIsModalOpen(true);
    setModalLoading(true);
    let tableName = 'retail_orders';
    let foreignKey = 'retail_id';
    const role = user.role?.toLowerCase() || '';
    if (role.includes('sub')) { tableName = 'subdealer_orders'; foreignKey = 'subdealer_id'; }
    else if (role.includes('dealer')) { tableName = 'dealer_orders'; foreignKey = 'dealer_id'; }

    try {
      const [ordersRes, paymentsRes] = await Promise.all([
        supabase.from(tableName).select('*').eq(foreignKey, user.user_id).order('created_at', { ascending: false }),
        supabase.from('payment_logs').select('*').eq('user_id', user.user_id).order('created_at', { ascending: false })
      ]);
      setUserOrders(ordersRes.data || []);
      setPaymentLogs(paymentsRes.data || []);
    } catch (err) { toast.error('Failed to load ledger'); }
    setModalLoading(false);
  }

  const totals = useMemo(() => {
    const totalInvoiced = userOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
    const totalPaid = userOrders.reduce((sum, o) => sum + Number(o.paid_amount || 0), 0) +
      paymentLogs.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    return { totalInvoiced, totalPaid, balance: totalInvoiced - totalPaid };
  }, [userOrders, paymentLogs]);

  return (
    <div className="min-h-screen bg-[#F4F7F2] font-sans pb-20">
      <Toaster position="top-center" />

      {/* 1. TOP DASHBOARD STATS */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <div className="flex justify-between items-center mb-8">
            <div>
              <h1 className="text-3xl font-black tracking-tighter" style={{ color: brandColor }}>ALl Dealer Profile</h1>
            </div>
            {allStats.pending > 0 && (
              <div className="bg-amber-50 border border-amber-100 px-4 py-2 rounded-2xl flex items-center gap-3 animate-pulse">
                <FiAlertCircle className="text-amber-600" />
                <span className="text-amber-800 text-xs font-black uppercase">{allStats.pending} NEW APPROVALS</span>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <MiniStat label="Total Users" val={allStats.total} icon={<FiUsers />} />
            <MiniStat label="Dealers" val={allStats.dealer} icon={<FiBriefcase />} />
            <MiniStat label="Sub-Dealers" val={allStats.subdealer} icon={<FiBriefcase />} />
            <MiniStat label="Retailers" val={allStats.retail} icon={<FiBriefcase />} />
            <MiniStat label="Pending" val={allStats.pending} icon={<FiClock />} color="text-amber-600" />
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8">

        {/* 2. REFINED SEARCH & FILTER BAR (Side-by-side Layout) */}
        <div className="bg-white p-2 rounded-[2rem] shadow-sm border border-gray-100 mb-8 flex flex-col lg:flex-row items-center gap-2">

          {/* Search Input */}
          <div className="flex-1 w-full relative group">
            <FiSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-[#2c4305] transition-colors" />
            <input
              className="w-full pl-14 pr-6 py-4 bg-gray-50 text-gray-900 placeholder:text-gray-400 rounded-2xl outline-none font-bold text-sm border-2 border-transparent focus:border-[#2c4305]/10 focus:bg-white transition-all"
              placeholder="Search by company, owner, or email..."
              value={search}
              onChange={e => {setSearch(e.target.value); setPage(0);}}
            />
          </div>

          {/* Horizontal Filters */}
          <div className="flex flex-row items-center gap-2 w-full lg:w-auto px-2 lg:px-0 overflow-x-auto no-scrollbar">
            <div className="flex items-center bg-gray-50 rounded-2xl px-4 border border-gray-100 shrink-0">
              <FiFilter className="text-gray-400 mr-2" />
              <select
                value={activeRoleFilter}
                onChange={(e) => {setActiveRoleFilter(e.target.value); setPage(0);}}
                className="bg-transparent py-4 text-[10px] font-black uppercase tracking-widest text-gray-700 outline-none cursor-pointer appearance-none min-w-[100px]"
              >
                <option value="all">Roles</option>
                <option value="dealer">Dealers</option>
                <option value="subdealer">Sub-Dealers</option>
                <option value="retail">Retailers</option>
              </select>
            </div>

            <div className="flex items-center bg-gray-50 rounded-2xl px-4 border border-gray-100 shrink-0">
              <FiCheck className="text-gray-400 mr-2" />
              <select
                value={statusFilter}
                onChange={(e) => {setStatusFilter(e.target.value); setPage(0);}}
                className="bg-transparent py-4 text-[10px] font-black uppercase tracking-widest text-gray-700 outline-none cursor-pointer appearance-none min-w-[100px]"
              >
                <option value="all">Status</option>
                <option value="pending">Pending</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>

            <div className="flex items-center bg-gray-50 rounded-2xl px-4 border border-gray-100 shrink-0">
              <FiCalendar className="text-gray-400 mr-2" />
              <select
                value={timeFilter}
                onChange={(e) => {setTimeFilter(e.target.value); setPage(0);}}
                className="bg-transparent py-4 text-[10px] font-black uppercase tracking-widest text-gray-700 outline-none cursor-pointer appearance-none min-w-[100px]"
              >
                <option value="all">Date</option>
                <option value="new">New Joiners</option>
              </select>
            </div>
          </div>
        </div>

        {/* 3. MAIN TABLE */}
       {/* 3. RESPONSIVE TABLE & MOBILE CARDS */}
<div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
  
  {/* DESKTOP TABLE (Hidden on Mobile) */}
  <table className="w-full text-left hidden md:table">
    <thead className="bg-gray-50 text-gray-400 text-[10px] uppercase font-black tracking-widest">
      <tr>
        <th className="px-10 py-6">Partner Identity</th>
        <th className="px-10 py-6">Role</th>
        <th className="px-10 py-6 text-center">Quick Approval</th>
        <th className="px-10 py-6 text-right">Ledger</th>
      </tr>
    </thead>
    <tbody className="divide-y divide-gray-50">
      {loading ? (
        <tr><td colSpan={4} className="py-20 text-center text-gray-300 animate-pulse font-black uppercase tracking-tighter">Synchronizing Network Data...</td></tr>
      ) : rows.map((r) => (
        <DesktopRow key={r.id} r={r} brandColor={brandColor} handleStatusUpdate={handleStatusUpdate} handleViewDetails={handleViewDetails} />
      ))}
    </tbody>
  </table>

  {/* MOBILE CARD VIEW (Hidden on Desktop) */}
  <div className="md:hidden divide-y divide-gray-100">
    {loading ? (
      <div className="py-20 text-center text-gray-300 animate-pulse font-black uppercase tracking-tighter">Synchronizing...</div>
    ) : rows.map((r) => (
      <MobileCard key={r.id} r={r} brandColor={brandColor} handleStatusUpdate={handleStatusUpdate} handleViewDetails={handleViewDetails} />
    ))}
  </div>

  {!loading && rows.length === 0 && (
    <div className="py-20 text-center text-gray-400 font-bold">No partners found for this criteria.</div>
  )}
</div>
      </main>

      {/* MODAL / LEDGER OVERLAY */}
      {isModalOpen && selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[3rem] shadow-2xl flex flex-col overflow-hidden">
            <div className="p-8 border-b border-gray-100 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div style={{ backgroundColor: brandColor }} className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-xl">
                  {selectedUser.company_name?.[0]}
                </div>
                <div>
                  <h2 className="text-xl font-black text-gray-900 tracking-tighter">{selectedUser.company_name}</h2>
                  <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{selectedUser.role}</p>
                </div>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="p-3 bg-gray-50 rounded-2xl hover:bg-red-50 hover:text-red-500 transition-all">
                <FiX size={20} />
              </button>
            </div>

            <div className="grid grid-cols-3 bg-gray-950 text-white">
              <SummaryItem label="Invoiced" val={totals.totalInvoiced} />
              <SummaryItem label="Paid" val={totals.totalPaid} color="text-green-400" />
              <SummaryItem label="Balance" val={totals.balance} color="text-red-400" />
            </div>

            <div className="flex-1 overflow-y-auto p-8 bg-gray-50/50">
              <div className="flex gap-4 mb-6">
                {['ledger', 'profile'].map((t) => (
                  <button key={t} onClick={() => setActiveTab(t as any)}
                    className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === t ? 'bg-gray-900 text-white' : 'bg-white text-gray-400 border border-gray-200'}`}>
                    {t}
                  </button>
                ))}
              </div>

              {activeTab === 'ledger' ? (
                <div className="space-y-3">
                  {[...userOrders, ...paymentLogs]
                    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
                    .map((item, i) => (
                      <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.total_amount ? 'bg-gray-100' : 'bg-green-100 text-green-700'}`}>
                            {item.total_amount ? <FiArrowUpRight /> : <FiArrowDownLeft />}
                          </div>
                          <div>
                            <p className="font-black text-sm text-gray-900">{item.total_amount ? `Invoice #${item.id.toString().slice(-4)}` : 'Bank Transfer'}</p>
                            <p className="text-[10px] font-bold text-gray-400 uppercase">{new Date(item.created_at).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <p className={`font-black ${item.total_amount ? 'text-gray-900' : 'text-green-600'}`}>
                          {item.total_amount ? '-' : '+'} ₹{Number(item.total_amount || item.amount).toLocaleString()}
                        </p>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <ProfileCard icon={<FiUser />} label="Owner" val={`${selectedUser.first_name} ${selectedUser.last_name}`} />
                  <ProfileCard icon={<FiPhone />} label="Phone" val={selectedUser.phone} />
                  <ProfileCard icon={<FiHash />} label="GST" val={selectedUser.gst_number || 'N/A'} />
                  <ProfileCard icon={<FiMapPin />} label="Address" val={selectedUser.store_address || selectedUser.address} />
                </div>
              )}
            </div>

            <div className="p-8 bg-white border-t border-gray-100">
              <button onClick={() => window.print()} style={{ backgroundColor: brandColor }}
                className="w-full py-4 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-2 shadow-xl shadow-gray-200">
                <FiPrinter /> Print Full Statement
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// UI HELPER COMPONENTS
const MiniStat = ({ label, val, icon, color = "text-gray-900" }: any) => (
  <div className="bg-gray-50 p-6 rounded-3xl border border-gray-100">
    <div className="flex items-center gap-3 mb-2 text-gray-400">
      <span className="text-lg">{icon}</span>
      <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
    </div>
    <div className={`text-2xl font-black ${color}`}>{val}</div>
  </div>
);

const SummaryItem = ({ label, val, color = "text-white" }: any) => (
  <div className="p-6 text-center border-r border-white/5 last:border-0">
    <p className="text-[9px] font-black text-gray-500 uppercase tracking-widest mb-1">{label}</p>
    <p className={`text-xl font-black ${color}`}>₹{Number(val).toLocaleString()}</p>
  </div>
);

const ProfileCard = ({ icon, label, val }: any) => (
  <div className="bg-white p-6 rounded-3xl border border-gray-100 flex items-start gap-4 hover:border-gray-300 transition-all">
    <div className="text-gray-300 mt-1">{icon}</div>
    <div>
      <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-sm font-black text-gray-900 leading-tight">{val}</p>
    </div>
  </div>
);

// 1. Desktop Row Component (Extracted for cleanliness)
const DesktopRow = ({ r, brandColor, handleStatusUpdate, handleViewDetails }: any) => {
  const isNew = new Date(r.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  return (
    <tr className="hover:bg-gray-50 transition-colors">
      <td className="px-10 py-6">
        <div className="font-black text-gray-900 text-base flex items-center gap-2">
          {r.company_name}
          {isNew && <span className="bg-blue-500 text-white text-[8px] px-1.5 py-0.5 rounded-full">NEW</span>}
        </div>
        <div className="text-[11px] text-gray-400 font-bold">{r.first_name} {r.last_name} • {r.email}</div>
      </td>
      <td className="px-10 py-6">
        <span className="px-3 py-1 bg-gray-100 text-gray-600 rounded-lg text-[10px] font-black uppercase">
          {r.role?.replace('_', ' ')}
        </span>
      </td>
      <td className="px-10 py-6">
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => handleStatusUpdate(r.id, 'approved')}
            className={`p-2.5 rounded-xl transition-all ${r.approval_status === 'approved' ? 'bg-green-600 text-white shadow-lg' : 'bg-gray-50 text-gray-300 hover:text-green-600'}`}>
            <FiCheck size={18} />
          </button>
          <button onClick={() => handleStatusUpdate(r.id, 'rejected')}
            className={`p-2.5 rounded-xl transition-all ${r.approval_status === 'rejected' ? 'bg-red-600 text-white shadow-lg' : 'bg-gray-50 text-gray-300 hover:text-red-600'}`}>
            <FiSlash size={18} />
          </button>
        </div>
      </td>
      <td className="px-10 py-6 text-right">
        <button onClick={() => handleViewDetails(r)}
          style={{ color: brandColor, borderColor: `${brandColor}30` }}
          className="px-6 py-2.5 rounded-2xl border font-black text-[10px] uppercase tracking-widest hover:bg-white transition-all">
          View Account
        </button>
      </td>
    </tr>
  );
};

// 2. Mobile Card Component (The magic for phones)
const MobileCard = ({ r, brandColor, handleStatusUpdate, handleViewDetails }: any) => {
  const isNew = new Date(r.created_at) > new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
  
  return (
    <div className="p-5 flex flex-col gap-4 bg-white active:bg-gray-50 transition-colors">
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="font-black text-gray-900 text-lg leading-tight mb-1 flex items-center gap-2">
            {r.company_name}
            {isNew && <div className="w-2 h-2 bg-blue-500 rounded-full animate-ping" />}
          </div>
          <p className="text-xs text-gray-400 font-bold mb-2">{r.first_name} {r.last_name}</p>
          <span className="px-2 py-1 bg-gray-100 text-gray-500 rounded-md text-[9px] font-black uppercase tracking-wider">
            {r.role?.replace('_', ' ')}
          </span>
        </div>
        
        {/* Quick Action Status */}
        <div className="flex gap-2">
           <button onClick={() => handleStatusUpdate(r.id, 'approved')}
            className={`p-3 rounded-xl transition-all ${r.approval_status === 'approved' ? 'bg-green-600 text-white shadow-md' : 'bg-gray-100 text-gray-400'}`}>
            <FiCheck size={16} />
          </button>
          <button onClick={() => handleStatusUpdate(r.id, 'rejected')}
            className={`p-3 rounded-xl transition-all ${r.approval_status === 'rejected' ? 'bg-red-600 text-white shadow-md' : 'bg-gray-100 text-gray-400'}`}>
            <FiSlash size={16} />
          </button>
        </div>
      </div>

      <div className="flex items-center justify-between mt-2 pt-4 border-t border-gray-50">
        <div className="flex flex-col">
            <span className="text-[9px] font-black text-gray-300 uppercase">Approval Status</span>
            <span className={`text-[10px] font-black uppercase ${r.approval_status === 'approved' ? 'text-green-600' : r.approval_status === 'pending' ? 'text-amber-500' : 'text-red-500'}`}>
                {r.approval_status}
            </span>
        </div>
        <button 
          onClick={() => handleViewDetails(r)}
          style={{ backgroundColor: brandColor }}
          className="px-5 py-3 rounded-xl text-white font-black text-[10px] uppercase tracking-widest shadow-lg shadow-gray-200"
        >
          Manage Account
        </button>
      </div>
    </div>
  );
};
'use client';

import React, { useEffect, useState, useMemo } from 'react';
import { createClient } from '@/utils/supabase';
import {
  FiSearch, FiUser, FiX, FiCheck, FiSlash,
  FiPhone, FiMail, FiMapPin, FiArrowUpRight, FiArrowDownLeft,
  FiPrinter, FiBriefcase, FiCalendar, FiHash, FiFilter
} from 'react-icons/fi';
import toast, { Toaster } from 'react-hot-toast';

const PAGE_SIZE = 12;

export default function ManageDealers() {
  const supabase = createClient();
  const brandColor = "#2c4305"; 

  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [search, setSearch] = useState('');
  const [activeRoleFilter, setActiveRoleFilter] = useState('all'); 
  
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [userOrders, setUserOrders] = useState<any[]>([]);
  const [paymentLogs, setPaymentLogs] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'ledger' | 'profile'>('ledger');
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    fetchData();
  }, [page, search, activeRoleFilter]);

  async function fetchData() {
    setLoading(true);
    let query = supabase
      .from('dealers')
      .select('*', { count: 'exact' })
      .range(page * PAGE_SIZE, (page + 1) * PAGE_SIZE - 1)
      .order('created_at', { ascending: false });

    // Apply Search
    if (search) {
      query = query.or(`company_name.ilike.%${search}%,first_name.ilike.%${search}%,email.ilike.%${search}%`);
    }

    // FIXED ROLE FILTER LOGIC
    if (activeRoleFilter !== 'all') {
      // This maps your button ID to the actual Database Role names
      if (activeRoleFilter === 'subdealer') {
        query = query.ilike('role', '%sub%dealer%'); // Matches 'sub_dealer' or 'Sub Dealer'
      } else if (activeRoleFilter === 'retail') {
        query = query.ilike('role', '%retail%'); // Matches 'retail_outlet' or 'Retailer'
      } else {
        query = query.eq('role', activeRoleFilter);
      }
    }

    const { data, count, error } = await query;
    if (!error) {
      setRows(data || []);
      setTotalCount(count || 0);
    }
    setLoading(false);
  }

  async function handleStatusUpdate(id: string, newStatus: string) {
    const { error } = await supabase
      .from('dealers')
      .update({ approval_status: newStatus })
      .eq('id', id);

    if (error) toast.error(error.message);
    else {
      setRows(rows.map(r => r.id === id ? { ...r, approval_status: newStatus } : r));
      toast.success(`Partner ${newStatus}`);
    }
  }

  async function handleViewDetails(user: any) {
    setSelectedUser(user);
    setIsModalOpen(true);
    setModalLoading(true);

    const role = user.role?.toLowerCase();
    
    // Mapping table names and keys correctly
    let tableName = 'retail_orders';
    let foreignKey = 'retail_id';

    if (role.includes('sub')) {
        tableName = 'subdealer_orders';
        foreignKey = 'subdealer_id';
    } else if (role.includes('dealer') && !role.includes('sub')) {
        tableName = 'dealer_orders';
        foreignKey = 'dealer_id';
    }

    try {
      const [ordersRes, paymentsRes] = await Promise.all([
        supabase.from(tableName).select('*').eq(foreignKey, user.user_id).order('created_at', { ascending: false }),
        supabase.from('payment_logs').select('*').eq('user_id', user.user_id).order('created_at', { ascending: false })
      ]);
      setUserOrders(ordersRes.data || []);
      setPaymentLogs(paymentsRes.data || []);
    } catch (err) {
      toast.error('Failed to load ledger');
    }
    setModalLoading(false);
  }

  const totals = useMemo(() => {
    const totalInvoiced = userOrders.reduce((sum, o) => sum + Number(o.total_amount || 0), 0);
    const totalPaid = userOrders.reduce((sum, o) => sum + Number(o.paid_amount || 0), 0) + 
                       paymentLogs.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    return { totalInvoiced, totalPaid, balance: totalInvoiced - totalPaid };
  }, [userOrders, paymentLogs]);

  return (
    <div className="min-h-screen bg-[#F9FAF6] font-sans pb-20">
      <Toaster position="top-center" />
      
      <div className="bg-white px-6 py-8 md:px-12 border-b border-gray-100">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl font-black tracking-tight" style={{ color: brandColor }}>Network Manager</h1>
            <p className="text-gray-400 font-medium">Control approvals and partner finances</p>
          </div>

          <div className="relative group w-full md:w-80">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-[#2c4305] transition-colors" />
            <input 
              className="w-full pl-11 pr-4 py-3.5 bg-gray-50 rounded-2xl border border-transparent focus:bg-white focus:border-gray-200 transition-all outline-none text-sm font-medium"
              placeholder="Quick search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8">
        
        <div className="flex flex-wrap items-center gap-3 mb-8">
          <div className="flex items-center gap-2 text-gray-400 mr-2">
            <FiFilter /> <span className="text-xs font-bold uppercase tracking-widest">Filter By Role:</span>
          </div>
          {/* Using clear keys for the filter state */}
          {[
            { id: 'all', label: 'All' },
            { id: 'dealer', label: 'Dealer' },
            { id: 'subdealer', label: 'Sub Dealer' },
            { id: 'retail', label: 'Retailer' }
          ].map((role) => (
            <button
              key={role.id}
              onClick={() => setActiveRoleFilter(role.id)}
              className={`px-6 py-2 rounded-full text-xs font-black uppercase tracking-tight transition-all ${
                activeRoleFilter === role.id 
                ? 'text-white shadow-lg' 
                : 'bg-white text-gray-400 hover:text-gray-600 border border-gray-100'
              }`}
              style={activeRoleFilter === role.id ? { backgroundColor: brandColor } : {}}
            >
              {role.label}
            </button>
          ))}
        </div>

        <div className="bg-white rounded-[2.5rem] shadow-sm border border-gray-100 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-gray-50/50 text-gray-400 text-[10px] uppercase font-bold tracking-[0.15em]">
              <tr>
                <th className="px-10 py-6">Identity</th>
                <th className="px-10 py-6">Partner Role</th>
                <th className="px-10 py-6 text-center">Authorization</th>
                <th className="px-10 py-6 text-right">Records</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {loading ? (
                <tr><td colSpan={4} className="py-20 text-center text-gray-300 animate-pulse">Fetching Network Data...</td></tr>
              ) : rows.map((r) => (
                <tr key={r.id} className="hover:bg-[#F9FAF6] transition-colors">
                  <td className="px-10 py-6">
                    <div className="font-bold text-gray-900 text-base">{r.company_name}</div>
                    <div className="text-xs text-gray-400">{r.first_name} {r.last_name}</div>
                  </td>
                  <td className="px-10 py-6">
                    <span className="px-3 py-1 bg-gray-100 text-gray-500 rounded-lg text-[10px] font-black uppercase tracking-widest">
                      {r.role?.replace('_', ' ')}
                    </span>
                  </td>
                  <td className="px-10 py-6">
                    <div className="flex items-center justify-center gap-2">
                      <button 
                        onClick={() => handleStatusUpdate(r.id, 'approved')}
                        className={`p-2.5 rounded-xl transition-all ${r.approval_status === 'approved' ? 'bg-green-100 text-green-700' : 'bg-gray-50 text-gray-300 hover:text-green-600'}`}
                      >
                        <FiCheck size={18} />
                      </button>
                      <button 
                        onClick={() => handleStatusUpdate(r.id, 'rejected')}
                        className={`p-2.5 rounded-xl transition-all ${r.approval_status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-gray-50 text-gray-300 hover:text-red-600'}`}
                      >
                        <FiSlash size={18} />
                      </button>
                    </div>
                  </td>
                  <td className="px-10 py-6 text-right">
                    <button 
                      onClick={() => handleViewDetails(r)}
                      style={{ color: brandColor, borderColor: `${brandColor}20` }}
                      className="px-5 py-2.5 rounded-2xl border font-bold text-xs hover:bg-white transition-all shadow-sm"
                    >
                      View Ledger
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {!loading && rows.length === 0 && (
            <div className="py-20 text-center text-gray-400">No results found for your selection.</div>
          )}
        </div>
      </main>

{/* --- Detail Overlay --- */}
{isModalOpen && selectedUser && (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm">
    <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[2.5rem] shadow-[0_35px_60px_-15px_rgba(0,0,0,0.3)] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
      
      {/* Top Header Section */}
      <div className="p-8 border-b border-gray-100 flex justify-between items-center bg-white">
        <div className="flex items-center gap-6">
          <div 
            style={{ backgroundColor: brandColor }} 
            className="w-16 h-16 rounded-2xl flex items-center justify-center text-white text-2xl font-black shadow-lg shadow-gray-200"
          >
            {selectedUser.company_name[0]}
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">{selectedUser.company_name}</h2>
            <div className="flex items-center gap-2 mt-1">
               <span style={{ color: brandColor, backgroundColor: `${brandColor}10` }} className="text-[10px] px-2 py-0.5 rounded font-black uppercase tracking-wider">
                 {selectedUser.role?.replace('_', ' ')}
               </span>
               <span className="text-gray-200">|</span>
               <span className="text-sm text-gray-400 font-medium">{selectedUser.email}</span>
            </div>
          </div>
        </div>
        <button 
          onClick={() => setIsModalOpen(false)} 
          className="w-10 h-10 flex items-center justify-center bg-gray-50 text-gray-400 rounded-xl hover:bg-rose-50 hover:text-rose-500 transition-all border border-gray-100"
        >
          <FiX size={20} />
        </button>
      </div>

      {/* Financial Summary Grid (Neutral Dark) */}
      <div className="grid grid-cols-3 bg-gray-900 text-white divide-x divide-white/5">
        <div className="p-8 text-center">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Total Invoiced</p>
          <p className="text-xl font-black">₹{Number(totals.totalInvoiced).toLocaleString()}</p>
        </div>
        <div className="p-8 text-center">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Total Received</p>
          <p className="text-xl font-black text-emerald-400">₹{Number(totals.totalPaid).toLocaleString()}</p>
        </div>
        <div className="p-8 text-center bg-white/5">
          <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-1">Outstanding Balance</p>
          <p className="text-xl font-black text-rose-400">₹{Number(totals.balance).toLocaleString()}</p>
        </div>
      </div>

      {/* Sub-Navigation */}
      <div className="flex bg-white px-8 border-b border-gray-100 gap-8">
        <button 
          onClick={() => setActiveTab('ledger')}
          className={`py-5 text-[11px] font-black uppercase tracking-[0.15em] transition-all border-b-2 ${activeTab === 'ledger' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-300 hover:text-gray-500'}`}
        >
          Financial Ledger
        </button>
        <button 
          onClick={() => setActiveTab('profile')}
          className={`py-5 text-[11px] font-black uppercase tracking-[0.15em] transition-all border-b-2 ${activeTab === 'profile' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-300 hover:text-gray-500'}`}
        >
          Partner Profile
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-8 bg-gray-50/50">
        {modalLoading ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-900 rounded-full animate-spin mb-4" />
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Reconciling Ledgers</p>
          </div>
        ) : activeTab === 'ledger' ? (
          <div className="space-y-3">
            {[...userOrders, ...paymentLogs]
              .sort((a,b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .map((item, i) => (
              <div key={i} className="bg-white p-5 rounded-2xl border border-gray-100 flex items-center justify-between hover:border-gray-300 transition-colors group">
                <div className="flex items-center gap-4">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${item.total_amount ? 'bg-gray-50 text-gray-400' : 'bg-emerald-50 text-emerald-600'}`}>
                    {item.total_amount ? <FiArrowUpRight size={18} /> : <FiArrowDownLeft size={18} />}
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 text-sm">{item.total_amount ? `Order Reference #${item.id.toString().slice(-6)}` : 'Payment Received'}</p>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">
                      {new Date(item.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                </div>
                <p className={`font-black text-base ${item.total_amount ? 'text-gray-900' : 'text-emerald-600'}`}>
                  {item.total_amount ? '−' : '+'} ₹{Number(item.total_amount || item.amount).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4">
            <ProfileCard icon={<FiUser />} label="Authorized Person" val={`${selectedUser.first_name} ${selectedUser.last_name}`} />
            <ProfileCard icon={<FiPhone />} label="Primary Contact" val={selectedUser.phone} />
            <ProfileCard icon={<FiHash />} label="GSTIN Number" val={selectedUser.gst_number || 'Not Registered'} />
            <ProfileCard icon={<FiCalendar />} label="Partnership Date" val={new Date(selectedUser.created_at).toLocaleDateString()} />
            <div className="col-span-2">
              <ProfileCard icon={<FiMapPin />} label="Store Location" val={selectedUser.store_address || selectedUser.address} />
            </div>
          </div>
        )}
      </div>

      {/* Footer / Actions */}
      <div className="p-8 bg-white border-t border-gray-100">
        <button 
          onClick={() => window.print()}
          style={{ backgroundColor: brandColor }}
          className="w-full py-4 text-white rounded-2xl font-black text-[11px] uppercase tracking-widest flex items-center justify-center gap-3 hover:brightness-110 transition-all shadow-xl shadow-gray-100"
        >
          <FiPrinter size={16} /> Generate Statement PDF
        </button>
      </div>
    </div>
  </div>
)}
    </div>
  );
}

const StatBlock = ({ label, val, color = "white", highlight = false }: any) => (
  <div className={`p-8 text-center ${highlight ? 'bg-white/5' : 'border-r border-white/5'}`}>
    <p className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em] mb-2">{label}</p>
    <p className="text-2xl font-black" style={{ color }}>₹{Number(val).toLocaleString()}</p>
  </div>
);

const TabLink = ({ active, onClick, label }: any) => (
  <button 
    onClick={onClick}
    className={`py-6 px-4 text-xs font-black uppercase tracking-widest transition-all border-b-2 ${active ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-300 hover:text-gray-500'}`}
  >
    {label}
  </button>
);

const ProfileCard = ({ icon, label, val }: any) => (
  <div className="bg-white p-6 rounded-3xl border border-gray-100 flex items-start gap-4">
    <div className="text-gray-300 mt-1">{icon}</div>
    <div>
      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-sm font-black text-gray-900 leading-relaxed">{val}</p>
    </div>
  </div>
);
// app/main-supplier-dashboard/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase'; // Adjust path to your supabase config
import { Line } from 'react-chartjs-2';
import { FiUsers, FiPackage, FiShoppingCart, FiTrendingUp, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

// --- Types ---
interface DashboardStats {
  totalPartners: number;
  pendingApprovals: number;
  dealerCount: number;
  subdealerCount: number;
  retailerCount: number;
  totalProducts: number;
  lowStockCount: number;
  totalOrders: number;
  revenue: number;
}

export default function MainSupplierDashboard() {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    totalPartners: 0,
    pendingApprovals: 0,
    dealerCount: 0,
    subdealerCount: 0,
    retailerCount: 0,
    totalProducts: 0,
    lowStockCount: 0,
    totalOrders: 0,
    revenue: 0
  });

  // 🔴 NEW: state to show red dot
  const [showNewOrdersDot, setShowNewOrdersDot] = useState(false);

  const [groupBy, setGroupBy] = useState('month');

  useEffect(() => {
    fetchRealtimeStats();
  }, []);

  const fetchRealtimeStats = async () => {
    try {
      setLoading(true);

      // 1. Fetch Partner Counts by Role from 'dealers' table
      const { data: dealersData, error: dealerErr } = await supabase
        .from('dealers')
        .select('role, approval_status');

      if (dealerErr) throw dealerErr;

      // 2. Fetch Product Counts
      const { count: productCount } = await supabase.from('products').select('*', { count: 'exact', head: true });

      // 3. Fetch Low Stock (variants with stock < 10)
      const { count: lowStock } = await supabase
        .from('product_variants')
        .select('*', { count: 'exact', head: true })
        .lt('stock', 10);

      // 4. Fetch Total Orders (Dealer + Retail)
      const { count: dOrders } = await supabase.from('dealer_orders').select('*', { count: 'exact', head: true });
      const { count: rOrders } = await supabase.from('retail_orders').select('*', { count: 'exact', head: true });

      const totalOrdersNow = (dOrders || 0) + (rOrders || 0);

      // 🔴 NEW: Fetch last_seen_order_count from suppliers table
      const { data: supplierData } = await supabase
        .from('suppliers')
        .select('last_seen_order_count')
        .single();

      const lastSeen = supplierData?.last_seen_order_count || 0;

      // 🔴 NEW: show red dot only if new orders exist
      if (totalOrdersNow > lastSeen) {
        setShowNewOrdersDot(true);
      }

      // Process Dealer Roles
      const roles = {
        total: dealersData?.length || 0,
        pending: dealersData?.filter(d => d.approval_status === 'pending').length || 0,

        dealer: dealersData?.filter(d =>
          d.role?.toLowerCase() === 'dealer'
        ).length || 0,

        subdealer: dealersData?.filter(d =>
          d.role?.toLowerCase() === 'sub_dealer' || d.role?.toLowerCase() === 'subdealer'
        ).length || 0,

        retailer: dealersData?.filter(d =>
          d.role?.toLowerCase() === 'retail_outlet' || d.role?.toLowerCase() === 'retailer'
        ).length || 0,
      };

      setStats({
        totalPartners: roles.total,
        pendingApprovals: roles.pending,
        dealerCount: roles.dealer,
        subdealerCount: roles.subdealer,
        retailerCount: roles.retailer,
        totalProducts: productCount || 0,
        lowStockCount: lowStock || 0,
        totalOrders: totalOrdersNow,
        revenue: 452000, // Replace with actual revenue aggregation logic if needed
      });
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-10 font-sans">
      {/* Header */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
        <div>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">Prakruthiaqua Dashboard</h1>
          <p className="text-slate-500 font-medium">Prakruthi Supply Chain Analytics</p>
        </div>
        <div className="flex items-center gap-3 bg-white p-2 rounded-2xl shadow-sm border border-slate-100">
          <span className="px-4 py-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
            {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
          </span>
          <button
            onClick={fetchRealtimeStats}
            className="p-2 hover:bg-slate-50 rounded-xl transition-colors text-indigo-600"
          >
            <FiTrendingUp />
          </button>
        </div>
      </header>

      {/* Main Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <MainStatCard
          label="Total Dealers"
          value={stats.totalPartners}
          icon={<FiUsers />}
          color="bg-indigo-600"
          description="Active & Pending Partners"
        />
        <MainStatCard
          label="Pending Approval of Dealer"
          value={stats.pendingApprovals}
          icon={<FiAlertCircle />}
          color="bg-amber-500"
          highlight={stats.pendingApprovals > 0}
          onClick={() => router.push('/pages/manage-dealers')}
          description="Awaiting Approval"
        />
        <MainStatCard
          label="Active Prdoucts"
          value={stats.totalProducts}
          icon={<FiPackage />}
          color="bg-blue-500"
          onClick={() => router.push('/pages/product-management')}
          description="Total Live Products"
        />
        <MainStatCard
          label="Total Orders"
          value={stats.totalOrders}
          icon={<FiShoppingCart />}
          color="bg-emerald-500"
          highlight={showNewOrdersDot}  // 🔴 NEW: red dot logic
          onClick={() => router.push('/pages/manage-orders')}
          description="Combined Sales Volume"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Role Breakdown Column */}
        <div className="space-y-6">
          <h3 className="text-sm font-black text-slate-400 uppercase tracking-[0.2em] ml-2">Partner Breakdown</h3>
          <RoleCard label="Dealers" count={stats.dealerCount} role="dealer" color="text-indigo-600" />
          <RoleCard label="Sub-Dealers" count={stats.subdealerCount} role="subdealer" color="text-purple-600" />
          <RoleCard label="Retailers" count={stats.retailerCount} role="retailer" color="text-pink-600" />

          <div className="p-6 bg-rose-50 border border-rose-100 rounded-[2rem] flex items-center justify-between mt-10">
            <div>
              <p className="text-rose-600 font-black text-lg">{stats.lowStockCount}</p>
              <p className="text-rose-400 text-xs font-bold uppercase tracking-wider">Inventory Alerts</p>
            </div>
            <button
              onClick={() => router.push('/product-management')}
              className="px-4 py-2 bg-rose-500 text-white text-[10px] font-black uppercase tracking-widest rounded-xl shadow-lg shadow-rose-200"
            >
              Restock
            </button>
          </div>
        </div>

        {/* Chart Area */}
        <div className="lg:col-span-2 bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100">
          <div className="flex justify-between items-center mb-8">
            <h3 className="text-xl font-black text-slate-800 tracking-tight">Revenue Trajectory</h3>
            <div className="flex bg-slate-50 p-1.5 rounded-2xl">
              {['month', 'week'].map(t => (
                <button
                  key={t}
                  onClick={() => setGroupBy(t)}
                  className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${groupBy === t ? 'bg-white text-indigo-600 shadow-md' : 'text-slate-400 hover:text-slate-600'
                    }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
          <div className="h-[400px]">
            <Line data={mockRevenueData} options={chartOptions} />
          </div>
        </div>
      </div>
    </div>
  );
}

// --- Sub-Components ---
function MainStatCard({ label, value, icon, color, description, highlight, onClick }: any) {
  return (
    <div
      onClick={onClick}
      className="group bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-50 hover:shadow-xl hover:shadow-indigo-500/5 transition-all cursor-pointer relative overflow-hidden"
    >
      <div className={`${color} w-12 h-12 rounded-2xl flex items-center justify-center text-white text-xl mb-6 shadow-lg shadow-current/20 group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <p className="text-4xl font-black text-slate-900 mb-1">{value}</p>
      <p className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">{label}</p>
      <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1 italic">
        {description}
      </p>
      {highlight && (
        <div className="absolute top-6 right-6 flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-500"></span>
        </div>
      )}
    </div>
  );
}

function RoleCard({ label, count, color }: any) {
  return (
    <div className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center justify-between hover:border-indigo-200 transition-colors">
      <div className="flex items-center gap-4">
        <div className={`w-2 h-10 rounded-full ${color.replace('text', 'bg')}`} />
        <div>
          <p className="text-xs font-black text-slate-400 uppercase tracking-wider">{label}</p>
          <p className={`text-xl font-black ${color}`}>{count}</p>
        </div>
      </div>
      <FiChevronRight className="text-slate-300" />
    </div>
  );
}

function FiChevronRight({ className }: any) {
  return <svg className={className} width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>;
}

// --- Chart Config ---
const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    y: {
      grid: { display: true, color: '#f1f5f9' },
      ticks: { font: { weight: 'bold' as any, size: 11 }, color: '#94a3b8' }
    },
    x: { grid: { display: false }, ticks: { font: { weight: 'bold' as any, size: 11 }, color: '#94a3b8' } }
  }
};

const mockRevenueData = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  datasets: [{
    data: [45000, 52000, 48000, 70000, 85000, 102000],
    borderColor: '#4f46e5',
    backgroundColor: (context: any) => {
      const gradient = context.chart.ctx.createLinearGradient(0, 0, 0, 400);
      gradient.addColorStop(0, 'rgba(79, 70, 229, 0.2)');
      gradient.addColorStop(1, 'rgba(79, 70, 229, 0)');
      return gradient;
    },
    fill: true,
    tension: 0.4,
    borderWidth: 4,
    pointRadius: 0,
  }]
};

// app/main-supplier-dashboard/page.tsx (for App Router in Next.js 13+)

'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase'; // Fixed import
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, Title, Tooltip, Legend, Filler,
} from 'chart.js';

// Icons (Simple SVG strings for zero-dependency)
const Icons = {
  Users: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>,
  Box: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path><polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline><line x1="12" y1="22.08" x2="12" y2="12"></line></svg>,
  Cart: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>,
  Trend: () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"></polyline><polyline points="17 6 23 6 23 12"></polyline></svg>
};

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend, Filler);

// Define types for TypeScript
interface Stats {
  users: number;
  pending: number;
  products: number;
  orders: number;
  lowStock: number;
  revenue: number;
}

interface RevenueData {
  labels: string[];
  datasets: {
    label: string;
    data: number[];
    borderColor: string;
    backgroundColor: string;
    fill: boolean;
    tension: number;
  }[];
}

interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  color: string;
  highlight?: boolean;
  onClick?: () => void;
}

export default function MainSupplierDashboard() {
  const router = useRouter();
  const supabase = createClient(); // Create the supabase client instance

  const [windowWidth, setWindowWidth] = useState(0);
  const [stats, setStats] = useState<Stats>({ users: 0, pending: 0, products: 0, orders: 0, lowStock: 0, revenue: 0 });
  const [revenueData, setRevenueData] = useState<RevenueData>({ labels: [], datasets: [] });
  const [groupBy, setGroupBy] = useState('month');

  const isMobile = windowWidth < 600;
  const isTablet = windowWidth >= 600 && windowWidth < 1024;

  useEffect(() => {
    const onResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    setWindowWidth(window.innerWidth);
    fetchDashboardData();
    return () => window.removeEventListener('resize', onResize);
  }, [groupBy]);

  const fetchDashboardData = async () => {
    // ... (Your existing fetch logic remains the same, just update setStats at the end)
    // Simulating data mapping for brevity
    setStats({ users: 124, pending: 5, products: 48, orders: 892, lowStock: 3, revenue: 452000 });
    
    // Mock Revenue Data for UI display
    setRevenueData({
      labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
      datasets: [{
        label: 'Revenue',
        data: [30000, 45000, 32000, 60000, 85000, 90000],
        borderColor: '#0b7b44',
        backgroundColor: 'rgba(11, 123, 68, 0.1)',
        fill: true,
        tension: 0.4,
      }]
    });
  };

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen font-inter">
      {/* Welcome Header */}
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-black text-gray-900">Control Center</h1>
          <p className="text-gray-600 text-sm mt-1">Overview of Prakruthi network performance</p>
        </div>
        {!isMobile && (
          <div className="px-4 py-2 bg-white rounded-full text-sm font-semibold text-gray-600 shadow-sm">
            {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
        )}
      </header>

      {/* Stats Grid */}
      <section className={`grid gap-4 mb-8 ${
        isMobile ? 'grid-cols-2' : isTablet ? 'grid-cols-3' : 'grid-cols-6'
      }`}>
        <StatCard
          icon={<Icons.Users />}
          label="Partners"
          value={stats.users}
          color="#6366f1"
          onClick={() => router.push('/manage-dealers')}
        />
        <StatCard
          icon={<Icons.Users />}
          label="Pending"
          value={stats.pending}
          color="#f59e0b"
          highlight={stats.pending > 0}
          onClick={() => router.push('/manage-dealers')}
        />
        <StatCard
          icon={<Icons.Box />}
          label="Products"
          value={stats.products}
          color="#3b82f6"
          onClick={() => router.push('/product-management')}
        />
        <StatCard
          icon={<Icons.Box />}
          label="Low Stock"
          value={stats.lowStock}
          color="#ef4444"
          highlight={stats.lowStock > 0}
          onClick={() => router.push('/pricing-management')}
        />
        <StatCard
          icon={<Icons.Cart />}
          label="Orders"
          value={stats.orders}
          color="#8b5cf6"
          onClick={() => router.push('/dealer-orders')}
        />
        <StatCard
          icon={<Icons.Trend />}
          label="Revenue"
          value={`₹${(stats.revenue / 1000).toFixed(1)}k`}
          color="#10b981"
        />
      </section>

      {/* Analytics Card */}
      <section className="bg-white p-6 rounded-2xl shadow-sm">
        <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
          <h3 className="text-xl font-bold text-gray-900">Revenue Insights</h3>
          <div className="flex bg-gray-100 p-1 rounded-lg">
            {['month', 'week'].map(mode => (
              <button
                key={mode}
                onClick={() => setGroupBy(mode)}
                className={`px-3 py-2 rounded-md text-sm font-semibold transition-all ${
                  groupBy === mode ? 'bg-white text-green-600 shadow-sm' : 'text-gray-600'
                }`}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
        <div className={`h-${isMobile ? '64' : '96'}`}>
          <Line data={revenueData} options={chartOptions} />
        </div>
      </section>
    </div>
  );
}

function StatCard({ icon, label, value, color, highlight, onClick }: StatCardProps) {
  return (
    <div
      onClick={onClick}
      className="bg-white p-4 rounded-xl shadow-sm cursor-pointer hover:shadow-md transition-all"
      style={{ borderTop: `4px solid ${color}` }}
    >
      <div className="flex justify-between items-start mb-2">
        <div style={{ color, opacity: 0.8 }}>{icon}</div>
        {highlight && <div className="px-2 py-1 bg-red-100 text-red-600 rounded text-xs font-bold">Action</div>}
      </div>
      <div className="text-xs font-bold text-gray-400 uppercase">{label}</div>
      <div className="text-xl font-black text-gray-900 mt-1">{value}</div>
    </div>
  );
}

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: {
    y: { beginAtZero: true, grid: { color: '#f1f5f9' }, ticks: { font: { size: 10 } } },
    x: { grid: { display: false }, ticks: { font: { size: 10 } } }
  }
};
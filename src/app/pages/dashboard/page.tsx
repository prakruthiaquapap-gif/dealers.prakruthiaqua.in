'use client';

import React from 'react';
import { 
  MdInventory, 
  MdShoppingCart, 
  MdTrendingUp, 
  MdArrowForward,
  MdLayers,
  MdHistory,
  MdAccountBalanceWallet
} from 'react-icons/md';
import Link from 'next/link';

export default function DealerDashboard() {
  // Brand Color Constant
  const brandColor = "#2c4305";

  const stats = [
    { label: "Total Products", value: "4", icon: <MdLayers />, color: "border-[#2c4305]", iconBg: "bg-[#2c4305]/5 text-[#2c4305]" },
    { label: "Active Orders", value: "6", icon: <MdHistory />, color: "border-[#2c4305]", iconBg: "bg-[#2c4305]/5 text-[#2c4305]" },
    { label: "Total Investment", value: "₹167", icon: <MdAccountBalanceWallet />, color: "border-[#2c4305]", iconBg: "bg-[#2c4305]/5 text-[#2c4305]" },
  ];

  const quickActions = [
    { title: "Browse Store", desc: "View latest inventory & place new orders", path: "/pages/products" },
    { title: "My Orders", desc: "Check status of your current shipments", path: "/pages/orders" },
    { title: "Account Profile", desc: "Manage your business details & address", path: "/pages/dealerprofile" },
  ];

  return (
    /* Added px-12 for left and right side spacing, py-8 for top space */
    <div className="px-12 py-8 space-y-12">
      
      {/* HEADER SECTION */}
      <div className="flex justify-between items-end">
        <div>
          <p className="text-[#2c4305] font-black text-[10px] uppercase tracking-[0.3em] mb-2">Workspace Overview</p>
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">Dealer Dashboard</h1>
        </div>
        <div className="bg-white px-6 py-3 rounded-2xl border border-gray-100 shadow-sm text-slate-500 text-xs font-black uppercase tracking-widest">
          {new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
        </div>
      </div>

      {/* STATS CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {stats.map((stat, i) => (
          <div key={i} className={`bg-white p-8 rounded-[2.5rem] border-b-4 ${stat.color} shadow-sm hover:shadow-md transition-all flex justify-between items-center group`}>
            <div>
              <p className="text-gray-400 font-black text-[10px] uppercase tracking-widest mb-2">{stat.label}</p>
              <h3 className="text-4xl font-black text-slate-800 tracking-tighter group-hover:text-[#2c4305] transition-colors">{stat.value}</h3>
            </div>
            <div className={`w-16 h-16 ${stat.iconBg} rounded-[1.5rem] flex items-center justify-center text-3xl transition-transform group-hover:scale-110`}>
              {stat.icon}
            </div>
          </div>
        ))}
      </div>

      {/* QUICK ACTIONS SECTION */}
      <div className="space-y-8">
        <div className="flex items-center gap-4">
           <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em]">Quick Access</h2>
           <div className="h-[1px] flex-1 bg-gray-100"></div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {quickActions.map((action, i) => (
            <Link key={i} href={action.path} className="group">
              <div className="bg-white p-10 rounded-[3rem] shadow-sm border border-transparent hover:border-[#2c4305]/20 transition-all hover:shadow-2xl hover:shadow-[#2c4305]/10 h-full flex flex-col items-start relative overflow-hidden">
                <div className="w-12 h-12 bg-gray-50 text-slate-400 rounded-2xl flex items-center justify-center mb-8 group-hover:bg-[#2c4305] group-hover:text-white transition-all duration-300">
                  <MdArrowForward size={24} className="group-hover:rotate-[-45deg] transition-transform" />
                </div>
                <h4 className="text-xl font-black text-slate-800 mb-3 group-hover:text-[#2c4305] transition-colors">{action.title}</h4>
                <p className="text-gray-400 text-sm font-bold leading-relaxed">
                  {action.desc}
                </p>
                {/* Decorative background circle */}
                <div className="absolute -right-4 -bottom-4 w-24 h-24 bg-[#2c4305]/5 rounded-full group-hover:scale-150 transition-transform duration-500"></div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
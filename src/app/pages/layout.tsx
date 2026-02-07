'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase';
import { getNavbarItems } from '@/Components/navigation';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { MdLogout, MdNotifications, MdPerson, MdShoppingBag, MdMenu, MdClose } from 'react-icons/md';
import toast from 'react-hot-toast';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createClient();
  const router = useRouter();
  const pathname = usePathname();

  const [role, setRole] = useState('');
  const [userName, setUserName] = useState('');
  const [loading, setLoading] = useState(true);
  const [cartCount, setCartCount] = useState(0);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false); // Mobile sidebar state

  const fetchCartCount = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { count, error } = await supabase
      .from('dealer_cart')
      .select('*', { count: 'exact', head: true })
      .eq('dealer_id', user.id);
    if (!error) setCartCount(count || 0);
  };

  useEffect(() => {
    const protectRoute = async () => {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        router.push('/login');
        return;
      }
      const { data: dealer, error: dbError } = await supabase
        .from('dealers')
        .select('role, first_name, last_name, approval_status')
        .eq('user_id', user.id)
        .single();

      if (dbError || !dealer || dealer.approval_status !== 'approved') {
        if (dealer?.approval_status !== 'approved') toast.error("Account pending approval.");
        await supabase.auth.signOut();
        router.push('/login');
        return;
      }

      setRole(dealer.role);
      setUserName(`${dealer.first_name} ${dealer.last_name}`);
      setLoading(false);
      if (dealer.role === 'admin') {
        if (pathname === '/pages/dashboard' || pathname === '/') router.push('/pages/main-supplier-dashboard');
      } else {
        fetchCartCount();
      }
    };
    protectRoute();
    window.addEventListener('cartUpdated', fetchCartCount);
    return () => window.removeEventListener('cartUpdated', fetchCartCount);
  }, [router, supabase, pathname]);

  // Close sidebar when route changes on mobile
  useEffect(() => {
    setIsSidebarOpen(false);
  }, [pathname]);

  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#2c4305] mb-4"></div>
        <p className="text-[#2c4305] font-black animate-pulse uppercase tracking-widest text-xs">Loading Workspace...</p>
      </div>
    );
  }

  const menuItems = getNavbarItems(role);

  return (
    <div className="flex min-h-screen bg-[#f8f9fa]">
      {/* MOBILE OVERLAY */}
      {isSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-[60] lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* SIDEBAR */}
      <aside className={`
        w-72 bg-white text-slate-800 flex flex-col fixed h-full border-r border-gray-200 z-[70] transition-transform duration-300
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        <div className="h-20 lg:h-24 flex items-center justify-between px-6 border-b border-gray-100 bg-white">
          <img src="/Plogo.png" alt="Prakruthi" className="w-40 lg:w-56 h-auto object-contain" />
          <button className="lg:hidden text-gray-500" onClick={() => setIsSidebarOpen(false)}>
            <MdClose size={24} />
          </button>
        </div>

        <nav className="flex-1 p-4 lg:p-6 space-y-1 mt-4 overflow-y-auto">
          {menuItems.map((item, idx) => {
            const isActive = pathname === item.path;
            return (
              <Link key={idx} href={item.path}
                className={`flex items-center gap-4 px-6 py-4 rounded-2xl transition-all ${isActive
                  ? 'bg-[#2c4305]/5 text-[#2c4305] shadow-sm'
                  : 'text-gray-400 hover:bg-gray-50 hover:text-[#2c4305]'
                  }`}>
                <span className={`text-xl ${isActive ? 'text-[#2c4305]' : ''}`}>{item.icon}</span>
                <span className={`font-black text-[11px] uppercase tracking-wider ${isActive ? 'text-[#2c4305]' : ''}`}>
                  {item.name}
                </span>
              </Link>
            );
          })}
        </nav>

        <button
          onClick={async () => { await supabase.auth.signOut(); router.push('/login'); }}
          className="m-6 p-4 flex items-center justify-center gap-3 text-red-500 bg-red-50 hover:bg-red-500 hover:text-white rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all"
        >
          <MdLogout size={16} /> Logout
        </button>
      </aside>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col lg:ml-72 w-full">
        {/* TOP HEADER */}
        {/* TOP HEADER */}
        <header className="h-20 lg:h-24 bg-white border-b border-gray-100 flex items-center justify-between px-4 lg:px-10 sticky top-0 z-40">
          <div className="flex items-center gap-3">
         

            {/* MOBILE LOGO - Only visible on small screens */}
            <Link href="/" className="lg:hidden">
              <img
                src="/Plogo.png"
                alt="Prakruthi"
                className="w-32 h-auto object-contain"
              />
            </Link>

            {/* DESKTOP BREADCRUMBS - Hidden on mobile */}
            <div className="hidden lg:block">
              <h1 className="text-[10px] lg:text-xs font-black text-[#2c4305] uppercase tracking-[0.2em] opacity-70">
                {role} Portal
              </h1>
              <p className="text-[9px] lg:text-[10px] text-gray-400 font-bold uppercase mt-1">
                Management System
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 lg:gap-4">
            {role !== 'admin' && (
              <Link
                href="/pages/cart"
                className="relative p-2.5 lg:p-3 bg-gray-50 hover:bg-[#2c4305]/10 text-gray-500 hover:text-[#2c4305] rounded-xl lg:rounded-2xl transition-all"
              >
                <MdShoppingBag size={20} className="lg:w-6 lg:h-6" />
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 lg:w-5 lg:h-5 bg-[#2c4305] text-white text-[8px] lg:text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
                    {cartCount}
                  </span>
                )}
              </Link>
            )}

            <div className="flex items-center gap-2 lg:gap-4 border-l pl-3 lg:pl-6 ml-1 lg:ml-2">
              {/* Hide name on very small screens to save space for the logo */}
              <div className="text-right hidden sm:block">
                <p className="text-[10px] lg:text-xs font-black text-slate-900 leading-none truncate max-w-[80px]">
                  {userName.split(' ')[0]}
                </p>
                <p className="hidden md:inline-block text-[8px] text-[#2c4305] font-black uppercase tracking-tighter mt-1 bg-[#2c4305]/10 px-2 py-0.5 rounded-full">
                  Approved
                </p>
              </div>
              <div className="w-10 h-10 lg:w-12 lg:h-12 bg-[#2c4305] rounded-xl lg:rounded-2xl flex items-center justify-center text-white shadow-lg shadow-[#2c4305]/20 active:scale-95 transition-transform">
                <MdPerson size={20} className="lg:w-6 lg:h-6" />
              </div>
            </div>
               {/* Hamburger for Mobile */}
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 lg:hidden text-gray-600 bg-gray-50 rounded-xl active:scale-95 transition-transform"
            >
              <MdMenu size={24} />
            </button>
          </div>
        </header>

        {/* MAIN BODY */}
        <main className="p-4 lg:p-0">
          {children}
        </main>
      </div>
    </div>
  );
}
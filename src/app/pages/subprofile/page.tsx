'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase';
import { useRouter } from 'next/navigation';
import { 
    MdPerson, MdEmail, MdBadge, MdLocationOn, 
    MdPhone, MdLogout, MdVerified, MdInventory, MdEdit, MdCheck, MdClose, MdTrendingUp 
} from 'react-icons/md';
import toast from 'react-hot-toast';

export default function SubDealerProfile() {
    const supabase = createClient();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<any>(null);
    const [address, setAddress] = useState<any>(null);
    const [stats, setStats] = useState({ totalOrders: 0, totalSpent: 0 });

    const [isEditingName, setIsEditingName] = useState(false);
    const [tempName, setTempName] = useState('');

    // Theme Color
    const brandGreen = "#2c4305";

    useEffect(() => {
        fetchProfileData();
    }, []);

    const fetchProfileData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return router.push('/login');

            // 1. Fetch Sub-Dealer Basic Info
            const { data: dealer } = await supabase
                .from('dealers')
                .select('*')
                .eq('user_id', user.id)
                .single();

            // 2. Fetch Shipping Address
            const { data: addr } = await supabase
                .from('dealer_shipping_address')
                .select('*')
                .eq('dealer_id', user.id)
                .single();

            // 3. Fetch Procurement Stats
            const { data: orders } = await supabase
                .from('dealer_orders')
                .select('total_amount')
                .eq('dealer_id', user.id);

            const spent = orders?.reduce((acc, curr) => acc + curr.total_amount, 0) || 0;

            setProfile({ ...dealer, email: user.email });
            setAddress(addr);
            setStats({ totalOrders: orders?.length || 0, totalSpent: spent });
            
            setTempName(addr?.name || dealer?.dealer_name || 'Sub-Dealer Partner');

        } catch (error) {
            console.error('Error loading profile:', error);
            toast.error("Failed to load profile details");
        } finally {
            setLoading(false);
        }
    };

    const handleUpdateName = async () => {
        if (!tempName.trim()) return toast.error("Name cannot be empty");
        
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { error } = await supabase
                .from('dealers')
                .update({ dealer_name: tempName })
                .eq('user_id', user?.id);

            if (error) throw error;

            setProfile({ ...profile, dealer_name: tempName });
            setIsEditingName(false);
            toast.success("Identity Updated!");
        } catch (error) {
            toast.error("Update failed");
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
        toast.success("Securely logged out");
    };

    if (loading) return (
        <div className="h-screen flex items-center justify-center bg-white">
            <div className="text-center">
                <div className="w-10 h-10 border-4 border-[#2c4305] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                <p className="text-[10px] font-black tracking-[0.3em] text-[#2c4305] uppercase">Authenticating Profile</p>
            </div>
        </div>
    );

    const finalDisplayName = profile?.dealer_name || address?.name || "Sub-Dealer Partner";
    const displayPhone = address?.phone || profile?.phone_number || "Contact Not Linked";

    return (
        <div className="max-w-6xl mx-auto px-6 py-12">
            {/* Top Navigation / Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
                <div>
                    <h1 className="text-5xl font-black text-slate-900 tracking-tighter uppercase">
Sub-Dealer Profile</h1>
                    <div className="flex items-center gap-2 mt-2">
                        <div className="h-1 w-12 bg-[#2c4305]"></div>
                        <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Sub-Dealer Administrative Console</p>
                    </div>
                </div>
                <button 
                    onClick={handleLogout}
                    className="flex items-center gap-3 px-8 py-4 bg-slate-900 text-white hover:bg-red-600 rounded-2xl font-black text-[10px] uppercase transition-all shadow-xl shadow-slate-200"
                >
                    <MdLogout size={18} /> Logout
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                
                {/* LEFT COLUMN: Identity & Stats */}
                <div className="lg:col-span-4 space-y-8">
                    {/* Identity Card */}
                    <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-2xl shadow-slate-200/60 text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-3 bg-[#2c4305]"></div>
                        
                        <div className="w-32 h-32 bg-slate-50 rounded-[2.5rem] flex items-center justify-center mx-auto mb-8 rotate-3 group hover:rotate-0 transition-transform duration-500">
                            <MdPerson size={64} className="text-slate-300" />
                        </div>

                        {isEditingName ? (
                            <div className="space-y-3">
                                <input 
                                    type="text"
                                    value={tempName}
                                    onChange={(e) => setTempName(e.target.value)}
                                    className="w-full bg-slate-50 border-2 border-slate-100 text-center font-black text-lg py-3 rounded-2xl outline-[#2c4305]"
                                />
                                <div className="flex gap-2 justify-center">
                                    <button onClick={handleUpdateName} className="flex-1 py-3 bg-[#2c4305] text-white rounded-xl flex justify-center"><MdCheck size={20}/></button>
                                    <button onClick={() => setIsEditingName(false)} className="flex-1 py-3 bg-slate-100 text-slate-400 rounded-xl flex justify-center"><MdClose size={20}/></button>
                                </div>
                            </div>
                        ) : (
                            <div className="group cursor-pointer" onClick={() => { setTempName(finalDisplayName); setIsEditingName(true); }}>
                                <h2 className="font-black text-2xl text-slate-900 leading-tight flex items-center justify-center gap-3 uppercase tracking-tight">
                                    {finalDisplayName}
                                    <MdEdit size={16} className="text-slate-300 group-hover:text-[#2c4305] transition-colors" />
                                </h2>
                            </div>
                        )}

                        <div className="flex items-center justify-center gap-2 mt-4">
                            <MdVerified className="text-[#2c4305]" size={18} />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.1em]">Authorized Network</span>
                        </div>
                    </div>

                    {/* Stats Card */}
                    <div className="bg-[#2c4305] p-10 rounded-[3.5rem] text-white shadow-2xl shadow-[#2c4305]/20 relative overflow-hidden">
                        <MdTrendingUp className="absolute -right-6 -top-6 text-white/10" size={180} />
                        
                        <p className="text-[10px] font-black uppercase text-white/50 mb-8 tracking-[0.25em]">Procurement Volume</p>
                        
                        <div className="relative z-10 space-y-8">
                            <div>
                                <p className="text-4xl font-black tracking-tighter">₹{stats.totalSpent.toLocaleString()}</p>
                                <p className="text-[9px] font-bold text-white/60 uppercase mt-2 tracking-widest">Total Investment</p>
                            </div>
                            
                            <div className="flex justify-between items-center pt-8 border-t border-white/10">
                                <div>
                                    <p className="text-2xl font-black">{stats.totalOrders}</p>
                                    <p className="text-[9px] font-bold text-white/60 uppercase tracking-widest">Restocks</p>
                                </div>
                                <div className="bg-white/10 px-4 py-2 rounded-xl backdrop-blur-md">
                                    <p className="text-[9px] font-black uppercase tracking-tighter text-white">Active Tier</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT COLUMN: Details */}
                <div className="lg:col-span-8 space-y-8">
                    {/* Contact Info */}
                    <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-4 mb-10">
                            <div className="w-12 h-12 bg-[#2c4305]/5 rounded-2xl flex items-center justify-center text-[#2c4305]">
                                <MdBadge size={24} />
                            </div>
                            <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Credential Details</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex items-center gap-5 p-6 bg-slate-50/50 rounded-3xl border border-slate-100/50">
                                <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-slate-400"><MdEmail size={22} /></div>
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Registered Email</p>
                                    <p className="text-sm font-black text-slate-800">{profile?.email}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-5 p-6 bg-slate-50/50 rounded-3xl border border-slate-100/50">
                                <div className="w-12 h-12 bg-white rounded-2xl shadow-sm flex items-center justify-center text-slate-400"><MdPhone size={22} /></div>
                                <div>
                                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Direct Contact</p>
                                    <p className="text-sm font-black text-slate-800">{displayPhone}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Shipping Address */}
                    <div className="bg-white p-10 rounded-[3.5rem] border border-slate-100 shadow-sm">
                        <div className="flex justify-between items-center mb-10">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-[#2c4305]/5 rounded-2xl flex items-center justify-center text-[#2c4305]">
                                    <MdLocationOn size={24} />
                                </div>
                                <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em]">Warehouse & Delivery</h3>
                            </div>
                            <button 
                                onClick={() => router.push('/pages/checkout')}
                                className="px-6 py-3 bg-slate-50 hover:bg-[#2c4305] hover:text-white rounded-xl text-[9px] font-black text-slate-500 uppercase tracking-widest transition-all"
                            >
                                Edit Address
                            </button>
                        </div>
                        
                        {address ? (
                            <div className="bg-slate-50/50 p-10 rounded-[2.5rem] border border-slate-100 relative group">
                                <div className="space-y-2">
                                    <p className="text-xl font-black text-slate-900 uppercase tracking-tight">{address.name}</p>
                                    <p className="text-slate-500 font-bold text-sm leading-relaxed max-w-md">
                                        {address.house_no}, {address.area}<br/>
                                        {address.city}, {address.state} — {address.pincode}
                                    </p>
                                </div>
                                <div className="mt-8 pt-8 border-t border-slate-200/60 flex items-center gap-3 text-[#2c4305]">
                                    <MdInventory size={20} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Primary Fulfilment Center</span>
                                </div>
                            </div>
                        ) : (
                            <div className="p-16 border-4 border-dashed border-slate-50 rounded-[3rem] text-center">
                                <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.3em]">No Warehouse Address Defined</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
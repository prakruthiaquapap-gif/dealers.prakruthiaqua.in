'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase';
import { useRouter } from 'next/navigation';
import { 
    MdPerson, MdEmail, MdBadge, MdLocationOn, 
    MdPhone, MdLogout, MdVerified, MdShoppingBag, MdEdit, MdCheck, MdClose 
} from 'react-icons/md';
import toast from 'react-hot-toast';

export default function DealerProfile() {
    const supabase = createClient();
    const router = useRouter();

    const [loading, setLoading] = useState(true);
    const [profile, setProfile] = useState<any>(null);
    const [address, setAddress] = useState<any>(null);
    const [stats, setStats] = useState({ totalOrders: 0, totalSpent: 0 });

    const [isEditingName, setIsEditingName] = useState(false);
    const [tempName, setTempName] = useState('');

    useEffect(() => {
        fetchProfileData();
    }, []);

    const fetchProfileData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return router.push('/login');

            // 1. Fetch Dealer Basic Info
            const { data: dealer } = await supabase
                .from('dealers')
                .select('*')
                .eq('user_id', user.id)
                .single();

            // 2. Fetch Shipping Address (Primary Source for your Name)
            const { data: addr } = await supabase
                .from('dealer_shipping_address')
                .select('*')
                .eq('dealer_id', user.id)
                .single();

            // 3. Fetch Order Stats
            const { data: orders } = await supabase
                .from('dealer_orders')
                .select('total_amount')
                .eq('dealer_id', user.id);

            const spent = orders?.reduce((acc, curr) => acc + curr.total_amount, 0) || 0;

            setProfile({ ...dealer, email: user.email });
            setAddress(addr);
            setStats({ totalOrders: orders?.length || 0, totalSpent: spent });
            
            // Priority: Use Address Name -> Then Dealer Table Name -> Then Fallback
            setTempName(addr?.name || dealer?.dealer_name || 'Dealer Partner');

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
            // Update the dealers table so the header and profile match
            const { error } = await supabase
                .from('dealers')
                .update({ dealer_name: tempName })
                .eq('user_id', user?.id);

            if (error) throw error;

            setProfile({ ...profile, dealer_name: tempName });
            setIsEditingName(false);
            toast.success("Profile Name Updated!");
        } catch (error) {
            toast.error("Update failed");
        }
    };

    const handleLogout = async () => {
        await supabase.auth.signOut();
        router.push('/login');
        toast.success("Logged out successfully");
    };

    if (loading) return <div className="p-20 text-center font-black animate-pulse text-[#108542]">LOADING PROFILE...</div>;

    // Consistency: Take the name exactly as it appears in the address
    const finalDisplayName = address?.name || profile?.dealer_name || "Dealer Partner";
    const displayPhone = address?.phone || profile?.phone_number || "Not Provided";

    return (
        <div className="max-w-6xl mx-auto px-6 py-10">
            {/* Header */}
            <div className="flex justify-between items-end mb-10 border-b border-slate-100 pb-6">
                <div>
                    <h1 className="text-4xl font-black text-slate-800 uppercase tracking-tight">Dealer Profile</h1>
                    <p className="text-slate-400 font-bold text-xs uppercase tracking-widest mt-1">Manage your account & identity</p>
                </div>
                <button 
                    onClick={handleLogout}
                    className="group flex items-center gap-2 px-6 py-3 bg-red-50 hover:bg-red-600 text-red-600 hover:text-white rounded-2xl font-black text-[10px] uppercase transition-all shadow-sm"
                >
                    <MdLogout size={16} /> Logout
                </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                
                {/* LEFT: Identity & Business Performance */}
                <div className="lg:col-span-4 space-y-6">
                    <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-xl shadow-slate-200/50 text-center relative overflow-hidden">
                        <div className="absolute top-0 left-0 w-full h-2 bg-[#108542]"></div>
                        <div className="w-28 h-28 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-6 ring-8 ring-slate-50/50">
                            <MdPerson size={60} className="text-slate-300" />
                        </div>

                        {isEditingName ? (
                            <div className="flex flex-col gap-2">
                                <input 
                                    type="text"
                                    value={tempName}
                                    onChange={(e) => setTempName(e.target.value)}
                                    className="bg-slate-50 border border-slate-200 text-center font-black text-lg p-2 rounded-xl outline-[#108542]"
                                />
                                <div className="flex gap-2 justify-center">
                                    <button onClick={handleUpdateName} className="p-2 bg-green-500 text-white rounded-lg"><MdCheck/></button>
                                    <button onClick={() => setIsEditingName(false)} className="p-2 bg-slate-200 text-slate-500 rounded-lg"><MdClose/></button>
                                </div>
                            </div>
                        ) : (
                            <h2 className="font-black text-2xl text-slate-800 leading-tight flex items-center justify-center gap-2">
                                {finalDisplayName}
                                <MdEdit 
                                    size={16} 
                                    className="text-slate-300 cursor-pointer hover:text-[#108542]" 
                                    onClick={() => {
                                        setTempName(finalDisplayName);
                                        setIsEditingName(true);
                                    }}
                                />
                            </h2>
                        )}

                        <div className="flex items-center justify-center gap-1 mt-2">
                            <MdVerified className="text-blue-500" size={16} />
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Verified Dealer</span>
                        </div>
                        
                        <div className="mt-6 pt-6 border-t border-slate-50">
                             <span className="text-[10px] font-black text-white bg-[#108542] px-4 py-1.5 rounded-full uppercase tracking-widest shadow-md">
                                {profile?.role || 'Retailer'}
                            </span>
                        </div>
                    </div>

                    <div className="bg-[#1a2b4b] p-8 rounded-[3rem] text-white shadow-xl shadow-blue-900/20 relative overflow-hidden">
                        <div className="absolute -right-4 -bottom-4 opacity-10 rotate-12">
                            <MdShoppingBag size={120} />
                        </div>
                        <p className="text-[10px] font-black uppercase text-blue-300 mb-6 tracking-[0.2em]">Business Performance</p>
                        <div className="space-y-6">
                            <div>
                                <p className="text-3xl font-black">₹{stats.totalSpent.toFixed(2)}</p>
                                <p className="text-[10px] font-bold text-blue-200 uppercase mt-1">Total Procurement</p>
                            </div>
                            <div className="flex justify-between items-end border-t border-white/10 pt-4">
                                <div>
                                    <p className="text-xl font-black">{stats.totalOrders}</p>
                                    <p className="text-[10px] font-bold text-blue-200 uppercase">Orders Placed</p>
                                </div>
                                <div className="text-right text-green-400 font-black text-[10px] uppercase">
                                    Active Account
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* RIGHT: Detailed Info */}
                <div className="lg:col-span-8 space-y-6">
                    <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm">
                        <div className="flex items-center gap-3 mb-8">
                            <div className="p-3 bg-green-50 rounded-2xl text-[#108542]">
                                <MdBadge size={24} />
                            </div>
                            <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">General Information</h3>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex items-center gap-5 p-5 bg-slate-50/50 rounded-[2rem]">
                                <div className="p-3 bg-white rounded-xl shadow-sm text-slate-400"><MdEmail size={20} /></div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Email Address</p>
                                    <p className="text-sm font-bold text-slate-700">{profile?.email}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-5 p-5 bg-slate-50/50 rounded-[2rem]">
                                <div className="p-3 bg-white rounded-xl shadow-sm text-slate-400"><MdPhone size={20} /></div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Contact Number</p>
                                    <p className="text-sm font-bold text-slate-700">{displayPhone}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm relative">
                        <div className="flex justify-between items-center mb-8">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-green-50 rounded-2xl text-[#108542]">
                                    <MdLocationOn size={24} />
                                </div>
                                <h3 className="text-sm font-black text-slate-800 uppercase tracking-widest">Shipping Destination</h3>
                            </div>
                            <button 
                                onClick={() => router.push('/pages/checkout')}
                                className="px-4 py-2 bg-slate-50 hover:bg-slate-100 rounded-xl text-[10px] font-black text-slate-500 uppercase transition-all"
                            >
                                Change Address
                            </button>
                        </div>
                        
                        {address ? (
                            <div className="bg-slate-50/50 p-8 rounded-[2rem] border border-slate-100">
                                <p className="text-lg font-black text-slate-800 mb-2">{address.name}</p>
                                <p className="text-slate-500 font-medium">{address.house_no}, {address.area}</p>
                                <p className="text-slate-500 font-medium">{address.city}, {address.state} - {address.pincode}</p>
                                <div className="mt-6 pt-6 border-t border-slate-200/50 flex items-center gap-2 text-[#108542] font-black text-xs">
                                    <MdPhone size={16} /> {address.phone}
                                </div>
                            </div>
                        ) : (
                            <div className="p-12 border-2 border-dashed border-slate-100 rounded-[2.5rem] text-center text-slate-400 font-bold uppercase text-[10px]">
                                No Address Found
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
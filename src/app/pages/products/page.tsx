'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase';
import {
    MdShoppingCart, MdSearch, MdClose, MdAdd,
    MdRemove, MdArrowForward, MdLocalOffer, MdFilterAlt, MdRestartAlt
} from 'react-icons/md';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

interface Category {
    id: string;
    name: string;
    parent_id: string | null;
    level: 'main' | 'sub' | 'inner';
}

export default function ProductsPage() {
    const supabase = createClient();
    const router = useRouter();

    const [products, setProducts] = useState<any[]>([]);
    const [cartItems, setCartItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [selectedSubcategory, setSelectedSubcategory] = useState('All');
    const [selectedInnercategory, setSelectedInnercategory] = useState('All');
    const [selectedVariants, setSelectedVariants] = useState<{ [key: number]: any }>({});

    const [showModal, setShowModal] = useState(false);
    const [modalData, setModalData] = useState<any>(null);
    const [orderQty, setOrderQty] = useState(25);
    const [addingToDb, setAddingToDb] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data: dealer } = await supabase.from('dealers').select('role').eq('user_id', user.id).single();
            setUserRole(dealer?.role?.toLowerCase().trim() || 'retailer outlet');

            const { data: categoriesData } = await supabase.from('categories').select('*').order('display_order', { ascending: true });
            setCategories(categoriesData || []);

            const { data: productsData } = await supabase.from('products').select(`*, product_variants (*)`).eq('active', true);
            const { data: cartData } = await supabase.from('dealer_cart').select('product_id, variant_id').eq('dealer_id', user.id);

            setCartItems(cartData || []);
            setProducts(productsData || []);

            const initialVariants: any = {};
            productsData?.forEach(p => {
                if (p.product_variants?.length > 0) initialVariants[p.id] = p.product_variants[0];
            });
            setSelectedVariants(initialVariants);
        } catch (err) {
            toast.error("Failed to load catalog");
        } finally {
            setLoading(false);
        }
    };

    const getCategoryPath = (catId: string, subId: string, innerId?: string) => {
        const c = categories.find(i => i.id === catId)?.name;
        const s = categories.find(i => i.id === subId)?.name;
        const inCat = innerId ? categories.find(i => i.id === innerId)?.name : null;
        return [c, s, inCat].filter(Boolean).join(' • ');
    };

    const activeKeys = (() => {
        switch (userRole) {
            case 'main dealer':
            case 'dealer': return { price: 'dealer_price', discount: 'dealer_discount' };
            case 'sub dealer': return { price: 'subdealer_price', discount: 'subdealer_discount' };
            case 'retailer outlet': return { price: 'retail_price', discount: 'retail_discount' };
            default: return { price: 'customer_price', discount: 'customer_discount' };
        }
    })();

    const filteredProducts = products.filter(p =>
        p.product_name.toLowerCase().includes(searchQuery.toLowerCase()) &&
        (selectedCategory === 'All' || p.category === selectedCategory) &&
        (selectedSubcategory === 'All' || p.subcategory === selectedSubcategory) &&
        (selectedInnercategory === 'All' || p.innercategory === selectedInnercategory)
    );

    const handleConfirmAdd = async (gotoCart: boolean = false) => {
        setAddingToDb(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { product, variant } = modalData;

            // PRICE CALCULATION: Derived from the variant columns as per your schema
            const basePrice = Number(variant[activeKeys.price]) || 0;
            const discountPercent = Number(variant[activeKeys.discount]) || 0;
            const finalPrice = basePrice * (1 - discountPercent / 100);

            await supabase.from('dealer_cart').upsert({
                dealer_id: user?.id,
                product_id: product.id,
                variant_id: variant.id,
                quantity: orderQty,
                price: finalPrice,
                payment_plan: 'full',
            }, { onConflict: 'dealer_id, product_id, variant_id' });

            setCartItems(prev => [...prev, { product_id: product.id, variant_id: variant.id }]);
            window.dispatchEvent(new Event('cartUpdated'));
            toast.success("Added to cart!");
            setShowModal(false);
            if (gotoCart) router.push('/pages/cart');
        } catch (err) {
            console.error(err);
            toast.error("Error adding to cart");
        } finally {
            setAddingToDb(false);
        }
    };

    if (loading) return <div className="h-screen flex items-center justify-center font-black text-[#2c4305] animate-pulse">LOADING PRAKRUTHI...</div>;

    return (
        <div className="min-h-screen bg-[#fcfdfa] p-4 lg:p-8 space-y-8 max-w-7xl mx-auto">

            {/* --- FILTER SECTION --- */}
            <div className="bg-white rounded-[2.5rem] shadow-xl shadow-[#2c4305]/5 border border-gray-100 p-6 lg:p-8">
                <div className="flex flex-col space-y-6">
                    <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
                        <div className="relative w-full lg:max-w-md">
                            <MdSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-[#2c4305]" size={22} />
                            <input
                                type="text"
                                placeholder="Search products..."
                                className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-[#2c4305]/20 transition-all outline-none"
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={() => { setSelectedCategory('All'); setSelectedSubcategory('All'); setSelectedInnercategory('All'); }}
                            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-red-500 hover:bg-red-50 px-6 py-3 rounded-xl transition-all"
                        >
                            <MdRestartAlt size={18} /> Reset Filters
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-[#2c4305] uppercase ml-2 flex items-center gap-1">
                                <MdFilterAlt /> Main Category
                            </label>
                            <select
                                value={selectedCategory}
                                onChange={(e) => { setSelectedCategory(e.target.value); setSelectedSubcategory('All'); setSelectedInnercategory('All'); }}
                                className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl text-xs font-black text-slate-700 appearance-none focus:ring-2 focus:ring-[#2c4305]/20 cursor-pointer"
                            >
                                <option value="All">All Categories</option>
                                {categories.filter(c => c.level === 'main').map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-[#2c4305] uppercase ml-2 flex items-center gap-1">
                                <MdFilterAlt className="opacity-50" /> Sub Category
                            </label>
                            <select
                                disabled={selectedCategory === 'All'}
                                value={selectedSubcategory}
                                onChange={(e) => { setSelectedSubcategory(e.target.value); setSelectedInnercategory('All'); }}
                                className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl text-xs font-black text-slate-700 appearance-none disabled:opacity-40 focus:ring-2 focus:ring-[#2c4305]/20 cursor-pointer"
                            >
                                <option value="All">All Sub-Categories</option>
                                {categories.filter(c => c.parent_id === selectedCategory).map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                            </select>
                        </div>

                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-[#2c4305] uppercase ml-2 flex items-center gap-1">
                                <MdFilterAlt className="opacity-30" /> Inner Category
                            </label>
                            <select
                                disabled={selectedSubcategory === 'All'}
                                value={selectedInnercategory}
                                onChange={(e) => setSelectedInnercategory(e.target.value)}
                                className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl text-xs font-black text-slate-700 appearance-none disabled:opacity-40 focus:ring-2 focus:ring-[#2c4305]/20 cursor-pointer"
                            >
                                <option value="All">All Inner-Categories</option>
                                {categories.filter(c => c.parent_id === selectedSubcategory).map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- PRODUCT GRID --- */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {filteredProducts.map((product) => {
                    const selectedVariant = selectedVariants[product.id];
                    const isOutOfStock = !selectedVariant || selectedVariant.stock <= 0;
                    
                    // isInCart checks for BOTH product_id and the currently selected variant_id
                    const isInCart = selectedVariant && cartItems.some(item => 
                        item.product_id === product.id && item.variant_id === selectedVariant.id
                    );
                    
                    // PRICE LOGIC: Pull from selectedVariant
                    const rawPrice = selectedVariant ? Number(selectedVariant[activeKeys.price]) : 0;
                    const discount = selectedVariant ? Number(selectedVariant[activeKeys.discount]) : 0;
                    const finalPrice = rawPrice * (1 - discount / 100);

                    return (
                        <div key={product.id} className="bg-white rounded-[2rem] border border-gray-100 flex flex-col overflow-hidden hover:shadow-xl transition-all duration-300 group">
                            
                            {/* 1. Image Container */}
                            <div className="h-44 bg-gray-50/50 p-6 relative overflow-hidden">
                                {discount > 0 && (
                                    <div className="absolute top-3 right-3 z-10 bg-red-500 text-white px-2 py-1 rounded-full text-[8px] font-black flex items-center gap-1 shadow-md">
                                        <MdLocalOffer /> {discount}% OFF
                                    </div>
                                )}
                                <img
                                    src={product.image_url}
                                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                                    alt={product.product_name}
                                />
                            </div>

                            {/* 2. Content Area */}
                            <div className="p-4 flex flex-col flex-1">
                                <span className="bg-[#2c4305]/5 text-[#2c4305] text-[8px] font-black uppercase px-2 py-0.5 rounded-md w-fit mb-2">
                                    {getCategoryPath(product.category, product.subcategory)}
                                </span>

                                <h3 className="text-[13px] font-black text-slate-800 leading-snug mb-2 min-h-[2rem] line-clamp-2">
                                    {product.product_name}
                                </h3>

                                {/* Variant Selector */}
                                <div className="flex gap-1.5 mb-4 flex-wrap">
                                    {product.product_variants?.map((v: any) => (
                                        <button
                                            key={v.id}
                                            onClick={() => setSelectedVariants({ ...selectedVariants, [product.id]: v })}
                                            className={`text-[8px] px-2.5 py-1.5 rounded-lg border font-black transition-all ${selectedVariant?.id === v.id ? 'bg-[#1a2b4b] text-white border-[#1a2b4b]' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-200'}`}
                                        >
                                            {v.quantity_value}{v.quantity_unit}
                                        </button>
                                    ))}
                                </div>

                                {/* 3. Footer Section (Price + Button) */}
                                <div className="mt-auto pt-2 border-t border-gray-50 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            {discount > 0 && <span className="text-[9px] font-bold text-gray-300 line-through block leading-none">₹{rawPrice}</span>}
                                            <span className="text-lg font-black text-slate-900 tracking-tight">₹{finalPrice.toFixed(2)}</span>
                                        </div>
                                        <div className={`text-[8px] font-black px-2 py-1 rounded-md ${isOutOfStock ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-700'}`}>
                                            {isOutOfStock ? 'OUT' : `STOCK: ${selectedVariant?.stock}`}
                                        </div>
                                    </div>

                                    {isOutOfStock ? (
                                        <button disabled className="w-full py-3 rounded-xl bg-gray-100 text-gray-400 font-black text-[10px] uppercase tracking-wider cursor-not-allowed">Sold Out</button>
                                    ) : isInCart ? (
                                        <button onClick={() => router.push('/pages/cart')} className="w-full py-3 rounded-xl bg-[#1a2b4b] text-white font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-2">
                                            <MdArrowForward size={14} /> In Cart
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => { setModalData({ product, variant: selectedVariant }); setOrderQty(25); setShowModal(true); }}
                                            className="w-full py-3 rounded-xl bg-[#2c4305] text-white font-black text-[10px] uppercase tracking-wider flex items-center justify-center gap-2 hover:bg-black transition-all shadow-md shadow-[#2c4305]/10"
                                        >
                                            <MdShoppingCart size={14} /> Add to Basket
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* --- MODAL (QUANTITY SELECTOR) --- */}
            {showModal && modalData && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white rounded-[3rem] w-full max-w-md overflow-hidden shadow-2xl">
                        <div className="p-6 flex justify-between items-center border-b border-gray-50">
                            <h2 className="font-black text-slate-800 uppercase text-xs tracking-[0.2em] ml-2">Order Quantity</h2>
                            <button onClick={() => setShowModal(false)} className="p-3 hover:bg-gray-100 rounded-full text-gray-400 transition-all"><MdClose size={24} /></button>
                        </div>

                        <div className="p-8 space-y-8 text-center">
                            <div className="bg-gray-50 rounded-3xl p-6">
                                <img src={modalData.product.image_url} className="h-36 mx-auto object-contain" alt="" />
                            </div>

                            <div>
                                <p className="text-[#2c4305] font-black uppercase text-[10px] tracking-widest mb-1">
                                    {getCategoryPath(modalData.product.category, modalData.product.subcategory, modalData.product.innercategory)}
                                </p>
                                <h4 className="text-xl font-black text-slate-900 leading-tight">{modalData.product.product_name}</h4>
                                <div className="mt-2 inline-block px-4 py-1 bg-[#1a2b4b] text-white text-[10px] font-black rounded-full uppercase">
                                    Pack Size: {modalData.variant.quantity_value}{modalData.variant.quantity_unit}
                                </div>
                            </div>

                            <div className="flex items-center justify-center gap-10 bg-gray-50 p-8 rounded-[2.5rem]">
                                <button 
                                    onClick={() => setOrderQty(Math.max(25, orderQty - 1))} 
                                    className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center shadow-md text-slate-400 hover:text-red-500 transition-colors disabled:opacity-20" 
                                    disabled={orderQty <= 25}
                                >
                                    <MdRemove size={28} />
                                </button>
                                <div className="flex flex-col">
                                    <span className="text-5xl font-black text-slate-900 tabular-nums leading-none">{orderQty}</span>
                                    <span className="text-[10px] font-bold text-gray-400 uppercase mt-1">Units</span>
                                </div>
                                <button 
                                    onClick={() => setOrderQty(Math.min(modalData.variant.stock, orderQty + 1))} 
                                    className="w-14 h-14 bg-[#2c4305] text-white rounded-2xl flex items-center justify-center shadow-lg shadow-[#2c4305]/30 hover:bg-black transition-all"
                                >
                                    <MdAdd size={28} />
                                </button>
                            </div>

                            <button
                                onClick={() => handleConfirmAdd(false)}
                                disabled={addingToDb}
                                className="w-full bg-[#2c4305] text-white py-6 rounded-[2rem] font-black text-xs uppercase tracking-[0.3em] shadow-xl shadow-[#2c4305]/20 hover:bg-black transition-all disabled:opacity-50"
                            >
                                {addingToDb ? 'Processing...' : 'Confirm & Add'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
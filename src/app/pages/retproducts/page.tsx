'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase';
import { 
    MdShoppingCart, MdSearch, MdClose, MdAdd, 
    MdRemove, MdArrowForward, MdLocalOffer, MdFilterAlt, MdRestartAlt, MdInfoOutline 
} from 'react-icons/md';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

// Interfaces for Type Safety
interface Category {
    id: string;
    name: string;
    parent_id: string | null;
    level: 'main' | 'sub' | 'inner';
}

const RETAILER_MOQ = 25;

export default function RetailerProductsPage() {
    const supabase = createClient();
    const router = useRouter();

    // --- State Management ---
    const [products, setProducts] = useState<any[]>([]);
    const [cartItems, setCartItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState('retailer outlet');
    const [searchQuery, setSearchQuery] = useState('');
    
    // Category States
    const [categories, setCategories] = useState<Category[]>([]);
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [selectedSubcategory, setSelectedSubcategory] = useState('All');
    const [selectedInnercategory, setSelectedInnercategory] = useState('All');
    
    // Product/Variant States
    const [selectedVariants, setSelectedVariants] = useState<{ [key: number]: any }>({});
    const [showModal, setShowModal] = useState(false);
    const [modalData, setModalData] = useState<any>(null);
    const [orderQty, setOrderQty] = useState(RETAILER_MOQ);
    const [addingToDb, setAddingToDb] = useState(false);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Get User Role
            const { data: dealer } = await supabase.from('dealers').select('role').eq('user_id', user.id).single();
            setUserRole(dealer?.role?.toLowerCase().trim() || 'retailer outlet');

            // 2. Get Categories
            const { data: categoriesData } = await supabase.from('categories').select('*').order('display_order', { ascending: true });
            setCategories(categoriesData || []);

            // 3. Get Products and Cart
            const { data: productsData } = await supabase.from('products').select(`*, product_variants (*)`).eq('active', true);
            const { data: cartData } = await supabase.from('dealer_cart').select('product_id, variant_id').eq('dealer_id', user.id);

            setCartItems(cartData || []);
            setProducts(productsData || []);

            // Set Initial Variants
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

    // Helper: Build the Breadcrumb Path
    const getCategoryPath = (catId: string, subId: string, innerId?: string) => {
        const c = categories.find(i => i.id === catId)?.name;
        const s = categories.find(i => i.id === subId)?.name;
        const inCat = innerId ? categories.find(i => i.id === innerId)?.name : null;
        return [c, s, inCat].filter(Boolean).join(' • ');
    };

    // Pricing Logic based on Role
    const activeKeys = (() => {
        switch (userRole) {
            case 'main dealer':
            case 'dealer': return { price: 'dealer_price', discount: 'dealer_discount' };
            case 'sub dealer': return { price: 'subdealer_price', discount: 'subdealer_discount' };
            case 'retailer outlet': 
            case 'retailer': return { price: 'retail_price', discount: 'retail_discount' };
            default: return { price: 'customer_price', discount: 'customer_discount' };
        }
    })();

    // Filter Logic
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
            const finalPrice = variant[activeKeys.price] * (1 - variant[activeKeys.discount] / 100);

            await supabase.from('dealer_cart').upsert({
                dealer_id: user?.id, product_id: product.id, variant_id: variant.id,
                quantity: orderQty, price: finalPrice, payment_plan: 'full',
            }, { onConflict: 'dealer_id, product_id, variant_id' });

            setCartItems(prev => [...prev, { product_id: product.id, variant_id: variant.id }]);
            window.dispatchEvent(new Event('cartUpdated'));
            toast.success("Added to cart!");
            setShowModal(false);
            if (gotoCart) router.push('/pages/cart');
        } catch (err) {
            toast.error("Error adding to cart");
        } finally {
            setAddingToDb(false);
        }
    };

    if (loading) return <div className="h-screen flex items-center justify-center font-black text-[#2c4305] animate-pulse uppercase tracking-widest">Loading Catalog...</div>;

    return (
        <div className="min-h-screen bg-[#fcfdfa] p-4 lg:p-8 space-y-6 max-w-7xl mx-auto mb-20">
            
            {/* --- MULTI-LEVEL FILTER SECTION --- */}
            <div className="bg-white rounded-[2rem] shadow-xl shadow-[#2c4305]/5 border border-gray-100 p-5 lg:p-6 transition-all">
                <div className="flex flex-col space-y-5">
                    {/* Top Row: Search and Reset */}
                    <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
                        <div className="relative w-full lg:max-w-md">
                            <MdSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-[#2c4305]" size={20} />
                            <input 
                                type="text" 
                                placeholder="Search products..." 
                                className="w-full pl-11 pr-4 py-3 bg-gray-50 border-none rounded-xl text-sm font-bold text-slate-800 focus:ring-2 focus:ring-[#2c4305]/10 outline-none transition-all"
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <button 
                            onClick={() => { setSelectedCategory('All'); setSelectedSubcategory('All'); setSelectedInnercategory('All'); }}
                            className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-red-400 hover:text-red-600 px-4 py-2 rounded-lg transition-all"
                        >
                            <MdRestartAlt size={16}/> Reset All
                        </button>
                    </div>

                    {/* Bottom Row: Hierarchical Selectors */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Main Category */}
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-[#2c4305] uppercase ml-1 flex items-center gap-1 opacity-60">
                                <MdFilterAlt /> Main
                            </label>
                            <select 
                                value={selectedCategory}
                                onChange={(e) => { setSelectedCategory(e.target.value); setSelectedSubcategory('All'); setSelectedInnercategory('All'); }}
                                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-[11px] font-black text-slate-700 appearance-none focus:ring-1 focus:ring-[#2c4305]/20 cursor-pointer"
                            >
                                <option value="All">All Categories</option>
                                {categories.filter(c => c.level === 'main').map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                            </select>
                        </div>

                        {/* Sub Category */}
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-[#2c4305] uppercase ml-1 flex items-center gap-1 opacity-60">
                                <MdFilterAlt className="opacity-50" /> Sub
                            </label>
                            <select 
                                disabled={selectedCategory === 'All'}
                                value={selectedSubcategory}
                                onChange={(e) => { setSelectedSubcategory(e.target.value); setSelectedInnercategory('All'); }}
                                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-[11px] font-black text-slate-700 appearance-none disabled:opacity-30 focus:ring-1 focus:ring-[#2c4305]/20 cursor-pointer"
                            >
                                <option value="All">All Sub-Categories</option>
                                {categories.filter(c => c.parent_id === selectedCategory).map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                            </select>
                        </div>

                        {/* Inner Category */}
                        <div className="space-y-1.5">
                            <label className="text-[9px] font-black text-[#2c4305] uppercase ml-1 flex items-center gap-1 opacity-60">
                                <MdFilterAlt className="opacity-30" /> Inner
                            </label>
                            <select 
                                disabled={selectedSubcategory === 'All'}
                                value={selectedInnercategory}
                                onChange={(e) => setSelectedInnercategory(e.target.value)}
                                className="w-full px-4 py-3 bg-gray-50 border-none rounded-xl text-[11px] font-black text-slate-700 appearance-none disabled:opacity-30 focus:ring-1 focus:ring-[#2c4305]/20 cursor-pointer"
                            >
                                <option value="All">All Inner-Categories</option>
                                {categories.filter(c => c.parent_id === selectedSubcategory).map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* --- COMPACT PRODUCT GRID --- */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {filteredProducts.map((product) => {
                    const selectedVariant = selectedVariants[product.id];
                    const isOutOfStock = !selectedVariant || selectedVariant.stock < RETAILER_MOQ;
                    const isInCart = selectedVariant && cartItems.some(item => item.product_id === product.id && item.variant_id === selectedVariant.id);
                    
                    const rawPrice = selectedVariant ? Number(selectedVariant[activeKeys.price]) : 0;
                    const discount = selectedVariant ? Number(selectedVariant[activeKeys.discount]) : 0;
                    const finalPrice = rawPrice * (1 - discount / 100);

                    return (
                        <div key={product.id} className="bg-white rounded-[1.8rem] border border-gray-100 flex flex-col overflow-hidden hover:shadow-xl transition-all duration-300 group">
                            
                            <div className="h-44 bg-gray-50/50 p-6 relative flex items-center justify-center">
                                {discount > 0 && (
                                    <div className="absolute top-3 right-3 z-10 bg-red-500 text-white px-2.5 py-1 rounded-full text-[8px] font-black flex items-center gap-1 shadow-md">
                                        <MdLocalOffer /> {discount}% OFF
                                    </div>
                                )}
                                <img src={product.image_url} className="max-h-full object-contain group-hover:scale-105 transition-transform duration-500" alt="" />
                            </div>

                            <div className="p-4 flex flex-col flex-1">
                                {/* Displaying the breadcrumb path on the card */}
                                <span className="bg-[#2c4305]/5 text-[#2c4305] text-[8px] font-black uppercase px-2 py-0.5 rounded-md w-fit mb-2">
                                    {getCategoryPath(product.category, product.subcategory)}
                                </span>
                                
                                <h3 className="text-[13px] font-black text-slate-800 leading-snug mb-3 min-h-[2rem] line-clamp-2">
                                    {product.product_name}
                                </h3>

                                <div className="flex gap-1.5 mb-4 flex-wrap">
                                    {product.product_variants?.map((v: any) => (
                                        <button 
                                            key={v.id}
                                            onClick={() => setSelectedVariants({ ...selectedVariants, [product.id]: v })}
                                            className={`text-[8px] px-2.5 py-1.5 rounded-lg border font-black transition-all ${selectedVariant?.id === v.id ? 'bg-[#1a2b4b] text-white border-[#1a2b4b]' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300'}`}
                                        >
                                            {v.quantity_value}{v.quantity_unit}
                                        </button>
                                    ))}
                                </div>

                                <div className="mt-auto pt-3 border-t border-gray-50 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <div>
                                            {discount > 0 && <span className="text-[9px] font-bold text-gray-300 line-through block leading-none">₹{rawPrice.toFixed(0)}</span>}
                                            <span className="text-lg font-black text-slate-900 tracking-tight">₹{finalPrice.toFixed(2)}</span>
                                        </div>
                                        <div className={`text-[8px] font-black px-2 py-1 rounded-md ${isOutOfStock ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-700'}`}>
                                            {isOutOfStock ? 'LOW STOCK' : `STOCK: ${selectedVariant?.stock}`}
                                        </div>
                                    </div>

                                    {isOutOfStock ? (
                                        <button disabled className="w-full py-3 rounded-xl bg-gray-100 text-gray-400 font-black text-[10px] uppercase cursor-not-allowed">Insufficient Stock</button>
                                    ) : isInCart ? (
                                        <button onClick={() => router.push('/pages/cart')} className="w-full py-3 rounded-xl bg-[#1a2b4b] text-white font-black text-[10px] uppercase flex items-center justify-center gap-2">
                                            <MdArrowForward size={14} /> In Cart
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={() => { setModalData({ product, variant: selectedVariant }); setOrderQty(RETAILER_MOQ); setShowModal(true); }}
                                            className="w-full py-3 rounded-xl bg-[#2c4305] text-white font-black text-[10px] uppercase flex items-center justify-center gap-2 hover:bg-black transition-all shadow-md shadow-[#2c4305]/10"
                                        >
                                            <MdShoppingCart size={14} /> Add to Cart
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* --- QUANTITY SELECTOR MODAL --- */}
            {showModal && modalData && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-md">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-sm overflow-hidden shadow-2xl animate-in zoom-in duration-200">
                        <div className="p-5 flex justify-between items-center border-b border-gray-50">
                            <h2 className="font-black text-slate-800 uppercase text-[10px] tracking-widest ml-2">Select Quantity</h2>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400"><MdClose size={20} /></button>
                        </div>
                        
                        <div className="p-6 space-y-6 text-center">
                            <div className="h-32 flex items-center justify-center bg-gray-50 rounded-2xl p-4">
                                <img src={modalData.product.image_url} className="max-h-full object-contain" alt="" />
                            </div>
                            
                            <div>
                                <p className="text-[#2c4305] font-black uppercase text-[8px] tracking-[0.2em] mb-1">
                                    {getCategoryPath(modalData.product.category, modalData.product.subcategory, modalData.product.innercategory)}
                                </p>
                                <h4 className="text-[15px] font-black text-slate-900 leading-tight">{modalData.product.product_name}</h4>
                                <div className="mt-2 inline-block px-3 py-1 bg-[#1a2b4b] text-white text-[9px] font-black rounded-lg">
                                    Size: {modalData.variant.quantity_value}{modalData.variant.quantity_unit}
                                </div>
                            </div>

                            <div className="flex items-center justify-center gap-6 bg-gray-50/80 p-5 rounded-[2rem]">
                                <button 
                                    onClick={() => setOrderQty(Math.max(RETAILER_MOQ, orderQty - 1))} 
                                    className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm border border-gray-100 disabled:opacity-20 transition-all" 
                                    disabled={orderQty <= RETAILER_MOQ}
                                >
                                    <MdRemove size={22} />
                                </button>
                                <div className="flex flex-col">
                                    <span className="text-3xl font-black text-slate-900 leading-none">{orderQty}</span>
                                    <span className="text-[8px] font-bold text-gray-400 uppercase mt-1">Units</span>
                                </div>
                                <button 
                                    onClick={() => setOrderQty(Math.min(modalData.variant.stock, orderQty + 1))} 
                                    className="w-10 h-10 bg-[#1a2b4b] text-white rounded-xl flex items-center justify-center shadow-lg hover:bg-black transition-all"
                                    disabled={orderQty >= modalData.variant.stock}
                                >
                                    <MdAdd size={22} />
                                </button>
                            </div>

                            <div className="bg-amber-50 rounded-xl p-3 flex items-center gap-2 justify-center border border-amber-100">
                                <MdInfoOutline className="text-amber-600" size={14}/>
                                <p className="text-[8px] text-amber-700 font-bold uppercase tracking-tight">Min Order: {RETAILER_MOQ} units required</p>
                            </div>

                            <button 
                                onClick={() => handleConfirmAdd(false)} 
                                disabled={addingToDb} 
                                className="w-full bg-[#2c4305] text-white py-4 rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg shadow-[#2c4305]/10 hover:bg-black transition-all"
                            >
                                {addingToDb ? 'Adding...' : 'Confirm Order'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
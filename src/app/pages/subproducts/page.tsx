'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase';
import { MdShoppingCart, MdSearch, MdClose, MdAdd, MdRemove, MdArrowForward, MdLocalOffer, MdLayers } from 'react-icons/md';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function SubProductsPage() {
    const supabase = createClient();
    const router = useRouter();
    
    const [products, setProducts] = useState<any[]>([]);
    const [cartItems, setCartItems] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');
    const [selectedVariants, setSelectedVariants] = useState<{ [key: number]: any }>({});

    const [showModal, setShowModal] = useState(false);
    const [modalData, setModalData] = useState<any>(null);
    const [orderQty, setOrderQty] = useState(25); // Sub-dealers might have lower min-qty than main dealers
    const [addingToDb, setAddingToDb] = useState(false);

    // BRAND COLOR CONSTANT
    const brandColor = "#2c4305";

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Fetch products and variants
            const { data: productsData } = await supabase
                .from('products')
                .select(`*, product_variants (*)`)
                .eq('active', true);

            // Fetch Sub-Dealer specific cart
            const { data: cartData } = await supabase
                .from('dealer_cart')
                .select('product_id, variant_id')
                .eq('dealer_id', user.id);

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

    // Forces Sub-Dealer Pricing Keys
    const activeKeys = { price: 'subdealer_price', discount: 'subdealer_discount' };

    const isVariantInCart = (productId: number, variantId: number) => {
        return cartItems.some(item => item.product_id === productId && item.variant_id === variantId);
    };

    const handleConfirmAdd = async (gotoCart: boolean = false) => {
        setAddingToDb(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { product, variant } = modalData;

            const finalPrice = variant[activeKeys.price] * (1 - variant[activeKeys.discount] / 100);

            const cartItem = {
                dealer_id: user?.id,
                product_id: product.id,
                variant_id: variant.id,
                quantity: orderQty,
                price: finalPrice,
                payment_plan: 'full',
            };

            const { error } = await supabase
                .from('dealer_cart')
                .upsert(cartItem, { onConflict: 'dealer_id, product_id, variant_id' });

            if (error) throw error;

            setCartItems(prev => [...prev, { product_id: product.id, variant_id: variant.id }]);
            window.dispatchEvent(new Event('cartUpdated'));
            toast.success("Added to procurement cart");
            
            setShowModal(false);
            if (gotoCart) router.push('/pages/orders');
        } catch (err) {
            toast.error("Error adding to cart");
        } finally {
            setAddingToDb(false);
        }
    };

    const filteredProducts = products.filter(p => 
        p.product_name.toLowerCase().includes(searchQuery.toLowerCase()) && 
        (activeCategory === 'All' || p.category === activeCategory)
    );

    if (loading) return <div className="p-20 text-center font-black text-[#2c4305] animate-pulse">LOADING CATALOG...</div>;

    return (
        <div className="px-12 py-6 space-y-8 max-w-[1600px] mx-auto">
            
            {/* SEARCH & FILTER BAR */}
            <div className="bg-white p-4 rounded-[2rem] shadow-sm border border-gray-100 flex flex-col md:flex-row gap-6 justify-between items-center">
                <div className="flex gap-2 overflow-x-auto no-scrollbar">
                    {['All', 'Bird Food', 'Medicine', 'Fish Food'].map((cat) => (
                        <button 
                            key={cat} 
                            onClick={() => setActiveCategory(cat)} 
                            className={`px-6 py-2.5 rounded-xl text-[10px] font-black transition-all tracking-widest ${activeCategory === cat ? 'bg-[#2c4305] text-white shadow-lg' : 'bg-gray-50 text-gray-400 hover:bg-gray-100'}`}
                        >
                            {cat.toUpperCase()}
                        </button>
                    ))}
                </div>
                <div className="relative w-full md:w-96">
                    <MdSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input 
                        type="text" 
                        placeholder="Search products..." 
                        className="w-full pl-14 pr-6 py-4 bg-gray-50 border-transparent border focus:border-[#2c4305]/20 rounded-2xl text-xs font-bold outline-none transition-all" 
                        onChange={(e) => setSearchQuery(e.target.value)} 
                    />
                </div>
            </div>

            {/* PRODUCT GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
                {filteredProducts.map((product) => {
                    const selectedVariant = selectedVariants[product.id];
                    const isOutOfStock = !selectedVariant || selectedVariant.stock <= 0;
                    const isInCart = selectedVariant ? isVariantInCart(product.id, selectedVariant.id) : false;
                    
                    const rawPrice = selectedVariant ? Number(selectedVariant[activeKeys.price]) : 0;
                    const discountPercent = selectedVariant ? Number(selectedVariant[activeKeys.discount]) : 0;
                    const finalPrice = rawPrice * (1 - discountPercent / 100);

                    return (
                        <div key={product.id} className="bg-white rounded-[2.5rem] border border-gray-50 flex flex-col overflow-hidden hover:shadow-2xl hover:shadow-[#2c4305]/10 transition-all group relative">
                            {discountPercent > 0 && (
                                <div className="absolute top-5 left-5 z-10 bg-[#2c4305] text-white px-3 py-1 rounded-lg text-[9px] font-black flex items-center gap-1 shadow-lg">
                                    <MdLocalOffer /> {discountPercent}% OFF
                                </div>
                            )}

                            <div className="h-56 bg-gray-50/50 p-8 flex items-center justify-center relative overflow-hidden">
                                <img src={product.image_url} alt={product.product_name} className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500" />
                                <div className="absolute inset-0 bg-[#2c4305]/0 group-hover:bg-[#2c4305]/5 transition-colors"></div>
                            </div>

                            <div className="p-6 flex flex-col flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                    <MdLayers className="text-[#2c4305] text-xs" />
                                    <p className="text-[9px] font-black text-[#2c4305] uppercase tracking-widest">{product.subcategory}</p>
                                </div>
                                <h3 className="text-sm font-black text-slate-800 line-clamp-2 mb-4 h-10 leading-snug tracking-tight">{product.product_name}</h3>

                                {/* VARIANT SELECTOR */}
                                <div className="flex gap-2 mb-6 flex-wrap">
                                    {product.product_variants?.map((v: any) => (
                                        <button 
                                            key={v.id} 
                                            onClick={() => setSelectedVariants({ ...selectedVariants, [product.id]: v })} 
                                            className={`text-[9px] px-3 py-2 rounded-xl border font-black transition-all ${selectedVariant?.id === v.id ? 'bg-[#2c4305] text-white border-[#2c4305] shadow-md' : 'bg-white text-gray-400 border-gray-100 hover:border-[#2c4305]/30 hover:text-[#2c4305]'}`}
                                        >
                                            {v.quantity_value} {v.quantity_unit}
                                        </button>
                                    ))}
                                </div>

                                <div className="mt-auto pt-4 border-t border-gray-50">
                                    <div className="flex justify-between items-end mb-5">
                                        <div>
                                            {discountPercent > 0 && <span className="text-[10px] font-bold text-gray-300 line-through block mb-0.5">₹{rawPrice}</span>}
                                            <span className="text-2xl font-black text-slate-900 tracking-tighter">₹{finalPrice.toFixed(2)}</span>
                                        </div>
                                        <span className={`text-[8px] font-black px-2 py-1 rounded-md tracking-tighter ${isOutOfStock ? 'bg-red-50 text-red-500' : 'bg-[#2c4305]/10 text-[#2c4305]'}`}>
                                            {isOutOfStock ? 'OUT OF STOCK' : `IN STOCK: ${selectedVariant?.stock}`}
                                        </span>
                                    </div>

                                    {isOutOfStock ? (
                                        <button disabled className="w-full py-4 rounded-2xl bg-gray-100 text-gray-400 font-black text-[10px] uppercase tracking-widest cursor-not-allowed">Sold Out</button>
                                    ) : isInCart ? (
                                        <button onClick={() => router.push('/pages/orders')} className="w-full py-4 rounded-2xl bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-black transition-all shadow-lg">
                                            <MdArrowForward size={14} /> In Cart
                                        </button>
                                    ) : (
                                        <button onClick={() => { setModalData({ product, variant: selectedVariant }); setShowModal(true); }} className="w-full py-4 rounded-2xl bg-[#2c4305] text-white font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2 hover:shadow-xl hover:shadow-[#2c4305]/20 transition-all shadow-md">
                                            <MdShoppingCart size={14} /> Add To Order
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

{showModal && modalData && (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-md">
        <div className="bg-white rounded-[3rem] w-full max-w-sm overflow-hidden shadow-2xl border border-white/20">
            <div className="p-8 space-y-8 text-center">
                <div className="relative">
                    <img src={modalData.product.image_url} className="h-40 mx-auto object-contain drop-shadow-2xl" />
                    <button onClick={() => setShowModal(false)} className="absolute -top-4 -right-4 p-2 bg-gray-50 hover:bg-gray-100 rounded-full text-gray-400 transition-colors"><MdClose size={20} /></button>
                </div>
                
                <div className="space-y-1">
                    <h4 className="text-xl font-black text-slate-900 leading-tight">{modalData.product.product_name}</h4>
                    <p className="text-[#2c4305] font-black uppercase text-[10px] tracking-widest">{modalData.variant.quantity_value} {modalData.variant.quantity_unit}</p>
                    {/* Added a helper text to show the minimum requirement */}
                    <p className="text-[9px] text-red-500 font-bold uppercase mt-2 italic">Minimum order: 25 units</p>
                </div>

                <div className="flex items-center justify-center gap-8 bg-gray-50/50 p-6 rounded-[2rem] border border-gray-100">
                    {/* PREVENT LESS THAN 25: Changed Math.max(1, ...) to Math.max(25, ...) */}
                    <button 
                        onClick={() => setOrderQty(Math.max(25, orderQty - 1))} 
                        className="w-12 h-12 bg-white rounded-xl flex items-center justify-center shadow-sm border border-gray-100 text-slate-400 disabled:opacity-30" 
                        disabled={orderQty <= 25}
                    >
                        <MdRemove size={20} />
                    </button>

                    <span className="text-4xl font-black text-slate-900 tabular-nums">{orderQty}</span>

                    <button 
                        onClick={() => setOrderQty(Math.min(modalData.variant.stock, orderQty + 1))} 
                        className="w-12 h-12 bg-[#2c4305] text-white rounded-xl flex items-center justify-center shadow-lg shadow-[#2c4305]/30 hover:scale-105 transition-transform"
                    >
                        <MdAdd size={20} />
                    </button>
                </div>

                <div className="flex flex-col gap-4">
                    <button onClick={() => handleConfirmAdd(false)} disabled={addingToDb} className="w-full bg-[#2c4305] text-white py-5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-xl shadow-[#2c4305]/20 hover:scale-[1.02] active:scale-95 transition-all">
                        {addingToDb ? 'Processing...' : `Add ${orderQty} to Cart`}
                    </button>
                    <button onClick={() => setShowModal(false)} className="text-[9px] font-black text-gray-400 uppercase tracking-widest hover:text-slate-600 transition-colors">Cancel</button>
                </div>
            </div>
        </div>
    </div>
)}
        </div>
    );
}
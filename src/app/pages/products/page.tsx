'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase';
import { MdShoppingCart, MdSearch, MdBlock, MdClose, MdAdd, MdRemove, MdCheckCircle, MdArrowForward, MdLocalOffer } from 'react-icons/md';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

export default function ProductsPage() {
    const supabase = createClient();
    const router = useRouter();
    
    const [products, setProducts] = useState<any[]>([]);
    const [cartItems, setCartItems] = useState<any[]>([]); // Changed to store full objects to track variants
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');
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

            const { data: productsData } = await supabase
                .from('products')
                .select(`*, product_variants (*)`)
                .eq('active', true);

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

    const getRoleKeys = (role: string) => {
        switch (role) {
            case 'main dealer':
            case 'dealer': return { price: 'dealer_price', discount: 'dealer_discount' };
            case 'sub dealer': return { price: 'subdealer_price', discount: 'subdealer_discount' };
            case 'retailer outlet': return { price: 'retail_price', discount: 'retail_discount' };
            default: return { price: 'customer_price', discount: 'customer_discount' };
        }
    };

    const activeKeys = getRoleKeys(userRole);

    // Check if THIS SPECIFIC variant is in the cart
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
                variant_id: variant.id, // CRITICAL: Save the specific liter/kg variant
                quantity: orderQty,
                price: finalPrice,
                payment_plan: 'full',
            };

            const { error } = await supabase
                .from('dealer_cart')
                .upsert(cartItem, { onConflict: 'dealer_id, product_id, variant_id' });

            if (error) throw error;

            // Update local state
            setCartItems(prev => [...prev, { product_id: product.id, variant_id: variant.id }]);
            window.dispatchEvent(new Event('cartUpdated'));
            toast.success(`${variant.quantity_value}${variant.quantity_unit} added to cart!`);
            
            setShowModal(false);
            if (gotoCart) router.push('/pages/cart');
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

    return (
        <div className="p-4 space-y-6 max-w-7xl mx-auto">
            {/* ... Filters UI ... */}
            <div className="bg-white p-4 rounded-3xl shadow-sm border flex flex-col md:flex-row gap-4 justify-between items-center">
                 <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
                    {['All', 'Bird Food', 'Medicine', 'Fish Food'].map((cat) => (
                        <button key={cat} onClick={() => setActiveCategory(cat)} className={`px-5 py-2 rounded-full text-xs font-black transition-all ${activeCategory === cat ? 'bg-[#108542] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>{cat.toUpperCase()}</button>
                    ))}
                </div>
                <div className="relative w-full md:w-72">
                    <MdSearch className="absolute left-4 top-3 text-gray-400" size={20} />
                    <input type="text" placeholder="Search..." className="w-full pl-12 pr-4 py-3 bg-gray-50 border rounded-full text-sm outline-none focus:border-[#108542]" onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
            </div>

            {/* PRODUCT GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {filteredProducts.map((product) => {
                    const selectedVariant = selectedVariants[product.id];
                    const isOutOfStock = !selectedVariant || selectedVariant.stock <= 0;
                    const isInCart = selectedVariant ? isVariantInCart(product.id, selectedVariant.id) : false;
                    
                    const rawPrice = selectedVariant ? Number(selectedVariant[activeKeys.price]) : 0;
                    const discountPercent = selectedVariant ? Number(selectedVariant[activeKeys.discount]) : 0;
                    const finalPrice = rawPrice * (1 - discountPercent / 100);

                    return (
                        <div key={product.id} className="bg-white rounded-[2rem] border border-gray-100 flex flex-col overflow-hidden hover:shadow-xl transition-all group relative">
                            {discountPercent > 0 && (
                                <div className="absolute top-4 right-4 z-10 bg-red-500 text-white px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-1">
                                    <MdLocalOffer /> {discountPercent}% OFF
                                </div>
                            )}

                            <div className="h-48 bg-gray-50 p-6">
                                <img src={product.image_url} alt={product.product_name} className="w-full h-full object-contain group-hover:scale-110 transition-transform" />
                            </div>

                            <div className="p-5 flex flex-col flex-1">
                                <p className="text-[10px] font-black text-[#108542] uppercase mb-1">{product.subcategory}</p>
                                <h3 className="text-sm font-black text-slate-800 line-clamp-2 mb-3 h-10">{product.product_name}</h3>

                                {/* VARIANT SELECTOR - THIS UPDATES WHICH LITER/KG IS SELECTED */}
                                <div className="flex gap-2 mb-4 flex-wrap">
                                    {product.product_variants?.map((v: any) => (
                                        <button 
                                            key={v.id} 
                                            onClick={() => setSelectedVariants({ ...selectedVariants, [product.id]: v })} 
                                            className={`text-[10px] px-3 py-1.5 rounded-xl border font-black transition-all ${selectedVariant?.id === v.id ? 'bg-[#1a2b4b] text-white border-[#1a2b4b]' : 'bg-white text-gray-400 border-gray-100 hover:border-gray-300'}`}
                                        >
                                            {v.quantity_value} {v.quantity_unit}
                                        </button>
                                    ))}
                                </div>

                                <div className="mt-auto">
                                    <div className="flex justify-between items-end mb-4">
                                        <div>
                                            {discountPercent > 0 && <span className="text-xs font-bold text-gray-300 line-through block">₹{rawPrice}</span>}
                                            <span className="text-xl font-black text-slate-900">₹{finalPrice.toFixed(2)}</span>
                                        </div>
                                        <span className={`text-[9px] font-black px-2 py-1 rounded-lg ${isOutOfStock ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'}`}>
                                            {isOutOfStock ? 'SOLD OUT' : `STOCK: ${selectedVariant?.stock}`}
                                        </span>
                                    </div>

                                    {isOutOfStock ? (
                                        <button disabled className="w-full py-4 rounded-2xl bg-gray-100 text-gray-400 font-black text-[10px] uppercase cursor-not-allowed">Out of Stock</button>
                                    ) : isInCart ? (
                                        <button onClick={() => router.push('/pages/cart')} className="w-full py-4 rounded-2xl bg-[#1a2b4b] text-white font-black text-[10px] uppercase flex items-center justify-center gap-2">
                                            <MdArrowForward size={16} /> View in Cart
                                        </button>
                                    ) : (
                                        <button onClick={() => { setModalData({ product, variant: selectedVariant }); setShowModal(true); }} className="w-full py-4 rounded-2xl bg-[#108542] text-white font-black text-[10px] uppercase flex items-center justify-center gap-2 hover:bg-[#0d6e36] transition-colors">
                                            <MdShoppingCart size={16} /> Add to Cart
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* --- MODAL --- */}
            {showModal && modalData && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl">
                        <div className="p-6 flex justify-between items-center border-b">
                            <h2 className="font-black text-slate-800 uppercase text-sm">Select Quantity</h2>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400"><MdClose size={24} /></button>
                        </div>
                        
                        <div className="p-8 space-y-6 text-center">
                            <img src={modalData.product.image_url} className="h-32 mx-auto object-contain" />
                            <div>
                                <h4 className="text-lg font-black text-slate-900">{modalData.product.product_name}</h4>
                                <p className="text-[#108542] font-black uppercase text-xs">{modalData.variant.quantity_value} {modalData.variant.quantity_unit}</p>
                            </div>

                            <div className="flex items-center justify-center gap-8 bg-gray-50 p-6 rounded-3xl">
                                <button onClick={() => setOrderQty(Math.max(25, orderQty - 1))} className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border disabled:opacity-30" disabled={orderQty <= 25}><MdRemove size={24} /></button>
                                <span className="text-4xl font-black text-slate-900">{orderQty}</span>
                                <button onClick={() => setOrderQty(Math.min(modalData.variant.stock, orderQty + 1))} className="w-12 h-12 bg-[#1a2b4b] text-white rounded-2xl flex items-center justify-center shadow-lg"><MdAdd size={24} /></button>
                            </div>

                            <div className="flex flex-col gap-3">
                                <button onClick={() => handleConfirmAdd(false)} disabled={addingToDb} className="w-full bg-[#108542] text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg">
                                    {addingToDb ? 'SAVING...' : `Add ${orderQty} Units`}
                                </button>
                                <button onClick={() => handleConfirmAdd(true)} className="w-full py-4 text-slate-500 font-black text-[10px] uppercase tracking-widest">Add & Checkout</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
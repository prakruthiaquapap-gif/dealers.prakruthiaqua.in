'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase';
import { 
    MdShoppingCart, MdSearch, MdBlock, MdClose, 
    MdAdd, MdRemove, MdArrowForward, MdLocalOffer, MdInfoOutline 
} from 'react-icons/md';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';

// Constant for Retailer MOQ
const RETAILER_MOQ = 25; 

export default function RetailerProductsPage() {
    const supabase = createClient();
    const router = useRouter();
    
    // State Management
    const [products, setProducts] = useState<any[]>([]);
    const [cartItems, setCartItems] = useState<any[]>([]); 
    const [loading, setLoading] = useState(true);
    const [userRole, setUserRole] = useState('retailer outlet');
    const [searchQuery, setSearchQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');
    const [selectedVariants, setSelectedVariants] = useState<{ [key: number]: any }>({});

    // Modal State
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

            const { data: dealer } = await supabase
                .from('dealers')
                .select('role')
                .eq('user_id', user.id)
                .single();
            
            const role = dealer?.role?.toLowerCase().trim() || 'retailer outlet';
            setUserRole(role);

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
                if (p.product_variants?.length > 0) {
                    initialVariants[p.id] = p.product_variants[0];
                }
            });
            setSelectedVariants(initialVariants);
        } catch (err) {
            toast.error("Failed to load catalog");
        } finally {
            setLoading(false);
        }
    };

    const getRoleConfig = (role: string) => {
        switch (role) {
            case 'main dealer':
            case 'dealer': return { price: 'dealer_price', discount: 'dealer_discount' };
            case 'sub dealer': return { price: 'subdealer_price', discount: 'subdealer_discount' };
            case 'retailer outlet': 
            case 'retailer': return { price: 'retail_price', discount: 'retail_discount' };
            default: return { price: 'customer_price', discount: 'customer_discount' };
        }
    };

    const roleConfig = getRoleConfig(userRole);

    const isVariantInCart = (productId: number, variantId: number) => {
        return cartItems.some(item => item.product_id === productId && item.variant_id === variantId);
    };

    const handleOpenModal = (product: any, variant: any) => {
        // Validation: If stock is less than MOQ, we shouldn't even let them open it
        if (variant.stock < RETAILER_MOQ) {
            toast.error(`Insufficient stock. Minimum order is ${RETAILER_MOQ} units.`);
            return;
        }
        setModalData({ product, variant });
        setOrderQty(RETAILER_MOQ); // Force start at 25
        setShowModal(true);
    };

    const handleConfirmAdd = async (gotoCart: boolean = false) => {
        // Final Safety Check
        if (orderQty < RETAILER_MOQ) {
            toast.error(`Minimum order quantity is ${RETAILER_MOQ}`);
            return;
        }
        
        setAddingToDb(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { product, variant } = modalData;

            const unitPrice = Number(variant[roleConfig.price]);
            const discount = Number(variant[roleConfig.discount]);
            const finalPrice = unitPrice * (1 - discount / 100);

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

            setCartItems(prev => {
                const exists = prev.some(i => i.product_id === product.id && i.variant_id === variant.id);
                return exists ? prev : [...prev, { product_id: product.id, variant_id: variant.id }];
            });

            window.dispatchEvent(new Event('cartUpdated'));
            toast.success("Added to cart");
            setShowModal(false);
            if (gotoCart) router.push('/pages/cart');
        } catch (err) {
            toast.error("Error updating cart");
        } finally {
            setAddingToDb(false);
        }
    };

    const filteredProducts = products.filter(p => 
        p.product_name.toLowerCase().includes(searchQuery.toLowerCase()) && 
        (activeCategory === 'All' || p.category === activeCategory)
    );

    if (loading) return <div className="p-20 text-center font-bold text-gray-400">Loading Catalog...</div>;

    return (
        <div className="p-4 space-y-6 max-w-7xl mx-auto mb-20">
            {/* SEARCH & FILTER BAR */}
            <div className="bg-white p-4 rounded-3xl shadow-sm border flex flex-col md:flex-row gap-4 justify-between items-center">
                <div className="flex gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
                    {['All', 'Bird Food', 'Medicine', 'Fish Food'].map((cat) => (
                        <button 
                            key={cat} 
                            onClick={() => setActiveCategory(cat)} 
                            className={`px-5 py-2 rounded-full text-xs font-black whitespace-nowrap transition-all ${activeCategory === cat ? 'bg-[#108542] text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
                        >
                            {cat.toUpperCase()}
                        </button>
                    ))}
                </div>
                <div className="relative w-full md:w-72">
                    <MdSearch className="absolute left-4 top-3 text-gray-400" size={20} />
                    <input 
                        type="text" 
                        placeholder="Search products..." 
                        className="w-full pl-12 pr-4 py-3 bg-gray-50 border rounded-full text-sm outline-none focus:border-[#108542]" 
                        onChange={(e) => setSearchQuery(e.target.value)} 
                    />
                </div>
            </div>

            {/* PRODUCT GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {filteredProducts.map((product) => {
                    const selectedVariant = selectedVariants[product.id];
                    const isOutOfStock = !selectedVariant || selectedVariant.stock < RETAILER_MOQ; // Out of stock if less than MOQ
                    const isInCart = selectedVariant ? isVariantInCart(product.id, selectedVariant.id) : false;
                    
                    const rawPrice = selectedVariant ? Number(selectedVariant[roleConfig.price]) : 0;
                    const discountPercent = selectedVariant ? Number(selectedVariant[roleConfig.discount]) : 0;
                    const finalPrice = rawPrice * (1 - discountPercent / 100);

                    return (
                        <div key={product.id} className="bg-white rounded-[2rem] border border-gray-100 flex flex-col overflow-hidden hover:shadow-xl transition-all group relative">
                            {discountPercent > 0 && (
                                <div className="absolute top-4 right-4 z-10 bg-red-500 text-white px-3 py-1 rounded-full text-[10px] font-black flex items-center gap-1">
                                    <MdLocalOffer /> {discountPercent}% OFF
                                </div>
                            )}

                            <div className="h-48 bg-gray-50 p-6 flex items-center justify-center">
                                <img src={product.image_url} alt={product.product_name} className="max-h-full object-contain group-hover:scale-110 transition-transform" />
                            </div>

                            <div className="p-5 flex flex-col flex-1">
                                <p className="text-[10px] font-black text-[#108542] uppercase mb-1">{product.subcategory}</p>
                                <h3 className="text-sm font-black text-slate-800 line-clamp-2 mb-3 h-10">{product.product_name}</h3>

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
                                            {discountPercent > 0 && <span className="text-xs font-bold text-gray-300 line-through block">₹{rawPrice.toFixed(2)}</span>}
                                            <span className="text-xl font-black text-slate-900">₹{finalPrice.toFixed(2)}</span>
                                        </div>
                                        <span className={`text-[9px] font-black px-2 py-1 rounded-lg ${isOutOfStock ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-600'}`}>
                                            {isOutOfStock ? 'LOW STOCK' : `STOCK: ${selectedVariant?.stock}`}
                                        </span>
                                    </div>

                                    {isOutOfStock ? (
                                        <button disabled className="w-full py-4 rounded-2xl bg-gray-100 text-gray-400 font-black text-[10px] uppercase cursor-not-allowed">Insufficient Stock</button>
                                    ) : isInCart ? (
                                        <button onClick={() => router.push('/pages/cart')} className="w-full py-4 rounded-2xl bg-[#1a2b4b] text-white font-black text-[10px] uppercase flex items-center justify-center gap-2">
                                            <MdArrowForward size={16} /> Already in Cart
                                        </button>
                                    ) : (
                                        <button 
                                            onClick={() => handleOpenModal(product, selectedVariant)} 
                                            className="w-full py-4 rounded-2xl bg-[#108542] text-white font-black text-[10px] uppercase flex items-center justify-center gap-2 hover:bg-[#0d6e36]"
                                        >
                                            <MdShoppingCart size={16} /> Add to Cart
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* --- QUANTITY MODAL --- */}
            {showModal && modalData && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-[2.5rem] w-full max-w-md overflow-hidden shadow-2xl">
                        <div className="p-6 flex justify-between items-center border-b">
                            <h2 className="font-black text-slate-800 uppercase text-sm">Set Order Quantity</h2>
                            <button onClick={() => setShowModal(false)} className="p-2 hover:bg-gray-100 rounded-full text-gray-400"><MdClose size={24} /></button>
                        </div>
                        
                        <div className="p-8 space-y-6 text-center">
                            <img src={modalData.product.image_url} className="h-32 mx-auto object-contain" />
                            <div>
                                <h4 className="text-lg font-black text-slate-900 line-clamp-1">{modalData.product.product_name}</h4>
                                <p className="text-[#108542] font-black uppercase text-xs">Variant: {modalData.variant.quantity_value} {modalData.variant.quantity_unit}</p>
                                <div className="mt-2 inline-flex items-center gap-1 text-[10px] bg-amber-50 text-amber-600 px-3 py-1 rounded-full font-bold">
                                    <MdInfoOutline /> Minimum Order: {RETAILER_MOQ} Units
                                </div>
                            </div>

                            <div className="flex items-center justify-center gap-8 bg-gray-50 p-6 rounded-3xl">
                                <button 
                                    onClick={() => setOrderQty(Math.max(RETAILER_MOQ, orderQty - 1))} 
                                    className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border disabled:opacity-30" 
                                    disabled={orderQty <= RETAILER_MOQ}
                                >
                                    <MdRemove size={24} />
                                </button>
                                <span className="text-4xl font-black text-slate-900">{orderQty}</span>
                                <button 
                                    onClick={() => setOrderQty(Math.min(modalData.variant.stock, orderQty + 1))} 
                                    className="w-12 h-12 bg-[#1a2b4b] text-white rounded-2xl flex items-center justify-center shadow-lg"
                                    disabled={orderQty >= modalData.variant.stock}
                                >
                                    <MdAdd size={24} />
                                </button>
                            </div>

                            <div className="flex flex-col gap-3">
                                <button 
                                    onClick={() => handleConfirmAdd(false)} 
                                    disabled={addingToDb} 
                                    className="w-full bg-[#108542] text-white py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg active:scale-95 transition-transform"
                                >
                                    {addingToDb ? 'ADDING...' : `Add ${orderQty} to Order`}
                                </button>
                                <button onClick={() => handleConfirmAdd(true)} className="w-full py-2 text-slate-400 font-bold text-[10px] uppercase">Add & View Cart</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase';
import {
  FiSearch, FiEdit2, FiDownload,
  FiCheckCircle, FiPackage, FiChevronDown, FiChevronUp, FiFilter, FiActivity
} from 'react-icons/fi';
import toast, { Toaster } from 'react-hot-toast';

interface Variant {
  id: number;
  quantity_value: string;
  quantity_unit: string;
  stock: number;
  supplier_price: number;
  dealer_price: number;
  subdealer_price: number;
  retail_price: number;
  customer_price: number;
  supplier_discount: number;
  dealer_discount: number;
  subdealer_discount: number;
  retail_discount: number;
  customer_discount: number;
  products: {
    id: number;
    product_name: string;
    category: string;
    active: boolean;
  };
}

type PriceKeys = 'supplier_price' | 'dealer_price' | 'subdealer_price' | 'retail_price' | 'customer_price';
type DiscKeys = 'supplier_discount' | 'dealer_discount' | 'subdealer_discount' | 'retail_discount' | 'customer_discount';

interface PriceTier {
  key: PriceKeys;
  discKey: DiscKeys;
  label: string;
  color: string;
}

const CATEGORIES = ['Medicine', 'Fish Food', 'Bird Food'];
const ITEMS_PER_PAGE = 10;
const BRAND_COLOR = "#2c4305";

const PRICE_TIERS: PriceTier[] = [
  { key: 'supplier_price', discKey: 'supplier_discount', label: 'Supplier', color: '#6366f1' },
  { key: 'dealer_price', discKey: 'dealer_discount', label: 'Dealer', color: '#8b5cf6' },
  { key: 'subdealer_price', discKey: 'subdealer_discount', label: 'Sub-Dealer', color: '#ec4899' },
  { key: 'retail_price', discKey: 'retail_discount', label: 'Retail', color: '#f59e0b' },
  { key: 'customer_price', discKey: 'customer_discount', label: 'Customer', color: '#10b981' },
];

export default function PricingManagement() {
  const supabase = createClient();

  const [variants, setVariants] = useState<Variant[]>([]);
  const [filteredVariants, setFilteredVariants] = useState<Variant[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [currentPage, setCurrentPage] = useState(1);

  const [showEditModal, setShowEditModal] = useState(false);
  const [editingVariant, setEditingVariant] = useState<Variant | null>(null);
  const [currentPrices, setCurrentPrices] = useState<{
    stock?: string;
    supplier_price?: string;
    dealer_price?: string;
    subdealer_price?: string;
    retail_price?: string;
    customer_price?: string;
    supplier_discount?: string;
    dealer_discount?: string;
    subdealer_discount?: string;
    retail_discount?: string;
    customer_discount?: string;
  }>({});
  const [isMobile, setIsMobile] = useState(false);
  const [expandedCard, setExpandedCard] = useState<number | null>(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 1024);
    window.addEventListener('resize', handleResize);
    setIsMobile(window.innerWidth < 1024);
    fetchVariants();
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchVariants = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('product_variants')
        .select('*, products!inner(id, product_name, category, active)')
        .order('id', { ascending: true });
      if (error) throw error;
      const activeOnly = data?.filter((v) => v.products?.active) || [];
      setVariants(activeOnly);
      setFilteredVariants(activeOnly);
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let result = variants.filter(v => {
      const matchesCat = selectedCategory === 'All Categories' || v.products?.category === selectedCategory;
      const matchesSearch = v.products?.product_name?.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesCat && matchesSearch;
    });
    setFilteredVariants(result);
    setCurrentPage(1);
  }, [searchTerm, selectedCategory, variants]);

  const currentItems = filteredVariants.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
  const totalPages = Math.ceil(filteredVariants.length / ITEMS_PER_PAGE);

  const savePricing = async () => {
    if (!editingVariant) return;
    try {
      const updates: any = {};
      PRICE_TIERS.forEach(t => {
        updates[t.key] = parseFloat(String(currentPrices[t.key] ?? '0')) || 0;
        updates[t.discKey] = parseFloat(String(currentPrices[t.discKey] ?? '0')) || 0;
      });
      updates.stock = parseInt(String(currentPrices.stock ?? '0'), 10) || 0;
      updates.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('product_variants')
        .update(updates)
        .eq('id', editingVariant.id);

      if (error) throw error;

      setVariants(variants.map(v => v.id === editingVariant.id ? { ...v, ...updates } : v));
      setShowEditModal(false);
      toast.success('Inventory Updated Successfully');
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9FAF6] pb-20 font-sans">
      <Toaster position="top-center" />

      {/* Modern Header */}
      <div className="bg-white px-6 py-8 md:px-12 border-b border-gray-100">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-gray-900" style={{ color: BRAND_COLOR }}>
              Stock & Pricing
            </h1>
            <p className="text-gray-400 font-medium">Manage product inventory and multi-tier pricing</p>
          </div>
          <button className="px-6 py-3 bg-white border border-gray-200 text-gray-700 rounded-2xl font-bold text-sm hover:bg-gray-50 transition-all flex items-center gap-2 shadow-sm">
            <FiDownload /> Export CSV
          </button>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Filters Bar */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1 group">
            <FiSearch className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300 group-focus-within:text-gray-900 transition-colors" />
            <input
              placeholder="Search by product name..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 bg-white text-black rounded-2xl border border-gray-100 shadow-sm outline-none focus:ring-2 focus:ring-gray-200 transition-all font-medium text-sm"
            />
          </div>
          <div className="flex gap-2">
            <div className="flex items-center bg-white px-4 rounded-2xl border border-gray-100 shadow-sm">
              <FiFilter className="text-gray-400 mr-2" />
              <select
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value)}
                className="bg-transparent py-3.5 outline-none font-bold text-xs uppercase tracking-widest text-gray-600"
              >
                <option>All Categories</option>
                {CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="py-24 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-gray-200 border-t-gray-900 mb-4" />
            <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">Fetching Variants...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {isMobile ? (
              /* Mobile Card View */
              currentItems.map(v => (
                <div key={v.id} className="bg-white rounded-[2rem] border border-gray-100 shadow-sm overflow-hidden p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">{v.products?.category}</span>
                      <h3 className="font-black text-gray-900 text-lg leading-tight">{v.products?.product_name}</h3>
                      <p className="text-sm font-bold text-gray-500">{v.quantity_value} {v.quantity_unit}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-black text-gray-400 uppercase mb-1">Stock</p>
                      <span className={`px-3 py-1 rounded-lg text-xs font-black ${v.stock < 10 ? 'bg-red-50 text-red-600' : 'bg-green-50 text-green-700'}`}>
                        {v.stock} units
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3 mb-4">
                    {PRICE_TIERS.slice(0, 2).map(t => (
                      <div key={t.key} className="bg-gray-50 p-3 rounded-2xl">
                        <p className="text-[9px] font-black text-gray-400 uppercase tracking-tighter">{t.label}</p>
                        <p className="font-black text-gray-900">₹{(v[t.key] as any)}</p>
                      </div>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() => setExpandedCard(expandedCard === v.id ? null : v.id)}
                      className="flex-1 py-3 bg-gray-50 rounded-xl text-xs font-black uppercase tracking-widest text-gray-500"
                    >
                      {expandedCard === v.id ? 'Close' : 'View Prices'}
                    </button>
                    <button
                      onClick={() => {
                        setEditingVariant(v);
                        setCurrentPrices({
                          stock: String(v.stock),

                          supplier_price: String(v.supplier_price),
                          dealer_price: String(v.dealer_price),
                          subdealer_price: String(v.subdealer_price),
                          retail_price: String(v.retail_price),
                          customer_price: String(v.customer_price),

                          supplier_discount: String(v.supplier_discount),
                          dealer_discount: String(v.dealer_discount),
                          subdealer_discount: String(v.subdealer_discount),
                          retail_discount: String(v.retail_discount),
                          customer_discount: String(v.customer_discount),
                        });
                        setShowEditModal(true);
                      }}

                      className="flex-1 py-3 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-gray-200"
                      style={{ backgroundColor: BRAND_COLOR }}
                    >
                      Quick Edit
                    </button>
                  </div>

                  {expandedCard === v.id && (
                    <div className="mt-4 pt-4 border-t border-dashed grid grid-cols-1 gap-2 animate-in fade-in slide-in-from-top-2">
                      {PRICE_TIERS.map(t => (
                        <div key={t.key} className="flex justify-between items-center py-1">
                          <span className="text-xs font-bold text-gray-500">{t.label}</span>
                          <div className="text-right">
                            <span className="text-xs font-black text-gray-900 mr-2">₹{(v[t.key] as any)}</span>
                            <span className="text-[10px] font-bold text-green-600">-{v[t.discKey] as any}%</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ))
            ) : (
              /* Desktop Table View */
              <div className="bg-white rounded-[2.5rem] border border-gray-100 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                  <thead>
                    <tr className="bg-gray-50/50 border-b border-gray-50">
                      <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Product Info</th>
                      <th className="px-8 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">Stock Level</th>
                      {PRICE_TIERS.map(t => (
                        <th key={t.key} className="px-6 py-6 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t.label}</th>
                      ))}
                      <th className="px-8 py-6 text-right"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {currentItems.map(v => (
                      <tr key={v.id} className="hover:bg-[#F9FAF6] transition-colors group">
                        <td className="px-8 py-6">
                          <div className="font-black text-gray-900">{v.products?.product_name}</div>
                          <div className="text-[11px] font-bold text-gray-400 uppercase tracking-tight">
                            {v.quantity_value} {v.quantity_unit} • {v.products?.category}
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-1.5 w-20 bg-gray-100 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${v.stock < 10 ? 'bg-rose-500' : 'bg-emerald-500'}`}
                                style={{ width: `${Math.min(v.stock, 100)}%` }}
                              />
                            </div>
                            <span className="text-sm font-black text-gray-700">{v.stock}</span>
                          </div>
                        </td>
                        {PRICE_TIERS.map(t => (
                          <td key={t.key} className="px-6 py-6">
                            <div className="text-sm font-black text-gray-900">₹{(v[t.key] as any).toLocaleString()}</div>
                            <div className="text-[10px] font-bold text-green-600">
                              <FiActivity className="inline mr-1" />{v[t.discKey] as any}% Off
                            </div>
                          </td>
                        ))}
                        <td className="px-8 py-6 text-right">
                          <button
                            className="p-3 bg-white border border-gray-100 rounded-xl text-gray-400 hover:text-gray-900 hover:border-gray-300 transition-all shadow-sm"
                           onClick={() => {
  setEditingVariant(v);
  setCurrentPrices({
    stock: String(v.stock),

    supplier_price: String(v.supplier_price),
    dealer_price: String(v.dealer_price),
    subdealer_price: String(v.subdealer_price),
    retail_price: String(v.retail_price),
    customer_price: String(v.customer_price),

    supplier_discount: String(v.supplier_discount),
    dealer_discount: String(v.dealer_discount),
    subdealer_discount: String(v.subdealer_discount),
    retail_discount: String(v.retail_discount),
    customer_discount: String(v.customer_discount),
  });
  setShowEditModal(true);
}}

                          >
                            <FiEdit2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Pagination Section */}
        <div className="flex flex-col md:flex-row justify-between items-center mt-10 px-4 gap-6">
          <p className="text-xs font-bold text-gray-400 uppercase tracking-widest order-2 md:order-1">
            Showing {currentItems.length} of {filteredVariants.length} Products
          </p>

          <div className="flex items-center gap-2 order-1 md:order-2">
            {/* Previous Button */}
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              className="p-2.5 rounded-xl border border-gray-200 bg-white text-gray-600 disabled:opacity-30 hover:bg-gray-50 transition-colors"
            >
              <FiChevronUp className="-rotate-90" size={20} />
            </button>

            {/* Page Numbers */}
            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => {
                // Only show first, last, current, and pages near current
                if (
                  totalPages > 7 &&
                  page !== 1 &&
                  page !== totalPages &&
                  Math.abs(page - currentPage) > 1
                ) {
                  if (page === 2 || page === totalPages - 1) return <span key={page} className="px-1 text-gray-400">...</span>;
                  return null;
                }

                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-10 h-10 rounded-xl text-xs font-black transition-all ${currentPage === page
                      ? 'text-white shadow-lg shadow-gray-200'
                      : 'bg-white border border-gray-100 text-gray-400 hover:border-gray-300'
                      }`}
                    style={{ backgroundColor: currentPage === page ? BRAND_COLOR : '' }}
                  >
                    {page}
                  </button>
                );
              })}
            </div>

            {/* Next Button */}
            <button
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              className="p-2.5 rounded-xl border border-gray-200 bg-white text-gray-600 disabled:opacity-30 hover:bg-gray-50 transition-colors"
            >
              <FiChevronDown className="-rotate-90" size={20} />
            </button>
          </div>
        </div>
      </main>

      {/* Edit Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md flex justify-center items-center p-4 z-50">
          <div className="bg-white rounded-[3rem] p-10 w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-8">
              <div>
                <h3 className="text-2xl font-black text-gray-900 tracking-tight">Modify Inventory</h3>
                <p className="text-sm text-gray-400 font-medium">Update stock and price points for {editingVariant?.products.product_name}</p>
              </div>
              <div className="bg-gray-50 p-3 rounded-2xl text-gray-400">
                <FiPackage size={24} />
              </div>
            </div>

            <div className="mb-10 bg-gray-50 p-6 rounded-[2rem]">
              <label className="block text-[10px] font-black text-gray-400 mb-3 uppercase tracking-[0.2em]">Physical Stock Level</label>
              <div className="relative">
                <FiPackage className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                <input
                  type="number"
                  value={currentPrices.stock || ''}
                  onChange={e => setCurrentPrices({ ...currentPrices, stock: e.target.value })}
                  className="w-full text-black pl-12 pr-4 py-4 rounded-2xl border-none outline-none focus:ring-2 focus:ring-gray-200 font-black text-lg"
                  placeholder="Enter stock quantity (e.g., 0)"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 mb-10">
              {PRICE_TIERS.map(t => (
                <div key={t.key} className="p-4 rounded-2xl border border-gray-100 flex flex-col gap-3">
                  <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: t.color }}>{t.label} Tier</span>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="text-[9px] font-black text-gray-400 uppercase">Rate</label>
                      <input
                        type="number"
                        value={currentPrices[t.key] || ''}
                        onChange={e => setCurrentPrices({ ...currentPrices, [t.key]: e.target.value })}
                        className="w-full py-2 text-black bg-transparent border-b-2 border-gray-100 outline-none focus:border-gray-900 font-black transition-colors"
                        placeholder="0"
                      />
                    </div>
                    <div className="w-20">
                      <label className="text-[9px] font-black text-gray-400 uppercase">Disc%</label>
                      <input
                        type="number"
                        value={currentPrices[t.discKey] || ''}
                        onChange={e => setCurrentPrices({ ...currentPrices, [t.discKey]: e.target.value })}
                        className="w-full py-2 bg-transparent border-b-2 border-gray-100 outline-none focus:border-gray-900 font-black transition-colors text-green-600"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-4">
              <button
                onClick={() => setShowEditModal(false)}
                className="flex-1 py-4 rounded-2xl border border-gray-200 bg-white font-black text-xs uppercase tracking-widest text-gray-400 hover:text-gray-900 transition-all"
              >
                Discard
              </button>
              <button
                onClick={savePricing}
                className="flex-[2] py-4 rounded-2xl text-white font-black text-xs uppercase tracking-widest shadow-xl shadow-gray-200 hover:opacity-90 transition-all"
                style={{ backgroundColor: BRAND_COLOR }}
              >
                Commit Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

  );
}

const ProfileCard = ({ icon, label, val }: any) => (
  <div className="bg-white p-6 rounded-3xl border border-gray-100 flex items-start gap-4">
    <div className="text-gray-300 mt-1">{icon}</div>
    <div>
      <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-1">{label}</p>
      <p className="text-sm font-black text-gray-900 leading-relaxed">{val}</p>
    </div>
  </div>
);
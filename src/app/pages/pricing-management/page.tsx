'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase';
import { 
  FiSearch, FiEdit2, FiDownload, 
  FiCheckCircle, FiPackage, FiChevronDown, FiChevronUp, FiPercent 
} from 'react-icons/fi';

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

// FIX 1: Explicitly define which keys are allowed to avoid the 'products object' error
type PriceKeys = 'supplier_price' | 'dealer_price' | 'subdealer_price' | 'retail_price' | 'customer_price';
type DiscKeys = 'supplier_discount' | 'dealer_discount' | 'subdealer_discount' | 'retail_discount' | 'customer_discount';

interface PriceTier {
  key: PriceKeys;
  discKey: DiscKeys;
  label: string;
  color: string;
  bg: string;
}

const CATEGORIES = ['Medicine', 'Fish Food', 'Bird Food'];
const ITEMS_PER_PAGE = 10;

const PRICE_TIERS: PriceTier[] = [
  { key: 'supplier_price', discKey: 'supplier_discount', label: 'Supplier', color: '#4f46e5', bg: '#eef2ff' },
  { key: 'dealer_price', discKey: 'dealer_discount', label: 'Dealer', color: '#7c3aed', bg: '#f5f3ff' },
  { key: 'subdealer_price', discKey: 'subdealer_discount', label: 'Sub-Dealer', color: '#db2777', bg: '#fdf2f8' },
  { key: 'retail_price', discKey: 'retail_discount', label: 'Retail', color: '#d97706', bg: '#fffbeb' },
  { key: 'customer_price', discKey: 'customer_discount', label: 'Customer', color: '#059669', bg: '#ecfdf5' },
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
  const [currentPrices, setCurrentPrices] = useState<Partial<Variant>>({});
  const [successMessage, setSuccessMessage] = useState('');
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
      console.error(err.message);
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
        const priceVal = String(currentPrices[t.key] ?? '0');
        const discVal = String(currentPrices[t.discKey] ?? '0');
        updates[t.key] = parseFloat(priceVal) || 0;
        updates[t.discKey] = parseFloat(discVal) || 0;
      });

      const stockVal = String(currentPrices.stock ?? '0');
      updates.stock = parseInt(stockVal, 10) || 0;
      updates.updated_at = new Date().toISOString();

      const { error } = await supabase
        .from('product_variants')
        .update(updates)
        .eq('id', editingVariant.id);
      
      if (error) throw error;

      setVariants(variants.map(v => v.id === editingVariant.id ? { ...v, ...updates } : v));
      setShowEditModal(false);
      setSuccessMessage('Inventory Updated');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err: any) { 
      alert(err.message); 
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto font-inter bg-gray-50 min-h-screen">
      {successMessage && (
        <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white px-6 py-3 rounded-full shadow-2xl z-50 flex items-center gap-2 font-semibold">
          <FiCheckCircle /> {successMessage}
        </div>
      )}

      {/* Header and Search */}
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-2xl md:text-3xl font-black text-gray-900">Pricing & Inventory</h1>
        <button className="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all flex items-center gap-2">
          <FiDownload /> {!isMobile && 'Export'}
        </button>
      </header>

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <input
            placeholder="Search products..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-300 outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <select
          value={selectedCategory}
          onChange={e => setSelectedCategory(e.target.value)}
          className="px-4 py-3 rounded-xl border border-gray-300 bg-white outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option>All Categories</option>
          {CATEGORIES.map(c => <option key={c}>{c}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-24 text-gray-500">Loading...</div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          {isMobile ? (
            <div className="divide-y divide-gray-200">
              {currentItems.map(v => (
                <div key={v.id} className="p-4">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="font-bold text-gray-900">{v.products?.product_name}</div>
                      <div className="text-sm text-gray-500">{v.quantity_value} {v.quantity_unit}</div>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-xs font-bold flex items-center gap-1 ${v.stock < 10 ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>
                      <FiPackage size={12} /> {v.stock}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    {PRICE_TIERS.slice(0, 2).map(t => (
                      <div key={t.key} className="text-sm">
                        <span className="text-gray-600">{t.label} ({(v[t.discKey] as any)}%)</span>
                        <div className="font-bold" style={{ color: t.color }}>₹{(v[t.key] as any)}</div>
                      </div>
                    ))}
                  </div>

                  {expandedCard === v.id && (
                    <div className="grid grid-cols-2 gap-4 mb-4 pt-4 border-t border-gray-200">
                      {PRICE_TIERS.slice(2).map(t => (
                        <div key={t.key} className="text-sm">
                          <span className="text-gray-600">{t.label} ({(v[t.discKey] as any)}%)</span>
                          <div className="font-bold" style={{ color: t.color }}>₹{(v[t.key] as any)}</div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                    <button
                      onClick={() => setExpandedCard(expandedCard === v.id ? null : v.id)}
                      className="text-green-600 font-semibold text-sm flex items-center gap-1"
                    >
                      {expandedCard === v.id ? <FiChevronUp /> : <FiChevronDown />} Details
                    </button>
                    <button
                      className="px-4 py-2 bg-gray-900 text-white rounded-lg font-semibold text-sm"
                      onClick={() => {
                        setEditingVariant(v);
                        setCurrentPrices({ ...v });
                        setShowEditModal(true);
                      }}
                    >
                      <FiEdit2 /> Edit
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Product</th>
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Stock</th>
                  {PRICE_TIERS.map(t => (
                    <th key={t.key} className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">
                      {t.label}
                    </th>
                  ))}
                  <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {currentItems.map(v => (
                  <tr key={v.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="font-bold">{v.products?.product_name}</div>
                      <div className="text-sm text-gray-500">{v.quantity_value} {v.quantity_unit}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-800">
                        {v.stock}
                      </span>
                    </td>
                    {PRICE_TIERS.map(t => (
                      <td key={t.key} className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          <span className="px-2 py-1 rounded text-xs font-bold text-center" style={{ color: t.color, backgroundColor: t.bg }}>
                            ₹{(v[t.key] as any)}
                          </span>
                          <span className="text-xs text-gray-500">
                            {(v[t.discKey] as any)}% Off
                          </span>
                        </div>
                      </td>
                    ))}
                    <td className="px-6 py-4">
                      <button className="p-2 bg-gray-100 rounded-lg" onClick={() => {
                        setEditingVariant(v);
                        setCurrentPrices({ ...v });
                        setShowEditModal(true);
                      }}>
                        <FiEdit2 />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      )}

      {/* Pagination */}
      <div className="flex justify-center items-center gap-4 mt-6">
        <button disabled={currentPage === 1} onClick={() => setCurrentPage(p => p - 1)} className="px-4 py-2 rounded-lg border bg-white disabled:opacity-50">Prev</button>
        <span className="text-sm">{currentPage} / {totalPages}</span>
        <button disabled={currentPage >= totalPages} onClick={() => setCurrentPage(p => p + 1)} className="px-4 py-2 rounded-lg border bg-white disabled:opacity-50">Next</button>
      </div>

      {/* Modal */}
      {showEditModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex justify-center items-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
            <h3 className="text-xl font-black mb-6 border-b pb-4">Update Variant</h3>
            
            <div className="mb-6">
              <label className="block text-xs font-bold text-gray-600 mb-2 uppercase">Stock</label>
              <input
                type="number"
                value={(currentPrices.stock as any) ?? ''}
                onChange={e => setCurrentPrices({ ...currentPrices, stock: parseInt(e.target.value) || 0 })}
                className="w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4 mb-6">
              {PRICE_TIERS.map(t => (
                <React.Fragment key={t.key}>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">{t.label} Price</label>
                    <input
                      type="number"
                      value={(currentPrices[t.key] as any) ?? ''}
                      onChange={e => setCurrentPrices({ ...currentPrices, [t.key]: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">Disc %</label>
                    <input
                      type="number"
                      value={(currentPrices[t.discKey] as any) ?? ''}
                      onChange={e => setCurrentPrices({ ...currentPrices, [t.discKey]: parseFloat(e.target.value) || 0 })}
                      className="w-full px-4 py-3 rounded-xl border outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </React.Fragment>
              ))}
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t">
              <button onClick={() => setShowEditModal(false)} className="px-6 py-3 rounded-xl border bg-white font-semibold">Cancel</button>
              <button onClick={savePricing} className="px-6 py-3 rounded-xl bg-green-600 text-white font-semibold">Save</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
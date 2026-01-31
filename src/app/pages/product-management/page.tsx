// pages/ProductManagement.tsx (for Pages Router) or app/ProductManagement/page.tsx (for App Router)
// Assuming App Router for Next.js 13+

'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase'; // Fixed import path for client

// Define types for TypeScript
interface Variant {
  id?: number;
  quantity_value: number; // ✅ FIX
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
}


interface Product {
  id: number;
  product_name: string;
  description: string;
  category: string;
  subcategory: string;
  stock: number;
  image_url: string;
  image_urls: string[];
  supplier_price: number;
  dealer_price: number;
  subdealer_price: number;
  retail_price: number;
  customer_price: number;
  active: boolean;
  variants: Variant[];
}

interface FormData {
  name: string;
  description: string;
  category: string;
  subcategory: string;
  image_urls: string[];
  variants: Variant[];
}

interface Errors {
  [key: string]: string;
}

// Categories with subcategories and units
const CATEGORY_MAP: { [key: string]: { subcategories: string[]; unit: string } } = {
  Medicine: {
    subcategories: ['Fish Medicine', 'Plant Medicine', 'Plant Lushers'],
    unit: 'ml',
  },
  'Bird Food': {
    subcategories: ['Bird Foods'],
    unit: 'grams',
  },
  'Fish Food': {
    subcategories: ['Freeze-Live Dried Foods', 'Pallets Foods'],
    unit: 'grams',
  },
};

const ACTIVE_FILTERS = [
  { label: 'All Products', value: 'all' },
  { label: 'Active Only', value: 'active' },
  { label: 'Inactive Only', value: 'inactive' },
];

export default function ProductManagement() {
  const supabase = createClient(); // Create the supabase client instance

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [activeFilter, setActiveFilter] = useState('all');
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [productImageIndices, setProductImageIndices] = useState<{ [key: number]: number }>({});
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [screenWidth, setScreenWidth] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editProductId, setEditProductId] = useState<number | null>(null);

  const [form, setForm] = useState<FormData>({
    name: '',
    description: '',
    category: '',
    subcategory: '',
    image_urls: [],
    variants: [
      {
        quantity_value: '',
        quantity_unit: '',
        stock: 0,
        supplier_price: 0,
        dealer_price: 0,
        subdealer_price: 0,
        retail_price: 0,
        customer_price: 0,
        supplier_discount: 0,
        dealer_discount: 0,
        subdealer_discount: 0,
        retail_discount: 0,
        customer_discount: 0,
      },
    ],
  });

  const [errors, setErrors] = useState<Errors>({});

  useEffect(() => {
    setScreenWidth(window.innerWidth);
    const resize = () => setScreenWidth(window.innerWidth);
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const isMobile = screenWidth < 768;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (name === 'category') {
      setForm({
        ...form,
        category: value,
        subcategory: '',
      });
    } else {
      setForm({ ...form, [name]: value });
    }
  };

  useEffect(() => {
    if (!selectedProduct) return;
    const images = selectedProduct.image_urls?.length ? selectedProduct.image_urls : [selectedProduct.image_url];
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedProduct]);

  useEffect(() => {
    const interval = setInterval(() => {
      setProductImageIndices((prev) => {
        const updated: { [key: number]: number } = {};
        products.forEach((p) => {
          const images = p.image_urls?.length ? p.image_urls : [p.image_url];
          updated[p.id] = prev[p.id] !== undefined ? (prev[p.id] + 1) % images.length : 0; // Fixed syntax error
        });
        return updated;
      });
    }, 5000);
    return () => clearInterval(interval);
  }, [products]);

  const fetchProducts = async () => {
    setLoading(true);
    let query = supabase.from('products').select('*, variants:product_variants(*)').order('id', { ascending: true });
    if (selectedCategory !== 'All Categories') {
      query = query.eq('category', selectedCategory);
    }
    if (activeFilter === 'active') query = query.eq('active', true);
    else if (activeFilter === 'inactive') query = query.eq('active', false);

    let { data, error } = await query;

    let productsData: Product[] = data ?? [];

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      productsData = productsData.filter(
        (p) =>
          p.product_name.toLowerCase().includes(lower) ||
          p.description.toLowerCase().includes(lower)
      );
    }

    setProducts(productsData);

    setSelectedProducts([]);
    setLoading(false);
  };

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory, activeFilter, searchTerm]);

  const toggleActive = async (product: Product) => {
    const { error } = await supabase.from('products').update({ active: !product.active }).eq('id', product.id);
    if (!error) fetchProducts();
  };

  const handleViewDetails = (product: Product) => {
    setSelectedProduct(product);
    setSelectedVariantId(product.variants?.[0]?.id || null);
    setShowDetailsModal(true);
  };

  const validateForm = (): boolean => {
    const newErrors: Errors = {};
    if (!form.name.trim()) newErrors.name = 'Product name is required.';
    if (!form.description.trim()) newErrors.description = 'Description is required.';
    if (!form.category.trim()) newErrors.category = 'Please select a category.';
    if (!form.subcategory.trim()) newErrors.subcategory = 'Please select a subcategory.';

    form.variants.forEach((v, i) => {
      if (!v.quantity_value || Number(v.quantity_value) <= 0) newErrors[`variant_qty_${i}`] = 'Req.';
      if (!v.quantity_unit) newErrors[`variant_unit_${i}`] = 'Req.';
      ['supplier_price', 'dealer_price', 'subdealer_price', 'retail_price', 'customer_price'].forEach((field) => {
        if (v[field as keyof Variant] === '' || Number(v[field as keyof Variant]) <= 0) newErrors[`${field}_${i}`] = 'Error';
      });
      ['supplier_discount', 'dealer_discount', 'subdealer_discount', 'retail_discount', 'customer_discount'].forEach((field) => {
        if (v[field as keyof Variant] === '' || Number(v[field as keyof Variant]) < 0) newErrors[`${field}_${i}`] = 'Error';
      });
    });

    if (!form.image_urls.length) newErrors.image_urls = 'At least one image required.';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const saveProduct = async () => {
    if (!validateForm()) return;
    setLoading(true);

    try {
      const firstVariant = form.variants[0];
      const productPayload = {
        product_name: form.name.trim(),
        description: form.description.trim(),
        category: form.category,
        subcategory: form.subcategory,
        stock: form.variants.reduce((sum, v) => sum + Number(v.stock), 0),
        image_url: form.image_urls[0],
        image_urls: form.image_urls,
        supplier_price: Number(firstVariant.supplier_price),
        dealer_price: Number(firstVariant.dealer_price),
        subdealer_price: Number(firstVariant.subdealer_price),
        retail_price: Number(firstVariant.retail_price),
        customer_price: Number(firstVariant.customer_price),
        active: selectedProduct?.active ?? true,
        updated_at: new Date(),
      };

      if (isEditing && editProductId) {
        const { error: upErr } = await supabase.from('products').update(productPayload).eq('id', editProductId);
        if (upErr) throw upErr;

        for (const v of form.variants) {
          if (v.id) {
            const { error } = await supabase
              .from('product_variants')
              .update({
                quantity_value: Number(v.quantity_value),
                quantity_unit: v.quantity_unit,
                stock: Number(v.stock),
                supplier_price: Number(v.supplier_price),
                dealer_price: Number(v.dealer_price),
                subdealer_price: Number(v.subdealer_price),
                retail_price: Number(v.retail_price),
                customer_price: Number(v.customer_price),
                supplier_discount: Number(v.supplier_discount),
                dealer_discount: Number(v.dealer_discount),
                subdealer_discount: Number(v.subdealer_discount),
                retail_discount: Number(v.retail_discount),
                customer_discount: Number(v.customer_discount),
                updated_at: new Date(),
              })
              .eq('id', v.id);
            if (error) throw error;
          } else {
            const { error } = await supabase
              .from('product_variants')
              .insert({
                product_id: editProductId,
                quantity_value: Number(v.quantity_value),
                quantity_unit: v.quantity_unit,
                stock: Number(v.stock),
                supplier_price: Number(v.supplier_price),
                dealer_price: Number(v.dealer_price),
                subdealer_price: Number(v.subdealer_price),
                retail_price: Number(v.retail_price),
                customer_price: Number(v.customer_price),
                supplier_discount: Number(v.supplier_discount),
                dealer_discount: Number(v.dealer_discount),
                subdealer_discount: Number(v.subdealer_discount),
                retail_discount: Number(v.retail_discount),
                customer_discount: Number(v.customer_discount),
              });
            if (error) throw error;
          }
        }
      } else {
        const { data: productData, error: productError } = await supabase.from('products').insert([productPayload]).select().single();
        if (productError) throw productError;

        const variantsToInsert = form.variants.map((v) => ({
          product_id: productData.id,
          quantity_value: Number(v.quantity_value),
          quantity_unit: v.quantity_unit,
          stock: Number(v.stock),
          supplier_price: Number(v.supplier_price),
          dealer_price: Number(v.dealer_price),
          subdealer_price: Number(v.subdealer_price),
          retail_price: Number(v.retail_price),
          customer_price: Number(v.customer_price),
          supplier_discount: Number(v.supplier_discount),
          dealer_discount: Number(v.dealer_discount),
          subdealer_discount: Number(v.subdealer_discount),
          retail_discount: Number(v.retail_discount),
          customer_discount: Number(v.customer_discount),
        }));

        const { error: insVarErr } = await supabase.from('product_variants').insert(variantsToInsert);
        if (insVarErr) throw insVarErr;
      }

      setSuccessMessage(isEditing ? '✅ Product updated!' : '✅ Product added!');
      setShowAddModal(false);
      resetForm();
      fetchProducts();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const resetForm = () => {
    setIsEditing(false);
    setEditProductId(null);
    setForm({
      name: '',
      description: '',
      category: '',
      subcategory: '',
      image_urls: [],
      variants: [
        {
          quantity_value: '',
          quantity_unit: '',
          stock: 0,
          supplier_price: 0,
          dealer_price: 0,
          subdealer_price: 0,
          retail_price: 0,
          customer_price: 0,
          supplier_discount: 0,
          dealer_discount: 0,
          subdealer_discount: 0,
          retail_discount: 0,
          customer_discount: 0,
        },
      ],
    });
  };

const handleVariantChange = <K extends keyof Variant>(
  index: number,
  field: K,
  value: Variant[K]
) => {
  const newVariants = [...form.variants];
  newVariants[index] = {
    ...newVariants[index],
    [field]: value,
  };
  setForm({ ...form, variants: newVariants });
};


  const addVariant = () => {
    setForm({
      ...form,
      variants: [
        ...form.variants,
        {
          quantity_value: '',
          quantity_unit: '',
          stock: 0,
          supplier_price: 0,
          dealer_price: 0,
          subdealer_price: 0,
          retail_price: 0,
          customer_price: 0,
          supplier_discount: 0,
          dealer_discount: 0,
          subdealer_discount: 0,
          retail_discount: 0,
          customer_discount: 0,
        },
      ],
    });
  };

  const removeVariant = (index: number) => {
    setForm({ ...form, variants: form.variants.filter((_, i) => i !== index) });
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    const uploadedUrls = [...form.image_urls];

    for (const file of Array.from(files)) {
      const fileName = `product_${Date.now()}_${file.name}`;

      const { error } = await supabase.storage.from('products').upload(fileName, file);

      if (error) {
        alert('Image upload failed');
        return;
      }

      const { data: urlData } = supabase.storage.from('products').getPublicUrl(fileName);

      uploadedUrls.push(urlData.publicUrl);
    }

    setForm({ ...form, image_urls: uploadedUrls });
  };

  const deleteProduct = async (productId: number) => {
    console.log('Deleting product with id:', productId);
    try {
      let { error: err1 } = await supabase.from('subdealer_cart').delete().eq('product_id', productId);
      if (err1) throw new Error(`Error deleting from subdealer_cart: ${err1.message}`);

      let { error: err2 } = await supabase.from('product_variants').delete().eq('product_id', productId);
      if (err2) throw new Error(`Error deleting from product_variants: ${err2.message}`);

      let { error: err3 } = await supabase.from('products').delete().eq('id', productId);
      if (err3) throw new Error(`Error deleting from products: ${err3.message}`);

      console.log('Product deleted successfully.');
      await fetchProducts();
    } catch (error: any) {
      alert(`Failed to delete product: ${error.message}`);
      console.error('Delete failed:', error);
    }
  };

  const removeImage = (indexToRemove: number) => {
    setForm({
      ...form,
      image_urls: form.image_urls.filter((_, index) => index !== indexToRemove),
    });
  };

  const deleteMultipleProducts = async (productIds: number[]) => {
    const confirmDelete = window.confirm(`Are you sure you want to delete ${productIds.length} products? This action cannot be undone.`);
    if (!confirmDelete) return;

    setLoading(true);
    try {
      for (const id of productIds) {
        await deleteProduct(id);
      }
      setSuccessMessage(`✅ ${productIds.length} products deleted.`);
      setSelectedProducts([]);
      setIsSelectionMode(false);
    } catch (err: any) {
      alert('Bulk delete failed');
    } finally {
      setLoading(false);
      fetchProducts();
      setTimeout(() => setSuccessMessage(''), 3000);
    }
  };

  const toggleSelectAll = () => {
    if (selectedProducts.length === products.length && products.length > 0) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(products.map((p) => p.id));
    }
  };

  const handleEditProduct = (product: Product) => {
    setIsEditing(true);
    setEditProductId(product.id);

    setForm({
      name: product.product_name,
      description: product.description,
      category: product.category,
      subcategory: product.subcategory,
      image_urls: product.image_urls || [product.image_url],
      variants: product.variants.map((v) => ({
        id: v.id,
        quantity_value: v.quantity_value,
        quantity_unit: v.quantity_unit,
        stock: v.stock,
        supplier_price: v.supplier_price,
        dealer_price: v.dealer_price,
        subdealer_price: v.subdealer_price,
        retail_price: v.retail_price,
        customer_price: v.customer_price,
        supplier_discount: v.supplier_discount || 0,
        dealer_discount: v.dealer_discount || 0,
        subdealer_discount: v.subdealer_discount || 0,
        retail_discount: v.retail_discount || 0,
        customer_discount: v.customer_discount || 0,
      })),
    });
    setShowAddModal(true);
  };

  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto font-inter bg-white min-h-screen">
      <header className={`flex ${isMobile ? 'flex-col' : 'flex-row'} justify-between items-end gap-5 md:gap-10 mb-10 border-b border-gray-200 pb-6`}>
        <div className="flex flex-col gap-1">
          <h1 className={`text-3xl md:text-4xl font-black text-gray-900 m-0 leading-tight ${isMobile ? 'text-2xl' : ''}`}>Product Inventory</h1>
          {isSelectionMode ? (
            <div className="flex items-center gap-2 text-indigo-600 font-semibold text-sm" aria-live="polite">
              <span className="w-2 h-2 bg-indigo-600 rounded-full animate-pulse" aria-hidden="true"></span>
              Selection Mode Active
            </div>
          ) : (
            <p className="text-gray-600 m-0 text-sm">Manage your products and pricing tiers</p>
          )}
        </div>

        <div className={`flex gap-3 md:gap-4 items-center ${isMobile ? 'flex-wrap justify-center w-full' : ''}`}>
          {!isSelectionMode ? (
            <>
              <button
                className={`px-6 py-3 bg-emerald-500 text-white rounded-xl font-semibold cursor-pointer transition-all hover:shadow-lg flex items-center gap-2 shadow-md ${isMobile ? 'flex-1 min-w-32 text-sm px-3 py-2.5' : ''}`}
                onClick={() => setShowAddModal(true)}
                aria-label="Add new product"
              >
                <span className="text-lg" aria-hidden="true">+</span> Add Product
              </button>
              <button
                className={`px-5 py-3 bg-white text-gray-700 border border-gray-300 rounded-xl font-semibold cursor-pointer ${isMobile ? 'flex-1 min-w-32 text-sm px-3 py-2.5' : ''}`}
                onClick={() => setIsSelectionMode(true)}
                aria-label="Enter selection mode to select multiple products"
              >
                Select Items
              </button>
            </>
          ) : (
            <>
              <button
                className={`px-5 py-3 bg-white text-gray-600 border border-gray-300 rounded-xl font-semibold cursor-pointer ${isMobile ? 'flex-1 min-w-24 text-xs px-3 py-2.5' : ''}`}
                onClick={toggleSelectAll}
                aria-label={selectedProducts.length === products.length ? "Deselect all products" : "Select all products"}
              >
                {selectedProducts.length === products.length ? "Deselect All" : "Select All"}
              </button>
              <button
                className={`px-5 py-3 bg-red-500 text-white rounded-xl font-semibold cursor-pointer ${isMobile ? 'flex-1 min-w-24 text-xs px-3 py-2.5' : ''}`}
                disabled={selectedProducts.length === 0}
                onClick={() => deleteMultipleProducts(selectedProducts)}
                aria-label={`Delete selected products (${selectedProducts.length})`}
              >
                Delete Selected ({selectedProducts.length})
              </button>
              <button
                className={`px-5 py-3 bg-transparent text-gray-500 border-none rounded-xl font-semibold cursor-pointer ${isMobile ? 'flex-1 min-w-24 text-xs px-3 py-2.5' : ''}`}
                onClick={() => {
                  setIsSelectionMode(false);
                  setSelectedProducts([]);
                }}
                aria-label="Cancel selection mode"
              >
                Cancel
              </button>
            </>
          )}
        </div>
      </header>

      {/* FILTER BAR */}
      <section className={`flex ${isMobile ? 'flex-col' : 'flex-row'} gap-4 mb-8 bg-white p-4 rounded-2xl shadow-sm border border-gray-100`} aria-label="Product filters">
        <div className="flex-1 relative">
          <label htmlFor="search-input" className="sr-only">Search products by name or description</label>
          <div className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" aria-hidden="true">🔍</div>
          <input
            id="search-input"
            placeholder="Search by name or description..."
            className="w-full pl-12 pr-4 py-3 rounded-xl border border-gray-300 text-sm outline-none transition-all focus:ring-2 focus:ring-indigo-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            aria-describedby="search-help"
          />
          <span id="search-help" className="sr-only">Enter keywords to filter products</span>
        </div>
        <div className="flex-1 flex gap-3">
          <label htmlFor="category-select" className="sr-only">Select category</label>
          <select
            id="category-select"
            className="flex-1 px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-700 text-sm font-medium cursor-pointer"
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <option value="All Categories">All Categories</option>
            {Object.keys(CATEGORY_MAP).map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
          <label htmlFor="active-filter-select" className="sr-only">Filter by active status</label>
          <select
            id="active-filter-select"
            className="flex-1 px-4 py-3 rounded-xl border border-gray-300 bg-white text-gray-700 text-sm font-medium cursor-pointer"
            value={activeFilter}
            onChange={(e) => setActiveFilter(e.target.value)}
          >
            {ACTIVE_FILTERS.map((f) => (
              <option key={f.value} value={f.value}>
                {f.label}
              </option>
            ))}
          </select>
        </div>
      </section>

      {/* GRID */}
      {loading ? (
        <div className="text-center py-24 text-gray-500" role="status" aria-live="polite">
          <div className="w-10 h-10 border-4 border-gray-300 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" aria-hidden="true"></div>
          <p>Loading products...</p>
        </div>
      ) : (
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8" aria-label="Product list">
          {products.length === 0 && (
            <div className="col-span-full text-center py-16 bg-gray-50 rounded-2xl text-gray-400 border-2 border-dashed border-gray-200" role="status">
              No products found matching your criteria.
            </div>
          )}
          {products.map((p) => (
            <article
              key={p.id}
              className={`relative bg-white rounded-3xl overflow-hidden transition-all duration-300 ease-out shadow-sm hover:shadow-lg cursor-pointer ${selectedProducts.includes(p.id) ? 'outline-2 outline-indigo-500 bg-indigo-50 scale-95' : 'outline-1 outline-gray-200'
                }`}
              tabIndex={0}
              role="button"
              aria-label={`Product: ${p.product_name}, Category: ${p.category}, Stock: ${p.variants.reduce((s, v) => s + v.stock, 0)}, Price: ₹${p.supplier_price}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleViewDetails(p);
                }
              }}
              onClick={() => handleViewDetails(p)}
            >
              {/* Checkbox Overlay */}
              <div className={`absolute top-4 left-4 z-20 ${isSelectionMode ? 'flex' : 'hidden'}`}>
                <input
                  type="checkbox"
                  checked={selectedProducts.includes(p.id)}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedProducts([...selectedProducts, p.id]);
                    } else {
                      setSelectedProducts(selectedProducts.filter((id) => id !== p.id));
                    }
                  }}
                  className="w-6 h-6 cursor-pointer accent-indigo-600"
                  aria-label={`Select ${p.product_name}`}
                />
              </div>

              <div className="relative h-56 bg-gray-100">
                <img
                  src={p.image_urls?.length ? p.image_urls[productImageIndices[p.id] || 0] : p.image_url}
                  className="w-full h-full object-cover"
                  alt={`Image of ${p.product_name}`}
                />
                <div className={`absolute bottom-4 right-4 px-3 py-1.5 rounded-xl text-xs font-black backdrop-blur-sm ${p.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                  {p.active ? '● Active' : '○ Inactive'}
                </div>
              </div>

              <div className="p-6">
                <span className="text-xs text-indigo-600 font-bold uppercase tracking-wider">{p.category} • {p.subcategory}</span>
                <h3 className="text-xl font-black text-gray-900 mt-2 mb-4 leading-tight">{p.product_name}</h3>

                <div className="flex justify-between items-center mb-5">
                  <div className={`flex items-center gap-1.5 text-sm font-semibold ${p.variants.reduce((s, v) => s + v.stock, 0) > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                    <div className={`w-1.5 h-1.5 rounded-full ${p.variants.reduce((s, v) => s + v.stock, 0) > 0 ? 'bg-green-500' : 'bg-red-500'
                      }`}></div>
                    {p.variants.reduce((s, v) => s + v.stock, 0)} in stock
                  </div>
                  <div className="text-2xl font-black text-gray-900">₹{p.supplier_price}</div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button className="col-span-2 py-3 bg-indigo-600 text-white rounded-xl font-bold cursor-pointer mb-1" onClick={(e) => { e.stopPropagation(); handleViewDetails(p); }} aria-label={`View details for ${p.product_name}`}>
                    View Details
                  </button>
                  <button className="py-2.5 border border-gray-300 rounded-xl bg-white text-sm font-bold cursor-pointer text-gray-700" onClick={(e) => { e.stopPropagation(); handleEditProduct(p); }} aria-label={`Edit ${p.product_name}`}>
                    Edit
                  </button>
                  <button
                    className={`py-2.5 border border-gray-300 rounded-xl bg-white text-sm font-bold cursor-pointer ${p.active ? 'text-orange-600' : 'text-green-600'
                      }`}
                    onClick={(e) => { e.stopPropagation(); toggleActive(p); }}
                    aria-label={p.active ? `Deactivate ${p.product_name}` : `Activate ${p.product_name}`}
                  >
                    {p.active ? 'Deactivate' : 'Activate'}
                  </button>
                  <button
                    className="py-2.5 bg-red-50 text-red-700 border-none rounded-xl text-sm font-bold cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm(`Delete "${p.product_name}"?`)) {
                        deleteProduct(p.id);
                        fetchProducts();
                      }
                    }}
                    aria-label={`Delete ${p.product_name}`}
                  >
                    Delete
                  </button>
                </div>
              </div>
            </article>
          ))}
        </section>
      )}

      {/* DETAILS MODAL */}
      {showDetailsModal && selectedProduct && (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-lg flex justify-center items-center p-5 z-50" role="dialog" aria-modal="true" aria-labelledby="details-title">
          <div className="bg-white w-full max-w-2xl max-h-[92vh] rounded-3xl flex flex-col shadow-2xl overflow-hidden">
            <div className="p-8 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h2 id="details-title" className="text-2xl font-black text-gray-900 m-0">Product Overview</h2>
                <p className="text-gray-600 m-0 text-sm">Full specifications and pricing</p>
              </div>
              <button className="bg-transparent border-none text-xl cursor-pointer w-8 h-8 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-500 transition-all flex items-center justify-center" onClick={() => setShowDetailsModal(false)} aria-label="Close product details modal">
                ×
              </button>
            </div>

            <div className="p-8 overflow-y-auto flex-1 bg-gray-50">
              <div className="flex gap-8 mb-8 items-center">
                <img
                  src={selectedProduct.image_urls?.[currentImageIndex] || selectedProduct.image_url}
                  className="w-48 h-48 rounded-3xl object-cover shadow-lg"
                  alt={`Detailed image of ${selectedProduct.product_name}`}
                />
                <div className="flex-1">
                  <span className="text-xs text-indigo-600 font-bold uppercase tracking-wider">{selectedProduct.category} / {selectedProduct.subcategory}</span>
                  <h3 className="text-3xl font-black mt-1 mb-0">{selectedProduct.product_name}</h3>

                  <div className="mt-4 p-3 bg-gray-100 rounded-xl">
                    <label className="text-xs font-semibold text-gray-600 mb-1 block" htmlFor="variant-select">Selected Variant</label>
                    <select
                      id="variant-select"
                      value={selectedVariantId || ''}
                      onChange={(e) => setSelectedVariantId(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none"
                    >
                      {selectedProduct.variants.map((v) => (
                        <option key={v.id} value={v.id}>
                          {v.quantity_value}{v.quantity_unit} — Stock: {v.stock}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="mb-6">
                <h4 className="text-lg font-black text-gray-900 mb-3">Description</h4>
                <p className="text-sm leading-relaxed text-gray-700 m-0">{selectedProduct.description}</p>
              </div>

              <div className="mb-6">
                <h4 className="text-lg font-black text-gray-900 mb-3">Pricing Structure</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                  {['supplier', 'dealer', 'subdealer', 'retail', 'customer'].map((tier) => (
                    <div key={tier} className="p-4 bg-white border border-gray-300 rounded-2xl text-center">
                      <span className="block text-xs font-black text-gray-400 uppercase mb-2">{tier}</span>
                      <span className="text-xl font-black text-gray-900">₹{selectedProduct.variants.find((v) => v.id === selectedVariantId)?.[tier + '_price']}</span>
                      <span className="block text-xs text-green-600 mt-1">Discount: {selectedProduct.variants.find((v) => v.id === selectedVariantId)?.[tier + '_discount'] || 0}%</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD/EDIT MODAL */}
      <div className="relative">
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-lg flex justify-center items-center p-5 z-50" role="dialog" aria-modal="true" aria-labelledby="add-edit-title">
            <div className="bg-white w-full max-w-4xl max-h-[92vh] rounded-3xl flex flex-col shadow-2xl overflow-hidden">
              <div className="p-8 border-b border-gray-200 flex justify-between items-center">
                <div>
                  <h2 id="add-edit-title" className="text-2xl font-black text-gray-900 m-0">{isEditing ? 'Edit Product' : 'Create New Product'}</h2>
                  <p className="text-gray-600 m-0 text-sm">Enter product details and variants</p>
                </div>
                <button className="bg-transparent border-none text-xl cursor-pointer w-8 h-8 rounded-lg text-gray-500 hover:bg-red-50 hover:text-red-500 transition-all flex items-center justify-center" onClick={() => setShowAddModal(false)} aria-label="Close add/edit product modal">
                  ×
                </button>
              </div>

              <div className="p-8 overflow-y-auto flex-1 bg-gray-50">
                <form onSubmit={(e) => { e.preventDefault(); saveProduct(); }}>
                  <div className="mb-8 bg-white p-6 rounded-2xl border border-gray-100">
                    <div className="text-lg font-black text-gray-900 mb-4">Basic Information</div>
                    <div className="mb-4">
                      <label className="block text-sm font-bold text-gray-700 mb-2" htmlFor="product-name">Product Name <span className="text-red-500">*</span></label>
                      <input
                        id="product-name"
                        name="name"
                        value={form.name}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm outline-none transition-all focus:ring-2 focus:ring-indigo-500"
                        placeholder="e.g. Premium Arabica Blend"
                        required
                        aria-describedby="name-error"
                      />
                      {errors.name && <p id="name-error" className="text-xs text-red-500 mt-1 font-medium">{errors.name}</p>}
                    </div>
                    <div className="mb-4">
                      <label className="block text-sm font-bold text-gray-700 mb-2" htmlFor="product-description">Description <span className="text-red-500">*</span></label>
                      <textarea
                        id="product-description"
                        name="description"
                        value={form.description}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm outline-none transition-all focus:ring-2 focus:ring-indigo-500 min-h-24 resize-vertical"
                        placeholder="Key features..."
                        required
                        aria-describedby="description-error"
                      />
                      {errors.description && <p id="description-error" className="text-xs text-red-500 mt-1 font-medium">{errors.description}</p>}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2" htmlFor="category-select-modal">Category</label>
                        <select
                          id="category-select-modal"
                          name="category"
                          value={form.category}
                          onChange={handleChange}
                          className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm outline-none transition-all focus:ring-2 focus:ring-indigo-500"
                          required
                          aria-describedby="category-error"
                        >
                          <option value="">Select Category</option>
                          {Object.keys(CATEGORY_MAP).map((cat) => (
                            <option key={cat} value={cat}>
                              {cat}
                            </option>
                          ))}
                        </select>
                        {errors.category && <p id="category-error" className="text-xs text-red-500 mt-1 font-medium">{errors.category}</p>}
                      </div>
                      <div>
                        <label className="block text-sm font-bold text-gray-700 mb-2" htmlFor="subcategory-select">Subcategory</label>
                        <select
                          id="subcategory-select"
                          name="subcategory"
                          value={form.subcategory}
                          onChange={handleChange}
                          className="w-full px-4 py-3 rounded-xl border border-gray-300 text-sm outline-none transition-all focus:ring-2 focus:ring-indigo-500"
                          required
                          aria-describedby="subcategory-error"
                        >
                          <option value="">Select Sub</option>
                          {form.category && CATEGORY_MAP[form.category].subcategories.map((sub) => (
                            <option key={sub} value={sub}>
                              {sub}
                            </option>
                          ))}
                        </select>
                        {errors.subcategory && <p id="subcategory-error" className="text-xs text-red-500 mt-1 font-medium">{errors.subcategory}</p>}
                      </div>
                    </div>
                  </div>

                  <div className="mb-8 bg-white p-6 rounded-2xl border border-gray-100">
                    <div className="flex justify-between items-center mb-4">
                      <div className="text-lg font-black text-gray-900">Variants & Stock</div>
                      <button
                        type="button"
                        onClick={addVariant}
                        className="px-4 py-2 rounded-xl border border-indigo-600 bg-white text-indigo-600 cursor-pointer font-bold text-sm hover:bg-indigo-50 transition-all"
                        aria-label="Add another variant"
                      >
                        + Add Variant
                      </button>
                    </div>

                    {form.variants.map((v, idx) => (
                      <fieldset key={idx} className="bg-gray-50 rounded-2xl p-5 mb-4 border border-gray-100">
                        <legend className="flex justify-between items-center mb-4">
                          <span className="text-xs font-black text-indigo-600 bg-indigo-100 px-3 py-1 rounded-lg uppercase tracking-wide">Variant Configuration</span>
                          {idx > 0 && (
                            <button
                              type="button"
                              onClick={() => removeVariant(idx)}
                              className="px-2 py-1 rounded-md border border-red-500 bg-white text-red-600 cursor-pointer text-xs font-bold hover:bg-red-50"
                              aria-label={`Remove variant ${idx + 1}`}
                            >
                              Remove
                            </button>
                          )}
                        </legend>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide" htmlFor={`qty-value-${idx}`}>QTY VALUE</label>
                            <input
                              id={`qty-value-${idx}`}
                              type="number"
                              value={v.quantity_value}
                              onChange={(e) => handleVariantChange(idx, 'quantity_value', e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none transition-all focus:ring-2 focus:ring-indigo-500"
                              required
                              aria-describedby={`qty-error-${idx}`}
                            />
                            {errors[`variant_qty_${idx}`] && <p id={`qty-error-${idx}`} className="text-xs text-red-500 mt-1 font-medium">{errors[`variant_qty_${idx}`]}</p>}
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide" htmlFor={`qty-unit-${idx}`}>UNIT</label>
                            <select
                              id={`qty-unit-${idx}`}
                              value={v.quantity_unit}
                              onChange={(e) => handleVariantChange(idx, 'quantity_unit', e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none transition-all focus:ring-2 focus:ring-indigo-500"
                              required
                              aria-describedby={`unit-error-${idx}`}
                            >
                              <option value="">Unit</option>
                              {['g', 'kg', 'ml', 'pcs', 'liters'].map((u) => (
                                <option key={u} value={u}>
                                  {u}
                                </option>
                              ))}
                            </select>
                            {errors[`variant_unit_${idx}`] && <p id={`unit-error-${idx}`} className="text-xs text-red-500 mt-1 font-medium">{errors[`variant_unit_${idx}`]}</p>}
                          </div>
                          <div>
                            <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide" htmlFor={`stock-${idx}`}>STOCK</label>
                            <input
                              id={`stock-${idx}`}
                              type="number"
                              value={v.stock}
                              onChange={(e) => handleVariantChange(idx, 'stock', e.target.value)}
                              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none transition-all focus:ring-2 focus:ring-indigo-500"
                              required
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                          {[
                            { f: 'supplier_price', label: 'SUPPLIER', discount: 'supplier_discount' },
                            { f: 'dealer_price', label: 'DEALER', discount: 'dealer_discount' },
                            { f: 'subdealer_price', label: 'SUB-DEALER', discount: 'subdealer_discount' },
                            { f: 'retail_price', label: 'RETAIL', discount: 'retail_discount' },
                            { f: 'customer_price', label: 'CUSTOMER', discount: 'customer_discount' },
                          ].map((item) => (
                            <div key={item.f}>
                              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide" htmlFor={`${item.f}-${idx}`}>{item.label}</label>
                              <div className="relative">
                                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 font-black text-gray-400" aria-hidden="true">₹</span>
                                <input
                                  id={`${item.f}-${idx}`}
                                  type="number"
                                  value={v[item.f as keyof Variant]}
                                  onChange={(e) => handleVariantChange(idx, item.f as keyof Variant, e.target.value)}
                                  className="w-full pl-7 pr-3 py-2 rounded-lg border border-gray-300 text-sm outline-none transition-all focus:ring-2 focus:ring-indigo-500"
                                  required
                                  aria-describedby={`${item.f}-error-${idx}`}
                                />
                              </div>
                              {errors[`${item.f}_${idx}`] && <p id={`${item.f}-error-${idx}`} className="text-xs text-red-500 mt-1 font-medium">{errors[`${item.f}_${idx}`]}</p>}
                              <label className="block text-xs font-bold text-gray-700 mb-1 uppercase tracking-wide mt-2" htmlFor={`${item.discount}-${idx}`}>DISCOUNT (%)</label>
                              <input
                                id={`${item.discount}-${idx}`}
                                type="number"
                                value={v[item.discount as keyof Variant]}
                                onChange={(e) => handleVariantChange(idx, item.discount as keyof Variant, e.target.value)}
                                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm outline-none transition-all focus:ring-2 focus:ring-indigo-500"
                                min="0"
                                max="100"
                                required
                                aria-describedby={`${item.discount}-error-${idx}`}
                              />
                              {errors[`${item.discount}_${idx}`] && <p id={`${item.discount}-error-${idx}`} className="text-xs text-red-500 mt-1 font-medium">{errors[`${item.discount}_${idx}`]}</p>}
                            </div>
                          ))}
                        </div>
                      </fieldset>
                    ))}
                  </div>

                  <div className="mb-8 bg-white p-6 rounded-2xl border border-gray-100">
                    <div className="text-lg font-black text-gray-900 mb-4">Media Assets</div>
                    <label className="flex flex-col items-center justify-center p-10 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer transition-all hover:bg-gray-50 bg-gray-50" htmlFor="image-upload">
                      <span className="text-2xl text-blue-500 mb-2" aria-hidden="true">📸</span>
                      <span>Drop images here or click to upload (Max 6)</span>
                      <input
                        id="image-upload"
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>
                    <div className="flex gap-3 mt-4 flex-wrap">
                      {form.image_urls.map((url, i) => (
                        <div key={i} className="relative w-20 h-20 rounded-lg overflow-visible border border-gray-300">
                          <img src={url} className="w-full h-full object-cover rounded-lg" alt={`Product image ${i + 1}`} />
                          <button
                            type="button"
                            onClick={() => removeImage(i)}
                            className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-red-500 text-white border-2 border-white font-bold text-sm cursor-pointer shadow-md hover:bg-red-600 flex items-center justify-center"
                            aria-label={`Remove image ${i + 1}`}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                    {errors.image_urls && <p className="text-xs text-red-500 mt-2 font-medium">{errors.image_urls}</p>}
                  </div>

                  <div className="p-6 border-t border-gray-200 flex justify-end gap-3 bg-white">
                    <button
                      type="button"
                      className="px-6 py-3 rounded-xl border-none bg-gray-500 text-black cursor-pointer font-bold hover:bg-gray-600 transition-all"
                      onClick={() => setShowAddModal(false)}
                      aria-label="Cancel and close modal"
                    >
                      Discard
                    </button>
                    <button
                      type="submit"
                      className="px-6 py-3 rounded-xl border-none bg-green-600 text-white cursor-pointer font-bold shadow-lg hover:shadow-xl transition-all"
                      aria-label={isEditing ? 'Save product changes' : 'Publish new product'}
                    >
                      {isEditing ? 'Save Changes' : 'Publish Product'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
        {successMessage && (
          <div className="fixed bottom-8 right-8 bg-gray-900 text-white px-6 py-4 rounded-xl shadow-2xl z-50 font-semibold" role="alert" aria-live="assertive">
            {successMessage}
          </div>
        )}
      </div>
    </div>
  );
}
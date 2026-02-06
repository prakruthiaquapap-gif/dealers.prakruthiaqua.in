// pages/ProductManagement.tsx (for Pages Router) or app/ProductManagement/page.tsx (for App Router)
// Assuming App Router for Next.js 13+

'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/utils/supabase';
import {
  FiPackage, FiTrash2, FiSearch, FiChevronDown, FiFilter,
  FiCheck, FiEdit3, FiEye, FiEyeOff, FiX, FiChevronRight,
  FiFileText, FiPlusCircle, FiUploadCloud, FiXCircle
} from 'react-icons/fi';
import { MdCurrencyRupee } from 'react-icons/md';

interface Category {
  id: string;
  name: string;
  parent_id: string | null;
  level: 'main' | 'sub' | 'inner';
}

interface Variant {
  id?: number;

  quantity_value: string;
  quantity_unit: string;
  stock: string;

  supplier_price: string;
  dealer_price: string;
  subdealer_price: string;
  retail_price: string;
  customer_price: string;

  supplier_discount: string;
  dealer_discount: string;
  subdealer_discount: string;
  retail_discount: string;
  customer_discount: string;
}


interface Product {
  id: number;
  product_name: string;
  description: string;
  category: string;      // ID
  subcategory: string;   // ID
  innercategory: string; // ID - Add this for inner category
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
  innercategory: string;  // Add this
  image_urls: string[];
  variants: Variant[];
}

interface Errors {
  [key: string]: string;
}

const ACTIVE_FILTERS = [
  { label: 'All Products', value: 'all' },
  { label: 'Active Only', value: 'active' },
  { label: 'Inactive Only', value: 'inactive' },
];

export default function ProductManagement() {
  const brandColor = '#4f46e5';
  const supabase = createClient();

  const [categories, setCategories] = useState<Category[]>([]);
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
  const [imageUploading, setImageUploading] = useState(false);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [uploadingCount, setUploadingCount] = useState(0);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setImageUploading(true);
    setUploadingCount(files.length);

    // show local previews immediately
    const newPreviews = Array.from(files).map((f) => URL.createObjectURL(f));
    setImagePreviews((prev) => [...prev, ...newPreviews]);

    const uploadedUrls = [...form.image_urls];

    for (const file of Array.from(files)) {
      const fileName = `product_${Date.now()}_${file.name}`;

      const { error } = await supabase.storage.from('products').upload(fileName, file);

      if (error) {
        alert('Image upload failed');
        setImageUploading(false);
        return;
      }

      const { data: urlData } = supabase.storage.from('products').getPublicUrl(fileName);
      uploadedUrls.push(urlData.publicUrl);

      setUploadingCount((c) => c - 1);
    }

    setForm({ ...form, image_urls: uploadedUrls });
    setImagePreviews([]); // <-- clear previews
    setImageUploading(false);

  };


  const [form, setForm] = useState<FormData>({
    name: '',
    description: '',
    category: '',
    subcategory: '',
    innercategory: '',
    image_urls: [],
    variants: [
      {
        quantity_value: 0,
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

  // Helper: Convert ID → Name
  const getCategoryName = (id: string) => {
    const cat = categories.find((c) => c.id === id);
    return cat ? cat.name : id;
  };

  const fetchCategories = async () => {
    const { data, error } = await supabase
      .from('categories')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Category fetch error:', error);
      return;
    }

    setCategories(data || []);
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const mainCategories = categories.filter((c) => c.level === 'main');
  const subCategories = categories.filter((c) => c.level === 'sub' && c.parent_id === form.category);
  const innerCategories = categories.filter((c) => c.level === 'inner' && c.parent_id === form.subcategory);

  useEffect(() => {
    setScreenWidth(window.innerWidth);
    const resize = () => setScreenWidth(window.innerWidth);
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  const isMobile = screenWidth < 768;

  // Images slideshow for products
  useEffect(() => {
    if (!selectedProduct) return;
    const images = selectedProduct.image_urls?.length ? selectedProduct.image_urls : [selectedProduct.image_url];
    const interval = setInterval(() => {
      setCurrentImageIndex((prev) => (prev + 1) % images.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [selectedProduct]);

  // Images slideshow for grid
  useEffect(() => {
    const interval = setInterval(() => {
      setProductImageIndices((prev) => {
        const updated: { [key: number]: number } = {};
        products.forEach((p) => {
          const images = p.image_urls?.length ? p.image_urls : [p.image_url];
          updated[p.id] = prev[p.id] !== undefined ? (prev[p.id] + 1) % images.length : 0;
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
    if (error) {
      console.error(error);
      setLoading(false);
      return;
    }

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
        if (Number(v[field as keyof Variant]) <= 0)
          newErrors[`${field}_${i}`] = 'Error';
      });
      ['supplier_discount', 'dealer_discount', 'subdealer_discount', 'retail_discount', 'customer_discount'].forEach((field) => {
        if (Number(v[field as keyof Variant]) < 0)
          newErrors[`${field}_${i}`] = 'Error';
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
        innercategory: form.innercategory,  // Add this
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
      innercategory: '',
      image_urls: [],
      variants: [
        {
          quantity_value: 0,
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
          quantity_value: 0,
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



  const deleteProduct = async (productId: number) => {
    try {
      let { error: err1 } = await supabase.from('subdealer_cart').delete().eq('product_id', productId);
      if (err1) throw new Error(`Error deleting from subdealer_cart: ${err1.message}`);

      let { error: err2 } = await supabase.from('product_variants').delete().eq('product_id', productId);
      if (err2) throw new Error(`Error deleting from product_variants: ${err2.message}`);

      let { error: err3 } = await supabase.from('products').delete().eq('id', productId);
      if (err3) throw new Error(`Error deleting from products: ${err3.message}`);

      await fetchProducts();
    } catch (error: any) {
      alert(`Failed to delete product: ${error.message}`);
    }
  };

  const removeImage = (indexToRemove: number) => {
    setForm((prev) => ({
      ...prev,
      image_urls: prev.image_urls.filter((_, i) => i !== indexToRemove),
    }));

    setImagePreviews((prev) => prev.filter((_, i) => i !== indexToRemove));
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
      innercategory: product.innercategory || '',
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

  const toggleProductSelection = (productId: number) => {
    setSelectedProducts(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };


const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
  const { name, value } = e.target;
  setForm((prev) => ({
    ...prev,
    [name]: value,
  }));
};


  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto font-inter bg-white min-h-screen">
      <header className={`
  relative transition-all duration-300 ease-in-out
  flex ${isMobile ? 'flex-col gap-6' : 'flex-row items-center justify-between'} 
  mb-10 p-6 md:p-8 rounded-[2rem] border
  ${isSelectionMode
          ? 'bg-indigo-50/50 border-indigo-100 ring-4 ring-indigo-50/20'
          : 'bg-white border-gray-100 shadow-sm'}
`}>

        {/* Left Side: Titles & Context */}
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl md:text-3xl font-black text-gray-900 tracking-tight leading-none">
              Product Inventory
            </h1>
            {isSelectionMode && (
              <span className="hidden md:inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-[#2c4305] text-white animate-pulse">
                Live Edit
              </span>
            )}
          </div>

          {isSelectionMode ? (
            <p className="text-[#2c4305]  font-bold text-sm flex items-center gap-2">
              <FiPackage className="animate-bounce" />
              {selectedProducts.length} items currently staged for action
            </p>
          ) : (
            <p className="text-gray-400 font-medium text-sm">
              Overview of your stock levels and multi-tier pricing strategies
            </p>
          )}
        </div>

        {/* Right Side: Actions */}
        <div className={`flex items-center gap-3 ${isMobile ? 'w-full' : ''}`}>
          {!isSelectionMode ? (
            <>
              <button
                onClick={() => setIsSelectionMode(true)}
                className={`
            px-5 py-3 rounded-2xl font-bold text-xs uppercase tracking-widest transition-all
            bg-white border border-gray-200 text-gray-500 hover:border-gray-900 hover:text-gray-900
            ${isMobile ? 'flex-1' : ''}
          `}
              >
                Select Items
              </button>

              <button
                onClick={() => setShowAddModal(true)}
                style={{ backgroundColor: brandColor }}
                className={`
            px-6 py-3 rounded-2xl font-black text-xs uppercase tracking-widest text-white
            shadow-xl shadow-gray-200 hover:brightness-110 active:scale-95 transition-all
            flex items-center justify-center gap-2
            ${isMobile ? 'flex-[1.5]' : ''}
          `}
              >
                <span className="text-lg">+</span> Add Product
              </button>
            </>
          ) : (
            <div className={`flex items-center gap-2 ${isMobile ? 'grid grid-cols-2 w-full' : ''}`}>
              {/* Bulk Action: Delete */}
              <button
                disabled={selectedProducts.length === 0}
                onClick={() => deleteMultipleProducts(selectedProducts)}
                className={`
            group flex items-center justify-center gap-2 px-5 py-3 rounded-2xl font-black text-[10px] uppercase tracking-widest
            transition-all duration-200
            ${selectedProducts.length > 0
                    ? 'bg-rose-500 text-white shadow-lg shadow-rose-200 hover:bg-rose-600'
                    : 'bg-gray-100 text-gray-300 cursor-not-allowed'}
          `}
              >
                <FiTrash2 className={selectedProducts.length > 0 ? 'animate-pulse' : ''} />
                Delete ({selectedProducts.length})
              </button>

              {/* Bulk Action: Select/Deselect */}
              <button
                onClick={toggleSelectAll}
                className="px-5 py-3 bg-white border border-indigo-200  rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-50 transition-colors"
              >
                {selectedProducts.length === products.length ? "Clear All" : "Select All"}
              </button>

              {/* Exit Selection Mode */}
              <button
                onClick={() => {
                  setIsSelectionMode(false);
                  setSelectedProducts([]);
                }}
                className={`
            px-5 py-3 text-gray-400 font-bold text-[10px] uppercase tracking-widest hover:text-rose-500 transition-colors
            ${isMobile ? 'col-span-2 text-center pt-2' : ''}
          `}
              >
                Cancel Selection
              </button>
            </div>
          )}
        </div>
      </header>

      {/* FILTER BAR */}
      {/* FILTER BAR */}
      <section
        className={`
    flex ${isMobile ? 'flex-col' : 'flex-row items-center'} 
    gap-4 mb-10 p-2 md:p-3 rounded-[2rem] 
    bg-gray-50/50 border border-gray-100 transition-all duration-300
    ${searchTerm ? 'ring-2 ring-indigo-50 bg-white' : ''}
  `}
        aria-label="Product filters"
      >
        {/* Search Input Container */}
        <div className="flex-1 relative group">
          <div className="absolute left-5 top-1/2 -translate-y-1/2 transition-colors group-focus-within:text-[#2c4305] text-gray-400">
            <FiSearch className="text-lg" />
          </div>
          <input
            id="search-input"
            type="text"
            placeholder="Search inventory..."
            className="
        w-full pl-14 pr-6 py-4 rounded-[1.5rem] bg-white border-none
        text-sm font-medium text-gray-900 placeholder-gray-400
        shadow-sm transition-all outline-none
        focus:ring-2 focus:ring-indigo-500/20 focus:shadow-md
      "
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Select Group */}
        <div className={`flex items-center gap-3 ${isMobile ? 'w-full' : 'min-w-[400px]'}`}>

          {/* Category Filter */}
          <div className="relative flex-1 group">
            <select
              id="category-select"
              className="
          w-full pl-4 pr-10 py-4 appearance-none rounded-[1.5rem] bg-white 
          border-none text-xs font-bold uppercase tracking-wider text-gray-700
          shadow-sm cursor-pointer outline-none transition-all
          hover:bg-gray-50 focus:ring-2 focus:ring-indigo-500/20
        "
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <option value="All Categories">All Categories</option>
              {mainCategories.map(cat => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}

            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
              <FiChevronDown />
            </div>
          </div>

          {/* Status Filter */}
          <div className="relative flex-1 group">
            <select
              id="active-filter-select"
              className="
          w-full pl-4 pr-10 py-4 appearance-none rounded-[1.5rem] bg-white 
          border-none text-xs font-bold uppercase tracking-wider text-gray-700
          shadow-sm cursor-pointer outline-none transition-all
          hover:bg-gray-50 focus:ring-2 focus:ring-indigo-500/20
        "
              value={activeFilter}
              onChange={(e) => setActiveFilter(e.target.value)}
            >
              {ACTIVE_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>{f.label}</option>
              ))}
            </select>
            <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
              <FiFilter />
            </div>
          </div>

        </div>
      </section>

      {/* GRID */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-32 text-gray-400" role="status">
          <div className="relative w-16 h-16 mb-4">
            <div className="absolute inset-0 border-4 border-indigo-50 rounded-full"></div>
            <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
          </div>
          <p className="font-bold tracking-widest uppercase text-[10px]">Syncing Inventory...</p>
        </div>
      ) : (
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8" aria-label="Product list">
          {products.length === 0 && (
            <div className="col-span-full text-center py-24 bg-gray-50/50 rounded-[3rem] border-2 border-dashed border-gray-100">
              <FiPackage className="mx-auto text-4xl text-gray-200 mb-4" />
              <p className="text-gray-400 font-medium">No products match your current filters.</p>
            </div>
          )}

          {products.map((p) => {
            const totalStock = p.variants?.reduce((s, v) => s + v.stock, 0) || 0;
            const isSelected = selectedProducts.includes(p.id);

            return (
              <article
                key={p.id}
                className={`
      group relative bg-white rounded-[2.5rem] overflow-hidden transition-all duration-500
      ${isSelected
                    ? 'ring-4 ring-indigo-500 ring-offset-4 scale-[0.98] shadow-xl'
                    : 'hover:shadow-2xl hover:shadow-gray-200/50 border border-gray-100 hover:-translate-y-2'}
    `}
                onClick={() => isSelectionMode ? toggleProductSelection(p.id) : handleViewDetails(p)}
              >

                {/* Top Image Section */}
                <div className="relative h-64 overflow-hidden bg-gray-50">
                  <img
                    src={p.image_urls?.length ? p.image_urls[productImageIndices[p.id] || 0] : p.image_url}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                    alt={p.product_name}
                  />

                  {/* Status & Category Overlay */}
                  <div className="absolute top-4 inset-x-4 flex justify-between items-start">
                    <span className={`
                px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter backdrop-blur-md
                ${p.active ? 'bg-emerald-500/90 text-white' : 'bg-rose-500/90 text-white'}
              `}>
                      {p.active ? 'Active' : 'Archived'}
                    </span>

                    {isSelectionMode && (
                      <div className={`
                  w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all
                  ${isSelected ? 'bg-[#2c4305] border-indigo-600 shadow-lg' : 'bg-white/50 border-white'}
                `}>
                        {isSelected && <FiCheck className="text-white" />}
                      </div>
                    )}
                  </div>

                  {/* Price Tag Overlay */}
                  <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-sm">
                    <span className="text-xs font-bold text-gray-400 mr-1">₹</span>
                    <span className="text-xl font-black text-gray-900">{p.supplier_price}</span>
                  </div>
                </div>

                {/* Content Section */}
                <div className="p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest">
                      {getCategoryName(p.category)}
                    </span>
                    <span className="w-1 h-1 bg-gray-200 rounded-full"></span>
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                      {getCategoryName(p.subcategory)}
                    </span>
                  </div>

                  <h3 className="text-lg font-black text-gray-900 leading-tight mb-4 group-hover:text-[#2c4305] transition-colors">
                    {p.product_name}
                  </h3>

                  <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${totalStock > 0 ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                      <span className="text-xs font-bold text-gray-500">{totalStock} in stock</span>
                    </div>
                  </div>

                  {/* Actions Grid */}
                  {!isSelectionMode && (
                    <div className="space-y-2">
                      <button
                        className="w-full py-3 bg-gray-900 text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-[#2c4305] transition-all shadow-lg shadow-gray-200"
                        onClick={(e) => { e.stopPropagation(); handleViewDetails(p); }}
                      >
                        Quick View
                      </button>

                      <div className="grid grid-cols-3 gap-2">
                        <button
                          className="p-3 bg-gray-50 text-gray-600 rounded-xl hover:bg-indigo-50 hover:text-[#2c4305] transition-colors flex justify-center"
                          onClick={(e) => { e.stopPropagation(); handleEditProduct(p); }}
                          title="Edit Product"
                        >
                          <FiEdit3 />
                        </button>
                        <button
                          className={`p-3 rounded-xl transition-colors flex justify-center ${p.active ? 'bg-gray-50 text-orange-500 hover:bg-orange-50' : 'bg-gray-50 text-emerald-500 hover:bg-emerald-50'}`}
                          onClick={(e) => { e.stopPropagation(); toggleActive(p); }}
                          title={p.active ? "Deactivate" : "Activate"}
                        >
                          {p.active ? <FiEyeOff /> : <FiEye />}
                        </button>
                        <button
                          className="p-3 bg-gray-50 text-gray-400 hover:bg-rose-50 hover:text-rose-500 transition-colors flex justify-center"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (window.confirm(`Delete ${p.product_name}?`)) deleteProduct(p.id);
                          }}
                          title="Delete"
                        >
                          <FiTrash2 />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </section>
      )}

      {/* DETAILS MODAL */}
      {showDetailsModal && selectedProduct && (
        <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md flex justify-center items-center p-4 md:p-10 z-[100]" role="dialog" aria-modal="true">
          <div className="bg-white w-full max-w-4xl max-h-[90vh] rounded-[3rem] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">

            {/* Sticky Top Header */}
            <div className="px-8 py-6 border-b border-gray-100 flex justify-between items-center bg-white/80 backdrop-blur-sm sticky top-0 z-10">
              <div>
                <h2 className="text-2xl font-black text-gray-900 leading-none mb-1">Product Intelligence</h2>
                <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">Specifications & Multi-Tier Pricing</p>
              </div>
              <button
                className="w-10 h-10 rounded-2xl bg-gray-50 text-gray-400 hover:bg-rose-50 hover:text-rose-500 transition-all flex items-center justify-center text-xl"
                onClick={() => setShowDetailsModal(false)}
              >
                <FiX />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 custom-scrollbar">
              <div className="p-8">
                {/* Hero Section */}
                <div className="flex flex-col md:flex-row gap-10 mb-10">
                  {/* Image Gallery Area */}
                  <div className="md:w-1/3">
                    <div className="relative aspect-square rounded-[2rem] overflow-hidden bg-gray-50 border border-gray-100 shadow-inner group">
                      <img
                        src={selectedProduct.image_urls?.[currentImageIndex] || selectedProduct.image_url}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                        alt={selectedProduct.product_name}
                      />
                    </div>
                    {/* Image Indicators */}
                    {selectedProduct.image_urls?.length > 1 && (
                      <div className="flex gap-2 mt-4 justify-center">
                        {selectedProduct.image_urls.map((_, idx) => (
                          <div
                            key={idx}
                            className={`h-1.5 rounded-full transition-all ${idx === currentImageIndex ? 'w-8 bg-[#2c4305]' : 'w-2 bg-gray-200'}`}
                          />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Core Info */}
                  <div className="md:w-2/3 flex flex-col justify-center">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="px-3 py-1 bg-indigo-50 text-[#2c4305] text-[10px] font-black uppercase tracking-widest rounded-full">
                        {getCategoryName(selectedProduct.category)}
                      </span>
                      <FiChevronRight className="text-gray-300" />
                      <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                        {getCategoryName(selectedProduct.subcategory)}
                      </span>
                    </div>

                    <h3 className="text-4xl font-black text-gray-900 mb-4 tracking-tight leading-tight">
                      {selectedProduct.product_name}
                    </h3>

                    {/* Variant Picker (Pill Style) */}
                    <div className="space-y-3">
                      <p className="text-xs font-black text-gray-400 uppercase tracking-widest">Select Variant</p>
                      <div className="flex flex-wrap gap-2">
                        {selectedProduct.variants.map((v) => (
                          <button
                            key={v.id}
                            onClick={() => setSelectedVariantId(Number(v.id))}
                            className={`
                        px-4 py-3 rounded-2xl text-xs font-bold transition-all border
                        ${selectedVariantId === v.id
                                ? 'bg-gray-900 border-gray-900 text-white shadow-lg scale-105'
                                : 'bg-white border-gray-200 text-gray-500 hover:border-indigo-300'}
                      `}
                          >
                            {v.quantity_value} {v.quantity_unit}
                            <span className={`block text-[9px] mt-0.5 opacity-60 ${selectedVariantId === v.id ? 'text-indigo-200' : 'text-gray-400'}`}>
                              Stock: {v.stock}
                            </span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                <hr className="border-gray-100 mb-10" />

                {/* Details & Pricing */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                  {/* Description Area */}
                  <div className="lg:col-span-1">
                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      <FiFileText className="text-indigo-500" /> Product Intelligence
                    </h4>
                    <p className="text-sm leading-relaxed text-gray-600 font-medium">
                      {selectedProduct.description}
                    </p>
                  </div>

                  {/* Pricing Matrix */}
                  <div className="lg:col-span-2">
                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                      < MdCurrencyRupee className="text-indigo-500" /> Multi-Tier Pricing Matrix
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      {(['supplier', 'dealer', 'subdealer', 'retail', 'customer'] as const).map((tier) => {
                        const variant = selectedProduct.variants.find(v => v.id === selectedVariantId);
                        const price = variant?.[`${tier}_price` as keyof typeof variant];
                        const discount = variant?.[`${tier}_discount` as keyof typeof variant];

                        return (
                          <div key={tier} className="group p-5 bg-gray-50/50 rounded-3xl border border-gray-100 hover:bg-white hover:shadow-xl hover:shadow-gray-200/50 transition-all duration-300">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter mb-3 group-hover:text-[#2c4305] transition-colors">
                              {tier}
                            </p>
                            <div className="flex items-baseline gap-1 mb-1">
                              <span className="text-xs font-bold text-gray-400">₹</span>
                              <span className="text-2xl font-black text-gray-900 tracking-tight">{Number(price).toLocaleString()}</span>
                            </div>
                            <div className="inline-flex items-center px-2 py-0.5 bg-emerald-100 rounded-lg">
                              <span className="text-[10px] font-black text-emerald-700">
                                {discount}% OFF
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex justify-end gap-3">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="px-8 py-4 bg-white border border-gray-200 text-gray-500 rounded-2xl font-bold text-xs uppercase tracking-widest hover:border-gray-900 hover:text-gray-900 transition-all"
              >
                Dismiss
              </button>
              <button
                onClick={() => {
                  handleEditProduct(selectedProduct);
                  setShowDetailsModal(false);
                }}
                className="px-8 py-4 bg-[#2c4305] text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-[#2c4305] active:scale-95 transition-all"
              >
                Modify Product
              </button>
            </div>
          </div>
        </div>
      )}


      {/* ADD/EDIT MODAL */}
      <div className="relative">
        {showAddModal && (
          <div className="fixed inset-0 bg-gray-900/60 backdrop-blur-md flex justify-center items-center p-4 md:p-10 z-[100]" role="dialog" aria-modal="true">
            <div className="bg-white w-full max-w-5xl max-h-[92vh] rounded-[3rem] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-300">

              {/* Header */}
              <div className="px-10 py-8 border-b border-gray-100 flex justify-between items-center bg-white">
                <div>
                  <h2 className="text-2xl font-black text-gray-900 leading-none mb-1">
                    {isEditing ? 'Modify Product' : 'Product Onboarding'}
                  </h2>
                  <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">
                    {isEditing ? 'Updating existing catalog entry' : 'New product specifications'}
                  </p>
                </div>
                <button
                  className="w-12 h-12 rounded-2xl bg-gray-50 text-gray-400 hover:bg-rose-50 hover:text-rose-500 transition-all flex items-center justify-center text-2xl"
                  onClick={() => setShowAddModal(false)}
                >
                  <FiX />
                </button>
              </div>

              {/* Scrollable Form Body */}
              <div className="p-10 overflow-y-auto flex-1 bg-gray-50/50 custom-scrollbar">
                <form onSubmit={(e) => { e.preventDefault(); saveProduct(); }} className="space-y-10">

                  {/* 1. BASIC INFORMATION */}
                  <section className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100/50">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 text-[#2c4305] flex items-center justify-center font-bold text-sm">01</div>
                      <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Essential Details</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Product Name</label>
                        <input
                          name="name"
                          value={form.name}
                          onChange={handleChange}
                          className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-none text-sm font-bold text-black focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none"
                          placeholder="e.g. Fish Food"
                          required
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">Description</label>
                        <textarea
                          name="description"
                          value={form.description}
                          onChange={handleChange}
                          className="w-full px-6 py-4 rounded-2xl bg-gray-50 border-none text-sm font-medium text-gray-700 focus:ring-2 focus:ring-indigo-500/20 transition-all outline-none min-h-32"
                          placeholder="Describe technical specs, use-cases, and quality standards..."
                          required
                        />
                      </div>
                      <div className="md:col-span-2 w-full flex items-end justify-between gap-6">

                        {/* PRIMARY CATEGORY */}
                        <div className="flex-1">
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
                            Primary Category
                          </label>

                          <div className="relative">
                            <select
                              name="category"
                              value={form.category}
                              onChange={(e) =>
                                setForm({
                                  ...form,
                                  category: e.target.value,
                                  subcategory: '',
                                })
                              }
                              className="w-full px-6 py-4 rounded-2xl bg-gray-50 text-gray-900 text-sm font-bold border border-gray-200 appearance-none focus:ring-2 focus:ring-indigo-500/20 focus:outline-none"
                            >
                              <option value="">Select Category</option>
                              {mainCategories.map(cat => (
                                <option key={cat.id} value={cat.id}>
                                  {cat.name}
                                </option>
                              ))}
                            </select>

                            <FiChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                          </div>
                        </div>

                        {/* SUB CATEGORY */}
                        <div className="flex-1">
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
                            Sub-Classification
                          </label>

                          <div className="relative">
                            <select
                              name="subcategory"
                              value={form.subcategory}
                              onChange={(e) =>
                                setForm({
                                  ...form,
                                  subcategory: e.target.value,
                                })
                              }
                              disabled={!form.category}
                              className="w-full px-6 py-4 rounded-2xl bg-gray-50 text-gray-900 text-sm font-bold border border-gray-200 appearance-none focus:ring-2 focus:ring-indigo-500/20 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
                            >
                              <option value="">Select Sub Category</option>
                              {subCategories.map(sub => (
                                <option key={sub.id} value={sub.id}>
                                  {sub.name}
                                </option>
                              ))}
                            </select>

                            <FiChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                          </div>
                        </div>

                        {/* INNER CATEGORY */}
                        <div className="flex-1">
                          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2 ml-1">
                            Inner Category
                          </label>
                          <div className="relative">
                            <select
                              name="innercategory"
                              value={form.innercategory}
                              onChange={(e) => setForm({ ...form, innercategory: e.target.value })}
                              disabled={!form.subcategory}
                              className="w-full px-6 py-4 rounded-2xl bg-gray-50 text-gray-900 text-sm font-bold border border-gray-200 appearance-none focus:ring-2 focus:ring-indigo-500/20 focus:outline-none disabled:bg-gray-100 disabled:text-gray-400"
                            >
                              <option value="">Select Inner Category</option>
                              {innerCategories.map(inner => (
                                <option key={inner.id} value={inner.id}>
                                  {inner.name}
                                </option>
                              ))}
                            </select>
                            <FiChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                          </div>
                        </div>

                      </div>


                    </div>


                  </section>

                  {/* 2. VARIANTS & PRICING */}
                  <section className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100/50">
                    <div className="flex justify-between items-center mb-8">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-indigo-50 text-[#2c4305] flex items-center justify-center font-bold text-sm">02</div>
                        <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Variants & Multi-Tier Pricing</h3>
                      </div>
                      <button
                        type="button"
                        onClick={addVariant}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#2c4305] text-white font-black text-[10px] uppercase tracking-widest hover:bg-[#2c4305] transition-all shadow-lg shadow-indigo-100"
                      >
                        <FiPlusCircle className="text-sm" /> Add New Variant
                      </button>
                    </div>

                    <div className="space-y-6">
                      {form.variants.map((v, idx) => (
                        <div key={idx} className="group relative bg-gray-50/50 rounded-[2rem] p-8 border border-gray-100 hover:bg-white hover:border-indigo-100 transition-all">
                          {idx > 0 && (
                            <button
                              type="button"
                              onClick={() => removeVariant(idx)}
                              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white text-rose-500 shadow-md border border-gray-100 flex items-center justify-center hover:bg-rose-500 hover:text-white transition-all"
                            >
                              <FiTrash2 className="text-xs" />
                            </button>
                          )}

                          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8 pb-8 border-b border-gray-100">
                            <div>
                              <label className="block text-[9px] font-black text-gray-400 uppercase mb-2">
                                Quantity (e.g., 1 kg)
                              </label>

                              <input
                                type="number"
                                value={v.quantity_value ?? ""}
                                onChange={(e) =>
                                  handleVariantChange(idx, "quantity_value", e.target.value)
                                }
                                className="w-full px-4 py-3 rounded-xl bg-white border text-black border-gray-200 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                                placeholder="0"
                              />
                            </div>

                            <div>
                              <label className="block text-[9px] font-black text-gray-400 uppercase mb-2">Unit</label>
                              <select
                                value={v.quantity_unit}
                                onChange={(e) => handleVariantChange(idx, 'quantity_unit', e.target.value)}
                                className="w-full px-4 py-3 text-black rounded-xl bg-white border border-gray-200 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                              >
                                <option value="">Unit</option>
                                {['g', 'kg', 'ml', 'pcs', 'liters'].map((u) => <option key={u} value={u}>{u}</option>)}
                              </select>
                            </div>
                            <div>
                              <label className="block text-[9px] font-black text-gray-400 uppercase mb-2">
                                Current Stock
                              </label>

                              <input
                                type="number"
                                value={v.stock ?? ""}
                                onChange={(e) =>
                                  handleVariantChange(idx, "stock", e.target.value)
                                }
                                className="w-full px-4 py-3 rounded-xl text-black bg-white border border-gray-200 text-sm font-bold focus:ring-2 focus:ring-indigo-500/20 outline-none"
                              />
                            </div>

                          </div>

                          {/* Pricing Tiers Grid */}
                          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                            {[
                              { f: 'supplier', label: 'Supplier' },
                              { f: 'dealer', label: 'Dealer' },
                              { f: 'subdealer', label: 'Sub-Dealer' },
                              { f: 'retail', label: 'Retail' },
                              { f: 'customer', label: 'End Customer' },
                            ].map((tier) => (
                              <div key={tier.f} className="space-y-2">
                                <label className="block text-[9px] font-black text-gray-400 uppercase">{tier.label}</label>
                                <div className="relative">
                                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs">₹</span>
                                  <input
                                    type="number"
                                    value={(v[`${tier.f}_price` as keyof Variant] as string) ?? ""}
                                    onChange={(e) =>
                                      handleVariantChange(
                                        idx,
                                        `${tier.f}_price` as keyof Variant,
                                        e.target.value
                                      )
                                    }
                                    className="w-full text-black pl-7 pr-3 py-2.5 rounded-xl bg-white border border-gray-200 text-xs font-black outline-none focus:border-indigo-500"
                                    placeholder="0"
                                  />

                                </div>
                                <div className="relative">
                                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-500 font-bold text-[10px]">%</span>
                                  <input
  type="number"
  value={(v[`${tier.f}_discount` as keyof Variant] as string) ?? ""}
  onChange={(e) =>
    handleVariantChange(
      idx,
      `${tier.f}_discount` as keyof Variant,
      e.target.value
    )
  }
  className="w-full pl-3 text-black pr-7 py-2 rounded-lg bg-emerald-50/50 border border-emerald-100 text-[10px] font-bold text-emerald-700 outline-none"
  placeholder="Disc"
/>

                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </section>

                  {/* 3. MEDIA ASSETS */}
                  <section className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100/50">
                    <div className="flex items-center gap-3 mb-6">
                      <div className="w-8 h-8 rounded-xl bg-indigo-50 text-[#2c4305] flex items-center justify-center font-bold text-sm">03</div>
                      <h3 className="text-lg font-black text-gray-900 uppercase tracking-tight">Product Identity</h3>
                    </div>

                    <label
                      htmlFor="image-upload"
                      className="group flex flex-col items-center justify-center p-12 border-2 border-dashed border-gray-200 rounded-[2rem] cursor-pointer hover:border-indigo-300 transition-all bg-gray-50/50 relative"
                    >
                      {/* Loading overlay */}
                      {imageUploading && (
                        <div className="absolute inset-0 bg-white/80 flex items-center justify-center rounded-[2rem]">
                          <div className="animate-spin rounded-full h-10 w-10 border-t-4 border-indigo-500"></div>
                          <span className="ml-3 text-sm font-black text-gray-700 uppercase tracking-widest">
                            Uploading...
                          </span>
                        </div>
                      )}

                      <div className="w-16 h-16 rounded-2xl bg-white shadow-sm flex items-center justify-center text-indigo-500 text-2xl mb-4 group-hover:scale-110 transition-transform">
                        <FiUploadCloud />
                      </div>
                      <span className="text-sm font-black text-gray-900 uppercase tracking-widest mb-1">
                        Click to Upload
                      </span>
                      <span className="text-xs font-bold text-gray-400">
                        SVG, PNG, JPG (Max 6 images)
                      </span>

                      <input
                        id="image-upload"
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="hidden"
                      />
                    </label>


                    <div className="flex gap-4 mt-8 flex-wrap">
                      {[...imagePreviews, ...form.image_urls].map((url, i) => {
                        const isUploading = i < imagePreviews.length && imageUploading;

                        return (
                          <div key={i} className="group relative w-24 h-24 rounded-2xl overflow-hidden border-2 border-white shadow-md">
                            <img src={url} className="w-full h-full object-cover" alt="Preview" />

                            {isUploading && (
                              <div className="absolute inset-0 bg-white/60 flex items-center justify-center">
                                <div className="animate-spin rounded-full h-8 w-8 border-t-4 border-indigo-500"></div>
                              </div>
                            )}

                            <button
                              type="button"
                              onClick={() => removeImage(i)}
                              className="absolute inset-0 bg-rose-500/80 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-xl"
                            >
                              <FiXCircle />
                            </button>
                          </div>
                        );
                      })}
                    </div>

                  </section>
                </form>
              </div>

              {/* Sticky Footer Actions */}
              <div className="p-8 border-t border-gray-100 bg-white flex justify-end gap-4">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-8 py-4 bg-gray-50 text-gray-400 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-gray-100 hover:text-gray-600 transition-all"
                >
                  Discard
                </button>
                <button
                  type="submit"
                  onClick={(e) => { e.preventDefault(); saveProduct(); }}
                  className="px-10 py-4 bg-gray-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-gray-200 hover:bg-[#2c4305] transition-all active:scale-95"
                >
                  {isEditing ? 'Save Product' : 'Publish to Catalog'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* TOAST NOTIFICATION */}
        {successMessage && (
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-gray-900 text-white px-8 py-4 rounded-2xl shadow-2xl z-[200] font-black text-[10px] uppercase tracking-[0.2em] animate-in slide-in-from-bottom-5 fade-in duration-300 flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            {successMessage}
          </div>
        )}
      </div>
    </div>
  );
}

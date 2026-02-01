'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase';
import {
  FiUser, FiMail, FiPhone, FiBriefcase, FiMapPin,
  FiSave, FiLayers, FiLock, FiEye, FiEyeOff, FiHash, FiArrowLeft
} from 'react-icons/fi';
import toast, { Toaster } from 'react-hot-toast';

// --- Types ---
interface FormData {
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  phone: string;
  company_name: string;
  gst_number: string;
  store_address: string;
  address: string;
  role: string;
}

interface AddRetailerProps {
  existingDealer?: FormData | null;
}

// --- Initial State for Clearing ---
const initialState: FormData = {
  first_name: '',
  last_name: '',
  email: '',
  password: '',
  phone: '',
  company_name: '',
  gst_number: '',
  store_address: '',
  address: '',
  role: 'retail_outlet',
};

// --- Reusable Input Component ---
const InputField = ({ label, icon: Icon, children }: any) => (
  <div className="flex flex-col gap-1.5 w-full">
    <label className="text-sm font-semibold text-slate-700 ml-1">{label}</label>
    <div className="relative group">
      {Icon && (
        <Icon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
      )}
      {children}
    </div>
  </div>
);

export default function AddRetailer({ existingDealer = null }: AddRetailerProps) {
  const router = useRouter();
  const supabase = createClient();

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<FormData>(existingDealer || initialState);

  const isReviewMode = !!existingDealer;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (isReviewMode) return;
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'gst_number' ? value.toUpperCase() : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validations
    if (!isReviewMode && formData.password.length < 6) {
      return toast.error('Password must be at least 6 characters');
    }
    
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (formData.gst_number && !gstRegex.test(formData.gst_number)) {
      return toast.error('Invalid GST format');
    }

    setLoading(true);
    const toastId = toast.loading('Creating partner profile...');

    try {
      // 1. Create Auth User
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: { 
          data: { 
            first_name: formData.first_name, 
            role: formData.role 
          } 
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Authentication failed");

      // 2. Insert into Dealers Table
      const { error: dbError } = await supabase.from('dealers').insert([
        { 
          ...formData, 
          user_id: authData.user.id, 
          approval_status: 'approved' 
        }
      ]);

      if (dbError) throw dbError;

      // 3. Success Feedback
      toast.success('Partner onboarded successfully!', { id: toastId });
      
      // 4. Clear Form Data
      setFormData(initialState);
      setShowPassword(false);

    } catch (err: any) {
      toast.error(err.message || 'An error occurred', { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const inputClasses = "w-full pl-12 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all placeholder:text-slate-400 text-slate-900";

  return (
    <div className="min-h-screen bg-[#F8FAFC] py-12 px-4">
      <Toaster position="top-center" />
      
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Partner Onboarding</h1>
            <p className="text-slate-500">Add a new business partner to the system.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-8 md:p-12 space-y-10">
            
            {/* Section 1: Personal Details */}
            <section className="space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><FiUser /></div>
                <h3 className="font-bold text-slate-800">Primary Contact</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputField label="First Name">
                  <input name="first_name" placeholder="John" required className={inputClasses} value={formData.first_name} onChange={handleChange} />
                </InputField>
                <InputField label="Last Name">
                  <input name="last_name" placeholder="Doe" required className={inputClasses} value={formData.last_name} onChange={handleChange} />
                </InputField>
                <InputField label="Email Address" icon={FiMail}>
                  <input name="email" type="email" placeholder="john@company.com" required className={inputClasses} value={formData.email} onChange={handleChange} />
                </InputField>
                <InputField label="Create Password" icon={FiLock}>
                  <input 
                    name="password" 
                    type={showPassword ? 'text' : 'password'} 
                    placeholder="••••••••" 
                    required 
                    className={inputClasses} 
                    value={formData.password} 
                    onChange={handleChange} 
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-indigo-500 transition-colors">
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </InputField>
              </div>
            </section>

            {/* Section 2: Business Profile */}
            <section className="space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><FiBriefcase /></div>
                <h3 className="font-bold text-slate-800">Business Profile</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputField label="Partner Type" icon={FiLayers}>
                  <select name="role" className={`${inputClasses} appearance-none`} value={formData.role} onChange={handleChange}>
                    <option value="retail_outlet">Retail Outlet</option>
                    <option value="sub_dealer">Sub-Dealer</option>
                    <option value="dealer">Dealer</option>
                  </select>
                </InputField>
                <InputField label="GST Number" icon={FiHash}>
                  <input name="gst_number" placeholder="15-digit GSTIN" required className={inputClasses} value={formData.gst_number} onChange={handleChange} />
                </InputField>
                <div className="md:col-span-2">
                  <InputField label="Company / Store Name" icon={FiBriefcase}>
                    <input name="company_name" placeholder="Legal Entity Name" required className={inputClasses} value={formData.company_name} onChange={handleChange} />
                  </InputField>
                </div>
                <InputField label="Phone Number" icon={FiPhone}>
                  <input name="phone" placeholder="+91" required className={inputClasses} value={formData.phone} onChange={handleChange} />
                </InputField>
              </div>
            </section>

            {/* Section 3: Locations */}
            <section className="space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><FiMapPin /></div>
                <h3 className="font-bold text-slate-800">Address Details</h3>
              </div>
              <div className="grid grid-cols-1 gap-6">
                <InputField label="Physical Store Address" icon={FiMapPin}>
                  <textarea name="store_address" rows={2} placeholder="Physical shop location..." className={`${inputClasses} pl-12 pt-3 resize-none`} value={formData.store_address} onChange={handleChange} />
                </InputField>
                <InputField label="Billing Address" icon={FiMapPin}>
                  <textarea name="address" rows={2} placeholder="Registered billing address..." className={`${inputClasses} pl-12 pt-3 resize-none`} value={formData.address} onChange={handleChange} />
                </InputField>
              </div>
            </section>
          </div>

          {/* Footer Actions */}
          <div className="bg-slate-50 px-8 py-6 flex flex-col-reverse md:flex-row justify-end gap-4 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setFormData(initialState)}
              className="px-8 py-3 text-slate-600 font-bold hover:bg-slate-200 rounded-xl transition-all"
            >
              Clear Form
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-200 active:scale-95 transition-all flex items-center justify-center gap-3 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <FiSave className="text-lg" /> 
                  <span>Register Partner</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
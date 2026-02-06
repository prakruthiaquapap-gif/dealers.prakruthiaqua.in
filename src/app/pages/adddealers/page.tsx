'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase';
import {
  FiUser, FiMail, FiPhone, FiBriefcase, FiMapPin,
  FiSave, FiLayers, FiLock, FiEye, FiEyeOff, FiHash, FiRotateCcw, FiChevronDown, FiAlertCircle
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
  role: '',
};

// --- Reusable Input Component ---
const InputField = ({ label, icon: Icon, error, required = true, children }: any) => (
  <div className="flex flex-col gap-1.5 w-full">
    <label className="text-xs font-bold uppercase tracking-wider text-slate-500 ml-1 flex justify-between">
      <span>{label} {required && <span className="text-red-500">*</span>}</span>
    </label>
    <div className="relative group">
      {Icon && (
        <Icon className={`absolute left-4 top-1/2 -translate-y-1/2 transition-colors z-10 ${
          error ? 'text-red-400' : 'text-slate-400 group-focus-within:text-indigo-600'
        }`} />
      )}
      {children}
    </div>
    {error && (
      <div className="flex items-center gap-1 text-red-500 text-xs font-medium ml-1 mt-1 animate-in fade-in slide-in-from-top-1">
        <FiAlertCircle size={12} /> {error}
      </div>
    )}
  </div>
);

export default function AddRetailer() {
  const router = useRouter();
  const supabase = createClient();
  
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState<FormData>(initialState);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const validate = () => {
    const newErrors: Partial<Record<keyof FormData, string>> = {};
    
    // Required Fields Validation
    if (!formData.first_name.trim()) newErrors.first_name = "First name is required";
    if (!formData.last_name.trim()) newErrors.last_name = "Last name is required";
    if (!formData.email.trim()) {
        newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
        newErrors.email = "Invalid email format";
    }
    if (!formData.password) newErrors.password = "Password is required";
    else if (formData.password.length < 6) newErrors.password = "Must be at least 6 characters";
    
    if (!formData.role) newErrors.role = "Please select a partner role";
    if (!formData.company_name.trim()) newErrors.company_name = "Company name is required";
    if (!formData.phone.trim()) newErrors.phone = "Phone number is required";
    if (!formData.store_address.trim()) newErrors.store_address = "Store address is required";
    if (!formData.address.trim()) newErrors.address = "Billing address is required";

    // GST Validation (Optional: Validate only if filled)
    if (formData.gst_number.trim().length > 0) {
        const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
        if (!gstRegex.test(formData.gst_number)) {
            newErrors.gst_number = "Invalid GST format (15 characters required)";
        }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    if (errors[name as keyof FormData]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
    setFormData(prev => ({
      ...prev,
      [name]: name === 'gst_number' ? value.toUpperCase() : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      toast.error("Please fill all mandatory fields");
      return;
    }
    
    setLoading(true);
    const toastId = toast.loading('Registering partner...');
    
    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: { data: { first_name: formData.first_name, role: formData.role } }
      });

      if (authError) throw authError;

      const { error: dbError } = await supabase.from('dealers').insert([
        { ...formData, user_id: authData.user?.id, approval_status: 'approved' }
      ]);

      if (dbError) throw dbError;

      toast.success('Partner added successfully!', { id: toastId });
      setFormData(initialState);
      setErrors({});
    } catch (err: any) {
      toast.error(err.message || "Failed to register", { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  const getInputClasses = (fieldName: keyof FormData) => `
    w-full pl-11 pr-4 py-3 bg-white border rounded-xl outline-none transition-all text-slate-800 text-sm
    ${errors[fieldName] 
      ? 'border-red-500 focus:ring-4 focus:ring-red-500/10' 
      : 'border-slate-200 focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500'}
  `;

  return (
    <div className="min-h-screen bg-[#F8FAFC] p-4 md:p-8 lg:p-12">
      <Toaster position="top-right" />
      
      <div className="max-w-[1400px] mx-auto">
        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* LEFT: Info & Submit */}
          <div className="lg:col-span-4 lg:sticky lg:top-8">
            <div className="bg-white p-8 rounded-[2rem] shadow-2xl shadow-indigo-200 text-white">
              <h1 className="text-3xl text-[#2c4305] font-black tracking-tight mb-4">Partner Onboarding</h1>
              <p className="text-black text-sm leading-relaxed mb-8">
                Every field marked with <span className="text-red-300 font-bold">*</span> is mandatory. 
                GST is optional, but must be valid if provided.
              </p>

              <div className="space-y-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-4 bg-[#2c4305] text-white font-bold rounded-2xl  shadow-lg active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-70"
                >
                  {loading ? <div className="w-5 h-5 border-2 border-indigo-600 border-t-indigo-600 rounded-full animate-spin" /> : <FiSave className="text-lg"/>}
                  <span>{loading ? 'Processing...' : 'Register Partner'}</span>
                </button>
                
                <button
                  type="button"
                  onClick={() => { setFormData(initialState); setErrors({}); }}
                  className="w-full py-3 text-black font-semibold  hover:bg-white/10 rounded-xl transition-all flex items-center justify-center gap-2"
                >
                  <FiRotateCcw size={14} /> Reset Form
                </button>
              </div>
            </div>
          </div>

          {/* RIGHT: Form Data */}
          <div className="lg:col-span-8 space-y-6">
            
            {/* Contact Info */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg"><FiUser /></div>
                <h3 className="font-bold text-slate-800 text-lg">Personal Details</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputField label="First Name" error={errors.first_name}>
                  <input name="first_name" placeholder="Enter first name" className={getInputClasses('first_name')} value={formData.first_name} onChange={handleChange} />
                </InputField>
                <InputField label="Last Name" error={errors.last_name}>
                  <input name="last_name" placeholder="Enter last name" className={getInputClasses('last_name')} value={formData.last_name} onChange={handleChange} />
                </InputField>
                <InputField label="Email" icon={FiMail} error={errors.email}>
                  <input name="email" type="email" placeholder="email@domain.com" className={getInputClasses('email')} value={formData.email} onChange={handleChange} />
                </InputField>
                <InputField label="Password" icon={FiLock} error={errors.password}>
                  <input 
                    name="password" 
                    type={showPassword ? 'text' : 'password'} 
                    placeholder="••••••••" 
                    className={getInputClasses('password')} 
                    value={formData.password} 
                    onChange={handleChange} 
                  />
                  <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400">
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </InputField>
              </div>
            </div>

            {/* Business Info */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><FiBriefcase /></div>
                <h3 className="font-bold text-slate-800 text-lg">Business Details</h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <InputField label="Partner Role" icon={FiLayers} error={errors.role}>
                  <div className="relative">
                    <select name="role" className={`${getInputClasses('role')} appearance-none`} value={formData.role} onChange={handleChange}>
                      <option value="" disabled>Choose a role...</option>
                      <option value="retail_outlet">Retail Outlet</option>
                      <option value="sub_dealer">Sub-Dealer</option>
                      <option value="dealer">Dealer</option>
                    </select>
                    <FiChevronDown className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                  </div>
                </InputField>

                <InputField label="GST Number" icon={FiHash} error={errors.gst_number} required={false}>
                  <input name="gst_number" placeholder="Optional (15-digit)" className={getInputClasses('gst_number')} value={formData.gst_number} onChange={handleChange} />
                </InputField>

                <div className="md:col-span-2">
                  <InputField label="Company Name" icon={FiBriefcase} error={errors.company_name}>
                    <input name="company_name" placeholder="Legal business name" className={getInputClasses('company_name')} value={formData.company_name} onChange={handleChange} />
                  </InputField>
                </div>

                <InputField label="Phone Number" icon={FiPhone} error={errors.phone}>
                  <input name="phone" placeholder="+91" className={getInputClasses('phone')} value={formData.phone} onChange={handleChange} />
                </InputField>
              </div>
            </div>

            {/* Location Info */}
            <div className="bg-white p-8 rounded-3xl shadow-sm border border-slate-200">
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><FiMapPin /></div>
                <h3 className="font-bold text-slate-800 text-lg">Address</h3>
              </div>
              <div className="grid grid-cols-1 gap-5">
                <InputField label="Store Address" icon={FiMapPin} error={errors.store_address}>
                  <textarea name="store_address" rows={2} placeholder="Physical shop address" className={`${getInputClasses('store_address')} pl-11 pt-3 resize-none`} value={formData.store_address} onChange={handleChange} />
                </InputField>
                <InputField label="Billing Address" icon={FiMapPin} error={errors.address}>
                  <textarea name="address" rows={2} placeholder="Registered billing address" className={`${getInputClasses('address')} pl-11 pt-3 resize-none`} value={formData.address} onChange={handleChange} />
                </InputField>
              </div>
            </div>

          </div>
        </form>
      </div>
    </div>
  );
}
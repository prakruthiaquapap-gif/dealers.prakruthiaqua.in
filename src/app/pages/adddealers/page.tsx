// app/add-retailer/page.tsx (for App Router in Next.js 13+)

'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/utils/supabase'; // Fixed import
import { 
  FiUser, FiMail, FiPhone, FiBriefcase, FiMapPin, 
  FiSave, FiLayers, FiLock, FiEye, FiEyeOff, FiHash 
} from 'react-icons/fi';
import toast, { Toaster } from 'react-hot-toast';

// Define types for TypeScript
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

export default function AddRetailer({ existingDealer = null }: AddRetailerProps) {
  const router = useRouter();
  const supabase = createClient(); // Create the supabase client instance

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Handle Window Resize for Responsive Layout
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    setIsMobile(window.innerWidth < 768);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [formData, setFormData] = useState<FormData>(existingDealer || {
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
  });

  const isReviewMode = !!existingDealer;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    if (isReviewMode) return;
    setErrorMsg(''); 
    const { name, value } = e.target;
    setFormData({ 
      ...formData, 
      [name]: name === 'gst_number' ? value.toUpperCase() : value 
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isReviewMode && formData.password.length < 6) {
      toast.error('Password must be at least 6 characters!');
      return;
    }
    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (formData.gst_number && !gstRegex.test(formData.gst_number)) {
      toast.error('Invalid GST format!');
      return;
    }

    setLoading(true);
    const toastId = toast.loading('Provisioning credentials...');

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: { data: { first_name: formData.first_name, role: formData.role } }
      });

      if (authError) throw authError;

      const { error: dbError } = await supabase.from('dealers').insert([
        { 
          ...formData,
          user_id: authData.user.id, 
          approval_status: 'approved' 
        }
      ]);

      if (dbError) throw dbError;

      toast.success('Partner created successfully!', { id: toastId });
      if (!existingDealer) router.push('/manage-partners'); // Adjust route as needed

    } catch (err: any) {
      toast.error(err.message, { id: toastId });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white p-4 md:p-6 font-inter">
      <Toaster position="top-right" />
      
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl md:text-3xl font-black text-gray-900">Partner Onboarding</h1>
          <p className="text-gray-600 text-sm mt-1">Create business credentials for new partners.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 md:p-10">
          {/* Main Grid: Stacks on mobile */}
          <div className={`grid gap-6 mb-6 ${isMobile ? 'grid-cols-1' : 'grid-cols-2'}`}>
            
            {/* Identity Section */}
            <div className="space-y-4">
              <h3 className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wide">
                <FiUser /> Identity
              </h3>
              
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Full Name</label>
                <div className={`flex gap-3 ${isMobile ? 'flex-col' : 'flex-row'}`}>
                  <input
                    name="first_name"
                    placeholder="First Name"
                    value={formData.first_name}
                    required
                    className="flex-1 px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                    onChange={handleChange}
                  />
                  <input
                    name="last_name"
                    placeholder="Last Name"
                    value={formData.last_name}
                    required
                    className="flex-1 px-4 py-3 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email Address</label>
                <div className="relative">
                  <FiMail className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    name="email"
                    type="email"
                    placeholder="email@business.com"
                    value={formData.email}
                    required
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Login Password</label>
                <div className="relative">
                  <FiLock className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input 
                    name="password" 
                    type={showPassword ? 'text' : 'password'} 
                    placeholder="Set password"
                    value={formData.password} 
                    required 
                    className="w-full pl-12 pr-12 py-3 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                    onChange={handleChange} 
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <FiEyeOff /> : <FiEye />}
                  </button>
                </div>
              </div>
            </div>

            {/* Business Section */}
            <div className="space-y-4">
              <h3 className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wide">
                <FiBriefcase /> Business Profile
              </h3>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Partner Type</label>
                <div className="relative">
                  <FiLayers className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 appearance-none"
                  >
                    <option value="retail_outlet">Retail Outlet</option>
                    <option value="sub_dealer">Sub-Dealer</option>
                    <option value="dealer">Dealer</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">GST Number</label>
                <div className="relative">
                  <FiHash className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    name="gst_number"
                    placeholder="15-digit GSTIN"
                    value={formData.gst_number}
                    required
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                    onChange={handleChange}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Phone Number</label>
                <div className="relative">
                  <FiPhone className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <input
                    name="phone"
                    placeholder="+91 ..."
                    value={formData.phone}
                    required
                    className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                    onChange={handleChange}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Company / Store Name</label>
              <div className="relative">
                <FiBriefcase className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  name="company_name"
                  placeholder="Legal Entity Name"
                  value={formData.company_name}
                  required
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Physical Store Address</label>
              <div className="relative">
                <FiMapPin className="absolute left-4 top-4 text-gray-400" />
                <textarea
                  name="store_address"
                  placeholder="Where is the shop located?"
                  value={formData.store_address}
                  required
                  rows={2}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  onChange={handleChange}
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Billing Address</label>
              <div className="relative">
                <FiMapPin className="absolute left-4 top-4 text-gray-400" />
                <textarea
                  name="address"
                  placeholder="Official registered address"
                  value={formData.address}
                  required
                  rows={2}
                  className="w-full pl-12 pr-4 py-3 bg-gray-50 border border-gray-300 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
                  onChange={handleChange}
                />
              </div>
            </div>
          </div>

          <div className={`flex gap-4 pt-6 mt-6 border-t border-gray-200 ${isMobile ? 'flex-col-reverse' : 'flex-row justify-end'}`}>
            <button
              type="button"
              onClick={() => router.back()}
              className={`px-6 py-3 rounded-xl border border-gray-300 bg-gray-50 text-gray-600 font-semibold hover:bg-gray-100 transition-all ${isMobile ? 'w-full' : ''}`}
            >
              Discard
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`px-6 py-3 rounded-xl border-none bg-green-600 text-white font-semibold hover:bg-green-700 transition-all flex items-center justify-center gap-2 ${isMobile ? 'w-full' : ''}`}
            >
              {loading ? 'Processing...' : <><FiSave /> Save & Onboard</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
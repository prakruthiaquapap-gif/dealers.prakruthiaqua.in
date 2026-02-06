'use client';

import React, { useState } from 'react';
import { createClient } from '@/utils/supabase';
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import { Eye, EyeOff, ChevronLeft } from 'lucide-react';

export default function LoginPage() {
  const supabase = createClient();
  const router = useRouter();

  const [isLogin, setIsLogin] = useState(true);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    companyName: '',
    gstNumber: '',
    address: '',
    storeAddress: '',
    role: 'Dealer',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Logic to clear form when switching modes
  const toggleMode = () => {
    setIsLogin(!isLogin);
    setStep(1);
    setFormData({
      email: '', phone: '', password: '', confirmPassword: '',
      firstName: '', lastName: '', companyName: '', gstNumber: '',
      address: '', storeAddress: '', role: 'Dealer'
    });
  };

  const handleLogin = async () => {
    if (!formData.email || !formData.password) return toast.error("Enter email and password");
    setLoading(true);
    try {
      const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });
      if (authErr) throw authErr;

      const { data: dealer, error: dbErr } = await supabase
        .from('dealers').select('approval_status').eq('user_id', authData.user.id).single();

      if (dbErr || !dealer) {
        await supabase.auth.signOut();
        return toast.error("Dealer profile not found.");
      }
      if (dealer.approval_status === 'pending') {
        await supabase.auth.signOut();
        return toast.error("Your account is pending approval.");
      }
      
      toast.success("Login Successful!");
      router.push('/pages/dashboard');
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  const validateStep = async () => {
    if (step === 1) {
      if (!formData.email || !formData.password || !formData.phone) return toast.error("Fill all fields");
      if (formData.password !== formData.confirmPassword) return toast.error("Passwords do not match");

      setLoading(true);
      try {
        const { data: existingUser } = await supabase
          .from('dealers').select('email').eq('email', formData.email.toLowerCase().trim()).maybeSingle();
        if (existingUser) return toast.error("Email already registered.");
        setStep(2);
      } catch (err) {
        toast.error("Error checking status");
      } finally {
        setLoading(false);
      }
    } else if (step === 2) {
      if (!formData.companyName || !formData.firstName) return toast.error("Company and First name required");
      if (formData.gstNumber && formData.gstNumber.length !== 15) return toast.error("GST must be 15 chars");
      setStep(3);
    }
  };

  const handleRegister = async () => {
    if (!formData.address || !formData.storeAddress) return toast.error("Addresses required");
    setLoading(true);
    const { data: auth, error: authErr } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.password,
    });

    if (authErr) {
      toast.error(authErr.message);
      setLoading(false);
      return;
    }

    const { error: dbErr } = await supabase.from('dealers').insert({
      user_id: auth.user?.id,
      email: formData.email,
      phone: formData.phone,
      first_name: formData.firstName,
      last_name: formData.lastName,
      company_name: formData.companyName,
      gst_number: formData.gstNumber || null,
      address: formData.address,
      store_address: formData.storeAddress,
      role: formData.role,
      approval_status: 'pending'
    });

    if (dbErr) toast.error(dbErr.message);
    else {
      toast.success("Success! Wait for approval.");
      setIsLogin(true);
      setStep(1);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#f8f9fa] flex items-center justify-center p-4">
      <Toaster position="top-right" />
      <div className="bg-white rounded-[2rem] shadow-2xl flex flex-col md:flex-row max-w-5xl w-full overflow-hidden min-h-[600px] border border-gray-100">
        <div className="w-full md:w-1/2 flex flex-col items-center justify-center p-12 bg-white border-r border-gray-100">
          <img src="/logo.jpeg" alt="Logo" className="w-64 h-64 object-contain mb-6" />
          <h1 className="text-3xl font-black text-[#1a2b4b]">Prakruthi</h1>
        </div>

        <div className="w-full md:w-1/2 p-10 md:p-16 flex flex-col justify-center relative">
          <div className="mb-8">
            <h2 className="text-4xl font-black text-gray-900 mb-2">{isLogin ? "Sign In" : `Step ${step} of 3`}</h2>
            <p className="text-gray-500 font-medium">
              {isLogin ? "Join the network?" : "Already a member?"}
              <button onClick={toggleMode} className="ml-2 text-[#2c4305] font-bold hover:underline">
                {isLogin ? "Register Now" : "Login"}
              </button>
            </p>
          </div>

          <div className="space-y-5">
            {isLogin ? (
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-black text-gray-400 uppercase ml-1">Registered Email</label>
                  <input name="email" type="email" value={formData.email} onChange={handleChange} className="w-full p-4 bg-gray-50 border rounded-2xl text-black outline-none focus:border-[#2c4305]" placeholder="email@example.com" />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black text-gray-400 uppercase ml-1">Password</label>
                  <div className="relative">
                    <input name="password" type={showPassword ? "text" : "password"} value={formData.password} onChange={handleChange} className="w-full p-4 bg-gray-50 border rounded-2xl text-black outline-none focus:border-[#2c4305]" placeholder="••••••••" />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-4 text-gray-400">
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
                <button onClick={handleLogin} disabled={loading} className="w-full bg-[#2c4305] text-white py-4 rounded-2xl font-black text-lg disabled:opacity-50">
                  {loading ? "AUTHENTICATING..." : "LOGIN"}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {step === 1 && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-black text-gray-400 uppercase ml-1">Email</label>
                      <input name="email" value={formData.email} placeholder="email@example.com" onChange={handleChange} className="w-full p-4 bg-gray-50 border rounded-2xl text-black outline-none focus:border-[#2c4305]" />
                    </div>
                    <div>
                      <label className="text-xs font-black text-gray-400 uppercase ml-1">Phone</label>
                      <input name="phone" value={formData.phone} placeholder="Phone Number" onChange={handleChange} className="w-full p-4 bg-gray-50 border rounded-2xl text-black outline-none focus:border-[#2c4305]" />
                    </div>
                    <div>
                      <label className="text-xs font-black text-gray-400 uppercase ml-1">Password</label>
                      <div className="relative">
                        <input name="password" value={formData.password} type={showPassword ? "text" : "password"} placeholder="••••••••" onChange={handleChange} className="w-full p-4 bg-gray-50 border rounded-2xl text-black outline-none focus:border-[#2c4305]" />
                        <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-4 text-gray-400">
                          {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="text-xs font-black text-gray-400 uppercase ml-1">Confirm Password</label>
                      <input name="confirmPassword" value={formData.confirmPassword} type={showPassword ? "text" : "password"} placeholder="••••••••" onChange={handleChange} className="w-full p-4 bg-gray-50 border rounded-2xl text-black outline-none focus:border-[#2c4305]" />
                    </div>
                    <button onClick={validateStep} disabled={loading} className="w-full bg-[#2c4305] text-white py-4 rounded-2xl font-black">
                      {loading ? "CHECKING..." : "CONTINUE"}
                    </button>
                  </div>
                )}

                {step === 2 && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-black text-gray-400 uppercase ml-1">Company Name</label>
                      <input name="companyName" value={formData.companyName} onChange={handleChange} className="w-full p-4 bg-gray-50 border rounded-2xl text-black outline-none focus:border-[#2c4305]" />
                    </div>
                    <div>
                      <label className="text-xs font-black text-gray-400 uppercase ml-1">GST Number (Optional)</label>
                      <input name="gstNumber" value={formData.gstNumber} maxLength={15} placeholder="15 Digit GST" onChange={handleChange} className="w-full p-4 bg-gray-50 border rounded-2xl text-black outline-none focus:border-[#2c4305] uppercase" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs font-black text-gray-400 uppercase ml-1">First Name</label>
                        <input name="firstName" value={formData.firstName} onChange={handleChange} className="w-full p-4 bg-gray-50 border rounded-2xl text-black outline-none focus:border-[#2c4305]" />
                      </div>
                      <div>
                        <label className="text-xs font-black text-gray-400 uppercase ml-1">Last Name</label>
                        <input name="lastName" value={formData.lastName} onChange={handleChange} className="w-full p-4 bg-gray-50 border rounded-2xl text-black outline-none focus:border-[#2c4305]" />
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => setStep(1)} className="w-1/3 bg-gray-100 text-gray-600 py-4 rounded-2xl font-black flex items-center justify-center gap-2"><ChevronLeft size={20}/>BACK</button>
                      <button onClick={validateStep} className="w-2/3 bg-[#2c4305] text-white py-4 rounded-2xl font-black">NEXT</button>
                    </div>
                  </div>
                )}

                {step === 3 && (
                  <div className="space-y-4">
                    <div>
                      <label className="text-xs font-black text-gray-400 uppercase ml-1">Role</label>
                      <select name="role" value={formData.role} onChange={handleChange} className="w-full p-4 bg-gray-50 border rounded-2xl text-black outline-none focus:border-[#2c4305]">
                        <option value="Dealer">Dealer</option>
                        <option value="sub_dealer">Sub Dealer</option>
                        <option value="retail_outlet">Retailer Outlet</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-black text-gray-400 uppercase ml-1">Registered Address</label>
                      <textarea name="address" value={formData.address} onChange={handleChange} className="w-full p-4 bg-gray-50 border rounded-2xl text-black outline-none focus:border-[#2c4305] h-20" />
                    </div>
                    <div>
                      <label className="text-xs font-black text-gray-400 uppercase ml-1">Store Address</label>
                      <textarea name="storeAddress" value={formData.storeAddress} onChange={handleChange} className="w-full p-4 bg-gray-50 border rounded-2xl text-black outline-none focus:border-[#2c4305] h-20" />
                    </div>
                    <div className="flex gap-3">
                      <button onClick={() => setStep(2)} className="w-1/3 bg-gray-100 text-gray-600 py-4 rounded-2xl font-black flex items-center justify-center gap-2"><ChevronLeft size={20}/>BACK</button>
                      <button onClick={handleRegister} disabled={loading} className="w-2/3 bg-[#2c4305] text-white py-4 rounded-2xl font-black">
                        {loading ? "PROCESSING..." : "SUBMIT"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
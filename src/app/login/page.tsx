'use client';

import React, { useState } from 'react';
import { createClient } from '@/utils/supabase'; // Fixed import path for client
import { useRouter } from 'next/navigation';
import toast, { Toaster } from 'react-hot-toast';
import { ArrowLeft, Eye, EyeOff } from 'lucide-react';

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

  // --- LOGIN LOGIC ---
  const handleLogin = async () => {
    if (!formData.email || !formData.password) {
      return toast.error("Please enter email and password");
    }

    setLoading(true);

    try {
      // 1. Sign in with Supabase Auth
      const { data: authData, error: authErr } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (authErr) throw authErr;

      // 2. Fetch the dealer record
      const { data: dealer, error: dbErr } = await supabase
        .from('dealers')
        .select('approval_status, role')
        .eq('user_id', authData.user.id)
        .single();

      if (dbErr || !dealer) {
        await supabase.auth.signOut();
        return toast.error("Dealer profile not found.");
      }

      // 3. Check Approval Status
      if (dealer.approval_status === 'pending') {
        await supabase.auth.signOut();
        return toast.error("Your account is pending approval.");
      }

      if (dealer.approval_status === 'rejected') {
        await supabase.auth.signOut();
        return toast.error("Your account has been rejected.");
      }

      // 4. Success Redirect
      toast.success("Login Successful!");
      router.push('/pages/dashboard');
      
    } catch (error: any) {
      toast.error(error.message || "An error occurred during login");
    } finally {
      setLoading(false);
    }
  };

  // --- REGISTRATION LOGIC ---
  const validateStep = async () => {
    if (step === 1) {
      if (!formData.email || !formData.password) return toast.error("Email and password required");
      if (formData.password !== formData.confirmPassword) return toast.error("Passwords mismatch");
      setStep(2);
    } else if (step === 2) {
      if (!formData.companyName || !formData.firstName) return toast.error("Business info required");
      setStep(3);
    }
  };

  const handleRegister = async () => {
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
      gst_number: formData.gstNumber,
      address: formData.address,
      store_address: formData.storeAddress || formData.address,
      role: formData.role,
      approval_status: 'pending'
    });

    if (dbErr) {
      toast.error(dbErr.message);
    } else {
      toast.success("Registration successful! Wait for admin approval.");
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
          <p className="text-gray-400 mt-2 font-bold uppercase tracking-widest text-xs">Pure Water Solutions</p>
        </div>

        <div className="w-full md:w-1/2 p-10 md:p-16 flex flex-col justify-center relative">
          <div className="mb-8">
            <h2 className="text-4xl font-black text-gray-900 mb-2">{isLogin ? "Sign In" : `Step ${step} of 3`}</h2>
            <p className="text-gray-500 font-medium">
              {isLogin ? "Join the network?" : "Already a member?"}
              <button onClick={() => {setIsLogin(!isLogin); setStep(1);}} className="ml-2 text-[#108542] font-bold hover:underline">
                {isLogin ? "Register Now" : "Login"}
              </button>
            </p>
          </div>

          <div className="space-y-5">
            {isLogin ? (
              /* --- LOGIN SECTION --- */
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-xs font-black text-gray-400 uppercase ml-1">Registered Email</label>
                  <input 
                    name="email" 
                    type="email" 
                    onChange={handleChange} 
                    className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-black outline-none focus:border-[#108542]" 
                    placeholder="email@example.com" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black text-gray-400 uppercase ml-1">Password</label>
                  <div className="relative">
                    <input 
                      name="password" 
                      type={showPassword ? "text" : "password"} 
                      onChange={handleChange} 
                      className="w-full p-4 bg-gray-50 border border-gray-100 rounded-2xl text-black outline-none focus:border-[#108542]" 
                      placeholder="••••••••" 
                    />
                    <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-4 text-gray-400">
                      {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                </div>
                
                {/* FIXED: Linked the handleLogin function here */}
                <button 
                  onClick={handleLogin} 
                  disabled={loading}
                  className="w-full bg-[#108542] text-white py-4 rounded-2xl font-black text-lg shadow-lg hover:bg-[#0d6e36] transition-all disabled:opacity-50"
                >
                  {loading ? "AUTHENTICATING..." : "LOGIN"}
                </button>
              </div>
            ) : (
              /* --- REGISTRATION SECTION --- */
              <div className="space-y-4">
                {step === 1 && (
                  <>
                    <input name="email" placeholder="Email" onChange={handleChange} className="w-full p-4 bg-gray-50 border rounded-2xl" />
                    <input name="phone" placeholder="Phone" onChange={handleChange} className="w-full p-4 bg-gray-50 border rounded-2xl" />
                    <input name="password" type="password" placeholder="Password" onChange={handleChange} className="w-full p-4 bg-gray-50 border rounded-2xl" />
                    <input name="confirmPassword" type="password" placeholder="Confirm" onChange={handleChange} className="w-full p-4 bg-gray-50 border rounded-2xl" />
                    <button onClick={validateStep} className="w-full bg-[#108542] text-white py-4 rounded-2xl font-black">CONTINUE</button>
                  </>
                )}
                {step === 2 && (
                  <>
                    <input name="companyName" placeholder="Company Name" onChange={handleChange} className="w-full p-4 bg-gray-50 border rounded-2xl" />
                    <input name="firstName" placeholder="First Name" onChange={handleChange} className="w-full p-4 bg-gray-50 border rounded-2xl" />
                    <input name="lastName" placeholder="Last Name" onChange={handleChange} className="w-full p-4 bg-gray-50 border rounded-2xl" />
                    <button onClick={validateStep} className="w-full bg-[#108542] text-white py-4 rounded-2xl font-black">NEXT</button>
                  </>
                )}
                {step === 3 && (
                  <>
                    <select name="role" onChange={handleChange} className="w-full p-4 bg-gray-50 border rounded-2xl">
                      <option value="Dealer">Dealer</option>
                      <option value="Sub Dealer">Sub Dealer</option>
                      <option value="Retailer Outlet">Retailer Outlet</option>
                    </select>
                    <textarea name="address" placeholder="Address" onChange={handleChange} className="w-full p-4 bg-gray-50 border rounded-2xl h-24" />
                    <button onClick={handleRegister} disabled={loading} className="w-full bg-[#108542] text-white py-4 rounded-2xl font-black">
                      {loading ? "PROCESSING..." : "SUBMIT FOR APPROVAL"}
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
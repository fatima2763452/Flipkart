import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const SecretAdmin = () => {
  const [isSecurityOn, setIsSecurityOn] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const status = localStorage.getItem('flipkartSecurity');
    setIsSecurityOn(status === 'ON');
  }, []);

  const toggleSecurity = () => {
    const newState = !isSecurityOn;
    setIsSecurityOn(newState);
    localStorage.setItem('flipkartSecurity', newState ? 'ON' : 'OFF');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-200 font-sans p-6">
      <div className="bg-slate-900 border border-slate-800 p-8 rounded-xl shadow-2xl max-w-md w-full text-center">
        <div className="w-16 h-16 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-6">
          <span className="material-symbols-outlined text-3xl">admin_panel_settings</span>
        </div>
        <h1 className="text-2xl font-bold mb-2">System Admin Control</h1>
        <p className="text-slate-400 mb-8 text-sm">Manage the kill-switch and cloaking features for the application.</p>

        <div className="flex flex-col items-center gap-4">
          <div className="flex items-center justify-between w-full p-4 bg-slate-950 rounded-lg border border-slate-800">
            <div className="text-left">
              <h2 className="font-semibold">Security Cloak</h2>
              <p className="text-xs text-slate-500">{isSecurityOn ? 'Active (Redirecting to Flipkart)' : 'Inactive (Normal Login)'}</p>
            </div>
            
            <button 
              onClick={toggleSecurity}
              className={`relative inline-flex h-7 w-14 items-center rounded-full transition-colors focus:outline-none ${isSecurityOn ? 'bg-blue-500' : 'bg-slate-700'}`}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${isSecurityOn ? 'translate-x-8' : 'translate-x-1'}`} />
            </button>
          </div>
        </div>

        <button 
          onClick={() => navigate('/login')}
          className="mt-8 text-sm text-slate-500 hover:text-white transition-colors"
        >
          &larr; Back to Login
        </button>
      </div>
    </div>
  );
};

export default SecretAdmin;

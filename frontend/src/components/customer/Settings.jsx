import React from 'react';
import { useNavigate } from 'react-router-dom';

const Settings = ({ customer, onOpenAvgCalc }) => {
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem('userInfo');
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className="p-4 space-y-6">
   

      <div className="space-y-4 mt-6">
        <button 
          onClick={onOpenAvgCalc}
          className="w-full bg-slate-800 hover:bg-slate-700 text-blue-400 border border-slate-700 font-semibold py-4 rounded-xl flex items-center justify-center gap-3 transition-colors shadow-sm"
        >
          <span className="material-symbols-outlined text-[24px]">calculate</span>
          <span className="text-lg">Average Calculator</span>
        </button>

        <button 
          onClick={handleLogout}
          className="w-full bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/30 font-bold py-4 rounded-xl flex items-center justify-center gap-3 transition-colors shadow-sm mt-8"
        >
          <span className="material-symbols-outlined text-[24px]">logout</span>
          <span className="text-lg">LOGOUT</span>
        </button>
      </div>
    </div>
  );
};

export default Settings;

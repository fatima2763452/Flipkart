import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const Settings = ({ customer, onOpenAvgCalc }) => {
  const navigate = useNavigate();
  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') !== 'light';
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const toggleTheme = () => {
    setIsDarkMode(prev => !prev);
  };

  const handleLogout = () => {
    localStorage.removeItem('userInfo');
    localStorage.removeItem('token');
    navigate('/login');
  };

  return (
    <div className="p-4 space-y-6">
      <div className="space-y-4 mt-6">
        <button 
          onClick={toggleTheme}
          className="w-full bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-semibold py-4 rounded-xl flex items-center justify-between px-6 transition-colors shadow-sm"
        >
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[24px] text-amber-400">
              {isDarkMode ? 'dark_mode' : 'light_mode'}
            </span>
            <span className="text-lg">{isDarkMode ? 'Dark Theme' : 'Light Theme'}</span>
          </div>
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full uppercase tracking-wider ${isDarkMode ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-amber-500/20 text-amber-600 border border-amber-500/30'}`}>
            {isDarkMode ? 'Dark' : 'Light'}
          </span>
        </button>

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

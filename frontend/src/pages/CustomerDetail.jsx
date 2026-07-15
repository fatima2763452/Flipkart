import React, { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import InputMode from '../components/customer/InputMode';
import Holdings from '../components/customer/Holdings';
import Executions from '../components/customer/Executions';
import WeeklyRecords from '../components/customer/WeeklyRecords';
import Settings from '../components/customer/Settings';
import AvgCalcModal from '../components/customer/AvgCalcModal';

const CustomerDetail = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('input');
  const [editingTradeData, setEditingTradeData] = useState(null);
  const [isAvgCalcOpen, setIsAvgCalcOpen] = useState(false);
  
  const handleEditRequest = (tradeData) => {
    setEditingTradeData(tradeData);
    setActiveTab('input');
  };
  
  const customer = location.state?.customer;

  useEffect(() => {
    // If accessed directly without customer data, go back to dashboard
    if (!customer) {
      navigate('/');
    }
  }, [customer, navigate]);

  if (!customer) return null;

  const renderActiveTab = () => {
    switch (activeTab) {
      case 'input': return <InputMode customer={customer} editingTradeData={editingTradeData} setEditingTradeData={setEditingTradeData} />;
      case 'holdings': return <Holdings customer={customer} onEditRequest={handleEditRequest} />;
      case 'executions': return <Executions customer={customer} />;
      case 'weekly': return <WeeklyRecords customer={customer} onEditRequest={handleEditRequest} />;
      case 'settings': return <Settings customer={customer} onOpenAvgCalc={() => setIsAvgCalcOpen(true)} />;
      default: return <InputMode customer={customer} editingTradeData={editingTradeData} setEditingTradeData={setEditingTradeData} />;
    }
  };

  return (
    <div className="bg-slate-950 text-slate-200 min-h-screen flex flex-col overflow-x-hidden font-sans antialiased">
      {/* Header */}
      <header className="p-2 flex items-center justify-between border-b border-slate-800 bg-slate-950 z-30 relative">
        <button 
          onClick={() => navigate('/')} 
          className="text-slate-400 p-1 rounded hover:bg-slate-800 hover:text-slate-200 transition-colors"
        >
          <span className="material-symbols-outlined">arrow_back</span>
        </button>
        <div className="flex flex-col items-end">
          <div className="flex items-center gap-2 mt-0.5">
            <button 
              onClick={() => setIsAvgCalcOpen(true)}
              className="text-slate-400 hover:text-blue-400 p-1.5 rounded-full bg-slate-900 border border-slate-700/50 hover:bg-slate-800 transition-colors flex items-center justify-center shadow-sm"
              title="Average Calculator"
            >
              <span className="material-symbols-outlined text-[16px]">calculate</span>
            </button>
            <span className="bg-slate-800/80 border border-slate-700/80 rounded px-2 py-0.5 text-[10px] font-mono text-slate-300">ID: {customer.id}</span>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto pb-24 p-4">
        {renderActiveTab()}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 w-full bg-slate-900/95 backdrop-blur-sm border-t border-slate-800 flex justify-around p-2 pb-safe shadow-[0_-10px_20px_rgba(0,0,0,0.4)] z-50">
        <button 
          className={`flex flex-col items-center p-2 rounded-lg transition-colors w-1/5 ${activeTab === 'input' ? 'text-blue-400 bg-blue-500/10' : 'text-slate-400 hover:text-slate-200'}`} 
          onClick={() => setActiveTab('input')}
        >
          <span className="material-symbols-outlined mb-1 text-[24px]">edit_document</span>
          <span className="text-[10px] font-medium tracking-wide">Input</span>
        </button>
        <button 
          className={`flex flex-col items-center p-2 rounded-lg transition-colors w-1/5 ${activeTab === 'holdings' ? 'text-blue-400 bg-blue-500/10' : 'text-slate-400 hover:text-slate-200'}`} 
          onClick={() => setActiveTab('holdings')}
        >
          <span className="material-symbols-outlined mb-1 text-[24px]">account_balance_wallet</span>
          <span className="text-[10px] font-medium tracking-wide">Holdings</span>
        </button>
        <button 
          className={`flex flex-col items-center p-2 rounded-lg transition-colors w-1/5 ${activeTab === 'weekly' ? 'text-blue-400 bg-blue-500/10' : 'text-slate-400 hover:text-slate-200'}`} 
          onClick={() => setActiveTab('weekly')}
        >
          <span className="material-symbols-outlined mb-1 text-[24px]">calendar_month</span>
          <span className="text-[10px] font-medium tracking-wide">Weekly</span>
        </button>
        <button 
          className={`flex flex-col items-center p-2 rounded-lg transition-colors w-1/5 ${activeTab === 'settings' ? 'text-blue-400 bg-blue-500/10' : 'text-slate-400 hover:text-slate-200'}`} 
          onClick={() => setActiveTab('settings')}
        >
          <span className="material-symbols-outlined mb-1 text-[24px]">settings</span>
          <span className="text-[10px] font-medium tracking-wide">Settings</span>
        </button>
      </nav>

      <AvgCalcModal isOpen={isAvgCalcOpen} onClose={() => setIsAvgCalcOpen(false)} />
    </div>
  );
};

export default CustomerDetail;

import React, { useState } from 'react';
import EntryForm from './input/EntryForm';
import ExitForm from './input/ExitForm';

const InputMode = ({ customer, editingTradeData, setEditingTradeData }) => {
  const [mode, setMode] = useState('entry'); // 'entry' or 'exit'

  // Update mode if we receive editing data with a specific type
  React.useEffect(() => {
    if (editingTradeData) {
      if (editingTradeData.type === 'entry' || editingTradeData.type === 'exit') {
        setMode(editingTradeData.type);
      }
    }
  }, [editingTradeData]);

  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Mode Toggle Slider */}
      <div className="flex bg-slate-900 border border-slate-800 rounded-xl p-1 mb-6 relative">
        <button 
          onClick={() => { setMode('entry'); setEditingTradeData(null); }}
          className={`flex-1 py-2.5 rounded-lg font-bold text-[11px] uppercase tracking-wider transition-all duration-300 z-10 ${mode === 'entry' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
        >
          ENTRY
        </button>
        <button 
          onClick={() => { setMode('exit'); setEditingTradeData(null); }}
          className={`flex-1 py-2.5 rounded-lg font-bold text-[11px] uppercase tracking-wider transition-all duration-300 z-10 ${mode === 'exit' ? 'text-white' : 'text-slate-500 hover:text-slate-300'}`}
        >
          EXIT
        </button>
        {/* Animated background pill */}
        <div 
          className={`absolute top-1 bottom-1 w-[calc(50%-4px)] rounded-lg transition-transform duration-300 ease-in-out shadow-lg ${
            mode === 'entry' 
              ? 'bg-blue-500 translate-x-0' 
              : 'bg-amber-500 translate-x-[calc(100%+8px)]'
          }`}
        ></div>
      </div>

      {/* Render the specific form component */}
      {mode === 'entry' ? (
        <EntryForm key="entry" formatCurrency={formatCurrency} customer={customer} editingTradeData={editingTradeData} setEditingTradeData={setEditingTradeData} />
      ) : (
        <ExitForm key="exit" formatCurrency={formatCurrency} customer={customer} editingTradeData={editingTradeData} setEditingTradeData={setEditingTradeData} />
      )}

      {/* Decorative Bar Chart Background */}
      <div className="absolute bottom-20 left-0 w-full h-32 flex items-end justify-center gap-2 px-6 opacity-10 pointer-events-none z-0">
        {[4, 6, 5, 8, 10, 8, 9, 7, 8, 11].map((h, i) => (
          <div key={i} className="w-8 bg-white rounded-t-sm" style={{ height: `${h * 10}%` }}></div>
        ))}
      </div>
    </div>
  );
};

export default InputMode;

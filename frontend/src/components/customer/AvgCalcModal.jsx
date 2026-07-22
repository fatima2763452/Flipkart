import React, { useState, useMemo } from 'react';

const AvgCalcModal = ({ isOpen, onClose }) => {
  const [entries, setEntries] = useState([
    { qty: '', price: '' },
    { qty: '', price: '' },
    { qty: '', price: '' }
  ]);

  const handleAddEntry = () => {
    setEntries([...entries, { qty: '', price: '' }]);
  };

  const handleReset = () => {
    setEntries([
      { qty: '', price: '' },
      { qty: '', price: '' },
      { qty: '', price: '' }
    ]);
  };

  const handleRemoveEntry = (index) => {
    setEntries(entries.filter((_, i) => i !== index));
  };

  const handleChange = (index, field, value) => {
    const newEntries = [...entries];
    newEntries[index][field] = value;
    setEntries(newEntries);
  };

  const { totalQty, averagePrice } = useMemo(() => {
    let tQty = 0;
    let tCost = 0;
    entries.forEach(entry => {
      const q = parseFloat(entry.qty) || 0;
      const p = parseFloat(entry.price) || 0;
      if (q > 0 && p > 0) {
        tQty += q;
        tCost += (q * p);
      }
    });
    return {
      totalQty: tQty,
      averagePrice: tQty > 0 ? (tCost / tQty).toFixed(2) : 0
    };
  }, [entries]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900 z-[100] flex flex-col w-full h-full min-h-screen overflow-hidden">
      {/* Header */}
      <div className="p-6 border-b border-slate-800/80 flex justify-between items-center bg-slate-950 h-24">
        <h2 className="font-bold text-slate-100 flex items-center gap-3 text-2xl">
          <span className="material-symbols-outlined text-blue-400 text-4xl">calculate</span>
          Average Calculator
        </h2>
        <div className="flex gap-3">
          <button onClick={handleReset} title="Reset All" className="text-slate-400 hover:text-rose-400 p-3 rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center">
            <span className="material-symbols-outlined text-[28px]">restart_alt</span>
          </button>
          <button onClick={onClose} title="Close" className="text-slate-400 hover:text-white p-3 rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center">
            <span className="material-symbols-outlined text-[28px]">close</span>
          </button>
        </div>
      </div>
      
      {/* Scrollable list of entries */}
      <div className="px-3 py-6 overflow-y-auto flex-1 space-y-4">
        {/* Column Labels */}
        <div className="flex w-full px-2 mb-2 text-xs uppercase font-extrabold text-slate-400 tracking-wider">
          <div className="flex-1">Quantity</div>
          <div className="flex-1 pl-3">Buy Price (₹)</div>
        </div>

        {entries.map((entry, index) => (
          <div key={index} className="flex gap-3 items-center w-full relative group">
            <input 
              type="number"
              value={entry.qty}
              onChange={(e) => handleChange(index, 'qty', e.target.value)}
              className="flex-1 min-w-0 bg-slate-950 border border-slate-800 rounded-xl px-3 py-5 text-2xl font-bold font-mono text-white focus:border-blue-500 focus:outline-none transition-colors"
              placeholder="0"
            />
            <input 
              type="number"
              value={entry.price}
              onChange={(e) => handleChange(index, 'price', e.target.value)}
              className="flex-1 min-w-0 bg-slate-950 border border-slate-800 rounded-xl px-3 py-5 text-2xl font-bold font-mono text-white focus:border-blue-500 focus:outline-none transition-colors"
              placeholder="0.00"
            />
          </div>
        ))}
        
        <button 
          onClick={handleAddEntry}
          className="w-full mt-2 border-2 border-dashed border-slate-600 text-slate-300 hover:text-white hover:border-blue-500 hover:bg-blue-500/10 rounded-xl py-4 text-base font-bold flex items-center justify-center gap-2 transition-all"
        >
          <span className="material-symbols-outlined text-[20px]">add</span>
          ADD ANOTHER ENTRY
        </button>
      </div>
      
      {/* Bottom totals bar */}
      <div className="p-6 border-t border-slate-800/80 bg-slate-950 flex flex-col gap-2">
        <div className="flex justify-between items-center text-sm">
          <span className="text-slate-400 font-bold uppercase tracking-wider text-xs">Total Quantity</span>
          <span className="font-mono text-slate-200 text-lg font-bold">{totalQty}</span>
        </div>
        <div className="flex justify-between items-center mt-2">
          <span className="text-slate-400 font-bold uppercase tracking-wider text-xs">Average Price</span>
          <span className="font-mono text-2xl font-black text-blue-400">₹{averagePrice}</span>
        </div>
      </div>
    </div>
  );
};

export default AvgCalcModal;

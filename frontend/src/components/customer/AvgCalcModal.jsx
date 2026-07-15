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
    <div className="fixed inset-0 bg-black/60 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-700/50 rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-slate-800/80 flex justify-between items-center bg-slate-950">
          <h2 className="font-bold text-slate-100 flex items-center gap-2">
            <span className="material-symbols-outlined text-blue-400">calculate</span>
            Average Calculator
          </h2>
          <div className="flex gap-1">
            <button onClick={handleReset} title="Reset All" className="text-slate-400 hover:text-rose-400 p-1 rounded-md hover:bg-slate-800 transition-colors flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">restart_alt</span>
            </button>
            <button onClick={onClose} title="Close" className="text-slate-400 hover:text-white p-1 rounded-md hover:bg-slate-800 transition-colors flex items-center justify-center">
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>
        
        <div className="p-4 overflow-y-auto flex-1 space-y-3">
          {entries.map((entry, index) => (
            <div key={index} className="flex gap-3 items-start bg-slate-800/40 p-3 rounded-lg border border-slate-700/50 relative group">
              {entries.length > 1 && (
                <button 
                  onClick={() => handleRemoveEntry(index)}
                  className="absolute -top-2 -right-2 bg-slate-700 hover:bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-[12px] opacity-0 group-hover:opacity-100 transition-opacity shadow-md"
                >
                  <span className="material-symbols-outlined text-[14px]">close</span>
                </button>
              )}
              <div className="flex-1">
                <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Quantity</label>
                <input 
                  type="number"
                  value={entry.qty}
                  onChange={(e) => handleChange(index, 'qty', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm font-mono text-white focus:border-blue-500 focus:outline-none"
                  placeholder="0"
                />
              </div>
              <div className="flex-1">
                <label className="text-[10px] uppercase font-bold text-slate-500 mb-1 block">Buy Price (₹)</label>
                <input 
                  type="number"
                  value={entry.price}
                  onChange={(e) => handleChange(index, 'price', e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm font-mono text-white focus:border-blue-500 focus:outline-none"
                  placeholder="0.00"
                />
              </div>
            </div>
          ))}
          
          <button 
            onClick={handleAddEntry}
            className="w-full mt-2 border border-dashed border-slate-600 text-slate-400 hover:text-white hover:border-slate-500 hover:bg-slate-800/50 rounded-lg py-2.5 text-sm font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
            ADD ANOTHER ENTRY
          </button>
        </div>
        
        <div className="p-4 border-t border-slate-800/80 bg-slate-950 flex flex-col gap-1">
          <div className="flex justify-between items-center text-sm">
            <span className="text-slate-400 font-medium">Total Quantity</span>
            <span className="font-mono text-slate-200">{totalQty}</span>
          </div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-slate-400 font-bold uppercase text-xs">Average Price</span>
            <span className="font-mono text-xl font-black text-blue-400">₹{averagePrice}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AvgCalcModal;

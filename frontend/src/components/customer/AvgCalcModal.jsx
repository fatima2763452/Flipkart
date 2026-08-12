import React, { useState, useMemo } from 'react';

const AvgCalcModal = ({ isOpen, onClose }) => {
  const [entries, setEntries] = useState([
    { qty: '', price: '' },
    { qty: '', price: '' },
    { qty: '', price: '' }
  ]);
  const [copied, setCopied] = useState(false);

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

  const handleCopy = () => {
    navigator.clipboard.writeText(averagePrice);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
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
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-0 sm:p-4 bg-slate-950/80 backdrop-blur-sm">
      {/* Backdrop click handler to close the modal */}
      <div className="absolute inset-0" onClick={onClose}></div>
      
      {/* Modal Container */}
      <div className="relative w-full h-full sm:h-auto sm:max-h-[90vh] sm:max-w-md bg-slate-900 border-t sm:border border-slate-800 sm:rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-6 border-b border-slate-800/80 flex justify-between items-center bg-slate-950 flex-shrink-0">
          <h2 className="font-bold text-slate-100 flex items-center gap-2 sm:gap-3 text-xl sm:text-2xl">
            <span className="material-symbols-outlined text-blue-400 text-3xl sm:text-4xl">calculate</span>
            Average Calculator
          </h2>
          <div className="flex gap-1 sm:gap-2">
            <button onClick={handleReset} title="Reset All" className="text-slate-400 hover:text-rose-400 p-2 rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px] sm:text-[28px]">restart_alt</span>
            </button>
            <button onClick={onClose} title="Close" className="text-slate-400 hover:text-white p-2 rounded-lg hover:bg-slate-800 transition-colors flex items-center justify-center">
              <span className="material-symbols-outlined text-[24px] sm:text-[28px]">close</span>
            </button>
          </div>
        </div>
        
        {/* Scrollable list of entries */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          {/* Column Labels */}
          <div className="flex w-full px-2 mb-1 text-xs uppercase font-extrabold text-slate-400 tracking-wider">
            <div className="flex-1">Quantity</div>
            <div className="flex-1 pl-3">Buy Price (₹)</div>
            {entries.length > 1 && <div className="w-10 sm:w-12 flex-shrink-0"></div>}
          </div>

          {entries.map((entry, index) => (
            <div key={index} className="flex gap-2 sm:gap-3 items-center w-full relative group">
              <input 
                type="number"
                value={entry.qty}
                onChange={(e) => handleChange(index, 'qty', e.target.value)}
                className="flex-1 min-w-0 bg-slate-950 border border-slate-800 rounded-xl px-3 py-3 sm:py-4 text-xl sm:text-2xl font-bold font-mono text-white focus:border-blue-500 focus:outline-none transition-colors"
                placeholder="0"
              />
              <input 
                type="number"
                value={entry.price}
                onChange={(e) => handleChange(index, 'price', e.target.value)}
                className="flex-1 min-w-0 bg-slate-950 border border-slate-800 rounded-xl px-3 py-3 sm:py-4 text-xl sm:text-2xl font-bold font-mono text-white focus:border-blue-500 focus:outline-none transition-colors"
                placeholder="0.00"
              />
              {entries.length > 1 && (
                <button 
                  type="button"
                  onClick={() => handleRemoveEntry(index)}
                  className="w-10 h-10 sm:w-12 sm:h-12 text-slate-500 hover:text-rose-400 p-0 rounded-xl hover:bg-slate-900 transition-colors flex items-center justify-center cursor-pointer border border-transparent hover:border-slate-800 flex-shrink-0"
                  title="Remove Entry"
                >
                  <span className="material-symbols-outlined text-[22px] sm:text-[26px]">delete</span>
                </button>
              )}
            </div>
          ))}
          
          <button 
            onClick={handleAddEntry}
            className="w-full mt-2 border-2 border-dashed border-slate-700 text-slate-300 hover:text-white hover:border-blue-500 hover:bg-blue-500/10 rounded-xl py-3 sm:py-4 text-sm sm:text-base font-bold flex items-center justify-center gap-2 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[18px] sm:text-[20px]">add</span>
            ADD ANOTHER ENTRY
          </button>
        </div>
        
        {/* Bottom totals bar */}
        <div className="p-4 sm:p-6 border-t border-slate-800/80 bg-slate-950 flex justify-between items-center flex-shrink-0 pb-safe">
          <div className="flex flex-col">
            <span className="text-slate-400 font-bold uppercase tracking-wider text-xs">Total Qty</span>
            <span className="font-mono text-slate-200 text-lg sm:text-xl font-bold">{totalQty}</span>
          </div>
          <div className="flex flex-col items-end">
            <span className="text-slate-400 font-bold uppercase tracking-wider text-xs">Avg Price</span>
            <div className="flex items-center gap-1.5 sm:gap-2 mt-1">
              <span className="font-mono text-xl sm:text-2xl font-black text-blue-400">₹{averagePrice}</span>
              <button 
                onClick={handleCopy}
                className="text-slate-400 hover:text-blue-400 p-1 sm:p-1.5 rounded-lg hover:bg-slate-900 transition-all flex items-center justify-center"
                title="Copy Average Price"
              >
                <span className="material-symbols-outlined text-[18px] sm:text-[20px] select-none">
                  {copied ? 'check' : 'content_copy'}
                </span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AvgCalcModal;

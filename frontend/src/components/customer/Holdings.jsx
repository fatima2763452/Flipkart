import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import HoldingReceipt from './HoldingReceipt';

const Holdings = ({ customer, onEditRequest }) => {
  const [holdings, setHoldings] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedReceipt, setSelectedReceipt] = useState(null);
  const [expandedCard, setExpandedCard] = useState(null);
  const [selectedSymbols, setSelectedSymbols] = useState([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [toast, setToast] = useState(null);

  const showToast = (message, type = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    fetchHoldings();
  }, [customer._id]);

  const fetchHoldings = async () => {
    try {
      setIsLoading(true);
      const { data } = await api.get(`/trades/holdings/${customer._id}`);
      setHoldings(data);
    } catch (err) {
      console.error(err);
      setError('Failed to load holdings.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (symbol) => {
    if (!window.confirm(`Are you sure you want to delete all entries for ${symbol}?`)) return;
    try {
      await api.delete(`/trades/holdings/${customer._id}/${symbol}`);
      fetchHoldings();
    } catch (err) {
      console.error(err);
      showToast('Failed to delete holding');
    }
  };

  const toggleSelection = (symbol) => {
    setSelectedSymbols(prev => prev.includes(symbol) ? prev.filter(s => s !== symbol) : [...prev, symbol]);
  };

  const toggleSelectAll = () => {
    if (selectedSymbols.length === holdings.length && holdings.length > 0) {
      setSelectedSymbols([]);
    } else {
      setSelectedSymbols(holdings.map(h => h.symbol));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedSymbols.length === 0) return;
    if (!window.confirm(`Are you sure you want to delete holdings for ${selectedSymbols.length} symbols?`)) return;
    try {
      await api.post(`/trades/holdings/bulk-delete`, { customerId: customer._id, symbols: selectedSymbols });
      setSelectedSymbols([]);
      fetchHoldings();
    } catch (err) {
      console.error(err);
      showToast('Failed to delete holdings');
    }
  };

  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);
  
  const totalEquity = holdings.reduce((sum, item) => sum + item.totalValue, 0);
  const totalUpnl = holdings.reduce((sum, item) => sum + item.upnl, 0);

  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 z-[200] flex items-center gap-2 px-4 py-3 rounded-lg shadow-lg border animate-in slide-in-from-top-2 fade-in ${toast.type === 'error' ? 'bg-rose-950/90 border-rose-900/50 text-rose-200' : 'bg-emerald-950/90 border-emerald-900/50 text-emerald-200'}`}>
          <span className="material-symbols-outlined text-[20px]">{toast.type === 'error' ? 'error' : 'check_circle'}</span>
          <span className="text-sm font-bold">{toast.message}</span>
        </div>
      )}

      {/* Sticky Top Section */}
      <div className="sticky top-[-16px] pt-4 bg-slate-950 z-20 pb-2 mb-2">
        {/* Total Equity Card */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 relative overflow-hidden">
          {/* Faint wallet icon in background */}
          <span className="material-symbols-outlined absolute right-[-10px] top-4 text-[80px] text-slate-800/30 rotate-[-10deg] pointer-events-none">account_balance_wallet</span>
          
          <div className="relative z-10">
            <h3 className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1">Total Equity (INR)</h3>
            <div className="text-3xl font-bold text-white mb-3 tracking-tight">{formatCurrency(totalEquity)}</div>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${totalUpnl >= 0 ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                <span className="material-symbols-outlined text-[12px]">{totalUpnl >= 0 ? 'trending_up' : 'trending_down'}</span>
                {totalUpnl >= 0 ? '+' : ''}{formatCurrency(totalUpnl)}
              </span>
            </div>
          </div>
        </div>

        {/* Active Holdings Header */}
        <div className="flex items-center justify-between pt-4 pb-1">
          <div className="flex items-center gap-2 text-slate-200 font-bold text-[11px] tracking-widest uppercase">
            <span className="material-symbols-outlined text-[16px]">table_chart</span>
            ACTIVE HOLDINGS ({holdings.length})
          </div>
          <div className="flex items-center gap-4">
            {isSelectionMode ? (
              <>
                {holdings.length > 0 && (
                  <label className="flex items-center gap-1.5 cursor-pointer text-[10px] font-bold text-slate-400 hover:text-slate-200">
                    <input 
                      type="checkbox" 
                      checked={selectedSymbols.length === holdings.length && holdings.length > 0}
                      onChange={toggleSelectAll}
                      className="w-3.5 h-3.5 rounded border-slate-700 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900"
                    />
                    ALL
                  </label>
                )}
                {selectedSymbols.length > 0 ? (
                  <button onClick={handleBulkDelete} className="flex items-center gap-1 text-rose-400 hover:text-rose-300 transition-colors text-[11px] font-bold uppercase tracking-wider">
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                    DELETE ({selectedSymbols.length})
                  </button>
                ) : (
                  <button onClick={() => { setIsSelectionMode(false); setSelectedSymbols([]); }} className="flex items-center gap-1 text-slate-400 hover:text-white transition-colors text-[11px] font-bold uppercase tracking-wider">
                    <span className="material-symbols-outlined text-[16px]">close</span>
                    CANCEL
                  </button>
                )}
              </>
            ) : (
              <>
                <button onClick={() => setIsSelectionMode(true)} className="flex items-center gap-1 text-blue-400 hover:text-blue-300 transition-colors text-[11px] font-bold uppercase tracking-wider">
                  <span className="material-symbols-outlined text-[16px]">checklist</span>
                  SELECT
                </button>
               
              </>
            )}
          </div>
        </div>
        
        {/* Fading bottom edge for sticky header */}
        <div className="absolute bottom-[-16px] left-0 w-full h-4 bg-gradient-to-b from-slate-950 to-transparent pointer-events-none"></div>
      </div>

      {/* Holdings List */}
      <div className="space-y-3 pb-4">
        {isLoading ? (
          // Skeleton Loader
          [1, 2, 3].map((i) => (
            <div key={i} className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 relative overflow-hidden">
              <div className="flex justify-between items-start mb-3">
                <div className="flex items-center gap-2 mb-0.5">
                  <div className="w-16 h-5 bg-slate-800 rounded animate-pulse"></div>
                  <div className="w-8 h-4 bg-slate-800 rounded animate-pulse"></div>
                </div>
                <div className="text-right flex flex-col items-end">
                  <div className="w-16 h-5 bg-slate-800 rounded animate-pulse mb-1"></div>
                  <div className="w-24 h-3 bg-slate-800 rounded animate-pulse"></div>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800">
                <div>
                   <div className="w-8 h-2 bg-slate-800 rounded animate-pulse mb-1"></div>
                   <div className="w-12 h-3 bg-slate-800 rounded animate-pulse"></div>
                </div>
                <div>
                   <div className="w-12 h-2 bg-slate-800 rounded animate-pulse mb-1"></div>
                   <div className="w-16 h-3 bg-slate-800 rounded animate-pulse"></div>
                </div>
                <div className="flex flex-col items-end">
                   <div className="w-12 h-2 bg-slate-800 rounded animate-pulse mb-1"></div>
                   <div className="w-16 h-3 bg-slate-800 rounded animate-pulse"></div>
                </div>
              </div>
            </div>
          ))
        ) : !error && holdings.length === 0 && (
          <div className="text-center py-12 flex flex-col items-center justify-center border border-dashed border-slate-800 rounded-xl bg-slate-900/30">
            <span className="material-symbols-outlined text-4xl mb-2 text-slate-700">inventory_2</span>
            <p>No active holdings found.</p>
            <p className="text-xs text-slate-600 mt-1">Submit an Entry Order to start building a portfolio.</p>
          </div>
        )}

        {holdings.map((item, idx) => (
          <div 
            key={item.symbol} 
            onClick={() => setExpandedCard(expandedCard === item.symbol ? null : item.symbol)}
            className={`bg-slate-900/50 border ${idx === 0 ? 'border-blue-500/30' : 'border-slate-800'} rounded-xl p-4 relative overflow-hidden group cursor-pointer hover:bg-slate-900/80 transition-all select-none`}
          >
            {idx === 0 && <div className="absolute inset-0 border border-dashed border-blue-500/20 rounded-xl pointer-events-none"></div>}
            
            <div className="flex justify-between items-start mb-3">
              <div className="flex items-start gap-3">
                {isSelectionMode && (
                  <div className="pt-1" onClick={(e) => e.stopPropagation()}>
                    <input 
                      type="checkbox" 
                      checked={selectedSymbols.includes(item.symbol)}
                      onChange={() => toggleSelection(item.symbol)}
                      className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900"
                    />
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="font-bold text-slate-100 text-base">{item.symbol}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${
                      item.type === 'Buy' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    }`}>
                      {item.type}
                    </span>
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="font-bold text-slate-100 text-base">{formatCurrency(item.lastPrice)}</div>
                <div className="text-[10px] text-slate-400">Avg: <span className="text-slate-300">{formatCurrency(item.avgCost)}</span></div>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800">
              <div>
                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">QTY</div>
                <div className="font-mono text-xs font-semibold text-slate-200">{item.netQty.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Total Value</div>
                <div className="font-mono text-xs font-semibold text-blue-400">{formatCurrency(item.totalValue)}</div>
              </div>
              <div className="text-right">
                <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">TOTAL P/L</div>
                <div className={`font-mono text-xs font-bold ${item.upnl >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {item.upnl >= 0 ? '+' : ''}{formatCurrency(item.upnl)}
                </div>
              </div>
            </div>

            {/* Smoothly Expandable Action Panel */}
            <div className={`grid transition-all duration-300 ease-in-out ${expandedCard === item.symbol ? 'grid-rows-[1fr] opacity-100 mt-4' : 'grid-rows-[0fr] opacity-0 mt-0'}`}>
              <div className="overflow-hidden">
                <div className="flex gap-2 pt-3 border-t border-slate-800/80">
                  <button 
                    onClick={(e) => { e.stopPropagation(); setSelectedReceipt(item); }}
                    className="flex-1 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors text-xs font-bold"
                  >
                    <span className="material-symbols-outlined text-[16px]">receipt_long</span>
                    RECEIPT
                  </button>
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleDelete(item.symbol); }}
                    className="flex-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 py-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-colors text-xs font-bold"
                  >
                    <span className="material-symbols-outlined text-[16px]">delete</span>
                    DELETE
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Fullscreen Receipt Overlay */}
      {selectedReceipt && (
        <HoldingReceipt 
          customer={customer}
          holding={selectedReceipt}
          onClose={() => setSelectedReceipt(null)}
          onEdit={async (updatedData) => {
            try {
              await api.put(`/trades/holdings/edit/${customer._id}/${selectedReceipt.symbol}`, updatedData);
              fetchHoldings();
              // Optionally close receipt, or leave it open to see changes. Let's close it for now.
              setSelectedReceipt(null);
            } catch (err) {
              console.error(err);
              showToast(err.response?.data?.message || 'Failed to update holding', 'error');
            }
          }}
        />
      )}
    </div>
  );
};

export default Holdings;

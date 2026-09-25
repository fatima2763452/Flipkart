import React, { useEffect, useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { UserCircle2, ShieldCheck, TrendingUp, FileText } from 'lucide-react';

const TradeReceipt = ({ trade, customer, type, onClose, onEdit }) => {
  const receiptRef = useRef(null);
  const [theme, setTheme] = useState(() => document.documentElement.classList.contains('dark') ? 'dark' : 'light');
  
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (trade && !isEditing) {
      setEditData({
        quantity: trade.quantity || '',
        lot: trade.lot || '',
        price: type === 'exit' ? trade.price : (trade.entryPrice || trade.price || ''),
        ltp: type === 'exit' ? trade.ltp : (trade.ltp || ''),
        marginRs: trade.marginRs || '',
        brokerageType: trade.brokerageType || 'percentage',
        brokerageValue: trade.brokerageType === 'rupees' 
          ? (trade.brokerageValue || '').toString() 
          : (trade.brokeragePct && trade.brokeragePct !== 0.01 ? trade.brokeragePct.toString() : ''),
        tradeCategory: trade.tradeCategory || 'normal'
      });
    }
  }, [trade, isEditing, type]);

  const handleSave = async () => {
    if (onEdit) {
      setIsSaving(true);
      // Ensure numeric fields aren't sent as empty strings
      const sanitized = {
        ...editData,
        quantity: editData.quantity !== '' ? editData.quantity : trade.quantity,
        price: editData.price !== '' ? editData.price : trade.price,
        ltp: editData.ltp !== '' ? editData.ltp : trade.ltp,
        lot: editData.lot !== '' ? editData.lot : (trade.lot || 0),
        marginRs: editData.marginRs !== '' ? editData.marginRs : (trade.marginRs || 0),
      };
      await onEdit(sanitized);
      setIsSaving(false);
      setIsEditing(false);
    }
  };

  // Close on Escape key
  useEffect(() => {
    const handleEsc = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4
  }).format(val || 0);

  const formatNumber = (val) => new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 4
  }).format(val || 0);
  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'UTC' });
  };
  const getPnlPercent = (pnl, invested) => {
    if (!invested) return '0.00%';
    const pct = (pnl / invested) * 100;
    return `${pct >= 0 ? '+' : ''}${pct.toFixed(2)}%`;
  };

  const handleDownload = async () => {
    const element = receiptRef.current;
    if (!element) return;

    const width = element.offsetWidth || 700;
    const height = element.offsetHeight || 600;

    try {
      const filter = (node) => {
        // Exclude external stylesheets to prevent CORS SecurityError
        if (node.tagName === 'LINK' && node.rel === 'stylesheet') {
          return false;
        }
        return true;
      };

      const dataUrl = await toPng(element, { 
        backgroundColor: theme === 'dark' ? '#000000' : '#f8fafc',
        pixelRatio: 4,
        filter: filter,
        style: {
          transform: 'scale(1)',
          transformOrigin: 'top left',
        }
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [width, height]
      });

      pdf.addImage(dataUrl, 'PNG', 0, 0, width, height);
      const today = new Date();
      const formattedDate = `${today.getDate().toString().padStart(2, '0')}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getFullYear().toString().slice(-2)}`;
      const safeCustomerName = (customer.name || 'Customer').replace(/[^a-zA-Z0-9]/g, '_');
      pdf.save(`${safeCustomerName}_${formattedDate}.pdf`);
    } catch (error) {
      console.error('Failed to generate receipt PDF:', error);
      alert('Error generating PDF: ' + error.message);
    }
  };

  const isExit = type === 'exit';
  
  const productType = (trade.action || 'Unknown').toUpperCase();
  const isBuy = productType === 'BUY';

  let buyPrice = null;
  let sellPrice = null;

  if (isExit) {
    if (isBuy) { // Exiting a short
      buyPrice = trade.ltp;
      sellPrice = trade.price;
    } else { // Exiting a long
      sellPrice = trade.ltp;
      buyPrice = trade.price;
    }
  } else {
    if (isBuy) {
      buyPrice = trade.price;
    } else {
      sellPrice = trade.price;
    }
  }

  const totalBuyValue = buyPrice !== null ? buyPrice * trade.quantity : null;
  const totalSellValue = sellPrice !== null ? sellPrice * trade.quantity : null;
  const isShortExit = trade.action.toLowerCase() === 'buy'; // Exiting a short position by buying
  const investedAmount = (isExit ? trade.price : (trade.entryPrice || 0)) * trade.quantity;

  const displayGrossPnl = (() => {
    if (!isExit) return undefined;
    const qty = trade.quantity || 0;
    const entryPrice = trade.price || 0;
    const exitPrice = trade.ltp || 0;
    const action = (trade.action || 'buy').toLowerCase();
    
    let grossPnl = 0;
    if (action === 'buy') { // Exiting a Long position (originally bought)
      grossPnl = (exitPrice - entryPrice) * qty;
    } else { // Exiting a Short position (originally sold)
      grossPnl = (entryPrice - exitPrice) * qty;
    }
    return grossPnl;
  })();

  const originalRealizedPnl = (() => {
    if (displayGrossPnl === undefined) return undefined;
    const brokerage = trade.brokerageFee || 0;
    return displayGrossPnl - brokerage;
  })();

  const displayRealizedPnl = (() => {
    if (originalRealizedPnl === undefined) return undefined;
    const brokerage = trade.brokerageFee || 0;
    return originalRealizedPnl - brokerage;
  })();

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center  bg-slate-950/90 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto">
      {/* Background clickable area to close */}
      <div className="fixed inset-0 min-h-screen print-hide" onClick={onClose}></div>
      <div className="relative z-10 w-full max-w-[700px] my-8 flex flex-col items-center receipt-print-area">
        {/* Theme Toggle (Ignored in screenshot) */}
        <div className="flex gap-2 mb-2 bg-slate-900 p-1.5 rounded-full border border-slate-700 shadow-lg print-hide" data-html2canvas-ignore>
          <button 
            onClick={() => setTheme('light')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${theme === 'light' ? 'bg-white text-slate-900 shadow' : 'text-slate-400 hover:text-slate-200'}`}
          >
            LIGHT
          </button>
          <button 
            onClick={() => setTheme('dark')}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-colors ${theme === 'dark' ? 'bg-slate-800 text-white shadow' : 'text-slate-400 hover:text-slate-200'}`}
          >
            DARK
          </button>
        </div>

        {/* Receipt Container */}
        <div 
          ref={receiptRef}
          className={`w-full overflow-hidden transition-colors duration-300 ${theme === 'dark' ? 'dark' : ''} ${
            theme === 'dark' 
              ? 'bg-black text-slate-200 border border-slate-800' 
              : 'bg-[#f8fafc] text-slate-800'
          }`}
          style={{ fontFamily: "'Inter', sans-serif" }}
        >
          <div className="p-3 sm:p-3">
            {/* Header */}
            <div className={`flex justify-between items-center pb-3 border-b ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex items-center gap-2">
                <span className={`text-xs font-medium ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                  {type.toUpperCase()}
                </span>
                <span className={`text-xs font-bold ${isBuy ? 'text-emerald-500' : 'text-rose-500'}`}>
                  ({productType})
                </span>
              </div>
              <div className={`text-sm font-bold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                {formatDate(trade.date)}
              </div>
            </div>

            {/* Asset Name & Customer Info */}
            <div className="mt-2 mb-3 px-2 flex justify-between items-start">
              <div>
                <h3 className={`text-[15px] font-black tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {trade.symbol}
                </h3>
                <div className={`text-[12px]  mt-0.5 ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
                  {customer.name || 'User'}
                </div>
              </div>
              {/* <div className="text-right">
                <div className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>QTY</div>
                <span className={`text-base font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {trade.quantity} {trade.lot ? `(${trade.lot})` : ''}
                </span>
              </div> */}
            </div>

            {/* Trade Details Table */}
            <div className={`rounded-xl border overflow-hidden ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className="px-4 py-1.5 text-center bg-blue-600">
                <h4 className="text-white text-lg font-bold tracking-wider uppercase">
                  {(isEditing ? editData.tradeCategory : (trade.tradeCategory || 'normal')) === 'delivery' ? 'DELIVERY' : 'NORMAL'}
                </h4>
              </div>
              <div className="px-3 py-3 space-y-3">
                {isEditing && (
                  <div className={`flex justify-between items-center pb-2 border-b border-solid ${theme === 'dark' ? 'border-slate-600' : 'border-slate-300'}`}>
                    <span className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>Category</span>
                    <select 
                      className="bg-slate-800 text-white rounded px-2 py-1 text-sm outline-none cursor-pointer text-right"
                      value={editData.tradeCategory === 'delivery' ? 'delivery' : 'normal'} 
                      onChange={e => setEditData({...editData, tradeCategory: e.target.value})}
                    >
                      <option value="normal">NORMAL</option>
                      <option value="delivery">DELIVERY</option>
                    </select>
                  </div>
                )}
                {/* {!isEditing && (
                  <div className={`flex justify-between items-center pb-2 border-b border-solid ${theme === 'dark' ? 'border-slate-600' : 'border-slate-300'}`}>
                    <span className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>Mode</span>
                    <span className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{productType}</span>
                  </div>
                )} */}
                <div className={`flex justify-between items-center pb-2 border-b border-solid ${theme === 'dark' ? 'border-slate-600' : 'border-slate-300'}`}>
                  <span className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>Qty (Lot)</span>
                  {isEditing ? (
                    <div className="flex gap-2">
                      <input type="number" step="any" className="w-16 bg-slate-800 text-white rounded px-2 py-1 text-sm text-right" value={editData.quantity} onChange={e => setEditData({...editData, quantity: e.target.value})} placeholder="Qty" />
                      <input type="number" step="any" className="w-16 bg-slate-800 text-white rounded px-2 py-1 text-sm text-right" value={editData.lot} onChange={e => setEditData({...editData, lot: e.target.value})} placeholder="Lot" />
                    </div>
                  ) : (
                    <span className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      {trade.quantity} {trade.lot ? `(${trade.lot})` : ''}
                    </span>
                  )}
                </div>
                
                <div className={`flex justify-between items-center pb-2 border-b border-solid ${theme === 'dark' ? 'border-slate-600' : 'border-slate-300'}`}>
                  <span className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>{isShortExit ? 'Avg' : 'Avg'}</span>
                  {isEditing ? (
                    <input type="number" step="any" className="w-24 bg-slate-800 text-white rounded px-2 py-1 text-sm text-right" value={editData.price} onChange={e => setEditData({...editData, price: e.target.value})} />
                  ) : (
                    <span className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{formatNumber(isExit ? trade.price : (trade.entryPrice || 0))}</span>
                  )}
                </div>
                {!isEditing && (
                  <div className={`flex justify-between items-center pb-2 border-b border-solid ${theme === 'dark' ? 'border-slate-600' : 'border-slate-300'}`}>
                    <span className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>{isShortExit ? 'Invested' : 'Invested'}</span>
                    <span className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{formatCurrency((isExit ? trade.price : (trade.entryPrice || 0)) * trade.quantity)}</span>
                  </div>
                )}
                
                <div className={`flex justify-between items-center pb-2 border-b border-solid ${theme === 'dark' ? 'border-slate-600' : 'border-slate-300'}`}>
                  <span className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>Exit</span>
                  {isEditing ? (
                    <input type="number" step="any" className="w-24 bg-slate-800 text-white rounded px-2 py-1 text-sm text-right" value={editData.ltp} onChange={e => setEditData({...editData, ltp: e.target.value})} />
                  ) : (
                    <span className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{formatNumber(isExit ? trade.ltp : trade.price)}</span>
                  )}
                </div>

                

                {(isEditing || parseFloat(trade.marginRs) > 0 || parseFloat(trade.marginPct) > 0) && (
                  <div className={`flex justify-between items-center pb-2 border-b border-solid ${theme === 'dark' ? 'border-slate-600' : 'border-slate-300'}`}>
                    <span className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>Money Margin</span>
                    {isEditing ? (
                      <input type="number" step="any" className="w-24 bg-slate-800 text-white rounded px-2 py-1 text-sm text-right" value={editData.marginRs || editData.marginPct} onChange={e => setEditData({...editData, marginRs: e.target.value})} />
                    ) : (
                      <span className={`text-sm font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                        {(parseFloat(trade.marginPct) > 0 || (investedAmount > 0 && parseFloat(trade.marginRs || 0) > 0)) && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${theme === 'dark' ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'}`}>
                            {parseFloat(trade.marginPct) > 0 ? trade.marginPct : ((parseFloat(trade.marginRs) / investedAmount) * 100).toFixed(2)}%
                          </span>
                        )}
                        {formatCurrency(trade.marginRs || 0)}
                      </span>
                    )}
                  </div>
                )}

                <div className={`flex justify-between items-center pb-2 border-b border-solid ${theme === 'dark' ? 'border-slate-600' : 'border-slate-300'}`}>
                  <span className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>Brokerage</span>
                  {isEditing ? (
                    <div className="flex items-center gap-1.5">
                      <input 
                        type="number" 
                        step="any" 
                        className="w-20 bg-slate-800 text-white rounded px-2 py-1 text-sm text-right" 
                        value={editData.brokerageValue} 
                        onChange={e => setEditData({...editData, brokerageValue: e.target.value})} 
                        placeholder="0.01"
                      />
                      <select 
                        className="bg-slate-800 text-white rounded px-1.5 py-1 text-xs outline-none cursor-pointer"
                        value={editData.brokerageType} 
                        onChange={e => setEditData({...editData, brokerageType: e.target.value})}
                      >
                        <option value="percentage">%</option>
                        <option value="rupees">₹</option>
                      </select>
                    </div>
                  ) : (
                    <span className={`text-sm font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${theme === 'dark' ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'}`}>
                        0.01%
                      </span>
                      {formatCurrency(trade.brokerageFee || 0)}
                    </span>
                  )}
                </div>

                {!isEditing && originalRealizedPnl !== undefined && (
                  <div className="flex justify-between items-center pt-1">
                    <span className={`text-sm font-bold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>P&L</span>
                    <span className={`text-sm font-bold ${originalRealizedPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {originalRealizedPnl >= 0 ? '+' : ''}{formatCurrency(originalRealizedPnl)}
                      <span className="text-xs ml-1.5 font-bold">
                        ({getPnlPercent(originalRealizedPnl, investedAmount)})
                      </span>
                    </span>
                  </div>
                )}
              </div>
            </div>
            {/* Footer stamp */}
            <div className="mt-3 mb-1 flex flex-col items-center justify-center">
             
              <div className={`text-[10px] font-bold tracking-widest ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
               
              </div>
            </div>

          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex w-full mt-4 gap-4 print-hide">
          <button 
            onClick={onClose}
            className="flex-1 py-3 rounded-xl text-sm font-bold text-slate-300 bg-slate-800 hover:bg-slate-700 hover:text-white transition-colors"
          >
            CLOSE
          </button>
          {onEdit && !isEditing && (
            <button 
              onClick={() => setIsEditing(true)}
              className="flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-slate-800 bg-emerald-400 hover:bg-emerald-300 transition-colors shadow-lg shadow-emerald-500/20"
            >
              <span className="material-symbols-outlined text-[18px]">edit</span>
              EDIT
            </button>
          )}
          {isEditing && (
            <button 
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-white bg-green-600 hover:bg-green-500 transition-colors shadow-lg shadow-green-600/20"
            >
              <span className="material-symbols-outlined text-[18px]">save</span>
              {isSaving ? 'SAVING...' : 'SAVE'}
            </button>
          )}
          <button 
            onClick={handleDownload}
            className="flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-white bg-black hover:bg-slate-900 transition-colors shadow-lg border border-slate-800"
          >
            <FileText size={18} />
            SAVE PDF
          </button>
        </div>
      </div>
    </div>
  );
};

export default TradeReceipt;

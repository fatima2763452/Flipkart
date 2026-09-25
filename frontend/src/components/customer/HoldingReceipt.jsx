import React, { useEffect, useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { UserCircle2, ShieldCheck, TrendingUp, FileText } from 'lucide-react';

const HoldingReceipt = ({ customer, holding, onClose, onEdit }) => {
  const receiptRef = useRef(null);
  const [theme, setTheme] = useState(() => document.documentElement.classList.contains('dark') ? 'dark' : 'light');

  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (holding && !isEditing) {
      setEditData({
        quantity: holding.netQty || 0,
        lot: holding.lot || '',
        price: holding.avgCost || 0,
        ltp: holding.lastPrice || 0,
        marginRs: holding.totalMargin || 0,
        brokerageFee: holding.totalBrokerage || 0,
        tradeCategory: holding.tradeCategory || 'normal'
      });
    }
  }, [holding, isEditing]);

  const displayQty = isEditing ? (parseFloat(editData.quantity) || 0) : (holding.netQty || 0);
  const displayPrice = isEditing ? (parseFloat(editData.price) || 0) : (holding.avgCost || 0);
  const displayLtp = isEditing ? (parseFloat(editData.ltp) || 0) : (holding.lastPrice || 0);
  const displayMargin = isEditing ? (parseFloat(editData.marginRs) || 0) : (holding.totalMargin || 0);
  const displayBrokerage = isEditing ? (parseFloat(editData.brokerageFee) || 0) : (holding.totalBrokerage || 0);

  const isBuy = holding.type.toLowerCase() === 'buy';
  const grossPnl = isBuy
    ? (displayLtp - displayPrice) * displayQty
    : (displayPrice - displayLtp) * displayQty;
  const calculatedUpnl = grossPnl - displayBrokerage;

  const originalTotalPnl = holding.customTotalPnl !== undefined ? holding.customTotalPnl : (isEditing ? calculatedUpnl : (holding.totalPnl || holding.upnl || 0));

  const displayInvested = holding.customInvested !== undefined ? holding.customInvested : (isEditing ? (displayQty * displayPrice) : (holding.totalInvestment || (displayQty * displayPrice)));
  const displayTotalPnl = originalTotalPnl;
  const displayUnrealisedPnl = holding.customUpnl !== undefined ? holding.customUpnl : (originalTotalPnl - displayBrokerage);

  const handleSave = async () => {
    if (onEdit) {
      setIsSaving(true);
      await onEdit(editData);
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


  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center  bg-slate-950/90 backdrop-blur-sm animate-in fade-in duration-300 overflow-y-auto">
      {/* Background clickable area to close */}
      <div className="fixed inset-0 min-h-screen print-hide" onClick={onClose}></div>

      <div className="relative z-10 w-full max-w-[700px] mt-2 flex flex-col items-center receipt-print-area">
        {/* Theme Toggle */}
        <div className="flex gap-2 w-fit  mb-2 bg-slate-900 p-1.5 rounded-full border border-slate-700 shadow-lg print-hide justify-center">
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
          className={`w-full overflow-hidden transition-colors duration-300 ${theme === 'dark' ? 'dark' : ''} ${theme === 'dark'
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
                  ENTRY
                </span>
                <span className={`text-xs font-bold ${isBuy ? 'text-emerald-500' : 'text-rose-500'}`}>
                  ({holding.type.toUpperCase()})
                </span>
              </div>
              <div className={`text-xs font-bold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-700'}`}>
                {formatDate(holding.date || holding.lastUpdated)}
              </div>
            </div>

            {/* Asset Name & Customer Info */}
            <div className="mt-2 mb-3 px-2 flex justify-between items-start">
              <div>
                <h3 className={`text-[15px] font-black tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {holding.symbol}
                </h3>
                <div className={`text-[12px]  mt-0.5 ${theme === 'dark' ? 'text-slate-200' : 'text-slate-800'}`}>
                  {customer.name || 'User'}
                </div>
              </div>
              <div className="text-right">
                {/* <div className={`text-[10px] font-bold uppercase tracking-wider mb-0.5 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>QTY</div> */}
                {/* <span className={`text-base font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {displayQty} {holding.lot || editData.lot ? `(${isEditing ? editData.lot : holding.lot})` : ''}
                </span> */}
              </div>
            </div>

            {/* Holding Details Table */}
            <div className={`rounded-xl border overflow-hidden ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className="px-4 py-1.5 text-center bg-blue-600">
                <h4 className="text-white text-lg font-bold tracking-wider uppercase">
                  {(isEditing ? editData.tradeCategory : (holding.tradeCategory || 'normal')) === 'delivery' ? 'DELIVERY' : 'NORMAL'}
                </h4>
              </div>
              <div className="px-3  py-3 space-y-3">
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
                    <span className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{holding.type.toUpperCase()}</span>
                  </div>
                )} */}
                <div className={`flex justify-between items-center pb-2 border-b border-solid ${theme === 'dark' ? 'border-slate-600' : 'border-slate-300'}`}>
                  <span className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>Qty (Lot)</span>
                  {isEditing ? (
                    <div className="flex gap-2">
                      <input type="number" className="w-16 bg-slate-800 text-white rounded px-2 py-1 text-sm text-right" value={editData.quantity} onChange={e => setEditData({ ...editData, quantity: e.target.value })} placeholder="Qty" />
                      <input type="number" className="w-16 bg-slate-800 text-white rounded px-2 py-1 text-sm text-right" value={editData.lot} onChange={e => setEditData({ ...editData, lot: e.target.value })} placeholder="Lot" />
                    </div>
                  ) : (
                    <span className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{displayQty} {holding.lot ? `(${holding.lot})` : ''}</span>
                  )}
                </div>
                <div className={`flex justify-between items-center pb-2 border-b border-solid ${theme === 'dark' ? 'border-slate-600' : 'border-slate-300'}`}>
                  <span className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>Avg</span>
                  {isEditing ? (
                    <input type="number" className="w-24 bg-slate-800 text-white rounded px-2 py-1 text-sm text-right" value={editData.price} onChange={e => setEditData({ ...editData, price: e.target.value })} />
                  ) : (
                    <span className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{formatNumber(holding.avgCost)}</span>
                  )}
                </div>
                {!isEditing && (
                  <div className={`flex justify-between items-center pb-2 border-b border-solid ${theme === 'dark' ? 'border-slate-600' : 'border-slate-300'}`}>
                    <span className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>{isBuy ? 'Invested' : 'Invested'}</span>
                    <span className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(displayInvested)}</span>
                  </div>
                )}
                <div className={`flex justify-between items-center pb-2 border-b border-solid ${theme === 'dark' ? 'border-slate-600' : 'border-slate-300'}`}>
                  <span className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>LTP</span>
                  {isEditing ? (
                    <input type="number" className="w-24 bg-slate-800 text-white rounded px-2 py-1 text-sm text-right" value={editData.ltp} onChange={e => setEditData({ ...editData, ltp: e.target.value })} />
                  ) : (
                    <span className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{formatNumber(holding.lastPrice)}</span>
                  )}
                </div>
                <div className={`flex justify-between items-center pb-2 border-b border-solid ${theme === 'dark' ? 'border-slate-600' : 'border-slate-300'}`}>
                  <span className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>Money Margin</span>
                  {isEditing ? (
                    <input type="number" className="w-24 bg-slate-800 text-white rounded px-2 py-1 text-sm text-right" value={editData.marginRs} onChange={e => setEditData({ ...editData, marginRs: e.target.value })} />
                  ) : (
                    <span className={`text-sm font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      {(holding.marginPct || (displayInvested > 0 && displayMargin > 0 ? ((displayMargin / displayInvested) * 100).toFixed(2) : null)) && (
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${theme === 'dark' ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'}`}>
                          {holding.marginPct ? holding.marginPct : ((displayMargin / displayInvested) * 100).toFixed(2)}%
                        </span>
                      )}
                      {formatCurrency(holding.totalMargin || 0)}
                    </span>
                  )}
                </div>
                <div className={`flex justify-between items-center pb-2 border-b border-solid ${theme === 'dark' ? 'border-slate-600' : 'border-slate-300'}`}>
                  <span className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>Brokerage</span>
                  {isEditing ? (
                    <input type="number" className="w-24 bg-slate-800 text-white rounded px-2 py-1 text-sm text-right" value={editData.brokerageFee} onChange={e => setEditData({ ...editData, brokerageFee: e.target.value })} />
                  ) : (
                    <span className={`text-sm font-bold flex items-center gap-2 ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${theme === 'dark' ? 'bg-slate-800 text-slate-400' : 'bg-slate-200 text-slate-600'}`}>
                        0.01%
                      </span>
                      {formatCurrency(holding.totalBrokerage || 0)}
                    </span>
                  )}
                </div>
                {!isEditing && (
                  <div className="flex justify-between items-center pt-1">
                    <span className={`text-sm font-bold ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>P&L</span>
                    <span className={`text-sm font-bold ${displayTotalPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {displayTotalPnl >= 0 ? '+' : ''}{formatCurrency(displayTotalPnl)}
                      <span className="text-xs ml-1.5 font-bold">
                        ({getPnlPercent(displayTotalPnl, displayInvested)})
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
              EDIT
            </button>
          )}
          {isEditing && (
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-white bg-green-600 hover:bg-green-500 transition-colors shadow-lg shadow-green-600/20"
            >
              {isSaving ? 'SAVING...' : 'SAVE'}
            </button>
          )}

          <button
            onClick={handleDownload}
            className="flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-white bg-black hover:bg-slate-900 transition-colors shadow-lg border border-slate-800"
          >

            SAVE PDF
          </button>


        </div>

      </div>
    </div>
  );
};

export default HoldingReceipt;

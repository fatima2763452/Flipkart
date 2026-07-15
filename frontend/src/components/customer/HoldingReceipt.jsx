import React, { useEffect, useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import { UserCircle2, ShieldCheck, TrendingUp, FileText } from 'lucide-react';

const HoldingReceipt = ({ customer, holding, onClose, onEdit }) => {
  const receiptRef = useRef(null);
  const [theme, setTheme] = useState('dark'); // 'dark' or 'light'

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
        brokerageFee: holding.totalBrokerage || 0
      });
    }
  }, [holding, isEditing]);

  const displayQty = isEditing ? (parseFloat(editData.quantity) || 0) : (holding.netQty || 0);
  const displayPrice = isEditing ? (parseFloat(editData.price) || 0) : (holding.avgCost || 0);
  const displayLtp = isEditing ? (parseFloat(editData.ltp) || 0) : (holding.lastPrice || 0);
  const displayMargin = isEditing ? (parseFloat(editData.marginRs) || 0) : (holding.totalMargin || 0);
  const displayBrokerage = isEditing ? (parseFloat(editData.brokerageFee) || 0) : (holding.totalBrokerage || 0);

  const displayInvested = holding.customInvested !== undefined ? holding.customInvested : holding.totalInvestment;
  const displayUnrealisedPnl = holding.customUpnl !== undefined ? holding.customUpnl : holding.upnl + (holding.totalBrokerage || 0);
  const displayTotalPnl = holding.customTotalPnl !== undefined ? holding.customTotalPnl : holding.totalPnl || holding.upnl;
  const isBuy = holding.type.toLowerCase() === 'buy';

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

  const formatCurrency = (val) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(val);
  const formatDateTime = () => {
    const d = new Date();
    return d.toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const handleDownload = async () => {
    if (!receiptRef.current) return;
    try {
      const filter = (node) => {
        // Exclude external stylesheets to prevent CORS SecurityError
        if (node.tagName === 'LINK' && node.rel === 'stylesheet') {
          return false;
        }
        return true;
      };

      const dataUrl = await toPng(receiptRef.current, {
        backgroundColor: theme === 'dark' ? '#0f172a' : '#f8fafc',
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
        format: [receiptRef.current.offsetWidth, receiptRef.current.offsetHeight]
      });

      pdf.addImage(dataUrl, 'PNG', 0, 0, receiptRef.current.offsetWidth, receiptRef.current.offsetHeight);
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
              ? 'bg-[#0f172a] text-slate-200'
              : 'bg-[#f8fafc] text-slate-800'
            }`}
          style={{ fontFamily: "'Inter', sans-serif" }}
        >

          <div className="p-3 sm:p-3">
            {/* Header */}
            <div className={`flex justify-between items-center pb-3 border-b ${theme === 'dark' ? 'border-slate-800' : 'border-slate-200'}`}>
              <div className="flex items-center gap-3">

                <div>
                  <h1 className={`text-xl font-black tracking-tight leading-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                    RADHE BROCKRAGE PVT. LTD.
                  </h1>
                  <h2 className={`text-xs font-semibold tracking-widest uppercase ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                    entry
                  </h2>
                </div>
              </div>

            </div>

            {/* Asset Name */}
            <div className="mt-2 mb-2 px-2 flex justify-between items-end">
              <div>
                <h3 className={`text-xl font-bold tracking-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {holding.symbol}
                </h3>
                <div className="flex items-center gap-2 mt-1">

                  <span className={`text-xs font-bold ${isBuy ? 'text-emerald-500' : 'text-rose-500'}`}>
                    ({holding.type.toUpperCase()})
                  </span>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>Qty</div>
                <span className={`text-l font-bold ${theme === 'dark' ? 'text-blue-400' : 'text-blue-600'}`}>{displayQty} {holding.lot || editData.lot ? `(${isEditing ? editData.lot : holding.lot})` : ''}</span>
              </div>
            </div>

            {/* Top Cards Info - 3 blocks exactly like TradeReceipt */}
            <div className="grid grid-cols-3 gap-3 mb-2">
              <div className={`p-2 rounded-xl border flex flex-col items-center justify-center text-center ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  ENTRY DATE
                </div>
                <div className={`text-[15px] font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {formatDateTime()}
                </div>
              </div>
              <div className={`p-4 rounded-xl border flex flex-col items-center justify-center text-center ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  NAME
                </div>
                <div className={`font-bold text-sm leading-tight ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {customer.name?.split(' ')[0] || 'User'}
                </div>

              </div>
              <div className={`p-4 rounded-xl border flex flex-col items-center justify-center text-center ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
                <div className={`text-[10px] font-bold uppercase tracking-wider mb-2 ${theme === 'dark' ? 'text-slate-400' : 'text-slate-500'}`}>
                  Avg
                </div>
                <div className={`text-[15px] font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>
                  {formatCurrency(holding.avgCost)}
                </div>
              </div>
            </div>

            {/* Holding Details Table */}
            <div className={`rounded-xl border overflow-hidden ${theme === 'dark' ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200 shadow-sm'}`}>
              <div className="bg-blue-600 px-4 py-2">
                <h4 className="text-white text-xs font-bold tracking-wider uppercase">DETAILS</h4>
              </div>
              <div className="px-3  py-3 space-y-3">
                {!isEditing && (
                  <div className={`flex justify-between items-center pb-2 border-b border-solid ${theme === 'dark' ? 'border-slate-600' : 'border-slate-300'}`}>
                    <span className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>Mode</span>
                    <span className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{holding.type.toUpperCase()}</span>
                  </div>
                )}
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
                    <span className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(holding.avgCost)}</span>
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
                    <span className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(holding.lastPrice)}</span>
                  )}
                </div>
                <div className={`flex justify-between items-center pb-2 border-b border-solid ${theme === 'dark' ? 'border-slate-600' : 'border-slate-300'}`}>
                  <span className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>Money Margin</span>
                  {isEditing ? (
                    <input type="number" className="w-24 bg-slate-800 text-white rounded px-2 py-1 text-sm text-right" value={editData.marginRs} onChange={e => setEditData({ ...editData, marginRs: e.target.value })} />
                  ) : (
                    <span className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(holding.totalMargin || 0)}</span>
                  )}
                </div>
                <div className={`flex justify-between items-center pb-2 border-b border-solid ${theme === 'dark' ? 'border-slate-600' : 'border-slate-300'}`}>
                  <span className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>Brockerage</span>
                  {isEditing ? (
                    <input type="number" className="w-24 bg-slate-800 text-white rounded px-2 py-1 text-sm text-right" value={editData.brokerageFee} onChange={e => setEditData({ ...editData, brokerageFee: e.target.value })} />
                  ) : (
                    <span className={`text-sm font-bold ${theme === 'dark' ? 'text-white' : 'text-slate-900'}`}>{formatCurrency(holding.totalBrokerage || 0)}</span>
                  )}
                </div>
                {!isEditing && (
                  <div className="flex justify-between items-center pt-1">
                    <span className={`text-sm ${theme === 'dark' ? 'text-slate-300' : 'text-slate-600'}`}>Unrealised P&L</span>
                    <span className={`text-sm font-bold ${displayUnrealisedPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {(displayUnrealisedPnl >= 0 ? '+' : '')}{formatCurrency(displayUnrealisedPnl)}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Total P&L Footer */}
            {!isEditing && (
              <div className={`mt-4 p-4 rounded-xl border flex justify-between items-center ${displayTotalPnl >= 0
                  ? (theme === 'dark' ? 'bg-emerald-950/30 border-emerald-900/50' : 'bg-emerald-50 border-emerald-200')
                  : (theme === 'dark' ? 'bg-rose-950/30 border-rose-900/50' : 'bg-rose-50 border-rose-200')
                }`}>
                <span className={`text-xs font-bold uppercase tracking-wider ${displayTotalPnl >= 0
                    ? (theme === 'dark' ? 'text-emerald-400/80' : 'text-emerald-700/80')
                    : (theme === 'dark' ? 'text-rose-400/80' : 'text-rose-700/80')
                  }`}>TOTAL P/L</span>
                <span className={`text-xl font-black tracking-tight ${displayTotalPnl >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {displayTotalPnl >= 0 ? '+' : ''}{formatCurrency(displayTotalPnl)}
                </span>
              </div>
            )}

            {/* Footer stamp */}
            <div className="mt-3 mb-1 flex flex-col items-center justify-center">

              <div className={`text-[10px] font-bold tracking-widest ${theme === 'dark' ? 'text-slate-500' : 'text-slate-400'}`}>
                © RADHE BROCKRAGE PVT. LTD.
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
            className="flex-1 py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-bold text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-lg shadow-blue-600/20"
          >

            SAVE PDF
          </button>


        </div>

      </div>
    </div>
  );
};

export default HoldingReceipt;

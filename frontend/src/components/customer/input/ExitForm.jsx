import React, { useState } from 'react';
import api from '../../../services/api';
import TradeReceipt from '../TradeReceipt';

const getTodayDateValue = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatInputDate = (value) => {
  if (!value) return getTodayDateValue();

  const dateValue = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(dateValue.getTime())) return getTodayDateValue();

  const year = dateValue.getFullYear();
  const month = String(dateValue.getMonth() + 1).padStart(2, '0');
  const day = String(dateValue.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const ExitForm = ({ formatCurrency, customer, editingTradeData, setEditingTradeData }) => {
  const [symbol, setSymbol] = useState('');
  const [action, setAction] = useState('sell'); // default to sell for exit
  const [quantity, setQuantity] = useState('');
  const [lot, setLot] = useState('');
  const [price, setPrice] = useState('');
  const [ltp, setLtp] = useState('');
  const [marginRs, setMarginRs] = useState('');
  const [marginPct, setMarginPct] = useState('');
  const [date, setDate] = useState(getTodayDateValue());
  const [brokerage, setBrokerage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [editingId, setEditingId] = useState(null);

  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  React.useEffect(() => {
    if (editingTradeData && editingTradeData.type === 'exit') {
      setEditingId(editingTradeData._id || null);
      setSymbol(editingTradeData.symbol || '');
      setAction(editingTradeData.action || 'sell');
      setQuantity(editingTradeData.quantity || '');
      setLot(editingTradeData.lot || '');
      setPrice(editingTradeData.price || editingTradeData.avgCost || '');
      setLtp(editingTradeData.ltp || editingTradeData.lastPrice || '');
      setMarginRs(editingTradeData.marginRs || '');
      setMarginPct(editingTradeData.marginPct || '');
      if (editingTradeData.date) {
        setDate(formatInputDate(editingTradeData.date));
      }
      if (editingTradeData.brokerageType === 'rupees') {
        setBrokerage((editingTradeData.brokerageValue || '').toString());
      } else {
        setBrokerage(
          editingTradeData.brokeragePct && editingTradeData.brokeragePct !== 0.01 
            ? editingTradeData.brokeragePct.toString() 
            : ''
        );
      }
    }
  }, [editingTradeData]);

  const qtyNum = parseFloat(quantity) || 0;
  const priceNum = parseFloat(price) || 0;
  const estimatedTotal = qtyNum * priceNum;
  
  // Brokerage: default to percentage 0.01% when empty; treat user input as flat rupees
  const isFlat = brokerage !== '';
  const brokerageType = isFlat ? 'rupees' : 'percentage';
  const brokerageValue = brokerage === '' ? 0.01 : (parseFloat(brokerage) || 0);

  const brokerageFee = isFlat ? brokerageValue : (estimatedTotal * brokerageValue) / 100;

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 1000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      const userInfo = JSON.parse(localStorage.getItem('userInfo'));
      
      const payload = {
        customerId: customer._id,
        type: 'exit',
        action: action,
        symbol: symbol,
        quantity: qtyNum,
        lot: parseFloat(lot) || 0,
        price: priceNum,
        ltp: parseFloat(ltp) || 0,
        marginRs: parseFloat(marginRs) || 0,
        marginPct: parseFloat(marginPct) || 0,
        date: date || getTodayDateValue(),
        brokerageType: brokerageType,
        brokerageValue: brokerageValue
      };

      let savedData;
      if (editingId) {
        const res = await api.put(`/trades/edit/${editingId}`, payload);
        showToast(`Successfully updated EXIT ${action.toUpperCase()} for ${qtyNum} ${symbol}`, 'success');
        savedData = res.data;
      } else {
        const res = await api.post('/trades', payload);
        showToast(`Successfully saved EXIT ${action.toUpperCase()} for ${qtyNum} ${symbol}`, 'success');
        savedData = res.data;
      }
      
      // Reset form on success
      setEditingId(null);
      if (setEditingTradeData) setEditingTradeData(null);
      setSymbol('');
      setQuantity('');
      setLot('');
      setPrice('');
      setLtp('');
      setMarginRs('');
      setMarginPct('');
      setDate(getTodayDateValue());
      setBrokerage('');
    } catch (err) {
      console.error(err);
      showToast(err.response?.data?.message || 'Server error. Did you restart the backend?', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditReceipt = () => {
    if (receiptData) {
      setEditingId(receiptData._id);
      setSymbol(receiptData.symbol);
      setAction(receiptData.action || 'sell');
      setQuantity(receiptData.quantity.toString());
      setLot((receiptData.lot || '').toString());
      setPrice((receiptData.price || receiptData.exitPrice || '').toString());
      setLtp((receiptData.ltp || '').toString());
      setMarginRs((receiptData.marginRs || '').toString());
      setMarginPct((receiptData.marginPct || '').toString());
      if (receiptData.date) {
        setDate(formatInputDate(receiptData.date));
      }
      if (receiptData.brokerageType === 'rupees') {
        setBrokerage((receiptData.brokerageValue || '').toString());
      } else {
        setBrokerage(
          receiptData.brokeragePct && receiptData.brokeragePct !== 0.01
            ? receiptData.brokeragePct.toString()
            : ''
        );
      }
      setReceiptData(null);
    }
  };

  const handleCloseReceipt = () => {
    setReceiptData(null);
    // Reset form
    setEditingId(null);
    setSymbol('');
    setQuantity('');
    setLot('');
    setPrice('');
    setLtp('');
    setMarginRs('');
    setMarginPct('');
    setDate(getTodayDateValue());
    setBrokerage('');
  };

  return (
    <div className="relative">
      {/* Toast Notification */}
      {toast.show && (
        <div className={`absolute -top-12 left-1/2 -translate-x-1/2 z-50 px-4 py-1.5 rounded-full font-bold text-xs whitespace-nowrap flex items-center gap-2 shadow-lg animate-in slide-in-from-top-4 fade-in duration-300 ${toast.type === 'success' ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
          <span className="material-symbols-outlined text-[16px]">
            {toast.type === 'success' ? 'check_circle' : 'error'}
          </span>
          {toast.message}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg relative z-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {/* Stock Symbol */}
      <div className="mb-5">
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Stock Symbol</label>
        <div className="relative">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-[20px]">search</span>
          <input 
            type="text" 
            required
            value={symbol}
            onChange={e => setSymbol(e.target.value.toUpperCase())}
            placeholder="e.g., NVDA, AAPL"
            className="w-full bg-slate-950 border border-slate-800 rounded-lg py-3 pl-10 pr-4 text-sm font-mono text-slate-200 placeholder:text-slate-600 focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all uppercase"
          />
        </div>
      </div>

      {/* Action Toggle */}
      <div className="mb-5">
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Action</label>
        <div className="flex gap-3">
          <button 
            type="button"
            onClick={() => setAction('buy')}
            className={`flex-1 flex justify-center items-center gap-2 py-3 rounded-lg font-bold text-sm transition-all ${
              action === 'buy' 
                ? 'bg-emerald-500 text-white shadow-[0_0_15px_rgba(16,185,129,0.3)] border border-emerald-400' 
                : 'bg-slate-950 text-slate-400 border border-slate-800 hover:bg-slate-800'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">add_circle</span>
            BUY
          </button>
          <button 
            type="button"
            onClick={() => setAction('sell')}
            className={`flex-1 flex justify-center items-center gap-2 py-3 rounded-lg font-bold text-sm transition-all ${
              action === 'sell' 
                ? 'bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.3)] border border-rose-400' 
                : 'bg-slate-950 text-slate-400 border border-slate-800 hover:bg-slate-800'
            }`}
          >
            <span className="material-symbols-outlined text-[20px]">do_not_disturb_on</span>
            SELL
          </button>
        </div>
      </div>

      {/* Quantity & Price & LTP */}
      <div className="flex gap-4 mb-5">
        <div className="flex-[0.8]">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Qty</label>
          <input 
            type="number" 
            required
            min="1"
            value={quantity}
            onChange={e => setQuantity(e.target.value)}
            placeholder="100"
            className="w-full bg-slate-950 border border-slate-800 rounded-lg py-3 px-4 text-sm font-mono text-slate-200 placeholder:text-slate-600 focus:border-blue-500 outline-none transition-all"
          />
        </div>
        <div className="flex-[0.8]">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Lot</label>
          <input 
            type="number" 
            min="0"
            value={lot}
            onChange={e => setLot(e.target.value)}
            placeholder="0"
            className="w-full bg-slate-950 border border-slate-800 rounded-lg py-3 px-4 text-sm font-mono text-slate-200 placeholder:text-slate-600 focus:border-blue-500 outline-none transition-all"
          />
        </div>
        <div className="flex-1">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Price</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-sm">₹</span>
            <input 
              type="number" 
              required
              step="0.01"
              min="0.01"
              value={price}
              onChange={e => setPrice(e.target.value)}
              placeholder="150.00"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-3 pl-8 pr-4 text-sm font-mono text-slate-200 placeholder:text-slate-600 focus:border-blue-500 outline-none transition-all"
            />
          </div>
        </div>
        <div className="flex-1">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">exit price</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-sm">₹</span>
            <input 
              type="number" 
              required
              step="0.01"
              min="0.01"
              value={ltp}
              onChange={e => setLtp(e.target.value)}
              placeholder="155.00"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-3 pl-8 pr-4 text-sm font-mono text-slate-200 placeholder:text-slate-600 focus:border-blue-500 outline-none transition-all"
            />
          </div>
        </div>
      </div>

      {/* Margin */}
      <div className="flex gap-4 mb-5">
        <div className="flex-1">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Money Margin (₹)</label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-sm">₹</span>
            <input 
              type="number" 
              value={marginRs}
              onChange={e => setMarginRs(e.target.value)}
              placeholder="0.00"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-3 pl-8 pr-4 text-sm font-mono text-slate-200 placeholder:text-slate-600 focus:border-amber-500 outline-none transition-all"
            />
          </div>
        </div>
        <div className="flex-1">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Money Margin (%)</label>
          <div className="relative">
            <input 
              type="number" 
              step="0.01"
              value={marginPct}
              onChange={e => setMarginPct(e.target.value)}
              placeholder="10"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-3 pl-4 pr-8 text-sm font-mono text-slate-200 placeholder:text-slate-600 focus:border-amber-500 outline-none transition-all"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-sm">%</span>
          </div>
        </div>
      </div>

      {/* Execution Date & Brokerage */}
      <div className="flex gap-4 mb-6">
        <div className="flex-[1.2]">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Execution Date</label>
          <div className="relative">
            <input 
              type="date" 
              required
              value={date}
              onChange={e => setDate(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-3 px-4 text-sm font-mono text-slate-200 focus:border-amber-500 outline-none transition-all appearance-none [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:right-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:h-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
            />
            <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">calendar_month</span>
          </div>
        </div>
        <div className="flex-[0.8]">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2">Brokerage</label>
          <div className="relative">
            <input 
              type="number" 
              step="0.01"
              value={brokerage}
              onChange={e => setBrokerage(e.target.value)}
              placeholder="0.01"
              className="w-full bg-slate-950 border border-slate-800 rounded-lg py-3 pl-4 pr-8 text-sm font-mono text-slate-200 placeholder:text-slate-600 focus:border-amber-500 outline-none transition-all"
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 font-mono text-sm">
              {brokerage === '' ? '%' : '₹'}
            </span>
          </div>
          <p className="text-[10px] text-slate-500 mt-1">
            {brokerage === '' ? 'Default: 0.01% of value' : `Flat: ₹${parseFloat(brokerage) || 0}`}
          </p>
        </div>
      </div>
 
      {/* Estimated Total Box */}
      <div className="bg-slate-800/40 border-l-4 border-amber-400 rounded-r-lg p-4 mb-6 flex justify-between items-center">
        <div>
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Estimated Total</div>
          <div className="text-2xl font-mono font-bold text-white tracking-tight">{formatCurrency(estimatedTotal)}</div>
        </div>
        <div className="text-right">
          <div className="text-[10px] font-bold uppercase tracking-wider mb-1 text-amber-400">Brokerage</div>
          <div className="text-sm font-mono text-slate-500">{formatCurrency(brokerageFee)}</div>
        </div>
      </div>

      {/* Save Button */}
      <button 
        type="submit"
        disabled={isSubmitting}
        className="w-full font-bold py-3.5 rounded-lg flex items-center justify-center gap-2 transition-colors active:scale-[0.98] bg-amber-300 hover:bg-amber-200 text-amber-950 disabled:opacity-70 disabled:cursor-not-allowed"
      >
        {isSubmitting ? (
          <span className="material-symbols-outlined text-[20px] animate-spin">progress_activity</span>
        ) : (
          <span className="material-symbols-outlined text-[20px]">save</span>
        )}
        {isSubmitting ? 'SAVING...' : (editingId ? 'UPDATE EXIT RECORD' : 'SAVE EXIT RECORD')}
      </button>
      </form>
    </div>
  );
};

export default ExitForm;

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const RecycleBin = () => {
  const [user, setUser] = useState(null);
  const [deletedCustomers, setDeletedCustomers] = useState([]);
  const [isListLoading, setIsListLoading] = useState(true);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const navigate = useNavigate();

  useEffect(() => {
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
      const parsedUser = JSON.parse(userInfo);
      setUser(parsedUser);
      fetchDeletedCustomers(parsedUser._id);
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const fetchDeletedCustomers = async (ownerId) => {
    setIsListLoading(true);
    try {
      const { data } = await api.get(`/customers/deleted?ownerId=${ownerId}`);
      if (Array.isArray(data)) {
        setDeletedCustomers(data);
      } else {
        setDeletedCustomers([]);
      }
    } catch (err) {
      console.error('Failed to fetch deleted customers:', err);
      setDeletedCustomers([]);
    } finally {
      setIsListLoading(false);
    }
  };

  const handleRestore = async (customerId) => {
    if (!user) return;
    try {
      await api.put(`/customers/${customerId}/restore`);
      // Refresh list
      fetchDeletedCustomers(user._id);
    } catch (err) {
      console.error('Failed to restore customer:', err);
      alert(err.response?.data?.message || 'Failed to restore customer');
    }
  };

  const handlePermanentDelete = async () => {
    if (!customerToDelete || !user) return;
    setIsActionLoading(true);
    try {
      await api.delete(`/customers/${customerToDelete._id}/permanent`);
      setIsConfirmOpen(false);
      setCustomerToDelete(null);
      fetchDeletedCustomers(user._id);
    } catch (err) {
      console.error('Failed to permanently delete customer:', err);
      alert(err.response?.data?.message || 'Failed to permanently delete customer');
    } finally {
      setIsActionLoading(false);
    }
  };

  return (
    <div className="bg-slate-950 text-slate-200 min-h-screen flex flex-col overflow-x-hidden font-sans antialiased relative">
      {/* Confirmation Modal for Permanent Delete */}
      {isConfirmOpen && customerToDelete && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-rose-900 w-full max-w-sm rounded-2xl p-6 shadow-2xl shadow-rose-900/20 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-full bg-rose-500/20 flex items-center justify-center mx-auto mb-4 border border-rose-500/30">
              <span className="material-symbols-outlined text-rose-500 text-3xl">report</span>
            </div>
            
            <h3 className="text-xl font-bold text-white text-center mb-2">Delete Permanently?</h3>
            <p className="text-slate-400 text-sm text-center mb-6">
              You are about to permanently delete <span className="text-rose-400 font-semibold">{customerToDelete.name}</span>. 
              <br/>
              <span className="text-rose-400/90 font-bold uppercase tracking-wider text-[11px] block mt-2">
                Warning: This will permanently delete all trade histories, entry, and exit logs associated with this customer. This cannot be undone!
              </span>
            </p>
            
            <div className="flex gap-3">
              <button 
                onClick={() => {
                  setIsConfirmOpen(false);
                  setCustomerToDelete(null);
                }} 
                disabled={isActionLoading}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={handlePermanentDelete}
                disabled={isActionLoading}
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-medium py-3 rounded-xl transition-colors flex justify-center items-center gap-2 shadow-lg shadow-rose-600/30 disabled:opacity-50"
              >
                {isActionLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="p-4 flex items-center justify-between border-b border-slate-800/60">
        <button onClick={() => navigate('/')} className="text-slate-400 hover:text-white flex items-center gap-1">
          <span className="material-symbols-outlined text-[20px]">arrow_back</span> Back to Dashboard
        </button>
        <div className="flex items-center gap-2 text-rose-400 font-bold text-sm tracking-wider">
          <span className="material-symbols-outlined">delete_sweep</span>
          RECYCLE BIN
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 px-4 pt-6 pb-24 max-w-4xl mx-auto w-full">
        {/* Section Description */}
        <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 mb-6">
          <p className="text-slate-400 text-xs leading-relaxed">
            Customers shown here were deleted from your main registry. Their records and transactions are temporarily preserved. You can either restore them back to the active client registry or delete them permanently along with all of their billing/trade records.
          </p>
        </div>

        {/* Deleted Customers List */}
        <div className="space-y-4">
          {isListLoading ? (
            [1, 2, 3].map((i) => (
              <div key={i} className="bg-slate-900/80 border border-slate-800 rounded-lg p-4 animate-pulse">
                <div className="flex justify-between items-start">
                  <div className="space-y-2">
                    <div className="w-32 h-4 bg-slate-800 rounded"></div>
                    <div className="w-20 h-3 bg-slate-800/50 rounded"></div>
                  </div>
                  <div className="w-20 h-8 bg-slate-800 rounded"></div>
                </div>
              </div>
            ))
          ) : deletedCustomers.length === 0 ? (
            <div className="text-center py-16 text-slate-500 border border-dashed border-slate-800 rounded-2xl bg-slate-900/20">
              <span className="material-symbols-outlined text-5xl mb-3 text-slate-600">delete_outline</span>
              <p className="text-sm font-medium">Recycle Bin is empty</p>
              <p className="text-xs text-slate-600 mt-1">No soft-deleted customers found.</p>
            </div>
          ) : (
            deletedCustomers.map((customer) => (
              <div 
                key={customer._id}
                className="bg-slate-900/95 border border-slate-800 rounded-xl p-4 shadow-md flex justify-between items-center"
              >
                <div>
                  <h3 className="font-medium text-slate-200 text-base">{customer.name}</h3>
                  <span className="font-mono text-xs text-slate-500 block mt-0.5">{customer.customerId}</span>
                </div>
                
                <div className="flex gap-3">
                  {/* Restore Button */}
                  <button 
                    onClick={() => handleRestore(customer._id)}
                    className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors flex items-center justify-center"
                    title="Restore Customer"
                  >
                    <span className="material-symbols-outlined text-[20px]">restore</span>
                    <span className="hidden sm:inline text-xs font-semibold ml-1.5 pr-0.5">Restore</span>
                  </button>

                  {/* Permanent Delete Button */}
                  <button 
                    onClick={() => {
                      setCustomerToDelete(customer);
                      setIsConfirmOpen(true);
                    }}
                    className="p-2.5 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/20 hover:bg-rose-500/20 transition-colors flex items-center justify-center"
                    title="Delete Permanently"
                  >
                    <span className="material-symbols-outlined text-[20px]">delete_forever</span>
                    <span className="hidden sm:inline text-xs font-semibold ml-1.5 pr-0.5">Delete Forever</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </main>
    </div>
  );
};

export default RecycleBin;

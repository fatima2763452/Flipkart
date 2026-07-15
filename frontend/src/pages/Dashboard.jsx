import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const CustomerCard = ({ customer, onClick, onDeleteSwipe }) => {
  const [translateX, setTranslateX] = useState(0);
  const startX = useRef(null);
  const currentX = useRef(null);
  const isDragging = useRef(false);

  const startDrag = (clientX) => {
    startX.current = clientX;
    isDragging.current = true;
  };

  const moveDrag = (clientX) => {
    if (!isDragging.current || !startX.current) return;
    currentX.current = clientX;
    const diff = currentX.current - startX.current;
    
    if (diff < 0) {
      setTranslateX(Math.max(diff, -100));
    }
  };

  const endDrag = () => {
    if (!isDragging.current) return;
    isDragging.current = false;
    
    if (startX.current !== null && currentX.current !== null) {
      const diff = currentX.current - startX.current;
      if (diff < -60) {
        onDeleteSwipe(customer);
      }
    }
    
    setTranslateX(0);
    startX.current = null;
    currentX.current = null;
  };

  return (
    <div className="relative overflow-hidden rounded-lg">
      {/* Background Delete Action */}
      <div className="absolute inset-y-0 right-0 w-24 flex items-center justify-end pr-5 text-white bg-rose-600 z-0 rounded-lg">
        <span className="material-symbols-outlined text-[24px]">delete</span>
      </div>
      
      {/* Foreground Card */}
      <div 
        onClick={() => { if(translateX === 0) onClick(customer) }}
        onTouchStart={(e) => startDrag(e.touches[0].clientX)}
        onTouchMove={(e) => moveDrag(e.touches[0].clientX)}
        onTouchEnd={endDrag}
        onMouseDown={(e) => startDrag(e.clientX)}
        onMouseMove={(e) => moveDrag(e.clientX)}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
        style={{ transform: `translateX(${translateX}px)`, transition: isDragging.current ? 'none' : 'transform 0.3s ease-out' }}
        className="bg-slate-900/95 border border-slate-800 rounded-lg p-4 hover:border-blue-500/50 cursor-pointer relative z-10 w-full touch-pan-y shadow-md"
      >
        <div className="flex justify-between items-start mb-2 relative z-10">
          <div>
            <h3 className="font-medium text-slate-100">{customer.name}</h3>
            <span className="font-mono text-[11px] text-slate-400">{customer.customerId}</span>
          </div>
          <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase border ${
            customer.status === 'Active' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 
            customer.status === 'Suspended' ? 'bg-rose-500/10 text-rose-400 border-rose-500/20' :
            'bg-blue-500/10 text-blue-400 border-blue-500/20'
          }`}>
            {customer.status || 'Active'}
          </span>
        </div>
        <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-800 relative z-10">
          <span className="text-slate-500 text-[11px] uppercase tracking-wider font-bold">Holdings</span>
          <span className={`font-mono ${customer.holdings === '$0.00' ? 'text-slate-500' : 'text-blue-400'}`}>
            {customer.holdings || '$0.00'}
          </span>
        </div>
      </div>
    </div>
  );
};

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [customers, setCustomers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ id: '', name: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListLoading, setIsListLoading] = useState(true);
  const [customerToDelete, setCustomerToDelete] = useState(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  
  const navigate = useNavigate();

  useEffect(() => {
    const userInfo = localStorage.getItem('userInfo');
    if (userInfo) {
      const parsedUser = JSON.parse(userInfo);
      setUser(parsedUser);
      fetchCustomers(parsedUser._id);
    } else {
      navigate('/login');
    }
  }, [navigate]);

  const fetchCustomers = async (ownerId) => {
    setIsListLoading(true);
    try {
      const { data } = await api.get(`/customers?ownerId=${ownerId}`);
      if (Array.isArray(data)) {
        setCustomers(data);
      } else {
        console.error('API did not return an array. Check VITE_URL!', data);
        setCustomers([]);
      }
    } catch (err) {
      console.error('Failed to fetch customers:', err);
      setCustomers([]);
    } finally {
      setIsListLoading(false);
    }
  };

  const handleCreateCustomer = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await api.post('/customers', {
        customerId: newCustomer.id,
        name: newCustomer.name,
        ownerId: user._id
      });
      
      setNewCustomer({ id: '', name: '' });
      setIsModalOpen(false);
      fetchCustomers(user._id); // Refresh list
    } catch (err) {
      console.error('Failed to create customer API error:', err);
      setError(err.response?.data?.message || err.message || 'Failed to create customer');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('userInfo');
    localStorage.removeItem('token');
    navigate('/login');
  };

  const handleCustomerClick = (customer) => {
    navigate(`/customer/${customer._id}`, { state: { customer: { ...customer, id: customer.customerId } } });
  };

  const handleDeleteCustomer = async () => {
    if (!customerToDelete) return;
    setIsDeleting(true);
    try {
      await api.delete(`/customers/${customerToDelete._id}`);
      setIsDeleteModalOpen(false);
      setCustomerToDelete(null);
      fetchCustomers(user._id);
    } catch (err) {
      console.error('Failed to delete customer', err);
      alert(err.response?.data?.message || 'Failed to delete customer');
    } finally {
      setIsDeleting(false);
    }
  };
  // -------------------------------------------------------------
  // MASTER DASHBOARD VIEW
  // -------------------------------------------------------------
  return (
    <div className="bg-slate-950 text-slate-200 min-h-screen flex flex-col overflow-x-hidden font-sans antialiased relative">
      {/* Create Customer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-slate-900 border border-slate-700 w-full max-w-sm rounded-xl p-6 shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <div className="flex justify-between items-center mb-5">
              <h3 className="text-lg font-semibold text-white">Add New Customer</h3>
              <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-white transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            
            <form onSubmit={handleCreateCustomer} className="space-y-4">
              {error && <div className="text-rose-400 bg-rose-500/10 p-3 rounded text-sm">{error}</div>}
              
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Customer ID</label>
                <input 
                  type="text" 
                  required
                  value={newCustomer.id}
                  onChange={e => setNewCustomer({...newCustomer, id: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600"
                  placeholder="e.g. CUST-1001"
                />
              </div>
              
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Customer Name</label>
                <input 
                  type="text" 
                  required
                  value={newCustomer.name}
                  onChange={e => setNewCustomer({...newCustomer, name: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2.5 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600"
                  placeholder="e.g. Apex Global Funds"
                />
              </div>
              
              <button 
                type="submit" 
                disabled={isLoading}
                className="w-full mt-2 bg-blue-500 hover:bg-blue-600 text-white font-medium py-2.5 rounded-lg transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
              >
                {isLoading ? 'Creating...' : 'Create Customer'}
                <span className="material-symbols-outlined text-[18px]">person_add</span>
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Delete Customer Confirmation Modal */}
      {isDeleteModalOpen && customerToDelete && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
          <div className="bg-slate-900 border border-rose-900 w-full max-w-sm rounded-2xl p-6 shadow-2xl shadow-rose-900/20 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-14 h-14 rounded-full bg-rose-500/20 flex items-center justify-center mx-auto mb-4 border border-rose-500/30">
              <span className="material-symbols-outlined text-rose-500 text-3xl">warning</span>
            </div>
            
            <h3 className="text-xl font-bold text-white text-center mb-2">Move to Recycle Bin?</h3>
            <p className="text-slate-400 text-sm text-center mb-6">
              You are about to delete <span className="text-rose-400 font-semibold">{customerToDelete.name}</span>. This customer will be moved to the Recycle Bin. Their trades and data will be safely preserved.
            </p>
            
            <div className="flex gap-3">
              <button 
                onClick={() => setIsDeleteModalOpen(false)} 
                disabled={isDeleting}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-white font-medium py-3 rounded-xl transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button 
                onClick={handleDeleteCustomer}
                disabled={isDeleting}
                className="flex-1 bg-rose-600 hover:bg-rose-500 text-white font-medium py-3 rounded-xl transition-colors flex justify-center items-center gap-2 shadow-lg shadow-rose-600/30 disabled:opacity-50"
              >
                {isDeleting ? 'Moving...' : 'Move to Bin'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Mobile Header */}
      <header className="p-4 flex items-center justify-between border-b border-slate-800/60">
        <div className="w-10 h-10 rounded-lg bg-slate-900 flex items-center justify-center border border-slate-700/50 text-blue-400 shadow-[0_0_15px_rgba(96,165,250,0.15)]">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <path d="m9 12 2 2 4-4"/>
          </svg>
        </div>
        <div className="flex gap-3 items-center">
          <button onClick={() => navigate('/recycle-bin')} className="bg-rose-600/20 text-rose-400 border border-rose-500/30 hover:bg-rose-600/30 px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors">
            <span className="material-symbols-outlined text-[18px]">delete</span> Bin
          </button>
          <button onClick={() => navigate('/account-opening')} className="bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30 px-3 py-1.5 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors">
            <span className="material-symbols-outlined text-[18px]">description</span> Form
          </button>
          <button onClick={handleLogout} className="text-slate-400 p-2 rounded hover:bg-slate-800 hover:text-red-400 transition-colors" title="Logout">
            <span className="material-symbols-outlined text-[24px]">logout</span>
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 px-4 pt-3 pb-24 relative z-0">
        {/* Search Bar */}
        <div className="mb-6">
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-[20px]">search</span>
            <input 
              className="bg-slate-900/50 border border-slate-800 text-slate-200 text-sm rounded-lg pl-10 pr-4 py-3 focus:border-blue-500 focus:ring-0 transition-colors w-full placeholder:text-slate-500 shadow-inner" 
              placeholder="Search Master Client Registry..." 
              type="text"
            />
          </div>
        </div>

        {/* Section Title */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2 text-blue-400 font-bold text-[11px] tracking-widest uppercase">
            <span className="material-symbols-outlined text-[16px]">group</span>
            MASTER CLIENT REGISTRY
          </div>
          <div className="flex items-center gap-2">
            <button className="text-slate-400 hover:text-blue-400 transition-colors">
              <span className="material-symbols-outlined text-[18px]">filter_list</span>
            </button>
          </div>
        </div>

        {/* Optimized List View */}
        <div className="space-y-4">
          {isListLoading ? (
            // Skeleton Loader
            [1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="bg-slate-900/80 border border-slate-800 rounded-lg p-4 shadow-sm relative overflow-hidden">
                <div className="flex justify-between items-start mb-2 relative z-10">
                  <div>
                    <div className="w-32 h-4 bg-slate-800 rounded animate-pulse"></div>
                    <div className="w-20 h-3 bg-slate-800/50 rounded mt-2 animate-pulse"></div>
                  </div>
                  <div className="w-16 h-5 bg-slate-800 rounded animate-pulse"></div>
                </div>
                <div className="flex justify-between items-center mt-3 pt-3 border-t border-slate-800 relative z-10">
                  <div className="w-16 h-3 bg-slate-800 rounded animate-pulse"></div>
                  <div className="w-12 h-4 bg-slate-800 rounded animate-pulse"></div>
                </div>
              </div>
            ))
          ) : customers.length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              <span className="material-symbols-outlined text-4xl mb-2">person_off</span>
              <p>No customers found. Add one below!</p>
            </div>
          ) : (
            customers.map(customer => (
              <CustomerCard 
                key={customer._id}
                customer={customer}
                onClick={handleCustomerClick}
                onDeleteSwipe={(c) => {
                  setCustomerToDelete(c);
                  setIsDeleteModalOpen(true);
                }}
              />
            ))
          )}
        </div>
      </main>

      {/* Floating Action Button (FAB) */}
      <button 
        onClick={() => setIsModalOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 bg-blue-500 hover:bg-blue-400 text-white rounded-2xl shadow-[0_4px_20px_rgba(59,130,246,0.4)] flex items-center justify-center active:scale-95 transition-transform z-50"
      >
        <span className="material-symbols-outlined text-[28px]">person_add</span>
      </button>
    </div>
  );
};

export default Dashboard;

import React from 'react';

const Executions = ({ customer }) => {
  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6 flex flex-col items-center justify-center min-h-[300px]">
      <span className="material-symbols-outlined text-5xl text-blue-400 mb-4">swap_horiz</span>
      <h3 className="text-xl font-medium text-slate-100 mb-2">Trade Executions</h3>
      <p className="text-sm text-slate-400 text-center">List of executed trades for {customer.name} will appear here.</p>
    </div>
  );
};

export default Executions;

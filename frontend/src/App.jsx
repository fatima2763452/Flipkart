import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';

const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

import CustomerDetail from './pages/CustomerDetail';
import Invoice from './components/customer/Invoice';
import AccountOpeningForm from './pages/AccountOpeningForm';
import SecretAdmin from './pages/SecretAdmin';
import RecycleBin from './pages/RecycleBin';

const AppRoutes = () => {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/secret-admin" element={<SecretAdmin />} />
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            <Dashboard />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/recycle-bin" 
        element={
          <ProtectedRoute>
            <RecycleBin />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/account-opening" 
        element={
          <ProtectedRoute>
            <AccountOpeningForm />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/customer/:id" 
        element={
          <ProtectedRoute>
            <CustomerDetail />
          </ProtectedRoute>
        } 
      />
      <Route 
        path="/customer/:id/invoice" 
        element={
          <ProtectedRoute>
            <Invoice />
          </ProtectedRoute>
        } 
      />
    </Routes>
  );
};

function App() {
  return (
    <Router>
      <AppRoutes />
    </Router>
  );
}

export default App;

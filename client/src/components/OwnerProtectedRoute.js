import React from 'react';
import { Navigate } from 'react-router-dom';
import { useOwnerAuth } from '../contexts/OwnerAuthContext';
import { motion } from 'framer-motion';
import { Shield, Crown } from 'lucide-react';

const OwnerProtectedRoute = ({ children }) => {
  const { isOwnerAuthenticated, isLoading } = useOwnerAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-purple-900 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="text-center"
        >
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full mb-4">
            <Crown className="w-8 h-8 text-white animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Verifying Owner Access</h2>
          <p className="text-gray-300">Please wait while we authenticate your credentials...</p>
          <div className="mt-6">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!isOwnerAuthenticated) {
    return <Navigate to="/admin/login" replace />;
  }

  return (
    <div className="min-h-screen">
      {children}
    </div>
  );
};

export default OwnerProtectedRoute;
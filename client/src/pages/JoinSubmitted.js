import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

const JoinSubmitted = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const prefill = location.state?.prefill || {};

  const handleCreateAccount = () => {
    navigate('/register', { state: { prefill } });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="rounded-2xl bg-white/10 backdrop-blur-lg border border-white/20 p-10 text-white max-w-md w-full text-center"
      >
        {/* Success icon */}
        <div className="flex items-center justify-center mb-6">
          <div className="w-16 h-16 rounded-full bg-green-500/20 border-2 border-green-400 flex items-center justify-center">
            <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
            </svg>
          </div>
        </div>

        <h1 className="text-2xl md:text-3xl font-bold mb-3">Claim Submitted!</h1>
        <p className="text-gray-300 text-sm mb-8">Your claim will be verified within <span className="text-white font-bold">48 hours</span>. Create your account now to track your status.</p>

        {/* Pulsing glow ring */}
        <div className="relative inline-block w-full">
          <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500 to-pink-500 blur-lg opacity-60 animate-pulse" />
          <motion.button
            onClick={handleCreateAccount}
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="relative w-full bg-gradient-to-r from-purple-500 via-pink-500 to-blue-500 text-white px-8 py-4 rounded-xl font-bold text-lg shadow-2xl border border-white/20 flex items-center justify-center gap-3"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            Create Your Account →
          </motion.button>
        </div>

        <p className="text-gray-500 text-xs mt-4">Free to join · Track your claim status · Earn points</p>
      </motion.div>
    </div>
  );
};

export default JoinSubmitted;


import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';

const JoinThankYou = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="rounded-2xl bg-white/10 backdrop-blur-lg border border-white/20 p-8 text-white text-center"
        >
          <h1 className="text-2xl md:text-3xl font-bold mb-4">Thank You</h1>
          <p className="text-white/90 mb-6">You have successfully submitted.</p>
          <div className="flex items-center justify-center gap-4">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-5 py-2.5 rounded-lg border border-white/30 text-white hover:bg-white/10 transition"
            >
              Back to Home
            </button>
            <button
              type="button"
              onClick={() => navigate('/dashboard')}
              className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold hover:from-purple-600 hover:to-blue-600 transition"
            >
              Go to Dashboard
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default JoinThankYou;
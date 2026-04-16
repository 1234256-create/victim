import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { clearJoinWizard, setJoinWizard } from '../utils/datastore';

const JoinNotice = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const ref = searchParams.get('ref');

  useEffect(() => {
    clearJoinWizard();
    if (ref) {
      setJoinWizard({ referralCode: ref });
    }
  }, [ref]);

  const handleNext = () => {
    const nextUrl = ref ? `/join-details?ref=${encodeURIComponent(ref)}` : '/join-details';
    navigate(nextUrl);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="rounded-2xl bg-white/10 backdrop-blur-lg border border-white/20 p-8 text-white"
        >
          <h1 className="text-2xl md:text-3xl font-bold mb-4">
            Important Notice — Please Read Before Submitting
          </h1>
          <div className="space-y-4 text-white/90 leading-relaxed">
            <p>
              We are collecting the information below to assist with potential recovery options for individuals who have experienced financial losses. Your responses will help us verify and validate claims as part of our internal review process.
            </p>
            <p>
              Please provide accurate and truthful information. Submitting false claims or deliberately inflating figures may be considered an attempt to extort funds and could lead to legal action.
            </p>
            <p className="font-semibold text-red-300">
              🔺 Warning: Any individual found to have submitted false or misleading information may be disqualified from recovery assistance and could be prosecuted for fraud or attempted extortion.
            </p>
            <p>
              By completing this form, you confirm that the information provided is accurate to the best of your knowledge. If you are unsure about any details, we recommend you review your records before submitting.
            </p>
            <p>
              Thank you for your cooperation.
            </p>
          </div>

          <div className="mt-8 flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate('/')}
              className="px-5 py-2.5 rounded-lg border border-white/30 text-white hover:bg-white/10 transition"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleNext}
              className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 text-white font-semibold hover:from-purple-600 hover:to-blue-600 transition"
            >
              Next
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default JoinNotice;
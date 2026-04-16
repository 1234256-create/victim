import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';
import { addJoinApplication as dsAddJoinApplication, getJoinWizard, setJoinWizard } from '../utils/datastore';

const JoinLoss = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [initialized, setInitialized] = useState(false);

  const [form, setForm] = useState({ totalAmount: '', breakdown: '', period: '' });

  useEffect(() => {
    const wiz = getJoinWizard();
    const l = wiz.loss || {};
    setForm({
      totalAmount: l.totalAmount || '',
      breakdown: l.breakdown || '',
      period: l.period || '',
    });
    setInitialized(true);
  }, []);

  const requiredFilled = form.totalAmount && form.period;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!requiredFilled) return;
    const wiz = getJoinWizard();
    const details = wiz.details || {};
    const contact = wiz.contact || {};

    // Check URL first, then wiz, then localStorage
    const params = new URLSearchParams(location.search);
    const referralCode = params.get('ref') || wiz.referralCode || localStorage.getItem('landingReferralCode') || undefined;

    const combinedPrefill = { ...details, ...contact, ...form };
    setJoinWizard({ loss: form });

    setSubmitting(true);
    try {
      await axios.post('/api/join', {
        firstName: combinedPrefill.firstName,
        lastName: combinedPrefill.lastName,
        email: combinedPrefill.email,
        details: combinedPrefill,
        referralCode
      });
      // Optional: keep saving locally for some components if they depend on it
      dsAddJoinApplication({
        firstName: combinedPrefill.firstName,
        lastName: combinedPrefill.lastName,
        email: combinedPrefill.email,
        details: combinedPrefill,
        referralCode
      });
      navigate('/join-submitted', { state: { prefill: { ...combinedPrefill, referralCode } } });
    } catch (error) {
      console.error('Submission failed:', error);
      alert('Failed to submit application. Please try again.');
    } finally {
      setSubmitting(false);
    }
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
          <h1 className="text-2xl md:text-3xl font-bold mb-6">Loss Details</h1>

          <div className="space-y-6">
            <div>
              <label className="block text-sm text-white/80 mb-1">
                Total Amount Lost
              </label>
              <p className="text-xs text-white/60 mb-2">
                Enter the total amount lost across all companies. Use USD or specify the currency.
              </p>
              <input
                type="text"
                name="totalAmount"
                value={form.totalAmount}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400"
                placeholder="$3,500 USD"
              />
            </div>

            <div>
              <label className="block text-sm text-white/80 mb-1">
                Breakdown of Loss by Company
              </label>
              <p className="text-xs text-white/60 mb-2">
                If the loss was spread across multiple companies, list each company with the corresponding amount.
                Example: Company A – $2,000, Company B – $1,500
              </p>
              <textarea
                name="breakdown"
                value={form.breakdown}
                onChange={handleChange}
                rows={6}
                className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400"
                placeholder="Company A – $2,000\nCompany B – $1,500"
              />
            </div>

            <div>
              <label className="block text-sm text-white/80 mb-1">Period of Incident</label>
              <p className="text-xs text-white/60 mb-2">
                Enter the time period over which the loss occurred. Example: 2016 – 2025
              </p>
              <input
                type="text"
                name="period"
                value={form.period}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400"
                placeholder="2016 – 2025"
              />
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate('/join-contact')}
              className="px-5 py-2.5 rounded-lg border border-white/30 text-white hover:bg-white/10 transition"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={!requiredFilled || submitting}
              className={`px-6 py-2.5 rounded-lg font-semibold bg-gradient-to-r from-purple-500 to-blue-500 text-white transition ${!requiredFilled || submitting ? 'opacity-50 cursor-not-allowed' : 'hover:from-purple-600 hover:to-blue-600'
                }`}
            >
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default JoinLoss;
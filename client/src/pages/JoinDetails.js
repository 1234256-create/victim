import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getJoinWizard, setJoinWizard } from '../utils/datastore';

const JoinDetails = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ firstName: '', lastName: '', gender: '', dob: '' });

  useEffect(() => {
    const wiz = getJoinWizard();
    const d = wiz.details || {};
    setForm({
      firstName: d.firstName || '',
      lastName: d.lastName || '',
      gender: d.gender || '',
      dob: d.dob || '',
    });
    try {
      const params = new URLSearchParams(location.search);
      let ref = params.get('ref');
      const email = params.get('email');
      if (!ref) ref = localStorage.getItem('landingReferralCode');
      const contact = wiz.contact || {};
      const mergedContact = { ...contact };
      if (email) mergedContact.email = email;
      const updates = { details: d, contact: mergedContact };
      if (ref) updates.referralCode = ref;
      setJoinWizard(updates);
    } catch { }
  }, []);

  const isValid = form.firstName && form.lastName && form.gender && form.dob;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleNext = () => {
    if (!isValid) return;
    setJoinWizard({ details: form });
    const params = new URLSearchParams(location.search);
    const ref = params.get('ref');
    const nextUrl = ref ? `/join-contact?ref=${encodeURIComponent(ref)}` : '/join-contact';
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
          <h1 className="text-2xl md:text-3xl font-bold mb-6">Personal Details</h1>
          <div className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm text-white/80 mb-1">First Name</label>
                <input
                  type="text"
                  name="firstName"
                  value={form.firstName}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  placeholder="John"
                />
              </div>
              <div>
                <label className="block text-sm text-white/80 mb-1">Last Name</label>
                <input
                  type="text"
                  name="lastName"
                  value={form.lastName}
                  onChange={handleChange}
                  className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400"
                  placeholder="Doe"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm text-white/80 mb-1">Gender</label>
              <div className="flex items-center gap-6">
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="gender"
                    value="male"
                    checked={form.gender === 'male'}
                    onChange={handleChange}
                  />
                  <span>Male</span>
                </label>
                <label className="inline-flex items-center gap-2">
                  <input
                    type="radio"
                    name="gender"
                    value="female"
                    checked={form.gender === 'female'}
                    onChange={handleChange}
                  />
                  <span>Female</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm text-white/80 mb-1">Date of Birth</label>
              <input
                type="date"
                name="dob"
                value={form.dob}
                onChange={handleChange}
                className="w-full px-4 py-2.5 rounded-lg bg-white/10 border border-white/20 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-purple-400"
              />
            </div>
          </div>

          <div className="mt-8 flex items-center justify-between">
            <button
              type="button"
              onClick={() => navigate('/join-notice')}
              className="px-5 py-2.5 rounded-lg border border-white/30 text-white hover:bg-white/10 transition"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleNext}
              disabled={!isValid}
              className={`px-6 py-2.5 rounded-lg font-semibold bg-gradient-to-r from-purple-500 to-blue-500 text-white transition ${isValid ? 'hover:from-purple-600 hover:to-blue-600' : 'opacity-50 cursor-not-allowed'
                }`}
            >
              Next
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default JoinDetails;
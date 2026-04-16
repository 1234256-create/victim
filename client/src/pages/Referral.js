import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Copy } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import axios from 'axios';
import { getJoinApplications } from '../utils/datastore';

const Referral = () => {
  const { user } = useAuth();
  const [referrals, setReferrals] = useState([]);

  useEffect(() => {
    const load = async () => {
      try {
        if (!user?._id && !user?.id) {
          const apps = getJoinApplications();
          const code = user?.referralCode || '';
          const list = apps.filter(a => String(a.referralCode || '') === String(code));
          setReferrals(list);
          return;
        }
        const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
        const uid = String(user?._id || user?.id);
        const res = await axios.get(`/api/users/${uid}/referrals`, { params: { limit: 100 }, headers });
        const apiRefs = res.data?.data?.referrals || [];
        setReferrals(apiRefs.map(r => ({
          firstName: r.firstName,
          lastName: r.lastName,
          email: r.email,
          time: r.createdAt,
          status: r.status || 'active'
        })));
      } catch (e) {
        const apps = getJoinApplications();
        const code = user?.referralCode || '';
        const list = apps.filter(a => String(a.referralCode || '') === String(code));
        setReferrals(list);
      }
    };
    load();
  }, [user?.referralCode, user?._id, user?.id]);

  const link = user?.referralCode ? `${window.location.origin}/home?ref=${user.referralCode}` : '';

  const copyLink = () => {
    if (!link) return;
    if (navigator.clipboard && window.isSecureContext) {
      navigator.clipboard.writeText(link);
      toast.success('Referral link copied to clipboard');
    } else {
      const textArea = document.createElement("textarea");
      textArea.value = link;
      textArea.style.position = "absolute";
      textArea.style.left = "-999999px";
      document.body.prepend(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        toast.success('Referral link copied to clipboard');
      } catch (error) {
        toast.error('Failed to copy');
      } finally {
        textArea.remove();
      }
    }
  };

  return (
    <div className="min-h-screen hero-gradient mobile-padding py-6">
      <div className="max-w-7xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6 sm:mb-8">
          <h1 className="mobile-header font-bold text-white mb-2">Referral</h1>
          <p className="text-gray-300 mobile-text">Share your link and track your referrals</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mobile-glass rounded-xl mobile-card mb-6">
          <h3 className="text-lg font-bold text-white mb-3">Your Referral Link</h3>
          {user?.referralCode ? (
            <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg px-3 py-2">
              <a href={link} target="_blank" rel="noopener noreferrer" className="underline text-purple-300 hover:text-purple-200 break-all">
                {link}
              </a>
              <button onClick={copyLink} className="ml-2 p-2 rounded-md hover:bg-white/20">
                <Copy className="w-4 h-4 text-white" />
              </button>
            </div>
          ) : (
            <div className="text-gray-200">No referral code available</div>
          )}
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6">
          <h3 className="text-xl font-bold text-white mb-6 flex items-center">
            <Users className="w-6 h-6 mr-2" />
            Your Referrals
          </h3>
          {referrals.length === 0 ? (
            <div className="text-gray-300">No referrals yet</div>
          ) : (
            <div className="space-y-3">
              {referrals.map((r, idx) => (
                <div key={idx} className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg px-3 py-2">
                  <div>
                    <p className="text-white font-semibold">{`${r.firstName || ''} ${r.lastName || ''}`.trim() || (r.email || 'user')}</p>
                    <p className="text-xs text-gray-400">{r.email}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-300">{new Date(r.time || Date.now()).toLocaleString()}</p>
                    <p className="text-xs text-purple-300">{r.status || 'pending'}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
};

export default Referral;

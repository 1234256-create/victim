import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock } from 'lucide-react';
import { getContributionTimer as dsGetContributionTimer } from '../utils/datastore';
import { Link, useLocation } from 'react-router-dom';

const ContributionRoundBanner = () => {
  const [timer, setTimer] = useState(null);
  const [countdown, setCountdown] = useState('');
  const [isActive, setIsActive] = useState(false);
  const location = useLocation();

  useEffect(() => {
    const load = async () => {
      // Try local datastore first (fast)
      const t = dsGetContributionTimer();
      const now = Date.now();
      
      // Check API for authoritative source
      try {
        const res = await axios.get('/api/settings/contributionRound');
        const round = res?.data?.data?.value || null;
        if (round && round.startTime && round.endTime && round.status === 'running') {
           const end = new Date(round.endTime).getTime();
           if (now < end) {
             setTimer(round);
             setIsActive(true);
             return;
           }
        }
      } catch (err) {
        console.error('Failed to fetch contribution round:', err);
      }

      if (t && t.endTime && now < t.endTime) {
        setTimer(t);
        setIsActive(true);
      } else {
        setIsActive(false);
      }
    };

    load();
    const onUpdate = () => load();
    window.addEventListener('datastore:update', onUpdate);
    return () => window.removeEventListener('datastore:update', onUpdate);
  }, []);

  useEffect(() => {
    if (!isActive || !timer?.endTime) {
      setCountdown('');
      return;
    }
    
    const update = () => {
      const now = Date.now();
      const end = new Date(timer.endTime).getTime();
      const diff = end - now;
      if (diff <= 0) {
        setCountdown('00:00:00');
        setIsActive(false);
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setCountdown(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
    };

    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [isActive, timer]);

  if (!isActive) return null;
  // Hide on Contribute page to avoid duplication since it has its own timer
  if (location.pathname === '/contribute') return null;

  return (
    <div className="w-full px-4 sm:px-6 lg:px-8 mt-6 mb-2">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-4xl mx-auto bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 text-center relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-blue-500/10"></div>
        
        <div className="relative z-10">
          <div className="flex items-center justify-center mb-4">
            <Clock className="w-6 h-6 text-green-400 mr-2 animate-pulse" />
            <h2 className="text-xl sm:text-2xl font-bold text-white">Contribution Round</h2>
          </div>
          <div className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-2 font-mono tracking-wider">
            {countdown}
          </div>
          <p className="text-sm sm:text-base text-gray-300">Until the current contribution round ends</p>
          
          <Link 
            to="/contribute"
            className="inline-block mt-4 text-sm text-purple-300 hover:text-purple-200 hover:underline transition-colors"
          >
            Click here to contribute →
          </Link>
        </div>
      </motion.div>
    </div>
  );
};

export default ContributionRoundBanner;

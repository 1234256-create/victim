import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { addReceipt as dsAddReceipt, getActiveWallets as dsGetActiveWallets, getContributionTimer as dsGetContributionTimer, clearContributionTimer as dsClearContributionTimer, getReceipts as dsGetReceipts, getUsersMap as dsGetUsersMap } from '../utils/datastore';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  Clock,
  Coins,
  Users,
  DollarSign,
  Copy,
  CheckCircle
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const Contribute = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [timer, setTimer] = useState(null);
  const [countdown, setCountdown] = useState('');
  const [selectedCoin, setSelectedCoin] = useState('');
  const [amount, setAmount] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [cryptoAmount, setCryptoAmount] = useState('');
  const [showQR, setShowQR] = useState(false);
  const [receiptFile, setReceiptFile] = useState(null);
  const [transactionHash, setTransactionHash] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [wallets, setWallets] = useState([]);
  const [recentContributions, setRecentContributions] = useState([]);
  const [isContributionActive, setIsContributionActive] = useState(true);
  const [isRoundWindowActive, setIsRoundWindowActive] = useState(false);
  const [hasContributionRound, setHasContributionRound] = useState(false);
  const [roundFinished, setRoundFinished] = useState(false);
  const [publicContributionsEnabled, setPublicContributionsEnabled] = useState(false);
  const finalizeRound = () => {
    if (roundFinished) return;
    setRoundFinished(true);
    try { dsClearContributionTimer(); } catch (_) { }
    setTimer(null);
    setHasContributionRound(false);
    setIsRoundWindowActive(false);
    toast('Contribution round finished');
  };

  const canContribute = isContributionActive && (publicContributionsEnabled || hasContributionRound);

  // Load admin-defined wallets and contribution timer
  useEffect(() => {
    const load = async () => {
      try {
        const { data } = await axios.get('/api/settings/contributionActive');
        if (data.success) {
          setIsContributionActive(data.data.value);
        }
      } catch (error) {
        // Silently fail, default to true
        console.error('Error fetching contribution status:', error);
      }
      try {
        const { data } = await axios.get('/api/settings/publicContributionsEnabled');
        if (data.success) {
          setPublicContributionsEnabled(data.data.value === true);
        }
      } catch (error) {
        setPublicContributionsEnabled(false);
      }

      setTimer(dsGetContributionTimer());
      
      try {
        // Fetch wallets from server
        const wRes = await axios.get('/api/settings/activeWallets');
        const sWallets = wRes?.data?.data?.value;
        if (Array.isArray(sWallets)) {
          const activeOnly = sWallets.filter(w => w.isActive);
          setWallets(activeOnly);
        } else {
          setWallets(dsGetActiveWallets());
        }
      } catch (e) {
        console.error('Failed to fetch wallets from server:', e);
        setWallets(dsGetActiveWallets());
      }

      try {
        const res = await axios.get('/api/settings/contributionRound');
        const round = res?.data?.data?.value || null;
        const endMs = round?.endTime ? new Date(round.endTime).getTime() : 0;
        const startMs = round?.startTime ? new Date(round.startTime).getTime() : 0;
        const nowMs = Date.now();
        const hasRound = Boolean(round && round.startTime && round.endTime && nowMs <= endMs);
        setHasContributionRound(hasRound);
        setIsRoundWindowActive(Boolean(nowMs >= startMs && nowMs <= endMs));
      } catch (_) {
        const nowMs = Date.now();
        const localTimer = dsGetContributionTimer();
        setHasContributionRound(Boolean(localTimer?.endTime && nowMs <= localTimer.endTime));
        setIsRoundWindowActive(Boolean(localTimer?.endTime && nowMs <= localTimer.endTime));
      }

      // Fetch actual recent contributions from server if logged in
      let mapped = [];
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const res = await axios.get('/api/contributions/mine', {
            headers: { Authorization: `Bearer ${token}` }
          });
          const list = res?.data?.data?.contributions || [];
          mapped = list.map(c => ({
            id: c._id || c.id,
            user: (c.user?.firstName || 'Me'),
            amount: c.amount || 0,
            currency: c.currency || 'USD',
            usdValue: c.amount || 0,
            status: c.status === 'approved' ? 'verified' : (c.status || 'pending'),
            submittedAt: c.createdAt || new Date().toISOString(),
          }));
        }
      } catch (e) {
        console.error('Error fetching server contributions:', e);
      }

      // Fallback/Merge with local datastore for guest submissions
      if (mapped.length === 0) {
        const raw = dsGetReceipts();
        const users = dsGetUsersMap ? dsGetUsersMap() : {};
        mapped = raw.map((r) => ({
          id: r.id,
          user: ((users[r.userEmail]?.email || r.userEmail || '').split('@')[0]) || 'user',
          amount: r.amount || 0,
          currency: r.currency || 'USD',
          usdValue: r.amount || 0,
          status: r.verified ? 'verified' : (r.status || 'pending'),
          submittedAt: new Date(r.time).toISOString(),
        }));
      }

      setRecentContributions(mapped.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt)).slice(0, 5));
    };
    load();
    const interval = setInterval(load, 15000); // Refresh every 15s
    const onUpdate = () => load();
    window.addEventListener('datastore:update', onUpdate);
    return () => {
      clearInterval(interval);
      window.removeEventListener('datastore:update', onUpdate);
    };
  }, []);

  // Contribution tiers removed

  // Timer countdown effect from datastore
  useEffect(() => {
    const interval = setInterval(() => {
      if (!timer?.endTime) {
        setCountdown('');
        return;
      }
      const now = Date.now();
      const diff = timer.endTime - now;
      if (diff <= 0) {
        setCountdown('00:00:00');
        finalizeRound();
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      setCountdown(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`);
    }, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  // Calculate crypto amount when USD amount or coin changes
  useEffect(() => {
    if (amount && selectedCoin) {
      const w = wallets.find(c => c.symbol === selectedCoin);
      if (w && w.rate) {
        const cryptoValue = (parseFloat(amount) / Number(w.rate)).toFixed(6);
        setCryptoAmount(cryptoValue);
        setWalletAddress(w.address);
      } else if (w) {
        setWalletAddress(w.address);
        setCryptoAmount('');
      }
    } else {
      setCryptoAmount('');
      setWalletAddress('');
    }
  }, [amount, selectedCoin, wallets]);

  const getPointsForAmount = (usdAmount) => {
    const amt = parseFloat(usdAmount);
    if (amt >= 1000) return 1000;
    if (amt >= 500) return 300;
    if (amt >= 300) return 100;
    if (amt >= 100) return 30;
    if (amt >= 50) return 15;
    return 0;
  };

  const handleGenerateQR = () => {
    if (!amount || !selectedCoin) {
      toast.error('Please enter an amount and select a cryptocurrency');
      return;
    }

    if (parseFloat(amount) < 50) {
      toast.error('Minimum contribution amount is $50');
      return;
    }

    setShowQR(true);
    if (!hasContributionRound) {
      toast('No admin-set round: QR available, points won’t be added');
    } else {
      toast.success('QR code generated! Scan to send payment');
    }
  };

  const copyWalletAddress = () => {
    navigator.clipboard.writeText(walletAddress);
    toast.success('Wallet address copied!');
  };

  // Referral removed

  const handleBackToDashboard = () => {
    navigate('/dashboard');
  };

  const generateQRCodeData = () => {
    return `${selectedCoin}:${walletAddress}?amount=${cryptoAmount}&label=DOA Contribution`;
  };

  const handleReceiptChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      toast.error('Only PNG, JPG, and PDF files are allowed');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('File size must be under 5MB');
      return;
    }
    setReceiptFile(file);
  };

  const handleSubmitProof = async () => {
    try {
      if (!amount || parseFloat(amount) < 50) {
        toast.error('Minimum contribution amount is $50');
        return;
      }
      if (!selectedCoin) {
        toast.error('Please select a cryptocurrency');
        return;
      }
      if (!walletAddress) {
        toast.error('Wallet address is missing');
        return;
      }
      if (!receiptFile) {
        toast.error('Please upload a receipt (screenshot or PDF)');
        return;
      }

      setIsSubmitting(true);

      const formData = new FormData();
      formData.append('receipt', receiptFile);
      formData.append('amount', amount);
      formData.append('currency', selectedCoin);
      formData.append('walletAddress', walletAddress);
      if (transactionHash) formData.append('transactionHash', transactionHash);

      const { data } = await axios.post('/api/contributions/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (data?.success) {
        // Also record locally so admin views reflect immediately
        dsAddReceipt({
          userEmail: user?.email || 'anonymous@local',
          amount: Number(amount) || 0,
          currency: selectedCoin || 'USD',
          url: data?.data?.receiptUrl || transactionHash || '',
          notes: `Uploaded via API${transactionHash ? ` • tx ${transactionHash}` : ''}`
        });
        if (!hasContributionRound && !publicContributionsEnabled) {
          toast.success('Proof submitted. Points will not be added (round inactive).');
        } else {
          toast.success('Proof submitted! We will review and credit points.');
        }
        setReceiptFile(null);
        setTransactionHash('');
        setShowQR(false);
        setAmount('');
        setSelectedCoin('');
        setWalletAddress('');
        setCryptoAmount('');
      } else {
        toast.error(data?.message || 'Failed to submit proof');
      }
    } catch (err) {
      // Fallback: store receipt locally
      dsAddReceipt({
        userEmail: user?.email || 'anonymous@local',
        amount: Number(amount) || 0,
        currency: selectedCoin || 'USD',
        url: transactionHash || '',
        notes: receiptFile?.name || 'Local submission'
      });
      toast.success('Proof saved locally. Admin can verify and award points.');
      setReceiptFile(null);
      setTransactionHash('');
      setShowQR(false);
      setAmount('');
      setSelectedCoin('');
      setWalletAddress('');
      setCryptoAmount('');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen hero-gradient p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center mb-6 sm:mb-8"
        >
          <button
            onClick={handleBackToDashboard}
            className="mr-3 sm:mr-4 p-2 bg-white/10 hover:bg-white/20 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
          </button>
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-2">Contribute</h1>
            <p className="text-sm sm:text-base text-gray-300">Contribute to the DAO's progress and earn points</p>
          </div>
        </motion.div>

        {/* Voluntary Notification Banner - ALWAYS shown */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-amber-500/10 backdrop-blur-md border border-amber-500/30 rounded-xl p-4 mb-6 flex items-start gap-4"
        >
          <div className="bg-amber-500 rounded-full p-1 mt-0.5 flex-shrink-0">
            <CheckCircle className="w-4 h-4 text-white" />
          </div>
          <p className="text-amber-200 text-sm sm:text-base font-medium">
            Contributions are voluntary and optional. Your support is appreciated but not required.
          </p>
        </motion.div>



        {/* Timer Section - Only show if a round is actually active/running */}
        {timer?.endTime && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="glass-effect rounded-xl sm:rounded-2xl p-4 sm:p-6 mb-6 sm:mb-8 text-center"
          >
            <div className="flex items-center justify-center mb-4">
              <Clock className="w-6 h-6 sm:w-8 sm:h-8 text-green-400 mr-2 sm:mr-3" />
              <h2 className="text-lg sm:text-xl lg:text-2xl font-bold text-white">Contribution Round</h2>
            </div>
            <div className="text-xl sm:text-2xl lg:text-4xl font-bold text-white mb-2">
              {countdown}
            </div>
            <p className="text-sm sm:text-base text-gray-300">Until the current contribution round ends</p>
          </motion.div>
        )}



        {/* Contribution Tiers & Points — visible only when contributions are on */}
        {canContribute && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white/10 backdrop-blur-md rounded-2xl p-4 sm:p-6 border border-white/20 mb-6 sm:mb-8"
          >
            <div className="grid grid-cols-1 gap-4">
              <div>
                <h3 className="text-lg font-bold text-white mb-3">Contribution Tiers &amp; Points</h3>
                <div className="space-y-2">
                  <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm">
                    <span className="text-gray-300">$50–$99</span>
                    <span className="text-green-400 font-semibold">15 points</span>
                  </div>
                  <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm">
                    <span className="text-gray-300">$100–$299</span>
                    <span className="text-green-400 font-semibold">30 points</span>
                  </div>
                  <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm">
                    <span className="text-gray-300">$300–$499</span>
                    <span className="text-green-400 font-semibold">100 points</span>
                  </div>
                  <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm">
                    <span className="text-gray-300">$500–$999</span>
                    <span className="text-green-400 font-semibold">300 points</span>
                  </div>
                  <div className="flex items-center justify-between bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm">
                    <span className="text-gray-300">$1000–∞</span>
                    <span className="text-green-400 font-semibold">1000 points</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        )}


        {/* Contribution Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mobile-glass rounded-xl mobile-card mb-6 sm:mb-8"
        >
          <h3 className="mobile-subheader font-bold text-white mb-4 sm:mb-6">Make a Contribution</h3>

          {/* Amount Input */}
          <div className="mb-4 sm:mb-6">
            <label className="block text-white font-semibold mb-2 mobile-text">
              <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 inline mr-1" />
              Enter Amount in USD
            </label>
            <input
              type={canContribute ? "number" : "text"}
              value={canContribute ? amount : "Contributions are disabled"}
              onChange={(e) => canContribute && setAmount(e.target.value)}
              placeholder="$50"
              className={`w-full bg-white/10 border rounded-lg px-3 sm:px-4 py-3 text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none mobile-text touch-target transition-all ${
                !canContribute 
                  ? 'border-amber-500/50 bg-amber-500/10 text-amber-400 font-bold text-center cursor-not-allowed' 
                  : 'border-white/20'
              }`}
              min="50"
              disabled={!canContribute}
            />
            <p className="mt-2 text-xs sm:text-sm text-gray-300">Enter amount in USD</p>
            {amount && hasContributionRound && (
              <div className="mt-2 text-xs sm:text-sm">
                <span className="text-gray-300">You will earn: </span>
                <span className="text-green-400 font-bold">{getPointsForAmount(amount)} points</span>
              </div>
            )}
          </div>

          {/* Cryptocurrency Selection */}
          <div className="mb-4 sm:mb-6">
            <label className="block text-white font-semibold mb-2 mobile-text">
              Select Cryptocurrency
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 responsive-gap">
              {wallets.map((crypto) => (
                <button
                  key={crypto.symbol}
                  onClick={() => setSelectedCoin(crypto.symbol)}
                  className={`p-2 sm:p-3 rounded-lg border-2 transition-all duration-300 touch-target ${selectedCoin === crypto.symbol
                    ? 'border-purple-500 bg-purple-500/20 text-white'
                    : 'border-white/20 bg-white/5 text-gray-300 hover:border-purple-400'
                    } ${!canContribute ? 'opacity-50 cursor-not-allowed' : ''}`}
                  disabled={wallets.length === 0 || !canContribute}
                >
                  <div className="font-bold text-sm sm:text-base">{crypto.symbol}</div>
                  <div className="text-xs text-gray-400">{crypto.name}</div>
                  {crypto.rate && (
                    <div className="text-xs text-green-400">${crypto.rate}</div>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Estimate Display */}
          {amount && selectedCoin && cryptoAmount && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="bg-white/10 rounded-xl p-4 mb-6"
            >
              <h4 className="text-white font-semibold mb-3">Payment Details</h4>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-300">USD Amount:</span>
                  <span className="text-white font-semibold">${amount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300">Crypto Amount:</span>
                  <span className="text-white font-semibold">{cryptoAmount} {selectedCoin}</span>
                </div>
                {(hasContributionRound || publicContributionsEnabled) && (
                  <div className="flex justify-between">
                    <span className="text-gray-300">Points to Earn:</span>
                    <span className="text-green-400 font-semibold">{getPointsForAmount(amount)} pts</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}

          {/* Generate / Scan Buttons */}
          <button
            onClick={handleGenerateQR}
            disabled={!amount || !selectedCoin || parseFloat(amount) < 50 || (!cryptoAmount && !walletAddress)}
            className={`mobile-button font-semibold transition-all duration-300 touch-target ${!amount || !selectedCoin || parseFloat(amount) < 50 || (!cryptoAmount && !walletAddress)
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-green-500 to-teal-500 hover:from-green-600 hover:to-teal-600 text-white'
              }`}
          >
            View estimate and wallet address (QR Code)
          </button>
        </motion.div>

        {/* Standalone Submit Proof Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 mt-6"
        >
          <h3 className="text-xl font-bold text-white mb-6 flex items-center">
            <CheckCircle className="w-6 h-6 mr-2" />
            Submit Proof of Payment
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-white font-semibold mb-2">Upload Receipt (PNG/JPG/WEBP/HEIC/PDF)</label>
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/heic,application/pdf"
                onChange={handleReceiptChange}
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
              />
              {receiptFile && (
                <div className="mt-2 text-xs text-gray-300">
                  Selected: <span className="text-purple-300">{receiptFile.name}</span>
                </div>
              )}
            </div>

            <div>
              <label className="block text-white font-semibold mb-2">Transaction Hash (optional)</label>
              <input
                value={transactionHash}
                onChange={(e) => setTransactionHash(e.target.value)}
                placeholder="0x..."
                className="w-full bg-white/10 border border-white/20 rounded-lg px-3 py-2 text-white placeholder-gray-400 focus:border-purple-500 focus:outline-none"
              />
            </div>
          </div>

          <button
            onClick={handleSubmitProof}
            disabled={isSubmitting || !receiptFile}
            className={`w-full py-3 mt-4 font-semibold rounded-lg transition-all duration-300 ${isSubmitting || !receiptFile
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed'
              : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white'
              }`}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Proof'}
          </button>
        </motion.div>

        {/* QR Code Modal */}
        {showQR && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4"
            onClick={() => setShowQR(false)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-6 sm:p-8 border border-white/20 w-full max-w-md relative"
              onClick={(e) => e.stopPropagation()}
            >
              <h3 className="text-xl sm:text-2xl font-bold text-white mb-4">Scan to Pay</h3>
              <div className="bg-white p-4 rounded-lg flex items-center justify-center mb-4">
                {wallets.find(c => c.symbol === selectedCoin)?.qrCode ? (
                  <img src={wallets.find(c => c.symbol === selectedCoin)?.qrCode} alt="Payment QR" className="mx-auto h-56 w-56 object-contain" />
                ) : (
                  <QRCodeSVG value={generateQRCodeData()} size={224} />
                )}
              </div>
              <div className="text-center text-white mb-4">
                <p className="text-lg font-semibold">{cryptoAmount} {selectedCoin}</p>
                <p className="text-sm text-gray-400">≈ ${amount} USD</p>
              </div>
              <div className="bg-black/20 rounded-lg p-3 mb-4">
                <p className="text-xs text-gray-400 mb-1">Send to this address:</p>
                <div className="flex items-center justify-between">
                  <span className="text-purple-300 text-sm break-all mr-2">{walletAddress}</span>
                  <button onClick={copyWalletAddress} className="p-2 rounded-md hover:bg-white/20">
                    <Copy className="w-4 h-4 text-white" />
                  </button>
                </div>
              </div>
              <button
                onClick={() => setShowQR(false)}
                className="w-full py-3 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors"
              >
                Close
              </button>
            </motion.div>
          </motion.div>
        )}


        {/* Recent Contributions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-6 mt-8"
        >
          <h3 className="text-xl font-bold text-white mb-6 flex items-center">
            <Users className="w-6 h-6 mr-2" />
            Recent Contributions
          </h3>
          <div className="space-y-4">
            {recentContributions.map((c, i) => {
              const getStatusColor = (status) => {
                switch (status) {
                  case 'verified': return 'text-green-400';
                  case 'approved': return 'text-green-400';
                  case 'rejected': return 'text-red-400';
                  case 'under_review': return 'text-blue-400';
                  default: return 'text-yellow-400';
                }
              };
              const getStatusDot = (status) => {
                switch (status) {
                  case 'verified': return 'bg-green-500';
                  case 'approved': return 'bg-green-500';
                  case 'rejected': return 'bg-red-500';
                  case 'under_review': return 'bg-blue-500';
                  default: return 'bg-yellow-500';
                }
              };
              const getStatusLabel = (status) => {
                if (status === 'under_review') return 'Under Review';
                return status.charAt(0).toUpperCase() + status.slice(1);
              };

              return (
                <div key={i} className="flex items-center justify-between bg-white/5 p-3 rounded-lg">
                  <div className="flex items-center">
                    <div className={`w-2 h-2 rounded-full mr-3 ${getStatusDot(c.status)}`}></div>
                    <div>
                      <p className="text-white font-semibold">{c.user}</p>
                      <p className="text-xs text-gray-400">{new Date(c.submittedAt).toLocaleString()}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-white font-semibold">${c.usdValue}</p>
                    <p className={`text-xs ${getStatusColor(c.status)}`}>
                      {getStatusLabel(c.status)}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        </motion.div>

      </div>
    </div>
  );
};

export default Contribute;

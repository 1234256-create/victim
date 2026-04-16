import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Trophy,
  Vote,
  Coins,
  Users,
  Settings,
  Copy,
  Eye,
  EyeOff,
  LogOut,
  User,
  Lock,
  Clock,
  Timer
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import axios from 'axios';
import { getUserMeta, getActivityLog, getActiveVotes as dsGetActiveVotes } from '../utils/datastore';

const LiveTimer = ({ endTime, onExpire }) => {
  const [timeLeft, setTimeLeft] = useState('');
  useEffect(() => {
    if (!endTime) return;
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const end = new Date(endTime).getTime();
      const diff = end - now;
      if (diff <= 0) {
        setTimeLeft('Ended');
        clearInterval(interval);
        if (onExpire) onExpire();
        return;
      }
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);
      let str = '';
      if (days > 0) str += `${days}d `;
      str += `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
      setTimeLeft(str);
    }, 1000);
    return () => clearInterval(interval);
  }, [endTime, onExpire]);

  if (!endTime) return null;
  return <span>{timeLeft}</span>;
};


const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [showSettings, setShowSettings] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [sendingOtp, setSendingOtp] = useState(false);
  const [changingPwd, setChangingPwd] = useState(false);
  const [showNewPass, setShowNewPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [totalPoints, setTotalPoints] = useState(0);
  const [pointsVoting, setPointsVoting] = useState(0);
  const [pointsContribution, setPointsContribution] = useState(0);
  const [pointsReferral, setPointsReferral] = useState(0);
  const [votesAllowed, setVotesAllowed] = useState(0);
  const [votesUsed, setVotesUsed] = useState(0);
  const [activeRoundsCount, setActiveRoundsCount] = useState(0);
  const [activeVotes, setActiveVotes] = useState([]);
  const [recentActivity, setRecentActivity] = useState([]);
  const [verifiedLoss, setVerifiedLoss] = useState(0);
  const [unverifiedLoss, setUnverifiedLoss] = useState(0);
  const [amountRestituted, setAmountRestituted] = useState(0);
  const [userRank, setUserRank] = useState(0);


  // Load live user dashboard data
  useEffect(() => {
    const load = async () => {
      try {
        const token = localStorage.getItem('token') || localStorage.getItem('adminToken');
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
        const me = await axios.get('/api/auth/me', { headers });
        const u = me.data?.user || me.data?.data?.user || {};
        setTotalPoints(u.points || 0);
        setPointsVoting(u.stats?.votingPoints || 0);
        setPointsContribution(u.stats?.contributionPoints || 0);
        setPointsReferral(u.stats?.referralPoints || 0);
        setVotesAllowed(u.votingRights || 0);
        setVotesUsed(u.stats?.totalVotes || 0);
        setVerifiedLoss(u.verifiedLoss || 0);
        setUnverifiedLoss(u.unverifiedLoss || 0);
        setAmountRestituted(u.amountRestituted || 0);
        setUserRank(u.rank || 0);
        try {
          const vr = await axios.get('/api/votes', { params: { status: 'active', limit: 200 }, headers });
          const votes = vr.data?.data?.votes || [];
          setActiveRoundsCount(votes.length || 0);
          setActiveVotes(votes);
        } catch {
          setActiveRoundsCount(0);
          setActiveVotes([]);
        }
        const activity = getActivityLog().filter((a) => a.userEmail === (u.email || user.email));
        setRecentActivity(activity.slice(0, 10));
      } catch (_) {
        // fallback to local meta
        if (user?.email) {
          const meta = getUserMeta(user.email);
          setTotalPoints(meta.points || 0);
          setPointsVoting(meta.pointsVoting || 0);
          setPointsContribution(meta.pointsContribution || 0);
          setPointsReferral(meta.pointsReferral || 0);
          setVotesAllowed(meta.votesAllowed || 0);
          setVotesUsed(meta.votesUsed || 0);
          setVerifiedLoss(user?.verifiedLoss || 0);
          setUnverifiedLoss(user?.unverifiedLoss || 0);
          setAmountRestituted(user?.amountRestituted || 0);
          setUserRank(0);
          const dsVotes = dsGetActiveVotes();
          setActiveRoundsCount(dsVotes.length);
          setActiveVotes(dsVotes);
          const activity = getActivityLog().filter((a) => a.userEmail === user.email);
          setRecentActivity(activity.slice(0, 10));
        }
      }
    };
    load();
    const onUpdate = () => load();
    window.addEventListener('datastore:update', onUpdate);

    // WebSocket connection with reconnection logic
    let ws = null;
    let reconnectTimeout = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;

    const connectWebSocket = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        // In development, if we are on port 3006, the server is on 3000
        let host = window.location.host;
        if (host.includes(':3006')) {
          host = host.replace('3006', '3000');
        } else if (window.location.hostname === 'localhost' && !host.includes(':')) {
          // If just localhost (unlikely without port), assume 3000? No, usually has port.
          // If we are in production build served by express, host is correct.
        }

        const url = `${protocol}//${host}/ws`;
        console.log('Connecting to WebSocket at:', url);
        ws = new WebSocket(url);

        ws.onopen = () => {
          console.log('WebSocket connected');
          reconnectAttempts = 0;
        };

        ws.onmessage = (ev) => {
          try {
            const payload = JSON.parse(ev.data);
            console.log('Dashboard received WebSocket event:', payload.type);
            if (payload && payload.type) {
              if (payload.type === 'vote_created_notification') {
                // Also refresh data
                load();
              }
              // Match all user-related events (including admin overrides)
              if (/user_(vote|contribution|referral|points|voting|status|updated|registered|deleted|overrides|voting_updated)/i.test(payload.type)) {
                console.log('Dashboard: Reloading due to user event:', payload.type);
                load();
              }
              // Match vote status changes and updates
              if (/vote_(started|paused|resumed|completed|created|updated|deleted)/i.test(payload.type)) {
                console.log('Dashboard: Reloading due to vote event:', payload.type);
                load();
              }
              // Match contribution status changes
              if (/contribution_(approved|rejected|verified)/i.test(payload.type)) {
                console.log('Dashboard: Reloading due to contribution event:', payload.type);
                load();
              }
              // Also match general users_updated events
              if (/users?_(updated|fetched)/i.test(payload.type)) {
                console.log('Dashboard: Reloading due to users event:', payload.type);
                load();
              }
            }
          } catch (err) {
            console.error('Error parsing WebSocket message:', err);
          }
        };

        ws.onerror = (error) => {
          console.error('WebSocket error:', error);
        };

        ws.onclose = () => {
          console.log('WebSocket disconnected');
          ws = null;
          // Attempt to reconnect
          if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            reconnectTimeout = setTimeout(() => {
              connectWebSocket();
            }, Math.min(1000 * Math.pow(2, reconnectAttempts), 30000)); // Exponential backoff, max 30s
          }
        };
      } catch (err) {
        console.error('Error creating WebSocket connection:', err);
      }
    };

    connectWebSocket();

    return () => {
      window.removeEventListener('datastore:update', onUpdate);
      if (reconnectTimeout) clearTimeout(reconnectTimeout);
      if (ws) {
        ws.close();
        ws = null;
      }
    };
  }, [user?.email]);

  const copyReferralCode = () => {
    if (!user?.referralCode) {
      toast.error('Referral code not available');
      return;
    }
    const link = `${window.location.origin}/home?ref=${user.referralCode}`;
    navigator.clipboard.writeText(link);
    toast.success('Referral link copied to clipboard!');
  };

  const handleVote = () => {
    navigate('/voting');
  };

  const handleContribute = () => {
    navigate('/contribute');
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleEditProfile = () => {
    navigate('/profile?edit=1');
  };
  const openResetPassword = () => {
    setResetEmail(user?.email || '');
    setShowResetPassword(true);
  };
  const dashSendOtp = async () => {
    if (!resetEmail) {
      toast.error('Enter your email first');
      return;
    }
    setSendingOtp(true);
    try {
      await axios.post('/api/password/forgot-otp', { email: resetEmail });
      toast.success('OTP sent to your email');
    } catch (e) {
      const msg = e.response?.data?.message || 'Failed to send OTP';
      toast.error(msg);
    } finally {
      setSendingOtp(false);
    }
  };
  const dashChangePasswordWithOtp = async () => {
    if (!resetEmail) {
      toast.error('Enter your email');
      return;
    }
    if (!otpCode) {
      toast.error('Enter the OTP');
      return;
    }
    if (!newPass || newPass.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    if (newPass !== confirmPass) {
      toast.error('Passwords do not match');
      return;
    }
    setChangingPwd(true);
    try {
      await axios.post('/api/password/reset-otp', { email: resetEmail, otp: otpCode, newPassword: newPass });
      toast.success('Password changed. You can log in now');
      setShowResetPassword(false);
      setOtpCode('');
      setNewPass('');
      setConfirmPass('');
    } catch (e) {
      const msg = e.response?.data?.message || 'Failed to change password';
      toast.error(msg);
    } finally {
      setChangingPwd(false);
    }
  };


  if (!user) {
    return (
      <div className="min-h-screen hero-gradient flex items-center justify-center">
        <div className="text-white text-xl">Loading...</div>
      </div>
    );
  }

  const dashCountUsed = (vote) => {
    if (vote.myVotingRights) {
      return vote.myVotingRights.used;
    }
    // Fallback if myVotingRights is missing (e.g. not populated correctly or older API)
    const submissions = vote.submissions;
    const dashUserIds = [
      user?.email,
      user?._id,
      user?.id,
      String(user?._id || ''),
      String(user?.id || '')
    ].filter(Boolean);
    const seen = new Set();
    let total = 0;
    for (const k of dashUserIds) {
      if (seen.has(k)) continue;
      seen.add(k);
      total += Number(submissions?.[k] || 0);
    }
    return total;
  };

  const dashAllowedSum = (activeVotes || []).reduce((sum, v) => {
    // Check for user override
    if (v.myVotingRights) {
      return sum + v.myVotingRights.total;
    }
    return sum + (v.maxVotesPerUser || 1);
  }, 0);

  const dashUsedSum = (activeVotes || []).reduce((sum, v) => sum + dashCountUsed(v), 0);
  const dashAllowed = (activeVotes && activeVotes.length > 0) ? dashAllowedSum : 0; // If no active votes, no allowance
  const dashUsed = (activeVotes && activeVotes.length > 0) ? dashUsedSum : 0;
  const dashRemaining = Math.max(0, dashAllowed - dashUsed);

  return (
    <div className="min-h-screen hero-gradient py-6">
      {/* Top Edge-to-Edge Section (No side padding) */}
      <div className="w-full mb-6">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          className="mb-6 sm:mb-8 px-4 sm:px-6"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="mb-4 sm:mb-0">
              <h1 className="mobile-header font-bold text-white mb-2">
                Welcome back, {user?.firstName}!
              </h1>
              <p className="text-gray-300 mobile-text">Ready to participate in the DOA ecosystem?</p>
            </div>
          </div>
        </motion.div>

        {/* Spam Notification Banner */}
        <div className="mb-6 px-4 sm:px-6">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            className="bg-yellow-500/20 border border-yellow-500/30 rounded-xl p-4 backdrop-blur-sm flex items-start gap-3"
          >
            <div className="p-2 bg-yellow-500/20 rounded-full shrink-0">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-300" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-yellow-100 text-sm md:text-base font-medium py-1">
              If our emails have landed in your spam or junk folder, please mark them as “Not Spam” to ensure you receive future restitution updates.
            </p>
          </motion.div>
        </div>

        {/* Active Votes Notifications */}
        {activeVotes && activeVotes.length > 0 && (
          <div className="mb-6 space-y-4 px-4 sm:px-6">
            {activeVotes.map((vote) => (
              <motion.div
                key={vote._id || vote.id || Math.random()}
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-white rounded-xl shadow-lg border-l-4 border-purple-600 overflow-hidden flex flex-col md:flex-row items-center justify-between p-4"
              >
                <div className="flex items-center gap-4 mb-4 md:mb-0 w-full md:w-auto">
                  <div className="p-3 bg-purple-100 text-purple-600 rounded-full shrink-0">
                    <Vote className="w-6 h-6" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-bold text-gray-800">{vote.title || 'New Vote Created!'}</h4>
                    <p className="text-sm text-gray-500">A new proposal needs your attention</p>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-4 w-full md:w-auto justify-between">
                  <div className="text-sm flex flex-col gap-1 items-start md:items-end w-full sm:w-auto">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Clock className="w-4 h-4 text-purple-500" />
                      <span>Starts: {vote.startTime ? new Date(vote.startTime).toLocaleString() : 'Now'}</span>
                    </div>
                    {vote.endTime && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Timer className="w-4 h-4 text-purple-500" />
                        <span>Ends: {new Date(vote.endTime).toLocaleString()}</span>
                        <span className="ml-2 font-mono font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full border border-red-100">
                          <LiveTimer endTime={vote.endTime} />
                        </span>
                      </div>
                    )}
                  </div>

                  <button
                    onClick={() => navigate(`/voting?voteId=${vote._id || vote.id}`)}
                    className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors font-medium flex items-center justify-center gap-2 shrink-0 w-full sm:w-auto"
                  >
                    Vote Now <Vote className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Total Points Section */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mobile-glass rounded-xl mobile-card mb-6 sm:mb-8"
        >
          <div className="text-center">
            <h2 className="mobile-subheader font-bold text-white mb-2">Total Points</h2>
            <div className="text-4xl sm:text-5xl lg:text-6xl font-bold text-white mb-4">
              {totalPoints.toLocaleString()}
            </div>
            <p className="text-gray-300 mobile-text">
              Live points from your activity across the platform
            </p>
          </div>
        </motion.div>

        {/* Main Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-2 responsive-gap mb-6 sm:mb-8">
          <motion.button
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => navigate('/voting')}
            className="mobile-glass rounded-xl mobile-card hover:bg-white/20 transition-all duration-300 group touch-target"
          >
            <div className="flex flex-col sm:flex-row items-center justify-between">
              <div className="flex items-center mb-4 sm:mb-0">
                <div className="p-3 sm:p-4 bg-purple-500/20 rounded-lg mr-4">
                  <Vote className="w-6 h-6 sm:w-8 sm:h-8 text-purple-400" />
                </div>
                <div className="text-left">
                  <h3 className="text-lg sm:text-xl font-bold text-white">VOTE</h3>
                  <p className="text-gray-300 text-sm sm:text-base">Cast your vote on decisions and earn points</p>
                </div>
              </div>
              <div className="text-center sm:text-right">
                <div className="text-yellow-400 font-semibold text-sm sm:text-base">
                  Active rounds: {activeRoundsCount}
                </div>
                <p className="text-gray-400 text-xs sm:text-sm">Voting status</p>
              </div>
            </div>
          </motion.button>

          <motion.button
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            onClick={() => navigate('/contribute')}
            className="mobile-glass rounded-xl mobile-card hover:bg-white/20 transition-all duration-300 group touch-target"
          >
            <div className="flex flex-col sm:flex-row items-center justify-between">
              <div className="flex items-center mb-4 sm:mb-0">
                <div className="p-3 sm:p-4 bg-green-500/20 rounded-lg mr-4">
                  <Coins className="w-6 h-6 sm:w-8 sm:h-8 text-green-400" />
                </div>
                <div className="text-left">
                  <h3 className="text-lg sm:text-xl font-bold text-white">CONTRIBUTE</h3>
                  <p className="text-gray-300 text-sm sm:text-base">Contribute to the DAO’s progress and earn points</p>
                </div>
              </div>
              <div className="text-center sm:text-right">
                <div className="text-yellow-400 font-semibold text-sm sm:text-base">
                  Contribution points: {pointsContribution.toLocaleString()}
                </div>
                <p className="text-gray-400 text-xs sm:text-sm">Balance</p>
              </div>
            </div>
          </motion.button>
        </div>

        {/* Loss & Restitution Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mobile-glass rounded-xl mobile-card mb-6 sm:mb-8"
        >
          <h3 className="mobile-subheader font-bold text-white mb-4 sm:mb-6">Restitution Status</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 responsive-gap">
            <div className="bg-white/10 rounded-lg p-4">
              <h4 className="text-white font-semibold mb-2 text-sm sm:text-base">Verified Loss</h4>
              <div className="text-2xl font-bold text-white">
                ${verifiedLoss.toLocaleString()}
              </div>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <h4 className="text-white font-semibold mb-2 text-sm sm:text-base">Unverified Loss</h4>
              <div className="text-2xl font-bold text-white">
                ${unverifiedLoss.toLocaleString()}
              </div>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <h4 className="text-white font-semibold mb-2 text-sm sm:text-base">Amount Restituted</h4>
              <div className="text-2xl font-bold text-green-400">
                ${amountRestituted.toLocaleString()}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Your Stats & Activity (Live) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mobile-glass rounded-xl mobile-card mb-6 sm:mb-8"
        >
          <h3 className="mobile-subheader font-bold text-white mb-4 sm:mb-6">Your Stats</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 responsive-gap mb-6">
            <div className={`rounded-lg p-4 transition-all duration-300 ${userRank >= 5000 && userRank <= 5009 ? 'bg-gradient-to-br from-yellow-500/30 to-yellow-600/30 border border-yellow-400/50' : 'bg-white/10'}`}>
              <div className="flex items-center justify-between mb-2">
                <h4 className="text-white font-semibold text-sm sm:text-base">Leaderboard Ranking</h4>
                <Trophy className={`w-5 h-5 ${userRank >= 5000 && userRank <= 5009 ? 'text-yellow-400' : 'text-purple-400'}`} />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-3xl font-bold text-white">#{userRank || '—'}</span>
                {userRank >= 5000 && userRank <= 5009 && <span className="text-xs text-yellow-400 font-bold uppercase tracking-wider">Top Tier</span>}
              </div>
              <p className="text-gray-400 text-xs mt-1">Global standing in the ecosystem</p>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <h4 className="text-white font-semibold mb-2 text-sm sm:text-base">Voting Rights</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-300 text-sm">Allowed:</span>
                  <span className="text-white font-semibold">{dashAllowed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300 text-sm">Used:</span>
                  <span className="text-white font-semibold">{dashUsed}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300 text-sm">Remaining:</span>
                  <span className="text-green-400 font-semibold">{dashRemaining}</span>
                </div>
              </div>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <h4 className="text-white font-semibold mb-2 text-sm sm:text-base">Voting Rounds</h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-300 text-sm">Active Rounds:</span>
                  <span className="text-white font-semibold">{activeRoundsCount}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-300 text-sm">Your Points:</span>
                  <span className="text-green-400 font-semibold">{totalPoints.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
          {/* Points Breakdown */}
          <div className="grid grid-cols-1 sm:grid-cols-3 responsive-gap mb-6">
            <div className="bg-white/10 rounded-lg p-4">
              <h4 className="text-white font-semibold mb-2 text-sm sm:text-base">Voting Points</h4>
              <div className="flex items-center justify-between">
                <span className="text-gray-300 text-sm">Total:</span>
                <span className="text-white font-semibold">{pointsVoting.toLocaleString()}</span>
              </div>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <h4 className="text-white font-semibold mb-2 text-sm sm:text-base">Contribution Points</h4>
              <div className="flex items-center justify-between">
                <span className="text-gray-300 text-sm">Total:</span>
                <span className="text-white font-semibold">{pointsContribution.toLocaleString()}</span>
              </div>
            </div>
            <div className="bg-white/10 rounded-lg p-4">
              <h4 className="text-white font-semibold mb-2 text-sm sm:text-base">Referral Points</h4>
              <div className="flex items-center justify-between">
                <span className="text-gray-300 text-sm">Total:</span>
                <span className="text-white font-semibold">{pointsReferral.toLocaleString()}</span>
              </div>
            </div>
          </div>
          <h4 className="text-white font-semibold mb-3 text-sm sm:text-base">Your Recent Activity</h4>
          <div className="space-y-2 max-h-40 overflow-y-auto">
            {recentActivity.length === 0 ? (
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-gray-300 text-sm">No recent activity.</p>
              </div>
            ) : (
              recentActivity.map((activity) => (
                <div key={activity.id} className="bg-white/10 rounded-lg p-3">
                  <div className="flex justify-between items-center">
                    <span className="text-white text-sm font-medium">{activity.message}</span>
                    <span className="text-gray-400 text-xs">{new Date(activity.time).toLocaleTimeString()}</span>
                  </div>
                  <p className="text-gray-400 text-xs">{activity.type}</p>
                </div>
              ))
            )}
          </div>
        </motion.div>

        {/* Settings Panel */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mobile-glass rounded-xl mobile-card"
        >
          <h3 className="mobile-subheader font-bold text-white mb-4 sm:mb-6">Settings</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 responsive-gap">
            <button onClick={handleEditProfile} className="flex items-center p-4 bg-white/10 rounded-lg hover:bg-white/20 transition-colors group touch-target">
              <User className="w-5 h-5 text-blue-400 mr-3 group-hover:scale-110 transition-transform" />
              <div className="text-left">
                <h4 className="text-white font-semibold text-sm sm:text-base">Edit Profile</h4>
                <p className="text-gray-400 text-xs sm:text-sm">Update your information</p>
              </div>
            </button>
            <button onClick={openResetPassword} className="flex items-center p-4 bg-white/10 rounded-lg hover:bg-white/20 transition-colors group touch-target">
              <Lock className="w-5 h-5 text-yellow-400 mr-3 group-hover:scale-110 transition-transform" />
              <div className="text-left">
                <h4 className="text-white font-semibold text-sm sm:text-base">Reset Password</h4>
                <p className="text-gray-400 text-xs sm:text-sm">Change your password</p>
              </div>
            </button>
            <button
              onClick={logout}
              className="flex items-center p-4 bg-white/10 rounded-lg hover:bg-red-500/20 transition-colors group touch-target"
            >
              <LogOut className="w-5 h-5 text-red-400 mr-3 group-hover:scale-110 transition-transform" />
              <div className="text-left">
                <h4 className="text-white font-semibold text-sm sm:text-base">Log Out</h4>
                <p className="text-gray-400 text-xs sm:text-sm">End your session</p>
              </div>
            </button>
          </div>
        </motion.div>
      </div>

      {showResetPassword && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-gray-800 rounded-lg p-8 w-full max-w-md"
          >
            <h2 className="text-2xl font-bold text-white mb-4">Reset Password</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Email</label>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  className="input-field bg-white/10 border-white/20 text-white"
                  placeholder="Enter your email"
                />
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={dashSendOtp}
                  disabled={sendingOtp}
                  className="px-4 py-2 rounded-md bg-purple-600 text-white hover:bg-purple-700 disabled:opacity-50"
                >
                  {sendingOtp ? 'Sending...' : 'Send OTP'}
                </button>
                <input
                  type="text"
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  className="input-field flex-1 bg-white/10 border-white/20 text-white"
                  placeholder="Enter OTP"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="relative">
                  <input
                    type={showNewPass ? 'text' : 'password'}
                    value={newPass}
                    onChange={(e) => setNewPass(e.target.value)}
                    className="input-field bg-white/10 border-white/20 text-white pr-10"
                    placeholder="New password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPass(!showNewPass)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showNewPass ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                    )}
                  </button>
                </div>
                <div className="relative">
                  <input
                    type={showConfirmPass ? 'text' : 'password'}
                    value={confirmPass}
                    onChange={(e) => setConfirmPass(e.target.value)}
                    className="input-field bg-white/10 border-white/20 text-white pr-10"
                    placeholder="Confirm password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass(!showConfirmPass)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  >
                    {showConfirmPass ? (
                      <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                    ) : (
                      <Eye className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                    )}
                  </button>
                </div>
              </div>
              <button
                type="button"
                onClick={dashChangePasswordWithOtp}
                disabled={changingPwd}
                className="w-full btn-primary py-2 disabled:opacity-50"
              >
                {changingPwd ? 'Changing...' : 'Change Password'}
              </button>
              <button
                onClick={() => setShowResetPassword(false)}
                className="mt-4 text-sm text-gray-400 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;

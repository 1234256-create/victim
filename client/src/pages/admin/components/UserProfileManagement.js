import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import axios from 'axios';
import { getUsersList as dsGetUsersList, getUserMeta as dsGetUserMeta } from '../../../utils/datastore';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Search,
  Filter,
  Eye,
  Edit,
  Ban,
  CheckCircle,
  XCircle,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Award,
  TrendingUp,
  Activity,
  DollarSign,
  Vote,
  Gift,
  Settings,
  Shield,
  AlertTriangle,
  Clock,
  Download,
  RefreshCw,
  MoreVertical,
  UserCheck,
  UserX,
  Receipt
} from 'lucide-react';
import toast from 'react-hot-toast';

import { useAdminAuth } from '../../../contexts/AdminAuthContext';

const VoteCard = React.memo(({ activeRoundsCount }) => {
  return (
    <div className="bg-white rounded-lg p-4 border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-purple-100 rounded">
            <Vote className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <div className="font-semibold text-gray-900">VOTE</div>
            <div className="text-gray-500 text-sm">Cast votes and earn points</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-yellow-600 font-semibold">Active rounds: {activeRoundsCount}</div>
          <div className="text-gray-400 text-xs">Voting status</div>
        </div>
      </div>
    </div>
  );
});

const ContribCard = React.memo(({ contributionPoints }) => {
  return (
    <div className="bg-white rounded-lg p-4 border">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-green-100 rounded">
            <DollarSign className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <div className="font-semibold text-gray-900">CONTRIBUTE</div>
            <div className="text-gray-500 text-sm">Contribute and earn points</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-yellow-600 font-semibold">Contribution points: {contributionPoints}</div>
          <div className="text-gray-400 text-xs">Balance</div>
        </div>
      </div>
    </div>
  );
});

const RealDataCard = React.memo(({ user, onLoadVoteHistory, onLoadReferrals }) => {
  const vp = user?.realStats?.votingPoints ?? (user?.points?.voting || 0);
  const cp = user?.realStats?.contributionPoints ?? (user?.points?.contributions || 0);
  const rp = user?.realStats?.referralPoints ?? (user?.points?.referral || 0);
  const total = user?.realStats?.totalPoints ?? (vp + cp + rp);
  const vLoss = user?.verifiedLoss || 0;
  const uvLoss = user?.unverifiedLoss || 0;
  const restituted = user?.amountRestituted || 0;

  return (
    <div className="bg-white rounded-lg p-4 border">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 rounded">
            <Activity className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <div className="font-semibold text-gray-900">REAL DATA</div>
            <div className="text-gray-500 text-sm">Unaffected by admin manipulation</div>
          </div>
        </div>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
        <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
          <div className="text-xs text-gray-600">Total Points</div>
          <div className="text-xl font-bold text-gray-900">{total}</div>
        </div>
        <div
          onClick={onLoadVoteHistory}
          className="rounded-lg bg-purple-50 border border-purple-200 p-3 cursor-pointer hover:bg-purple-100 transition-colors"
          title="View Vote History"
        >
          <div className="text-xs text-purple-600 flex justify-between items-center group">
            Voting Points
            <Eye className="w-3 h-3 text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="text-xl font-bold text-gray-900">{vp}</div>
        </div>
        <div className="rounded-lg bg-blue-50 border border-blue-200 p-3">
          <div className="text-xs text-gray-600">Contribution Points</div>
          <div className="text-xl font-bold text-gray-900">{cp}</div>
        </div>
        <div
          onClick={onLoadReferrals}
          className="rounded-lg bg-green-50 border border-green-200 p-3 cursor-pointer hover:bg-green-100 transition-colors"
          title="View Referrals"
        >
          <div className="text-xs text-green-600 flex justify-between items-center group">
            Referral Points
            <Eye className="w-3 h-3 text-green-600 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
          <div className="text-xl font-bold text-gray-900">{rp}</div>
        </div>
        <div className="rounded-lg bg-red-50 border border-red-200 p-3">
          <div className="text-xs text-gray-600">Verified Loss</div>
          <div className="text-xl font-bold text-gray-900">${vLoss.toLocaleString()}</div>
        </div>
        <div className="rounded-lg bg-yellow-50 border border-yellow-200 p-3">
          <div className="text-xs text-gray-600">Unverified Loss</div>
          <div className="text-xl font-bold text-gray-900">${uvLoss.toLocaleString()}</div>
        </div>
        <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-3">
          <div className="text-xs text-gray-600">Restituted</div>
          <div className="text-xl font-bold text-gray-900">${restituted.toLocaleString()}</div>
        </div>
      </div>
    </div>
  );
});

const UserDashboardForm = React.memo(({
  dashTotalAmount, setDashTotalAmount,
  dashTotalType, setDashTotalType,
  dashVotingAmount, setDashVotingAmount,
  dashVotingType, setDashVotingType,
  dashContribAmount, setDashContribAmount,
  dashContribType, setDashContribType,
  dashReferralAmount, setDashReferralAmount,
  dashReferralType, setDashReferralType,
  dashVerifiedLoss, setDashVerifiedLoss,
  dashUnverifiedLoss, setDashUnverifiedLoss,
  dashAmountRestituted, setDashAmountRestituted,
  dashRankOverride, setDashRankOverride,
  dashReason, setDashReason,
  applyDashboardUpdates
}) => {
  return (
    <div className="bg-white rounded-lg p-4 border">
      <h4 className="font-semibold text-gray-900 mb-3">User Dashboard Data</h4>
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <div className="text-sm text-gray-600 mb-1">Verified Loss</div>
            <input type="number" value={dashVerifiedLoss} onChange={(e) => setDashVerifiedLoss(e.target.value)} placeholder="0" className="w-full px-3 py-2 border rounded-lg" />
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Unverified Loss</div>
            <input type="number" value={dashUnverifiedLoss} onChange={(e) => setDashUnverifiedLoss(e.target.value)} placeholder="0" className="w-full px-3 py-2 border rounded-lg" />
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Amount Restituted</div>
            <input type="number" value={dashAmountRestituted} onChange={(e) => setDashAmountRestituted(e.target.value)} placeholder="0" className="w-full px-3 py-2 border rounded-lg" />
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Leaderboard Rank Display</div>
            <input type="number" value={dashRankOverride} onChange={(e) => setDashRankOverride(e.target.value)} placeholder="Rank number (optional)" className="w-full px-3 py-2 border rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
          <div className="sm:col-span-2">
            <div className="text-sm text-gray-600 mb-1">Total Points</div>
            <input value={dashTotalAmount} onChange={(e) => setDashTotalAmount(e.target.value)} placeholder="Amount" className="w-full px-3 py-2 border rounded-lg" />
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Type</div>
            <select value={dashTotalType} onChange={(e) => setDashTotalType(e.target.value)} className="w-full px-3 py-2 border rounded-lg">
              <option value="add">Add</option>
              <option value="deduct">Deduct</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <div className="text-sm text-gray-600 mb-1">Reason</div>
            <input value={dashReason} onChange={(e) => setDashReason(e.target.value)} placeholder="Reason (optional)" className="w-full px-3 py-2 border rounded-lg" />
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div>
            <div className="text-sm text-gray-600 mb-1">Voting Points</div>
            <div className="flex gap-2">
              <input value={dashVotingAmount} onChange={(e) => setDashVotingAmount(e.target.value)} placeholder="Amount" className="w-full px-3 py-2 border rounded-lg" />
              <select value={dashVotingType} onChange={(e) => setDashVotingType(e.target.value)} className="px-3 py-2 border rounded-lg">
                <option value="add">Add</option>
                <option value="deduct">Deduct</option>
              </select>
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Contribution Points</div>
            <div className="flex gap-2">
              <input value={dashContribAmount} onChange={(e) => setDashContribAmount(e.target.value)} placeholder="Amount" className="w-full px-3 py-2 border rounded-lg" />
              <select value={dashContribType} onChange={(e) => setDashContribType(e.target.value)} className="px-3 py-2 border rounded-lg">
                <option value="add">Add</option>
                <option value="deduct">Deduct</option>
              </select>
            </div>
          </div>
          <div>
            <div className="text-sm text-gray-600 mb-1">Referral Points</div>
            <div className="flex gap-2">
              <input value={dashReferralAmount} onChange={(e) => setDashReferralAmount(e.target.value)} placeholder="Amount" className="w-full px-3 py-2 border rounded-lg" />
              <select value={dashReferralType} onChange={(e) => setDashReferralType(e.target.value)} className="px-3 py-2 border rounded-lg">
                <option value="add">Add</option>
                <option value="deduct">Deduct</option>
              </select>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
          <div className="sm:col-span-3 flex items-end">
            <button onClick={applyDashboardUpdates} className="w-full sm:w-auto px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Update Dashboard Data</button>
          </div>
        </div>
      </div>
    </div>
  );
});

const UserProfileManagement = () => {
  const { isAuthenticated } = useAdminAuth();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('activity');
  const [activeRoundsCount, setActiveRoundsCount] = useState(0);
  const [activeVotes, setActiveVotes] = useState([]);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editDraft, setEditDraft] = useState({ fullName: '', email: '', role: 'user', status: 'active' });
  const [pointsAmount, setPointsAmount] = useState('');
  const [pointsType, setPointsType] = useState('add');
  const [pointsCategory, setPointsCategory] = useState('bonus');
  const [pointsReason, setPointsReason] = useState('');
  const [votingRightsInput, setVotingRightsInput] = useState('');
  const [userContributions, setUserContributions] = useState([]);
  const [loadingContribs, setLoadingContribs] = useState(false);
  const [dashTotalAmount, setDashTotalAmount] = useState('');
  const [dashTotalType, setDashTotalType] = useState('add');
  const [dashVotingAmount, setDashVotingAmount] = useState('');
  const [dashVotingType, setDashVotingType] = useState('add');
  const [dashContribAmount, setDashContribAmount] = useState('');
  const [dashContribType, setDashContribType] = useState('add');
  const [dashReferralAmount, setDashReferralAmount] = useState('');
  const [dashReferralType, setDashReferralType] = useState('add');
  const [dashVerifiedLoss, setDashVerifiedLoss] = useState('');
  const [dashUnverifiedLoss, setDashUnverifiedLoss] = useState('');
  const [dashAmountRestituted, setDashAmountRestituted] = useState('');
  const [dashRankOverride, setDashRankOverride] = useState('');
  const [dashReason, setDashReason] = useState('');
  const [showReferralsModal, setShowReferralsModal] = useState(false);
  const [selectedUserReferrals, setSelectedUserReferrals] = useState([]);
  const [loadingReferrals, setLoadingReferrals] = useState(false);
  const [showVoteHistoryModal, setShowVoteHistoryModal] = useState(false);
  const [voteHistory, setVoteHistory] = useState([]);
  const [loadingVoteHistory, setLoadingVoteHistory] = useState(false);

  const reloadSelectedUserDetails = useCallback(async () => {
    if (!selectedUser?.id) return;
    try {
      const token = localStorage.getItem('adminToken');
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      const res = await axios.get(`/api/users/${selectedUser.id}`, { headers, params: { original: true } });
      const u = res.data?.data?.user;
      if (u) {
        setSelectedUser(prev => {
          const base = prev || {};
          return {
            ...base,
            id: base.id || u._id,
            fullName: u.fullName || `${u.firstName || ''} ${u.lastName || ''}`.trim() || base.fullName,
            email: u.email || base.email,
            role: u.role || base.role,
            status: u.isActive ? 'active' : base.status,
            address: u.address || base.address,
            phone: u.phoneNumber || base.phone,
            telegramUsername: u.telegramUsername || base.telegramUsername,
            walletAddress: u.walletAddress || base.walletAddress,
            points: {
              ...(base.points || {}),
              total: u.points ?? (base.points?.total ?? 0),
              voting: u.stats?.votingPoints ?? (base.points?.voting ?? 0),
              contributions: u.stats?.contributionPoints ?? (base.points?.contributions ?? 0),
              referral: u.stats?.referralPoints ?? (base.points?.referral ?? 0)
            },
            contributions: {
              ...(base.contributions || {}),
              total: u.stats?.totalContributions ?? (base.contributions?.total ?? 0),
              totalValue: u.stats?.contributionAmount ?? (base.contributions?.totalValue ?? 0),
              usdValue: u.stats?.contributionAmount ?? (base.contributions?.usdValue ?? 0)
            },
            activity: {
              ...(base.activity || {}),
              votesParticipated: u.stats?.totalVotes ?? (base.activity?.votesParticipated ?? 0),
              contributionsMade: u.stats?.totalContributions ?? (base.activity?.contributionsMade ?? 0)
            },
            votingRights: {
              ...(base.votingRights || {}),
              enabled: (u.votingRights || 0) > 0,
              maxVotes: u.votingRights || 0
            },
            verifiedLoss: u.verifiedLoss || 0,
            unverifiedLoss: u.unverifiedLoss || 0,
            amountRestituted: u.amountRestituted || 0,
            rankOverride: u.overrides?.rankOverride,
            realStats: u.realStats !== undefined ? u.realStats : base.realStats
          };
        });

        const uid = u._id || selectedUser.id;
        setUsers(prev => prev.map(user => {
          if (user.id !== uid) return user;
          return {
            ...user,
            fullName: u.fullName || user.fullName,
            email: u.email || user.email,
            role: u.role || user.role,
            status: u.isActive ? 'active' : user.status,
            realStats: u.realStats !== undefined ? u.realStats : user.realStats,
            points: {
              ...(user.points || {}),
              total: u.points ?? user.points?.total ?? 0,
              voting: u.stats?.votingPoints ?? user.points?.voting ?? 0,
              contributions: u.stats?.contributionPoints ?? user.points?.contributions ?? 0,
              referral: u.stats?.referralPoints ?? user.points?.referral ?? 0
            },
            activity: {
              ...(user.activity || {}),
              votesParticipated: u.stats?.totalVotes ?? user.activity?.votesParticipated ?? 0,
              contributionsMade: u.stats?.totalContributions ?? user.activity?.contributionsMade ?? 0
            },
            votingRights: {
              ...(user.votingRights || {}),
              enabled: (u.votingRights || 0) > 0,
              maxVotes: u.votingRights || user.votingRights?.maxVotes || 0
            }
          };
        }));
        try {
          setLoadingContribs(true);
          const contribRes = await axios.get('/api/contributions', { params: { user: selectedUser.id }, headers });
          const list = contribRes?.data?.data?.contributions || [];
          const mapped = list.map(c => ({
            id: c._id || c.id,
            amount: c.amount || 0,
            currency: c.currency || 'USD',
            status: c.status || 'pending',
            submittedAt: c.createdAt || new Date().toISOString(),
            approvedAt: c.approvedAt || null,
            pointsAwarded: c.pointsAwarded || 0,
            transactionId: c.transactionHash || c.receipt?.path || 'n/a'
          }));
          setUserContributions(mapped);
        } catch (_) {
          setUserContributions([]);
        } finally {
          setLoadingContribs(false);
        }
      }
    } catch (_) { }
  }, [selectedUser]);

  const handleShowVoteHistory = async (user) => {
    setSelectedUser(user);
    setShowVoteHistoryModal(true);
    setLoadingVoteHistory(true);
    try {
      const token = localStorage.getItem('adminToken');
      const headers = { Authorization: `Bearer ${token}` };
      const { data } = await axios.get(`/api/votes/user/${user.id}`, { headers });
      if (data.success) {
        setVoteHistory(data.data.history);
      }
    } catch (err) {
      toast.error('Failed to load vote history');
    } finally {
      setLoadingVoteHistory(false);
    }
  };

  const refreshTimerRef = useRef(null);
  const scheduleRefresh = useCallback(() => {
    try { if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current); } catch (_) { }
    refreshTimerRef.current = setTimeout(() => {
      if (showUserModal) {
        reloadSelectedUserDetails();
      }
      const token = localStorage.getItem('adminToken');
      if (token) {
        const headers = { Authorization: `Bearer ${token}` };
        axios.get('/api/votes', { params: { status: 'active', limit: 200 }, headers }).then((res) => {
          const apiVotes = res.data?.data?.votes || [];
          const transformed = apiVotes.map(v => ({
            id: v._id || v.id,
            title: v.title,
            status: v.status,
            endTime: v.endTime,
            maxVotesPerUser: v.maxVotesPerUser || 1,
            totalVotes: v.totalVotes || 0,
            submissions: v.submissions ? (v.submissions instanceof Map ? Object.fromEntries(v.submissions) : v.submissions) : {}
          }));
          const changedLen = transformed.length !== (activeVotes || []).length;
          const changedIds = !changedLen && transformed.some((t, i) => t.id !== (activeVotes[i]?.id));
          if (changedLen || changedIds) {
            setActiveRoundsCount(transformed.length || 0);
            setActiveVotes(transformed);
          }
        }).catch(() => { });
      }
    }, 300);
  }, [showUserModal, reloadSelectedUserDetails, activeVotes]);

  const filterUsers = useCallback(() => {
    let filtered = users;
    if (searchTerm) {
      filtered = filtered.filter(user =>
        user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => user.status === statusFilter);
    }
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }
    setFilteredUsers(filtered);
  }, [users, searchTerm, statusFilter, roleFilter]);

  const memoActiveRounds = useMemo(() => activeRoundsCount, [activeRoundsCount]);
  const totalPointsText = useMemo(() => (selectedUser?.points?.total || 0).toLocaleString(), [selectedUser?.points?.total]);
  const votingPointsText = useMemo(() => (selectedUser?.points?.voting || 0).toLocaleString(), [selectedUser?.points?.voting]);
  const contributionPointsText = useMemo(() => (selectedUser?.points?.contributions || 0).toLocaleString(), [selectedUser?.points?.contributions]);
  const referralPointsText = useMemo(() => (selectedUser?.points?.referral || 0).toLocaleString(), [selectedUser?.points?.referral]);

  useEffect(() => {
    loadUsers();
    const onUpdate = () => {
      scheduleRefresh();
    };
    window.addEventListener('datastore:update', onUpdate);
    window.addEventListener('users:update', onUpdate);
    return () => {
      window.removeEventListener('datastore:update', onUpdate);
      window.removeEventListener('users:update', onUpdate);
      try { if (refreshTimerRef.current) { clearTimeout(refreshTimerRef.current); refreshTimerRef.current = null; } } catch (_) { }
    };
  }, [isAuthenticated, scheduleRefresh]);

  useEffect(() => {
    const raw = localStorage.getItem('adminToken');
    if (!raw || String(raw).startsWith('placeholder-token-')) return;
    let es;
    try {
      es = new EventSource(`/api/users/stream?token=${encodeURIComponent(raw)}`);
      es.onmessage = (ev) => {
        try {
          const payload = JSON.parse(ev.data);
          const t = String(payload?.type || '');
          if (/user_(updated|points_updated|status_updated|deleted)/i.test(t) || /users?_updated/i.test(t)) {
            scheduleRefresh();
          }
          if (/vote_(started|paused|resumed|completed|created|updated|deleted)/i.test(t)) {
            scheduleRefresh();
          }
        } catch (_) { }
      };
    } catch (_) { }
    return () => { try { es && es.close(); } catch (_) { } };
  }, [isAuthenticated, scheduleRefresh]);

  useEffect(() => {
    if (selectedUser) {
      setEditDraft({
        fullName: selectedUser.fullName || '',
        email: selectedUser.email || '',
        role: selectedUser.role || 'user',
        status: selectedUser.status || 'active'
      });
      setDashVerifiedLoss(selectedUser.verifiedLoss !== undefined ? String(selectedUser.verifiedLoss) : '0');
      setDashUnverifiedLoss(selectedUser.unverifiedLoss !== undefined ? String(selectedUser.unverifiedLoss) : '0');
      setDashAmountRestituted(selectedUser.amountRestituted !== undefined ? String(selectedUser.amountRestituted) : '0');
      setDashRankOverride(selectedUser.rankOverride !== undefined ? String(selectedUser.rankOverride) : '');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedUser?.id]);


  useEffect(() => {
    if (showUserModal && selectedUser?.id) {
      reloadSelectedUserDetails();
    }
  }, [showUserModal, selectedUser?.id, reloadSelectedUserDetails]);



  useEffect(() => {
    const loadActiveRounds = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
        const res = await axios.get('/api/votes', { params: { status: 'active', limit: 200 }, headers });
        const apiVotes = res.data?.data?.votes || [];
        const transformed = apiVotes.map(v => ({
          id: v._id || v.id,
          title: v.title,
          status: v.status,
          endTime: v.endTime,
          maxVotesPerUser: v.maxVotesPerUser || 1,
          totalVotes: v.totalVotes || 0,
          submissions: v.submissions ? (v.submissions instanceof Map ? Object.fromEntries(v.submissions) : v.submissions) : {}
        }));
        setActiveRoundsCount(transformed.length || 0);
        setActiveVotes(transformed);
      } catch (_) {
        setActiveRoundsCount(0);
        setActiveVotes([]);
      }
    };
    if (showUserModal) loadActiveRounds();
  }, [showUserModal]);

  useEffect(() => {
    let ws;
    try {
      const url = window.location.origin.replace('http', 'ws').replace(/\/$/, '') + '/ws';
      ws = new WebSocket(url);
      ws.onmessage = (ev) => {
        try {
          const payload = JSON.parse(ev.data);
          if (payload && /user_(vote|contribution|referral|status|voting|points|updated|registered|deleted)/i.test(payload.type)) {
            scheduleRefresh();
          }
          if (payload && /vote_(started|paused|resumed|completed|created|updated|deleted)/i.test(payload.type)) {
            scheduleRefresh();
          }
        } catch { }
      };
    } catch (_) { }
    return () => { try { ws && ws.close(); } catch (_) { } };
  }, [scheduleRefresh]);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, statusFilter, roleFilter, filterUsers]);

  const loadUsers = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      const res = await axios.get('/api/users', { params: { limit: 100, type: 'real' }, headers });
      const apiUsers = res.data?.data?.users || [];
      if (apiUsers.length > 0) {
        const mapped = apiUsers.map((u) => {
          // Apply overrides to local display
          const overrides = u.overrides || {};
          const statsOffsets = overrides.statsOffsets || {};
          const oStats = overrides.stats || {};

          const rawVoting = (u.stats && u.stats.votingPoints) || 0;
          const rawContrib = (u.stats && u.stats.contributionPoints) || 0;
          const rawReferral = (u.stats && u.stats.referralPoints) || 0;

          const effectiveVoting = (u.stats && u.stats.votingPoints) || 0;
          const effectiveContrib = (u.stats && u.stats.contributionPoints) || 0;
          const effectiveReferral = (u.stats && u.stats.referralPoints) || 0;

          return {
            id: u._id,
            username: u.username || (u.email || '').split('@')[0],
            email: u.email,
            fullName: u.fullName || `${u.firstName} ${u.lastName || ''}`.trim(),
            phone: '',
            dateOfBirth: new Date(u.createdAt).toISOString(),
            address: '',
            joinedAt: u.createdAt,
            lastActive: u.lastLogin || u.updatedAt || u.createdAt,
            status: u.isActive ? 'active' : 'suspended',
            role: u.role || 'user',
            isVerified: true,
            referredBy: u.referredBy,
            votingRights: {
              enabled: (u.votingRights || 0) > 0,
              maxVotes: u.votingRights || 0,
              votesUsed: 0,
              lastVoteAt: null
            },
            points: {
              total: u.points || 0,
              earned: u.points || 0,
              spent: 0,
              rank: u.rank || 0,
              voting: effectiveVoting,
              contributions: effectiveContrib,
              referral: effectiveReferral
            },
            contributions: {
              total: u.stats?.totalContributions || 0,
              totalValue: u.stats?.contributionAmount || 0,
              currency: 'USD',
              usdValue: u.stats?.contributionAmount || 0,
              lastContribution: null
            },
            activity: {
              loginCount: 0,
              votesParticipated: u.stats?.totalVotes || 0,
              contributionsMade: u.stats?.totalContributions || 0,
              referralsCount: 0
            },
            security: {
              twoFactorEnabled: false,
              lastPasswordChange: u.updatedAt || u.createdAt,
              suspiciousActivity: false,
              loginAttempts: 0
            },
            notes: ''
          }
        });
        setUsers(mapped);
      } else {
        setUsers([]);
      }
    } catch (err) {
      setUsers([]);
      const msg = err?.response?.data?.message || err?.message || 'Failed to load users';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };


  const handleStatusUpdate = async (userId, newStatus) => {
    try {
      const token = localStorage.getItem('adminToken');
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      await axios.put(`/api/users/${userId}/status`, { isActive: newStatus === 'active' }, { headers });
      setUsers(users.map(user =>
        user.id === userId
          ? { ...user, status: newStatus }
          : user
      ))
      const u = users.find(u => u.id === userId);
      if (u && selectedUser && selectedUser.id === userId) setSelectedUser({ ...selectedUser, status: newStatus });
      toast.success(`User ${newStatus === 'active' ? 'activated' : 'suspended'} successfully`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  };



  const getStatusColor = (status) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'suspended': return 'bg-red-100 text-red-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'vip': return 'bg-purple-100 text-purple-800';
      case 'moderator': return 'bg-blue-100 text-blue-800';
      case 'user': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const exportUsers = () => {
    const csvContent = [
      ['ID', 'Username', 'Full Name', 'Email', 'Status', 'Role', 'Points', 'Contributions', 'Last Active'],
      ...filteredUsers.map(user => [
        user.id,
        user.username,
        user.fullName,
        user.email,
        user.status,
        user.role,
        user.points.total,
        user.contributions.total,
        new Date(user.lastActive).toLocaleDateString()
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `users-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Users exported successfully');
  };

  const beginEditProfile = () => {
    setIsEditingProfile(true);
  };

  const cancelEditProfile = () => {
    if (selectedUser) {
      setEditDraft({
        fullName: selectedUser.fullName || '',
        email: selectedUser.email || '',
        role: selectedUser.role || 'user',
        status: selectedUser.status || 'active'
      });
    }
    setIsEditingProfile(false);
  };

  const applyEditProfile = async () => {
    if (!selectedUser) return;
    try {
      const token = localStorage.getItem('adminToken');
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

      const nameParts = (editDraft.fullName || '').trim().split(/\s+/);
      const firstName = nameParts[0] || '';
      const lastName = nameParts.slice(1).join(' ');

      const payload = { firstName, lastName, email: editDraft.email, role: editDraft.role };
      await axios.put(`/api/users/${selectedUser.id}`, payload, { headers });

      const statusPayload = { isActive: editDraft.status === 'active' };
      await axios.put(`/api/users/${selectedUser.id}/status`, statusPayload, { headers });



      await loadUsers();
      const updated = users.find(u => u.id === selectedUser.id);
      if (updated) setSelectedUser(updated);
      setIsEditingProfile(false);
      toast.success('User data updated');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update user');
    }
  };

  const applyPointsAdjust = async () => {
    if (!selectedUser) return;
    try {
      const token = localStorage.getItem('adminToken');
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      const amt = Math.abs(Number(pointsAmount || 0));
      if (!amt) { toast.error('Enter a valid points amount'); return; }
      await axios.put(`/api/users/${selectedUser.id}/points`, {
        amount: amt,
        type: pointsType,
        category: pointsCategory,
        reason: pointsReason || 'Admin adjustment from UserProfileManagement'
      }, { headers });
      setPointsAmount('');
      setPointsReason('');
      reloadSelectedUserDetails();
      try { window.dispatchEvent(new Event('datastore:update')); } catch (_) { }
      toast.success(`Points ${pointsType === 'add' ? 'added' : 'deducted'}`);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to adjust points');
    }
  };

  const applyVotingRightsUpdate = async () => {
    if (!selectedUser) return;
    try {
      const token = localStorage.getItem('adminToken');
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      const rights = Math.max(0, Number(votingRightsInput || 0));
      await axios.put(`/api/users/${selectedUser.id}/voting-rights`, {
        votingRights: rights,
        reason: 'Admin update from UserProfileManagement'
      }, { headers });
      setVotingRightsInput('');
      reloadSelectedUserDetails();
      try { window.dispatchEvent(new Event('datastore:update')); } catch (_) { }
      toast.success('Voting rights updated');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update voting rights');
    }
  };

  const applyDashboardUpdates = async () => {
    if (!selectedUser?.id) return;
    const token = localStorage.getItem('adminToken');
    if (!token) { toast.error('Admin authentication required'); return; }
    const headers = { Authorization: `Bearer ${token}` };
    const id = selectedUser.id;

    const payload = {
      points: {},
      losses: {
        verified: dashVerifiedLoss === '' ? undefined : Number(dashVerifiedLoss),
        unverified: dashUnverifiedLoss === '' ? undefined : Number(dashUnverifiedLoss),
        restituted: dashAmountRestituted === '' ? undefined : Number(dashAmountRestituted)
      },
      rank: dashRankOverride === '' ? undefined : Number(dashRankOverride),
      reason: dashReason
    };

    const addPointIfValid = (amount, type, category) => {
      const amt = parseFloat(amount);
      if (!isNaN(amt) && amt > 0) {
        payload.points[category] = { amount: amt, type };
      }
    };

    addPointIfValid(dashTotalAmount, dashTotalType, 'total');
    addPointIfValid(dashVotingAmount, dashVotingType, 'voting');
    addPointIfValid(dashContribAmount, dashContribType, 'contributions');
    addPointIfValid(dashReferralAmount, dashReferralType, 'referral');

    // Check if we have anything to update
    const hasPoints = Object.keys(payload.points).length > 0;
    const hasLosses = dashVerifiedLoss !== '' || dashUnverifiedLoss !== '' || dashAmountRestituted !== '';
    const hasRank = dashRankOverride !== '';

    if (!hasPoints && !hasLosses && !hasRank) {
      toast.error('Enter at least one update');
      return;
    }

    try {
      await axios.put(`/api/users/${id}/dashboard-bulk`, payload, { headers });
      toast.success('Dashboard data updated');

      // Reset inputs
      setDashTotalAmount('');
      setDashVotingAmount('');
      setDashContribAmount('');
      setDashReferralAmount('');
      setDashVerifiedLoss('');
      setDashUnverifiedLoss('');
      setDashAmountRestituted('');
      setDashRankOverride('');
      setDashReason('');

      reloadSelectedUserDetails();
      try { window.dispatchEvent(new Event('datastore:update')); } catch (_) { }
    } catch (err) {
      const msg = err?.response?.data?.message || 'Failed to update user';
      toast.error(msg);
    }
  };

  const loadUserReferrals = async () => {
    if (!selectedUser?.id) return;
    setLoadingReferrals(true);
    setShowReferralsModal(true);
    try {
      const token = localStorage.getItem('adminToken');
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      const res = await axios.get(`/api/users/${selectedUser.id}/referrals`, { params: { limit: 100 }, headers });
      const apiRefs = res.data?.data?.referrals || [];
      setSelectedUserReferrals(apiRefs);
    } catch (e) {
      toast.error('Failed to load referrals');
      setShowReferralsModal(false);
    } finally {
      setLoadingReferrals(false);
    }
  };

  const loadVoteHistory = async () => {
    if (!selectedUser?.id) return;
    setLoadingVoteHistory(true);
    setShowVoteHistoryModal(true);
    try {
      const token = localStorage.getItem('adminToken');
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      const res = await axios.get(`/api/votes/user/${selectedUser.id}`, { headers });
      setVoteHistory(res.data?.data?.history || []);
    } catch (e) {
      toast.error('Failed to load vote history');
      setShowVoteHistoryModal(false);
    } finally {
      setLoadingVoteHistory(false);
    }
  };

  const handleContributionStatus = async (contribId, action) => {
    try {
      const token = localStorage.getItem('adminToken');
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      if (action === 'verify') {
        await axios.put(`/api/contributions/${contribId}/verify`, {}, { headers });
      } else if (action === 'reject') {
        await axios.put(`/api/contributions/${contribId}/reject`, {}, { headers });
      } else { return; }
      reloadSelectedUserDetails();
      toast.success(`Contribution ${action === 'verify' ? 'verified' : 'rejected'}`);
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update contribution');
    }
  };


  const renderUserDetails = () => {
    if (!selectedUser) return null;

    switch (activeTab) {
      case 'profile':
        return (
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <h5 className="font-medium text-gray-900 mb-3">Profile Information</h5>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
                <div className="flex items-center gap-2"><Mail className="w-4 h-4" /><span>{selectedUser.email || '—'}</span></div>
                <div className="flex items-center gap-2"><MapPin className="w-4 h-4" /><span>{selectedUser.address || '—'}</span></div>
                <div className="flex items-center gap-2"><Phone className="w-4 h-4" /><span>{selectedUser.phone || '—'}</span></div>
                <div className="flex items-center gap-2"><User className="w-4 h-4" /><span>{selectedUser.telegramUsername ? `@${selectedUser.telegramUsername}` : '—'}</span></div>
                <div className="flex items-center gap-2"><Shield className="w-4 h-4" /><span>{selectedUser.walletAddress || '—'}</span></div>
              </div>
            </div>
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-gray-900">Profile</h4>
              <div className="flex gap-2">
                <button onClick={applyEditProfile} className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">Save</button>
                <button onClick={cancelEditProfile} className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">Cancel</button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h5 className="font-medium text-gray-700 mb-3">Personal Information</h5>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1"><span className="text-gray-600">Full Name (Original):</span><span className="font-medium">{selectedUser.fullName}</span></div>
                    <input value={editDraft.fullName} onChange={e => setEditDraft({ ...editDraft, fullName: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="Full Name" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1"><span className="text-gray-600">Email (Original):</span><span className="font-medium">{selectedUser.email}</span></div>
                    <input value={editDraft.email} onChange={e => setEditDraft({ ...editDraft, email: e.target.value })} className="w-full px-3 py-2 border rounded-lg" placeholder="Email" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1"><span className="text-gray-600">Username (Original):</span><span className="font-medium">@{selectedUser.username}</span></div>
                    <input disabled value={selectedUser.username} className="w-full px-3 py-2 border rounded-lg bg-gray-100 text-gray-500" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1"><span className="text-gray-600">Phone (Original):</span><span className="font-medium">{selectedUser.phone}</span></div>
                    <input disabled value={selectedUser.phone || ''} className="w-full px-3 py-2 border rounded-lg bg-gray-100 text-gray-500" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1"><span className="text-gray-600">Date of Birth (Original):</span><span className="font-medium">{new Date(selectedUser.dateOfBirth).toLocaleDateString()}</span></div>
                    <input disabled value={new Date(selectedUser.dateOfBirth).toLocaleDateString()} className="w-full px-3 py-2 border rounded-lg bg-gray-100 text-gray-500" />
                  </div>
                </div>
              </div>

              <div>
                <h5 className="font-medium text-gray-700 mb-3">Account Information</h5>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1"><span className="text-gray-600">Status (Original):</span><span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedUser.status)}`}>{selectedUser.status.charAt(0).toUpperCase() + selectedUser.status.slice(1)}</span></div>
                    <select value={editDraft.status} onChange={e => setEditDraft({ ...editDraft, status: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                    </select>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1"><span className="text-gray-600">Role (Original):</span><span className={`px-2 py-1 text-xs font-medium rounded-full ${getRoleColor(selectedUser.role)}`}>{selectedUser.role.toUpperCase()}</span></div>
                    <select value={editDraft.role} onChange={e => setEditDraft({ ...editDraft, role: e.target.value })} className="w-full px-3 py-2 border rounded-lg">
                      <option value="user">User</option>
                      <option value="moderator">Moderator</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1"><span className="text-gray-600">Verified (Original):</span><span className={`flex items-center gap-1 ${selectedUser.isVerified ? 'text-green-600' : 'text-red-600'}`}>{selectedUser.isVerified ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}{selectedUser.isVerified ? 'Verified' : 'Not Verified'}</span></div>
                    <input disabled value={selectedUser.isVerified ? 'Verified' : 'Not Verified'} className="w-full px-3 py-2 border rounded-lg bg-gray-100 text-gray-500" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1"><span className="text-gray-600">Joined (Original):</span><span className="font-medium">{new Date(selectedUser.joinedAt).toLocaleDateString()}</span></div>
                    <input disabled value={new Date(selectedUser.joinedAt).toLocaleDateString()} className="w-full px-3 py-2 border rounded-lg bg-gray-100 text-gray-500" />
                  </div>

                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div
                onClick={loadVoteHistory}
                className="rounded-lg bg-gradient-to-br from-purple-600/20 to-purple-700/20 p-4 border border-purple-300/30 cursor-pointer hover:bg-purple-600/30 hover:border-purple-400 transition-all duration-200 group"
                title="View voted options"
              >
                <div className="text-sm text-gray-800 flex items-center justify-between">
                  Voting Points
                  <Eye className="w-4 h-4 text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="text-xs text-gray-600 mt-1">Total:</div>
                <div className="text-2xl font-bold text-gray-900">{selectedUser?.points?.voting || 0}</div>
              </div>
              <div className="rounded-lg bg-gradient-to-br from-blue-600/20 to-blue-700/20 p-4 border border-blue-300/30">
                <div className="text-sm text-gray-800">Contribution Points</div>
                <div className="text-xs text-gray-600 mt-1">Total:</div>
                <div className="text-2xl font-bold text-gray-900">{selectedUser?.points?.contributions || 0}</div>
              </div>
              <div
                onClick={loadUserReferrals}
                className="rounded-lg bg-gradient-to-br from-green-600/20 to-green-700/20 p-4 border border-green-300/30 cursor-pointer hover:bg-green-600/30 hover:border-green-400 transition-all duration-200 group"
                title="View referred users"
              >
                <div className="text-sm text-gray-800 flex items-center justify-between">
                  Referral Points
                  <Eye className="w-4 h-4 text-green-600 opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <div className="text-xs text-gray-600 mt-1">Total:</div>
                <div className="text-2xl font-bold text-gray-900">{selectedUser?.points?.referral || 0}</div>
              </div>
            </div>

            {selectedUser.notes && (
              <div>
                <h5 className="font-medium text-gray-700 mb-3">Admin Notes</h5>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">{selectedUser.notes}</p>
              </div>
            )}
          </div>
        );

      case 'activity':

        return (
          <div className="space-y-6">
            <div className="text-center bg-purple-50 p-6 rounded-lg">
              <div className="text-sm text-gray-600 mb-2">Total Points</div>
              <div className="text-4xl font-bold text-gray-900">{totalPointsText}</div>
              <div className="text-gray-500 text-sm">Live points from user activity</div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              <RealDataCard user={selectedUser} onLoadVoteHistory={loadVoteHistory} onLoadReferrals={loadUserReferrals} />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <VoteCard activeRoundsCount={memoActiveRounds} />
              <ContribCard contributionPoints={contributionPointsText} />
            </div>

            <div className="grid grid-cols-1 gap-6">
              <UserDashboardForm
                dashTotalAmount={dashTotalAmount}
                setDashTotalAmount={setDashTotalAmount}
                dashTotalType={dashTotalType}
                setDashTotalType={setDashTotalType}
                dashVotingAmount={dashVotingAmount}
                setDashVotingAmount={setDashVotingAmount}
                dashVotingType={dashVotingType}
                setDashVotingType={setDashVotingType}
                dashContribAmount={dashContribAmount}
                setDashContribAmount={setDashContribAmount}
                dashContribType={dashContribType}
                setDashContribType={setDashContribType}
                dashReferralAmount={dashReferralAmount}
                setDashReferralAmount={setDashReferralAmount}
                dashReferralType={dashReferralType}
                setDashReferralType={setDashReferralType}
                dashVerifiedLoss={dashVerifiedLoss}
                setDashVerifiedLoss={setDashVerifiedLoss}
                dashUnverifiedLoss={dashUnverifiedLoss}
                setDashUnverifiedLoss={setDashUnverifiedLoss}
                dashAmountRestituted={dashAmountRestituted}
                setDashAmountRestituted={setDashAmountRestituted}
                dashRankOverride={dashRankOverride}
                setDashRankOverride={setDashRankOverride}
                dashReason={dashReason}
                setDashReason={setDashReason}
                applyDashboardUpdates={applyDashboardUpdates}
              />
            </div>




          </div>
        );





      default:
        return null;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-gray-900 tracking-tight">User Management</h2>
          <p className="text-xs sm:text-sm text-gray-500 font-medium mt-1">Audit profiles, overrides, and security status</p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <motion.button
            onClick={loadUsers}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            disabled={loading}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-all font-bold text-sm disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Sync
          </motion.button>
          <motion.button
            onClick={exportUsers}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 transition-all shadow-lg shadow-gray-200 font-bold text-sm"
          >
            <Download className="w-4 h-4" />
            Export Data
          </motion.button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between">
        <div className="relative flex-1 max-w-lg">
          <Search className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search name, email, or @username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all font-medium text-sm shadow-sm"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 sm:flex-none">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full sm:w-auto pl-10 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all font-bold text-xs uppercase tracking-widest shadow-sm appearance-none"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          <div className="relative flex-1 sm:flex-none">
            <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="w-full sm:w-auto pl-10 pr-8 py-2.5 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 outline-none transition-all font-bold text-xs uppercase tracking-widest shadow-sm appearance-none"
            >
              <option value="all">All Roles</option>
              <option value="user">User</option>
              <option value="vip">VIP</option>
              <option value="moderator">Moderator</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users List - Card Layout for Mobile, Table for Desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:hidden gap-4">
        {filteredUsers.map((user, index) => (
          <motion.div
            key={user.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            className="bg-white rounded-2xl p-5 shadow-sm border border-gray-100 flex flex-col gap-4"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-100">
                  {user.fullName.charAt(0)}
                </div>
                <div>
                  <div className="font-black text-gray-900 truncate max-w-[150px]">{user.fullName}</div>
                  <div className="text-xs text-gray-400 font-bold uppercase tracking-wider">@{user.username}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <motion.button
                  onClick={() => {
                    setSelectedUser(user);
                    setShowUserModal(true);
                    setActiveTab('profile');
                  }}
                  whileTap={{ scale: 0.95 }}
                  className="p-2.5 bg-indigo-50 text-indigo-600 rounded-xl hover:bg-indigo-100 transition-colors"
                >
                  <Eye className="w-5 h-5" />
                </motion.button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 py-3 border-y border-gray-50">
              <div className="flex flex-col">
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-tighter">Total Points</p>
                <p className="text-sm font-black text-gray-900">{user.points.total}</p>
              </div>
              <div className="flex flex-col">
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-tighter">Voting Points</p>
                <p className="text-sm font-black text-purple-600">{user.points.voting || 0}</p>
              </div>
              <div className="flex flex-col">
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-tighter">Contribution</p>
                <p className="text-sm font-black text-blue-600">{user.points.contributions || 0}</p>
              </div>
              <div className="flex flex-col">
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-tighter">Referral</p>
                <p className="text-sm font-black text-emerald-600">{user.points.referral || 0}</p>
              </div>
            </div>

            <div className="flex items-center justify-between mt-1">
              <div className="flex items-center gap-2">
                <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-full border ${user.status === 'active' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-rose-50 text-rose-700 border-rose-100'}`}>
                  {user.status}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {user.status === 'active' ? (
                  <button
                    onClick={() => handleStatusUpdate(user.id, 'suspended')}
                    className="px-4 py-2 bg-rose-50 text-rose-600 text-xs font-black uppercase tracking-widest rounded-xl border border-rose-100"
                  >
                    Suspend
                  </button>
                ) : (
                  <button
                    onClick={() => handleStatusUpdate(user.id, 'active')}
                    className="px-4 py-2 bg-emerald-50 text-emerald-600 text-xs font-black uppercase tracking-widest rounded-xl border border-emerald-100"
                  >
                    Activate
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="hidden lg:block bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50/50 border-b border-gray-100">
              <tr>
                <th className="pl-8 pr-4 py-5 text-left text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Profile</th>
                <th className="px-4 py-5 text-center text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Total Points</th>
                <th className="px-4 py-5 text-center text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Voting</th>
                <th className="px-4 py-5 text-center text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Contribution</th>
                <th className="px-4 py-5 text-center text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Referral</th>
                <th className="pl-4 pr-8 py-5 text-right text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filteredUsers.map((user, index) => (
                <motion.tr
                  key={user.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="hover:bg-gray-50/50 transition-colors group"
                >
                  <td className="pl-8 pr-4 py-5">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-lg shadow-indigo-100 group-hover:scale-110 transition-transform">
                        {user.fullName.charAt(0)}
                      </div>
                      <div className="min-w-0">
                        <div className="font-black text-gray-900 group-hover:text-indigo-600 transition-colors truncate">{user.fullName}</div>
                        <div className="flex flex-col gap-0.5 mt-0.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-400 font-bold uppercase tracking-wider truncate">@{user.username}</span>
                            <span className="text-[10px] text-gray-300">•</span>
                            <span className="text-[10px] text-indigo-500 font-bold lowercase truncate">{user.email}</span>
                          </div>
                          {user.referredBy && (
                            <div className="flex items-center gap-1 mt-1 px-2 py-0.5 bg-amber-50 border border-amber-100 rounded-md w-fit">
                              <span className="text-[9px] text-amber-600 font-black uppercase tracking-tighter">Referrer:</span>
                              <span className="text-[9px] text-amber-700 font-bold truncate">
                                {user.referredBy.firstName} {user.referredBy.lastName || ''}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>

                  <td className="px-4 py-5 text-center">
                    <div className="text-xl font-black text-gray-900 tracking-tight">{user.points.total}</div>
                  </td>

                  <td className="px-4 py-5 text-center">
                    <div className="text-lg font-black text-purple-600 tracking-tight">{user.points.voting || 0}</div>
                  </td>

                  <td className="px-4 py-5 text-center">
                    <div className="text-lg font-black text-blue-600 tracking-tight">{user.points.contributions || 0}</div>
                  </td>

                  <td className="px-4 py-5 text-center">
                    <div className="text-lg font-black text-emerald-600 tracking-tight">{user.points.referral || 0}</div>
                  </td>

                  <td className="pl-4 pr-8 py-5">
                    <div className="flex items-center justify-end gap-2">
                      <motion.button
                        onClick={() => {
                          setSelectedUser(user);
                          setShowUserModal(true);
                          setActiveTab('profile');
                        }}
                        whileHover={{ scale: 1.1, backgroundColor: '#eef2ff' }}
                        whileTap={{ scale: 0.95 }}
                        className="p-3 text-indigo-600 rounded-2xl hover:shadow-lg hover:shadow-indigo-50 transition-all border border-transparent hover:border-indigo-100"
                        title="View Protocol Details"
                      >
                        <Eye className="w-5 h-5" />
                      </motion.button>

                      {user.status === 'active' ? (
                        <motion.button
                          onClick={() => handleStatusUpdate(user.id, 'suspended')}
                          whileHover={{ scale: 1.1, backgroundColor: '#fff1f2' }}
                          whileTap={{ scale: 0.95 }}
                          className="p-3 text-rose-600 rounded-2xl hover:shadow-lg hover:shadow-rose-50 transition-all border border-transparent hover:border-rose-100"
                          title="Restrict Access"
                        >
                          <Ban className="w-5 h-5" />
                        </motion.button>
                      ) : (
                        <motion.button
                          onClick={() => handleStatusUpdate(user.id, 'active')}
                          whileHover={{ scale: 1.1, backgroundColor: '#ecfdf5' }}
                          whileTap={{ scale: 0.95 }}
                          className="p-3 text-emerald-600 rounded-2xl hover:shadow-lg hover:shadow-emerald-50 transition-all border border-transparent hover:border-emerald-100"
                          title="Grant Entry"
                        >
                          <CheckCircle className="w-5 h-5" />
                        </motion.button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-20 bg-gray-50/30">
            <User className="w-16 h-16 text-gray-200 mx-auto mb-4" />
            <h4 className="text-lg font-black text-gray-400 uppercase tracking-[0.2em]">Null Result</h4>
            <p className="text-xs text-gray-400 font-medium mt-1">No protocol participants match your filter</p>
          </div>
        )}
      </div>

      {/* User Details Modal */}
      <AnimatePresence>
        {showUserModal && selectedUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-blue-500 rounded-full flex items-center justify-center text-white font-medium text-lg">
                    {String(selectedUser?.fullName || selectedUser?.email || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">{selectedUser?.fullName || selectedUser?.email || 'Unknown User'}</h3>
                    <p className="text-gray-600">@{selectedUser?.username || (selectedUser?.email ? selectedUser.email.split('@')[0] : 'user')}</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowUserModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                >
                  <Eye className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-gray-200 mb-6">
                {[
                  { id: 'profile', label: 'Profile', icon: User },
                  { id: 'activity', label: 'Activity', icon: Activity }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-2 px-4 py-2 border-b-2 transition-colors duration-200 ${activeTab === tab.id
                      ? 'border-purple-500 text-purple-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                      }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab Content */}
              {renderUserDetails()}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showReferralsModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[60] p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  Referrals for {selectedUser?.fullName || selectedUser?.username}
                </h3>
                <button
                  onClick={() => setShowReferralsModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                >
                  <XCircle className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              {loadingReferrals ? (
                <div className="py-12 flex justify-center">
                  <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : selectedUserReferrals.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No referrals found for this user.
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedUserReferrals.map((reqRef, idx) => (
                    <div key={idx} className="flex items-start justify-between p-3 border hover:border-green-200 transition-colors bg-gray-50 rounded-lg">
                      <div>
                        <p className="font-semibold text-gray-900">{reqRef.firstName || ''} {reqRef.lastName || ''}</p>
                        <p className="text-sm text-gray-500">{reqRef.email}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs text-gray-400">{new Date(reqRef.createdAt || Date.now()).toLocaleDateString()}</p>
                        <span className={`inline-block mt-1 px-2 py-0.5 text-[10px] font-medium uppercase rounded ${reqRef.status === 'active' ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-700'}`}>
                          {reqRef.status === 'active' ? 'Active' : 'Inactive'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showVoteHistoryModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[70] p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-2xl max-h-[80vh] flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Vote className="w-6 h-6 text-purple-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">
                    Vote History: {selectedUser?.fullName || selectedUser?.username}
                  </h3>
                </div>
                <button
                  onClick={() => setShowVoteHistoryModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                >
                  <XCircle className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
                {loadingVoteHistory ? (
                  <div className="py-20 flex flex-col items-center justify-center gap-4">
                    <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-500 animate-pulse text-sm font-medium">Loading history...</p>
                  </div>
                ) : voteHistory.length === 0 ? (
                  <div className="text-center py-20 flex flex-col items-center gap-4 bg-gray-50 rounded-2xl border-2 border-dashed border-gray-200">
                    <Activity className="w-12 h-12 text-gray-300" />
                    <p className="text-gray-500 font-medium">No votes found in current/past rounds.</p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {voteHistory.map((v, idx) => (
                      <div key={idx} className="p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow group">
                        <div className="flex justify-between items-start gap-4">
                          <div className="flex-1">
                            <h4 className="font-bold text-gray-900 group-hover:text-purple-600 transition-colors">{v.voteTitle}</h4>
                            <div className="flex items-center gap-2 mt-2">
                              <span className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Option Selected:</span>
                              <span className="px-3 py-1 bg-purple-50 text-purple-700 text-sm font-bold rounded-full border border-purple-100 shadow-sm">
                                {v.optionText}
                              </span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              Timestamp
                            </span>
                            <span className="text-xs font-medium text-gray-600 bg-gray-50 px-2 py-1 rounded">
                              {new Date(v.votedAt).toLocaleString()}
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100 flex justify-end">
                <button
                  onClick={() => setShowVoteHistoryModal(false)}
                  className="px-6 py-2 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-colors shadow-lg"
                >
                  Close History
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default UserProfileManagement;

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAdminAuth } from '../../contexts/AdminAuthContext';
import {
  LayoutDashboard,
  Wallet,
  Vote,
  Users,
  Trophy,
  Receipt,
  LogOut,
  Menu,
  X,
  Search,
  Activity,
  DollarSign,
  Clock,
  Shield,
  Eye,
  EyeOff,
  Settings,

} from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { getActivityLog, getDashboardStats } from '../../utils/datastore';

// Import admin components
import WalletManagement from './components/WalletManagement';
import PointsRanking from './components/PointsRanking';
import VotingManagement from './components/VotingManagement';
import ContributionReceipts from './components/ContributionReceipts';
import ContributionTimer from './components/ContributionTimer';
import JoinApplications from './components/JoinApplications';
import UserProfileManagement from './components/UserProfileManagement';
import VirtualUsers from './components/VirtualUsers';
import UserVotingRights from './components/UserVotingRights';
import TopChampionsManagement from './components/TopChampionsManagement';
import AdminSettingsPanel from './components/AdminSettingsPanel';
import SystemSettings from './SystemSettings';

const AdminDashboard = () => {
  const { section } = useParams();
  const navigate = useNavigate();
  const [activeSection, setActiveSection] = useState(section || 'dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notifications, setNotifications] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({
    totalUsers: 0,
    realUsers: 0,
    virtualUsers: 0,
    activeVotes: 0,
    totalPoints: 0,
    totalVotesSubmitted: 0,
    pendingContributions: 0
  });

  const { admin, logout, hasPermission, requestPasswordOtp, changeAdminPassword } = useAdminAuth();
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [changing, setChanging] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    // Load dashboard statistics
    loadDashboardStats();
    loadNotifications();

    // Auto-refresh on datastore updates
    const onUpdate = () => {
      loadDashboardStats();
      loadNotifications();
    };
    window.addEventListener('datastore:update', onUpdate);

    // WebSocket connection for real-time updates
    let ws = null;
    let reconnectTimeout = null;
    let reconnectAttempts = 0;
    const maxReconnectAttempts = 5;

    const connectWebSocket = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname;
        const port = window.location.port;
        let primaryUrl = `${protocol}//${host}${port ? `:${port}` : ''}/ws`;
        let fallbackUrl = `${protocol}//${host}:3000/ws`;
        const explicit = process.env.REACT_APP_WS_URL;
        if (explicit && typeof explicit === 'string' && explicit.trim()) {
          primaryUrl = explicit.trim();
          fallbackUrl = explicit.trim();
        }
        let usedFallback = false;
        ws = new WebSocket(primaryUrl);

        ws.onopen = () => {
          console.log('Admin WebSocket connected');
          reconnectAttempts = 0;
        };

        ws.onmessage = (ev) => {
          try {
            const payload = JSON.parse(ev.data);
            console.log('Admin Dashboard received WebSocket event:', payload.type);
            if (payload && payload.type) {
              // Match all user-related events
              if (/user_(vote|contribution|referral|points|voting|status|updated|registered|deleted|overrides|voting_updated)/i.test(payload.type)) {
                console.log('Admin Dashboard: Reloading due to user event:', payload.type);
                loadDashboardStats();
                loadNotifications();
              }
              // Match vote status changes and updates
              if (/vote_(started|paused|resumed|completed|created|updated|deleted)/i.test(payload.type)) {
                console.log('Admin Dashboard: Reloading due to vote event:', payload.type);
                loadDashboardStats();
                loadNotifications();
              }
              // Match contribution status changes
              if (/contribution_(approved|rejected|verified|submitted)/i.test(payload.type)) {
                console.log('Admin Dashboard: Reloading due to contribution event:', payload.type);
                loadDashboardStats();
                loadNotifications();
              }
              // Match general users events
              if (/users?_(updated|fetched)/i.test(payload.type)) {
                console.log('Admin Dashboard: Reloading due to users event:', payload.type);
                loadDashboardStats();
                loadNotifications();
              }
            }
          } catch (err) {
            console.error('Error parsing WebSocket message:', err);
          }
        };

        ws.onerror = (error) => {
          console.error('Admin WebSocket error:', error);
        };

        ws.onclose = () => {
          console.log('Admin WebSocket disconnected');
          if (!usedFallback && port && port !== '3000' && !explicit) {
            usedFallback = true;
            try {
              ws = new WebSocket(fallbackUrl);
              ws.onopen = () => {
                console.log('Admin WebSocket connected (fallback)');
                reconnectAttempts = 0;
              };
              ws.onmessage = (ev) => {
                try {
                  const payload = JSON.parse(ev.data);
                  console.log('Admin Dashboard received WebSocket event:', payload.type);
                  if (payload && payload.type) {
                    if (/user_(vote|contribution|referral|points|voting|status|updated|registered|deleted|overrides|voting_updated)/i.test(payload.type)) {
                      loadDashboardStats();
                      loadNotifications();
                    }
                    if (/vote_(started|paused|resumed|completed|created|updated|deleted)/i.test(payload.type)) {
                      loadDashboardStats();
                      loadNotifications();
                    }
                    if (/contribution_(approved|rejected|verified|submitted)/i.test(payload.type)) {
                      loadDashboardStats();
                      loadNotifications();
                    }
                    if (/users?_(updated|fetched)/i.test(payload.type)) {
                      loadDashboardStats();
                      loadNotifications();
                    }
                  }
                } catch (err) {
                  console.error('Error parsing WebSocket message:', err);
                }
              };
              ws.onerror = (error) => {
                console.error('Admin WebSocket error (fallback):', error);
              };
              ws.onclose = () => {
                console.log('Admin WebSocket disconnected (fallback)');
                ws = null;
                if (reconnectAttempts < maxReconnectAttempts) {
                  reconnectAttempts++;
                  reconnectTimeout = setTimeout(() => {
                    connectWebSocket();
                  }, Math.min(1000 * Math.pow(2, reconnectAttempts), 30000));
                }
              };
              return;
            } catch (e) {
              console.error('Admin WebSocket fallback error:', e);
            }
          }
          ws = null;
          if (reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            reconnectTimeout = setTimeout(() => {
              connectWebSocket();
            }, Math.min(1000 * Math.pow(2, reconnectAttempts), 30000));
          }
        };
      } catch (err) {
        console.error('Error creating Admin WebSocket connection:', err);
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
  }, []);

  const loadDashboardStats = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        setDashboardStats({ totalUsers: 0, realUsers: 0, virtualUsers: 0, activeVotes: 0, totalPoints: 0, totalVotesSubmitted: 0, pendingContributions: 0 });
        toast.error('Admin authentication required');
        return;
      }
      const headers = { Authorization: `Bearer ${token}` };
      const [usersRes, votesRes, contribRes] = await Promise.all([
        axios.get('/api/users/stats', { headers }),
        axios.get('/api/votes', { params: { limit: 200 }, headers }),
        axios.get('/api/contributions', { params: { status: 'pending' }, headers })
      ]);
      const s = usersRes.data?.data?.stats || {};
      const votes = votesRes.data?.data?.votes || [];
      const active = votes.filter(v => String(v.status) === 'active').length;
      const totalSubmitted = votes.reduce((acc, v) => acc + (Number(v.totalVotes) || 0), 0);
      const pending = (contribRes.data?.data?.contributions || []).length;
      setDashboardStats({
        totalUsers: s.totalUsers || 0,
        realUsers: s.realUsers || 0,
        virtualUsers: s.virtualUsers || 0,
        activeVotes: active || 0,
        totalPoints: s.totalPoints || 0,
        totalVotesSubmitted: (s.totalVotesSubmitted || 0) || (totalSubmitted || 0),
        pendingContributions: pending || 0
      });
    } catch (error) {
      setDashboardStats({ totalUsers: 0, realUsers: 0, virtualUsers: 0, activeVotes: 0, totalPoints: 0, totalVotesSubmitted: 0, pendingContributions: 0 });
      const msg = error?.response?.data?.message || 'Failed to load dashboard stats';
      toast.error(msg);
    }
  };

  const loadNotifications = () => {
    try {
      const log = getActivityLog();
      setNotifications(log.slice(0, 20));
    } catch (_) {
      setNotifications([]);
    }
  };

  const handleLogout = () => {
    logout();
    toast.success('Logged out successfully');
  };

  const menuItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      permission: null
    },
    {
      id: 'users',
      label: 'User Management',
      icon: Users,
      permission: 'user_management'
    },
    {
      id: 'virtual-users',
      label: 'Virtual Users',
      icon: Users,
      permission: 'user_management'
    },
    {
      id: 'user-voting-rights',
      label: 'User Voting Rights',
      icon: Shield,
      permission: 'voting_management'
    },
    {
      id: 'wallet',
      label: 'Wallet & QR Codes',
      icon: Wallet,
      permission: 'wallet_management'
    },
    {
      id: 'voting',
      label: 'Voting Management',
      icon: Vote,
      permission: 'voting_management'
    },
    {
      id: 'contribution-timer',
      label: 'Contribution Timer',
      icon: Clock,
      permission: 'contribution_management'
    },
    {
      id: 'join-applications',
      label: 'Join Applications',
      icon: Users,
      permission: 'user_management'
    },
    {
      id: 'points',
      label: 'Points & Ranking',
      icon: Trophy,
      permission: 'points_management'
    },
    {
      id: 'top-champions',
      label: 'Top Champions',
      icon: Trophy,
      permission: 'points_management'
    },
    {
      id: 'contributions',
      label: 'Contribution Receipts',
      icon: Receipt,
      permission: 'contribution_management'
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      permission: null
    },
  ];

  const filteredMenuItems = menuItems.filter(item =>
    !item.permission || hasPermission(item.permission)
  );

  useEffect(() => {
    const allowed = new Set(['dashboard', 'users', 'virtual-users', 'wallet', 'voting', 'user-voting-rights', 'contribution-timer', 'join-applications', 'points', 'contributions', 'top-champions', 'settings']);
    if (section && section !== activeSection) {
      setActiveSection(allowed.has(section) ? section : 'dashboard');
    }
  }, [section, activeSection]);

  const renderDashboardOverview = () => (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold mb-2">Welcome back, {admin?.username}!</h1>
            <p className="text-purple-100">Here's what's happening with your DOA platform today.</p>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 cursor-pointer"
          onClick={() => { setActiveSection('users'); navigate('/admin/users'); }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Real Users</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardStats.realUsers.toLocaleString()}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 cursor-pointer"
          onClick={() => { setActiveSection('virtual-users'); navigate('/admin/virtual-users'); }}
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Virtual Users</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardStats.virtualUsers.toLocaleString()}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <Users className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-white rounded-xl p-6 shadow-lg border border-gray-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Active Votes</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardStats.activeVotes}</p>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <Vote className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-white rounded-xl p-6 shadow-lg border border-gray-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Total Votes Submitted</p>
              <p className="text-2xl font-bold text-gray-900">{(dashboardStats.totalVotesSubmitted || 0).toLocaleString()}</p>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <Activity className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-white rounded-xl p-6 shadow-lg border border-gray-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Total Points</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardStats.totalPoints.toLocaleString()}</p>
            </div>
            <div className="bg-yellow-100 p-3 rounded-lg">
              <DollarSign className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </motion.div>

        <motion.div
          whileHover={{ scale: 1.02 }}
          className="bg-white rounded-xl p-6 shadow-lg border border-gray-200"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-600 text-sm font-medium">Pending Contributions</p>
              <p className="text-2xl font-bold text-gray-900">{dashboardStats.pendingContributions}</p>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <Receipt className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {notifications.length === 0 && (
              <div className="p-3 bg-gray-50 rounded-lg text-sm text-gray-500">No activity yet</div>
            )}
            {notifications.length > 0 && notifications.map((n) => (
              <div key={n.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <Activity className="w-4 h-4 text-gray-600" />
                  <div>
                    <p className="text-sm font-medium text-gray-800">{n.message}</p>
                    <p className="text-xs text-gray-600">{n.userEmail || 'system'} • {n.type}</p>
                  </div>
                </div>
                <span className="text-xs text-gray-500">{new Date(n.time).toLocaleTimeString()}</span>
              </div>
            ))}
          </div>
        </div>




      </div>
    </div>
  );


  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return renderDashboardOverview();
      case 'wallet':
        return <WalletManagement />;
      case 'users':
        return <UserProfileManagement />;
      case 'virtual-users':
        return <VirtualUsers />;
      case 'voting':
        return <VotingManagement />;
      case 'user-voting-rights':
        return <UserVotingRights />;
      case 'contribution-timer':
        return <ContributionTimer />;
      case 'points':
        return <PointsRanking />;
      case 'contributions':
        return <ContributionReceipts />;
      case 'join-applications':
        return <JoinApplications />;
      case 'top-champions':
        return <TopChampionsManagement />;
      case 'settings':
        return <AdminSettingsPanel />;
      default:
        return renderDashboardOverview();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed lg:relative z-30 w-64 h-full bg-white shadow-xl border-r border-gray-200"
          >
            <div className="flex flex-col h-full">
              {/* Sidebar Header */}
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                    <Shield className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-gray-900">DOA Admin</h2>
                    <p className="text-xs text-gray-500">Control Panel</p>
                  </div>
                </div>
              </div>

              {/* Navigation Menu */}
              <nav className="flex-1 p-4 space-y-2">
                {filteredMenuItems.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeSection === item.id;

                  return (
                    <motion.button
                      key={item.id}
                      onClick={() => { setActiveSection(item.id); navigate(`/admin/${item.id}`); }}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-all duration-200 ${isActive
                        ? 'bg-gradient-to-r from-purple-600 to-blue-600 text-white shadow-lg'
                        : 'text-gray-700 hover:bg-gray-100'
                        }`}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="font-medium">{item.label}</span>
                    </motion.button>
                  );
                })}
              </nav>

              {/* Admin Info & Logout */}
              <div className="p-4 border-t border-gray-200">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 font-medium text-sm">
                      {admin?.username?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{admin?.username}</p>
                    <p className="text-xs text-gray-500">{admin?.role}</p>
                  </div>
                </div>
                <motion.button
                  onClick={handleLogout}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="w-full flex items-center gap-3 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors duration-200"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="text-sm font-medium">Logout</span>
                </motion.button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-screen">
        {/* Top Header */}
        <header className="bg-white shadow-sm border-b border-gray-200 px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => setSidebarOpen(!sidebarOpen)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
              >
                {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
              <h1 className="text-xl font-semibold text-gray-900 capitalize">
                {activeSection === 'dashboard' ? 'Dashboard Overview' : activeSection.replace(/([A-Z])/g, ' $1')}
              </h1>
            </div>

            <div className="flex items-center gap-4">
              {/* Search */}
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>


            </div>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-auto">
          <motion.div
            key={activeSection}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            {renderContent()}
          </motion.div>
        </main>
      </div>

      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default AdminDashboard;

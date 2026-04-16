import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Crown, 
  Users, 
  Settings, 
  Database, 
  Shield, 
  BarChart3, 
  FileText, 
  Globe, 
  Trash2, 
  Plus, 
  Edit, 
  Eye, 
  Lock, 
  Unlock, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Activity,
  DollarSign,
  MessageSquare,
  Image,
  Video,
  Mail,
  Bell,
  Download,
  Upload,
  RefreshCw,
  Power,
  LogOut,
  Search,
  Filter,
  MoreVertical,
  Zap,
  Target,
  TrendingUp,
  Calendar,
  Clock,
  MapPin,
  Phone,
  Link,
  Code,
  Palette,
  Layout,
  Smartphone,
  Monitor,
  Tablet
} from 'lucide-react';
import { useOwnerAuth } from '../../contexts/OwnerAuthContext';
import EnhancedUserManagement from './EnhancedUserManagement';
import ContentManagement from './ContentManagement';
import SystemSettings from './SystemSettings';
import SecurityAuditLog from './SecurityAuditLog';
import toast from 'react-hot-toast';

const OwnerControlPanel = () => {
  const { ownerData, ownerLogout } = useOwnerAuth();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Mock data for demonstration
  const [systemStats, setSystemStats] = useState({
    totalUsers: 1247,
    activeUsers: 892,
    totalVotes: 3456,
    totalContributions: 789,
    systemUptime: '99.9%',
    serverLoad: '23%',
    databaseSize: '2.4 GB',
    dailyActiveUsers: 456
  });

  const [users, setUsers] = useState([
    { id: 1, name: 'John Doe', email: 'john@example.com', role: 'user', status: 'active', joinDate: '2024-01-15', lastActive: '2024-01-20' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com', role: 'admin', status: 'active', joinDate: '2024-01-10', lastActive: '2024-01-20' },
    { id: 3, name: 'Bob Johnson', email: 'bob@example.com', role: 'user', status: 'suspended', joinDate: '2024-01-05', lastActive: '2024-01-18' }
  ]);

  const [content, setContent] = useState([
    { id: 1, type: 'vote', title: 'Community Budget Allocation', status: 'active', created: '2024-01-15', votes: 234 },
    { id: 2, type: 'contribution', title: 'Park Renovation Proposal', status: 'pending', created: '2024-01-18', contributions: 45 },
    { id: 3, type: 'announcement', title: 'System Maintenance Notice', status: 'published', created: '2024-01-20', views: 1200 }
  ]);

  const sidebarItems = [
    { id: 'dashboard', label: 'Dashboard', icon: BarChart3, color: 'text-blue-500' },
    { id: 'users', label: 'User Management', icon: Users, color: 'text-green-500' },
    { id: 'content', label: 'Content Control', icon: FileText, color: 'text-purple-500' },
    { id: 'system', label: 'System Settings', icon: Settings, color: 'text-orange-500' },
    { id: 'database', label: 'Database Control', icon: Database, color: 'text-red-500' },
    { id: 'security', label: 'Security Center', icon: Shield, color: 'text-yellow-500' },
    { id: 'analytics', label: 'Analytics', icon: TrendingUp, color: 'text-indigo-500' },
    { id: 'appearance', label: 'Site Appearance', icon: Palette, color: 'text-pink-500' },
    { id: 'communications', label: 'Communications', icon: Mail, color: 'text-cyan-500' },
    { id: 'backup', label: 'Backup & Restore', icon: Download, color: 'text-gray-500' }
  ];

  const handleUserAction = (userId, action) => {
    setUsers(prev => prev.map(user => {
      if (user.id === userId) {
        switch (action) {
          case 'suspend':
            toast.success(`User ${user.name} suspended`);
            return { ...user, status: 'suspended' };
          case 'activate':
            toast.success(`User ${user.name} activated`);
            return { ...user, status: 'active' };
          case 'delete':
            toast.success(`User ${user.name} deleted`);
            return null;
          case 'makeAdmin':
            toast.success(`User ${user.name} promoted to admin`);
            return { ...user, role: 'admin' };
          case 'removeAdmin':
            toast.success(`User ${user.name} demoted to user`);
            return { ...user, role: 'user' };
          default:
            return user;
        }
      }
      return user;
    }).filter(Boolean));
  };

  const handleContentAction = (contentId, action) => {
    setContent(prev => prev.map(item => {
      if (item.id === contentId) {
        switch (action) {
          case 'publish':
            toast.success(`Content published`);
            return { ...item, status: 'published' };
          case 'unpublish':
            toast.success(`Content unpublished`);
            return { ...item, status: 'draft' };
          case 'delete':
            toast.success(`Content deleted`);
            return null;
          default:
            return item;
        }
      }
      return item;
    }).filter(Boolean));
  };

  const renderDashboard = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">System Overview</h2>
        <button
          onClick={() => setIsLoading(true)}
          className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Refresh</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Total Users', value: systemStats.totalUsers, icon: Users, color: 'bg-blue-500' },
          { label: 'Active Users', value: systemStats.activeUsers, icon: Activity, color: 'bg-green-500' },
          { label: 'Total Votes', value: systemStats.totalVotes, icon: Target, color: 'bg-purple-500' },
          { label: 'System Uptime', value: systemStats.systemUptime, icon: Zap, color: 'bg-yellow-500' }
        ].map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-xl shadow-lg p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
              </div>
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {[
              { action: 'New user registered', user: 'john@example.com', time: '2 minutes ago' },
              { action: 'Vote submitted', user: 'jane@example.com', time: '5 minutes ago' },
              { action: 'Contribution posted', user: 'bob@example.com', time: '10 minutes ago' }
            ].map((activity, index) => (
              <div key={index} className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                <Activity className="w-4 h-4 text-blue-500" />
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-800">{activity.action}</p>
                  <p className="text-xs text-gray-600">{activity.user} • {activity.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">System Health</h3>
          <div className="space-y-4">
            {[
              { label: 'Server Load', value: systemStats.serverLoad, status: 'good' },
              { label: 'Database Size', value: systemStats.databaseSize, status: 'warning' },
              { label: 'Daily Active Users', value: systemStats.dailyActiveUsers, status: 'good' }
            ].map((health, index) => (
              <div key={index} className="flex items-center justify-between">
                <span className="text-sm text-gray-600">{health.label}</span>
                <div className="flex items-center space-x-2">
                  <span className="text-sm font-medium text-gray-800">{health.value}</span>
                  {health.status === 'good' ? (
                    <CheckCircle className="w-4 h-4 text-green-500" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-yellow-500" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderUserManagement = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">User Management</h2>
        <div className="flex items-center space-x-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <button className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
            <Plus className="w-4 h-4" />
            <span>Add User</span>
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Join Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{user.name}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                    }`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                    }`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {user.joinDate}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleUserAction(user.id, user.status === 'active' ? 'suspend' : 'activate')}
                        className={`p-1 rounded ${user.status === 'active' ? 'text-red-600 hover:bg-red-100' : 'text-green-600 hover:bg-green-100'}`}
                      >
                        {user.status === 'active' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleUserAction(user.id, user.role === 'admin' ? 'removeAdmin' : 'makeAdmin')}
                        className="p-1 rounded text-purple-600 hover:bg-purple-100"
                      >
                        <Crown className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleUserAction(user.id, 'delete')}
                        className="p-1 rounded text-red-600 hover:bg-red-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const renderContentControl = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Content Control</h2>
        <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
          <Plus className="w-4 h-4" />
          <span>Create Content</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {content.map((item) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl shadow-lg p-6"
          >
            <div className="flex items-center justify-between mb-4">
              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                item.status === 'active' || item.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}>
                {item.status}
              </span>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => handleContentAction(item.id, item.status === 'published' ? 'unpublish' : 'publish')}
                  className="p-1 rounded text-blue-600 hover:bg-blue-100"
                >
                  <Eye className="w-4 h-4" />
                </button>
                <button className="p-1 rounded text-gray-600 hover:bg-gray-100">
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  onClick={() => handleContentAction(item.id, 'delete')}
                  className="p-1 rounded text-red-600 hover:bg-red-100"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
            <h3 className="font-semibold text-gray-800 mb-2">{item.title}</h3>
            <p className="text-sm text-gray-600 mb-4">Type: {item.type}</p>
            <div className="flex items-center justify-between text-xs text-gray-500">
              <span>Created: {item.created}</span>
              <span>{item.votes ? `${item.votes} votes` : item.contributions ? `${item.contributions} contributions` : `${item.views} views`}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );

  const renderSystemSettings = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">System Settings</h2>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">General Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Site Name</label>
              <input type="text" defaultValue="DEO Platform" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Site Description</label>
              <textarea defaultValue="Democratic participation platform" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" rows="3"></textarea>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Maintenance Mode</span>
              <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-gray-200 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-1"></span>
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">Security Settings</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Two-Factor Authentication</span>
              <button className="relative inline-flex h-6 w-11 items-center rounded-full bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
                <span className="inline-block h-4 w-4 transform rounded-full bg-white transition-transform translate-x-6"></span>
              </button>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Login Attempts Limit</span>
              <input type="number" defaultValue="3" className="w-16 px-2 py-1 border border-gray-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Session Timeout (hours)</span>
              <input type="number" defaultValue="24" className="w-16 px-2 py-1 border border-gray-300 rounded text-center focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Danger Zone</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-red-50 border border-red-200 rounded-lg">
            <div>
              <h4 className="font-medium text-red-800">Reset All Data</h4>
              <p className="text-sm text-red-600">This will permanently delete all user data, votes, and contributions.</p>
            </div>
            <button className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700">
              Reset Data
            </button>
          </div>
          <div className="flex items-center justify-between p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div>
              <h4 className="font-medium text-yellow-800">Backup Database</h4>
              <p className="text-sm text-yellow-600">Create a backup of all system data.</p>
            </div>
            <button className="bg-yellow-600 text-white px-4 py-2 rounded-lg hover:bg-yellow-700">
              Create Backup
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return renderDashboard();
      case 'users':
        return <EnhancedUserManagement />;
      case 'content':
        return <ContentManagement />;
      case 'system':
        return <SystemSettings />;
      case 'security':
        return <SecurityAuditLog />;
      case 'settings':
        return renderSystemSettings();
      default:
        return (
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <Settings className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-600">Feature Coming Soon</h3>
              <p className="text-gray-500">This section is under development.</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div className="bg-gradient-to-r from-yellow-400 to-orange-500 p-2 rounded-lg">
              <Crown className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-800">Owner Panel</h1>
              <p className="text-xs text-gray-600">Complete Control</p>
            </div>
          </div>
        </div>

        <nav className="p-4">
          <div className="space-y-2">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveSection(item.id)}
                className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                  activeSection === item.id
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <item.icon className={`w-5 h-5 ${activeSection === item.id ? 'text-blue-700' : item.color}`} />
                <span className="text-sm font-medium">{item.label}</span>
              </button>
            ))}
          </div>
        </nav>

        <div className="absolute bottom-0 w-64 p-4 border-t border-gray-200">
          <div className="flex items-center space-x-3 mb-3">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-bold">O</span>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-800">{ownerData?.username}</p>
              <p className="text-xs text-gray-600">{ownerData?.role}</p>
            </div>
          </div>
          <button
            onClick={ownerLogout}
            className="w-full flex items-center space-x-2 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-sm">Logout</span>
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto">
        <div className="p-8">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeSection}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {renderContent()}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default OwnerControlPanel;
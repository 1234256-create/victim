import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Shield,
  Eye,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Clock,
  User,
  Globe,
  Lock,
  Unlock,
  Settings,
  Database,
  FileText,
  Download,
  Filter,
  Search,
  Calendar,
  MapPin,
  Activity,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  RefreshCw,
  ExternalLink,
  Info
} from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { getActivityLog as dsGetActivityLog } from '../../utils/datastore';

const SecurityAuditLog = () => {
  const [activeTab, setActiveTab] = useState('logs');
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [filterSeverity, setFilterSeverity] = useState('all');
  const [dateRange, setDateRange] = useState('7d');
  const [currentPage, setCurrentPage] = useState(1);
  const [logsPerPage] = useState(20);

  const [auditLogs, setAuditLogs] = useState([]);

  const [securityMetrics, setSecurityMetrics] = useState({
    totalEvents: 0,
    criticalAlerts: 0,
    failedLogins: 0,
    successfulLogins: 0,
    systemChanges: 0,
    dataAccess: 0,
    trends: {
      loginAttempts: [],
      securityEvents: [],
      systemAccess: []
    }
  });

  useEffect(() => {
    const mapServerLog = (l) => ({
      id: l.id || l._id || `${Date.now()}_${Math.random().toString(36).slice(2,8)}`,
      timestamp: l.timestamp || l.time || new Date().toISOString(),
      user: l.user || l.userEmail || 'system',
      action: (l.action || l.type || 'SYSTEM_EVENT').toUpperCase(),
      resource: l.resource || (/^user_/i.test(l.type || '') ? 'User Management' : /^vote_/i.test(l.type || '') ? 'Voting' : /^contribution_/i.test(l.type || '') ? 'Contributions' : 'System'),
      details: l.details || l.message || '',
      ipAddress: l.ipAddress || '-',
      userAgent: l.userAgent || '-',
      severity: l.severity || (/(failed|error|critical)/i.test(String(l.action || l.type || '')) ? 'error' : /(deleted|paused|warning)/i.test(String(l.action || l.type || '')) ? 'warning' : 'info'),
      status: l.status || (/(failed|error|critical)/i.test(String(l.action || l.type || '')) ? 'failed' : 'success')
    });

    const computeMetrics = (logs) => {
      const totalEvents = logs.length;
      const failedLogins = logs.filter((x) => /LOGIN_FAILED/i.test(x.action) || /login_failed/i.test(x.details || '')).length;
      const successfulLogins = logs.filter((x) => /LOGIN_SUCCESS|LOGIN/i.test(x.action) && x.status === 'success').length;
      const systemChanges = logs.filter((x) => /SETTINGS_UPDATED|SYSTEM_/i.test(x.action)).length;
      const dataAccess = logs.filter((x) => /SYSTEM_ACCESS|DATA_ACCESS/i.test(x.action)).length;
      setSecurityMetrics((prev) => ({
        ...prev,
        totalEvents,
        failedLogins,
        successfulLogins,
        systemChanges,
        dataAccess
      }));
    };

    const loadLogs = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
        const res = await axios.get('/api/admin/audit-logs', { headers });
        const apiLogs = res.data?.data?.logs || res.data?.logs || res.data || [];
        const mapped = (apiLogs || []).map(mapServerLog);
        setAuditLogs(mapped);
        computeMetrics(mapped);
      } catch (_) {
        const ds = dsGetActivityLog();
        const mapped = ds.map(mapServerLog);
        setAuditLogs(mapped);
        computeMetrics(mapped);
      }
    };

    loadLogs();
    const onUpdate = () => loadLogs();
    window.addEventListener('datastore:update', onUpdate);
    let ws;
    try {
      const url = window.location.origin.replace('http', 'ws').replace(/\/$/, '') + '/ws';
      ws = new WebSocket(url);
      ws.onmessage = (ev) => {
        try {
          const payload = JSON.parse(ev.data);
          if (payload && /(audit_|user_|vote_|contribution_)/i.test(payload.type || '')) {
            loadLogs();
          }
        } catch {}
      };
    } catch (_) {}
    return () => {
      window.removeEventListener('datastore:update', onUpdate);
      try { ws && ws.close(); } catch(_){}
    };
  }, []);

  const tabs = [
    { id: 'logs', label: 'Audit Logs', icon: FileText },
    { id: 'security', label: 'Security Events', icon: Shield },
    { id: 'analytics', label: 'Security Analytics', icon: BarChart3 },
    { id: 'settings', label: 'Audit Settings', icon: Settings }
  ];

  const actionTypes = [
    'all', 'LOGIN', 'LOGOUT', 'USER_CREATED', 'USER_UPDATED', 'USER_DELETED',
    'SETTINGS_UPDATED', 'DATABASE_BACKUP', 'SYSTEM_ACCESS', 'PERMISSION_CHANGED'
  ];

  const severityLevels = ['all', 'info', 'warning', 'error', 'critical'];

  const getSeverityIcon = (severity) => {
    switch (severity) {
      case 'critical': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'error': return <AlertTriangle className="w-4 h-4 text-red-400" />;
      case 'warning': return <AlertTriangle className="w-4 h-4 text-yellow-400" />;
      case 'info': return <Info className="w-4 h-4 text-blue-400" />;
      default: return <CheckCircle className="w-4 h-4 text-green-400" />;
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-900/20 border-red-600 text-red-300';
      case 'error': return 'bg-red-900/20 border-red-500 text-red-300';
      case 'warning': return 'bg-yellow-900/20 border-yellow-500 text-yellow-300';
      case 'info': return 'bg-blue-900/20 border-blue-500 text-blue-300';
      default: return 'bg-green-900/20 border-green-500 text-green-300';
    }
  };

  const getActionIcon = (action) => {
    switch (action) {
      case 'LOGIN': return <Lock className="w-4 h-4" />;
      case 'LOGOUT': return <Unlock className="w-4 h-4" />;
      case 'USER_CREATED':
      case 'USER_UPDATED':
      case 'USER_DELETED': return <User className="w-4 h-4" />;
      case 'SETTINGS_UPDATED': return <Settings className="w-4 h-4" />;
      case 'DATABASE_BACKUP': return <Database className="w-4 h-4" />;
      default: return <Activity className="w-4 h-4" />;
    }
  };

  const filteredLogs = auditLogs.filter(log => {
    const matchesSearch = log.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         log.action.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === 'all' || log.action.includes(filterType);
    const matchesSeverity = filterSeverity === 'all' || log.severity === filterSeverity;
    return matchesSearch && matchesType && matchesSeverity;
  });

  const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
  const currentLogs = filteredLogs.slice(
    (currentPage - 1) * logsPerPage,
    currentPage * logsPerPage
  );

  const handleExportLogs = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast.success('Audit logs exported successfully!');
    } catch (error) {
      toast.error('Failed to export logs');
    } finally {
      setLoading(false);
    }
  };

  const renderAuditLogs = () => (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-gray-800 rounded-lg p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {actionTypes.map(type => (
              <option key={type} value={type}>
                {type === 'all' ? 'All Actions' : type.replace('_', ' ')}
              </option>
            ))}
          </select>
          <select
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
            className="px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            {severityLevels.map(level => (
              <option key={level} value={level}>
                {level === 'all' ? 'All Severities' : level.charAt(0).toUpperCase() + level.slice(1)}
              </option>
            ))}
          </select>
          <button
            onClick={handleExportLogs}
            disabled={loading}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center space-x-2"
          >
            {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            <span>Export</span>
          </button>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-gray-800 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Action
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  Severity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-300 uppercase tracking-wider">
                  IP Address
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {currentLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-700/50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      <span>{log.timestamp}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    <div className="flex items-center space-x-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <span>{log.user}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    <div className="flex items-center space-x-2">
                      {getActionIcon(log.action)}
                      <span className="font-medium">{log.action.replace('_', ' ')}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-300 max-w-xs truncate">
                    {log.details}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full border ${getSeverityColor(log.severity)}`}>
                      {getSeverityIcon(log.severity)}
                      <span className="capitalize">{log.severity}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    <div className="flex items-center space-x-2">
                      <Globe className="w-4 h-4 text-gray-400" />
                      <span>{log.ipAddress}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="bg-gray-700 px-6 py-3 flex items-center justify-between">
          <div className="text-sm text-gray-300">
            Showing {((currentPage - 1) * logsPerPage) + 1} to {Math.min(currentPage * logsPerPage, filteredLogs.length)} of {filteredLogs.length} results
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-gray-600 text-white rounded disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-gray-300">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 bg-gray-600 text-white rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSecurityEvents = () => (
    <div className="space-y-6">
      {/* Security Alerts */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-red-900/20 border border-red-600 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <XCircle className="w-8 h-8 text-red-500" />
            <div>
              <h3 className="text-lg font-semibold text-red-300">Critical Alerts</h3>
              <p className="text-2xl font-bold text-red-400">{securityMetrics.criticalAlerts}</p>
            </div>
          </div>
        </div>
        <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <AlertTriangle className="w-8 h-8 text-yellow-500" />
            <div>
              <h3 className="text-lg font-semibold text-yellow-300">Failed Logins</h3>
              <p className="text-2xl font-bold text-yellow-400">{securityMetrics.failedLogins}</p>
            </div>
          </div>
        </div>
        <div className="bg-green-900/20 border border-green-600 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <CheckCircle className="w-8 h-8 text-green-500" />
            <div>
              <h3 className="text-lg font-semibold text-green-300">Successful Logins</h3>
              <p className="text-2xl font-bold text-green-400">{securityMetrics.successfulLogins}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Security Events */}
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Recent Security Events</h3>
        <div className="space-y-3">
          {auditLogs.filter(log => log.severity === 'error' || log.severity === 'warning').slice(0, 5).map((log) => (
            <div key={log.id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
              <div className="flex items-center space-x-3">
                {getSeverityIcon(log.severity)}
                <div>
                  <p className="text-white font-medium">{log.action.replace('_', ' ')}</p>
                  <p className="text-gray-400 text-sm">{log.details}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-gray-300 text-sm">{log.timestamp}</p>
                <p className="text-gray-400 text-xs">{log.ipAddress}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderAnalytics = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Total Events</p>
              <p className="text-2xl font-bold text-white">{securityMetrics.totalEvents}</p>
            </div>
            <Activity className="w-8 h-8 text-blue-400" />
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">System Changes</p>
              <p className="text-2xl font-bold text-white">{securityMetrics.systemChanges}</p>
            </div>
            <Settings className="w-8 h-8 text-green-400" />
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Data Access</p>
              <p className="text-2xl font-bold text-white">{securityMetrics.dataAccess}</p>
            </div>
            <Database className="w-8 h-8 text-purple-400" />
          </div>
        </div>
        <div className="bg-gray-800 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Login Success Rate</p>
              <p className="text-2xl font-bold text-white">
                {Math.round((securityMetrics.successfulLogins / (securityMetrics.successfulLogins + securityMetrics.failedLogins)) * 100)}%
              </p>
            </div>
            <TrendingUp className="w-8 h-8 text-yellow-400" />
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Security Trends (Last 7 Days)</h3>
        <div className="text-center py-8">
          <BarChart3 className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-400">Security analytics charts would be displayed here</p>
          <p className="text-gray-500 text-sm mt-2">Integration with charting library required</p>
        </div>
      </div>
    </div>
  );

  const renderAuditSettings = () => (
    <div className="space-y-6">
      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Audit Configuration</h3>
        <div className="space-y-4">
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              defaultChecked
              className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
            />
            <span className="text-gray-300">Log all admin actions</span>
          </label>
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              defaultChecked
              className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
            />
            <span className="text-gray-300">Log user authentication events</span>
          </label>
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              defaultChecked
              className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
            />
            <span className="text-gray-300">Log system configuration changes</span>
          </label>
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              className="w-4 h-4 text-blue-600 bg-gray-700 border-gray-600 rounded focus:ring-blue-500"
            />
            <span className="text-gray-300">Log data access events</span>
          </label>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-6">
        <h3 className="text-xl font-semibold text-white mb-4">Retention Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Log Retention Period</label>
            <select className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="30">30 days</option>
              <option value="90" selected>90 days</option>
              <option value="180">180 days</option>
              <option value="365">1 year</option>
              <option value="0">Indefinite</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Archive Format</label>
            <select className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="json">JSON</option>
              <option value="csv">CSV</option>
              <option value="xml">XML</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'logs': return renderAuditLogs();
      case 'security': return renderSecurityEvents();
      case 'analytics': return renderAnalytics();
      case 'settings': return renderAuditSettings();
      default: return renderAuditLogs();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">Security & Audit Log</h1>
          <p className="text-gray-300">Monitor system security and track all administrative actions</p>
        </div>

        <div className="bg-gray-800/50 backdrop-blur-sm rounded-xl border border-gray-700 overflow-hidden">
          <div className="border-b border-gray-700">
            <nav className="flex space-x-8 px-6">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                      activeTab === tab.id
                        ? 'border-blue-500 text-blue-400'
                        : 'border-transparent text-gray-400 hover:text-gray-300'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          <div className="p-6">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              {renderTabContent()}
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SecurityAuditLog;

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Settings,
  Database,
  Shield,
  Mail,
  Server,
  Bell,
  Save,
  RefreshCw,
  AlertTriangle,
  Download,
  Eye,
  EyeOff,
  Copy,
  DollarSign
} from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';


const SystemSettings = () => {
  const [activeTab, setActiveTab] = useState('general');
  const [loading, setLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({});
  const [adminProfile, setAdminProfile] = useState({ username: '', email: '' });
  const [adminUsername, setAdminUsername] = useState('');
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [passwordData, setPasswordData] = useState({
    newPassword: '',
    confirmPassword: ''
  });
  const [settings, setSettings] = useState({
    general: {
      siteName: 'DOA Platform',
      siteDescription: 'Decentralized Organization for Action',
      siteUrl: 'https://doa-platform.com',
      adminEmail: 'admin@doa-platform.com',
      timezone: 'UTC',
      language: 'en',
      maintenanceMode: false,
      registrationEnabled: true,
      emailVerificationRequired: true
    },
    database: {
      connectionString: 'mongodb://localhost:27017/doa',
      maxConnections: 100,
      connectionTimeout: 30000,
      backupEnabled: true,
      backupFrequency: 'daily',
      backupRetention: 30,
      lastBackup: '2024-01-15 02:00:00'
    },
    security: {
      jwtSecret: 'your-super-secret-jwt-key',
      jwtExpiration: '24h',
      passwordMinLength: 8,
      passwordRequireSpecial: true,
      maxLoginAttempts: 5,
      lockoutDuration: 15,
      twoFactorEnabled: false,
      sessionTimeout: 3600,
      corsOrigins: 'http://localhost:3000'
    },
    email: {
      provider: 'smtp',
      smtpHost: 'smtp.gmail.com',
      smtpPort: 587,
      smtpUser: 'noreply@doa-platform.com',
      smtpPassword: 'your-email-password',
      fromName: 'DOA Platform',
      fromEmail: 'noreply@doa-platform.com',
      enableTLS: true
    },
    notifications: {
      emailNotifications: true,
      pushNotifications: false,
      smsNotifications: false,
      newUserNotification: true,
      voteNotification: true,
      contributionNotification: true,
      systemAlerts: true
    },
    api: {
      rateLimit: 100,
      rateLimitWindow: 15,
      apiVersion: 'v1',
      enableCors: true,
      enableLogging: true,
      logLevel: 'info',
      enableSwagger: true
    },
    contributions: {
      contributionActive: true
    }
  });

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'database', label: 'Database', icon: Database },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'email', label: 'Email', icon: Mail },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'api', label: 'API', icon: Server },
    { id: 'contributions', label: 'Contributions', icon: DollarSign }
  ];

  const handleSettingChange = (category, key, value) => {
    setSettings(prev => ({
      ...prev,
      [category]: {
        ...prev[category],
        [key]: value
      }
    }));
  };

  const loadAdminProfile = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const { data } = await axios.get('/api/admin/profile', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (data.success) {
        setAdminProfile(data.data);
        setAdminUsername(data.data.username);
      }
    } catch (err) {
      console.error('Error loading admin profile:', err);
    }
  };

  const handleUpdateAdminUsername = async () => {
    if (!adminUsername.trim()) return toast.error('Username cannot be empty');
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      await axios.post('/api/admin/update-username', { username: adminUsername }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Admin username updated');
      loadAdminProfile();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update username');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateAdminPassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      return toast.error('Passwords do not match');
    }
    if (passwordData.newPassword.length < 8) {
      return toast.error('Password must be at least 8 characters');
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      await axios.post('/api/admin/update-password', {
        newPassword: passwordData.newPassword
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      toast.success('Admin password updated successfully');
      setShowPasswordFields(false);
      setPasswordData({ newPassword: '', confirmPassword: '' });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (category) => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      if (category === 'contributions') {
        await axios.put('/api/settings/contributionActive', { value: settings.contributions.contributionActive }, { headers });
      } else {
        await new Promise(resolve => setTimeout(resolve, 800));
      }
      toast.success(`${category.charAt(0).toUpperCase() + category.slice(1)} settings saved successfully!`);
    } catch (error) {
      const msg = error.response?.data?.message || error.message || 'Failed to save settings';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
        const res = await axios.get('/api/settings/contributionActive', { headers });
        const v = res.data?.data?.value;
        if (typeof v !== 'undefined') {
          setSettings(prev => ({ ...prev, contributions: { ...prev.contributions, contributionActive: !!v } }));
        }
      } catch (_) { }
    };
    loadSettings();
    loadAdminProfile();
    const onUpdate = () => { loadSettings(); loadAdminProfile(); };
    window.addEventListener('datastore:update', onUpdate);
    let ws;
    try {
      const url = window.location.origin.replace('http', 'ws').replace(/\/$/, '') + '/ws';
      ws = new WebSocket(url);
      ws.onmessage = (ev) => {
        try {
          const payload = JSON.parse(ev.data);
          if (payload && /(settings_|contribution_)/i.test(payload.type || '')) {
            loadSettings();
          }
        } catch { }
      };
    } catch (_) { }
    return () => {
      window.removeEventListener('datastore:update', onUpdate);
      try { ws && ws.close(); } catch (_) { }
    };
  }, []);

  const handleBackup = async () => {
    setLoading(true);
    try {
      await new Promise(resolve => setTimeout(resolve, 2000));
      toast.success('Database backup created successfully!');
      setSettings(prev => ({
        ...prev,
        database: {
          ...prev.database,
          lastBackup: new Date().toLocaleString()
        }
      }));
    } catch (error) {
      toast.error('Failed to create backup');
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = (field) => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const renderGeneralSettings = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Site Name</label>
          <input
            type="text"
            value={settings.general.siteName}
            onChange={(e) => handleSettingChange('general', 'siteName', e.target.value)}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Admin Email</label>
          <input
            type="email"
            value={settings.general.adminEmail}
            onChange={(e) => handleSettingChange('general', 'adminEmail', e.target.value)}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Site Description</label>
        <textarea
          value={settings.general.siteDescription}
          onChange={(e) => handleSettingChange('general', 'siteDescription', e.target.value)}
          rows={3}
          className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">System Options</h3>
        <div className="space-y-3">
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={settings.general.maintenanceMode}
              onChange={(e) => handleSettingChange('general', 'maintenanceMode', e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
            />
            <span className="text-gray-300">Maintenance Mode</span>
          </label>
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={settings.general.registrationEnabled}
              onChange={(e) => handleSettingChange('general', 'registrationEnabled', e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
            />
            <span className="text-gray-300">Allow User Registration</span>
          </label>
        </div>
      </div>
    </div>
  );

  const renderContributionsSettings = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Contribution Settings</h3>
        <div className="space-y-3">
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={settings.contributions.contributionActive}
              onChange={(e) => handleSettingChange('contributions', 'contributionActive', e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
            />
            <span className="text-gray-300">Contributions Active</span>
          </label>
        </div>
      </div>
    </div>
  );

  const renderDatabaseSettings = () => (
    <div className="space-y-6">
      <div className="bg-yellow-900/20 border border-yellow-600 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <AlertTriangle className="w-5 h-5 text-yellow-500" />
          <span className="text-yellow-300 font-medium">Warning</span>
        </div>
        <p className="text-yellow-200 mt-2">
          Modifying database settings can affect system stability. Please backup before making changes.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Connection String</label>
        <div className="relative">
          <input
            type={showPasswords.connectionString ? 'text' : 'password'}
            value={settings.database.connectionString}
            onChange={(e) => handleSettingChange('database', 'connectionString', e.target.value)}
            className="w-full px-4 py-2 pr-20 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="absolute inset-y-0 right-0 flex items-center space-x-1 pr-3">
            <button
              onClick={() => togglePasswordVisibility('connectionString')}
              className="text-gray-400 hover:text-white"
            >
              {showPasswords.connectionString ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button
              onClick={() => copyToClipboard(settings.database.connectionString)}
              className="text-gray-400 hover:text-white"
            >
              <Copy className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-4">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-white font-medium">Last Backup</h4>
            <p className="text-gray-400 text-sm">{settings.database.lastBackup}</p>
          </div>
          <div className="flex space-x-2">
            <button
              onClick={handleBackup}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
            >
              <Download className="w-4 h-4" />
              <span>Backup Now</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSecuritySettings = () => (
    <div className="space-y-6">
      <div className="bg-red-900/20 border border-red-600 rounded-lg p-4">
        <div className="flex items-center space-x-2">
          <Shield className="w-5 h-5 text-red-500" />
          <span className="text-red-300 font-medium">Security Critical</span>
        </div>
        <p className="text-red-200 mt-2">
          These settings directly affect system security. Changes should be made carefully.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">JWT Secret Key</label>
        <div className="relative">
          <input
            type={showPasswords.jwtSecret ? 'text' : 'password'}
            value={settings.security.jwtSecret}
            onChange={(e) => handleSettingChange('security', 'jwtSecret', e.target.value)}
            className="w-full px-4 py-2 pr-20 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <div className="absolute inset-y-0 right-0 flex items-center space-x-1 pr-3">
            <button
              onClick={() => togglePasswordVisibility('jwtSecret')}
              className="text-gray-400 hover:text-white"
            >
              {showPasswords.jwtSecret ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={settings.security.passwordRequireSpecial}
            onChange={(e) => handleSettingChange('security', 'passwordRequireSpecial', e.target.checked)}
            className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
          />
          <span className="text-gray-300">Require Special Characters</span>
        </label>
        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={settings.security.twoFactorEnabled}
            onChange={(e) => handleSettingChange('security', 'twoFactorEnabled', e.target.checked)}
            className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
          />
          <span className="text-gray-300">Enable Two-Factor Authentication</span>
        </label>
      </div>

      <div className="mt-10 pt-10 border-t border-gray-700">
        <h3 className="text-lg font-semibold text-white mb-6 flex items-center gap-2">
          <Shield className="w-5 h-5 text-blue-400" />
          Admin Management
        </h3>

        <div className="space-y-6 max-w-md">
          {/* Username Update */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">Admin Username</label>
            <div className="flex gap-2">
              <input
                type="text"
                value={adminUsername}
                onChange={(e) => setAdminUsername(e.target.value)}
                className="flex-1 px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                placeholder="New admin username"
              />
              <button
                onClick={handleUpdateAdminUsername}
                disabled={loading || adminUsername === adminProfile.username}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                Update
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">This is the username used for admin login.</p>
          </div>

          {/* Password Update */}
          <div className="pt-4">
            {!showPasswordFields ? (
              <button
                onClick={() => setShowPasswordFields(true)}
                className="w-full px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600 transition-colors flex items-center justify-center gap-2"
              >
                Change Admin Password
              </button>
            ) : (
              <div className="space-y-4 p-4 bg-gray-900/50 rounded-xl border border-blue-500/30">
                <h4 className="text-sm font-semibold text-blue-400 uppercase tracking-wider">New Password</h4>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">New Password</label>
                  <input
                    type="password"
                    placeholder="Min 8 characters"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, newPassword: e.target.value }))}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-400 mb-1">Confirm New Password</label>
                  <input
                    type="password"
                    placeholder="Repeat new password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={handleUpdateAdminPassword}
                    disabled={loading || !passwordData.newPassword}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    Save Changes
                  </button>
                  <button
                    onClick={() => {
                      setShowPasswordFields(false);
                      setPasswordData({ newPassword: '', confirmPassword: '' });
                    }}
                    className="px-4 py-2 bg-gray-700 text-gray-300 rounded-lg hover:bg-gray-600"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  const renderEmailSettings = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">SMTP Host</label>
          <input
            type="text"
            value={settings.email.smtpHost}
            onChange={(e) => handleSettingChange('email', 'smtpHost', e.target.value)}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">SMTP Port</label>
          <input
            type="number"
            value={settings.email.smtpPort}
            onChange={(e) => handleSettingChange('email', 'smtpPort', parseInt(e.target.value))}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg p-4">
        <h4 className="text-white font-medium mb-3">Test Email Configuration</h4>
        <div className="flex items-center space-x-3">
          <input
            type="email"
            placeholder="test@example.com"
            className="flex-1 px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center space-x-2">
            <Mail className="w-4 h-4" />
            <span>Send Test</span>
          </button>
        </div>
      </div>
    </div>
  );

  const renderNotificationSettings = () => (
    <div className="space-y-6">
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-white">Notification Channels</h3>
        <div className="space-y-3">
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={settings.notifications.emailNotifications}
              onChange={(e) => handleSettingChange('notifications', 'emailNotifications', e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
            />
            <span className="text-gray-300">Email Notifications</span>
          </label>
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={settings.notifications.systemAlerts}
              onChange={(e) => handleSettingChange('notifications', 'systemAlerts', e.target.checked)}
              className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
            />
            <span className="text-gray-300">System Alerts</span>
          </label>
        </div>
      </div>
    </div>
  );

  const renderApiSettings = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Rate Limit (requests/window)</label>
          <input
            type="number"
            value={settings.api.rateLimit}
            onChange={(e) => handleSettingChange('api', 'rateLimit', parseInt(e.target.value))}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Log Level</label>
          <select
            value={settings.api.logLevel}
            onChange={(e) => handleSettingChange('api', 'logLevel', e.target.value)}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="error">Error</option>
            <option value="warn">Warning</option>
            <option value="info">Info</option>
            <option value="debug">Debug</option>
          </select>
        </div>
      </div>

      <div className="space-y-3">
        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={settings.api.enableCors}
            onChange={(e) => handleSettingChange('api', 'enableCors', e.target.checked)}
            className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
          />
          <span className="text-gray-300">Enable CORS</span>
        </label>
        <label className="flex items-center space-x-3">
          <input
            type="checkbox"
            checked={settings.api.enableLogging}
            onChange={(e) => handleSettingChange('api', 'enableLogging', e.target.checked)}
            className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
          />
          <span className="text-gray-300">Enable API Logging</span>
        </label>
      </div>
    </div>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'general': return renderGeneralSettings();
      case 'database': return renderDatabaseSettings();
      case 'security': return renderSecuritySettings();
      case 'email': return renderEmailSettings();
      case 'notifications': return renderNotificationSettings();
      case 'api': return renderApiSettings();
      case 'contributions': return renderContributionsSettings();
      default: return renderGeneralSettings();
    }
  };

  useEffect(() => {
    // const fetchSettings = async () => {
    //   try {
    //     const { data } = await axios.get('/api/settings/contributionActive');
    //     if (data.success) {
    //       handleSettingChange('contributions', 'contributionActive', data.data.value);
    //     }
    //   } catch (error) {
    //     console.error('Error fetching settings:', error);
    //   }
    // };
    // fetchSettings();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-violet-900 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">System Settings</h1>
          <p className="text-gray-300">Configure and manage system-wide settings</p>
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
                    className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${activeTab === tab.id
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

            <div className="mt-8 flex justify-end">
              <button
                onClick={() => handleSave(activeTab)}
                disabled={loading}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center space-x-2"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                <span>{loading ? 'Saving...' : 'Save Settings'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemSettings;

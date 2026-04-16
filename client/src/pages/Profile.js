import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  User, 
  Mail, 
  Calendar, 
  Award, 
  Edit3, 
  Save, 
  X,
  Shield,
  MapPin,
  Phone,
  Wallet,
  Send
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';

const Profile = () => {
  const { user, updateUser } = useAuth();
  const location = useLocation();
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    name: (user?.fullName || user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim()),
    email: user?.email || '',
    username: user?.username || (user?.email ? String(user.email).split('@')[0] : ''),
    address: user?.address || '',
    telegramUsername: user?.telegramUsername || '',
    phoneNumber: user?.phoneNumber || '',
    walletAddress: user?.walletAddress || ''
  });

  useEffect(() => {
    const syncFromAuth = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get('/api/auth/me', token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
        const u = res.data?.data?.user || user;
        if (u) {
          setFormData({
            firstName: u.firstName || '',
            lastName: u.lastName || '',
            name: (u.fullName || u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim()),
            email: u.email || '',
            username: u.username || (u.email ? String(u.email).split('@')[0] : ''),
            address: u.address || '',
            telegramUsername: u.telegramUsername || '',
            phoneNumber: u.phoneNumber || '',
            walletAddress: u.walletAddress || ''
          });
        }
      } catch {
        if (user) {
          setFormData({
            firstName: user?.firstName || '',
            lastName: user?.lastName || '',
            name: (user?.fullName || user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim()),
            email: user?.email || '',
            username: user?.username || (user?.email ? String(user.email).split('@')[0] : ''),
            address: user?.address || '',
            telegramUsername: user?.telegramUsername || '',
            phoneNumber: user?.phoneNumber || '',
            walletAddress: user?.walletAddress || ''
          });
        }
      }
    };
    syncFromAuth();
  }, [user]);

  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      if (params.get('edit')) {
        setIsEditing(true);
      }
    } catch (_) {}
  }, [location.search]);

  const handleSave = async () => {
    setLoading(true);
    try {
      const payload = {};
      const cleaned = {
        firstName: (formData.firstName || '').trim(),
        lastName: (formData.lastName || '').trim(),
        email: (formData.email || '').trim(),
        username: (formData.username || '').trim(),
        address: (formData.address || '').trim(),
        telegramUsername: (formData.telegramUsername || '').trim().replace(/^@+/, '').replace(/\s+/g, '_'),
        phoneNumber: (formData.phoneNumber || '').trim(),
        walletAddress: (formData.walletAddress || '').trim()
      };

      const errors = [];
      if (cleaned.firstName && cleaned.firstName.length < 2) errors.push('First name must be at least 2 characters');
      if (cleaned.lastName && cleaned.lastName.length < 2) errors.push('Last name must be at least 2 characters');
      if (cleaned.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleaned.email)) errors.push('Enter a valid email');
      if (cleaned.username && !/^[a-zA-Z0-9_]{3,32}$/.test(cleaned.username)) errors.push('Username must be 3-32 characters');
      if (cleaned.telegramUsername && !/^[a-zA-Z0-9_]{3,32}$/.test(cleaned.telegramUsername)) errors.push('Telegram username must be 3-32 characters (letters, numbers, underscore)');
      if (cleaned.phoneNumber && !/^\+?[0-9\s\-().]{7,20}$/.test(cleaned.phoneNumber)) errors.push('Phone number must be 7-20 digits and may include +, spaces, dashes, parentheses, dots');
      if (cleaned.walletAddress && cleaned.walletAddress.length < 10) errors.push('Wallet address must be at least 10 characters');
      if (errors.length) {
        toast.error(errors[0]);
        return;
      }

      Object.entries(cleaned).forEach(([k, v]) => { if (v) payload[k] = v; });
      const token = localStorage.getItem('token');
      if (token && token.startsWith('placeholder-token-')) {
        const localUpdated = { ...user, ...payload };
        updateUser(localUpdated);
        localStorage.setItem('user', JSON.stringify(localUpdated));
        try { window.dispatchEvent(new Event('datastore:update')); } catch (_) {}
        setIsEditing(false);
        toast.success('Profile updated successfully');
        return;
      }

      const response = await axios.put('/api/auth/profile', payload, token ? { headers: { Authorization: `Bearer ${token}` } } : undefined);
      const updated = response.data?.data?.user || response.data?.user;
      if (updated) {
        updateUser(updated);
        localStorage.setItem('user', JSON.stringify(updated));
      }
      setIsEditing(false);
      toast.success('Profile updated successfully');
    } catch (error) {
      const serverMsg = error.response?.data?.message;
      const firstDetail = Array.isArray(error.response?.data?.errors) && error.response.data.errors[0]?.msg;
      toast.error(firstDetail || serverMsg || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    setFormData({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      name: (user?.fullName || user?.name || `${user?.firstName || ''} ${user?.lastName || ''}`.trim()),
      email: user?.email || '',
      username: user?.username || (user?.email ? String(user.email).split('@')[0] : ''),
      address: user?.address || '',
      telegramUsername: user?.telegramUsername || '',
      phoneNumber: user?.phoneNumber || '',
      walletAddress: user?.walletAddress || ''
    });
    setIsEditing(false);
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin':
        return 'from-red-500 to-pink-500';
      case 'moderator':
        return 'from-yellow-500 to-orange-500';
      default:
        return 'from-blue-500 to-purple-500';
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin':
        return Shield;
      case 'moderator':
        return Award;
      default:
        return User;
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-purple-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  const RoleIcon = getRoleIcon(user.role);

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Profile Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-8 mb-8"
        >
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
            <div className="flex items-center space-x-6 mb-6 md:mb-0">
              <div className="relative">
                <div className="w-24 h-24 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                  <span className="text-white text-3xl font-bold">
                    {user.name?.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className={`absolute -bottom-2 -right-2 w-8 h-8 bg-gradient-to-r ${getRoleColor(user.role)} rounded-full flex items-center justify-center`}>
                  <RoleIcon className="w-4 h-4 text-white" />
                </div>
              </div>
              
              <div>
                {isEditing ? (
                  <div className="space-y-3 w-full max-w-md">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm text-white mb-1">First Name</label>
                        <input
                          type="text"
                          value={formData.firstName}
                          onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                          className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="First Name"
                        />
                      </div>
                      <div>
                        <label className="block text-sm text-white mb-1">Last Name</label>
                        <input
                          type="text"
                          value={formData.lastName}
                          onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                          className="bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                          placeholder="Last Name"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm text-white mb-1">Email</label>
                      <input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Email"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-white mb-1">Username</label>
                      <input
                        type="text"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Username"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-white mb-1">Address</label>
                      <input
                        type="text"
                        value={formData.address}
                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                        className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Address"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-white mb-1">Telegram Username</label>
                      <input
                        type="text"
                        value={formData.telegramUsername}
                        onChange={(e) => setFormData({ ...formData, telegramUsername: e.target.value })}
                        className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Telegram Username"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-white mb-1">Phone Number</label>
                      <input
                        type="tel"
                        value={formData.phoneNumber}
                        onChange={(e) => setFormData({ ...formData, phoneNumber: e.target.value })}
                        className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Phone Number"
                      />
                    </div>
                    <div>
                      <label className="block text-sm text-white mb-1">Wallet Address</label>
                      <input
                        type="text"
                        value={formData.walletAddress}
                        onChange={(e) => setFormData({ ...formData, walletAddress: e.target.value })}
                        className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-purple-500"
                        placeholder="Wallet Address"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <h1 className="text-3xl font-bold text-white mb-2">{user.fullName || user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim()}</h1>
                    <div className="space-y-2 text-gray-300">
                      <div className="flex items-center space-x-2">
                        <Mail className="w-4 h-4" />
                        <span>{user.email}</span>
                      </div>
                      {user.address && (
                        <div className="flex items-center space-x-2">
                          <MapPin className="w-4 h-4" />
                          <span>{user.address}</span>
                        </div>
                      )}
                      {user.telegramUsername && (
                        <div className="flex items-center space-x-2">
                          <Send className="w-4 h-4" />
                          <span>@{user.telegramUsername}</span>
                        </div>
                      )}
                      {user.phoneNumber && (
                        <div className="flex items-center space-x-2">
                          <Phone className="w-4 h-4" />
                          <span>{user.phoneNumber}</span>
                        </div>
                      )}
                      {user.walletAddress && (
                        <div className="flex items-center space-x-2">
                          <Wallet className="w-4 h-4" />
                          <span className="text-xs font-mono">{user.walletAddress.slice(0, 20)}...</span>
                        </div>
                      )}
                      <div className="flex items-center space-x-2">
                        <Calendar className="w-4 h-4" />
                        <span>Joined {new Date(user.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                    <div className="mt-2">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-gradient-to-r ${getRoleColor(user.role)} text-white`}>
                        <RoleIcon className="w-4 h-4 mr-1" />
                        {user.role.charAt(0).toUpperCase() + user.role.slice(1)}
                      </span>
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex space-x-3">
              {isEditing ? (
                <>
                  <button
                    onClick={handleSave}
                    disabled={loading}
                    className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors duration-200 disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{loading ? 'Saving...' : 'Save'}</span>
                  </button>
                  <button
                    onClick={handleCancel}
                    className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors duration-200"
                  >
                    <X className="w-4 h-4" />
                    <span>Cancel</span>
                  </button>
                </>
              ) : (
                <button
                  onClick={() => setIsEditing(true)}
                  className="bg-purple-500 hover:bg-purple-600 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors duration-200"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Edit Profile</span>
                </button>
              )}
            </div>
          </div>
        </motion.div>

        
      </div>
    </div>
  );
};

export default Profile;

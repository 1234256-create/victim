import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { clearAllDatastore } from '../utils/datastore';

const AdminAuthContext = createContext();

export const useAdminAuth = () => {
  const context = useContext(AdminAuthContext);
  if (!context) {
    throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  }
  return context;
};

export const AdminAuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isBlocked, setIsBlocked] = useState(false);

  const MAX_LOGIN_ATTEMPTS = 5;

  const checkAuthStatus = useCallback(async () => {
    try {
      localStorage.removeItem('adminLoginAttempts');
      localStorage.removeItem('adminBlockTime');
      setLoginAttempts(0);
      setIsBlocked(false);
      const token = localStorage.getItem('adminToken');
      const adminData = localStorage.getItem('adminData');
      if (token && adminData) {
        const parsedAdmin = JSON.parse(adminData);
        setAdmin(parsedAdmin);
        setIsAuthenticated(true);
        // Skip server-side token verification on refresh to avoid unintended logout
      }
    } catch (error) {
      console.error('Error checking admin auth status:', error);
      // Do not force logout on refresh errors
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuthStatus();
  }, [checkAuthStatus]);


  const login = async (username, password) => {
    try {
      const u = String(username || '').trim();
      const p = String(password || '').trim();
      const res = await axios.post('/api/admin/login', { username: u, password: p });
      const data = res.data?.data || {};
      const token = data.token;
      const adminData = {
        username: data.admin?.username || username,
        role: data.admin?.role || 'super_admin',
        loginTime: new Date().toISOString(),
        permissions: [
          'wallet_management',
          'voting_management',
          'user_management',
          'points_management',
          'contribution_management',
          'system_settings'
        ]
      };
      localStorage.setItem('adminToken', token);
      localStorage.setItem('adminData', JSON.stringify(adminData));
      localStorage.removeItem('adminLoginAttempts');
      localStorage.removeItem('adminBlockTime');
      setAdmin(adminData);
      setIsAuthenticated(true);
      setLoginAttempts(0);
      setIsBlocked(false);
      return { success: true, admin: adminData };
    } catch (error) {
      localStorage.removeItem('adminLoginAttempts');
      localStorage.removeItem('adminBlockTime');
      setLoginAttempts(0);
      setIsBlocked(false);
      const message = error.response?.data?.message || 'Invalid credentials.';
      throw new Error(message);
    }
  };

  const logout = useCallback(() => {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('adminData');
    setAdmin(null);
    setIsAuthenticated(false);
  }, []);

  useEffect(() => {
    const interceptor = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          const msg = error.response?.data?.message || '';
          if (msg.includes('User not found') || msg.includes('authorization denied') || msg.includes('Invalid token')) {
            logout();
          }
        }
        return Promise.reject(error);
      }
    );
    return () => axios.interceptors.response.eject(interceptor);
  }, [logout]);

  const hasPermission = (permission) => {
    return admin?.permissions?.includes(permission) || false;
  };

  const requestPasswordOtp = async () => {
    const token = localStorage.getItem('adminToken');
    if (!token) throw new Error('Admin authentication required');
    await axios.post('/api/admin/request-password-otp', {}, { headers: { Authorization: `Bearer ${token}` } });
  };

  const changeAdminPassword = async (otp, newPassword) => {
    const token = localStorage.getItem('adminToken');
    if (!token) throw new Error('Admin authentication required');
    await axios.post('/api/admin/change-password', { otp, newPassword }, { headers: { Authorization: `Bearer ${token}` } });
  };

  const requestUserPasswordOtp = async (email) => {
    const token = localStorage.getItem('adminToken');
    if (!token) throw new Error('Admin authentication required');
    await axios.post('/api/admin/users/request-password-otp', { email }, { headers: { Authorization: `Bearer ${token}` } });
  };

  const changeUserPassword = async (email, otp, newPassword) => {
    const token = localStorage.getItem('adminToken');
    if (!token) throw new Error('Admin authentication required');
    await axios.post('/api/admin/users/change-password', { email, otp, newPassword }, { headers: { Authorization: `Bearer ${token}` } });
  };

  const purgeAllData = async (includeAdmin = false) => {
    const token = localStorage.getItem('adminToken');
    if (!token) throw new Error('Admin authentication required');
    const url = includeAdmin ? '/api/admin/purge/users?includeAdmin=true' : '/api/admin/purge/users';
    await axios.delete(url, { headers: { Authorization: `Bearer ${token}` } });
    try { clearAllDatastore(); } catch (_) {}
    return { success: true };
  };

  const value = {
    isAuthenticated,
    admin,
    loading,
    loginAttempts,
    isBlocked,
    login,
    logout,
    hasPermission,
    requestPasswordOtp,
    changeAdminPassword,
    requestUserPasswordOtp,
    changeUserPassword,
    purgeAllData,
    maxAttempts: MAX_LOGIN_ATTEMPTS
  };

  return (
    <AdminAuthContext.Provider value={value}>
      {children}
    </AdminAuthContext.Provider>
  );
};

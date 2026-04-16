import React, { createContext, useContext, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import axios from 'axios';

const OwnerAuthContext = createContext();

export const useOwnerAuth = () => {
  const context = useContext(OwnerAuthContext);
  if (!context) {
    throw new Error('useOwnerAuth must be used within an OwnerAuthProvider');
  }
  return context;
};

export const OwnerAuthProvider = ({ children }) => {
  const [isOwnerAuthenticated, setIsOwnerAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [ownerData, setOwnerData] = useState(null);

  const OWNER_CREDENTIALS = null;

  useEffect(() => {
    // Check if owner is already authenticated
    const ownerToken = localStorage.getItem('deo_owner_token');
    const ownerSession = localStorage.getItem('deo_owner_session');
    
    if (ownerToken && ownerSession) {
      try {
        const sessionData = JSON.parse(ownerSession);
        const currentTime = new Date().getTime();
        
        // Check if session is still valid (24 hours)
        if (currentTime - sessionData.loginTime < 24 * 60 * 60 * 1000) {
          setIsOwnerAuthenticated(true);
          setOwnerData(sessionData.ownerData);
        } else {
          // Session expired
          localStorage.removeItem('deo_owner_token');
          localStorage.removeItem('deo_owner_session');
        }
      } catch (error) {
        console.error('Error parsing owner session:', error);
        localStorage.removeItem('deo_owner_token');
        localStorage.removeItem('deo_owner_session');
      }
    }
    
    setIsLoading(false);
  }, []);

  const ownerLogin = async (username, password) => {
    setIsLoading(true);
    try {
      const res = await axios.post('/api/admin/login', { username, password });
      const data = res.data?.data || {};
      const token = data.token;
      const sessionData = {
        loginTime: new Date().getTime(),
        ownerData: {
          username: data.admin?.username || username,
          email: data.admin?.username || username,
          role: 'SUPER_ADMIN',
          permissions: ['ALL']
        }
      };
      localStorage.setItem('deo_owner_token', token);
      localStorage.setItem('deo_owner_session', JSON.stringify(sessionData));
      localStorage.setItem('adminToken', token);
      localStorage.setItem('adminData', JSON.stringify({ username: sessionData.ownerData.username, role: 'super_admin' }));
      setIsOwnerAuthenticated(true);
      setOwnerData(sessionData.ownerData);
      toast.success('Owner login successful!');
      return { success: true };
    } catch (error) {
      toast.error(error.response?.data?.message || 'Invalid owner credentials!');
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  const ownerLogout = () => {
    localStorage.removeItem('deo_owner_token');
    localStorage.removeItem('deo_owner_session');
    setIsOwnerAuthenticated(false);
    setOwnerData(null);
    toast.success('Owner logged out successfully');
  };

  const refreshOwnerSession = () => {
    const ownerSession = localStorage.getItem('deo_owner_session');
    if (ownerSession) {
      try {
        const sessionData = JSON.parse(ownerSession);
        sessionData.loginTime = new Date().getTime();
        localStorage.setItem('deo_owner_session', JSON.stringify(sessionData));
      } catch (error) {
        console.error('Error refreshing owner session:', error);
      }
    }
  };

  const value = {
    isOwnerAuthenticated,
    isLoading,
    ownerData,
    ownerLogin,
    ownerLogout,
    refreshOwnerSession
  };

  return (
    <OwnerAuthContext.Provider value={value}>
      {children}
    </OwnerAuthContext.Provider>
  );
};
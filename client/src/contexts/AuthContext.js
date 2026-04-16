import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { setUserMeta, logActivity, getUsersMap, setUsersMap } from '../utils/datastore';

const AuthContext = createContext();

export { AuthContext };

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Set up axios defaults
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    }
  }, []);

  // Check if user is logged in on app start
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      // Check if it's a placeholder token
      if (token.startsWith('placeholder-token-')) {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const u = JSON.parse(storedUser);
          try {
            const ds = getUsersMap();
            setUsersMap({
              ...ds, [u.email]: {
                email: u.email,
                name: u.name || `${u.firstName || ''} ${u.lastName || ''}`.trim(),
                role: u.role || 'user',
                createdAt: u.createdAt || new Date().toISOString(),
              }
            });
          } catch { }
          try {
            const tp = Number(u.totalPoints) || 0;
            setUserMeta(u.email, { votesAllowed: 1, votesUsed: 0, points: tp });
          } catch { }
          setUser(u);
          setLoading(false);
          return;
        }
      }

      // Optimistically restore user from localStorage first
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const u = JSON.parse(storedUser);
          setUser(u);
          setLoading(false); // Set loading to false immediately so user sees they're logged in
        } catch { }
      }

      // Then verify with server in the background
      try {
        const response = await axios.get('/api/auth/me', {
          headers: { Authorization: `Bearer ${token}` },
          timeout: 5000 // 5 second timeout
        });
        // Update user with fresh data from server
        if (response.data?.data?.user) {
          setUser(response.data.data.user);
          localStorage.setItem('user', JSON.stringify(response.data.data.user));
        } else if (response.data?.user) {
          setUser(response.data.user);
          localStorage.setItem('user', JSON.stringify(response.data.user));
        }
      } catch (verifyError) {
        // Only clear tokens if server explicitly says token is invalid
        // Don't clear on network errors, timeouts, or server errors
        const status = verifyError?.response?.status;
        const isNetworkError = !status || status >= 500 || verifyError.code === 'ECONNABORTED' || verifyError.message?.includes('timeout');

        if (status === 401 || status === 403) {
          // Only clear if we don't have a stored user to fall back to
          // This prevents clearing on transient server issues
          if (!storedUser) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            const adminToken = localStorage.getItem('adminToken');
            if (!adminToken) {
              delete axios.defaults.headers.common['Authorization'];
            }
            setUser(null);
          }
          // If we have storedUser, keep it - user stays logged in
        } else if (isNetworkError) {
          // Network/server errors - keep the stored user, don't clear anything
          // User stays logged in with cached data
        }
        // For other errors, keep the stored user
      }
    } catch (error) {
      // Fallback: try to restore from localStorage
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        try {
          const u = JSON.parse(storedUser);
          setUser(u);
        } catch { }
      }
    } finally {
      setLoading(false);
    }
  };

  // Placeholder users for testing without database
  const loadPlaceholderUsers = () => {
    try {
      const raw = localStorage.getItem('placeholderUsers');
      const persisted = raw ? JSON.parse(raw) : {};
      // Seed defaults if not present
      const genRef = () => {
        try {
          const a = new Uint8Array(6);
          crypto.getRandomValues(a);
          return Array.from(a).map((b) => b.toString(16).padStart(2, '0')).join('');
        } catch {
          return Math.random().toString(36).slice(2, 14);
        }
      };

      let map = {
        'user@doa.com': {
          id: persisted['user@doa.com']?.id || '1',
          email: 'user@doa.com',
          password: persisted['user@doa.com']?.password || 'password123',
          firstName: persisted['user@doa.com']?.firstName || 'John',
          lastName: persisted['user@doa.com']?.lastName || 'Doe',
          name: `${persisted['user@doa.com']?.firstName || 'John'} ${persisted['user@doa.com']?.lastName || 'Doe'}`,
          role: persisted['user@doa.com']?.role || 'user',
          totalPoints: persisted['user@doa.com']?.totalPoints || 1256,
          referralCode: persisted['user@doa.com']?.referralCode || genRef(),
          createdAt: persisted['user@doa.com']?.createdAt || new Date().toISOString(),
          solanaAddress: persisted['user@doa.com']?.solanaAddress || '',
          telegramUsername: persisted['user@doa.com']?.telegramUsername || '',
          phoneNumber: persisted['user@doa.com']?.phoneNumber || '',
          country: persisted['user@doa.com']?.country || '',
          address: persisted['user@doa.com']?.address || ''
        },
        'admin@doa.com': {
          id: persisted['admin@doa.com']?.id || '2',
          email: 'admin@doa.com',
          password: persisted['admin@doa.com']?.password || 'admin123',
          firstName: persisted['admin@doa.com']?.firstName || 'Admin',
          lastName: persisted['admin@doa.com']?.lastName || 'User',
          name: `${persisted['admin@doa.com']?.firstName || 'Admin'} ${persisted['admin@doa.com']?.lastName || 'User'}`,
          role: persisted['admin@doa.com']?.role || 'admin',
          totalPoints: persisted['admin@doa.com']?.totalPoints || 5000,
          referralCode: persisted['admin@doa.com']?.referralCode || genRef(),
          createdAt: persisted['admin@doa.com']?.createdAt || new Date().toISOString(),
          solanaAddress: persisted['admin@doa.com']?.solanaAddress || '',
          telegramUsername: persisted['admin@doa.com']?.telegramUsername || '',
          phoneNumber: persisted['admin@doa.com']?.phoneNumber || '',
          country: persisted['admin@doa.com']?.country || '',
          address: persisted['admin@doa.com']?.address || ''
        },
        ...persisted
      };
      if (map['user@doa.com'] && typeof map['user@doa.com'].referralCode === 'string' && map['user@doa.com'].referralCode.startsWith('DOA-')) {
        map['user@doa.com'].referralCode = genRef();
      }
      if (map['admin@doa.com'] && typeof map['admin@doa.com'].referralCode === 'string' && map['admin@doa.com'].referralCode.startsWith('DOA-')) {
        map['admin@doa.com'].referralCode = genRef();
      }
      localStorage.setItem('placeholderUsers', JSON.stringify(map));
      return map;
    } catch {
      return {};
    }
  };

  const savePlaceholderUsers = (map) => {
    localStorage.setItem('placeholderUsers', JSON.stringify(map));
  };

  const login = async (email, password, rememberMe = false) => {
    try {
      // Check placeholder users first
      const placeholderUserMap = loadPlaceholderUsers();
      const placeholderUser = placeholderUserMap[email];
      if (placeholderUser && placeholderUser.password === password) {
        const { password: _, ...userWithoutPassword } = placeholderUser;
        const token = 'placeholder-token-' + Date.now();

        localStorage.setItem('token', token);
        localStorage.setItem('user', JSON.stringify(userWithoutPassword));
        const updated = { ...placeholderUserMap, [email]: placeholderUser };
        savePlaceholderUsers(updated);
        try {
          const ds = getUsersMap();
          setUsersMap({
            ...ds, [email]: {
              email,
              name: userWithoutPassword.name || `${userWithoutPassword.firstName} ${userWithoutPassword.lastName}`.trim(),
              role: userWithoutPassword.role || 'user',
              createdAt: userWithoutPassword.createdAt || new Date().toISOString(),
            }
          });
        } catch { }
        try {
          const tp = Number(userWithoutPassword.totalPoints) || 0;
          setUserMeta(email, { votesAllowed: 1, votesUsed: 0, points: tp });
        } catch { }
        try {
          logActivity('User logged in (placeholder)', 'login_placeholder', email);
        } catch { }
        setUser(userWithoutPassword);

        toast.success('Login successful! (Using placeholder data)');
        return { success: true };
      }

      // If not a placeholder user, try the actual API
      const response = await axios.post('/api/auth/login', {
        email,
        password,
        rememberMe
      });

      const { token, user } = response.data?.data || {};

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);

      toast.success('Login successful!');
      return { success: true };
    } catch (error) {
      const message = error.response?.data?.message || 'Invalid credentials';
      toast.error(message);
      return { success: false, message, errors: error.response?.data?.errors || [] };
    }
  };

  const register = async (userData) => {
    try {
      const response = await axios.post('/api/auth/register', userData);

      const { token, user, requiresVerification } = response.data || response.data?.data || {};

      if (requiresVerification) {
        // Don't log in yet
        return { success: true, requiresVerification: true };
      }

      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      setUser(user);

      toast.success('Registration successful!');
      return { success: true };
    } catch (error) {
      const status = error?.response?.status;
      const data = error?.response?.data;
      if (status && data) {
        const msg = data?.message || 'Registration failed';
        toast.error(msg);
        return { success: false, message: msg, errors: data?.errors || [] };
      }

      const placeholderUserMap = loadPlaceholderUsers();
      const { email } = userData;
      if (placeholderUserMap[email]) {
        toast.error('User with this email already exists (placeholder)');
        return { success: false, message: 'User already exists' };
      }

      const id = String(Date.now());
      const genRef = () => {
        try {
          const a = new Uint8Array(6);
          crypto.getRandomValues(a);
          return Array.from(a).map((b) => b.toString(16).padStart(2, '0')).join('');
        } catch {
          return Math.random().toString(36).slice(2, 14);
        }
      };

      const newUser = {
        id,
        email: userData.email,
        password: userData.password,
        firstName: userData.firstName,
        lastName: userData.lastName,
        name: `${userData.firstName} ${userData.lastName}`,
        role: 'user',
        totalPoints: 0,
        referralCode: genRef(),
        createdAt: new Date().toISOString(),
        solanaAddress: '',
        telegramUsername: '',
        phoneNumber: '',
        country: '',
        address: ''
      };

      const updatedMap = { ...placeholderUserMap, [email]: newUser };
      savePlaceholderUsers(updatedMap);
      try {
        const existingUsersMap = getUsersMap();
        setUsersMap({ ...existingUsersMap, [email]: newUser });
      } catch { }

      const token = 'placeholder-token-' + Date.now();
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify({ ...newUser, password: undefined }));
      setUser({ ...newUser, password: undefined });
      try {
        setUserMeta(email, { votesAllowed: 1, votesUsed: 0, points: 0 });
      } catch { }
      try {
        logActivity('New user registered', 'user_registered', email);
      } catch { }
      toast.success('Registration successful! (Using placeholder data)');
      return { success: true };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    const adminToken = localStorage.getItem('adminToken');
    if (adminToken) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${adminToken}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
    setUser(null);
    toast.success('Logged out successfully');
  };

  const updateUser = (updatedUser) => {
    setUser(updatedUser);
  };

  const value = {
    user,
    loading,
    login,
    register,
    logout,
    updateUser,
    checkAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

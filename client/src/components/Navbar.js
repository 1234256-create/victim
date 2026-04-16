import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Menu,
  X,
  Home,
  BarChart3,
  Coins,
  Trophy,
  User,
  Settings,
  LogOut,
  Shield,
  FileText
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import axios from 'axios';

const Navbar = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const handleJoinNow = () => {
    try {
      const ref = localStorage.getItem('landingReferralCode');
      navigate(ref ? `/join-notice?ref=${encodeURIComponent(ref)}` : '/join-notice');
    } catch {
      navigate('/join-notice');
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Logged out successfully');
      navigate('/');
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  const logoPath = '/images/logo.svg';

  const [canContribute, setCanContribute] = useState(false);

  React.useEffect(() => {
    const checkContributionStatus = async () => {
      try {
        const [activeRes, publicRes, roundRes] = await Promise.all([
          axios.get('/api/settings/contributionActive'),
          axios.get('/api/settings/publicContributionsEnabled'),
          axios.get('/api/settings/contributionRound')
        ]);

        const isActive = activeRes.data?.data?.value ?? true;
        const isPublic = publicRes.data?.data?.value === true;
        const round = roundRes.data?.data?.value;
        const nowMs = Date.now();
        const hasRound = Boolean(round && round.startTime && round.endTime && nowMs <= new Date(round.endTime).getTime());

        setCanContribute(isActive && (isPublic || hasRound));
      } catch (error) {
        // Silently fail, default to false
      }
    };

    checkContributionStatus();

    // Listen for updates via custom event if any
    const handleUpdate = () => checkContributionStatus();
    window.addEventListener('datastore:update', handleUpdate);
    return () => window.removeEventListener('datastore:update', handleUpdate);
  }, []);

  const navItems = [
    { name: 'Home', path: '/', icon: Home },
    { name: 'Dashboard', path: '/dashboard', icon: BarChart3, protected: true },
    { name: 'Voting', path: '/voting', icon: BarChart3, protected: true },
    { name: 'Contribute', path: '/contribute', icon: Coins },
    { name: 'Leaderboard', path: '/leaderboard', icon: Trophy, protected: true },
    { name: 'Referral', path: '/referral', icon: User, protected: true },
    { name: 'Whitepaper', path: '/whitepaper', icon: FileText },
  ];

  const filteredNavItems = navItems.filter(item => {
    if (item.name === 'Contribute') return canContribute;
    return true;
  });

  const adminItems = [
    { name: 'Admin Panel', path: '/admin', icon: Shield },
    { name: 'User Management', path: '/admin/users', icon: User },
    { name: 'Vote Management', path: '/admin/votes', icon: BarChart3 },
    { name: 'Contribution Management', path: '/admin/contributions', icon: Coins },
  ];

  const isActive = (path) => location.pathname === path;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-black/20 backdrop-blur-md border-b border-white/10">
      <div className="w-full pl-0 pr-4 sm:pr-6 lg:pr-8">
        <div className="flex items-center justify-between h-16 overflow-visible flex-nowrap">
          <div className="flex items-center flex-shrink-0 pl-4 sm:pl-6">
            <Link to="/" className="flex items-center">
              <img src={logoPath} alt="Victim DAO" className="h-[180px] w-auto" draggable={false} />
            </Link>
          </div>


          <div className="hidden md:flex flex-1 items-center justify-center space-x-8 min-w-0">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;

              // For protected routes when user is not logged in, redirect to login
              if (item.protected && !user) {
                return (
                  <Link
                    key={item.name}
                    to="/login"
                    className="flex items-center space-x-1 px-3 py-2 rounded-lg transition-all duration-200 text-gray-300 hover:text-white hover:bg-white/10"
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              }

              return (
                <Link
                  key={item.name}
                  to={item.path}
                  className={`flex items-center space-x-1 px-3 py-2 rounded-lg transition-all duration-200 ${isActive(item.path)
                    ? 'bg-white/20 text-white'
                    : 'text-gray-300 hover:text-white hover:bg-white/10'
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* User Menu */}
          <div className="hidden md:flex items-center space-x-4 flex-shrink-0">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  className="flex items-center space-x-2 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 transition-all duration-200"
                >
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {(user.fullName || user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim()).charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-white">{user.fullName || user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim()}</span>
                </button>

                <AnimatePresence>
                  {isProfileOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -10 }}
                      className="absolute right-0 mt-2 w-48 bg-gray-900/95 backdrop-blur-md rounded-lg border border-white/10 shadow-xl"
                    >
                      <div className="p-2">
                        <Link
                          to="/profile"
                          className="flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-all duration-200"
                          onClick={() => setIsProfileOpen(false)}
                        >
                          <User className="w-4 h-4" />
                          <span>Profile</span>
                        </Link>

                        {user.role === 'admin' && (
                          <>
                            <div className="border-t border-white/10 my-2"></div>
                            {adminItems.map((item) => {
                              const Icon = item.icon;
                              return (
                                <Link
                                  key={item.name}
                                  to={item.path}
                                  className="flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-all duration-200"
                                  onClick={() => setIsProfileOpen(false)}
                                >
                                  <Icon className="w-4 h-4" />
                                  <span>{item.name}</span>
                                </Link>
                              );
                            })}
                          </>
                        )}

                        <div className="border-t border-white/10 my-2"></div>
                        <button
                          onClick={handleLogout}
                          className="flex items-center space-x-2 px-3 py-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-200 w-full"
                        >
                          <LogOut className="w-4 h-4" />
                          <span>Logout</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  to="/login"
                  className="text-gray-300 hover:text-white transition-colors duration-200"
                >
                  Login
                </Link>
                <button
                  onClick={handleJoinNow}
                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium hover:from-purple-700 hover:to-blue-700 transition-all duration-200 shadow-lg shadow-purple-500/20"
                >
                  Join Now
                </button>
              </div>
            )}
          </div>

          {/* Mobile menu button */}
          <div className="md:hidden">
            <button
              onClick={() => setIsOpen(!isOpen)}
              className="text-gray-300 hover:text-white p-2"
            >
              {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>
      </div>

      {/* Mobile Navigation */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="md:hidden bg-black/30 backdrop-blur-md border-t border-white/10 max-h-[calc(100vh-4rem)] overflow-y-auto"
          >
            <div className="px-4 py-4 pb-6 space-y-2">
              {filteredNavItems.map((item) => {
                const Icon = item.icon;

                // For protected routes when user is not logged in, redirect to login
                if (item.protected && !user) {
                  return (
                    <Link
                      key={item.name}
                      to="/login"
                      className="flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 text-gray-300 hover:text-white hover:bg-white/10"
                      onClick={() => setIsOpen(false)}
                    >
                      <Icon className="w-4 h-4" />
                      <span>{item.name}</span>
                    </Link>
                  );
                }

                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-all duration-200 ${isActive(item.path)
                      ? 'bg-white/20 text-white'
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                      }`}
                    onClick={() => setIsOpen(false)}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.name}</span>
                  </Link>
                );
              })}

              {user && user.role === 'admin' && (
                <>
                  <div className="border-t border-white/10 my-2"></div>
                  {adminItems.map((item) => {
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.name}
                        to={item.path}
                        className="flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-all duration-200"
                        onClick={() => setIsOpen(false)}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.name}</span>
                      </Link>
                    );
                  })}
                </>
              )}

              {user ? (
                <>
                  <div className="border-t border-white/10 my-2"></div>
                  <Link
                    to="/profile"
                    className="flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-all duration-200"
                    onClick={() => setIsOpen(false)}
                  >
                    <User className="w-4 h-4" />
                    <span>Profile</span>
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout();
                      setIsOpen(false);
                    }}
                    className="flex items-center space-x-2 px-3 py-2 rounded-lg text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all duration-200 w-full"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </>
              ) : (
                <>
                  <div className="border-t border-white/10 my-2"></div>
                  <Link
                    to="/login"
                    className="flex items-center space-x-2 px-3 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-all duration-200"
                    onClick={() => setIsOpen(false)}
                  >
                    <span>Login</span>
                  </Link>
                  <button
                    onClick={() => {
                      handleJoinNow();
                      setIsOpen(false);
                    }}
                    className="flex items-center justify-center space-x-2 px-3 py-3 rounded-lg bg-gradient-to-r from-purple-600 to-blue-600 text-white font-medium hover:from-purple-700 hover:to-blue-700 transition-all duration-200 w-full"
                  >
                    <span>Join Now</span>
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </nav>
  );
};

export default Navbar;

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Shield, User, Lock, RefreshCw, Save } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

const AdminSettingsPanel = () => {
    const [loading, setLoading] = useState(false);
    const [profile, setProfile] = useState({ username: '', email: '' });
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');

    useEffect(() => {
        loadProfile();
    }, []);

    const loadProfile = async () => {
        try {
            const token = localStorage.getItem('adminToken');
            const { data } = await axios.get('/api/admin/profile', {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (data.success) {
                setProfile(data.data);
                setUsername(data.data.username);
            }
        } catch (err) {
            console.error('Error loading admin profile:', err);
        }
    };

    const handleUpdate = async (e) => {
        e.preventDefault();

        // Validate
        if (!username.trim()) {
            return toast.error('Username cannot be empty');
        }

        setLoading(true);
        try {
            const token = localStorage.getItem('adminToken');
            const headers = { Authorization: `Bearer ${token}` };

            // Update Username if changed
            if (username !== profile.username) {
                await axios.post('/api/admin/update-username', { username }, { headers });
                toast.success('Username updated successfully');
            }

            // Update Password if provided
            if (password) {
                if (password !== confirmPassword) {
                    setLoading(false);
                    return toast.error('Passwords do not match');
                }
                if (password.length < 8) {
                    setLoading(false);
                    return toast.error('Password must be at least 8 characters');
                }
                await axios.post('/api/admin/update-password', { newPassword: password }, { headers });
                toast.success('Password updated successfully');
                setPassword('');
                setConfirmPassword('');
            }

            loadProfile();
        } catch (error) {
            toast.error(error.response?.data?.message || 'Update failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto py-8">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden"
            >
                <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 text-white">
                    <div className="flex items-center gap-3">
                        <Shield className="w-8 h-8" />
                        <div>
                            <h2 className="text-xl font-bold">Admin Settings</h2>
                            <p className="text-purple-100 text-sm">Manage your administrative credentials</p>
                        </div>
                    </div>
                </div>

                <form onSubmit={handleUpdate} className="p-8 space-y-6">
                    {/* Username Field */}
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                            <User className="w-4 h-4 text-purple-600" />
                            Admin Username
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none"
                            placeholder="Enter new username"
                        />
                    </div>

                    <div className="pt-4 border-t border-gray-100">
                        <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">Change Password</h3>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                    <Lock className="w-4 h-4 text-purple-600" />
                                    New Password
                                </label>
                                <input
                                    type="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none"
                                    placeholder="Min 8 characters"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-2 flex items-center gap-2">
                                    <Lock className="w-4 h-4 text-purple-600" />
                                    Confirm Password
                                </label>
                                <input
                                    type="password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all outline-none"
                                    placeholder="Repeat new password"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="pt-6">
                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-xl font-bold text-lg shadow-lg hover:shadow-purple-500/20 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                        >
                            {loading ? (
                                <RefreshCw className="w-5 h-5 animate-spin" />
                            ) : (
                                <Save className="w-5 h-5" />
                            )}
                            Update Admin Profile
                        </button>
                    </div>
                </form>
            </motion.div>

            <div className="mt-8 bg-blue-50 border border-blue-100 rounded-xl p-4 flex items-start gap-3">
                <Shield className="w-5 h-5 text-blue-500 mt-1" />
                <div>
                    <h4 className="text-sm font-bold text-blue-900">Security Note</h4>
                    <p className="text-sm text-blue-700">
                        Changing these settings will update your login credentials immediately.
                        The server's environment configuration (.env) will also be updated to ensure persistence.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default AdminSettingsPanel;

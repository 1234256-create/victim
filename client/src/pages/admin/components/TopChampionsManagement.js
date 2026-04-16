import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { motion } from 'framer-motion';
import {
    Trophy,
    Save,
    RefreshCw,
    Users as UsersIcon,
    Settings as SettingsIcon,
    Star,
    CheckCircle2,
    PlusCircle
} from 'lucide-react';
import toast from 'react-hot-toast';

const TopChampionsManagement = () => {
    const [slots, setSlots] = useState(Array.from({ length: 10 }, (_, i) => ({
        slotIndex: i + 1,
        user: null,
        firstName: '',
        lastName: '',
        displayRank: i + 1,
        points: 0,
        isNew: true
    })));
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(null); // rank index being saved
    const [baseUserCount, setBaseUserCount] = useState(6000);
    const [loadingSettings, setLoadingSettings] = useState(false);

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('adminToken');
            const headers = token ? { Authorization: `Bearer ${token}` } : undefined;

            // 1. Fetch current top users (we fetch a reasonable batch to find overrides)
            const res = await axios.get('/api/users/leaderboard', {
                params: { limit: 100, type: 'total' },
                headers
            });
            const allUsers = res.data?.data?.users || res.data?.data?.leaderboard || [];

            // 2. Map users to 1-10 slots based on rankOverride
            const newSlots = Array.from({ length: 10 }, (_, i) => {
                const userAtSlot = allUsers[i];
                const defaultRank = i + 1;

                if (userAtSlot) {
                    return {
                        slotIndex: defaultRank,
                        user: userAtSlot,
                        firstName: userAtSlot.firstName || '',
                        lastName: userAtSlot.lastName || '',
                        displayRank: userAtSlot.overrides?.rankOverride || userAtSlot.displayRank || defaultRank,
                        points: userAtSlot.points || 0,
                        isNew: false
                    };
                }
                return {
                    slotIndex: defaultRank,
                    user: null,
                    firstName: '',
                    lastName: '',
                    displayRank: defaultRank,
                    points: 0,
                    isNew: true
                };
            });
            setSlots(newSlots);

            // 3. Fetch Base Count
            const settingsRes = await axios.get('/api/settings/BASE_USER_COUNT');
            if (settingsRes.data?.success && settingsRes.data?.data?.value) {
                setBaseUserCount(Number(settingsRes.data.data.value));
            }

        } catch (error) {
            console.error('Error fetching data:', error);
            toast.error('Failed to load management data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleSlotChange = (index, field, value) => {
        setSlots(prev => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    };

    const handleSaveSlot = async (index) => {
        const slot = slots[index];
        const token = localStorage.getItem('adminToken');
        const headers = { Authorization: `Bearer ${token}` };

        try {
            setSaving(index);

            let userId = slot.user?._id;

            // 1. If no user, create a virtual one
            if (!userId) {
                const createRes = await axios.post('/api/users', {
                    firstName: slot.firstName || `Champion`,
                    lastName: slot.lastName || `#${slot.targetRank}`,
                    isVirtual: true,
                    points: slot.points
                }, { headers });

                userId = createRes.data?.data?.user?.id || createRes.data?.data?.user?._id;

                if (!userId) throw new Error("Failed to create user");

                // Set the rank override for the new user
                await axios.put(`/api/users/${userId}/dashboard-data`, {
                    rank: Number(slot.displayRank)
                }, { headers });

            } else {
                // 2. If user exists, update details
                // Update Name
                await axios.put(`/api/users/${userId}`, {
                    firstName: slot.firstName,
                    lastName: slot.lastName
                }, { headers });

                // Update Points (calculate delta)
                const currentPoints = slot.user.points || 0;
                const delta = Number(slot.points) - currentPoints;
                if (delta !== 0) {
                    await axios.put(`/api/users/${userId}/points`, {
                        amount: Math.abs(delta),
                        type: delta > 0 ? 'add' : 'deduct',
                        category: 'bonus',
                        reason: 'Manual adjustment from Top Champions panel'
                    }, { headers });
                }

                // Update Rank Override
                await axios.put(`/api/users/${userId}/dashboard-data`, {
                    rank: Number(slot.displayRank)
                }, { headers });
            }

            toast.success(`Slot #${slot.slotIndex} updated!`);
            fetchData();
        } catch (error) {
            console.error('Save error:', error);
            toast.error(error.response?.data?.message || 'Failed to save slot');
        } finally {
            setSaving(null);
        }
    };

    const handleUpdateBaseCount = async () => {
        try {
            setLoadingSettings(true);
            const token = localStorage.getItem('adminToken');
            const headers = { Authorization: `Bearer ${token}` };

            await axios.put('/api/settings/BASE_USER_COUNT', {
                value: baseUserCount,
                description: 'Total user base count for default ranking display'
            }, { headers });

            toast.success('Base user count updated');
        } catch (error) {
            console.error('Error updating base count:', error);
            toast.error('Failed to update base count');
        } finally {
            setLoadingSettings(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                        <Trophy className="w-8 h-8 text-yellow-500" />
                        Top 10 Champions Management
                    </h2>
                    <p className="text-gray-500">Directly manage the names and points for the Elite Top 10</p>
                </div>
                <button
                    onClick={fetchData}
                    className="p-2 text-gray-500 hover:text-purple-600 transition-colors"
                >
                    <RefreshCw className={`w-6 h-6 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {/* 10-Row Table */}
            <div className="bg-white rounded-2xl shadow-xl border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50 border-b border-gray-200">
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider w-20">Slot</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider min-w-[150px]">First Name</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider min-w-[150px]">Last Name</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider w-56">Display Rank</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider w-64">Total Points</th>
                                <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase tracking-wider text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {slots.map((slot, idx) => (
                                <motion.tr
                                    key={slot.slotIndex}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: idx * 0.05 }}
                                    className="hover:bg-purple-50/30 transition-colors"
                                >
                                    <td className="px-6 py-4">
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold shadow-sm ${idx === 0 ? 'bg-yellow-100 text-yellow-700 ring-2 ring-yellow-400' :
                                            idx === 1 ? 'bg-gray-100 text-gray-600 ring-2 ring-gray-300' :
                                                idx === 2 ? 'bg-orange-100 text-orange-700 ring-2 ring-orange-400' :
                                                    'bg-white text-gray-400 border border-gray-200'
                                            }`}>
                                            {idx + 1}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <input
                                            type="text"
                                            value={slot.firstName}
                                            onChange={(e) => handleSlotChange(idx, 'firstName', e.target.value)}
                                            placeholder="Enter first name..."
                                            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <input
                                            type="text"
                                            value={slot.lastName}
                                            onChange={(e) => handleSlotChange(idx, 'lastName', e.target.value)}
                                            placeholder="Enter last name..."
                                            className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">#</span>
                                            <input
                                                type="number"
                                                value={slot.displayRank}
                                                onChange={(e) => handleSlotChange(idx, 'displayRank', e.target.value)}
                                                className="w-full pl-7 bg-white border border-gray-200 rounded-lg px-2 py-2 text-sm font-bold text-purple-600 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                                            />
                                        </div>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="relative">
                                            <Star className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-yellow-500" />
                                            <input
                                                type="number"
                                                value={slot.points}
                                                onChange={(e) => handleSlotChange(idx, 'points', e.target.value)}
                                                className="w-full pl-9 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-bold text-gray-800 focus:ring-2 focus:ring-purple-500 outline-none transition-all"
                                            />
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-right">
                                        <button
                                            onClick={() => handleSaveSlot(idx)}
                                            disabled={saving !== null}
                                            className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-bold text-xs transition-all active:scale-95 shadow-sm ${slot.isNew
                                                ? 'bg-blue-600 text-white hover:bg-blue-700'
                                                : 'bg-green-600 text-white hover:bg-green-700'
                                                } disabled:opacity-50`}
                                        >
                                            {saving === idx ? (
                                                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                            ) : slot.isNew ? (
                                                <PlusCircle className="w-3.5 h-3.5" />
                                            ) : (
                                                <Save className="w-3.5 h-3.5" />
                                            )}
                                            {slot.isNew ? 'Assign Slot' : 'Update Champion'}
                                        </button>
                                    </td>
                                </motion.tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {!loading && slots.every(s => s.isNew) && (
                    <div className="p-8 text-center bg-gray-50 border-t border-gray-100">
                        <CheckCircle2 className="w-10 h-10 text-gray-300 mx-auto mb-2" />
                        <p className="text-gray-500 italic">No champions are currently assigned to these slots. Fill in names to create them.</p>
                    </div>
                )}
            </div>

            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 text-blue-900">
                <h4 className="font-bold flex items-center gap-2 mb-2">
                    <Trophy className="w-5 h-5 text-blue-600" />
                    How it works
                </h4>
                <p className="text-sm leading-relaxed">
                    By filling out a row and clicking <strong>"Assign Slot"</strong>, you create a virtual account that is forced to appear at that specific rank on the leaderboard.
                    If a real user starts earning points that would naturally push them into the Top 10, they will compete for space alongside these manually managed champions.
                    This allows you to seed the top of your leaderboard with your desired elite members.
                </p>
            </div>
        </div>
    );
};

export default TopChampionsManagement;

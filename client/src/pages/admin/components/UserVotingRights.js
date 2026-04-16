import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Search,
  Vote,
  Edit2,
  Save,
  X,
  Shield,
  AlertCircle,
  Filter
} from 'lucide-react';
import toast from 'react-hot-toast';

const UserVotingRights = () => {
  const [activeVotes, setActiveVotes] = useState([]);
  const [selectedVoteId, setSelectedVoteId] = useState('');
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editValue, setEditValue] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchActiveVotes();

    // Listen for real-time updates
    let ws = null;
    const connectWebSocket = () => {
      try {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const host = window.location.hostname;
        const port = window.location.port;
        let primaryUrl = `${protocol}//${host}${port ? `:${port}` : ''}/ws`;
        if (process.env.NODE_ENV === 'development' && port === '3006') {
          primaryUrl = `${protocol}//${host}:3000/ws`;
        }

        ws = new WebSocket(primaryUrl);

        ws.onopen = () => {
          console.log('UserVotingRights WebSocket connected');
        };

        ws.onmessage = (ev) => {
          try {
            const payload = JSON.parse(ev.data);
            if (payload && payload.type) {
              if (/vote_(updated|started|paused|resumed|created)/i.test(payload.type)) {
                fetchActiveVotes();
              }
              if (/user_(voting_updated|overrides_updated|updated|fetched)/i.test(payload.type)) {
                if (selectedVoteId) fetchUsersForVote(selectedVoteId);
              }
            }
          } catch (err) {
            console.error('Error parsing WebSocket message:', err);
          }
        };
      } catch (err) {
        console.error('Error creating WebSocket connection:', err);
      }
    };

    connectWebSocket();

    return () => {
      if (ws) {
        ws.close();
      }
    };
  }, [selectedVoteId]);

  const fetchActiveVotes = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) return;
      const headers = { Authorization: `Bearer ${token}` };
      // Fetch all votes including paused ones so admin can manage them
      const res = await axios.get('/api/votes?limit=50', { headers });
      if (res.data?.success) {
        const votes = res.data.data.votes || [];
        // Filter relevant votes (active/paused)
        const active = votes.filter(v => ['active', 'paused'].includes(v.status));
        setActiveVotes(active);

        // Auto-select first active vote if none selected
        if (!selectedVoteId && active.length > 0) {
          setSelectedVoteId(active[0].id || active[0]._id);
          fetchUsersForVote(active[0].id || active[0]._id, active[0]);
        } else if (selectedVoteId) {
          // Refresh current selection data if needed
          const current = votes.find(v => (v.id || v._id) === selectedVoteId);
          if (current) fetchUsersForVote(selectedVoteId, current);
        }
      }
    } catch (error) {
      console.error('Error fetching votes:', error);
    }
  };

  const fetchUsersForVote = async (voteId, voteData = null) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const headers = { Authorization: `Bearer ${token}` };

      // We need both users list AND the vote details (overrides/submissions)
      // Since GET /api/votes returns full data for admin, we can use that.
      // Ideally we should have a specific endpoint, but we'll combine data here.

      let currentVote = voteData;
      if (!currentVote) {
        const vRes = await axios.get('/api/votes', { headers });
        const votes = vRes.data?.data?.votes || [];
        currentVote = votes.find(v => (v.id || v._id) === voteId);
      }

      if (!currentVote) {
        setLoading(false);
        return;
      }

      // Fetch users
      const uRes = await axios.get('/api/users?limit=1000', { headers });
      const allUsers = uRes.data?.data?.users || [];

      // Merge data
      const mergedUsers = allUsers.map(user => {
        const uid = user.id || user._id;
        const base = currentVote.maxVotesPerUser || 1;
        const offset = (currentVote.overrides && currentVote.overrides[uid]) ? Number(currentVote.overrides[uid]) : 0;
        const used = (currentVote.submissions && currentVote.submissions[uid]) ? Number(currentVote.submissions[uid]) : 0;
        const total = Math.max(0, base + offset);
        const remaining = Math.max(0, total - used);

        return {
          ...user,
          voteData: {
            base,
            offset,
            total,
            used,
            remaining
          }
        };
      });

      setUsers(mergedUsers);
    } catch (error) {
      console.error('Error loading users/vote data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const handleVoteChange = (e) => {
    const vid = e.target.value;
    setSelectedVoteId(vid);
    if (vid) fetchUsersForVote(vid);
  };

  const handleEdit = (user) => {
    setEditingId(user.id || user._id);
    // Edit the TOTAL allowance (Base + Offset)
    setEditValue(user.voteData.total);
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValue('');
  };

  const handleSave = async (userId, user) => {
    try {
      setSubmitting(true);
      const token = localStorage.getItem('adminToken');
      const headers = { Authorization: `Bearer ${token}` };

      const newTotal = Math.max(0, parseInt(editValue) || 0);
      const base = user.voteData.base;
      // Calculate needed offset: Total = Base + Offset => Offset = Total - Base
      const offset = newTotal - base;

      await axios.put(`/api/votes/${selectedVoteId}/users/${userId}/override`, {
        offset
      }, { headers });

      toast.success('Voting rights updated successfully');
      fetchUsersForVote(selectedVoteId); // Refresh list
      handleCancel();
    } catch (error) {
      console.error('Error updating voting rights:', error);
      toast.error(error?.response?.data?.message || 'Failed to update voting rights');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredUsers = users.filter(user => {
    const term = searchQuery.toLowerCase();
    const fullName = `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase();
    const email = (user.email || '').toLowerCase();
    return fullName.includes(term) || email.includes(term);
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">User Voting Rights</h2>
          <p className="text-gray-500">Manage voting power per active vote</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <select
              value={selectedVoteId}
              onChange={handleVoteChange}
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent min-w-[200px]"
            >
              {activeVotes.length === 0 && <option value="">No active votes</option>}
              {activeVotes.map(v => (
                <option key={v.id || v._id} value={v.id || v._id}>
                  {v.title} ({v.status})
                </option>
              ))}
            </select>
          </div>


        </div>
      </div>

      {!selectedVoteId ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-300">
          <p className="text-gray-500">Please select an active vote to manage user rights.</p>
        </div>
      ) : (
        /* Users Table */
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Base Rights</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Admin Adj.</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Cap.</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Used</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remaining</th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {loading ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                        Loading users...
                      </div>
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                      No users found matching your search.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const userId = user.id || user._id;
                    const isEditing = editingId === userId;
                    const { base, offset, total, used, remaining } = user.voteData;

                    return (
                      <tr key={userId} className="hover:bg-gray-50 transition-colors">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="flex items-center">
                            <div className="flex-shrink-0 h-8 w-8">
                              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-xs font-medium">
                                {user.firstName?.[0]?.toUpperCase() || user.email?.[0]?.toUpperCase()}
                              </div>
                            </div>
                            <div className="ml-3">
                              <div className="text-sm font-medium text-gray-900">
                                {user.firstName} {user.lastName}
                              </div>
                              <div className="text-xs text-gray-500">{user.email}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {base}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${offset > 0 ? 'bg-green-100 text-green-800' : offset < 0 ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                            }`}>
                            {offset > 0 ? '+' : ''}{offset}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="0"
                                value={editValue}
                                onChange={(e) => setEditValue(e.target.value)}
                                className="w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-purple-500"
                              />
                            </div>
                          ) : (
                            <div className="text-sm font-bold text-gray-900">
                              {total}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {used}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className={`text-sm font-bold ${remaining > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {remaining}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                          {isEditing ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleSave(userId, user)}
                                disabled={submitting}
                                className="text-green-600 hover:text-green-900 disabled:opacity-50"
                              >
                                <Save className="w-5 h-5" />
                              </button>
                              <button
                                onClick={handleCancel}
                                disabled={submitting}
                                className="text-red-600 hover:text-red-900 disabled:opacity-50"
                              >
                                <X className="w-5 h-5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleEdit(user)}
                              className="text-purple-600 hover:text-purple-900"
                            >
                              <Edit2 className="w-5 h-5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserVotingRights;

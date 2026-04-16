import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  BarChart3,
  Users,
  Search,
  X
} from 'lucide-react';
import toast from 'react-hot-toast';
import { getVotes as dsGetVotes } from '../../../utils/datastore';

const VotingManagement = () => {
  const [votes, setVotes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newVote, setNewVote] = useState({
    title: '',
    description: '',
    options: [{ text: '', targetVotes: 0, votesOffset: 0 }],
    status: 'active',
    endTime: '',
    pointsReward: 10,
    maxVotesPerUser: 1,
    isProgressive: false
  });
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingVote, setEditingVote] = useState(null);
  const [durationHours, setDurationHours] = useState('');
  const [showVotersModal, setShowVotersModal] = useState(false);
  const [votersList, setVotersList] = useState([]);
  const [loadingVoters, setLoadingVoters] = useState(false);
  const [voterSearchTerm, setVoterSearchTerm] = useState('');
  const [activeVotersVote, setActiveVotersVote] = useState(null);

  useEffect(() => {
    loadVotes();
  }, []);

  const loadVotes = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        setVotes([]);
        toast.error('Admin authentication required');
        return;
      }
      const res = await axios.get('/api/votes', { params: { limit: 200 }, headers: { Authorization: `Bearer ${token}` } });
      const apiVotes = res.data?.data?.votes || [];
      const mapped = apiVotes.map((v) => ({
        id: v.id || v._id,
        title: v.title || '',
        description: v.description || '',
        options: (v.options || []).map((o, idx) => ({
          id: o.id || idx + 1,
          text: o.text || '',
          targetVotes: o.targetVotes || 0,
          votesOffset: o.votesOffset || 0,
          votes: o.votes || 0
        })),
        status: v.status || (v.isActive ? 'active' : 'paused'),
        isProgressive: !!v.isProgressive,
        endTime: v.endTime || null,
        startTime: v.startTime || null,
        totalVotes: v.totalVotes || 0,
        pointsReward: v.pointsReward || 0,
        maxVotesPerUser: v.maxVotesPerUser || 1,
        submissions: v.submissions ? (v.submissions instanceof Map ? Object.fromEntries(v.submissions) : v.submissions) : {}
      }));
      setVotes(mapped);
    } catch (e) {
      setVotes([]);
      const msg = e?.response?.data?.message || e?.message || 'Failed to load votes';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const createVote = async () => {
    if (!newVote.title.trim()) {
      toast.error('Enter a title');
      return;
    }
    const filteredOptions = (newVote.options || []).filter(o => o.text.trim());
    if (filteredOptions.length < 2) {
      toast.error('Add at least two non-empty options');
      return;
    }
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) { toast.error('Admin authentication required'); return; }
      const dh = Number(durationHours);
      const payload = {
        title: newVote.title,
        description: newVote.description,
        options: filteredOptions.map(o => ({
          text: o.text || '',
          targetVotes: Number(o.targetVotes) || 0,
          votesOffset: Number(o.votesOffset) || 0
        })),
        isProgressive: !!newVote.isProgressive,
        durationHours: Number.isFinite(dh) && dh > 0 ? dh : undefined,
        pointsReward: Number(newVote.pointsReward) || 0,
        maxVotesPerUser: Number(newVote.maxVotesPerUser) || 1
      };
      const res = await axios.post('/api/votes', payload, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data?.success) {
        toast.success('Vote created');
        setNewVote({ title: '', description: '', options: [{ text: '', targetVotes: 0, votesOffset: 0 }], status: 'draft', endTime: '', pointsReward: 10, maxVotesPerUser: 1, isProgressive: false });
        setDurationHours('');
        setShowCreateModal(false);
        await loadVotes();
      }
    } catch (e) {
      const msg = e.response?.data?.message || e.message || 'Failed to create vote';
      toast.error(msg);
    }
  };

  const openEditModal = (vote) => {
    let dh = 24; // default
    if (vote.startTime && vote.endTime) {
      const ms = new Date(vote.endTime).getTime() - new Date(vote.startTime).getTime();
      dh = Math.round(ms / 3600000);
    }
    setEditingVote({ ...vote, durationHours: dh });
    setShowEditModal(true);
  };

  const handleUpdateVote = async () => {
    if (!editingVote) return;
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) { toast.error('Admin authentication required'); return; }
      const payload = {
        title: editingVote.title,
        description: editingVote.description,
        isProgressive: !!editingVote.isProgressive,
        pointsReward: Number(editingVote.pointsReward) || 0,
        maxVotesPerUser: Number(editingVote.maxVotesPerUser) || 1,
        durationHours: Number(editingVote.durationHours) || 24,
        options: (editingVote.options || []).map(o => ({
          id: o.id,
          text: o.text || '',
          targetVotes: Number(o.targetVotes) || 0,
          votesOffset: Number(o.votesOffset) || 0,
          votes: Number(o.votes) || 0
        }))
      };
      const res = await axios.put(`/api/votes/${editingVote.id}`, payload, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data?.success) {
        toast.success('Vote updated');
        setShowEditModal(false);
        await loadVotes();
      }
    } catch (e) {
      const msg = e.response?.data?.message || e.message || 'Failed to update vote';
      toast.error(msg);
    }
  };

  const startVote = async (id) => {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) { toast.error('Admin authentication required'); return; }
      const res = await axios.put(`/api/votes/${id}/start`, { durationHours: 24 }, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data?.success) {
        toast.success('Vote started');
        await loadVotes();
      }
    } catch (e) {
      const msg = e.response?.data?.message || e.message || 'Failed to start vote';
      toast.error(msg);
    }
  };

  const stopVote = async (id) => {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) { toast.error('Admin authentication required'); return; }
      const res = await axios.put(`/api/votes/${id}/pause`, {}, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data?.success) {
        toast.success('Vote paused');
        await loadVotes();
      }
    } catch (e) {
      const msg = e.response?.data?.message || e.message || 'Failed to pause vote';
      toast.error(msg);
    }
  };

  const deleteVote = async (id) => {
    if (!window.confirm('Delete this vote?')) return;
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) { toast.error('Admin authentication required'); return; }
      const res = await axios.delete(`/api/votes/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      if (res.data?.success) {
        toast.success('Vote deleted');
        await loadVotes();
      }
    } catch (e) {
      const msg = e.response?.data?.message || e.message || 'Failed to delete vote';
      toast.error(msg);
    }
  };

  const addOption = () => {
    setNewVote((curr) => ({ ...curr, options: [...(curr.options || []), { text: '', targetVotes: 0, votesOffset: 0 }] }));
  };

  const removeOption = (idx) => {
    setNewVote((curr) => ({ ...curr, options: curr.options.filter((_, i) => i !== idx) }));
  };

  const openVotersModal = async (vote) => {
    setActiveVotersVote(vote);
    setShowVotersModal(true);
    setLoadingVoters(true);
    setVoterSearchTerm('');
    try {
      const token = localStorage.getItem('adminToken');
      const res = await axios.get(`/api/votes/${vote.id}/voters`, { headers: { Authorization: `Bearer ${token}` } });
      setVotersList(res.data?.data?.voters || []);
    } catch (e) {
      toast.error('Failed to load voters');
      setShowVotersModal(false);
    } finally {
      setLoadingVoters(false);
    }
  };

  const filteredVoters = votersList.filter(v =>
    v.fullName.toLowerCase().includes(voterSearchTerm.toLowerCase()) ||
    v.email.toLowerCase().includes(voterSearchTerm.toLowerCase()) ||
    v.optionText.toLowerCase().includes(voterSearchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Voting Management</h2>
          <p className="text-gray-600 mt-1">Create rounds and set per-round voting rights</p>
        </div>
        <motion.button
          onClick={() => setShowCreateModal(true)}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700"
        >
          <Plus className="w-4 h-4" />
          Create Vote
        </motion.button>
      </div>

      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 10, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-3xl my-8"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Create Vote</h3>
                <button onClick={() => setShowCreateModal(false)} className="px-3 py-1 rounded bg-gray-100">Close</button>
              </div>
              <div className="space-y-4">
                <input value={newVote.title} onChange={(e) => setNewVote({ ...newVote, title: e.target.value })} placeholder="Vote Title" className="w-full px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" />

                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-100">
                  <input
                    type="checkbox"
                    id="isProgressive"
                    checked={newVote.isProgressive}
                    onChange={(e) => setNewVote({ ...newVote, isProgressive: e.target.checked })}
                    className="w-4 h-4 text-blue-600"
                  />
                  <label htmlFor="isProgressive" className="text-sm font-medium text-blue-900 cursor-pointer">
                    Enable Progressive Voting (votes trickle in over time)
                  </label>
                </div>

                <div>
                  <h4 className="text-sm font-semibold text-gray-700 mb-2">Options</h4>
                  <div className="space-y-3">
                    {newVote.options.map((opt, idx) => (
                      <div key={idx} className="flex flex-col md:flex-row gap-3 p-3 border rounded-lg bg-gray-50">
                        <div className="flex-1">
                          <label className="text-xs text-gray-500 mb-1 block">Option Text</label>
                          <input
                            value={opt.text}
                            onChange={(e) => {
                              const opts = [...newVote.options];
                              opts[idx].text = e.target.value;
                              setNewVote({ ...newVote, options: opts });
                            }}
                            placeholder={`Option ${idx + 1}`}
                            className="w-full px-3 py-2 border rounded"
                          />
                        </div>
                        <div className="w-full md:w-28">
                          <label className="text-xs text-gray-500 mb-1 block">Votes Offset</label>
                          <input
                            type="number"
                            value={opt.votesOffset}
                            onChange={(e) => {
                              const opts = [...newVote.options];
                              opts[idx].votesOffset = e.target.value;
                              setNewVote({ ...newVote, options: opts });
                            }}
                            className="w-full px-3 py-2 border rounded"
                          />
                        </div>
                        <div className="w-full md:w-28">
                          <label className="text-xs text-gray-500 mb-1 block">Target Votes</label>
                          <input
                            type="number"
                            min="0"
                            value={opt.targetVotes}
                            onChange={(e) => {
                              const opts = [...newVote.options];
                              opts[idx].targetVotes = e.target.value;
                              setNewVote({ ...newVote, options: opts });
                            }}
                            className="w-full px-3 py-2 border rounded"
                          />
                        </div>
                        <div className="flex items-end">
                          <button onClick={() => removeOption(idx)} className="px-3 py-2 text-red-600 bg-white border border-red-100 rounded hover:bg-red-50 transition-colors">Remove</button>
                        </div>
                      </div>
                    ))}
                    <button onClick={addOption} className="mt-2 px-3 py-2 bg-blue-600 text-white rounded-lg flex items-center justify-center gap-2 w-full hover:bg-blue-700 transition-colors"><Plus className="w-4 h-4" />Add More Options</button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex flex-col">
                    <label className="text-sm font-semibold text-gray-700 mb-1">Points Reward</label>
                    <input type="number" min={0} value={newVote.pointsReward} onChange={(e) => setNewVote({ ...newVote, pointsReward: e.target.value })} className="px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-sm font-semibold text-gray-700 mb-1">Max Votes/User</label>
                    <input type="number" min={1} value={newVote.maxVotesPerUser} onChange={(e) => setNewVote({ ...newVote, maxVotesPerUser: e.target.value })} className="px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                  <div className="flex flex-col">
                    <label className="text-sm font-semibold text-gray-700 mb-1">Duration (Hours)</label>
                    <input type="number" min={1} value={durationHours} onChange={(e) => setDurationHours(e.target.value)} className="px-4 py-2 border rounded focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                </div>

                <div className="flex items-center justify-end gap-3 pt-6 border-t mt-6">
                  <button onClick={() => setShowCreateModal(false)} className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors">Cancel</button>
                  <button onClick={createVote} className="px-8 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 shadow-md font-medium">Create Vote</button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showEditModal && editingVote && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8 pb-4 border-b">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900">Manipulate Vote Results</h2>
                    <p className="text-gray-500 text-sm">Fine-tune counts, targets, and artificial offsets</p>
                  </div>
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-400 hover:text-gray-600"
                  >
                    Close
                  </button>
                </div>

                <div className="space-y-6">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Vote Title</label>
                      <input
                        value={editingVote.title}
                        onChange={(e) => setEditingVote({ ...editingVote, title: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-blue-500 focus:ring-0 transition-all outline-none font-medium"
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-4 bg-blue-50 rounded-xl border border-blue-100">
                    <input
                      type="checkbox"
                      id="editIsProgressive"
                      checked={editingVote.isProgressive}
                      onChange={(e) => setEditingVote({ ...editingVote, isProgressive: e.target.checked })}
                      className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                    />
                    <div>
                      <label htmlFor="editIsProgressive" className="text-sm font-bold text-blue-900 cursor-pointer block">Progressive Simulation</label>
                      <p className="text-blue-700/70 text-xs">When enabled, votes trickle in towards the target over time</p>
                    </div>
                  </div>

                  {/* Options Manipulation */}
                  <div>
                    <div className="flex items-center justify-between mb-3 px-1">
                      <h4 className="text-sm font-bold text-gray-700 uppercase tracking-widest">Options & Manipulation</h4>
                      <span className="text-[10px] text-gray-400">Values update for users in real-time</span>
                    </div>

                    <div className="space-y-4">
                      {editingVote.options.map((opt, idx) => (
                        <div key={idx} className="bg-gray-50/50 p-5 rounded-2xl border-2 border-gray-100/80 hover:border-blue-200 transition-colors">
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="md:col-span-2">
                              <label className="text-[10px] font-bold text-gray-400 uppercase mb-1 block">Option Text</label>
                              <input
                                value={opt.text}
                                onChange={(e) => {
                                  const opts = [...editingVote.options];
                                  opts[idx].text = e.target.value;
                                  setEditingVote({ ...editingVote, options: opts });
                                }}
                                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:border-blue-400 outline-none transition-all"
                              />
                            </div>

                            <div>
                              <label className="text-[10px] font-bold text-blue-500 uppercase mb-1 block">Votes Offset (Fake)</label>
                              <input
                                type="number"
                                value={opt.votesOffset}
                                onChange={(e) => {
                                  const opts = [...editingVote.options];
                                  opts[idx].votesOffset = e.target.value;
                                  setEditingVote({ ...editingVote, options: opts });
                                }}
                                className="w-full px-4 py-2 border-2 border-blue-100 rounded-lg focus:border-blue-500 outline-none transition-all font-bold text-blue-600"
                              />
                            </div>

                            <div className="md:col-span-1">
                              <label className="text-[10px] font-bold text-purple-500 uppercase mb-1 block">Goal Votes</label>
                              <input
                                type="number"
                                value={opt.targetVotes}
                                onChange={(e) => {
                                  const opts = [...editingVote.options];
                                  opts[idx].targetVotes = e.target.value;
                                  setEditingVote({ ...editingVote, options: opts });
                                }}
                                className="w-full px-4 py-2 border-2 border-purple-100 rounded-lg focus:border-purple-500 outline-none transition-all font-bold text-purple-600"
                              />
                            </div>

                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Points Reward</label>
                      <input
                        type="number"
                        value={editingVote.pointsReward}
                        onChange={(e) => setEditingVote({ ...editingVote, pointsReward: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Max Votes per User</label>
                      <input
                        type="number"
                        value={editingVote.maxVotesPerUser}
                        onChange={(e) => setEditingVote({ ...editingVote, maxVotesPerUser: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1 block">Duration (Hours)</label>
                      <input
                        type="number"
                        value={editingVote.durationHours}
                        onChange={(e) => setEditingVote({ ...editingVote, durationHours: e.target.value })}
                        className="w-full px-4 py-2 border border-gray-200 rounded-lg outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-end gap-4 pt-8 border-t mt-6">
                    <button
                      onClick={() => setShowEditModal(false)}
                      className="px-6 py-3 bg-gray-50 text-gray-600 rounded-xl hover:bg-gray-100 transition-colors font-bold text-sm"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleUpdateVote}
                      className="px-10 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl hover:from-blue-700 hover:to-indigo-700 shadow-lg shadow-blue-200 transition-all font-bold text-sm"
                    >
                      Save Manipulations
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showVotersModal && activeVotersVote && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col"
            >
              <div className="p-6 border-b flex items-center justify-between bg-gray-50/50 rounded-t-2xl">
                <div>
                  <h2 className="text-xl font-bold text-gray-900 border-none">Voter Details</h2>
                  <p className="text-gray-500 text-xs mt-0.5">{activeVotersVote.title}</p>
                </div>
                <button
                  onClick={() => setShowVotersModal(false)}
                  className="p-2 hover:bg-gray-200 rounded-lg transition-colors text-gray-500"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-4 border-b">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name, email or option..."
                    value={voterSearchTerm}
                    onChange={(e) => setVoterSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-gray-100 border-none rounded-xl focus:ring-2 focus:ring-blue-500 outline-none text-sm transition-all"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {loadingVoters ? (
                  <div className="flex flex-col items-center justify-center py-12 gap-4">
                    <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-gray-500 text-sm font-medium">Loading participants...</p>
                  </div>
                ) : filteredVoters.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-xl border-2 border-dashed border-gray-100">
                    <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No voters found match your criteria.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3">
                    {filteredVoters.map((voter, idx) => (
                      <div key={idx} className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl hover:shadow-md transition-shadow group">
                        <div className="flex items-center gap-4">
                          <div className="w-10 h-10 bg-blue-100 text-blue-600 rounded-lg flex items-center justify-center font-bold text-sm">
                            {voter.fullName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-gray-900 leading-none">{voter.fullName}</p>
                            <p className="text-xs text-blue-500 font-medium mt-1">{voter.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-6">
                          <div className="text-right">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Option Selected</p>
                            <span className="px-3 py-1 bg-purple-50 text-purple-700 text-xs font-bold rounded-lg border border-purple-100">
                              {voter.optionText}
                            </span>
                          </div>
                          <div className="text-right min-w-[120px]">
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Timestamp</p>
                            <p className="text-[11px] text-gray-600 font-medium">
                              {new Date(voter.votedAt).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 border-t bg-gray-50/50 rounded-b-2xl flex justify-between items-center">
                <p className="text-xs font-bold text-gray-500">Total Votes: <span className="text-gray-900">{filteredVoters.length}</span></p>
                <button
                  onClick={() => setShowVotersModal(false)}
                  className="px-6 py-2 bg-gray-900 text-white font-bold rounded-xl hover:bg-gray-800 transition-colors shadow-lg"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="bg-white rounded-xl p-6 shadow-lg border border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Existing Votes</h3>
        {loading ? (
          <div className="text-sm text-gray-600">Loading...</div>
        ) : (
          <div className="space-y-3">
            {votes.length === 0 && (
              <div className="text-sm text-gray-500">No votes found</div>
            )}
            {votes.map((v) => {
              const remainingLabel = v.endTime ? (() => {
                const end = new Date(v.endTime).getTime();
                const diff = end - Date.now();
                if (diff <= 0) return 'Ended';
                const h = Math.floor(diff / 3600000);
                const m = Math.floor((diff % 3600000) / 60000);
                return `${h}h ${m}m`;
              })() : '';
              const parts = [
                `Max/user: ${v.maxVotesPerUser || 1}`,
                `Total: ${v.totalVotes || 0}`
              ];
              if (remainingLabel) parts.push(remainingLabel);
              return (
                <div key={v.id} className="flex items-center justify-between border rounded-lg px-4 py-3">
                  <div className="flex items-center gap-3">
                    <BarChart3 className="w-5 h-5 text-blue-600" />
                    <div className="space-y-0.5">
                      <div className="font-semibold text-gray-900 flex items-center gap-2">
                        {v.title}
                        {v.isProgressive && <span className="px-1.5 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-bold uppercase rounded">Progressive</span>}
                      </div>
                      <div className="text-xs text-gray-600">{parts.join(' • ')}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-1 text-xs rounded-full ${v.status === 'active' ? 'bg-green-100 text-green-700' : v.status === 'paused' ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-100 text-gray-700'}`}>{v.status}</span>
                    <button onClick={() => startVote(v.id)} disabled={v.status === 'active'} className={`px-3 py-1.5 rounded text-white ${v.status === 'active' ? 'bg-green-400 cursor-not-allowed opacity-60' : 'bg-green-600'}`}>Start</button>
                    <button onClick={() => stopVote(v.id)} disabled={v.status !== 'active'} className={`px-3 py-1.5 rounded text-white ${v.status !== 'active' ? 'bg-yellow-400 cursor-not-allowed opacity-60' : 'bg-yellow-600'}`}>Stop</button>
                    <button onClick={() => openVotersModal(v)} className="px-3 py-1.5 bg-purple-600 text-white rounded flex items-center gap-1">
                      <Users className="w-4 h-4" />
                      Voters
                    </button>
                    <button onClick={() => openEditModal(v)} className="px-3 py-1.5 bg-blue-600 text-white rounded">Edit</button>
                    <button onClick={() => deleteVote(v.id)} className="px-3 py-1.5 bg-red-600 text-white rounded">Delete</button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default VotingManagement;

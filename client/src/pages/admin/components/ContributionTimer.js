import React, { useEffect, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Clock, Timer, RefreshCw, Play, Square, AlertTriangle, X as XIcon, Edit3 } from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import {
  getContributionTimer as dsGetContributionTimer,
  clearContributionTimer as dsClearContributionTimer,
  getContributionRounds as dsGetContributionRounds,
  addContributionRound as dsAddContributionRound,
  pauseContributionRound as dsPauseContributionRound,
  resumeContributionRound as dsResumeContributionRound,
  stopContributionRound as dsStopContributionRound,
  deleteContributionRound as dsDeleteContributionRound,
  updateContributionRound as dsUpdateContributionRound,
} from '../../../utils/datastore';

const ContributionTimer = () => {
  const [currentTimer, setCurrentTimer] = useState(null);
  const [rounds, setRounds] = useState([]);
  const [form, setForm] = useState({ name: '', description: '', durationHours: 1 });
  const [now, setNow] = useState(Date.now());
  const [showEditModal, setShowEditModal] = useState(false);
  const [editRound, setEditRound] = useState(null);
  const [editForm, setEditForm] = useState({ name: '', description: '', durationHours: '' });
  const [contribActive, setContribActive] = useState(true);
  const [publicContribEnabled, setPublicContribEnabled] = useState(false);

  const syncRoundToServer = async (round) => {
    try {
      const token = localStorage.getItem('adminToken');
      await axios.put('/api/settings/contributionRound', {
        value: round
      }, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
    } catch (e) {
      console.error('Failed to sync round to server:', e);
    }
  };

  const loadFromBackend = useCallback(async () => {
    try {
      const res = await axios.get('/api/settings/contributionRound');
      const round = res?.data?.data?.value;
      if (round && (round.status === 'running' || round.status === 'paused')) {
        // Sync local datastore with backend
        setCurrentTimer({ ...round, endTime: round.endTime ? new Date(round.endTime).getTime() : null });
        return;
      }
      
      // Fallback: If server is empty/stopped, check local
      const local = dsGetContributionTimer();
      if (local && local.endTime > Date.now()) {
        setCurrentTimer(local);
        // Sync to server
        await syncRoundToServer({
           ...local,
           startTime: new Date(local.startTime).toISOString(),
           endTime: new Date(local.endTime).toISOString(),
           status: 'running'
        });
        toast.success('Local timer synced to server');
      } else {
        setCurrentTimer(null);
      }
    } catch (e) {
      console.error('Failed to load round from backend:', e);
    }
  }, []);

  useEffect(() => {
    loadFromBackend();
    setCurrentTimer(dsGetContributionTimer());
    setRounds(dsGetContributionRounds());
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const syncInt = setInterval(loadFromBackend, 10000);
    
    const onUpdate = () => {
      setCurrentTimer(dsGetContributionTimer());
      setRounds(dsGetContributionRounds());
    };
    window.addEventListener('datastore:update', onUpdate);
    return () => {
      clearInterval(tick);
      clearInterval(syncInt);
      window.removeEventListener('datastore:update', onUpdate);
    };
  }, [loadFromBackend]);

  useEffect(() => {
    (async () => {
      try {
        const res = await axios.get('/api/settings/contributionActive');
        const val = res?.data?.data?.value;
        if (typeof val === 'boolean') setContribActive(val);

        const res2 = await axios.get('/api/settings/publicContributionsEnabled');
        const val2 = res2?.data?.data?.value;
        if (typeof val2 === 'boolean') setPublicContribEnabled(val2);
      } catch (e) {
        setContribActive(true);
      }
    })();
  }, []);

  const loadTimer = useCallback(() => {
    const t = dsGetContributionTimer();
    setCurrentTimer(t);
  }, []);

  const loadRounds = useCallback(() => {
    const list = dsGetContributionRounds();
    setRounds(list);
  }, []);

  const loadAll = useCallback(() => {
    loadTimer();
    loadRounds();
  }, [loadTimer, loadRounds]);

  const startTimer = () => {
    if (!form.name.trim()) {
      toast.error('Please enter a timer name');
      return;
    }
    const durationMs = (Number(form.durationHours) || 0) * 60 * 60 * 1000;
    const round = dsAddContributionRound({
      name: form.name,
      description: form.description,
      durationMs,
    });
    // addContributionRound keeps legacy timer in sync; refresh views
    loadAll();
    toast.success(`Round started: ${round.name}`);

    // Persist round window to backend Settings for server-side validation
    (async () => {
      try {
        const token = localStorage.getItem('adminToken');
        await axios.put('/api/settings/contributionRound', {
          value: {
            name: round.name,
            description: round.description,
            startTime: new Date(round.startTime).toISOString(),
            endTime: new Date(round.endTime).toISOString(),
            status: 'running'
          }
        }, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
        toast.success('Sync: Round persisted to server');
      } catch (err) { 
        console.error('Sync failed:', err);
        toast.error('Sync failed: Round might not be visible to users');
      }
    })();
  };

  const clearTimer = () => {
    dsClearContributionTimer();
    setCurrentTimer(null);
    toast.success('Contribution timer cleared');

    // Sync clear to backend (stop the active round)
    (async () => {
      try {
        const token = localStorage.getItem('adminToken');
        // We set status to stopped and endTime to now to effectively close the window
        // or we could set the whole value to null if we want to remove it entirely.
        // Setting to stopped is safer for history.
        let prev = null;
        try {
          const getRes = await axios.get('/api/settings/contributionRound');
          prev = getRes?.data?.data?.value || null;
        } catch (_) { }

        if (prev) {
          const value = {
            ...prev,
            status: 'stopped',
            endTime: new Date().toISOString()
          };
          await axios.put('/api/settings/contributionRound', { value }, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
        }
      } catch (_) { }
    })();
  };

  const timeRemaining = () => {
    if (!currentTimer?.endTime) return null;
    const diff = currentTimer.endTime - now;
    if (diff <= 0) return '00:00:00';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((diff % (1000 * 60)) / 1000);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const fmtMs = (ms) => {
    const safe = Math.max(0, Number(ms) || 0);
    const hours = Math.floor(safe / (1000 * 60 * 60));
    const minutes = Math.floor((safe % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((safe % (1000 * 60)) / 1000);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  };

  const pauseRound = (id) => {
    const r = dsPauseContributionRound(id);
    loadAll();
    if (r) {
      toast.success('Round paused');
      // Sync pause to backend
      (async () => {
        try {
          const token = localStorage.getItem('adminToken');
          let prev = null;
          try {
            const getRes = await axios.get('/api/settings/contributionRound');
            prev = getRes?.data?.data?.value || null;
          } catch (_) { }

          if (prev && prev.status === 'running') {
            const value = {
              ...prev,
              status: 'paused',
              pausedAt: new Date().toISOString()
            };
            await axios.put('/api/settings/contributionRound', { value }, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
          }
        } catch (_) { }
      })();
    }
  };

  const resumeRound = (id) => {
    const r = dsResumeContributionRound(id);
    loadAll();
    if (r) {
      toast.success('Round resumed');
      // Sync resume to backend
      (async () => {
        try {
          const token = localStorage.getItem('adminToken');
          let prev = null;
          try {
            const getRes = await axios.get('/api/settings/contributionRound');
            prev = getRes?.data?.data?.value || null;
          } catch (_) { }

          if (prev && prev.status === 'paused') {
            const now = Date.now();
            const remaining = r.remainingMs || 0;
            const endTime = new Date(now + remaining).toISOString();

            const value = {
              ...prev,
              status: 'running',
              pausedAt: null,
              startTime: new Date(now).toISOString(),
              endTime: endTime
            };
            await axios.put('/api/settings/contributionRound', { value }, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
          }
        } catch (_) { }
      })();
    }
  };

  const stopRound = (id) => {
    const r = dsStopContributionRound(id);
    loadAll();
    if (r) toast.success('Round stopped');

    // Mark round as stopped and set endTime to now on backend
    (async () => {
      try {
        const token = localStorage.getItem('adminToken');
        let prev = null;
        try {
          const getRes = await axios.get('/api/settings/contributionRound');
          prev = getRes?.data?.data?.value || null;
        } catch (_) { }
        const value = {
          ...(prev || {}),
          status: 'stopped',
          endTime: new Date().toISOString()
        };
        await axios.put('/api/settings/contributionRound', { value }, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
      } catch (_) { }
    })();
  };

  const deleteRound = (id) => {
    // Check if the round being deleted is the current running one (local check)
    // We can't easily check backend ID, but we can check if it's active locally.
    const rounds = dsGetContributionRounds(); // Get latest state
    const roundToDelete = rounds.find(r => r.id === id);
    const wasActive = roundToDelete && (roundToDelete.status === 'running' || roundToDelete.status === 'paused');

    dsDeleteContributionRound(id);
    loadAll();
    toast.success('Round deleted');

    if (wasActive) {
      // Sync delete to backend (stop the active round)
      (async () => {
        try {
          const token = localStorage.getItem('adminToken');
          let prev = null;
          try {
            const getRes = await axios.get('/api/settings/contributionRound');
            prev = getRes?.data?.data?.value || null;
          } catch (_) { }

          // Only stop if the backend round looks like the one we deleted (e.g. status matches or just safely stop if running)
          // To be safe: if we delete an active round locally, we should stop the backend round to prevent ghost points.
          if (prev && (prev.status === 'running' || prev.status === 'paused')) {
            const value = {
              ...prev,
              status: 'stopped',
              endTime: new Date().toISOString()
            };
            await axios.put('/api/settings/contributionRound', { value }, { headers: token ? { Authorization: `Bearer ${token}` } : undefined });
          }
        } catch (_) { }
      })();
    }
  };

  const openEditRound = (r) => {
    setEditRound(r);
    setEditForm({ name: r.name || '', description: r.description || '', durationHours: '' });
    setShowEditModal(true);
  };

  const saveEditRound = () => {
    if (!editRound) return;
    const updates = {};
    updates.name = editForm.name;
    updates.description = editForm.description;
    if (editForm.durationHours !== '') updates.durationHours = Number(editForm.durationHours);
    const updated = dsUpdateContributionRound(editRound.id, updates);
    setShowEditModal(false);
    setEditRound(null);
    loadAll();
    if (updated) toast.success('Round updated');
  };

  const togglePublicContribution = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await axios.put('/api/settings/publicContributionsEnabled', { value: !publicContribEnabled }, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      });
      const val = res?.data?.data?.value;
      setPublicContribEnabled(Boolean(val));
      toast.success(Boolean(val) ? 'Public contributions (no rounds) enabled' : 'Public contributions (no rounds) disabled');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update setting');
    }
  };

  const toggleContributionActive = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const res = await axios.put('/api/settings/contributionActive', { value: !contribActive }, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      });
      const val = res?.data?.data?.value;
      setContribActive(Boolean(val));
      toast.success(Boolean(val) ? 'Contributions enabled' : 'Contributions disabled');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Failed to update setting');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Contribution Timer</h2>
          <p className="text-gray-600 mt-1">Control when contributions are open and visible to users</p>
        </div>
        <motion.button
          onClick={() => {
            loadAll();
            loadFromBackend();
          }}
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg hover:bg-blue-100 border border-blue-200 transition-all duration-200 font-semibold"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh & Sync
        </motion.button>
      </div>

      {/* Create/Start Timer */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
      >
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Start a Contribution Window</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Timer Name</label>
            <div className="relative">
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Weekly Contribution Round"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-10"
              />
              {form.name && (
                <button
                  onClick={() => setForm({ ...form, name: '' })}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-700"
                >
                  <XIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Duration (hours)</label>
            <div className="relative">
              <input
                type="number"
                min="1"
                value={form.durationHours}
                onChange={(e) => setForm({ ...form, durationHours: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-10"
              />
              {form.durationHours > 1 && (
                <button
                  onClick={() => setForm({ ...form, durationHours: 1 })}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-700"
                >
                  <XIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Description (optional)</label>
            <div className="relative">
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Notes visible to admins"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent pr-10"
              />
              {form.description && (
                <button
                  onClick={() => setForm({ ...form, description: '' })}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-500 hover:text-gray-700"
                >
                  <XIcon className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 mt-4">
          <motion.button
            onClick={startTimer}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200"
          >
            <Play className="w-4 h-4" />
            Start Now
          </motion.button>
          {currentTimer && (
            <motion.button
              onClick={clearTimer}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors duration-200"
            >
              <Square className="w-4 h-4" />
              Clear Timer
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* Current Timer Status */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-orange-600" />
            <h3 className="text-lg font-semibold text-gray-900">Current Status</h3>
          </div>
          <div className="flex flex-col items-end gap-2">
            <div className="flex items-center gap-2">
              <span className={`text-sm font-medium ${contribActive ? 'text-green-600' : 'text-red-600'}`}>{contribActive ? 'Contributions Active' : 'Contributions Disabled'}</span>
              <button
                onClick={toggleContributionActive}
                className={`px-3 py-1 rounded-lg text-sm font-semibold border ${contribActive ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'}`}
              >
                {contribActive ? 'Disable' : 'Enable'}
              </button>
            </div>
            <div className="flex items-center gap-2 mt-1">
              <span className={`text-sm font-medium ${publicContribEnabled ? 'text-green-600' : 'text-orange-600'}`}>
                {publicContribEnabled ? 'Public (No Rounds) ON' : 'Public (No Rounds) OFF'}
              </span>
              <button
                onClick={togglePublicContribution}
                className={`px-3 py-1 rounded-lg text-sm font-semibold border ${publicContribEnabled ? 'bg-orange-50 text-orange-700 border-orange-200 hover:bg-orange-100' : 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100'}`}
              >
                {publicContribEnabled ? 'Disable Public' : 'Enable Public'}
              </button>
            </div>
          </div>
        </div>
        {!currentTimer ? (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" />
            <span>No active contribution timer. Users will not see countdown.</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-xs text-gray-500">Timer</p>
              <p className="text-sm font-medium text-gray-900">{currentTimer.name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Ends</p>
              <p className="text-sm font-medium text-gray-900">{new Date(currentTimer.endTime).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500">Time Remaining</p>
              <p className="font-mono font-bold text-red-600">{timeRemaining()}</p>
            </div>
          </div>
        )}
      </motion.div>

      {/* Contribution Rounds Management */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white rounded-xl shadow-lg border border-gray-200 p-6"
      >
        <div className="flex items-center gap-3 mb-4">
          <Timer className="w-5 h-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">Contribution Rounds</h3>
        </div>

        {rounds.length === 0 ? (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-gray-700">
            No rounds created yet. Start one above to begin.
          </div>
        ) : (
          <div className="space-y-4">
            {rounds.map((r) => {
              const isRunning = r.status === 'running';
              const isPaused = r.status === 'paused';
              const isStopped = r.status === 'stopped';
              const remaining = isRunning ? Math.max(0, (r.endTime || now) - now) : (isPaused ? r.remainingMs : 0);
              return (
                <div key={r.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-center">
                    <div>
                      <p className="text-xs text-gray-500">Name</p>
                      <p className="text-sm font-medium text-gray-900">{r.name}</p>
                      {r.description ? (
                        <p className="text-xs text-gray-500">{r.description}</p>
                      ) : null}
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Status</p>
                      <p className={`text-sm font-semibold ${isRunning ? 'text-green-600' : isPaused ? 'text-yellow-600' : 'text-gray-600'}`}>{r.status}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Start</p>
                      <p className="text-sm font-medium text-gray-900">{new Date(r.startTime).toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">End</p>
                      <p className="text-sm font-medium text-gray-900">{r.endTime ? new Date(r.endTime).toLocaleString() : '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Remaining</p>
                      <p className="font-mono font-bold text-blue-600">{fmtMs(remaining)}</p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 mt-3">
                    <motion.button
                      onClick={() => pauseRound(r.id)}
                      whileHover={{ scale: isRunning ? 1.02 : 1 }}
                      whileTap={{ scale: isRunning ? 0.98 : 1 }}
                      disabled={!isRunning}
                      className={`flex items-center gap-2 px-3 py-1 rounded-lg border transition-colors duration-200 ${isRunning ? 'bg-yellow-50 text-yellow-700 border-yellow-200 hover:bg-yellow-100' : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'}`}
                    >
                      Pause
                    </motion.button>

                    <motion.button
                      onClick={() => resumeRound(r.id)}
                      whileHover={{ scale: isPaused ? 1.02 : 1 }}
                      whileTap={{ scale: isPaused ? 0.98 : 1 }}
                      disabled={!isPaused}
                      className={`flex items-center gap-2 px-3 py-1 rounded-lg border transition-colors duration-200 ${isPaused ? 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100' : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'}`}
                    >
                      Resume
                    </motion.button>

                    <motion.button
                      onClick={() => stopRound(r.id)}
                      whileHover={{ scale: !isStopped ? 1.02 : 1 }}
                      whileTap={{ scale: !isStopped ? 0.98 : 1 }}
                      disabled={isStopped}
                      className={`flex items-center gap-2 px-3 py-1 rounded-lg border transition-colors duration-200 ${!isStopped ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100' : 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'}`}
                    >
                      Stop
                    </motion.button>

                    <motion.button
                      onClick={() => openEditRound(r)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center gap-2 px-3 py-1 rounded-lg border bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100 transition-colors duration-200"
                    >
                      <Edit3 className="w-4 h-4" />
                      Edit
                    </motion.button>

                    <motion.button
                      onClick={() => deleteRound(r.id)}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex items-center gap-2 px-3 py-1 rounded-lg border bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100 transition-colors duration-200"
                    >
                      Delete
                    </motion.button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {showEditModal && editRound && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl p-6 w-full max-w-md"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">Edit Contribution Round</h3>
                <button onClick={() => setShowEditModal(false)} className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200">
                  <XIcon className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Name</label>
                  <input
                    type="text"
                    value={editForm.name}
                    onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                  <input
                    type="text"
                    value={editForm.description}
                    onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">New Duration (hours)</label>
                  <input
                    type="number"
                    min="1"
                    value={editForm.durationHours}
                    onChange={(e) => setEditForm({ ...editForm, durationHours: e.target.value })}
                    placeholder={editRound.status === 'paused' ? 'Remaining hours when resumed' : 'Set new remaining time'}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div className="flex gap-3 mt-2">
                  <button onClick={() => setShowEditModal(false)} className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200">
                    Cancel
                  </button>
                  <button onClick={saveEditRound} className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200">
                    Save Changes
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ContributionTimer;
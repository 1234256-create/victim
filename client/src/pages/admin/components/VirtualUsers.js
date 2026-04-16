import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Search,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  RefreshCw,
  Award,
  Shield
} from 'lucide-react';
import toast from 'react-hot-toast';

const VirtualUsers = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditPointsModal, setShowEditPointsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);

  // New User Form State
  const [newUser, setNewUser] = useState({
    firstName: '',
    lastName: '',
    points: 0
  });

  // Edit Points Form State
  const [pointsForm, setPointsForm] = useState({
    amount: 0,
    type: 'add', // add or deduct
    category: 'bonus',
    reason: ''
  });

  const fetchVirtualUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const res = await axios.get('/api/users', {
        params: { type: 'virtual', limit: 100 },
        headers: { Authorization: `Bearer ${token}` }
      });
      setUsers(res.data.data.users || []);
    } catch (error) {
      console.error('Error fetching virtual users:', error);
      toast.error('Failed to fetch virtual users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVirtualUsers();
  }, []);

  const handleCreateUser = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('adminToken');

      // Ensure points and votingRights are valid numbers
      const userData = {
        ...newUser,
        isVirtual: true,
        points: newUser.points === '' ? 0 : newUser.points
      };

      await axios.post('/api/users', userData, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Virtual user created successfully');
      setShowCreateModal(false);
      setNewUser({ firstName: '', lastName: '', points: 0 });
      fetchVirtualUsers();
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error(error.response?.data?.message || 'Failed to create user');
    }
  };

  const handleUpdatePoints = async (e) => {
    e.preventDefault();
    if (!selectedUser) return;

    try {
      const token = localStorage.getItem('adminToken');
      // Ensure amount is a valid number before sending
      const amount = pointsForm.amount === '' ? 0 : pointsForm.amount;

      await axios.put(`/api/users/${selectedUser._id}/points`, {
        ...pointsForm,
        amount
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Points updated successfully');
      setShowEditPointsModal(false);
      setPointsForm({ amount: 0, type: 'add', category: 'bonus', reason: '' });
      fetchVirtualUsers();
    } catch (error) {
      console.error('Error updating points:', error);
      toast.error(error.response?.data?.message || 'Failed to update points');
    }
  };

  const filteredUsers = users.filter(user =>
    user.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Virtual Users</h2>
          <p className="text-gray-500">Manage virtual users and their points</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={fetchVirtualUsers}
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors shadow-sm"
          >
            <Plus className="w-5 h-5" />
            <span>Create User</span>
          </button>
        </div>
      </div>

      {/* Search and Stats */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search virtual users..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none transition-all"
          />
        </div>
        <div className="text-sm text-gray-500">
          Showing {filteredUsers.length} virtual users
        </div>
      </div>

      {/* Users List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200 text-xs uppercase text-gray-500 font-semibold">
                <th className="px-6 py-4">User</th>
                <th className="px-6 py-4">Points</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                    Loading users...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-8 text-center text-gray-500">
                    No virtual users found. Create one to get started.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center text-purple-600 font-bold">
                          {user.firstName[0]}
                        </div>
                        <div>
                          <div className="font-medium text-gray-900">{user.firstName} {user.lastName}</div>
                          <div className="text-xs text-gray-500">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Award className="w-4 h-4 text-yellow-500" />
                        <span className="font-medium">{user.points?.toLocaleString() || 0}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                        {user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedUser(user);
                          setShowEditPointsModal(true);
                        }}
                        className="text-purple-600 hover:text-purple-800 font-medium text-sm"
                      >
                        Manage Points
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      <AnimatePresence>
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900">Create Virtual User</h3>
                <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <form onSubmit={handleCreateUser} className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                    <input
                      type="text"
                      required
                      value={newUser.firstName}
                      onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      value={newUser.lastName}
                      onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Initial Points</label>
                  <input
                    type="number"
                    min="0"
                    value={newUser.points}
                    onChange={(e) => {
                      const val = e.target.value;
                      setNewUser({ ...newUser, points: val === '' ? '' : parseInt(val) });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>

                <div className="pt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    Create User
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Edit Points Modal */}
      <AnimatePresence>
        {showEditPointsModal && selectedUser && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden"
            >
              <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900">Manage Points</h3>
                <button onClick={() => setShowEditPointsModal(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
                <div className="text-sm text-gray-500">User</div>
                <div className="font-medium text-gray-900">{selectedUser.firstName} {selectedUser.lastName}</div>
                <div className="text-xs text-gray-500 mt-1">Current Points: {selectedUser.points?.toLocaleString() || 0}</div>
              </div>
              <form onSubmit={handleUpdatePoints} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Action</label>
                  <div className="flex bg-gray-100 p-1 rounded-lg">
                    <button
                      type="button"
                      onClick={() => setPointsForm({ ...pointsForm, type: 'add' })}
                      className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${pointsForm.type === 'add' ? 'bg-white shadow text-purple-600' : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                      Add Points
                    </button>
                    <button
                      type="button"
                      onClick={() => setPointsForm({ ...pointsForm, type: 'deduct' })}
                      className={`flex-1 py-1.5 text-sm font-medium rounded-md transition-all ${pointsForm.type === 'deduct' ? 'bg-white shadow text-red-600' : 'text-gray-500 hover:text-gray-700'
                        }`}
                    >
                      Deduct Points
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={pointsForm.amount}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPointsForm({ ...pointsForm, amount: val === '' ? '' : parseInt(val) });
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={pointsForm.category}
                    onChange={(e) => setPointsForm({ ...pointsForm, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  >
                    <option value="bonus">Bonus</option>
                    <option value="voting">Voting</option>
                    <option value="contributions">Contributions</option>
                    <option value="referral">Referral</option>
                    <option value="penalty">Penalty</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason (Optional)</label>
                  <input
                    type="text"
                    value={pointsForm.reason}
                    onChange={(e) => setPointsForm({ ...pointsForm, reason: e.target.value })}
                    placeholder="e.g. Community reward"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 outline-none"
                  />
                </div>
                <div className="pt-4 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowEditPointsModal(false)}
                    className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
                  >
                    Update Points
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VirtualUsers;

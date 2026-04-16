import React, { useState, useEffect } from 'react';
import { getUsersList as dsGetUsersList, getUserMeta as dsGetUserMeta, addOrUpdateUser as dsAddOrUpdateUser, setUserMeta as dsSetUserMeta } from '../../utils/datastore';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Lock, 
  Unlock, 
  Crown, 
  Shield, 
  Eye, 
  EyeOff, 
  Mail, 
  Phone, 
  Calendar, 
  MapPin, 
  Activity, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  MoreVertical,
  Download,
  Upload,
  RefreshCw,
  UserPlus,
  UserMinus,
  Settings,
  Ban,
  UserCheck,
  Clock,
  TrendingUp,
  DollarSign
} from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

const EnhancedUserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalPages, setTotalPages] = useState(1);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterRole, setFilterRole] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('name');
  const [sortOrder, setSortOrder] = useState('asc');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingUser, setDeletingUser] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10);

  const [newUser, setNewUser] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'user',
    status: 'active',
    location: '',
    votingRights: 3,
    password: ''
  });
  
  const [showVirtualModal, setShowVirtualModal] = useState(false);
  const [virtualConfig, setVirtualConfig] = useState({ count: 1, points: 0, firstName: 'Virtual' });

  const createVirtualUsers = async () => {
    try {
      const token = localStorage.getItem('adminToken');
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      await axios.post('/api/users/virtual', virtualConfig, { headers });
      toast.success('Virtual users created');
      setShowVirtualModal(false);
      loadUsers();
    } catch (err) {
      toast.error('Failed to create virtual users');
    }
  };

  const loadUsers = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('adminToken');
      const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
      const res = await axios.get('/api/users', {
        params: {
          page: currentPage,
          limit: usersPerPage,
          search: searchTerm,
          status: filterStatus !== 'all' ? filterStatus : undefined,
          role: filterRole !== 'all' ? filterRole : undefined,
          type: typeFilter !== 'all' ? typeFilter : undefined
        },
        headers
      });
      setUsers(res.data.data.users);
      setTotalPages(res.data.data.pagination.totalPages);
    } catch (err) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, [currentPage, usersPerPage, searchTerm, filterStatus, filterRole, typeFilter]);

  // Filter and sort users
  // const filteredUsers = users.filter(user => {
  //   const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
  //                        user.email.toLowerCase().includes(searchTerm.toLowerCase());
  //   const matchesRole = filterRole === 'all' || user.role === filterRole;
  //   const matchesStatus = filterStatus === 'all' || user.status === filterStatus;
  //   return matchesSearch && matchesRole && matchesStatus;
  // }).sort((a, b) => {
  //   const aValue = a[sortBy];
  //   const bValue = b[sortBy];
  //   if (sortOrder === 'asc') {
  //     return aValue > bValue ? 1 : -1;
  //   } else {
  //     return aValue < bValue ? 1 : -1;
  //   }
  // });

  // Pagination
  // const indexOfLastUser = currentPage * usersPerPage;
  // const indexOfFirstUser = indexOfLastUser - usersPerPage;
  // const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  // totalPages is already managed by state and updated by API, no need to recalculate from filteredUsers for local view unless strictly local
  // But wait, the table uses 'currentUsers' which is derived from 'filteredUsers' (local filtering)
  // If we are using backend pagination, 'users' is already the page of users.
  // The loadUsers function sets 'users' to the page data and 'totalPages' from backend.
  // So 'filteredUsers' logic is actually redundant/conflicting if we are doing server-side pagination.
  // However, the existing code seems to have mixed local/server logic. 
  // loadUsers fetches a page of users. 
  // Then filteredUsers filters that page? Or was it intended for local?
  // Given the requirement to use the API, we should rely on API for filtering/sorting/pagination.
  // So 'users' from API should be displayed directly.
  
  // Let's comment out the conflicting local pagination logic and use 'users' directly as the list to render.
  const currentUsers = users; 
  // const totalPages = Math.ceil(filteredUsers.length / usersPerPage); // This was causing the error because totalPages is a state variable.

  const handleAddUser = () => {
    if (!newUser.name || !newUser.email || !newUser.password) {
      toast.error('Please fill in all required fields');
      return;
    }

    const user = {
      id: Date.now(),
      ...newUser,
      joinDate: new Date().toISOString().split('T')[0],
      lastActive: new Date().toISOString().split('T')[0],
      contributions: 0,
      totalVotes: 0,
      avatar: null
    };

    // Persist in local datastore
    dsAddOrUpdateUser({ email: newUser.email, name: newUser.name, role: newUser.role });
    dsSetUserMeta(newUser.email, { votesAllowed: Number(newUser.votingRights) || 0, votesUsed: 0, points: 0 });
    setUsers(prev => [...prev, user]);
    setNewUser({
      name: '',
      email: '',
      phone: '',
      role: 'user',
      status: 'active',
      location: '',
      votingRights: 3,
      password: ''
    });
    setShowAddModal(false);
    toast.success('User added successfully');
  };

  const handleEditUser = () => {
    if (!editingUser.name || !editingUser.email) {
      toast.error('Please fill in all required fields');
      return;
    }

    setUsers(prev => prev.map(user => 
      user.id === editingUser.id ? editingUser : user
    ));
    setShowEditModal(false);
    setEditingUser(null);
    toast.success('User updated successfully');
  };

  const handleDeleteUser = () => {
    setUsers(prev => prev.filter(user => user.id !== deletingUser.id));
    setShowDeleteModal(false);
    setDeletingUser(null);
    toast.success('User deleted successfully');
  };

  const handleBulkAction = (action) => {
    if (selectedUsers.length === 0) {
      toast.error('Please select users first');
      return;
    }

    switch (action) {
      case 'activate':
        setUsers(prev => prev.map(user => 
          selectedUsers.includes(user.id) ? { ...user, status: 'active' } : user
        ));
        toast.success(`${selectedUsers.length} users activated`);
        break;
      case 'suspend':
        setUsers(prev => prev.map(user => 
          selectedUsers.includes(user.id) ? { ...user, status: 'suspended' } : user
        ));
        toast.success(`${selectedUsers.length} users suspended`);
        break;
      case 'delete':
        setUsers(prev => prev.filter(user => !selectedUsers.includes(user.id)));
        toast.success(`${selectedUsers.length} users deleted`);
        break;
      default:
        break;
    }
    setSelectedUsers([]);
  };

  const handleUserAction = (userId, action) => {
    setUsers(prev => prev.map(user => {
      if (user.id === userId) {
        switch (action) {
          case 'activate':
            toast.success(`User ${user.name} activated`);
            return { ...user, status: 'active' };
          case 'suspend':
            toast.success(`User ${user.name} suspended`);
            return { ...user, status: 'suspended' };
          case 'makeAdmin':
            toast.success(`User ${user.name} promoted to admin`);
            return { ...user, role: 'admin', votingRights: 5 };
          case 'removeAdmin':
            toast.success(`User ${user.name} demoted to user`);
            return { ...user, role: 'user', votingRights: 3 };
          default:
            return user;
        }
      }
      return user;
    }));
  };

  const exportUsers = () => {
    // Note: This only exports current page data if filteredUsers/users is just the current page.
    // Ideally we should fetch all data for export, but for now we use what we have.
    const csvContent = [
      ['Name', 'Email', 'Phone', 'Role', 'Status', 'Join Date', 'Location', 'Voting Rights', 'Contributions', 'Total Votes'],
      ...users.map(user => [
        user.name,
        user.email,
        user.phone,
        user.role,
        user.status,
        user.joinDate,
        user.location,
        user.votingRights,
        user.contributions,
        user.totalVotes
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'users.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Users exported successfully');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">User Management</h2>
          <p className="text-gray-600">Complete control over all users</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowVirtualModal(true)}
            className="flex items-center space-x-2 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
          >
            <Users className="w-4 h-4" />
            <span>Virtual Users</span>
          </button>
          <button
            onClick={exportUsers}
            className="flex items-center space-x-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
          >
            <Download className="w-4 h-4" />
            <span>Export</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <Plus className="w-4 h-4" />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Users', value: users.length, icon: Users, color: 'bg-blue-500' },
          { label: 'Active Users', value: users.filter(u => u.status === 'active').length, icon: UserCheck, color: 'bg-green-500' },
          { label: 'Admins', value: users.filter(u => u.role === 'admin').length, icon: Crown, color: 'bg-purple-500' },
          { label: 'Suspended', value: users.filter(u => u.status === 'suspended').length, icon: Ban, color: 'bg-red-500' }
        ].map((stat, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className="bg-white rounded-xl shadow-lg p-6"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-800">{stat.value}</p>
              </div>
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={filterRole}
              onChange={(e) => setFilterRole(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Roles</option>
              <option value="user">Users</option>
              <option value="admin">Admins</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          {selectedUsers.length > 0 && (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-600">{selectedUsers.length} selected</span>
              <button
                onClick={() => handleBulkAction('activate')}
                className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200"
              >
                Activate
              </button>
              <button
                onClick={() => handleBulkAction('suspend')}
                className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded text-sm hover:bg-yellow-200"
              >
                Suspend
              </button>
              <button
                onClick={() => handleBulkAction('delete')}
                className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
              >
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedUsers.length === currentUsers.length && currentUsers.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedUsers(currentUsers.map(u => u.id));
                      } else {
                        setSelectedUsers([]);
                      }
                    }}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role & Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activity</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stats</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {currentUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <input
                      type="checkbox"
                      checked={selectedUsers.includes(user.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedUsers(prev => [...prev, user.id]);
                        } else {
                          setSelectedUsers(prev => prev.filter(id => id !== user.id));
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center">
                        <span className="text-white font-medium">{user.name.charAt(0)}</span>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-gray-900">{user.name || `${user.firstName} ${user.lastName || ''}`}</div>
                        <div className="text-sm text-gray-500">{user.email}</div>
                        {user.referredBy && (
                          <div className="mt-1">
                            <span className="bg-yellow-100 text-[#856404] text-[10px] uppercase font-bold px-2 py-0.5 rounded border border-yellow-200">
                              REFERRER: {user.referredBy.firstName} {user.referredBy.lastName || ''}
                            </span>
                          </div>
                        )}
                        <div className="text-xs text-gray-400 flex items-center">
                          <MapPin className="w-3 h-3 mr-1" />
                          {user.location || 'Unknown'}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="space-y-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {user.role}
                      </span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {user.status}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="space-y-1">
                      <div>Joined: {user.joinDate || new Date(user.createdAt).toLocaleDateString()}</div>
                      <div className="flex items-center">
                        <Activity className="w-3 h-3 mr-1" />
                        Voting Rights: {user.votingRights}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="space-y-1">
                      <div className="flex items-center">
                        <TrendingUp className="w-3 h-3 mr-1" />
                        {user.contributions} contributions
                      </div>
                      <div className="flex items-center">
                        <DollarSign className="w-3 h-3 mr-1" />
                        {user.totalVotes} votes cast
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setEditingUser(user);
                          setShowEditModal(true);
                        }}
                        className="p-1 rounded text-blue-600 hover:bg-blue-100"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleUserAction(user.id, user.status === 'active' ? 'suspend' : 'activate')}
                        className={`p-1 rounded ${user.status === 'active' ? 'text-red-600 hover:bg-red-100' : 'text-green-600 hover:bg-green-100'}`}
                      >
                        {user.status === 'active' ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleUserAction(user.id, user.role === 'admin' ? 'removeAdmin' : 'makeAdmin')}
                        className="p-1 rounded text-purple-600 hover:bg-purple-100"
                      >
                        <Crown className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setDeletingUser(user);
                          setShowDeleteModal(true);
                        }}
                        className="p-1 rounded text-red-600 hover:bg-red-100"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200">
            <div className="flex-1 flex justify-between sm:hidden">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
            <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Showing page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages}</span>
                </p>
              </div>
              <div>
                <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      onClick={() => setCurrentPage(page)}
                      className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                        page === currentPage
                          ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                          : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                      }`}
                    >
                      {page}
                    </button>
                  ))}
                </nav>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add User Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4"
            >
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Add New User</h3>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Full Name *"
                  value={newUser.name}
                  onChange={(e) => setNewUser(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="email"
                  placeholder="Email Address *"
                  value={newUser.email}
                  onChange={(e) => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="password"
                  placeholder="Password *"
                  value={newUser.password}
                  onChange={(e) => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={newUser.phone}
                  onChange={(e) => setNewUser(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Location"
                  value={newUser.location}
                  onChange={(e) => setNewUser(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="grid grid-cols-2 gap-4">
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser(prev => ({ ...prev, role: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                  <input
                    type="number"
                    placeholder="Voting Rights"
                    value={newUser.votingRights}
                    onChange={(e) => setNewUser(prev => ({ ...prev, votingRights: parseInt(e.target.value) || 0 }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    max="10"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddUser}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Add User
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Edit User Modal */}
      <AnimatePresence>
        {showEditModal && editingUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4"
            >
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Edit User</h3>
              <div className="space-y-4">
                <input
                  type="text"
                  placeholder="Full Name"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="email"
                  placeholder="Email Address"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={editingUser.phone}
                  onChange={(e) => setEditingUser(prev => ({ ...prev, phone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <input
                  type="text"
                  placeholder="Location"
                  value={editingUser.location}
                  onChange={(e) => setEditingUser(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <div className="grid grid-cols-3 gap-4">
                  <select
                    value={editingUser.role}
                    onChange={(e) => setEditingUser(prev => ({ ...prev, role: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                  <select
                    value={editingUser.status}
                    onChange={(e) => setEditingUser(prev => ({ ...prev, status: e.target.value }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                  </select>
                  <input
                    type="number"
                    placeholder="Voting Rights"
                    value={editingUser.votingRights}
                    onChange={(e) => setEditingUser(prev => ({ ...prev, votingRights: parseInt(e.target.value) || 0 }))}
                    className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    max="10"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingUser(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleEditUser}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Save Changes
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && deletingUser && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-xl shadow-2xl p-6 w-full max-w-md mx-4"
            >
              <div className="flex items-center space-x-3 mb-4">
                <div className="bg-red-100 p-2 rounded-full">
                  <AlertTriangle className="w-6 h-6 text-red-600" />
                </div>
                <h3 className="text-lg font-semibold text-gray-800">Delete User</h3>
              </div>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete <strong>{deletingUser.name}</strong>? This action cannot be undone.
              </p>
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeletingUser(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeleteUser}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Delete User
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EnhancedUserManagement;
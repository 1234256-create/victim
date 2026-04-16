import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  FileText, 
  Plus, 
  Search, 
  Filter, 
  Edit, 
  Trash2, 
  Eye, 
  Image, 
  Video, 
  File, 
  Download, 
  Upload, 
  RefreshCw, 
  Globe, 
  Layout, 
  Type, 
  Link, 
  Settings, 
  Save, 
  X, 
  Check, 
  AlertTriangle, 
  Calendar, 
  User, 
  Tag, 
  Folder, 
  Copy, 
  ExternalLink, 
  Code, 
  Palette, 
  Monitor, 
  Smartphone, 
  Tablet,
  MoreVertical,
  Archive,
  Star,
  Clock,
  TrendingUp,
  BarChart3
} from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';

const ContentManagement = () => {
  const [activeTab, setActiveTab] = useState('pages');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterType, setFilterType] = useState('all');
  const [selectedItems, setSelectedItems] = useState([]);
  const [showEditor, setShowEditor] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingItem, setDeletingItem] = useState(null);
  const [previewMode, setPreviewMode] = useState('desktop');

  const [pages, setPages] = useState([]);

  const [posts, setPosts] = useState([]);

  const [media, setMedia] = useState([]);

  const [siteSettings, setSiteSettings] = useState({
    siteName: 'DOA Platform',
    siteDescription: 'Democratic Online Assembly',
    siteUrl: 'https://www.deo.com',
    adminEmail: 'admin@deo.com',
    timezone: 'UTC',
    language: 'en',
    theme: 'default',
    maintenanceMode: false,
    allowRegistration: true,
    requireEmailVerification: true,
    maxFileUploadSize: '10MB',
    allowedFileTypes: 'jpg,jpeg,png,gif,pdf,doc,docx',
    socialLinks: {
      facebook: '',
      twitter: '',
      linkedin: '',
      instagram: ''
    }
  });

  useEffect(() => {
    const mapItem = (item) => ({
      id: item.id || item._id || Date.now(),
      title: item.title || item.name || 'Untitled',
      slug: item.slug || (item.title ? String(item.title).toLowerCase().replace(/\s+/g, '-') : ''),
      status: item.status || 'draft',
      type: item.type || 'page',
      author: item.author || 'Admin',
      lastModified: item.updatedAt || item.lastModified || new Date().toISOString().slice(0,10),
      views: item.views || 0,
      content: item.content || '',
      seoTitle: item.seoTitle || item.title || '',
      seoDescription: item.seoDescription || '',
      featured: !!item.featured,
      name: item.name,
      url: item.url,
      uploadDate: item.uploadDate || item.createdAt || new Date().toISOString().slice(0,10),
      alt: item.alt || ''
    });

    const loadContent = async () => {
      try {
        const token = localStorage.getItem('adminToken');
        const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
        const [pagesRes, postsRes] = await Promise.all([
          axios.get('/api/content/pages', { headers }).catch(() => ({ data: { data: { pages: [] } } })),
          axios.get('/api/content/posts', { headers }).catch(() => ({ data: { data: { posts: [] } } })),
        ]);
        const pagesApi = pagesRes.data?.data?.pages || [];
        const postsApi = postsRes.data?.data?.posts || [];
        setPages(pagesApi.map(mapItem));
        setPosts(postsApi.map(mapItem));
        try {
          const mediaRes = await axios.get('/api/content/media', { headers });
          const mediaApi = mediaRes.data?.data?.media || [];
          setMedia(mediaApi.map(mapItem));
        } catch (_) {
          setMedia([]);
        }
      } catch (_) {
        setPages([]);
        setPosts([]);
        setMedia([]);
      }
    };

    loadContent();
    const onUpdate = () => loadContent();
    window.addEventListener('datastore:update', onUpdate);
    let ws;
    try {
      const url = window.location.origin.replace('http', 'ws').replace(/\/$/, '') + '/ws';
      ws = new WebSocket(url);
      ws.onmessage = (ev) => {
        try {
          const payload = JSON.parse(ev.data);
          if (payload && /(content_|users_|vote_|contribution_)/i.test(payload.type || '')) {
            loadContent();
          }
        } catch {}
      };
    } catch (_) {}
    return () => {
      window.removeEventListener('datastore:update', onUpdate);
      try { ws && ws.close(); } catch(_){}
    };
  }, []);

  // Get current data based on active tab
  const getCurrentData = () => {
    switch (activeTab) {
      case 'pages':
        return pages;
      case 'posts':
        return posts;
      case 'media':
        return media;
      default:
        return [];
    }
  };

  // Filter and search data
  const filteredData = getCurrentData().filter(item => {
    const matchesSearch = item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
    const matchesType = filterType === 'all' || item.type === filterType || item.category === filterType;
    return matchesSearch && matchesStatus && matchesType;
  });

  const handleCreateNew = () => {
    const newItem = {
      id: Date.now(),
      title: `New ${activeTab.slice(0, -1)}`,
      slug: `new-${activeTab.slice(0, -1)}-${Date.now()}`,
      status: 'draft',
      type: activeTab.slice(0, -1),
      author: 'Admin',
      lastModified: new Date().toISOString().split('T')[0],
      views: 0,
      content: '',
      featured: false
    };

    setEditingItem(newItem);
    setShowEditor(true);
  };

  const handleEdit = (item) => {
    setEditingItem({ ...item });
    setShowEditor(true);
  };

  const handleSave = () => {
    if (!editingItem.title) {
      toast.error('Title is required');
      return;
    }

    if (activeTab === 'pages') {
      if (editingItem.id && pages.find(p => p.id === editingItem.id)) {
        setPages(prev => prev.map(p => p.id === editingItem.id ? editingItem : p));
        toast.success('Page updated successfully');
      } else {
        setPages(prev => [...prev, editingItem]);
        toast.success('Page created successfully');
      }
    } else if (activeTab === 'posts') {
      if (editingItem.id && posts.find(p => p.id === editingItem.id)) {
        setPosts(prev => prev.map(p => p.id === editingItem.id ? editingItem : p));
        toast.success('Post updated successfully');
      } else {
        setPosts(prev => [...prev, editingItem]);
        toast.success('Post created successfully');
      }
    }

    setShowEditor(false);
    setEditingItem(null);
  };

  const handleDelete = () => {
    if (activeTab === 'pages') {
      setPages(prev => prev.filter(p => p.id !== deletingItem.id));
    } else if (activeTab === 'posts') {
      setPosts(prev => prev.filter(p => p.id !== deletingItem.id));
    } else if (activeTab === 'media') {
      setMedia(prev => prev.filter(m => m.id !== deletingItem.id));
    }

    toast.success(`${activeTab.slice(0, -1)} deleted successfully`);
    setShowDeleteModal(false);
    setDeletingItem(null);
  };

  const handleBulkAction = (action) => {
    if (selectedItems.length === 0) {
      toast.error('Please select items first');
      return;
    }

    switch (action) {
      case 'publish':
        if (activeTab === 'pages') {
          setPages(prev => prev.map(p => 
            selectedItems.includes(p.id) ? { ...p, status: 'published' } : p
          ));
        } else if (activeTab === 'posts') {
          setPosts(prev => prev.map(p => 
            selectedItems.includes(p.id) ? { ...p, status: 'published' } : p
          ));
        }
        toast.success(`${selectedItems.length} items published`);
        break;
      case 'draft':
        if (activeTab === 'pages') {
          setPages(prev => prev.map(p => 
            selectedItems.includes(p.id) ? { ...p, status: 'draft' } : p
          ));
        } else if (activeTab === 'posts') {
          setPosts(prev => prev.map(p => 
            selectedItems.includes(p.id) ? { ...p, status: 'draft' } : p
          ));
        }
        toast.success(`${selectedItems.length} items moved to draft`);
        break;
      case 'delete':
        if (activeTab === 'pages') {
          setPages(prev => prev.filter(p => !selectedItems.includes(p.id)));
        } else if (activeTab === 'posts') {
          setPosts(prev => prev.filter(p => !selectedItems.includes(p.id)));
        } else if (activeTab === 'media') {
          setMedia(prev => prev.filter(m => !selectedItems.includes(m.id)));
        }
        toast.success(`${selectedItems.length} items deleted`);
        break;
      default:
        break;
    }
    setSelectedItems([]);
  };

  const handleSiteSettingsSave = () => {
    toast.success('Site settings saved successfully');
  };

  const renderTabContent = () => {
    if (activeTab === 'settings') {
      return (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">General Settings</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Site Name</label>
                <input
                  type="text"
                  value={siteSettings.siteName}
                  onChange={(e) => setSiteSettings(prev => ({ ...prev, siteName: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Site URL</label>
                <input
                  type="url"
                  value={siteSettings.siteUrl}
                  onChange={(e) => setSiteSettings(prev => ({ ...prev, siteUrl: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Site Description</label>
                <textarea
                  value={siteSettings.siteDescription}
                  onChange={(e) => setSiteSettings(prev => ({ ...prev, siteDescription: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Admin Email</label>
                <input
                  type="email"
                  value={siteSettings.adminEmail}
                  onChange={(e) => setSiteSettings(prev => ({ ...prev, adminEmail: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
                <select
                  value={siteSettings.timezone}
                  onChange={(e) => setSiteSettings(prev => ({ ...prev, timezone: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">Eastern Time</option>
                  <option value="America/Chicago">Central Time</option>
                  <option value="America/Denver">Mountain Time</option>
                  <option value="America/Los_Angeles">Pacific Time</option>
                </select>
              </div>
            </div>

            <div className="mt-6 space-y-4">
              <h4 className="text-md font-medium text-gray-800">Site Options</h4>
              <div className="space-y-3">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={siteSettings.maintenanceMode}
                    onChange={(e) => setSiteSettings(prev => ({ ...prev, maintenanceMode: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Maintenance Mode</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={siteSettings.allowRegistration}
                    onChange={(e) => setSiteSettings(prev => ({ ...prev, allowRegistration: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Allow User Registration</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={siteSettings.requireEmailVerification}
                    onChange={(e) => setSiteSettings(prev => ({ ...prev, requireEmailVerification: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">Require Email Verification</span>
                </label>
              </div>
            </div>

            <div className="mt-6">
              <button
                onClick={handleSiteSettingsSave}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Content Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder={`Search ${activeTab}...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
            </select>
          </div>

          <div className="flex items-center space-x-3">
            {selectedItems.length > 0 && (
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-600">{selectedItems.length} selected</span>
                <button
                  onClick={() => handleBulkAction('publish')}
                  className="px-3 py-1 bg-green-100 text-green-700 rounded text-sm hover:bg-green-200"
                >
                  Publish
                </button>
                <button
                  onClick={() => handleBulkAction('draft')}
                  className="px-3 py-1 bg-yellow-100 text-yellow-700 rounded text-sm hover:bg-yellow-200"
                >
                  Draft
                </button>
                <button
                  onClick={() => handleBulkAction('delete')}
                  className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200"
                >
                  Delete
                </button>
              </div>
            )}
            <button
              onClick={handleCreateNew}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
            >
              <Plus className="w-4 h-4" />
              <span>Add {activeTab.slice(0, -1)}</span>
            </button>
          </div>
        </div>

        {/* Content Grid */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {activeTab === 'media' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4 p-6">
              {filteredData.map((item) => (
                <div key={item.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between mb-2">
                    <input
                      type="checkbox"
                      checked={selectedItems.includes(item.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedItems(prev => [...prev, item.id]);
                        } else {
                          setSelectedItems(prev => prev.filter(id => id !== item.id));
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <button
                      onClick={() => {
                        setDeletingItem(item);
                        setShowDeleteModal(true);
                      }}
                      className="p-1 text-red-600 hover:bg-red-100 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="aspect-square bg-gray-100 rounded-lg flex items-center justify-center mb-3">
                    {item.type === 'image' ? (
                      <Image className="w-8 h-8 text-gray-400" />
                    ) : item.type === 'video' ? (
                      <Video className="w-8 h-8 text-gray-400" />
                    ) : (
                      <File className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                  <h4 className="font-medium text-gray-800 text-sm truncate">{item.name}</h4>
                  <p className="text-xs text-gray-500">{item.size}</p>
                  <p className="text-xs text-gray-400">{item.uploadDate}</p>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={selectedItems.length === filteredData.length && filteredData.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedItems(filteredData.map(item => item.id));
                          } else {
                            setSelectedItems([]);
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Title</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Author</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Modified</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Views</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredData.map((item) => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={selectedItems.includes(item.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedItems(prev => [...prev, item.id]);
                            } else {
                              setSelectedItems(prev => prev.filter(id => id !== item.id));
                            }
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {item.featured && <Star className="w-4 h-4 text-yellow-500 mr-2" />}
                          <div>
                            <div className="text-sm font-medium text-gray-900">{item.title}</div>
                            <div className="text-sm text-gray-500">/{item.slug}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          item.status === 'published' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {item.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.author}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.lastModified}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.views}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleEdit(item)}
                            className="p-1 rounded text-blue-600 hover:bg-blue-100"
                          >
                            <Edit className="w-4 h-4" />
                          </button>
                          <button className="p-1 rounded text-green-600 hover:bg-green-100">
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setDeletingItem(item);
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
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-800">Content Management</h2>
          <p className="text-gray-600">Complete control over website content</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-lg">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'pages', label: 'Pages', icon: Layout },
              { id: 'posts', label: 'Posts', icon: FileText },
              { id: 'media', label: 'Media', icon: Image },
              { id: 'settings', label: 'Site Settings', icon: Settings }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {renderTabContent()}
        </div>
      </div>

      {/* Editor Modal */}
      <AnimatePresence>
        {showEditor && editingItem && (
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
              className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden"
            >
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-gray-800">
                  {editingItem.id ? 'Edit' : 'Create'} {activeTab.slice(0, -1)}
                </h3>
                <div className="flex items-center space-x-2">
                  <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                    <button
                      onClick={() => setPreviewMode('desktop')}
                      className={`p-2 rounded ${previewMode === 'desktop' ? 'bg-white shadow' : ''}`}
                    >
                      <Monitor className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setPreviewMode('tablet')}
                      className={`p-2 rounded ${previewMode === 'tablet' ? 'bg-white shadow' : ''}`}
                    >
                      <Tablet className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => setPreviewMode('mobile')}
                      className={`p-2 rounded ${previewMode === 'mobile' ? 'bg-white shadow' : ''}`}
                    >
                      <Smartphone className="w-4 h-4" />
                    </button>
                  </div>
                  <button
                    onClick={() => {
                      setShowEditor(false);
                      setEditingItem(null);
                    }}
                    className="p-2 text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              <div className="flex h-[calc(90vh-120px)]">
                {/* Editor Panel */}
                <div className="w-1/2 border-r border-gray-200 overflow-y-auto">
                  <div className="p-6 space-y-4">
                    <input
                      type="text"
                      placeholder="Title"
                      value={editingItem.title}
                      onChange={(e) => setEditingItem(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-lg font-medium"
                    />
                    
                    <input
                      type="text"
                      placeholder="Slug"
                      value={editingItem.slug}
                      onChange={(e) => setEditingItem(prev => ({ ...prev, slug: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />

                    <div className="grid grid-cols-2 gap-4">
                      <select
                        value={editingItem.status}
                        onChange={(e) => setEditingItem(prev => ({ ...prev, status: e.target.value }))}
                        className="px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="draft">Draft</option>
                        <option value="published">Published</option>
                      </select>
                      
                      <label className="flex items-center">
                        <input
                          type="checkbox"
                          checked={editingItem.featured}
                          onChange={(e) => setEditingItem(prev => ({ ...prev, featured: e.target.checked }))}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 mr-2"
                        />
                        <span className="text-sm text-gray-700">Featured</span>
                      </label>
                    </div>

                    <textarea
                      placeholder="Content"
                      value={editingItem.content}
                      onChange={(e) => setEditingItem(prev => ({ ...prev, content: e.target.value }))}
                      rows={15}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
                    />

                    <div className="space-y-4">
                      <h4 className="font-medium text-gray-800">SEO Settings</h4>
                      <input
                        type="text"
                        placeholder="SEO Title"
                        value={editingItem.seoTitle || ''}
                        onChange={(e) => setEditingItem(prev => ({ ...prev, seoTitle: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <textarea
                        placeholder="SEO Description"
                        value={editingItem.seoDescription || ''}
                        onChange={(e) => setEditingItem(prev => ({ ...prev, seoDescription: e.target.value }))}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Preview Panel */}
                <div className="w-1/2 bg-gray-50 overflow-y-auto">
                  <div className="p-6">
                    <h4 className="font-medium text-gray-800 mb-4">Preview</h4>
                    <div className={`bg-white rounded-lg shadow-sm p-6 ${
                      previewMode === 'mobile' ? 'max-w-sm mx-auto' : 
                      previewMode === 'tablet' ? 'max-w-md mx-auto' : ''
                    }`}>
                      <h1 className="text-2xl font-bold text-gray-800 mb-4">{editingItem.title}</h1>
                      <div 
                        className="prose max-w-none"
                        dangerouslySetInnerHTML={{ __html: editingItem.content }}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
                <button
                  onClick={() => {
                    setShowEditor(false);
                    setEditingItem(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  <Save className="w-4 h-4" />
                  <span>Save</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && deletingItem && (
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
                <h3 className="text-lg font-semibold text-gray-800">Delete {activeTab.slice(0, -1)}</h3>
              </div>
              <p className="text-gray-600 mb-6">
                Are you sure you want to delete <strong>{deletingItem.title || deletingItem.name}</strong>? This action cannot be undone.
              </p>
              <div className="flex items-center justify-end space-x-3">
                <button
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeletingItem(null);
                  }}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDelete}
                  className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Delete
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ContentManagement;

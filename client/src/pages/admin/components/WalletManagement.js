import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet,
  Plus,
  Trash2,
  QrCode,
  Copy,
  Download,
  Eye,
  EyeOff,
  X,
  RefreshCw
} from 'lucide-react';
import toast from 'react-hot-toast';
import axios from 'axios';
import { getWallets as dsGetWallets, setWallets as dsSetWallets, addWallet as dsAddWallet, updateWallet as dsUpdateWallet, deleteWallet as dsDeleteWallet } from '../../../utils/datastore';
import { QRCodeCanvas } from 'qrcode.react';

const WalletManagement = () => {
  const [wallets, setWallets] = useState([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [selectedWallet, setSelectedWallet] = useState(null);
  const qrCanvasRef = useRef(null);
  const [newWallet, setNewWallet] = useState({
    name: '',
    symbol: '',
    address: '',
    network: '',
    qrCode: '',
    isActive: true
  });
  useEffect(() => {
    loadWallets();
    // Auto refresh every 10s to stay in sync
    const interval = setInterval(loadWallets, 10000);
    const onUpdate = () => loadWallets();
    window.addEventListener('datastore:update', onUpdate);
    return () => {
      clearInterval(interval);
      window.removeEventListener('datastore:update', onUpdate);
    };
  }, []);
  const loadWallets = async () => {
    try {
      // Try fetching from server first
      const res = await axios.get('/api/settings/activeWallets');
      const list = res?.data?.data?.value;
      if (Array.isArray(list) && list.length > 0) {
        setWallets(list);
        dsSetWallets(list); // Sync to local storage for backward compatibility
        return;
      }
      
      // Fallback: If server is empty, try pushing local data
      const localList = dsGetWallets();
      if (localList && localList.length > 0) {
        setWallets(localList);
        await syncWalletsToServer(localList);
        return;
      }
    } catch (e) {
      console.error('Failed to load wallets from server:', e);
    }
    // Final fallback to local storage
    const list = dsGetWallets();
    setWallets(list);
  };

  const syncWalletsToServer = async (list) => {
    try {
      const token = localStorage.getItem('adminToken');
      await axios.put('/api/settings/activeWallets', {
        value: list
      }, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined
      });
    } catch (e) {
      console.error('Failed to sync wallets to server:', e);
      toast.error('Warning: Wallets not synced to server. Other users might not see them.');
    }
  };

  const handleAddWallet = () => {
    if (!newWallet.name || !newWallet.symbol || !newWallet.address) {
      toast.error('Please fill in all required fields');
      return;
    }

    const wallet = dsAddWallet({
      ...newWallet,
      rate: newWallet.rate ? Number(newWallet.rate) : null,
    });
    const updatedList = [...wallets, wallet];
    setWallets(updatedList);
    syncWalletsToServer(updatedList);
    setNewWallet({
      name: '',
      symbol: '',
      address: '',
      network: '',
      qrCode: '',
      rate: '',
      isActive: true
    });
    setShowAddModal(false);
    toast.success('Wallet added successfully');
  };

  const handleDeleteWallet = (id) => {
    dsDeleteWallet(id);
    const updated = wallets.filter(w => w.id !== id);
    setWallets(updated);
    syncWalletsToServer(updated);
    toast.success('Wallet removed successfully');
  };

  const handleToggleStatus = (id) => {
    const target = wallets.find((w) => w.id === id);
    if (!target) return;
    dsUpdateWallet(id, { isActive: !target.isActive });
    const updated = wallets.map(w =>
      w.id === id ? { ...w, isActive: !w.isActive } : w
    );
    setWallets(updated);
    syncWalletsToServer(updated);
    toast.success('Wallet status updated');
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  const downloadQR = (wallet) => {
    try {
      const canvas = qrCanvasRef.current;
      const dataUrl = wallet.qrCode || (canvas ? canvas.toDataURL('image/png') : null);
      const link = document.createElement('a');
      link.download = `${wallet.symbol}_QR.png`;
      if (!dataUrl) {
        toast.error('QR not ready');
        return;
      }
      link.href = dataUrl;
      link.click();
      toast.success('QR code downloaded');
    } catch (e) {
      toast.error('Failed to download QR');
    }
  };

  const handleQrImageUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!/image\/(png|jpe?g)/i.test(file.type)) {
      toast.error('Upload PNG or JPG image');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = reader.result;
      setNewWallet({ ...newWallet, qrCode: base64 });
      toast.success('QR image attached');
    };
    reader.onerror = () => toast.error('Failed to read image');
    reader.readAsDataURL(file);
  };



  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Wallet & QR Code Management</h2>
          <p className="text-gray-600 mt-1">Manage cryptocurrency wallets and QR codes for contributions</p>
        </div>
        <div className="flex items-center gap-3">
          <motion.button
            onClick={() => {
              const list = dsGetWallets();
              syncWalletsToServer(list);
              toast.success('Syncing wallets to server...');
            }}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg border border-blue-200 hover:bg-blue-100 transition-all duration-200 text-sm font-semibold"
          >
            <RefreshCw className="w-4 h-4" />
            Sync Now
          </motion.button>
          <motion.button
            onClick={() => setShowAddModal(true)}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200"
          >
            <Plus className="w-4 h-4" />
            Add New Wallet
          </motion.button>
        </div>
      </div>

      {/* Wallets Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {wallets.map((wallet) => (
          <motion.div
            key={wallet.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl p-6 shadow-lg border border-gray-200 hover:shadow-xl transition-shadow duration-200"
          >
            {/* Wallet Header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
                  <Wallet className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900">{wallet.name}</h3>
                  <p className="text-sm text-gray-500">{wallet.symbol}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${wallet.isActive
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                  }`}>
                  {wallet.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
            </div>

            {/* Wallet Details */}
            <div className="space-y-3 mb-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Network</p>
                <p className="text-sm font-medium text-gray-900">{wallet.network}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Address</p>
                <div className="flex items-center gap-2">
                  <p className="text-sm font-mono text-gray-900 truncate flex-1">
                    {wallet.address}
                  </p>
                  <button
                    onClick={() => copyToClipboard(wallet.address)}
                    className="p-1 hover:bg-gray-100 rounded transition-colors duration-200"
                  >
                    <Copy className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-gray-500 mb-1">Total Received</p>
                  <p className="text-sm font-semibold text-gray-900">
                    {wallet.totalReceived} {wallet.symbol}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 mb-1">Transactions</p>
                  <p className="text-sm font-semibold text-gray-900">{wallet.transactionCount}</p>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
              <motion.button
                onClick={() => {
                  setSelectedWallet(wallet);
                  setShowQRModal(true);
                }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors duration-200"
              >
                <QrCode className="w-4 h-4" />
                QR Code
              </motion.button>
              <motion.button
                onClick={() => handleToggleStatus(wallet.id)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className={`px-3 py-2 rounded-lg transition-colors duration-200 ${wallet.isActive
                    ? 'bg-red-50 text-red-600 hover:bg-red-100'
                    : 'bg-green-50 text-green-600 hover:bg-green-100'
                  }`}
              >
                {wallet.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </motion.button>
              <motion.button
                onClick={() => handleDeleteWallet(wallet.id)}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition-colors duration-200"
              >
                <Trash2 className="w-4 h-4" />
              </motion.button>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Add Wallet Modal */}
      <AnimatePresence>
        {showAddModal && (
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
              className="bg-white rounded-2xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">Add New Wallet</h3>
                <button
                  onClick={() => setShowAddModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Coin Name *
                  </label>
                  <input
                    type="text"
                    value={newWallet.name}
                    onChange={(e) => setNewWallet({ ...newWallet, name: e.target.value })}
                    placeholder="e.g., Bitcoin"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Symbol *
                  </label>
                  <input
                    type="text"
                    value={newWallet.symbol}
                    onChange={(e) => setNewWallet({ ...newWallet, symbol: e.target.value.toUpperCase() })}
                    placeholder="e.g., BTC"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Wallet Address *
                  </label>
                  <textarea
                    value={newWallet.address}
                    onChange={(e) => setNewWallet({ ...newWallet, address: e.target.value })}
                    placeholder="Enter wallet address"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Network
                  </label>
                  <input
                    type="text"
                    value={newWallet.network}
                    onChange={(e) => setNewWallet({ ...newWallet, network: e.target.value })}
                    placeholder="e.g., Bitcoin Mainnet"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    USD Rate (optional)
                  </label>
                  <input
                    type="number"
                    value={newWallet.rate || ''}
                    onChange={(e) => setNewWallet({ ...newWallet, rate: e.target.value })}
                    placeholder="e.g., 43250.89"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload QR Image (optional)
                  </label>
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    onChange={handleQrImageUpload}
                    className="w-full text-sm"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    QR Code Preview
                  </label>
                  <div className="border border-gray-200 rounded-lg p-4 text-center">
                    {newWallet.qrCode ? (
                      <img src={newWallet.qrCode} alt="QR preview" className="mx-auto h-32 w-32 object-contain" />
                    ) : newWallet.address ? (
                      <QRCodeCanvas value={newWallet.address} size={120} includeMargin />
                    ) : (
                      <div className="text-sm text-gray-500">Upload a QR image or enter an address to preview QR</div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={newWallet.isActive}
                    onChange={(e) => setNewWallet({ ...newWallet, isActive: e.target.checked })}
                    className="w-4 h-4 text-purple-600 border-gray-300 rounded focus:ring-purple-500"
                  />
                  <label htmlFor="isActive" className="text-sm text-gray-700">
                    Set as active wallet
                  </label>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleAddWallet}
                  className="flex-1 px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg hover:from-purple-700 hover:to-blue-700 transition-all duration-200"
                >
                  Add Wallet
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* QR Code Modal */}
      <AnimatePresence>
        {showQRModal && selectedWallet && (
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
                <h3 className="text-xl font-bold text-gray-900">
                  {selectedWallet.name} QR Code
                </h3>
                <button
                  onClick={() => setShowQRModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors duration-200"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="text-center space-y-4">
                <div className="bg-gray-50 p-6 rounded-xl">
                  {selectedWallet.qrCode ? (
                    <img src={selectedWallet.qrCode} alt="Wallet QR" className="mx-auto h-48 w-48 object-contain" />
                  ) : (
                    <QRCodeCanvas ref={qrCanvasRef} value={selectedWallet.address} size={192} includeMargin />
                  )}
                </div>

                <div className="space-y-2">
                  <p className="text-sm text-gray-600">Wallet Address:</p>
                  <div className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm font-mono text-gray-900 flex-1 break-all">
                      {selectedWallet.address}
                    </p>
                    <button
                      onClick={() => copyToClipboard(selectedWallet.address)}
                      className="p-1 hover:bg-gray-200 rounded transition-colors duration-200"
                    >
                      <Copy className="w-4 h-4 text-gray-500" />
                    </button>
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => copyToClipboard(selectedWallet.address)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition-colors duration-200"
                  >
                    <Copy className="w-4 h-4" />
                    Copy Address
                  </button>
                  <button
                    onClick={() => downloadQR(selectedWallet)}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-50 text-green-600 rounded-lg hover:bg-green-100 transition-colors duration-200"
                  >
                    <Download className="w-4 h-4" />
                    Download QR
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

export default WalletManagement;
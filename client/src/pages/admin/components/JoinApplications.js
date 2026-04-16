import React, { useState, useEffect } from 'react';
import { getJoinApplications } from '../../../utils/datastore';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, X, Mail } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const ApplicationDetailsModal = ({ app, onClose }) => {
  if (!app) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, y: -20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: -20 }}
        className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-gray-200 sticky top-0 bg-white z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-800">Application Details</h2>
            <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100">
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>
          <p className="text-sm text-gray-500 mt-1">Submitted on {new Date(app.time).toLocaleString()}</p>
        </div>

        <div className="p-8 grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
          {/* Personal Details */}
          <div className="md:col-span-2">
            <h3 className="text-lg font-semibold text-gray-700 border-b pb-2 mb-4">Personal Information</h3>
          </div>
          <DetailItem label="First Name" value={app.details.firstName} />
          <DetailItem label="Last Name" value={app.details.lastName} />
          <DetailItem label="Date of Birth" value={app.details.dob} />
          <DetailItem label="Gender" value={app.details.gender} />

          {/* Contact Information */}
          <div className="md:col-span-2 mt-4">
            <h3 className="text-lg font-semibold text-gray-700 border-b pb-2 mb-4">Contact Details</h3>
          </div>
          <DetailItem label="Email" value={app.email} />
          <DetailItem label="Phone" value={`${app.details.countryCode} ${app.details.phone}`} />
          <DetailItem label="Telegram" value={app.details.telegramUsername} />
          <DetailItem label="Address" value={`${app.details.address1}${app.details.address2 ? `, ${app.details.address2}` : ''}`} />
          <DetailItem label="City" value={app.details.city} />
          <DetailItem label="State/Province" value={app.details.stateProvince} />
          <DetailItem label="Postal Code" value={app.details.postalCode} />

          {/* Loss Details */}
          <div className="md:col-span-2 mt-4">
            <h3 className="text-lg font-semibold text-gray-700 border-b pb-2 mb-4">Loss Information</h3>
          </div>
          <DetailItem label="Total Amount" value={app.details.totalAmount} isCurrency />
          <DetailItem label="Period of Loss" value={app.details.period} />
          <div className="md:col-span-2">
            <DetailItem label="Breakdown of Loss" value={app.details.breakdown} />
          </div>

          {/* Referral Information */}
          <div className="md:col-span-2 mt-4">
            <h3 className="text-lg font-semibold text-gray-700 border-b pb-2 mb-4">Referral Information</h3>
          </div>
          <DetailItem label="Referrer" value={app.referrerName || app.referralCode} />
        </div>

        <div className="p-6 bg-gray-50 border-t border-gray-200 sticky bottom-0">
          <div className="flex justify-end gap-4">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-gray-100 text-gray-700 font-semibold hover:bg-gray-200 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

const DetailItem = ({ label, value, isCurrency = false }) => (
  <div className="flex flex-col">
    <label className="text-sm font-medium text-gray-500">{label}</label>
    <p className="text-md text-gray-800 mt-1">
      {isCurrency && '$'}{value || <span className="text-gray-400">N/A</span>}
    </p>
  </div>
);


const JoinApplications = () => {
  const [applications, setApplications] = useState([]);
  const [selectedApp, setSelectedApp] = useState(null);

  useEffect(() => {
    loadApplications();
    const onUpdate = () => loadApplications();
    window.addEventListener('datastore:update', onUpdate);
    return () => window.removeEventListener('datastore:update', onUpdate);
  }, []);

  const loadApplications = async () => {
    let apiApps = [];
    try {
      const token = localStorage.getItem('adminToken');
      if (token) {
        const res = await axios.get('/api/join', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data?.success) {
          apiApps = res.data.applications.map(app => ({
            ...app,
            time: app.createdAt || app.time,
            hasAccount: app.hasAccount || false
          }));
        }
      }
    } catch (e) {
      console.error('Failed to load applications from API', e);
    }

    const localApps = getJoinApplications();
    const merged = [...apiApps];

    localApps.forEach(la => {
      // Avoid duplicates if email matches
      if (!merged.find(ma => ma.email === la.email)) {
        merged.push(la);
      }
    });

    setApplications(merged.sort((a, b) => new Date(b.time) - new Date(a.time)));
  };

  const sendInviteEmail = async (app) => {
    try {
      const token = localStorage.getItem('adminToken');
      if (!token) {
        toast.error('Admin authentication required');
        return;
      }

      const toastId = toast.loading('Sending invitation email...');

      await axios.post('/api/admin/send-invite', {
        email: app.email,
        firstName: app.firstName
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success('Invitation email sent successfully', { id: toastId });
    } catch (error) {
      console.error('Failed to send invite:', error);
      toast.error(error.response?.data?.message || 'Failed to send invitation email');
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
      <h1 className="text-2xl font-bold mb-6 text-gray-900">Join Applications</h1>

      <div className="bg-white shadow-lg rounded-xl border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full table-auto">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Submitted</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Referrer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {applications.map((app) => (
                <motion.tr key={app.email} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{`${app.firstName} ${app.lastName}`}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-700">{app.email}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-700">{new Date(app.time).toLocaleString()}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-700">
                      {app.referrerName ? (
                        <span className="font-semibold text-indigo-600">{app.referrerName}</span>
                      ) : (
                        app.referralCode || '-'
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {app.hasAccount ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        ✓ Registered
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        Pending
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => !app.hasAccount && sendInviteEmail(app)}
                        disabled={app.hasAccount}
                        className={`p-2 rounded-full transition-colors duration-200 ${app.hasAccount
                          ? 'text-gray-400 bg-gray-100 cursor-not-allowed opacity-50'
                          : 'text-green-600 bg-green-100 hover:bg-green-200 cursor-pointer'
                          }`}
                        title={app.hasAccount ? 'Account already registered — invite not needed' : 'Send Invitation Email'}
                      >
                        <Mail className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setSelectedApp(app)}
                        className="p-2 rounded-full text-blue-600 bg-blue-100 hover:bg-blue-200 transition-colors duration-200"
                        title="View Details"
                      >
                        <Eye className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
              {applications.length === 0 && (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                    No applications found
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AnimatePresence>
        {selectedApp && (
          <ApplicationDetailsModal
            app={selectedApp}
            onClose={() => setSelectedApp(null)}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default JoinApplications;
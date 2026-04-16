import React, { useState } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { Eye, EyeOff } from 'lucide-react';

const ResetPasswordForm = ({ onFinished }) => {
  const [formData, setFormData] = useState({
    otp: '',
    newPassword: '',
    confirmNewPassword: '',
  });
  const [loading, setLoading] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (formData.newPassword !== formData.confirmNewPassword) {
      return toast.error('New passwords do not match');
    }
    setLoading(true);
    try {
      const res = await axios.post('/api/auth/change-password-otp', {
        otp: formData.otp,
        newPassword: formData.newPassword,
      });
      toast.success(res.data.message);
      if (onFinished) {
        onFinished();
      }
    } catch (error) {
      toast.error(error.response?.data?.message || 'An error occurred');
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex gap-2">
        <button type="button" onClick={async () => { try { await axios.post('/api/auth/request-password-otp'); toast.success('OTP sent to your email'); } catch (e) { toast.error(e.response?.data?.message || 'Failed to send OTP'); } }} className="px-4 py-2 bg-blue-600 text-white rounded-lg">Send OTP</button>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">OTP</label>
        <input
          type="text"
          name="otp"
          value={formData.otp}
          onChange={handleChange}
          required
          className="input-field bg-white/10 border-white/20 text-white"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">New Password</label>
        <div className="relative">
          <input
            type={showNew ? 'text' : 'password'}
            name="newPassword"
            value={formData.newPassword}
            onChange={handleChange}
            required
            className="input-field bg-white/10 border-white/20 text-white pr-10"
          />
          <button type="button" onClick={() => setShowNew(!showNew)} className="absolute inset-y-0 right-0 pr-3 flex items-center">
            {showNew ? <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-300" /> : <Eye className="h-5 w-5 text-gray-400 hover:text-gray-300" />}
          </button>
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Confirm New Password</label>
        <div className="relative">
          <input
            type={showConfirm ? 'text' : 'password'}
            name="confirmNewPassword"
            value={formData.confirmNewPassword}
            onChange={handleChange}
            required
            className="input-field bg-white/10 border-white/20 text-white pr-10"
          />
          <button type="button" onClick={() => setShowConfirm(!showConfirm)} className="absolute inset-y-0 right-0 pr-3 flex items-center">
            {showConfirm ? <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-300" /> : <Eye className="h-5 w-5 text-gray-400 hover:text-gray-300" />}
          </button>
        </div>
      </div>
      <button type="submit" disabled={loading} className="w-full btn-primary py-2">
        {loading ? 'Updating...' : 'Update Password'}
      </button>
    </form>
  );
};

export default ResetPasswordForm;
import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { motion } from 'framer-motion';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';

const VerifyEmail = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const { updateUser } = useAuth();
    const [status, setStatus] = useState('verifying'); // verifying, success, error
    const [message, setMessage] = useState('Verifying your email address...');
    const hasRun = React.useRef(false);

    useEffect(() => {
        if (hasRun.current) return;

        const performVerification = async () => {
            hasRun.current = true;
            try {
                const response = await axios.get(`/api/auth/verify-email/${token}`);

                if (response.data.success) {
                    if (response.data.alreadyVerified) {
                        setStatus('success');
                        setMessage(response.data.message);
                        return;
                    }

                    const { token: jwtToken, user } = response.data.data;

                    // Set authentication data
                    localStorage.setItem('token', jwtToken);
                    localStorage.setItem('user', JSON.stringify(user));
                    axios.defaults.headers.common['Authorization'] = `Bearer ${jwtToken}`;
                    updateUser(user);

                    setStatus('success');
                    setMessage(response.data.message || 'Email verified successfully!');
                    toast.success('Email verified! Welcome to VictimDAO.');

                    // Redirect to dashboard after a short delay
                    setTimeout(() => {
                        navigate('/dashboard');
                    }, 3000);
                }
            } catch (error) {
                setStatus('error');
                setMessage(error.response?.data?.message || 'Verification failed. The link may be invalid or expired.');
                // Only show toast once
                toast.error('Verification failed');
            }
        };

        if (token) {
            performVerification();
        } else {
            setStatus('error');
            setMessage('Invalid verification token.');
        }
    }, [token, navigate, updateUser]);

    return (
        <div className="min-h-screen hero-gradient flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
            <div className="absolute inset-0 bg-black/20"></div>

            {/* Background Elements */}
            <div className="absolute top-20 left-10 w-20 h-20 bg-purple-500/20 rounded-full animate-float"></div>
            <div className="absolute top-40 right-20 w-16 h-16 bg-blue-500/20 rounded-full animate-float" style={{ animationDelay: '2s' }}></div>
            <div className="absolute bottom-20 left-1/4 w-12 h-12 bg-yellow-500/20 rounded-full animate-float" style={{ animationDelay: '4s' }}></div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative max-w-lg w-full bg-white/10 backdrop-blur-lg border border-white/20 p-12 rounded-2xl shadow-2xl text-center"
            >
                <div className="mb-8 flex justify-center">
                    {status === 'verifying' && (
                        <Loader2 className="h-20 w-20 text-blue-400 animate-spin" />
                    )}
                    {status === 'success' && (
                        <CheckCircle className="h-20 w-20 text-green-400" />
                    )}
                    {status === 'error' && (
                        <XCircle className="h-20 w-20 text-red-500" />
                    )}
                </div>

                <h2 className={`text-4xl font-bold text-white mb-6 text-center leading-tight`}>
                    {status === 'verifying' && 'One Moment...'}
                    {status === 'success' && 'Email Verified!'}
                    {status === 'error' && 'Verification Error'}
                </h2>

                <p className="text-xl text-gray-200 mb-10 leading-relaxed font-medium text-center px-4">
                    {message}
                </p>

                {status === 'success' && !message.includes('safely login') && (
                    <div className="flex flex-col items-center">
                        <div className="w-12 h-1 bg-white/20 rounded-full overflow-hidden mb-4">
                            <motion.div
                                initial={{ width: "0%" }}
                                animate={{ width: "100%" }}
                                transition={{ duration: 3 }}
                                className="h-full bg-green-400"
                            />
                        </div>
                        <p className="text-sm text-gray-400">Redirecting to dashboard...</p>
                    </div>
                )}

                {status === 'success' && message.includes('safely login') && (
                    <button
                        onClick={() => navigate('/login')}
                        className="w-full btn-primary py-4 text-xl font-bold shadow-lg"
                    >
                        Go to Login
                    </button>
                )}

                {status === 'error' && (
                    <button
                        onClick={() => navigate('/register')}
                        className="w-full btn-primary py-4 text-xl font-bold shadow-lg"
                    >
                        Back to Registration
                    </button>
                )}
            </motion.div>
        </div>
    );
};

export default VerifyEmail;

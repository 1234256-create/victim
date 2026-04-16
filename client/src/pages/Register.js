import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import {
  Eye,
  EyeOff,
  Mail,
  Lock,
  User,
  CheckCircle,
  X
} from 'lucide-react';


const Register = () => {
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [serverErrors, setServerErrors] = useState([]);
  const [registrationSuccess, setRegistrationSuccess] = useState(false);
  const [isAutoFilled, setIsAutoFilled] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [emailLocked, setEmailLocked] = useState(false);

  useEffect(() => {
    try {
      const params = new URLSearchParams(location.search);
      const email = params.get('email');
      const ref = params.get('ref');
      if (email) {
        setFormData((prev) => ({ ...prev, email }));
        setEmailLocked(true);
      }
      if (ref) {
        setFormData((prev) => ({ ...prev, referralCode: ref }));
      }
    } catch { }

    if (location.state?.prefill) {
      const { firstName, lastName, email, referralCode } = location.state.prefill;
      setFormData(prev => ({
        ...prev,
        firstName: firstName || '',
        lastName: lastName || '',
        email: email || '',
        referralCode: referralCode || prev.referralCode || ''
      }));
      if (email) setEmailLocked(true);
      setIsAutoFilled(true);
    }
  }, [location.search, location.state]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    setServerErrors((prev) => prev.filter(err => err.path !== e.target.name));
  };

  const validatePassword = (password) => {
    const minLength = password.length >= 8;
    const hasNumber = /\d/.test(password);
    const hasLetter = /[a-zA-Z]/.test(password);
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasSpecial = /[@$!%*?&]/.test(password);
    return { minLength, hasNumber, hasLetter, hasUpper, hasLower, hasSpecial };
  };

  const passwordValidation = validatePassword(formData.password);
  const passwordsMatch = formData.password === formData.confirmPassword;

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!acceptTerms) {
      return;
    }

    if (!passwordsMatch) {
      return;
    }

    if (
      !passwordValidation.minLength ||
      !passwordValidation.hasNumber ||
      !passwordValidation.hasUpper ||
      !passwordValidation.hasLower ||
      !passwordValidation.hasSpecial ||
      (formData.lastName?.trim().length < 2)
    ) {
      return;
    }

    setLoading(true);

    const result = await register({
      firstName: formData.firstName,
      lastName: formData.lastName,
      email: formData.email,
      password: formData.password,
      confirmPassword: formData.confirmPassword,
      acceptTerms,
      referralCode: formData.referralCode
    });

    if (result.success) {
      setRegistrationSuccess(true);
    } else {
      setServerErrors(result.errors || []);
    }

    setLoading(false);
  };

  if (registrationSuccess) {
    return (
      <div className="min-h-screen hero-gradient flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-black/20"></div>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="relative max-w-lg w-full bg-white/10 backdrop-blur-lg border border-white/20 p-8 rounded-2xl shadow-2xl text-center"
        >
          <div className="mb-6 flex justify-center">
            <Mail className="h-16 w-16 text-blue-400" />
          </div>
          <h2 className="text-3xl font-bold text-white mb-4">Verify Your Email</h2>
          <p className="text-lg text-gray-200 mb-6 leading-relaxed">
            We've sent a verification link to <span className="font-semibold text-white">{formData.email}</span>. Please click the link in the email to activate your account.
          </p>
          <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-8">
            <p className="text-sm text-gray-300 leading-relaxed">
              Can't find the email? Please check your spam folder and mark it as <span className="font-bold text-yellow-400">Not Spam</span> to avoid missing important updates.
            </p>
          </div>
          <div className="mt-6 pt-6 border-t border-white/10">
            <Link to="/login" className="text-purple-400 hover:text-purple-300 font-medium transition-colors">
              Return to Login
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen hero-gradient flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="absolute inset-0 bg-black/20"></div>

      {/* Background Elements */}
      <div className="absolute top-20 left-10 w-20 h-20 bg-purple-500/20 rounded-full animate-float"></div>
      <div className="absolute top-40 right-20 w-16 h-16 bg-blue-500/20 rounded-full animate-float" style={{ animationDelay: '2s' }}></div>
      <div className="absolute bottom-20 left-1/4 w-12 h-12 bg-yellow-500/20 rounded-full animate-float" style={{ animationDelay: '4s' }}></div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
        className="relative max-w-lg w-full space-y-6"
      >
        <div className="glass-effect rounded-2xl pt-4 pb-6 px-6 shadow-2xl">
          <div className="text-center mb-6">
            <h2 className="text-3xl font-bold text-white mb-1">Sign up</h2>
            <p className="text-gray-300">Create your account</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-2 gap-4">

              <div>
                <label htmlFor="firstName" className="block text-sm font-medium text-gray-300 mb-2">
                  First name*
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <User className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    id="firstName"
                    name="firstName"
                    type="text"
                    required
                    value={formData.firstName}
                    onChange={handleChange}
                    className={`input-field pl-10 bg-white/10 border-white/20 text-white placeholder-gray-400 focus:ring-purple-500 ${isAutoFilled ? 'cursor-not-allowed opacity-90' : ''} ${serverErrors.some(e => e.path === 'firstName') ? 'border-red-500' : ''}`}
                    placeholder="First name"
                    readOnly={isAutoFilled}
                  />
                  {serverErrors.filter(e => e.path === 'firstName').map((e, i) => (
                    <p key={i} className="mt-1 text-sm text-red-400">{e.msg || e.message}</p>
                  ))}
                </div>
              </div>

              <div>
                <label htmlFor="lastName" className="block text-sm font-medium text-gray-300 mb-2">
                  Last name*
                </label>
                <input
                  id="lastName"
                  name="lastName"
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={handleChange}
                  className={`input-field bg-white/10 border-white/20 text-white placeholder-gray-400 focus:ring-purple-500 ${isAutoFilled ? 'cursor-not-allowed opacity-90' : ''} ${formData.lastName && formData.lastName.trim().length < 2 ? 'border-red-500' : ''} ${serverErrors.some(e => e.path === 'lastName') ? 'border-red-500' : ''}`}
                  placeholder="Last name"
                  readOnly={isAutoFilled}
                />
                {formData.lastName && formData.lastName.trim().length < 2 && (
                  <p className="mt-1 text-sm text-red-400">Last name must be at least 2 characters</p>
                )}
                {serverErrors.filter(e => e.path === 'lastName').map((e, i) => (
                  <p key={i} className="mt-1 text-sm text-red-400">{e.msg || e.message}</p>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Email*
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={formData.email}
                  onChange={handleChange}
                  className={`input-field pl-10 bg-white/10 border-white/20 text-white placeholder-gray-400 focus:ring-purple-500 ${emailLocked ? 'cursor-not-allowed opacity-90' : ''}`}
                  readOnly={emailLocked}
                  placeholder="Enter your email"
                />
                {emailLocked && (
                  <p className="mt-1 text-sm text-gray-300">Email locked from your application invitation</p>
                )}
                {serverErrors.filter(e => e.path === 'email').map((e, i) => (
                  <p key={i} className="mt-1 text-sm text-red-400">{e.msg || e.message}</p>
                ))}
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Password*
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className={`input-field pl-10 pr-10 bg-white/10 border-white/20 text-white placeholder-gray-400 focus:ring-purple-500 ${serverErrors.some(e => e.path === 'password') ? 'border-red-500' : ''}`}
                  placeholder="Create a password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                  )}
                </button>
              </div>

              {/* Password Requirements */}
              {formData.password && (
                <div className="mt-2 space-y-1">
                  <div className={`flex items-center space-x-2 text-sm ${passwordValidation.minLength ? 'text-green-400' : 'text-gray-400'}`}>
                    {passwordValidation.minLength ? <CheckCircle size={16} /> : <X size={16} />}
                    <span>At least 8 characters</span>
                  </div>
                  <div className={`flex items-center space-x-2 text-sm ${passwordValidation.hasNumber ? 'text-green-400' : 'text-gray-400'}`}>
                    {passwordValidation.hasNumber ? <CheckCircle size={16} /> : <X size={16} />}
                    <span>Contains a number</span>
                  </div>
                  <div className={`flex items-center space-x-2 text-sm ${passwordValidation.hasUpper ? 'text-green-400' : 'text-gray-400'}`}>
                    {passwordValidation.hasUpper ? <CheckCircle size={16} /> : <X size={16} />}
                    <span>Contains an uppercase letter</span>
                  </div>
                  <div className={`flex items-center space-x-2 text-sm ${passwordValidation.hasLower ? 'text-green-400' : 'text-gray-400'}`}>
                    {passwordValidation.hasLower ? <CheckCircle size={16} /> : <X size={16} />}
                    <span>Contains a lowercase letter</span>
                  </div>
                  <div className={`flex items-center space-x-2 text-sm ${passwordValidation.hasSpecial ? 'text-green-400' : 'text-gray-400'}`}>
                    {passwordValidation.hasSpecial ? <CheckCircle size={16} /> : <X size={16} />}
                    <span>Contains a special character (@$!%*?&)</span>
                  </div>
                </div>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-2">
                Password confirmation*
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400" />
                </div>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className={`input-field pl-10 pr-10 bg-white/10 border-white/20 text-white placeholder-gray-400 focus:ring-purple-500 ${formData.confirmPassword && !passwordsMatch ? 'border-red-500' : ''
                    } ${serverErrors.some(e => e.path === 'confirmPassword') ? 'border-red-500' : ''}`}
                  placeholder="Confirm your password"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400 hover:text-gray-300" />
                  )}
                </button>
              </div>
              {formData.confirmPassword && !passwordsMatch && (
                <p className="mt-1 text-sm text-red-400">Passwords do not match</p>
              )}
            </div>

            <div className="flex items-center">
              <input
                id="accept-terms"
                name="accept-terms"
                type="checkbox"
                checked={acceptTerms}
                onChange={(e) => setAcceptTerms(e.target.checked)}
                className="h-4 w-4 text-purple-600 focus:ring-purple-500 border-gray-300 rounded"
              />
              <label htmlFor="accept-terms" className="ml-2 block text-sm text-gray-300">
                I accept the{' '}
                <Link to="/privacy" className="text-purple-400 hover:text-purple-300">
                  Privacy Policy
                </Link>{' '}
                and{' '}
                <Link to="/terms" className="text-purple-400 hover:text-purple-300">
                  Terms of Service
                </Link>
                *
              </label>
              {!acceptTerms && (
                <p className="ml-2 text-sm text-red-400">You must accept the terms to continue</p>
              )}
              {serverErrors.filter(e => e.path === 'acceptTerms').map((e, i) => (
                <p key={i} className="ml-2 text-sm text-red-400">{e.msg || e.message}</p>
              ))}
            </div>

            <button
              type="submit"
              disabled={
                loading ||
                !acceptTerms ||
                !passwordsMatch ||
                !passwordValidation.minLength ||
                !passwordValidation.hasNumber ||
                !passwordValidation.hasUpper ||
                !passwordValidation.hasLower ||
                !passwordValidation.hasSpecial ||
                (formData.lastName?.trim().length < 2)
              }
              className="w-full btn-primary py-4 text-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="flex items-center justify-center space-x-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Creating account...</span>
                </div>
              ) : (
                'Sign up'
              )}
            </button>


          </form>

          <div className="mt-6 text-center">
            <p className="text-gray-300">
              Already have an account?{' '}
              <Link
                to="/login"
                className="font-medium text-purple-400 hover:text-purple-300 transition-colors"
              >
                Log in
              </Link>
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Register;

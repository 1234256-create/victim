const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const JoinApplication = require('../models/JoinApplication');
const { auth } = require('../middleware/auth');
const rateLimit = require('express-rate-limit');
const crypto = require('crypto');
const Settings = require('../models/Settings');
const { GetTransporter: _unused } = {};
const emailService = require('../services/emailService');
const { sendVerificationEmail, sendWelcomeEmail } = emailService;

const router = express.Router();

// Rate limiting disabled for auth routes

// @route   POST /api/auth/register
// @desc    Register a new user
// @access  Public
router.post('/register', [
  body('firstName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('First name can only contain letters and spaces'),

  body('lastName')
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Last name can only contain letters and spaces'),

  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),

  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),

  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.password) {
        throw new Error('Password confirmation does not match password');
      }
      return true;
    }),

  body('acceptTerms')
    .isBoolean()
    .custom((value) => {
      if (!value) {
        throw new Error('You must accept the terms and conditions');
      }
      return true;
    }),
  body('referralCode').optional().trim()
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { firstName, lastName, email, password, referralCode } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists'
      });
    }

    // Handle referral
    let referredBy = null;
    let finalReferralCode = referralCode;

    // If no referral code provided during registration, check if there's one in their Join Application
    if (!finalReferralCode) {
      try {
        const application = await JoinApplication.findOne({ email: new RegExp('^' + email + '$', 'i') });
        if (application && application.referralCode) {
          finalReferralCode = application.referralCode;
        }
      } catch (err) {
        console.error('Error checking JoinApplication for referral:', err);
      }
    }

    if (finalReferralCode) {
      const referrer = await User.findOne({ referralCode: finalReferralCode });
      if (referrer) {
        referredBy = referrer._id;
        await referrer.addCategoryPoints(10, 'referral');
        try { global.__broadcastUsersUpdate({ type: 'user_referral_awarded', id: referrer._id }); } catch (_) { }
      }
    }

    // Create new user
    const user = new User({
      firstName,
      lastName,
      email,
      password,
      role: 'user',
      isActive: true,
      referredBy,
      preferences: {
        emailNotifications: true,
        pushNotifications: true,
        theme: 'light',
        language: 'en'
      }
    });

    // Generate email verification token (raw = sent in email, hashed = stored)
    const rawToken = crypto.randomBytes(32).toString('hex');
    user.emailVerificationToken = crypto.createHash('sha256').update(rawToken).digest('hex');
    user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    user.isEmailVerified = false;

    // Generate a unique referral code for the new user (retry on rare collision)
    let attempts = 0;
    while (attempts < 5) {
      user.referralCode = crypto.randomBytes(6).toString('hex');
      try {
        await user.save();
        break;
      } catch (e) {
        if (e && e.code === 11000 && String(e.message || '').includes('referralCode')) {
          attempts += 1;
          continue;
        }
        throw e;
      }
    }
    if (attempts === 5) {
      return res.status(500).json({ success: false, message: 'Server error during registration' });
    }

    // Update last login tracker (without logging in)
    user.lastLogin = null;

    // Send verification email in background
    sendVerificationEmail({ email: user.email, firstName: user.firstName, token: rawToken })
      .catch(err => console.error('[Background Email] Verification email failed:', err));

    // Do NOT send welcome email here — wait until email is verified


    // Do NOT return a JWT — user must verify email first
    const userResponse = user.toObject();
    delete userResponse.password;
    delete userResponse.emailVerificationToken;

    res.status(201).json({
      success: true,
      requiresVerification: true,
      message: 'Registration successful. Please check your email to verify your account.',
      data: { user: { email: userResponse.email, firstName: userResponse.firstName } }
    });

    try { global.__broadcastUsersUpdate && global.__broadcastUsersUpdate({ type: 'user_registered', id: user._id }); } catch (_) { }

  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
});

// @route   GET /api/auth/verify-email/:token
// @desc    Verify email address and return JWT for auto-login
// @access  Public
router.get('/verify-email/:token', async (req, res) => {
  try {
    const hashedToken = crypto.createHash('sha256').update(req.params.token).digest('hex');

    // Find user by token only (ignore expiry for a moment to see if it exists)
    const user = await User.findOne({
      emailVerificationToken: hashedToken
    });

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Verification link is invalid. Please register again.'
      });
    }

    // If already verified, return a specific message
    if (user.isEmailVerified) {
      return res.json({
        success: true,
        alreadyVerified: true,
        message: 'Your email has been verified, you can safely login'
      });
    }

    // Check if link expired
    if (!user.emailVerificationExpires || user.emailVerificationExpires < Date.now()) {
      return res.status(400).json({
        success: false,
        message: 'Verification link has expired. Please register again.'
      });
    }

    // Mark email as verified
    user.isEmailVerified = true;
    // We KEEP the token so we can recognize it later if clicked again
    // But we clear the expiry
    user.emailVerificationExpires = undefined;
    await user.save({ validateBeforeSave: false });

    // Issue a JWT so the frontend can log in the user automatically
    const payload = { user: { id: user._id, email: user.email, role: user.role } };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE || '7d' });

    const userResponse = user.toObject();
    delete userResponse.password;

    // Send welcome email after successful verification
    sendWelcomeEmail({ email: user.email, firstName: user.firstName })
      .catch(err => console.error('[Background Email] Welcome email failed:', err));

    res.json({
      success: true,
      message: 'Email verified successfully! Welcome to VictimDAO.',
      data: { token, user: userResponse }
    });

  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ success: false, message: 'Server error during email verification' });
  }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),

  body('password')
    .notEmpty()
    .withMessage('Password is required')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { email, password, rememberMe } = req.body;

    // Check if user exists
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(400).json({
        success: false,
        message: 'Your account has been deactivated. Please contact support.'
      });
    }

    // Check password
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Generate JWT token
    const payload = {
      user: {
        id: user._id,
        email: user.email,
        role: user.role
      }
    };

    const tokenExpiry = rememberMe ? '30d' : (process.env.JWT_EXPIRE || '7d');
    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: tokenExpiry
    });

    // Update last login
    await user.updateLastLogin(req.ip, req.get('User-Agent'));

    // Remove password from response
    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user: userResponse
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const userData = user.toJSON();

    // Calculate dynamic rank to match leaderboard behavior
    // Ranks start from 5000 (4999 offset + position)
    // Sort: effectivePoints DESC, then firstName ASC (same as leaderboard)
    try {
      if (user.overrides?.rankOverride) {
        userData.rank = user.overrides.rankOverride;
      } else {
        const effectivePoints = Math.max(0, (user.points || 0) + (user.overrides?.pointsOffset || 0));

        // Count users sorted BEFORE this user in the same order as leaderboard:
        // 1. effectivePoints > this user's effectivePoints
        // 2. effectivePoints == this user's AND firstName alphabetically < this user's
        const rankingAgg = await User.aggregate([
          { $match: { isActive: true } },
          {
            $addFields: {
              effPts: { $max: [0, { $add: ['$points', { $ifNull: ['$overrides.pointsOffset', 0] }] }] }
            }
          },
          {
            $match: {
              $or: [
                { effPts: { $gt: effectivePoints } },
                {
                  $and: [
                    { effPts: { $eq: effectivePoints } },
                    { firstName: { $lt: user.firstName } }
                  ]
                }
              ]
            }
          },
          { $count: 'count' }
        ]);

        const position = (rankingAgg[0]?.count || 0) + 1;
        userData.rank = 4999 + position;
      }
    } catch (err) {
      console.error('Rank calculation error:', err);
      userData.rank = 5000;
    }

    res.json({ success: true, data: { user: userData } });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error'
    });
  }
});

// @route   PUT /api/auth/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', auth, [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('First name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('First name can only contain letters and spaces'),

  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('Last name must be between 2 and 50 characters')
    .matches(/^[a-zA-Z\s]+$/)
    .withMessage('Last name can only contain letters and spaces'),

  body('username')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^[a-zA-Z0-9_]{3,32}$/)
    .withMessage('Username must be 3-32 characters and contain only letters, numbers, and underscores'),

  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio cannot exceed 500 characters'),

  body('email')
    .optional({ checkFalsy: true })
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),

  body('address')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ max: 200 })
    .withMessage('Address cannot exceed 200 characters'),

  body('telegramUsername')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^[a-zA-Z0-9_]{3,32}$/)
    .withMessage('Telegram username must be 3-32 characters and contain only letters, numbers, and underscores'),

  body('phoneNumber')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^\+?[0-9\s\-().]{7,20}$/)
    .withMessage('Phone number must be 7-20 digits and may include +, spaces, dashes, parentheses, and dots'),

  body('walletAddress')
    .optional({ checkFalsy: true })
    .trim()
    .isLength({ min: 10, max: 100 })
    .withMessage('Wallet address must be between 10 and 100 characters'),

  body('socialLinks.twitter')
    .optional()
    .isURL()
    .withMessage('Twitter URL must be valid'),

  body('socialLinks.linkedin')
    .optional()
    .isURL()
    .withMessage('LinkedIn URL must be valid'),

  body('socialLinks.github')
    .optional()
    .isURL()
    .withMessage('GitHub URL must be valid'),

  body('preferences.emailNotifications')
    .optional()
    .isBoolean()
    .withMessage('Email notifications must be boolean'),

  body('preferences.pushNotifications')
    .optional()
    .isBoolean()
    .withMessage('Push notifications must be boolean'),

  body('preferences.theme')
    .optional()
    .isIn(['light', 'dark'])
    .withMessage('Theme must be light or dark'),

  body('preferences.language')
    .optional()
    .isIn(['en', 'es', 'fr', 'de', 'it', 'pt', 'ru', 'zh', 'ja', 'ko'])
    .withMessage('Language must be a supported language code')
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const allowedUpdates = [
      'firstName', 'lastName', 'bio', 'email', 'username', 'address', 'telegramUsername', 'phoneNumber', 'walletAddress', 'socialLinks', 'preferences'
    ];

    const updates = {};
    Object.keys(req.body).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = req.body[key];
      }
    });

    if (updates.email) {
      const exists = await User.findOne({ email: updates.email, _id: { $ne: req.user.id } }).lean();
      if (exists) {
        return res.status(400).json({
          success: false,
          message: 'Email already in use'
        });
      }
    }
    if (updates.username) {
      const existsUser = await User.findOne({ username: updates.username, _id: { $ne: req.user.id } }).lean();
      if (existsUser) {
        return res.status(400).json({
          success: false,
          message: 'Username already in use'
        });
      }
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    try { global.__broadcastUsersUpdate && global.__broadcastUsersUpdate({ type: 'users_updated', id: user._id }); } catch (_) { }

    res.json({
      success: true,
      message: 'Profile updated successfully',
      data: {
        user
      }
    });

  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during profile update'
    });
  }
});

// @route   PUT /api/auth/change-password
// @desc    Change user password
// @access  Private
router.put('/change-password', auth, [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),

  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('New password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('New password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),

  body('confirmPassword')
    .custom((value, { req }) => {
      if (value !== req.body.newPassword) {
        throw new Error('Password confirmation does not match new password');
      }
      return true;
    })
], async (req, res) => {
  try {
    // Check for validation errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { currentPassword, newPassword } = req.body;

    // Get user with password
    const user = await User.findById(req.user.id).select('+password');
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check current password
    const isMatch = await user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password (hashed by model pre-save)
    user.password = newPassword;
    await user.save();

    res.json({
      success: true,
      message: 'Password changed successfully'
    });

  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during password change'
    });
  }
});

// @route   POST /api/auth/logout
// @desc    Logout user (client-side token removal)
// @access  Private
router.post('/logout', auth, async (req, res) => {
  try {
    // In a more advanced implementation, you might want to blacklist the token
    // For now, we'll just send a success response as the client will remove the token

    res.json({
      success: true,
      message: 'Logged out successfully'
    });

  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout'
    });
  }
});

// @route   POST /api/auth/request-password-otp
// @desc    Send OTP to the logged-in user's email
// @access  Private
router.post('/request-password-otp', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('email');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const code = (Math.floor(100000 + Math.random() * 900000)).toString();
    const hash = await bcrypt.hash(code, 12);
    const expiresAt = Date.now() + 10 * 60 * 1000;
    await Settings.setSetting(`USER_PASSWORD_OTP:${user.email}`, { hash, expiresAt }, req.user.id, 'User password OTP');
    const t = await emailService.getTransporter();
    const fromAddr = process.env.EMAIL_FROM || process.env.EMAIL_USERNAME;
    const info = await t.sendMail({ from: `Victim DAO <${fromAddr}>`, to: user.email, subject: 'Password OTP', text: `OTP: ${code}`, replyTo: fromAddr, envelope: { from: fromAddr, to: user.email }, headers: { 'X-Mailer': 'VictimDAO System' } });
    const ok = Array.isArray(info.accepted) && info.accepted.length > 0;
    if (!ok) {
      return res.status(500).json({ success: false, message: 'Failed to send OTP', error: { response: info.response, rejected: info.rejected } });
    }
    res.json({ success: true, message: 'OTP sent', accepted: info.accepted, response: info.response });
  } catch (error) {
    console.error('Request password OTP error:', error);
    res.status(500).json({ success: false, message: 'Server error while sending OTP' });
  }
});

// @route   POST /api/auth/change-password-otp
// @desc    Change password with OTP for logged-in user
// @access  Private
router.post('/change-password-otp', auth, [
  body('otp').isString().trim().notEmpty(),
  body('newPassword').isString().isLength({ min: 8 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }
    const { otp, newPassword } = req.body;
    let user = await User.findById(req.user.id).select('+password email');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    const rec = await Settings.getSetting(`USER_PASSWORD_OTP:${user.email}`);
    if (!rec || !rec.hash || !rec.expiresAt) {
      return res.status(400).json({ success: false, message: 'OTP not requested' });
    }
    if (Date.now() > rec.expiresAt) {
      return res.status(400).json({ success: false, message: 'OTP expired' });
    }
    const valid = await bcrypt.compare(otp, rec.hash);
    if (!valid) {
      return res.status(400).json({ success: false, message: 'Invalid OTP' });
    }
    user.password = newPassword;
    await user.save();
    await Settings.setSetting(`USER_PASSWORD_OTP:${user.email}`, { hash: '', expiresAt: 0 }, req.user.id, 'User password OTP cleared');
    res.json({ success: true, message: 'Password updated successfully' });
  } catch (error) {
    console.error('Change password OTP error:', error);
    res.status(500).json({ success: false, message: 'Server error while changing password' });
  }
});

// @route   GET /api/auth/verify-token
// @desc    Verify if token is valid
// @access  Private
router.get('/verify-token', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');

    if (!user || !user.isActive) {
      return res.status(401).json({
        success: false,
        message: 'Token is invalid or user is inactive'
      });
    }

    res.json({
      success: true,
      message: 'Token is valid',
      data: {
        user
      }
    });

  } catch (error) {
    console.error('Token verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during token verification'
    });
  }
});

module.exports = router;

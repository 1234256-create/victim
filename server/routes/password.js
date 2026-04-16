const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { sendPasswordResetEmail, getTransporter } = require('../services/emailService');
const crypto = require('crypto');
const { auth } = require('../middleware/auth');
const Settings = require('../models/Settings');
const bcrypt = require('bcryptjs');

const router = express.Router();

// @route   POST /api/password/forgot
// @desc    Request password reset
// @access  Public
router.post(
  '/forgot',
  [
    body('email')
      .isEmail()
      .normalizeEmail()
      .withMessage('Please provide a valid email address'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { email } = req.body;

      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({
          success: false,
          message: 'User with that email does not exist',
        });
      }

      const resetToken = user.createPasswordResetToken();
      await user.save({ validateBeforeSave: false });

      try {
        await sendPasswordResetEmail({
          email: user.email,
          firstName: user.firstName,
          token: resetToken,
        });

        res.json({
          success: true,
          message: 'Password reset token sent to email',
        });
      } catch (error) {
        user.passwordResetToken = undefined;
        user.passwordResetExpires = undefined;
        await user.save({ validateBeforeSave: false });

        console.error('Send email error:', error);
        return res.status(500).json({
          success: false,
          message: 'There was an error sending the email. Please try again later.',
        });
      }
    } catch (error) {
      console.error('Forgot password error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
      });
    }
  }
);

router.post('/forgot-otp', [
  body('email').isEmail().normalizeEmail()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }
    const { email } = req.body;
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: 'User with that email does not exist' });
    }
    const code = (Math.floor(100000 + Math.random() * 900000)).toString();
    const hash = await bcrypt.hash(code, 12);
    const expiresAt = Date.now() + 10 * 60 * 1000;
    await Settings.setSetting(`USER_PASSWORD_OTP:${email}`, { hash, expiresAt }, user._id, 'User password OTP');

    const { sendOTPEmail } = require('../services/emailService');
    await sendOTPEmail({
      email: user.email,
      firstName: user.firstName,
      code,
      type: 'Password Reset'
    });

    res.json({ success: true, message: 'OTP sent' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/reset-otp', [
  body('email').isEmail().normalizeEmail(),
  body('otp').isString().trim().notEmpty(),
  body('newPassword').isLength({ min: 8 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }
    const { email, otp, newPassword } = req.body;
    const rec = await Settings.getSetting(`USER_PASSWORD_OTP:${email}`);
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
    let user = await User.findOne({ email }).select('+password');
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }
    user.password = newPassword;
    await user.save();
    await Settings.setSetting(`USER_PASSWORD_OTP:${email}`, { hash: '', expiresAt: 0 }, user._id, 'User password OTP cleared');
    res.json({ success: true, message: 'Password updated' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   POST /api/password/reset/:token
// @desc    Reset password
// @access  Public
router.post(
  '/reset/:token',
  [
    body('password')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
    body('passwordConfirm')
      .custom((value, { req }) => {
        if (value !== req.body.password) {
          throw new Error('Passwords do not match');
        }
        return true;
      }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const hashedToken = crypto
        .createHash('sha256')
        .update(req.params.token)
        .digest('hex');

      const user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: Date.now() },
      });

      if (!user) {
        return res.status(400).json({
          success: false,
          message: 'Token is invalid or has expired',
        });
      }

      user.password = req.body.password;
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();

      // Log the user in (optional)
      // const token = user.getSignedJwtToken();
      // res.json({ success: true, token });

      res.json({
        success: true,
        message: 'Password reset successful',
      });

    } catch (error) {
      console.error('Reset password error:', error);
      res.status(500).json({
        success: false,
        message: 'Server error',
      });
    }
  }
);

// @route   PUT /api/password/update
// @desc    Update password for logged-in user
// @access  Private
router.put(
  '/update',
  auth,
  [
    body('currentPassword')
      .notEmpty()
      .withMessage('Current password is required'),
    body('newPassword')
      .isLength({ min: 8 })
      .withMessage('Password must be at least 8 characters long')
      .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/)
      .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array(),
        });
      }

      const { currentPassword, newPassword } = req.body;
      const user = await User.findById(req.user.id).select('+password');

      const isMatch = await user.comparePassword(currentPassword);
      if (!isMatch) {
        return res.status(401).json({
          success: false,
          message: 'Incorrect current password',
        });
      }

      user.password = newPassword;
      await user.save();

      res.json({ success: true, message: 'Password updated successfully' });
    } catch (error) {
      console.error('Update password error:', error);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  }
);

module.exports = router;
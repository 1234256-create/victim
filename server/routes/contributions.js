const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const Contribution = require('../models/Contribution');
const Coin = require('../models/Coin');
const Settings = require('../models/Settings');
const User = require('../models/User');
const { optionalAuth, auth, adminAuth } = require('../middleware/auth');

const router = express.Router();

// Ensure uploads directory exists
const receiptsDir = path.join(__dirname, '..', 'uploads', 'receipts');
fs.mkdirSync(receiptsDir, { recursive: true });

// Multer storage
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, receiptsDir);
  },
  filename: function (req, file, cb) {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9.\-_]/g, '_');
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + '-' + safeName);
  }
});

const fileFilter = (req, file, cb) => {
  const allowed = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/heic', 'application/pdf'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PNG, JPG, WEBP, HEIC, and PDF allowed.'));
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

// POST /api/contributions/upload
router.post('/upload', optionalAuth, upload.single('receipt'), async (req, res) => {
  try {
    const { amount, currency, walletAddress, transactionHash } = req.body;

    const isActive = await Settings.getSetting('contributionActive');
    const roundSetting = await Settings.getSetting('contributionRound');

    const publicContributionsRes = await Settings.getSetting('publicContributionsEnabled');
    const publicContributionsEnabled = publicContributionsRes === true;

    // Check if contribution is eligible for points at the time of upload
    // Rules:
    // 1. User MUST be logged in to earn points (standard)
    // 2. Global contributionActive must be true (general kill switch)
    // 3. EITHER:
    //    a. publicContributionsEnabled is true
    //    b. Must be within a valid, running round window
    let eligibleForPoints = false;

    // UPDATE: If isActive is null (not set), treat as TRUE to allow rounds to function. 
    // Only block if explicitly set to FALSE.
    const isGlobalActive = isActive !== false;

    // Requirement: User must be logged in to earn points automatically
    if (req.user && isGlobalActive) {
      if (publicContributionsEnabled) {
        eligibleForPoints = true;
      } else if (roundSetting && roundSetting.startTime && roundSetting.endTime) {
        const now = Date.now();
        const start = new Date(roundSetting.startTime).getTime();
        const end = new Date(roundSetting.endTime).getTime();
        const isRoundRunning = roundSetting.status === 'running';

        if (isRoundRunning && now >= start && now <= end) {
          eligibleForPoints = true;
        }
      }
    }

    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Receipt file is required' });
    }

    const parsedAmount = parseFloat(amount);
    if (!parsedAmount || parsedAmount < 50) {
      return res.status(400).json({ success: false, message: 'Amount must be at least $50' });
    }

    if (!currency) {
      return res.status(400).json({ success: false, message: 'Currency is required' });
    }

    if (!walletAddress) {
      return res.status(400).json({ success: false, message: 'Wallet address is required' });
    }

    // Normalize symbol (e.g., USDT-TRC20 -> USDT-TRC20 as-is)
    const symbol = String(currency).trim().toUpperCase();

    // Find or create coin entry
    let coin = await Coin.findOne({ symbol });
    if (!coin) {
      let creatorId = req.user ? req.user.id : null;
      if (!creatorId) {
        const adminUser = await User.findOne({ role: 'admin', isActive: true }).select('_id');
        creatorId = adminUser ? adminUser._id : null;
      }
      coin = new Coin({
        name: symbol,
        symbol,
        isActive: true,
        walletInfo: { address: walletAddress, network: 'Other' },
        createdBy: creatorId || undefined
      });
      await coin.save();
    }

    const receiptRelativePath = path.posix.join('/uploads/receipts', req.file.filename);

    let tierPoints = 0;

    const contribution = new Contribution({
      user: req.user ? req.user.id : null,
      coin: coin._id,
      amount: parsedAmount,
      currency: symbol,
      transactionHash: transactionHash || undefined,
      walletAddress,
      eligibleForPoints, // Save eligibility status
      receipt: {
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        path: receiptRelativePath,
        uploadedAt: new Date()
      },
      status: 'pending',
      conversionRate: 1,
      pointsAwarded: 0,
      metadata: {
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || '',
        submissionSource: 'web'
      },
      history: [{
        action: 'submitted',
        performedBy: (req.user ? req.user.id : (await User.findOne({ role: 'admin', isActive: true }).select('_id'))?._id),
        timestamp: new Date(),
        notes: 'Contribution submitted with receipt',
        previousStatus: null,
        newStatus: 'pending'
      }]
    });

    await contribution.save();

    if (req.user) {
      try { global.__broadcastUsersUpdate && global.__broadcastUsersUpdate({ type: 'user_contribution_submitted', id: req.user.id }); } catch (_) { }
    }

    res.status(201).json({ success: true, message: 'Contribution proof submitted', data: { contribution } });
  } catch (err) {
    console.error('Upload contribution error:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
});

// GET /api/contributions (admin)
router.get('/', adminAuth, async (req, res) => {
  try {
    const { status, user } = req.query;
    const query = {};
    if (status) query.status = status;
    if (user) query.user = user;
    const contributions = await Contribution.find(query)
      .populate('user', 'firstName lastName email')
      .populate('coin', 'name symbol')
      .sort({ createdAt: -1 });
    res.json({ success: true, data: { contributions } });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// PUT /api/contributions/:id/verify (admin only)
router.put('/:id/verify', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const contribution = await Contribution.findById(id);
    if (!contribution) {
      return res.status(404).json({ success: false, message: 'Contribution not found' });
    }
    await contribution.approve(req.user.id, 'Verified by admin');
    res.json({ success: true, message: 'Contribution verified', data: { contribution } });
  } catch (err) {
    console.error('Verify contribution error:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
});

// PUT /api/contributions/:id/reject (admin only)
router.put('/:id/reject', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const contribution = await Contribution.findById(id);
    if (!contribution) {
      return res.status(404).json({ success: false, message: 'Contribution not found' });
    }
    await contribution.reject(req.user.id, 'Rejected by admin');
    res.json({ success: true, message: 'Contribution rejected', data: { contribution } });
  } catch (err) {
    console.error('Reject contribution error:', err);
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
});

// GET /api/contributions/mine
router.get('/mine', auth, async (req, res) => {
  try {
    const contributions = await Contribution.getUserContributions(req.user.id);
    res.json({ success: true, data: { contributions } });
  } catch (err) {
    console.error('Fetch user contributions error:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

module.exports = router;

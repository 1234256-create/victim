const express = require('express');
const { body, validationResult, query } = require('express-validator');
const User = require('../models/User');
const { auth, adminAuth, ownerOrAdmin } = require('../middleware/auth');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

global.__UsersStreamClients = global.__UsersStreamClients || new Set();
global.__BroadcastThrottle = global.__BroadcastThrottle || Object.create(null);
global.__BroadcastMinInterval = global.__BroadcastMinInterval || 500;
global.__broadcastUsersUpdate = global.__broadcastUsersUpdate || function (payload) {
  const msg = payload || { type: 'users_updated' };
  const now = Date.now();
  const last = global.__BroadcastThrottle[msg.type] || 0;
  if (now - last < global.__BroadcastMinInterval) return;
  global.__BroadcastThrottle[msg.type] = now;
  try {
    for (const res of global.__UsersStreamClients) {
      res.write(`data: ${JSON.stringify(msg)}\n\n`);
    }
  } catch (_) { }
  try { global.__wsBroadcast && global.__wsBroadcast(msg); } catch (_) { }
};

const router = express.Router();

// @route   POST /api/users
// @desc    Create a new user (admin only)
// @access  Private/Admin
router.post('/', adminAuth, [
  body('firstName').trim().notEmpty().withMessage('First name is required'),
  body('lastName').optional().trim(),
  body('email').optional().isEmail().withMessage('Valid email is required'),
  body('password').optional().isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('isVirtual').optional().isBoolean(),
  body('points').optional().isNumeric(),
  body('votingRights').optional().isInt({ min: 0 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, errors: errors.array() });
    }

    const { firstName, lastName, email, password, isVirtual, points, votingRights } = req.body;

    // Generate email/password for virtual users if not provided
    let userEmail = email;
    let userPassword = password;

    if (isVirtual) {
      if (!userEmail) {
        userEmail = `virtual_${Date.now()}_${Math.floor(Math.random() * 1000)}@victim.dao`;
      }
      if (!userPassword) {
        userPassword = Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8);
      }
    }

    if (!userEmail || !userPassword) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    // Check if user exists
    let user = await User.findOne({ email: userEmail });
    if (user) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    user = new User({
      firstName,
      lastName,
      email: userEmail,
      password: userPassword,
      isVirtual: !!isVirtual,
      votingRights: votingRights !== undefined ? votingRights : 1,
      points: 0, // Base points are 0, we'll add initial points via overrides if needed
      isActive: true
    });

    // Hash password
    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(userPassword, salt);

    await user.save();

    // If initial points provided, add them via overrides
    if (points !== undefined && points > 0) {
      user.overrides = user.overrides || {};
      user.overrides.pointsOffset = points;
      user.markModified('overrides');
      await user.save();
    }

    res.json({
      success: true,
      data: {
        user: {
          id: user._id,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          isVirtual: user.isVirtual,
          points: points || 0,
          votingRights: user.votingRights
        }
      }
    });

    try { global.__broadcastUsersUpdate({ type: 'user_created', id: user._id }); } catch (_) { }

  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   GET /api/users
// @desc    Get all users (admin only)
// @access  Private/Admin
router.get('/', adminAuth, [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),

  query('limit')
    .optional()
    .isInt({ min: 1, max: 2000 })
    .withMessage('Limit must be between 1 and 2000'),

  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search term must be between 1 and 100 characters'),

  query('role')
    .optional()
    .isIn(['user', 'moderator', 'admin'])
    .withMessage('Role must be user, moderator, or admin'),

  query('status')
    .optional()
    .isIn(['active', 'inactive'])
    .withMessage('Status must be active or inactive'),

  query('type')
    .optional()
    .isIn(['all', 'real', 'virtual'])
    .withMessage('Type must be all, real, or virtual'),

  query('sortBy')
    .optional()
    .isIn(['createdAt', 'firstName', 'lastName', 'email', 'points.total', 'lastLogin'])
    .withMessage('Invalid sort field'),

  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
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

    const {
      page = 1,
      limit = 20,
      search,
      role,
      status,
      type = 'all',
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = req.query;

    // Build filter object
    const filter = {};

    if (search) {
      filter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    if (role) {
      filter.role = role;
    }

    if (status) {
      filter.isActive = status === 'active';
    }

    if (type === 'real') {
      filter.isVirtual = { $ne: true };
    } else if (type === 'virtual') {
      filter.isVirtual = true;
    }

    // Build sort object
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;

    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Get users with pagination
    const users = await User.find(filter)
      .select('-password')
      .populate('referredBy', 'firstName lastName')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit));

    // Get total count for pagination
    const total = await User.countDocuments(filter);
    const totalPages = Math.ceil(total / parseInt(limit));

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          currentPage: parseInt(page),
          totalPages,
          totalUsers: total,
          hasNextPage: parseInt(page) < totalPages,
          hasPrevPage: parseInt(page) > 1
        }
      }
    });

    try { global.__broadcastUsersUpdate({ type: 'users_fetched' }); } catch (_) { }

  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching users'
    });
  }
});

// @route   GET /api/users/leaderboard
// @desc    Get user leaderboard
// @access  Public
router.get('/leaderboard', async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    // Use aggregation to sort by effective points (base points + offset)
    const users = await User.aggregate([
      { $match: { isActive: true } },
      {
        $addFields: {
          effectivePoints: {
            $max: [0, { $add: ["$points", { $ifNull: ["$overrides.pointsOffset", 0] }] }]
          }
        }
      },
      { $sort: { effectivePoints: -1, firstName: 1 } },
      { $skip: skip },
      { $limit: parseInt(limit) },
      {
        $project: {
          _id: 1,
          firstName: 1,
          lastName: 1,
          email: 1,
          points: "$effectivePoints",
          stats: {
            votingPoints: { $max: [0, { $add: ["$stats.votingPoints", { $ifNull: ["$overrides.statsOffsets.votingPoints", 0] }] }] },
            contributionPoints: { $max: [0, { $add: ["$stats.contributionPoints", { $ifNull: ["$overrides.statsOffsets.contributionPoints", 0] }] }] },
            referralPoints: { $max: [0, { $add: ["$stats.referralPoints", { $ifNull: ["$overrides.statsOffsets.referralPoints", 0] }] }] },
            totalVotes: 1,
            totalContributions: 1
          },
          isVirtual: 1,
          createdAt: 1,
          lastLogin: 1,
          overrides: {
            rankOverride: 1
          }
        }
      }
    ]);

    const count = await User.countDocuments({ isActive: true });
    const baselineTotal = count + 6000;
    const activeUsersBaseline = Math.floor(baselineTotal * 0.85);

    // Attach the explicit rank to each user (starts from 5000)
    const usersWithRank = users.map((u, i) => ({
      ...u,
      rank: 5000 + skip + i
    }));

    res.json({
      success: true,
      data: {
        users: usersWithRank,
        totalUsers: baselineTotal,
        activeUsers: activeUsersBaseline,
        page: parseInt(page),
        totalPages: Math.ceil(count / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get leaderboard error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching leaderboard' });
  }
});

// @route   GET /api/users/:userId/referrals
// @desc    Get referrals for a user (self or admin)
// @access  Private
router.get('/:userId/referrals', ownerOrAdmin('userId'), [
  query('limit')
    .optional()
    .isInt({ min: 1, max: 200 })
    .withMessage('Limit must be between 1 and 200'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
], async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50, page = 1 } = req.query;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = { referredBy: userId };
    const total = await User.countDocuments(filter);
    const docs = await User.find(filter)
      .select('firstName lastName email createdAt referralCode isActive')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    const referrals = docs.map((u) => ({
      id: u._id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      referralCode: u.referralCode,
      createdAt: u.createdAt,
      status: u.isActive ? 'active' : 'inactive'
    }));

    res.json({
      success: true,
      data: {
        referrals,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.max(1, Math.ceil(total / parseInt(limit))),
          totalReferrals: total,
          hasNextPage: skip + parseInt(limit) < total,
          hasPrevPage: parseInt(page) > 1
        }
      }
    });

    try { global.__broadcastUsersUpdate({ type: 'user_referrals_fetched', id: userId }); } catch (_) { }
  } catch (error) {
    console.error('Get referrals error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching referrals' });
  }
});

// @route   GET /api/users/stats
// @desc    Get user statistics (admin only)
// @access  Private/Admin
router.get('/stats', adminAuth, async (req, res) => {
  try {
    const stats = await User.getUserStats();

    res.json({
      success: true,
      data: {
        stats
      }
    });

  } catch (error) {
    console.error('Get user stats error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user statistics'
    });
  }
});

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private (own profile or admin)
router.get('/:id', ownerOrAdmin(), async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const obj = user.toObject();
    const original = String(req.query.original || '').toLowerCase();
    const includeOverrides = !(original === 'true' || original === '1');
    if (includeOverrides && obj.overrides) {
      // 1. Voting Rights Offset
      if (typeof obj.overrides.votingRightsOffset === 'number') {
        obj.votingRights = Math.max(0, (obj.votingRights || 0) + obj.overrides.votingRightsOffset);
      } else if (typeof obj.overrides.votingRights === 'number') {
        obj.votingRights = obj.overrides.votingRights;
      }

      // 2. Stats Offsets
      obj.stats = obj.stats || {};
      const statsOffsets = obj.overrides.statsOffsets || {};
      const oStats = obj.overrides.stats || {};

      if (typeof statsOffsets.votingPoints === 'number') {
        obj.stats.votingPoints = Math.max(0, (obj.stats.votingPoints || 0) + statsOffsets.votingPoints);
      } else if (typeof oStats.votingPoints === 'number') {
        obj.stats.votingPoints = oStats.votingPoints;
      }

      if (typeof statsOffsets.contributionPoints === 'number') {
        obj.stats.contributionPoints = Math.max(0, (obj.stats.contributionPoints || 0) + statsOffsets.contributionPoints);
      } else if (typeof oStats.contributionPoints === 'number') {
        obj.stats.contributionPoints = oStats.contributionPoints;
      }

      if (typeof statsOffsets.referralPoints === 'number') {
        obj.stats.referralPoints = Math.max(0, (obj.stats.referralPoints || 0) + statsOffsets.referralPoints);
      } else if (typeof oStats.referralPoints === 'number') {
        obj.stats.referralPoints = oStats.referralPoints;
      }

      // 3. Total Points Offset
      if (typeof obj.overrides.pointsOffset === 'number') {
        obj.points = Math.max(0, (obj.points || 0) + obj.overrides.pointsOffset);
      } else if (typeof obj.overrides.points === 'number') {
        obj.points = obj.overrides.points;
      } else if (typeof obj.overrides.points !== 'number' && Object.keys(oStats).length > 0) {
        // Fallback for legacy complex delta calculation if needed, 
        // but generally we expect pointsOffset to be set if statsOffsets are set.
        // If only legacy absolute stats are present, we might need to recalculate total points?
        // Let's keep it simple: if no pointsOffset and no points override, trust the base points 
        // unless legacy logic is required. The legacy logic was complex and prone to bugs.
        // We'll assume the new system handles totals via pointsOffset.
      }

      // Legacy other stats
      if (typeof oStats.totalVotes === 'number') obj.stats.totalVotes = oStats.totalVotes;
      if (typeof oStats.totalContributions === 'number') obj.stats.totalContributions = oStats.totalContributions;
      if (typeof oStats.contributionAmount === 'number') obj.stats.contributionAmount = oStats.contributionAmount;
    }

    // Always include real stats (unaffected by manipulation) for admin review
    try {
      obj.realStats = await user.calculateRealStats();
    } catch (e) {
      console.error('Failed to calculate real stats:', e);
    }

    res.json({ success: true, data: { user: obj } });

  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user'
    });
  }
});

// @route   PUT /api/users/:id/overrides
// @desc    Set admin overrides for user stats/points (admin only)
// @access  Private/Admin
router.put('/:id/overrides', adminAuth, async (req, res) => {
  try {
    return res.status(410).json({ success: false, message: 'Overrides feature disabled' });
  } catch (error) {
    return res.status(410).json({ success: false, message: 'Overrides feature disabled' });
  }
});

// @route   PUT /api/users/:id
// @desc    Update user (admin only)
// @access  Private/Admin
router.put('/:id', ownerOrAdmin(), [
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

  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address'),

  body('username')
    .optional({ checkFalsy: true })
    .trim()
    .matches(/^[a-zA-Z0-9_]{3,32}$/)
    .withMessage('Username must be 3-32 characters and contain only letters, numbers, and underscores'),



  body('votingRights')
    .optional()
    .isInt({ min: 0 })
    .withMessage('Voting rights must be a non-negative integer'),

  body('bio')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Bio cannot exceed 500 characters')
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

    const { id } = req.params;
    const updates = req.body;

    // Check if user exists
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    if (updates.email && updates.email !== user.email) {
      const existingUser = await User.findOne({ email: updates.email });
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email is already taken'
        });
      }
    }
    if (updates.username && updates.username !== user.username) {
      const existingUserByUsername = await User.findOne({ username: updates.username });
      if (existingUserByUsername) {
        return res.status(400).json({
          success: false,
          message: 'Username is already taken'
        });
      }
    }

    // Update user
    const updatedUser = await User.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select('-password');

    res.json({
      success: true,
      message: 'User updated successfully',
      data: {
        user: updatedUser
      }
    });

    try { global.__broadcastUsersUpdate({ type: 'user_updated', id }); } catch (_) { }

  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating user'
    });
  }
});

// @route   PUT /api/users/:id/dashboard-bulk
// @desc    Bulk update user dashboard data (points, losses, rank) (admin only)
// @access  Private/Admin
router.put('/:id/dashboard-bulk', adminAuth, [
  body('points').optional().isObject(),
  body('losses').optional().isObject(),
  body('rank').optional({ checkFalsy: true }).isNumeric(),
  body('reason').optional().trim()
], async (req, res) => {
  try {
    const { id } = req.params;
    const { points, losses, rank, reason } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // 1. Handle Losses
    if (losses) {
      if (losses.verified !== undefined) user.verifiedLoss = Number(losses.verified);
      if (losses.unverified !== undefined) user.unverifiedLoss = Number(losses.unverified);
      if (losses.restituted !== undefined) user.amountRestituted = Number(losses.restituted);
    }

    // 2. Handle Rank
    if (rank !== undefined) {
      user.overrides = user.overrides || {};
      user.overrides.rankOverride = (rank === null || rank === '') ? undefined : Number(rank);
      user.markModified('overrides');
    }

    // 3. Handle Points (Bulk)
    if (points) {
      user.pointsHistory = user.pointsHistory || [];
      const categories = ['total', 'voting', 'contributions', 'referral'];

      categories.forEach(cat => {
        const data = points[cat];
        if (data && !isNaN(parseFloat(data.amount)) && parseFloat(data.amount) > 0) {
          const amt = Math.abs(parseFloat(data.amount));
          const isAdd = data.type === 'add';
          const delta = isAdd ? amt : -amt;

          if (cat === 'total') {
            user.points = Math.max(0, (user.points || 0) + delta);
            user.pointsHistory.push({ category: 'total', amount: amt, type: data.type, reason: reason || 'Bulk update', performedBy: req.user.id });
          } else {
            const field = cat === 'voting' ? 'votingPoints' : cat === 'contributions' ? 'contributionPoints' : 'referralPoints';
            user.stats = user.stats || {};
            user.stats[field] = Math.max(0, (user.stats[field] || 0) + delta);

            // Mirror change to total points
            user.points = Math.max(0, (user.points || 0) + delta);
            user.pointsHistory.push({ category: cat, amount: amt, type: data.type, reason: reason || 'Bulk update', performedBy: req.user.id });
          }
        }
      });

      user.markModified('stats');
      user.markModified('pointsHistory');
    }

    await user.save();

    res.json({ success: true, message: 'Dashboard data updated successfully', data: { user } });
    try { global.__broadcastUsersUpdate({ type: 'user_updated', id }); } catch (_) { }
    try { global.__broadcastUsersUpdate({ type: 'user_points_updated', id }); } catch (_) { }
  } catch (error) {
    console.error('Bulk dashboard update error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/users/:id/dashboard-data
// @desc    Update user dashboard data (admin only)
// @access  Private/Admin
router.put('/:id/dashboard-data', adminAuth, [
  body('verifiedLoss').optional().isNumeric(),
  body('unverifiedLoss').optional().isNumeric(),
  body('amountRestituted').optional().isNumeric(),
  body('rank').optional({ checkFalsy: true }).isNumeric()
], async (req, res) => {
  try {
    const { id } = req.params;
    const { verifiedLoss, unverifiedLoss, amountRestituted, rank } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (verifiedLoss !== undefined) user.verifiedLoss = verifiedLoss;
    if (unverifiedLoss !== undefined) user.unverifiedLoss = unverifiedLoss;
    if (amountRestituted !== undefined) user.amountRestituted = amountRestituted;

    if (rank !== undefined) {
      user.overrides = user.overrides || {};
      user.overrides.rankOverride = (rank === null || rank === '') ? undefined : Number(rank);
      user.markModified('overrides');
    }

    await user.save();

    res.json({ success: true, message: 'Dashboard data updated', data: { user } });
    try { global.__broadcastUsersUpdate({ type: 'user_updated', id }); } catch (_) { }
  } catch (error) {
    console.error('Update dashboard data error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// @route   PUT /api/users/:id/points
// @desc    Add or deduct points from user (admin only)
// @access  Private/Admin
router.put('/:id/points', adminAuth, [
  body('amount')
    .isNumeric()
    .withMessage('Amount must be a number'),

  body('type')
    .isIn(['add', 'deduct'])
    .withMessage('Type must be add or deduct'),

  body('category')
    .optional()
    .isIn(['voting', 'contributions', 'referral', 'bonus', 'penalty'])
    .withMessage('Category must be voting, contributions, referral, bonus, or penalty'),

  body('reason')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Reason cannot exceed 200 characters')
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

    const { id } = req.params;
    const { amount, type, category = 'bonus', reason } = req.body;

    // Check if user exists
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const pointsAmount = Math.abs(parseFloat(amount));
    user.overrides = user.overrides || {};
    user.overrides.statsOffsets = user.overrides.statsOffsets || {};

    // Clear old absolute overrides to avoid confusion
    if (user.overrides.points !== undefined) user.overrides.points = undefined;
    if (user.overrides.stats) {
      if (user.overrides.stats.votingPoints !== undefined) user.overrides.stats.votingPoints = undefined;
      if (user.overrides.stats.contributionPoints !== undefined) user.overrides.stats.contributionPoints = undefined;
      if (user.overrides.stats.referralPoints !== undefined) user.overrides.stats.referralPoints = undefined;
    }

    const delta = type === 'add' ? pointsAmount : -pointsAmount;

    if (['voting', 'contributions', 'referral'].includes(category)) {
      const field = category === 'voting' ? 'votingPoints'
        : category === 'contributions' ? 'contributionPoints'
          : 'referralPoints';

      user.stats = user.stats || {};
      user.stats[field] = Math.max(0, (user.stats[field] || 0) + delta);
      user.points = Math.max(0, (user.points || 0) + delta);
    } else {
      user.points = Math.max(0, (user.points || 0) + delta);
    }

    user.pointsHistory = user.pointsHistory || [];
    user.pointsHistory.push({
      category: ['voting', 'contributions', 'referral'].includes(category) ? category : 'total',
      amount: pointsAmount,
      type,
      reason: reason || 'Individual point adjustment',
      performedBy: req.user.id
    });

    user.markModified('stats');
    user.markModified('pointsHistory');
    await user.save();

    // Get updated user
    const updatedUser = await User.findById(id).select('-password');

    res.json({
      success: true,
      message: `Points ${type === 'add' ? 'added' : 'deducted'} successfully`,
      data: {
        user: updatedUser,
        transaction: {
          amount: type === 'add' ? pointsAmount : -pointsAmount,
          category,
          reason,
          performedBy: req.user.id,
          timestamp: new Date()
        }
      }
    });

    try { global.__broadcastUsersUpdate({ type: 'user_points_updated', id }); } catch (_) { }
    try { global.__broadcastUsersUpdate({ type: 'user_overrides_updated', id }); } catch (_) { }

  } catch (error) {
    console.error('Update points error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating points'
    });
  }
});

// @route   PUT /api/users/:id/voting-rights
// @desc    Update user voting rights (admin only)
// @access  Private/Admin
router.put('/:id/voting-rights', adminAuth, [
  body('votingRights')
    .isInt({ min: 0 })
    .withMessage('Voting rights must be a non-negative integer'),

  body('reason')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Reason cannot exceed 200 characters')
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

    const { id } = req.params;
    const { votingRights, reason } = req.body;

    // Check if user exists
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Update voting rights via overrides only (do not change base real data)
    const previousRights = user.votingRights;
    try {
      user.overrides = user.overrides || {};
      // Calculate offset: Desired = Base + Offset => Offset = Desired - Base
      user.overrides.votingRightsOffset = votingRights - user.votingRights;

      // Clear absolute override if present
      if (user.overrides.votingRights !== undefined) user.overrides.votingRights = undefined;
    } catch (_) { }
    user.markModified('overrides');
    await user.save();

    res.json({
      success: true,
      message: 'Voting rights updated successfully',
      data: {
        user: await User.findById(id).select('-password'),
        change: {
          from: previousRights,
          to: votingRights,
          reason,
          performedBy: req.user.id,
          timestamp: new Date()
        }
      }
    });

    try { global.__broadcastUsersUpdate({ type: 'user_voting_updated', id }); } catch (_) { }
    try { global.__broadcastUsersUpdate({ type: 'user_overrides_updated', id }); } catch (_) { }

  } catch (error) {
    console.error('Update voting rights error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating voting rights'
    });
  }
});

// @route   PUT /api/users/:id/status
// @desc    Activate/deactivate user (admin only)
// @access  Private/Admin
router.put('/:id/status', ownerOrAdmin(), [
  body('isActive')
    .isBoolean()
    .withMessage('isActive must be boolean'),

  body('reason')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Reason cannot exceed 200 characters')
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

    const { id } = req.params;
    const { isActive, reason } = req.body;

    // Check if user exists
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent admin from deactivating themselves
    if (id === req.user.id && !isActive) {
      return res.status(400).json({
        success: false,
        message: 'You cannot deactivate your own account'
      });
    }

    // Update status
    const previousStatus = user.isActive;
    user.isActive = isActive;
    await user.save();

    res.json({
      success: true,
      message: `User ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        user: await User.findById(id).select('-password'),
        change: {
          from: previousStatus,
          to: isActive,
          reason,
          performedBy: req.user.id,
          timestamp: new Date()
        }
      }
    });

    try { global.__broadcastUsersUpdate({ type: 'user_status_updated', id }); } catch (_) { }

  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating user status'
    });
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete user (admin only)
// @access  Private/Admin
router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user exists
    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent admin from deleting themselves
    if (id === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot delete your own account'
      });
    }

    // Delete user
    await User.findByIdAndDelete(id);

    res.json({
      success: true,
      message: 'User deleted successfully',
      data: {
        deletedUser: {
          id: user._id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`
        },
        deletedBy: req.user.id,
        deletedAt: new Date()
      }
    });

    try { global.__broadcastUsersUpdate({ type: 'user_deleted', id }); } catch (_) { }

  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while deleting user'
    });
  }
});

router.get('/stream', async (req, res) => {
  const token = req.query.token;
  if (!token) return res.status(401).end();
  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (_) {
    return res.status(401).end();
  }
  const role = payload?.user?.role;
  if (role !== 'admin') return res.status(403).end();
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders && res.flushHeaders();
  global.__UsersStreamClients.add(res);
  res.write('data: {"type":"connected"}\n\n');
  req.on('close', () => {
    try { global.__UsersStreamClients.delete(res); } catch (_) { }
  });
});

module.exports = router;

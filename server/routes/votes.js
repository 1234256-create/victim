const express = require('express');
const { body, validationResult, query } = require('express-validator');
const { auth, adminAuth } = require('../middleware/auth');
const Vote = require('../models/Vote');
const User = require('../models/User');
const { getTransporter } = require('../services/emailService');

const nodemailer = require('nodemailer');

const mkTransporter = async () => getTransporter();

// Helper function to send vote notifications with chunking
const sendVoteNotifications = async (vote) => {
  try {
    console.log(`[Vote Notification] Starting process for vote: ${vote._id}`);

    // 1. Dashboard Notification (via WebSocket broadcast)
    if (global.__broadcastUsersUpdate) {
      global.__broadcastUsersUpdate({
        type: 'vote_created_notification',
        vote: { id: vote._id, title: vote.title, startTime: vote.startTime, endTime: vote.endTime }
      });
    }

    // 2. Email Notifications to all active real users
    const users = await User.find({
      isActive: true,
      'preferences.emailNotifications': { $ne: false },
      isVirtual: { $ne: true }
    }).select('email firstName');

    console.log(`[Vote Notification] Found ${users.length} users targeted for notification`);

    const { sendVoteAnnouncementEmail } = require('../services/emailService');
    const validUsers = users.filter(u => u.email && !u.email.includes('@victim.dao'));

    console.log(`[Vote Notification] Dispatching to ${validUsers.length} valid users immediately`);

    // Fire all emails in parallel - the SMTP pool will handle the concurrency
    const results = await Promise.allSettled(validUsers.map(user =>
      sendVoteAnnouncementEmail({
        email: user.email,
        firstName: user.firstName,
        voteTitle: vote.title,
        voteId: vote._id
      })
    ));

    let successCount = 0;
    let failCount = 0;

    results.forEach((res, idx) => {
      if (res.status === 'fulfilled') {
        successCount++;
      } else {
        failCount++;
        const email = validUsers[idx]?.email;
        console.error(`[Vote Notification] Failed for ${email}:`, res.reason);
      }
    });

    console.log(`[Vote Notification] Complete. Success: ${successCount}, Failed: ${failCount}`);
  } catch (error) {
    console.error('[Vote Notification] Critical error in notification cycle:', error);
  }
};

const router = express.Router();

router.get('/health', (req, res) => {
  res.json({ status: 'OK', route: 'votes' });
});

router.get('/', auth, [
  query('status').optional().isIn(['draft', 'active', 'paused', 'completed']),
  query('limit').optional().isInt({ min: 1, max: 200 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }
    const { status, limit = 200 } = req.query; // Increased default limit to support multiple votes
    const filter = {};
    if (status) filter.status = status;
    // Non-admin users can only see active votes
    if (req.user.role !== 'admin') {
      filter.status = 'active';
    }
    // For admins without status filter, get all votes (draft, active, paused, completed)
    // For non-admins or when status is specified, filter by status
    // Get all votes - don't use lean() to ensure we can convert Maps properly
    const votes = await Vote.find(filter).sort({ createdAt: -1 }).limit(parseInt(limit));
    console.log(`[Votes API] Found ${votes.length} votes with filter:`, JSON.stringify(filter), `for user role: ${req.user.role}`);

    // Fetch current user's global voting rights to calculate bounds strictly for myVotingRights display
    const currentUser = req.user ? await User.findById(req.user.id) : null;
    const userVotingRights = currentUser ? currentUser.votingRights || 1 : 1;

    // Double-check: if admin and no status filter, verify we're getting all votes
    if (req.user.role === 'admin' && !status) {
      const totalCount = await Vote.countDocuments({});
      console.log(`[Votes API] Total votes in database: ${totalCount}, Returning: ${votes.length}`);
    }
    // Convert submissions Map to object for JSON serialization
    const votesWithSubmissions = votes.map(vote => {
      const voteObj = vote.toObject();
      if (voteObj.submissions instanceof Map) {
        voteObj.submissions = Object.fromEntries(voteObj.submissions);
      }
      if (voteObj.overrides instanceof Map) {
        voteObj.overrides = Object.fromEntries(voteObj.overrides);
      }
      // Hide other users' sensitive data if not admin
      if (req.user.role !== 'admin') {
        // Only keep current user's submission and override
        const mySub = voteObj.submissions[req.user.id] || 0;
        const myOverride = voteObj.overrides && voteObj.overrides[req.user.id] ? voteObj.overrides[req.user.id] : 0;

        // Clear maps
        voteObj.submissions = { [req.user.id]: mySub };
        voteObj.overrides = { [req.user.id]: myOverride };

        // Attach calculated rights for convenience
        // Base is higher of maxVotesPerUser or user's specific right
        const effectiveBase = Math.max(voteObj.maxVotesPerUser, userVotingRights);
        voteObj.myVotingRights = {
          base: effectiveBase,
          offset: myOverride,
          total: Math.max(0, effectiveBase + myOverride),
          used: mySub,
          remaining: Math.max(0, (effectiveBase + myOverride) - mySub)
        };
      }
      // Ensure id is available for compatibility
      if (voteObj._id && !voteObj.id) {
        voteObj.id = voteObj._id.toString();
      }
      return voteObj;
    });
    res.json({ success: true, data: { votes: votesWithSubmissions } });
  } catch (error) {
    console.error('Get votes error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching votes' });
  }
});

router.get('/:id/voters', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ success: false, message: 'Invalid vote ID' });
    }
    const vote = await Vote.findById(id).populate('voterDetails.userId', 'firstName lastName email');
    if (!vote) return res.status(404).json({ success: false, message: 'Vote not found' });

    const voters = (vote.voterDetails || []).map(detail => {
      const user = detail.userId;
      const option = vote.options.find(o => o.id === detail.optionId);
      return {
        userId: user ? user._id : null,
        fullName: user ? `${user.firstName} ${user.lastName || ''}`.trim() : 'Deleted User',
        email: user ? user.email : 'N/A',
        optionId: detail.optionId,
        optionText: option ? option.text : 'Unknown Option',
        votedAt: detail.votedAt
      };
    });

    res.json({ success: true, data: { voters: voters.reverse() } });
  } catch (error) {
    console.error('Get vote voters error:', error);
    res.status(500).json({ success: false, message: 'Server error while fetching voters' });
  }
});

router.get('/user/:userId', adminAuth, async (req, res) => {
  try {
    const { userId } = req.params;
    const votes = await Vote.find({ 'voterDetails.userId': userId });

    const history = [];
    votes.forEach(vote => {
      const details = vote.voterDetails.filter(d => d.userId.toString() === userId);
      details.forEach(d => {
        const option = vote.options.find(o => o.id === d.optionId);
        history.push({
          voteId: vote._id,
          voteTitle: vote.title,
          optionId: d.optionId,
          optionText: option ? option.text : 'Unknown Option',
          votedAt: d.votedAt
        });
      });
    });

    res.json({ success: true, data: { history: history.sort((a, b) => new Date(b.votedAt) - new Date(a.votedAt)) } });
  } catch (error) {
    console.error('Get user vote history error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/', adminAuth, [
  body('title').isString().trim().notEmpty(),
  body('description').optional().isString(),
  body('options').isArray({ min: 2 }),
  body('pointsReward').optional().isNumeric(),
  body('maxVotesPerUser').optional().isInt({ min: 1 }),
  body('durationHours').optional().isNumeric()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }
    const { title, description = '', options = [], pointsReward = 0, maxVotesPerUser = 1, durationHours, isProgressive = false } = req.body;

    const mappedOptions = options.map((opt, idx) => {
      if (typeof opt === 'object' && opt.text) {
        return {
          id: idx + 1,
          text: String(opt.text).trim(),
          votes: 0,
          votesOffset: Number(opt.votesOffset) || 0,
          targetVotes: Number(opt.targetVotes) || 0
        };
      }
      return { id: idx + 1, text: String(opt).trim(), votes: 0, votesOffset: 0, targetVotes: 0 };
    });

    const vote = new Vote({
      title,
      description,
      options: mappedOptions,
      isProgressive: !!isProgressive,
      pointsReward: Number(pointsReward) || 0,
      maxVotesPerUser: Number(maxVotesPerUser) || 1,
      status: 'draft',
      createdBy: req.user.id
    });
    await vote.save();

    if (durationHours) {
      await vote.start(durationHours);
      // Reload vote to get fresh data after start
      const startedVote = await Vote.findById(vote._id);

      // Trigger notifications since it's started immediately
      sendVoteNotifications(startedVote);

      // Convert submissions Map to object for JSON serialization
      const voteObj = startedVote.toObject();
      if (voteObj.submissions instanceof Map) {
        voteObj.submissions = Object.fromEntries(voteObj.submissions);
      }
      try { global.__broadcastUsersUpdate && global.__broadcastUsersUpdate({ type: 'vote_created', id: vote._id }); } catch (_) { }
      try { global.__broadcastUsersUpdate && global.__broadcastUsersUpdate({ type: 'vote_started', id: vote._id }); } catch (_) { }
      res.status(201).json({ success: true, message: 'Vote created and started', data: { vote: voteObj } });
    } else {
      // Convert submissions Map to object for JSON serialization
      const voteObj = vote.toObject();
      if (voteObj.submissions instanceof Map) {
        voteObj.submissions = Object.fromEntries(voteObj.submissions);
      }
      if (voteObj.overrides instanceof Map) {
        voteObj.overrides = Object.fromEntries(voteObj.overrides);
      }
      try { global.__broadcastUsersUpdate && global.__broadcastUsersUpdate({ type: 'vote_created', id: vote._id }); } catch (_) { }
      res.status(201).json({ success: true, message: 'Vote created', data: { vote: voteObj } });
    }
  } catch (error) {
    console.error('Create vote error:', error);
    res.status(500).json({ success: false, message: 'Server error while creating vote' });
  }
});

// @route   PUT /api/votes/:id
// @desc    Update a vote (admin only)
// @access  Private/Admin
router.put('/:id', adminAuth, [
  body('title').isString().trim(),
  body('description').optional().isString(),
  body('options').isArray(),
  body('pointsReward').optional().isNumeric(),
  body('maxVotesPerUser').optional().isInt({ min: 1 }),
  body('isProgressive').optional().isBoolean(),
  body('durationHours').optional().isNumeric()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }

    const { id } = req.params;
    const { title, description, options, pointsReward, maxVotesPerUser, isProgressive, durationHours } = req.body;

    const vote = await Vote.findById(id);
    if (!vote) return res.status(404).json({ success: false, message: 'Vote not found' });

    if (title) vote.title = title;
    if (description !== undefined) vote.description = description;
    if (pointsReward !== undefined) vote.pointsReward = Number(pointsReward);
    if (maxVotesPerUser !== undefined) vote.maxVotesPerUser = Number(maxVotesPerUser);
    if (isProgressive !== undefined) vote.isProgressive = !!isProgressive;

    if (durationHours !== undefined) {
      const hours = Number(durationHours);
      if (vote.startTime) {
        const ms = Math.max(1, hours) * 60 * 60 * 1000;
        vote.endTime = new Date(new Date(vote.startTime).getTime() + ms);
      }
    }

    if (options && Array.isArray(options)) {
      vote.options = options.map((opt, idx) => ({
        id: opt.id || idx + 1,
        text: String(opt.text || '').trim(),
        votes: Number(opt.votes) || 0,
        votesOffset: Number(opt.votesOffset) || 0,
        targetVotes: Number(opt.targetVotes) || 0
      }));
    }

    await vote.save();

    // Convert submissions Map to object for JSON serialization
    const voteObj = vote.toObject();
    if (voteObj.submissions instanceof Map) {
      voteObj.submissions = Object.fromEntries(voteObj.submissions);
    }
    if (voteObj.overrides instanceof Map) {
      voteObj.overrides = Object.fromEntries(voteObj.overrides);
    }

    try { global.__broadcastUsersUpdate && global.__broadcastUsersUpdate({ type: 'vote_updated', id: vote._id, voteId: vote._id }); } catch (_) { }

    res.json({ success: true, message: 'Vote updated', data: { vote: voteObj } });
  } catch (error) {
    console.error('Update vote error:', error);
    res.status(500).json({ success: false, message: 'Server error while updating vote' });
  }
});

router.put('/:id/start', adminAuth, [
  body('durationHours').optional().isNumeric()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }
    const { id } = req.params;
    const { durationHours = 24 } = req.body;
    const vote = await Vote.findById(id);
    if (!vote) return res.status(404).json({ success: false, message: 'Vote not found' });
    await vote.start(durationHours);
    // Reload vote to get fresh data
    const updatedVote = await Vote.findById(id);

    // Trigger notifications
    sendVoteNotifications(updatedVote);

    // Convert submissions Map to object for JSON serialization
    const voteObj = updatedVote.toObject();
    if (voteObj.submissions instanceof Map) {
      voteObj.submissions = Object.fromEntries(voteObj.submissions);
    }
    if (voteObj.overrides instanceof Map) {
      voteObj.overrides = Object.fromEntries(voteObj.overrides);
    }
    try { global.__broadcastUsersUpdate && global.__broadcastUsersUpdate({ type: 'vote_started', id: vote._id }); } catch (_) { }
    res.json({ success: true, message: 'Vote started', data: { vote: voteObj } });
  } catch (error) {
    console.error('Start vote error:', error);
    res.status(500).json({ success: false, message: 'Server error while starting vote' });
  }
});

router.put('/:id/pause', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ success: false, message: 'Invalid vote ID' });
    }
    const vote = await Vote.findById(id);
    if (!vote) {
      return res.status(404).json({ success: false, message: 'Vote not found' });
    }
    await vote.pause();
    // Reload vote to get fresh data
    const updatedVote = await Vote.findById(id);
    if (!updatedVote) {
      return res.status(404).json({ success: false, message: 'Vote not found after update' });
    }
    // Convert submissions Map to object for JSON serialization
    const voteObj = updatedVote.toObject();
    if (voteObj.submissions instanceof Map) {
      voteObj.submissions = Object.fromEntries(voteObj.submissions);
    }
    if (voteObj.overrides instanceof Map) {
      voteObj.overrides = Object.fromEntries(voteObj.overrides);
    }
    try { global.__broadcastUsersUpdate && global.__broadcastUsersUpdate({ type: 'vote_paused', id: vote._id }); } catch (_) { }
    res.json({ success: true, message: 'Vote paused', data: { vote: voteObj } });
  } catch (error) {
    console.error('Pause vote error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error while pausing vote' });
  }
});

router.put('/:id/resume', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ success: false, message: 'Invalid vote ID' });
    }
    const vote = await Vote.findById(id);
    if (!vote) {
      return res.status(404).json({ success: false, message: 'Vote not found' });
    }
    await vote.resume();
    // Reload vote to get fresh data
    const updatedVote = await Vote.findById(id);
    if (!updatedVote) {
      return res.status(404).json({ success: false, message: 'Vote not found after update' });
    }
    // Convert submissions Map to object for JSON serialization
    const voteObj = updatedVote.toObject();
    if (voteObj.submissions instanceof Map) {
      voteObj.submissions = Object.fromEntries(voteObj.submissions);
    }
    if (voteObj.overrides instanceof Map) {
      voteObj.overrides = Object.fromEntries(voteObj.overrides);
    }
    try { global.__broadcastUsersUpdate && global.__broadcastUsersUpdate({ type: 'vote_resumed', id: vote._id }); } catch (_) { }
    res.json({ success: true, message: 'Vote resumed', data: { vote: voteObj } });
  } catch (error) {
    console.error('Resume vote error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error while resuming vote' });
  }
});

router.put('/:id/complete', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ success: false, message: 'Invalid vote ID' });
    }
    const vote = await Vote.findById(id);
    if (!vote) {
      return res.status(404).json({ success: false, message: 'Vote not found' });
    }
    await vote.complete();
    // Reload vote to get fresh data
    const updatedVote = await Vote.findById(id);
    if (!updatedVote) {
      return res.status(404).json({ success: false, message: 'Vote not found after update' });
    }
    // Convert submissions Map to object for JSON serialization
    const voteObj = updatedVote.toObject();
    if (voteObj.submissions instanceof Map) {
      voteObj.submissions = Object.fromEntries(voteObj.submissions);
    }
    if (voteObj.overrides instanceof Map) {
      voteObj.overrides = Object.fromEntries(voteObj.overrides);
    }
    try { global.__broadcastUsersUpdate && global.__broadcastUsersUpdate({ type: 'vote_completed', id: vote._id }); } catch (_) { }
    res.json({ success: true, message: 'Vote completed', data: { vote: voteObj } });
  } catch (error) {
    console.error('Complete vote error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error while completing vote' });
  }
});

router.delete('/:id', adminAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!id || !id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(400).json({ success: false, message: 'Invalid vote ID' });
    }
    const vote = await Vote.findById(id);
    if (!vote) {
      return res.status(404).json({ success: false, message: 'Vote not found' });
    }
    await Vote.findByIdAndDelete(id);
    try { global.__broadcastUsersUpdate && global.__broadcastUsersUpdate({ type: 'vote_deleted', id: id }); } catch (_) { }
    res.json({ success: true, message: 'Vote deleted', data: { id } });
  } catch (error) {
    console.error('Delete vote error:', error);
    res.status(500).json({ success: false, message: error.message || 'Server error while deleting vote' });
  }
});

router.post('/:id/submit', auth, [
  body('optionId').isInt({ min: 1 })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }
    const { id } = req.params;
    const { optionId } = req.body;
    const vote = await Vote.findById(id);
    if (!vote) return res.status(404).json({ success: false, message: 'Vote not found' });
    const voter = await User.findById(req.user.id);
    if (!voter || !voter.isActive) {
      return res.status(403).json({ success: false, message: 'User is disabled and cannot vote' });
    }

    // Check if user has verified loss > 0
    if ((voter.verifiedLoss || 0) <= 0) {
      return res.status(403).json({ success: false, message: 'You must have a verified loss greater than $0 to cast a vote.' });
    }

    // Voting rights are enforced per vote via submissions and maxVotesPerUser
    // Do not block globally by totalVotes; rely on vote-level constraints
    await vote.submitVote(req.user.id, optionId);
    const reward = Math.max(1, Number(vote.pointsReward) || 1);
    if (reward > 0) {
      await voter.addCategoryPoints(reward, 'voting');
      try { global.__broadcastUsersUpdate && global.__broadcastUsersUpdate({ type: 'user_points_updated', id: voter._id }); } catch (_) { }
    } else {
      voter.stats.totalVotes = (voter.stats.totalVotes || 0) + 1;
      await voter.save();
    }
    // Reload vote to get fresh data
    const updatedVote = await Vote.findById(id);
    // Convert submissions Map to object for JSON serialization
    const voteObj = updatedVote.toObject();
    if (voteObj.submissions instanceof Map) {
      voteObj.submissions = Object.fromEntries(voteObj.submissions);
    }
    if (voteObj.overrides instanceof Map) {
      voteObj.overrides = Object.fromEntries(voteObj.overrides);
    }

    // Broadcast both user update and vote update
    try { global.__broadcastUsersUpdate && global.__broadcastUsersUpdate({ type: 'user_vote_submitted', id: voter._id }); } catch (_) { }
    try { global.__broadcastUsersUpdate && global.__broadcastUsersUpdate({ type: 'vote_updated', id: vote._id, voteId: vote._id }); } catch (_) { }
    try { global.__broadcastUsersUpdate && global.__broadcastUsersUpdate({ type: 'user_voting_updated', id: voter._id }); } catch (_) { }

    res.json({ success: true, message: 'Vote submitted', data: { vote: voteObj } });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message || 'Failed to submit vote' });
  }
});

// @route   PUT /api/votes/:id/users/:userId/override
// @desc    Override user voting rights for a specific vote (admin only)
// @access  Private/Admin
router.put('/:id/users/:userId/override', adminAuth, [
  body('offset').isInt()
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
    }
    const { id, userId } = req.params;
    const { offset } = req.body;

    const vote = await Vote.findById(id);
    if (!vote) return res.status(404).json({ success: false, message: 'Vote not found' });

    // Set override
    vote.overrides.set(String(userId), Number(offset));

    // If offset is 0, maybe remove it to keep map clean?
    if (Number(offset) === 0) {
      vote.overrides.delete(String(userId));
    }

    await vote.save();

    // Broadcast update
    try { global.__broadcastUsersUpdate && global.__broadcastUsersUpdate({ type: 'vote_updated', id: vote._id }); } catch (_) { }
    try { global.__broadcastUsersUpdate && global.__broadcastUsersUpdate({ type: 'user_voting_updated', id: userId }); } catch (_) { }

    res.json({ success: true, message: 'Voting rights override updated' });
  } catch (error) {
    console.error('Override vote rights error:', error);
    res.status(500).json({ success: false, message: 'Server error while updating override' });
  }
});

module.exports = router;

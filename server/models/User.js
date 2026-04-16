const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, 'First name is required'],
    trim: true,
    maxlength: [50, 'First name cannot be more than 50 characters']
  },
  lastName: {
    type: String,
    trim: true,
    maxlength: [50, 'Last name cannot be more than 50 characters']
  },
  email: {
    type: String,
    required: [true, 'Email is required'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please enter a valid email'
    ]
  },
  username: {
    type: String,
    unique: true,
    sparse: true,
    trim: true,
    match: [/^[a-zA-Z0-9_]{3,32}$/, 'Username must be 3-32 characters and contain only letters, numbers, and underscores']
  },
  password: {
    type: String,
    required: [true, 'Password is required'],
    minlength: [8, 'Password must be at least 8 characters'],
    select: false
  },
  role: {
    type: String,
    enum: ['user', 'admin'],
    default: 'user'
  },
  points: {
    type: Number,
    default: 0,
    min: 0
  },
  votingRights: {
    type: Number,
    default: 1,
    min: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVirtual: {
    type: Boolean,
    default: false
  },
  lastLogin: {
    type: Date
  },
  profileImage: {
    type: String,
    default: null
  },
  bio: {
    type: String,
    maxlength: [500, 'Bio cannot be more than 500 characters']
  },
  address: {
    type: String,
    trim: true,
    maxlength: [200, 'Address cannot be more than 200 characters']
  },
  telegramUsername: {
    type: String,
    trim: true,
    match: [/^[a-zA-Z0-9_]{3,32}$/, 'Telegram username must be 3-32 characters and contain only letters, numbers, and underscores']
  },
  phoneNumber: {
    type: String,
    trim: true,
    match: [/^\+?[0-9\s\-().]{7,20}$/, 'Phone number must be 7-20 digits and may include +, spaces, dashes, parentheses, and dots']
  },
  walletAddress: {
    type: String,
    trim: true,
    maxlength: [100, 'Wallet address cannot be more than 100 characters']
  },
  socialLinks: {
    twitter: String,
    linkedin: String,
    github: String
  },
  preferences: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'auto'],
      default: 'auto'
    }
  },
  passwordResetToken: String,
  passwordResetExpires: Date,
  emailVerificationToken: String,
  emailVerificationExpires: Date,
  isEmailVerified: {
    type: Boolean,
    default: false
  },
  referralCode: {
    type: String,
    unique: true,
    sparse: true // Allows multiple documents to have a null value for this field
  },
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  stats: {
    votingPoints: {
      type: Number,
      default: 0
    },
    contributionPoints: {
      type: Number,
      default: 0
    },
    referralPoints: {
      type: Number,
      default: 0
    },
    referralCount: {
      type: Number,
      default: 0
    },
    totalVotes: {
      type: Number,
      default: 0
    },
    totalContributions: {
      type: Number,
      default: 0
    },
    contributionAmount: {
      type: Number,
      default: 0
    }
  },
  verifiedLoss: {
    type: Number,
    default: 0
  },
  unverifiedLoss: {
    type: Number,
    default: 0
  },
  amountRestituted: {
    type: Number,
    default: 0
  },
  overrides: {
    points: { type: Number },
    pointsOffset: { type: Number, default: 0 },
    votingRights: { type: Number },
    votingRightsOffset: { type: Number, default: 0 },
    stats: {
      votingPoints: { type: Number },
      contributionPoints: { type: Number },
      referralPoints: { type: Number },
      totalVotes: { type: Number },
      totalContributions: { type: Number },
      contributionAmount: { type: Number }
    },
    statsOffsets: {
      votingPoints: { type: Number, default: 0 },
      contributionPoints: { type: Number, default: 0 },
      referralPoints: { type: Number, default: 0 }
    },
    rankOverride: { type: Number }
  },
  pointsHistory: [{
    category: { type: String, enum: ['total', 'voting', 'contributions', 'referral', 'bonus'] },
    amount: { type: Number },
    type: { type: String, enum: ['add', 'deduct'] },
    reason: { type: String },
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    timestamp: { type: Date, default: Date.now }
  }]
}, {
  timestamps: true
});

const applyUserPointsTransform = (doc, ret) => {
  // 1. Ensure stats object exists in ret
  if (!ret.stats) {
    ret.stats = {
      votingPoints: 0,
      contributionPoints: 0,
      referralPoints: 0,
      totalVotes: 0,
      totalContributions: 0,
      contributionAmount: 0
    };
  }

  // 2. Trust the real database fields for all points
  // These are now updated directly by admin and earn naturally
  ret.stats.votingPoints = Number(doc.get('stats.votingPoints')) || 0;
  ret.stats.contributionPoints = Number(doc.get('stats.contributionPoints')) || 0;
  ret.stats.referralPoints = Number(doc.get('stats.referralPoints')) || 0;
  ret.points = Number(doc.get('points')) || 0;

  // 3. Keep voting rights override (Clear and separate)
  const vrOffset = Number(doc.get('overrides.votingRightsOffset'));
  if (!isNaN(vrOffset)) {
    const baseVR = Number(doc.get('votingRights')) || 0;
    ret.votingRights = Math.max(0, baseVR + vrOffset);
  }

  // 8. Display rank override OR default high number
  ret.rank = (doc.get('overrides.rankOverride') !== undefined) ? doc.get('overrides.rankOverride') : 5824;

  delete ret.password;
  return ret;
};

userSchema.set('toJSON', {
  virtuals: true,
  transform: applyUserPointsTransform
});

userSchema.set('toObject', {
  virtuals: true,
  transform: applyUserPointsTransform
});

// Virtual for full name
userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName || ''}`.trim();
});

// Virtual for rank (will be calculated based on points)
userSchema.virtual('rank').get(function () {
  // This will be populated when needed
  return this._rank || null;
});

// Index for better query performance
userSchema.index({ email: 1 });
userSchema.index({ username: 1 }, { unique: true, sparse: true });
userSchema.index({ points: -1 });
userSchema.index({ createdAt: -1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function (next) {
  // Only hash the password if it has been modified (or is new)
  if (!this.isModified('password')) return next();

  try {
    // Hash password with cost of 12
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Instance method to check password
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    throw error;
  }
};

// Instance method to create password reset token
userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString('hex');

  this.passwordResetToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; // 10 minutes

  return resetToken;
};

// Instance method to update last login
userSchema.methods.updateLastLogin = function () {
  this.lastLogin = new Date();
  return this.save({ validateBeforeSave: false });
};

// Instance method to add points
userSchema.methods.addPoints = function (points, reason = 'Manual addition') {
  const pts = Math.max(0, Number(points) || 0);
  this.points = (this.points || 0) + pts;
  this.stats.votingPoints = (this.stats.votingPoints || 0) + pts;
  return this.save();
};

// Instance method to deduct points
userSchema.methods.deductPoints = function (points, reason = 'Manual deduction') {
  const pts = Math.max(0, Number(points) || 0);
  this.points = Math.max(0, (this.points || 0) - pts);
  this.stats.votingPoints = Math.max(0, (this.stats.votingPoints || 0) - pts);
  return this.save();
};

// Static method to get leaderboard
userSchema.statics.getLeaderboard = function (limit = 10) {
  return this.find({ isActive: true })
    .select('firstName lastName email points stats createdAt overrides')
    .sort({ points: -1, createdAt: 1 })
    .limit(limit);
};

// Static method to get user stats
userSchema.statics.getUserStats = async function () {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalUsers: { $sum: 1 },
        activeUsers: { $sum: { $cond: ['$isActive', 1, 0] } },
        realUsers: { $sum: { $cond: [{ $ne: ['$isVirtual', true] }, 1, 0] } },
        virtualUsers: { $sum: { $cond: [{ $eq: ['$isVirtual', true] }, 1, 0] } },
        totalPoints: { $sum: { $ifNull: ['$points', 0] } },
        averagePoints: { $avg: { $ifNull: ['$points', 0] } },
        totalVotesSubmitted: { $sum: { $ifNull: ['$stats.totalVotes', 0] } }
      }
    }
  ]);

  const result = stats[0] || {
    totalUsers: 0,
    activeUsers: 0,
    realUsers: 0,
    virtualUsers: 0,
    totalPoints: 0,
    averagePoints: 0,
    totalVotesSubmitted: 0
  };

  // Add the 6000 user baseline as per requirements
  result.totalUsers = (result.totalUsers || 0) + 6000;
  // Active users (should be 15% less than total users)
  result.activeUsers = Math.floor(result.totalUsers * 0.85);

  return result;
};

// Instance method to add category points and update stats
userSchema.methods.addCategoryPoints = function (amount, category) {
  // Check if user has verified loss > 0 before awarding points
  // (Assuming admin manual updates might bypass this, but automatic ones shouldn't? 
  // The requirement says "Users cannot earn points... if verified loss of $0". 
  // I'll apply it generally, but maybe admin override is needed? 
  // For now, I'll apply it here as a general rule, but beware it might block admin updates if they use this method.
  // Actually, let's assume this method is used for "earning" points (voting, contribution).
  // Admin updates usually set points directly or via a different path? 
  // Looking at routes/users.js, admin updates use addCategoryPoints too? No, let's check.
  // routes/users.js: router.put('/:id/points'...) uses overrides or direct updates? 
  // It uses overrides for pointsOffset. 
  // So this method `addCategoryPoints` is likely used by system events (voting, contributing).

  if (category !== 'referral' && (this.verifiedLoss || 0) <= 0) {
    // User cannot earn points (except referrals) if verified loss is 0
    return this.save();
  }

  const pts = Math.max(0, Number(amount) || 0);
  this.points += pts;
  switch (category) {
    case 'voting':
      this.stats.votingPoints = (this.stats.votingPoints || 0) + pts;
      this.stats.totalVotes = (this.stats.totalVotes || 0) + 1;
      break;
    case 'contributions':
      this.stats.contributionPoints = (this.stats.contributionPoints || 0) + pts;
      this.stats.totalContributions = (this.stats.totalContributions || 0) + 1;
      this.stats.contributionAmount = (this.stats.contributionAmount || 0) + pts;
      break;
    case 'referral':
      this.stats.referralPoints = (this.stats.referralPoints || 0) + pts;
      this.stats.referralCount = (this.stats.referralCount || 0) + 1;
      break;
    default:
      break;
  }
  return this.save();
};
userSchema.methods.deductCategoryPoints = function (amount, category) {
  const pts = Math.max(0, Number(amount) || 0);
  this.points = Math.max(0, (this.points || 0) - pts);
  switch (category) {
    case 'voting':
      this.stats.votingPoints = Math.max(0, (this.stats.votingPoints || 0) - pts);
      break;
    case 'contributions':
      this.stats.contributionPoints = Math.max(0, (this.stats.contributionPoints || 0) - pts);
      break;
    case 'referral':
      this.stats.referralPoints = Math.max(0, (this.stats.referralPoints || 0) - pts);
      break;
    default:
      break;
  }
  return this.save();
};
// Instance method to calculate real stats from other collections (unaffected by manipulation)
userSchema.methods.calculateRealStats = async function () {
  const Vote = mongoose.model('Vote');
  const Contribution = mongoose.model('Contribution');
  const User = mongoose.model('User');

  // 1. Real Voting Points (Sum of rewards for every vote cast)
  // Summing pointsReward for every entry in voterDetails for this user.
  const userVotes = await Vote.find({ 'voterDetails.userId': this._id });
  let realVotingPoints = 0;
  userVotes.forEach(vote => {
    const userClicks = vote.voterDetails.filter(d => d.userId && d.userId.toString() === this._id.toString());
    realVotingPoints += userClicks.length * (vote.pointsReward || 0);
  });

  // 2. Real Referral Points (10 per referral)
  const realReferralCount = await User.countDocuments({ referredBy: this._id });
  const realReferralPoints = realReferralCount * 10;

  // 3. Real Contribution Points (Sum of pointsAwarded from approved contributions)
  const contributions = await Contribution.find({ user: this._id, status: 'approved' });
  const realContributionPoints = contributions.reduce((sum, c) => sum + (c.pointsAwarded || 0), 0);

  return {
    votingPoints: realVotingPoints,
    referralPoints: realReferralPoints,
    contributionPoints: realContributionPoints,
    totalPoints: realVotingPoints + realReferralPoints + realContributionPoints,
    referralCount: realReferralCount
  };
};

module.exports = mongoose.model('User', userSchema);

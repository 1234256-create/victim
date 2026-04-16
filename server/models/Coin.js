const mongoose = require('mongoose');

const coinSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Coin name is required'],
    trim: true,
    maxlength: [100, 'Coin name cannot exceed 100 characters']
  },
  symbol: {
    type: String,
    required: [true, 'Coin symbol is required'],
    trim: true,
    uppercase: true,
    maxlength: [10, 'Coin symbol cannot exceed 10 characters']
  },
  description: {
    type: String,
    trim: true,
    maxlength: [1000, 'Description cannot exceed 1000 characters']
  },
  logo: {
    filename: String,
    originalName: String,
    mimetype: String,
    size: Number,
    path: String,
    uploadedAt: {
      type: Date,
      default: Date.now
    }
  },
  walletInfo: {
    address: {
      type: String,
      required: [true, 'Wallet address is required'],
      trim: true
    },
    network: {
      type: String,
      required: [true, 'Network is required'],
      trim: true,
      enum: ['Bitcoin', 'Ethereum', 'BSC', 'Polygon', 'Solana', 'Cardano', 'Avalanche', 'Fantom', 'Arbitrum', 'Optimism', 'Other']
    },
    qrCode: {
      filename: String,
      originalName: String,
      mimetype: String,
      size: Number,
      path: String,
      uploadedAt: {
        type: Date,
        default: Date.now
      }
    },
    memo: {
      type: String,
      trim: true,
      maxlength: [100, 'Memo cannot exceed 100 characters']
    }
  },
  conversionRate: {
    type: Number,
    required: [true, 'Conversion rate is required'],
    min: [0, 'Conversion rate must be positive'],
    default: 1
  },
  minimumAmount: {
    type: Number,
    default: 0.01,
    min: [0, 'Minimum amount must be positive']
  },
  maximumAmount: {
    type: Number,
    default: null,
    min: [0, 'Maximum amount must be positive']
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isPopular: {
    type: Boolean,
    default: false
  },
  category: {
    type: String,
    enum: ['cryptocurrency', 'stablecoin', 'token', 'nft', 'other'],
    default: 'cryptocurrency'
  },
  tags: [{
    type: String,
    trim: true,
    lowercase: true
  }],
  stats: {
    totalContributions: {
      type: Number,
      default: 0,
      min: 0
    },
    totalAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    totalPointsAwarded: {
      type: Number,
      default: 0,
      min: 0
    },
    uniqueContributors: {
      type: Number,
      default: 0,
      min: 0
    },
    averageContribution: {
      type: Number,
      default: 0,
      min: 0
    },
    lastContributionAt: Date
  },
  settings: {
    autoApprove: {
      type: Boolean,
      default: false
    },
    requireMemo: {
      type: Boolean,
      default: false
    },
    allowPartialPayments: {
      type: Boolean,
      default: true
    },
    notificationEmail: {
      type: String,
      trim: true,
      lowercase: true
    }
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  metadata: {
    contractAddress: {
      type: String,
      trim: true
    },
    decimals: {
      type: Number,
      min: 0,
      max: 18
    },
    website: {
      type: String,
      trim: true
    },
    whitepaper: {
      type: String,
      trim: true
    },
    explorer: {
      type: String,
      trim: true
    }
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Virtual for full name (name + symbol)
coinSchema.virtual('fullName').get(function() {
  return `${this.name} (${this.symbol})`;
});

// Virtual for contribution rate (contributions per day)
coinSchema.virtual('contributionRate').get(function() {
  if (!this.stats.lastContributionAt) return 0;
  const daysSinceCreation = (Date.now() - this.createdAt) / (1000 * 60 * 60 * 24);
  return daysSinceCreation > 0 ? this.stats.totalContributions / daysSinceCreation : 0;
});

// Virtual for popularity score
coinSchema.virtual('popularityScore').get(function() {
  const weights = {
    contributions: 0.4,
    contributors: 0.3,
    amount: 0.2,
    recency: 0.1
  };
  
  const maxContributions = 1000; // Normalize against this
  const maxContributors = 500;
  const maxAmount = 100000;
  const daysSinceLastContribution = this.stats.lastContributionAt ? 
    (Date.now() - this.stats.lastContributionAt) / (1000 * 60 * 60 * 24) : 365;
  
  const contributionScore = Math.min(this.stats.totalContributions / maxContributions, 1);
  const contributorScore = Math.min(this.stats.uniqueContributors / maxContributors, 1);
  const amountScore = Math.min(this.stats.totalAmount / maxAmount, 1);
  const recencyScore = Math.max(0, 1 - (daysSinceLastContribution / 30)); // 30 days max
  
  return (
    contributionScore * weights.contributions +
    contributorScore * weights.contributors +
    amountScore * weights.amount +
    recencyScore * weights.recency
  ) * 100;
});

// Indexes for better performance
coinSchema.index({ symbol: 1 }, { unique: true });
coinSchema.index({ name: 1 });
coinSchema.index({ isActive: 1, isPopular: -1 });
coinSchema.index({ category: 1, isActive: 1 });
coinSchema.index({ 'stats.totalContributions': -1 });
coinSchema.index({ 'stats.totalAmount': -1 });
coinSchema.index({ createdAt: -1 });
coinSchema.index({ tags: 1 });

// Pre-save middleware to update stats
coinSchema.pre('save', function(next) {
  // Calculate average contribution
  if (this.stats.totalContributions > 0) {
    this.stats.averageContribution = this.stats.totalAmount / this.stats.totalContributions;
  }
  
  // Update updatedBy if not new
  if (!this.isNew && this.isModified()) {
    this.updatedBy = this.createdBy; // This should be set by the controller
  }
  
  next();
});

// Instance method to update contribution stats
coinSchema.methods.updateContributionStats = async function(amount, isNewContributor = false) {
  try {
    this.stats.totalContributions += 1;
    this.stats.totalAmount += amount;
    this.stats.lastContributionAt = new Date();
    
    if (isNewContributor) {
      this.stats.uniqueContributors += 1;
    }
    
    // Recalculate average
    this.stats.averageContribution = this.stats.totalAmount / this.stats.totalContributions;
    
    await this.save();
    return this;
  } catch (error) {
    throw error;
  }
};

// Instance method to update points awarded
coinSchema.methods.updatePointsAwarded = async function(points) {
  try {
    this.stats.totalPointsAwarded += points;
    await this.save();
    return this;
  } catch (error) {
    throw error;
  }
};

// Instance method to toggle active status
coinSchema.methods.toggleActive = async function() {
  try {
    this.isActive = !this.isActive;
    await this.save();
    return this;
  } catch (error) {
    throw error;
  }
};

// Instance method to toggle popular status
coinSchema.methods.togglePopular = async function() {
  try {
    this.isPopular = !this.isPopular;
    await this.save();
    return this;
  } catch (error) {
    throw error;
  }
};

// Static method to get active coins
coinSchema.statics.getActiveCoins = function() {
  return this.find({ isActive: true })
    .sort({ isPopular: -1, 'stats.totalContributions': -1, name: 1 });
};

// Static method to get popular coins
coinSchema.statics.getPopularCoins = function(limit = 10) {
  return this.find({ isActive: true, isPopular: true })
    .sort({ 'stats.totalContributions': -1, 'stats.totalAmount': -1 })
    .limit(limit);
};

// Static method to get coin statistics
coinSchema.statics.getCoinStats = async function() {
  const stats = await this.aggregate([
    {
      $group: {
        _id: null,
        totalCoins: { $sum: 1 },
        activeCoins: { $sum: { $cond: ['$isActive', 1, 0] } },
        popularCoins: { $sum: { $cond: ['$isPopular', 1, 0] } },
        totalContributions: { $sum: '$stats.totalContributions' },
        totalAmount: { $sum: '$stats.totalAmount' },
        totalPointsAwarded: { $sum: '$stats.totalPointsAwarded' },
        uniqueContributors: { $sum: '$stats.uniqueContributors' }
      }
    }
  ]);

  return stats[0] || {
    totalCoins: 0,
    activeCoins: 0,
    popularCoins: 0,
    totalContributions: 0,
    totalAmount: 0,
    totalPointsAwarded: 0,
    uniqueContributors: 0
  };
};

// Static method to search coins
coinSchema.statics.searchCoins = function(query, options = {}) {
  const searchRegex = new RegExp(query, 'i');
  const filter = {
    $or: [
      { name: searchRegex },
      { symbol: searchRegex },
      { description: searchRegex },
      { tags: { $in: [searchRegex] } }
    ]
  };

  if (options.activeOnly) {
    filter.isActive = true;
  }

  if (options.category) {
    filter.category = options.category;
  }

  return this.find(filter)
    .sort({ isPopular: -1, 'stats.totalContributions': -1, name: 1 })
    .limit(options.limit || 50);
};

// Static method to get coins by category
coinSchema.statics.getCoinsByCategory = function(category) {
  return this.find({ category, isActive: true })
    .sort({ isPopular: -1, 'stats.totalContributions': -1, name: 1 });
};

// Static method to get top performing coins
coinSchema.statics.getTopPerformingCoins = function(limit = 10, sortBy = 'contributions') {
  const sortOptions = {
    contributions: { 'stats.totalContributions': -1 },
    amount: { 'stats.totalAmount': -1 },
    contributors: { 'stats.uniqueContributors': -1 },
    points: { 'stats.totalPointsAwarded': -1 }
  };

  return this.find({ isActive: true })
    .sort(sortOptions[sortBy] || sortOptions.contributions)
    .limit(limit);
};

module.exports = mongoose.model('Coin', coinSchema);
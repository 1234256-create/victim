const mongoose = require('mongoose');

const optionSchema = new mongoose.Schema({
  id: { type: Number, required: true },
  text: { type: String, required: true },
  votes: { type: Number, default: 0 },
  votesOffset: { type: Number, default: 0 },
  targetVotes: { type: Number, default: 0 }
}, { _id: false });

const voteSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  options: { type: [optionSchema], default: [] },
  status: { type: String, enum: ['draft', 'active', 'paused', 'completed'], default: 'draft' },
  isProgressive: { type: Boolean, default: false },
  startTime: { type: Date, default: null },
  endTime: { type: Date, default: null },
  totalVotes: { type: Number, default: 0 },
  pointsReward: { type: Number, default: 0 },
  maxVotesPerUser: { type: Number, default: 1, min: 1 },
  submissions: { type: Map, of: Number, default: {} },
  overrides: { type: Map, of: Number, default: {} },
  voterDetails: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    optionId: { type: Number },
    votedAt: { type: Date, default: Date.now }
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null }
}, { timestamps: true });

voteSchema.methods.start = function (durationHours = 24) {
  const now = new Date();
  this.status = 'active';
  this.startTime = now;
  const ms = Math.max(1, Number(durationHours)) * 60 * 60 * 1000;
  this.endTime = new Date(now.getTime() + ms);
  return this.save();
};

voteSchema.methods.pause = function () {
  this.status = 'paused';
  return this.save();
};

voteSchema.methods.resume = function () {
  this.status = 'active';
  return this.save();
};

voteSchema.methods.complete = function () {
  this.status = 'completed';
  return this.save();
};

voteSchema.methods.submitVote = async function (userId, optionId) {
  if (this.status !== 'active') throw new Error('Vote is not active');
  if (this.endTime) {
    const end = new Date(this.endTime).getTime();
    if (Date.now() >= end) throw new Error('Vote has ended');
  }

  const User = mongoose.model('User');
  const user = await User.findById(userId);
  const userRights = user ? user.votingRights || 1 : 1;

  const base = this.maxVotesPerUser || 1;
  const offset = Number(this.overrides.get(String(userId)) || 0);
  const allowance = Math.max(0, Math.max(base, userRights) + offset);
  const used = Number(this.submissions.get(String(userId)) || 0);

  if (used >= allowance) throw new Error('Max votes reached for this vote');

  // Note: verifiedLoss check should be done in the route handler or service layer where User model is accessible

  const idx = this.options.findIndex(o => o.id === Number(optionId));
  if (idx === -1) throw new Error('Option not found');
  this.options[idx].votes = (this.options[idx].votes || 0) + 1;
  this.totalVotes = (this.totalVotes || 0) + 1;
  this.submissions.set(String(userId), used + 1);
  this.voterDetails.push({ userId, optionId: Number(optionId), votedAt: new Date() });
  return this.save();
};

voteSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Vote', voteSchema);
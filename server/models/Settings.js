const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  key: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  value: {
    type: mongoose.Schema.Types.Mixed,
    required: true,
  },
  description: {
    type: String,
    trim: true,
  },
  lastUpdatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true },
});

settingsSchema.statics.getSetting = async function(key) {
  const setting = await this.findOne({ key });
  return setting ? setting.value : null;
};

settingsSchema.statics.setSetting = async function(key, value, userId, description = '') {
  return this.findOneAndUpdate(
    { key },
    { value, lastUpdatedBy: userId, description },
    { new: true, upsert: true, runValidators: true }
  );
};

module.exports = mongoose.model('Settings', settingsSchema);
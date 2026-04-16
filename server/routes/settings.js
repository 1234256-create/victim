const express = require('express');
const { body, validationResult } = require('express-validator');
const { adminAuth } = require('../middleware/auth');
const Settings = require('../models/Settings');

const router = express.Router();

// @route   GET /api/settings/:key
// @desc    Get a specific setting
// @access  Public
router.get('/:key', async (req, res) => {
  try {
    const { key } = req.params;
    const value = await Settings.getSetting(key);

    if (value === null) {
      return res.json({
        success: true,
        data: {
          key,
          value: null,
        },
      });
    }

    res.json({
      success: true,
      data: {
        key,
        value,
      },
    });
  } catch (error) {
    console.error(`Get setting error for key ${req.params.key}:`, error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching setting',
    });
  }
});

// @route   PUT /api/settings/:key
// @desc    Update a specific setting (admin only)
// @access  Private/Admin
router.put('/:key', adminAuth, [
  body('value').exists().withMessage('Value is required'),
  body('description').optional().trim().isLength({ max: 500 }),
], async (req, res) => {
  try {
    console.log(`Setting update request: ${req.params.key}`, req.body.value);
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errors.array(),
      });
    }

    const { key } = req.params;
    const { value, description } = req.body;
    const userId = req.user.id;

    const setting = await Settings.setSetting(key, value, userId, description);

    // Broadcast setting update
    try { 
      if (global.__broadcastUsersUpdate) {
        global.__broadcastUsersUpdate({ type: 'setting_updated', key, value });
        if (key === 'contributionRound') {
          global.__broadcastUsersUpdate({ type: 'contribution_round_updated', value });
        }
      }
    } catch (_) {}

    res.json({
      success: true,
      message: `Setting '${key}' updated successfully`,
      data: setting,
    });
  } catch (error) {
    console.error(`Update setting error for key ${req.params.key}:`, error);
    res.status(500).json({
      success: false,
      message: 'Server error while updating setting',
    });
  }
});

module.exports = router;

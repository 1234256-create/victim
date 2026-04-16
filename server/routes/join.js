const express = require('express');
const router = express.Router();
const JoinApplication = require('../models/JoinApplication');
const User = require('../models/User');
const { adminAuth } = require('../middleware/auth');
const { body, validationResult } = require('express-validator');

// POST /api/join
// Public route to submit a join application
router.post('/', [
    body('firstName').notEmpty().withMessage('First name is required'),
    body('lastName').notEmpty().withMessage('Last name is required'),
    body('email').isEmail().withMessage('Valid email is required'),
    body('details').isObject().withMessage('Details object is required')
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, errors: errors.array() });
        }

        const { firstName, lastName, email, details, referralCode } = req.body;

        const application = new JoinApplication({
            firstName,
            lastName,
            email,
            details,
            referralCode
        });

        await application.save();

        // Send confirmation email disabled per user request
        // const { sendJoinConfirmationEmail } = require('../services/emailService');
        // sendJoinConfirmationEmail({ email, firstName }).catch(err => console.error('Join email failed:', err));

        res.status(201).json({ success: true, message: 'Application submitted successfully' });
    } catch (error) {
        console.error('Submit application error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// GET /api/join
// Admin route to get all join applications
router.get('/', adminAuth, async (req, res) => {
    try {
        const applications = await JoinApplication.find().sort({ createdAt: -1 });

        // Collect all emails from applications
        const emails = applications.map(a => a.email).filter(Boolean);

        // Find which emails have registered accounts and ARE VERIFIED in the User collection
        const registeredUsers = await User.find(
            { email: { $in: emails }, isEmailVerified: true },
            { email: 1 }
        ).lean();
        const registeredEmailSet = new Set(registeredUsers.map(u => u.email));

        // Attach hasAccount flag and referrerName to each application
        const enriched = await Promise.all(applications.map(async (app) => {
            const appObj = app.toObject();
            appObj.hasAccount = registeredEmailSet.has(app.email);

            if (app.referralCode) {
                const referrer = await User.findOne({ referralCode: app.referralCode }, { firstName: 1, lastName: 1 });
                if (referrer) {
                    appObj.referrerName = `${referrer.firstName} ${referrer.lastName || ''}`.trim();
                }
            }
            return appObj;
        }));

        res.json({ success: true, applications: enriched });
    } catch (error) {
        console.error('Get applications error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

module.exports = router;

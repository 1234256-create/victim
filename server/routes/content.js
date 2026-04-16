const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();

const contentDir = path.join(__dirname, '..', 'uploads', 'content');
fs.mkdirSync(contentDir, { recursive: true });

const filePath = path.join(contentDir, 'whitepaper.html');

router.get('/whitepaper', async (req, res) => {
  try {
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ success: false, message: 'Not found' });
    }
    const html = fs.readFileSync(filePath, 'utf8');
    res.json({ success: true, html });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
});

router.post('/whitepaper', async (req, res) => {
  try {
    const html = String(req.body && req.body.html || '').trim();
    if (!html) {
      return res.status(400).json({ success: false, message: 'html is required' });
    }
    fs.writeFileSync(filePath, html, 'utf8');
    res.status(201).json({ success: true, path: '/uploads/content/whitepaper.html' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message || 'Server error' });
  }
});

module.exports = router;


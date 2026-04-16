const express = require('express');
const router = express.Router();
const nodemailer = require('nodemailer');
require('dotenv').config();
const { getTransporter } = require('../services/emailService');

const sendApplicationStatusEmail = async (to, status, link, clientTime, clientTzOffset) => {
  let subject, html;
  let text;

  if (status === 'accepted') {
    const baseReg = (link && String(link).trim()) ? link : `${(process.env.CLIENT_URL || 'https://victimdao.org')}/register`;
    let regLink = baseReg;
    try {
      const u = new URL(baseReg);
      u.searchParams.set('email', to);
      regLink = u.toString();
    } catch {}
    subject = 'Your Application to the DAO has been Accepted';
    text = [
      'Congratulations!',
      'Your application to join the DAO has been accepted. We are excited to have you on board.',
      'Please click the link below to complete your registration:',
      `Complete Registration: ${regLink}`,
      'If you have any questions, please don\'t hesitate to contact us.',
      'Sincerely,',
      'The DAO Team'
    ].join('\n');
    html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #1f2937;">
        <h2 style="margin: 0 0 12px; color: #111827;">Congratulations!</h2>
        <p style="margin: 8px 0;">Your application to join the DAO has been accepted. We are excited to have you on board.</p>
        <p style="margin: 8px 0;">Please click the link below to complete your registration:</p>
        <p style="margin: 16px 0;">
          <a href="${regLink}" style="background-color: #4CAF50; color: #ffffff; padding: 10px 16px; text-decoration: none; border-radius: 6px; display: inline-block;">Complete Registration</a>
        </p>
        <p style="margin: 8px 0;">If you have any questions, please don\'t hesitate to contact us.</p>
        <p style="margin: 16px 0 4px;">Sincerely,</p>
        <p style="margin: 0;">The DAO Team</p>
      </div>
    `;
  } else {
    subject = 'Update on Your Application to the DAO';
    text = [
      'Thank you for your interest in joining the DAO. After careful consideration, we regret to inform you that your application has been rejected at this time.',
      'We appreciate the time you took to apply and wish you the best in your future endeavors.',
      'Sincerely,',
      'The DAO Team'
    ].join('\n');
    html = `
      <div style="font-family: Arial, sans-serif; padding: 20px; color: #1f2937;">
        <h2 style="margin: 0 0 12px; color: #111827;">Application Update</h2>
        <p style="margin: 8px 0;">Thank you for your interest in joining the DAO. After careful consideration, we regret to inform you that your application has been rejected at this time.</p>
        <p style="margin: 8px 0;">We appreciate the time you took to apply and wish you the best in your future endeavors.</p>
        <div style="margin: 16px 0; display: inline-block; background-color: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; border-radius: 6px; padding: 10px 16px; font-weight: 600;">Reject Application</div>
        <p style="margin: 16px 0 4px;">Sincerely,</p>
        <p style="margin: 0;">The DAO Team</p>
      </div>
    `;
  }

  try {
    const transporter = await getTransporter();
    const fromAddr = process.env.EMAIL_FROM || process.env.EMAIL_USERNAME || 'no-reply@dao.com';
    const domain = String(fromAddr.split('@')[1] || 'victimdao.org');
    const msgId = `<app-${Date.now()}-${Math.random().toString(36).slice(2)}@${domain}>`;
    const tz = typeof clientTzOffset === 'number' ? clientTzOffset : 0;
    const base = clientTime ? new Date(clientTime) : new Date();
    const localDate = new Date(base.getTime() - tz * 60000);
    const pad = (n) => (n < 10 ? '0' + n : '' + n);
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    const sign = tz <= 0 ? '+' : '-';
    const abs = Math.abs(tz);
    const hh = pad(Math.floor(abs / 60));
    const mm = pad(abs % 60);
    const dateHeader = `${days[localDate.getUTCDay()]}, ${pad(localDate.getUTCDate())} ${months[localDate.getUTCMonth()]} ${localDate.getUTCFullYear()} ${pad(localDate.getUTCHours())}:${pad(localDate.getUTCMinutes())}:${pad(localDate.getUTCSeconds())} ${sign}${hh}${mm}`;
    const info = await transporter.sendMail({
      from: `Victim DAO <${fromAddr}>`,
      to,
      subject,
      html,
      text,
      replyTo: fromAddr,
      envelope: { from: fromAddr, to: to },
      headers: { 'List-Unsubscribe': `<mailto:${fromAddr}>`, 'X-Mailer': 'VictimDAO System', 'Date': dateHeader },
      messageId: msgId,
      date: localDate,
    });

    console.log('Message sent: %s', info.messageId);
    console.log('SMTP response: %s', info.response);
    console.log('Accepted recipients:', info.accepted);
    console.log('Rejected recipients:', info.rejected);
    const preview = nodemailer.getTestMessageUrl(info);
    const ok = Array.isArray(info.accepted) && info.accepted.length > 0;
    if (!ok) {
      return { success: false, error: { message: 'No recipients accepted by SMTP', response: info.response, rejected: info.rejected } };
    }
    return { success: true, previewUrl: preview, accepted: info.accepted, response: info.response };
  } catch (error) {
    console.error('Error sending email:', error);
    return { success: false, error };
  }
};

router.post('/send-email', async (req, res) => {
  const { to, status, link, clientTime, clientTzOffset } = req.body;

  if (!to || !status) {
    return res.status(400).json({ message: 'Missing required fields: to, status' });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(String(to))) {
    return res.status(400).json({ message: 'Invalid recipient email' });
  }

  let result;
  try {
    const origin = req.get('origin') || req.headers.origin || `${req.protocol}://${req.get('host')}`;
    let effectiveLink = link;
    const statusNorm = String(status || '').toLowerCase();
    if (statusNorm === 'accepted') {
      const baseOrigin = origin || process.env.CLIENT_URL || `http://localhost:${process.env.CLIENT_DEV_PORT || 3002}`;
      const baseClean = String(baseOrigin).replace(/\/+$/, '');
      if (!effectiveLink) effectiveLink = `${baseClean}/register`;
    }
    result = await sendApplicationStatusEmail(to, statusNorm, effectiveLink, clientTime, clientTzOffset);
  } catch (e) {
    return res.status(500).json({ message: 'Failed to send email', error: { message: e.message } });
  }

  if (result.success) {
    res.status(200).json({ message: 'Email sent successfully', previewUrl: result.previewUrl, accepted: result.accepted, response: result.response });
  } else {
    const e = result.error || {};
    res.status(500).json({
      message: 'Failed to send email',
      error: {
        message: e.message,
        code: e.code,
        response: e.response,
        command: e.command,
      }
    });
  }
});

module.exports = router;

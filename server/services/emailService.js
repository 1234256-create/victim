const nodemailer = require('nodemailer');

let cachedTransporter = null;

// Creates a fresh (non-pooled) transporter for a single send.
// Non-pooled avoids ETIMEDOUT from stale pool connections when many emails are sent.
const createFreshTransporter = () => {
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USERNAME || !process.env.EMAIL_PASSWORD) {
    throw new Error('SMTP environment variables not configured');
  }
  const port = parseInt(process.env.EMAIL_PORT || '465', 10);
  const secure = (process.env.EMAIL_SECURE || '').toLowerCase() === 'false' ? false : true;
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST,
    port,
    secure,
    auth: { user: process.env.EMAIL_USERNAME, pass: process.env.EMAIL_PASSWORD },
    tls: { minVersion: 'TLSv1.2', rejectUnauthorized: false },
    connectionTimeout: 10000,
    socketTimeout: 15000,
    greetingTimeout: 10000,
  });
};

// Kept for compatibility with code importing getTransporter directly
const getTransporter = () => {
  if (cachedTransporter) return Promise.resolve(cachedTransporter);

  if (process.env.EMAIL_HOST && process.env.EMAIL_USERNAME && process.env.EMAIL_PASSWORD) {
    cachedTransporter = createFreshTransporter();
    return Promise.resolve(cachedTransporter);
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log('Falling back to Ethereal Email');
    return nodemailer.createTestAccount().then(account => {
      cachedTransporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email', port: 587,
        auth: { user: account.user, pass: account.pass }
      });
      return cachedTransporter;
    });
  }

  return Promise.reject(new Error('Email transport not configured'));
};

const sendEmail = async (options, attempt = 1) => {
  const start = Date.now();
  // Always use a fresh transporter per send to avoid stale-pool ETIMEDOUT errors
  const transporter = createFreshTransporter();
  const fromAddr = process.env.EMAIL_FROM || process.env.EMAIL_USERNAME || 'info@victimdao.org';
  const mailOptions = {
    from: `"Victim DAO" <${fromAddr}>`,
    to: options.email,
    subject: options.subject,
    text: options.message,
    html: options.html || undefined,
    replyTo: fromAddr,
    headers: { 'X-Mailer': 'VictimDAO-Mailer' },
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    const duration = Date.now() - start;
    console.log(`[Email Dispatched] to ${options.email} in ${duration}ms (attempt ${attempt}). Status: ${info.response}`);
    return info;
  } catch (error) {
    const duration = Date.now() - start;
    const isConnErr = ['ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'ESOCKET'].includes(error.code);
    if (isConnErr && attempt === 1) {
      console.warn(`[Email Retry] Connection error for ${options.email}: ${error.code}. Retrying in 500ms...`);
      await new Promise(r => setTimeout(r, 500));
      return sendEmail(options, 2);
    }
    console.warn(`[Email Failed] to ${options.email} after ${duration}ms (attempt ${attempt}): ${error.message}`);
    throw error;
  }
};

const sendPasswordResetEmail = async ({ email, firstName, token }) => {
  const resetURL = `${process.env.CLIENT_URL || 'http://localhost:3006'}/reset-password/${token}`;
  const name = firstName || 'there';

  const message = `Hi ${name}, Forgot your password? Use the link to reset: ${resetURL}`;
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
      <p>Hi ${name},</p>
      <p>Forgot your password? Click the link below to reset it (valid for 10 minutes):</p>
      <div style="text-align: center; margin: 25px 0;">
        <a href="${resetURL}" style="background-color: #4f46e5; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
      </div>
      <p style="font-size: 14px; color: #666;">If you did not request this, please ignore this email.</p>
    </div>
  `;

  try {
    await sendEmail({ email, subject: 'Your password reset link', message, html });
  } catch (error) {
    console.error('Error sending password reset email:', error);
    throw new Error('There was an error sending the email. Please try again later.');
  }
};

const sendWelcomeEmail = async ({ email, firstName }) => {
  const subject = 'Welcome to VictimDAO – Join the Community!';
  const message = `Hi ${firstName},

Welcome to VictimDAO! You’ve joined a community focused on transparency, support, and empowering those impacted by scams in Web3. We work to verify victim claims, create on-chain proof-of-loss assets, and pursue restitution.

To make the most of your journey, connect with like-minded members, share ideas, and stay updated on the latest restitution efforts and voting timelines.

👉 Join our Telegram community: https://t.me/+zxadyvvkr7g4MzJh

We can’t wait to see you there.

---------------
The VictimDAO Team
Reclaiming Justice for the Web3 Community`;

  const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #1f2937; margin: 0; padding: 0; background-color: #f3f4f6; }
        .container { max-width: 600px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
        .header { background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); padding: 40px 20px; text-align: center; color: white; }
        .header h1 { margin: 0; font-size: 28px; font-weight: 700; letter-spacing: -0.5px; }
        .content { padding: 40px 30px; }
        .content p { margin-bottom: 20px; font-size: 16px; }
        .cta-box { background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; text-align: center; margin: 30px 0; }
        .button { display: inline-block; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #ffffff !important; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; transition: transform 0.2s; }
        .footer { padding: 20px 30px; background-color: #f9fafb; border-top: 1px solid #e5e7eb; font-size: 14px; color: #6b7280; text-align: center; }
        .footer hr { border: none; border-top: 1px solid #e5e7eb; margin: 20px 0; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>Welcome to VictimDAO</h1>
        </div>
        <div class="content">
          <p>Hi <strong>${firstName}</strong>,</p>
          <p>Welcome to VictimDAO! You’ve joined a community focused on transparency, support, and empowering those impacted by scams in Web3. We work to verify victim claims, create on-chain proof-of-loss assets, and pursue restitution.</p>
          <p>To make the most of your journey, connect with like-minded members, share ideas, and stay updated on the latest restitution efforts and voting timelines.</p>
          
          <div class="cta-box">
            <p style="margin-top: 0;">👉 Join our Telegram community:</p>
            <a href="https://t.me/+zxadyvvkr7g4MzJh" class="button">Join Telegram Community</a>
          </div>
          
          <p>We can’t wait to see you there.</p>
        </div>
        <div class="footer">
          <p>The VictimDAO Team</p>
          <hr />
          <p>VictimDAO – Reclaiming Justice for the Web3 Community</p>
          <p style="font-size: 11px; margin-top: 10px;">If you didn't create an account, you can safely ignore this email.</p>
        </div>
      </div>
    </body>
    </html>
  `;

  try {
    await sendEmail({ email, subject, message, html });
  } catch (error) {
    console.error('Error sending welcome email:', error);
  }
};

const sendJoinConfirmationEmail = async ({ email, firstName }) => {
  const subject = 'Application Received – VictimDAO';
  const message = `Hi ${firstName},
  
Thank you for submitting your join application to VictimDAO. 
Our team is currently reviewing your details. Once verified, you will receive an invitation email with a link to complete your registration.

If you have any questions in the meantime, feel free to join our community:
👉 Join our Telegram: https://t.me/+zxadyvvkr7g4MzJh

Best regards,
The VictimDAO Team`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
      <h3 style="color: #4f46e5;">Application Received</h3>
      <p>Hi ${firstName},</p>
      <p>Thank you for submitting your join application to <strong>VictimDAO</strong>.</p>
      <p>Our team is currently reviewing your details. Once verified, you will receive an invitation email with a link to complete your registration.</p>
      <p>If you have any questions in the meantime, feel free to join our community:</p>
      <p>👉 <strong>Join our Telegram:</strong> <a href="https://t.me/+zxadyvvkr7g4MzJh" style="color: #4f46e5; text-decoration: none;">Click Here</a></p>
      <br />
      <hr style="border: none; border-top: 1px solid #eee;" />
      <p style="font-size: 14px; color: #777;">Best regards,<br />The VictimDAO Team</p>
    </div>
  `;

  try {
    await sendEmail({ email, subject, message, html });
  } catch (error) {
    console.error('Error sending join confirmation email:', error);
  }
};

const sendVoteAnnouncementEmail = async ({ email, firstName, voteTitle, voteId }) => {
  const voteLink = `${process.env.CLIENT_URL || 'http://localhost:3006'}/vote?voteId=${voteId}`;
  const name = firstName || 'Member';
  const subject = `New Vote: ${voteTitle}`;
  const message = `Hi ${name},

A new vote has been created in VictimDAO (ID: ${voteId.toString().slice(-4)}).

You can review the proposal and submit your vote by using the link below.

Cast your vote:
${voteLink}

Thank you for participating in the VictimDAO governance process.

Best regards,
VictimDAO Team`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
      <p>Hi ${name},</p>
      <p>A new vote has been created in <strong>VictimDAO</strong> (ID: ${voteId.toString().slice(-4)}).</p>
      <p>You can review the proposal and submit your vote by using the button below.</p>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${voteLink}" style="background-color: #7c3aed; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">Cast your vote</a>
      </div>

      <p style="font-size: 14px; color: #666;">
        Link: <a href="${voteLink}" style="color: #7c3aed;">${voteLink}</a>
      </p>
      
      <p>Thank you for participating in the VictimDAO governance process.</p>
      
      <p style="margin-top: 30px;">
        Best regards,<br />
        <strong>VictimDAO Team</strong>
      </p>
    </div>
  `;

  try {
    await sendEmail({ email, subject, message, html });
  } catch (error) {
    console.error(`Error sending vote announcement to ${email}:`, error);
  }
};

const sendOTPEmail = async ({ email, firstName, code, type = 'Password Reset' }) => {
  const name = firstName || 'there';
  const subject = `${type} OTP – VictimDAO`;
  const message = `Hi ${name}, Your OTP is: ${code}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
      <p>Hi ${name},</p>
      <p>Your one-time password (OTP) for <strong>${type}</strong> is:</p>
      <div style="text-align: center; margin: 25px 0;">
        <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; color: #4f46e5;">${code}</span>
      </div>
      <p>This code will expire in 10 minutes.</p>
      <p style="font-size: 14px; color: #666;">If you did not request this, please ignore this email.</p>
      <hr style="border: none; border-top: 1px solid #eee;" />
      <p style="font-size: 14px; color: #777;">Best regards,<br />The VictimDAO Team</p>
    </div>
  `;

  try {
    return await sendEmail({ email, subject, message, html });
  } catch (error) {
    console.error('Error sending OTP email:', error);
    throw error;
  }
};

const sendVerificationEmail = async ({ email, firstName, token }) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:3006';
  const verifyURL = `${clientUrl}/verify-email/${token}`;
  const name = firstName || 'there';
  const fromAddr = process.env.EMAIL_FROM || process.env.EMAIL_USERNAME || 'info@victimdao.org';

  const subject = `Confirm your email for VictimDAO`;

  const text = `Hello ${name},

Thank you for signing up for VictimDAO.

To finish setting up your account, please confirm your email address by opening the link below:

${verifyURL}

This step helps us verify that this email address belongs to you.

If the link above does not open automatically, copy and paste it into your browser.

If you did not create an account with VictimDAO, you can safely ignore this message and no further action is required.

Thank you,
VictimDAO Team

—
This message was sent because a registration request was made using this email address.`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #333; line-height: 1.6;">
      <p>Hello ${name},</p>
      <p>Thank you for signing up for VictimDAO.</p>
      <p>To finish setting up your account, please confirm your email address by opening the link below:</p>
      <div style="margin: 20px 0;">
        <a href="${verifyURL}" style="color: #4f46e5; text-decoration: underline;">${verifyURL}</a>
      </div>
      <p>This step helps us verify that this email address belongs to you.</p>
      <p>If the link above does not open automatically, copy and paste it into your browser.</p>
      <p>If you did not create an account with VictimDAO, you can safely ignore this message and no further action is required.</p>
      <p>Thank you,<br>VictimDAO Team</p>
      <div style="margin-top: 20px; border-top: 1px solid #eee; padding-top: 20px; font-size: 12px; color: #777;">
        —<br>
        This message was sent because a registration request was made using this email address.
      </div>
    </div>
  `;

  const transporter = createFreshTransporter();
  const info = await transporter.sendMail({
    from: `"VictimDAO" <${fromAddr}>`,
    to: email,
    subject,
    text,
    html,
    replyTo: fromAddr,
    headers: {
      'List-Unsubscribe': `<mailto:${fromAddr}?subject=unsubscribe>`,
      'X-Priority': '3',
    },
  });
  console.log(`[Verification Email] Sent to ${email}. Status: ${info.response}`);
  return info;
};

module.exports = {
  sendPasswordResetEmail,
  getTransporter,
  sendEmail,
  sendWelcomeEmail,
  sendJoinConfirmationEmail,
  sendVoteAnnouncementEmail,
  sendOTPEmail,
  sendVerificationEmail
};
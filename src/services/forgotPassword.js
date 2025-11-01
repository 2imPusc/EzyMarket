import jwt from 'jsonwebtoken';
import User from '../model/userRepository.js';
import { sendEmail } from '../utils/sendEmail.js';

/**
 * Gửi email reset password
 */
export const sendResetPasswordEmail = async (user, req) => {
  const token = jwt.sign({ id: user._id, email: user.email }, process.env.PASSWORD_RESET_KEY, {
    expiresIn: '1h',
  });

  const resetUrl = `${req.protocol}://${req.get('host')}/api/auth/reset-password?token=${token}`;

  const mailOptions = {
    to: user.email,
    subject: 'Reset Your Password - EzyMarket',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Reset Your Password</h2>
        <p>Hello ${user.userName},</p>
        <p>We received a request to reset your password. Click the button below to create a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background-color: #4CAF50; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; display: inline-block;">
            Reset Password
          </a>
        </div>
        <p>Or copy and paste this link into your browser:</p>
        <p style="color: #666; word-break: break-all;">${resetUrl}</p>
        <p style="color: #999; font-size: 14px; margin-top: 30px;">
          <strong>Note:</strong> This link will expire in 1 hour. If you didn't request a password reset, please ignore this email.
        </p>
      </div>
    `,
  };

  await sendEmail(mailOptions.to, mailOptions.subject, mailOptions.html);
};

/**
 * Xác thực token reset password
 */
export const verifyResetToken = (token) => {
  try {
    const decoded = jwt.verify(token, process.env.PASSWORD_RESET_KEY);
    return { valid: true, decoded };
  } catch (err) {
    return { valid: false, error: err.message };
  }
};

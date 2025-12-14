import User from '../model/userRepository.js';
import validator from 'validator';
import { sendEmail } from '../utils/sendEmail.js';
import { generateOTP, getOTPExpiration, isOTPValid } from '../utils/otpGenerator.js';
import {
  MAX_OTP_ATTEMPTS,
  OTP_COOLDOWN_MINUTES,
  OTP_EXPIRATION_MINUTES,
} from '../config/authConst.js';

export const sendVerificationEmail = async (user) => {
  try {
    if (user.otpAttempts >= MAX_OTP_ATTEMPTS) {
      const cooldownEnd = new Date(user.lastOTPSentAt.getTime() + OTP_COOLDOWN_MINUTES * 60 * 1000);
      if (new Date() < cooldownEnd) {
        const minutesLeft = Math.ceil((cooldownEnd - new Date()) / 60000);
        throw new Error(`Too many OTP requests. Please try again in ${minutesLeft} minutes.`);
      }
      user.otpAttempts = 0;
    }

    const otp = generateOTP();

    user.otp = otp;
    user.otpExpires = getOTPExpiration();
    user.otpAttempts = (user.otpAttempts || 0) + 1;
    user.lastOTPSentAt = new Date();
    await user.save();

    const emailHTML = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Xác thực tài khoản EzyMarket</h2>
        <p>Mã OTP của bạn là:</p>
        <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
          ${otp}
        </div>
        <p>Mã này có hiệu lực trong <strong>10 phút</strong>.</p>
        <p>Nếu bạn không yêu cầu xác thực, vui lòng bỏ qua email này.</p>
        <hr style="margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">Email này được gửi tự động từ EzyMarket. Vui lòng không trả lời.</p>
      </div>
    `;

    await sendEmail(user.email, 'Mã xác thực tài khoản EzyMarket', emailHTML);
  } catch (err) {
    console.error('Error sending verification email:', err);
  }
};

/**
 * verify OTP for email verification
 * @param {String} email
 * @param {String} otp
 * @returns {Promise<User>} User object if verification successful
 * @throws Error with status and message properties
 */
export const verifyOTP = async (email, otp) => {
  const user = await User.findOne({ email });

  if (!user) {
    throw { status: 404, message: 'User not found' };
  }
  if (user.emailVerified) {
    throw { status: 200, message: 'Email already verified' };
  }
  if (!user.otp) {
    throw { status: 400, message: 'No OTP found. Please request a new one.' };
  }
  if (!isOTPValid(user.otpExpires)) {
    throw { status: 400, message: 'OTP has expired. Please request a new one.' };
  }

  // Check OTP match with brute force protection
  if (user.otp !== otp) {
    user.otpVerifyAttempts = (user.otpVerifyAttempts || 0) + 1;
    await user.save();

    if (user.otpVerifyAttempts >= 5) {
      user.otp = null;
      user.otpExpires = null;
      await user.save();
      throw { status: 429, message: 'Too many failed attempts. Please request a new OTP.' };
    }

    throw {
      status: 400,
      message: `Invalid OTP code. ${5 - user.otpVerifyAttempts} attempts remaining.`,
    };
  }

  user.emailVerified = true;
  user.otp = null;
  user.otpExpires = null;
  user.otpAttempts = 0;
  user.otpVerifyAttempts = 0;
  await user.save();

  return user;
};

/**
 * Gửi OTP reset password qua email
 */
export const sendResetPasswordOTP = async (user) => {
  try {
    // Rate limiting
    if (user.resetPasswordAttempts >= MAX_OTP_ATTEMPTS) {
      const cooldownEnd = new Date(
        user.lastResetPasswordOTPSentAt.getTime() + OTP_COOLDOWN_MINUTES * 60 * 1000
      );
      if (new Date() < cooldownEnd) {
        const minutesLeft = Math.ceil((cooldownEnd - new Date()) / 60000);
        throw new Error(
          `Too many password reset requests. Please try again in ${minutesLeft} minutes.`
        );
      }
      user.resetPasswordAttempts = 0;
    }

    const otp = generateOTP();

    user.resetPasswordOTP = otp;
    user.resetPasswordOTPExpires = getOTPExpiration();
    user.resetPasswordAttempts = (user.resetPasswordAttempts || 0) + 1;
    user.lastResetPasswordOTPSentAt = new Date();
    await user.save();

    const emailHTML = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Đặt lại mật khẩu EzyMarket</h2>
        <p>Xin chào ${validator.escape(user.userName || 'bạn')},</p>
        <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu của bạn. Mã OTP của bạn là:</p>
        <div style="background-color: #f4f4f4; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
          ${otp}
        </div>
        <p>Mã này có hiệu lực trong <strong>${OTP_EXPIRATION_MINUTES} phút</strong>.</p>
        <p style="color: #999; font-size: 14px; margin-top: 30px;">
          <strong>Lưu ý:</strong> Nếu bạn không yêu cầu đặt lại mật khẩu, vui lòng bỏ qua email này.
        </p>
        <hr style="margin: 30px 0;">
        <p style="color: #666; font-size: 12px;">Email này được gửi tự động từ EzyMarket. Vui lòng không trả lời.</p>
      </div>
    `;

    await sendEmail(user.email, 'Mã OTP đặt lại mật khẩu - EzyMarket', emailHTML);
  } catch (err) {
    console.error('Error sending reset password OTP:', err);
    throw err;
  }
};

/**
 * Verify OTP and reset password
 * @param {String} email
 * @param {String} otp
 * @param {String} newPassword
 * @returns {Promise<User>} User object if reset successful
 * @throws Error with status and message properties
 */
export const verifyResetPasswordOTP = async (email, otp, newPassword) => {
  const user = await User.findOne({ email });

  if (!user) {
    throw { status: 404, message: 'User not found' };
  }
  if (!user.resetPasswordOTP) {
    throw { status: 400, message: 'No reset OTP found. Please request a new one.' };
  }
  if (!isOTPValid(user.resetPasswordOTPExpires)) {
    throw { status: 400, message: 'Reset OTP has expired. Please request a new one.' };
  }

  // Check OTP match with brute force protection
  if (user.resetPasswordOTP !== otp) {
    user.resetPasswordOTPVerifyAttempts = (user.resetPasswordOTPVerifyAttempts || 0) + 1;
    await user.save();

    if (user.resetPasswordOTPVerifyAttempts >= 5) {
      user.resetPasswordOTP = null;
      user.resetPasswordOTPExpires = null;
      await user.save();
      throw { status: 429, message: 'Too many failed attempts. Please request a new OTP.' };
    }

    throw {
      status: 400,
      message: `Invalid OTP code. ${5 - user.resetPasswordOTPVerifyAttempts} attempts remaining.`,
    };
  }

  // Validate new password
  if (!newPassword || newPassword.length < 6) {
    throw { status: 400, message: 'Password must be at least 6 characters long' };
  }

  // Update password
  user.password = newPassword;
  user.resetPasswordOTP = null;
  user.resetPasswordOTPExpires = null;
  user.resetPasswordAttempts = 0;
  user.resetPasswordOTPVerifyAttempts = 0;
  user.refreshToken = null; // Force re-login
  await user.save();

  return user;
};

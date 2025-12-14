import crypto from 'crypto';
import { OTP_EXPIRATION_MINUTES } from '../config/authConst.js';
/**
 * Generate random 6-digit OTP
 */
export const generateOTP = () => {
  return crypto.randomInt(100000, 999999).toString();
};

/**
 * Set OTP expiration time
 */
export const getOTPExpiration = (minutes = OTP_EXPIRATION_MINUTES) => {
  return new Date(Date.now() + minutes * 60 * 1000);
};

/**
 * Validate if OTP is still valid
 */
export const isOTPValid = (expiresAt) => {
  return expiresAt && new Date() < expiresAt;
};

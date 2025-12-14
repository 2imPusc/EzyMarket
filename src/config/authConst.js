export const MAX_OTP_ATTEMPTS = 5; // Số lần thử OTP tối đa
export const OTP_COOLDOWN_MINUTES = 15; // Thời gian chờ sau khi vượt quá số lần thử OTP (phút)
export const OTP_EXPIRATION_MINUTES = 10; // Thời gian hiệu lực của OTP (phút)
export const SAFE_USER_FIELDS = [
  '_id',
  'email',
  'emailVerified',
  'groupId',
  'role',
  'userName',
  'avatar',
  'phone',
  'createdAt',
  'updatedAt',
];

// Fields public (dùng cho search user, add member, etc.)
export const PUBLIC_USER_FIELDS = ['_id', 'userName', 'email', 'avatar'];

// Fields bị loại trừ (sensitive data)
export const EXCLUDED_FIELDS = [
  'password',
  'refreshToken',
  'otp',
  'otpExpires',
  'otpAttempts',
  'otpVerifyAttempts',
  'resetPasswordOTP',
  'resetPasswordOTPExpires',
  'resetPasswordAttempts',
  'resetPasswordOTPVerifyAttempts',
  'lastOTPSentAt',
  'lastResetPasswordOTPSentAt',
];

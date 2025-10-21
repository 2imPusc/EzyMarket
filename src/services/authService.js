import User from '../model/userRepository.js';
import { sendVerificationEmail } from './verifyEmail.js';

export const handleRegister = async (userName, email, phone, password, req) => {
  const existingUser = await User.findOne({ email });
  if (existingUser) {
    if (!existingUser.emailVerified) {
      await sendVerificationEmail(existingUser, req);
      return {
        status: 200,
        data: {
          message:
            'This email has registered but not verified. Verification email resent. Please check your email.',
        },
      };
    }
    return {
      status: 400,
      data: { message: 'This email has registered' },
    };
  }

  const newUser = new User({ userName, email, phone, password });
  await newUser.save();
  await sendVerificationEmail(newUser, req);
  return {
    status: 201,
    data: {
      user: {
        id: newUser._id,
        userName: newUser.userName,
        email: newUser.email,
        role: newUser.role,
      },
      message: 'Registration successful. Please check your email to verify your account.',
    },
  };
};

export const generateRefreshToken = (user) => {
  const refreshToken = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_REFRESH_KEY, {
    expiresIn: '30d',
  });
  return refreshToken;
};

export const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role, email: user.email },
    process.env.JWT_ACCESS_KEY,
    { expiresIn: '1d' }
  );
};

import jwt from 'jsonwebtoken';
import { handleRegister } from '../services/authService.js';
import { generateAccessToken, generateRefreshToken } from '../services/authService.js';
import User from '../model/userRepository.js';
import Group from '../model/groupRepository.js';
import {
  sendVerificationEmail,
  verifyOTP as verify,
  sendResetPasswordOTP,
  verifyResetPasswordOTP,
} from '../services/verifyEmail.js';
import {
  OTP_EXPIRATION_MINUTES,
  SAFE_USER_FIELDS,
  PUBLIC_USER_FIELDS,
} from '../config/authConst.js';

const authController = {
  // REGISTER
  register: async (req, res) => {
    try {
      const { email, userName, password } = req.body;
      const result = await handleRegister({ email, userName, password });
      return res.status(result.status).json(result.data);
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  },

  // SEND VERIFICATION EMAIL
  sendVerificationEmail: async (req, res) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }

      const user = await User.findOne({ email });
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      if (user.emailVerified) {
        return res.status(200).json({ message: 'Email already verified' });
      }

      await sendVerificationEmail(user);
      return res.status(200).json({
        message: 'OTP code has been sent to your email',
        expiresIn: '10 minutes',
      });
    } catch (err) {
      console.error('Send verification OTP error:', err);
      res.status(500).json({ message: 'Failed to send OTP. Please try again later.' });
    }
  },

  verifyOTP: async (req, res) => {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    try {
      const user = await verify(email, otp);

      return res.status(200).json({
        message: 'Email verified successfully',
        user: {
          id: user._id,
          email: user.email,
          userName: user.userName,
          emailVerified: true,
        },
      });
    } catch (err) {
      console.error('Verify OTP error:', err);

      // Handle business logic errors with status code
      if (err.status) {
        return res.status(err.status).json({ message: err.message });
      }

      return res.status(500).json({ message: 'Internal server error' });
    }
  },

  // LOGIN
  login: async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email });

      if (!user) {
        return res.status(400).json({ message: 'Invalid email or password' });
      }

      if (!user.emailVerified) {
        return res.status(403).json({ message: 'Please verify your email before logging in.' });
      }

      const isMatch = await user.matchPassword(password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid email or password!' });
      }

      const token = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);
      user.refreshToken = refreshToken;
      await user.save();
      res.status(200).json({
        user: {
          id: user._id,
          userName: user.userName,
          role: user.role,
          email: user.email,
          groupId: user.groupId,
        },
        token: token,
        refreshToken,
      });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  },

  // ADMIN LOGIN - Only for admin dashboard
  adminLogin: async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email });

      if (!user) {
        return res.status(400).json({ message: 'Invalid email or password' });
      }

      // Check if user is admin
      if (user.role !== 'admin') {
        return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
      }

      if (!user.emailVerified) {
        return res.status(403).json({ message: 'Please verify your email before logging in.' });
      }

      const isMatch = await user.matchPassword(password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid email or password!' });
      }

      const token = generateAccessToken(user);
      const refreshToken = generateRefreshToken(user);
      user.refreshToken = refreshToken;
      await user.save();

      res.status(200).json({
        user: {
          id: user._id,
          userName: user.userName,
          role: user.role,
          email: user.email,
        },
        token: token,
        refreshToken,
      });
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  },

  //REFRESH TOKEN
  refreshToken: async (req, res) => {
    const token = req.body.refreshToken;
    if (!token) {
      return res.status(403).json({ message: 'Refresh token is not valid' });
    }

    try {
      const user = await User.findOne({ refreshToken: token });
      if (!user) return res.status(403).json({ message: 'Invalid refresh token' });

      const decoded = await new Promise((resolve, reject) => {
        jwt.verify(token, process.env.JWT_REFRESH_KEY, (err, decoded) => {
          if (err) reject(err);
          else resolve(decoded);
        });
      });

      if (decoded.id !== user._id.toString()) {
        return res.status(403).json({ message: 'Invalid refresh token' });
      }

      const newAccessToken = generateAccessToken(user);
      const newRefreshToken = generateRefreshToken(user);

      user.refreshToken = newRefreshToken;
      await user.save();

      res.status(200).json({
        token: newAccessToken,
        refreshToken: newRefreshToken,
      });
    } catch (err) {
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  //UPDATE
  update: async (req, res) => {
    try {
      const user = req.user;

      const userId = req.user.id;
      const { userName, phone, avatar } = req.body;

      const updates = {};
      if (userName) updates.userName = userName;
      if (phone) updates.phone = phone;

      if (avatar && typeof avatar === 'string') {
        updates.avatar = avatar;
      }

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: 'No fields to update provided' });
      }

      updates.updatedAt = Date.now();

      Object.assign(user, updates);

      await user.save();

      res.status(200).json({
        id: user._id,
        userName: user.userName,
        email: user.email,
        phone: user.phone,
        role: user.role,
        avatar: user.avatar,
      });
    } catch (err) {
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  // GET CURRENT USER PROFILE
  me: async (req, res) => {
    try {
      const userId = req.user.id;

      const user = await User.findById(userId)
        .select(SAFE_USER_FIELDS.join(' '))
        .populate('groupId', 'name description ownerId')
        .lean();

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.status(200).json(user);
    } catch (err) {
      console.error('Get user profile error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  //GET USER BY EMAIL OR PHONE
  getUserByEmailOrPhone: async (req, res) => {
    try {
      const { email, phone } = req.query;

      // Validation: At least one parameter required
      if (!email && !phone) {
        return res.status(400).json({ message: 'Email or phone parameter is required' });
      }

      // Build query (exact match, case-insensitive for email)
      const query = {};
      if (email) {
        query.email = email.toLowerCase();
      }
      if (phone) {
        // Normalize phone: remove spaces, dashes, and handle +84/0 prefix
        const normalizedPhone = phone.replace(/[\s\-\(\)]/g, '');
        // Search với regex để match cả 0xxx và +84xxx
        query.phone = new RegExp(`^(\\+84|0)?${normalizedPhone.replace(/^(\+84|0)/, '')}$`, 'i');
      }

      // Nếu cả email và phone được cung cấp, dùng OR query
      let user;
      if (email && phone) {
        user = await User.findOne({ $or: [{ email: query.email }, { phone: query.phone }] }).select(
          '_id userName email phone avatar'
        );
      } else {
        user = await User.findOne(query).select('_id userName email phone avatar');
      }

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Trả về thông tin public
      res.status(200).json({
        id: user._id,
        userName: user.userName,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar,
      });
    } catch (err) {
      console.error('Get user by email/phone error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  getList: async (req, res) => {
    try {
      console.log('Get list user');
      const { page = 1, pageSize = 10, search = '', role, emailVerified } = req.query;

      // Build query
      const query = {};

      // Search by email or userName
      if (search) {
        query.$or = [
          { email: { $regex: search, $options: 'i' } },
          { userName: { $regex: search, $options: 'i' } },
        ];
      }

      // Filter by role
      if (role) {
        query.role = role;
      }

      // Filter by email verification status
      if (emailVerified !== undefined) {
        query.emailVerified = emailVerified === 'true';
      }

      // Calculate pagination
      const pageNum = parseInt(page);
      const limit = parseInt(pageSize);
      const skip = (pageNum - 1) * limit;

      // Get total count
      const total = await User.countDocuments(query);

      // Get users with pagination
      const users = await User.find(query)
        .select('_id userName email role emailVerified phone avatar createdAt updatedAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      // Format response
      const formattedUsers = users.map((user) => ({
        id: user._id,
        userName: user.userName,
        email: user.email,
        role: user.role,
        emailVerified: user.emailVerified,
        phone: user.phone,
        avatar: user.avatar,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      }));

      res.status(200).json({
        data: formattedUsers,
        total,
        page: pageNum,
        pageSize: limit,
        totalPages: Math.ceil(total / limit),
      });
    } catch (e) {
      console.error('Get users list error:', e);
      res.status(500).json({ message: e.message });
    }
  },

  //CHANGE PASSWORD
  changePassword: async (req, res) => {
    try {
      const userId = req.user.id;
      const { oldPassword, newPassword } = req.body;

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      const isMatch = await user.matchPassword(oldPassword);
      if (!isMatch) {
        return res.status(400).json({ message: 'Old password is incorrect' });
      }

      user.password = newPassword;
      await user.save();

      res.status(200).json({ message: 'Password changed successfully' });
    } catch (err) {
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  //DELETE
  delete: async (req, res) => {
    try {
      const userId = req.params.id;
      const currentUser = req.user; // Từ middleware verifyTokenAndSelfOrAdmin

      if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
      }

      const userToDelete = await User.findById(userId);
      if (!userToDelete) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Bảo mật: Chỉ cho phép self hoặc admin xóa (middleware đã check, nhưng confirm lại)
      if (currentUser.id !== userId && currentUser.role !== 'admin') {
        return res.status(403).json({ message: 'You are not allowed to delete this user' });
      }

      // Logic đặc biệt: Ngăn admin xóa chính mình (tùy chọn, để tránh lockout)
      if (currentUser.id === userId && currentUser.role === 'admin') {
        return res.status(400).json({ message: 'Admin cannot delete their own account' });
      }

      await User.findByIdAndDelete(userId);

      if (currentUser.id === userId) {
        return res
          .status(200)
          .json({ message: 'Your account has been deleted successfully. You are now logged out.' });
      }

      res.status(200).json({ message: 'User deleted successfully' });
    } catch (err) {
      console.error('Delete user error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  //LOGOUT
  logout: async (req, res) => {
    try {
      const { refreshToken } = req.body;
      const user = await User.findOne({ refreshToken });
      if (!user) {
        return res.status(403).json({ message: 'Invalid refresh token' });
      }

      user.refreshToken = null;
      await user.save();
      return res.status(200).json({ message: 'Logged out successfully' });
    } catch (err) {
      return res.status(500).json({ message: 'Internal server error' });
    }
  },

  //FORGOT PASSWORD - Send OTP for password reset
  forgotPassword: async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ message: 'Email is required' });
      }

      const user = await User.findOne({ email });
      if (!user) {
        // Không tiết lộ thông tin user có tồn tại hay không để bảo mật
        return res.status(200).json({
          message: 'If the email exists, a password reset OTP has been sent',
        });
      }

      await sendResetPasswordOTP(user);
      return res.status(200).json({
        message: 'Password reset OTP has been sent to your email. Please check your inbox.',
        expiresIn: `${OTP_EXPIRATION_MINUTES} minutes`,
      });
    } catch (err) {
      console.error('Forgot password error:', err);

      if (err.message && err.message.includes('Too many')) {
        return res.status(429).json({ message: err.message });
      }

      return res.status(500).json({ message: 'Internal server error' });
    }
  },

  // GET USER BY ID (Admin only)
  getUserById: async (req, res) => {
    try {
      const userId = req.params.id;

      if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
      }

      const user = await User.findById(userId)
        .select('_id userName email role emailVerified phone avatar createdAt updatedAt')
        .lean();

      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.status(200).json({
        data: {
          id: user._id,
          userName: user.userName,
          email: user.email,
          role: user.role,
          emailVerified: user.emailVerified,
          phone: user.phone,
          avatar: user.avatar,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      });
    } catch (err) {
      console.error('Get user by ID error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  // CREATE USER BY ADMIN
  createUserByAdmin: async (req, res) => {
    try {
      const { email, userName, password, role, phone } = req.body;

      // Validation
      if (!email || !userName || !password) {
        return res.status(400).json({
          message: 'Email, userName, and password are required',
        });
      }

      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'User with this email already exists' });
      }

      // Create new user
      const newUser = new User({
        email,
        userName,
        password,
        role: role || 'user',
        phone,
        emailVerified: true, // Admin-created users are automatically verified
      });

      await newUser.save();

      res.status(201).json({
        data: {
          id: newUser._id,
          userName: newUser.userName,
          email: newUser.email,
          role: newUser.role,
          emailVerified: newUser.emailVerified,
          phone: newUser.phone,
          avatar: newUser.avatar,
          createdAt: newUser.createdAt,
          updatedAt: newUser.updatedAt,
        },
      });
    } catch (err) {
      console.error('Create user by admin error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  // UPDATE USER BY ADMIN
  updateUserByAdmin: async (req, res) => {
    try {
      const userId = req.params.id;
      const { userName, role, phone, avatar, emailVerified } = req.body;

      if (!userId) {
        return res.status(400).json({ message: 'User ID is required' });
      }

      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Update fields
      const updates = {};
      if (userName !== undefined) updates.userName = userName;
      if (role !== undefined) updates.role = role;
      if (phone !== undefined) updates.phone = phone;
      if (avatar !== undefined) updates.avatar = avatar;
      if (emailVerified !== undefined) updates.emailVerified = emailVerified;

      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: 'No fields to update' });
      }

      updates.updatedAt = Date.now();

      Object.assign(user, updates);
      await user.save();

      res.status(200).json({
        data: {
          id: user._id,
          userName: user.userName,
          email: user.email,
          role: user.role,
          emailVerified: user.emailVerified,
          phone: user.phone,
          avatar: user.avatar,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
        },
      });
    } catch (err) {
      console.error('Update user by admin error:', err);
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  //RESET PASSWORD - Verify OTP and update password
  resetPassword: async (req, res) => {
    try {
      const { email, otp, newPassword } = req.body;

      if (!email || !otp || !newPassword) {
        return res.status(400).json({ message: 'Email, OTP, and new password are required' });
      }

      // Verify OTP and reset password
      const user = await verifyResetPasswordOTP(email, otp, newPassword);

      return res.status(200).json({
        message: 'Password has been reset successfully. Please login with your new password.',
        user: {
          id: user._id,
          email: user.email,
          userName: user.userName,
        },
      });
    } catch (err) {
      console.error('Reset password error:', err);

      // Handle business logic errors
      if (err.status) {
        return res.status(err.status).json({ message: err.message });
      }

      return res.status(500).json({ message: 'Internal server error' });
    }
  },
};
export default authController;

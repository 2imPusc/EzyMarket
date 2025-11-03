import jwt from 'jsonwebtoken';
import { handleRegister } from '../services/authService.js';
import { generateAccessToken, generateRefreshToken } from '../services/authService.js';
import User from '../model/userRepository.js';
import { sendVerificationEmail } from '../services/verifyEmail.js';
import { sendResetPasswordEmail, verifyResetToken } from '../services/forgotPassword.js';

const authController = {
  //REGISTER
  register: async (req, res) => {
    try {
      const { email, phone, password } = req.body;
      const result = await handleRegister({ email, phone, password, req });
      return res.status(result.status).json(result.data);
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  },

  //SEND VERIFICATION EMAIL
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

      await sendVerificationEmail(user, req);
      return res.status(200).json({ message: 'Verification email sent successfully' });
    } catch (err) {
      console.error('Send verification email error:', err);
      if (err.message.includes('email')) {
        return res.status(500).json({ message: 'Failed to send email. Please try again later.' });
      }
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  //LOGIN
  login: async (req, res) => {
    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email });

      if (!user) {
        return res.status(400).json({ message: 'No user' });
      }

      if (!user.emailVerified) {
        return res.status(403).json({ message: 'Please verify your email before logging in.' });
      }

      const isMatch = await user.matchPassword(password);
      if (!isMatch) {
        return res.status(400).json({ message: 'Invalid phone number or password!' });
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
      const userId = req.user.id;
      // Lấy các trường có thể cập nhật từ body
      const { userName, phone, avatar } = req.body;

      // Xây dựng đối tượng updates một cách an toàn
      const updates = {};
      if (userName) updates.userName = userName;
      if (phone) updates.phone = phone;
      
      // Thêm logic cho avatar: chỉ cập nhật nếu nó là một chuỗi hợp lệ
      if (avatar && typeof avatar === 'string') {
        // Có thể thêm validation để chắc chắn đây là URL từ uploadthing nếu cần
        updates.avatar = avatar;
      }
      
      // Nếu không có gì để cập nhật, trả về lỗi
      if (Object.keys(updates).length === 0) {
        return res.status(400).json({ message: 'No fields to update provided' });
      }

      // Thêm updatedAt
      updates.updatedAt = Date.now();

      const updatedUser = await User.findByIdAndUpdate(userId, updates, { new: true });
      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.status(200).json({
        id: updatedUser._id,
        userName: updatedUser.userName,
        email: updatedUser.email,
        phone: updatedUser.phone,
        role: updatedUser.role,
        avatar: updatedUser.avatar, // Trả về avatar mới
      });
    } catch (err) {
      res.status(500).json({ message: 'Internal server error' });
    }
  },

  // GET CURRENT USER PROFILE 
  me: async (req, res) => {
    try {
      const userId = req.user.id;

      const user = await User.findById(userId).select('-password -refreshToken');

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
        user = await User.findOne({ $or: [{ email: query.email }, { phone: query.phone }] })
          .select('_id userName email phone avatar');
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
      const currentUser = req.user;  // Từ middleware verifyTokenAndSelfOrAdmin

      // Validation: Check userId hợp lệ
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

      // Xóa user
      await User.findByIdAndDelete(userId);

      // Nếu user xóa chính mình: Không cần invalidate refreshToken vì user đã xóa
      if (currentUser.id === userId) {
        return res.status(200).json({ message: 'Your account has been deleted successfully. You are now logged out.' });
      }

      // Nếu admin xóa user khác
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

  //FORGOT PASSWORD - Request reset password email
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
          message: 'If the email exists, a password reset link has been sent to your email',
        });
      }

      await sendResetPasswordEmail(user, req);
      return res.status(200).json({
        message: 'Password reset link has been sent to your email. Please check your inbox.',
      });
    } catch (err) {
      console.error('Forgot password error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },

  //RESET PASSWORD - Verify token and update password
  resetPassword: async (req, res) => {
    try {
      const { token } = req.query;
      const { newPassword } = req.body;

      if (!token) {
        return res.status(400).json({ message: 'Reset token is required' });
      }

      if (!newPassword) {
        return res.status(400).json({ message: 'New password is required' });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters long' });
      }

      // Xác thực token
      const { valid, decoded, error } = verifyResetToken(token);
      if (!valid) {
        return res.status(400).json({
          message: 'Invalid or expired reset token',
          error,
        });
      }

      // Tìm user và cập nhật password
      const user = await User.findById(decoded.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      // Cập nhật password mới
      user.password = newPassword;
      // Xóa refresh token để bắt buộc đăng nhập lại
      user.refreshToken = null;
      await user.save();

      return res.status(200).json({
        message: 'Password has been reset successfully. Please login with your new password.',
      });
    } catch (err) {
      console.error('Reset password error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },

  //VERIFY RESET TOKEN - Kiểm tra token có hợp lệ không (cho frontend)
  verifyResetToken: async (req, res) => {
    try {
      const { token } = req.query;

      if (!token) {
        return res.status(400).json({ message: 'Token is required' });
      }

      const { valid, decoded, error } = verifyResetToken(token);
      if (!valid) {
        return res.status(400).json({
          message: 'Invalid or expired token',
          error,
        });
      }

      const user = await User.findById(decoded.id);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }

      return res.status(200).json({
        message: 'Token is valid',
        email: user.email,
      });
    } catch (err) {
      console.error('Verify reset token error:', err);
      return res.status(500).json({ message: 'Internal server error' });
    }
  },
};
export default authController;

import jwt from 'jsonwebtoken';
import { handleRegister } from '../services/authService.js';
import { generateAccessToken, generateRefreshToken } from '../services/authService.js';
import User from '../model/userRepository.js';
import { sendVerificationEmail } from '../services/verifyEmail.js';

const authController = {
  //REGISTER
  register: async (req, res) => {
    try {
      const { userName, email, phone, password } = req.body;
      const result = await handleRegister(userName, email, phone, password, req);
      return res.status(result.status).json(result.data);
    } catch (err) {
      return res.status(500).json({ message: err.message });
    }
  },

  //SEND VERIFICATION EMAIL
  sendVerificationEmail: async (req, res) => {
    try {
      const userId = req.user.id;
      const user = await User.findById(userId);
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
      }
      if (user.emailVerified) {
        return res.status(200).json({ message: 'Email already verified' });
      }
      await sendVerificationEmail(user, req);
      return res.status(200).json({ message: 'Verification email sent successfully' });
    } catch (err) {
      return res.status(500).json({ message: 'Internal server error' });
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
      const updates = req.body;

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
      });
    } catch (err) {
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
      const userId = req.user.id;

      const deletedUser = await User.findByIdAndDelete(userId);
      if (!deletedUser) {
        return res.status(404).json({ message: 'User not found' });
      }

      res.status(200).json({ message: 'User deleted successfully' });
    } catch (err) {
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
};
export default authController;

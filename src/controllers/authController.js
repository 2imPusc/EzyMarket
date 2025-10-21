import User from '../model/userRepository.js';
import jwt from 'jsonwebtoken';

const generateRefreshToken = (user) => {
  const refreshToken = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_REFRESH_KEY, {
    expiresIn: '30d',
  });
  return refreshToken;
};

const generateAccessToken = (user) => {
  return jwt.sign(
    { id: user._id, role: user.role, email: user.email },
    process.env.JWT_ACCESS_KEY,
    { expiresIn: '1d' }
  );
};

const authController = {
  //REGISTER
  register: async (req, res) => {
    try {
      const { userName, email, phone, password } = req.body;
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'This email has registered' });
      }

      const newUser = new User({ userName, email, phone, password });
      const token = generateAccessToken(newUser);
      const refreshToken = generateRefreshToken(newUser);
      newUser.refreshToken = refreshToken;
      await newUser.save();

      res.status(201).json({
        user: {
          id: newUser._id,
          userName: newUser.userName,
          email: newUser.email,
          role: newUser.role,
        },
        token: token,
        refreshToken,
      });
    } catch (err) {
      return res.status(500).json({ message: err.message });
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
      if (!user) return res.status(403).json({ message: 'Refresh token khong hop le' });

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

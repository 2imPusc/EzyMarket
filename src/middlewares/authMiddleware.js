import jwt from 'jsonwebtoken';
import User from '../model/userRepository.js';

const authMiddleware = {
  verifyToken: (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ message: 'No token provided.' });

    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.JWT_ACCESS_KEY, async (err, decoded) => {
      if (err) return res.status(403).json({ message: 'Invalid token.' });
      try {
        // load full user to get up-to-date groupId
        const userFromDb = await User.findById(decoded.id).lean();
        if (!userFromDb) return res.status(401).json({ message: 'User not found.' });

        req.user = {
          id: String(userFromDb._id),
          role: userFromDb.role,
          groupId: userFromDb.groupId ? String(userFromDb.groupId) : null,
          email: userFromDb.email,
          userName: userFromDb.userName,
        };
        next();
      } catch (e) {
        return res.status(500).json({ message: 'Internal server error.' });
      }
    });
  },

  verifyAdmin: (req, res, next) => {
    authMiddleware.verifyToken(req, res, () => {
      if (req.user.role === 'admin') {
        next();
      } else {
        return res.status(403).json({ message: 'You do not have access rights.' });
      }
    });
  },

  verifyTokenAndSelfOrAdmin: (req, res, next) => {
    authMiddleware.verifyToken(req, res, () => {
      if (req.user.role === 'admin' || req.user.id === req.params.id) {
        next();
      } else {
        return res.status(403).json({ message: 'You are not allowed to perform this action.' });
      }
    });
  },
};

export default authMiddleware;

import jwt from 'jsonwebtoken';

const authMiddleware = {
  verifyToken: (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return res.status(401).json({ message: 'No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.JWT_ACCESS_KEY, (err, user) => {
      if (err) {
        return res.status(403).json({ message: 'Invalid token.' });
      }
      req.user = user;
      next();
    });
  },

  verifyAdmin: (req, res, next) => {
    middleWareController.verifyToken(req, res, () => {
      if (req.user.role === 'admin') {
        next();
      } else {
        return res.status(403).json({ message: 'You do not have access rights.' });
      }
    });
  },

  verifyTokenAndSelfOrAdmin: (req, res, next) => {
    middleWareController.verifyToken(req, res, () => {
      if (req.user.role === 'admin' || req.user.id === req.params.id) {
        next();
      } else {
        return res.status(403).json({ message: 'You are not allowed to perform this action.' });
      }
    });
  },
};

export default authMiddleware;

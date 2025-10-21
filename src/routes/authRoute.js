import authController from '../controllers/authController.js';
import authMiddleware from '../middlewares/authMiddleware.js';
import express from 'express';
const router = express.Router();

//REGISTER
router.post('/register', authController.register);

//LOGIN
router.post('/login', authController.login);

//REFRESH
router.post('/refresh', authMiddleware.verifyToken, authController.refreshToken);

//LOGOUT
router.post('/logout', authMiddleware.verifyToken, authController.logout);

//DELETE

// EDIT

//VERIFY EMAIL

export default router;

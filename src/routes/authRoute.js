import { verifyEmail } from '#services/verifyEmail.js';
import authController from '#controllers/authController.js';
import authMiddleware from '#middlewares/authMiddleware.js';
import { validateUser } from '#middlewares/validationMiddleware.js';
import express from 'express';
const router = express.Router();

//REGISTER
router.post('/register', validateUser, authController.register);

//LOGIN
router.post('/login', authController.login);

//REFRESH
router.post('/refreshToken', authMiddleware.verifyToken, authController.refreshToken);

//LOGOUT
router.post('/logout', authMiddleware.verifyTokenAndSelfOrAdmin, authController.logout);

//DELETE
router.post('/delete', authMiddleware.verifyTokenAndSelfOrAdmin, authController.delete);

// EDIT
router.put('/edit', authMiddleware.verifyTokenAndSelfOrAdmin, validateUser, authController.update);

//CHANGE PASSWORD
router.put(
  '/change-password',
  authMiddleware.verifyTokenAndSelfOrAdmin,
  authController.changePassword
);

// SEND VERIFICATION EMAIL
router.post(
  '/send-verification-email',
  authMiddleware.verifyToken,
  authController.sendVerificationEmail
);

//VERIFY EMAIL
router.get('/verify-email', verifyEmail);

export default router;

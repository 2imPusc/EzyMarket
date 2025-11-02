import { verifyEmail } from '#services/verifyEmail.js';
import authController from '#controllers/authController.js';
import authMiddleware from '#middlewares/authMiddleware.js';
import { validateUser } from '#middlewares/validationMiddleware.js';
import express from 'express';
const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Authentication
 *   description: User authentication and account management
 */

/**
 * @swagger
 * /api/user/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - phone
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               phone:
 *                 type: string
 *                 example: "0123456789"
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 example: password123
 *     responses:
 *       201:
 *         description: User registered successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: User registered successfully
 *       400:
 *         description: Bad request - validation error
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       500:
 *         description: Internal server error
 */
//REGISTER
router.post('/register', validateUser, authController.register);

/**
 * @swagger
 * /api/user/login:
 *   post:
 *     summary: Login user
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               password:
 *                 type: string
 *                 format: password
 *                 example: password123
 *     responses:
 *       200:
 *         description: Login successful
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     userName:
 *                       type: string
 *                     role:
 *                       type: string
 *                     email:
 *                       type: string
 *                 token:
 *                   type: string
 *                   description: JWT access token
 *                 refreshToken:
 *                   type: string
 *                   description: JWT refresh token
 *       400:
 *         description: Invalid credentials
 *       500:
 *         description: Internal server error
 */
//LOGIN
router.post('/login', authController.login);

/**
 * @swagger
 * /api/user/refreshToken:
 *   post:
 *     summary: Refresh access token
 *     tags: [Authentication]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Refresh token received during login
 *     responses:
 *       200:
 *         description: Token refreshed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 token:
 *                   type: string
 *                   description: New JWT access token
 *                 refreshToken:
 *                   type: string
 *                   description: New JWT refresh token
 *       403:
 *         description: Invalid refresh token
 *       500:
 *         description: Internal server error
 */
//REFRESH
router.post('/refreshToken', authMiddleware.verifyToken, authController.refreshToken);

/**
 * @swagger
 * /api/user/logout:
 *   post:
 *     summary: Logout user
 *     tags: [Authentication]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - refreshToken
 *             properties:
 *               refreshToken:
 *                 type: string
 *                 description: Refresh token to invalidate
 *     responses:
 *       200:
 *         description: Logged out successfully
 *       403:
 *         description: Invalid refresh token
 *       500:
 *         description: Internal server error
 */
//LOGOUT
router.post('/logout', authMiddleware.verifyToken, authController.logout);

/**
 * @swagger
 * /api/user/delete/{id}:
 *   post:
 *     summary: Delete user account (self or admin only)
 *     tags: [Authentication]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: ID of the user to delete
 *     responses:
 *       200:
 *         description: User deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Your account has been deleted successfully. You are now logged out.
 *       400:
 *         description: Invalid request or admin cannot delete self
 *       403:
 *         description: Not allowed to delete this user
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.post('/delete/:id', authMiddleware.verifyTokenAndSelfOrAdmin, authController.delete);

/**
 * @swagger
 * /api/user/edit:
 *   put:
 *     summary: Update user profile (including name, phone, and avatar)
 *     description: To update the avatar, first upload the image file to the `/api/uploadthing` endpoint (using the `avatarUploader` router). Then, include the returned URL in the `avatar` field of this request's body. Other fields are optional.
 *     tags: [Authentication]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               userName:
 *                 type: string
 *                 example: newusername
 *               phone:
 *                 type: string
 *                 example: "0987654321"
 *               avatar:
 *                 type: string
 *                 format: uri
 *                 description: "URL of the new avatar, obtained from UploadThing."
 *                 example: "https://uploadthing.com/f/..."
 *     responses:
 *       200:
 *         description: User updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/UserResponse' 
 *       400:
 *         description: Bad request (e.g., no fields to update)
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: User not found
 */
// EDIT
router.put('/edit', authMiddleware.verifyToken, authController.update);

/**
 * @swagger
 * /api/user/change-password:
 *   put:
 *     summary: Change user password
 *     tags: [Authentication]
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - oldPassword
 *               - newPassword
 *             properties:
 *               oldPassword:
 *                 type: string
 *                 format: password
 *                 example: oldpassword123
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 example: newpassword123
 *     responses:
 *       200:
 *         description: Password changed successfully
 *       400:
 *         description: Old password is incorrect
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
//CHANGE PASSWORD
router.put(
  '/change-password',
  authMiddleware.verifyToken,
  authController.changePassword
);

/**
 * @swagger
 * /api/user/send-verification-email:
 *   post:
 *     summary: Send email verification link
 *     tags: [Authentication]
 *     security: []
 *     responses:
 *       200:
 *         description: Verification email sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Verification email sent successfully. Please check your email.
 *       400:
 *         description: Email already verified
 *       401:
 *         description: Unauthorized (invalid token)
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error or email sending failed
 */
// SEND VERIFICATION EMAIL
router.post(
  '/send-verification-email',
  authController.sendVerificationEmail
);

/**
 * @swagger
 * /api/user/send-verification-email:
 *   post:
 *     summary: Resend email verification link (public, no auth required)
 *     tags: [Authentication]
 *     security: [] 
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email: { type: string, format: email, description: 'User email to resend verification' }
 *     responses:
 *       200:
 *         description: Verification email sent or already verified
 *       400: 
 *         description: 'Email required' 
 *       404: 
 *         description: 'User not found' 
 *       500: 
 *         description: 'Internal server error' 
 */
//VERIFY EMAIL
router.get('/verify-email', verifyEmail);

/**
 * @swagger
 * /api/user/forgot-password:
 *   post:
 *     summary: Request password reset email
 *     tags: [Authentication]
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: Password reset link sent to email
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Password reset link has been sent to your email. Please check your inbox.
 *       400:
 *         description: Email is required
 *       500:
 *         description: Internal server error
 */
//FORGOT PASSWORD - Request reset password email
router.post('/forgot-password', authController.forgotPassword);

/**
 * @swagger
 * /api/user/reset-password:
 *   post:
 *     summary: Reset password with token
 *     tags: [Authentication]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Password reset token from email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - newPassword
 *             properties:
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 example: newpassword123
 *     responses:
 *       200:
 *         description: Password reset successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Password has been reset successfully. Please login with your new password.
 *       400:
 *         description: Invalid or expired token, or invalid password
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
//RESET PASSWORD - Submit new password with token
router.post('/reset-password', authController.resetPassword);

/**
 * @swagger
 * /api/user/verify-reset-token:
 *   get:
 *     summary: Verify if password reset token is valid
 *     tags: [Authentication]
 *     security: []
 *     parameters:
 *       - in: query
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *         description: Password reset token to verify
 *     responses:
 *       200:
 *         description: Token is valid
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Token is valid
 *                 email:
 *                   type: string
 *                   example: user@example.com
 *       400:
 *         description: Invalid or expired token
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
//VERIFY RESET TOKEN - Check if token is valid (optional, for frontend)
router.get('/verify-reset-token', authController.verifyResetToken);

export default router;

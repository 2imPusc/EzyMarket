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
 *               - userName
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 example: user@example.com
 *               userName:
 *                 type: string
 *                 example: "userName"
 *               password:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 example: 123456
 *               phone:
 *                 type: string
 *                 required: false
 *                 description: Phone number (optional)
 *                 example: "0912345678"
 *     responses:
 *       201:
 *         description: User registered successfully
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
 *                     email:
 *                       type: string
 *                     role:
 *                       type: string
 *                 message:
 *                   type: string
 *                   example: Registration successful. Please check your email to verify your account.
 *       400:
 *         description: Bad request - email already registered
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: This email has registered
 *       409:
 *         description: Email registered but not verified - verification email resent
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: This email is already registered but not verified. Verification email resent.
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
 *                 example: 123456
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
 *                       enum: [user, admin]
 *                     email:
 *                       type: string
 *                     groupId:
 *                       type: string
 *                       nullable: true
 *                       description: ID of the group user belongs to (if any)
 *                 token:
 *                   type: string
 *                   description: JWT access token
 *                 refreshToken:
 *                   type: string
 *                   description: JWT refresh token
 *       400:
 *         description: Invalid credentials
 *       403:
 *         description: Email not verified
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Please verify your email before logging in.
 *       500:
 *         description: Internal server error
 */
//LOGIN
router.post('/login', authController.login);

/**
 * @swagger
 * /api/user/token/refresh:
 *   post:
 *     summary: Refresh access token
 *     description: Generate new access and refresh tokens using a valid refresh token. Note: This endpoint does not require Bearer token in header, but requires refreshToken in request body.
 *     tags: [Authentication]
 *     security: []
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
 *                 example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
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
 *         description: Invalid or expired refresh token
 *       500:
 *         description: Internal server error
 */
// REFRESH TOKEN
router.post('/token/refresh', authMiddleware.verifyToken, authController.refreshToken);

/**
 * @swagger
 * /api/user/logout:
 *   post:
 *     summary: Logout user
 *     description: Invalidate the user's refresh token to prevent future token refreshes
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
 *                 example: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
 *     responses:
 *       200:
 *         description: Logged out successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Logged out successfully
 *       403:
 *         description: Invalid refresh token
 *       500:
 *         description: Internal server error
 */
// LOGOUT
router.post('/logout', authMiddleware.verifyToken, authController.logout);

/**
 * @swagger
 * /api/user/{id}:
 *   delete:
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
router.delete('/:id', authMiddleware.verifyTokenAndSelfOrAdmin, authController.delete);

/**
 * @swagger
 * /api/user/me:
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
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 userName:
 *                   type: string
 *                 email:
 *                   type: string
 *                 phone:
 *                   type: string
 *                   nullable: true
 *                 role:
 *                   type: string
 *                   enum: [user, admin]
 *                 avatar:
 *                   type: string
 *                   format: uri
 *                   nullable: true
 *       400:
 *         description: Bad request (e.g., no fields to update)
 *       401:
 *         description: Unauthorized
 *       500:
 *         description: Internal server error
 */
// EDIT
router.put('/me', authMiddleware.verifyToken, authController.update);

/**
 * @swagger
 * /api/user/me:
 *   get:
 *     summary: Get current logged-in user's profile
 *     description: Retrieves the profile information for the user associated with the provided JWT.
 *     tags: [Authentication]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: User profile retrieved successfully.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 _id:
 *                   type: string
 *                   example: "60d0fe4f5311236168a109ca"
 *                 userName:
 *                   type: string
 *                   example: "johndoe"
 *                 email:
 *                   type: string
 *                   format: email
 *                   example: "user@example.com"
 *                 phone:
 *                   type: string
 *                   example: "0123456789"
 *                 avatar:
 *                   type: string
 *                   format: uri
 *                   example: "https://uploadthing.com/f/..."
 *                 role:
 *                   type: string
 *                   enum: [user, admin]
 *                   example: "user"
 *                 groupId:
 *                   type: object
 *                   nullable: true
 *                   description: Group information (populated if user belongs to a group)
 *                   properties:
 *                     _id:
 *                       type: string
 *                     name:
 *                       type: string
 *                     description:
 *                       type: string
 *                     ownerId:
 *                       type: string
 *                 createdAt:
 *                   type: string
 *                   format: date-time
 *                 updatedAt:
 *                   type: string
 *                   format: date-time
 *       401:
 *         description: Unauthorized - Token is missing or invalid.
 *       404:
 *         description: User not found.
 *       500:
 *         description: Internal server error.
 */
router.get('/me', authMiddleware.verifyToken, authController.me);

/**
 * @swagger
 * /api/user/get-user-by-email-or-phone:
 *   get:
 *     summary: Search user by email or phone
 *     description: Returns public user information (id, userName, email, phone, avatar) if user exists. Requires authentication. Provide either email or phone parameter.
 *     tags: [Authentication]
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: email
 *         required: false
 *         schema:
 *           type: string
 *           format: email
 *         description: Email address of the user to search
 *         example: user@example.com
 *       - in: query
 *         name: phone
 *         required: false
 *         schema:
 *           type: string
 *         description: Phone number of the user to search (with or without +84/0 prefix)
 *         example: "0912345678"
 *     responses:
 *       200:
 *         description: User found
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                   example: "60d0fe4f5311236168a109ca"
 *                 userName:
 *                   type: string
 *                   example: "johndoe"
 *                 email:
 *                   type: string
 *                   format: email
 *                   example: "user@example.com"
 *                 phone:
 *                   type: string
 *                   example: "0912345678"
 *                 avatar:
 *                   type: string
 *                   format: uri
 *                   example: "https://uploadthing.com/f/..."
 *       400:
 *         description: Email or phone parameter is required
 *       401:
 *         description: Unauthorized (invalid token)
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
router.get(
  '/get-user-by-email-or-phone',
  authMiddleware.verifyToken,
  authController.getUserByEmailOrPhone
);

/**
 * @swagger
 * /api/user/password:
 *   put:
 *     summary: Change current user's password
 *     description: Update password for authenticated user (requires old password verification)
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
 *                 description: Current password for verification
 *                 example: 123456
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 description: New password (min 6 characters)
 *                 example: 654321
 *     responses:
 *       200:
 *         description: Password changed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Password changed successfully
 *       400:
 *         description: Old password is incorrect
 *       401:
 *         description: Unauthorized - token missing or invalid
 *       404:
 *         description: User not found
 *       500:
 *         description: Internal server error
 */
// CHANGE PASSWORD
router.put('/password', authMiddleware.verifyToken, authController.changePassword);

/**
 * @swagger
 * /api/user/email/verification:
 *   post:
 *     summary: Send email verification OTP
 *     description: Send a 6-digit OTP code to user's email for verification (valid for 10 minutes)
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
 *                 description: Email address to send verification OTP
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: OTP sent successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: OTP code has been sent to your email
 *                 expiresIn:
 *                   type: string
 *                   example: "10 minutes"
 *       400:
 *         description: Email already verified or email required
 *       404:
 *         description: User not found
 *       429:
 *         description: Too many OTP requests
 *       500:
 *         description: Internal server error or email sending failed
 */
// SEND VERIFICATION EMAIL
router.post('/email/verification', authController.sendVerificationEmail);

/**
 * @swagger
 * /api/user/email/verify:
 *   post:
 *     summary: Verify email with OTP code
 *     description: Verify user's email address using the 6-digit OTP code sent to their email
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
 *               - otp
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email address to verify
 *                 example: user@example.com
 *               otp:
 *                 type: string
 *                 pattern: '^[0-9]{6}$'
 *                 description: 6-digit OTP code
 *                 example: "123456"
 *     responses:
 *       200:
 *         description: Email verified successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Email verified successfully
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     userName:
 *                       type: string
 *                     emailVerified:
 *                       type: boolean
 *                       example: true
 *       400:
 *         description: Invalid or expired OTP
 *       404:
 *         description: User not found
 *       429:
 *         description: Too many failed attempts
 */
router.post('/email/verify', authController.verifyOTP);

/**
 * @swagger
 * /api/user/password/reset-request:
 *   post:
 *     summary: Request password reset OTP
 *     description: Send a 6-digit OTP code to user's email for password reset (valid for 10 minutes)
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
 *                 description: Email address to send password reset OTP
 *                 example: user@example.com
 *     responses:
 *       200:
 *         description: Password reset OTP sent to email
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: Password reset OTP has been sent to your email. Please check your inbox.
 *                 expiresIn:
 *                   type: string
 *                   example: "10 minutes"
 *       400:
 *         description: Email is required
 *       429:
 *         description: Too many OTP requests (rate limit exceeded)
 *       500:
 *         description: Internal server error
 */
// REQUEST PASSWORD RESET OTP
router.post('/password/reset-request', authController.forgotPassword);

/**
 * @swagger
 * /api/user/password/reset:
 *   post:
 *     summary: Reset password with OTP code
 *     description: Reset user's password using the 6-digit OTP code sent to their email
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
 *               - otp
 *               - newPassword
 *             properties:
 *               email:
 *                 type: string
 *                 format: email
 *                 description: Email address of the account
 *                 example: user@example.com
 *               otp:
 *                 type: string
 *                 pattern: '^[0-9]{6}$'
 *                 description: 6-digit OTP code
 *                 example: "123456"
 *               newPassword:
 *                 type: string
 *                 format: password
 *                 minLength: 6
 *                 description: New password (min 6 characters)
 *                 example: 654321
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
 *                 user:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: string
 *                     email:
 *                       type: string
 *                     userName:
 *                       type: string
 *       400:
 *         description: Invalid or expired OTP, or invalid password
 *       404:
 *         description: User not found
 *       429:
 *         description: Too many failed OTP attempts
 *       500:
 *         description: Internal server error
 */
// RESET PASSWORD
router.post('/password/reset', authController.resetPassword);

export default router;

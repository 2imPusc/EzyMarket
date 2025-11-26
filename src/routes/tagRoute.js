import express from 'express';
import tagController from '../controllers/tagController.js';
import authMiddleware from '../middlewares/authMiddleware.js';

const router = express.Router();

// ===============================================
//           SWAGGER DEFINITIONS
// ===============================================

/**
 * @swagger
 * tags:
 *   name: Tags
 *   description: API for managing system-wide and user-specific recipe tags
 */

/**
 * @swagger
 * components:
 *   schemas:
 *     Tag:
 *       type: object
 *       properties:
 *         _id:
 *           type: string
 *           example: "6562f1b4b1a4a9c684f3c8c8"
 *         creatorId:
 *           type: string
 *           nullable: true
 *           description: "Null for system tags, ObjectId for user-created tags."
 *           example: "507f1f77bcf86cd799439011"
 *         name:
 *           type: string
 *           example: "món chính"
 *         createdAt:
 *           type: string
 *           format: date-time
 *         updatedAt:
 *           type: string
 *           format: date-time
 *
 *     TagListResponse:
 *       type: object
 *       properties:
 *         tags:
 *           type: array
 *           items:
 *             $ref: '#/components/schemas/Tag'
 *
 *     TagInput:
 *       type: object
 *       required:
 *         - name
 *       properties:
 *         name:
 *           type: string
 *           description: "The name for the new personal tag."
 *           example: "món đãi tiệc"
 *
 *     TagSuccessResponse:
 *       type: object
 *       properties:
 *         message:
 *           type: string
 *           example: "Personal tag created successfully."
 *         tag:
 *           $ref: '#/components/schemas/Tag'
 */

// ===============================================
//               ROUTES DEFINITIONS
// ===============================================

// Middleware to ensure all routes require a valid token
router.use(authMiddleware.verifyToken);

/**
 * @swagger
 * /api/tags:
 *   post:
 *     summary: Create a new personal tag
 *     tags: [Tags]
 *     security:
 *       - bearerAuth: []
 *     description: "Creates a new personal tag under the logged-in user's account. Tag names must be unique for each user."
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TagInput'
 *     responses:
 *       '201':
 *         description: Personal tag created successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TagSuccessResponse'
 *       '400':
 *         description: Bad Request (e.g., name is missing).
 *       '401':
 *         description: Unauthorized.
 *       '409':
 *         description: Conflict (You already have a tag with this name).
 */
router.post('/', tagController.create);

/**
 * @swagger
 * /api/tags:
 *   get:
 *     summary: Get available tags (System + User's own)
 *     tags: [Tags]
 *     security:
 *       - bearerAuth: []
 *     description: "Retrieves a list of all system-wide tags (created by admins) PLUS all personal tags created by the logged-in user."
 *     responses:
 *       '200':
 *         description: An array of available tag objects.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TagListResponse'
 *       '401':
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       '500':
 *         description: Internal Server Error
 */
router.get('/', tagController.getAll);

/**
 * @swagger
 * /api/tags/{identifier}:
 *   get:
 *     summary: Get a single tag by its ID or name
 *     tags: [Tags]
 *     security:
 *       - bearerAuth: []
 *     description: |
 *       Retrieves a single tag by its unique ObjectId or its name.
 *       - If an ObjectId is provided, it performs a direct lookup.
 *       - If a name (string) is provided, it searches for a system tag or a personal tag belonging to the user.
 *       A user can access any system tag or any personal tag they have created.
 *     parameters:
 *       - in: path
 *         name: identifier
 *         required: true
 *         schema:
 *           type: string
 *         description: "The ObjectId OR the unique name of the tag to retrieve."
 *         examples:
 *           ById:
 *             summary: "Example with ObjectId"
 *             value: "6562f1b4b1a4a9c684f3c8c8"
 *           ByName:
 *             summary: "Example with name"
 *             value: "món chính"
 *     responses:
 *       '200':
 *         description: The requested tag object.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Tag'
 *       '401':
 *         description: Unauthorized.
 *       '403':
 *         description: Forbidden (Trying to access another user's private tag by ID).
 *       '404':
 *         description: Tag not found.
 */
router.get('/:identifier', tagController.getById);

/**
 * @swagger
 * /api/tags/{id}:
 *   put:
 *     summary: Update a personal tag (Owner only)
 *     tags: [Tags]
 *     security:
 *       - bearerAuth: []
 *     description: "Updates the name of a personal tag. A user can only update tags they have created. System tags cannot be updated via this API."
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ObjectId of the personal tag to update.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/TagInput'
 *     responses:
 *       '200':
 *         description: Tag updated successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/TagSuccessResponse'
 *       '400':
 *         description: Bad Request (e.g., name is missing).
 *       '401':
 *         description: Unauthorized.
 *       '403':
 *         description: Forbidden (Trying to update a system tag or another user's tag).
 *       '404':
 *         description: Tag not found.
 *       '409':
 *         description: Conflict (You already have a tag with the new name).
 */
router.put('/:id', tagController.update);

/**
 * @swagger
 * /api/tags/{id}:
 *   delete:
 *     summary: Delete a personal tag (Owner only)
 *     tags: [Tags]
 *     security:
 *       - bearerAuth: []
 *     description: "Deletes a personal tag. A user can only delete tags that they have created. System tags cannot be deleted via this API."
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: The ObjectId of the personal tag to delete.
 *     responses:
 *       '200':
 *         description: Tag deleted successfully.
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/MessageResponse'
 *       '401':
 *         description: Unauthorized.
 *       '403':
 *         description: Forbidden (Trying to delete a system tag or another user's tag).
 *       '404':
 *         description: Tag not found.
 */
router.delete('/:id', tagController.delete);

export default router;
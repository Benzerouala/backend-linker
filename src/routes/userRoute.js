// backend/src/routes/userRoute.js
import express from "express";
import userController from "../controllers/userController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import optionalAuthMiddleware from "../middlewares/optionalAuthMiddleware.js";
import upload from "../middlewares/uploadMiddleware.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Users
 *   description: User management
 */

/* ================== ROUTES PROTÉGÉES ================== */

/**
 * @swagger
 * /api/users/me:
 *   get:
 *     tags: [Users]
 *     summary: Get current user
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Current user data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 */
router.get("/me", authMiddleware, userController.getCurrentUser);

/**
 * @swagger
 * /api/users/me:
 *   put:
 *     tags: [Users]
 *     summary: Update profile
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Profile updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 */
router.put("/me", authMiddleware, userController.updateProfile);

/**
 * @swagger
 * /api/users/me/profile-picture:
 *   put:
 *     tags: [Users]
 *     summary: Update profile picture
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               profilePicture: { type: string, format: binary }
 *     responses:
 *       200:
 *         description: Profile picture updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 */
router.put(
  "/me/profile-picture",
  authMiddleware,
  upload.single("profilePicture"),
  userController.updateProfilePicture
);

/**
 * @swagger
 * /api/users/me/cover-image:
 *   put:
 *     tags: [Users]
 *     summary: Update cover image
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               coverImage: { type: string, format: binary }
 *     responses:
 *       200:
 *         description: Cover image updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 */
router.put(
  "/me/cover-image",
  authMiddleware,
  upload.single("coverImage"),
  userController.updateCoverImage
);

/**
 * @swagger
 * /api/users/me/password:
 *   put:
 *     tags: [Users]
 *     summary: Change password
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Password updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 */
router.put("/me/password", authMiddleware, userController.changePassword);

/**
 * @swagger
 * /api/users/me:
 *   delete:
 *     tags: [Users]
 *     summary: Delete account
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Account deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 */
router.delete("/me", authMiddleware, userController.deleteAccount);

/* ================== ROUTES PUBLIQUES ================== */

// ⚠️ Toujours APRÈS /me
/**
 * @swagger
 * /api/users/search:
 *   get:
 *     tags: [Users]
 *     summary: Search users
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Users list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 */
router.get("/search", authMiddleware, userController.searchUsers);
/**
 * @swagger
 * /api/users/username/{username}:
 *   get:
 *     tags: [Users]
 *     summary: Get user by username
 *     parameters:
 *       - in: path
 *         name: username
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 *       404:
 *         description: User not found
 */
router.get("/username/:username", optionalAuthMiddleware, userController.getUserByUsername);
/**
 * @swagger
 * /api/users/{id}/stats:
 *   get:
 *     tags: [Users]
 *     summary: Get user stats
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User stats
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 */
router.get("/:id/stats", userController.getUserStats);
/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get user profile
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User profile
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 *       404:
 *         description: User not found
 */
router.get("/:id", optionalAuthMiddleware, userController.getUserProfile);

/**
 * @swagger
 * /api/users/suggestions/users:
 *   get:
 *     tags: [Users]
 *     summary: Get suggested users
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Suggestions list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 */
router.get(
  "/suggestions/users",
  authMiddleware,
  userController.getSuggestedUsers
);

export default router;

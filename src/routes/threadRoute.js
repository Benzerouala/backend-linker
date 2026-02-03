import express from "express";
import threadController from "../controllers/threadController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import optionalAuthMiddleware from "../middlewares/optionalAuthMiddleware.js";
import upload from "../middlewares/uploadMiddleware.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Threads
 *   description: Posts (threads)
 */

// IMPORTANT: Routes spécifiques AVANT les routes avec paramètres
/**
 * @swagger
 * /api/threads/search:
 *   get:
 *     tags: [Threads]
 *     summary: Search threads
 *     parameters:
 *       - in: query
 *         name: q
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 */
router.get("/search", optionalAuthMiddleware, threadController.searchThreads);
/**
 * @swagger
 * /api/threads/feed:
 *   get:
 *     tags: [Threads]
 *     summary: Get home feed
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Feed data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 */
router.get("/feed", authMiddleware, threadController.getHomeFeed);
/**
 * @swagger
 * /api/threads/user/{userId}:
 *   get:
 *     tags: [Threads]
 *     summary: Get threads by user
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: User threads
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 */
router.get(
  "/user/:userId",
  optionalAuthMiddleware,
  threadController.getUserThreads,
);

// Routes génériques
/**
 * @swagger
 * /api/threads:
 *   get:
 *     tags: [Threads]
 *     summary: List threads
 *     responses:
 *       200:
 *         description: Threads list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 */
router.get("/", optionalAuthMiddleware, threadController.getAllThreads);
/**
 * @swagger
 * /api/threads/{id}/likes:
 *   get:
 *     tags: [Threads]
 *     summary: Get thread likes
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Likes list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 */
router.get("/:id/likes", optionalAuthMiddleware, threadController.getThreadLikes);
/**
 * @swagger
 * /api/threads/{id}:
 *   get:
 *     tags: [Threads]
 *     summary: Get thread by id
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Thread data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 *       404:
 *         description: Thread not found
 */
router.get("/:id", optionalAuthMiddleware, threadController.getThreadById);

// Routes protégées
/**
 * @swagger
 * /api/threads:
 *   post:
 *     tags: [Threads]
 *     summary: Create thread
 *     security:
 *       - BearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               content: { type: string }
 *               media: { type: string, format: binary }
 *     responses:
 *       200:
 *         description: Thread created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 */
router.post(
  "/",
  authMiddleware,
  upload.single("media"),
  threadController.createThread,
);
/**
 * @swagger
 * /api/threads/{id}:
 *   put:
 *     tags: [Threads]
 *     summary: Update thread
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               content: { type: string }
 *               media: { type: string, format: binary }
 *     responses:
 *       200:
 *         description: Thread updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 */
router.put(
  "/:id",
  authMiddleware,
  upload.single("media"),
  threadController.updateThread,
);
/**
 * @swagger
 * /api/threads/{id}:
 *   delete:
 *     tags: [Threads]
 *     summary: Delete thread
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Thread deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 */
router.delete("/:id", authMiddleware, threadController.deleteThread);
/**
 * @swagger
 * /api/threads/{id}/like:
 *   post:
 *     tags: [Threads]
 *     summary: Like thread
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Liked
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 */
router.post("/:id/like", authMiddleware, threadController.likeThread);
/**
 * @swagger
 * /api/threads/{id}/unlike:
 *   delete:
 *     tags: [Threads]
 *     summary: Unlike thread
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Unliked
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 */
router.delete("/:id/unlike", authMiddleware, threadController.unlikeThread);
/**
 * @swagger
 * /api/threads/{id}/repost:
 *   post:
 *     tags: [Threads]
 *     summary: Repost thread
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Reposted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 */
router.post("/:id/repost", authMiddleware, threadController.repostThread);
/**
 * @swagger
 * /api/threads/{id}/repost:
 *   delete:
 *     tags: [Threads]
 *     summary: Remove repost
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Repost removed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 */
router.delete("/:id/repost", authMiddleware, threadController.unrepostThread);

export default router;

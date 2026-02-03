// backend/src/routes/replies.js
import express from "express";
import replyController from "../controllers/replyController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

/**
 * Routes pour les réponses (replies)
 */

// Créer une réponse à un thread
/**
 * @swagger
 * tags:
 *   name: Replies
 *   description: Replies to threads
 */
/**
 * @swagger
 * /api/replies/{threadId}:
 *   post:
 *     tags: [Replies]
 *     summary: Create a reply
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: threadId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [content]
 *             properties:
 *               content: { type: string }
 *               parentReplyId: { type: string, nullable: true }
 *     responses:
 *       200:
 *         description: Reply created
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 */
router.post("/:threadId", authMiddleware, replyController.createReply);

// Obtenir toutes les réponses d'un thread
/**
 * @swagger
 * /api/replies/{threadId}:
 *   get:
 *     tags: [Replies]
 *     summary: Get replies for a thread
 *     parameters:
 *       - in: path
 *         name: threadId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Replies list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 */
router.get("/:threadId", replyController.getThreadReplies);

// Obtenir les likes d'une réponse
/**
 * @swagger
 * /api/replies/{id}/likes:
 *   get:
 *     tags: [Replies]
 *     summary: Get reply likes
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Reply likes
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 */
router.get("/:id/likes", replyController.getReplyLikes);

// Modifier une réponse
/**
 * @swagger
 * /api/replies/{id}:
 *   put:
 *     tags: [Replies]
 *     summary: Update reply
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
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Reply updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 */
router.put("/:id", authMiddleware, replyController.updateReply);

// Supprimer une réponse
/**
 * @swagger
 * /api/replies/{id}:
 *   delete:
 *     tags: [Replies]
 *     summary: Delete reply
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
 *         description: Reply deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 */
router.delete("/:id", authMiddleware, replyController.deleteReply);

// Liker une réponse
/**
 * @swagger
 * /api/replies/{id}/like:
 *   post:
 *     tags: [Replies]
 *     summary: Like reply
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
 *         description: Reply liked
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 */
router.post("/:id/like", authMiddleware, replyController.likeReply);

// Retirer le like d'une réponse
/**
 * @swagger
 * /api/replies/{id}/unlike:
 *   delete:
 *     tags: [Replies]
 *     summary: Unlike reply
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
 *         description: Reply unliked
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 */
router.delete("/:id/unlike", authMiddleware, replyController.unlikeReply);

// Reposter une réponse comme post
/**
 * @swagger
 * /api/replies/{id}/repost:
 *   post:
 *     tags: [Replies]
 *     summary: Repost reply
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
 *         description: Reply reposted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 */
router.post("/:id/repost", authMiddleware, replyController.repostReply);

export default router;

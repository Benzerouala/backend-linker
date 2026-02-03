import express from "express";
import notificationController from "../controllers/notificationController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Notifications
 *   description: In-app notifications
 */

/**
 * @swagger
 * /api/notifications:
 *   get:
 *     tags: [Notifications]
 *     summary: Get notifications
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Notifications list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 */
router.get("/", authMiddleware, notificationController.getNotifications);
/**
 * @swagger
 * /api/notifications/{id}/read:
 *   put:
 *     tags: [Notifications]
 *     summary: Mark notification as read
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
 *         description: Marked as read
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 */
router.put("/:id/read", authMiddleware, notificationController.markOneAsRead);
/**
 * @swagger
 * /api/notifications/read-all:
 *   put:
 *     tags: [Notifications]
 *     summary: Mark all as read
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: All marked as read
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 */
router.put("/read-all", authMiddleware, notificationController.markAllAsRead);
/**
 * @swagger
 * /api/notifications/unread-count:
 *   get:
 *     tags: [Notifications]
 *     summary: Get unread count
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Unread count
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 */
router.get(
  "/unread-count",
  authMiddleware,
  notificationController.getUnreadCount,
);
/**
 * @swagger
 * /api/notifications/clear-all:
 *   delete:
 *     tags: [Notifications]
 *     summary: Delete all notifications
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: All notifications deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 */
router.delete(
  "/clear-all",
  authMiddleware,
  notificationController.deleteAllNotifications,
);
/**
 * @swagger
 * /api/notifications/{id}:
 *   delete:
 *     tags: [Notifications]
 *     summary: Delete one notification
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
 *         description: Notification deleted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 */
router.delete(
  "/:id",
  authMiddleware,
  notificationController.deleteNotification,
);

export default router;

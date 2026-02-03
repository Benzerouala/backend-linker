import express from "express"
import followController from "../controllers/followController.js"
import authMiddleware from "../middlewares/authMiddleware.js"
import optionalAuthMiddleware from "../middlewares/optionalAuthMiddleware.js"

const router = express.Router()

/**
 * @swagger
 * tags:
 *   name: Follows
 *   description: Follow system
 */

/**
 * @swagger
 * /api/follows/{userId}/follow:
 *   post:
 *     tags: [Follows]
 *     summary: Follow a user
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Follow request sent or accepted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 */
router.post("/:userId/follow", authMiddleware, followController.follow)
/**
 * @swagger
 * /api/follows/{userId}/unfollow:
 *   delete:
 *     tags: [Follows]
 *     summary: Unfollow a user
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Unfollowed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 */
router.delete("/:userId/unfollow", authMiddleware, followController.unfollow)
/**
 * @swagger
 * /api/follows/{userId}/remove-follower:
 *   delete:
 *     tags: [Follows]
 *     summary: Remove a follower
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Follower removed
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 */
router.delete("/:userId/remove-follower", authMiddleware, followController.removeFollower)
/**
 * @swagger
 * /api/follows/{userId}/accept:
 *   post:
 *     tags: [Follows]
 *     summary: Accept follow request
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Request accepted
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 */
router.post("/:userId/accept", authMiddleware, followController.acceptRequest)
/**
 * @swagger
 * /api/follows/{userId}/reject:
 *   post:
 *     tags: [Follows]
 *     summary: Reject follow request
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Request rejected
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 */
router.post("/:userId/reject", authMiddleware, followController.rejectRequest)
/**
 * @swagger
 * /api/follows/pending:
 *   get:
 *     tags: [Follows]
 *     summary: Get pending follow requests
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Pending requests
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 */
router.get("/pending", authMiddleware, followController.getPendingRequests)
/**
 * @swagger
 * /api/follows/sent:
 *   get:
 *     tags: [Follows]
 *     summary: Get sent follow requests
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Sent requests
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 */
router.get("/sent", authMiddleware, followController.getSentRequests)
/**
 * @swagger
 * /api/follows/{userId}/followers:
 *   get:
 *     tags: [Follows]
 *     summary: Get followers
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Followers list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 */
router.get(
  "/:userId/followers",
  optionalAuthMiddleware,
  followController.getFollowers,
)
/**
 * @swagger
 * /api/follows/{userId}/following:
 *   get:
 *     tags: [Follows]
 *     summary: Get following
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Following list
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 */
router.get(
  "/:userId/following",
  optionalAuthMiddleware,
  followController.getFollowing,
)

export default router

import express from "express"
import authRoutes from "./authRoute.js"
import userRoutes from "./userRoute.js"
import threadRoutes from "./threadRoute.js"
import followRoutes from "./followRoute.js"
import replyRoutes from "./replyRoute.js"
import notificationRoutes from "./notificationRoute.js"
import settingsRoutes from "./settingsRoute.js"

const router = express.Router()

/**
 * @swagger
 * tags:
 *   name: Health
 *   description: API status
 */

// Monter les routes
router.use("/auth", authRoutes)
router.use("/users", userRoutes)
router.use("/threads", threadRoutes)
router.use("/follows", followRoutes)
router.use("/replies", replyRoutes)
router.use("/notifications", notificationRoutes)
router.use("/settings", settingsRoutes)

// Route de santé (health check)
/**
 * @swagger
 * /api/health:
 *   get:
 *     tags: [Health]
 *     summary: Health check
 *     responses:
 *       200:
 *         description: API is running
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 */
router.get("/health", (req, res) => {
  res.status(200).json({
    success: true,
    message: "API is running",
    timestamp: new Date().toISOString(),
  })
})

export default router

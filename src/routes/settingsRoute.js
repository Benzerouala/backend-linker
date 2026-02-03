// backend/src/routes/settingsRoute.js
import express from "express";
import settingsController from "../controllers/settingsController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

// Toutes les routes de paramètres sont protégées
router.use(authMiddleware);

/**
 * @swagger
 * tags:
 *   name: Settings
 *   description: User settings
 */

/**
 * @route   GET /api/settings
 * @desc    Obtenir tous les paramètres de l'utilisateur
 * @access  Private
 */
/**
 * @swagger
 * /api/settings:
 *   get:
 *     tags: [Settings]
 *     summary: Get user settings
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Settings data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 */
router.get("/", settingsController.getSettings);

/**
 * @route   PUT /api/settings/notifications
 * @desc    Mettre à jour les préférences de notifications
 * @access  Private
 * @body    {
 *          email: {
 *            newFollower: Boolean,
 *            followRequest: Boolean,
 *            followAccepted: Boolean,
 *            threadLike: Boolean,
 *            threadReply: Boolean,
 *            mention: Boolean
 *          },
 *          push: { ... même structure ... },
 *          inApp: { ... même structure ... }
 *        }
 */
/**
 * @swagger
 * /api/settings/notifications:
 *   put:
 *     tags: [Settings]
 *     summary: Update notification settings
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
 *         description: Settings updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 */
router.put("/notifications", settingsController.updateNotifications);

/**
 * @route   PUT /api/settings/privacy
 * @desc    Mettre à jour les paramètres de confidentialité
 * @access  Private
 * @body    {
 *          whoCanFollowMe: "everyone" | "friends_of_friends" | "nobody",
 *          whoCanSeeMyPosts: "everyone" | "followers" | "only_me",
 *          whoCanMentionMe: "everyone" | "followers" | "nobody",
 *          showOnlineStatus: Boolean,
 *          showActivityStatus: Boolean,
 *          allowDirectMessages: "everyone" | "followers" | "people_i_follow" | "nobody"
 *        }
 */
/**
 * @swagger
 * /api/settings/privacy:
 *   put:
 *     tags: [Settings]
 *     summary: Update privacy settings
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
 *         description: Settings updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 */
router.put("/privacy", settingsController.updatePrivacy);

/**
 * @route   PUT /api/settings/display
 * @desc    Mettre à jour les préférences d'affichage
 * @access  Private
 * @body    {
 *          theme: "light" | "dark" | "auto",
 *          language: "fr" | "ar" | "en",
 *          fontSize: "small" | "medium" | "large",
 *          showSensitiveContent: Boolean
 *        }
 */
/**
 * @swagger
 * /api/settings/display:
 *   put:
 *     tags: [Settings]
 *     summary: Update display settings
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
 *         description: Settings updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 */
router.put("/display", settingsController.updateDisplay);

/**
 * @route   PUT /api/settings/content
 * @desc    Mettre à jour les préférences de contenu
 * @access  Private
 * @body    {
 *          autoplayVideos: Boolean,
 *          showMediaPreviews: Boolean,
 *          enableMentions: Boolean
 *        }
 */
/**
 * @swagger
 * /api/settings/content:
 *   put:
 *     tags: [Settings]
 *     summary: Update content settings
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
 *         description: Settings updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 */
router.put("/content", settingsController.updateContent);

/**
 * @route   PUT /api/settings
 * @desc    Mettre à jour tous les paramètres (mise à jour globale)
 * @access  Private
 * @body    {
 *          notifications: { ... },
 *          privacy: { ... },
 *          display: { ... },
 *          content: { ... }
 *        }
 */
/**
 * @swagger
 * /api/settings:
 *   put:
 *     tags: [Settings]
 *     summary: Update all settings
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
 *         description: Settings updated
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 */
router.put("/", settingsController.updateAllSettings);

/**
 * @route   POST /api/settings/reset
 * @desc    Réinitialiser tous les paramètres aux valeurs par défaut
 * @access  Private
 */
/**
 * @swagger
 * /api/settings/reset:
 *   post:
 *     tags: [Settings]
 *     summary: Reset settings
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Settings reset
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 */
router.post("/reset", settingsController.resetSettings);

/**
 * @route   GET /api/settings/check-permission/:targetUserId
 * @desc    Vérifier si l'utilisateur actuel peut voir le contenu d'un autre utilisateur
 * @access  Private
 * @param   targetUserId - ID de l'utilisateur cible
 */
/**
 * @swagger
 * /api/settings/check-permission/{targetUserId}:
 *   get:
 *     tags: [Settings]
 *     summary: Check view permission
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: targetUserId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Permission result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 */
router.get("/check-permission/:targetUserId", settingsController.checkViewPermission);

/**
 * @route   GET /api/settings/check-mention/:targetUserId
 * @desc    Vérifier si l'utilisateur actuel peut mentionner un autre utilisateur
 * @access  Private
 * @param   targetUserId - ID de l'utilisateur cible
 */
/**
 * @swagger
 * /api/settings/check-mention/{targetUserId}:
 *   get:
 *     tags: [Settings]
 *     summary: Check mention permission
 *     security:
 *       - BearerAuth: []
 *     parameters:
 *       - in: path
 *         name: targetUserId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Permission result
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 */
router.get("/check-mention/:targetUserId", settingsController.checkMentionPermission);

export default router;

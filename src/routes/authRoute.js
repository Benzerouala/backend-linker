import express from "express";
import authController from "../controllers/authController.js";
import authMiddleware from "../middlewares/authMiddleware.js";
import { authLimiter, checkLimiter } from "../middlewares/rateLimiter.js";
import {
  registerValidation,
  loginValidation,
  emailValidation,
  usernameValidation,
  resetPasswordValidation,
  handleValidationErrors,
} from "../middlewares/validationMiddleware.js";

const router = express.Router();

/**
 * @swagger
 * tags:
 *   name: Auth
 *   description: Authentication
 */

// Routes publiques avec rate limiting et validation
/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new user
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, username, email, password]
 *             properties:
 *               name: { type: string }
 *               username: { type: string }
 *               email: { type: string, format: email }
 *               password: { type: string, format: password }
 *     responses:
 *       200:
 *         description: User registered
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 *       400:
 *         description: Validation error
 */
router.post(
  "/register",
  authLimiter,
  registerValidation,
  handleValidationErrors,
  authController.register.bind(authController)
);

/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Login
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, format: email }
 *               password: { type: string, format: password }
 *     responses:
 *       200:
 *         description: Login success
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 *       401:
 *         description: Invalid credentials
 */
router.post(
  "/login",
  authLimiter,
  loginValidation,
  handleValidationErrors,
  authController.login.bind(authController)
);

/**
 * @swagger
 * /api/auth/check-username:
 *   post:
 *     tags: [Auth]
 *     summary: Check username availability
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username]
 *             properties:
 *               username: { type: string }
 *     responses:
 *       200:
 *         description: Username check
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 */
router.post(
  "/check-username",
  checkLimiter,
  usernameValidation,
  handleValidationErrors,
  authController.checkUsername.bind(authController)
);

/**
 * @swagger
 * /api/auth/check-email:
 *   post:
 *     tags: [Auth]
 *     summary: Check email availability
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200:
 *         description: Email check
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 */
router.post(
  "/check-email",
  checkLimiter,
  emailValidation,
  handleValidationErrors,
  authController.checkEmail.bind(authController)
);

/**
 * @swagger
 * /api/auth/forgot-password:
 *   post:
 *     tags: [Auth]
 *     summary: Request password reset
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       200:
 *         description: Reset email sent
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 */
router.post(
  "/forgot-password",
  checkLimiter,
  emailValidation,
  handleValidationErrors,
  authController.forgotPassword.bind(authController)
);

/**
 * @swagger
 * /api/auth/reset-password:
 *   post:
 *     tags: [Auth]
 *     summary: Reset password
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, password]
 *             properties:
 *               token: { type: string }
 *               password: { type: string, format: password }
 *     responses:
 *       200:
 *         description: Password reset
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 */
router.post(
  "/reset-password",
  authLimiter,
  resetPasswordValidation,
  handleValidationErrors,
  authController.resetPassword.bind(authController)
);

// Routes protégées
/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     tags: [Auth]
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
 *       401:
 *         description: Unauthorized
 */
router.get("/me", authMiddleware, authController.getMe.bind(authController));
/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Logout
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Logout success
 *         content:
 *           application/json:
 *             schema:
 *               $ref: "#/components/schemas/SuccessResponse"
 */
router.post(
  "/logout",
  authMiddleware,
  authController.logout.bind(authController)
);

export default router;

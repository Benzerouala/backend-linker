//backend/server.js
import dotenv from "dotenv";
dotenv.config();

import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import path from "path";
import { fileURLToPath } from "url";
import { createServer } from "http";
import swaggerUi from "swagger-ui-express";
import routes from "./src/routes/indexRoute.js";
import errorHandler from "./src/middlewares/errorHandler.js";
import connectDB from "./src/config/db.js";
import socketService from "./src/services/socketService.js";
import swaggerSpec from "./src/docs/swagger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// ============= MIDDLEWARES =============

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://localhost:5174", 
    "http://localhost:5175",
    "http://localhost:3000",
    "https://linker-y90l.onrender.com",
    process.env.FRONTEND_URL
  ].filter(Boolean),
  credentials: true,
}));

// Configure helmet to allow cross-origin resource sharing for images and videos
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

if (process.env.NODE_ENV === "development") {
  app.use(morgan("dev"));
}

app.use("/uploads", express.static(path.join(__dirname, "src/uploads")));

// ============= ROUTES =============

app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "✅ API Linker - Bienvenue!",
    version: "1.0.0",
    endpoints: {
      auth: "/api/auth",
      users: "/api/users",
      threads: "/api/threads",
      docs: "/api/docs",
    },
  });
});

// Swagger docs
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
app.get("/api/docs.json", (req, res) => {
  res.json(swaggerSpec);
});

// Route de diagnostic pour uploads
app.get("/diagnose/uploads", (req, res) => {
  const uploadsPath = path.join(__dirname, "src/uploads");
  const fs = require("fs");

  if (!fs.existsSync(uploadsPath)) {
    return res.json({
      error: "Uploads directory does not exist",
      path: uploadsPath,
    });
  }

  try {
    const files = fs.readdirSync(uploadsPath);
    res.json({
      success: true,
      uploadsPath,
      fileCount: files.length,
      files: files.slice(-10), // Last 10 files
    });
  } catch (error) {
    res.json({ error: error.message });
  }
});

app.use("/api", routes);

// ============= GESTION DES ERREURS =============

app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: "Route non trouvée",
    path: req.originalUrl,
  });
});

app.use(errorHandler);

// ============= CONNEXION DB & DÉMARRAGE =============

// Connexion à MongoDB
connectDB();

const PORT = process.env.PORT || 5000;

// Créer le serveur HTTP avec Socket.IO
const server = createServer(app);

// Initialiser Socket.IO
socketService.initialize(server);

// Démarrer le serveur
server.listen(PORT, () => {
  console.log("");
  console.log("=".repeat(50));
  console.log(`🚀 Serveur démarré sur le port ${PORT}`);
  console.log(`🌐 URL: http://localhost:${PORT}`);
  console.log(`🌐 swagger: http://localhost:${PORT}/api/docs`);
  console.log(`📝 Environnement: ${process.env.NODE_ENV || "development"}`);
  console.log(`🔌 Socket.IO activé pour le temps réel`);
  console.log("=".repeat(50));
  console.log("");
});

// Gestion arrêt gracieux
process.on("SIGINT", () => {
  console.log("\n⚠️ Arrêt du serveur...");
  process.exit(0);
});

process.on("unhandledRejection", (err) => {
  console.error("❌ Erreur non gérée:", err);
  process.exit(1);
});

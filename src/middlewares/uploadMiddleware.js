import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  console.log("✅ Dossier uploads créé:", uploadsDir);
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    console.log("📤 Uploading file:", file.originalname, "to:", uploadsDir);
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const finalFilename = uniqueSuffix + path.extname(file.originalname);
    console.log("📝 File saved as:", finalFilename);
    cb(null, finalFilename);
  },
});

// File filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = [
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "video/mp4",
    "video/webm",
  ];

  if (allowedTypes.includes(file.mimetype)) {
    console.log("✅ File type allowed:", file.mimetype);
    cb(null, true);
  } else {
    console.log("❌ File type not allowed:", file.mimetype);
    cb(new Error("Type de fichier non supporté"), false);
  }
};

// Create multer upload instance
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max
  },
});

export default upload;

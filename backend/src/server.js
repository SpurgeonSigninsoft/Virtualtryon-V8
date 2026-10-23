import express from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, "../uploads");
await fs.mkdir(uploadsDir, { recursive: true });

const app = express();
const port = Number(process.env.PORT || 5000);
const allowedOrigin = process.env.FRONTEND_ORIGIN || "http://localhost:3000";

app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use("/uploads", express.static(uploadsDir, { fallthrough: false }));

const allowedMime = new Set(["image/png", "image/webp", "image/gif", "image/avif"]);
const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const extByMime = {
      "image/png": ".png",
      "image/webp": ".webp",
      "image/gif": ".gif",
      "image/avif": ".avif",
    };
    cb(null, `${Date.now()}-${crypto.randomUUID()}${extByMime[file.mimetype] || ".img"}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 12 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!allowedMime.has(file.mimetype)) return cb(new Error("Frame must be PNG, WebP, GIF, or AVIF."));
    cb(null, true);
  },
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "virtual-glasses-v8", node: process.version });
});

app.get("/api/frames", async (req, res, next) => {
  try {
    const files = await fs.readdir(uploadsDir);
    const frames = files
      .filter((name) => !name.startsWith("."))
      .map((name) => ({ id: name, name, url: `/uploads/${encodeURIComponent(name)}` }));
    res.json({ frames });
  } catch (error) {
    next(error);
  }
});

app.post("/api/frames", upload.single("frame"), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: "No frame image was received." });
  const aspect = Number(req.body.aspect);
  res.status(201).json({
    frame: {
      id: req.file.filename,
      name: req.file.originalname,
      url: `/uploads/${encodeURIComponent(req.file.filename)}`,
      aspect: Number.isFinite(aspect) && aspect > 0 ? aspect : undefined,
    },
  });
});

app.use((error, req, res, next) => {
  console.error(error);
  if (error instanceof multer.MulterError && error.code === "LIMIT_FILE_SIZE") {
    return res.status(413).json({ error: "Frame image is too large. Maximum size is 12 MB." });
  }
  res.status(400).json({ error: error.message || "Request failed." });
});

app.listen(port, () => {
  console.log(`Virtual Glasses V8 API running at http://localhost:${port}`);
  console.log(`Frontend allowed: ${allowedOrigin}`);
});

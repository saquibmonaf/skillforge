require("dotenv").config();

const express = require("express");
const mongoose = require("mongoose");
const cors = require('cors');
// ---------- Route imports ----------
const authRoutes = require("./routes/authRoutes");
const apiRoutes = require("./routes/apiRoutes");

const app = express();
const PORT = process.env.PORT || 5000;
const configuredOrigins = (process.env.CLIENT_ORIGIN || process.env.CLIENT_URL || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = [
  "http://localhost:5000",
  "http://127.0.0.1:5000",
  "http://localhost:5500",
  "http://127.0.0.1:5500",
  "https://hoppscotch.io",
  ...configuredOrigins,
];

// ============================================================
// GLOBAL MIDDLEWARE (order matters!)
// ============================================================

app.use(express.json({ limit: "1mb" }));

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      const error = new Error("Not allowed by CORS");
      error.status = 403;
      return callback(error);
    },
    credentials: true,
  })
);

app.use(express.urlencoded({ extended: true }));

app.use((req, _res, next) => {
  console.log(`${req.method} ${req.originalUrl}`);
  next();
});

// ============================================================
// HEALTH CHECK (public — useful for Postman + demo)
// ============================================================
app.get("/api/health", (_req, res) =>
  res.json({
    success: true,
    status: "ok",
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString(),
  })
);

// ============================================================
// ROUTES
// ============================================================
app.use("/api/auth", authRoutes);
app.use("/api", apiRoutes);

// ============================================================
// 404 — must come AFTER all routes
// ============================================================
app.use((req, res) =>
  res.status(404).json({
    success: false,
    message: `Route ${req.method} ${req.originalUrl} not found`,
  })
);

// ============================================================
// GLOBAL ERROR HANDLER — must be LAST (4-arg signature)
// ============================================================
app.use((err, _req, res, next) => {
  if (res.headersSent) return next(err);

  const requestedStatus = Number(err.status || err.statusCode);
  const status =
    Number.isInteger(requestedStatus) && requestedStatus >= 400 && requestedStatus <= 599
      ? requestedStatus
      : 500;
  console.error(err.stack || err.message || err);
  res.status(status).json({
    success: false,
    message: err.message || "Internal Server Error",
  });
});

// ============================================================
// DB + STARTUP
// ============================================================
async function start() {
  try {
    const uri = process.env.MONGO_URI;
    if (!uri) throw new Error("MONGO_URI missing in .env");

    await mongoose.connect(uri);
    console.log("MongoDB Connected");

    const server = app.listen(PORT, () =>
      console.log(`Server listening on port ${PORT}`)
    );

    const shutdown = (sig) => {
      console.log(`\n${sig} received — closing server...`);
      server.close(() => mongoose.connection.close(false, () => process.exit(0)));
    };
    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  } catch (err) {
    console.error("Startup failed:", err.message);
    process.exit(1);
  }
}

start();
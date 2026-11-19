const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");

const router = express.Router();

/** Helper: sign a JWT for a given user document. */
const signToken = (user) =>
  jwt.sign(
    { id: user._id, email: user.email, name: user.name, role: user.role || "student" },
    process.env.JWT_SECRET,
    { expiresIn: "1d" }
  );

/* ----------------------------------------------------------------
 *  POST /api/auth/register
 *  Body: { name, email, password }
 * ---------------------------------------------------------------- */
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body || {};

    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      !password
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Name, email and password are required" });
    }

    if (password.length < 6) {
      return res
        .status(400)
        .json({ success: false, message: "Password must be at least 6 characters" });
    }

    // Prevent duplicate accounts (case-insensitive via mongoose `lowercase`)
    const normalizedEmail = email.trim().toLowerCase();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ success: false, message: "User already exists" });
    }

    // Hash the plaintext password (12 salt rounds)
    const hashedPassword = await bcrypt.hash(password, 12);

    const user = await User.create({
      name: name.trim(),
      email: normalizedEmail,
      password: hashedPassword,
    });

    return res.status(201).json({
      success: true,
      message: "Student registered successfully",
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    // Catch race-condition duplicate-key errors from Mongo
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: "User already exists" });
    }
    if (err.name === "ValidationError") {
      return res.status(400).json({ success: false, message: err.message });
    }
    return res
      .status(500)
      .json({ success: false, message: "Registration failed", error: err.message });
  }
});

/* ----------------------------------------------------------------
 *  POST /api/auth/login
 *  Body: { email, password }
 * ---------------------------------------------------------------- */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      !password
    ) {
      return res
        .status(400)
        .json({ success: false, message: "Email and password are required" });
    }

    const user = await User.findOne({ email: email.trim().toLowerCase() }).select("+password");
    if (!user) {
      // Same message for both wrong-email and wrong-password (avoid user enumeration)
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: "Invalid credentials" });
    }

    const token = signToken(user);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Login failed", error: err.message });
  }
});

module.exports = router;
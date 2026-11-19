const express = require("express");
const Career = require("../models/Career");
const User = require("../models/User");
const protect = require("../middleware/authMiddleware");

const router = express.Router();
const isObjectId = (value) => typeof value === "string" && /^[\da-f]{24}$/i.test(value);

/** Normalize a skill string for case-insensitive comparison. */
const normalize = (s) => (s || "").trim().toLowerCase();
const taskKey = (skillName, task) => `${skillName}\u0000${task}`;

/* ----------------------------------------------------------------
 *  GET /api/careers
 *  Returns every career blueprint (title, description, requiredSkills).
 * ---------------------------------------------------------------- */
router.get("/careers", async (req, res) => {
  try {
    const careers = await Career.find().select(
      "title description difficultyLevel requiredSkills"
    );
    return res.status(200).json({ success: true, count: careers.length, careers });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch careers", error: err.message });
  }
});

/* ----------------------------------------------------------------
 *  POST /api/careers
 *  Creates a career blueprint for authenticated users.
 * ---------------------------------------------------------------- */
router.post("/careers", protect, async (req, res) => {
  const { title, description, difficultyLevel, requiredSkills } = req.body || {};

  if (typeof title !== "string" || !title.trim()) {
    return res.status(400).json({ success: false, message: "Career title is required" });
  }
  if (requiredSkills !== undefined && !Array.isArray(requiredSkills)) {
    return res.status(400).json({ success: false, message: "requiredSkills must be an array" });
  }

  try {
    const career = await Career.create({
      title: title.trim(),
      description,
      difficultyLevel,
      requiredSkills,
    });
    return res.status(201).json({ success: true, career });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(409).json({ success: false, message: "Career title already exists" });
    }
    if (err.name === "ValidationError") {
      return res.status(400).json({ success: false, message: err.message });
    }
    return res
      .status(500)
      .json({ success: false, message: "Failed to create career", error: err.message });
  }
});

/* ----------------------------------------------------------------
 *  POST /api/gap-analysis
 *  Body: { careerId: "<ObjectId>", possessedSkills: ["React", "Node.js", ...] }
 *
 *  Returns: (Required Skills of career) − (Student's possessed skills)
 * ---------------------------------------------------------------- */
router.post("/gap-analysis", protect, async (req, res) => {
  try {
    const { careerId, possessedSkills = [] } = req.body || {};

    if (!isObjectId(careerId)) {
      return res
        .status(400)
        .json({ success: false, message: "A valid careerId is required" });
    }
    if (!Array.isArray(possessedSkills)) {
      return res
        .status(400)
        .json({ success: false, message: "possessedSkills must be an array" });
    }
    if (possessedSkills.some((skill) => typeof skill !== "string")) {
      return res
        .status(400)
        .json({ success: false, message: "possessedSkills must contain only strings" });
    }

    const career = await Career.findById(careerId);
    if (!career) {
      return res
        .status(404)
        .json({ success: false, message: "Career blueprint not found" });
    }

    // Case-insensitive set of the student's current skills
    const possessedSet = new Set(possessedSkills.map(normalize));

    // Set-difference: requiredSkills.filter(s => !possessedSet.has(s))
    // Sort by orderIndex so the roadmap comes back in learning order.
    const missingSkills = career.requiredSkills
      .filter((skill) => !possessedSet.has(normalize(skill.skillName)))
      .sort((a, b) => a.orderIndex - b.orderIndex)
      .map((skill) => ({
        skillName: skill.skillName,
        orderIndex: skill.orderIndex,
        tasks: skill.tasks,
      }));

    return res.status(200).json({
      success: true,
      career: { id: career._id, title: career.title },
      totalRequired: career.requiredSkills.length,
      possessedCount: career.requiredSkills.length - missingSkills.length,
      missingCount: missingSkills.length,
      missingSkills, // the roadmap the student must follow
    });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Gap analysis failed", error: err.message });
  }
});

/* ----------------------------------------------------------------
 *  GET /api/progress/:careerId
 *  Returns the authenticated user's saved progress for one career.
 * ---------------------------------------------------------------- */
router.get("/progress/:careerId", protect, async (req, res) => {
  try {
    const { careerId } = req.params;
    if (!isObjectId(careerId)) {
      return res.status(400).json({ success: false, message: "A valid careerId is required" });
    }

    const career = await Career.findById(careerId);
    if (!career) {
      return res
        .status(404)
        .json({ success: false, message: "Career blueprint not found" });
    }

    const user = await User.findById(req.user.id).select("progress");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const progress = Array.isArray(user.progress) ? user.progress : [];
    const careerProgress = progress.find(
      (progress) => progress.career && progress.career.toString() === careerId
    );
    const completedTasksList =
      careerProgress && Array.isArray(careerProgress.completedTasks)
        ? careerProgress.completedTasks
        : [];
    const totalTasks = career.requiredSkills.reduce(
      (sum, skill) => sum + (skill.tasks ? skill.tasks.length : 0),
      0
    );
    const completedTasks = completedTasksList.filter((task) => task.completed).length;
    const completionPercentage =
      totalTasks === 0 ? 0 : Math.round((completedTasks / totalTasks) * 100);

    return res.status(200).json({
      success: true,
      careerId,
      totalTasks,
      completedTasks,
      completionPercentage,
      completedTasksList,
    });
  } catch (err) {
    return res
      .status(500)
      .json({ success: false, message: "Failed to fetch progress", error: err.message });
  }
});

/* ----------------------------------------------------------------
 *  PATCH /api/progress
 *  Body: {
 *    careerId: "<ObjectId>",
 *    updates:  [{ skillName: "React", task: "Build a TODO app", completed: true }, ...]
 *  }
 *
 *  Behaviour:
 *    - Initializes a progress bucket for this (user, career) if missing.
 *    - Upserts each update (marks completed/uncompleted + timestamps it).
 *    - Recomputes overall completion % = (completed / totalTasksInCareer) * 100.
 * ---------------------------------------------------------------- */
router.patch("/progress", protect, async (req, res) => {
  try {
    const { careerId, updates } = req.body || {};

    if (!isObjectId(careerId)) {
      return res
        .status(400)
        .json({ success: false, message: "A valid careerId is required" });
    }
    if (!Array.isArray(updates) || updates.length === 0) {
      return res
        .status(400)
        .json({ success: false, message: "updates must be a non-empty array" });
    }
    if (
      updates.some(
        (update) =>
          !update ||
          typeof update !== "object" ||
          Array.isArray(update) ||
          typeof update.skillName !== "string" ||
          !update.skillName.trim() ||
          typeof update.task !== "string" ||
          !update.task.trim() ||
          (update.completed !== undefined && typeof update.completed !== "boolean")
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Each update must contain skillName and task strings and an optional boolean completed",
      });
    }

    const career = await Career.findById(careerId);
    if (!career) {
      return res
        .status(404)
        .json({ success: false, message: "Career blueprint not found" });
    }
    const validTasks = new Set(
      career.requiredSkills.flatMap((skill) =>
        (skill.tasks || []).map((task) => taskKey(skill.skillName, task))
      )
    );
    if (
      updates.some(
        (update) => !validTasks.has(taskKey(update.skillName, update.task))
      )
    ) {
      return res.status(400).json({
        success: false,
        message: "Each update must reference a task in the selected career blueprint",
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    // Ensure progress array exists (defensive — depends on User model defaults)
    if (!Array.isArray(user.progress)) user.progress = [];

    // Locate or initialize the (user, career) bucket
    let careerProgress = user.progress.find(
      (p) => p.career && p.career.toString() === careerId.toString()
    );

    if (!careerProgress) {
      user.progress.push({ career: careerId, completedTasks: [] });
      // Re-fetch the last element so it is the real Mongoose subdocument
      // (not the plain object we passed to push) — required for change tracking.
      careerProgress = user.progress[user.progress.length - 1];
    }
    if (!Array.isArray(careerProgress.completedTasks)) careerProgress.completedTasks = [];

    // Apply each update (upsert-by-skill+task)
    for (const update of updates) {
      const { skillName, task } = update;
      const completed = update.completed !== false; // default to true

      const existing = careerProgress.completedTasks.find(
        (t) => t.skillName === skillName && t.task === task
      );

      if (existing) {
        existing.completed = completed;
        existing.completedAt = completed ? new Date() : null;
      } else {
        careerProgress.completedTasks.push({
          skillName,
          task,
          completed,
          completedAt: completed ? new Date() : null,
        });
      }
    }

    // ---- Overall completion % ----
    const totalTasks = career.requiredSkills.reduce(
      (sum, skill) => sum + (skill.tasks ? skill.tasks.length : 0),
      0
    );
    const completedCount = careerProgress.completedTasks.filter((t) => t.completed).length;
    const completionPercentage =
      totalTasks === 0 ? 0 : Math.round((completedCount / totalTasks) * 100);

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Progress updated",
      data: {
        careerId,
        totalTasks,
        completedTasks: completedCount,
        completionPercentage, // integer 0–100
        completedTasksList: careerProgress.completedTasks,
      },
    });
  } catch (err) {
    if (err.name === "ValidationError" || err.name === "CastError") {
      return res.status(400).json({ success: false, message: err.message });
    }
    return res
      .status(500)
      .json({ success: false, message: "Failed to update progress", error: err.message });
  }
});

module.exports = router;
